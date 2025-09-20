'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Zap, MapPin } from 'lucide-react';
import { BuildingInfo, EnergyGrade } from '@/types/norwegian-energy';

interface BuildingSelectorProps {
  address: string;
  buildings: BuildingInfo[];
  selectedBuilding?: string;
  onBuildingSelect: (bygningsnummer: string) => void;
  className?: string;
}

export function BuildingSelector({
  address,
  buildings,
  selectedBuilding,
  onBuildingSelect,
  className = ''
}: BuildingSelectorProps) {
  const getEnergyGradeColor = (grade: EnergyGrade): string => {
    const colorMap: Record<EnergyGrade, string> = {
      'A': 'green-500',
      'B': 'lime-500',
      'C': 'yellow-500',
      'D': 'orange-500',
      'E': 'red-500',
      'F': 'red-600',
      'G': 'red-800'
    };
    return colorMap[grade] || 'slate-600';
  };

  return (
    <Card className={`bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/[0.15] transition-all duration-300 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          <Building className="w-5 h-5 text-cyan-400" />
          Velg bygning
          <span className="text-slate-300 text-sm font-normal">({buildings.length} {buildings.length === 1 ? 'bygning' : 'bygninger'})</span>
        </CardTitle>
        <p className="text-slate-300 text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          {address}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info Message */}
        <div className="bg-slate-800/50 backdrop-blur border border-white/10 rounded-lg p-4 text-center">
          <Building className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <div className="text-white text-sm font-medium mb-1">
            {buildings.length === 1 ? 'En bygning funnet' : 'Flere bygninger funnet'}
          </div>
          <div className="text-slate-400 text-xs">
            {buildings.length === 1
              ? 'Denne adressen har en registrert bygning'
              : `Denne adressen har ${buildings.length} registrerte bygninger. Velg den du vil analysere.`
            }
          </div>
        </div>

        {/* Building Selection */}
        <div className="space-y-2">
          <h4 className="text-white font-medium flex items-center gap-2">
            <Building className="w-4 h-4 text-cyan-400" />
            {buildings.length === 1 ? 'Bygning' : 'Tilgjengelige bygninger'}
          </h4>

          <div className="grid gap-2 max-h-64 overflow-y-auto">
            {buildings.map((building) => {
              const isSelected = building.bygningsnummer === selectedBuilding;
              const energyGrade = building.enovaStatus?.energyGrade;

              return (
                <Button
                  key={`${building.gnr}-${building.bnr}-${building.bygningsnummer}`}
                  variant="ghost"
                  className={`p-4 h-auto text-left justify-start transition-all duration-300 ${
                    isSelected
                      ? 'bg-cyan-400/20 border border-cyan-400/40 text-white'
                      : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                  onClick={() => onBuildingSelect(building.bygningsnummer)}
                >
                  <div className="flex items-center gap-3 w-full">
                    {/* Building Number Badge */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${
                      isSelected
                        ? 'bg-cyan-400 text-slate-900 border-cyan-300'
                        : energyGrade
                          ? `bg-${getEnergyGradeColor(energyGrade)} text-white border-white/40`
                          : 'bg-slate-600 text-white border-white/40'
                    }`}>
                      {building.bygningsnummer}
                    </div>

                    {/* Building Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        Bygning {building.bygningsnummer}
                        {building.buildingType && building.buildingType !== 'Ukjent' && (
                          <span className="text-slate-400 font-normal"> • {building.buildingType}</span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                        {/* Area */}
                        {building.totalArea && (
                          <span>{building.totalArea} m²</span>
                        )}

                        {/* Energy Grade */}
                        {energyGrade && (
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            <span className={`text-${getEnergyGradeColor(energyGrade)}`}>
                              Klasse {energyGrade}
                            </span>
                          </span>
                        )}

                        {/* Enova Status */}
                        {building.enovaStatus?.isRegistered === false && (
                          <span className="text-orange-400">Ikke registrert i Enova</span>
                        )}
                      </div>

                      {/* Property Identifiers */}
                      <div className="text-xs text-slate-500 mt-1">
                        Gnr: {building.gnr} • Bnr: {building.bnr}
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Selection Summary */}
        {selectedBuilding && (
          <div className="bg-cyan-400/10 border border-cyan-400/20 rounded-lg p-3">
            <div className="text-cyan-400 text-sm font-medium">
              ✓ Bygning {selectedBuilding} valgt
            </div>
            <div className="text-slate-300 text-xs mt-1">
              Energianalysen vil bli basert på denne bygningen.
            </div>
          </div>
        )}

        {/* Single Building Auto-Select */}
        {buildings.length === 1 && !selectedBuilding && (
          <div className="bg-blue-400/10 border border-blue-400/20 rounded-lg p-3">
            <div className="text-blue-400 text-sm font-medium">
              💡 Tips
            </div>
            <div className="text-slate-300 text-xs mt-1">
              Klikk på bygningen ovenfor for å fortsette med energianalysen.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BuildingSelector;