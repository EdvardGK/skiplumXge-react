'use client';

import { useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProgressiveDisclosureProps {
  title: string;
  summary: React.ReactNode;
  details: React.ReactNode;
  defaultExpanded?: boolean;
  level?: 'primary' | 'secondary';
  className?: string;
}

export function ProgressiveDisclosure({
  title,
  summary,
  details,
  defaultExpanded = false,
  level = 'secondary',
  className
}: ProgressiveDisclosureProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const levelStyles = {
    primary: {
      card: 'backdrop-blur-lg bg-white/10 border-white/20',
      button: 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border-cyan-500/30'
    },
    secondary: {
      card: 'backdrop-blur-lg bg-white/5 border-white/10',
      button: 'bg-white/10 hover:bg-white/20 text-slate-300 border-white/20'
    }
  };

  return (
    <Card className={`${levelStyles[level].card} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg">{title}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className={`${levelStyles[level].button} transition-all duration-200`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Skjul detaljer
                <ChevronUp className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Vis detaljer
                <ChevronDown className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Always visible summary */}
        <div className="pb-2">
          {summary}
        </div>

        {/* Expandable details */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="pt-4 border-t border-white/10">
            {details}
          </div>
        </div>

        {/* Expansion hint when collapsed */}
        {!isExpanded && (
          <div className="text-center pt-2">
            <div className="inline-flex items-center gap-1 text-xs text-slate-400">
              <ChevronDown className="w-3 h-3" />
              <span>Klikk "Vis detaljer" for mer informasjon</span>
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Specialized component for energy data disclosure
interface EnergyDataDisclosureProps {
  title: string;
  primaryMetric: {
    value: string | number;
    unit: string;
    label: string;
    status?: 'good' | 'warning' | 'error';
  };
  secondaryMetrics?: Array<{
    label: string;
    value: string | number;
    unit?: string;
    context?: string;
  }>;
  explanation?: string;
  recommendations?: string[];
  className?: string;
}

export function EnergyDataDisclosure({
  title,
  primaryMetric,
  secondaryMetrics = [],
  explanation,
  recommendations = [],
  className
}: EnergyDataDisclosureProps) {
  const statusColors = {
    good: 'text-green-400',
    warning: 'text-orange-400',
    error: 'text-red-400'
  };

  const summary = (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <div className={`text-3xl font-bold ${statusColors[primaryMetric.status || 'good']}`}>
          {primaryMetric.value}
          <span className="text-lg text-slate-400 ml-1">{primaryMetric.unit}</span>
        </div>
        <div className="text-sm text-slate-400">{primaryMetric.label}</div>
      </div>
      {secondaryMetrics.length > 0 && (
        <div className="flex-1 grid grid-cols-2 gap-3">
          {secondaryMetrics.slice(0, 2).map((metric, index) => (
            <div key={index} className="text-center">
              <div className="text-lg font-semibold text-white">
                {metric.value}
                {metric.unit && <span className="text-sm text-slate-400 ml-1">{metric.unit}</span>}
              </div>
              <div className="text-xs text-slate-400">{metric.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const details = (
    <div className="space-y-4">
      {explanation && (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Forklaring</h4>
          <p className="text-sm text-slate-400 leading-relaxed">{explanation}</p>
        </div>
      )}

      {secondaryMetrics.length > 2 && (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Tilleggsdata</h4>
          <div className="grid grid-cols-2 gap-3">
            {secondaryMetrics.slice(2).map((metric, index) => (
              <div key={index} className="p-2 bg-white/5 rounded">
                <div className="text-sm font-medium text-white">
                  {metric.value}
                  {metric.unit && <span className="text-slate-400 ml-1">{metric.unit}</span>}
                </div>
                <div className="text-xs text-slate-400">{metric.label}</div>
                {metric.context && (
                  <div className="text-xs text-slate-500 mt-1">{metric.context}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Anbefalinger</h4>
          <ul className="space-y-1">
            {recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-slate-400 flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <ProgressiveDisclosure
      title={title}
      summary={summary}
      details={details}
      level="primary"
      className={className}
    />
  );
}