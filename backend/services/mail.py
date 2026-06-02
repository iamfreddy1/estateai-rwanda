# ============================================
# MAIL PROVIDER  (Resend by default, console fallback for dev)
# ============================================
# Uses Resend's REST API directly (no extra dependency - we already have 'requests').
# If RESEND_API_KEY is NOT set, the email body is printed to the backend terminal
# so dev/local flows work without provider setup. This matches the LLM pattern.
import os
import logging

log = logging.getLogger("mail")

RESEND_API_URL = "https://api.resend.com/emails"
DEFAULT_FROM = os.environ.get("MAIL_FROM", "EstateAI Rwanda <onboarding@resend.dev>")


def send(to_email: str, subject: str, text: str, html: str | None = None) -> dict:
    """Send an email. Returns {ok, provider, id?, error?}. Never raises."""
    key = os.environ.get("RESEND_API_KEY")
    if not key:
        # ---- dev mode: print the email to backend console so flows are testable ----
        banner = "=" * 70
        log.warning(
            f"\n{banner}\n DEV EMAIL (no RESEND_API_KEY set - email NOT actually sent)"
            f"\n TO:      {to_email}\n SUBJECT: {subject}\n BODY:\n{text}\n{banner}"
        )
        return {"ok": True, "provider": "console", "id": None}

    try:
        import requests
        payload = {"from": DEFAULT_FROM, "to": [to_email], "subject": subject, "text": text}
        if html:
            payload["html"] = html
        r = requests.post(
            RESEND_API_URL, json=payload,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            timeout=15,
        )
        if r.status_code in (200, 202):
            return {"ok": True, "provider": "resend", "id": r.json().get("id")}
        log.error("Resend %s: %s", r.status_code, r.text[:300])
        return {"ok": False, "provider": "resend", "error": r.text[:300]}
    except Exception as e:
        log.exception("mail send failed")
        return {"ok": False, "provider": "resend", "error": str(e)}


def send_password_reset(to_email: str, name: str | None, code: str) -> dict:
    """Convenience: pre-formatted password-reset email."""
    greet = f"Hi {name}," if name else "Hi,"
    text = (
        f"{greet}\n\n"
        f"Your EstateAI Rwanda password reset code is:\n\n"
        f"    {code}\n\n"
        f"This code expires in 30 minutes. If you didn't request a password reset, you can safely ignore this email.\n\n"
        f"— EstateAI Rwanda"
    )
    return send(to_email, "Your EstateAI Rwanda password reset code", text)
