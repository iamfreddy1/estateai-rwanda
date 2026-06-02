# ============================================
# SOURCE: HouseInRwanda
# ============================================
# Uses the resilient parser (JSON-LD -> OG -> heuristics). The ONLY site-specific
# parts are (a) how to paginate search pages and (b) how to find detail links.
# Confirm robots.txt/ToS before enabling run() against the live site.
import re
import logging
from ..base import BaseScraper
from ..parse_utils import extract_all, soupify

log = logging.getLogger("houseinrwanda")


class HouseInRwandaScraper(BaseScraper):
    source = "houseinrwanda"
    base_url = "https://www.houseinrwanda.com"
    # search pages to crawl (sale + rent). Pagination appended as ?page=N.
    search_paths = ["/for-sale", "/for-rent"]
    max_pages = 20

    def list_urls(self):
        for path in self.search_paths:
            for page in range(1, self.max_pages + 1):
                html = self.fetch(f"{self.base_url}{path}?page={page}")
                if not html:
                    break
                soup = soupify(html)
                # detail links: anchors whose href points at a property page.
                # (Selector confirmed-best-effort; adjust to live markup.)
                links = {a.get("href") for a in soup.select("a[href*='/property/'], a[href*='/listing/']")}
                if not links:
                    break
                for href in links:
                    yield href if href.startswith("http") else self.base_url + href

    def parse(self, html, url):
        raw = extract_all(html, url=url)
        raw["source_id"] = self._id_from_url(url)
        # district/sector left to the geocoder/NLP from title+description text
        return raw

    @staticmethod
    def _id_from_url(url):
        m = re.search(r"/(\d+)(?:[/?#]|$)", url or "")
        return m.group(1) if m else (url or "").rstrip("/").split("/")[-1]
