# ============================================
# LLM PROVIDER  (EstateAI Rwanda assistant)
# ============================================
# One small abstraction so the rest of the app doesn't care which provider.
# Default: OpenAI (OPENAI_API_KEY env). Swap providers by editing chat() only.
# If no key is configured, returns a HONEST stub message (not an empty string)
# so the UI never silently shows "" - users always see a clear status.
import os
import re
import logging

log = logging.getLogger("llm")

MODEL = os.environ.get("LLM_MODEL", "gpt-4o-mini")
MAX_OUTPUT_TOKENS = int(os.environ.get("LLM_MAX_OUTPUT_TOKENS", "600"))

SYSTEM_PROMPT = """You are EstateAI, the friendly, expert real-estate assistant for Rwanda, with deep knowledge of Kigali.

CORE TOPICS (lead with these, in this order of priority):
- buying / selling / renting houses, land, apartments, and commercial property in Rwanda
- valuation: comparables, price per sqm/sqft, location premium, neighborhood quality
- mortgages: typical Rwandan lender terms (BK, Equity, I&M), 10-20 yr tenors, 16-19% RWF rates, 20-30% down payment
- ROI / rental yield: Kigali gross yields ~6-9% / yr; central areas yield LESS (~6.5%), peri-urban MORE (~9.5%)
- investment strategy: emerging vs saturated sectors, infrastructure projects, urban growth corridors
- fraud risks: no title deed, urgent cash-only deals, agent-fee-upfront scams, double-sold plots, missing umupaka (boundary) markers
- comparing locations and recommending neighborhoods based on the user's budget + needs

KIGALI QUICK FACTS:
- Three districts (uturere): Gasabo, Kicukiro, Nyarugenge
- CBD core (Nyarugenge sectors Gitega/Nyarugenge/Muhima): premium, saturated, lower yield
- Upscale residential (Kacyiru, Kimihurura, Nyarutarama, Kibagabaga): high-end, family-friendly
- Mid-tier (Remera, Kimironko, Gisozi, Gacuriro/Kinyinya): growing, good rental demand
- Affordable / peri-urban (Nyamirambo, Gahanga, Kanombe, Masaka, Rusororo): cheaper, longer commute

LANGUAGES: support BOTH English AND Kinyarwanda. Reply in whichever language the user uses. Mix gracefully.
TONE: professional, concise, modern - like a knowledgeable startup advisor. Keep replies under ~6 short paragraphs.
CURRENCY: always RWF. Sizes: sqm (land) / sqft (buildings).
HONESTY: NEVER claim a specific price is guaranteed - say "approximately", "typically", "in our data". If you don't know, say so.
OFF-TOPIC: politely steer back to real estate or app help.
"""

# Light prompt-injection / jailbreak heuristics. The real defense is that
# the LLM has NO tool / file / network access from our server - it can only return text.
_BAD_PATTERNS = [
    r"\bignore (the )?(previous|prior|above) (instructions|prompt|rules)\b",
    r"\bdisregard (the )?(previous|prior|above)\b",
    r"\bsystem\s*:\s*",
    r"\bjailbreak\b",
    r"\b(do anything now|DAN)\b",
    r"\breveal (your|the) (system|hidden|secret) prompt\b",
    r"\bact as (an? )?(?!real|kigali|rwanda|estate|property|investor|tenant)",  # crude
]
_BAD_RE = re.compile("|".join(_BAD_PATTERNS), re.IGNORECASE)


def looks_unsafe(text: str) -> bool:
    """Cheap check for obvious jailbreak attempts. Not a security boundary."""
    return bool(_BAD_RE.search(text or ""))



# ---- Circuit breaker: open after N consecutive failures, stays open for COOLDOWN_S ----
import time as _t
_breaker = {"failures": 0, "open_until": 0.0}
_BREAKER_THRESHOLD = 5
_BREAKER_COOLDOWN_S = 60

def _breaker_is_open():
    return _t.time() < _breaker["open_until"]

def _breaker_record_failure():
    _breaker["failures"] += 1
    if _breaker["failures"] >= _BREAKER_THRESHOLD:
        _breaker["open_until"] = _t.time() + _BREAKER_COOLDOWN_S
        _breaker["failures"] = 0

def _breaker_record_success():
    _breaker["failures"] = 0
    _breaker["open_until"] = 0.0


def chat(messages):
    """messages: [{'role':'user'|'assistant','content': '...'}, ...]
    Returns (reply_text, usage_dict). Raises RuntimeError on provider failure."""
    if _breaker_is_open():
        last = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        return ("AI is temporarily unavailable (high error rate). Please try again in a minute.\n\n"
                f"Your question: \u201c{last[:200]}\u201d",
                {"prompt_tokens": 0, "completion_tokens": 0, "provider": "circuit_open"})
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        # Honest stub when AI isn't configured - clearly labelled so users know.
        last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        return (
            "AI is not configured on this server yet. Once OPENAI_API_KEY is set in "
            "the backend environment, I'll be able to answer:\n\n"
            f"“{last_user[:240]}”",
            {"prompt_tokens": 0, "completion_tokens": 0, "provider": "stub", "model": "none"},
        )
    try:
        from openai import OpenAI  # lazy: only required when key is set
    except ImportError as e:
        raise RuntimeError(
            "openai package not installed - add 'openai' to requirements.txt and pip install"
        ) from e

    client = OpenAI(api_key=api_key)
    full = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
    try:
        resp = client.chat.completions.create(
            model=MODEL, messages=full,
            max_tokens=MAX_OUTPUT_TOKENS, temperature=0.4,
        )
    except Exception as e:
        _breaker_record_failure()
        log.exception("OpenAI call failed")
        raise RuntimeError(f"AI provider error: {e}")
    _breaker_record_success()
    reply = (resp.choices[0].message.content or "").strip()
    u = getattr(resp, "usage", None)
    return reply, {
        "prompt_tokens": getattr(u, "prompt_tokens", None) if u else None,
        "completion_tokens": getattr(u, "completion_tokens", None) if u else None,
        "provider": "openai", "model": MODEL,
    }
