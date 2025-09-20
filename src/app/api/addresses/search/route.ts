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
      const queryLower = query.toLowerCase();
      const aText = a.adressetekst.toLowerCase();
      const bText = b.adressetekst.toLowerCase();

      // Check for exact matches first
      const aExact = aText === queryLower;
      const bExact = bText === queryLower;

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Then check if it starts with the query
      const aStarts = aText.startsWith(queryLower);
      const bStarts = bText.startsWith(queryLower);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // For similar matches, sort by string similarity
      // Prefer addresses where the street name exactly matches what was typed
      const aStreetMatch = a.streetName?.toLowerCase() === query.split(/\s+/)[0]?.toLowerCase();
      const bStreetMatch = b.streetName?.toLowerCase() === query.split(/\s+/)[0]?.toLowerCase();

      if (aStreetMatch && !bStreetMatch) return -1;
      if (!aStreetMatch && bStreetMatch) return 1;

      // Finally, sort alphabetically by municipality for identical addresses
      return `${a.adressetekst} ${a.municipality}`.localeCompare(`${b.adressetekst} ${b.municipality}`);
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