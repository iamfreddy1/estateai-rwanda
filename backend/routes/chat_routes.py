# ============================================
# CHAT ROUTES (REST endpoints)
# ============================================
# POST   /conversations              -> start (or reuse) conversation about a property
# GET    /conversations              -> list current user's conversations
# GET    /conversations/<id>         -> conversation detail
# GET    /conversations/<id>/messages -> paginated message history
# POST   /conversations/<id>/messages -> send a message (HTTP fallback for Socket.IO)
# POST   /conversations/<id>/read    -> mark all messages as read

from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError

from models.database import db, Conversation, Message, Property, User

chat_bp = Blueprint("chat", __name__)


# ============================================
# Helpers
# ============================================
def _ensure_member(convo, user_id):
    """Return True if user_id is buyer or seller of this conversation."""
    return convo.buyer_id == user_id or convo.seller_id == user_id


# ============================================
# POST /conversations
# ============================================
# Body: { "property_id": <int> }
# Behavior:
#   - If user is the seller, they can't start a convo with themselves -> 400
#   - If a conversation already exists for this (property, buyer, seller), return it
#   - Otherwise create a new one
@chat_bp.route("/conversations", methods=["POST"])
@jwt_required()
def start_conversation():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    property_id = data.get("property_id")
    if not property_id:
        return jsonify({"error": "property_id is required"}), 400

    prop = Property.query.get(int(property_id))
    if not prop:
        return jsonify({"error": "Property not found"}), 404
    if not prop.user_id:
        return jsonify({"error": "This listing has no seller to message"}), 400
    if prop.user_id == user_id:
        return jsonify({"error": "You can't start a conversation with yourself"}), 400

    existing = Conversation.query.filter_by(
        property_id=prop.id, buyer_id=user_id, seller_id=prop.user_id
    ).first()
    if existing:
        return jsonify({"conversation": existing.to_dict(current_user_id=user_id)}), 200

    convo = Conversation(
        property_id=prop.id,
        buyer_id=user_id,
        seller_id=prop.user_id,
    )
    try:
        db.session.add(convo)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        # Race condition - return whichever existing one
        convo = Conversation.query.filter_by(
            property_id=prop.id, buyer_id=user_id, seller_id=prop.user_id
        ).first()
    return jsonify({"conversation": convo.to_dict(current_user_id=user_id)}), 201


# ============================================
# GET /conversations  (current user's threads)
# ============================================
@chat_bp.route("/conversations", methods=["GET"])
@jwt_required()
def list_conversations():
    user_id = int(get_jwt_identity())
    convos = (
        Conversation.query
        .filter(db.or_(Conversation.buyer_id == user_id, Conversation.seller_id == user_id))
        .order_by(Conversation.last_message_at.desc())
        .all()
    )
    return jsonify({
        "count": len(convos),
        "conversations": [c.to_dict(current_user_id=user_id) for c in convos],
    }), 200


# ============================================
# GET /conversations/<id>
# ============================================
@chat_bp.route("/conversations/<int:cid>", methods=["GET"])
@jwt_required()
def get_conversation(cid):
    user_id = int(get_jwt_identity())
    convo = Conversation.query.get(cid)
    if not convo:
        return jsonify({"error": "Conversation not found"}), 404
    if not _ensure_member(convo, user_id):
        return jsonify({"error": "Access denied"}), 403
    return jsonify({"conversation": convo.to_dict(current_user_id=user_id)}), 200


# ============================================
# GET /conversations/<id>/messages?limit=50&before=<msg_id>
# ============================================
@chat_bp.route("/conversations/<int:cid>/messages", methods=["GET"])
@jwt_required()
def list_messages(cid):
    user_id = int(get_jwt_identity())
    convo = Conversation.query.get(cid)
    if not convo:
        return jsonify({"error": "Conversation not found"}), 404
    if not _ensure_member(convo, user_id):
        return jsonify({"error": "Access denied"}), 403

    try:
        limit = max(1, min(int(request.args.get("limit", 50)), 200))
    except ValueError:
        limit = 50
    before = request.args.get("before")

    q = Message.query.filter_by(conversation_id=cid)
    if before:
        try:
            q = q.filter(Message.id < int(before))
        except ValueError:
            pass

    msgs = q.order_by(Message.created_at.desc()).limit(limit).all()
    msgs.reverse()      # return oldest -> newest for easy rendering
    return jsonify({
        "count": len(msgs),
        "messages": [m.to_dict() for m in msgs],
    }), 200


# ============================================
# POST /conversations/<id>/messages    (send via HTTP)
# ============================================
@chat_bp.route("/conversations/<int:cid>/messages", methods=["POST"])
@jwt_required()
def send_message(cid):
    user_id = int(get_jwt_identity())
    convo = Conversation.query.get(cid)
    if not convo:
        return jsonify({"error": "Conversation not found"}), 404
    if not _ensure_member(convo, user_id):
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json(silent=True) or {}
    content = (data.get("content") or "").strip()
    if not content:
        return jsonify({"error": "Empty message"}), 400
    if len(content) > 2000:
        return jsonify({"error": "Message too long (max 2000 chars)"}), 400

    msg = Message(conversation_id=cid, sender_id=user_id, content=content)
    convo.last_message_at = datetime.utcnow()
    db.session.add(msg)
    db.session.commit()

    # Push to anyone connected via WebSocket
    try:
        from socketio_app import broadcast_new_message
        broadcast_new_message(msg, convo)
    except Exception:
        pass

    # Send push notification to the recipient
    try:
        from push_notifications import send_push_to_user
        recipient = convo.seller if user_id == convo.buyer_id else convo.buyer
        sender_name = (msg.sender.name or msg.sender.email.split("@")[0]) if msg.sender else "Someone"
        send_push_to_user(
            recipient,
            title=sender_name,
            body=content if len(content) <= 100 else content[:97] + "...",
            data={
                "type": "new_message",
                "conversation_id": convo.id,
                "property_title": convo.property.title if convo.property else None,
            },
        )
    except Exception:
        pass

    return jsonify({"message": msg.to_dict()}), 201


# ============================================
# POST /conversations/<id>/read
# ============================================
# Mark all unread messages from the other party as read.
@chat_bp.route("/conversations/<int:cid>/read", methods=["POST"])
@jwt_required()
def mark_read(cid):
    user_id = int(get_jwt_identity())
    convo = Conversation.query.get(cid)
    if not convo:
        return jsonify({"error": "Conversation not found"}), 404
    if not _ensure_member(convo, user_id):
        return jsonify({"error": "Access denied"}), 403

    now = datetime.utcnow()
    updated = (
        Message.query
        .filter(
            Message.conversation_id == cid,
            Message.sender_id != user_id,
            Message.read_at.is_(None),
        )
        .update({"read_at": now}, synchronize_session=False)
    )
    db.session.commit()
    return jsonify({"marked_read": updated}), 200
