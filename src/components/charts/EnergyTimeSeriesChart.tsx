'use client';

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { stormColors, stormEffects } from '@/lib/storm-theme';

interface EnergyDataPoint {
  month: string;
  consumption: number;
  cost: number;
  temperature: number;
  tek17Limit: number;
  savings?: number;
}

interface ElectricityPriceDataPoint {
  quarter: string;
  price: number;
  zone: string;
  year: number;
}

interface EnergyTimeSeriesChartProps {
  data: EnergyDataPoint[];
  type?: 'line' | 'area' | 'bar';
  showSavings?: boolean;
  height?: number;
  className?: string;
  showTitle?: boolean;
  chartMode?: 'energy' | 'price';
  energyZone?: string;
}

// Generate sample data representing realistic Norwegian energy consumption
const generateSampleData = (): EnergyDataPoint[] => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun',
    'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  const baseConsumption = 850; // kWh/month for typical Norwegian building
  const tek17Limit = 1100; // kWh/month based on TEK17 requirements

  return months.map((month, index) => {
    // Winter months have higher consumption
    const seasonalMultiplier = index < 3 || index > 9 ? 1.4 : 0.7;
    const consumption = Math.round(baseConsumption * seasonalMultiplier + Math.random() * 100);
    const cost = Math.round(consumption * 2.8); // 2.8 kr/kWh Norwegian average
    const temperature = index < 3 || index > 9 ? Math.random() * 10 - 5 : Math.random() * 20 + 10;
    const savings = Math.max(0, consumption - (tek17Limit * 0.8));

    return {
      month,
      consumption,
      cost,
      temperature,
      tek17Limit,
      savings
    };
  });
};

// Generate quarterly electricity price data for Norwegian price zones (past 36 months = 12 quarters)
const generateElectricityPriceData = (zone: string = 'NO1'): ElectricityPriceDataPoint[] => {
  const quarters: string[] = [];

  // Generate past 36 months (12 quarters) ending with Q4 2024
  const endYear = 2024;
  const endQuarter = 4;

  for (let i = 11; i >= 0; i--) {
    const totalQuarters = (endYear - 2022) * 4 + endQuarter; // Total quarters from 2022 Q1
    const targetQuarter = totalQuarters - i;

    const year = 2022 + Math.floor((targetQuarter - 1) / 4);
    const quarter = ((targetQuarter - 1) % 4) + 1;

    quarters.push(`Q${quarter} ${year}`);
  }

  // Base prices per zone (øre/kWh) - realistic Norwegian data
  const zonePrices: { [key: string]: number } = {
    'NO1': 285, // Oslo/Øst-Norge
    'NO2': 275, // Sørvest-Norge
    'NO3': 265, // Midt-Norge
    'NO4': 255, // Nord-Norge
    'NO5': 290  // Vest-Norge
  };

  const basePrice = zonePrices[zone] || zonePrices['NO1'];

  return quarters.map((quarter, index) => {
    const quarterNum = parseInt(quarter.split(' ')[0].replace('Q', ''));
    const year = parseInt(quarter.split(' ')[1]);

    // Seasonal price variation
    let seasonalMultiplier = 1.0;
    if (quarterNum === 1 || quarterNum === 4) {
      seasonalMultiplier = 1.15; // Higher winter prices
    } else if (quarterNum === 3) {
      seasonalMultiplier = 0.85; // Lower summer prices
    }

    // Historical trend - prices generally higher in recent years
    const yearMultiplier = year >= 2024 ? 1.1 : (year >= 2023 ? 1.05 : (year >= 2022 ? 0.95 : 0.9));

    // Add some random variation
    const randomVariation = (Math.random() * 20 - 10);

    const price = Math.round(basePrice * seasonalMultiplier * yearMultiplier + randomVariation);

    return {
      quarter,
      price,
      zone,
      year
    };
  });
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className={`${stormEffects.stormGlass} p-4 rounded-lg`}>
      <p className="text-cyan-400 font-semibold mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-300">
            {entry.name}: <span className="text-white font-semibold">{entry.value}</span>
            {entry.name === 'Forbruk' || entry.name === 'TEK17 Grense' ? ' kWh' : ''}
            {entry.name === 'Kostnad' ? ' kr' : ''}
            {entry.name === 'Temperatur' ? '°C' : ''}
            {entry.name === 'Strømpris' ? ' øre/kWh' : ''}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function EnergyTimeSeriesChart({
  data,
  type = 'area',
  showSavings = true,
  height = 300,
  className = '',
  showTitle = true,
  chartMode = 'energy',
  energyZone = 'NO1'
}: EnergyTimeSeriesChartProps) {
  // Use appropriate data based on chart mode
  const energyData = data.length > 0 ? data : generateSampleData();
  const priceData = generateElectricityPriceData(energyZone);
  const chartData = chartMode === 'price' ? priceData : energyData;

  const ChartComponent = type === 'bar' ? BarChart : (type === 'area' ? AreaChart : LineChart);

  return (
    <div className={`w-full ${className}`}>
      {showTitle && (
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white mb-1">
            {chartMode === 'price' ? 'Strømpriser per kvartal' : 'Energiforbruk over tid'}
          </h3>
          <p className="text-slate-400 text-sm">
            {chartMode === 'price'
              ? `Kvartalspriser for prisområde ${energyZone} (øre/kWh)`
              : 'Månedlig forbruk vs TEK17-krav med temperaturkorrelasjon'
            }
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            {/* Gradient definitions for storm theme */}
            <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={stormColors.lightning.cyan} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={stormColors.lightning.cyan} stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={stormColors.lightning.neon} stopOpacity={0.6}/>
              <stop offset="95%" stopColor={stormColors.lightning.neon} stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="limitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={stormColors.lightning.thunder} stopOpacity={0.6}/>
              <stop offset="95%" stopColor={stormColors.lightning.thunder} stopOpacity={0.1}/>
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.1)"
            horizontal={true}
            vertical={false}
          />

          <XAxis
            dataKey={chartMode === 'price' ? 'quarter' : 'month'}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            label={{
              value: chartMode === 'price' ? 'øre/kWh' : 'kWh',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#94a3b8' }
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* TEK17 Reference Line */}
          <ReferenceLine
            y={1100}
            stroke={stormColors.lightning.thunder}
            strokeDasharray="8 8"
            strokeWidth={2}
            label={{
              value: "TEK17 Grense",
              position: "top",
              fill: stormColors.lightning.thunder
            }}
          />

          {type === 'bar' ? (
            <>
              {/* Main bars - consumption or price */}
              <Bar
                dataKey={chartMode === 'price' ? 'price' : 'consumption'}
                fill="url(#consumptionGradient)"
                stroke={stormColors.lightning.cyan}
                strokeWidth={1}
                name={chartMode === 'price' ? 'Strømpris' : 'Forbruk'}
                radius={[2, 2, 0, 0]}
              />
            </>
          ) : type === 'area' ? (
            <>
              {/* Main consumption area */}
              <Area
                type="monotone"
                dataKey="consumption"
                stroke={stormColors.lightning.cyan}
                strokeWidth={3}
                fill="url(#consumptionGradient)"
                name="Forbruk"
              />

              {/* Savings area (above TEK17 limit) */}
              {showSavings && (
                <Area
                  type="monotone"
                  dataKey="savings"
                  stroke={stormColors.lightning.neon}
                  strokeWidth={2}
                  fill="url(#savingsGradient)"
                  name="Besparingspotensialet"
                />
              )}
            </>
          ) : (
            <>
              {/* Main consumption line */}
              <Line
                type="monotone"
                dataKey="consumption"
                stroke={stormColors.lightning.cyan}
                strokeWidth={4}
                dot={{ fill: stormColors.lightning.cyan, strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: stormColors.lightning.cyan, strokeWidth: 2 }}
                name="Forbruk"
              />

              {/* TEK17 limit line */}
              <Line
                type="monotone"
                dataKey="tek17Limit"
                stroke={stormColors.lightning.thunder}
                strokeWidth={2}
                strokeDasharray="8 8"
                dot={false}
                name="TEK17 Grense"
              />
            </>
          )}
        </ChartComponent>
      </ResponsiveContainer>

      {/* Chart Legend/Insights */}
      {chartMode === 'price' ? (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
              <span className="text-slate-300">Gjennomsnitt</span>
            </div>
            <div className="text-white font-semibold">
              {Math.round(priceData.reduce((sum, d) => sum + d.price, 0) / priceData.length)} øre/kWh
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              <span className="text-slate-300">Prisområde</span>
            </div>
            <div className="text-white font-semibold">
              {energyZone}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-purple-400"></div>
              <span className="text-slate-300">Høyeste kvartal</span>
            </div>
            <div className="text-white font-semibold">
              {Math.max(...priceData.map(d => d.price))} øre/kWh
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
              <span className="text-slate-300">Gjennomsnitt</span>
            </div>
            <div className="text-white font-semibold">
              {Math.round(energyData.reduce((sum, d) => sum + d.consumption, 0) / energyData.length)} kWh/mnd
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <span className="text-slate-300">Over TEK17</span>
            </div>
            <div className="text-white font-semibold">
              {energyData.filter(d => d.consumption > d.tek17Limit).length} måneder
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              <span className="text-slate-300">Årlig kostnad</span>
            </div>
            <div className="text-white font-semibold">
              {Math.round(energyData.reduce((sum, d) => sum + d.cost, 0)).toLocaleString()} kr
            </div>
          </div>
        </div>
      )}
    </div>
  );
}