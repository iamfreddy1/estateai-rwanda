# ============================================
# SELLER PAYMENT METHODS — validation & normalization
# ============================================
# Used by property_routes when sellers create/edit listings.
import re

VALID_METHODS = {"mtn", "airtel", "bk", "equity"}

# Rwanda phone numbers: accept 07XXXXXXXX, +2507XXXXXXXX, 2507XXXXXXXX
PHONE_RE = re.compile(r"^(?:\+?25)?07\d{8}$|^\+?2507\d{8}$")

# Bank account: 8 to 20 digits (BK is 16, Equity is 10-12)
ACCOUNT_RE = re.compile(r"^\d{8,20}$")


def _strip(s):
    return re.sub(r"\s+", "", s or "")


def normalize_phone(s: str) -> str:
    """+2507... / 07... / 2507... -> +2507XXXXXXXX (display form)."""
    p = _strip(s)
    digits = re.sub(r"\D", "", p)
    if digits.startswith("07") and len(digits) == 10:
        digits = "250" + digits[1:]
    if digits.startswith("7") and len(digits) == 9:
        digits = "250" + digits
    return "+" + digits if digits else ""


def validate_phone(s: str) -> bool:
    p = _strip(s)
    return bool(PHONE_RE.match(p))


def validate_account(s: str) -> bool:
    return bool(ACCOUNT_RE.match(_strip(s)))


def parse_methods(raw) -> list:
    """Accept list or CSV; return clean list of valid method codes."""
    if isinstance(raw, list):
        items = [str(x).strip().lower() for x in raw]
    else:
        items = [m.strip().lower() for m in (str(raw or "")).split(",")]
    return [m for m in items if m in VALID_METHODS]


def validate_payment_payload(data: dict) -> tuple[dict, list[str]]:
    """
    Read the seller's payment selections from request body.
    Return (clean_dict, errors[]). clean_dict has the columns we'll
    persist on the Property row.
    """
    errs = []
    methods = parse_methods(data.get("payment_methods"))

    clean = {
        "payment_methods":       ",".join(methods),
        "mtn_number":            None,
        "airtel_number":         None,
        "bk_account_number":     None,
        "equity_account_number": None,
        "account_holder_name":   (data.get("account_holder_name") or "").strip() or None,
        "show_payment_details":  bool(data.get("show_payment_details", True)),
    }

    if methods and not clean["account_holder_name"]:
        errs.append("account_holder_name is required when any payment method is selected.")

    if "mtn" in methods:
        n = (data.get("mtn_number") or "").strip()
        if not n: errs.append("mtn_number required when MTN MoMo is selected.")
        elif not validate_phone(n): errs.append("mtn_number is not a valid Rwanda phone number.")
        else: clean["mtn_number"] = normalize_phone(n)

    if "airtel" in methods:
        n = (data.get("airtel_number") or "").strip()
        if not n: errs.append("airtel_number required when Airtel Money is selected.")
        elif not validate_phone(n): errs.append("airtel_number is not a valid Rwanda phone number.")
        else: clean["airtel_number"] = normalize_phone(n)

    if "bk" in methods:
        n = (data.get("bk_account_number") or "").strip()
        if not n: errs.append("bk_account_number required when Bank of Kigali is selected.")
        elif not validate_account(n): errs.append("bk_account_number must be 8-20 digits.")
        else: clean["bk_account_number"] = _strip(n)

    if "equity" in methods:
        n = (data.get("equity_account_number") or "").strip()
        if not n: errs.append("equity_account_number required when Equity Bank is selected.")
        elif not validate_account(n): errs.append("equity_account_number must be 8-20 digits.")
        else: clean["equity_account_number"] = _strip(n)

    return clean, errs
