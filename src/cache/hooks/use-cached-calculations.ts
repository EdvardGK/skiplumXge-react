/**
 * React Hook for cached energy calculations
 * Provides easy access to calculation parameters and formulas
 */

import { useMemo } from 'react';
import { useCalculationValues, useAllCalculations } from './use-cached-config';

/**
 * Hook to get all energy calculation parameters
 */
export function useEnergyCalculationParams() {
  const { data: calculations, isLoading, error } = useAllCalculations();

  const params = useMemo(() => {
    if (!calculations) return null;

    // Extract values from cached calculations
    const result: Record<string, number> = {};

    Object.entries(calculations).forEach(([key, calc]) => {
      result[key] = calc.value;
    });

    return {
      // Area adjustments
      braAdjustment: result.bra_adjustment || 8,

      // Investment calculations
      investmentMultiplier: result.investment_multiplier || 7,
      heatingInvestmentPercentage: result.heating_investment_percentage || 70,
      lightingInvestmentPercentage: result.lighting_investment_percentage || 15,
      otherInvestmentPercentage: result.other_investment_percentage || 15,

      // Energy prices
      baseElectricityPrice: result.base_electricity_price || 2.80,
      gridRent: result.grid_rent || 0.50,

      // Analysis thresholds
      goodTEK17Threshold: result.good_tek17_threshold || 90,
      warningTEK17Threshold: result.warning_tek17_threshold || 110,

      // Conversion factors
      kwhToCO2: result.kwh_to_co2 || 0.185,

      // Defaults
      defaultFloors: result.default_floors || 2,
      defaultBuildYear: result.default_build_year || 1990,

      // Metrics
      targetConversionRate: result.target_conversion_rate || 35,
      analysisTimeMinutes: result.analysis_time_minutes || 2
    };
  }, [calculations]);

  return {
    params,
    isLoading,
    error
  };
}

/**
 * Hook for SINTEF investment breakdown percentages
 */
export function useSINTEFBreakdown() {
  const values = useCalculationValues([
    'heating_investment_percentage',
    'lighting_investment_percentage',
    'other_investment_percentage'
  ]);

  return {
    heating: values.heating_investment_percentage || 70,
    lighting: values.lighting_investment_percentage || 15,
    other: values.other_investment_percentage || 15
  };
}

/**
 * Hook for calculating heated BRA
 */
export function useHeatedBRA(totalBRA: number): number {
  const braAdjustment = useCalculationValue('bra_adjustment', 8);

  return useMemo(() => {
    return totalBRA * (1 - braAdjustment / 100);
  }, [totalBRA, braAdjustment]);
}

/**
 * Hook for calculating investment room
 */
export function useInvestmentRoom(annualWasteCost: number): {
  totalInvestment: number;
  heatingInvestment: number;
  lightingInvestment: number;
  otherInvestment: number;
} {
  const multiplier = useCalculationValue('investment_multiplier', 7);
  const breakdown = useSINTEFBreakdown();

  return useMemo(() => {
    const totalInvestment = annualWasteCost * multiplier;

    return {
      totalInvestment,
      heatingInvestment: totalInvestment * (breakdown.heating / 100),
      lightingInvestment: totalInvestment * (breakdown.lighting / 100),
      otherInvestment: totalInvestment * (breakdown.other / 100)
    };
  }, [annualWasteCost, multiplier, breakdown]);
}

/**
 * Hook for electricity price calculation
 */
export function useElectricityPrice(zone?: string): {
  basePrice: number;
  gridRent: number;
  totalPrice: number;
} {
  const basePrice = useCalculationValue('base_electricity_price', 2.80);
  const gridRent = useCalculationValue('grid_rent', 0.50);

  // TODO: Add zone-specific pricing when integrated with price API
  return useMemo(() => ({
    basePrice,
    gridRent,
    totalPrice: basePrice + gridRent
  }), [basePrice, gridRent]);
}

/**
 * Hook for CO2 emissions calculation
 */
export function useCO2Emissions(annualEnergyKwh: number): {
  annualCO2: number;
  dailyCO2: number;
  conversionFactor: number;
} {
  const kwhToCO2 = useCalculationValue('kwh_to_co2', 0.185);

  return useMemo(() => ({
    annualCO2: annualEnergyKwh * kwhToCO2,
    dailyCO2: (annualEnergyKwh * kwhToCO2) / 365,
    conversionFactor: kwhToCO2
  }), [annualEnergyKwh, kwhToCO2]);
}

/**
 * Hook for TEK17 compliance status
 */
export function useTEK17Compliance(
  actualConsumption: number,
  tek17Requirement: number
): {
  percentage: number;
  status: 'good' | 'warning' | 'critical';
  message: string;
} {
  const goodThreshold = useCalculationValue('good_tek17_threshold', 90);
  const warningThreshold = useCalculationValue('warning_tek17_threshold', 110);

  return useMemo(() => {
    const percentage = (actualConsumption / tek17Requirement) * 100;

    let status: 'good' | 'warning' | 'critical';
    let message: string;

    if (percentage <= goodThreshold) {
      status = 'good';
      message = 'Utmerket! Godt under TEK17-krav';
    } else if (percentage <= 100) {
      status = 'good';
      message = 'Oppfyller TEK17-krav';
    } else if (percentage <= warningThreshold) {
      status = 'warning';
      message = 'Over TEK17-krav, forbedringspotensial';
    } else {
      status = 'critical';
      message = 'Betydelig over TEK17-krav, stort forbedringspotensial';
    }

    return {
      percentage,
      status,
      message
    };
  }, [actualConsumption, tek17Requirement, goodThreshold, warningThreshold]);
}

/**
 * Hook for calculating payback period
 */
export function usePaybackPeriod(
  investmentCost: number,
  annualSavings: number
): {
  years: number;
  months: number;
  isViable: boolean;
} {
  return useMemo(() => {
    if (annualSavings <= 0) {
      return {
        years: Infinity,
        months: Infinity,
        isViable: false
      };
    }

    const totalMonths = (investmentCost / annualSavings) * 12;
    const years = Math.floor(totalMonths / 12);
    const months = Math.round(totalMonths % 12);

    return {
      years,
      months,
      isViable: totalMonths <= 60 // Viable if payback is within 5 years
    };
  }, [investmentCost, annualSavings]);
}

/**
 * Custom hook to get the calculation value directly
 */
function useCalculationValue(name: string, defaultValue: number): number {
  const values = useCalculationValues([name]);
  return values[name] || defaultValue;
}