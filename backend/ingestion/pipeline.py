# ============================================
# INGESTION PIPELINE  (orchestrator)
# ============================================
# collect (per source) -> normalize -> geocode -> fraud-filter -> dedupe -> store
# Run:  python -m ingestion.pipeline
import logging
from .normalizer import Normalizer

log = logging.getLogger("pipeline")
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")


def build_normalizer():
    """Wire the geocoder + fraud detector into the normalizer (offline-capable)."""
    geocoder = fraud = None
    try:
        from ml.geo.geocoder import get_geocoder
        from ml.geo import get_engine
        from ml.fraud import FraudDetector
        geocoder = get_geocoder()
        sector_ppsqm = _sector_ppsqm_reference()
        fraud = FraudDetector(geo_engine=get_engine(), sector_ppsqm=sector_ppsqm)
    except Exception as e:
        log.warning("running without geo/fraud (%s)", e)
    return Normalizer(geocoder=geocoder, fraud=fraud)




def _sector_ppsqm_reference():
    """Median price-per-sqft per sector from the current dataset (real comps)."""
    try:
        import os, pandas as pd
        p = os.path.join(os.path.dirname(__file__), "..", "data", "houses_kigali_geo.csv")
        df = pd.read_csv(p)
        df["_pp"] = df["price_rwf"] / df["size_sqft"].replace(0, None)
        return df.groupby("sector")["_pp"].median().dropna().to_dict()
    except Exception:
        return {}

def run(sources, limit=None, out_csv=None):
    raws = []
    for scraper in sources:
        log.info("collecting from %s", scraper.source)
        raws.extend(scraper.run(limit=limit))
    clean = build_normalizer().process(raws)
    if out_csv:
        from .storage import save_csv
        save_csv(clean, out_csv)
    return clean


if __name__ == "__main__":
    # Scrapers are scaffolds; enable real ones after the ToS/robots decision.
    log.info("No live sources enabled. Implement sources/* then add them here.")
