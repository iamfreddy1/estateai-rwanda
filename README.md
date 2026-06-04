# 🏡 EstateAI — AI-Based Property Valuation System

real estate platform with **AI-powered price prediction** using a Random Forest model.

Users can browse property listings, search by location, get instant AI price estimates, sign up / log in, and manage their own listings.

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\Activate.ps1            # Windows PowerShell
# OR: source venv/bin/activate       # macOS/Linux
pip install -r requirements.txt
python ml/generate_dataset.py        # Create the dataset
python ml/train_model.py             # Train the AI model
python app.py                        # Start the server (port 5000)
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev                           # Start dev server (port 5173)
```

---

## 🌐 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET    | `/` | No | API info |
| GET    | `/health` | No | Health check |
| POST   | `/predict` | No | Get AI price estimate |
| GET    | `/predict/info` | No | Model details |
| POST   | `/auth/signup` | No | Create new user |
| POST   | `/auth/login` | No | Get JWT token |
| GET    | `/auth/me` | Yes | Current user info |
| GET    | `/properties` | No | List all properties |
| GET    | `/properties?type=buy&location=x` | No | Filtered listings |
| POST   | `/properties` | Yes | Create new listing |
| DELETE | `/properties/<id>` | Yes (owner) | Delete listing |

---

## 🤖 The AI Model

The Random Forest Regressor is trained on a synthetic dataset of 200 property records with these features:

- Bedrooms (1–6)
- Bathrooms (1–4)
- Size in square feet (500–5000)
- Property age (0–50 years)
- Location (Downtown, Beachside, Suburb, etc., one-hot encoded)

Performance is typically:
- **R² Score**: ~0.95 (explains 95% of price variation)
- **MAE**: ~$40,000 (average prediction error)

To retrain the model with fresh data:
```bash
python ml/generate_dataset.py
python ml/train_model.py
```

---

## 🧪 Testing

Run the automated API test suite:

```bash
# Start the backend first, then in another terminal:
cd backend
python test_api.py
```

---

## 📜 License

Beta to real estate Business project
