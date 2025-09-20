'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface EnergyGradeVisualizationProps {
  currentGrade: string;
  energyUse: number;
  requirement: number;
  className?: string;
}

export function EnergyGradeVisualization({
  currentGrade,
  energyUse,
  requirement,
  className
}: EnergyGradeVisualizationProps) {
  const grades = [
    { grade: 'A', range: '< 50', color: 'bg-green-500', description: 'Utmerket' },
    { grade: 'B', range: '50-85', color: 'bg-green-400', description: 'Meget god' },
    { grade: 'C', range: '85-115', color: 'bg-yellow-400', description: 'God' },
    { grade: 'D', range: '115-150', color: 'bg-orange-400', description: 'Middels' },
    { grade: 'E', range: '150-200', color: 'bg-orange-500', description: 'Dårlig' },
    { grade: 'F', range: '200-250', color: 'bg-red-500', description: 'Meget dårlig' },
    { grade: 'G', range: '> 250', color: 'bg-red-600', description: 'Ekstrem' }
  ];

  const currentGradeIndex = grades.findIndex(g => g.grade === currentGrade);
  const isAboveRequirement = energyUse > requirement;
  const percentageDifference = Math.round(((energyUse - requirement) / requirement) * 100);

  return (
    <Card className={`backdrop-blur-lg bg-white/10 border-white/20 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center gap-2">
          Energikarakter
          {isAboveRequirement ? (
            <TrendingUp className="w-5 h-5 text-orange-400" />
          ) : (
            <TrendingDown className="w-5 h-5 text-green-400" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Current Grade Display */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white ${grades[currentGradeIndex]?.color || 'bg-gray-500'}`}>
              {currentGrade}
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {energyUse} kWh/m²/år
              </div>
              <div className="text-slate-400 text-sm">
                {grades[currentGradeIndex]?.description || 'Ukjent'}
              </div>
            </div>
          </div>

          {/* Comparison to Requirement */}
          <div className={`p-3 rounded-lg ${isAboveRequirement ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-green-500/20 border border-green-500/30'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">TEK17 krav:</span>
              <span className="text-white font-medium">{requirement} kWh/m²/år</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm text-slate-300">Avvik:</span>
              <span className={`font-medium ${isAboveRequirement ? 'text-orange-400' : 'text-green-400'}`}>
                {percentageDifference > 0 ? '+' : ''}{percentageDifference}%
                {isAboveRequirement ? ' over krav' : ' under krav'}
              </span>
            </div>
          </div>
        </div>

        {/* Grade Scale */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Energikarakter skala (kWh/m²/år)</h4>
          {grades.map((grade, index) => (
            <div
              key={grade.grade}
              className={`flex items-center gap-3 p-2 rounded transition-all ${
                grade.grade === currentGrade
                  ? 'bg-white/10 border border-white/20'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold text-white ${grade.color}`}>
                {grade.grade}
              </div>
              <div className="flex-1 flex justify-between items-center">
                <span className="text-sm text-slate-300">{grade.description}</span>
                <span className="text-xs text-slate-400">{grade.range}</span>
              </div>
              {grade.grade === currentGrade && (
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
              )}
            </div>
          ))}
        </div>

        {/* Improvement Potential */}
        {currentGradeIndex > 2 && (
          <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <div className="text-sm text-cyan-400 font-medium mb-1">
              💡 Forbedringspotensial
            </div>
            <div className="text-xs text-slate-300">
              Med energioppgraderinger kan du forbedre til karakter {grades[Math.max(0, currentGradeIndex - 2)].grade} og spare betydelig på energikostnadene.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}