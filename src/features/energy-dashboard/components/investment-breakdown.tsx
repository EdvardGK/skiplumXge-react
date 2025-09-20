import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InvestmentBreakdown as InvestmentBreakdownType } from '@/types/norwegian-energy';
import { formatNOK } from '@/lib/energy-calculations';

interface InvestmentBreakdownProps {
  breakdown: InvestmentBreakdownType;
  className?: string;
}

const InvestmentBreakdown = memo<InvestmentBreakdownProps>(({
  breakdown,
  className = '',
}) => {
  const breakdownItems = useMemo(() => [
    {
      emoji: '🔥',
      title: 'Oppvarming',
      amount: breakdown.heating.amount,
      percentage: breakdown.heating.percentage,
      description: breakdown.heating.description,
      gradientFrom: 'from-orange-500/20',
      gradientTo: 'to-red-500/20',
      textColor: 'text-orange-400',
    },
    {
      emoji: '💡',
      title: 'Belysning',
      amount: breakdown.lighting.amount,
      percentage: breakdown.lighting.percentage,
      description: breakdown.lighting.description,
      gradientFrom: 'from-yellow-500/20',
      gradientTo: 'to-amber-500/20',
      textColor: 'text-yellow-400',
    },
    {
      emoji: '🔌',
      title: 'Øvrige systemer',
      amount: breakdown.other.amount,
      percentage: breakdown.other.percentage,
      description: breakdown.other.description,
      gradientFrom: 'from-purple-500/20',
      gradientTo: 'to-pink-500/20',
      textColor: 'text-purple-400',
    },
  ], [breakdown]);

  return (
    <Card className={`backdrop-blur-lg bg-white/5 border-white/20 ${className}`}>
      <CardHeader>
        <CardTitle className="text-2xl text-white">💰 Investeringsfordeling</CardTitle>
        <CardDescription className="text-slate-300">
          Basert på SINTEF-forskning og SSB-data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {breakdownItems.map((item, index) => (
            <div
              key={item.title}
              className={`text-center p-6 rounded-lg bg-gradient-to-br ${item.gradientFrom} ${item.gradientTo}`}
            >
              <div className="text-3xl mb-2">{item.emoji}</div>
              <div className="text-lg font-semibold text-white mb-1">{item.title}</div>
              <div className={`text-2xl font-bold ${item.textColor}`}>
                {formatNOK(item.amount)}
              </div>
              <div className="text-slate-400 text-sm">{item.percentage}% av energibruk</div>
              <div className="text-slate-400 text-xs mt-2">{item.description}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

InvestmentBreakdown.displayName = 'InvestmentBreakdown';

export { InvestmentBreakdown };
export type { InvestmentBreakdownProps };