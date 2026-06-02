# ============================================
# Audit helper — convenience for blueprints
# ============================================
from flask import request, g
from models.database import db, AuditLog, User


def record(action: str, *, actor_id: int | None = None,
           target_type: str = None, target_id=None, detail: str = None):
    """Write an immutable audit row. Never raises; failure logs to stderr only."""
    try:
        email = None
        if actor_id:
            u = User.query.get(actor_id)
            email = u.email if u else None
        row = AuditLog(
            actor_id=actor_id, actor_email=email,
            action=action, target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            detail=detail,
            ip=(request.headers.get("X-Forwarded-For") or request.remote_addr) if request else None,
        )
        db.session.add(row); db.session.commit()
    except Exception as e:
        import logging
        logging.getLogger("audit").exception("audit write failed: %s", e)
