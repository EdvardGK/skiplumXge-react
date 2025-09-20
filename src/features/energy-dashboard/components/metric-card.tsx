import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  delta?: string;
  color?: 'success' | 'warning' | 'error' | 'info';
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
}

const MetricCard = memo<MetricCardProps>(({
  title,
  value,
  delta,
  color = 'info',
  icon: Icon,
  onClick,
  className = '',
}) => {
  const colorClasses = {
    success: 'text-emerald-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    info: 'text-cyan-400',
  };

  const deltaColorClasses = {
    success: 'text-emerald-400',
    warning: 'text-orange-400',
    error: 'text-red-400',
    info: 'text-cyan-400',
  };

  return (
    <Card
      className={`
        backdrop-blur-lg bg-white/10 border-white/20
        hover:bg-white/15 transition-all duration-300 hover:scale-105
        ${onClick ? 'cursor-pointer group' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <CardContent className="p-6 text-center">
        <Icon className={`w-8 h-8 mx-auto mb-3 ${colorClasses[color]} ${onClick ? 'group-hover:animate-pulse' : ''}`} />
        <div className="text-slate-300 text-sm font-medium mb-1">{title}</div>
        <div className={`text-2xl font-bold text-white mb-1 ${onClick ? 'group-hover:text-opacity-80 transition-colors' : ''}`}>
          {value}
        </div>
        {delta && (
          <div className={`text-xs ${deltaColorClasses[color]}`}>
            {delta}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

MetricCard.displayName = 'MetricCard';

export { MetricCard };
export type { MetricCardProps };