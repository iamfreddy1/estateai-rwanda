# ============================================
# RWANDA GEOCODER  (admin text -> coordinates)
# ============================================
# Converts {district, sector, cell, village, address} into (lat, lon).
#
# Strategy (cheapest + most reliable first - this matters for Rwanda where
# street addresses are sparse but the administrative hierarchy is well-mapped):
#   1. CELL centroid   - if a valid (sector, cell) is given (most precise offline)
#   2. SECTOR centroid - if only the sector is known (the current "bridge")
#   3. ONLINE Nominatim (OpenStreetMap) - for free-text addresses (optional)
#   4. Google Places   - paid fallback (architecture only; needs API key)
#
# Offline tiers (1-2) use YOUR HDX polygons, so they work with no network and
# no API cost - ideal for batch-geocoding thousands of scraped listings.
# Online tiers are wrapped in try/except and disabled by default.
# ============================================

import os
import json
import time
import logging
from shapely.geometry import shape

from .geo_engine import SECTOR_ALIASES, _DATA_DIR

log = logging.getLogger("geocoder")

_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


def _norm(s):
    return (s or "").strip().lower()


class RwandaGeocoder:
    """Offline-first geocoder built on the HDX cell/sector polygons."""

    def __init__(self, cells_path=None, sector_stats_path=None,
                 online=False, user_agent="EstateAI-Rwanda/1.0",
                 google_api_key=None):
        cells_path = cells_path or os.path.join(_DATA_DIR, "rwa_cells.geojson")
        sector_stats_path = sector_stats_path or os.path.join(_DATA_DIR, "sector_centroids.json")
        self.online = online
        self.user_agent = user_agent
        self.google_api_key = google_api_key or os.environ.get("GOOGLE_PLACES_KEY")
        self._cell_index = {}        # (sector_lower, cell_lower) -> (lat, lon)
        self._sector_centroid = {}   # sector_lower -> (lat, lon)
        self._cache = {}             # query -> result (in-memory)
        self._load(cells_path, sector_stats_path)

    def _load(self, cells_path, sector_stats_path):
        if os.path.exists(cells_path):
            gj = json.load(open(cells_path, encoding="utf-8"))
            for feat in gj["features"]:
                p = feat["properties"]
                pt = shape(feat["geometry"]).representative_point()
                self._cell_index[(_norm(p.get("ADM3_EN")), _norm(p.get("ADM4_EN")))] = (pt.y, pt.x)
        if os.path.exists(sector_stats_path):
            stats = json.load(open(sector_stats_path, encoding="utf-8"))
            for sec, r in stats.items():
                self._sector_centroid[_norm(sec)] = (r["lat"], r["lon"])

    # ---------------- public API ----------------
    def geocode(self, district=None, sector=None, cell=None, village=None, address=None):
        """Return {lat, lon, precision, method} or None.
        precision: 'cell' > 'sector' > 'address' (online) > None."""
        key = _norm("|".join(str(x) for x in (district, sector, cell, village, address)))
        if key in self._cache:
            return self._cache[key]

        result = None
        sector_official = SECTOR_ALIASES.get((sector or "").strip(), sector)

        # 1. cell centroid
        if sector_official and cell:
            pt = self._cell_index.get((_norm(sector_official), _norm(cell)))
            if pt:
                result = {"lat": pt[0], "lon": pt[1], "precision": "cell", "method": "hdx_cell"}

        # 2. sector centroid
        if result is None and sector_official:
            pt = self._sector_centroid.get(_norm(sector_official))
            if pt:
                result = {"lat": pt[0], "lon": pt[1], "precision": "sector", "method": "hdx_sector"}

        # 3. online free-text (optional)
        if result is None and self.online and (address or village):
            result = self._nominatim(address, village, sector_official, district)

        # 4. Google fallback (architecture only)
        if result is None and self.google_api_key and (address or village):
            result = self._google(address, village, sector_official, district)

        self._cache[key] = result
        return result

    def geocode_batch(self, records):
        """records: list of dicts with district/sector/cell/... -> list of results."""
        return [self.geocode(**{k: r.get(k) for k in
                ("district", "sector", "cell", "village", "address")}) for r in records]

    # ---------------- online tiers (wrapped; off by default) ----------------
    def _nominatim(self, address, village, sector, district):
        try:
            import requests  # imported lazily; only needed when online=True
            q = ", ".join(x for x in (address, village, sector, district, "Kigali", "Rwanda") if x)
            time.sleep(1.0)  # Nominatim usage policy: max 1 req/sec
            resp = requests.get(_NOMINATIM_URL,
                                params={"q": q, "format": "json", "limit": 1, "countrycodes": "rw"},
                                headers={"User-Agent": self.user_agent}, timeout=10)
            data = resp.json()
            if data:
                return {"lat": float(data[0]["lat"]), "lon": float(data[0]["lon"]),
                        "precision": "address", "method": "nominatim"}
        except Exception as e:
            log.warning("nominatim failed: %s", e)
        return None

    def _google(self, address, village, sector, district):
        """Google Places/Geocoding fallback. Needs GOOGLE_PLACES_KEY. Stubbed safe."""
        try:
            import requests
            q = ", ".join(x for x in (address, village, sector, district, "Kigali", "Rwanda") if x)
            resp = requests.get("https://maps.googleapis.com/maps/api/geocode/json",
                                params={"address": q, "key": self.google_api_key,
                                        "region": "rw"}, timeout=10)
            data = resp.json()
            if data.get("results"):
                loc = data["results"][0]["geometry"]["location"]
                return {"lat": loc["lat"], "lon": loc["lng"],
                        "precision": "address", "method": "google"}
        except Exception as e:
            log.warning("google geocode failed: %s", e)
        return None


_GEOCODER = None
def get_geocoder(**kw):
    global _GEOCODER
    if _GEOCODER is None:
        _GEOCODER = RwandaGeocoder(**kw)
        log.info("geocoder loaded: %d cells, %d sectors",
                 len(_GEOCODER._cell_index), len(_GEOCODER._sector_centroid))
    return _GEOCODER
