'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  fetchPropertyBoundaries,
  parsePropertyBoundaries,
  calculatePolygonArea,
} from '@/lib/geonorge-api';
import type { PropertyBoundary } from '@/types/geonorge';

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

// Load property boundaries from Geonorge API
const loadPropertyBoundaries = async (
  map: L.Map,
  centerCoords: { lat: number; lon: number },
  focusAddress?: string | null
) => {
  try {
    // Fetch real property boundaries from Geonorge
    const response = await fetchPropertyBoundaries(
      centerCoords.lat,
      centerCoords.lon,
      10 // 10m radius to find nearest property
    );

    if (!response) {
      console.warn('[PropertyMap] No property boundaries found');
      // Fallback: show marker only
      const marker = L.marker([centerCoords.lat, centerCoords.lon]).addTo(map);
      marker.bindPopup(`<b>${focusAddress || 'Ukjent adresse'}</b><br/>Eiendomsdata ikke tilgjengelig`);
      return;
    }

    const properties = parsePropertyBoundaries(response);

    if (properties.length === 0) {
      console.warn('[PropertyMap] No properties parsed from boundaries');
      return;
    }

    console.log(`[PropertyMap] Rendering ${properties.length} property boundaries`);

    // Render each property boundary
    properties.forEach((property, index) => {
      const isFocusProperty = index === 0; // First property is typically the closest match

      // Convert GeoJSON coordinates to Leaflet format
      // GeoJSON is [lon, lat], Leaflet is [lat, lon]
      const outerRing = property.coordinates[0];
      const leafletCoords: [number, number][] = outerRing.map((coord) => [coord[1], coord[0]]);

      // Calculate area
      const area = calculatePolygonArea(outerRing, centerCoords.lat);

      // Get CSS variable colors from document
      const warningColor =
        getComputedStyle(document.documentElement).getPropertyValue('--warning').trim() || '#f59e0b';
      const warningLightColor =
        getComputedStyle(document.documentElement).getPropertyValue('--warning-foreground').trim() || '#fbbf24';

      // Add property boundary polygon
      const boundaryPolygon = L.polygon(leafletCoords, {
        color: isFocusProperty ? warningColor : warningLightColor,
        fillColor: isFocusProperty ? warningColor : warningLightColor,
        fillOpacity: isFocusProperty ? 0.15 : 0.08,
        weight: 2,
        dashArray: '5, 10', // Dashed line for property boundaries
      }).addTo(map);

      // Build matrikkel identifier
      const matrikkelId = `${property.matrikkel.kommunenummer}/${property.matrikkel.gardsnummer}/${property.matrikkel.bruksnummer}`;

      // Create popup with actual matrikkel data
      const popupContent = `
        <div class="p-2">
          <h3 class="font-bold text-sm mb-2 text-warning">
            🏡 ${isFocusProperty ? 'Eiendomsgrense (valgt)' : 'Nabo eiendom'}
          </h3>
          <div class="space-y-1 text-xs">
            <div><strong>Matrikkel:</strong> ${matrikkelId}</div>
            <div><strong>Tomteareal:</strong> ~${Math.round(area)} m²</div>
            ${isFocusProperty && focusAddress ? `<div><strong>Adresse:</strong> ${focusAddress}</div>` : ''}
            <div class="text-text-tertiary mt-1">Kilde: Kartverket</div>
          </div>
        </div>
      `;

      boundaryPolygon.bindPopup(popupContent);

      // Auto-open popup for focus property
      if (isFocusProperty) {
        boundaryPolygon.openPopup();
      }
    });

    // Add marker at exact address coordinates
    const marker = L.marker([centerCoords.lat, centerCoords.lon], {
      icon: L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      }),
    }).addTo(map);

    marker.bindPopup(`<b>${focusAddress || 'Valgt adresse'}</b>`);
  } catch (error) {
    console.error('[PropertyMap] Failed to load property boundaries:', error);
    // Fallback: show marker
    const marker = L.marker([centerCoords.lat, centerCoords.lon]).addTo(map);
    marker.bindPopup(`<b>${focusAddress || 'Ukjent adresse'}</b><br/>Kunne ikke hente eiendomsdata`);
  }
};

// Mock Norwegian building data (in production, this would call Kartverket building registry)
const loadNorwegianBuildingData = async (
  map: L.Map,
  centerCoords: { lat: number; lon: number },
  focusAddress?: string | null
) => {
  try {
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
    ];

    // Add building polygons to map
    mockBuildings.forEach((building, index) => {
      const isFocus = index === 0; // First building is focus building
      const style = isFocus ? BUILDING_COLORS.focus : BUILDING_COLORS.neighbor;

      // Add building footprint
      const buildingPolygon = L.polygon(building.coordinates as [number, number][], {
        ...style,
        weight: 2
      }).addTo(map);

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
    const InfoControl = L.Control.extend({
      onAdd: function() {
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
      }
    });
    new InfoControl({ position: 'topleft' }).addTo(map);

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

    // Add property boundaries and buildings if we have coordinates
    if (coordinates) {
      // Load real property boundaries from Geonorge API
      loadPropertyBoundaries(map, coordinates, address);
      // Optionally: load mock building data (will be replaced with real building API later)
      // loadNorwegianBuildingData(map, coordinates, address);
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