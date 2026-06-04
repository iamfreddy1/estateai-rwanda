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
    email_verified = db.Column(db.Boolean, default=False, nullable=False)

    # ----- Identity Verification -----
    national_id_url = db.Column(db.String(500), nullable=True)
    verification_status = db.Column(db.String(20), default="unverified")
    # one of: "unverified" | "pending" | "verified" | "rejected"
    verified_at = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.String(500), nullable=True)

    # ----- Roles -----
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    suspended = db.Column(db.Boolean, default=False, nullable=False)
    suspension_reason = db.Column(db.String(300), nullable=True)
    premium_until = db.Column(db.DateTime, nullable=True)
    role = db.Column(db.String(20), default="user")  # "user" | "agent" | "admin"

    # ----- Push notifications -----
    expo_push_token = db.Column(db.String(200), nullable=True)
    push_token_updated_at = db.Column(db.DateTime, nullable=True)

    # ----- Agent profile (filled when user applies) -----
    agency_name = db.Column(db.String(120), nullable=True)
    license_number = db.Column(db.String(80), nullable=True)
    license_doc_url = db.Column(db.String(500), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    phone = db.Column(db.String(40), nullable=True)
    areas = db.Column(db.String(300), nullable=True)        # comma-separated sectors
    agent_status = db.Column(db.String(20), default="none") # none/pending/approved/rejected
    agent_rejection_reason = db.Column(db.String(500), nullable=True)

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
            "email_verified": self.email_verified,
            "verification_status": self.verification_status,
            "is_admin": self.is_admin,
            "suspended": self.suspended,
            "premium_until": self.premium_until.isoformat() if self.premium_until else None,
            "is_premium": bool(self.premium_until and self.premium_until > datetime.utcnow()),
            "role": self.role,
            "is_agent": self.agent_status == "approved",
            "agent_status": self.agent_status,
            "agency_name": self.agency_name,
            "phone": self.phone,
            "bio": self.bio,
            "areas": self.areas,
            "license_number": self.license_number,
            "agent_rejection_reason": self.agent_rejection_reason,
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
    # Rental availability lifecycle: available / reserved / rented / expired / hidden
    # Separate from moderation `status` (pending/approved/rejected) on purpose.
    availability = db.Column(db.String(20), default="available", nullable=False, index=True)
    rented_at = db.Column(db.DateTime, nullable=True)
    # Rental amenities (nullable -> "unknown", not "false")
    internet = db.Column(db.Boolean, nullable=True)
    water = db.Column(db.Boolean, nullable=True)
    electricity = db.Column(db.Boolean, nullable=True)
    security = db.Column(db.Boolean, nullable=True)
    featured = db.Column(db.Boolean, default=False, nullable=False, index=True)

    # ---- Seller Payment Methods ----
    # CSV of selected methods: "mtn,airtel,bk,equity"
    payment_methods         = db.Column(db.String(120), nullable=True)
    mtn_number              = db.Column(db.String(32),  nullable=True)
    airtel_number           = db.Column(db.String(32),  nullable=True)
    bk_account_number       = db.Column(db.String(40),  nullable=True)
    equity_account_number   = db.Column(db.String(40),  nullable=True)
    account_holder_name     = db.Column(db.String(120), nullable=True)
    # Toggle: if False, buyers see "Contact seller to arrange payment" instead.
    show_payment_details    = db.Column(db.Boolean, default=True, nullable=False)
    # Admin flag for fraudulent / disputed payment info.
    payment_flagged         = db.Column(db.Boolean, default=False, nullable=False, index=True)
    payment_flag_reason     = db.Column(db.String(200), nullable=True)

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
            "availability": self.availability,
            "rented_at": self.rented_at.isoformat() if self.rented_at else None,
            "amenities": {"internet": self.internet, "water": self.water, "electricity": self.electricity, "security": self.security},
            "rejection_reason": self.rejection_reason,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,

            "user_id": self.user_id,
            "owner_name": (self.owner.name or self.owner.email.split("@")[0]) if self.owner else "EstateAI",
            "owner_is_agent": self.owner.agent_status == "approved" if self.owner else False,
            "owner_agency": self.owner.agency_name if self.owner else None,
            "owner_avatar": self.owner.avatar_url if self.owner else None,
            "owner_phone": self.owner.phone if self.owner else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        # ---- Payment methods ----
        methods = [m.strip() for m in (self.payment_methods or "").split(",") if m.strip()]
        data["payment_flagged"] = bool(self.payment_flagged)
        # Owner + admin always see them. Public sees them only if:
        #   show_payment_details=True AND payment_flagged=False
        public_visible = self.show_payment_details and not self.payment_flagged
        if public_visible or include_owner_doc:
            data["payment"] = {
                "methods": methods,
                "mtn_number":            self.mtn_number,
                "airtel_number":         self.airtel_number,
                "bk_account_number":     self.bk_account_number,
                "equity_account_number": self.equity_account_number,
                "account_holder_name":   self.account_holder_name,
                "show_payment_details":  self.show_payment_details,
                "flagged":               bool(self.payment_flagged),
                "flag_reason":           self.payment_flag_reason if include_owner_doc else None,
            }
        else:
            data["payment"] = {"methods": [], "show_payment_details": False,
                               "flagged": bool(self.payment_flagged)}
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


# ============================================
# PROPERTY VIEW MODEL  (for trending + recommendations)
# ============================================
class PropertyView(db.Model):
    __tablename__ = "property_views"

    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey("properties.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)  # null = anonymous
    viewed_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Snapshot of property attributes at view-time (helps recommendations
    # build a profile of what the user likes, even if listings get deleted).
    sector = db.Column(db.String(80), nullable=True)
    district = db.Column(db.String(80), nullable=True)
    property_type = db.Column(db.String(40), nullable=True)
    type = db.Column(db.String(20), nullable=True)        # buy / rent
    price = db.Column(db.Float, nullable=True)


# ============================================
# LISTING MODEL  (raw + normalized scraped/ingested listings)
# ============================================
# Separate from Property (user-created listings) on purpose: this is the
# market-intelligence corpus feeding the valuation model. PostGIS-ready: lat/lon
# are plain floats now; a geometry column + GIST index can be added later
# without touching application code.
class Listing(db.Model):
    __tablename__ = "listings"

    id = db.Column(db.Integer, primary_key=True)
    source = db.Column(db.String(40), nullable=False)        # houseinrwanda | quickhomes | ...
    source_id = db.Column(db.String(160), nullable=False)    # stable id within source
    url = db.Column(db.String(600), nullable=True)

    title = db.Column(db.String(300), nullable=True)
    price = db.Column(db.Float, nullable=True)
    currency = db.Column(db.String(10), default="RWF")
    type = db.Column(db.String(20), nullable=True)           # buy | rent
    property_type = db.Column(db.String(40), nullable=True)

    district = db.Column(db.String(80), nullable=True, index=True)
    sector = db.Column(db.String(80), nullable=True, index=True)
    cell = db.Column(db.String(80), nullable=True)
    village = db.Column(db.String(80), nullable=True)
    address = db.Column(db.String(500), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    geo_precision = db.Column(db.String(20), nullable=True)  # cell | sector | address

    bedrooms = db.Column(db.Integer, nullable=True)
    bathrooms = db.Column(db.Integer, nullable=True)
    size_sqft = db.Column(db.Float, nullable=True)
    land_size = db.Column(db.Float, nullable=True)

    images_json = db.Column(db.Text, nullable=True)
    description = db.Column(db.Text, nullable=True)

    luxury_score = db.Column(db.Integer, nullable=True)
    risk_score = db.Column(db.Integer, nullable=True)
    status = db.Column(db.String(20), default="new")         # new | validated | rejected
    scraped_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("source", "source_id", name="uq_listing_source"),
        db.Index("ix_listing_geo", "latitude", "longitude"),
        db.Index("ix_listing_type_sector", "type", "sector"),
    )

    def to_dict(self):
        import json
        return {
            "id": self.id, "source": self.source, "source_id": self.source_id, "url": self.url,
            "title": self.title, "price": self.price, "currency": self.currency,
            "type": self.type, "property_type": self.property_type,
            "district": self.district, "sector": self.sector, "cell": self.cell,
            "latitude": self.latitude, "longitude": self.longitude, "geo_precision": self.geo_precision,
            "bedrooms": self.bedrooms, "bathrooms": self.bathrooms,
            "size_sqft": self.size_sqft, "land_size": self.land_size,
            "images": json.loads(self.images_json) if self.images_json else [],
            "luxury_score": self.luxury_score, "risk_score": self.risk_score,
            "status": self.status,
            "availability": self.availability,
            "rented_at": self.rented_at.isoformat() if self.rented_at else None,
            "amenities": {"internet": self.internet, "water": self.water, "electricity": self.electricity, "security": self.security},
            "scraped_at": self.scraped_at.isoformat() if self.scraped_at else None,
        }


# ============================================
# AI CHAT MODELS
# ============================================
class AIConversation(db.Model):
    __tablename__ = "ai_conversations"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    messages = db.relationship(
        "AIMessage", backref="conversation",
        cascade="all, delete-orphan", order_by="AIMessage.id", lazy=True,
    )

    def to_dict(self, include_last_message=False):
        d = {
            "id": self.id, "title": self.title,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_last_message and self.messages:
            last = self.messages[-1]
            d["last_message"] = {"role": last.role, "content": (last.content or "")[:140]}
        return d


class AIMessage(db.Model):
    __tablename__ = "ai_messages"
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(
        db.Integer, db.ForeignKey("ai_conversations.id"), nullable=False, index=True
    )
    role = db.Column(db.String(16), nullable=False)        # 'user' | 'assistant'
    content = db.Column(db.Text, nullable=False)
    prompt_tokens = db.Column(db.Integer, nullable=True)
    completion_tokens = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id, "role": self.role, "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "tokens": {"prompt": self.prompt_tokens, "completion": self.completion_tokens},
        }



# ============================================
# REVOKED TOKEN BLOCKLIST  (logout / forced session kill)
# ============================================
class RevokedToken(db.Model):
    __tablename__ = "revoked_tokens"
    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(64), unique=True, nullable=False, index=True)
    revoked_at = db.Column(db.DateTime, default=datetime.utcnow)



# ============================================
# PASSWORD RESET CODES
# ============================================
# Short-lived (30 min) one-time codes emailed to the user. The actual code is
# stored as a bcrypt hash so a DB leak can't be used to reset accounts.
class PasswordResetCode(db.Model):
    __tablename__ = "password_reset_codes"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    code_hash = db.Column(db.String(200), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)



# ============================================
# RENTAL INQUIRY  (renter expresses interest in a rental listing)
# ============================================
# Three kinds: 'chat' (start a conversation), 'viewing' (request a property
# visit on a specific date), 'call' (renter intends to phone). All inquiries
# show up in the landlord dashboard as actionable cards.
class RentalInquiry(db.Model):
    __tablename__ = "rental_inquiries"
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey("properties.id"), nullable=False, index=True)
    renter_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    kind = db.Column(db.String(20), nullable=False)   # chat | viewing | call
    message = db.Column(db.Text, nullable=True)
    viewing_date = db.Column(db.DateTime, nullable=True)   # if kind == viewing
    status = db.Column(db.String(20), default="open", nullable=False, index=True)
    # open | answered | dismissed | closed
    response = db.Column(db.Text, nullable=True)
    response_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    property = db.relationship("Property", backref="inquiries")
    renter = db.relationship("User", foreign_keys=[renter_id])
    owner = db.relationship("User", foreign_keys=[owner_id])

    def to_dict(self):
        return {
            "id": self.id, "property_id": self.property_id,
            "renter": {
                "id": self.renter.id, "name": self.renter.name or self.renter.email.split("@")[0],
                "avatar_url": self.renter.avatar_url, "phone": self.renter.phone,
            } if self.renter else None,
            "kind": self.kind, "message": self.message,
            "viewing_date": self.viewing_date.isoformat() if self.viewing_date else None,
            "status": self.status, "response": self.response,
            "response_at": self.response_at.isoformat() if self.response_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "property_title": self.property.title if self.property else None,
            "property_price": self.property.price if self.property else None,
            "property_image": self.property.image_url if self.property else None,
        }



# ============================================
# AUDIT LOG — immutable record of admin/sensitive actions
# ============================================
class AuditLog(db.Model):
    __tablename__ = "audit_logs"
    id = db.Column(db.Integer, primary_key=True)
    actor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    actor_email = db.Column(db.String(120), nullable=True)
    action = db.Column(db.String(80), nullable=False, index=True)
    target_type = db.Column(db.String(40), nullable=True)
    target_id = db.Column(db.String(40), nullable=True)
    detail = db.Column(db.Text, nullable=True)
    ip = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id, "actor_id": self.actor_id, "actor_email": self.actor_email,
            "action": self.action, "target_type": self.target_type, "target_id": self.target_id,
            "detail": self.detail, "ip": self.ip,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }



# ============================================
# EMAIL VERIFICATION CODES — 6-digit, hashed, 24h expiry
# ============================================
class EmailVerificationCode(db.Model):
    __tablename__ = "email_verification_codes"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    code_hash = db.Column(db.String(200), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)



# ============================================
# PAYMENT  (universal record across MoMo / Airtel / stub)
# ============================================
class Payment(db.Model):
    __tablename__ = "payments"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    provider = db.Column(db.String(20), nullable=False)            # mtn | airtel | stub
    transaction_id = db.Column(db.String(80), unique=True, nullable=False, index=True)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default="RWF")
    phone = db.Column(db.String(40), nullable=True)
    status = db.Column(db.String(20), default="pending", index=True)  # pending | success | failed
    purpose = db.Column(db.String(40), nullable=False)             # contact_unlock | premium
    target_type = db.Column(db.String(40), nullable=True)
    target_id = db.Column(db.String(40), nullable=True)
    reference = db.Column(db.String(80), nullable=True)
    raw = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id, "provider": self.provider,
            "transaction_id": self.transaction_id, "amount": self.amount,
            "currency": self.currency, "status": self.status,
            "purpose": self.purpose, "target_type": self.target_type,
            "target_id": self.target_id, "reference": self.reference,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ============================================
# PROPERTY CONTACT UNLOCK
# ============================================
# A successful payment unlocks the seller/landlord's phone for ONE property.
class PropertyContactUnlock(db.Model):
    __tablename__ = "property_contact_unlocks"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    property_id = db.Column(db.Integer, db.ForeignKey("properties.id"), nullable=False, index=True)
    payment_id = db.Column(db.Integer, db.ForeignKey("payments.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (db.UniqueConstraint("user_id", "property_id", name="uq_user_property_unlock"),)
