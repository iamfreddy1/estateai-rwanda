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
    password_hash = db.Column(db.String(200), nullable=False)
    name = db.Column(db.String(80), nullable=True)
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
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            self.password_hash.encode("utf-8"),
        )

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
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

    # ---- Meta ----
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    # nullable=True so seeded properties (no owner) can exist

    # ---- Serialization ----
    def to_dict(self):
        return {
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

            "user_id": self.user_id,
            "owner_name": (self.owner.name or self.owner.email.split("@")[0]) if self.owner else "EstateAI",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
