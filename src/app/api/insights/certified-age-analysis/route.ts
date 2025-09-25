import { NextRequest } from 'next/server';
import { createSecureResponse, createSecureErrorResponse, rateLimit, getClientIP } from '@/lib/security';
import { supabaseClient } from '@/lib/supabase';

export interface AgeBracketData {
  bracketName: string;
  nationalCount: number;
  nationalAvgConsumption: number;
  nationalAvgClass: string;
  localCount: number;
  localAvgConsumption: number;
  localAvgClass: string;
  trend: 'improving' | 'stable' | 'declining';
}

export interface AgeAnalysisResponse {
  targetBracket: string; // The bracket for the user's building
  targetBracketData: AgeBracketData | null;
  allBrackets: AgeBracketData[];
  comparisons: {
    vsNational: {
      percentageDifference: number;
      betterOrWorse: 'better' | 'worse' | 'similar';
      message: string;
    };
    vsLocal: {
      percentageDifference: number;
      betterOrWorse: 'better' | 'worse' | 'similar';
      message: string;
    };
    generationalTrend: string;
  };
  insights: string[];
  recommendations: string[];
  dataQuality: 'excellent' | 'good' | 'limited' | 'unavailable';
  lastUpdated: string;
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`age-analysis:${clientIP}`, 100, 60000);

    if (!rateLimitResult.allowed) {
      return createSecureErrorResponse('Rate limit exceeded. Please try again later.', 429);
    }

    const searchParams = request.nextUrl.searchParams;
    const constructionYear = searchParams.get('construction_year');
    const buildingType = searchParams.get('building_type');
    const postalCode = searchParams.get('postal_code');

    if (!constructionYear) {
      return createSecureErrorResponse('Construction year is required', 400);
    }

    const year = parseInt(constructionYear);

    // Determine age bracket
    const targetBracket = year < 1980 ? 'Pre 1980' :
                         year <= 2010 ? '1980-2010' :
                         'Post 2010';

    console.log(`Analyzing age bracket ${targetBracket} for year ${year}, building type: ${buildingType || 'all'}`);

    // Get all age brackets comparison from database
    const { data: allBracketsData, error: bracketsError } = await supabaseClient
      .rpc('get_all_age_brackets_comparison', {
        building_type: buildingType,
        postal_code: postalCode
      });

    if (bracketsError) {
      console.error('Failed to fetch age bracket data:', bracketsError);
      throw new Error('Failed to fetch age bracket data');
    }

    let targetBracketData: AgeBracketData | null = null;
    let allBrackets: AgeBracketData[] = [];
    let insights: string[] = [];
    let recommendations: string[] = [];
    let dataQuality: 'excellent' | 'good' | 'limited' | 'unavailable' = 'unavailable';

    if (allBracketsData && allBracketsData.length > 0) {
      // Format bracket data
      allBrackets = allBracketsData.map((bracket: any) => ({
        bracketName: bracket.bracket_name,
        nationalCount: bracket.national_certified_count || 0,
        nationalAvgConsumption: bracket.national_avg_consumption || 0,
        nationalAvgClass: bracket.national_avg_class || 'D',
        localCount: bracket.local_certified_count || 0,
        localAvgConsumption: bracket.local_avg_consumption || 0,
        localAvgClass: bracket.local_avg_class || 'D',
        trend: bracket.consumption_trend || 'stable'
      }));

      // Find target bracket data
      targetBracketData = allBrackets.find(b => b.bracketName === targetBracket) || null;

      // Calculate data quality
      const totalNational = allBrackets.reduce((sum, b) => sum + b.nationalCount, 0);
      const totalLocal = allBrackets.reduce((sum, b) => sum + b.localCount, 0);

      if (totalNational > 10000 && totalLocal > 100) {
        dataQuality = 'excellent';
      } else if (totalNational > 1000 && totalLocal > 10) {
        dataQuality = 'good';
      } else if (totalNational > 100) {
        dataQuality = 'limited';
      }

      // Generate insights
      if (targetBracketData) {
        // National comparison
        insights.push(`${targetBracket} ${buildingType || 'bygninger'} med energisertifikat i Norge: gjennomsnitt ${Math.round(targetBracketData.nationalAvgConsumption)} kWh/m²`);

        if (targetBracketData.nationalCount > 1000) {
          insights.push(`Basert på ${targetBracketData.nationalCount.toLocaleString('no-NO')} sertifiserte bygninger nasjonalt`);
        }

        // Local comparison if available
        if (targetBracketData.localCount > 0) {
          insights.push(`Lokalt (${postalCode}): ${targetBracketData.localCount} sertifiserte bygninger, snitt ${Math.round(targetBracketData.localAvgConsumption)} kWh/m²`);

          const localVsNational = ((targetBracketData.localAvgConsumption - targetBracketData.nationalAvgConsumption) /
                                   targetBracketData.nationalAvgConsumption * 100);

          if (Math.abs(localVsNational) > 10) {
            insights.push(localVsNational < 0 ?
              `Lokale bygninger presterer ${Math.abs(Math.round(localVsNational))}% bedre enn landssnittet` :
              `Lokale bygninger presterer ${Math.round(localVsNational)}% dårligere enn landssnittet`
            );
          }
        }

        // Generational insights
        const pre1980 = allBrackets.find(b => b.bracketName === 'Pre 1980');
        const period1980 = allBrackets.find(b => b.bracketName === '1980-2010');
        const post2010 = allBrackets.find(b => b.bracketName === 'Post 2010');

        if (pre1980 && post2010) {
          const improvement = ((pre1980.nationalAvgConsumption - post2010.nationalAvgConsumption) /
                              pre1980.nationalAvgConsumption * 100);

          insights.push(`Moderne bygninger (Post 2010) bruker ${Math.round(improvement)}% mindre energi enn Pre 1980`);
        }
      }

      // Generate recommendations based on bracket
      if (targetBracket === 'Pre 1980') {
        recommendations.push('Eldre bygninger har størst forbedringspotensial');
        recommendations.push('Fokuser på etterisolering og vindusutskifting');
        recommendations.push('Vurder varmepumpe og moderne ventilasjonsanlegg');
      } else if (targetBracket === '1980-2010') {
        recommendations.push('Bygninger fra denne perioden har moderat forbedringspotensial');
        recommendations.push('Oppgrader til LED-belysning og smartstyring');
        recommendations.push('Vurder solcellepaneler for egen strømproduksjon');
      } else {
        recommendations.push('Moderne bygninger bør fokusere på optimalisering');
        recommendations.push('Implementer smart energistyring');
        recommendations.push('Overvåk og juster for optimal ytelse');
      }
    }

    // Calculate comparisons
    let vsNational = null;
    let vsLocal = null;
    let generationalTrend = 'Utilstrekkelig data for trendanalyse';

    if (targetBracketData && targetBracketData.nationalAvgConsumption > 0) {
      // vs National comparison
      const avgNationalAllBrackets = allBrackets.reduce((sum, b) => sum + b.nationalAvgConsumption, 0) / allBrackets.length;
      const nationalDiff = ((targetBracketData.nationalAvgConsumption - avgNationalAllBrackets) / avgNationalAllBrackets * 100);

      vsNational = {
        percentageDifference: Math.abs(Math.round(nationalDiff)),
        betterOrWorse: nationalDiff < -5 ? 'better' as const :
                       nationalDiff > 5 ? 'worse' as const : 'similar' as const,
        message: `${targetBracket} bygninger bruker ${Math.abs(Math.round(nationalDiff))}% ${nationalDiff < 0 ? 'mindre' : 'mer'} energi enn gjennomsnittet`
      };

      // vs Local comparison
      if (targetBracketData.localAvgConsumption > 0) {
        const localDiff = ((targetBracketData.localAvgConsumption - targetBracketData.nationalAvgConsumption) /
                          targetBracketData.nationalAvgConsumption * 100);

        vsLocal = {
          percentageDifference: Math.abs(Math.round(localDiff)),
          betterOrWorse: localDiff < -5 ? 'better' as const :
                        localDiff > 5 ? 'worse' as const : 'similar' as const,
          message: `Lokale ${targetBracket} bygninger presterer ${Math.abs(Math.round(localDiff))}% ${localDiff < 0 ? 'bedre' : 'dårligere'} enn landssnittet`
        };
      }

      // Generational trend
      const sortedBrackets = [...allBrackets].sort((a, b) => {
        const order = { 'Pre 1980': 1, '1980-2010': 2, 'Post 2010': 3 };
        return (order[a.bracketName as keyof typeof order] || 999) -
               (order[b.bracketName as keyof typeof order] || 999);
      });

      if (sortedBrackets.length === 3) {
        const oldToNew = ((sortedBrackets[0].nationalAvgConsumption - sortedBrackets[2].nationalAvgConsumption) /
                         sortedBrackets[0].nationalAvgConsumption * 100);

        generationalTrend = `${Math.round(oldToNew)}% energireduksjon fra Pre 1980 til Post 2010 bygninger`;
      }
    }

    const response: AgeAnalysisResponse = {
      targetBracket,
      targetBracketData,
      allBrackets,
      comparisons: {
        vsNational: vsNational || {
          percentageDifference: 0,
          betterOrWorse: 'similar',
          message: 'Utilstrekkelig data for sammenligning'
        },
        vsLocal: vsLocal || {
          percentageDifference: 0,
          betterOrWorse: 'similar',
          message: 'Ingen lokal data tilgjengelig'
        },
        generationalTrend
      },
      insights,
      recommendations,
      dataQuality,
      lastUpdated: new Date().toISOString()
    };

    return createSecureResponse(response);

  } catch (error) {
    console.error('Age analysis API error:', error);

    // Return fallback data
    const fallbackResponse: AgeAnalysisResponse = {
      targetBracket: 'Unknown',
      targetBracketData: null,
      allBrackets: [],
      comparisons: {
        vsNational: {
          percentageDifference: 0,
          betterOrWorse: 'similar',
          message: 'Data utilgjengelig'
        },
        vsLocal: {
          percentageDifference: 0,
          betterOrWorse: 'similar',
          message: 'Data utilgjengelig'
        },
        generationalTrend: 'Data utilgjengelig'
      },
      insights: ['Aldersanalyse midlertidig utilgjengelig'],
      recommendations: ['Prøv igjen senere'],
      dataQuality: 'unavailable',
      lastUpdated: new Date().toISOString()
    };

    return createSecureResponse(fallbackResponse);
  }
}