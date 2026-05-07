// ============================================
// SHARED CONSTANTS (Rwanda Edition)
// ============================================
// Districts, sectors, property types — used by every form & filter

export const DISTRICTS = ["Gasabo", "Kicukiro", "Nyarugenge"];

// Sector list grouped by district
export const SECTORS_BY_DISTRICT = {
  Gasabo: [
    "Nyarutarama",
    "Kimihurura",
    "Kacyiru",
    "Gacuriro",
    "Remera",
    "Kibagabaga",
    "Gisozi",
  ],
  Kicukiro: ["Kicukiro Center", "Kanombe", "Gahanga"],
  Nyarugenge: ["Nyamirambo", "Nyarugenge Town", "Gitega"],
};

// Flat list of all sectors
export const ALL_SECTORS = Object.values(SECTORS_BY_DISTRICT).flat();

export const PROPERTY_TYPES_HOUSE = ["house", "villa", "apartment", "townhouse"];
export const ALL_PROPERTY_TYPES = [...PROPERTY_TYPES_HOUSE, "land"];

export const ROAD_ACCESS = ["paved", "dirt"];
export const SLOPES = ["flat", "gentle", "steep"];
