# ============================================
# TRAIN RWANDA AI MODELS (House + Land)
# ============================================
# Loads houses_kigali.csv and lands_kigali.csv, trains a separate
# RandomForestRegressor for each, and saves them as .pkl files.
#
# Run with: python ml/train_rwanda_models.py

import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score


# ============================================
# CONFIG
# ============================================
script_dir = os.path.dirname(os.path.abspath(__file__))
data_dir   = os.path.normpath(os.path.join(script_dir, "..", "data"))


# ============================================
# HELPER: One-hot encode categorical columns
# ============================================
def encode_categoricals(df, categorical_cols):
    """Returns a new DataFrame with categorical columns one-hot encoded."""
    return pd.get_dummies(df, columns=categorical_cols, prefix=categorical_cols)


# ============================================
# HELPER: Train + evaluate + save one model
# ============================================
def train_and_save(name, df, target_col, categorical_cols, output_filename):
    print("=" * 60)
    print(f" TRAINING: {name.upper()} MODEL")
    print("=" * 60)

    # 1. Encode categorical text columns
    df_enc = encode_categoricals(df, categorical_cols)

    # 2. Split features (X) and target (y)
    # We drop the target AND any non-feature columns like "title"
    drop_cols = [target_col]
    if "title" in df_enc.columns:
        drop_cols.append("title")
    # For land, we also drop price_per_sqm_rwf since it's directly derived from price
    if "price_per_sqm_rwf" in df_enc.columns:
        drop_cols.append("price_per_sqm_rwf")

    X = df_enc.drop(columns=drop_cols, errors="ignore")
    y = df_enc[target_col]
    feature_columns = X.columns.tolist()

    print(f"Features ({len(feature_columns)}): {feature_columns}\n")

    # 3. Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"Train: {len(X_train)} | Test: {len(X_test)}")

    # 4. Train Random Forest
    print("Training Random Forest (200 trees)...")
    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=None,
        min_samples_split=2,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # 5. Evaluate
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    r2  = r2_score(y_test, predictions)

    print(f"\nMAE: {mae:>15,.0f} RWF")
    print(f"R²:  {r2:>15.4f}  ({r2*100:.1f}% of variance explained)")

    # 6. Feature importance (top 10)
    importance = (
        pd.DataFrame({"feature": feature_columns, "importance": model.feature_importances_})
        .sort_values("importance", ascending=False)
        .head(10)
    )
    print(f"\nTop 10 most important features:")
    print(importance.to_string(index=False))

    # 7. Save model + metadata
    output_path = os.path.join(script_dir, output_filename)
    joblib.dump({
        "model": model,
        "feature_columns": feature_columns,
        "categorical_cols": categorical_cols,
        "target_col": target_col,
        "metrics": {"mae": float(mae), "r2": float(r2)},
    }, output_path)
    print(f"\n[SAVED] {output_path}")
    print()


# ============================================
# MAIN
# ============================================
def main():
    # ---------- HOUSE MODEL ----------
    houses_path = os.path.join(data_dir, "houses_kigali.csv")
    if not os.path.exists(houses_path):
        print(f"[ERROR] {houses_path} not found. Run generate_rwanda_dataset.py first.")
        return
    houses_df = pd.read_csv(houses_path)

    train_and_save(
        name="house",
        df=houses_df,
        target_col="price_rwf",
        categorical_cols=["district", "sector", "property_type", "road_access"],
        output_filename="house_model.pkl",
    )

    # ---------- LAND MODEL ----------
    lands_path = os.path.join(data_dir, "lands_kigali.csv")
    if not os.path.exists(lands_path):
        print(f"[ERROR] {lands_path} not found. Run generate_rwanda_dataset.py first.")
        return
    lands_df = pd.read_csv(lands_path)

    train_and_save(
        name="land",
        df=lands_df,
        target_col="price_rwf",
        categorical_cols=["district", "sector", "road_access", "slope"],
        output_filename="land_model.pkl",
    )

    print("=" * 60)
    print(" ALL DONE!")
    print("=" * 60)
    print(" Two models saved in backend/ml/:")
    print("   - house_model.pkl")
    print("   - land_model.pkl")
    print(" Ready to be loaded by the Flask backend.")


if __name__ == "__main__":
    main()
