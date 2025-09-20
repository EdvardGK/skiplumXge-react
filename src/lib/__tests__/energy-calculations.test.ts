import {
  getEnergyGrade,
  calculateTEK17Compliance,
  calculateInvestmentRoom,
  calculateEnergyWaste,
  formatNOK,
  formatEnergyUse,
  SSB_ELECTRICITY_PRICE_2024,
} from '../energy-calculations';
import { BuildingType } from '@/types/norwegian-energy';

describe('Energy Calculations', () => {
  describe('getEnergyGrade', () => {
    it('returns correct energy grade based on energy use', () => {
      const buildingType: BuildingType = 'Kontor';

      expect(getEnergyGrade(50, buildingType)).toBe('A');  // 50/115 = 0.43
      expect(getEnergyGrade(80, buildingType)).toBe('B');  // 80/115 = 0.70
      expect(getEnergyGrade(110, buildingType)).toBe('C'); // 110/115 = 0.96
      expect(getEnergyGrade(140, buildingType)).toBe('D'); // 140/115 = 1.22
      expect(getEnergyGrade(170, buildingType)).toBe('E'); // 170/115 = 1.48
      expect(getEnergyGrade(220, buildingType)).toBe('F'); // 220/115 = 1.91
      expect(getEnergyGrade(250, buildingType)).toBe('G'); // 250/115 = 2.17
    });

    it('handles different building types correctly', () => {
      expect(getEnergyGrade(100, 'Småhus')).toBe('B');    // 100/115 = 0.87
      expect(getEnergyGrade(100, 'Handel')).toBe('A');    // 100/150 = 0.67
      expect(getEnergyGrade(100, 'Sykehus')).toBe('A');   // 100/255 = 0.39
    });
  });

  describe('calculateTEK17Compliance', () => {
    it('correctly identifies compliance', () => {
      const compliant = calculateTEK17Compliance(100, 'Kontor');
      expect(compliant.isCompliant).toBe(true);
      expect(compliant.requirement).toBe(115);
      expect(compliant.actual).toBe(100);
      expect(compliant.deviation).toBe(-15);

      const nonCompliant = calculateTEK17Compliance(150, 'Kontor');
      expect(nonCompliant.isCompliant).toBe(false);
      expect(nonCompliant.deviation).toBe(35);
    });
  });

  describe('calculateInvestmentRoom', () => {
    it('calculates correct investment room with default multiplier', () => {
      const annualWasteCost = 10000;
      const investmentRoom = calculateInvestmentRoom(annualWasteCost);

      expect(investmentRoom).toBe(70000); // 10000 * 7
    });

    it('calculates correct investment room with custom multiplier', () => {
      const annualWasteCost = 10000;
      const investmentRoom = calculateInvestmentRoom(annualWasteCost, 5);

      expect(investmentRoom).toBe(50000); // 10000 * 5
    });
  });

  describe('calculateEnergyWaste', () => {
    it('calculates energy waste correctly', () => {
      const energyUse = 150; // kWh/m²/år
      const buildingType: BuildingType = 'Kontor';
      const heatedArea = 1000; // m²

      const waste = calculateEnergyWaste(energyUse, buildingType, heatedArea);

      // Waste per m²: 150 - 115 = 35 kWh/m²/år
      // Total waste: 35 * 1000 = 35000 kWh/år
      expect(waste.wasteKwh).toBe(35000);

      // Cost: 35000 * 2.8 = 98000 NOK/år
      expect(waste.wasteCost).toBe(98000);
    });

    it('returns zero waste when under TEK17 requirement', () => {
      const waste = calculateEnergyWaste(100, 'Kontor', 1000);

      expect(waste.wasteKwh).toBe(0);
      expect(waste.wasteCost).toBe(0);
    });
  });

  describe('formatNOK', () => {
    it('formats Norwegian currency correctly', () => {
      expect(formatNOK(1000)).toMatch(/1[\s ]000/); // Space or non-breaking space
      expect(formatNOK(50000)).toMatch(/50[\s ]000/);
      expect(formatNOK(1234567)).toMatch(/1[\s ]234[\s ]567/);
    });
  });

  describe('formatEnergyUse', () => {
    it('formats energy consumption correctly', () => {
      expect(formatEnergyUse(1000)).toBe('1 000 kWh');
      expect(formatEnergyUse(50000)).toBe('50 000 kWh');
      expect(formatEnergyUse(0)).toBe('0 kWh');
    });
  });
});