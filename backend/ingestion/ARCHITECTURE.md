# EstateAI Rwanda — Listing Ingestion Architecture

The ingestion layer turns messy public listings into a clean, geocoded, fraud-screened market corpus that feeds the valuation model. Every source is reduced to one unified `Listing` shape, so adding a site never changes anything downstream.

## Scraper architecture overview

Sources are **pluggable**. Each subclasses `BaseScraper` and implements just two things: `list_urls()` (how to paginate and find detail-page links) and `parse(html, url)` (extract a raw dict). Everything else — politeness, retries, robots.txt, parsing strategy — is shared.

- `BaseScraper` (`base.py`): robots.txt compliance, rate limiting, retries with exponential backoff, lazy `requests` import (so the web app never loads network libs at runtime).
- `parse_utils.py`: the resilient extractor. Tries **JSON-LD (schema.org)** first (most Rwandan agency sites embed it), then **OpenGraph meta tags**, then **heuristic regex** (price, bedrooms, size). Self-healing against HTML changes.
- Concrete sources: `HouseInRwandaScraper`, `QuickHomesScraper`, and `GenericAgencyScraper` (config-driven — onboard a new agency with a dict, no new code).

## Ingestion flow diagram

```
  ┌────────────┐   ┌────────────┐   ┌──────────────┐
  │ HouseInRw. │   │ QuickHomes │   │ Agency (cfg) │   ... future: FB, APIs, public data
  └─────┬──────┘   └─────┬──────┘   └──────┬───────┘
        │  list_urls() + fetch() (robots + rate-limit + retry)
        └──────────────┬─────────────────┘
                       ▼
              parse_utils.extract_all()        raw dict {title, price, beds, ...}
                       ▼
        ┌──────────────────────────────────────────────┐
        │            Normalizer.process()                │
        │  1. map raw → unified Listing                  │
        │  2. geocode  (cell → sector centroid offline)  │
        │  3. NLP      (luxury score, amenities, fraud)  │
        │  4. fraud    (price/coord/duplicate checks)    │
        │  5. drop risk ≥ 50  +  dedupe                  │
        └──────────────────────┬─────────────────────────┘
                               ▼
              storage.save_csv()  /  save_to_db()  (upsert by source+source_id)
                               ▼
                    PostgreSQL `listings` table
                               ▼
              build_features → train_pipeline → valuation API
```

## Database schema recommendations

`listings` table (model added to `models/database.py`):

- **Uniqueness:** `UniqueConstraint(source, source_id)` — re-crawls upsert instead of duplicating.
- **Indexes:** `(latitude, longitude)`, `(type, sector)`, plus `district`/`sector` — the columns every query filters on.
- **PostGIS-ready:** lat/lon are floats now. To scale geo queries, add a `geometry(Point, 4326)` column + GIST index later; application code is unaffected.
- **Separate from `Property`:** `listings` is the market-intelligence corpus (external data); `properties` stays user-generated. Keeping them apart avoids polluting user content with scraped data.
- **Lifecycle:** `status` (new → validated → rejected) lets you quarantine suspicious listings without deleting them.

## Anti-ban / polite scraping strategy

- Honor `robots.txt` (built into `BaseScraper._robots_ok`).
- Rate-limit (default 1 page / 2s) + exponential backoff on errors.
- Realistic, identifying `User-Agent` with contact info (good-citizen signal).
- Crawl during off-peak hours; cache pages so you never re-fetch unchanged listings (use `source_id` + a content hash).
- Prefer **official data partnerships / APIs** over scraping where possible — lower legal risk, higher quality. **Confirm each site's Terms of Service before enabling live crawling.**
- If a site forbids scraping: don't. Pursue a data-sharing agreement instead.

## Caching strategy

- **Geocoder**: in-memory `_cache` keyed by the admin tuple — repeated sectors cost nothing; offline lookups are O(1) dict hits.
- **Page cache**: persist fetched HTML keyed by URL + ETag/Last-Modified; skip re-parsing unchanged pages.
- **Redis (production)**: cache valuation responses and comps results (TTL ~1h) keyed by normalized query; cache the model-version metadata.

## Retry / failure handling

- Per-request: 3 retries, exponential backoff, timeout 20s; a failed page is skipped, never crashes the crawl.
- Per-listing: `parse()` wrapped in try/except — one malformed page can't stop ingestion.
- Idempotent upserts: a crawl can be re-run safely (no duplicates).
- Quarantine: listings with `risk_score ≥ 50` are dropped from training but can be logged for review.

## Deployment recommendations (Render)

- Run ingestion as a **scheduled Render Cron Job / background worker**, NOT in the web process — scraping is bursty and must not block API requests.
- Web app runtime needs only `scikit-learn` + `shapely` + `pandas`; scraping deps (`requests`, `beautifulsoup4`, `lxml`) belong to the worker.
- Geo data files (~4.5 MB derived) deploy with the app; raw GIS (752 MB) stays gitignored.
- Memory: geocoder ~1 MB, comps ~ one CSV; all lazy-loaded singletons.

## Scalability notes

- **All Rwanda / East Africa:** the geocoder loads any COD-AB country file — swap the GeoJSON, no code change. Only the CBD point + bbox are Kigali constants.
- **Volume:** at 10k+ listings, add `scipy.cKDTree` for nearest-comps and a PostGIS GIST index for geo queries.
- **Real-time valuation:** the model + geo engine are cached singletons; predictions are sub-second once warm.
