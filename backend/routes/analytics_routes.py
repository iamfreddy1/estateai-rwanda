# ============================================
# ANALYTICS ROUTES
# ============================================
# GET /analytics  -> aggregated stats for the dashboard
#
# Returns:
#   - total counts (overall, buy, rent, by property_type)
#   - average price per district + sector
#   - price ranges
#   - recent listings

from flask import Blueprint, jsonify
from sqlalchemy import func

from models.database import db, Property

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/analytics", methods=["GET"])
def get_analytics():
    # ---- Total counts ----
    total = Property.query.count()
    buy_count = Property.query.filter_by(type="buy").count()
    rent_count = Property.query.filter_by(type="rent").count()

    # ---- By property type ----
    type_counts = (
        db.session.query(Property.property_type, func.count(Property.id))
        .group_by(Property.property_type)
        .all()
    )
    by_property_type = {pt: c for pt, c in type_counts}

    # ---- By district (avg + count for buy properties only, exclude rent) ----
    district_stats_raw = (
        db.session.query(
            Property.district,
            func.count(Property.id),
            func.avg(Property.price),
            func.min(Property.price),
            func.max(Property.price),
        )
        .filter(Property.type == "buy")
        .group_by(Property.district)
        .all()
    )
    by_district = [
        {
            "district": d,
            "count": int(c),
            "avg_price": round(float(avg or 0), 0),
            "min_price": round(float(mn or 0), 0),
            "max_price": round(float(mx or 0), 0),
        }
        for d, c, avg, mn, mx in district_stats_raw
    ]

    # ---- By sector (top 10 by avg price) ----
    sector_stats_raw = (
        db.session.query(
            Property.sector,
            Property.district,
            func.count(Property.id),
            func.avg(Property.price),
        )
        .filter(Property.type == "buy", Property.property_type != "land")
        .group_by(Property.sector, Property.district)
        .all()
    )
    by_sector = sorted(
        [
            {
                "sector": s,
                "district": d,
                "count": int(c),
                "avg_price": round(float(avg or 0), 0),
            }
            for s, d, c, avg in sector_stats_raw
        ],
        key=lambda x: x["avg_price"],
        reverse=True,
    )

    # ---- Overall averages ----
    avg_price_overall = (
        db.session.query(func.avg(Property.price))
        .filter(Property.type == "buy", Property.property_type != "land")
        .scalar()
    )

    # ---- Recent listings (top 5) ----
    recent = (
        Property.query.order_by(Property.created_at.desc()).limit(5).all()
    )
    recent_listings = [p.to_dict() for p in recent]

    return jsonify({
        "totals": {
            "all": total,
            "buy": buy_count,
            "rent": rent_count,
            "by_property_type": by_property_type,
        },
        "averages": {
            "overall_avg_price_rwf": round(float(avg_price_overall or 0), 0),
            "currency": "RWF",
        },
        "by_district": by_district,
        "by_sector": by_sector,
        "recent_listings": recent_listings,
    }), 200
