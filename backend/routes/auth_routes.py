# ============================================
# AUTHENTICATION ROUTES
# ============================================
# POST /auth/signup -> create new user (email/password)
# POST /auth/login  -> log in (email/password) -> JWT
# POST /auth/google -> log in / sign up with a Google ID token
# GET  /auth/me     -> protected, returns current user info

import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from models.database import db, User

auth_bp = Blueprint("auth", __name__)


# ============================================
# Helpers
# ============================================
def is_valid_email(email):
    return isinstance(email, str) and "@" in email and "." in email


def _allowed_google_audiences():
    """Comma-separated GOOGLE_CLIENT_IDS env var.
    Set this on Render to your Web + Android client IDs (any token coming
    from one of these is trusted)."""
    raw = os.environ.get("GOOGLE_CLIENT_IDS", "")
    return [c.strip() for c in raw.split(",") if c.strip()]


# ============================================
# POST /auth/signup
# ============================================
@auth_bp.route("/auth/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    name = (data.get("name") or "").strip() or None

    if not is_valid_email(email):
        return jsonify({"error": "Invalid email address"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    user = User(email=email, name=name, auth_provider="email")
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "An account with that email already exists"}), 409

    token = create_access_token(identity=str(user.id))
    return jsonify({"message": "Account created successfully", "token": token, "user": user.to_dict()}), 201


# ============================================
# POST /auth/login
# ============================================
@auth_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"message": "Login successful", "token": token, "user": user.to_dict()}), 200


# ============================================
# POST /auth/google
# ============================================
# Accepts a Google ID token, verifies it with Google, then creates or
# logs in the matching user. Returns OUR JWT.
#
# Body: { "id_token": "<google id token from the mobile/web client>" }
@auth_bp.route("/auth/google", methods=["POST"])
def google_login():
    data = request.get_json(silent=True) or {}
    incoming_token = data.get("id_token") or data.get("idToken")
    if not incoming_token:
        return jsonify({"error": "Missing id_token"}), 400

    audiences = _allowed_google_audiences()
    if not audiences:
        return jsonify({
            "error": "Server not configured for Google login (GOOGLE_CLIENT_IDS env var missing)"
        }), 500

    # ---- 1. Verify the token with Google ----
    # google_id_token.verify_oauth2_token() accepts a single audience.
    # We try each allowed audience until one matches.
    payload = None
    last_err = None
    for aud in audiences:
        try:
            payload = google_id_token.verify_oauth2_token(
                incoming_token,
                google_requests.Request(),
                aud,
            )
            break
        except ValueError as e:
            last_err = e
    if payload is None:
        return jsonify({"error": f"Invalid Google token: {last_err}"}), 401

    # ---- 2. Extract user info ----
    google_sub = payload.get("sub")
    email = (payload.get("email") or "").lower()
    name = payload.get("name") or (email.split("@")[0] if email else None)
    avatar = payload.get("picture")
    email_verified = payload.get("email_verified", False)

    if not google_sub or not email:
        return jsonify({"error": "Google token missing required fields"}), 400
    if not email_verified:
        return jsonify({"error": "Google account email is not verified"}), 401

    # ---- 3. Find or create the user ----
    # Priority: existing google_sub > existing email (link accounts)
    user = User.query.filter_by(google_sub=google_sub).first()
    if not user:
        user = User.query.filter_by(email=email).first()
        if user:
            # Link this Google account to the existing email-based account
            user.google_sub = google_sub
            if not user.avatar_url:
                user.avatar_url = avatar
        else:
            # Brand new user
            user = User(
                email=email,
                name=name,
                avatar_url=avatar,
                google_sub=google_sub,
                auth_provider="google",
            )
            db.session.add(user)

    db.session.commit()

    # ---- 4. Issue OUR JWT ----
    token = create_access_token(identity=str(user.id))
    return jsonify({
        "message": "Google login successful",
        "token": token,
        "user": user.to_dict(),
    }), 200


# ============================================
# GET /auth/me
# ============================================
@auth_bp.route("/auth/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict()}), 200


# ============================================
# POST /auth/push-token   (register Expo push token)
# ============================================
@auth_bp.route("/auth/push-token", methods=["POST"])
@jwt_required()
def register_push_token():
    from datetime import datetime
    data = request.get_json(silent=True) or {}
    token = (data.get("token") or "").strip()
    # Allow empty string to UNregister (e.g. on logout from this device)
    if token and not token.startswith("ExponentPushToken"):
        return jsonify({"error": "Invalid Expo push token format"}), 400

    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.expo_push_token = token or None
    user.push_token_updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"ok": True}), 200


# ============================================
# POST /auth/upload-id   (attach national ID URL, sets status=pending)
# ============================================
@auth_bp.route("/auth/upload-id", methods=["POST"])
@jwt_required()
def upload_national_id():
    data = request.get_json(silent=True) or {}
    url = (data.get("national_id_url") or "").strip()
    if not url:
        return jsonify({"error": "Missing national_id_url"}), 400

    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.national_id_url = url
    user.verification_status = "pending"
    user.rejection_reason = None
    db.session.commit()
    return jsonify({"message": "ID uploaded - awaiting verification", "user": user.to_dict()}), 200


# ============================================
# Admin: verify/reject a user
# ============================================
@auth_bp.route("/auth/users/<int:uid>/verify", methods=["POST"])
@jwt_required()
def admin_verify_user(uid):
    from datetime import datetime
    me_id = int(get_jwt_identity())
    me_user = User.query.get(me_id)
    if not me_user or not me_user.is_admin:
        return jsonify({"error": "Admin access required"}), 403
    target = User.query.get(uid)
    if not target:
        return jsonify({"error": "User not found"}), 404
    target.verification_status = "verified"
    target.verified_at = datetime.utcnow()
    target.rejection_reason = None
    db.session.commit()
    return jsonify({"message": "User verified", "user": target.to_dict()}), 200


@auth_bp.route("/auth/users/<int:uid>/reject", methods=["POST"])
@jwt_required()
def admin_reject_user(uid):
    me_id = int(get_jwt_identity())
    me_user = User.query.get(me_id)
    if not me_user or not me_user.is_admin:
        return jsonify({"error": "Admin access required"}), 403
    data = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "").strip() or "Rejected by admin"
    target = User.query.get(uid)
    if not target:
        return jsonify({"error": "User not found"}), 404
    target.verification_status = "rejected"
    target.rejection_reason = reason
    db.session.commit()
    return jsonify({"message": "User rejected", "user": target.to_dict()}), 200
