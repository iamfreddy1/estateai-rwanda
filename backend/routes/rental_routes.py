# ============================================
# RENTAL MARKETPLACE ROUTES
# ============================================
# Kigali rental marketplace built on top of the existing Property table.
# Endpoints:
#   GET    /rentals                       browse active rentals (advanced filters)
#   GET    /rentals/<id>                  full detail
#   POST   /rentals/<id>/availability     owner: change availability lifecycle
#   POST   /rentals/<id>/inquire          renter: chat / viewing / call inquiry
#   GET    /rentals/recommend             AI-style recommendations (comparables)
#   GET    /landlord/inquiries            owner: inquiries on my listings
#   POST   /landlord/inquiries/<id>/respond   owner: reply to an inquiry
#   GET    /landlord/stats                owner: dashboard analytics
# All write/landlord endpoints are JWT-protected.

from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from sqlalchemy import func, or_, and_, desc

from models.database import (
    db, User, Property, RentalInquiry, Conversation, Message, PropertyView,
)

rental_bp = Blueprint("rentals", __name__)


# ============================================
# GET /rentals  - browse active rentals with advanced filters
# ============================================
@rental_bp.route("/rentals", methods=["GET"])
def browse_rentals():
    a = request.args
    page = max(1, int(a.get("page", 1)))
    per_page = min(50, int(a.get("per_page", 20)))

    q = Property.query.filter(
        Property.type == "rent",
        Property.status == "approved",
        Property.availability == "available",
    )

    # ---- text & location filters ----
    if a.get("district"): q = q.filter(Property.district == a.get("district"))
    if a.get("sector"):   q = q.filter(Property.sector == a.get("sector"))
    if a.get("property_type"): q = q.filter(Property.property_type == a.get("property_type"))
    text = (a.get("q") or "").strip().lower()
    if text:
        like = f"%{text}%"
        q = q.filter(or_(func.lower(Property.title).like(like),
                         func.lower(Property.location).like(like)))

    # ---- numeric filters ----
    if a.get("min_price"):
        try: q = q.filter(Property.price >= float(a["min_price"]))
        except (ValueError, TypeError): pass
    if a.get("max_price"):
        try: q = q.filter(Property.price <= float(a["max_price"]))
        except (ValueError, TypeError): pass
    if a.get("min_bedrooms"):
        try: q = q.filter(Property.bedrooms >= int(a["min_bedrooms"]))
        except (ValueError, TypeError): pass
    if a.get("min_bathrooms"):
        try: q = q.filter(Property.bathrooms >= int(a["min_bathrooms"]))
        except (ValueError, TypeError): pass

    # ---- amenity / boolean filters ----
    if a.get("furnished") in ("1", "true"):    q = q.filter(Property.furnished.is_(True))
    if a.get("parking") in ("1", "true"):      q = q.filter(Property.parking > 0)
    if a.get("internet") in ("1", "true"):     q = q.filter(Property.internet.is_(True))
    if a.get("water") in ("1", "true"):        q = q.filter(Property.water.is_(True))
    if a.get("electricity") in ("1", "true"):  q = q.filter(Property.electricity.is_(True))
    if a.get("security") in ("1", "true"):     q = q.filter(Property.security.is_(True))
    if a.get("paved_road_only") in ("1", "true"):
        q = q.filter(Property.road_access == "paved")

    # ---- sort: featured + cheapest-by-bedroom value first by default ----
    sort = a.get("sort", "best")
    if sort == "price_asc":
        q = q.order_by(Property.price.asc())
    elif sort == "price_desc":
        q = q.order_by(Property.price.desc())
    elif sort == "newest":
        q = q.order_by(Property.created_at.desc())
    else:                       # 'best' = featured first, then cheapest
        q = q.order_by(Property.featured.desc(), Property.price.asc())

    total = q.count()
    items = q.offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({
        "rentals": [p.to_dict() for p in items],
        "page": page, "per_page": per_page, "total": total,
    }), 200


# ============================================
# GET /rentals/<id> - full detail + landlord contact info
# ============================================
@rental_bp.route("/rentals/<int:pid>", methods=["GET"])
def rental_detail(pid):
    p = Property.query.get(pid)
    if not p or p.type != "rent":
        return jsonify({"error": "Rental not found"}), 404

    # Record an anonymous or authenticated view event (used by analytics)
    viewer_id = None
    try:
        verify_jwt_in_request(optional=True)
        ident = get_jwt_identity()
        viewer_id = int(ident) if ident else None
    except Exception:
        viewer_id = None
    view = PropertyView(
        property_id=p.id, user_id=viewer_id,
        sector=p.sector, district=p.district,
        property_type=p.property_type, type=p.type, price=p.price,
    )
    db.session.add(view)
    db.session.commit()

    out = p.to_dict(include_owner_doc=False)
    if p.owner:
        out["landlord"] = {
            "id": p.owner.id,
            "name": p.owner.name or p.owner.email.split("@")[0],
            "avatar_url": p.owner.avatar_url,
            "phone": p.owner.phone,
            "agency_name": p.owner.agency_name,
            "is_agent": p.owner.agent_status == "approved",
            "verified": p.owner.verification_status == "verified",
        }
    return jsonify({"rental": out}), 200


# ============================================
# POST /rentals/<id>/availability  (owner only)
# ============================================
@rental_bp.route("/rentals/<int:pid>/availability", methods=["POST"])
@jwt_required()
def set_availability(pid):
    uid = int(get_jwt_identity())
    p = Property.query.get(pid)
    if not p or p.type != "rent":
        return jsonify({"error": "Rental not found"}), 404
    if p.user_id != uid:
        return jsonify({"error": "You are not the owner of this listing"}), 403

    data = request.get_json(silent=True) or {}
    new_state = (data.get("availability") or "").lower().strip()
    if new_state not in ("available", "reserved", "rented", "expired", "hidden"):
        return jsonify({"error": "Invalid availability state"}), 400

    p.availability = new_state
    if new_state == "rented":
        p.rented_at = datetime.utcnow()
        # Auto-close any open inquiries for this listing
        RentalInquiry.query.filter_by(property_id=p.id, status="open").update(
            {"status": "closed"}, synchronize_session=False
        )
    elif new_state == "available":
        p.rented_at = None
    db.session.commit()
    return jsonify({"property": p.to_dict()}), 200


# ============================================
# POST /rentals/<id>/inquire  - renter expresses interest
# ============================================
@rental_bp.route("/rentals/<int:pid>/inquire", methods=["POST"])
@jwt_required()
def inquire(pid):
    uid = int(get_jwt_identity())
    p = Property.query.get(pid)
    if not p or p.type != "rent":
        return jsonify({"error": "Rental not found"}), 404
    if p.user_id == uid:
        return jsonify({"error": "You cannot inquire on your own listing"}), 400
    if p.availability != "available":
        return jsonify({"error": "This rental is no longer available"}), 400

    data = request.get_json(silent=True) or {}
    kind = (data.get("kind") or "chat").lower().strip()
    if kind not in ("chat", "viewing", "call"):
        return jsonify({"error": "Invalid kind"}), 400
    message = (data.get("message") or "").strip()
    viewing_date_str = data.get("viewing_date")
    viewing_date = None
    if kind == "viewing" and viewing_date_str:
        try: viewing_date = datetime.fromisoformat(viewing_date_str)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid viewing_date format (use ISO 8601)"}), 400

    inquiry = RentalInquiry(
        property_id=p.id, renter_id=uid, owner_id=p.user_id,
        kind=kind, message=message or None, viewing_date=viewing_date,
    )
    db.session.add(inquiry)

    # For chat inquiries also bootstrap a Conversation so the renter and
    # landlord can keep talking in the existing chat UI.
    if kind == "chat":
        conv = (Conversation.query
                .filter_by(property_id=p.id, buyer_id=uid, seller_id=p.user_id).first())
        if not conv:
            conv = Conversation(property_id=p.id, buyer_id=uid, seller_id=p.user_id)
            db.session.add(conv); db.session.flush()
        if message:
            db.session.add(Message(conversation_id=conv.id, sender_id=uid, content=message))
            conv.last_message_at = datetime.utcnow()

    db.session.commit()
    return jsonify({"inquiry": inquiry.to_dict()}), 201


# ============================================
# GET /rentals/recommend  - simple comparables-based recommendations
# ============================================
@rental_bp.route("/rentals/recommend", methods=["GET"])
@jwt_required()
def recommend():
    uid = int(get_jwt_identity())
    # Build a simple profile from the user's recent property views
    recent = (PropertyView.query
              .filter_by(user_id=uid)
              .filter(PropertyView.type == "rent")
              .order_by(PropertyView.viewed_at.desc()).limit(10).all())
    if not recent:
        # Cold start: return cheapest available rentals
        items = (Property.query
                 .filter(Property.type == "rent",
                         Property.status == "approved",
                         Property.availability == "available")
                 .order_by(Property.featured.desc(), Property.price.asc()).limit(10).all())
        return jsonify({"rentals": [p.to_dict() for p in items], "basis": "cold_start"}), 200

    # Profile = median price + most common sector + most common property_type
    median_price = sorted([float(v.price or 0) for v in recent if v.price])[len(recent) // 2] if recent else 200000
    sector_counts = {}
    for v in recent:
        if v.sector:
            sector_counts[v.sector] = sector_counts.get(v.sector, 0) + 1
    top_sector = max(sector_counts, key=sector_counts.get) if sector_counts else None
    types = [v.property_type for v in recent if v.property_type]
    top_type = max(set(types), key=types.count) if types else None

    q = Property.query.filter(
        Property.type == "rent",
        Property.status == "approved",
        Property.availability == "available",
    )
    if top_sector: q = q.filter(or_(Property.sector == top_sector, Property.district != None))
    if top_type:   q = q.filter(Property.property_type == top_type)
    # within ±60% of median budget
    q = q.filter(Property.price.between(median_price * 0.5, median_price * 1.6))

    items = q.order_by(Property.featured.desc(), Property.price.asc()).limit(10).all()
    # Backfill with cheapest if too few
    if len(items) < 5:
        extra = (Property.query
                 .filter(Property.type == "rent", Property.status == "approved",
                         Property.availability == "available",
                         Property.id.notin_([p.id for p in items]))
                 .order_by(Property.price.asc()).limit(10 - len(items)).all())
        items.extend(extra)
    return jsonify({
        "rentals": [p.to_dict() for p in items],
        "basis": "your_recent_views",
        "profile": {"median_price": median_price, "sector": top_sector, "property_type": top_type},
    }), 200


# ============================================
# GET /landlord/inquiries  - owner's received inquiries
# ============================================
@rental_bp.route("/landlord/inquiries", methods=["GET"])
@jwt_required()
def landlord_inquiries():
    uid = int(get_jwt_identity())
    status = request.args.get("status")
    q = RentalInquiry.query.filter_by(owner_id=uid)
    if status in ("open", "answered", "dismissed", "closed"):
        q = q.filter_by(status=status)
    items = q.order_by(RentalInquiry.created_at.desc()).limit(100).all()
    return jsonify({"inquiries": [i.to_dict() for i in items]}), 200


# ============================================
# POST /landlord/inquiries/<id>/respond
# ============================================
@rental_bp.route("/landlord/inquiries/<int:iid>/respond", methods=["POST"])
@jwt_required()
def landlord_respond(iid):
    uid = int(get_jwt_identity())
    inq = RentalInquiry.query.get(iid)
    if not inq:
        return jsonify({"error": "Inquiry not found"}), 404
    if inq.owner_id != uid:
        return jsonify({"error": "Not your inquiry"}), 403
    data = request.get_json(silent=True) or {}
    action = (data.get("action") or "respond").lower()
    response = (data.get("response") or "").strip()
    if action == "dismiss":
        inq.status = "dismissed"
    elif action == "close":
        inq.status = "closed"
    else:                       # respond
        if not response:
            return jsonify({"error": "Response message is required"}), 400
        inq.response = response
        inq.response_at = datetime.utcnow()
        inq.status = "answered"
    db.session.commit()
    return jsonify({"inquiry": inq.to_dict()}), 200


# ============================================
# GET /landlord/stats  - my rental performance
# ============================================
@rental_bp.route("/landlord/stats", methods=["GET"])
@jwt_required()
def landlord_stats():
    uid = int(get_jwt_identity())
    my = Property.query.filter_by(user_id=uid, type="rent").all()
    pids = [p.id for p in my]

    by_avail = {"available": 0, "reserved": 0, "rented": 0, "expired": 0, "hidden": 0}
    for p in my:
        by_avail[p.availability or "available"] = by_avail.get(p.availability or "available", 0) + 1

    total_views = 0
    if pids:
        total_views = PropertyView.query.filter(PropertyView.property_id.in_(pids)).count()

    inquiries_total = RentalInquiry.query.filter_by(owner_id=uid).count()
    inquiries_open = RentalInquiry.query.filter_by(owner_id=uid, status="open").count()
    viewings = RentalInquiry.query.filter_by(owner_id=uid, kind="viewing").count()

    # Per-listing roll-up for the dashboard table
    rollup = []
    for p in my:
        v = PropertyView.query.filter_by(property_id=p.id).count()
        i = RentalInquiry.query.filter_by(property_id=p.id).count()
        rollup.append({
            "id": p.id, "title": p.title, "price": p.price,
            "availability": p.availability, "featured": p.featured,
            "views": v, "inquiries": i,
            "rented_at": p.rented_at.isoformat() if p.rented_at else None,
        })
    rollup.sort(key=lambda r: r["views"], reverse=True)

    return jsonify({
        "totals": {
            "listings": len(my), "views": total_views,
            "inquiries": inquiries_total, "open_inquiries": inquiries_open,
            "viewing_requests": viewings,
        },
        "by_availability": by_avail,
        "listings": rollup,
    }), 200



# ============================================
# GET /my-inquiries  - renter's sent inquiries with landlord responses
# ============================================
@rental_bp.route("/my-inquiries", methods=["GET"])
@jwt_required()
def my_inquiries():
    uid = int(get_jwt_identity())
    status = request.args.get("status")
    q = RentalInquiry.query.filter_by(renter_id=uid)
    if status in ("open", "answered", "dismissed", "closed"):
        q = q.filter_by(status=status)
    items = q.order_by(RentalInquiry.created_at.desc()).limit(100).all()
    out = []
    for i in items:
        d = i.to_dict()
        # also expose landlord summary so the renter UI can label "you contacted X"
        if i.owner:
            d["landlord"] = {
                "id": i.owner.id,
                "name": i.owner.name or i.owner.email.split("@")[0],
                "avatar_url": i.owner.avatar_url,
                "agency_name": i.owner.agency_name,
            }
        out.append(d)
    return jsonify({"inquiries": out}), 200



# ============================================
# GET /rentals/recently-viewed  - what the current user looked at lately
# ============================================
@rental_bp.route("/rentals/recently-viewed", methods=["GET"])
@jwt_required()
def rentals_recently_viewed():
    uid = int(get_jwt_identity())
    rows = (PropertyView.query
            .filter_by(user_id=uid)
            .filter(PropertyView.type == "rent")
            .order_by(PropertyView.viewed_at.desc()).limit(20).all())
    seen, ordered = set(), []
    for r in rows:
        if r.property_id in seen: continue
        seen.add(r.property_id); ordered.append(r.property_id)
        if len(ordered) >= 6: break
    props = {p.id: p for p in Property.query.filter(Property.id.in_(ordered)).all()} if ordered else {}
    items = [props[i].to_dict() for i in ordered if i in props
             and props[i].status == "approved" and props[i].availability == "available"]
    return jsonify({"rentals": items}), 200
