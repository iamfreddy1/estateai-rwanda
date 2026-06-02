# ============================================
# SOURCE: QuickHomes Rwanda (quick.rw)
# ============================================
import logging
from .houseinrwanda import HouseInRwandaScraper

log = logging.getLogger("quickhomes")


class QuickHomesScraper(HouseInRwandaScraper):
    source = "quickhomes"
    base_url = "https://www.quick.rw"
    search_paths = ["/all-properties", "/for-rent"]
