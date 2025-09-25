import { NextRequest } from 'next/server';
import { createSecureResponse, createSecureErrorResponse, rateLimit, getClientIP } from '@/lib/security';
import { getClimateData, getCoordinatesFromPostalCode, ClimateData } from '@/lib/frost-api';

export interface ClimateAnalysisResponse {
  climateData: ClimateData | null;
  climateContext: {
    zone: string;
    description: string;
    heatingDegreeDays: number;
    nationalAverage: number;
    percentageVsAverage: number;
  };
  buildingEnergyContext: {
    expectedExtraHeating: number; // percentage above baseline
    climateFactor: number; // multiplier for energy consumption
    seasonalPattern: {
      winter: string;
      summer: string;
    };
  };
  recommendations: string[];
  dataQuality: 'excellent' | 'good' | 'limited' | 'unavailable';
  lastUpdated: string;
}

// Norwegian climate zone descriptions
const CLIMATE_ZONE_DESCRIPTIONS: Record<string, string> = {
  'arctic': 'Arktisk klima med ekstreme vinterforhold og høyt energibehov',
  'subarctic': 'Subarktisk klima med lange, kalde vintre',
  'maritime_west': 'Mildt kystklima med høy luftfuktighet og moderat energibehov',
  'continental_east': 'Kontinentalt klima med kalde vintre og varme somre',
  'mountain': 'Fjellklima med store temperaturvariasjoner',
  'temperate_south': 'Temperert sørlig klima med moderate årstidsvariasjoner'
};

// Norwegian heating degree day averages by region
const NATIONAL_HDD_AVERAGES: Record<string, number> = {
  'arctic': 5200,
  'subarctic': 4400,
  'maritime_west': 3000,
  'continental_east': 3600,
  'mountain': 4000,
  'temperate_south': 2800
};

// Building energy recommendations by climate zone
const CLIMATE_RECOMMENDATIONS: Record<string, string[]> = {
  'arctic': [
    'Ekstra isolasjon er kritisk i arktisk klima',
    'Tett bygningsskall for å unngå varmetap',
    'Effektive oppvarmingssystemer med backup',
    'Vindtette vinduer og dører'
  ],
  'subarctic': [
    'Høy isolasjonsstandard anbefales',
    'Effektive varmepumper for lang vinter',
    'God ventilasjon for å unngå fuktproblemer'
  ],
  'maritime_west': [
    'Fuktbestandige materialer for kystklima',
    'Balansert ventilasjon mot høy luftfuktighet',
    'Moderat isolasjon tilstrekkelig'
  ],
  'continental_east': [
    'Isolasjon mot både kulde og varme',
    'Kjølesystem kan være nødvendig om sommeren',
    'Sesongbasert energioptimering'
  ],
  'mountain': [
    'Ekstrem isolasjon mot store temperaturvariasjoner',
    'Robuste bygningsløsninger for været',
    'Backup oppvarmingssystemer anbefales'
  ],
  'temperate_south': [
    'Standard isolasjon ofte tilstrekkelig',
    'Fokus på energieffektive vinduer',
    'Balansert ventilasjon for komfort'
  ]
};

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`climate-data:${clientIP}`, 50, 60000);

    if (!rateLimitResult.allowed) {
      return createSecureErrorResponse('Rate limit exceeded. Please try again later.', 429);
    }

    const searchParams = request.nextUrl.searchParams;
    const latitude = parseFloat(searchParams.get('lat') || '0');
    const longitude = parseFloat(searchParams.get('lng') || '0');
    const postalCode = searchParams.get('postal_code');
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;

    // Validate input
    let coords = { lat: latitude, lng: longitude };

    if ((!latitude || !longitude) && postalCode) {
      // Try to get coordinates from postal code
      const postalCoords = await getCoordinatesFromPostalCode(postalCode);
      if (postalCoords) {
        coords = postalCoords;
      } else {
        return createSecureErrorResponse('Could not determine location from postal code', 400);
      }
    } else if (!latitude || !longitude) {
      return createSecureErrorResponse('Latitude and longitude or postal_code required', 400);
    }

    // Validate coordinates are within Norway
    if (coords.lat < 57.5 || coords.lat > 71.5 || coords.lng < 4 || coords.lng > 32) {
      return createSecureErrorResponse('Coordinates must be within Norway', 400);
    }

    console.log(`Fetching climate data for coordinates: ${coords.lat}, ${coords.lng}`);

    // Get climate data from Frost API
    const climateData = await getClimateData(coords.lat, coords.lng, year);

    let dataQuality: 'excellent' | 'good' | 'limited' | 'unavailable' = 'unavailable';
    let climateContext: any = null;
    let buildingEnergyContext: any = null;
    let recommendations: string[] = [];

    if (climateData) {
      dataQuality = climateData.dataQuality;

      // Calculate climate context
      const nationalAvg = NATIONAL_HDD_AVERAGES[climateData.climateZone] || 3200;
      const percentageVsAverage = ((climateData.heatingDegreeDays - nationalAvg) / nationalAvg) * 100;

      climateContext = {
        zone: climateData.climateZone,
        description: CLIMATE_ZONE_DESCRIPTIONS[climateData.climateZone] || 'Ukjent klimasone',
        heatingDegreeDays: climateData.heatingDegreeDays,
        nationalAverage: nationalAvg,
        percentageVsAverage: Math.round(percentageVsAverage)
      };

      // Calculate building energy implications
      const climateFactor = 1 + (percentageVsAverage / 100);
      const expectedExtraHeating = Math.max(0, percentageVsAverage);

      buildingEnergyContext = {
        expectedExtraHeating: Math.round(expectedExtraHeating),
        climateFactor: Math.round(climateFactor * 100) / 100,
        seasonalPattern: {
          winter: climateData.heatingDegreeDays > 3500 ? 'Lang, kald vinter med høyt energibehov' : 'Moderat vinter med normalt energibehov',
          summer: climateData.coolingDegreeDays > 50 ? 'Varm sommer, kjøling kan være nødvendig' : 'Mild sommer, lite kjølingsbehov'
        }
      };

      recommendations = CLIMATE_RECOMMENDATIONS[climateData.climateZone] || [];
    } else {
      // Provide fallback data based on region
      const fallbackZone = coords.lat > 65 ? 'subarctic' :
                          coords.lng < 8 ? 'maritime_west' : 'continental_east';

      climateContext = {
        zone: fallbackZone,
        description: CLIMATE_ZONE_DESCRIPTIONS[fallbackZone],
        heatingDegreeDays: NATIONAL_HDD_AVERAGES[fallbackZone],
        nationalAverage: 3200,
        percentageVsAverage: 0
      };

      buildingEnergyContext = {
        expectedExtraHeating: 0,
        climateFactor: 1.0,
        seasonalPattern: {
          winter: 'Normale vinterforhold',
          summer: 'Normale sommerforhold'
        }
      };

      recommendations = ['Værstasjondata ikke tilgjengelig, bruker regionale estimater'];
    }

    const response: ClimateAnalysisResponse = {
      climateData,
      climateContext,
      buildingEnergyContext,
      recommendations,
      dataQuality,
      lastUpdated: new Date().toISOString()
    };

    return createSecureResponse(response);

  } catch (error) {
    console.error('Climate data API error:', error);

    // Return minimal fallback data
    const fallbackResponse: ClimateAnalysisResponse = {
      climateData: null,
      climateContext: {
        zone: 'temperate_south',
        description: 'Standard norsk klima (fallback)',
        heatingDegreeDays: 3200,
        nationalAverage: 3200,
        percentageVsAverage: 0
      },
      buildingEnergyContext: {
        expectedExtraHeating: 0,
        climateFactor: 1.0,
        seasonalPattern: {
          winter: 'Normale vinterforhold',
          summer: 'Normale sommerforhold'
        }
      },
      recommendations: ['Klimadata midlertidig utilgjengelig'],
      dataQuality: 'unavailable',
      lastUpdated: new Date().toISOString()
    };

    return createSecureResponse(fallbackResponse);
  }
}