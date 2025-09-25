import { NextRequest } from 'next/server';
import { createSecureResponse, createSecureErrorResponse, rateLimit, getClientIP } from '@/lib/security';
import { supabaseClient } from '@/lib/supabase';

export interface ZoneComparisonResponse {
  currentZone: {
    zone: string;
    description: string;
    totalCertifiedBuildings: number;
    averageEnergyClass: string;
    averageConsumption: number;
    medianConsumption: number;
    bestPerformingKommune: string | null;
    worstPerformingKommune: string | null;
  } | null;
  zoneComparisons: {
    zone: string;
    vsCurrentZone: number; // percentage difference
    averageConsumption: number;
    totalBuildings: number;
    description: string;
  }[];
  insights: string[];
  recommendations: string[];
  electricityPriceContext: {
    currentZonePrice: number; // øre/kWh
    nationalAverage: number;
    pricePremium: number; // percentage above/below national average
  };
  dataQuality: 'excellent' | 'good' | 'limited' | 'unavailable';
  lastUpdated: string;
}

// Zone descriptions
const ZONE_DESCRIPTIONS: Record<string, string> = {
  'NO1': 'Østlandet - lavest strømpriser, kontinentalt klima',
  'NO2': 'Sørlandet - moderate strømpriser, kystklima',
  'NO3': 'Midt-Norge - variable strømpriser, variert klima',
  'NO4': 'Nord-Norge - høye strømpriser, arktisk klima',
  'NO5': 'Vestlandet - høye strømpriser, fuktig kystklima'
};

// Average electricity prices by zone (øre/kWh, 2024 estimates)
const ZONE_PRICES: Record<string, number> = {
  'NO1': 45,
  'NO2': 55,
  'NO3': 40,
  'NO4': 38,
  'NO5': 60
};

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`zone-comparison:${clientIP}`, 100, 60000);

    if (!rateLimitResult.allowed) {
      return createSecureErrorResponse('Rate limit exceeded. Please try again later.', 429);
    }

    const searchParams = request.nextUrl.searchParams;
    const priceZone = searchParams.get('price_zone') || 'NO1';

    // Validate zone
    if (!['NO1', 'NO2', 'NO3', 'NO4', 'NO5'].includes(priceZone)) {
      return createSecureErrorResponse('Invalid price zone', 400);
    }

    console.log(`Fetching certified building statistics for electricity zone: ${priceZone}`);

    // Get current zone statistics
    const { data: currentZoneData, error: zoneError } = await supabaseClient
      .rpc('get_zone_certified_insights', {
        p_zone: priceZone
      })
      .single();

    if (zoneError) {
      console.error('Failed to fetch zone statistics:', zoneError);
      throw new Error('Failed to fetch zone statistics');
    }

    let currentZoneInfo = null;
    let zoneComparisons: any[] = [];
    let insights: string[] = [];
    let recommendations: string[] = [];
    let dataQuality: 'excellent' | 'good' | 'limited' | 'unavailable' = 'unavailable';

    if (currentZoneData) {
      // Format current zone data
      currentZoneInfo = {
        zone: priceZone,
        description: ZONE_DESCRIPTIONS[priceZone],
        totalCertifiedBuildings: currentZoneData.total_certified_buildings || 0,
        averageEnergyClass: currentZoneData.avg_energy_class || 'D',
        averageConsumption: currentZoneData.avg_consumption || 0,
        medianConsumption: currentZoneData.median_consumption || 0,
        bestPerformingKommune: currentZoneData.best_performing_kommune,
        worstPerformingKommune: currentZoneData.worst_performing_kommune
      };

      // Get data for all zones for comparison
      const allZones = ['NO1', 'NO2', 'NO3', 'NO4', 'NO5'];
      for (const zone of allZones) {
        if (zone !== priceZone) {
          const { data: zoneData, error } = await supabaseClient
            .rpc('get_zone_certified_insights', {
              p_zone: zone
            })
            .single();

          if (!error && zoneData) {
            const percentageDiff = ((zoneData.avg_consumption - currentZoneData.avg_consumption) /
                                   currentZoneData.avg_consumption * 100);

            zoneComparisons.push({
              zone,
              vsCurrentZone: Math.round(percentageDiff),
              averageConsumption: Math.round(zoneData.avg_consumption),
              totalBuildings: zoneData.total_certified_buildings,
              description: ZONE_DESCRIPTIONS[zone]
            });
          }
        }
      }

      // Sort comparisons by consumption
      zoneComparisons.sort((a, b) => a.averageConsumption - b.averageConsumption);

      // Determine data quality
      if (currentZoneInfo.totalCertifiedBuildings > 10000) {
        dataQuality = 'excellent';
      } else if (currentZoneInfo.totalCertifiedBuildings > 1000) {
        dataQuality = 'good';
      } else if (currentZoneInfo.totalCertifiedBuildings > 100) {
        dataQuality = 'limited';
      }

      // Generate insights
      insights.push(`Sertifiserte bygninger i ${priceZone} har energikarakter ${currentZoneInfo.averageEnergyClass} i snitt`);
      insights.push(`Basert på ${currentZoneInfo.totalCertifiedBuildings.toLocaleString('no-NO')} sertifiserte bygninger i sonen`);

      // Best/worst performing kommune insights
      if (currentZoneInfo.bestPerformingKommune) {
        insights.push(`${currentZoneInfo.bestPerformingKommune} har best ytelse i ${priceZone}`);
      }

      // Zone comparison insights
      const bestZone = zoneComparisons.reduce((best, zone) =>
        zone.averageConsumption < best.averageConsumption ? zone : best,
        zoneComparisons[0] || { zone: priceZone, averageConsumption: currentZoneInfo.averageConsumption }
      );

      if (bestZone && bestZone.zone !== priceZone) {
        const diff = Math.abs(bestZone.vsCurrentZone);
        insights.push(`${bestZone.zone} har ${diff}% lavere energiforbruk enn ${priceZone}`);
      }

      // Climate-based insights
      if (priceZone === 'NO4') {
        insights.push('Arktisk klima i NO4 gir naturlig høyere energiforbruk');
      } else if (priceZone === 'NO5') {
        insights.push('Fuktig kystklima i NO5 kan påvirke bygningsytelse');
      } else if (priceZone === 'NO1') {
        insights.push('Kontinentalt klima i NO1 gir store sesongvariasjoner');
      }

      // Generate recommendations
      const currentPrice = ZONE_PRICES[priceZone];
      const nationalAvgPrice = Object.values(ZONE_PRICES).reduce((a, b) => a + b, 0) / 5;

      if (currentPrice > nationalAvgPrice) {
        recommendations.push(`Høye strømpriser i ${priceZone} gir større besparelse ved effektivisering`);
        recommendations.push('Prioriter energieffektivisering for maksimal økonomisk gevinst');
      } else {
        recommendations.push(`Lave strømpriser i ${priceZone} gir lengre tilbakebetalingstid`);
        recommendations.push('Fokuser på tiltak med best komfort- og miljøgevinst');
      }

      // Performance-based recommendations
      if (currentZoneData.performance_vs_no1 && currentZoneData.performance_vs_no1 > 10) {
        recommendations.push('Din sone har høyere forbruk enn referansesonen NO1');
        recommendations.push('Undersøk klimatilpassede løsninger for din region');
      }
    }

    // Calculate electricity price context
    const nationalAvgPrice = Object.values(ZONE_PRICES).reduce((a, b) => a + b, 0) / 5;
    const currentZonePrice = ZONE_PRICES[priceZone];
    const pricePremium = ((currentZonePrice - nationalAvgPrice) / nationalAvgPrice * 100);

    const response: ZoneComparisonResponse = {
      currentZone: currentZoneInfo,
      zoneComparisons,
      insights,
      recommendations,
      electricityPriceContext: {
        currentZonePrice,
        nationalAverage: Math.round(nationalAvgPrice),
        pricePremium: Math.round(pricePremium)
      },
      dataQuality,
      lastUpdated: new Date().toISOString()
    };

    return createSecureResponse(response);

  } catch (error) {
    console.error('Zone comparison API error:', error);

    // Return fallback data
    const fallbackResponse: ZoneComparisonResponse = {
      currentZone: null,
      zoneComparisons: [],
      insights: ['Sone-sammenligning midlertidig utilgjengelig'],
      recommendations: ['Prøv igjen senere'],
      electricityPriceContext: {
        currentZonePrice: 50,
        nationalAverage: 48,
        pricePremium: 4
      },
      dataQuality: 'unavailable',
      lastUpdated: new Date().toISOString()
    };

    return createSecureResponse(fallbackResponse);
  }
}