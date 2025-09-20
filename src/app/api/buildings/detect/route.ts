import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase';

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
    const searchParams = request.nextUrl.searchParams;
    const gnr = searchParams.get('gnr');
    const bnr = searchParams.get('bnr');
    const address = searchParams.get('address');

    if (!gnr || !bnr) {
      return NextResponse.json(
        { error: 'gnr and bnr are required' },
        { status: 400 }
      );
    }

    console.log(`Detecting buildings for gnr=${gnr}, bnr=${bnr}, address=${address}`);

    // Query Enova database for all certificates at this property
    const { data: certificates, error } = await supabaseClient
      .from('energy_certificates')
      .select(`
        building_number,
        energy_class,
        building_category,
        energy_consumption,
        construction_year,
        certificate_id
      `)
      .eq('gnr', parseInt(gnr))
      .eq('bnr', parseInt(bnr))
      .order('building_number');

    if (error) {
      console.error('Enova database error:', error);
      throw new Error('Failed to query Enova database');
    }

    let buildings: BuildingDetectionResult['buildings'] = [];

    if (certificates && certificates.length > 0) {
      // Group by building number (in case there are multiple certificates per building)
      const buildingMap = new Map<string, any>();

      certificates.forEach(cert => {
        const buildingNum = cert.building_number || '1';
        if (!buildingMap.has(buildingNum)) {
          buildingMap.set(buildingNum, {
            bygningsnummer: buildingNum,
            energyClass: cert.energy_class,
            buildingCategory: cert.building_category,
            energyConsumption: cert.energy_consumption,
            constructionYear: cert.construction_year,
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

    return NextResponse.json(result);

  } catch (error) {
    console.error('Building detection error:', error);

    return NextResponse.json(
      {
        error: 'Kunne ikke hente bygningsinformasjon. Vennligst prøv igjen senere.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}