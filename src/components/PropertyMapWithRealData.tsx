'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapDataService from '@/services/map-data.service';
import { Loader2 } from 'lucide-react';

interface PropertyMapProps {
  address?: string | null;
  coordinates?: { lat: number; lon: number } | null;
  className?: string;
}

// Default coordinates for Oslo center if no address
const DEFAULT_COORDS: [number, number] = [59.9139, 10.7522];

// Building colors for different types - matching dashboard accent colors
const BUILDING_COLORS = {
  focus: {
    color: '#e879f9',    // fuchsia-400
    fillColor: '#d946ef', // fuchsia-500
    fillOpacity: 0.5,
    weight: 3
  },
  neighbor: {
    color: '#34d399',     // emerald-400
    fillColor: '#10b981', // emerald-500
    fillOpacity: 0.3,
    weight: 2
  },
  property: {
    color: '#fbbf24',     // amber-400
    fillColor: '#f59e0b', // amber-500
    fillOpacity: 0.1,
    weight: 2,
    dashArray: '5, 10'
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

export function PropertyMapWithRealData({ address, coordinates, className = '' }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [buildingCount, setBuildingCount] = useState(0);

  const loadRealBuildingData = useCallback(async (
    map: L.Map,
    centerCoords: { lat: number; lon: number },
    focusAddress?: string | null
  ) => {
    if (!map) {
      console.warn('Map instance not available for loading building data');
      return;
    }

    setIsLoading(true);

    try {
      // Fetch real building data from OpenStreetMap
      const buildings = await MapDataService.fetchNearbyBuildings(
        centerCoords.lat,
        centerCoords.lon,
        100 // 100 meter radius
      );

      setBuildingCount(buildings.length);

      // Find the closest building to center (likely our focus building)
      let focusBuildingIndex = 0;
      let minDistance = Number.MAX_VALUE;

      buildings.forEach((building, index) => {
        if (building.coordinates.length > 0) {
          // Calculate distance from center to first coordinate
          const buildingLat = building.coordinates[0][0];
          const buildingLon = building.coordinates[0][1];
          const distance = Math.sqrt(
            Math.pow(buildingLat - centerCoords.lat, 2) +
            Math.pow(buildingLon - centerCoords.lon, 2)
          );

          if (distance < minDistance) {
            minDistance = distance;
            focusBuildingIndex = index;
          }
        }
      });

      // Add building polygons to map
      buildings.forEach((building, index) => {
        if (!map || !building.coordinates || building.coordinates.length === 0) {
          return; // Skip if map is not available or building has no coordinates
        }

        const isFocus = index === focusBuildingIndex;
        const style = isFocus ? BUILDING_COLORS.focus : BUILDING_COLORS.neighbor;

        try {
          // Add building footprint with additional safety check
          const buildingPolygon = L.polygon(building.coordinates, style).addTo(map);

          // Create popup content
          const icon = BUILDING_ICONS[building.type as keyof typeof BUILDING_ICONS] || '🏢';
          const popupContent = `
            <div class="p-2 min-w-48">
              <h3 class="font-bold text-sm mb-2 ${isFocus ? 'text-fuchsia-600' : 'text-emerald-600'}">
                ${icon} ${isFocus ? 'Valgt bygning' : 'Nabobygning'}
              </h3>
              <div class="space-y-1 text-xs">
                <div><strong>Type:</strong> ${building.type}</div>
                ${building.area ? `<div><strong>Areal:</strong> ~${Math.round(building.area)} m²</div>` : ''}
                ${building.levels ? `<div><strong>Etasjer:</strong> ${building.levels}</div>` : ''}
                ${building.height ? `<div><strong>Høyde:</strong> ${building.height} m</div>` : ''}
                ${building.name ? `<div><strong>Navn:</strong> ${building.name}</div>` : ''}
                ${building.address ? `<div><strong>Adresse:</strong> ${building.address}</div>` : ''}
                ${isFocus && focusAddress ? `<div><strong>Søkt:</strong> ${focusAddress}</div>` : ''}
                <div class="text-gray-500 mt-2">Kilde: OpenStreetMap</div>
              </div>
            </div>
          `;

          buildingPolygon.bindPopup(popupContent);
        } catch (polygonError) {
          console.warn('Failed to add building polygon:', polygonError, building);
        }
      });

    } catch (error) {
      console.error('Failed to load real building data:', error);

      // Fallback: simple marker with safety check
      if (map) {
        const marker = L.marker([centerCoords.lat, centerCoords.lon]).addTo(map);
        marker.bindPopup(`
          <b>${focusAddress || 'Ukjent adresse'}</b><br/>
          <span class="text-red-500">Kunne ikke laste bygningsdata</span><br/>
          <span class="text-xs">Feil: ${error}</span>
        `);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

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