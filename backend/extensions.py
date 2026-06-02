# ============================================
# FLASK EXTENSIONS  (single source of truth)
# ============================================
# Defining extensions in their own module avoids circular imports between
# app.py and route blueprints that need to decorate with them (Flask-Limiter,
# Flask-Caching, Flask-Mail later, etc.).
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# In-memory storage is fine for a single Render worker. Swap to Redis once
# you scale to multiple workers (set RATELIMIT_STORAGE_URI=redis://...).
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per minute"],
    storage_uri="memory://",
)
