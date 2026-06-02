# ============================================
# build_features.py - ENRICH DATASETS WITH GEO-FEATURES  (Step 3b)
# ============================================
# Reads houses_kigali.csv / lands_kigali.csv, attaches real geospatial features
# from the GeoEngine, and writes *_geo.csv (originals untouched).
#
# FORWARD-COMPATIBLE BY DESIGN:
#   - If a row has real latitude/longitude -> uses them (true per-property geo).
#   - Else -> falls back to the sector CENTROID ("bridge"); every row in a
#     sector then shares the same geo-features. This is the honest interim until
#     real listings (with coordinates) replace the synthetic data.
#
# Added columns (the 9 features you asked for):
#   cbd_distance_km, nearest_school_km, nearest_hospital_km, nearest_market_km,
#   nearest_bank_km, accessibility_score, sector_density_score,
#   neighborhood_score, investment_score
# Plus bookkeeping: sector_official, geo_source.
# ============================================

import os
import logging
import pandas as pd

from geo.geo_engine import get_engine

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
log = logging.getLogger("build_features")

_THIS = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(_THIS, "..", "data")

# Informal synthetic neighborhood name -> official ADM3 sector.
# (Best-effort; please verify. Real listings will use a geocoder instead.)
SECTOR_ALIASES = {
    "Gacuriro": "Kinyinya",
    "Kibagabaga": "Kimironko",
    "Kicukiro Center": "Kicukiro",
    "Nyarugenge Town": "Nyarugenge",
    "Nyarutarama": "Remera",
}

# engine feature key -> output column name
FEATURE_MAP = {
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
GEO_COLUMNS = list(FEATURE_MAP.values())


def _resolve_coord(row, engine):
    """Return (lat, lon, source). Prefer real GPS; else sector centroid."""
    lat, lon = row.get("latitude"), row.get("longitude")
    try:
        if lat is not None and lon is not None and not pd.isna(lat) and not pd.isna(lon):
            return float(lat), float(lon), "gps"
    except (TypeError, ValueError):
        pass
    raw_sector = str(row.get("sector", "")).strip()
    official = SECTOR_ALIASES.get(raw_sector, raw_sector)
    pt = engine.sector_point(official)
    if pt:
        return pt[0], pt[1], "sector_centroid"
    return None, None, "unresolved"


def enrich(df, engine):
    """Add geo-feature columns to a copy of df. Returns (df_out, stats)."""
    out = df.copy()
    rows_feats, officials, sources = [], [], []
    unresolved = set()
    for _, row in df.iterrows():
        lat, lon, source = _resolve_coord(row, engine)
        raw_sector = str(row.get("sector", "")).strip()
        official = SECTOR_ALIASES.get(raw_sector, raw_sector)
        officials.append(official)
        sources.append(source)
        if lat is None:
            unresolved.add(raw_sector)
            rows_feats.append({c: None for c in GEO_COLUMNS})
            continue
        f = engine.features(lat, lon)
        rows_feats.append({out_col: f.get(eng_key) for eng_key, out_col in FEATURE_MAP.items()})

    feats_df = pd.DataFrame(rows_feats, index=df.index)
    out["sector_official"] = officials
    out["geo_source"] = sources
    for c in GEO_COLUMNS:
        out[c] = feats_df[c]

    stats = {
        "rows": len(df),
        "resolved": int((pd.Series(sources) != "unresolved").sum()),
        "by_source": pd.Series(sources).value_counts().to_dict(),
        "unresolved_sectors": sorted(unresolved),
        "null_geo_rows": int(out[GEO_COLUMNS[0]].isna().sum()),
    }
    return out, stats


def process(filename, engine):
    path = os.path.join(DATA, filename)
    if not os.path.exists(path):
        log.warning("missing %s - skipping", path)
        return
    df = pd.read_csv(path)
    log.info("loaded %s (%d rows, %d cols)", filename, len(df), df.shape[1])
    out, stats = enrich(df, engine)
    out_name = filename.replace(".csv", "_geo.csv")
    out.to_csv(os.path.join(DATA, out_name), index=False)
    log.info("wrote %s (%d cols, +%d geo)", out_name, out.shape[1], len(GEO_COLUMNS) + 2)
    log.info("  coverage: %d/%d resolved | sources=%s",
             stats["resolved"], stats["rows"], stats["by_source"])
    if stats["unresolved_sectors"]:
        log.warning("  UNRESOLVED sectors (no centroid): %s", stats["unresolved_sectors"])
    # quick peek at the geo columns
    sample = out[["sector", "sector_official"] + GEO_COLUMNS].drop_duplicates("sector_official").head(6)
    print(sample.to_string(index=False))
    print()


def main():
    engine = get_engine()
    if engine is None:
        log.error("GeoEngine has no data. Run prepare_pois.py + prepare_boundaries.py first.")
        return
    for fn in ["houses_kigali.csv", "lands_kigali.csv"]:
        process(fn, engine)
    log.info("DONE. Enriched datasets ready for training.")


if __name__ == "__main__":
    main()
