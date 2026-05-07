# ============================================
# DATASET GENERATOR
# ============================================
# Creates a synthetic property dataset for training the AI model.
# Saves it to ../data/properties.csv
#
# Run this ONCE with: python ml/generate_dataset.py

import os
import random
import pandas as pd

# Make results reproducible (same random numbers every run)
random.seed(42)

# ============================================
# CONFIGURATION
# ============================================
NUM_RECORDS = 200  # How many fake properties to generate

# Possible neighborhoods. Each has a "premium" added to the price.
LOCATIONS = {
    "Downtown": 80000,
    "City Center": 70000,
    "Suburb": 20000,
    "Countryside": -10000,
    "Beachside": 100000,
    "Industrial": -20000,
}

# ============================================
# GENERATE DATA
# ============================================
records = []

for _ in range(NUM_RECORDS):
    # Random property features within realistic ranges
    bedrooms = random.randint(1, 6)
    bathrooms = random.randint(1, 4)
    size_sqft = random.randint(500, 5000)
    age = random.randint(0, 50)
    location = random.choice(list(LOCATIONS.keys()))

    # Calculate price using a known formula + noise
    location_bonus = LOCATIONS[location]
    base_price = (
        bedrooms * 50000 +
        bathrooms * 30000 +
        size_sqft * 200 -
        age * 1500 +
        location_bonus
    )

    # Add ±10% random noise to simulate real-world variation
    noise = random.uniform(-0.1, 0.1) * base_price
    price = max(base_price + noise, 30000)  # never below 30k

    records.append({
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "size_sqft": size_sqft,
        "age": age,
        "location": location,
        "price": round(price, 2)
    })

# ============================================
# SAVE TO CSV
# ============================================
df = pd.DataFrame(records)

# Build the path to ../data/properties.csv (relative to this script)
script_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(script_dir, "..", "data", "properties.csv")
output_path = os.path.normpath(output_path)

df.to_csv(output_path, index=False)

# ============================================
# REPORT
# ============================================
print(f"Generated {len(df)} property records")
print(f"Saved to: {output_path}")
print("\nFirst 5 rows:")
print(df.head())
print("\nDataset summary:")
print(df.describe())
