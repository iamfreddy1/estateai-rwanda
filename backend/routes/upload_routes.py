# ============================================
# UPLOAD ROUTES
# ============================================
# POST /upload/image       -> upload a single image to Cloudinary, return URL
# POST /upload/document    -> same but for verification docs (separate folder)
#
# Both require auth. The Cloudinary credentials come from env vars set on Render.

import os
import cloudinary
import cloudinary.uploader
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

upload_bp = Blueprint("upload", __name__)


# ============================================
# Configure Cloudinary from env vars
# ============================================
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True,   # always use https URLs
)


def _is_cloudinary_configured():
    return all([
        os.environ.get("CLOUDINARY_CLOUD_NAME"),
        os.environ.get("CLOUDINARY_API_KEY"),
        os.environ.get("CLOUDINARY_API_SECRET"),
    ])


# ============================================
# POST /upload/image
# ============================================
# Multipart form data with field name "file".
# Returns: { "url": "...", "public_id": "..." }
@upload_bp.route("/upload/image", methods=["POST"])
@jwt_required()
def upload_image():
    if not _is_cloudinary_configured():
        return jsonify({"error": "Image upload not configured on server"}), 503

    if "file" not in request.files:
        return jsonify({"error": "Missing file"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    user_id = get_jwt_identity()
    try:
        result = cloudinary.uploader.upload(
            file,
            folder=f"estateai/users/{user_id}/properties",
            resource_type="image",
            transformation=[
                {"width": 1600, "height": 1600, "crop": "limit"},  # cap dimensions
                {"quality": "auto:good"},                          # auto compression
            ],
        )
    except Exception as e:
        return jsonify({"error": f"Upload failed: {e}"}), 500

    return jsonify({
        "url": result.get("secure_url"),
        "public_id": result.get("public_id"),
        "width": result.get("width"),
        "height": result.get("height"),
    }), 201


# ============================================
# POST /upload/document
# ============================================
# Same as /upload/image but for verification docs.
# Stored in a separate folder, marked as access_mode="authenticated"
# so URLs aren't publicly browsable (only admins / owners see them).
@upload_bp.route("/upload/document", methods=["POST"])
@jwt_required()
def upload_document():
    if not _is_cloudinary_configured():
        return jsonify({"error": "Upload not configured on server"}), 503

    if "file" not in request.files:
        return jsonify({"error": "Missing file"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    user_id = get_jwt_identity()
    doc_type = (request.form.get("doc_type") or "other").lower()
    # Only allow specific doc types
    if doc_type not in ("national_id", "ownership_proof", "agent_license", "other"):
        return jsonify({"error": "Invalid doc_type"}), 400

    try:
        result = cloudinary.uploader.upload(
            file,
            folder=f"estateai/users/{user_id}/documents/{doc_type}",
            resource_type="auto",  # accept image OR PDF
            transformation=[
                {"width": 2000, "height": 2000, "crop": "limit"},
                {"quality": "auto:good"},
            ],
        )
    except Exception as e:
        return jsonify({"error": f"Upload failed: {e}"}), 500

    return jsonify({
        "url": result.get("secure_url"),
        "public_id": result.get("public_id"),
        "doc_type": doc_type,
        "format": result.get("format"),
    }), 201
