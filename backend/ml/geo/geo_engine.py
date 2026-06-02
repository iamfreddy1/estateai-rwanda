# ============================================
# EstateAI Rwanda - GEOSPATIAL ENGINE  (Step A)
# ============================================
# Turns a (latitude, longitude) into REAL valuation features:
#   - district / sector / cell  (point-in-polygon, from HDX/NISR boundaries)
#   - cbd_distance_km
#   - dist_<school|hospital|bank|market|restaurant|shopping>_km  (from OSM POIs)
#   - sector_density_score, accessibility_score  (precomputed per sector)
#
# Design: shapely + plain json ONLY (no geopandas/GDAL - Windows-friendly).
# Every data source is OPTIONAL; whatever is present, the engine uses.
# ============================================

import os
import json
import math

from shapely.geometry import shape, Point
from shapely.strtree import STRtree

KIGALI_CBD = (-1.9499, 30.0589)  # (lat, lon) - downtown Nyarugenge
DEFAULT_POI_TYPES = ("school", "hospital", "bank", "market", "restaurant", "shopping")

# Informal neighborhood name -> official ADM3 sector (shared by training + API).
SECTOR_ALIASES = {
    "Gacuriro": "Kinyinya", "Kibagabaga": "Kimironko", "Kicukiro Center": "Kicukiro",
    "Nyarugenge Town": "Nyarugenge", "Nyarutarama": "Remera",
}

_DISTRICT_FIELDS = ["ADM2_EN", "district", "District", "NAME_2", "adm2_name"]
_SECTOR_FIELDS   = ["ADM3_EN", "sector", "Sector", "NAME_3", "adm3_name", "shapeName"]
_CELL_FIELDS     = ["ADM4_EN", "cell", "Cell", "NAME_4", "adm4_name"]

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_DATA_DIR = os.path.join(_THIS_DIR, "data")


def haversine_km(lat1, lon1, lat2, lon2):
    """Great-circle distance between two lat/lon points, in kilometres."""
    R = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _first_present(props, candidates):
    for key in candidates:
        if key in props and props[key] not in (None, ""):
            return props[key]
    return None


class GeoEngine:
    """
    Load once, query many times.

        eng = GeoEngine("data/rwa_sectors.geojson", "data/pois_kigali.json",
                        "data/sector_centroids.json")
        eng.features(-1.9536, 30.0606)
    """

    def __init__(self, boundaries_path=None, pois_path=None, stats_path=None,
                 cbd=KIGALI_CBD):
        self.cbd = cbd
        self._geoms, self._meta, self._tree = [], [], None
        if boundaries_path:
            self._load_boundaries(boundaries_path)
        self.pois = self._load_json(pois_path) or []
        self._pois_by_type = {}
        for p in self.pois:
            self._pois_by_type.setdefault(p.get("type"), []).append(p)
        # per-sector precomputed stats {sector_name: {...}}
        self.sector_stats = self._load_json(stats_path) or {}

    # ---------- io ----------
    def _load_json(self, path):
        if not path or not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _load_boundaries(self, path):
        gj = self._load_json(path)
        if not gj:
            return
        feats = gj["features"] if isinstance(gj, dict) and "features" in gj else gj
        for feat in feats:
            geom = shape(feat["geometry"])
            if not geom.is_valid:
                geom = geom.buffer(0)
            self._geoms.append(geom)
            self._meta.append(feat.get("properties", {}) or {})
        self._tree = STRtree(self._geoms) if self._geoms else None

    # ---------- location ----------
    def locate(self, lat, lon):
        """Return {'district','sector','cell'}; all None if no boundaries loaded."""
        result = {"district": None, "sector": None, "cell": None}
        if self._tree is None:
            return result
        pt = Point(lon, lat)
        try:
            candidate_idx = self._tree.query(pt)
        except Exception:
            candidate_idx = range(len(self._geoms))
        for i in candidate_idx:
            i = int(i)
            if self._geoms[i].contains(pt):
                props = self._meta[i]
                result["district"] = _first_present(props, _DISTRICT_FIELDS)
                result["sector"] = _first_present(props, _SECTOR_FIELDS)
                result["cell"] = _first_present(props, _CELL_FIELDS)
                return result
        return result

    def sector_point(self, sector_name):
        """Return (lat, lon) centroid for a sector name (for the 'bridge' option)."""
        official = SECTOR_ALIASES.get(sector_name, sector_name)
        st = self.sector_stats.get(official)
        return (st["lat"], st["lon"]) if st else None

    # ---------- POIs ----------
    def nearest(self, lat, lon, poi_type=None):
        pool = self._pois_by_type.get(poi_type, []) if poi_type else self.pois
        best, best_d = None, float("inf")
        for p in pool:
            d = haversine_km(lat, lon, p["lat"], p["lon"])
            if d < best_d:
                best, best_d = p, d
        return best, (best_d if best is not None else None)

    # ---------- headline ----------
    def features(self, lat, lon, poi_types=DEFAULT_POI_TYPES):
        """Full geospatial feature dict for one coordinate - feed this to the model."""
        loc = self.locate(lat, lon)
        feats = {
            "district": loc["district"],
            "sector": loc["sector"],
            "cell": loc["cell"],
            "cbd_distance_km": round(haversine_km(lat, lon, self.cbd[0], self.cbd[1]), 3),
        }
        for t in poi_types:
            _, d = self.nearest(lat, lon, t)
            feats[f"dist_{t}_km"] = round(d, 3) if d is not None else None
        # sector-level scores (precomputed)
        st = self.sector_stats.get(loc["sector"]) if loc["sector"] else None
        for score in ("sector_density_score", "accessibility_score",
                      "neighborhood_score", "investment_score"):
            feats[score] = st[score] if st else None
        return feats


# ---------- lazy singleton for the Flask app ----------
_ENGINE = None

def get_engine(boundaries_filename="rwa_sectors.geojson",
               pois_filename="pois_kigali.json",
               stats_filename="sector_centroids.json"):
    """Load once from backend/ml/geo/data/. Uses whatever files are present."""
    global _ENGINE
    if _ENGINE is not None:
        return _ENGINE

    def _p(name):
        path = os.path.join(_DATA_DIR, name)
        return path if os.path.exists(path) else None

    bpath, ppath, spath = _p(boundaries_filename), _p(pois_filename), _p(stats_filename)
    if not any([bpath, ppath, spath]):
        print(f"[geo_engine] no data in {_DATA_DIR} - run prepare_pois.py / prepare_boundaries.py")
        return None
    _ENGINE = GeoEngine(boundaries_path=bpath, pois_path=ppath, stats_path=spath)
    print(f"[geo_engine] loaded {len(_ENGINE._geoms)} polygons, "
          f"{len(_ENGINE.pois)} POIs, {len(_ENGINE.sector_stats)} sector stats.")
    return _ENGINE
