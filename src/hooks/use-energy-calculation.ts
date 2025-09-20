import { useState, useCallback } from 'react';
import {
  BuildingData,
  EnergyAnalysis,
  InvestmentGuidance,
  EnovaStatus,
} from '@/types/norwegian-energy';
import {
  performEnergyAnalysis,
  calculateInvestmentGuidance,
} from '@/lib/energy-calculations';

interface UseEnergyCalculationReturn {
  energyAnalysis: EnergyAnalysis | null;
  investmentGuidance: InvestmentGuidance | null;
  enovaStatus: EnovaStatus | null;
  isCalculating: boolean;
  error: string | null;
  calculateEnergy: (buildingData: BuildingData) => Promise<void>;
  clearResults: () => void;
}

// Mock Enova API call - replace with actual API integration
const checkEnovaStatus = async (
  buildingId?: string
): Promise<EnovaStatus> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock Enova status - in real implementation, query Enova database
  const isRegistered = Math.random() > 0.7; // 30% chance of being registered

  if (isRegistered) {
    const grades = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
    const randomGrade = grades[Math.floor(Math.random() * grades.length)];

    return {
      isRegistered: true,
      energyGrade: randomGrade,
      registrationDate: new Date('2022-01-15'),
      validUntil: new Date('2032-01-15'),
      status: 'Registrert',
    };
  }

  return {
    isRegistered: false,
    status: 'Ikke registrert',
  };
};

export const useEnergyCalculation = (): UseEnergyCalculationReturn => {
  const [energyAnalysis, setEnergyAnalysis] = useState<EnergyAnalysis | null>(
    null
  );
  const [investmentGuidance, setInvestmentGuidance] =
    useState<InvestmentGuidance | null>(null);
  const [enovaStatus, setEnovaStatus] = useState<EnovaStatus | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateEnergy = useCallback(async (buildingData: BuildingData) => {
    setIsCalculating(true);
    setError(null);

    try {
      // Perform energy analysis
      const analysis = performEnergyAnalysis(buildingData);
      setEnergyAnalysis(analysis);

      // Calculate investment guidance
      const investment = calculateInvestmentGuidance(buildingData, analysis);
      setInvestmentGuidance(investment);

      // Check Enova status
      const enova = await checkEnovaStatus(
        buildingData.coordinates.lat.toString() // Mock building ID
      );
      setEnovaStatus(enova);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Feil ved beregning av energianalyse'
      );
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setEnergyAnalysis(null);
    setInvestmentGuidance(null);
    setEnovaStatus(null);
    setError(null);
  }, []);

  return {
    energyAnalysis,
    investmentGuidance,
    enovaStatus,
    isCalculating,
    error,
    calculateEnergy,
    clearResults,
  };
};