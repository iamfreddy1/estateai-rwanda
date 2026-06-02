# ============================================
# UNIFIED LISTING SCHEMA
# ============================================
# Every source (HouseInRwanda, QuickHomes, agencies, Facebook, public datasets,
# future APIs) is normalized into THIS one shape. Downstream code (geocoder,
# fraud, model, DB) only ever sees a Listing - sources stay swappable.
from dataclasses import dataclass, field, asdict
from typing import Optional, List
from datetime import datetime

@dataclass
class Listing:
    source: str                      # "houseinrwanda" | "quickhomes" | ...
    source_id: str                   # stable id within that source
    url: Optional[str] = None
    title: Optional[str] = None
    price: Optional[float] = None
    currency: str = "RWF"
    type: Optional[str] = None       # "buy" | "rent"
    property_type: Optional[str] = None
    district: Optional[str] = None
    sector: Optional[str] = None
    cell: Optional[str] = None
    village: Optional[str] = None
    address: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    size_sqft: Optional[float] = None
    land_size: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geo_precision: Optional[str] = None      # cell | sector | address
    images: List[str] = field(default_factory=list)
    description: Optional[str] = None
    luxury_score: Optional[int] = None
    amenities: List[str] = field(default_factory=list)
    risk_score: Optional[int] = None
    scraped_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    raw: dict = field(default_factory=dict)  # original parsed payload (audit trail)

    def to_dict(self):
        return asdict(self)
