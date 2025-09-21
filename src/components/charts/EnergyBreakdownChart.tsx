'use client';

import React from 'react';
import {
  PieChart,
  Pie,
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
  [key: string]: any; // Add index signature for Recharts compatibility
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

  // Prepare data for pie chart with northern lights theme colors
  const chartData: EnergyBreakdownData[] = [
    {
      system: 'Oppvarming',
      consumption: heatingConsumption,
      percentage: breakdown.heating,
      color: '#e879f9', // Fuchsia-400 - magenta aurora for heating (highest energy use)
      kwhPerM2: heatingConsumption,
      investmentPotential: Math.round(investmentRoom * 0.7) // 70% of investment goes to heating
    },
    {
      system: 'Belysning',
      consumption: lightingConsumption,
      percentage: breakdown.lighting,
      color: '#fbbf24', // Amber-400 - golden aurora for lighting
      kwhPerM2: lightingConsumption,
      investmentPotential: Math.round(investmentRoom * 0.15) // 15% to lighting
    },
    {
      system: 'Ventilasjon',
      consumption: ventilationConsumption,
      percentage: breakdown.ventilation,
      color: '#14b8a6', // Teal-500 - teal aurora for ventilation
      kwhPerM2: ventilationConsumption,
      investmentPotential: Math.round(investmentRoom * 0.10) // 10% to ventilation
    },
    {
      system: 'Varmtvann',
      consumption: hotWaterConsumption,
      percentage: breakdown.hotWater,
      color: '#22c55e', // Green-500 - green aurora for hot water
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
          <p className="text-slate-300 text-sm">
            <span style={{ color: data.color }}>●</span> {data.system}
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
        <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <defs>
            {/* Northern lights gradient definitions */}
            <linearGradient id="heatingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e879f9" stopOpacity={0.9}/>
              <stop offset="95%" stopColor="#e879f9" stopOpacity={0.3}/>
            </linearGradient>
            <linearGradient id="lightingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.9}/>
              <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.3}/>
            </linearGradient>
            <linearGradient id="ventilationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.9}/>
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.3}/>
            </linearGradient>
            <linearGradient id="hotWaterGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.9}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.3}/>
            </linearGradient>
          </defs>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={40}
            dataKey="consumption"
            startAngle={90}
            endAngle={450}
          >
            {chartData.map((entry, index) => {
              // Map each system to its gradient and stroke color
              const gradientMap: { [key: string]: string } = {
                'Oppvarming': 'url(#heatingGradient)',
                'Belysning': 'url(#lightingGradient)',
                'Ventilasjon': 'url(#ventilationGradient)',
                'Varmtvann': 'url(#hotWaterGradient)'
              };

              return (
                <Cell
                  key={`cell-${index}`}
                  fill={gradientMap[entry.system] || entry.color}
                  stroke={entry.color}
                  strokeWidth={3}
                />
              );
            })}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}