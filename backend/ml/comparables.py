# ============================================
# COMPARABLE-PROPERTY VALUATION  (KNN / "comps")
# ============================================
# The valuation method real appraisers and Zillow lean on: find the most
# similar recently-listed properties ("comparables") and price off them.
# This complements the ML model - it's transparent, explains itself, and is
# robust when the ML model is uncertain.
#
# Works on the enriched dataset today; point it at real scraped listings later
# (same columns) and it becomes a true market-comparables engine with zero
# code change.
# ============================================

import os
import logging
import numpy as np
import pandas as pd

log = logging.getLogger("comparables")
_THIS = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(_THIS, "..", "data")

# numeric features used for similarity + their weights (higher = matters more)
SIM_WEIGHTS = {
    "size": 3.0, "bedrooms": 1.5, "bathrooms": 1.0,
    "cbd_distance_km": 2.0, "accessibility_score": 1.5, "neighborhood_score": 1.0,
}


class ComparablesEngine:
    def __init__(self, df, size_col, price_col="price_rwf"):
        self.df = df.reset_index(drop=True).copy()
        self.size_col = size_col
        self.price_col = price_col
        self.df["_ppsqm"] = self.df[price_col] / self.df[size_col].replace(0, np.nan)
        # precompute per-column std for z-score normalization
        self._stats = {}
        for f in SIM_WEIGHTS:
            col = size_col if f == "size" else f
            if col in self.df.columns:
                s = self.df[col].astype(float)
                self._stats[f] = (s.mean(), s.std() or 1.0, col)
        self._city_median_ppsqm = float(self.df["_ppsqm"].median())

    def _distance(self, query):
        """Weighted z-score distance from query to every row (+ sector penalty)."""
        d = np.zeros(len(self.df))
        for f, w in SIM_WEIGHTS.items():
            if f not in self._stats:
                continue
            mean, std, col = self._stats[f]
            qv = query.get(self.size_col if f == "size" else f)
            if qv is None:
                continue
            d += w * ((self.df[col].astype(float) - float(qv)) / std) ** 2
        d = np.sqrt(d)
        # same-sector strongly preferred (location dominates value in Kigali)
        if query.get("sector") is not None and "sector" in self.df.columns:
            d = d + np.where(self.df["sector"] != query["sector"], 2.5, 0.0)
        if query.get("property_type") is not None and "property_type" in self.df.columns:
            d = d + np.where(self.df["property_type"] != query["property_type"], 1.5, 0.0)
        return d

    def find_comparables(self, query, k=5):
        d = self._distance(query)
        idx = np.argsort(d)[:k]
        comps = self.df.iloc[idx].copy()
        dd=d[idx]; comps["_similarity"] = np.round(1.0/(1.0+dd/max(len(SIM_WEIGHTS),1)),3)
        return comps

    def value(self, query, k=5):
        """Return a comps-based valuation with explanation."""
        comps = self.find_comparables(query, k=k)
        ppsqm = comps["_ppsqm"].dropna()
        size = float(query.get(self.size_col) or 0)
        med_ppsqm = float(ppsqm.median()) if len(ppsqm) else self._city_median_ppsqm
        estimate = med_ppsqm * size if size > 0 else float(comps[self.price_col].median())
        lo = float(ppsqm.quantile(0.25)) * size if size > 0 else float(comps[self.price_col].quantile(0.25))
        hi = float(ppsqm.quantile(0.75)) * size if size > 0 else float(comps[self.price_col].quantile(0.75))
        location_premium = round(med_ppsqm / self._city_median_ppsqm, 2) if self._city_median_ppsqm else 1.0
        return {
            "comps_estimate_rwf": round(estimate),
            "price_per_sqm_rwf": round(med_ppsqm),
            "range_rwf": [round(lo), round(hi)],
            "location_premium_vs_city": location_premium,  # 1.0 = city median, >1 pricier
            "n_comparables": int(len(comps)),
            "comparables": comps[[self.price_col, self.size_col, "sector", "_ppsqm", "_similarity"]]
                            .round(0).to_dict("records"),
        }


def load_house_engine():
    df = pd.read_csv(os.path.join(DATA, "houses_kigali_geo.csv"))
    return ComparablesEngine(df, size_col="size_sqft")

def load_land_engine():
    df = pd.read_csv(os.path.join(DATA, "lands_kigali_geo.csv"))
    return ComparablesEngine(df, size_col="land_size")
