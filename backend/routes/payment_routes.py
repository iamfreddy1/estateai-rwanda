# ============================================
# PAYMENT ROUTES
# ============================================
# Pricing (override via env if you want):
#   CONTACT_UNLOCK_PRICE_RWF (default 500)   - one-time, unlocks one property
#   PREMIUM_PRICE_RWF        (default 5000)  - 1 month landlord premium
import json
import os
import uuid
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_

from models.database import (db, User, Property, Payment, PropertyContactUnlock)
from services.payments import request_payment, check_status

pay_bp = Blueprint("payments", __name__)

CONTACT_UNLOCK_PRICE_RWF = int(os.environ.get("CONTACT_UNLOCK_PRICE_RWF", "500"))
PREMIUM_PRICE_RWF = int(os.environ.get("PREMIUM_PRICE_RWF", "5000"))
PREMIUM_DAYS = int(os.environ.get("PREMIUM_DAYS", "30"))


# ============================================
# POST /payments/contact-unlock
#   Body: { property_id, phone, provider: 'mtn'|'airtel' }
# ============================================
@pay_bp.route("/payments/contact-unlock", methods=["POST"])
@jwt_required()
def init_contact_unlock():
    uid = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    pid = data.get("property_id")
    phone = (data.get("phone") or "").strip()
    provider = (data.get("provider") or "mtn").lower()

    if not pid: return jsonify({"error": "property_id required"}), 400
    if not phone: return jsonify({"error": "phone required"}), 400
    if provider not in ("mtn", "airtel"):
        return jsonify({"error": "provider must be 'mtn' or 'airtel'"}), 400

    prop = Property.query.get(int(pid))
    if not prop: return jsonify({"error": "Property not found"}), 404
    if prop.user_id == uid:
        return jsonify({"error": "You own this listing"}), 400

    # Already unlocked?
    existing = PropertyContactUnlock.query.filter_by(user_id=uid, property_id=prop.id).first()
    if existing:
        return jsonify({"already_unlocked": True}), 200

    reference = f"unlock-{uid}-{prop.id}-{uuid.uuid4().hex[:6]}"
    resp = request_payment(provider, phone, CONTACT_UNLOCK_PRICE_RWF,
                           reference, f"Unlock contact for {prop.title[:40]}")
    txid = resp.get("transaction_id")
    pay = Payment(
        user_id=uid, provider=resp.get("provider", provider),
        transaction_id=txid or f"err-{uuid.uuid4().hex[:8]}",
        amount=CONTACT_UNLOCK_PRICE_RWF, phone=phone, status=resp.get("status", "failed"),
        purpose="contact_unlock", target_type="property", target_id=str(prop.id),
        reference=reference, raw=json.dumps(resp),
    )
    db.session.add(pay); db.session.commit()
    return jsonify({"payment": pay.to_dict(),
                    "amount": CONTACT_UNLOCK_PRICE_RWF, "currency": "RWF"}), 201


# ============================================
# POST /payments/premium
#   Body: { phone, provider }
# ============================================
@pay_bp.route("/payments/premium", methods=["POST"])
@jwt_required()
def init_premium():
    uid = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    phone = (data.get("phone") or "").strip()
    provider = (data.get("provider") or "mtn").lower()
    if not phone: return jsonify({"error": "phone required"}), 400
    if provider not in ("mtn", "airtel"):
        return jsonify({"error": "provider must be 'mtn' or 'airtel'"}), 400

    reference = f"premium-{uid}-{uuid.uuid4().hex[:6]}"
    resp = request_payment(provider, phone, PREMIUM_PRICE_RWF, reference,
                           f"EstateAI Landlord Premium — {PREMIUM_DAYS} days")
    pay = Payment(
        user_id=uid, provider=resp.get("provider", provider),
        transaction_id=resp.get("transaction_id") or f"err-{uuid.uuid4().hex[:8]}",
        amount=PREMIUM_PRICE_RWF, phone=phone, status=resp.get("status", "failed"),
        purpose="premium", target_type="user", target_id=str(uid),
        reference=reference, raw=json.dumps(resp),
    )
    db.session.add(pay); db.session.commit()
    return jsonify({"payment": pay.to_dict(),
                    "amount": PREMIUM_PRICE_RWF, "days": PREMIUM_DAYS, "currency": "RWF"}), 201


# ============================================
# GET /payments/<id>/status
#   Polls provider for live status + applies side-effects on first 'success'
# ============================================
@pay_bp.route("/payments/<int:pay_id>/status", methods=["GET"])
@jwt_required()
def payment_status(pay_id):
    uid = int(get_jwt_identity())
    pay = Payment.query.get(pay_id)
    if not pay or pay.user_id != uid:
        return jsonify({"error": "Not found"}), 404

    if pay.status in ("success", "failed"):
        return jsonify({"payment": pay.to_dict()}), 200

    live = check_status(pay.provider, pay.transaction_id)
    new_status = live.get("status", pay.status)
    if new_status != pay.status:
        pay.status = new_status
        if new_status == "success":
            _apply_payment_side_effects(pay)
        db.session.commit()
    return jsonify({"payment": pay.to_dict(), "provider_state": live}), 200


def _apply_payment_side_effects(pay: Payment):
    """Called once when a payment transitions to 'success'."""
    user = User.query.get(pay.user_id)
    if not user: return
    if pay.purpose == "premium":
        base = user.premium_until if (user.premium_until and user.premium_until > datetime.utcnow()) else datetime.utcnow()
        user.premium_until = base + timedelta(days=PREMIUM_DAYS)
    elif pay.purpose == "contact_unlock" and pay.target_id:
        existing = PropertyContactUnlock.query.filter_by(
            user_id=user.id, property_id=int(pay.target_id)).first()
        if not existing:
            db.session.add(PropertyContactUnlock(
                user_id=user.id, property_id=int(pay.target_id),
                payment_id=pay.id,
            ))


# ============================================
# GET /properties/<id>/contact   - returns phone IF allowed
# ============================================
@pay_bp.route("/properties/<int:pid>/contact", methods=["GET"])
@jwt_required()
def get_property_contact(pid):
    uid = int(get_jwt_identity())
    prop = Property.query.get(pid)
    if not prop: return jsonify({"error": "Not found"}), 404
    me = User.query.get(uid)

    # Conditions that grant immediate access:
    #   - I'm the owner
    #   - I'm an admin
    #   - I have active premium
    #   - I have an unlock record for THIS property
    allowed = (
        prop.user_id == uid
        or (me and me.is_admin)
        or (me and me.premium_until and me.premium_until > datetime.utcnow())
        or bool(PropertyContactUnlock.query.filter_by(
            user_id=uid, property_id=prop.id).first())
    )
    if not allowed:
        return jsonify({
            "locked": True,
            "unlock_price_rwf": CONTACT_UNLOCK_PRICE_RWF,
            "premium_price_rwf": PREMIUM_PRICE_RWF,
        }), 200

    owner = prop.owner
    return jsonify({
        "locked": False,
        "name": owner.name or owner.email.split("@")[0],
        "phone": owner.phone,
        "email": owner.email if me and me.is_admin else None,
        "is_agent": owner.agent_status == "approved",
    }), 200


# ============================================
# POST /payments/webhook/<provider>   (MTN / Airtel callbacks)
# ============================================
@pay_bp.route("/payments/webhook/<provider>", methods=["POST"])
def payment_webhook(provider):
    payload = request.get_json(silent=True) or {}
    txid = payload.get("transactionId") or payload.get("transaction", {}).get("id")
    if not txid: return jsonify({"ok": True}), 200
    pay = Payment.query.filter_by(transaction_id=str(txid)).first()
    if not pay: return jsonify({"ok": True}), 200

    live = check_status(pay.provider, pay.transaction_id)
    new_status = live.get("status", "pending")
    if new_status != pay.status:
        pay.status = new_status
        if new_status == "success":
            _apply_payment_side_effects(pay)
        db.session.commit()
    return jsonify({"ok": True}), 200
