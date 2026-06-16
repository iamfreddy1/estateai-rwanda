# ============================================
# FAQ  (curated, instant answers - zero LLM cost)
# ============================================
# Tap-to-view answers for the most common Rwanda real-estate questions.
# Update this list anytime; the mobile app fetches it via /ai/faq.
FAQ = [
    {
        "id": "ai-valuation",
        "category": "AI",
        "q": "How does the AI price valuation work?",
        "a": (
            "We combine three signals: (1) a machine-learning model trained on Kigali "
            "property features (size, bedrooms, year built, road access, etc.), "
            "(2) real geospatial features computed from your coordinates — distance to the "
            "CBD, nearest schools/hospitals/markets, sector density, and accessibility, "
            "and (3) comparable nearby properties. The result is an estimate with a confidence "
            "score. Always treat it as a guide, not a guarantee."
        ),
    },
    {
        "id": "investment-score",
        "category": "AI",
        "q": "What does the Investment Score mean?",
        "a": (
            "It blends accessibility (closeness to the CBD and amenities) with growth headroom "
            "(how saturated the sector already is). A score of 80+ flags central but not-yet-dense "
            "sectors with the most upside, like Gitega. Peri-urban areas with no amenities sit "
            "near 0. It's a heuristic for now — once we have years of price history we'll replace it "
            "with a real appreciation model."
        ),
    },
    {
        "id": "kigali-prices",
        "category": "Market",
        "q": "What are typical Kigali house prices by area?",
        "a": (
            "Approximate market ranges (RWF, mid-2020s):\n"
            "• CBD core (Gitega, Nyarugenge sector, Muhima): 200M+ for upscale\n"
            "• Upscale residential (Kacyiru, Kimihurura, Nyarutarama): 150M–500M for 3–5 BR villas\n"
            "• Mid-tier (Remera, Kimironko, Gisozi, Gacuriro): 80M–200M\n"
            "• Affordable / peri-urban (Nyamirambo, Gahanga, Kanombe, Masaka): 30M–120M\n"
            "These are estimates only — actual prices depend on plot, condition and timing."
        ),
    },
    {
        "id": "mortgages-rwanda",
        "category": "Finance",
        "q": "How do mortgages work in Rwanda?",
        "a": (
            "Major banks (Bank of Kigali, Equity, I&M, Cogebanque) offer RWF mortgages with:\n"
            "• Tenors: typically 10–20 years\n"
            "• Rates: roughly 16–19% per year (variable)\n"
            "• Down payment: usually 20–30%\n"
            "• Required: title deed, proof of income, valuation report\n"
            "Foreigners can also borrow but usually need a higher down payment. "
            "Always compare offers across at least 2 banks."
        ),
    },
    {
        "id": "rental-yield",
        "category": "Finance",
        "q": "What is rental yield and how do I calculate it?",
        "a": (
            "Gross rental yield = (annual rent / property value) × 100%.\n"
            "Kigali gross yields typically run 6–9% per year. Central, upscale areas yield LESS "
            "(~6.5%) because property values are high; peri-urban yields MORE (~9.5%) but rents "
            "can be slower to collect. For a more realistic figure, subtract maintenance, vacancy, "
            "and management to get NET yield."
        ),
    },
    {
        "id": "fraud-warnings",
        "category": "Safety",
        "q": "How can I avoid property fraud in Rwanda?",
        "a": (
            "Red flags to watch for:\n"
            "• No title deed (umubonano w'ubutaka) or refusal to show one\n"
            "• Pressure to pay cash before viewing or in advance abroad\n"
            "• A 'too good to be true' price for the area\n"
            "• Boundary (umupaka) markers missing or disputed\n"
            "• Multiple sellers claiming the same plot\n"
            "Always verify the title via the official Rwanda Land Management Authority "
            "(lands.rw) by parcel number before paying."
        ),
    },
    {
        "id": "land-investment",
        "category": "Strategy",
        "q": "Where should I buy land for investment in Kigali?",
        "a": (
            "Three filters that consistently work:\n"
            "• PROXIMITY — within 10 km of CBD ideally; never buy land you can't access on a paved road today "
            "OR a confirmed planned upgrade.\n"
            "• GROWTH PATH — emerging sectors near new infrastructure (e.g. Bugesera airport corridor) tend to appreciate fastest.\n"
            "• TITLE & ZONING — make sure the title is clean and the zone permits your intended use.\n"
            "Use the in-app Investment Score and Land AI valuation to compare candidates."
        ),
    },
    {
        "id": "list-property",
        "category": "App",
        "q": "How do I list my property for sale?",
        "a": (
            "Tap the Sell tab → fill in the form (location, photos, price, features) → submit. "
            "Listings go to an admin queue for quick verification (usually under 24 h). "
            "Verified agents can list directly without manual review."
        ),
    },
    {
        "id": "identity-verify",
        "category": "App",
        "q": "Why does the system ask me to verify my identity?",
        "a": (
            "Identity verification (Indangamuntu / national ID upload) protects buyers and sellers "
            "from fake listings. Verified users get a green badge, better trust signals, and access "
            "to higher-value features. Your ID is stored privately on Cloudinary with restricted access "
            "and is only viewed by admins during verification."
        ),
    },
    {
        "id": "kinyarwanda-example",
        "category": "AI",
        "q": "Igiciro cy'inzu y'amazu 4 mu Kacyiru ni kingana iki?",
        "a": (
            "Inzu y'amazu 4 mu Kacyiru ihora hagati ya 180M na 350M RWF — bitewe n'ubunini, "
            "imyaka y'inyubako, n'urugero rw'umuhanda. Niba ushaka igiciro cy'ukuri ku nyubako "
            "yawe, koresha igikoresho cyo gutekereza cy'AI (House Estimate)."
        ),
    },
]


def get_faq():
    """Return the curated FAQ list (sorted by category for nicer UI grouping)."""
    return sorted(FAQ, key=lambda x: (x["category"], x["id"]))
