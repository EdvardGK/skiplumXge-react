'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { stormColors } from '@/lib/storm-theme';

interface EnergyBreakdownData {
  system: string;
  consumption: number;
  percentage: number;
  color: string;
  kwhPerM2: number;
  investmentPotential: number;
}

interface EnergyBreakdownChartProps {
  breakdown: {
    heating: number;
    lighting: number;
    ventilation: number;
    hotWater: number;
  };
  totalEnergyUse: number;
  heatingSystem: string;
  investmentRoom: number;
  className?: string;
  height?: number;
}

// Energy consumption factors by system type (kWh/m²/år) - from energy-calculations.ts
const HEATING_CONSUMPTION: Record<string, number> = {
  'Elektrisitet': 120,
  'Varmepumpe': 40,
  'Bergvarme': 35,
  'Fjernvarme': 60,
  'Biobrensel': 80,
  'Olje': 100,
  'Gass': 90,
};

const LIGHTING_CONSUMPTION: Record<string, number> = {
  'LED': 8,
  'Fluorescerende': 15,
  'Halogen': 25,
  'Glødepære': 35,
};

export default function EnergyBreakdownChart({
  breakdown,
  totalEnergyUse,
  heatingSystem,
  investmentRoom,
  className = '',
  height = 200
}: EnergyBreakdownChartProps) {

  // Calculate actual kWh/m²/år consumption for each system based on breakdown percentages
  const heatingConsumption = Math.round((breakdown.heating / 100) * totalEnergyUse);
  const lightingConsumption = Math.round((breakdown.lighting / 100) * totalEnergyUse);
  const ventilationConsumption = Math.round((breakdown.ventilation / 100) * totalEnergyUse);
  const hotWaterConsumption = Math.round((breakdown.hotWater / 100) * totalEnergyUse);

  // Prepare data for horizontal bar chart
  const chartData: EnergyBreakdownData[] = [
    {
      system: 'Oppvarming',
      consumption: heatingConsumption,
      percentage: breakdown.heating,
      color: stormColors.lightning.thunder,
      kwhPerM2: heatingConsumption,
      investmentPotential: Math.round(investmentRoom * 0.7) // 70% of investment goes to heating
    },
    {
      system: 'Belysning',
      consumption: lightingConsumption,
      percentage: breakdown.lighting,
      color: stormColors.lightning.gold,
      kwhPerM2: lightingConsumption,
      investmentPotential: Math.round(investmentRoom * 0.15) // 15% to lighting
    },
    {
      system: 'Ventilasjon',
      consumption: ventilationConsumption,
      percentage: breakdown.ventilation,
      color: stormColors.lightning.electric,
      kwhPerM2: ventilationConsumption,
      investmentPotential: Math.round(investmentRoom * 0.10) // 10% to ventilation
    },
    {
      system: 'Varmtvann',
      consumption: hotWaterConsumption,
      percentage: breakdown.hotWater,
      color: stormColors.lightning.aurora,
      kwhPerM2: hotWaterConsumption,
      investmentPotential: Math.round(investmentRoom * 0.05) // 5% to hot water
    }
  ].sort((a, b) => b.consumption - a.consumption); // Sort by consumption (highest first)

  // Debug log to check data
  console.log('EnergyBreakdownChart data:', {
    breakdown,
    totalEnergyUse,
    heatingSystem,
    investmentRoom,
    chartData
  });

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as EnergyBreakdownData;
      return (
        <div className="bg-slate-800/95 backdrop-blur-sm border border-white/20 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-1">{data.system}</p>
          <p className="text-slate-300 text-sm">
            <span className="text-cyan-400">{data.consumption}</span> kWh/m²/år
          </p>
          <p className="text-slate-300 text-sm">
            <span className="text-emerald-400">{data.percentage}%</span> av total energibruk
          </p>
          {data.investmentPotential > 0 && (
            <p className="text-slate-300 text-sm">
              Investeringsrom: <span className="text-yellow-400">{data.investmentPotential.toLocaleString()} kr</span>
            </p>
          )}
          <p className="text-slate-400 text-xs mt-1">
            {heatingSystem === 'Elektrisitet' && data.system === 'Oppvarming' ?
              'Høyt potensial for varmepumpe' :
              'Optimalisert system'
            }
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`w-full h-full ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="horizontal"
          margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.1)"
            horizontal={true}
            vertical={false}
          />
          <XAxis
            type="number"
            stroke="#94a3b8"
            fontSize={11}
            tickFormatter={(value) => `${value} kWh`}
          />
          <YAxis
            type="category"
            dataKey="system"
            stroke="#94a3b8"
            fontSize={11}
            width={65}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="consumption"
            radius={[0, 4, 4, 0]}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                opacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}