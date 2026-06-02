# ============================================
# Structured logging + per-request request_id
# ============================================
# Renders log lines as JSON so Render's log aggregator can parse them and so
# admins can grep on request_id when debugging. Falls back to a readable
# console format when FLASK_ENV != "production".
import json
import logging
import os
import sys
import time
import uuid
from flask import g, request, has_request_context


class JsonFormatter(logging.Formatter):
    def format(self, record):
        payload = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created)),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if has_request_context():
            payload["request_id"] = getattr(g, "request_id", None)
            payload["path"] = request.path
            payload["method"] = request.method
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        for k, v in getattr(record, "extra_fields", {}).items():
            payload[k] = v
        return json.dumps(payload, default=str)


def init_logging(app):
    is_prod = os.environ.get("FLASK_ENV") == "production"
    handler = logging.StreamHandler(sys.stdout)
    if is_prod:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            datefmt="%H:%M:%S",
        ))
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)

    @app.before_request
    def _attach_request_id():
        rid = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
        g.request_id = rid
        g._req_started = time.time()

    @app.after_request
    def _emit_access_log(response):
        try:
            dur_ms = int((time.time() - getattr(g, "_req_started", time.time())) * 1000)
            response.headers["X-Request-ID"] = getattr(g, "request_id", "-")
            logging.getLogger("access").info(
                f"{request.method} {request.path} {response.status_code} {dur_ms}ms"
            )
        except Exception:
            pass
        return response
