# EstateAI Rwanda — Operator Runbook

This is your **step-by-step guide for everything I can't do from code**: signing up for cloud accounts, clicking dashboard buttons, generating keys, and pushing the first production deploy.

Follow the steps in order. Each step says exactly **where to click**, **what to paste**, and **how to verify success**.

---

## Stage 0 — Local sanity check (5 minutes)

Before touching the cloud, confirm the local app still works after the production hardening I just added.

```powershell
# In your backend PowerShell (Ctrl+C if app.py is running)
cd C:\Ai\ai-property-valuation\backend
.\venv\Scripts\Activate.ps1
python migrate.py              # adds email_verified column (already done)
python app.py
```

You should see clean startup. Then in another PowerShell:

```powershell
curl http://localhost:5000/health
```

Confirm the JSON shows `"db": true`. If yes → Stage 1.

---

## Stage 1 — Create the cloud accounts (one-off, ~20 minutes)

Open a browser. Sign up for each of these (free tier on all of them):

| Service | URL | Purpose | Cost |
|---|---|---|---|
| **Render** | render.com | Hosts your backend + Postgres | Free Postgres (90 days) → $7/mo; web service free tier OK |
| **Cloudinary** | cloudinary.com | Stores uploaded property photos | Free tier: 25 GB storage, 25 GB bandwidth/mo |
| **OpenAI** | platform.openai.com | Powers the AI chatbot | Pay-as-you-go ($5–20/mo at small scale) |
| **Resend** | resend.com | Sends real verification + reset emails | Free tier: 3,000 emails/mo |
| **Google Cloud Console** | console.cloud.google.com | Google Sign-in OAuth | Free |

**Save the following from each service** (you'll paste these into Render in Stage 3):

| From Cloudinary dashboard, copy: |
| --- |
| `Cloud Name`, `API Key`, `API Secret` |

| From OpenAI → API keys, create one and copy: |
| --- |
| `OPENAI_API_KEY` (starts with `sk-...`) |

| From Resend → API keys, create one and copy: |
| --- |
| `RESEND_API_KEY` (starts with `re_...`) |

| From Google Cloud Console (already done in prior session): |
| --- |
| `GOOGLE_CLIENT_IDS` (your Android + Web client IDs comma-separated) |

---

## Stage 2 — Push your code to GitHub (5 minutes)

Render deploys from GitHub. If your repo isn't on GitHub yet:

```powershell
cd C:\Ai\ai-property-valuation
git add .
git commit -m "Production hardening: logging, audit log, email verification, circuit breaker"
git push origin main
```

If git asks for credentials and you don't have it set up: open github.com, create a new private repo named `estateai-rwanda`, then follow the "push existing repo" instructions GitHub shows you.

---

## Stage 3 — Deploy to Render (one-click via blueprint)

This is the magic step. Your `render.yaml` already describes everything Render needs to provision.

1. Go to **render.com** → log in → click **"New +"** → **"Blueprint"**.
2. Connect your GitHub repo (`estateai-rwanda`) when prompted.
3. Render reads `render.yaml` and shows you:
   - **estateai-db** (Postgres database, free tier)
   - **estateai-backend** (Web service)
4. Click **"Apply"**.
5. **CRITICAL**: Render will prompt you to set the secret env vars marked `sync: false` in `render.yaml`. Paste these now:

| Variable | Value | Where it came from |
|---|---|---|
| `ALLOWED_ORIGINS` | `https://YOUR-FRONTEND-DOMAIN.com` (or `https://estateai-frontend.onrender.com` if you also host the web admin on Render) | Your web frontend domain |
| `GOOGLE_CLIENT_IDS` | (the comma-separated IDs from Stage 1) | Google Cloud Console |
| `SEED_SECRET` | A long random string. Generate one with: `python -c "import secrets;print(secrets.token_urlsafe(32))"` | You |
| `CLOUDINARY_CLOUD_NAME` | (from Cloudinary dashboard) | Cloudinary |
| `CLOUDINARY_API_KEY` | (from Cloudinary dashboard) | Cloudinary |
| `CLOUDINARY_API_SECRET` | (from Cloudinary dashboard) | Cloudinary |
| `OPENAI_API_KEY` | (from OpenAI keys page) | OpenAI |
| `RESEND_API_KEY` | (from Resend dashboard) | Resend |

6. Click **"Apply"** again. Render builds and deploys. First build takes ~5 minutes.

**Verify**: when the build finishes, Render shows a URL like `https://estateai-backend-xxxx.onrender.com`. Open `https://estateai-backend-xxxx.onrender.com/health` in your browser — you should see:

```json
{
  "status": "healthy",
  "db": true,
  "config": {
    "google_oauth": true, "cloudinary": true, "seed_secret_set": true,
    "openai": true, "resend": true
  }
}
```

All five `config` flags must be `true`. If any are `false`, that env var didn't take — go to **Dashboard → estateai-backend → Environment** and fix it.

---

## Stage 4 — Retrain the .pkl models on production Python (5 minutes, on YOUR machine)

The current `.pkl` was trained on sklearn 1.7.2 but `requirements.txt` pins 1.8.0. To kill the version warnings:

```powershell
cd C:\Ai\ai-property-valuation\backend
.\venv\Scripts\Activate.ps1
python ml/build_features.py
python ml/train_pipeline.py
```

(This regenerates `ml/house_model.pkl` and `ml/land_model.pkl` in your venv's sklearn 1.8.0.)

Then commit and push:

```powershell
cd C:\Ai\ai-property-valuation
git add backend/ml/house_model.pkl backend/ml/land_model.pkl
git commit -m "Retrain pkl on sklearn 1.8.0"
git push
```

Render auto-deploys on push. Wait 5 minutes, hit `/health` again — startup logs should now be silent of the `InconsistentVersionWarning` spam.

---

## Stage 5 — Point your mobile app at the live backend (2 minutes)

1. Open `mobile/src/api/client.js`
2. Replace the current `API_BASE_URL` line with:

```js
export const API_BASE_URL = "https://estateai-backend-xxxx.onrender.com";   // production
```

3. (Replace `xxxx` with your actual Render subdomain.)
4. Save the file.

---

## Stage 6 — Build a production-signed Android APK (one-time setup, ~30 min)

This part has real one-time setup. Follow it carefully.

### 6a. Generate a release keystore (NEVER lose this file)

```powershell
cd C:\Ai\ai-property-valuation\mobile
keytool -genkeypair -v -storetype JKS -keystore release.keystore -alias estateai -keyalg RSA -keysize 2048 -validity 10000
```

It will ask for:
- Keystore password — pick something memorable, write it down
- Your name / organisation — type "EstateAI Rwanda"
- Country code — `RW`

**SAVE `release.keystore` SOMEWHERE SAFE.** If you lose it, you can never update the Play Store listing.

### 6b. Register the keystore's SHA-1 in Google Cloud Console

```powershell
keytool -list -v -keystore release.keystore -alias estateai
```

It prints a fingerprint like `SHA1: AB:CD:EF:...`. Copy that.

In Google Cloud Console:
1. **APIs & Services → Credentials**
2. Edit your **Android OAuth client**
3. Add the new SHA-1 fingerprint
4. Save

Otherwise Google Sign-in returns `DEVELOPER_ERROR` on production builds.

### 6c. Build with EAS

```powershell
npm install -g eas-cli
eas login                # log into your Expo account
eas build:configure
eas build --platform android --profile production
```

EAS uploads your project, builds in the cloud, and gives you a download URL for the signed `.apk` / `.aab`. Takes ~15 minutes.

**Test the APK on your phone first** before going to Play Store:
1. Download the APK from the EAS URL
2. Transfer to phone
3. Install (you may need to enable "Install from unknown sources")
4. Log in, do an AI valuation, request a viewing → confirm everything works against `https://estateai-backend-xxxx.onrender.com`

---

## Stage 7 — Submit to Google Play Store ($25 one-time + ongoing)

1. Sign up at **play.google.com/console** ($25 lifetime fee)
2. **Create app** → fill basic info
3. **Production track → Create new release** → upload the `.aab` from EAS
4. Fill required listing fields:
   - **Privacy policy URL** — you must publish one. Use a free generator like `freeprivacypolicy.com`, host on Render Static Site, paste URL.
   - **App description** — use the abstract from your final-year report
   - **App icon** — use `brand/app-icon.png` (1024×1024)
   - **Splash screen** — use `brand/splash.png`
   - **Screenshots** — at least 2 phone screenshots
   - **Content rating questionnaire** — fill honestly
5. **Submit for review**. Google takes 1-7 days for the first review.

---

## Stage 8 — Promote your local admin to production admin (after first deploy)

After Stage 3 succeeds and you sign up on the live app at least once:

1. Go to Render → **estateai-backend** → **Shell** tab (available on paid plans). If you're on free, use the `/admin/make-admin` endpoint:

```powershell
# Replace YOUR_BACKEND with your Render subdomain and YOUR_SEED_SECRET with what you set in Stage 3
curl -X POST `
  -H "X-Seed-Secret: YOUR_SEED_SECRET" `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"freddy@gmail.com\"}' `
  https://YOUR_BACKEND.onrender.com/admin/make-admin
```

That promotes the account to admin. **Then log out and log back in** on the mobile app or web admin so your JWT carries the new role.

---

## Stage 9 — Day-to-day operations

Once live:

| Task | How |
|---|---|
| Monitor logs | Render Dashboard → estateai-backend → Logs (structured JSON output) |
| Check signups / activity | Web admin dashboard at `/admin` |
| Trace a slow request | Search logs for the `request_id` (now in every log line + response header `X-Request-ID`) |
| Update code | `git push` → Render auto-deploys |
| Roll back | Render Dashboard → Deploys → click any prior deploy → "Redeploy" |
| Backup DB | Render Postgres → "Backups" tab. Free tier has automatic daily backups for 7 days |
| Audit admin actions | Query the `audit_logs` table (you'll wire UI for this in a later pass) |

---

## Stage 10 — Future passes (after Stage 9 is live)

When the deployed app is humming, come back for these focused passes:

1. **Alembic migrations** — replace `migrate.py` with proper versioned migrations
2. **Redis-backed rate limiter** — for multi-worker scaling
3. **Audit log UI** in the admin dashboard
4. **Real listing ingestion** — flip the scraping/partnership decision and wire `ingestion/sources/*.py`
5. **MTN MoMo payments** — for landlord premium features
6. **Image compression on mobile upload** with `expo-image-manipulator`
7. **Map view with property pins** (Mapbox or Google Maps API key)

Each of these is one focused turn from me, once you tell me to start.

---

## Quick reference: every env var

```bash
# Auto-set by Render's render.yaml
DATABASE_URL=…           # injected by Render Postgres
JWT_SECRET_KEY=…         # auto-generated
FLASK_ENV=production
PYTHON_VERSION=3.11.10

# YOU set these in Render Dashboard → Environment (sync:false in render.yaml)
ALLOWED_ORIGINS=https://your-frontend-domain.com
GOOGLE_CLIENT_IDS=678871576719-xxx.apps.googleusercontent.com,678871576719-yyy.apps.googleusercontent.com
SEED_SECRET=YourLongRandomStringFromSecretsTokenUrlsafe
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz12
OPENAI_API_KEY=sk-proj-…
RESEND_API_KEY=re_…

# Optional / future
SENTRY_DSN=…             # for error monitoring (Sentry account needed)
MAIL_FROM=EstateAI Rwanda <noreply@yourdomain.com>   # once you verify a domain in Resend
```

---

## If something breaks

| Symptom | Fix |
|---|---|
| `/health` returns `db: false` | DATABASE_URL is wrong or Postgres is down — check Render Postgres status |
| Login returns 500 | Check Render logs for the request_id; usually missing env var |
| Mobile shows "Cannot reach server" | API_BASE_URL still points at localhost — Stage 5 was missed |
| OpenAI chatbot returns "AI temporarily unavailable" | Circuit breaker tripped (5 consecutive failures). Check OpenAI status + your API quota |
| Cloudinary upload fails | `CLOUDINARY_*` env vars not set; uploads will fall back to ephemeral local disk that Render wipes on redeploy |
| Resend email not arriving | Verify your domain in Resend dashboard; until verified, send-from must be `onboarding@resend.dev` |
| Play Store rejects the AAB | Most common reason: privacy policy URL missing or wrong icon dimensions |

---

You now have everything you need to take EstateAI Rwanda from "works on my laptop" to "live for real users". Stage 0–4 takes a focused afternoon; Stage 6–7 takes a focused weekend. Tell me which step you hit a wall on and I'll debug it in one turn.
