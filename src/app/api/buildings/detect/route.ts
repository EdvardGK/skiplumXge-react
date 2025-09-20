import { NextRequest } from 'next/server';
import { supabaseClient } from '@/lib/supabase';
import { createSecureResponse, createSecureErrorResponse, rateLimit, getClientIP } from '@/lib/security';

interface BuildingDetectionResult {
  hasMultipleBuildings: boolean;
  buildingCount: number;
  buildings: {
    bygningsnummer: string;
    energyClass?: string;
    buildingCategory?: string;
    energyConsumption?: number;
    constructionYear?: number;
    isRegistered: boolean;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`buildings-detect:${clientIP}`, 60, 60000); // 60 requests per minute

    if (!rateLimitResult.allowed) {
      return createSecureErrorResponse('Rate limit exceeded. Please try again later.', 429);
    }

    const searchParams = request.nextUrl.searchParams;
    const gnr = searchParams.get('gnr');
    const bnr = searchParams.get('bnr');
    const address = searchParams.get('address');

    if (!gnr || !bnr) {
      return createSecureErrorResponse('gnr and bnr are required', 400);
    }

    console.log(`Detecting buildings for gnr=${gnr}, bnr=${bnr}, address=${address}`);

    // Query Enova database for all certificates at this property
    // Note: Using select('*') to avoid column name issues during build
    const { data: certificates, error } = await supabaseClient
      .from('energy_certificates')
      .select('*')
      .eq('gnr', parseInt(gnr))
      .eq('bnr', parseInt(bnr));

    if (error) {
      console.error('Enova database error:', error);
      throw new Error('Failed to query Enova database');
    }

    let buildings: BuildingDetectionResult['buildings'] = [];

    if (certificates && certificates.length > 0) {
      // Group by building number (in case there are multiple certificates per building)
      const buildingMap = new Map<string, any>();

      certificates.forEach((cert: any) => {
        // Handle different possible column names
        const buildingNum = cert.building_number || cert.bygningsnummer || '1';
        if (!buildingMap.has(buildingNum)) {
          buildingMap.set(buildingNum, {
            bygningsnummer: buildingNum,
            energyClass: cert.energy_class || cert.energikarakter,
            buildingCategory: cert.building_category || cert.bygningskategori,
            energyConsumption: cert.energy_consumption || cert.energiforbruk,
            constructionYear: cert.construction_year || cert.byggeaar,
            isRegistered: true,
          });
        }
      });

      buildings = Array.from(buildingMap.values()).sort((a, b) =>
        parseInt(a.bygningsnummer) - parseInt(b.bygningsnummer)
      );

      console.log(`Found ${buildings.length} registered buildings in Enova for gnr=${gnr}, bnr=${bnr}`);
    } else {
      // No certificates found - assume single building not registered
      buildings = [{
        bygningsnummer: '1',
        isRegistered: false,
      }];

      console.log(`No Enova certificates found for gnr=${gnr}, bnr=${bnr} - assuming single unregistered building`);
    }

    const result: BuildingDetectionResult = {
      hasMultipleBuildings: buildings.length > 1,
      buildingCount: buildings.length,
      buildings,
    };

    return createSecureResponse(result);

  } catch (error) {
    console.error('Building detection error:', error);

    return createSecureErrorResponse(
      'Kunne ikke hente bygningsinformasjon. Vennligst prøv igjen senere.',
      500
    );
  }
}