# ============================================
# SOCKET.IO SETUP
# ============================================
# Single source of truth for the SocketIO instance + auth + event handlers.
# Imported by app.py (which calls init_socketio(app)).

from datetime import datetime
from flask_socketio import SocketIO, join_room, leave_room, emit, disconnect
from flask_jwt_extended import decode_token

from models.database import db, Conversation, Message

# CORS for SocketIO - allow all origins (mobile app uses native fetch, not browser)
socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode="eventlet",
    ping_timeout=60,
    ping_interval=25,
)


# ============================================
# Helpers
# ============================================
def _user_id_from_token(token):
    """Extract user_id from JWT - returns int or None."""
    if not token:
        return None
    try:
        decoded = decode_token(token)
        sub = decoded.get("sub")
        return int(sub) if sub else None
    except Exception:
        return None


def _user_can_access_convo(convo, user_id):
    return convo and (convo.buyer_id == user_id or convo.seller_id == user_id)


# Map socket session id -> user id (lets us know who disconnected)
_sid_to_user = {}


# ============================================
# CONNECT / DISCONNECT
# ============================================
@socketio.on("connect")
def handle_connect(auth):
    """
    auth payload should look like: { "token": "<JWT>" }
    Sent by the client when calling io.connect(url, { auth: { token } }).
    """
    from flask import request as flask_request
    token = (auth or {}).get("token")
    user_id = _user_id_from_token(token)
    if not user_id:
        # Reject the connection
        return False

    sid = flask_request.sid
    _sid_to_user[sid] = user_id

    # Each user joins a personal room so we can DM them
    join_room(f"user:{user_id}")
    emit("connected", {"user_id": user_id})


@socketio.on("disconnect")
def handle_disconnect():
    from flask import request as flask_request
    _sid_to_user.pop(flask_request.sid, None)


# ============================================
# JOIN / LEAVE CONVERSATION ROOM
# ============================================
@socketio.on("join_conversation")
def handle_join_convo(data):
    from flask import request as flask_request
    sid = flask_request.sid
    user_id = _sid_to_user.get(sid)
    if not user_id:
        return

    convo_id = (data or {}).get("conversation_id")
    if not convo_id:
        emit("error", {"message": "Missing conversation_id"})
        return

    convo = Conversation.query.get(int(convo_id))
    if not _user_can_access_convo(convo, user_id):
        emit("error", {"message": "Access denied"})
        return

    join_room(f"convo:{convo_id}")
    emit("joined", {"conversation_id": convo_id})


@socketio.on("leave_conversation")
def handle_leave_convo(data):
    convo_id = (data or {}).get("conversation_id")
    if convo_id:
        leave_room(f"convo:{convo_id}")


# ============================================
# SEND MESSAGE
# ============================================
@socketio.on("send_message")
def handle_send_message(data):
    """
    data: { "conversation_id": <int>, "content": "..." }
    Saves to DB, then emits "new_message" to:
      - the conversation room (for whoever has it open)
      - the recipient's personal user room (for the conversation list to update)
    """
    from flask import request as flask_request
    sid = flask_request.sid
    user_id = _sid_to_user.get(sid)
    if not user_id:
        emit("error", {"message": "Not authenticated"})
        return

    convo_id = (data or {}).get("conversation_id")
    content = ((data or {}).get("content") or "").strip()
    if not convo_id or not content:
        emit("error", {"message": "Missing conversation_id or content"})
        return
    if len(content) > 2000:
        emit("error", {"message": "Message too long"})
        return

    convo = Conversation.query.get(int(convo_id))
    if not _user_can_access_convo(convo, user_id):
        emit("error", {"message": "Access denied"})
        return

    msg = Message(conversation_id=convo.id, sender_id=user_id, content=content)
    convo.last_message_at = datetime.utcnow()
    db.session.add(msg)
    db.session.commit()

    payload = msg.to_dict()

    # Broadcast to everyone watching this conversation (the room)
    socketio.emit("new_message", payload, room=f"convo:{convo.id}")

    # Also notify the OTHER user's personal room - so their conversation list
    # updates even if they don't have this thread open.
    other_id = convo.seller_id if user_id == convo.buyer_id else convo.buyer_id
    socketio.emit(
        "conversation_updated",
        {"conversation": convo.to_dict(current_user_id=other_id)},
        room=f"user:{other_id}",
    )

    # Push notification to the recipient (works even if they have the app closed)
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


# ============================================
# Initialization helper
# ============================================
def init_socketio(app):
    """Wire SocketIO into the Flask app."""
    socketio.init_app(app)
    return socketio


# ============================================
# Hook for REST -> Socket broadcasts
# ============================================
# Other modules (chat_routes.py REST POST) call this to push out a message
# that was created via REST instead of socket.
def broadcast_new_message(message_obj, conversation_obj):
    payload = message_obj.to_dict()
    socketio.emit("new_message", payload, room=f"convo:{conversation_obj.id}")
    other_id = (
        conversation_obj.seller_id
        if message_obj.sender_id == conversation_obj.buyer_id
        else conversation_obj.buyer_id
    )
    socketio.emit(
        "conversation_updated",
        {"conversation": conversation_obj.to_dict(current_user_id=other_id)},
        room=f"user:{other_id}",
    )
