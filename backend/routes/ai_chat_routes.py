# ============================================
# AI CHAT ROUTES  (EstateAI Rwanda assistant)
# ============================================
# POST   /ai/chat                  send a message, get a reply  (jwt)
# GET    /ai/history               list user's conversations
# GET    /ai/conversation/<id>     fetch all messages in a conversation
# DELETE /ai/conversation/<id>     delete a conversation
#
# Storage: AIConversation / AIMessage in models.database
# LLM:     ml.llm.chat() - provider-agnostic
# Safety:  per-user in-memory rate limit + prompt-injection guard
# NOTE:    in-memory limiter resets per worker; swap for Redis at scale.

import time
from collections import defaultdict, deque
from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models.database import db, AIConversation, AIMessage
from ml.llm import chat as llm_chat, looks_unsafe

ai_chat_bp = Blueprint("ai_chat", __name__)

_RATE_WINDOW_S = 60
_RATE_MAX = 10
_user_hits = defaultdict(deque)
CONTEXT_TURNS = 12          # how many previous messages to send back to the LLM
MAX_INPUT_CHARS = 2000


def _rate_limited(uid: int) -> bool:
    now = time.time()
    q = _user_hits[uid]
    while q and now - q[0] > _RATE_WINDOW_S:
        q.popleft()
    if len(q) >= _RATE_MAX:
        return True
    q.append(now)
    return False




SUMMARY_TRIGGER = 20          # summarize once a conversation has more than this many messages
SUMMARY_KEEP_RECENT = 8       # always keep the N most recent verbatim


def _maybe_summarize(conv):
    """If a conversation grows large, replace older messages with one compact
    'summary' system note. Saves prompt tokens AND preserves long-term context."""
    msgs = AIMessage.query.filter_by(conversation_id=conv.id).order_by(AIMessage.id).all()
    if len(msgs) <= SUMMARY_TRIGGER:
        return None
    older = msgs[:-SUMMARY_KEEP_RECENT]
    # if there's already a system summary at the start, expand it instead of stacking
    if older and older[0].role == "system":
        return None
    transcript = "\n".join(f"{m.role}: {m.content[:400]}" for m in older)
    try:
        summary, _ = llm_chat([{
            "role": "user",
            "content": ("Summarize this real-estate conversation in 5-7 bullet points, "
                        "preserving the user's stated budget, location preferences, key questions "
                        "and decisions. Plain text, no preamble.\n\n" + transcript)
        }])
    except Exception:
        return None
    # delete the older rows and insert a single 'system' summary message
    for m in older:
        db.session.delete(m)
    db.session.flush()
    note = AIMessage(conversation_id=conv.id, role="system",
                     content="Conversation summary so far:\n" + summary)
    db.session.add(note)
    db.session.commit()
    return summary

@ai_chat_bp.route("/ai/chat", methods=["POST"])
@jwt_required()
def chat():
    uid = int(get_jwt_identity())
    if _rate_limited(uid):
        return jsonify({"error": "Rate limit: 10 messages per minute. Please slow down."}), 429

    data = request.get_json(silent=True) or {}
    text = (data.get("message") or "").strip()
    if not text:
        return jsonify({"error": "message is required"}), 400
    if len(text) > MAX_INPUT_CHARS:
        return jsonify({"error": f"message too long (max {MAX_INPUT_CHARS} chars)"}), 400
    if looks_unsafe(text):
        return jsonify({"error": "That request looks unsafe. Please rephrase."}), 400

    # find or create conversation
    conv_id = data.get("conversation_id")
    if conv_id:
        conv = AIConversation.query.filter_by(id=int(conv_id), user_id=uid).first()
        if not conv:
            return jsonify({"error": "Conversation not found"}), 404
    else:
        conv = AIConversation(user_id=uid, title=text[:60])
        db.session.add(conv)
        db.session.flush()

    # store the user message
    user_msg = AIMessage(conversation_id=conv.id, role="user", content=text)
    db.session.add(user_msg)
    db.session.flush()

    # build context window (oldest -> newest)
    recent = (
        AIMessage.query.filter_by(conversation_id=conv.id)
        .order_by(AIMessage.id.desc()).limit(CONTEXT_TURNS).all()
    )
    msgs = [{"role": m.role, "content": m.content} for m in reversed(recent)]

    try:
        reply, usage = llm_chat(msgs)
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"AI unavailable: {e}"}), 503

    ai_msg = AIMessage(
        conversation_id=conv.id, role="assistant", content=reply,
        prompt_tokens=usage.get("prompt_tokens"),
        completion_tokens=usage.get("completion_tokens"),
    )
    db.session.add(ai_msg)
    conv.updated_at = datetime.utcnow()
    db.session.commit()
    _maybe_summarize(conv)

    return jsonify({
        "conversation_id": conv.id,
        "message_id": ai_msg.id,
        "reply": reply,
        "usage": usage,
    }), 200


@ai_chat_bp.route("/ai/history", methods=["GET"])
@jwt_required()
def history():
    uid = int(get_jwt_identity())
    convs = (
        AIConversation.query.filter_by(user_id=uid)
        .order_by(AIConversation.updated_at.desc()).limit(50).all()
    )
    return jsonify({"conversations": [c.to_dict(include_last_message=True) for c in convs]}), 200


@ai_chat_bp.route("/ai/conversation/<int:cid>", methods=["GET"])
@jwt_required()
def conversation(cid):
    uid = int(get_jwt_identity())
    conv = AIConversation.query.filter_by(id=cid, user_id=uid).first()
    if not conv:
        return jsonify({"error": "Not found"}), 404
    msgs = AIMessage.query.filter_by(conversation_id=cid).order_by(AIMessage.id).all()
    return jsonify({
        "conversation": conv.to_dict(),
        "messages": [m.to_dict() for m in msgs],
    }), 200


@ai_chat_bp.route("/ai/conversation/<int:cid>", methods=["DELETE"])
@jwt_required()
def delete_conversation(cid):
    uid = int(get_jwt_identity())
    conv = AIConversation.query.filter_by(id=cid, user_id=uid).first()
    if not conv:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(conv)
    db.session.commit()
    return jsonify({"ok": True}), 200



# ============================================
# GET /ai/faq   (no auth - static curated content for instant answers)
# ============================================
@ai_chat_bp.route("/ai/faq", methods=["GET"])
def get_faq_route():
    from services.faq import get_faq
    return jsonify({"items": get_faq()}), 200
