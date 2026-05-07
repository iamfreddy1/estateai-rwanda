# ============================================
# AUTHENTICATION ROUTES
# ============================================
# POST /auth/signup -> create new user
# POST /auth/login  -> get JWT token
# GET  /auth/me     -> protected, returns current user info

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError

from models.database import db, User

auth_bp = Blueprint("auth", __name__)


# ============================================
# Helper: Validate email looks reasonable
# ============================================
def is_valid_email(email):
    return isinstance(email, str) and "@" in email and "." in email


# ============================================
# POST /auth/signup
# ============================================
# Creates a new user account.
# Expected JSON: { "email": "...", "password": "...", "name": "..." (optional) }
@auth_bp.route("/auth/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    name = (data.get("name") or "").strip() or None

    # Validation
    if not is_valid_email(email):
        return jsonify({"error": "Invalid email address"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # Create user
    user = User(email=email, name=name)
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        # email already exists (UNIQUE constraint failed)
        db.session.rollback()
        return jsonify({"error": "An account with that email already exists"}), 409

    # Generate a JWT immediately so the user is "logged in" right after signup
    token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Account created successfully",
        "token": token,
        "user": user.to_dict(),
    }), 201


# ============================================
# POST /auth/login
# ============================================
# Authenticates an existing user.
# Expected JSON: { "email": "...", "password": "..." }
@auth_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        # Don't reveal whether the email exists - just say credentials are bad
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user.to_dict(),
    }), 200


# ============================================
# GET /auth/me
# ============================================
# Returns the current user's info. Requires a valid JWT.
# This is how the frontend can check "am I logged in?" on page load.
@auth_bp.route("/auth/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict()}), 200
