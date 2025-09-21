# API Response Overview - Norwegian Energy Analysis Platform

**Date:** 2025-01-21
**Status:** Live Production APIs
**Purpose:** Reference guide for all external and internal API responses used in the map and building detection systems

---

## 1. Kartverket Address Search API

**Endpoint:** `https://ws.geonorge.no/adresser/v1/sok`
**Purpose:** Official Norwegian address lookup and geocoding
**Usage:** Convert user-entered addresses to coordinates and matrikkel data

### Request Format
```
GET /adresser/v1/sok?sok={address}&treffPerSide=10
```

### Response Structure
```json
{
  "metadata": {
    "totaltAntallTreff": 1,
    "side": 1,
    "treffPerSide": 10,
    "totaltAntallSider": 1
  },
  "adresser": [
    {
      "adressetekst": "Karl Johans gate 1",
      "adressenavn": "Karl Johans gate",
      "nummer": "1",
      "postnummer": "0154",
      "poststed": "OSLO",
      "kommunenummer": "0301",
      "kommunenavn": "OSLO",
      "fylkesnummer": "03",
      "fylkesnavn": "OSLO",
      "representasjonspunkt": {
        "epsg": "EPSG:4258",
        "lat": 59.911377495060904,
        "lon": 10.749403964838676,
        "nøyaktighet": 1
      },
      "matrikkelenhet": {
        "kommunenummer": "0301",
        "gardsnummer": 209,
        "bruksnummer": 32,
        "undernummer": null,
        "matrikkelenhetstype": "Eiendom"
      }
    }
  ]
}
```

### Key Fields Used
- `adressetekst`: Full formatted address
- `representasjonspunkt.lat/lon`: Coordinates for map centering
- `matrikkelenhet.gardsnummer/bruksnummer`: Property identifiers for building lookup
- `kommunenavn`: Municipality name for display

---

## 2. OpenStreetMap Overpass API

**Endpoint:** `https://overpass-api.de/api/interpreter`
**Purpose:** Real building footprint data and property information
**Usage:** Display actual building polygons on map with detailed metadata

### Request Format (Overpass QL)
```
[out:json][timeout:25];
(
  way["building"](around:100,59.9139,10.7522);
  relation["building"]["type"="multipolygon"](around:100,59.9139,10.7522);
);
out body;
>;
out skel qt;
```

### Response Structure
```json
{
  "version": 0.6,
  "generator": "Overpass API 0.7.57",
  "elements": [
    {
      "type": "way",
      "id": 43364377,
      "nodes": [526508280, 526508281, 526508282, 526508283, 526508280],
      "tags": {
        "building": "retail",
        "building:levels": "3",
        "name": "Gunerius",
        "opening_hours": "Mo-Fr 09:00-20:00, Sa 10:00-18:00",
        "ref:bygningsnr": "80653670",
        "roof:shape": "flat",
        "shop": "mall",
        "wheelchair": "yes",
        "addr:street": "Storgata",
        "addr:housenumber": "32",
        "wikidata": "Q11973263"
      }
    },
    {
      "type": "node",
      "id": 526508280,
      "lat": 59.9118234,
      "lon": 10.7489567
    }
  ]
}
```

### Building Types Found
- `retail`: Shopping centers, stores
- `hotel`: Hotels and accommodation
- `residential`: Housing buildings
- `office`: Office buildings
- `commercial`: Commercial properties
- `industrial`: Industrial buildings
- `public`: Public buildings

### Key Norwegian-Specific Tags
- `ref:bygningsnr`: Official Norwegian building number
- `building:levels`: Number of floors
- `addr:street` / `addr:housenumber`: Norwegian address components

### Processed Building Data Structure
```typescript
interface BuildingData {
  id: string;              // OSM element ID
  type: string;            // Building type (retail, hotel, etc.)
  coordinates: [number, number][]; // Polygon coordinates for map display
  area?: number;           // Calculated building area in m²
  levels?: number;         // Number of floors
  height?: number;         // Building height in meters
  name?: string;           // Building name
  address?: string;        // Formatted address
  bygningsnummer?: string; // Norwegian building number
}
```

---

## 3. Internal Building Detection API

**Endpoint:** `/api/buildings/detect`
**Purpose:** Check for existing energy certificates in Norwegian Enova database
**Database:** Supabase `energy_certificates` table

### Request Format
```
GET /api/buildings/detect?gnr=209&bnr=32&address=Karl%20Johans%20gate%201
```

### Response Structure
```json
{
  "hasMultipleBuildings": false,
  "buildingCount": 1,
  "buildings": [
    {
      "bygningsnummer": "1",
      "energyClass": "C",
      "buildingCategory": "Kontor",
      "energyConsumption": 175,
      "constructionYear": 1987,
      "isRegistered": true
    }
  ]
}
```

### Database Schema (energy_certificates)
```sql
CREATE TABLE energy_certificates (
  id UUID PRIMARY KEY,
  gnr INTEGER NOT NULL,                    -- Gardsnummer (property number)
  bnr INTEGER NOT NULL,                    -- Bruksnummer (use number)
  building_number TEXT DEFAULT '1',        -- Building number on property
  energy_class TEXT,                       -- A+ to G rating
  building_category TEXT,                  -- Kontor, Bolig, etc.
  energy_consumption NUMERIC,             -- kWh/m²/year
  construction_year INTEGER,              -- Year built
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Energy Classes (Norwegian Standard)
- `A+`: < 50 kWh/m²/år
- `A`: 50-75 kWh/m²/år
- `B`: 75-100 kWh/m²/år
- `C`: 100-125 kWh/m²/år
- `D`: 125-150 kWh/m²/år
- `E`: 150-200 kWh/m²/år
- `F`: 200-250 kWh/m²/år
- `G`: > 250 kWh/m²/år

---

## 4. Additional Data Sources Referenced

### 4.1 SSB Electricity Prices
**Source:** `src/data/ssb-electricity-prices.json`
**Purpose:** Norwegian electricity price data by region

```json
{
  "NO1": {
    "zone": "NO1",
    "name": "Oslo/Øst-Norge",
    "averagePrice36Months": 330,
    "unit": "øre/kWh",
    "lastUpdated": "2024-12-15"
  }
}
```

### 4.2 TEK17 Building Requirements
**Source:** Hardcoded in `src/lib/energy-calculations.ts`
**Purpose:** Norwegian building regulation compliance checking

```typescript
const TEK17_REQUIREMENTS = {
  'Småhus': 115,        // kWh/m²/år
  'Flerbolig': 110,     // kWh/m²/år
  'Kontor': 115,        // kWh/m²/år
  'Handel': 145,        // kWh/m²/år
  'Skole': 110,         // kWh/m²/år
  'Barnehage': 110,     // kWh/m²/år
  'Sykehus': 270,       // kWh/m²/år
  'Hotell': 190,        // kWh/m²/år
  'Kultur': 135,        // kWh/m²/år
  'Idrett': 85,         // kWh/m²/år
  'Industri': 180,      // kWh/m²/år
  'Andre': 115          // kWh/m²/år
};
```

### 4.3 SINTEF Energy Distribution
**Source:** Hardcoded Norwegian energy research standards
**Purpose:** Energy system breakdown for investment calculations

```typescript
const SINTEF_DISTRIBUTION = {
  heating: 70,      // % of total energy use
  lighting: 15,     // % of total energy use
  other: 15         // % of total energy use (ventilation, equipment, etc.)
};
```

---

## 5. Data Flow Summary

### Map Rendering Flow
1. **Address Input** → Kartvervet API → Coordinates + Matrikkel
2. **Coordinates** → OpenStreetMap Overpass → Building Polygons
3. **Matrikkel (gnr/bnr)** → Internal API → Energy Certificate Data
4. **Combined Data** → Map Visualization with Building Details

### Building Information Assembly
```typescript
interface CompletePropertyData {
  // From Kartverket
  address: string;
  coordinates: { lat: number; lon: number };
  municipality: string;
  matrikkel: { gnr: number; bnr: number };

  // From OpenStreetMap
  buildingFootprints: BuildingData[];
  nearbyBuildings: BuildingData[];

  // From Internal Database
  energyCertificates: EnergyCertificate[];
  hasMultipleBuildings: boolean;

  // From Static Data
  electricityPriceZone: string;
  tek17Requirement: number;
  sintefDistribution: { heating: number; lighting: number; other: number };
}
```

---

## 6. API Reliability & Fallbacks

### Primary Endpoints
- **Kartverket**: 99.9% uptime, official government API
- **OpenStreetMap**: 99%+ uptime, multiple fallback servers available
- **Internal Supabase**: 99.9% uptime, managed database

### Fallback Strategies
1. **OSM Backup**: Secondary Overpass server (`overpass.kumi.systems`)
2. **Missing Certificates**: Assume unregistered building (Grade unknown)
3. **Geocoding Failure**: Manual coordinate entry option
4. **Map Loading Failure**: Simple marker fallback display

---

## 7. Rate Limits & Usage Notes

### External APIs
- **Kartverket**: No documented rate limits for reasonable use
- **OpenStreetMap**: Recommended max 2 requests/second
- **Internal APIs**: 60 requests/minute per IP (configured)

### Data Freshness
- **Kartverket**: Real-time official registry
- **OpenStreetMap**: Community-updated, typically within weeks
- **Energy Certificates**: Updated as certificates are issued
- **Electricity Prices**: Updated monthly from SSB data

---

## 8. Norwegian Compliance Notes

### Data Sources Compliance
- **Kartverket**: Official government source, GDPR compliant
- **OpenStreetMap**: Open data, no personal information
- **Enova Certificates**: Public registry data, anonymized
- **No Personal Data**: All APIs return only property/building data

### Language Support
- **API Responses**: Mixed Norwegian/English field names
- **UI Display**: All Norwegian (Bokmål) for user-facing content
- **Error Messages**: Norwegian for users, English for developers

This overview provides the complete reference for all data sources used in the Norwegian energy analysis platform's map and building detection systems.