# ============================================
# AI-Based Property Valuation System
# Backend: Flask Application (main entry point)
# ============================================
# Reads config from environment variables for production:
#   DATABASE_URL    -> Postgres in production, SQLite locally
#   JWT_SECRET_KEY  -> required in production
#   FLASK_ENV       -> "production" or "development"

# IMPORTANT: eventlet must be imported and monkey-patched FIRST,
# before anything else uses the standard library (notably ssl/threading).
import eventlet
eventlet.monkey_patch()

import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from extensions import limiter
from models.database import db
from logging_setup import init_logging
from error_handlers import init_error_handlers
from routes.predict_routes import predict_bp
from routes.auth_routes import auth_bp
from routes.property_routes import property_bp
from routes.analytics_routes import analytics_bp
from routes.admin_routes import admin_bp
from routes.upload_routes import upload_bp
from routes.chat_routes import chat_bp
from routes.insights_routes import insights_bp
from routes.ai_chat_routes import ai_chat_bp
from routes.admin_dashboard_routes import admin_dash_bp
from routes.rental_routes import rental_bp
from routes.payment_routes import pay_bp
from socketio_app import init_socketio


# ============================================
# CREATE THE FLASK APP
# ============================================
app = Flask(__name__)
_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
CORS(app, resources={r"/*": {"origins": _origins}})  # locked down (was wide-open)

# ============================================
# CONFIGURATION
# ============================================
basedir = os.path.abspath(os.path.dirname(__file__))

# --- Database ---
# Render auto-injects DATABASE_URL when you attach a Postgres add-on.
# Render sometimes uses "postgres://" but SQLAlchemy needs "postgresql://".
db_url = os.environ.get("DATABASE_URL")
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

if not db_url:
    # Local fallback to SQLite
    db_url = f"sqlite:///{os.path.join(basedir, 'estate.db')}"
    print(f"[app] Using local SQLite at: {db_url}")
else:
    print("[app] Using DATABASE_URL from environment (production).")

app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# --- JWT ---
# Read from env in production; warn if using fallback locally.
jwt_secret = os.environ.get("JWT_SECRET_KEY")
if not jwt_secret:
    # Only allow the insecure fallback for an explicit LOCAL sqlite run.
    # Any non-sqlite (i.e. real/prod) DB without a secret is a hard error -
    # this no longer silently depends on FLASK_ENV being set.
    if db_url.startswith("sqlite"):
        jwt_secret = "dev-secret-change-me"  # local dev only
    else:
        raise RuntimeError("JWT_SECRET_KEY is required when not running local SQLite")
app.config["JWT_SECRET_KEY"] = jwt_secret
# Long-lived access tokens for mobile (no refresh-token UX in v1)
from datetime import timedelta
# Production auth: short-lived access tokens + long-lived refresh tokens.
# Access token = 1 hour (limits stolen-token blast radius)
# Refresh token = 30 days (kept in mobile secure storage; revocable server-side)
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)


# ============================================
# INITIALIZE EXTENSIONS
# ============================================
init_logging(app)
db.init_app(app)
limiter.init_app(app)
jwt = JWTManager(app)


# ---- Token revocation: check refresh-token JTI against the RevokedToken table ----
from models.database import RevokedToken
@jwt.token_in_blocklist_loader
def is_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload.get("jti")
    if not jti:
        return False
    return RevokedToken.query.filter_by(jti=jti).first() is not None


socketio = init_socketio(app)


# ============================================
# CREATE TABLES IF NEEDED
# ============================================
with app.app_context():
    db.create_all()
    print("[app] Database tables ready.")
init_error_handlers(app, db)


# ============================================
# REGISTER BLUEPRINTS
# ============================================
app.register_blueprint(predict_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(property_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(upload_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(insights_bp)
app.register_blueprint(ai_chat_bp)
app.register_blueprint(admin_dash_bp)
app.register_blueprint(rental_bp)
app.register_blueprint(pay_bp)


# ============================================
# ROOT ROUTES
# ============================================
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "EstateAI Rwanda - Property Valuation API",
        "status": "running",
        "version": "3.1 (Production)",
        "endpoints": {
            "health": "GET /health",
            "predict_house": "POST /predict-house",
            "predict_land": "POST /predict-land",
            "predict_info": "GET /predict/info",
            "signup": "POST /auth/signup",
            "login": "POST /auth/login",
            "me": "GET /auth/me (requires JWT)",
            "properties": "GET /properties (with filters)",
            "property_detail": "GET /properties/<id>",
            "create_property": "POST /properties (auth)",
            "delete_property": "DELETE /properties/<id> (owner)",
            "analytics": "GET /analytics",
        }
    })


@app.route("/_legacy_health", methods=["GET"])
def _legacy_health():
    return jsonify({
        "status": "healthy",
        "config": {
            "google_oauth": bool(os.environ.get("GOOGLE_CLIENT_IDS")),
            "cloudinary": bool(os.environ.get("CLOUDINARY_CLOUD_NAME")),
            "seed_secret_set": bool(os.environ.get("SEED_SECRET")),
        }
    }), 200


# ============================================
# RUN (local dev only - Render uses gunicorn)
# ============================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") != "production"
    # Use socketio.run instead of app.run so WebSockets work in dev too
    # On Windows the debug reloader + eventlet collide on the socket (WinError 10048),
    # so we disable the reloader. Debugger + tracebacks still work.
    socketio.run(app, debug=debug, host="0.0.0.0", port=port, use_reloader=False)
