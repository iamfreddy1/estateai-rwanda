# ============================================
# ADMIN ROUTES (one-time setup tasks)
# ============================================
# POST /admin/seed   -> populates the DB with sample Kigali properties.
#                       Protected by SEED_SECRET env var.
#                       Refuses to run if DB already has seeded data.

import os
import random
import pandas as pd
from flask import Blueprint, request, jsonify

from models.database import db, Property

admin_bp = Blueprint("admin", __name__)


# ============================================
# Sector coordinates (matches seed_database.py)
# ============================================
SECTOR_COORDS = {
    "Nyarutarama":     (-1.9410, 30.0950),
    "Kimihurura":      (-1.9550, 30.0860),
    "Kacyiru":         (-1.9500, 30.0820),
    "Gacuriro":        (-1.9290, 30.1020),
    "Remera":          (-1.9560, 30.1110),
    "Kibagabaga":      (-1.9210, 30.1180),
    "Gisozi":          (-1.9100, 30.0710),
    "Kicukiro Center": (-1.9870, 30.1080),
    "Kanombe":         (-1.9710, 30.1370),
    "Gahanga":         (-2.0140, 30.1320),
    "Nyamirambo":      (-1.9810, 30.0480),
    "Nyarugenge Town": (-1.9530, 30.0610),
    "Gitega":          (-1.9650, 30.0540),
}

SAMPLE_IMAGES = [
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800",
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
    "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800",
    "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800",
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
    "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800",
]
LAND_IMAGES = [
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800",
    "https://images.unsplash.com/photo-1500051638674-ff996a0ec29e?w=800",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
]


def jitter_coord(lat, lon):
    return (lat + random.uniform(-0.005, 0.005), lon + random.uniform(-0.005, 0.005))


def _seed_houses(df, max_records=80):
    sample = df.sample(n=min(max_records, len(df)), random_state=42)
    for _, row in sample.iterrows():
        sector = row["sector"]
        base_lat, base_lon = SECTOR_COORDS.get(sector, (-1.95, 30.09))
        lat, lon = jitter_coord(base_lat, base_lon)

        is_rent = random.random() < 0.25
        price = float(row["price_rwf"])
        if is_rent:
            price = round(price * 0.005, 0)

        prop = Property(
            title=row["title"],
            price=price,
            currency="RWF",
            type="rent" if is_rent else "buy",
            property_type=row["property_type"],
            district=row["district"],
            sector=sector,
            location=sector,
            latitude=lat, longitude=lon,
            bedrooms=int(row["bedrooms"]),
            bathrooms=int(row["bathrooms"]),
            size_sqft=int(row["size_sqft"]),
            year_built=int(row["year_built"]),
            furnished=bool(row["furnished"]),
            parking=int(row["parking"]),
            modern_finish=bool(row["modern_finish"]),
            land_size=int(row["land_size"]),
            road_access=row["road_access"],
            proximity_to_city=int(row["proximity_to_city"]),
            image_url=random.choice(SAMPLE_IMAGES),
            user_id=None,
        )
        db.session.add(prop)


def _seed_lands(df, max_records=40):
    sample = df.sample(n=min(max_records, len(df)), random_state=42)
    for _, row in sample.iterrows():
        sector = row["sector"]
        base_lat, base_lon = SECTOR_COORDS.get(sector, (-1.95, 30.09))
        lat, lon = jitter_coord(base_lat, base_lon)

        prop = Property(
            title=row["title"],
            price=float(row["price_rwf"]),
            currency="RWF",
            type="buy",
            property_type="land",
            district=row["district"],
            sector=sector,
            location=sector,
            latitude=lat, longitude=lon,
            land_size=int(row["land_size"]),
            road_access=row["road_access"],
            proximity_to_city=int(row["proximity_to_city"]),
            image_url=random.choice(LAND_IMAGES),
            user_id=None,
        )
        db.session.add(prop)


# ============================================
# POST /admin/seed
# ============================================
# Headers:  X-Seed-Secret: <secret matching SEED_SECRET env var>
# Body:     (optional) { "force": true }   -> reseed even if data exists
# ============================================
# POST /admin/recreate-db
# ============================================
# DROPS ALL TABLES then re-creates them fresh.
# Use during early development when models change.
# Protected by SEED_SECRET. Wipes ALL DATA.
@admin_bp.route("/admin/recreate-db", methods=["POST"])
def recreate_db():
    expected = os.environ.get("SEED_SECRET")
    if not expected:
        return jsonify({"error": "SEED_SECRET not configured"}), 500

    body = request.get_json(silent=True) or {}
    provided = (
        request.headers.get("X-Seed-Secret")
        or request.args.get("secret")
        or body.get("secret")
    )
    if provided != expected:
        return jsonify({"error": "Invalid or missing secret"}), 401

    db.drop_all()
    db.create_all()
    return jsonify({"ok": True, "message": "All tables dropped and recreated"}), 200


@admin_bp.route("/admin/seed", methods=["POST", "GET"])
def seed_database():
    # 1. Verify secret - accept any of:
    #    - Header:        X-Seed-Secret: <secret>
    #    - Query param:   ?secret=<secret>
    #    - JSON body:     { "secret": "<secret>" }
    expected = os.environ.get("SEED_SECRET")
    if not expected:
        return jsonify({"error": "SEED_SECRET not configured on server"}), 500

    body = request.get_json(silent=True) or {}
    provided = (
        request.headers.get("X-Seed-Secret")
        or request.args.get("secret")
        or body.get("secret")
    )

    if provided != expected:
        return jsonify({
            "error": "Invalid or missing secret",
            "hint": "Pass via header X-Seed-Secret, ?secret=..., or JSON body {\"secret\": \"...\"}",
        }), 401

    force = bool(body.get("force") or request.args.get("force"))

    # 2. Idempotency check - don't double-seed
    existing_seeded = Property.query.filter_by(user_id=None).count()
    if existing_seeded > 0 and not force:
        return jsonify({
            "skipped": True,
            "reason": f"Database already has {existing_seeded} seeded properties. Pass {{\"force\": true}} to reseed.",
        }), 200

    # 3. If force, clear previous seeds first
    if force and existing_seeded > 0:
        Property.query.filter_by(user_id=None).delete()
        db.session.commit()

    # 4. Locate the CSV files (live alongside code on Render)
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    houses_csv = os.path.join(backend_dir, "data", "houses_kigali.csv")
    lands_csv  = os.path.join(backend_dir, "data", "lands_kigali.csv")

    if not os.path.exists(houses_csv) or not os.path.exists(lands_csv):
        return jsonify({
            "error": "Dataset CSVs not found on server",
            "expected": [houses_csv, lands_csv],
        }), 500

    houses_df = pd.read_csv(houses_csv)
    lands_df  = pd.read_csv(lands_csv)

    # 5. Seed
    _seed_houses(houses_df, max_records=80)
    _seed_lands(lands_df,  max_records=40)
    db.session.commit()

    total = Property.query.count()
    return jsonify({
        "ok": True,
        "houses_seeded": min(80, len(houses_df)),
        "lands_seeded":  min(40, len(lands_df)),
        "total_properties_in_db": total,
    }), 200
