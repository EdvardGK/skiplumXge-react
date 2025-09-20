'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Building, Zap } from 'lucide-react';
import { BuildingInfo, EnergyGrade } from '@/types/norwegian-energy';

// Dynamically import react-leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

interface MapComponentProps {
  address: string;
  buildings: BuildingInfo[];
  selectedBuilding?: string;
  onBuildingSelect: (bygningsnummer: string) => void;
  className?: string;
  showMap?: boolean; // Whether to show map or just list
}

export function MapComponent({
  address,
  buildings,
  selectedBuilding,
  onBuildingSelect,
  className = '',
  showMap = true
}: MapComponentProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Calculate map center from buildings
  const mapCenter = useMemo(() => {
    if (buildings.length === 0) return [59.9139, 10.7522]; // Oslo fallback

    const buildingsWithCoords = buildings.filter(b => b.coordinates);
    if (buildingsWithCoords.length === 0) {
      // Use first building's coordinates or fallback
      return buildings[0]?.coordinates ? [buildings[0].coordinates.lat, buildings[0].coordinates.lon] : [59.9139, 10.7522];
    }

    const centerLat = buildingsWithCoords.reduce((sum, b) => sum + b.coordinates!.lat, 0) / buildingsWithCoords.length;
    const centerLon = buildingsWithCoords.reduce((sum, b) => sum + b.coordinates!.lon, 0) / buildingsWithCoords.length;
    return [centerLat, centerLon];
  }, [buildings]);

  // Check if we should show map (buildings have map data)
  const hasMapData = buildings.some(b => b.hasMapData);
  const shouldShowMap = showMap && hasMapData;

  // Create custom icons for buildings
  const createBuildingIcon = async (building: BuildingInfo) => {
    if (typeof window === 'undefined') return null;

    const L = await import('leaflet');
    const isSelected = building.bygningsnummer === selectedBuilding;
    const energyGrade = building.enovaStatus?.energyGrade;

    const iconHtml = `
      <div class="relative">
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 transition-all duration-300 ${
          isSelected
            ? 'bg-cyan-400 border-cyan-300 scale-125 shadow-lg shadow-cyan-400/50'
            : energyGrade
              ? `bg-${getEnergyGradeColor(energyGrade)} border-white/40`
              : 'bg-slate-600 border-white/40'
        }">
          ${building.bygningsnummer}
        </div>
        ${isSelected ? '<div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-cyan-400 rotate-45"></div>' : ''}
      </div>
    `;

    return L.divIcon({
      html: iconHtml,
      className: 'custom-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

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
          <MapPin className="w-5 h-5 text-cyan-400" />
          Velg bygning
          <span className="text-slate-300 text-sm font-normal">({buildings.length} bygninger funnet)</span>
        </CardTitle>
        <p className="text-slate-300 text-sm">{address}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Map Container or Info Message */}
        {shouldShowMap ? (
          <div className="relative rounded-lg overflow-hidden border border-white/10">
            {isLoading && (
              <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-white text-sm">Laster kart...</div>
              </div>
            )}
            <div className="w-full h-64 bg-slate-900">
              {typeof window !== 'undefined' && (
                <MapContainer
                  center={mapCenter as [number, number]}
                  zoom={18}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                  attributionControl={false}
                  whenReady={() => setIsLoading(false)}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />

                  {buildings.filter(b => b.hasMapData).map((building) => (
                    <BuildingMarker
                      key={building.bygningsnummer}
                      building={building}
                      isSelected={building.bygningsnummer === selectedBuilding}
                      onSelect={() => onBuildingSelect(building.bygningsnummer)}
                      getEnergyGradeColor={getEnergyGradeColor}
                    />
                  ))}
                </MapContainer>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur border border-white/10 rounded-lg p-4 text-center">
            <Building className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <div className="text-white text-sm font-medium mb-1">Kartdata ikke tilgjengelig</div>
            <div className="text-slate-400 text-xs">
              Velg bygning fra listen nedenfor basert på {buildings.length > 1 ? 'Enova-data' : 'eiendomsregisteret'}
            </div>
          </div>
        )}

        {/* Building List */}
        <div className="space-y-2">
          <h4 className="text-white font-medium flex items-center gap-2">
            <Building className="w-4 h-4 text-cyan-400" />
            Tilgjengelige bygninger
          </h4>
          <div className="grid gap-2 max-h-32 overflow-y-auto">
            {buildings.map((building) => {
              const isSelected = building.bygningsnummer === selectedBuilding;
              const energyGrade = building.enovaStatus?.energyGrade;

              return (
                <Button
                  key={building.bygningsnummer}
                  variant="ghost"
                  className={`p-3 h-auto text-left justify-start transition-all duration-300 ${
                    isSelected
                      ? 'bg-cyan-400/20 border border-cyan-400/40 text-white'
                      : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                  onClick={() => onBuildingSelect(building.bygningsnummer)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isSelected
                        ? 'bg-cyan-400 text-slate-900'
                        : energyGrade
                          ? `bg-${getEnergyGradeColor(energyGrade)} text-white`
                          : 'bg-slate-600 text-white'
                    }`}>
                      {building.bygningsnummer}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        Bygning {building.bygningsnummer}
                        {building.buildingType && (
                          <span className="text-slate-400 font-normal"> • {building.buildingType}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        {building.totalArea && <span>{building.totalArea} m²</span>}
                        {energyGrade && (
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Klasse {energyGrade}
                          </span>
                        )}
                        {!building.enovaStatus?.isRegistered && (
                          <span className="text-orange-400">Ikke registrert</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Selection Info */}
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
      </CardContent>
    </Card>
  );
}

// Separate component for building markers to handle dynamic icons
interface BuildingMarkerProps {
  building: BuildingInfo;
  isSelected: boolean;
  onSelect: () => void;
  getEnergyGradeColor: (grade: EnergyGrade) => string;
}

function BuildingMarker({ building, isSelected, onSelect, getEnergyGradeColor }: BuildingMarkerProps) {
  const [icon, setIcon] = React.useState<any>(null);

  React.useEffect(() => {
    const createIcon = async () => {
      if (typeof window === 'undefined') return;

      const L = await import('leaflet');
      const energyGrade = building.enovaStatus?.energyGrade;

      const iconHtml = `
        <div class="relative cursor-pointer">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 transition-all duration-300 ${
            isSelected
              ? 'bg-cyan-400 border-cyan-300 scale-125 shadow-lg shadow-cyan-400/50'
              : energyGrade
                ? `bg-${getEnergyGradeColor(energyGrade)} border-white/40`
                : 'bg-slate-600 border-white/40'
          }">
            ${building.bygningsnummer}
          </div>
          ${isSelected ? '<div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-cyan-400 rotate-45"></div>' : ''}
        </div>
      `;

      const newIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      setIcon(newIcon);
    };

    createIcon();
  }, [building, isSelected, getEnergyGradeColor]);

  if (!icon) return null;

  const energyGrade = building.enovaStatus?.energyGrade;

  return (
    <Marker
      position={[building.coordinates.lat, building.coordinates.lon]}
      icon={icon}
      eventHandlers={{
        click: onSelect,
      }}
    >
      <Tooltip direction="top" offset={[0, -20]} className="custom-tooltip">
        <div className="bg-slate-900/95 backdrop-blur-sm border border-white/20 rounded-lg p-2 text-white text-xs">
          <div className="font-semibold">Bygning {building.bygningsnummer}</div>
          {building.buildingType && <div className="text-slate-300">{building.buildingType}</div>}
          {building.totalArea && <div className="text-slate-300">{building.totalArea} m²</div>}
          {energyGrade && <div className={`text-${getEnergyGradeColor(energyGrade)}`}>Energiklasse: {energyGrade}</div>}
          {!building.enovaStatus?.isRegistered && <div className="text-orange-400">Ikke registrert i Enova</div>}
        </div>
      </Tooltip>
    </Marker>
  );
}

export default MapComponent;