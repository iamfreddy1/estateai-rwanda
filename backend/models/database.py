# ============================================
# DATABASE SETUP + MODELS
# ============================================
# Uses SQLAlchemy ORM. Stored in SQLite at backend/estate.db
# Now Rwanda-specialized: district, sector, land_size, road access, etc.

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import bcrypt

db = SQLAlchemy()


# ============================================
# USER MODEL
# ============================================
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    # Nullable now: Google-signed-in users don't have a password.
    password_hash = db.Column(db.String(200), nullable=True)
    name = db.Column(db.String(80), nullable=True)
    avatar_url = db.Column(db.String(500), nullable=True)
    # Google's stable user ID. Set when user signs in with Google.
    google_sub = db.Column(db.String(64), unique=True, nullable=True, index=True)
    auth_provider = db.Column(db.String(20), default="email")  # "email" or "google"

    # ----- Identity Verification -----
    national_id_url = db.Column(db.String(500), nullable=True)
    verification_status = db.Column(db.String(20), default="unverified")
    # one of: "unverified" | "pending" | "verified" | "rejected"
    verified_at = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.String(500), nullable=True)

    # ----- Roles -----
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    role = db.Column(db.String(20), default="user")  # "user" | "agent" | "admin"

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    properties = db.relationship(
        "Property",
        backref="owner",
        lazy=True,
        cascade="all, delete",
    )

    def set_password(self, plain_password):
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
        self.password_hash = hashed.decode("utf-8")

    def check_password(self, plain_password):
        # Google-only users have no password
        if not self.password_hash:
            return False
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            self.password_hash.encode("utf-8"),
        )

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "avatar_url": self.avatar_url,
            "auth_provider": self.auth_provider,
            "verification_status": self.verification_status,
            "is_admin": self.is_admin,
            "role": self.role,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ============================================
# PROPERTY MODEL (Rwanda edition)
# ============================================
class Property(db.Model):
    __tablename__ = "properties"

    # ---- Core ----
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    price = db.Column(db.Float, nullable=False)               # in RWF
    currency = db.Column(db.String(10), nullable=False, default="RWF")
    type = db.Column(db.String(20), nullable=False, default="buy")  # "buy" / "rent"
    property_type = db.Column(db.String(40), nullable=False, default="house")  # house, villa, apartment, land

    # ---- Location ----
    district = db.Column(db.String(80), nullable=False, default="Gasabo")    # Gasabo, Kicukiro, Nyarugenge
    sector = db.Column(db.String(80), nullable=False, default="Kacyiru")     # Nyarutarama, Kimihurura, etc.
    location = db.Column(db.String(120), nullable=True)                       # legacy / extra detail
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)

    # ---- Building details (houses) ----
    bedrooms = db.Column(db.Integer, nullable=True)
    bathrooms = db.Column(db.Integer, nullable=True)
    size_sqft = db.Column(db.Integer, nullable=True)
    year_built = db.Column(db.Integer, nullable=True)
    furnished = db.Column(db.Boolean, default=False)
    parking = db.Column(db.Integer, default=0)
    modern_finish = db.Column(db.Boolean, default=False)

    # ---- Land details ----
    land_size = db.Column(db.Integer, nullable=True)         # sqm
    road_access = db.Column(db.String(30), default="paved")  # paved / dirt
    proximity_to_city = db.Column(db.Integer, nullable=True)  # km

    # ---- Media ----
    image_url = db.Column(db.String(500), nullable=True)
    # Multiple property photos (JSON array of Cloudinary URLs).
    # SQLite stores JSON as text - we'll convert in to_dict.
    images_json = db.Column(db.Text, nullable=True)

    # ---- Verification ----
    status = db.Column(db.String(20), default="approved", nullable=False)
    # one of: "pending" | "approved" | "rejected"
    # Seeded properties default to "approved" so they show up immediately.
    # User-created listings default to "pending" (set in route).
    ownership_doc_url = db.Column(db.String(500), nullable=True)
    rejection_reason = db.Column(db.String(500), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)

    # ---- Meta ----
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    # nullable=True so seeded properties (no owner) can exist

    # ---- Helpers ----
    def get_images(self):
        """Return list of image URLs - falls back to image_url if images_json is empty."""
        import json
        if self.images_json:
            try:
                imgs = json.loads(self.images_json)
                if isinstance(imgs, list) and imgs:
                    return imgs
            except Exception:
                pass
        return [self.image_url] if self.image_url else []

    def set_images(self, urls):
        """Store list of URLs as JSON. Also sets image_url to the first one."""
        import json
        if urls:
            self.images_json = json.dumps(urls)
            self.image_url = urls[0]
        else:
            self.images_json = None

    # ---- Serialization ----
    def to_dict(self, include_owner_doc=False):
        data = {
            "id": self.id,
            "title": self.title,
            "price": self.price,
            "currency": self.currency,
            "type": self.type,
            "property_type": self.property_type,

            "district": self.district,
            "sector": self.sector,
            "location": self.location,
            "latitude": self.latitude,
            "longitude": self.longitude,

            "bedrooms": self.bedrooms,
            "bathrooms": self.bathrooms,
            "size_sqft": self.size_sqft,
            "year_built": self.year_built,
            "furnished": self.furnished,
            "parking": self.parking,
            "modern_finish": self.modern_finish,

            "land_size": self.land_size,
            "road_access": self.road_access,
            "proximity_to_city": self.proximity_to_city,

            "image": self.image_url,
            "images": self.get_images(),

            "status": self.status,
            "rejection_reason": self.rejection_reason,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,

            "user_id": self.user_id,
            "owner_name": (self.owner.name or self.owner.email.split("@")[0]) if self.owner else "EstateAI",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        # ownership_doc_url is sensitive - only include for owner/admin
        if include_owner_doc:
            data["ownership_doc_url"] = self.ownership_doc_url
        return data


# ============================================
# CONVERSATION MODEL
# ============================================
# A conversation is between a buyer and seller about a specific property.
# Uniqueness: one conversation per (property_id, buyer_id, seller_id) triple.
class Conversation(db.Model):
    __tablename__ = "conversations"

    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey("properties.id"), nullable=False)
    buyer_id   = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    seller_id  = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_message_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    property = db.relationship("Property", backref="conversations")
    buyer    = db.relationship("User", foreign_keys=[buyer_id])
    seller   = db.relationship("User", foreign_keys=[seller_id])
    messages = db.relationship(
        "Message",
        backref="conversation",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    __table_args__ = (
        db.UniqueConstraint("property_id", "buyer_id", "seller_id", name="uq_convo"),
    )

    def to_dict(self, current_user_id=None):
        # Show the "other" user's info from the perspective of current_user_id
        other = None
        if current_user_id == self.buyer_id:
            other = self.seller
        elif current_user_id == self.seller_id:
            other = self.buyer
        last_msg = self.messages[-1] if self.messages else None
        unread_count = 0
        if current_user_id:
            unread_count = sum(
                1 for m in self.messages
                if m.sender_id != current_user_id and m.read_at is None
            )
        return {
            "id": self.id,
            "property_id": self.property_id,
            "property_title": self.property.title if self.property else None,
            "property_image": (self.property.image_url if self.property else None),
            "buyer_id": self.buyer_id,
            "seller_id": self.seller_id,
            "other_user": {
                "id": other.id,
                "name": other.name or (other.email.split("@")[0] if other.email else None),
                "avatar_url": other.avatar_url,
            } if other else None,
            "last_message": last_msg.content if last_msg else None,
            "last_message_at": self.last_message_at.isoformat() if self.last_message_at else None,
            "unread_count": unread_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ============================================
# MESSAGE MODEL
# ============================================
class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey("conversations.id"), nullable=False, index=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    read_at = db.Column(db.DateTime, nullable=True)

    sender = db.relationship("User", foreign_keys=[sender_id])

    def to_dict(self):
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "sender_id": self.sender_id,
            "sender_name": (self.sender.name or self.sender.email.split("@")[0]) if self.sender else None,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "read_at": self.read_at.isoformat() if self.read_at else None,
        }
