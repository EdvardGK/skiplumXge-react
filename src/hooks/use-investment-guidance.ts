import { useState, useCallback, useMemo } from 'react';
import {
  InvestmentGuidance,
  InvestmentRecommendation,
  BuildingData,
  EnergyAnalysis,
} from '@/types/norwegian-energy';
import { calculateInvestmentGuidance } from '@/lib/energy-calculations';

interface UseInvestmentGuidanceProps {
  buildingData?: BuildingData;
  energyAnalysis?: EnergyAnalysis;
}

interface UseInvestmentGuidanceReturn {
  investmentGuidance: InvestmentGuidance | null;
  selectedRecommendations: InvestmentRecommendation[];
  totalSelectedCost: number;
  totalSelectedSavings: number;
  averagePaybackPeriod: number;
  toggleRecommendation: (index: number) => void;
  calculateCustomScenario: (customData: {
    buildingData: BuildingData;
    energyAnalysis: EnergyAnalysis;
  }) => void;
  isCalculating: boolean;
  error: string | null;
}

export const useInvestmentGuidance = ({
  buildingData,
  energyAnalysis,
}: UseInvestmentGuidanceProps = {}): UseInvestmentGuidanceReturn => {
  const [investmentGuidance, setInvestmentGuidance] =
    useState<InvestmentGuidance | null>(null);
  const [selectedRecommendationIndices, setSelectedRecommendationIndices] =
    useState<Set<number>>(new Set());
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate investment guidance when data is available
  const calculateGuidance = useCallback(
    (data: BuildingData, analysis: EnergyAnalysis) => {
      try {
        setIsCalculating(true);
        const guidance = calculateInvestmentGuidance(data, analysis);
        setInvestmentGuidance(guidance);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Feil ved beregning av investeringsveiledning'
        );
      } finally {
        setIsCalculating(false);
      }
    },
    []
  );

  // Auto-calculate when props change
  useState(() => {
    if (buildingData && energyAnalysis) {
      calculateGuidance(buildingData, energyAnalysis);
    }
  });

  const selectedRecommendations = useMemo(() => {
    if (!investmentGuidance) return [];
    return investmentGuidance.recommendations.filter((_, index) =>
      selectedRecommendationIndices.has(index)
    );
  }, [investmentGuidance, selectedRecommendationIndices]);

  const totalSelectedCost = useMemo(() => {
    return selectedRecommendations.reduce(
      (total, rec) => total + rec.estimatedCost,
      0
    );
  }, [selectedRecommendations]);

  const totalSelectedSavings = useMemo(() => {
    return selectedRecommendations.reduce(
      (total, rec) => total + rec.annualSavings,
      0
    );
  }, [selectedRecommendations]);

  const averagePaybackPeriod = useMemo(() => {
    if (selectedRecommendations.length === 0 || totalSelectedSavings === 0)
      return 0;
    return Math.round(totalSelectedCost / totalSelectedSavings);
  }, [totalSelectedCost, totalSelectedSavings]);

  const toggleRecommendation = useCallback((index: number) => {
    setSelectedRecommendationIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const calculateCustomScenario = useCallback(
    (customData: { buildingData: BuildingData; energyAnalysis: EnergyAnalysis }) => {
      calculateGuidance(customData.buildingData, customData.energyAnalysis);
    },
    [calculateGuidance]
  );

  return {
    investmentGuidance,
    selectedRecommendations,
    totalSelectedCost,
    totalSelectedSavings,
    averagePaybackPeriod,
    toggleRecommendation,
    calculateCustomScenario,
    isCalculating,
    error,
  };
};