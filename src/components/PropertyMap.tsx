'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface PropertyMapProps {
  address?: string | null;
  coordinates?: { lat: number; lon: number } | null;
  className?: string;
}

// Default coordinates for Oslo center if no address
const DEFAULT_COORDS: [number, number] = [59.9139, 10.7522];

// Norwegian mapping projection (EPSG:25833 - ETRS89 UTM zone 33N)
// For simple implementation, we'll use standard lat/lng but could enhance with proj4 later

// Building type colors based on Norwegian building registry
const BUILDING_COLORS = {
  focus: { color: '#ef4444', fillColor: '#dc2626', fillOpacity: 0.4 }, // Red for focus building
  neighbor: { color: '#3b82f6', fillColor: '#2563eb', fillOpacity: 0.3 }, // Blue for neighbors
  unknown: { color: '#6b7280', fillColor: '#4b5563', fillOpacity: 0.2 }, // Gray for unknown
};

// Mock Norwegian building data (in production, this would call Kartverket APIs)
interface NorwegianBuilding {
  id: string;
  buildingType: string;
  coordinates: [number, number][];
  area: number;
  stories: number;
  municipality: string;
  climateZone: string;
}

// Simulate Norwegian building registry API call
const loadNorwegianBuildingData = async (
  map: L.Map,
  centerCoords: { lat: number; lon: number },
  focusAddress?: string | null
) => {
  try {
    // In production, this would be multiple API calls to:
    // 1. Kartverket building registry (bygningsregisteret)
    // 2. SSB municipality data
    // 3. Climate zone API

    // Mock building footprints within 100m radius
    const mockBuildings: NorwegianBuilding[] = [
      // Focus building (actual searched address)
      {
        id: 'focus-building',
        buildingType: 'Kontor',
        coordinates: [
          [centerCoords.lat - 0.0001, centerCoords.lon - 0.0002],
          [centerCoords.lat + 0.0001, centerCoords.lon - 0.0002],
          [centerCoords.lat + 0.0001, centerCoords.lon + 0.0002],
          [centerCoords.lat - 0.0001, centerCoords.lon + 0.0002]
        ],
        area: 1200,
        stories: 3,
        municipality: 'Oslo',
        climateZone: 'Sone 1'
      },
      // Neighbor buildings (within 100m)
      {
        id: 'neighbor-1',
        buildingType: 'Flerbolig',
        coordinates: [
          [centerCoords.lat - 0.0005, centerCoords.lon - 0.0003],
          [centerCoords.lat - 0.0002, centerCoords.lon - 0.0003],
          [centerCoords.lat - 0.0002, centerCoords.lon + 0.0001],
          [centerCoords.lat - 0.0005, centerCoords.lon + 0.0001]
        ],
        area: 2400,
        stories: 6,
        municipality: 'Oslo',
        climateZone: 'Sone 1'
      },
      {
        id: 'neighbor-2',
        buildingType: 'Småhus',
        coordinates: [
          [centerCoords.lat + 0.0003, centerCoords.lon - 0.0004],
          [centerCoords.lat + 0.0005, centerCoords.lon - 0.0004],
          [centerCoords.lat + 0.0005, centerCoords.lon - 0.0001],
          [centerCoords.lat + 0.0003, centerCoords.lon - 0.0001]
        ],
        area: 180,
        stories: 2,
        municipality: 'Oslo',
        climateZone: 'Sone 1'
      }
    ];

    // Add building polygons to map
    mockBuildings.forEach((building, index) => {
      const isFocus = building.id === 'focus-building';
      const style = isFocus ? BUILDING_COLORS.focus : BUILDING_COLORS.neighbor;

      // Add building footprint
      const buildingPolygon = L.polygon(building.coordinates as [number, number][], {
        ...style,
        weight: 2
      }).addTo(map);

      // Add property boundary for focus building (larger than building footprint)
      if (isFocus) {
        const propertyBoundary: [number, number][] = [
          [centerCoords.lat - 0.0003, centerCoords.lon - 0.0004],
          [centerCoords.lat + 0.0003, centerCoords.lon - 0.0004],
          [centerCoords.lat + 0.0003, centerCoords.lon + 0.0004],
          [centerCoords.lat - 0.0003, centerCoords.lon + 0.0004]
        ];

        L.polygon(propertyBoundary, {
          color: '#f59e0b', // Amber color for property boundary
          fillColor: '#f59e0b',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '5, 10' // Dashed line for property boundary
        }).addTo(map).bindPopup(`
          <div class="p-2">
            <h3 class="font-bold text-sm mb-2 text-amber-600">🏡 Eiendomsgrense</h3>
            <div class="space-y-1 text-xs">
              <div><strong>Matrikkel:</strong> 301/47/0</div>
              <div><strong>Tomteareal:</strong> ~800 m²</div>
              <div><strong>Status:</strong> Privat eiendom</div>
            </div>
          </div>
        `);
      }

      // Create detailed popup for each building
      const popupContent = `
        <div class="p-2 min-w-48">
          <h3 class="font-bold text-sm mb-2 ${isFocus ? 'text-red-600' : 'text-blue-600'}">
            ${isFocus ? '🏢 Bygning (valgt)' : '🏠 Nabo'}
          </h3>
          <div class="space-y-1 text-xs">
            <div><strong>Type:</strong> ${building.buildingType}</div>
            <div><strong>BTA:</strong> ${building.area} m²</div>
            <div><strong>Etasjer:</strong> ${building.stories}</div>
            <div><strong>Kommune:</strong> ${building.municipality}</div>
            <div><strong>Klimasone:</strong> ${building.climateZone}</div>
            ${isFocus ? `<div><strong>Adresse:</strong> ${focusAddress || 'Ikke tilgjengelig'}</div>` : ''}
          </div>
        </div>
      `;

      buildingPolygon.bindPopup(popupContent);

      // Auto-open focus building popup
      if (isFocus) {
        buildingPolygon.openPopup();
      }
    });

    // Add municipality and climate zone info overlay
    const infoOverlay = L.control({ position: 'topleft' });
    infoOverlay.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-control-custom');
      div.innerHTML = `
        <div class="bg-white/10 backdrop-blur-lg border border-white/20 text-white p-2 rounded text-xs mt-2" style="margin-top: 60px;">
          <div class="font-medium text-blue-400 mb-1">📊 Områdedata</div>
          <div class="text-slate-300 space-y-1">
            <div><strong>Kommune:</strong> Oslo</div>
            <div><strong>Klimasone:</strong> Sone 1</div>
            <div><strong>Bygninger:</strong> ${mockBuildings.length} innen 100m</div>
          </div>
        </div>
      `;
      return div;
    };
    infoOverlay.addTo(map);

  } catch (error) {
    console.error('Failed to load Norwegian building data:', error);

    // Fallback: simple marker
    const marker = L.marker([centerCoords.lat, centerCoords.lon]).addTo(map);
    marker.bindPopup(`<b>${focusAddress || 'Ukjent adresse'}</b><br/>Bygningsdata ikke tilgjengelig`);
  }
};

export function PropertyMap({ address, coordinates, className = '' }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Use provided coordinates or fall back to default
    const mapCenter: [number, number] = coordinates ? [coordinates.lat, coordinates.lon] : DEFAULT_COORDS;
    const zoomLevel = coordinates ? 16 : 13; // Closer zoom if we have exact coordinates

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

    // Add buildings if we have coordinates
    if (coordinates) {
      // Load Norwegian building data
      loadNorwegianBuildingData(map, coordinates, address);
    } else if (address) {
      // Fallback: show marker at default location with note about missing coordinates
      const marker = L.marker(mapCenter).addTo(map);
      marker.bindPopup(`<b>${address}</b><br/>Posisjon ikke tilgjengelig`);
    }

    // Fix for default marker icons in webpack
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [address, coordinates]);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Map container */}
      <div
        ref={mapRef}
        className="w-full h-full rounded-lg overflow-hidden border border-white/10"
        style={{ minHeight: '300px' }}
      />

      {/* Map controls info */}
      <div className="absolute bottom-2 right-2 bg-white/10 backdrop-blur-lg border border-white/20 text-white p-2 rounded text-xs">
        <div className="text-slate-300">Zoom: Scroll • Pan: Dra</div>
      </div>
    </div>
  );
}

export default PropertyMap;