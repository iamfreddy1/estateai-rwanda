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

from models.database import db
from routes.predict_routes import predict_bp
from routes.auth_routes import auth_bp
from routes.property_routes import property_bp
from routes.analytics_routes import analytics_bp
from routes.admin_routes import admin_bp
from routes.upload_routes import upload_bp
from routes.chat_routes import chat_bp
from socketio_app import init_socketio


# ============================================
# CREATE THE FLASK APP
# ============================================
app = Flask(__name__)
CORS(app)

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
    if os.environ.get("FLASK_ENV") == "production":
        raise RuntimeError(
            "JWT_SECRET_KEY environment variable is required in production!"
        )
    jwt_secret = "dev-secret-change-me"  # only for local dev
app.config["JWT_SECRET_KEY"] = jwt_secret


# ============================================
# INITIALIZE EXTENSIONS
# ============================================
db.init_app(app)
jwt = JWTManager(app)
socketio = init_socketio(app)


# ============================================
# CREATE TABLES IF NEEDED
# ============================================
with app.app_context():
    db.create_all()
    print("[app] Database tables ready.")


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


@app.route("/health", methods=["GET"])
def health():
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
    socketio.run(app, debug=debug, host="0.0.0.0", port=port)
