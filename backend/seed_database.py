# ============================================
# DATABASE SEEDER
# ============================================
# Populates the SQLite database with sample Rwanda properties from
# data/houses_kigali.csv and data/lands_kigali.csv.
#
# Run with: python seed_database.py
# (Make sure Flask is NOT running, since we're modifying estate.db)

import os
import random
import pandas as pd

from app import app  # imports Flask app + initializes db
from models.database import db, Property

# Approximate Kigali sector coordinates (lat, lon) for map markers
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

# Generic Unsplash images for variety
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
    """Add tiny randomness so multiple markers don't stack exactly."""
    return (
        lat + random.uniform(-0.005, 0.005),
        lon + random.uniform(-0.005, 0.005),
    )


def seed_houses(df, max_records=80):
    """Seed up to max_records houses from the dataframe."""
    sample = df.sample(n=min(max_records, len(df)), random_state=42)
    for _, row in sample.iterrows():
        sector = row["sector"]
        base_lat, base_lon = SECTOR_COORDS.get(sector, (-1.9500, 30.0900))
        lat, lon = jitter_coord(base_lat, base_lon)

        # Decide buy vs rent: 75% buy, 25% rent (rents priced lower)
        is_rent = random.random() < 0.25
        price = float(row["price_rwf"])
        if is_rent:
            # Rough rent estimate: monthly = ~0.5% of buy price
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
            latitude=lat,
            longitude=lon,
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
            user_id=None,  # seeded -> no owner
        )
        db.session.add(prop)


def seed_lands(df, max_records=40):
    """Seed up to max_records land plots from the dataframe."""
    sample = df.sample(n=min(max_records, len(df)), random_state=42)
    for _, row in sample.iterrows():
        sector = row["sector"]
        base_lat, base_lon = SECTOR_COORDS.get(sector, (-1.9500, 30.0900))
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
            latitude=lat,
            longitude=lon,
            land_size=int(row["land_size"]),
            road_access=row["road_access"],
            proximity_to_city=int(row["proximity_to_city"]),
            image_url=random.choice(LAND_IMAGES),
            user_id=None,
        )
        db.session.add(prop)


def main():
    with app.app_context():
        # If there are already properties without an owner (seeded before), wipe them
        existing = Property.query.filter_by(user_id=None).count()
        if existing:
            print(f"Removing {existing} previously seeded properties...")
            Property.query.filter_by(user_id=None).delete()
            db.session.commit()

        # Load datasets
        script_dir = os.path.dirname(os.path.abspath(__file__))
        houses_csv = os.path.join(script_dir, "data", "houses_kigali.csv")
        lands_csv  = os.path.join(script_dir, "data", "lands_kigali.csv")

        if not os.path.exists(houses_csv):
            print(f"[ERROR] {houses_csv} not found. Run ml/generate_rwanda_dataset.py first.")
            return
        if not os.path.exists(lands_csv):
            print(f"[ERROR] {lands_csv} not found. Run ml/generate_rwanda_dataset.py first.")
            return

        houses_df = pd.read_csv(houses_csv)
        lands_df  = pd.read_csv(lands_csv)

        print(f"Seeding houses (up to 80) from {len(houses_df)} records...")
        seed_houses(houses_df, max_records=80)

        print(f"Seeding land (up to 40) from {len(lands_df)} records...")
        seed_lands(lands_df, max_records=40)

        db.session.commit()

        total = Property.query.count()
        print(f"\n[DONE] Database now has {total} properties total.")


if __name__ == "__main__":
    main()
