# ============================================
# BUILD KIGALI BOUNDARY ARTIFACTS  (Step A / centroids + sector scores)
# ============================================
# Reads HDX/NISR COD-AB shapefiles (in data/) and, for KIGALI CITY only, writes:
#   data/rwa_sectors.geojson    35 sector polygons
#   data/rwa_cells.geojson      Kigali cell polygons
#   data/sector_centroids.json  per-sector centroid + POI counts + 4 scores:
#       sector_density_score   POIs per km^2          (0..100, min-max)
#       accessibility_score    CBD + amenity closeness (0..100, min-max)
#       neighborhood_score     livability composite    (0..100)
#       investment_score       HEURISTIC proxy         (0..100) - see note
#
# NOTE on investment_score: with no historical price/appreciation data yet, this
# is a transparent heuristic = accessibility discounted by current saturation
# (central-but-not-yet-dense sectors score highest). Replace with a real
# appreciation model once time-series transaction data exists.
#
# Run from backend/ :  python ml/geo/prepare_boundaries.py
# ============================================

import os, json, math
import shapefile  # pyshp
from shapely.geometry import shape, Point
from shapely.strtree import STRtree
from geo_engine import GeoEngine, haversine_km, KIGALI_CBD

_THIS = os.path.dirname(os.path.abspath(__file__))
DATA  = os.path.join(_THIS, "data")
ADM3  = os.path.join(DATA, "rwa_adm3_2006_NISR_WGS1984_20181002.shp")
ADM4  = os.path.join(DATA, "rwa_adm4_2006_NISR_WGS1984_20181002.shp")
KIGALI = "Kigali City"
AMENITIES = ["school", "hospital", "bank", "market"]
ESSENTIAL = ["school", "hospital", "bank", "shopping"]


def km_per_degree(lat):
    return (111.320 * math.cos(math.radians(lat)), 110.574)


def load_kigali_level(path, keep_fields):
    sf = shapefile.Reader(path, encoding="utf-8")
    flds = [f[0] for f in sf.fields[1:]]
    out = []
    for sr in sf.iterShapeRecords():
        rec = dict(zip(flds, sr.record))
        if rec.get("ADM1_EN") != KIGALI:
            continue
        geom = shape(sr.shape.__geo_interface__)
        if not geom.is_valid:
            geom = geom.buffer(0)
        out.append((geom, {k: rec.get(k) for k in keep_fields}))
    return out


def write_geojson(feats, path):
    fc = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": p, "geometry": g.__geo_interface__}
        for g, p in feats]}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(fc, f, ensure_ascii=False)


def minmax(values):
    lo, hi = min(values), max(values)
    if hi - lo < 1e-9:
        return [50.0 for _ in values]
    return [100.0 * (v - lo) / (hi - lo) for v in values]


def main():
    sectors = load_kigali_level(ADM3, ["ADM2_EN", "ADM3_EN", "ADM3_PCODE"])
    write_geojson(sectors, os.path.join(DATA, "rwa_sectors.geojson"))
    print(f"[OK] rwa_sectors.geojson  ({len(sectors)} Kigali sectors)")

    cells = load_kigali_level(ADM4, ["ADM2_EN", "ADM3_EN", "ADM4_EN", "ADM4_PCODE"])
    write_geojson(cells, os.path.join(DATA, "rwa_cells.geojson"))
    print(f"[OK] rwa_cells.geojson    ({len(cells)} Kigali cells)")

    # POIs per sector (point-in-polygon)
    eng = GeoEngine(pois_path=os.path.join(DATA, "pois_kigali.json"))
    sgeoms = [g for g, _ in sectors]
    tree = STRtree(sgeoms)
    counts = [dict() for _ in sectors]
    totals = [0] * len(sectors)
    for poi in eng.pois:
        pt = Point(poi["lon"], poi["lat"])
        for i in tree.query(pt):
            i = int(i)
            if sgeoms[i].contains(pt):
                counts[i][poi["type"]] = counts[i].get(poi["type"], 0) + 1
                totals[i] += 1
                break

    # raw per-sector metrics
    rows = []
    for i, (g, p) in enumerate(sectors):
        rp = g.representative_point()
        lat, lon = rp.y, rp.x
        lonkm, latkm = km_per_degree(lat)
        area_km2 = g.area * lonkm * latkm
        cbd = haversine_km(lat, lon, KIGALI_CBD[0], KIGALI_CBD[1])
        nearest = {}
        for t in AMENITIES:
            _, d = eng.nearest(lat, lon, t)
            nearest[t] = round(d, 3) if d is not None else None
        amenity_close = [1.0 / (1.0 + nearest[t]) for t in AMENITIES if nearest[t] is not None]
        amenity_close = sum(amenity_close) / len(amenity_close) if amenity_close else 0.0
        rows.append({
            "district": p["ADM2_EN"], "sector": p["ADM3_EN"], "pcode": p["ADM3_PCODE"],
            "lat": round(lat, 6), "lon": round(lon, 6), "area_km2": round(area_km2, 3),
            "poi_total": totals[i], "poi_counts": counts[i],
            "cbd_distance_km": round(cbd, 3), "nearest_km": nearest,
            "_density_raw": (totals[i] / area_km2) if area_km2 > 0 else 0.0,
            "_access_raw": 0.5 * (1.0 / (1.0 + cbd)) + 0.5 * amenity_close,
            "_essential_raw": sum(counts[i].get(t, 0) for t in ESSENTIAL),
        })

    # normalize 0..100
    dens = minmax([r["_density_raw"] for r in rows])
    accs = minmax([r["_access_raw"] for r in rows])
    essn = minmax([r["_essential_raw"] for r in rows])

    table = {}
    for r, d, a, e in zip(rows, dens, accs, essn):
        # composite scores (documented formulas)
        neighborhood = 0.35 * a + 0.25 * d + 0.40 * e          # livability blend
        investment = a * (0.5 + 0.5 * (100.0 - d) / 100.0)     # access x growth-headroom
        r["sector_density_score"] = round(d, 1)
        r["accessibility_score"] = round(a, 1)
        r["neighborhood_score"] = round(neighborhood, 1)
        r["investment_score"] = round(investment, 1)
        for k in ["_density_raw", "_access_raw", "_essential_raw"]:
            r.pop(k)
        table[r["sector"]] = r

    with open(os.path.join(DATA, "sector_centroids.json"), "w", encoding="utf-8") as f:
        json.dump(table, f, ensure_ascii=False, indent=2)
    print(f"[OK] sector_centroids.json ({len(table)} sectors, 4 scores each)")

    ranked = sorted(table.values(), key=lambda r: r["investment_score"], reverse=True)
    print("\n  sector          district    cbd_km  dens  access  neigh  invest")
    print("  " + "-" * 62)
    for r in ranked[:6] + [None] + ranked[-3:]:
        if r is None:
            print("  ..."); continue
        print(f"  {r['sector'][:14]:14} {r['district'][:9]:9} {r['cbd_distance_km']:6.1f}"
              f" {r['sector_density_score']:5.0f} {r['accessibility_score']:6.0f}"
              f" {r['neighborhood_score']:6.0f} {r['investment_score']:6.0f}")


if __name__ == "__main__":
    main()
