# ============================================
# PROPERTY ROUTES (Rwanda CRUD + filters)
# ============================================
# GET    /properties                    -> list with rich filters (public)
# GET    /properties/<id>               -> single property detail (public)
# POST   /properties                    -> create new listing (auth)
# DELETE /properties/<id>               -> delete your own listing (auth)
#
# Supported GET /properties filters:
#   ?type=buy|rent
#   ?property_type=house|villa|apartment|land
#   ?district=Gasabo|Kicukiro|Nyarugenge
#   ?sector=Nyarutarama
#   ?location=substring          (case-insensitive on sector OR location)
#   ?min_price=...&max_price=...
#   ?bedrooms=N                  (minimum)
#   ?bathrooms=N                 (minimum)

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models.database import db, Property

property_bp = Blueprint("property", __name__)

DEFAULT_IMAGE = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800"

# Required when creating a property listing
REQUIRED_FIELDS = ["title", "price", "district", "sector", "property_type"]


# ============================================
# Helper: parse optional int query param
# ============================================
def _qp_int(name, default=None):
    raw = request.args.get(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _qp_float(name, default=None):
    raw = request.args.get(name)
    if raw is None or raw == "":
        return default
    try:
        return float(raw)
    except ValueError:
        return default


# ============================================
# GET /properties (with filters)
# ============================================
@property_bp.route("/properties", methods=["GET"])
def list_properties():
    type_filter         = (request.args.get("type") or "").strip().lower()
    property_type_filter= (request.args.get("property_type") or "").strip().lower()
    district_filter     = (request.args.get("district") or "").strip()
    sector_filter       = (request.args.get("sector") or "").strip()
    location_filter     = (request.args.get("location") or "").strip()
    min_price           = _qp_float("min_price")
    max_price           = _qp_float("max_price")
    min_bedrooms        = _qp_int("bedrooms")
    min_bathrooms       = _qp_int("bathrooms")

    query = Property.query

    if type_filter in ("buy", "rent"):
        query = query.filter(Property.type == type_filter)

    if property_type_filter:
        query = query.filter(Property.property_type == property_type_filter)

    if district_filter:
        query = query.filter(Property.district.ilike(f"%{district_filter}%"))

    if sector_filter:
        query = query.filter(Property.sector.ilike(f"%{sector_filter}%"))

    if location_filter:
        # Match against either sector or generic location
        like = f"%{location_filter}%"
        query = query.filter(
            db.or_(
                Property.sector.ilike(like),
                Property.location.ilike(like),
                Property.district.ilike(like),
            )
        )

    if min_price is not None:
        query = query.filter(Property.price >= min_price)
    if max_price is not None:
        query = query.filter(Property.price <= max_price)
    if min_bedrooms is not None:
        query = query.filter(Property.bedrooms >= min_bedrooms)
    if min_bathrooms is not None:
        query = query.filter(Property.bathrooms >= min_bathrooms)

    properties = query.order_by(Property.created_at.desc()).all()

    return jsonify({
        "count": len(properties),
        "properties": [p.to_dict() for p in properties],
        "filters": {
            "type": type_filter or None,
            "property_type": property_type_filter or None,
            "district": district_filter or None,
            "sector": sector_filter or None,
            "location": location_filter or None,
            "min_price": min_price,
            "max_price": max_price,
            "bedrooms": min_bedrooms,
            "bathrooms": min_bathrooms,
        }
    }), 200


# ============================================
# GET /properties/<id>
# ============================================
@property_bp.route("/properties/<int:prop_id>", methods=["GET"])
def get_property(prop_id):
    prop = Property.query.get(prop_id)
    if not prop:
        return jsonify({"error": "Property not found"}), 404
    return jsonify({"property": prop.to_dict()}), 200


# ============================================
# POST /properties (auth required)
# ============================================
@property_bp.route("/properties", methods=["POST"])
@jwt_required()
def create_property():
    data = request.get_json(silent=True) or {}

    # Required fields
    missing = [f for f in REQUIRED_FIELDS if f not in data or data[f] in (None, "")]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    user_id = int(get_jwt_identity())

    try:
        prop = Property(
            # Core
            title=str(data["title"]).strip(),
            price=float(data["price"]),
            currency=str(data.get("currency", "RWF")).upper(),
            type=str(data.get("type", "buy")).lower(),
            property_type=str(data["property_type"]).lower(),

            # Location
            district=str(data["district"]).strip(),
            sector=str(data["sector"]).strip(),
            location=str(data.get("location") or data["sector"]).strip(),
            latitude=float(data["latitude"]) if data.get("latitude") not in (None, "") else None,
            longitude=float(data["longitude"]) if data.get("longitude") not in (None, "") else None,

            # Building
            bedrooms=int(data["bedrooms"]) if data.get("bedrooms") not in (None, "") else None,
            bathrooms=int(data["bathrooms"]) if data.get("bathrooms") not in (None, "") else None,
            size_sqft=int(data["size_sqft"]) if data.get("size_sqft") not in (None, "") else None,
            year_built=int(data["year_built"]) if data.get("year_built") not in (None, "") else None,
            furnished=bool(data.get("furnished", False)),
            parking=int(data.get("parking", 0)),
            modern_finish=bool(data.get("modern_finish", False)),

            # Land
            land_size=int(data["land_size"]) if data.get("land_size") not in (None, "") else None,
            road_access=str(data.get("road_access", "paved")).lower(),
            proximity_to_city=int(data["proximity_to_city"]) if data.get("proximity_to_city") not in (None, "") else None,

            # Media
            image_url=(data.get("image") or "").strip() or DEFAULT_IMAGE,

            user_id=user_id,
        )
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid field value: {e}"}), 400

    if prop.type not in ("buy", "rent"):
        return jsonify({"error": "type must be 'buy' or 'rent'"}), 400

    db.session.add(prop)
    db.session.commit()

    return jsonify({
        "message": "Property created",
        "property": prop.to_dict(),
    }), 201


# ============================================
# DELETE /properties/<id> (owner only)
# ============================================
@property_bp.route("/properties/<int:prop_id>", methods=["DELETE"])
@jwt_required()
def delete_property(prop_id):
    user_id = int(get_jwt_identity())

    prop = Property.query.get(prop_id)
    if not prop:
        return jsonify({"error": "Property not found"}), 404

    if prop.user_id != user_id:
        return jsonify({"error": "You can only delete your own listings"}), 403

    db.session.delete(prop)
    db.session.commit()
    return jsonify({"message": "Property deleted"}), 200
