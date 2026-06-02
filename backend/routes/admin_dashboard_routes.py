# ============================================
# ADMIN DASHBOARD ROUTES
# ============================================
# All endpoints require an authenticated user with is_admin=True. The check is
# a small decorator so every route stays readable and the failure mode is
# uniform (403 with a clear message).
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, or_, desc

from models.database import (
    db, User, Property, Conversation, Message,
    AIConversation, AIMessage,
)
from extensions import limiter

admin_dash_bp = Blueprint("admin_dash", __name__)


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        uid = int(get_jwt_identity())
        u = User.query.get(uid)
        if not u or not u.is_admin:
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper


# ============================================
# GET /admin/stats   - dashboard summary metrics
# ============================================
@admin_dash_bp.route("/admin/stats", methods=["GET"])
@jwt_required()
@admin_required
def stats():
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    total_users = User.query.count()
    total_properties = Property.query.count()
    active_properties = Property.query.filter(Property.status == "approved").count()
    pending_properties = Property.query.filter(Property.status == "pending").count()
    pending_users = User.query.filter(User.verification_status == "pending").count()
    pending_agents = User.query.filter(User.agent_status == "pending").count()
    verified_users = User.query.filter(User.verification_status == "verified").count()
    approved_agents = User.query.filter(User.agent_status == "approved").count()
    suspended_users = User.query.filter(User.suspended.is_(True)).count()

    ai_conversations = AIConversation.query.count()
    ai_messages = AIMessage.query.count()
    ai_msgs_this_week = AIMessage.query.filter(AIMessage.created_at >= week_ago).count()

    new_users_week = User.query.filter(User.created_at >= week_ago).count()
    new_users_month = User.query.filter(User.created_at >= month_ago).count()
    new_props_week = Property.query.filter(Property.created_at >= week_ago).count()

    # Monthly growth (rough: this month vs previous month)
    prev_month_start = (now - timedelta(days=60))
    this_month_start = month_ago
    prev_month_users = User.query.filter(
        User.created_at >= prev_month_start, User.created_at < this_month_start
    ).count()
    growth_pct = 0.0
    if prev_month_users > 0:
        growth_pct = round(100.0 * (new_users_month - prev_month_users) / prev_month_users, 1)

    return jsonify({
        "users": {
            "total": total_users, "verified": verified_users,
            "pending_id": pending_users, "suspended": suspended_users,
            "new_week": new_users_week, "new_month": new_users_month,
            "growth_pct_mom": growth_pct,
        },
        "agents": {"approved": approved_agents, "pending": pending_agents},
        "properties": {
            "total": total_properties, "active": active_properties,
            "pending": pending_properties, "new_week": new_props_week,
        },
        "ai": {
            "conversations": ai_conversations, "messages": ai_messages,
            "messages_week": ai_msgs_this_week,
        },
    }), 200


# ============================================
# GET /admin/timeseries   - signups + listings per day (last 30 days)
# ============================================
@admin_dash_bp.route("/admin/timeseries", methods=["GET"])
@jwt_required()
@admin_required
def timeseries():
    days = min(int(request.args.get("days", 30)), 90)
    since = datetime.utcnow() - timedelta(days=days)

    users_per_day = (
        db.session.query(func.date(User.created_at).label("d"), func.count(User.id))
        .filter(User.created_at >= since).group_by("d").order_by("d").all()
    )
    props_per_day = (
        db.session.query(func.date(Property.created_at).label("d"), func.count(Property.id))
        .filter(Property.created_at >= since).group_by("d").order_by("d").all()
    )
    msgs_per_day = (
        db.session.query(func.date(AIMessage.created_at).label("d"), func.count(AIMessage.id))
        .filter(AIMessage.created_at >= since).group_by("d").order_by("d").all()
    )

    def fmt(rows):
        return [{"date": str(d), "count": c} for d, c in rows]

    return jsonify({
        "users": fmt(users_per_day),
        "properties": fmt(props_per_day),
        "ai_messages": fmt(msgs_per_day),
        "since": since.isoformat(), "days": days,
    }), 200


# ============================================
# GET /admin/sectors-top   - top Kigali sectors by property count
# ============================================
@admin_dash_bp.route("/admin/sectors-top", methods=["GET"])
@jwt_required()
@admin_required
def sectors_top():
    rows = (
        db.session.query(Property.sector, func.count(Property.id), func.avg(Property.price))
        .filter(Property.sector.isnot(None))
        .group_by(Property.sector)
        .order_by(desc(func.count(Property.id))).limit(10).all()
    )
    return jsonify({"sectors": [
        {"sector": s, "count": c, "avg_price": round(float(p or 0))} for s, c, p in rows
    ]}), 200


# ============================================
# GET /admin/activity   - recent activity feed (mixed)
# ============================================
@admin_dash_bp.route("/admin/activity", methods=["GET"])
@jwt_required()
@admin_required
def activity():
    limit = min(int(request.args.get("limit", 20)), 50)

    recent_users = (User.query.order_by(User.created_at.desc()).limit(limit).all())
    recent_props = (Property.query.order_by(Property.created_at.desc()).limit(limit).all())

    feed = []
    for u in recent_users:
        feed.append({
            "kind": "user_signup",
            "at": u.created_at.isoformat() if u.created_at else None,
            "label": f"New user: {u.name or u.email}",
            "id": u.id,
        })
    for p in recent_props:
        feed.append({
            "kind": "property_uploaded",
            "at": p.created_at.isoformat() if p.created_at else None,
            "label": f"Listing: {p.title} ({p.sector or '—'}) {int(p.price):,} RWF",
            "id": p.id,
            "status": p.status,
        })
    feed.sort(key=lambda x: x["at"] or "", reverse=True)
    return jsonify({"items": feed[:limit]}), 200


# ============================================
# PROPERTY MODERATION
# ============================================
@admin_dash_bp.route("/admin/properties/pending", methods=["GET"])
@jwt_required()
@admin_required
def properties_pending():
    page = max(1, int(request.args.get("page", 1)))
    per_page = min(50, int(request.args.get("per_page", 20)))
    q = Property.query.filter(Property.status == "pending").order_by(Property.created_at.desc())
    total = q.count()
    items = q.offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({
        "items": [p.to_dict(include_owner_doc=True) for p in items],
        "page": page, "per_page": per_page, "total": total,
    }), 200


@admin_dash_bp.route("/admin/properties/<int:pid>/approve", methods=["POST"])
@jwt_required()
@admin_required
def property_approve(pid):
    p = Property.query.get(pid)
    if not p:
        return jsonify({"error": "Property not found"}), 404
    p.status = "approved"
    p.approved_at = datetime.utcnow()
    p.rejection_reason = None
    db.session.commit()
    return jsonify({"property": p.to_dict()}), 200


@admin_dash_bp.route("/admin/properties/<int:pid>/reject", methods=["POST"])
@jwt_required()
@admin_required
def property_reject(pid):
    p = Property.query.get(pid)
    if not p:
        return jsonify({"error": "Property not found"}), 404
    data = request.get_json(silent=True) or {}
    p.status = "rejected"
    p.rejection_reason = (data.get("reason") or "").strip() or "Rejected by admin"
    db.session.commit()
    return jsonify({"property": p.to_dict()}), 200


@admin_dash_bp.route("/admin/properties/<int:pid>/feature", methods=["POST"])
@jwt_required()
@admin_required
def property_feature(pid):
    p = Property.query.get(pid)
    if not p:
        return jsonify({"error": "Property not found"}), 404
    data = request.get_json(silent=True) or {}
    p.featured = bool(data.get("featured", True))
    db.session.commit()
    return jsonify({"property": p.to_dict()}), 200


# ============================================
# USER MANAGEMENT (list, search, suspend, promote)
# ============================================
@admin_dash_bp.route("/admin/users", methods=["GET"])
@jwt_required()
@admin_required
def users_list():
    page = max(1, int(request.args.get("page", 1)))
    per_page = min(50, int(request.args.get("per_page", 25)))
    q = (request.args.get("q") or "").strip().lower()
    status = request.args.get("status")  # optional: verified/pending/unverified/suspended/admin

    query = User.query
    if q:
        like = f"%{q}%"
        query = query.filter(or_(
            func.lower(User.email).like(like),
            func.lower(User.name).like(like),
        ))
    if status == "suspended":
        query = query.filter(User.suspended.is_(True))
    elif status == "admin":
        query = query.filter(User.is_admin.is_(True))
    elif status in ("verified", "pending", "unverified", "rejected"):
        query = query.filter(User.verification_status == status)

    total = query.count()
    items = (query.order_by(User.created_at.desc())
                  .offset((page - 1) * per_page).limit(per_page).all())
    return jsonify({
        "items": [u.to_dict() for u in items],
        "page": page, "per_page": per_page, "total": total, "q": q, "status": status,
    }), 200


@admin_dash_bp.route("/admin/users/<int:uid>/suspend", methods=["POST"])
@jwt_required()
@admin_required
def user_suspend(uid):
    target = User.query.get(uid)
    if not target:
        return jsonify({"error": "User not found"}), 404
    if target.is_admin:
        return jsonify({"error": "Cannot suspend an admin"}), 400
    data = request.get_json(silent=True) or {}
    target.suspended = True
    target.suspension_reason = (data.get("reason") or "").strip() or "Suspended by admin"
    db.session.commit()
    return jsonify({"user": target.to_dict()}), 200


@admin_dash_bp.route("/admin/users/<int:uid>/unsuspend", methods=["POST"])
@jwt_required()
@admin_required
def user_unsuspend(uid):
    target = User.query.get(uid)
    if not target:
        return jsonify({"error": "User not found"}), 404
    target.suspended = False
    target.suspension_reason = None
    db.session.commit()
    return jsonify({"user": target.to_dict()}), 200


@admin_dash_bp.route("/admin/users/<int:uid>/promote", methods=["POST"])
@jwt_required()
@admin_required
def user_promote(uid):
    # Defensive: only existing admins can promote; the @admin_required already enforces this.
    target = User.query.get(uid)
    if not target:
        return jsonify({"error": "User not found"}), 404
    target.is_admin = True
    target.role = "admin"
    db.session.commit()
    return jsonify({"user": target.to_dict()}), 200


# ============================================
# AI CONVERSATIONS REVIEW
# ============================================
@admin_dash_bp.route("/admin/ai/conversations", methods=["GET"])
@jwt_required()
@admin_required
def ai_conversations():
    page = max(1, int(request.args.get("page", 1)))
    per_page = min(50, int(request.args.get("per_page", 25)))
    q = AIConversation.query.order_by(AIConversation.updated_at.desc())
    total = q.count()
    items = q.offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({
        "items": [{
            **c.to_dict(include_last_message=True),
            "user_email": (User.query.get(c.user_id).email if c.user_id else None),
            "message_count": AIMessage.query.filter_by(conversation_id=c.id).count(),
        } for c in items],
        "page": page, "per_page": per_page, "total": total,
    }), 200


@admin_dash_bp.route("/admin/ai/conversation/<int:cid>", methods=["GET"])
@jwt_required()
@admin_required
def ai_conversation_detail(cid):
    conv = AIConversation.query.get(cid)
    if not conv:
        return jsonify({"error": "Not found"}), 404
    msgs = AIMessage.query.filter_by(conversation_id=cid).order_by(AIMessage.id).all()
    user = User.query.get(conv.user_id)
    return jsonify({
        "conversation": conv.to_dict(),
        "user": {"id": user.id, "email": user.email, "name": user.name} if user else None,
        "messages": [m.to_dict() for m in msgs],
    }), 200
