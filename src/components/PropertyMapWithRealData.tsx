'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapDataService from '@/services/map-data.service';
import { Loader2 } from 'lucide-react';

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

interface PropertyMapProps {
  address?: string | null;
  coordinates?: { lat: number; lon: number } | null;
  className?: string;
  onBuildingsLoad?: (targetBuildings: BuildingData[], neighborBuildings: BuildingData[], selectedBuilding: BuildingData | null) => void;
  onBuildingSelect?: (building: BuildingData) => void;
  selectedBuildingId?: string | null;
}

// Default coordinates for Oslo center if no address
const DEFAULT_COORDS: [number, number] = [59.9139, 10.7522];

// Building colors for new selection system
const BUILDING_COLORS = {
  selected: {
    color: '#e879f9',     // fuchsia-400 - magenta for selected building
    fillColor: '#d946ef',  // fuchsia-500
    fillOpacity: 0.6,
    weight: 3
  },
  target: {
    color: '#14b8a6',     // teal-500 - teal for buildings from searched address
    fillColor: '#0d9488',  // teal-600
    fillOpacity: 0.4,
    weight: 2
  },
  neighbor: {
    color: '#22c55e',     // green-500 - green for neighbor buildings
    fillColor: '#16a34a',  // green-600
    fillOpacity: 0.3,
    weight: 2
  }
};

// Building type icons for popups
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

export function PropertyMapWithRealData({
  address,
  coordinates,
  className = '',
  onBuildingsLoad,
  onBuildingSelect,
  selectedBuildingId
}: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [buildingCount, setBuildingCount] = useState(0);
  const [targetBuildings, setTargetBuildings] = useState<BuildingData[]>([]);
  const [neighborBuildings, setNeighborBuildings] = useState<BuildingData[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingData | null>(null);
  const buildingLayersRef = useRef<Map<string, L.Polygon>>(new Map());

  const loadRealBuildingData = useCallback(async (
    map: L.Map,
    centerCoords: { lat: number; lon: number },
    searchedAddress?: string | null
  ) => {
    if (!map) {
      console.warn('Map instance not available for loading building data');
      return;
    }

    setIsLoading(true);

    try {
      // Fetch categorized building data from OpenStreetMap
      const buildingData = await MapDataService.fetchCategorizedBuildings(
        centerCoords.lat,
        centerCoords.lon,
        searchedAddress || '',
        100 // 100 meter radius
      );

      const { targetBuildings: targets, neighborBuildings: neighbors, selectedBuilding: defaultSelected } = buildingData;

      // Update state
      setTargetBuildings(targets);
      setNeighborBuildings(neighbors);
      setSelectedBuilding(defaultSelected);
      setBuildingCount(targets.length + neighbors.length);

      // Clear existing building layers
      buildingLayersRef.current.forEach(layer => {
        map.removeLayer(layer);
      });
      buildingLayersRef.current.clear();

      // Function to render a building on the map
      const renderBuilding = (building: BuildingData) => {
        if (!building.coordinates || building.coordinates.length === 0) return;

        // Determine building style based on category and selection
        let style;
        if (building.isSelected) {
          style = BUILDING_COLORS.selected;
        } else if (building.category === 'target') {
          style = BUILDING_COLORS.target;
        } else {
          style = BUILDING_COLORS.neighbor;
        }

        try {
          // Add building footprint
          const buildingPolygon = L.polygon(building.coordinates, style).addTo(map);

          // Store layer reference for future updates
          buildingLayersRef.current.set(building.id, buildingPolygon);

          // Create popup content
          const icon = BUILDING_ICONS[building.type as keyof typeof BUILDING_ICONS] || '🏢';
          const categoryText = building.category === 'target' ? 'Fra adressen' : 'Nabobygning';
          const categoryColor = building.isSelected ? 'text-fuchsia-600' : (building.category === 'target' ? 'text-teal-600' : 'text-green-600');

          const popupContent = `
            <div class="p-2 min-w-48">
              <h3 class="font-bold text-sm mb-2 ${categoryColor}">
                ${icon} ${building.isSelected ? 'Valgt bygning' : categoryText}
              </h3>
              <div class="space-y-1 text-xs">
                <div><strong>Type:</strong> ${building.type}</div>
                ${building.bygningsnummer ? `<div><strong>Bygningsnummer:</strong> ${building.bygningsnummer}</div>` : ''}
                ${building.area ? `<div><strong>Areal:</strong> ~${Math.round(building.area)} m²</div>` : ''}
                ${building.levels ? `<div><strong>Etasjer:</strong> ${building.levels}</div>` : ''}
                ${building.height ? `<div><strong>Høyde:</strong> ${building.height} m</div>` : ''}
                ${building.name ? `<div><strong>Navn:</strong> ${building.name}</div>` : ''}
                ${building.address ? `<div><strong>Adresse:</strong> ${building.address}</div>` : ''}
                ${building.isSelected && searchedAddress ? `<div><strong>Søkt:</strong> ${searchedAddress}</div>` : ''}
                <div class="text-gray-500 mt-2">Kilde: OpenStreetMap</div>
              </div>
            </div>
          `;

          buildingPolygon.bindPopup(popupContent);

          // Add click handler for building selection
          buildingPolygon.on('click', () => {
            if (building.category === 'target') {
              handleBuildingSelection(building);
            }
          });

        } catch (polygonError) {
          console.warn('Failed to add building polygon:', polygonError, building);
        }
      };

      // Render all buildings
      [...targets, ...neighbors].forEach(renderBuilding);

      // Notify parent component about loaded buildings
      if (onBuildingsLoad) {
        onBuildingsLoad(targets, neighbors, defaultSelected);
      }

    } catch (error) {
      console.error('Failed to load real building data:', error);

      // Fallback: simple marker with safety check
      if (map) {
        const marker = L.marker([centerCoords.lat, centerCoords.lon]).addTo(map);
        marker.bindPopup(`
          <b>${searchedAddress || 'Ukjent adresse'}</b><br/>
          <span class="text-red-500">Kunne ikke laste bygningsdata</span><br/>
          <span class="text-xs">Feil: ${error}</span>
        `);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onBuildingsLoad]);

  // Handle building selection (internal and external)
  const handleBuildingSelection = useCallback((building: BuildingData) => {
    // Update internal state
    setSelectedBuilding(prevSelected => {
      // If clicking the same building, don't change selection
      if (prevSelected?.id === building.id) return prevSelected;

      // Update building selection status
      setTargetBuildings(prevTargets =>
        prevTargets.map(b => ({
          ...b,
          isSelected: b.id === building.id
        }))
      );

      // Update map colors
      const map = mapInstanceRef.current;
      if (map) {
        // Update previously selected building
        if (prevSelected) {
          const prevLayer = buildingLayersRef.current.get(prevSelected.id);
          if (prevLayer) {
            prevLayer.setStyle(BUILDING_COLORS.target);
          }
        }

        // Update newly selected building
        const newLayer = buildingLayersRef.current.get(building.id);
        if (newLayer) {
          newLayer.setStyle(BUILDING_COLORS.selected);
        }
      }

      return { ...building, isSelected: true };
    });

    // Notify parent component
    if (onBuildingSelect) {
      onBuildingSelect({ ...building, isSelected: true });
    }
  }, [onBuildingSelect]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Use provided coordinates or fall back to default
    const mapCenter: [number, number] = coordinates ? [coordinates.lat, coordinates.lon] : DEFAULT_COORDS;
    const zoomLevel = coordinates ? 17 : 13; // Closer zoom if we have exact coordinates

    // Initialize map with custom scroll options
    const map = L.map(mapRef.current, {
      scrollWheelZoom: true,
      zoomDelta: 0.5, // Smaller zoom increments (default is 1)
      zoomSnap: 0.25, // Allow fractional zoom levels
      wheelDebounceTime: 100, // Debounce wheel events (ms)
      wheelPxPerZoomLevel: 120, // Pixels per zoom level (higher = less sensitive)
    }).setView(mapCenter, zoomLevel);
    mapInstanceRef.current = map;

    // Add dark-themed tile layer to match app design
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    // Fix for default marker icons
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    // Wait for map to be ready, then load building data
    setTimeout(() => {
      if (coordinates && map) {
        loadRealBuildingData(map, coordinates, address);
      } else if (address && map) {
        // Show marker at default location with note about missing coordinates
        const marker = L.marker(mapCenter).addTo(map);
        marker.bindPopup(`<b>${address}</b><br/>Koordinater ikke tilgjengelig`);
      }
    }, 100); // Small delay to ensure map is fully initialized

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [address, coordinates, loadRealBuildingData]);

  // Handle external building selection changes
  useEffect(() => {
    if (selectedBuildingId && targetBuildings.length > 0) {
      const building = targetBuildings.find(b => b.id === selectedBuildingId);
      if (building && !building.isSelected) {
        handleBuildingSelection(building);
      }
    }
  }, [selectedBuildingId, targetBuildings, handleBuildingSelection]);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Map container */}
      <div
        ref={mapRef}
        className="w-full h-full rounded-lg overflow-hidden border border-white/10"
        style={{ minHeight: '300px' }}
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-2 left-2 bg-slate-900/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 border border-fuchsia-400/20">
          <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" />
          <span className="text-sm text-slate-300">Laster bygningsdata...</span>
        </div>
      )}

      {/* Map controls info */}
      <div className="absolute bottom-2 right-2 bg-slate-900/90 backdrop-blur-sm border border-white/20 text-slate-300 p-2 rounded text-xs shadow-lg">
        <div className="font-medium text-white">Kartnavigering</div>
        <div>Zoom: Scroll • Pan: Dra • Klikk bygninger for info</div>
      </div>

      {/* Data source badge */}
      <div className="absolute top-2 right-2 bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-900 px-2 py-1 rounded text-xs font-bold shadow-lg">
        LIVE DATA
      </div>
    </div>
  );
}

export default PropertyMapWithRealData;