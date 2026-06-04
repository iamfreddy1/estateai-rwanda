# ============================================
# Production error handlers + enriched health-check
# ============================================
import logging
from flask import jsonify, g
from sqlalchemy import text


def init_error_handlers(app, db):
    log = logging.getLogger("errors")

    @app.errorhandler(404)
    def _404(e):
        return jsonify({"error": "Not found", "request_id": getattr(g, "request_id", None)}), 404

    @app.errorhandler(405)
    def _405(e):
        return jsonify({"error": "Method not allowed", "request_id": getattr(g, "request_id", None)}), 405

    @app.errorhandler(429)
    def _429(e):
        return jsonify({"error": "Too many requests", "request_id": getattr(g, "request_id", None)}), 429

    @app.errorhandler(500)
    def _500(e):
        log.exception("Internal server error: %s", e)
        return jsonify({"error": "Internal server error", "request_id": getattr(g, "request_id", None)}), 500

    # ---- /health  -- FAST, no DB ping (used by Render's health check) ----
    # Render's free tier has a strict startup window. If we pinged the DB here
    # while Postgres was cold-starting or migrate.py was still finalizing, the
    # health check would time out and Render would mark the deploy as Failed.
    # Keep this endpoint cheap and synchronous.
    @app.route("/health", methods=["GET"])
    def health():
        import os
        return jsonify({
            "status": "healthy",
            "config": {
                "google_oauth": bool(os.environ.get("GOOGLE_CLIENT_IDS")),
                "cloudinary": bool(os.environ.get("CLOUDINARY_CLOUD_NAME")),
                "seed_secret_set": bool(os.environ.get("SEED_SECRET")),
                "openai": bool(os.environ.get("OPENAI_API_KEY")),
                "resend": bool(os.environ.get("RESEND_API_KEY")),
            },
        }), 200

    # ---- /health/deep  -- full check (DB ping), for manual debugging ----
    @app.route("/health/deep", methods=["GET"])
    def health_deep():
        import os
        db_ok = True
        try:
            db.session.execute(text("SELECT 1"))
        except Exception:
            db_ok = False
        body = {
            "status": "healthy" if db_ok else "degraded",
            "db": db_ok,
            "config": {
                "google_oauth": bool(os.environ.get("GOOGLE_CLIENT_IDS")),
                "cloudinary": bool(os.environ.get("CLOUDINARY_CLOUD_NAME")),
                "seed_secret_set": bool(os.environ.get("SEED_SECRET")),
                "openai": bool(os.environ.get("OPENAI_API_KEY")),
                "resend": bool(os.environ.get("RESEND_API_KEY")),
            },
        }
        return jsonify(body), 200 if db_ok else 503
