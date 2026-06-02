# ============================================
# BASE SCRAPER  (polite, pluggable)
# ============================================
# Subclass per source and implement list_urls() + parse(html, url).
# Built-in: robots.txt respect, rate limiting, retries, lazy 'requests' import
# (so importing this module never requires network libs at app runtime).
import time
import logging
from abc import ABC, abstractmethod
from urllib.parse import urlparse
from urllib import robotparser

log = logging.getLogger("scraper")


class BaseScraper(ABC):
    source = "base"
    base_url = ""
    rate_limit_sec = 2.0          # polite default: one page every 2s
    user_agent = "EstateAI-Rwanda/1.0 (+contact@estateai.rw)"

    def __init__(self, respect_robots=True):
        self.respect_robots = respect_robots
        self._rp = None
        self._last = 0.0

    def _robots_ok(self, url):
        if not self.respect_robots:
            return True
        try:
            if self._rp is None:
                self._rp = robotparser.RobotFileParser()
                p = urlparse(self.base_url)
                self._rp.set_url(f"{p.scheme}://{p.netloc}/robots.txt")
                self._rp.read()
            return self._rp.can_fetch(self.user_agent, url)
        except Exception:
            return True

    def _throttle(self):
        wait = self.rate_limit_sec - (time.time() - self._last)
        if wait > 0:
            time.sleep(wait)
        self._last = time.time()

    def fetch(self, url, retries=3):
        if not self._robots_ok(url):
            log.warning("robots.txt disallows %s - skipping", url)
            return None
        import requests  # lazy: only needed when actually scraping
        for attempt in range(retries):
            self._throttle()
            try:
                r = requests.get(url, headers={"User-Agent": self.user_agent}, timeout=20)
                if r.status_code == 200:
                    return r.text
                log.warning("HTTP %s on %s", r.status_code, url)
            except Exception as e:
                log.warning("fetch error (%s/%s) %s: %s", attempt + 1, retries, url, e)
            time.sleep(2 ** attempt)
        return None

    @abstractmethod
    def list_urls(self):
        """Yield listing-detail URLs (paginate the search pages here)."""
        ...

    @abstractmethod
    def parse(self, html, url):
        """Return a RAW dict from one listing page (CSS selectors live here)."""
        ...

    def run(self, limit=None):
        out = []
        for i, url in enumerate(self.list_urls()):
            if limit and i >= limit:
                break
            html = self.fetch(url)
            if not html:
                continue
            try:
                raw = self.parse(html, url)
                if raw:
                    raw.setdefault("source", self.source)
                    raw.setdefault("url", url)
                    out.append(raw)
            except Exception as e:
                log.warning("parse failed %s: %s", url, e)
        return out
