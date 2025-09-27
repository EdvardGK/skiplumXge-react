import { NextRequest } from 'next/server';
import { createSecureResponse, createSecureErrorResponse, rateLimit, getClientIP } from '@/lib/security';
import { supabaseClient } from '@/lib/supabase';

export interface KommuneComparisonResponse {
  municipality: {
    name: string;
    totalCertifiedBuildings: number;
    averageEnergyClass: string;
    classDistribution: {
      A: number;
      B: number;
      C: number;
      D: number;
      E: number;
      F: number;
      G: number;
    };
    buildingTypeBreakdown: Record<string, number>;
    priceZone: string;
  } | null;
  comparison: {
    yourBuilding: {
      type: string | null;
      performanceBetterThan: number; // percentage of similar certified buildings
    };
    insights: string[];
    recommendations: string[];
  };
  dataQuality: 'excellent' | 'good' | 'limited' | 'unavailable';
  lastUpdated: string;
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`kommune-comparison:${clientIP}`, 100, 60000);

    if (!rateLimitResult.allowed) {
      return createSecureErrorResponse('Rate limit exceeded. Please try again later.', 429);
    }

    const searchParams = request.nextUrl.searchParams;
    const postalCode = searchParams.get('postal_code');
    const buildingType = searchParams.get('building_type');
    const currentConsumption = searchParams.get('consumption');

    if (!postalCode) {
      return createSecureErrorResponse('Postal code is required', 400);
    }

    console.log(`Fetching certified building statistics for postal code: ${postalCode}`);

    // Try to get cached statistics first (instant response)
    let { data: kommuneStats, error: kommuneError } = await supabaseClient
      .rpc('get_cached_municipality_stats' as any, {
        p_postal_code: postalCode
      })
      .single() as {
        data: any;
        error: any
      };

    // Fallback to real-time calculation if cache miss
    if (kommuneError || !kommuneStats) {
      console.log('Cache miss, calculating real-time statistics...');
      const result = await supabaseClient
        .rpc('get_kommune_certified_stats' as any, {
          p_postal_code: postalCode
        })
        .single() as {
          data: any;
          error: any
        };

      kommuneStats = result.data;
      kommuneError = result.error;
    } else {
      console.log('Serving from cache - instant response');
    }

    if (kommuneError) {
      console.error('Failed to fetch kommune statistics:', kommuneError);
      throw new Error('Failed to fetch kommune statistics');
    }

    let municipalityData = null;
    let insights: string[] = [];
    let recommendations: string[] = [];
    let performanceBetterThan = 50; // Default to median
    let dataQuality: 'excellent' | 'good' | 'limited' | 'unavailable' = 'unavailable';

    if (kommuneStats) {
      // Format municipality data
      municipalityData = {
        name: kommuneStats.kommune_name || 'Ukjent kommune',
        totalCertifiedBuildings: kommuneStats.total_certified_buildings || 0,
        averageEnergyClass: kommuneStats.avg_energy_class || 'D',
        classDistribution: {
          A: kommuneStats.class_a_percentage || 0,
          B: kommuneStats.class_b_percentage || 0,
          C: kommuneStats.class_c_percentage || 0,
          D: kommuneStats.class_d_percentage || 0,
          E: kommuneStats.class_e_percentage || 0,
          F: kommuneStats.class_f_percentage || 0,
          G: kommuneStats.class_g_percentage || 0
        },
        buildingTypeBreakdown: kommuneStats.building_type_breakdown || {},
        priceZone: kommuneStats.price_zone || 'NO1'
      };

      // Calculate performance percentile if building type is provided
      if (buildingType && currentConsumption) {
        const { data: buildingStats, error: buildingError } = await supabaseClient
          .rpc('get_building_type_statistics' as any, {
            building_type: buildingType,
            postal: postalCode
          })
          .single() as { data: any; error: any };

        if (!buildingError && buildingStats) {
          const consumption = parseFloat(currentConsumption);

          // Estimate percentile based on consumption
          if (consumption <= buildingStats.percentile_10) {
            performanceBetterThan = 90;
          } else if (consumption <= buildingStats.percentile_25) {
            performanceBetterThan = 75;
          } else if (consumption <= buildingStats.percentile_50) {
            performanceBetterThan = 50;
          } else if (consumption <= buildingStats.percentile_75) {
            performanceBetterThan = 25;
          } else {
            performanceBetterThan = 10;
          }
        }
      }

      // Generate insights
      const totalBuildings = municipalityData.totalCertifiedBuildings;

      if (totalBuildings > 1000) {
        dataQuality = 'excellent';
        insights.push(`I ${municipalityData.name} finnes ${totalBuildings} sertifiserte bygninger - solid datagrunnlag`);
      } else if (totalBuildings > 100) {
        dataQuality = 'good';
        insights.push(`${totalBuildings} sertifiserte bygninger i ${municipalityData.name} gir godt sammenligningsgrunnlag`);
      } else if (totalBuildings > 10) {
        dataQuality = 'limited';
        insights.push(`Kun ${totalBuildings} sertifiserte bygninger i området - begrenset datagrunnlag`);
      } else {
        dataQuality = 'unavailable';
        insights.push(`Svært få sertifiserte bygninger i området`);
      }

      // Class distribution insights
      const goodClassesPercentage = municipalityData.classDistribution.A +
                                    municipalityData.classDistribution.B +
                                    municipalityData.classDistribution.C;

      if (goodClassesPercentage > 40) {
        insights.push(`${Math.round(goodClassesPercentage)}% av sertifiserte bygninger har klasse C eller bedre`);
      } else {
        insights.push(`Stort forbedringspotensial - kun ${Math.round(goodClassesPercentage)}% har klasse C eller bedre`);
      }

      // Building type specific insights
      if (buildingType && municipalityData.buildingTypeBreakdown[buildingType]) {
        const typeCount = municipalityData.buildingTypeBreakdown[buildingType];
        insights.push(`${typeCount} sertifiserte ${buildingType.toLowerCase()} i kommunen`);
      }

      // Generate recommendations
      if (performanceBetterThan > 70) {
        recommendations.push('Din bygning presterer bedre enn de fleste - fokuser på å opprettholde god standard');
        recommendations.push('Del erfaringer med andre byggeiere i området');
      } else if (performanceBetterThan > 30) {
        recommendations.push('Rom for forbedring sammenlignet med lignende sertifiserte bygninger');
        recommendations.push('Undersøk hva de beste i klassen har gjort for å oppnå bedre resultater');
      } else {
        recommendations.push('Betydelig forbedringspotensial sammenlignet med andre sertifiserte bygninger');
        recommendations.push('Prioriter energieffektivisering for å nå gjennomsnittet');
      }

      // Price zone specific recommendations
      if (municipalityData.priceZone === 'NO4' || municipalityData.priceZone === 'NO5') {
        recommendations.push('Høyere strømpriser i din sone gir større besparelse ved effektivisering');
      }
    }

    const response: KommuneComparisonResponse = {
      municipality: municipalityData,
      comparison: {
        yourBuilding: {
          type: buildingType,
          performanceBetterThan
        },
        insights,
        recommendations
      },
      dataQuality,
      lastUpdated: new Date().toISOString()
    };

    return createSecureResponse(response);

  } catch (error) {
    console.error('Kommune comparison API error:', error);

    // Return fallback data
    const fallbackResponse: KommuneComparisonResponse = {
      municipality: null,
      comparison: {
        yourBuilding: {
          type: null,
          performanceBetterThan: 50
        },
        insights: ['Kommune-data midlertidig utilgjengelig'],
        recommendations: ['Prøv igjen senere']
      },
      dataQuality: 'unavailable',
      lastUpdated: new Date().toISOString()
    };

    return createSecureResponse(fallbackResponse);
  }
}