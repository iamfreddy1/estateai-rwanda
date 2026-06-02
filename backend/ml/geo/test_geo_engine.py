import os, json, tempfile
from geo_engine import GeoEngine, haversine_km, KIGALI_CBD

def _square(lon0, lon1, lat0, lat1):
    return {"type": "Polygon", "coordinates": [[
        [lon0, lat0], [lon1, lat0], [lon1, lat1], [lon0, lat1], [lon0, lat0]]]}

BOUNDARIES = {"type": "FeatureCollection", "features": [
    {"type": "Feature",
     "properties": {"ADM2_EN": "Gasabo", "ADM3_EN": "Kacyiru"},
     "geometry": _square(30.08, 30.10, -1.96, -1.94)},
    {"type": "Feature",
     "properties": {"ADM2_EN": "Nyarugenge", "ADM3_EN": "Nyamirambo"},
     "geometry": _square(30.03, 30.05, -1.99, -1.97)},
]}
POIS = [
    {"type": "school",   "name": "Test School",   "lat": -1.945, "lon": 30.085},
    {"type": "hospital", "name": "Test Hospital", "lat": -1.950, "lon": 30.060},
    {"type": "market",   "name": "Test Market",   "lat": -1.980, "lon": 30.040},
]

def main():
    d = tempfile.mkdtemp()
    bp = os.path.join(d, "b.geojson"); pp = os.path.join(d, "p.json")
    json.dump(BOUNDARIES, open(bp, "w")); json.dump(POIS, open(pp, "w"))
    eng = GeoEngine(bp, pp)

    # 1. haversine sanity: ~1 deg latitude ~= 111 km
    assert abs(haversine_km(0, 0, 1, 0) - 111.19) < 1, "haversine off"

    # 2. point inside Kacyiru/Gasabo
    f = eng.features(-1.95, 30.09)
    print("Point A (-1.95, 30.09):", f)
    assert f["sector"] == "Kacyiru" and f["district"] == "Gasabo", f
    assert f["dist_school_km"] < 1.0, "school should be ~close"

    # 3. point inside Nyamirambo/Nyarugenge
    f2 = eng.features(-1.98, 30.04)
    print("Point B (-1.98, 30.04):", f2)
    assert f2["sector"] == "Nyamirambo", f2
    assert f2["dist_market_km"] < 0.5, "market should be ~close"

    # 4. point OUTSIDE all sectors -> None, but CBD distance still works
    f3 = eng.features(-2.20, 30.50)
    print("Point C (outside):", f3)
    assert f3["sector"] is None and f3["cbd_distance_km"] > 0

    # 5. CBD distance ~0 at the CBD itself
    f4 = eng.features(KIGALI_CBD[0], KIGALI_CBD[1])
    assert f4["cbd_distance_km"] < 0.01, f4

    print("\nALL GEO ENGINE TESTS PASSED")

if __name__ == "__main__":
    main()
