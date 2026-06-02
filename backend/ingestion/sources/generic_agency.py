# ============================================
# GENERIC AGENCY SCRAPER  (config-driven)
# ============================================
# Onboard any Rwanda real-estate agency by passing a config dict - no new class.
#   cfg = {"source":"imara","base_url":"https://...","search_paths":["/buy"],
#          "detail_selector":"a.property-card"}
#   GenericAgencyScraper(cfg).run()
# Falls back to the same JSON-LD/heuristic parser, which works on most sites.
import logging
from ..base import BaseScraper
from ..parse_utils import extract_all, soupify

log = logging.getLogger("agency")


class GenericAgencyScraper(BaseScraper):
    def __init__(self, cfg, **kw):
        super().__init__(**kw)
        self.source = cfg["source"]
        self.base_url = cfg["base_url"]
        self.search_paths = cfg.get("search_paths", ["/"])
        self.detail_selector = cfg.get("detail_selector", "a[href*='propert']")
        self.max_pages = cfg.get("max_pages", 10)
        self.page_param = cfg.get("page_param", "page")

    def list_urls(self):
        for path in self.search_paths:
            for page in range(1, self.max_pages + 1):
                html = self.fetch(f"{self.base_url}{path}?{self.page_param}={page}")
                if not html:
                    break
                soup = soupify(html)
                links = {a.get("href") for a in soup.select(self.detail_selector)}
                if not links:
                    break
                for href in links:
                    yield href if str(href).startswith("http") else self.base_url + href

    def parse(self, html, url):
        raw = extract_all(html, url=url)
        raw["source_id"] = (url or "").rstrip("/").split("/")[-1]
        return raw
