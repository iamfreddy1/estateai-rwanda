# ============================================
# STORAGE  (CSV + PostgreSQL upsert)
# ============================================
import os, csv, json, logging
from datetime import datetime

log = logging.getLogger("storage")
FIELDS = ["source", "source_id", "url", "title", "price", "currency", "type",
          "property_type", "district", "sector", "cell", "village", "address",
          "bedrooms", "bathrooms", "size_sqft", "land_size", "latitude",
          "longitude", "geo_precision", "luxury_score", "risk_score", "scraped_at"]


def save_csv(listings, path):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS, extrasaction="ignore")
        w.writeheader()
        for l in listings:
            w.writerow(l.to_dict())
    log.info("wrote %d listings -> %s", len(listings), path)
    return path


def save_to_db(listings, db, Listing):
    """Upsert listings into PostgreSQL keyed by (source, source_id).
    Insert new, update changed (price/status often change between crawls)."""
    n_new = n_upd = 0
    for l in listings:
        d = l.to_dict() if hasattr(l, "to_dict") else dict(l)
        existing = Listing.query.filter_by(source=d["source"], source_id=d["source_id"]).first()
        payload = dict(
            url=d.get("url"), title=d.get("title"), price=d.get("price"),
            currency=d.get("currency", "RWF"), type=d.get("type"),
            property_type=d.get("property_type"), district=d.get("district"),
            sector=d.get("sector"), cell=d.get("cell"), village=d.get("village"),
            address=d.get("address"), latitude=d.get("latitude"), longitude=d.get("longitude"),
            geo_precision=d.get("geo_precision"), bedrooms=d.get("bedrooms"),
            bathrooms=d.get("bathrooms"), size_sqft=d.get("size_sqft"),
            land_size=d.get("land_size"),
            images_json=json.dumps(d.get("images", [])) if d.get("images") else None,
            description=d.get("description"), luxury_score=d.get("luxury_score"),
            risk_score=d.get("risk_score"),
            scraped_at=_parse_dt(d.get("scraped_at")),
        )
        if existing:
            for k, v in payload.items():
                setattr(existing, k, v)
            n_upd += 1
        else:
            db.session.add(Listing(source=d["source"], source_id=d["source_id"], **payload))
            n_new += 1
    db.session.commit()
    log.info("DB upsert: %d new, %d updated", n_new, n_upd)
    return {"new": n_new, "updated": n_upd}


def _parse_dt(s):
    if not s:
        return None
    try:
        return datetime.fromisoformat(s)
    except (ValueError, TypeError):
        return None
