'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { stormColors, getEnergyGradeColor } from '@/lib/storm-theme';

interface EnergyGaugeChartProps {
  currentGrade: string;
  currentValue: number;
  maxValue: number;
  tek17Limit: number;
  size?: number;
  showLabels?: boolean;
  className?: string;
}

// Energy grade thresholds (kWh/m²/år) based on Norwegian standards
const energyGradeThresholds = {
  A: { min: 0, max: 50, color: stormColors.energyGrades.A },
  B: { min: 50, max: 85, color: stormColors.energyGrades.B },
  C: { min: 85, max: 120, color: stormColors.energyGrades.C },
  D: { min: 120, max: 160, color: stormColors.energyGrades.D },
  E: { min: 160, max: 200, color: stormColors.energyGrades.E },
  F: { min: 200, max: 250, color: stormColors.energyGrades.F },
  G: { min: 250, max: 300, color: stormColors.energyGrades.G },
};

export default function EnergyGaugeChart({
  currentGrade,
  currentValue,
  maxValue,
  tek17Limit,
  size = 200,
  showLabels = true,
  className = ''
}: EnergyGaugeChartProps) {
  // Create gauge segments for proper semicircle
  const createGaugeData = () => {
    const segments = [];

    Object.entries(energyGradeThresholds).forEach(([grade, threshold]) => {
      const segmentSize = (threshold.max - threshold.min) / maxValue * 50; // Equal segments
      segments.push({
        name: grade,
        value: segmentSize,
        color: threshold.color,
        isActive: grade === currentGrade
      });
    });

    // Add empty segment to complete the circle (will be hidden by container)
    segments.push({
      name: 'empty',
      value: 50, // Bottom half of circle (hidden)
      color: 'transparent',
      isActive: false
    });

    return segments;
  };

  const gaugeData = createGaugeData();

  // Calculate needle angle based on current value
  const needleAngle = (currentValue / maxValue) * 180 - 90; // -90 to start from left

  // Custom needle component
  const renderNeedle = (cx: number, cy: number, midAngle: number, innerRadius: number, outerRadius: number) => {
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (innerRadius + 20) * cos;
    const sy = cy + (innerRadius + 20) * sin;
    const mx = cx + (innerRadius + outerRadius) / 2 * cos;
    const my = cy + (innerRadius + outerRadius) / 2 * sin;
    const ex = cx + (outerRadius - 10) * cos;
    const ey = cy + (outerRadius - 10) * sin;

    return (
      <g>
        {/* Needle shadow */}
        <path
          d={`M${sx + 2},${sy + 2} L${mx + 2},${my + 2} L${ex + 2},${ey + 2} L${sx + 2},${sy + 2}`}
          stroke="rgba(0,0,0,0.3)"
          fill="rgba(0,0,0,0.3)"
          strokeWidth={3}
        />
        {/* Main needle */}
        <path
          d={`M${sx},${sy} L${mx},${my} L${ex},${ey} L${sx},${sy}`}
          stroke={stormColors.lightning.cyan}
          fill={stormColors.lightning.cyan}
          strokeWidth={2}
          filter="drop-shadow(0 0 8px rgba(6, 182, 212, 0.8))"
        />
        {/* Center circle */}
        <circle
          cx={cx}
          cy={cy}
          r={8}
          fill={stormColors.lightning.cyan}
          stroke="white"
          strokeWidth={2}
          filter="drop-shadow(0 0 12px rgba(6, 182, 212, 0.8))"
        />
      </g>
    );
  };

  // Calculate dimensions based on size prop
  const gaugeWidth = size;
  const gaugeHeight = size / 2; // Semicircle: height is half of width
  const letterSize = size >= 100 ? 'text-3xl' : size >= 80 ? 'text-2xl' : size >= 60 ? 'text-xl' : 'text-lg';

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <div className="relative flex flex-col items-center justify-center">
        {/* Gauge container - sized based on prop */}
        <div className="relative" style={{width: `${gaugeWidth}px`, height: `${gaugeHeight}px`}}>
          <ResponsiveContainer width="100%" height="200%">
            <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="50%"
                startAngle={180}
                endAngle={-180}
                innerRadius="40%"
                outerRadius="90%"
                dataKey="value"
                stroke="none"
              >
              {gaugeData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={entry.isActive ? 1 : 0.6}
                  stroke={entry.isActive ? 'white' : 'transparent'}
                  strokeWidth={entry.isActive ? 3 : 0}
                />
              ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Energy grade letter - centered in semicircle */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2" style={{ transform: 'translate(-50%, calc(-25% + 20px))' }}>
            <div
              className={`${letterSize} font-bold leading-none text-center`}
              style={{ color: getEnergyGradeColor(currentGrade) }}
            >
              {currentGrade}
            </div>
          </div>
        </div>
      </div>

      {/* Grade labels - only show if requested */}
      {showLabels && (
        <div className="mt-4 w-full">
          <div className="grid grid-cols-7 gap-1 text-xs">
            {Object.entries(energyGradeThresholds).map(([grade, threshold]) => (
              <div
                key={grade}
                className={`text-center p-1 rounded ${
                  grade === currentGrade ? 'bg-white/20' : ''
                }`}
              >
                <div
                  className="w-3 h-3 rounded mx-auto mb-1"
                  style={{ backgroundColor: threshold.color }}
                />
                <div
                  className={`font-semibold text-xs ${
                    grade === currentGrade ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {grade}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}