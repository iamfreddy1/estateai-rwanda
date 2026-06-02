# ============================================
# PARSE UTILITIES  (resilient extraction)
# ============================================
# Real-estate sites change their HTML often, so brittle CSS selectors break.
# We extract in order of reliability:
#   1. JSON-LD (schema.org Product/Residence/Offer) - most sites embed this
#   2. OpenGraph / meta tags
#   3. Heuristic regex on visible text (price, bedrooms, size)
# Every helper is defensive (never raises) so one bad page can't kill a crawl.
import re
import json
import logging

log = logging.getLogger("parse")

_PRICE_RE = re.compile(r"(?:rwf|frw|usd|\$)?\s*([\d][\d,\.]{3,})\s*(rwf|frw|usd|\$|million|m)?",
                       re.IGNORECASE)
_BED_RE = re.compile(r"(\d+)\s*(?:bed|bedroom|chambre)", re.IGNORECASE)
_BATH_RE = re.compile(r"(\d+)\s*(?:bath|bathroom|salle)", re.IGNORECASE)
_SIZE_RE = re.compile(r"([\d,\.]+)\s*(sqm|m2|m²|sqft|sq\s?ft)", re.IGNORECASE)


def soupify(html):
    from bs4 import BeautifulSoup
    return BeautifulSoup(html, "lxml")


def extract_jsonld(soup):
    """Return the first schema.org dict that looks like a property/offer."""
    out = {}
    for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            data = json.loads(tag.string or "{}")
        except Exception:
            continue
        for node in (data if isinstance(data, list) else [data]):
            if not isinstance(node, dict):
                continue
            t = str(node.get("@type", "")).lower()
            if any(k in t for k in ("product", "residence", "house", "apartment",
                                    "offer", "realestate", "place")):
                offer = node.get("offers", {}) or {}
                geo = node.get("geo", {}) or {}
                out = {
                    "title": node.get("name"),
                    "description": node.get("description"),
                    "price": (offer.get("price") if isinstance(offer, dict) else None),
                    "currency": (offer.get("priceCurrency") if isinstance(offer, dict) else None),
                    "latitude": geo.get("latitude"),
                    "longitude": geo.get("longitude"),
                    "images": ([node["image"]] if isinstance(node.get("image"), str)
                               else node.get("image") or []),
                }
                return {k: v for k, v in out.items() if v not in (None, "", [])}
    return out


def extract_og(soup):
    """OpenGraph / meta fallback."""
    def meta(prop):
        tag = soup.find("meta", attrs={"property": prop}) or soup.find("meta", attrs={"name": prop})
        return tag.get("content") if tag else None
    out = {"title": meta("og:title"), "description": meta("og:description"),
           "price": meta("product:price:amount") or meta("og:price:amount"),
           "currency": meta("product:price:currency") or meta("og:price:currency")}
    img = meta("og:image")
    if img:
        out["images"] = [img]
    return {k: v for k, v in out.items() if v not in (None, "", [])}


def parse_price(text):
    if not text:
        return None
    m = _PRICE_RE.search(str(text))
    if not m:
        return None
    val = float(m.group(1).replace(",", ""))
    unit = (m.group(2) or "").lower()
    if unit in ("million", "m"):
        val *= 1_000_000
    return val


def heuristics(text):
    """Pull bedrooms/bathrooms/size from free text."""
    out = {}
    if not text:
        return out
    if (m := _BED_RE.search(text)):
        out["bedrooms"] = int(m.group(1))
    if (m := _BATH_RE.search(text)):
        out["bathrooms"] = int(m.group(1))
    if (m := _SIZE_RE.search(text)):
        val = float(m.group(1).replace(",", "")); unit = m.group(2).lower()
        if "sqft" in unit or "sq ft" in unit:
            out["size_sqft"] = val
        else:  # sqm/m2 -> store both
            out["size_sqft"] = round(val * 10.7639, 1)
            out["land_size"] = val
    return out


def detect_type(text_or_url):
    s = (text_or_url or "").lower()
    if any(k in s for k in ("rent", "for-rent", "/rent", "monthly", "/month")):
        return "rent"
    return "buy"


def normalize_property_type(text):
    s = (text or "").lower()
    for key in ("villa", "apartment", "townhouse", "bungalow", "house", "land", "plot", "commercial"):
        if key in s:
            return "land" if key == "plot" else key
    return None


def extract_all(html, url=""):
    """Combine all strategies into one raw dict (JSON-LD wins, heuristics fill gaps)."""
    soup = soupify(html)
    raw = {}
    raw.update(extract_og(soup))
    raw.update(extract_jsonld(soup))            # JSON-LD overrides OG
    body_text = soup.get_text(" ", strip=True)[:5000]
    for k, v in heuristics(raw.get("description") or body_text).items():
        raw.setdefault(k, v)
    if "price" in raw:
        raw["price"] = parse_price(raw["price"]) or raw["price"]
    else:
        raw["price"] = parse_price(body_text)
    raw.setdefault("type", detect_type(url + " " + body_text))
    raw.setdefault("property_type", normalize_property_type(
        (raw.get("title") or "") + " " + body_text))
    return raw
