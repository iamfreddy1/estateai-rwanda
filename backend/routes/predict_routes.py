# ============================================
# PREDICTION ROUTES (Rwanda edition, v2 - geo-aware)
# ============================================
# POST /predict-house  -> AI house price prediction (RWF)
# POST /predict-land   -> AI land price prediction (RWF)
# GET  /predict/info   -> loaded model metadata + metrics
#
# v2 changes:
#   - Loads the new versioned bundles from train_pipeline.py
#   - Computes geospatial features at inference (sector centroid bridge, or the
#     property's real lat/lon if provided) via the shared GeoEngine
#   - Handles log-target models (expm1 inverse)
#   - Confidence = the model's validated "within 20%" hit-rate (honest, stable)
#   - Backward compatible with old bundles (no geo, no log target)
# ============================================

import os
import joblib
import numpy as np
import pandas as pd
from flask import Blueprint, request, jsonify

predict_bp = Blueprint("predict", __name__)

_dir = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.normpath(os.path.join(_dir, "..", "ml"))

# ---- geo engine (optional; predictions degrade gracefully if missing) ----
try:
    from ml.geo import get_engine
    GEO = get_engine()
except Exception as e:
    print(f"[predict_routes] geo engine unavailable: {e}")
    GEO = None

# engine feature key -> model column name
_GEO_MAP = {
    "cbd_distance_km": "cbd_distance_km",
    "dist_school_km": "nearest_school_km",
    "dist_hospital_km": "nearest_hospital_km",
    "dist_market_km": "nearest_market_km",
    "dist_bank_km": "nearest_bank_km",
    "accessibility_score": "accessibility_score",
    "sector_density_score": "sector_density_score",
    "neighborhood_score": "neighborhood_score",
    "investment_score": "investment_score",
}


def _load(filename):
    path = os.path.join(ML_DIR, filename)
    if not os.path.exists(path):
        print(f"[predict_routes] WARNING: {filename} not found")
        return None
    print(f"[predict_routes] loading {filename}")
    return joblib.load(path)


house_bundle = _load("house_model.pkl")
land_bundle = _load("land_model.pkl")

def _force_single_threaded(model):
    """eventlet on Windows can deadlock when sklearn predict uses n_jobs>1.
    Walk the (possibly stacking) ensemble and force serial inference.
    Robust against estimators_ being a list, dict, OR numpy array."""
    if model is None:
        return
    if hasattr(model, "n_jobs"):
        try: model.n_jobs = 1
        except Exception: pass
    # safely collect sub-estimators across sklearn variants
    children = []
    for attr in ("estimators_", "named_estimators_"):
        ests = getattr(model, attr, None)
        if ests is None:
            continue
        try:
            children.extend(ests.values() if isinstance(ests, dict) else list(ests))
        except Exception:
            pass
    final = getattr(model, "final_estimator_", None)
    if final is not None:
        children.append(final)
    for child in children:
        _force_single_threaded(child)


if house_bundle: _force_single_threaded(house_bundle["model"])
if land_bundle:  _force_single_threaded(land_bundle["model"])
print(f"[predict_routes] forced n_jobs=1 on loaded models (eventlet safety)")



def compute_geo(data):
    """Return the geo-feature columns for a request, merged into a dict.
    Uses real lat/lon if present, else the sector centroid bridge."""
    if GEO is None:
        return {}
    lat, lon = data.get("latitude"), data.get("longitude")
    try:
        if lat is not None and lon is not None:
            lat, lon = float(lat), float(lon)
        else:
            pt = GEO.sector_point(str(data.get("sector", "")).strip())
            if not pt:
                return {}
            lat, lon = pt
    except (TypeError, ValueError):
        return {}
    f = GEO.features(lat, lon)
    return {col: f.get(key) for key, col in _GEO_MAP.items() if f.get(key) is not None}


def build_input_row(data, feature_columns, categorical_cols):
    """Single-row DataFrame matching the model's (one-hot) feature columns."""
    row = {col: 0 for col in feature_columns}
    for key, val in data.items():
        if key in feature_columns and key not in categorical_cols:
            try:
                row[key] = float(val) if val is not None else 0
            except (ValueError, TypeError):
                row[key] = 0
    for cat in categorical_cols:
        val = data.get(cat)
        if val is None:
            continue
        target = f"{cat}_{val}"
        if target in row:
            row[target] = 1
    return pd.DataFrame([row], columns=feature_columns)



def _validate_numbers(data, bounds):
    """Reject out-of-range / non-numeric inputs (lo <= v <= hi). Returns error str or None."""
    for field, (lo, hi) in bounds.items():
        v = data.get(field)
        if v in (None, ""):
            continue
        try:
            fv = float(v)
        except (TypeError, ValueError):
            return f"{field} must be a number"
        if fv < lo or fv > hi:
            return f"{field} out of range ({lo}-{hi})"
    return None


def run_prediction(bundle, data):
    """Core inference shared by both endpoints. Returns a result dict."""
    import sys
    name = bundle.get("model_name", "model")
    print(f"[predict] {name} request data: sector={data.get('sector')} type={data.get('property_type') or data.get('land_size')}", flush=True)
    # 1. enrich with geo features (sector bridge or real coords)
    geo = compute_geo(data)
    print(f"[predict] {name} geo computed: {bool(geo)}", flush=True)
    merged = {**data, **geo}
    # 2. build model input
    X = build_input_row(merged, bundle["feature_columns"], bundle.get("categorical_cols", []))
    # 3. predict (inverse log if needed)
    print(f"[predict] {name} calling model.predict ...", flush=True)
    pred = float(bundle["model"].predict(X)[0])
    print(f"[predict] {name} predict OK (raw={pred:.3f})", flush=True)
    if bundle.get("log_target"):
        pred = float(np.expm1(pred))
    pred = max(pred, 0.0)
    # 4. honest confidence = validated within-20% hit-rate; interval = +/- MAE
    metrics = bundle.get("metrics", {})
    confidence = round(metrics.get("within20pct", 70.0), 1)
    mae = metrics.get("mae")
    interval = [round(max(pred - mae, 0)), round(pred + mae)] if mae else None
    return {"prediction": round(pred), "confidence": confidence,
            "interval": interval, "geo": geo, "merged": merged}


def explain_house(d, geo):
    p = [f"Based on {d.get('property_type','house')}s in {d.get('sector','this sector')}, {d.get('district','Kigali')}."]
    if geo.get("cbd_distance_km") is not None:
        p.append(f"About {geo['cbd_distance_km']} km from the city centre.")
    if geo.get("nearest_school_km") is not None:
        p.append(f"Nearest school ~{geo['nearest_school_km']} km, hospital ~{geo.get('nearest_hospital_km')} km.")
    if geo.get("accessibility_score") is not None:
        p.append(f"Accessibility score {geo['accessibility_score']}/100, neighborhood {geo.get('neighborhood_score')}/100.")
    if d.get("furnished"):
        p.append("Furnished adds a premium.")
    return " ".join(p)


def explain_land(d, geo):
    p = [f"Based on land in {d.get('sector','this sector')}, {d.get('district','Kigali')}."]
    if geo.get("cbd_distance_km") is not None:
        p.append(f"~{geo['cbd_distance_km']} km from the city centre.")
    if geo.get("accessibility_score") is not None:
        p.append(f"Accessibility {geo['accessibility_score']}/100, investment score {geo.get('investment_score')}/100.")
    if d.get("road_access") == "paved":
        p.append("Paved road access increases value.")
    if d.get("slope") == "steep":
        p.append("Steep terrain reduces value.")
    return " ".join(p)


@predict_bp.route("/predict-house", methods=["POST"])
def predict_house():
    if house_bundle is None:
        return jsonify({"error": "House model not loaded. Run train_pipeline.py."}), 503
    data = request.get_json(silent=True) or {}
    required = ["district", "sector", "property_type", "bedrooms", "bathrooms", "size_sqft"]
    missing = [f for f in required if f not in data or data[f] in (None, "")]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
    verr = _validate_numbers(data, {"size_sqft": (1, 100000), "bedrooms": (0, 20),
                                    "bathrooms": (0, 20), "year_built": (1900, 2100)})
    if verr:
        return jsonify({"error": verr}), 400
    try:
        r = run_prediction(house_bundle, data)
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": f"Prediction failed: {e}"}), 500
    return jsonify({
        "predicted_price": r["prediction"], "currency": "RWF",
        "price_range": r["interval"], "confidence": r["confidence"],
        "explanation": explain_house(data, r["geo"]),
        "geo_features": r["geo"],
        "model": f"{house_bundle.get('model_name','model')} ({house_bundle.get('feature_set','')})",
        "model_version": house_bundle.get("version"),
    }), 200


@predict_bp.route("/predict-land", methods=["POST"])
def predict_land():
    if land_bundle is None:
        return jsonify({"error": "Land model not loaded. Run train_pipeline.py."}), 503
    data = request.get_json(silent=True) or {}
    required = ["district", "sector", "land_size", "road_access"]
    missing = [f for f in required if f not in data or data[f] in (None, "")]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
    verr = _validate_numbers(data, {"land_size": (1, 10_000_000)})
    if verr:
        return jsonify({"error": verr}), 400
    try:
        r = run_prediction(land_bundle, data)
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": f"Prediction failed: {e}"}), 500
    land_size = float(data.get("land_size", 1) or 1)
    per_sqm = round(r["prediction"] / land_size) if land_size > 0 else None
    return jsonify({
        "predicted_price": r["prediction"], "price_per_sqm": per_sqm, "currency": "RWF",
        "price_range": r["interval"], "confidence": r["confidence"],
        "explanation": explain_land(data, r["geo"]),
        "geo_features": r["geo"],
        "model": f"{land_bundle.get('model_name','model')} ({land_bundle.get('feature_set','')})",
        "model_version": land_bundle.get("version"),
    }), 200


@predict_bp.route("/predict/info", methods=["GET"])
def predict_info():
    def info(b):
        if not b:
            return {"loaded": False}
        return {"loaded": True, "model": b.get("model_name"), "version": b.get("version"),
                "feature_set": b.get("feature_set"), "n_rows": b.get("n_rows"),
                "metrics": b.get("metrics"), "geo_importance_pct": b.get("geo_importance_pct"),
                "feature_importance_top": list((b.get("feature_importance_top") or {}).keys())[:8],
                "trained_at": b.get("trained_at")}
    return jsonify({"house_model": info(house_bundle), "land_model": info(land_bundle),
                    "geo_engine": GEO is not None}), 200
