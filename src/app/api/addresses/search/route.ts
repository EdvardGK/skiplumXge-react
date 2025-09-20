import { NextRequest, NextResponse } from 'next/server';
import { getPriceZoneByKommune } from '@/services/zone.service';

// Kartverket API endpoint for address search
const KARTVERKET_API_URL = 'https://ws.geonorge.no/adresser/v1/sok';

interface KartverketAddress {
  adressetekst: string;
  adressenavn: string;
  husnummer: string;
  bokstav?: string;
  postnr: string;
  poststed: string;
  kommunenavn: string;
  kommunenummer: string;
  gardsnummer?: string;
  bruksnummer?: string;
  representasjonspunkt: {
    epsg: string;
    lat: number;
    lon: number;
  };
  objtype: string;
  adressekode: string;
  nummer?: string;
}

interface KartverketSearchResponse {
  metadata: {
    totaltAntallTreff: number;
    viserFra: number;
    viserTil: number;
    sokestreng: string;
  };
  adresser: KartverketAddress[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = searchParams.get('limit') || '10';

    if (!query || query.length < 3) {
      return NextResponse.json(
        { error: 'Query must be at least 3 characters long' },
        { status: 400 }
      );
    }

    // Prepare Kartverket API request
    const kartverketParams = new URLSearchParams({
      sok: query,
      fuzzy: 'true', // Enable fuzzy matching for better results
      treffPerSide: limit,
      side: '0',
      utkoordsys: '4326', // WGS84 coordinate system
    });

    const kartverketUrl = `${KARTVERKET_API_URL}?${kartverketParams}`;

    console.log('Fetching from Kartverket:', kartverketUrl);

    // Fetch from Kartverket API
    const response = await fetch(kartverketUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // Cache for 5 minutes to reduce API calls
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      console.error('Kartverket API error:', response.status);
      throw new Error(`Kartverket API returned status ${response.status}`);
    }

    const data: KartverketSearchResponse = await response.json();

    // Transform Kartverket data to our Address format (fast, no building data)
    const addresses = await Promise.all(
      data.adresser.map(async (addr) => {
        // Look up electricity price zone for this municipality
        const priceZone = await getPriceZoneByKommune(addr.kommunenummer);

        return {
          adressetekst: addr.adressetekst,
          coordinates: {
            lat: addr.representasjonspunkt.lat,
            lon: addr.representasjonspunkt.lon,
          },
          municipality: addr.kommunenavn,
          postalCode: addr.postnr,
          postalPlace: addr.poststed,
          streetName: addr.adressenavn,
          houseNumber: addr.husnummer,
          houseLetter: addr.bokstav,
          municipalityNumber: addr.kommunenummer,
          priceZone: priceZone,
          matrikkel: {
            gardsnummer: addr.gardsnummer,
            bruksnummer: addr.bruksnummer,
            bygningsnummer: undefined, // Will be set when user selects building
            buildingId: null,
            propertyId: null,
            buildingType: null,
            buildingYear: null,
            totalArea: null,
            heatedArea: null,
          },
        };
      })
    );

    // All addresses are valid now (no filtering)
    const validAddresses = addresses;

    // Sort addresses to prioritize exact matches and better relevance
    const sortedAddresses = validAddresses.sort((a, b) => {
      const queryLower = query.toLowerCase().trim();
      const aText = a.adressetekst.toLowerCase().trim();
      const bText = b.adressetekst.toLowerCase().trim();

      // Normalize for better matching (remove extra spaces, handle special chars)
      const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim();
      const queryNormalized = normalizeText(queryLower);
      const aNormalized = normalizeText(aText);
      const bNormalized = normalizeText(bText);

      // Debug logging for the specific query
      if (queryLower.includes('jørgen') && queryLower.includes('2')) {
        if (aText.includes('2') && !aText.includes('20')) {
          console.log(`Checking address: "${aText}" vs query: "${queryLower}"`);
        }
      }

      // 1. EXACT MATCHES get highest priority
      const aExact = aNormalized === queryNormalized;
      const bExact = bNormalized === queryNormalized;

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // 2. STARTS WITH full query (high priority)
      const aStartsWithQuery = aNormalized.startsWith(queryNormalized);
      const bStartsWithQuery = bNormalized.startsWith(queryNormalized);

      if (aStartsWithQuery && !bStartsWithQuery) return -1;
      if (!aStartsWithQuery && bStartsWithQuery) return 1;

      // 3. Extract street name and house number for better matching
      const parseAddress = (addr: string) => {
        const parts = addr.split(/\s+/);
        const numberIndex = parts.findIndex(part => /^\d/.test(part));

        if (numberIndex > 0) {
          return {
            street: parts.slice(0, numberIndex).join(' '),
            number: parts.slice(numberIndex).join(' ')
          };
        }
        return { street: addr, number: '' };
      };

      const queryParsed = parseAddress(queryNormalized);
      const aParsed = parseAddress(aNormalized);
      const bParsed = parseAddress(bNormalized);

      // 4. STREET + NUMBER exact match (very high priority)
      const aStreetNumberMatch = aParsed.street === queryParsed.street && aParsed.number === queryParsed.number;
      const bStreetNumberMatch = bParsed.street === queryParsed.street && bParsed.number === queryParsed.number;

      if (aStreetNumberMatch && !bStreetNumberMatch) return -1;
      if (!aStreetNumberMatch && bStreetNumberMatch) return 1;

      // 5. STREET exact match (medium priority)
      const aStreetMatch = aParsed.street === queryParsed.street;
      const bStreetMatch = bParsed.street === queryParsed.street;

      if (aStreetMatch && !bStreetMatch) return -1;
      if (!aStreetMatch && bStreetMatch) return 1;

      // 6. CONTAINS all query words (lower priority)
      const queryWords = queryNormalized.split(/\s+/);
      const aContainsAll = queryWords.every(word => aNormalized.includes(word));
      const bContainsAll = queryWords.every(word => bNormalized.includes(word));

      if (aContainsAll && !bContainsAll) return -1;
      if (!aContainsAll && bContainsAll) return 1;

      // 7. String length (shorter addresses first - more specific)
      const lengthDiff = aText.length - bText.length;
      if (Math.abs(lengthDiff) > 10) return lengthDiff;

      // 8. Finally, sort alphabetically
      return aText.localeCompare(bText);
    });

    // Return the transformed and sorted addresses
    return NextResponse.json({
      query: query,
      totalResults: data.metadata.totaltAntallTreff,
      addresses: sortedAddresses,
    });

  } catch (error) {
    console.error('Address search error:', error);

    // Return a user-friendly error message
    return NextResponse.json(
      {
        error: 'Kunne ikke søke etter adresser. Vennligst prøv igjen senere.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}