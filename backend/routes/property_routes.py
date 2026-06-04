# ============================================
# PROPERTY ROUTES (Rwanda CRUD + filters + verification)
# ============================================
# GET    /properties                    -> list approved listings (public)
#                                          ?status=mine -> auth user's own (any status)
#                                          ?status=pending|approved|rejected (admin only)
# GET    /properties/<id>               -> single property detail
# POST   /properties                    -> create new listing (auth)
#                                          new listings start as status="pending"
# PATCH  /properties/<id>               -> update fields (owner)
# DELETE /properties/<id>               -> delete (owner OR admin)
# POST   /properties/<id>/images        -> add Cloudinary image URLs (owner)
# POST   /properties/<id>/ownership     -> attach ownership doc URL (owner)

from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_jwt_extended import verify_jwt_in_request

from models.database import db, Property, User

property_bp = Blueprint("property", __name__)

DEFAULT_IMAGE = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800"
REQUIRED_FIELDS = ["title", "price", "district", "sector", "property_type"]


# ============================================
# Query helpers
# ============================================
def _qp_int(name, default=None):
    raw = request.args.get(name)
    if raw is None or raw == "": return default
    try: return int(raw)
    except ValueError: return default

def _qp_float(name, default=None):
    raw = request.args.get(name)
    if raw is None or raw == "": return default
    try: return float(raw)
    except ValueError: return default


def _current_user_or_none():
    """Try to read JWT - returns User or None (no error if missing)."""
    try:
        verify_jwt_in_request(optional=True)
        uid = get_jwt_identity()
        return User.query.get(int(uid)) if uid else None
    except Exception:
        return None


# ============================================
# GET /properties (with filters + status visibility)
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
    status_filter       = (request.args.get("status") or "").strip().lower()

    query = Property.query

    # ---- Status visibility rules ----
    current_user = _current_user_or_none()
    if status_filter == "mine":
        # User's own listings (any status)
        if not current_user:
            return jsonify({"error": "Login required for mine"}), 401
        query = query.filter(Property.user_id == current_user.id)
    elif status_filter in ("pending", "rejected"):
        # Only admins can see all pending/rejected
        if not current_user or not current_user.is_admin:
            return jsonify({"error": "Admin access required"}), 403
        query = query.filter(Property.status == status_filter)
    else:
        # Default public view: only approved listings
        query = query.filter(Property.status == "approved")

    # ---- Filters ----
    if type_filter in ("buy", "rent"):
        query = query.filter(Property.type == type_filter)
    if property_type_filter:
        query = query.filter(Property.property_type == property_type_filter)
    if district_filter:
        query = query.filter(Property.district.ilike(f"%{district_filter}%"))
    if sector_filter:
        query = query.filter(Property.sector.ilike(f"%{sector_filter}%"))
    if location_filter:
        like = f"%{location_filter}%"
        query = query.filter(db.or_(
            Property.sector.ilike(like),
            Property.location.ilike(like),
            Property.district.ilike(like),
        ))
    if min_price is not None: query = query.filter(Property.price >= min_price)
    if max_price is not None: query = query.filter(Property.price <= max_price)
    if min_bedrooms is not None: query = query.filter(Property.bedrooms >= min_bedrooms)
    if min_bathrooms is not None: query = query.filter(Property.bathrooms >= min_bathrooms)

    properties = query.order_by(Property.created_at.desc()).all()

    is_admin = current_user and current_user.is_admin
    return jsonify({
        "count": len(properties),
        "properties": [p.to_dict(include_owner_doc=is_admin) for p in properties],
        "filters": {
            "type": type_filter or None, "property_type": property_type_filter or None,
            "district": district_filter or None, "sector": sector_filter or None,
            "location": location_filter or None,
            "min_price": min_price, "max_price": max_price,
            "bedrooms": min_bedrooms, "bathrooms": min_bathrooms,
            "status": status_filter or None,
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

    current_user = _current_user_or_none()
    is_owner = current_user and prop.user_id == current_user.id
    is_admin = current_user and current_user.is_admin

    # Pending/rejected listings only visible to owner or admin
    if prop.status != "approved" and not (is_owner or is_admin):
        return jsonify({"error": "Property not found"}), 404

    return jsonify({"property": prop.to_dict(include_owner_doc=is_owner or is_admin)}), 200


# ============================================
# POST /properties (auth required)
# ============================================
@property_bp.route("/properties", methods=["POST"])
@jwt_required()
def create_property():
    data = request.get_json(silent=True) or {}
    missing = [f for f in REQUIRED_FIELDS if f not in data or data[f] in (None, "")]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    user_id = int(get_jwt_identity())

    try:
        prop = Property(
            title=str(data["title"]).strip(),
            price=float(data["price"]),
            currency=str(data.get("currency", "RWF")).upper(),
            type=str(data.get("type", "buy")).lower(),
            property_type=str(data["property_type"]).lower(),

            district=str(data["district"]).strip(),
            sector=str(data["sector"]).strip(),
            location=str(data.get("location") or data["sector"]).strip(),
            latitude=float(data["latitude"]) if data.get("latitude") not in (None, "") else None,
            longitude=float(data["longitude"]) if data.get("longitude") not in (None, "") else None,

            bedrooms=int(data["bedrooms"]) if data.get("bedrooms") not in (None, "") else None,
            bathrooms=int(data["bathrooms"]) if data.get("bathrooms") not in (None, "") else None,
            size_sqft=int(data["size_sqft"]) if data.get("size_sqft") not in (None, "") else None,
            year_built=int(data["year_built"]) if data.get("year_built") not in (None, "") else None,
            furnished=bool(data.get("furnished", False)),
            parking=int(data.get("parking", 0)),
            modern_finish=bool(data.get("modern_finish", False)),

            land_size=int(data["land_size"]) if data.get("land_size") not in (None, "") else None,
            road_access=str(data.get("road_access", "paved")).lower(),
            proximity_to_city=int(data["proximity_to_city"]) if data.get("proximity_to_city") not in (None, "") else None,

            image_url=(data.get("image") or "").strip() or DEFAULT_IMAGE,
            ownership_doc_url=(data.get("ownership_doc") or "").strip() or None,

            # Brand new listings need approval
            status="pending",
            user_id=user_id,
        )
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid field value: {e}"}), 400

    if prop.type not in ("buy", "rent"):
        return jsonify({"error": "type must be 'buy' or 'rent'"}), 400

    # Optional: if multiple images sent, store them
    images = data.get("images") or []
    if isinstance(images, list) and images:
        prop.set_images(images)

    db.session.add(prop)
    db.session.commit()

    return jsonify({
        "message": "Listing submitted - awaiting admin verification",
        "property": prop.to_dict(include_owner_doc=True),
    }), 201


# ============================================
# POST /properties/<id>/ownership   (owner attaches verification doc)
# ============================================
@property_bp.route("/properties/<int:prop_id>/ownership", methods=["POST"])
@jwt_required()
def attach_ownership_doc(prop_id):
    data = request.get_json(silent=True) or {}
    doc_url = (data.get("ownership_doc_url") or "").strip()
    if not doc_url:
        return jsonify({"error": "Missing ownership_doc_url"}), 400

    user_id = int(get_jwt_identity())
    prop = Property.query.get(prop_id)
    if not prop:
        return jsonify({"error": "Property not found"}), 404
    if prop.user_id != user_id:
        return jsonify({"error": "Only the owner can attach docs"}), 403

    prop.ownership_doc_url = doc_url
    # If listing was rejected and user is re-uploading, set back to pending
    if prop.status == "rejected":
        prop.status = "pending"
        prop.rejection_reason = None
    db.session.commit()
    return jsonify({"message": "Ownership doc attached", "property": prop.to_dict(include_owner_doc=True)}), 200


# ============================================
# DELETE /properties/<id> (owner OR admin)
# ============================================
@property_bp.route("/properties/<int:prop_id>", methods=["DELETE"])
@jwt_required()
def delete_property(prop_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    prop = Property.query.get(prop_id)
    if not prop:
        return jsonify({"error": "Property not found"}), 404

    if prop.user_id != user_id and not (user and user.is_admin):
        return jsonify({"error": "You can only delete your own listings"}), 403

    # Defensive cleanup of FK children before deleting the parent row.
    # Postgres rejects parent deletes when child rows reference it without
    # ON DELETE CASCADE on the foreign key.
    try:
        from models.database import (
            PropertyView, RentalInquiry, PropertyContactUnlock,
            Conversation, Message,
        )
        conv_ids = [c.id for c in Conversation.query.filter_by(property_id=prop_id).all()]
        if conv_ids:
            Message.query.filter(Message.conversation_id.in_(conv_ids)).delete(synchronize_session=False)
            Conversation.query.filter_by(property_id=prop_id).delete(synchronize_session=False)
        PropertyView.query.filter_by(property_id=prop_id).delete(synchronize_session=False)
        RentalInquiry.query.filter_by(property_id=prop_id).delete(synchronize_session=False)
        PropertyContactUnlock.query.filter_by(property_id=prop_id).delete(synchronize_session=False)
        db.session.flush()
        db.session.delete(prop)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Delete failed: {str(e)[:200]}"}), 500
    return jsonify({"message": "Property deleted"}), 200


# ============================================
# Admin actions: approve / reject
# ============================================


# ============================================
# PUT /properties/<id>   - owner edits their own listing
# ============================================
# Allow owner (or admin) to update mutable fields. Whitelisted columns only,
# so request body cannot escalate (e.g. flip is_admin via JSON).
_EDITABLE_FIELDS = {
    "title", "price", "currency", "type", "property_type",
    "district", "sector", "location", "latitude", "longitude",
    "bedrooms", "bathrooms", "size_sqft", "year_built",
    "furnished", "parking", "modern_finish",
    "land_size", "road_access", "proximity_to_city",
    "image_url",
    # rental amenities
    "internet", "water", "electricity", "security",
}


@property_bp.route("/properties/<int:prop_id>", methods=["PUT", "PATCH"])
@jwt_required()
def update_property(prop_id):
    uid = int(get_jwt_identity())
    prop = Property.query.get(prop_id)
    if not prop:
        return jsonify({"error": "Property not found"}), 404
    me = User.query.get(uid)
    if prop.user_id != uid and not (me and me.is_admin):
        return jsonify({"error": "You are not the owner of this listing"}), 403

    data = request.get_json(silent=True) or {}
    changed = []
    for k, v in data.items():
        if k in _EDITABLE_FIELDS:
            try:
                # Coerce numbers/bools coming in as JSON or strings
                if k in ("price", "latitude", "longitude"):
                    v = float(v) if v not in (None, "") else None
                elif k in ("bedrooms", "bathrooms", "size_sqft", "year_built",
                          "parking", "land_size", "proximity_to_city"):
                    v = int(v) if v not in (None, "") else None
                elif k in ("furnished", "modern_finish", "internet", "water",
                           "electricity", "security"):
                    if isinstance(v, str):
                        v = v.lower() in ("1", "true", "yes")
                setattr(prop, k, v)
                changed.append(k)
            except (ValueError, TypeError):
                return jsonify({"error": f"Invalid value for {k}"}), 400

    # Allow images update via images_json list of URLs
    if "images" in data and isinstance(data["images"], list):
        prop.set_images(data["images"])
        changed.append("images")

    # If owner edits an approved listing materially, drop back to pending
    if changed and prop.status == "approved" and not (me and me.is_admin):
        material = {"title", "price", "type", "property_type",
                    "district", "sector", "size_sqft", "bedrooms", "images"}
        if any(k in material for k in changed):
            prop.status = "pending"
            changed.append("status->pending")

    db.session.commit()
    return jsonify({"property": prop.to_dict(), "changed": changed}), 200


# ============================================
# GET /properties/<id>/similar   - comparable properties (uses comparables engine)
# ============================================
@property_bp.route("/properties/<int:prop_id>/similar", methods=["GET"])
def similar_properties(prop_id):
    base = Property.query.get(prop_id)
    if not base:
        return jsonify({"error": "Not found"}), 404
    # Filter pool: same type (rent/buy) and approved + available
    pool = (Property.query
            .filter(Property.id != base.id,
                    Property.type == base.type,
                    Property.status == "approved")
            .all())
    if not pool:
        return jsonify({"similar": []}), 200

    # Lightweight similarity: same sector first, then same property_type,
    # then bed-count proximity, then price proximity. No heavy ML imports needed.
    def score(p):
        s = 0
        if p.sector and base.sector and p.sector == base.sector: s += 10
        if p.district and base.district and p.district == base.district: s += 4
        if p.property_type and base.property_type and p.property_type == base.property_type: s += 5
        if p.bedrooms and base.bedrooms:
            s += max(0, 4 - abs(p.bedrooms - base.bedrooms))
        if p.price and base.price:
            s += max(0, 5 - abs(p.price - base.price) / max(base.price, 1) * 5)
        if p.featured: s += 1
        return s

    ranked = sorted(pool, key=score, reverse=True)[:6]
    return jsonify({"similar": [p.to_dict() for p in ranked]}), 200


@property_bp.route("/properties/<int:prop_id>/approve", methods=["POST"])
@jwt_required()
def approve_property(prop_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    prop = Property.query.get(prop_id)
    if not prop:
        return jsonify({"error": "Property not found"}), 404

    prop.status = "approved"
    prop.rejection_reason = None
    prop.approved_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Listing approved", "property": prop.to_dict()}), 200


@property_bp.route("/properties/<int:prop_id>/reject", methods=["POST"])
@jwt_required()
def reject_property(prop_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "").strip() or "Rejected by admin"

    prop = Property.query.get(prop_id)
    if not prop:
        return jsonify({"error": "Property not found"}), 404

    prop.status = "rejected"
    prop.rejection_reason = reason
    db.session.commit()
    return jsonify({"message": "Listing rejected", "property": prop.to_dict()}), 200
