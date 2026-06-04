# EstateAI Rwanda — MTN MoMo + Airtel Money Setup

This guide explains how to switch payments from **dev stub mode** (auto-success
after 3 seconds) to **real money** with MTN MoMo and Airtel Money.

---

## What's in the code

| Component | Purpose |
|---|---|
| `backend/services/payments.py` | Provider abstraction (MTN / Airtel / stub) |
| `backend/routes/payment_routes.py` | `/payments/contact-unlock`, `/payments/premium`, `/payments/<id>/status`, `/properties/<id>/contact`, webhooks |
| `backend/models/database.py` | `Payment` + `PropertyContactUnlock` tables + `User.premium_until` |
| `mobile/src/api/payments.js` | Mobile API client + status polling |
| `mobile/src/components/UnlockContactModal.js` | Bottom-sheet unlock flow |
| `mobile/src/screens/PremiumUpgradeScreen.js` | Monthly subscription page |
| `mobile/src/screens/PropertyDetailsScreen.js` | Hides phone behind unlock prompt |

**Default pricing** (override via env vars):
- Contact unlock: `500 RWF` (one-time, one property)
- Landlord premium: `5000 RWF / month` (unlimited unlocks + boost)

---

## Dev mode (works today — no setup)

If no provider env vars are set, the stub provider takes over:
1. User taps "Unlock contact" → enters phone → taps Pay
2. Backend logs the request and creates a `pending` payment
3. After **3 seconds**, the stub marks it `success`
4. The mobile polls `GET /payments/<id>/status` and unlocks the phone

This lets you demo the full UX without any MoMo account.

---

## Switching to real MTN MoMo

1. Register at <https://momodeveloper.mtn.com/> (free)
2. Subscribe to the **Collections** product → grab the **Primary Key** (= `MTN_MOMO_SUBSCRIPTION_KEY`)
3. Provision a sandbox API user (POST `/v1_0/apiuser`) → save the `X-Reference-Id` (= `MTN_MOMO_API_USER`)
4. Generate an API key for that user (POST `/v1_0/apiuser/{id}/apikey`) → save it (= `MTN_MOMO_API_KEY`)
5. Add these env vars on Render:
   ```
   MTN_MOMO_SUBSCRIPTION_KEY=<primary key>
   MTN_MOMO_API_USER=<reference id>
   MTN_MOMO_API_KEY=<api key>
   MTN_MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com   # or https://proxy.momoapi.mtn.com for prod
   MTN_MOMO_TARGET=sandbox                                   # or mtnrwanda for prod
   MTN_MOMO_CALLBACK_URL=https://<your-render-host>/payments/webhook/mtn
   ```
6. Redeploy backend. Next payment attempt routes through MoMo.

---

## Switching to real Airtel Money

1. Register at <https://developers.airtel.africa/>
2. Create an app → save `Client ID` + `Client Secret`
3. Add to Render:
   ```
   AIRTEL_CLIENT_ID=<client id>
   AIRTEL_CLIENT_SECRET=<client secret>
   AIRTEL_BASE_URL=https://openapiuat.airtel.africa   # or openapi.airtel.africa for prod
   AIRTEL_COUNTRY=RW
   AIRTEL_CURRENCY=RWF
   ```
4. Redeploy.

---

## Production checklist (before accepting real money)

- [ ] Switch MTN to **prod** base URL + target (`mtnrwanda`)
- [ ] Switch Airtel to **prod** base URL
- [ ] Configure webhook URL in BOTH provider dashboards → `https://<host>/payments/webhook/{mtn|airtel}`
- [ ] Verify TLS certificate on your domain (providers require HTTPS for webhooks)
- [ ] Add provider signature verification in `payment_webhook()` (currently trusts payload — fine for sandbox; **must** verify HMAC in prod)
- [ ] Set up a daily reconciliation Render cron that compares `Payment.status` against provider `GET /transaction` for all `pending` payments >1h old
- [ ] Display refund / dispute policy in your Terms of Service
- [ ] If processing >1M RWF/month, you may need BNR (Bank of National Rwanda) PSP registration — consult a Rwandan lawyer

---

## Endpoint reference

```
POST  /payments/contact-unlock      Body: { property_id, phone, provider }
POST  /payments/premium             Body: { phone, provider }
GET   /payments/<id>/status         Auth required; user-owned only
GET   /properties/<id>/contact      Returns { locked: true, unlock_price_rwf } OR { locked: false, phone, name }
POST  /payments/webhook/mtn         Provider callback (no auth)
POST  /payments/webhook/airtel      Provider callback (no auth)
```

All payment endpoints except webhooks require JWT.
