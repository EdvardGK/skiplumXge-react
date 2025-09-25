'use client';

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

interface MonthlyData {
  month: string;
  heatingDemand: number;    // kWh
  coolingDemand: number;    // kWh
  solarGains: number;       // kWh
  internalGains: number;    // kWh
  outdoorTemp: number;      // °C
}

interface MonthlyPerformanceChartProps {
  data: MonthlyData[];
  buildingType?: string;
  className?: string;
}

// Norwegian month abbreviations
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'
];

// Generate monthly data based on Norwegian climate and building physics
function generateMonthlyData(buildingType: string = 'Småhus'): MonthlyData[] {
  // Oslo climate data (simplified)
  const osloTemperatures = [-3, -2, 2, 7, 13, 17, 19, 18, 13, 8, 3, -1];
  const solarRadiation = [30, 60, 120, 180, 220, 240, 230, 190, 130, 80, 40, 25]; // kWh/m²

  return MONTH_NAMES.map((month, index) => {
    const temp = osloTemperatures[index];
    const solar = solarRadiation[index];

    // Calculate heating demand based on temperature
    const heatingDemand = Math.max(0, (18 - temp) * 15 + Math.random() * 10);

    // Calculate cooling demand (summer months with high solar gains)
    const coolingDemand = Math.max(0, (temp - 22) * 5 + (solar - 200) * 0.1);

    // Solar gains decrease in winter, increase in summer
    const solarGains = solar * 0.3 + Math.random() * 10;

    // Internal gains relatively constant but slightly higher in winter (more indoor activity)
    const internalGains = 25 + (temp < 10 ? 10 : 0) + Math.random() * 5;

    return {
      month,
      heatingDemand: Math.round(heatingDemand),
      coolingDemand: Math.round(coolingDemand),
      solarGains: Math.round(solarGains),
      internalGains: Math.round(internalGains),
      outdoorTemp: temp,
    };
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="text-foreground font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">{entry.name}</span>
            </div>
            <span className="text-sm font-medium">
              {entry.name === 'Utetemp' ? `${entry.value}°C` : `${entry.value} kWh`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function MonthlyPerformanceChart({
  data,
  buildingType = 'Småhus',
  className = ''
}: MonthlyPerformanceChartProps) {
  // Use provided data or generate default data
  const chartData = data.length > 0 ? data : generateMonthlyData(buildingType);

  return (
    <div className={`w-full h-full ${className}`}>
      <div className="mb-2">
        <h4 className="text-sm font-medium text-foreground mb-1">
          Månedlig energibalanse
        </h4>
        <p className="text-xs text-muted-foreground">
          Oppvarmings- og kjølebehov gjennom året
        </p>
      </div>

      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
          />
          <YAxis
            yAxisId="energy"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            label={{ value: 'kWh', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9ca3af' } }}
          />
          <YAxis
            yAxisId="temp"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            label={{ value: '°C', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#9ca3af' } }}
          />

          {/* Reference line at 0°C */}
          <ReferenceLine yAxisId="temp" y={0} stroke="#6b7280" strokeDasharray="2 2" />

          {/* Heating demand - red bars */}
          <Bar
            yAxisId="energy"
            dataKey="heatingDemand"
            fill="#ef4444"
            name="Oppvarmingsbehov"
            radius={[2, 2, 0, 0]}
          />

          {/* Cooling demand - blue bars */}
          <Bar
            yAxisId="energy"
            dataKey="coolingDemand"
            fill="#3b82f6"
            name="Kjølebehov"
            radius={[2, 2, 0, 0]}
          />

          {/* Solar gains - yellow area */}
          <Bar
            yAxisId="energy"
            dataKey="solarGains"
            fill="#fbbf24"
            name="Soltilskudd"
            opacity={0.7}
            radius={[2, 2, 0, 0]}
          />

          {/* Outdoor temperature line */}
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="outdoorTemp"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
            name="Utetemp"
            connectNulls={false}
          />

          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }}
            iconType="rect"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}