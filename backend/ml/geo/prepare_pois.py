# ============================================
# BUILD pois_kigali.json FROM OPENSTREETMAP  (Step A, one-time)
# ============================================
# Reads the Geofabrik OSM "free" POI shapefiles for Rwanda and extracts the
# amenities that matter for property valuation, inside the Kigali area, into a
# compact JSON the GeoEngine loads at runtime:  data/pois_kigali.json
#
# Categories extracted: school, hospital, bank, market, restaurant, shopping.
#
# INPUT FILES (place in backend/ml/geo/osm/):
#   gis_osm_pois_free_1.shp   (+ .dbf .shx)   - point POIs
#   gis_osm_pois_a_free_1.shp (+ .dbf .shx)   - polygon POIs (we use centroids)
#
# RUN (from backend/):  python ml/geo/prepare_pois.py
# Deps: pip install shapely pyshp   (no GDAL needed)
# ============================================

import os
import json
import shapefile  # pyshp
from shapely.geometry import shape as shp_shape

_THIS = os.path.dirname(os.path.abspath(__file__))
OSM_DIR  = os.path.join(_THIS, "osm")
OUT_PATH = os.path.join(_THIS, "data", "pois_kigali.json")

# Kigali bounding box (generous) - keeps the file small + relevant.
KIGALI_BBOX = {"lat_min": -2.10, "lat_max": -1.85, "lon_min": 29.95, "lon_max": 30.25}

# OSM fclass -> our simplified POI type (tuned to what Kigali OSM actually has)
FCLASS_MAP = {
    # education
    "school": "school", "college": "school", "university": "school", "kindergarten": "school",
    # health
    "hospital": "hospital", "clinic": "hospital", "doctors": "hospital",
    # finance
    "bank": "bank", "atm": "bank",
    # traditional markets
    "marketplace": "market",
    # food
    "restaurant": "restaurant", "cafe": "restaurant", "fast_food": "restaurant",
    # shopping centres
    "mall": "shopping", "supermarket": "shopping", "department_store": "shopping",
}

SHP_FILES = ["gis_osm_pois_free_1.shp", "gis_osm_pois_a_free_1.shp"]


def _in_kigali(lat, lon):
    b = KIGALI_BBOX
    return b["lat_min"] <= lat <= b["lat_max"] and b["lon_min"] <= lon <= b["lon_max"]


def _centroid(geo):
    g = shp_shape(geo).centroid
    return (g.y, g.x)  # shapely is (x=lon, y=lat)


def main():
    pois = []
    seen = set()  # de-dupe identical (type, rounded-coord, name)
    for fname in SHP_FILES:
        path = os.path.join(OSM_DIR, fname)
        if not os.path.exists(path):
            print(f"[skip] {path} not found")
            continue
        print(f"[read] {fname}")
        sf = shapefile.Reader(path, encoding="utf-8")
        fields = [f[0] for f in sf.fields[1:]]
        for sr in sf.iterShapeRecords():
            rec = dict(zip(fields, sr.record))
            fclass = (rec.get("fclass") or "").lower()
            ptype = FCLASS_MAP.get(fclass)
            if not ptype:
                continue
            try:
                lat, lon = _centroid(sr.shape.__geo_interface__)
            except Exception:
                continue
            if not _in_kigali(lat, lon):
                continue
            name = rec.get("name") or fclass.title()
            key = (ptype, round(lat, 5), round(lon, 5), name)
            if key in seen:
                continue
            seen.add(key)
            pois.append({
                "type": ptype, "name": name,
                "lat": round(lat, 6), "lon": round(lon, 6),
                "osm_fclass": fclass,
            })

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(pois, f, ensure_ascii=False)

    by_type = {}
    for p in pois:
        by_type[p["type"]] = by_type.get(p["type"], 0) + 1
    print(f"\n[OK] wrote {len(pois)} POIs -> {OUT_PATH}")
    print(f"     breakdown: {dict(sorted(by_type.items()))}")
    if not pois:
        print("     (0 POIs - are the .shp files in backend/ml/geo/osm/ ?)")


if __name__ == "__main__":
    main()
