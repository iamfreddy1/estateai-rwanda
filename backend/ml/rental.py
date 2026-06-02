# ============================================
# RENTAL INTELLIGENCE  (yield-based heuristic now; ML-ready)
# ============================================
# Estimates monthly rent. We have NO rent-labelled training data yet, so a
# learned rent model would be fiction. Instead we use the relationship real
# investors use: monthly rent ~= sale value x monthly gross yield. Kigali gross
# yields run ~6-9%/yr; prime areas yield LESS (higher capital value), peri-urban
# yields MORE. When real rent listings arrive, train_rent_model() replaces this.
import logging

log = logging.getLogger("rental")

# annual gross rental yield by accessibility tier (Kigali market norms, approx)
#   higher-value central areas -> lower yield; cheaper outer areas -> higher yield
def _annual_yield(accessibility_score):
    if accessibility_score is None:
        return 0.08
    if accessibility_score >= 75:   # prime/central
        return 0.065
    if accessibility_score >= 45:   # mid
        return 0.08
    return 0.095                    # peri-urban


def estimate_rent(sale_value, accessibility_score=None):
    """Return {monthly_rent, annual_yield, basis}."""
    if not sale_value or sale_value <= 0:
        return None
    y = _annual_yield(accessibility_score)
    monthly = sale_value * y / 12.0
    return {"monthly_rent_rwf": round(monthly), "annual_gross_yield": y,
            "basis": "yield-heuristic (no rent training data yet)"}


def train_rent_model(rent_csv):
    """Placeholder: when rent listings exist, reuse train_pipeline with a rent
    target. Kept as a clear hook so the upgrade path is obvious."""
    raise NotImplementedError(
        "Collect rent listings (type='rent') then run train_pipeline on them.")
