# ============================================
# PREDICTION ROUTES (Rwanda edition)
# ============================================
# POST /predict-house  -> AI house price prediction (RWF)
# POST /predict-land   -> AI land price prediction (RWF)
# GET  /predict/info   -> info about loaded models
#
# Both models are RandomForestRegressors trained on synthetic Kigali data.

import os
import joblib
import numpy as np
import pandas as pd
from flask import Blueprint, request, jsonify

predict_bp = Blueprint("predict", __name__)


# ============================================
# LOAD MODELS ONCE AT STARTUP
# ============================================
_dir = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.normpath(os.path.join(_dir, "..", "ml"))

def _load(filename):
    path = os.path.join(ML_DIR, filename)
    if not os.path.exists(path):
        print(f"[predict_routes] WARNING: {filename} not found at {path}")
        return None
    print(f"[predict_routes] Loading {filename} ...")
    return joblib.load(path)

house_bundle = _load("house_model.pkl")
land_bundle  = _load("land_model.pkl")

if house_bundle:
    print(f"[predict_routes] house_model loaded ({len(house_bundle['feature_columns'])} features)")
if land_bundle:
    print(f"[predict_routes] land_model loaded ({len(land_bundle['feature_columns'])} features)")


# ============================================
# Helpers
# ============================================
def build_input_row(data, feature_columns, categorical_cols):
    """
    Convert the user's input dict into a single-row DataFrame matching
    the model's expected feature columns (with one-hot encoding).
    """
    # Start with all expected columns set to 0
    row = {col: 0 for col in feature_columns}

    # Numeric fields - copy them straight in if they match a column name
    for key, val in data.items():
        if key in feature_columns and key not in categorical_cols:
            try:
                row[key] = float(val) if val is not None else 0
            except (ValueError, TypeError):
                row[key] = 0

    # Categorical fields - set the right one-hot column to 1
    for cat_col in categorical_cols:
        val = data.get(cat_col)
        if val is None:
            continue
        target_col = f"{cat_col}_{val}"
        if target_col in row:
            row[target_col] = 1

    return pd.DataFrame([row], columns=feature_columns)


def predict_with_confidence(model, model_input):
    """
    Return a (prediction, confidence_pct) tuple.
    Confidence is derived from the spread of individual tree predictions:
    - Low spread (consistent trees) -> high confidence
    - High spread (trees disagree)  -> low confidence
    """
    # Each tree's prediction
    individual_preds = np.array([tree.predict(model_input)[0] for tree in model.estimators_])
    mean_pred = float(individual_preds.mean())
    std_pred  = float(individual_preds.std())

    # Coefficient of variation (CV) - normalize std by mean
    cv = std_pred / mean_pred if mean_pred > 0 else 1.0

    # Map CV to a 0-100% confidence:
    # CV 0.0 -> 100%, CV 0.05 -> 90%, CV 0.10 -> 80%, etc.
    confidence = max(20.0, 100.0 - cv * 1000)
    confidence = min(99.0, confidence)

    return mean_pred, round(confidence, 1), individual_preds


def explain_house(data, prediction):
    """Generate a human-friendly explanation of the prediction."""
    parts = []
    sector = data.get("sector", "this sector")
    district = data.get("district", "Kigali")
    parts.append(f"Based on comparable {data.get('property_type', 'house')}s in {sector} ({district}).")

    if data.get("size_sqft"):
        parts.append(f"At {int(data['size_sqft'])} sqft, this property is "
                     + ("spacious" if int(data["size_sqft"]) > 2000 else "compact" if int(data["size_sqft"]) < 1000 else "average-sized")
                     + " for the area.")
    if data.get("year_built"):
        yr = int(data["year_built"])
        if yr >= 2020:
            parts.append("Newly built (2020+) which adds a price premium.")
        elif yr <= 2000:
            parts.append("Older construction, which softens the price.")
    if data.get("road_access") == "paved":
        parts.append("Paved road access boosts value.")
    elif data.get("road_access") == "dirt":
        parts.append("Dirt road access reduces value vs paved.")
    if data.get("furnished"):
        parts.append("Furnished — adds about 10% premium.")
    if data.get("modern_finish"):
        parts.append("Modern finishes add another ~10% premium.")

    return " ".join(parts)


def explain_land(data, prediction):
    parts = []
    sector = data.get("sector", "this sector")
    district = data.get("district", "Kigali")
    parts.append(f"Based on land sales in {sector} ({district}).")
    if data.get("land_size"):
        parts.append(f"Plot size: {int(data['land_size'])} sqm.")
    if data.get("road_access") == "paved":
        parts.append("Paved road access significantly increases land value.")
    elif data.get("road_access") == "dirt":
        parts.append("Dirt road access lowers value vs paved.")
    if data.get("slope") == "flat":
        parts.append("Flat terrain is ideal for construction (+10%).")
    elif data.get("slope") == "steep":
        parts.append("Steep terrain reduces value (-20%).")
    if data.get("title_deed"):
        parts.append("Clear title deed — no risk discount applied.")
    elif data.get("title_deed") == 0:
        parts.append("No clear title — significant risk discount applied.")
    return " ".join(parts)


# ============================================
# POST /predict-house
# ============================================
@predict_bp.route("/predict-house", methods=["POST"])
def predict_house():
    if house_bundle is None:
        return jsonify({"error": "House model not loaded. Run train_rwanda_models.py."}), 503

    data = request.get_json(silent=True) or {}
    required = ["district", "sector", "property_type", "bedrooms", "bathrooms", "size_sqft"]
    missing = [f for f in required if f not in data or data[f] in (None, "")]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        model_input = build_input_row(
            data,
            house_bundle["feature_columns"],
            house_bundle["categorical_cols"],
        )
        prediction, confidence, _ = predict_with_confidence(house_bundle["model"], model_input)
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {e}"}), 500

    return jsonify({
        "predicted_price": round(prediction, 0),
        "currency": "RWF",
        "confidence": confidence,
        "explanation": explain_house(data, prediction),
        "model": "RandomForestRegressor (Kigali houses)",
        "input": data,
    }), 200


# ============================================
# POST /predict-land
# ============================================
@predict_bp.route("/predict-land", methods=["POST"])
def predict_land():
    if land_bundle is None:
        return jsonify({"error": "Land model not loaded. Run train_rwanda_models.py."}), 503

    data = request.get_json(silent=True) or {}
    required = ["district", "sector", "land_size", "road_access"]
    missing = [f for f in required if f not in data or data[f] in (None, "")]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        model_input = build_input_row(
            data,
            land_bundle["feature_columns"],
            land_bundle["categorical_cols"],
        )
        prediction, confidence, _ = predict_with_confidence(land_bundle["model"], model_input)
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {e}"}), 500

    # Also calculate per-sqm price
    land_size = float(data.get("land_size", 1))
    per_sqm = round(prediction / land_size, 0) if land_size > 0 else None

    return jsonify({
        "predicted_price": round(prediction, 0),
        "price_per_sqm": per_sqm,
        "currency": "RWF",
        "confidence": confidence,
        "explanation": explain_land(data, prediction),
        "model": "RandomForestRegressor (Kigali land)",
        "input": data,
    }), 200


# ============================================
# GET /predict/info
# ============================================
@predict_bp.route("/predict/info", methods=["GET"])
def predict_info():
    return jsonify({
        "house_model": {
            "loaded": house_bundle is not None,
            "feature_count": len(house_bundle["feature_columns"]) if house_bundle else 0,
            "metrics": house_bundle.get("metrics") if house_bundle else None,
        },
        "land_model": {
            "loaded": land_bundle is not None,
            "feature_count": len(land_bundle["feature_columns"]) if land_bundle else 0,
            "metrics": land_bundle.get("metrics") if land_bundle else None,
        },
    }), 200
