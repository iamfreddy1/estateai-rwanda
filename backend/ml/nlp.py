# ============================================
# NLP LISTING INTELLIGENCE  (lexicon-based, real today)
# ============================================
# Turns free-text listing descriptions into structured signals WITHOUT needing
# a trained language model (which would require a labelled Rwanda corpus). This
# lexicon approach is transparent, fast, zero-dependency, and a strong baseline;
# swap in a transformer later behind the same analyze() interface.
import re
import logging

log = logging.getLogger("nlp")

LUXURY = ["luxury", "luxurious", "modern", "swimming pool", "pool", "penthouse",
          "marble", "ensuite", "en-suite", "gated", "smart home", "high-end",
          "executive", "fully furnished", "generator", "borehole", "elevator",
          "lift", "garden", "panoramic", "view", "spacious", "brand new"]
AMENITIES = ["parking", "garage", "water tank", "borehole", "generator", "security",
             "guard", "wifi", "internet", "garden", "balcony", "terrace", "servant quarter",
             "dsq", "store", "gym", "playground", "solar", "ac", "air conditioning"]
POS = ["beautiful", "great", "excellent", "prime", "best", "spacious", "quiet",
       "convenient", "affordable", "modern", "clean", "secure"]
NEG = ["needs repair", "old", "as is", "fixer", "damaged", "unfinished", "problem"]
# fraud / scam linguistic red flags
FRAUD = ["urgent", "cash only", "wire transfer", "western union", "send money",
         "i am abroad", "deposit before", "agent fee upfront", "too good", "no viewing",
         "act now", "limited time", "whatsapp only", "advance payment"]


def _hits(text, vocab):
    t = " " + re.sub(r"\s+", " ", (text or "").lower()) + " "
    return sorted({w for w in vocab if w in t})


def analyze(description, title=""):
    text = f"{title or ''} {description or ''}".strip()
    if not text:
        return {"luxury_score": 0, "amenities": [], "sentiment": 0.0,
                "fraud_indicators": [], "fraud_text_risk": 0}
    lux = _hits(text, LUXURY)
    amen = _hits(text, AMENITIES)
    pos, neg = _hits(text, POS), _hits(text, NEG)
    fraud = _hits(text, FRAUD)
    sentiment = round((len(pos) - len(neg)) / max(len(pos) + len(neg), 1), 2)
    # luxury 0-100 scaled by number of distinct luxury cues (caps at ~8)
    luxury_score = min(100, int(len(lux) / 8 * 100))
    return {
        "luxury_score": luxury_score,
        "amenities": amen,
        "sentiment": sentiment,                 # -1..+1
        "luxury_keywords": lux,
        "fraud_indicators": fraud,
        "fraud_text_risk": min(100, len(fraud) * 25),
    }
