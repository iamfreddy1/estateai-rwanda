# ============================================
# NORMALIZER  (raw dict -> validated Listing)
# ============================================
# Maps a source's raw payload to the unified Listing, geocodes it (offline-first),
# scores fraud risk, and de-duplicates. This is the quality gate between messy
# scraped data and the clean dataset the model trains on.
import logging
from .schema import Listing
try:
    from ml.nlp import analyze as _nlp_analyze
except Exception:
    _nlp_analyze = None

log = logging.getLogger("normalizer")

def _num(v):
    if v is None: return None
    try:
        return float(str(v).replace(",", "").replace("RWF", "").strip())
    except (ValueError, TypeError):
        return None

class Normalizer:
    def __init__(self, geocoder=None, fraud=None):
        self.geocoder = geocoder
        self.fraud = fraud

    def normalize_one(self, raw):
        lst = Listing(
            source=raw.get("source", "unknown"),
            source_id=str(raw.get("source_id") or raw.get("url") or raw.get("title") or ""),
            url=raw.get("url"), title=raw.get("title"),
            price=_num(raw.get("price")), currency=raw.get("currency", "RWF"),
            type=raw.get("type"), property_type=raw.get("property_type"),
            district=raw.get("district"), sector=raw.get("sector"),
            cell=raw.get("cell"), village=raw.get("village"), address=raw.get("address"),
            bedrooms=_num(raw.get("bedrooms")), bathrooms=_num(raw.get("bathrooms")),
            size_sqft=_num(raw.get("size_sqft")), land_size=_num(raw.get("land_size")),
            images=raw.get("images", []), description=raw.get("description"),
            raw=raw,
        )
        # geocode (offline cell/sector -> coords)
        if self.geocoder and (lst.sector or lst.address):
            g = self.geocoder.geocode(district=lst.district, sector=lst.sector,
                                      cell=lst.cell, village=lst.village, address=lst.address)
            if g:
                lst.latitude, lst.longitude, lst.geo_precision = g["lat"], g["lon"], g["precision"]
        # NLP: luxury score, amenities, text-based fraud signal
        text_risk = 0
        if _nlp_analyze:
            n = _nlp_analyze(lst.description, lst.title)
            lst.luxury_score = n["luxury_score"]
            lst.amenities = n["amenities"]
            text_risk = n["fraud_text_risk"]
        # fraud score (structural + textual)
        if self.fraud:
            base = self.fraud.check(lst.to_dict()).get("risk_score", 0)
            lst.risk_score = min(100, base + text_risk // 2)
        elif text_risk:
            lst.risk_score = text_risk // 2
        return lst

    def process(self, raws, max_risk=50):
        listings = [self.normalize_one(r) for r in raws]
        # drop high-risk + duplicates
        clean = [l for l in listings if (l.risk_score or 0) < max_risk]
        if self.fraud:
            dicts = self.fraud.dedupe([l.to_dict() for l in clean])
            seen = {d["source_id"] for d in dicts}
            clean = [l for l in clean if l.source_id in seen]
        log.info("normalized %d raw -> %d clean (dropped %d)",
                 len(raws), len(clean), len(raws) - len(clean))
        return clean
