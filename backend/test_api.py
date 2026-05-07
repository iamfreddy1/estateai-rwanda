# ============================================
# BACKEND API TEST SCRIPT
# ============================================
# Tests every endpoint of the Flask backend to confirm they all work.
# Run with: python test_api.py
#
# IMPORTANT: Flask server must be running first!
#   In another terminal: python app.py

import requests
import json
import sys

BASE_URL = "http://localhost:5000"

# Track test results
passed = 0
failed = 0
results = []


def test(name, func):
    """Run a single test and track if it passed or failed."""
    global passed, failed
    print(f"\n--- {name} ---")
    try:
        func()
        print("PASS")
        passed += 1
        results.append((name, "PASS"))
    except AssertionError as e:
        print(f"FAIL: {e}")
        failed += 1
        results.append((name, f"FAIL: {e}"))
    except requests.exceptions.ConnectionError:
        print("FAIL: Cannot connect to server. Is Flask running on port 5000?")
        failed += 1
        results.append((name, "FAIL: Server not running"))
    except Exception as e:
        print(f"FAIL: Unexpected error - {e}")
        failed += 1
        results.append((name, f"FAIL: {e}"))


# ============================================
# TEST 1: Home endpoint
# ============================================
def test_home():
    r = requests.get(f"{BASE_URL}/")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert "message" in data, "Response missing 'message' field"
    print(f"   Status: {r.status_code}")
    print(f"   Message: {data['message']}")


# ============================================
# TEST 2: Health check
# ============================================
def test_health():
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert r.json()["status"] == "healthy"
    print(f"   Status: healthy")


# ============================================
# TEST 3: Predict info (model details)
# ============================================
def test_predict_info():
    r = requests.get(f"{BASE_URL}/predict/info")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert data["loaded"] is True, "Model not loaded!"
    print(f"   Model: {data['model_type']}")
    print(f"   Trees: {data['n_estimators']}")
    print(f"   Features: {data['feature_count']}")


# ============================================
# TEST 4: Predict valid input - small house
# ============================================
def test_predict_small_house():
    payload = {
        "bedrooms": 1,
        "bathrooms": 1,
        "size_sqft": 600,
        "location": "Industrial",
        "age": 45
    }
    r = requests.post(f"{BASE_URL}/predict", json=payload)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert "predicted_price" in data
    assert data["predicted_price"] > 0
    print(f"   Small house predicted: ${data['predicted_price']:,.2f}")


# ============================================
# TEST 5: Predict valid input - mansion
# ============================================
def test_predict_mansion():
    payload = {
        "bedrooms": 6,
        "bathrooms": 4,
        "size_sqft": 4500,
        "location": "Beachside",
        "age": 1
    }
    r = requests.post(f"{BASE_URL}/predict", json=payload)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data["predicted_price"] > 800000, "Mansion should be > $800k"
    print(f"   Mansion predicted: ${data['predicted_price']:,.2f}")


# ============================================
# TEST 6: Predict - missing field rejection
# ============================================
def test_predict_missing_field():
    payload = {"bedrooms": 3}  # missing required fields
    r = requests.post(f"{BASE_URL}/predict", json=payload)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    assert "error" in r.json()
    print(f"   Correctly rejected: {r.json()['error']}")


# ============================================
# TEST 7: Predict - wrong type rejection
# ============================================
def test_predict_wrong_type():
    payload = {
        "bedrooms": "three",  # string instead of number
        "bathrooms": 2,
        "size_sqft": 1500,
        "location": "Downtown",
        "age": 5
    }
    r = requests.post(f"{BASE_URL}/predict", json=payload)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    print(f"   Correctly rejected: {r.json()['error']}")


# ============================================
# TEST 8: Predict - negative value rejection
# ============================================
def test_predict_negative():
    payload = {
        "bedrooms": -1,
        "bathrooms": 2,
        "size_sqft": 1500,
        "location": "Downtown",
        "age": 5
    }
    r = requests.post(f"{BASE_URL}/predict", json=payload)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    print(f"   Correctly rejected: {r.json()['error']}")


# ============================================
# TEST 9: Predict - empty body rejection
# ============================================
def test_predict_empty():
    r = requests.post(f"{BASE_URL}/predict", json=None)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    print(f"   Correctly rejected: {r.json()['error']}")


# ============================================
# TEST 10: Auth ping
# ============================================
def test_auth_ping():
    r = requests.get(f"{BASE_URL}/auth/ping")
    assert r.status_code == 200
    print(f"   {r.json()['message']}")


# ============================================
# TEST 11: Property ping
# ============================================
def test_property_ping():
    r = requests.get(f"{BASE_URL}/properties/ping")
    assert r.status_code == 200
    print(f"   {r.json()['message']}")


# ============================================
# RUN ALL TESTS
# ============================================
if __name__ == "__main__":
    print("=" * 60)
    print(" BACKEND API TEST SUITE")
    print(f" Target: {BASE_URL}")
    print("=" * 60)

    test("1. Home endpoint",                  test_home)
    test("2. Health check",                   test_health)
    test("3. Model info (/predict/info)",     test_predict_info)
    test("4. Predict small house",            test_predict_small_house)
    test("5. Predict mansion",                test_predict_mansion)
    test("6. Reject missing fields",          test_predict_missing_field)
    test("7. Reject wrong type",              test_predict_wrong_type)
    test("8. Reject negative value",          test_predict_negative)
    test("9. Reject empty body",              test_predict_empty)
    test("10. Auth blueprint ping",           test_auth_ping)
    test("11. Property blueprint ping",       test_property_ping)

    # ============================================
    # FINAL REPORT
    # ============================================
    print("\n" + "=" * 60)
    print(" FINAL REPORT")
    print("=" * 60)
    for name, status in results:
        marker = "[PASS]" if status == "PASS" else "[FAIL]"
        print(f" {marker} {name}")
    print("=" * 60)
    print(f" PASSED: {passed} / {passed + failed}")
    print(f" FAILED: {failed} / {passed + failed}")
    print("=" * 60)

    # Exit code 0 = all good, 1 = some failed (useful for automation)
    sys.exit(0 if failed == 0 else 1)
