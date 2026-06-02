# ============================================
# UPLOAD ROUTES  (Cloudinary primary, local filesystem fallback)
# ============================================
# POST /upload/image     -> property image upload
# POST /upload/document  -> ID / ownership-doc upload
#
# Behavior:
#  - If CLOUDINARY_* env vars are set, files go to Cloudinary (production).
#  - Otherwise, files are saved under backend/uploads/<kind>/<user_id>/ and
#    served by Flask at /uploads/<path>. This makes the app fully usable in
#    local dev without needing Cloudinary credentials.
#  - Validation: extension allowlist + 10MB cap (rejects with 400 / 413).
# ============================================
import os
import uuid
import logging

import cloudinary
import cloudinary.uploader
from flask import Blueprint, request, jsonify, send_from_directory, current_app, url_for
from flask_jwt_extended import jwt_required, get_jwt_identity

log = logging.getLogger("upload")
upload_bp = Blueprint("upload", __name__)

# ---- validation ----
ALLOWED_IMAGE_EXT = {"png", "jpg", "jpeg", "webp", "gif"}
ALLOWED_DOC_EXT = ALLOWED_IMAGE_EXT | {"pdf"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

# ---- local fallback storage ----
_BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))   # .../backend
LOCAL_UPLOADS_DIR = os.path.join(_BASE_DIR, "uploads")
os.makedirs(LOCAL_UPLOADS_DIR, exist_ok=True)


# ---- Cloudinary config (no-op if env vars missing) ----
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True,
)


def _cloudinary_configured() -> bool:
    return all([
        os.environ.get("CLOUDINARY_CLOUD_NAME"),
        os.environ.get("CLOUDINARY_API_KEY"),
        os.environ.get("CLOUDINARY_API_SECRET"),
    ])


def _ext_ok(filename: str, allowed: set) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed


def _validate_upload(file, allowed_ext):
    if not _ext_ok(file.filename or "", allowed_ext):
        return f"Unsupported file type. Allowed: {', '.join(sorted(allowed_ext))}", 400
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > MAX_UPLOAD_BYTES:
        return f"File too large ({size // 1024 // 1024} MB). Max {MAX_UPLOAD_BYTES // 1024 // 1024} MB.", 413
    return None, None


def _save_local(file, kind: str, user_id) -> dict:
    """Save to backend/uploads/<kind>/<user_id>/<uuid>_<original>. Return public URL."""
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    name = f"{uuid.uuid4().hex}.{ext}"
    rel_dir = f"{kind}/{user_id}"
    abs_dir = os.path.join(LOCAL_UPLOADS_DIR, rel_dir)
    os.makedirs(abs_dir, exist_ok=True)
    abs_path = os.path.join(abs_dir, name)
    file.save(abs_path)

    # Build a URL the mobile app can fetch. request.host_url already includes scheme + host + port.
    public_url = request.host_url.rstrip("/") + url_for("upload.serve_upload", subpath=f"{rel_dir}/{name}")
    size = os.path.getsize(abs_path)
    log.info("local upload OK kind=%s user=%s size=%s -> %s", kind, user_id, size, public_url)
    return {"url": public_url, "public_id": f"local:{rel_dir}/{name}", "storage": "local"}


# ============================================
# POST /upload/image
# ============================================
@upload_bp.route("/upload/image", methods=["POST"])
@jwt_required()
def upload_image():
    if "file" not in request.files:
        return jsonify({"error": "Missing file"}), 400
    f = request.files["file"]
    if not f.filename:
        return jsonify({"error": "Empty filename"}), 400
    err, code = _validate_upload(f, ALLOWED_IMAGE_EXT)
    if err:
        return jsonify({"error": err}), code

    uid = get_jwt_identity()
    if _cloudinary_configured():
        try:
            r = cloudinary.uploader.upload(
                f, folder=f"estateai/users/{uid}/properties", resource_type="image",
                transformation=[{"width": 1600, "height": 1600, "crop": "limit"}, {"quality": "auto:good"}],
            )
            return jsonify({"url": r.get("secure_url"), "public_id": r.get("public_id"),
                            "storage": "cloudinary",
                            "width": r.get("width"), "height": r.get("height")}), 201
        except Exception as e:
            log.exception("Cloudinary image upload failed")
            return jsonify({"error": f"Upload failed: {str(e)[:200]}"}), 500

    # ---- local fallback ----
    try:
        return jsonify(_save_local(f, "images", uid)), 201
    except Exception as e:
        log.exception("Local image upload failed")
        return jsonify({"error": f"Upload failed: {str(e)[:200]}"}), 500


# ============================================
# POST /upload/document
# ============================================
@upload_bp.route("/upload/document", methods=["POST"])
@jwt_required()
def upload_document():
    if "file" not in request.files:
        return jsonify({"error": "Missing file"}), 400
    f = request.files["file"]
    if not f.filename:
        return jsonify({"error": "Empty filename"}), 400
    err, code = _validate_upload(f, ALLOWED_DOC_EXT)
    if err:
        return jsonify({"error": err}), code

    uid = get_jwt_identity()
    doc_type = (request.form.get("doc_type") or "other").lower()
    if doc_type not in ("national_id", "ownership_proof", "agent_license", "other"):
        return jsonify({"error": "Invalid doc_type"}), 400

    if _cloudinary_configured():
        try:
            r = cloudinary.uploader.upload(
                f, folder=f"estateai/users/{uid}/documents/{doc_type}", resource_type="auto",
                transformation=[{"width": 2000, "height": 2000, "crop": "limit"}, {"quality": "auto:good"}],
            )
            return jsonify({"url": r.get("secure_url"), "public_id": r.get("public_id"),
                            "storage": "cloudinary",
                            "doc_type": doc_type, "format": r.get("format")}), 201
        except Exception as e:
            log.exception("Cloudinary document upload failed")
            return jsonify({"error": f"Upload failed: {str(e)[:200]}"}), 500

    # ---- local fallback ----
    try:
        out = _save_local(f, f"documents/{doc_type}", uid)
        out["doc_type"] = doc_type
        return jsonify(out), 201
    except Exception as e:
        log.exception("Local document upload failed")
        return jsonify({"error": f"Upload failed: {str(e)[:200]}"}), 500


# ============================================
# GET /uploads/<path>  - serve locally-stored uploads (dev / Cloudinary-less mode)
# ============================================
@upload_bp.route("/uploads/<path:subpath>", methods=["GET"])
def serve_upload(subpath):
    safe_root = os.path.realpath(LOCAL_UPLOADS_DIR)
    full = os.path.realpath(os.path.join(safe_root, subpath))
    if not full.startswith(safe_root):
        return jsonify({"error": "Forbidden"}), 403
    if not os.path.exists(full):
        return jsonify({"error": "Not found"}), 404
    return send_from_directory(safe_root, subpath, conditional=True)
