# ============================================
# EstateAI Rwanda - FULL SYSTEM TEST SUITE (offline-runnable core)
# ============================================
import time, sys, joblib, numpy as np, pandas as pd
PASS=[]; FAIL=[]
def ok(name,cond,extra=""):
    (PASS if cond else FAIL).append(name)
    print(f"  [{'PASS' if cond else 'FAIL'}] {name} {extra}")

print("== GEO ENGINE ==")
from ml.geo import get_engine
eng=get_engine()
ok("polygons loaded", len(eng._geoms)==35, f"({len(eng._geoms)})")
ok("pois loaded", len(eng.pois)==780, f"({len(eng.pois)})")
f=eng.features(-1.9536,30.0606)
ok("locate returns sector", f["sector"] is not None, f"-> {f['sector']}")
ok("cbd distance sane", 0<=f["cbd_distance_km"]<30)
ok("all 4 scores present", all(f.get(s) is not None for s in
   ["sector_density_score","accessibility_score","neighborhood_score","investment_score"]))
# speed
t=time.time(); [eng.features(-1.95+0.001*i,30.06) for i in range(200)]; dt=(time.time()-t)/200*1000
ok("features() < 15ms", dt<15, f"({dt:.2f}ms/call)")
# determinism
ok("deterministic", eng.features(-1.95,30.06)==eng.features(-1.95,30.06))
# invalid coord
ok("out-of-Kigali -> None sector", eng.features(-2.5,31.0)["sector"] is None)

print("== GEOCODER ==")
from ml.geo.geocoder import get_geocoder
g=get_geocoder()
ok("cell precision", g.geocode(sector="Kimironko",cell="Bibare")["precision"]=="cell")
ok("sector fallback", g.geocode(sector="Kacyiru")["precision"]=="sector")
ok("alias resolves", g.geocode(sector="Nyarutarama") is not None)
ok("unknown -> None", g.geocode(sector="Atlantis") is None)

print("== COMPARABLES ==")
from ml.comparables import load_house_engine
ce=load_house_engine()
q={"sector":"Kacyiru","property_type":"villa","size_sqft":3000,"bedrooms":5,"bathrooms":4,
   "cbd_distance_km":1,"accessibility_score":85,"neighborhood_score":80}
v=ce.value(q)
ok("comps estimate positive", v["comps_estimate_rwf"]>0, f"({v['comps_estimate_rwf']:,})")
ok("location premium computed", v["location_premium_vs_city"]>0)
ok("returns comps list", len(v["comparables"])>0)

print("== FRAUD ==")
from ml.fraud import FraudDetector
fd=FraudDetector(geo_engine=eng,sector_ppsqm={"Kacyiru":80000})
ok("good listing low risk", fd.check({"price":240e6,"sector":"Kacyiru","property_type":"villa","size_sqft":3000,"bedrooms":5})["level"]=="low")
ok("bad listing high risk", fd.check({"price":9e11,"sector":"Kacyiru","property_type":"villa","size_sqft":10,"bedrooms":99})["level"]=="high")
ok("dedupe works", len(FraudDetector.dedupe([{"title":"X","price":1},{"title":"X","price":1}]))==1)

print("== NLP / RENTAL ==")
from ml.nlp import analyze
from ml.rental import estimate_rent
ok("luxury detected", analyze("luxury villa with pool and gated security")["luxury_score"]>0)
ok("scam detected", analyze("urgent cash only send money western union")["fraud_text_risk"]>0)
ok("rent estimate positive", estimate_rent(185e6,85)["monthly_rent_rwf"]>0)

print("== MODEL INFERENCE (saved bundles) ==")
for name,pk in [("house","ml/house_model.pkl"),("land","ml/land_model.pkl")]:
    b=joblib.load(pk)
    ok(f"{name} bundle has model", "model" in b and "feature_columns" in b)
    ok(f"{name} log_target flagged", b.get("log_target")==True)
print("== FULL INGESTION PIPELINE ==")
from ingestion.pipeline import build_normalizer
norm=build_normalizer()
raw=[{"source":"t","source_id":"1","title":"Luxury villa pool","description":"4 bedrooms gated security generator",
      "price":"185000000","type":"buy","property_type":"villa","district":"Gasabo","sector":"Kimironko","cell":"Bibare"}]
clean=norm.process(raw)
ok("pipeline produces clean listing", len(clean)==1)
ok("listing geocoded", clean[0].latitude is not None, f"({clean[0].geo_precision})")
ok("listing nlp-scored", clean[0].luxury_score is not None)

print(f"\n==== RESULT: {len(PASS)} passed, {len(FAIL)} failed ====")
if FAIL: print("FAILURES:", FAIL); sys.exit(1)
