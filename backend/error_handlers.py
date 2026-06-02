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

    # ---- replace /health to also ping the DB ----
    @app.route("/health", methods=["GET"])
    def health():
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
