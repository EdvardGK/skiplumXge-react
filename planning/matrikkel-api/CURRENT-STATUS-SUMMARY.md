# Matrikkel API Integration - Current Status Summary

## 📅 Date: 2025-09-25

## 🔍 What We've Discovered

### 1. Two Different Matrikkel APIs Exist

#### A. **SOAP API (Old/Current)**
- URL Pattern: `https://prodtest.matrikkel.no/matrikkelapi/wsapi/v1/`
- Authentication: Maskinporten + programvarebruker
- Status: **Requires Maskinporten** (not accessible with basic auth)
- Documentation: Well documented in local files

#### B. **REST API (New)**
- Documentation: https://kartverket.github.io/api-dokumentasjon/
- Endpoint mentioned: `/egenregistrert-data/` with access levels:
  - Begrenset (Limited)
  - Utvidet uten personidentifiserende (Extended without PII)
  - Utvidet (Extended)
- Status: **Under development** according to Kartverket
- Authentication: Also requires Maskinporten

### 2. Authentication Requirements

**BOTH APIs require:**
1. ✅ Programvarebruker (we have: `skiplum_matrikkeltest`)
2. ❌ Maskinporten OAuth2 token (we don't have)
3. ❌ Organization agreement with Kartverket
4. ❌ Assigned scope in Maskinporten

### 3. Why Our POC Fails

**Current situation:**
- Username/password alone = **NOT ENOUGH**
- Without Maskinporten = API returns 404 (not even accessible)
- The credentials are only for rights checking, not authentication

## 🚀 What Actually Works NOW

### Kartverket Address Search (REST)
- **URL**: `https://ws.geonorge.no/adresser/v1/sok`
- **Auth**: NONE REQUIRED ✅
- **Status**: WORKING
- **Returns**: Address with matrikkel numbers (gnr/bnr)

This is enough for:
- Address autocomplete
- Getting property identifiers
- Basic location data

## 🛑 What's Blocked

Without Maskinporten, we CANNOT access:
- Building data (bygningstype, BRA, byggeår)
- Property boundaries
- Energy certificates
- Detailed property information

## 📋 Action Items for Skiplum

### Immediate (To unblock development):
1. **Confirm**: Do you have an agreement with Kartverket?
2. **Check**: Is `skiplum_matrikkeltest` an active programvarebruker?
3. **Decide**: Is Maskinporten integration worth it for this project?

### If proceeding with Matrikkel:
1. Apply for API access at Kartverket
2. Get Norwegian organization number confirmed
3. Register in Maskinporten portal
4. Wait for scope assignment
5. Implement OAuth2 flow

### Alternative approach:
- Use only Kartverket address search
- Get building data from other sources (SSB, Enova)
- Focus on energy calculations without detailed building data

## 💻 Current Implementation Status

### ✅ Completed:
- Kartverket address search integration
- UI for property search
- Error handling for missing data
- Documentation of requirements

### ❌ Blocked:
- Matrikkel building data
- Property boundaries
- Detailed property information

### 🔄 Ready when Maskinporten available:
- SOAP client structure
- REST API integration preparedness
- Data models and types

## 🎯 Recommendation

**For MVP/Demo:**
1. Use Kartverket address search (working)
2. Use statistical estimates for building data
3. Show clear messaging about data limitations
4. Prepare for future Maskinporten integration

**For Production:**
- Maskinporten integration is required for real building data
- This requires organizational commitment and legal agreements
- Timeline: Typically 2-4 weeks after application

## 📞 Contacts

- **Kartverket Support**: matrikkelhjelp@kartverket.no
- **Maskinporten**: https://samarbeidsportalen.digdir.no

## 🔗 Resources

- [New REST API Docs](https://kartverket.github.io/api-dokumentasjon/)
- [Maskinporten Docs](https://docs.digdir.no/maskinporten)
- [Working Kartverket Search](https://ws.geonorge.no/adresser/v1/)

---

**Bottom Line**: Without Maskinporten, we can do address search but NOT property data. This is a business/legal requirement, not a technical issue.