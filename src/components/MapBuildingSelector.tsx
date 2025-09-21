'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, CheckCircle, Info, MapPin } from 'lucide-react';

interface BuildingData {
  id: string;
  type: string;
  coordinates: [number, number][];
  area?: number;
  levels?: number;
  height?: number;
  name?: string;
  address?: string;
  bygningsnummer?: string;
  addressLabel?: string;
  category: 'target' | 'neighbor';
  isSelected?: boolean;
}

interface MapBuildingSelectorProps {
  targetBuildings: BuildingData[];
  selectedBuilding: BuildingData | null;
  onBuildingSelect: (building: BuildingData) => void;
  searchedAddress?: string;
  className?: string;
}

// Building type icons
const BUILDING_ICONS = {
  'Kontor': '🏢',
  'Bolig': '🏠',
  'Flerbolig': '🏘️',
  'Småhus': '🏡',
  'Enebolig': '🏠',
  'Industri': '🏭',
  'Butikk': '🏪',
  'Skole': '🏫',
  'Sykehus': '🏥',
  'Hotell': '🏨',
  'Bygning': '🏢'
};

export function MapBuildingSelector({
  targetBuildings,
  selectedBuilding,
  onBuildingSelect,
  searchedAddress,
  className = ''
}: MapBuildingSelectorProps) {
  if (targetBuildings.length === 0) {
    return (
      <Card className={`bg-white/5 border-white/10 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-cyan-400" />
            Velg bygning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-6">
            <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Ingen bygninger funnet</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchedAddress ? `på ${searchedAddress}` : 'på denne adressen'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-white/5 border-white/10 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
          <Building className="w-4 h-4 text-cyan-400" />
          Velg bygning
        </CardTitle>
        {searchedAddress && (
          <p className="text-xs text-slate-400 mt-1">
            <MapPin className="w-3 h-3 inline mr-1" />
            {searchedAddress}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Info about selection */}
        <div className="flex items-start gap-2 p-2 rounded-lg bg-cyan-500/10 border border-cyan-400/20">
          <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-300">
            <p className="text-cyan-400 font-medium mb-1">Bygninger på adressen</p>
            <p>Velg bygningen du vil analysere. Alle bygninger på samme adresse vises i listen.</p>
          </div>
        </div>

        {/* Building list */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {targetBuildings.map((building, index) => {
            const isSelected = selectedBuilding?.id === building.id;
            const icon = BUILDING_ICONS[building.type as keyof typeof BUILDING_ICONS] || '🏢';

            return (
              <Button
                key={building.id}
                variant={isSelected ? "default" : "outline"}
                className={`w-full justify-start text-left h-auto p-3 relative ${
                  isSelected
                    ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 border-fuchsia-400'
                    : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-cyan-400/50'
                }`}
                onClick={() => onBuildingSelect(building)}
              >
                <div className="flex items-start gap-3 w-full">
                  {/* Building icon */}
                  <div className="text-lg flex-shrink-0">
                    {icon}
                  </div>

                  {/* Building info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`text-sm font-medium truncate ${
                        isSelected ? 'text-white' : 'text-white'
                      }`}>
                        {building.name || `${building.type} ${index + 1}`}
                      </h4>
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
                      )}
                    </div>

                    {/* Building details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`text-xs ${
                          isSelected
                            ? 'bg-white/20 text-white border-white/30'
                            : 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30'
                        }`}>
                          {building.type}
                        </Badge>
                        {building.area && (
                          <span className={`text-xs ${
                            isSelected ? 'text-white/80' : 'text-slate-400'
                          }`}>
                            ~{Math.round(building.area)} m²
                          </span>
                        )}
                      </div>

                      {building.levels && (
                        <p className={`text-xs ${
                          isSelected ? 'text-white/70' : 'text-slate-500'
                        }`}>
                          {building.levels} etasjer
                        </p>
                      )}

                      {building.bygningsnummer && (
                        <p className={`text-xs font-mono ${
                          isSelected ? 'text-white/60' : 'text-slate-500'
                        }`}>
                          Bygg #{building.bygningsnummer}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        {/* Selection summary */}
        {selectedBuilding && (
          <div className="pt-2 border-t border-white/10">
            <div className="text-xs text-slate-400">
              <span className="text-fuchsia-400 font-medium">Valgt:</span>{' '}
              {selectedBuilding.name || selectedBuilding.type}
              {selectedBuilding.area && ` • ${Math.round(selectedBuilding.area)} m²`}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MapBuildingSelector;