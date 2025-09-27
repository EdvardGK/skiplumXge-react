'use client';

import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ContextualTooltipProps {
  title: string;
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  type?: 'info' | 'warning' | 'tip';
}

export function ContextualTooltip({
  title,
  content,
  children,
  position = 'top',
  size = 'md',
  type = 'info'
}: ContextualTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const typeStyles = {
    info: 'border-cyan-500/50 bg-cyan-950/90',
    warning: 'border-orange-500/50 bg-orange-950/90',
    tip: 'border-emerald-500/50 bg-emerald-950/90'
  };

  const sizeStyles = {
    sm: 'max-w-xs',
    md: 'max-w-sm',
    lg: 'min-w-[400px] max-w-2xl'
  };

  const positionStyles = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2'
  };

  return (
    <div className="relative inline-block">
      {/* Trigger */}
      <div
        className="inline-flex items-center gap-1 cursor-help"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
      >
        {children}
        <HelpCircle className="w-4 h-4 text-slate-400 hover:text-cyan-400 transition-colors" />
      </div>

      {/* Tooltip */}
      {isOpen && (
        <div
          className={`absolute z-50 ${positionStyles[position]} ${sizeStyles[size]}`}
          style={{
            left: position === 'top' || position === 'bottom' ? '50%' : undefined,
            top: position === 'left' || position === 'right' ? '50%' : undefined,
            transform: position === 'top' || position === 'bottom'
              ? 'translateX(-50%)'
              : position === 'left' || position === 'right'
              ? 'translateY(-50%)'
              : undefined
          }}
        >
          <Card className={`backdrop-blur-lg border ${typeStyles[type]} shadow-xl`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-white">
                  {title}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <p className="text-xs text-slate-300 leading-relaxed">
                {content}
              </p>
            </CardContent>
          </Card>

          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-slate-800 border-l border-t ${
              type === 'info' ? 'border-cyan-500/50' :
              type === 'warning' ? 'border-orange-500/50' :
              'border-emerald-500/50'
            } transform rotate-45 ${
              position === 'top' ? 'top-full -mt-1 left-1/2 -translate-x-1/2' :
              position === 'bottom' ? 'bottom-full -mb-1 left-1/2 -translate-x-1/2' :
              position === 'left' ? 'left-full -ml-1 top-1/2 -translate-y-1/2' :
              'right-full -mr-1 top-1/2 -translate-y-1/2'
            }`}
          />
        </div>
      )}
    </div>
  );
}

// Predefined tooltips for common Norwegian energy terms
export const EnergyTooltips = {
  TEK17: {
    title: "TEK17 § 14-2",
    content: "Norske byggeforskrifter som setter krav til energibruk i bygninger. Målet er å redusere energiforbruket og klimagassutslippene fra byggesektoren.",
    type: "info" as const
  },

  EnergyGrade: {
    title: "Energikarakter A-G",
    content: "Skala som viser bygningens energieffektivitet. A er best (lavest energibruk), G er dårligst. De fleste norske bygninger har karakter C-E.",
    type: "info" as const
  },

  BRA: {
    title: "Bruksareal (BRA)",
    content: "Summen av alle gulvareal i en bygning som kan brukes til det formålet bygningen er oppført for. Måles i kvadratmeter (m²).",
    type: "info" as const
  },

  Enova: {
    title: "Enova",
    content: "Statlig forvaltningsorgan som gir støtte til energi- og klimatiltak. Administrerer også energisertifikatordningen i Norge.",
    type: "info" as const
  },

  InvestmentRoom: {
    title: "Investeringsrom",
    content: "Estimert beløp du kan investere i energitiltak basert på årlige besparelser. Bruker konservativ NPV-beregning med 7 års tilbakebetalingstid.",
    type: "tip" as const
  },

  EnergyWaste: {
    title: "Energisløsing",
    content: "Unødvendig energiforbruk som kan reduseres gjennom oppgraderinger som bedre isolasjon, moderne vinduer eller varmepumpe.",
    type: "warning" as const
  }
};

// Helper component for quick energy term tooltips
interface EnergyTermTooltipProps {
  term: keyof typeof EnergyTooltips;
  children: React.ReactNode;
}

export function EnergyTermTooltip({ term, children }: EnergyTermTooltipProps) {
  const tooltip = EnergyTooltips[term];
  return (
    <ContextualTooltip
      title={tooltip.title}
      content={tooltip.content}
      type={tooltip.type}
    >
      {children}
    </ContextualTooltip>
  );
}