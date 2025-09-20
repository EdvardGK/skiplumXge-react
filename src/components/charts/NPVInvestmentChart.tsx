'use client';

import React from 'react';
import { stormColors, stormEffects } from '@/lib/storm-theme';

interface NPVInvestmentChartProps {
  annualWasteCost: number;
  npvOfWaste: number;
  investmentRoom: number;
  wastePerM2: number;
  className?: string;
}

export default function NPVInvestmentChart({
  annualWasteCost,
  npvOfWaste,
  investmentRoom,
  wastePerM2,
  className = ''
}: NPVInvestmentChartProps) {
  // Format numbers for Norwegian display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('nb-NO').format(Math.round(num));
  };

  // Calculate percentage of building being "inefficient"
  const inefficiencyPercentage = Math.min(100, (wastePerM2 / 100) * 100);

  return (
    <div className={`${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white mb-1">
          Investeringsanalyse
        </h3>
        <p className="text-slate-400 text-sm">
          Nåverdi av energisløsing over 10 år (6% diskonteringsrente)
        </p>
      </div>

      <div className="space-y-6">
        {/* Main NPV Display */}
        <div className="text-center p-6 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-400/30">
          <div className="text-sm text-amber-300 mb-2">Nåverdi av energisløsing</div>
          <div className="text-3xl font-bold text-white mb-2">
            {formatCurrency(npvOfWaste)}
          </div>
          <div className="text-xs text-slate-400">
            {formatCurrency(annualWasteCost)}/år i 10 år
          </div>
        </div>

        {/* Investment Capacity */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 rounded-lg bg-emerald-500/10 border border-emerald-400/30">
            <div className="text-sm text-emerald-300 mb-1">Investeringsrom</div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(investmentRoom)}
            </div>
            <div className="text-xs text-slate-400">
              95% av nåverdi
            </div>
          </div>

          <div className="text-center p-4 rounded-lg bg-cyan-500/10 border border-cyan-400/30">
            <div className="text-sm text-cyan-300 mb-1">Årlig besparelse</div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(annualWasteCost)}
            </div>
            <div className="text-xs text-slate-400">
              {formatNumber(wastePerM2)} kWh/m²
            </div>
          </div>
        </div>

        {/* Investment Timeline Visual */}
        <div className="space-y-3">
          <div className="text-sm text-slate-300 font-medium">Investeringstidslinje:</div>

          {/* Timeline bars */}
          <div className="space-y-2">
            {[...Array(5)].map((_, index) => {
              const year = (index + 1) * 2;
              const cumulativeSavings = annualWasteCost * year;
              const progress = Math.min(100, (cumulativeSavings / investmentRoom) * 100);

              return (
                <div key={year} className="flex items-center gap-3 text-xs">
                  <div className="w-12 text-slate-400">År {year}:</div>
                  <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="w-20 text-slate-300 text-right">
                    {formatCurrency(cumulativeSavings)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Break-even point */}
          <div className="text-center pt-2 border-t border-slate-600">
            <div className="text-xs text-slate-400">
              Break-even ved år {Math.round(investmentRoom / annualWasteCost)}
              med konservativ 6% diskonteringsrente
            </div>
          </div>
        </div>

        {/* Investment Confidence */}
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-300">Investeringssikkerhet:</span>
            <span className="text-sm font-semibold text-emerald-400">Konservativ</span>
          </div>
          <div className="text-xs text-slate-400 space-y-1">
            <div>• 6% diskonteringsrente (over markedsrente)</div>
            <div>• 95% av nåverdi som investeringsrom</div>
            <div>• Basert på dagens strømpriser (2,80 kr/kWh)</div>
          </div>
        </div>
      </div>
    </div>
  );
}