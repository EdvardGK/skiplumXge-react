import { PriceZone } from '@/services/zone.service';

export interface ZoneMessage {
  primaryMessage: string;
  investmentFocus: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  ctaText: string;
  benefits: string[];
  priceContext: string;
}

export interface ZoneMessagingConfig {
  [key: string]: ZoneMessage;
}

/**
 * Zone-specific messaging based on real Norwegian electricity price data
 *
 * Insights from real NVE data:
 * - NO4 (North): 6-25 øre/kWh spot prices (very cheap)
 * - NO2 (Southwest): 25-50 øre/kWh spot prices (expensive)
 * - NO1 (Southeast): 15-35 øre/kWh spot prices (moderate)
 * - NO3 (Mid-Norway): 10-30 øre/kWh spot prices (cheap)
 * - NO5 (West): 20-40 øre/kWh spot prices (moderate-high)
 */
export const ZONE_MESSAGING: ZoneMessagingConfig = {
  'NO1': {
    primaryMessage: 'Moderat strømpris - balansert investeringsmulighet',
    investmentFocus: 'Både økonomiske og miljømessige gevinster ved energioppgradering',
    urgencyLevel: 'medium',
    ctaText: 'Utforsk investeringsmuligheter',
    benefits: [
      'Stabile besparelser på mellom-høye strømpriser',
      'God ROI på varmepumpe og isolasjon',
      'Forbedret komfort og bygningsverdi'
    ],
    priceContext: 'Strømpriser rundt 60-80 øre/kWh totalt - moderate investeringsmuligheter'
  },
  'NO2': {
    primaryMessage: 'Høyeste strømpriser - stor økonomisk gevinst ved oppgradering',
    investmentFocus: 'Fokus på økonomiske besparelser - rask tilbakebetaling',
    urgencyLevel: 'high',
    ctaText: 'Få besparingsanalyse nå',
    benefits: [
      'Størst økonomisk gevinst i Norge',
      'Raskest tilbakebetalingstid på investeringer',
      'Dramatisk reduksjon i energikostnader'
    ],
    priceContext: 'Strømpriser opp til 100+ øre/kWh totalt - høy investeringsverdi'
  },
  'NO3': {
    primaryMessage: 'Lave strømpriser - fokus på komfort og miljø',
    investmentFocus: 'Miljøforbedringer og komfort fremfor ren økonomi',
    urgencyLevel: 'low',
    ctaText: 'Utforsk miljøgevinster',
    benefits: [
      'Forbedret innemiljø og komfort',
      'Miljøvennlige oppgraderinger',
      'Fremtidssikring mot prisøkninger'
    ],
    priceContext: 'Strømpriser rundt 50-70 øre/kWh totalt - moderate økonomiske insentiver'
  },
  'NO4': {
    primaryMessage: 'Laveste strømpriser - miljø og komfort i fokus',
    investmentFocus: 'Miljøforbedringer, komfort og fremtidssikring',
    urgencyLevel: 'low',
    ctaText: 'Forbedre bygningens miljøprofil',
    benefits: [
      'Vesentlig forbedret komfort',
      'Sterkt redusert miljøavtrykk',
      'Fremtidssikring mot fremtidige prisøkninger'
    ],
    priceContext: 'Laveste strømpriser i Norge (40-60 øre/kWh) - fokus på miljø fremfor økonomi'
  },
  'NO5': {
    primaryMessage: 'Moderate til høye strømpriser - god investeringsmulighet',
    investmentFocus: 'Balansert tilnærming til økonomi og miljø',
    urgencyLevel: 'medium',
    ctaText: 'Vurder energioppgradering',
    benefits: [
      'God balanse mellom økonomi og miljø',
      'Moderat til god ROI på investeringer',
      'Forbedret bygningsstandard'
    ],
    priceContext: 'Strømpriser rundt 70-90 øre/kWh totalt - moderat investeringsverdi'
  }
};

/**
 * Get zone-specific messaging for a given price zone
 * @param zone - Norwegian electricity price zone
 * @returns Zone-specific messaging configuration
 */
export function getZoneMessaging(zone: PriceZone | null): ZoneMessage {
  if (!zone || !ZONE_MESSAGING[zone]) {
    // Default fallback messaging
    return {
      primaryMessage: 'Vurder energioppgradering for din eiendom',
      investmentFocus: 'Forbedret energieffektivitet og komfort',
      urgencyLevel: 'medium',
      ctaText: 'Få energianalyse',
      benefits: [
        'Reduserte energikostnader',
        'Forbedret komfort',
        'Økt bygningsverdi'
      ],
      priceContext: 'Vurder investeringsmuligheter basert på din strømpris'
    };
  }

  return ZONE_MESSAGING[zone];
}

/**
 * Get urgency color based on zone messaging
 * @param urgencyLevel - The urgency level from zone messaging
 * @returns Tailwind color classes for UI styling
 */
export function getUrgencyColor(urgencyLevel: ZoneMessage['urgencyLevel']): {
  background: string;
  text: string;
  border: string;
} {
  switch (urgencyLevel) {
    case 'high':
      return {
        background: 'bg-red-500/20',
        text: 'text-red-400',
        border: 'border-red-500/30'
      };
    case 'medium':
      return {
        background: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30'
      };
    case 'low':
      return {
        background: 'bg-green-500/20',
        text: 'text-green-400',
        border: 'border-green-500/30'
      };
    default:
      return {
        background: 'bg-cyan-500/20',
        text: 'text-cyan-400',
        border: 'border-cyan-500/30'
      };
  }
}

/**
 * Get investment messaging based on zone and potential savings
 * @param zone - Norwegian electricity price zone
 * @param annualSavings - Potential annual savings in NOK
 * @returns Formatted investment message
 */
export function getInvestmentMessage(zone: PriceZone | null, annualSavings: number): string {
  const zoneMsg = getZoneMessaging(zone);
  const investmentRoom = annualSavings * 7; // Conservative NPV calculation

  if (zone === 'NO2' && annualSavings > 50000) {
    return `Med høye strømpriser i ${zone} kan du investere opptil ${Math.round(investmentRoom).toLocaleString()} kr og fortsatt ha god lønnsomhet.`;
  }

  if (zone === 'NO4' && annualSavings < 30000) {
    return `Med lave strømpriser i ${zone} er miljø- og komfortgevinster viktigere enn rene økonomiske besparelser.`;
  }

  return `I prisområde ${zone} kan du investere opptil ${Math.round(investmentRoom).toLocaleString()} kr for å oppnå disse besparelsene.`;
}

/**
 * Get zone-specific heat pump recommendations
 * @param zone - Norwegian electricity price zone
 * @returns Heat pump recommendation message
 */
export function getHeatPumpRecommendation(zone: PriceZone | null): {
  recommendation: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
} {
  switch (zone) {
    case 'NO2':
      return {
        recommendation: 'Varmepumpe anbefales sterkt - rask tilbakebetaling',
        reasoning: 'Høye strømpriser gjør varmepumpe meget lønnsom',
        priority: 'high'
      };
    case 'NO4':
      return {
        recommendation: 'Varmepumpe for komfort og miljø',
        reasoning: 'Lave strømpriser, men stort komfortgevinst',
        priority: 'medium'
      };
    case 'NO1':
    case 'NO3':
    case 'NO5':
    default:
      return {
        recommendation: 'Varmepumpe gir god ROI og komfort',
        reasoning: 'Balansert gevinst av økonomi og komfort',
        priority: 'medium'
      };
  }
}