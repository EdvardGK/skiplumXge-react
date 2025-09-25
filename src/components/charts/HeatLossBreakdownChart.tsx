'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface HeatLossData {
  walls: number;        // % of total heat loss
  roof: number;         // % of total heat loss
  floor: number;        // % of total heat loss
  windows: number;      // % of total heat loss
  ventilation: number;  // % of total heat loss
  infiltration: number; // % of total heat loss
}

interface HeatLossBreakdownChartProps {
  heatLoss: HeatLossData;
  totalHeatLoss?: number; // W/K for absolute values
  className?: string;
}

// Professional color scheme for heat loss components
const HEAT_LOSS_COLORS = {
  walls: '#f59e0b',        // amber-500 - largest component typically
  roof: '#ef4444',         // red-500 - high impact
  floor: '#8b5cf6',        // violet-500 - moderate impact
  windows: '#06b6d4',      // cyan-500 - high impact per m²
  ventilation: '#10b981',  // emerald-500 - controllable
  infiltration: '#f97316', // orange-500 - uncontrolled loss
};

const COLOR_MAPPING = [
  { key: 'walls', color: HEAT_LOSS_COLORS.walls, name: 'Yttervegger' },
  { key: 'windows', color: HEAT_LOSS_COLORS.windows, name: 'Vinduer/dører' },
  { key: 'roof', color: HEAT_LOSS_COLORS.roof, name: 'Tak' },
  { key: 'ventilation', color: HEAT_LOSS_COLORS.ventilation, name: 'Ventilasjon' },
  { key: 'floor', color: HEAT_LOSS_COLORS.floor, name: 'Gulv' },
  { key: 'infiltration', color: HEAT_LOSS_COLORS.infiltration, name: 'Lekkasje' },
];

// Custom tooltip component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <span className="text-foreground font-medium">{data.name}</span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {data.value.toFixed(1)}% av totalt varmetap
        </div>
      </div>
    );
  }
  return null;
};

// Custom legend component
const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-2">
      {payload?.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-1 text-xs">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-300">{entry.value}</span>
          <span className="text-slate-400">
            ({entry.payload.value.toFixed(0)}%)
          </span>
        </div>
      ))}
    </div>
  );
};

export default function HeatLossBreakdownChart({
  heatLoss,
  totalHeatLoss,
  className = ''
}: HeatLossBreakdownChartProps) {
  // Transform data for Recharts
  const chartData = COLOR_MAPPING.map(item => ({
    name: item.name,
    value: heatLoss[item.key as keyof HeatLossData],
    color: item.color,
  })).filter(item => item.value > 0); // Only show non-zero values

  // Find the largest component for highlighting
  const maxComponent = chartData.reduce((prev, current) =>
    current.value > prev.value ? current : prev
  );

  return (
    <div className={`w-full h-full ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                strokeWidth={entry.name === maxComponent.name ? 2 : 0}
                stroke={entry.name === maxComponent.name ? '#ffffff' : 'none'}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label showing total heat loss */}
      {totalHeatLoss && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-lg font-bold text-white">
              {totalHeatLoss.toFixed(0)}
            </div>
            <div className="text-xs text-slate-400">
              W/K
            </div>
          </div>
        </div>
      )}
    </div>
  );
}