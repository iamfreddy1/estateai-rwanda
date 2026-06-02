# ============================================
# train_pipeline.py - PRODUCTION ML TRAINING PIPELINE  (EstateAI Rwanda)
# ============================================
# One reusable pipeline for BOTH the house and land valuation models.
#
# What it does, in order:
#   1. Load enriched dataset (*_geo.csv) -> fall back to base csv if absent
#   2. Clean: drop duplicates, impute missing, remove price outliers (IQR)
#   3. Build TWO feature sets: BASELINE (no geo) and ENRICHED (with geo)
#   4. Train a roster of models (RF, GradientBoosting, XGBoost, LightGBM,
#      CatBoost) + a Stacking ensemble. Libraries that aren't installed are
#      skipped automatically, so this runs anywhere.
#   5. Light hyper-parameter tuning on the tree models
#   6. Evaluate every model with MAE / RMSE / R^2 (holdout) + 5-fold CV R^2
#   7. Auto-select the best model; also flag the best LIGHTWEIGHT model for
#      Render deployment (CatBoost is excluded from "lightweight").
#   8. Feature importance + SHAP (if installed; permutation fallback otherwise)
#   9. Save a versioned model bundle (joblib) the Flask API loads.
#
# Log-target: we train on log(price) because property prices are right-skewed;
# this stabilises variance and is standard practice for price models.
#
# Run from backend/:  python ml/train_pipeline.py
# ============================================

import os
import json
import time
import hashlib
import logging
import warnings
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, cross_val_score, RandomizedSearchCV
from sklearn.ensemble import (RandomForestRegressor, GradientBoostingRegressor,
                              StackingRegressor)
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s",
                    datefmt="%H:%M:%S")
log = logging.getLogger("train")

_THIS = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(_THIS, "..", "data")
PIPELINE_VERSION = "2.0"

# ---- optional libraries (roster degrades gracefully) ----
def _try_import(name):
    try:
        return __import__(name)
    except Exception as e:
        log.warning("optional lib '%s' not available (%s)", name, type(e).__name__)
        return None

xgb = _try_import("xgboost")
lgb = _try_import("lightgbm")
catboost = _try_import("catboost")
shap = _try_import("shap")

# geo columns added by build_features.py
GEO_COLS = ["cbd_distance_km", "nearest_school_km", "nearest_hospital_km",
            "nearest_market_km", "nearest_bank_km", "accessibility_score",
            "sector_density_score", "neighborhood_score", "investment_score"]
LIGHTWEIGHT = {"RandomForest", "GradientBoosting", "XGBoost", "LightGBM", "Stacking"}  # not CatBoost


# ============================================
# DATA PREP
# ============================================
def clean(df, target):
    """Dedupe, impute, and remove extreme price outliers (IQR fence)."""
    n0 = len(df)
    df = df.drop_duplicates().copy()
    # numeric impute -> median ; categorical/object impute -> mode/"unknown"
    for c in df.columns:
        if df[c].isna().any():
            if pd.api.types.is_numeric_dtype(df[c]):
                df[c] = df[c].fillna(df[c].median())
            else:
                df[c] = df[c].fillna(df[c].mode().iloc[0] if not df[c].mode().empty else "unknown")
    # IQR outlier removal on the target
    q1, q3 = df[target].quantile(0.25), df[target].quantile(0.75)
    iqr = q3 - q1
    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    df = df[(df[target] >= lo) & (df[target] <= hi)]
    log.info("clean: %d -> %d rows (dropped %d dup/outlier)", n0, len(df), n0 - len(df))
    return df


def make_xy(df, target, categorical, feature_cols):
    """One-hot encode categoricals; return X (DataFrame), y(log), feature names."""
    use = [c for c in feature_cols if c in df.columns]
    cats = [c for c in categorical if c in use]
    X = pd.get_dummies(df[use], columns=cats, prefix=cats)
    y = np.log1p(df[target].values)  # log target
    return X, y, X.columns.tolist()


# ============================================
# MODEL ROSTER
# ============================================
def build_roster(n_features):
    roster = {}
    roster["RandomForest"] = RandomForestRegressor(
        n_estimators=150, max_depth=None, min_samples_leaf=2, n_jobs=-1, random_state=42)
    roster["GradientBoosting"] = GradientBoostingRegressor(
        n_estimators=150, max_depth=3, learning_rate=0.05, random_state=42)
    if xgb:
        roster["XGBoost"] = xgb.XGBRegressor(
            n_estimators=400, max_depth=4, learning_rate=0.05, subsample=0.9,
            colsample_bytree=0.9, random_state=42, n_jobs=-1, verbosity=0)
    if lgb:
        roster["LightGBM"] = lgb.LGBMRegressor(
            n_estimators=400, max_depth=-1, num_leaves=31, learning_rate=0.05,
            subsample=0.9, colsample_bytree=0.9, random_state=42, n_jobs=-1, verbose=-1)
    if catboost:
        roster["CatBoost"] = catboost.CatBoostRegressor(
            iterations=400, depth=6, learning_rate=0.05, random_state=42, verbose=0)
    return roster


def evaluate(model, X_tr, X_te, y_tr, y_te, X_all, y_all):
    """Fit, then report metrics in REAL price units (we inverse the log)."""
    model.fit(X_tr, y_tr)
    pred_log = model.predict(X_te)
    pred = np.expm1(pred_log); actual = np.expm1(y_te)
    mae = mean_absolute_error(actual, pred)
    rmse = float(np.sqrt(mean_squared_error(actual, pred)))
    r2 = r2_score(actual, pred)
    # % of predictions within 20% of actual (an honest "accuracy" metric)
    within20 = float(np.mean(np.abs(pred - actual) / np.maximum(actual, 1) <= 0.20) * 100)
    try:
        cv = cross_val_score(model, X_all, y_all, cv=3, scoring="r2", n_jobs=-1)
        cv_r2 = float(cv.mean())
    except Exception:
        cv_r2 = float("nan")
    return {"mae": mae, "rmse": rmse, "r2": r2, "within20pct": within20, "cv_r2": cv_r2}


def tune_best(name, model, X, y):
    """Light RandomizedSearch on the winning tree model (kept small for speed)."""
    grids = {
        "RandomForest": {"n_estimators": [200, 400, 600], "max_depth": [None, 12, 20],
                         "min_samples_leaf": [1, 2, 4]},
        "XGBoost": {"n_estimators": [300, 500], "max_depth": [3, 4, 6],
                    "learning_rate": [0.03, 0.05, 0.1]},
        "LightGBM": {"n_estimators": [300, 500], "num_leaves": [21, 31, 63],
                     "learning_rate": [0.03, 0.05, 0.1]},
        "GradientBoosting": {"n_estimators": [200, 400], "max_depth": [2, 3, 4],
                             "learning_rate": [0.03, 0.05, 0.1]},
        "CatBoost": {"iterations": [300, 500], "depth": [4, 6, 8]},
    }
    grid = grids.get(name)
    if not grid:
        return model, {}
    try:
        rs = RandomizedSearchCV(model, grid, n_iter=4, cv=3, scoring="r2",
                                n_jobs=-1, random_state=42)
        rs.fit(X, y)
        log.info("  tuned %s best params: %s", name, rs.best_params_)
        return rs.best_estimator_, rs.best_params_
    except Exception as e:
        log.warning("  tuning skipped for %s (%s)", name, e)
        return model, {}


def importance(model, feature_names, X_sample, y_sample=None):
    """Return {feature: importance} normalized 0..1.
    Uses model.feature_importances_ when available; otherwise falls back to
    permutation importance (works for ANY model, incl. stacking ensembles)."""
    imp = getattr(model, "feature_importances_", None)
    if imp is None:
        if y_sample is None:
            return {}
        from sklearn.inspection import permutation_importance
        r = permutation_importance(model, X_sample, y_sample, n_repeats=5,
                                   random_state=42, n_jobs=-1)
        imp = np.clip(r.importances_mean, 0, None)
    imp = np.asarray(imp, dtype=float)
    if imp.sum() > 0:
        imp = imp / imp.sum()
    return dict(sorted(zip(feature_names, imp), key=lambda kv: kv[1], reverse=True))


def shap_top(model, X_sample, feature_names, k=12):
    if shap is None:
        return None
    try:
        expl = shap.TreeExplainer(model)
        vals = expl.shap_values(X_sample)
        mean_abs = np.abs(vals).mean(axis=0)
        pairs = sorted(zip(feature_names, mean_abs.tolist()), key=lambda kv: kv[1], reverse=True)
        return [{"feature": f, "mean_abs_shap": round(float(v), 5)} for f, v in pairs[:k]]
    except Exception as e:
        log.warning("  SHAP failed (%s)", e)
        return None


# ============================================
# TRAIN ONE TARGET (house or land)
# ============================================
def train_target(name, base_csv, target, categorical, base_features, output_pkl):
    log.info("=" * 64)
    log.info("TRAINING: %s", name.upper())
    log.info("=" * 64)
    geo_csv = os.path.join(DATA, base_csv.replace(".csv", "_geo.csv"))
    path = geo_csv if os.path.exists(geo_csv) else os.path.join(DATA, base_csv)
    has_geo = path == geo_csv
    df = pd.read_csv(path)
    log.info("data: %s (%d rows) | geo-enriched=%s", os.path.basename(path), len(df), has_geo)
    df = clean(df, target)

    results = {}
    bundles = {}
    feature_sets = {"baseline": base_features}
    if has_geo:
        feature_sets["enriched"] = base_features + GEO_COLS

    for set_name, feats in feature_sets.items():
        X, y, fnames = make_xy(df, target, categorical, feats)
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
        log.info("[%s] %d features, train=%d test=%d", set_name, len(fnames), len(X_tr), len(X_te))
        roster = build_roster(len(fnames))
        # add a stacking ensemble from available base learners
        base_learners = [(k, v) for k, v in roster.items() if k in ("RandomForest","GradientBoosting","XGBoost","LightGBM")]
        if len(base_learners) >= 2:
            roster["Stacking"] = StackingRegressor(
                estimators=base_learners, final_estimator=Ridge(), n_jobs=-1, passthrough=False)
        for mname, model in roster.items():
            t0 = time.time()
            m = evaluate(model, X_tr, X_te, y_tr, y_te, X, y)
            m["secs"] = round(time.time() - t0, 1)
            results[f"{set_name}/{mname}"] = m
            bundles[f"{set_name}/{mname}"] = (model, fnames, feats)
            log.info("  %-22s R2=%.3f within20%%=%4.1f MAE=%.0f (%ss)",
                     f"{set_name}/{mname}", m["r2"], m["within20pct"], m["mae"], m["secs"])

    # ---- pick best overall (by holdout R2, enriched preferred on ties) ----
    def score_key(k):
        r = results[k]
        return (r["r2"], 1 if k.startswith("enriched") else 0)
    best_key = max(results, key=score_key)
    best_set, best_name = best_key.split("/")
    best_model, best_feats, best_cols = bundles[best_key]
    log.info("BEST overall: %s (R2=%.3f)", best_key, results[best_key]["r2"])

    # ---- best lightweight (for Render) ----
    light_keys = [k for k in results if k.split("/")[1] in LIGHTWEIGHT]
    best_light_key = max(light_keys, key=score_key) if light_keys else best_key
    deploy_key = best_light_key  # we deploy the lightweight winner
    deploy_set, deploy_name = deploy_key.split("/")
    deploy_model, deploy_fnames, deploy_cols = bundles[deploy_key]
    log.info("DEPLOY (lightweight): %s (R2=%.3f)", deploy_key, results[deploy_key]["r2"])

    # ---- refit deploy model on ALL data + light tuning ----
    Xf, yf, fnames = make_xy(df, target, categorical, deploy_cols)
    tuned, best_params = tune_best(deploy_name, deploy_model, Xf, yf)
    tuned.fit(Xf, yf)

    # ---- explainability ----
    imp = importance(tuned, fnames, Xf.head(120), yf[:120])
    top_imp = dict(list(imp.items())[:12])
    sh = shap_top(tuned, Xf.head(150), fnames)

    # geo-feature contribution (sum of importance over geo one-hot/num cols)
    geo_contrib = round(sum(v for f, v in imp.items()
                            if any(f == g or f.startswith(g) for g in GEO_COLS)) * 100, 1)

    # ---- versioned bundle ----
    data_hash = hashlib.md5(pd.util.hash_pandas_object(df, index=True).values).hexdigest()[:10]
    bundle = {
        "model": tuned,
        "model_name": deploy_name,
        "feature_set": deploy_set,
        "feature_columns": fnames,          # post-encoding columns (API rebuilds these)
        "raw_features": deploy_cols,        # pre-encoding inputs
        "categorical_cols": [c for c in categorical if c in deploy_cols],
        "target_col": target,
        "log_target": True,
        "geo_columns": [g for g in GEO_COLS if g in deploy_cols],
        "metrics": results[deploy_key],
        "best_overall": {"key": best_key, "metrics": results[best_key]},
        "all_results": results,
        "feature_importance_top": top_imp,
        "shap_top": sh,
        "geo_importance_pct": geo_contrib,
        "best_params": best_params,
        "version": PIPELINE_VERSION,
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "n_rows": len(df),
        "data_hash": data_hash,
    }
    out = os.path.join(_THIS, output_pkl)
    import joblib
    joblib.dump(bundle, out)
    # versioned copy
    vdir = os.path.join(_THIS, "versions"); os.makedirs(vdir, exist_ok=True)
    joblib.dump(bundle, os.path.join(vdir, output_pkl.replace(".pkl", f"_{PIPELINE_VERSION}_{data_hash}.pkl")))
    log.info("saved %s  (deploy=%s, geo_importance=%.1f%%)", output_pkl, deploy_name, geo_contrib)
    return bundle


def summarize(name, b):
    base = max((v for k, v in b["all_results"].items() if k.startswith("baseline")),
               key=lambda r: r["r2"], default=None)
    enr = max((v for k, v in b["all_results"].items() if k.startswith("enriched")),
              key=lambda r: r["r2"], default=None)
    print(f"\n##### {name} #####")
    print(f"  deployed model : {b['model_name']}  (feature set: {b['feature_set']})")
    if base: print(f"  best BASELINE  : R2={base['r2']:.3f}  within20%={base['within20pct']:.1f}  MAE={base['mae']:,.0f}")
    if enr:  print(f"  best ENRICHED  : R2={enr['r2']:.3f}  within20%={enr['within20pct']:.1f}  MAE={enr['mae']:,.0f}")
    if base and enr:
        print(f"  geo-feature effect: dR2={enr['r2']-base['r2']:+.3f}  dWithin20%={enr['within20pct']-base['within20pct']:+.1f}")
    print(f"  geo importance share: {b['geo_importance_pct']}%")
    print(f"  top features: {', '.join(list(b['feature_importance_top'])[:6])}")


def main():
    house = train_target(
        "house", "houses_kigali.csv", "price_rwf",
        categorical=["district", "sector", "property_type", "road_access"],
        base_features=["district", "sector", "property_type", "bedrooms", "bathrooms",
                       "size_sqft", "land_size", "year_built", "road_access", "furnished",
                       "parking", "modern_finish", "proximity_to_city"],
        output_pkl="house_model.pkl")
    land = train_target(
        "land", "lands_kigali.csv", "price_rwf",
        categorical=["district", "sector", "road_access", "slope"],
        base_features=["district", "sector", "land_size", "road_access", "proximity_to_city",
                       "proximity_to_road", "slope", "utilities", "title_deed"],
        output_pkl="land_model.pkl")
    print("\n" + "=" * 64); print(" SUMMARY"); print("=" * 64)
    summarize("HOUSE", house); summarize("LAND", land)


if __name__ == "__main__":
    main()
