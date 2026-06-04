# ============================================
# PAYMENT PROVIDERS  (MTN MoMo + Airtel Money + dev stub)
# ============================================
# One interface; three implementations. The route layer doesn't care which
# provider is used.
#
# DEV STUB MODE:
#   When provider credentials are not configured in env vars, every payment
#   request is logged + auto-succeeds after 3 seconds. This lets the full UX
#   be demoed without any real account setup. The moment real credentials are
#   set on Render, the providers handle real money.
#
# Real provider docs:
#   - MTN MoMo Collection API:    https://momodeveloper.mtn.com/
#   - Airtel Money Collection:    https://developers.airtel.africa/
import os
import uuid
import logging
import threading
import time
import base64

log = logging.getLogger("payments")

# ---- helpers -------------------------------------------------
def _normalize_msisdn(phone: str) -> str:
    """+250...., 250...., or 07.... -> 2507XXXXXXXX format."""
    p = "".join(ch for ch in (phone or "") if ch.isdigit() or ch == "+")
    if p.startswith("+"):
        p = p[1:]
    if p.startswith("07") and len(p) == 10:
        p = "250" + p[1:]
    if p.startswith("7") and len(p) == 9:
        p = "250" + p
    return p


def _provider_enabled(provider: str) -> bool:
    if provider == "mtn":
        return all([os.environ.get("MTN_MOMO_API_USER"),
                    os.environ.get("MTN_MOMO_API_KEY"),
                    os.environ.get("MTN_MOMO_SUBSCRIPTION_KEY")])
    if provider == "airtel":
        return all([os.environ.get("AIRTEL_CLIENT_ID"),
                    os.environ.get("AIRTEL_CLIENT_SECRET")])
    return False


# ============================================
# DEV STUB — auto-succeeds after 3 seconds
# ============================================
_stub_db = {}     # in-memory transaction status store


def _stub_request(phone: str, amount: float, reference: str) -> dict:
    txid = f"stub-{uuid.uuid4().hex[:12]}"
    _stub_db[txid] = {"status": "pending", "phone": phone, "amount": amount,
                      "reference": reference, "created": time.time()}

    def _flip():
        time.sleep(3)
        if txid in _stub_db:
            _stub_db[txid]["status"] = "success"
            log.info("[stub] auto-marked %s as success", txid)

    t = threading.Thread(target=_flip, daemon=True)
    t.start()
    log.info("[stub] payment request: phone=%s amount=%s ref=%s -> %s",
             phone, amount, reference, txid)
    return {"transaction_id": txid, "status": "pending", "provider": "stub"}


def _stub_status(txid: str) -> dict:
    rec = _stub_db.get(txid)
    if not rec:
        return {"status": "unknown"}
    return {"status": rec["status"], "phone": rec["phone"], "amount": rec["amount"]}


# ============================================
# MTN MoMo Collection API
# ============================================
MTN_BASE = os.environ.get("MTN_MOMO_BASE_URL", "https://sandbox.momodeveloper.mtn.com")
MTN_TARGET_ENV = os.environ.get("MTN_MOMO_TARGET", "sandbox")     # 'sandbox' or 'mtnrwanda'
MTN_CALLBACK = os.environ.get("MTN_MOMO_CALLBACK_URL", "")


def _mtn_token() -> str:
    import requests
    api_user = os.environ.get("MTN_MOMO_API_USER")
    api_key = os.environ.get("MTN_MOMO_API_KEY")
    sub_key = os.environ.get("MTN_MOMO_SUBSCRIPTION_KEY")
    creds = base64.b64encode(f"{api_user}:{api_key}".encode()).decode()
    r = requests.post(
        f"{MTN_BASE}/collection/token/", timeout=15,
        headers={"Authorization": f"Basic {creds}",
                 "Ocp-Apim-Subscription-Key": sub_key},
    )
    r.raise_for_status()
    return r.json()["access_token"]


def _mtn_request(phone: str, amount: float, reference: str, description: str) -> dict:
    import requests
    sub_key = os.environ.get("MTN_MOMO_SUBSCRIPTION_KEY")
    txid = str(uuid.uuid4())
    token = _mtn_token()
    body = {
        "amount": str(int(amount)), "currency": "RWF",
        "externalId": reference,
        "payer": {"partyIdType": "MSISDN", "partyId": _normalize_msisdn(phone)},
        "payerMessage": description[:80], "payeeNote": description[:80],
    }
    r = requests.post(
        f"{MTN_BASE}/collection/v1_0/requesttopay",
        json=body, timeout=20,
        headers={
            "Authorization": f"Bearer {token}",
            "X-Reference-Id": txid,
            "X-Target-Environment": MTN_TARGET_ENV,
            "Ocp-Apim-Subscription-Key": sub_key,
            **({"X-Callback-Url": MTN_CALLBACK} if MTN_CALLBACK else {}),
            "Content-Type": "application/json",
        },
    )
    if r.status_code not in (200, 202):
        log.error("MTN MoMo request failed %s: %s", r.status_code, r.text[:300])
        return {"transaction_id": txid, "status": "failed",
                "error": f"MTN error {r.status_code}", "provider": "mtn"}
    return {"transaction_id": txid, "status": "pending", "provider": "mtn"}


def _mtn_status(txid: str) -> dict:
    import requests
    sub_key = os.environ.get("MTN_MOMO_SUBSCRIPTION_KEY")
    token = _mtn_token()
    r = requests.get(
        f"{MTN_BASE}/collection/v1_0/requesttopay/{txid}", timeout=15,
        headers={
            "Authorization": f"Bearer {token}",
            "X-Target-Environment": MTN_TARGET_ENV,
            "Ocp-Apim-Subscription-Key": sub_key,
        },
    )
    if not r.ok:
        return {"status": "unknown", "error": r.text[:200]}
    data = r.json()
    mtn_status = (data.get("status") or "").upper()
    mapped = {"SUCCESSFUL": "success", "FAILED": "failed",
              "PENDING": "pending", "REJECTED": "failed"}.get(mtn_status, "pending")
    return {"status": mapped, "provider_status": mtn_status, "raw": data}


# ============================================
# Airtel Money Collection API (Rwanda)
# ============================================
AIRTEL_BASE = os.environ.get("AIRTEL_BASE_URL", "https://openapiuat.airtel.africa")
AIRTEL_COUNTRY = os.environ.get("AIRTEL_COUNTRY", "RW")
AIRTEL_CURRENCY = os.environ.get("AIRTEL_CURRENCY", "RWF")


def _airtel_token() -> str:
    import requests
    r = requests.post(
        f"{AIRTEL_BASE}/auth/oauth2/token", timeout=15,
        json={
            "client_id": os.environ.get("AIRTEL_CLIENT_ID"),
            "client_secret": os.environ.get("AIRTEL_CLIENT_SECRET"),
            "grant_type": "client_credentials",
        },
    )
    r.raise_for_status()
    return r.json()["access_token"]


def _airtel_request(phone: str, amount: float, reference: str, description: str) -> dict:
    import requests
    txid = str(uuid.uuid4())
    token = _airtel_token()
    body = {
        "reference": reference, "subscriber": {
            "country": AIRTEL_COUNTRY, "currency": AIRTEL_CURRENCY,
            "msisdn": _normalize_msisdn(phone),
        },
        "transaction": {
            "amount": int(amount), "country": AIRTEL_COUNTRY,
            "currency": AIRTEL_CURRENCY, "id": txid,
        },
    }
    r = requests.post(
        f"{AIRTEL_BASE}/merchant/v1/payments/", json=body, timeout=20,
        headers={"Authorization": f"Bearer {token}",
                 "X-Country": AIRTEL_COUNTRY, "X-Currency": AIRTEL_CURRENCY},
    )
    if not r.ok:
        log.error("Airtel request failed %s: %s", r.status_code, r.text[:300])
        return {"transaction_id": txid, "status": "failed",
                "error": f"Airtel error {r.status_code}", "provider": "airtel"}
    return {"transaction_id": txid, "status": "pending", "provider": "airtel"}


def _airtel_status(txid: str) -> dict:
    import requests
    token = _airtel_token()
    r = requests.get(
        f"{AIRTEL_BASE}/standard/v1/payments/{txid}", timeout=15,
        headers={"Authorization": f"Bearer {token}",
                 "X-Country": AIRTEL_COUNTRY, "X-Currency": AIRTEL_CURRENCY},
    )
    if not r.ok:
        return {"status": "unknown", "error": r.text[:200]}
    data = r.json().get("data", {})
    txn = data.get("transaction", {})
    airtel_status = (txn.get("status") or "").upper()
    mapped = {"TS": "success", "TIP": "pending", "TF": "failed"}.get(airtel_status, "pending")
    return {"status": mapped, "provider_status": airtel_status, "raw": data}


# ============================================
# PUBLIC INTERFACE — used by routes
# ============================================
def request_payment(provider: str, phone: str, amount: float,
                    reference: str, description: str = "EstateAI Rwanda") -> dict:
    provider = (provider or "mtn").lower()
    if provider == "mtn" and _provider_enabled("mtn"):
        try: return _mtn_request(phone, amount, reference, description)
        except Exception as e:
            log.exception("MTN request failed")
            return {"transaction_id": None, "status": "failed",
                    "error": str(e)[:200], "provider": "mtn"}
    if provider == "airtel" and _provider_enabled("airtel"):
        try: return _airtel_request(phone, amount, reference, description)
        except Exception as e:
            log.exception("Airtel request failed")
            return {"transaction_id": None, "status": "failed",
                    "error": str(e)[:200], "provider": "airtel"}
    return _stub_request(phone, amount, reference)


def check_status(provider: str, txid: str) -> dict:
    if txid and txid.startswith("stub-"):
        return _stub_status(txid)
    provider = (provider or "").lower()
    if provider == "mtn" and _provider_enabled("mtn"):
        try: return _mtn_status(txid)
        except Exception as e:
            log.exception("MTN status failed"); return {"status": "unknown", "error": str(e)[:200]}
    if provider == "airtel" and _provider_enabled("airtel"):
        try: return _airtel_status(txid)
        except Exception as e:
            log.exception("Airtel status failed"); return {"status": "unknown", "error": str(e)[:200]}
    return {"status": "unknown", "error": "Provider not configured"}
