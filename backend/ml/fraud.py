# ============================================
# FRAUD / ANOMALY DETECTION  (rule-based, real today)
# ============================================
# Catches the fraud signals you CAN detect without training data:
#   - unrealistic prices (vs sector comparables)
#   - impossible / suspicious coordinates (outside Kigali or not in any sector)
#   - duplicate listings (same content reposted)
#   - impossible attributes (0 size, 50 bedrooms, negative price)
#   - missing critical fields
# Image-manipulation + ML-based fraud need labelled data -> see fraud_ml stub.
#
# Returns {risk_score 0-100, level, flags[]}. Plug into the ingestion pipeline
# so bad listings are quarantined before they pollute the model.
# ============================================

import logging
from difflib import SequenceMatcher

log = logging.getLogger("fraud")

KIGALI_BBOX = {"lat": (-2.10, -1.85), "lon": (29.95, 30.25)}
REQUIRED = ["price", "sector", "property_type"]


def _ppsqm(price, size):
    try:
        return float(price) / float(size) if size and float(size) > 0 else None
    except (TypeError, ValueError):
        return None


class FraudDetector:
    def __init__(self, geo_engine=None, sector_ppsqm=None):
        """geo_engine: for coordinate validity. sector_ppsqm: {sector: median ppsqm}."""
        self.geo = geo_engine
        self.sector_ppsqm = sector_ppsqm or {}

    def check(self, listing, size_key="size_sqft"):
        flags = []
        # 1. missing critical fields
        for f in REQUIRED:
            if not listing.get(f):
                flags.append(("missing_field", f"missing {f}", 15))

        # 2. impossible attribute values
        price = listing.get("price")
        if price is not None and float(price) <= 0:
            flags.append(("bad_value", "non-positive price", 30))
        size = listing.get(size_key) or listing.get("land_size")
        if size is not None and float(size) <= 0:
            flags.append(("bad_value", "non-positive size", 20))
        beds = listing.get("bedrooms")
        if beds is not None and (float(beds) < 0 or float(beds) > 20):
            flags.append(("bad_value", f"implausible bedrooms={beds}", 15))
        # absolute backstops (independent of sector reference)
        if price is not None and float(price) > 50_000_000_000:   # > 50B RWF
            flags.append(("price_anomaly", "price exceeds realistic ceiling", 35))
        if size is not None and 0 < float(size) < 100 and listing.get("property_type") != "land":
            flags.append(("bad_value", f"implausibly small building ({size} sqft)", 20))
        ppsqm_abs = _ppsqm(price, size)
        if ppsqm_abs is not None and ppsqm_abs > 3_000_000:        # >3M RWF/sqft is absurd
            flags.append(("price_anomaly", "price-per-sqm far above any Kigali norm", 30))

        # 3. price sanity vs sector comparables
        ppsqm = _ppsqm(price, size)
        sector = listing.get("sector")
        ref = self.sector_ppsqm.get(sector)
        if ppsqm and ref:
            ratio = ppsqm / ref
            if ratio > 3.0:
                flags.append(("price_anomaly", f"{ratio:.1f}x above sector norm", 25))
            elif ratio < 0.33:
                flags.append(("price_anomaly", f"{ratio:.1f}x below sector norm", 25))

        # 4. coordinate sanity
        lat, lon = listing.get("latitude"), listing.get("longitude")
        if lat is not None and lon is not None:
            try:
                lat, lon = float(lat), float(lon)
                b = KIGALI_BBOX
                if not (b["lat"][0] <= lat <= b["lat"][1] and b["lon"][0] <= lon <= b["lon"][1]):
                    flags.append(("geo_anomaly", "coordinates outside Kigali", 30))
                elif self.geo is not None:
                    loc = self.geo.locate(lat, lon)
                    if loc.get("sector") is None:
                        flags.append(("geo_anomaly", "coordinates not within any sector", 20))
                    elif sector and loc["sector"].lower() != str(sector).lower():
                        flags.append(("geo_mismatch",
                                      f"coords are in {loc['sector']}, listing says {sector}", 10))
            except (TypeError, ValueError):
                flags.append(("geo_anomaly", "unparseable coordinates", 15))

        score = min(100, sum(w for _, _, w in flags))
        level = "high" if score >= 50 else "medium" if score >= 20 else "low"
        return {"risk_score": score, "level": level,
                "flags": [{"type": t, "detail": d, "weight": w} for t, d, w in flags]}

    @staticmethod
    def is_duplicate(a, b, coord_km=0.15):
        """Heuristic duplicate test between two listings."""
        title_sim = SequenceMatcher(None, str(a.get("title", "")).lower(),
                                    str(b.get("title", "")).lower()).ratio()
        same_price = a.get("price") and a.get("price") == b.get("price")
        if title_sim > 0.9 and same_price:
            return True
        # near-identical coordinates + same price
        try:
            from ml.geo.geo_engine import haversine_km
            if a.get("latitude") and b.get("latitude") and same_price:
                if haversine_km(float(a["latitude"]), float(a["longitude"]),
                                float(b["latitude"]), float(b["longitude"])) < coord_km:
                    return True
        except Exception:
            pass
        return False

    @staticmethod
    def dedupe(listings):
        """Remove duplicates from a list of listing dicts; keep first seen."""
        kept = []
        for lst in listings:
            if not any(FraudDetector.is_duplicate(lst, k) for k in kept):
                kept.append(lst)
        return kept
