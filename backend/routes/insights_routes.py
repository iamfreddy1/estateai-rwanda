# ============================================
# AI INSIGHTS ROUTES
# ============================================
# POST /properties/<id>/view  -> track a view (anon or auth)
# GET  /insights/trends       -> market trends (avg price by sector + districts)
# GET  /insights/trending     -> most-viewed properties in last N days
# GET  /insights/recommendations -> personalized recs for current user

from datetime import datetime, timedelta
from collections import Counter
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from sqlalchemy import func, desc

from models.database import db, Property, PropertyView, User

insights_bp = Blueprint("insights", __name__)


# ============================================
# Helper: optional JWT
# ============================================
def _current_user_id_or_none():
    try:
        verify_jwt_in_request(optional=True)
        sub = get_jwt_identity()
        return int(sub) if sub else None
    except Exception:
        return None


# ============================================
# POST /properties/<id>/view
# ============================================
# Logs a view. Authenticated views are linked to the user.
# We snapshot property attrs so we still have data if listing gets deleted.
@insights_bp.route("/properties/<int:prop_id>/view", methods=["POST"])
def track_view(prop_id):
    prop = Property.query.get(prop_id)
    if not prop:
        return jsonify({"error": "Property not found"}), 404

    user_id = _current_user_id_or_none()

    view = PropertyView(
        property_id=prop.id,
        user_id=user_id,
        sector=prop.sector,
        district=prop.district,
        property_type=prop.property_type,
        type=prop.type,
        price=prop.price,
    )
    db.session.add(view)
    db.session.commit()
    return jsonify({"ok": True}), 201


# ============================================
# GET /insights/trends
# ============================================
# Returns:
#   - avg_price_per_sector
#   - avg_price_per_district
#   - avg_price_per_sqft  (where size_sqft known)
#   - top_growing_sectors (most listings created last 30 days)
@insights_bp.route("/insights/trends", methods=["GET"])
def market_trends():
    # Only consider approved buy listings
    base = Property.query.filter(
        Property.status == "approved",
        Property.type == "buy",
        Property.property_type != "land",
    )

    # ---- Avg per sector ----
    by_sector = (
        db.session.query(
            Property.sector,
            Property.district,
            func.count(Property.id).label("count"),
            func.avg(Property.price).label("avg_price"),
            func.min(Property.price).label("min_price"),
            func.max(Property.price).label("max_price"),
        )
        .filter(Property.status == "approved", Property.type == "buy", Property.property_type != "land")
        .group_by(Property.sector, Property.district)
        .all()
    )
    avg_per_sector = sorted(
        [
            {
                "sector": s, "district": d, "count": int(c),
                "avg_price": round(float(avg or 0), 0),
                "min_price": round(float(mn or 0), 0),
                "max_price": round(float(mx or 0), 0),
            }
            for s, d, c, avg, mn, mx in by_sector
        ],
        key=lambda x: -x["avg_price"],
    )

    # ---- Avg per district ----
    by_district = (
        db.session.query(
            Property.district,
            func.count(Property.id),
            func.avg(Property.price),
        )
        .filter(Property.status == "approved", Property.type == "buy", Property.property_type != "land")
        .group_by(Property.district).all()
    )
    avg_per_district = [
        {"district": d, "count": int(c), "avg_price": round(float(avg or 0), 0)}
        for d, c, avg in by_district
    ]

    # ---- Avg price per sqft (overall, by sector) ----
    sqft_rows = (
        Property.query
        .filter(
            Property.status == "approved", Property.type == "buy",
            Property.property_type != "land",
            Property.size_sqft != None, Property.size_sqft > 0,
        ).all()
    )
    per_sector_sqft = {}
    for p in sqft_rows:
        per_sector_sqft.setdefault(p.sector, []).append(p.price / p.size_sqft)
    avg_price_per_sqft = sorted(
        [
            {"sector": s, "avg_per_sqft": round(sum(vs) / len(vs), 0)}
            for s, vs in per_sector_sqft.items() if vs
        ],
        key=lambda x: -x["avg_per_sqft"],
    )

    # ---- Top growing sectors (most NEW listings last 30 days) ----
    cutoff = datetime.utcnow() - timedelta(days=30)
    growth = (
        db.session.query(Property.sector, func.count(Property.id))
        .filter(Property.created_at >= cutoff, Property.status == "approved")
        .group_by(Property.sector)
        .order_by(desc(func.count(Property.id)))
        .limit(5).all()
    )
    top_growing = [
        {"sector": s, "new_listings_30d": int(c)} for s, c in growth
    ]

    # ---- Total stats ----
    total_listings = Property.query.filter_by(status="approved").count()

    return jsonify({
        "totals": {
            "total_active_listings": total_listings,
            "currency": "RWF",
        },
        "avg_per_sector": avg_per_sector,
        "avg_per_district": avg_per_district,
        "avg_price_per_sqft": avg_price_per_sqft,
        "top_growing_sectors": top_growing,
    }), 200


# ============================================
# GET /insights/trending?days=7&limit=10
# ============================================
# Properties with most views in the last N days.
@insights_bp.route("/insights/trending", methods=["GET"])
def trending_properties():
    try:
        days = max(1, min(int(request.args.get("days", 7)), 90))
    except ValueError:
        days = 7
    try:
        limit = max(1, min(int(request.args.get("limit", 10)), 50))
    except ValueError:
        limit = 10

    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.session.query(
            PropertyView.property_id,
            func.count(PropertyView.id).label("views"),
        )
        .filter(PropertyView.viewed_at >= cutoff)
        .group_by(PropertyView.property_id)
        .order_by(desc("views"))
        .limit(limit).all()
    )

    # Hydrate with current property data; drop rows whose property was deleted
    properties = []
    for prop_id, view_count in rows:
        p = Property.query.get(prop_id)
        if not p or p.status != "approved":
            continue
        properties.append({**p.to_dict(), "view_count": int(view_count)})

    return jsonify({
        "days": days,
        "count": len(properties),
        "properties": properties,
    }), 200


# ============================================
# GET /insights/recommendations
# ============================================
# Content-based recommendations using the user's view history:
#   1. Look at their last 30 views -> count sectors + property_types + price band
#   2. Score active listings by overlap with their preferences
#   3. Return top N (excluding ones they've already viewed recently)
#
# For users with no history, returns "popular" (top viewed) listings as a cold-start.
@insights_bp.route("/insights/recommendations", methods=["GET"])
@jwt_required()
def recommendations():
    user_id = int(get_jwt_identity())
    try:
        limit = max(1, min(int(request.args.get("limit", 8)), 20))
    except ValueError:
        limit = 8

    # ---- Build user's preference profile from views ----
    cutoff = datetime.utcnow() - timedelta(days=60)
    recent_views = (
        PropertyView.query
        .filter(PropertyView.user_id == user_id, PropertyView.viewed_at >= cutoff)
        .all()
    )

    # Cold start - no history yet -> recommend trending
    if len(recent_views) < 2:
        # Fall back to most-viewed last 30 days
        trend_rows = (
            db.session.query(
                PropertyView.property_id,
                func.count(PropertyView.id).label("views"),
            )
            .filter(PropertyView.viewed_at >= datetime.utcnow() - timedelta(days=30))
            .group_by(PropertyView.property_id)
            .order_by(desc("views"))
            .limit(limit * 2).all()
        )
        properties = []
        for pid, _ in trend_rows:
            p = Property.query.get(pid)
            if p and p.status == "approved" and p.user_id != user_id:
                properties.append({**p.to_dict(), "match_reason": "Popular this week"})
            if len(properties) >= limit:
                break
        # If still empty (no views yet at all), pick newest approved
        if not properties:
            newest = (
                Property.query
                .filter(Property.status == "approved", Property.user_id != user_id)
                .order_by(Property.created_at.desc())
                .limit(limit).all()
            )
            properties = [{**p.to_dict(), "match_reason": "New on EstateAI"} for p in newest]
        return jsonify({"strategy": "cold_start", "properties": properties}), 200

    # ---- Build profile ----
    sector_pref = Counter([v.sector for v in recent_views if v.sector])
    type_pref = Counter([v.property_type for v in recent_views if v.property_type])
    listing_kind_pref = Counter([v.type for v in recent_views if v.type])
    prices = [v.price for v in recent_views if v.price]
    avg_price = sum(prices) / len(prices) if prices else None
    viewed_ids = {v.property_id for v in recent_views}

    # ---- Candidate listings (approved, not their own, not already viewed) ----
    candidates = (
        Property.query
        .filter(
            Property.status == "approved",
            Property.user_id != user_id,
            ~Property.id.in_(viewed_ids) if viewed_ids else True,
        ).limit(200).all()
    )

    # ---- Score each candidate ----
    scored = []
    for p in candidates:
        score = 0
        reasons = []
        # Sector match
        if p.sector in sector_pref:
            s = sector_pref[p.sector]
            score += s * 3
            reasons.append(f"You browsed {p.sector}")
        # Property type match
        if p.property_type in type_pref:
            score += type_pref[p.property_type] * 2
        # Listing kind (buy/rent) match
        if p.type in listing_kind_pref:
            score += listing_kind_pref[p.type]
        # Price proximity (within ±30% of avg)
        if avg_price and p.price:
            ratio = p.price / avg_price
            if 0.7 <= ratio <= 1.3:
                score += 2
                if not reasons:
                    reasons.append("Similar price range")
        if score > 0:
            scored.append((score, p, reasons))

    scored.sort(key=lambda x: -x[0])
    top = scored[:limit]
    properties = [
        {**p.to_dict(), "match_reason": (reasons[0] if reasons else "Matches your taste"), "match_score": int(score)}
        for score, p, reasons in top
    ]

    return jsonify({
        "strategy": "personalized",
        "profile": {
            "top_sectors": sector_pref.most_common(3),
            "top_types": type_pref.most_common(3),
            "avg_price_viewed": round(avg_price, 0) if avg_price else None,
            "views_analyzed": len(recent_views),
        },
        "properties": properties,
    }), 200
