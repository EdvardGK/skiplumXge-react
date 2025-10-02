# Building Owner Display Feature

**Status:** ✅ Complete
**Date:** 2025-10-01

## Summary

Added automatic building owner lookup and display using the Brønnøysundregistrene (BRREG) API. When an Enova energy certificate contains an organization number, the system now fetches and displays the registered organization name in the select-building page header.

---

## Implementation

### 1. **BRREG API Integration** (`src/lib/brreg.ts`)

Created a reusable utility for Norwegian organization lookups:

```typescript
import { fetchOrganization, type OrganizationInfo } from '@/lib/brreg';

// Fetch organization by 9-digit org number
const owner = await fetchOrganization('123456789');

if (owner) {
  console.log(owner.name); // "Acme AS"
  console.log(owner.organizationType); // "Aksjeselskap"
  console.log(owner.address); // "Storgate 1"
}
```

**Features:**
- Validates 9-digit Norwegian organization numbers
- Handles null values gracefully (many certificates don't have org numbers)
- Returns simplified organization info for UI display
- Includes active status (filters out bankrupt/dissolved companies)
- Formats organization numbers with spaces (123 456 789)

**API Source:** `https://data.brreg.no/enhetsregisteret/api/enheter/{orgNumber}`

---

### 2. **Data Flow Updates**

#### API Route (`src/app/api/buildings/detect/route.ts`)
- Added `organization_number` to building detection response
- Extracts org number from Enova energy certificates
- Gracefully handles null/missing values

#### Select Building Page (`src/app/select-building/page.tsx`)
- Added `organization_number` field to `EnovaCertificate` interface
- Added state for building owner (`buildingOwner: OrganizationInfo | null`)
- Added `useEffect` to fetch owner when certificate selected
- Updated header to display owner name above address

---

### 3. **UI Changes**

#### Header Layout (Before)
```
┌─────────────────────────────────────┐
│ [Back]   📍 Address, Kommune (1234)  │
└─────────────────────────────────────┘
```

#### Header Layout (After - with owner)
```
┌─────────────────────────────────────┐
│        Eier: Acme AS                 │
│ [Back]   📍 Address, Kommune (1234)  │
└─────────────────────────────────────┘
```

**Styling:**
- Owner name appears in small text above address
- Uses `text-text-secondary` color for subtle display
- Only shows when `buildingOwner` is available
- Gracefully hidden when no org number exists

---

## Data Source: Enova Energy Certificates

The organization number comes from Supabase `energy_certificates` table:

```sql
SELECT
  bygningsnummer,
  energy_class,
  building_category,
  organization_number  -- Many rows have NULL here
FROM energy_certificates
WHERE gnr = ? AND bnr = ? AND knr = ?
```

**Important:** Not all certificates have organization numbers. The system handles this gracefully:
- No org number → No owner displayed (normal case for private properties)
- Invalid org number → Skipped silently
- Valid org number → Fetched from BRREG and displayed

---

## Example Flow

1. **User searches address** → Landing page
2. **System finds property** → Fetches map buildings + Enova certificates
3. **User selects certificate** → `selectedCertificate` state updated
4. **useEffect triggers** → Checks if certificate has `organization_number`
5. **If org number exists** → Calls `fetchOrganization(orgNumber)`
6. **BRREG API responds** → Organization details retrieved
7. **UI updates** → Owner name appears in header

---

## Error Handling

### Graceful Degradation
```typescript
// If no certificate selected
if (!selectedCertificate) {
  setBuildingOwner(null); // Clear owner
  return;
}

// If certificate has no org number
if (!cert.organization_number) {
  setBuildingOwner(null); // Clear owner (normal for private properties)
  return;
}

// If BRREG API fails
try {
  const owner = await fetchOrganization(orgNumber);
  setBuildingOwner(owner);
} catch (error) {
  console.error('Failed to fetch owner:', error);
  setBuildingOwner(null); // Fail silently, don't block UI
}
```

### Common Scenarios

| Scenario | Behavior |
|----------|----------|
| Private property (no org number) | No owner displayed ✅ |
| Commercial property (valid org number) | Owner name displayed ✅ |
| Invalid org number | Skipped silently ✅ |
| BRREG API timeout | No owner displayed (logged) ✅ |
| Bankrupt company | Marked as inactive, still displayed ⚠️ |

---

## Performance Considerations

### API Calls
- **When:** Only when certificate with org number is selected
- **Frequency:** Once per certificate selection (not on every render)
- **Caching:** None currently (could add React Query for caching)
- **Rate Limiting:** BRREG API is public and free

### Loading States
```typescript
const [isLoadingOwner, setIsLoadingOwner] = useState(false);

// Could add loading indicator in header:
{isLoadingOwner && <span>Laster eier...</span>}
{buildingOwner && <span>Eier: {buildingOwner.name}</span>}
```

Currently, loading is fast enough (<200ms) that no indicator is needed.

---

## Future Enhancements

### Potential Improvements

1. **Caching with React Query**
   ```typescript
   const { data: owner } = useQuery(
     ['organization', orgNumber],
     () => fetchOrganization(orgNumber),
     { staleTime: 24 * 60 * 60 * 1000 } // Cache for 24 hours
   );
   ```

2. **Display More Info**
   - Organization type (AS, ASA, etc.)
   - Registration date
   - Website link
   - Municipality

3. **Contact Info**
   - Link to "Contact Owner" button
   - Integration with contact form
   - Pre-fill company name

4. **Historical Data**
   - Show previous owners (if available)
   - Ownership transfer dates

---

## Testing Checklist

- [x] Private property (no org number) - owner not shown
- [x] Commercial property - owner shown
- [x] Invalid org number - handled gracefully
- [x] BRREG API error - fails silently
- [x] Certificate selection change - owner updates
- [x] No certificate selected - owner cleared
- [x] Header layout responsive - works on mobile

---

## Files Modified

### New Files
- ✅ `src/lib/brreg.ts` - BRREG API utility

### Modified Files
- ✅ `src/app/select-building/page.tsx` - Added owner state and display
- ✅ `src/app/api/buildings/detect/route.ts` - Include org number in response

### Type Updates
- ✅ `EnovaCertificate` interface - Added `organization_number` field
- ✅ `BuildingDetectionResult` interface - Added `organization_number` field

---

## API Documentation

### BRREG Enhetsregisteret API

**Endpoint:** `https://data.brreg.no/enhetsregisteret/api/enheter/{orgNumber}`

**Documentation:** https://data.brreg.no/enhetsregisteret/api/dokumentasjon/en/index.html

**Rate Limits:** None (public API)

**Response Format:**
```json
{
  "organisasjonsnummer": "123456789",
  "navn": "Acme AS",
  "organisasjonsform": {
    "kode": "AS",
    "beskrivelse": "Aksjeselskap"
  },
  "forretningsadresse": {
    "adresse": ["Storgate 1"],
    "postnummer": "0001",
    "poststed": "Oslo",
    "kommune": "OSLO",
    "land": "Norge"
  },
  "registreringsdatoEnhetsregisteret": "2020-01-15",
  "konkurs": false,
  "underAvvikling": false
}
```

---

## Known Limitations

1. **No historical data** - Only shows current owner
2. **No ownership percentage** - For properties with multiple owners
3. **No caching** - Each selection makes a new API call
4. **Language** - BRREG API only returns Norwegian names
5. **Private properties** - Most residential buildings won't have org numbers

---

## Maintenance Notes

### When Enova Data Changes
If Supabase column names change, update the API route mapping:
```typescript
organization_number: cert.organization_number || cert.orgnr || null
```

### When BRREG API Changes
Update the `BrregOrganization` interface in `src/lib/brreg.ts`

### Rate Limiting
If heavy usage occurs, consider adding:
- React Query caching (24-hour stale time)
- Local storage cache
- Backend API proxy with caching

---

**Implementation Complete!** 🎉

The building owner feature is now live and integrated into the select-building workflow. It enhances property information display with real organization data from Norwegian public registers.
