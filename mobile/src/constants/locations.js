// ============================================
// RWANDA LOCATIONS (mirrors the web project)
// ============================================

export const DISTRICTS = ["Gasabo", "Kicukiro", "Nyarugenge"];

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

export const ALL_SECTORS = Object.values(SECTORS_BY_DISTRICT).flat();

export const PROPERTY_TYPES_HOUSE = ["house", "villa", "apartment", "townhouse"];
export const ALL_PROPERTY_TYPES = [...PROPERTY_TYPES_HOUSE, "land"];

export const ROAD_ACCESS = ["paved", "dirt"];
export const SLOPES = ["flat", "gentle", "steep"];
