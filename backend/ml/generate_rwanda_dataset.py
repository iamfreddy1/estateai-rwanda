# ============================================
# RWANDA DATASET GENERATOR
# ============================================
# Generates realistic synthetic property data for Kigali, Rwanda.
# Creates TWO files:
#   - data/houses_kigali.csv  (for the house price model)
#   - data/lands_kigali.csv   (for the land price model)
#
# All prices are in RWF (Rwandan Franc).
# Run with: python ml/generate_rwanda_dataset.py

import os
import random
import pandas as pd

random.seed(42)

# ============================================
# KIGALI SECTORS / NEIGHBORHOODS
# ============================================
# Each entry: district + (house_min, house_max) base + (land_min, land_max) per sqm
# Prices in RWF.
SECTORS = {
    "Nyarutarama":      {"district": "Gasabo",     "house_base": (200_000_000, 800_000_000), "land_per_sqm": (250_000, 500_000)},
    "Kimihurura":       {"district": "Gasabo",     "house_base": (150_000_000, 500_000_000), "land_per_sqm": (180_000, 400_000)},
    "Kacyiru":          {"district": "Gasabo",     "house_base": (100_000_000, 400_000_000), "land_per_sqm": (150_000, 350_000)},
    "Gacuriro":         {"district": "Gasabo",     "house_base": ( 80_000_000, 250_000_000), "land_per_sqm": (100_000, 200_000)},
    "Remera":           {"district": "Gasabo",     "house_base": ( 80_000_000, 250_000_000), "land_per_sqm": (100_000, 200_000)},
    "Kibagabaga":       {"district": "Gasabo",     "house_base": ( 60_000_000, 200_000_000), "land_per_sqm": ( 70_000, 170_000)},
    "Gisozi":           {"district": "Gasabo",     "house_base": ( 40_000_000, 130_000_000), "land_per_sqm": ( 40_000, 110_000)},
    "Kicukiro Center":  {"district": "Kicukiro",   "house_base": ( 50_000_000, 180_000_000), "land_per_sqm": ( 60_000, 150_000)},
    "Kanombe":          {"district": "Kicukiro",   "house_base": ( 40_000_000, 150_000_000), "land_per_sqm": ( 50_000, 130_000)},
    "Gahanga":          {"district": "Kicukiro",   "house_base": ( 35_000_000, 120_000_000), "land_per_sqm": ( 35_000, 100_000)},
    "Nyamirambo":       {"district": "Nyarugenge", "house_base": ( 30_000_000, 120_000_000), "land_per_sqm": ( 30_000,  90_000)},
    "Nyarugenge Town":  {"district": "Nyarugenge", "house_base": ( 60_000_000, 200_000_000), "land_per_sqm": ( 80_000, 200_000)},
    "Gitega":           {"district": "Nyarugenge", "house_base": ( 35_000_000, 120_000_000), "land_per_sqm": ( 35_000, 100_000)},
}

PROPERTY_TYPES_HOUSE = ["house", "villa", "apartment", "townhouse"]


# ============================================
# HOUSE GENERATOR
# ============================================
def generate_houses(n=400):
    """Generate n synthetic Kigali house records."""
    rows = []
    for _ in range(n):
        # Pick random sector
        sector = random.choice(list(SECTORS.keys()))
        info = SECTORS[sector]
        district = info["district"]
        price_min, price_max = info["house_base"]

        # Property features
        bedrooms = random.randint(1, 7)
        bathrooms = random.randint(1, 5)
        size_sqft = random.randint(800, 8000)
        land_size = random.randint(150, 2500)  # sqm
        year_built = random.randint(1990, 2025)
        property_type = random.choice(PROPERTY_TYPES_HOUSE)
        road_access = random.choices(["paved", "dirt"], weights=[0.7, 0.3])[0]
        furnished = random.choices([1, 0], weights=[0.4, 0.6])[0]
        parking = random.randint(0, 4)
        modern_finish = random.choices([1, 0], weights=[0.55, 0.45])[0]
        proximity_to_city = random.randint(1, 30)  # km from city center

        # Calculate base price within sector range
        # Anchor: middle of sector range, then adjust by features
        base = (price_min + price_max) / 2

        # Feature multipliers (% adjustments)
        size_factor    = 0.6 + (size_sqft / 8000) * 0.8     # 0.6x .. 1.4x
        bedroom_factor = 0.85 + (bedrooms / 7) * 0.3        # 0.85x .. 1.15x
        bath_factor    = 0.92 + (bathrooms / 5) * 0.16      # 0.92x .. 1.08x
        age_factor     = 0.7 + ((year_built - 1990) / 35) * 0.4  # 0.7x .. 1.1x newer is better
        road_factor    = 1.0 if road_access == "paved" else 0.85
        furnished_factor = 1.10 if furnished else 1.0
        parking_factor = 1.0 + parking * 0.02
        modern_factor  = 1.10 if modern_finish else 1.0
        prox_factor    = 1.15 - (proximity_to_city / 30) * 0.2   # 0.95x .. 1.15x closer is better
        type_factor    = {"villa": 1.20, "house": 1.0, "townhouse": 0.95, "apartment": 0.90}[property_type]

        price = (
            base
            * size_factor
            * bedroom_factor
            * bath_factor
            * age_factor
            * road_factor
            * furnished_factor
            * parking_factor
            * modern_factor
            * prox_factor
            * type_factor
        )

        # Add ±12% noise
        price *= random.uniform(0.88, 1.12)

        # Clamp to sector min/max with some leeway
        price = max(min(price, price_max * 1.3), price_min * 0.5)

        rows.append({
            "title": f"{property_type.title()} in {sector}",
            "district": district,
            "sector": sector,
            "property_type": property_type,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "size_sqft": size_sqft,
            "land_size": land_size,
            "year_built": year_built,
            "road_access": road_access,
            "furnished": furnished,
            "parking": parking,
            "modern_finish": modern_finish,
            "proximity_to_city": proximity_to_city,
            "price_rwf": round(price, 0),
        })

    return pd.DataFrame(rows)


# ============================================
# LAND GENERATOR
# ============================================
def generate_lands(n=300):
    """Generate n synthetic Kigali land records."""
    rows = []
    for _ in range(n):
        sector = random.choice(list(SECTORS.keys()))
        info = SECTORS[sector]
        district = info["district"]
        per_sqm_min, per_sqm_max = info["land_per_sqm"]

        # Land features
        land_size = random.randint(100, 5000)  # sqm
        road_access = random.choices(["paved", "dirt"], weights=[0.55, 0.45])[0]
        proximity_to_city = random.randint(1, 35)
        proximity_to_road = random.randint(0, 500)  # meters from main road
        slope = random.choice(["flat", "gentle", "steep"])
        utilities = random.choices([1, 0], weights=[0.5, 0.5])[0]   # has water/electricity nearby
        title_deed = random.choices([1, 0], weights=[0.85, 0.15])[0]  # has clear title

        # Per-sqm base (mid of range)
        per_sqm_base = (per_sqm_min + per_sqm_max) / 2

        # Multipliers
        road_factor = 1.0 if road_access == "paved" else 0.7
        prox_city_factor = 1.20 - (proximity_to_city / 35) * 0.4   # 0.80x .. 1.20x
        prox_road_factor = 1.15 - (proximity_to_road / 500) * 0.3  # 0.85x .. 1.15x
        slope_factor = {"flat": 1.10, "gentle": 1.0, "steep": 0.80}[slope]
        utilities_factor = 1.10 if utilities else 1.0
        title_factor = 1.0 if title_deed else 0.75
        # Bigger plots get a small bulk discount per sqm
        size_factor = 1.0 if land_size < 1000 else max(0.85, 1.0 - (land_size - 1000) / 20000)

        per_sqm = (
            per_sqm_base
            * road_factor
            * prox_city_factor
            * prox_road_factor
            * slope_factor
            * utilities_factor
            * title_factor
            * size_factor
        )
        per_sqm *= random.uniform(0.88, 1.12)  # ±12% noise

        total_price = per_sqm * land_size
        total_price = max(total_price, 2_000_000)  # min realistic 2M RWF

        rows.append({
            "title": f"Land in {sector}",
            "district": district,
            "sector": sector,
            "land_size": land_size,
            "road_access": road_access,
            "proximity_to_city": proximity_to_city,
            "proximity_to_road": proximity_to_road,
            "slope": slope,
            "utilities": utilities,
            "title_deed": title_deed,
            "price_per_sqm_rwf": round(per_sqm, 0),
            "price_rwf": round(total_price, 0),
        })

    return pd.DataFrame(rows)


# ============================================
# SAVE BOTH FILES
# ============================================
def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.normpath(os.path.join(script_dir, "..", "data"))
    os.makedirs(data_dir, exist_ok=True)

    # Houses
    df_houses = generate_houses(n=400)
    houses_path = os.path.join(data_dir, "houses_kigali.csv")
    df_houses.to_csv(houses_path, index=False)
    print(f"[OK] Houses: {len(df_houses)} rows -> {houses_path}")

    # Lands
    df_lands = generate_lands(n=300)
    lands_path = os.path.join(data_dir, "lands_kigali.csv")
    df_lands.to_csv(lands_path, index=False)
    print(f"[OK] Land:   {len(df_lands)} rows -> {lands_path}")

    # ----- Quick reports -----
    print("\n" + "=" * 60)
    print(" HOUSES - sample by sector")
    print("=" * 60)
    print(
        df_houses.groupby("sector")["price_rwf"]
        .agg(["count", "mean", "min", "max"])
        .round(0)
        .sort_values("mean", ascending=False)
        .to_string()
    )

    print("\n" + "=" * 60)
    print(" LAND - average price per sqm by sector")
    print("=" * 60)
    print(
        df_lands.groupby("sector")["price_per_sqm_rwf"]
        .agg(["count", "mean", "min", "max"])
        .round(0)
        .sort_values("mean", ascending=False)
        .to_string()
    )


if __name__ == "__main__":
    main()
