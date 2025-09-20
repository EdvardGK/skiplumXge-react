# Government Data Collection Checklist

## High Priority Data Sources

### 1. Enova Energy Certificate Statistics ⚠️
- **URL**: https://www.enova.no/nb/energimerking/energimerkestatistikk
- **Access**: Real-time statistics portal
- **Data Available**:
  - Number of certificates over time
  - Certificates by building type
  - Certificates by energy grade (A-G)
  - Certificates by heating grade
- **Action**: Manual data extraction from portal
- **Status**: ⏳ **REQUIRES MANUAL ACCESS**

### 2. SSB Municipal Electricity Statistics ✅
- **URL**: https://www.ssb.no/en/energi-og-industri/energi/statistikk/elektrisitet
- **Tables**: 14489 and 14490 (2024 updates)
- **Data Available**: Municipality-level electricity consumption
- **Action**: Download CSV files
- **Status**: 🔄 **ACCESSIBLE**

### 3. NVE Spot Price Data ✅
- **Source**: NVE public electricity price statistics
- **Data**: Weekly spot prices by zone (NO1-NO5)
- **Implementation**: Already integrated via Supabase
- **Status**: ✅ **IMPLEMENTED**

### 4. TEK17 Building Requirements ✅
- **Source**: Norwegian building regulations § 14-2
- **Data**: Legal energy requirements by building type
- **Implementation**: Already coded in energy-calculations.ts
- **Status**: ✅ **IMPLEMENTED**

## Secondary Data Sources

### 5. Energy Use in Buildings Overview
- **URL**: https://energifaktanorge.no/en/et-baerekraftig-og-sikkert-energisystem/baerekraftige-bygg/
- **Data**: National building energy context
- **Status**: 📖 **REFERENCE MATERIAL**

### 6. IEA Norway Energy Review
- **Source**: IEA Norway 2022 Energy Policy Review
- **Data**: "Buildings account for 40% of energy consumption"
- **Status**: ✅ **CITED**

## Data Extraction Actions Required

1. **Manual Portal Access**:
   - Access Enova statistics portal
   - Screenshot or extract EPC grade distribution
   - Document methodology and date

2. **SSB Data Download**:
   - Navigate to Tables 14489 and 14490
   - Download municipal electricity data
   - Process for regional comparisons

3. **Create Fact Sheets**:
   - One-page summaries for each data source
   - Key statistics for report claims
   - Source citations and dates

## Verification Standards

- ✅ **Government Official**: Only SSB, NVE, Enova data
- ⚠️ **Commercial Sources**: Statista requires purchase
- 📖 **Industry Sources**: energifaktanorge.no for context
- 🚫 **Avoid**: Unverified or outdated statistics

## Report Claims Status

| Claim | Source | Status | Action |
|-------|--------|--------|--------|
| "Only 3% achieve A-grade" | Enova portal | ⏳ Manual | Extract from portal |
| "Municipal rankings" | SSB tables | 🔄 Download | Access SSB database |
| "Zone price variations" | NVE data | ✅ Done | Already integrated |
| "40% of energy consumption" | IEA report | ✅ Done | Cited and verified |
| "Mandatory since 2010" | NVE requirements | ✅ Done | Regulatory fact |