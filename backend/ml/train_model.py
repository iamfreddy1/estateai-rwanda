# ============================================
# TRAIN THE RANDOM FOREST MODEL
# ============================================
# Loads properties.csv, trains a Random Forest, and saves it to model.pkl
# Run with: python ml/train_model.py

import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

# ============================================
# 1. LOAD THE DATASET
# ============================================
script_dir = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join(script_dir, "..", "data", "properties.csv")
data_path = os.path.normpath(data_path)

print(f"Loading data from: {data_path}")
df = pd.read_csv(data_path)
print(f"Loaded {len(df)} records")
print(df.head())
print()

# ============================================
# 2. PREPARE FEATURES (X) AND TARGET (y)
# ============================================
# Features (X) = the inputs the model will use to predict
# Target  (y) = what we want to predict (price)

# One-Hot encode the "location" text column into multiple numeric columns
# e.g. location="Beachside"  ->  location_Beachside=1, location_Suburb=0, ...
df_encoded = pd.get_dummies(df, columns=["location"], prefix="loc")

print("Columns after encoding:")
print(df_encoded.columns.tolist())
print()

# Separate features from target
X = df_encoded.drop("price", axis=1)  # everything except price
y = df_encoded["price"]               # only price

# Save the column order so we can match it during prediction later
feature_columns = X.columns.tolist()

# ============================================
# 3. SPLIT INTO TRAIN AND TEST SETS
# ============================================
# We train on 80% of data and test on 20% to measure how well it generalizes
# random_state=42 makes the split reproducible
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print(f"Training set: {len(X_train)} rows")
print(f"Test set: {len(X_test)} rows")
print()

# ============================================
# 4. CREATE AND TRAIN THE RANDOM FOREST
# ============================================
# n_estimators=100 -> use 100 trees (more trees = more accurate but slower)
# random_state=42 -> reproducible results
print("Training Random Forest model...")
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)
print("Training complete!\n")

# ============================================
# 5. EVALUATE THE MODEL
# ============================================
# How well did it learn? Predict on test set and compare to actual prices.
predictions = model.predict(X_test)

mae = mean_absolute_error(y_test, predictions)  # avg dollar error
r2 = r2_score(y_test, predictions)              # 0-1 score, 1 = perfect

print("=" * 50)
print("MODEL PERFORMANCE")
print("=" * 50)
print(f"Mean Absolute Error: ${mae:,.2f}")
print(f"   -> On average, predictions are off by ${mae:,.0f}")
print(f"R² Score: {r2:.4f}")
print(f"   -> The model explains {r2*100:.1f}% of price variation")
print("=" * 50)
print()

# ============================================
# 6. SHOW WHICH FEATURES MATTER MOST
# ============================================
# Random Forest tells us which features had the biggest impact on price
importance_df = pd.DataFrame({
    "feature": feature_columns,
    "importance": model.feature_importances_
}).sort_values("importance", ascending=False)

print("Feature Importance (which features matter most):")
print(importance_df.to_string(index=False))
print()

# ============================================
# 7. SAVE THE MODEL + FEATURE COLUMNS
# ============================================
# We save BOTH the model AND the column order it expects.
# When Flask uses this later, it must give the model data in the same format.
model_path = os.path.join(script_dir, "model.pkl")

joblib.dump({
    "model": model,
    "feature_columns": feature_columns
}, model_path)

print(f"Model saved to: {model_path}")
print("Done! Now Flask can load this model in /predict")
