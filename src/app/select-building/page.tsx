'use client';

import React, { useState, useEffect, useRef, Suspense, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Building, MapPin, Zap, CheckCircle, Home, Calendar, Map, FormInput } from "lucide-react";
import { MapDataService } from "@/services/map-data.service";
import { BuildingDataFormModal } from "@/components/BuildingDataFormModal";
import { usePolygonColors, useThemeColors } from "@/hooks/useThemeColors";
import { fetchOrganization, type OrganizationInfo } from "@/lib/brreg";
import { useAddressData, createAddressKey } from "@/contexts/AddressDataContext";
import { fetchPropertyBoundaries, parsePropertyBoundaries } from '@/lib/geonorge-api';
import type { PropertyBoundary } from '@/types/geonorge';
import dynamic from 'next/dynamic';

// Dynamically import react-leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(mod => mod.Polygon), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });

interface MapBuilding {
  id: string;
  type: string;
  coordinates: [number, number][];
  area?: number;
  levels?: number;
  name?: string;
  address?: string;
  bygningsnummer?: string;
  addressLabel?: string;
  matchesSearchedAddress?: boolean;
  calculatedLabel?: string; // Store the calculated label to prevent changes during sorting
}

interface EnovaCertificate {
  bygningsnummer: string;
  kommunenummer?: string;
  gnr?: string;
  bnr?: string;
  address?: string;
  city?: string;
  energyClass?: string;
  buildingCategory?: string;
  energyConsumption?: number;
  constructionYear?: number;
  organization_number?: string | null;
}

// Component to track zoom changes (will be loaded dynamically)
const ZoomTracker = ({ onZoomChange }: { onZoomChange: (zoom: number) => void }) => {
  if (typeof window === 'undefined') return null;

  try {
    const { useMapEvents } = require('react-leaflet');

    const MapEventHandler = () => {
      useMapEvents({
        zoomend: (e: any) => {
          const newZoom = e.target.getZoom();
          onZoomChange(newZoom);
        },
      });
      return null;
    };

    return <MapEventHandler />;
  } catch (e) {
    console.warn('Failed to load useMapEvents');
    return null;
  }
};

function SelectBuildingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getAddressData, setAddressData, hasAddressData } = useAddressData();

  // Get address data from URL params
  const address = searchParams.get('address');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const municipality = searchParams.get('municipality');
  const municipalityNumber = searchParams.get('municipalityNumber');
  const postalCode = searchParams.get('postalCode');
  const gnr = searchParams.get('gnr');
  const bnr = searchParams.get('bnr');

  const [mapBuildings, setMapBuildings] = useState<MapBuilding[]>([]);
  const [enovaCertificates, setEnovaCertificates] = useState<EnovaCertificate[]>([]);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [isLoadingEnova, setIsLoadingEnova] = useState(true);
  const [propertyBoundaries, setPropertyBoundaries] = useState<PropertyBoundary[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<string | null>(null);
  const [buildingOwner, setBuildingOwner] = useState<OrganizationInfo | null>(null);
  const [isLoadingOwner, setIsLoadingOwner] = useState(false);
  const [showCertificates, setShowCertificates] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([59.9139, 10.7522]); // Oslo fallback
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapRef, setMapRef] = useState<any>(null);
  const [currentZoom, setCurrentZoom] = useState(19);
  const [hasParameterError, setHasParameterError] = useState(false);
  const [showInactivityPrompt, setShowInactivityPrompt] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get theme-aware colors for map elements
  const polygonColors = usePolygonColors();
  const themeColors = useThemeColors();

  // Handle inactivity timer
  const resetInactivityTimer = () => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Hide prompt if it's showing
    setShowInactivityPrompt(false);

    // Set new timer for 5 seconds
    inactivityTimerRef.current = setTimeout(() => {
      // Only show prompt if a building is selected and we're not in form or certificates view
      if (selectedBuildingId && !showForm && !showCertificates) {
        setShowInactivityPrompt(true);
      }
    }, 5000);
  };

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      // Don't reset timer if prompt is showing - let user interact with it
      if (!showInactivityPrompt) {
        resetInactivityTimer();
      }
    };

    // Add event listeners for user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    // Start the timer only if not showing prompt
    if (!showInactivityPrompt) {
      resetInactivityTimer();
    }

    // Cleanup
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [selectedBuildingId, showForm, showCertificates, showInactivityPrompt]);

  // Fetch map buildings and Enova certificates in parallel (with session cache)
  useEffect(() => {
    const fetchData = async () => {
      console.log('Select building page params:', { address, lat, lon, gnr, bnr });

      if (!address || !lat || !lon) {
        console.error('Missing required parameters:', { address, lat, lon });
        setHasParameterError(true);
        setIsLoadingMap(false);
        setIsLoadingEnova(false);
        return;
      }

      // Generate cache key
      const cacheKey = createAddressKey({ address, gnr, bnr, knr: municipalityNumber });

      // Check cache first
      const cachedData = getAddressData(cacheKey);
      if (cachedData) {
        console.log('✅ Using cached data for:', cacheKey);
        setMapBuildings(cachedData.buildings);
        setEnovaCertificates(cachedData.certificates);
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
        setIsLoadingMap(false);
        setIsLoadingEnova(false);

        // Reset selection state
        setSelectedBuildingId(null);
        setSelectedCertificate(null);
        setShowCertificates(false);
        setShowForm(false);
        return;
      }

      console.log('📡 Fetching fresh data for:', cacheKey);

      // Reset state for new property search
      setEnovaCertificates([]);
      setSelectedBuildingId(null);
      setSelectedCertificate(null);
      setShowCertificates(false);
      setShowForm(false);

      // Fetch map buildings
      setIsLoadingMap(true);
      let fetchedBuildings: MapBuilding[] = [];
      try {
        const buildings = await MapDataService.fetchNearbyBuildings(
          parseFloat(lat),
          parseFloat(lon),
          100 // 100m radius for building selection
        );
        // Calculate labels for all buildings before setting them
        const buildingsWithLabels = calculateBuildingLabels(buildings, address, lat, lon);
        fetchedBuildings = buildingsWithLabels;

        // Don't set buildings yet - wait for certificate enrichment
        // setMapBuildings(buildingsWithLabels);

        // Simple: just center on address coordinates
        setMapCenter([parseFloat(lat), parseFloat(lon)]);

        // Fetch property boundaries from Geonorge
        console.log('🗺️ Fetching property boundaries from Geonorge...');
        const boundariesResponse = await fetchPropertyBoundaries(
          parseFloat(lat),
          parseFloat(lon),
          10 // 10m radius to find nearest property
        );

        if (boundariesResponse) {
          const parsedBoundaries = parsePropertyBoundaries(boundariesResponse);
          setPropertyBoundaries(parsedBoundaries);
          console.log(`✅ Found ${parsedBoundaries.length} property boundaries`);
        } else {
          console.warn('⚠️ No property boundaries found');
        }
      } catch (error) {
        console.error('Failed to fetch map buildings:', error);
        setMapBuildings([]);
      } finally {
        setIsLoadingMap(false);
      }

      // Fetch Enova certificates if we have the full cadastral identifiers
      let fetchedCertificates: EnovaCertificate[] = [];
      if (gnr && bnr && municipalityNumber) {
        setIsLoadingEnova(true);
        try {
          const response = await fetch(`/api/buildings/detect?kommunenummer=${municipalityNumber}&gnr=${gnr}&bnr=${bnr}&address=${encodeURIComponent(address)}`);
          if (response.ok) {
            const data = await response.json();
            const rawCertificates = data.buildings || [];

            // Filter out empty/incomplete certificates that have no meaningful data
            fetchedCertificates = rawCertificates.filter((cert: any) => {
              if (!cert || !cert.bygningsnummer || cert.bygningsnummer.trim() === '') {
                return false;
              }

              // Must have at least one meaningful property beyond just bygningsnummer
              const hasEnergyData = cert.energyClass && cert.energyClass.trim() !== '';
              const hasConsumptionData = cert.energyConsumption && cert.energyConsumption > 0;
              const hasCategoryData = cert.buildingCategory && cert.buildingCategory.trim() !== '';

              return hasEnergyData || hasConsumptionData || hasCategoryData;
            });

            setEnovaCertificates(fetchedCertificates);
          } else {
            setEnovaCertificates([]);
          }
        } catch (error) {
          console.error('Failed to fetch Enova certificates:', error);
          setEnovaCertificates([]);
        } finally {
          setIsLoadingEnova(false);
        }
      } else {
        // No cadastral data available - clear any previous certificates
        setEnovaCertificates([]);
        setIsLoadingEnova(false);
      }

      // Enrich OSM buildings with Enova certificate data (match by proximity)
      if (fetchedBuildings.length > 0 && fetchedCertificates.length > 0 && lat && lon) {
        const enrichedBuildings = fetchedBuildings.map(building => {
          // For each building, find the certificate for the closest building
          // Since we only have one property (gnr/bnr), all certificates are for buildings on this property
          // We'll match the closest building to the searched address with certificate #1, next with #2, etc.
          const buildingCenter = getPolygonCenter(building.coordinates);
          const distanceFromSearch = calculateDistanceInMeters(
            parseFloat(lat),
            parseFloat(lon),
            buildingCenter.lat,
            buildingCenter.lon
          );

          // Store distance for sorting
          return { ...building, _distanceFromSearch: distanceFromSearch };
        });

        // Sort buildings by distance from searched address
        const sortedBuildings = enrichedBuildings.sort((a, b) =>
          (a._distanceFromSearch || Infinity) - (b._distanceFromSearch || Infinity)
        );

        // Sort certificates by building number (ascending)
        const sortedCertificates = [...fetchedCertificates].sort((a, b) =>
          parseInt(a.bygningsnummer || '999') - parseInt(b.bygningsnummer || '999')
        );

        // Match closest building to lowest building number, etc.
        const finalBuildings = sortedBuildings.map((building, index) => {
          const cert = sortedCertificates[index];
          const { _distanceFromSearch, ...cleanBuilding } = building as any;

          if (cert) {
            return {
              ...cleanBuilding,
              bygningsnummer: cert.bygningsnummer
            };
          }
          return cleanBuilding;
        });

        fetchedBuildings = finalBuildings;
        setMapBuildings(finalBuildings);

        // Debug: Log enriched buildings
        console.log('🏗️ Buildings enriched with certificates:', finalBuildings.map(b => ({
          id: b.id,
          address: b.address,
          addressLabel: b.addressLabel,
          calculatedLabel: b.calculatedLabel,
          bygningsnummer: b.bygningsnummer
        })));
      } else {
        // No certificates to match, just set the buildings
        setMapBuildings(fetchedBuildings);

        // Debug: Log buildings without enrichment
        console.log('🏗️ Buildings without certificate enrichment:', fetchedBuildings.map(b => ({
          id: b.id,
          address: b.address,
          addressLabel: b.addressLabel,
          calculatedLabel: b.calculatedLabel,
          bygningsnummer: b.bygningsnummer
        })));
      }

      // Cache the fetched data
      if (cacheKey && (fetchedBuildings.length > 0 || fetchedCertificates.length > 0)) {
        setAddressData(cacheKey, {
          buildings: fetchedBuildings,
          certificates: fetchedCertificates,
          cadastralData: {
            gnr: gnr || '',
            bnr: bnr || '',
            knr: municipalityNumber || '',
            address: address
          }
        });
        console.log('💾 Cached data for:', cacheKey);
      }

      // Smart auto-selection logic with 10m→25m fallback
      if (fetchedBuildings.length > 0 && address && lat && lon) {
        // Find the closest building using 10m→25m fallback proximity
        const closestBuilding = findClosestBuildingWithFallback(
          fetchedBuildings,
          parseFloat(lat),
          parseFloat(lon),
          address
        );

        if (closestBuilding) {
          // Auto-select the closest building
          setSelectedBuildingId(closestBuilding.id);

          // Update the building objects with address matching info and recalculate labels
          const updatedBuildings = fetchedBuildings.map(building => {
            if (building.id === closestBuilding.id) {
              return { ...building, matchesSearchedAddress: closestBuilding.matchesSearchedAddress };
            }
            return building;
          });

          // Recalculate labels with the updated address matching information
          const buildingsWithUpdatedLabels = calculateBuildingLabels(updatedBuildings, address, lat, lon);
          setMapBuildings(buildingsWithUpdatedLabels);

          // Certificate selection will be handled by the "Fortsett" button
        } else if (fetchedBuildings.length === 1) {
          // No building found within proximity but only one building nearby - probably the right one
          const singleBuilding = fetchedBuildings[0];
          setSelectedBuildingId(singleBuilding.id);

          // Certificate selection will be handled by the "Fortsett" button
        }
        // If multiple buildings exist, let user choose
      }
    };

    fetchData();
  }, [address, lat, lon, gnr, bnr, router]);

  // Fetch building owner from Brønnøysund when building or certificate is selected
  useEffect(() => {
    const fetchOwnerInfo = async () => {
      let cert: EnovaCertificate | undefined;

      // Check if we have a selected certificate directly
      if (selectedCertificate) {
        cert = enovaCertificates.find(c => c.bygningsnummer === selectedCertificate);
      }
      // Otherwise, check if selected building has a matching certificate
      else if (selectedBuildingId) {
        const selectedBuilding = mapBuildings.find(b => b.id === selectedBuildingId);
        if (selectedBuilding?.bygningsnummer) {
          cert = enovaCertificates.find(c => c.bygningsnummer === selectedBuilding.bygningsnummer);
        }
      }

      // Check if certificate has an organization number
      if (!cert || !cert.organization_number) {
        setBuildingOwner(null);
        return;
      }

      console.log('🏢 Fetching organization info for:', cert.organization_number);
      setIsLoadingOwner(true);
      try {
        const owner = await fetchOrganization(cert.organization_number);
        setBuildingOwner(owner);
        console.log('✅ Organization found:', owner?.name);
      } catch (error) {
        console.error('Failed to fetch building owner:', error);
        setBuildingOwner(null);
      } finally {
        setIsLoadingOwner(false);
      }
    };

    fetchOwnerInfo();
  }, [selectedCertificate, selectedBuildingId, enovaCertificates, mapBuildings]);

  // Helper function to check if building matches the searched address
  const isBuildingRelevantToAddress = (building: MapBuilding, searchedAddress: string, searchedLat: number, searchedLon: number) => {
    if (!searchedAddress || !building.coordinates || building.coordinates.length === 0) return false;

    // Primary logic: Use coordinate proximity (reliable with Kartverket + OSM data)
    const buildingCenter = getPolygonCenter(building.coordinates);
    const distanceInMeters = calculateDistanceInMeters(searchedLat, searchedLon, buildingCenter.lat, buildingCenter.lon);

    // Building is relevant if within 25 meters of the searched address
    const isWithinProximity = distanceInMeters <= 25;

    // Secondary logic: Address matching (fallback for buildings with address data)
    let hasAddressMatch = false;
    if (building.address && searchedAddress) {
      // Extract street and number from searched address
      const searchedParts = searchedAddress.toLowerCase().split(' ');
      const searchedStreet = searchedParts.slice(0, -1).join(' '); // All but last part
      const searchedNumber = searchedParts[searchedParts.length - 1]; // Last part

      // Extract street and number from building address
      const buildingParts = building.address.toLowerCase().split(' ');
      const buildingStreet = buildingParts.slice(0, -1).join(' '); // All but last part
      const buildingNumber = buildingParts[buildingParts.length - 1]; // Last part

      // Check if street names match (fuzzy match for Norwegian variations)
      const streetMatch = searchedStreet === buildingStreet ||
                         searchedStreet.includes(buildingStreet) ||
                         buildingStreet.includes(searchedStreet);

      // Check if numbers match
      const numberMatch = searchedNumber === buildingNumber;
      hasAddressMatch = streetMatch && numberMatch;
    }

    // Return true if either proximity OR address matching succeeds
    // This handles cases where OSM has good address data (use both) or missing address data (use proximity)
    return isWithinProximity || hasAddressMatch;
  };

  // Helper function to create address-based label (e.g., "Hesthagen 16" -> "H16")
  const createAddressLabel = (address: string): string => {
    if (!address) return '';

    const parts = address.split(' ');
    if (parts.length < 2) return '';

    // Get street name (all parts except the last one which should be the number)
    const streetParts = parts.slice(0, -1);
    const houseNumber = parts[parts.length - 1];

    // Extract first letter of each word in street name
    const initials = streetParts
      .map(word => word.charAt(0).toUpperCase())
      .join('');

    return initials + houseNumber;
  };

  // Helper function to generate alphabetic labels: A, B, C... Z, AA, AB, AC... AZ, BA, BB, etc.
  const generateAlphabeticLabel = (index: number): string => {
    let result = '';
    let num = index;

    do {
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26) - 1;
    } while (num >= 0);

    return result;
  };

  // Helper function to pre-calculate labels for all buildings (called once when buildings are loaded)
  const calculateBuildingLabels = (buildings: MapBuilding[], searchedAddress: string, searchedLat?: string, searchedLon?: string): MapBuilding[] => {
    // First, sort buildings by distance from Kartverket coordinates for ABC enumeration
    const distanceSorted = searchedLat && searchedLon ? [...buildings].sort((a, b) => {
      const aCenter = getPolygonCenter(a.coordinates);
      const bCenter = getPolygonCenter(b.coordinates);
      const aDistance = calculateDistanceInMeters(parseFloat(searchedLat), parseFloat(searchedLon), aCenter.lat, aCenter.lon);
      const bDistance = calculateDistanceInMeters(parseFloat(searchedLat), parseFloat(searchedLon), bCenter.lat, bCenter.lon);
      return aDistance - bDistance;
    }) : buildings;

    return buildings.map(building => {
      let calculatedLabel = '';

      // Priority 1: Use existing addressLabel if available
      if (building.addressLabel) {
        calculatedLabel = building.addressLabel;
      }
      // Priority 2: If building matches searched address, create label from address
      else if (building.matchesSearchedAddress && searchedAddress) {
        const addressLabel = createAddressLabel(searchedAddress);
        calculatedLabel = addressLabel || '';
      }
      // Priority 3: If building has its own address, create label from it
      else if (building.address) {
        const addressLabel = createAddressLabel(building.address);
        calculatedLabel = addressLabel || '';
      }

      // Fallback: ABC enumeration based on distance from Kartverket coordinates
      if (!calculatedLabel) {
        const distanceIndex = distanceSorted.findIndex(b => b.id === building.id);
        calculatedLabel = generateAlphabeticLabel(distanceIndex);
      }

      return {
        ...building,
        calculatedLabel
      };
    });
  };

  // Helper function to get building label for display (uses pre-calculated label)
  const getBuildingLabel = (building: MapBuilding) => {
    return building.calculatedLabel || 'X'; // Fallback to 'X' if no label calculated
  };

  // Helper function to get building number for display (deprecated, use getBuildingLabel)
  const getBuildingNumber = (building: MapBuilding) => {
    const index = mapBuildings.findIndex(b => b.id === building.id);
    return index + 1;
  };

  // Helper function to calculate the center point of a polygon
  const getPolygonCenter = (coordinates: [number, number][]): { lat: number; lon: number } => {
    if (coordinates.length === 0) {
      return { lat: 0, lon: 0 };
    }

    // Calculate centroid using average of all points
    const totalPoints = coordinates.length;
    const sumLat = coordinates.reduce((sum, [lat]) => sum + lat, 0);
    const sumLon = coordinates.reduce((sum, [, lon]) => sum + lon, 0);

    return {
      lat: sumLat / totalPoints,
      lon: sumLon / totalPoints
    };
  };

  // Helper function to calculate distance between two coordinates in meters
  const calculateDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    // Haversine formula for accurate distance calculation
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };

  // Helper function to find the closest building with fallback proximity (10m → 25m)
  const findClosestBuildingWithFallback = (buildings: MapBuilding[], searchedLat: number, searchedLon: number, searchedAddress: string) => {
    if (buildings.length === 0) return null;

    // Try 10m radius first (very precise)
    let closest = findClosestWithinRadius(buildings, searchedLat, searchedLon, 10);

    if (!closest) {
      // Fallback to 25m radius
      closest = findClosestWithinRadius(buildings, searchedLat, searchedLon, 25);
    }

    // If we found a building, check if it matches the searched address for display purposes
    if (closest) {
      closest.matchesSearchedAddress = hasAddressMatch(closest, searchedAddress);
    }

    return closest;
  };

  // Helper function to find closest building within a specific radius
  const findClosestWithinRadius = (buildings: MapBuilding[], lat: number, lon: number, radiusMeters: number): MapBuilding | null => {
    let closestBuilding: MapBuilding | null = null;
    let minDistance = Number.MAX_VALUE;

    buildings.forEach(building => {
      if (building.coordinates.length > 0) {
        const buildingCenter = getPolygonCenter(building.coordinates);
        const distance = calculateDistanceInMeters(lat, lon, buildingCenter.lat, buildingCenter.lon);

        if (distance <= radiusMeters && distance < minDistance) {
          minDistance = distance;
          closestBuilding = building;
        }
      }
    });

    return closestBuilding;
  };

  // Helper function to check if a point is inside a polygon (ray casting algorithm)
  const isPointInPolygon = (point: [number, number], polygon: [number, number][]): boolean => {
    const [lat, lon] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [lat1, lon1] = polygon[i];
      const [lat2, lon2] = polygon[j];

      const intersect = ((lon1 > lon) !== (lon2 > lon)) &&
        (lat < (lat2 - lat1) * (lon - lon1) / (lon2 - lon1) + lat1);

      if (intersect) inside = !inside;
    }

    return inside;
  };

  // Helper function to check if a building is within a property boundary
  const isBuildingInProperty = (building: MapBuilding, property: PropertyBoundary): boolean => {
    if (!building.coordinates || building.coordinates.length === 0) return false;

    // Get building centroid
    const coords = building.coordinates;
    let latSum = 0, lonSum = 0;
    for (const [lat, lon] of coords) {
      latSum += lat;
      lonSum += lon;
    }
    const centroid: [number, number] = [latSum / coords.length, lonSum / coords.length];

    // Convert property boundary to [lat, lon] format (GeoJSON is [lon, lat])
    const propertyCoords: [number, number][] = property.coordinates[0].map(coord => [coord[1], coord[0]]);

    // Check if building centroid is inside property polygon
    return isPointInPolygon(centroid, propertyCoords);
  };

  // Helper function to check if building address matches searched address
  const hasAddressMatch = (building: MapBuilding, searchedAddress: string): boolean => {
    if (!building.address || !searchedAddress) return false;

    // Extract street and number from searched address
    const searchedParts = searchedAddress.toLowerCase().split(' ');
    const searchedStreet = searchedParts.slice(0, -1).join(' '); // All but last part
    const searchedNumber = searchedParts[searchedParts.length - 1]; // Last part

    // Extract street and number from building address
    const buildingParts = building.address.toLowerCase().split(' ');
    const buildingStreet = buildingParts.slice(0, -1).join(' '); // All but last part
    const buildingNumber = buildingParts[buildingParts.length - 1]; // Last part

    // Check if street names match (fuzzy match for Norwegian variations)
    const streetMatch = searchedStreet === buildingStreet ||
                       searchedStreet.includes(buildingStreet) ||
                       buildingStreet.includes(searchedStreet);

    // Check if numbers match
    const numberMatch = searchedNumber === buildingNumber;

    return streetMatch && numberMatch;
  };

  // Helper function to create numbered building markers
  const createBuildingIcon = async (buildingNumber: number, isSelected: boolean = false) => {
    if (typeof window === 'undefined') return null;

    const L = await import('leaflet');

    const iconHtml = `
      <div class="relative">
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 transition-all duration-300 ${
          isSelected
            ? 'bg-accent border-accent-hover scale-125 shadow-lg shadow-accent/50'
            : 'bg-secondary border-input-border hover:bg-secondary-hover'
        }">
          ${buildingNumber}
        </div>
        ${isSelected ? '<div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-accent rotate-45"></div>' : ''}
      </div>
    `;

    return L.divIcon({
      html: iconHtml,
      className: 'custom-building-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  // Color coding for energy classes
  const getEnergyClassColor = (energyClass?: string) => {
    if (!energyClass) return 'gray';

    const colorMap: Record<string, string> = {
      'A': 'green',
      'B': 'lime',
      'C': 'yellow',
      'D': 'orange',
      'E': 'red',
      'F': 'red',
      'G': 'red'
    };
    return colorMap[energyClass.toUpperCase()] || 'gray';
  };

  const getEnergyClassBadgeColor = (energyClass?: string) => {
    if (!energyClass) return 'bg-secondary text-foreground border-border';

    const colorMap: Record<string, string> = {
      'A': 'bg-success text-success-foreground border-success',
      'B': 'bg-success text-success-foreground border-success',
      'C': 'bg-warning text-warning-foreground border-warning',
      'D': 'bg-warning text-warning-foreground border-warning',
      'E': 'bg-destructive text-destructive-foreground border-destructive',
      'F': 'bg-destructive text-destructive-foreground border-destructive',
      'G': 'bg-destructive text-destructive-foreground border-destructive'
    };
    return colorMap[energyClass.toUpperCase()] || 'bg-secondary text-foreground border-border';
  };

  const handleMapBuildingSelect = (buildingId: string) => {
    setSelectedBuildingId(buildingId);
    // Focus map on the newly selected building
    setTimeout(() => focusOnBuilding(buildingId), 100);
  };

  // Function to focus map on a specific building
  const focusOnBuilding = (buildingId: string) => {
    if (!buildingId || !mapRef) return;

    const building = mapBuildings.find(b => b.id === buildingId);
    if (building && building.coordinates && building.coordinates.length > 0) {
      // Calculate bounds of the building polygon
      const coords = building.coordinates;
      let minLat = Infinity, maxLat = -Infinity;
      let minLon = Infinity, maxLon = -Infinity;

      coords.forEach(([lat, lon]) => {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
      });

      // Add small padding around the building (5% margin)
      const latRange = maxLat - minLat;
      const lonRange = maxLon - minLon;
      const padding = 0.05; // 5% padding

      const paddedBounds = [
        [minLat - (latRange * padding), minLon - (lonRange * padding)],
        [maxLat + (latRange * padding), maxLon + (lonRange * padding)]
      ];

      // Fit the map to the building bounds with animation
      mapRef.fitBounds(paddedBounds, {
        animate: true,
        duration: 1.0,
        maxZoom: 20 // Don't zoom closer than this
      });
    }
  };

  const handleCertificateSelect = (certificateId: string | null) => {
    setSelectedCertificate(certificateId);
  };

  const proceedToForm = () => {
    if (!selectedBuildingId) return;
    setShowForm(true);
  };

  const handleFormSubmit = async (formData: any) => {
    setIsSubmittingForm(true);

    try {
      // Simulate API call for building analysis
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get selected building data
      const selectedBuilding = mapBuildings.find(b => b.id === selectedBuildingId);

      // Create query params with essential data only
      const queryParams = new URLSearchParams({
        address: address || "",
        ...(lat && { lat }),
        ...(lon && { lon }),
        ...(municipality && { municipality }),
        ...(municipalityNumber && { municipalityNumber }),
        ...(postalCode && postalCode !== 'undefined' && { postalCode }),
        ...(gnr && { gnr }),
        ...(bnr && { bnr }),
        buildingType: formData.buildingType,
        totalArea: formData.totalArea.toString(),
        heatedArea: formData.heatedArea.toString(),
        annualEnergyConsumption: formData.annualEnergyConsumption.toString(),
        // Convert multi-select arrays to primary systems for URL params (backward compatibility)
        heatingSystem: formData.heatingSystems?.[0]?.value || 'Elektrisitet',
        lightingSystem: formData.lightingSystems?.[0]?.value || 'LED',
        ventilationSystem: formData.ventilationSystem,
        hotWaterSystem: formData.hotWaterSystems?.[0]?.value || 'Elektrisitet',
        // Also include the full multi-select data as JSON for the dashboard
        energySystemsMulti: JSON.stringify({
          heating: formData.heatingSystems || [],
          lighting: formData.lightingSystems || [],
          ventilation: formData.ventilationSystem,
          hotWater: formData.hotWaterSystems || []
        }),
        ...(formData.buildingYear && { buildingYear: formData.buildingYear.toString() }),
        ...(formData.numberOfFloors && { numberOfFloors: formData.numberOfFloors.toString() }),
        ...(selectedCertificate && { bygningsnummer: selectedCertificate }),
        // Add selected building data for map highlighting
        ...(selectedBuilding?.id && { selectedBuildingOsmId: selectedBuilding.id }),
        // Add building footprint coordinates for 3D model
        ...(selectedBuilding?.coordinates && {
          buildingFootprint: JSON.stringify(selectedBuilding.coordinates)
        }),
        ...(selectedBuilding?.levels && { osmLevels: selectedBuilding.levels.toString() }),
      });

      // Add certificate data if available
      if (selectedCertificate) {
        const cert = enovaCertificates.find(c => c.bygningsnummer === selectedCertificate);
        if (cert) {
          if (cert.energyClass) queryParams.set('energyClass', cert.energyClass);
          if (cert.energyConsumption) queryParams.set('energyConsumption', cert.energyConsumption.toString());
          if (cert.buildingCategory) queryParams.set('buildingCategory', cert.buildingCategory);
          if (cert.constructionYear) queryParams.set('constructionYear', cert.constructionYear.toString());
        }
      }

      // Use window.location to prevent Next.js router issues
      // Navigate to waterfall dashboard to use the 3D model and roof algorithm
      window.location.href = `/dashboard-waterfall?${queryParams.toString()}`;
    } catch (error) {
      console.error('Failed to submit building data:', error);
      setIsSubmittingForm(false);
    }
  };

  const handleBack = () => {
    if (showForm) {
      setShowForm(false);
    } else if (showCertificates) {
      setShowCertificates(false);
      setSelectedCertificate(null);
    } else {
      // Use window.location to avoid Next.js router issues
      window.location.href = '/';
    }
  };

  if (hasParameterError) {
    return (
      <div className="h-screen bg-background relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-aurora-green/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-aurora-cyan/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="text-center">
            <Building className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Mangler adresseinformasjon</h1>
            <p className="text-text-tertiary mb-4">Gå tilbake til søket for å velge en adresse.</p>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tilbake til søk
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingMap || isLoadingEnova) {
    return (
      <div className="h-screen bg-background relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-aurora-green/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-aurora-cyan/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="text-center">
            <Building className="w-16 h-16 text-aurora-cyan mx-auto mb-4 animate-pulse" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Laster bygningsdata...</h1>
            <p className="text-text-tertiary">
              {isLoadingMap && isLoadingEnova && "Henter kart og energisertifikater"}
              {isLoadingMap && !isLoadingEnova && "Henter kartdata"}
              {!isLoadingMap && isLoadingEnova && "Henter energisertifikater"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-aurora-green/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-aurora-cyan/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-aurora-purple/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Inactivity Prompt Overlay */}
      {showInactivityPrompt && selectedBuildingId && !showForm && !showCertificates && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-modal-overlay backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="bg-popover border-accent/30 max-w-md">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <Building className="w-12 h-12 text-aurora-cyan mx-auto" />
                <h3 className="text-xl font-semibold text-foreground">
                  Er riktig bygg valgt?
                </h3>
                <div className="flex gap-3 justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowInactivityPrompt(false);
                      setSelectedBuildingId(null);
                      resetInactivityTimer();
                    }}
                    className="border-input-border hover:bg-secondary-hover"
                  >
                    Velg annet bygg
                  </Button>
                  <Button
                    onClick={() => {
                      setShowInactivityPrompt(false);
                      proceedToForm();
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Ja, fortsett
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="relative z-10 h-screen flex flex-col">
        {/* Minimal Header - Three column layout with centered address */}
        <div className="grid grid-cols-3 items-center px-6 py-3 border-b border-white/10 bg-black/20 backdrop-blur-lg">
          {/* Left column - Back button */}
          <div className="flex justify-start">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="text-text-tertiary hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {showForm ? 'Tilbake til sertifikater' : showCertificates ? 'Tilbake til bygninger' : 'Tilbake til søk'}
            </Button>
          </div>

          {/* Center column - Address with Owner Info */}
          <div className="flex flex-col items-center justify-center gap-1 text-foreground">
            {/* Owner Name (if available) */}
            {buildingOwner && (
              <div className="text-xs text-text-secondary">
                Eier: <span className="font-medium">{buildingOwner.name}</span>
              </div>
            )}

            {/* Address Line */}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-aurora-cyan flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium">{address}</span>
                <span className="text-text-tertiary ml-2">
                  {municipality}{municipalityNumber && <span className="text-text-muted ml-1">({municipalityNumber})</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Right column - Action buttons */}
          <div className="flex justify-end">
            {selectedBuildingId && !showCertificates && !showForm && (
              <Button
                onClick={() => {
                  // Check if there are any certificates for this address
                  if (enovaCertificates.length === 0) {
                    // No certificates at all → skip directly to form
                    proceedToForm();
                    return;
                  }

                  // Find certificates that are already auto-matched to buildings via bygningsnummer
                  const matchedCertificates = enovaCertificates.filter(cert =>
                    mapBuildings.some(building => building.bygningsnummer === cert.bygningsnummer)
                  );

                  // Check if all certificates are accounted for
                  if (matchedCertificates.length === enovaCertificates.length) {
                    // All certificates are auto-matched → skip to form
                    proceedToForm();
                  } else {
                    // Check if there are actually any unmatched certificates to map
                    const unmatchedCertificates = enovaCertificates.filter(cert =>
                      !mapBuildings.some(building => building.bygningsnummer === cert.bygningsnummer)
                    );

                    if (unmatchedCertificates.length > 0) {
                      // Some certificates need manual mapping → show mapping step
                      setShowCertificates(true);
                    } else {
                      // No certificates to map → skip to form
                      proceedToForm();
                    }
                  }
                }}
                className="bg-gradient-primary hover:opacity-90 text-primary-foreground"
              >
                Fortsett
              </Button>
            )}
            {showCertificates && !showForm && (
              <Button
                onClick={proceedToForm}
                className="bg-gradient-primary hover:opacity-90 text-primary-foreground"
              >
                Fortsett til bygningsdata
              </Button>
            )}
          </div>
        </div>

        {/* Interactive Map + Building/Certificate Selection */}
        {(
          <div className="flex-1 flex overflow-hidden">
            {mapBuildings.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <Card className="bg-card/50 backdrop-blur-lg border-card-border max-w-md">
                  <CardContent className="text-center py-8 text-text-tertiary">
                    <Building className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <h3 className="text-foreground text-lg font-semibold mb-2">Ingen bygninger funnet</h3>
                    <p className="mb-4">Ingen bygningsdata tilgjengelig for denne adressen.</p>
                    <Button
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={proceedToForm}
                    >
                      Fortsett uten kartdata
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                {/* Interactive Map - Takes most of the screen */}
                <div className="flex-1 relative">
                  {!isMapReady && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                      <div className="text-foreground text-sm">Laster kart...</div>
                    </div>
                  )}
                  <div className="w-full h-full bg-background">
                    {typeof window !== 'undefined' && (
                      <MapContainer
                        center={mapCenter}
                        zoom={19}
                        maxZoom={20}
                        minZoom={10}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={true}
                        attributionControl={false}
                        whenReady={() => setIsMapReady(true)}
                        ref={setMapRef}
                        scrollWheelZoom={true}
                        zoomDelta={0.5}
                        zoomSnap={0.25}
                        wheelDebounceTime={100}
                        wheelPxPerZoomLevel={120}
                      >
                        <ZoomTracker onZoomChange={(zoom) => setCurrentZoom(zoom)} />
                        <TileLayer
                          url={`https://{s}.basemaps.cartocdn.com/${themeColors.mode === 'dark' ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`}
                          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                          maxZoom={20}
                          minZoom={10}
                        />

                        {/* Property Boundaries from Geonorge */}
                        {propertyBoundaries.map((property, index) => {
                          // Convert GeoJSON coordinates [lon, lat] to Leaflet [lat, lon]
                          const outerRing = property.coordinates[0];
                          const leafletCoords: [number, number][] = outerRing.map(coord => [coord[1], coord[0]]);
                          const isFocus = index === 0;

                          // Get CSS variable colors - use info (cyan) for better dark mode visibility
                          const propertyColor = getComputedStyle(document.documentElement).getPropertyValue('--info').trim() || '#06b6d4';
                          const propertyLightColor = getComputedStyle(document.documentElement).getPropertyValue('--aurora-cyan').trim() || '#22d3ee';

                          return (
                            <Polygon
                              key={`property-${index}`}
                              positions={leafletCoords}
                              pathOptions={{
                                color: isFocus ? propertyColor : propertyLightColor,
                                fillColor: 'transparent', // No fill - only outline
                                fillOpacity: 0,
                                weight: 2,
                                dashArray: '5, 10',
                              }}
                            >
                              <Tooltip permanent={false} direction="top">
                                <div className="text-xs">
                                  <div className="font-bold text-info">
                                    {isFocus ? 'Eiendomsgrense (valgt)' : 'Nabo eiendom'}
                                  </div>
                                  <div>
                                    <strong>Matrikkel:</strong> {property.matrikkel.kommunenummer}/{property.matrikkel.gardsnummer}/{property.matrikkel.bruksnummer}
                                  </div>
                                  <div className="text-text-tertiary">Kilde: Kartverket</div>
                                </div>
                              </Tooltip>
                            </Polygon>
                          );
                        })}

                        {mapBuildings.map((building) => {
                          // Check if building is on the selected property (first property boundary)
                          const isOnProperty = propertyBoundaries.length > 0
                            ? isBuildingInProperty(building, propertyBoundaries[0])
                            : false;

                          return (
                            <BuildingMarker
                              key={building.id}
                              building={building}
                              buildingNumber={getBuildingNumber(building)}
                              buildingLabel={getBuildingLabel(building)}
                              isSelected={selectedBuildingId === building.id}
                              onSelect={() => handleMapBuildingSelect(building.id)}
                              showCertificates={showCertificates}
                              showForm={showForm}
                              enovaCertificates={enovaCertificates}
                              selectedBuildingId={selectedBuildingId}
                              currentZoom={currentZoom}
                              selectedCertificate={selectedCertificate}
                              address={address || ''}
                              isOnSelectedProperty={isOnProperty}
                            />
                          );
                        })}
                      </MapContainer>
                    )}
                  </div>
                </div>

                {/* Building/Certificate List - Right sidebar */}
                <div className={`${showForm ? 'w-1/2' : 'w-80'} border-l border-white/10 bg-black/20 backdrop-blur-lg flex flex-col`}>
                  <div className="p-4 border-b border-white/10">
                    {showForm ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-foreground font-semibold text-lg flex items-center gap-2">
                              <FormInput className="w-5 h-5 text-aurora-cyan" />
                              Bygningsdata
                            </h3>
                            <p className="text-text-tertiary text-sm mt-1">
                              Fyll ut bygningsinformasjon for analyse
                            </p>
                          </div>

                          {/* Reset button always visible */}
                          <Button
                            onClick={() => {
                              // Trigger reset in form component
                              if ((window as any).resetBuildingFormToCalculated) {
                                (window as any).resetBuildingFormToCalculated();
                              }
                            }}
                            size="sm"
                            variant="outline"
                            className="border-accent/50 text-accent hover:bg-accent/10 text-sm px-3 py-1"
                          >
                            Bruk estimater
                          </Button>
                        </div>
                      </>
                    ) : !showCertificates ? (
                      <>
                        <h3 className="text-foreground font-semibold text-lg flex items-center gap-2">
                          <Building className="w-5 h-5 text-aurora-cyan" />
                          Bygninger ({mapBuildings.length})
                        </h3>
                        <p className="text-text-tertiary text-sm mt-1">
                          Klikk bygning i kartet eller listen
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-foreground font-semibold text-lg flex items-center gap-2">
                          <Zap className="w-5 h-5 text-aurora-cyan" />
                          Tilleggssertifikater ({enovaCertificates.filter(cert =>
                            !mapBuildings.some(building => building.bygningsnummer === cert.bygningsnummer)
                          ).length})
                        </h3>
                        <p className="text-text-tertiary text-sm mt-1">
                          Koble sertifikater til bygninger eller fortsett uten
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {showForm ? (
                      // Empty state - form is now shown in modal
                      <div className="flex items-center justify-center h-full">
                        <p className="text-text-tertiary">Fyller ut bygningsdata...</p>
                      </div>
                    ) : !showCertificates ? (
                      // Building List - Show all buildings, selected first
                      <>
                        {(() => {
                          // Sort by alphabetical order (based on distance-sorted labels), but selected first
                          const sortedBuildings = [...mapBuildings].sort((a, b) => {
                            // Selected building always goes first
                            if (selectedBuildingId === a.id) return -1;
                            if (selectedBuildingId === b.id) return 1;

                            // For all others, sort alphabetically by their labels (A, B, C, etc.)
                            const aLabel = getBuildingLabel(a);
                            const bLabel = getBuildingLabel(b);
                            return aLabel.localeCompare(bLabel);
                          });

                          const allBuildings = sortedBuildings;

                          return allBuildings.map((building, index) => {
                            const isSelected = selectedBuildingId === building.id;
                            const originalIndex = mapBuildings.findIndex(b => b.id === building.id);
                            const buildingNumber = originalIndex + 1;
                            const buildingLabel = getBuildingLabel(building);

                            // Find matching Enova certificate for this building using bygningsnummer
                            const matchingCertificate = building.bygningsnummer ?
                              enovaCertificates.find(cert => cert.bygningsnummer === building.bygningsnummer) :
                              null;

                            // Show header for first building
                            const showAddressHeader = index === 0;

                            return (
                              <Fragment key={building.id}>
                                {showAddressHeader && (
                                  <div className="text-xs font-semibold text-cyan-400 mb-2 px-1">
                                    📍 {address}
                                  </div>
                                )}
                                <Card
                                  className={`cursor-pointer transition-all duration-300 ${
                                    isSelected
                                      ? 'bg-fuchsia-500/20 border-fuchsia-400/50 scale-[1.02]'
                                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                  }`}
                                  onClick={() => handleMapBuildingSelect(building.id)}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 ${
                                        isSelected
                                          ? 'bg-primary border-primary-hover text-primary-foreground'
                                          : 'bg-secondary border-input-border text-foreground'
                                      }`}>
                                        {buildingLabel}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <h4 className="text-foreground font-medium text-sm truncate">
                                              {building.bygningsnummer ? `Bygg ${building.bygningsnummer}` : (building.name || `Bygning ${buildingLabel}`)}
                                            </h4>
                                            {isSelected && (
                                              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                                            )}
                                          </div>
                                          {matchingCertificate?.energyClass && (
                                            <Badge variant={`grade-${matchingCertificate.energyClass}` as any} className="flex-shrink-0">
                                              {matchingCertificate.energyClass}
                                            </Badge>
                                          )}
                                        </div>

                                        <div className="text-xs text-text-secondary space-y-1">
                                          {matchingCertificate && (
                                            <>
                                              {matchingCertificate.buildingCategory && (
                                                <div className="font-medium text-text-primary">
                                                  {matchingCertificate.buildingCategory}
                                                </div>
                                              )}
                                              <div className="flex gap-3 flex-wrap">
                                                {matchingCertificate.constructionYear && (
                                                  <div>Byggeår {matchingCertificate.constructionYear}</div>
                                                )}
                                                {matchingCertificate.energyConsumption && (
                                                  <div>{Math.round(matchingCertificate.energyConsumption)} kWh/m²</div>
                                                )}
                                                {building.area && (
                                                  <div>{Math.round(building.area)} m²</div>
                                                )}
                                              </div>
                                            </>
                                          )}
                                          {!matchingCertificate && (
                                            <>
                                              {building.area && (
                                                <div>{Math.round(building.area)} m²</div>
                                              )}
                                              {building.type && (
                                                <div className="capitalize">{building.type}</div>
                                              )}
                                            </>
                                          )}
                                          {building.matchesSearchedAddress && (
                                            <div className="text-accent font-medium">
                                              ✓ Matcher søkt adresse
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </Fragment>
                            );
                          });
                        })()}
                      </>
                    ) : (
                      // Certificate List
                      <>
                        {/* Option to proceed without certificate */}
                        <Card
                          className={`cursor-pointer transition-all duration-300 ${
                            selectedCertificate === null
                              ? 'bg-cyan-400/20 border-cyan-400/50 scale-[1.02]'
                              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                          }`}
                          onClick={() => handleCertificateSelect(null)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg ${
                                selectedCertificate === null ? 'bg-accent text-accent-foreground' : 'bg-secondary text-foreground'
                              }`}>
                                ✕
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-foreground font-medium text-sm">Ikke bruk sertifikat</h4>
                                  {selectedCertificate === null && (
                                    <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-text-tertiary text-xs">Fyll ut energidata manuelt</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Available certificates - show all with auto-match indicators */}
                        {enovaCertificates
                          .map((cert) => {
                          const isSelected = selectedCertificate === cert.bygningsnummer;
                          const badgeColor = getEnergyClassBadgeColor(cert.energyClass);
                          // Check if this certificate was auto-matched to a building
                          const autoMatchedBuilding = mapBuildings.find(b => b.bygningsnummer === cert.bygningsnummer);
                          const isAutoMatched = !!autoMatchedBuilding;

                          return (
                            <Card
                              key={cert.bygningsnummer}
                              className={`cursor-pointer transition-all duration-300 ${
                                isSelected
                                  ? 'bg-cyan-400/20 border-cyan-400/50 scale-[1.02]'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                              }`}
                              onClick={() => handleCertificateSelect(cert.bygningsnummer)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="text-white font-medium text-sm">
                                        Bygg {cert.bygningsnummer}
                                      </h4>
                                      {cert.energyClass && (
                                        <Badge variant={`grade-${cert.energyClass}` as any} className="flex-shrink-0">
                                          {cert.energyClass}
                                        </Badge>
                                      )}
                                      {isAutoMatched && (
                                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                          Auto-koblet
                                        </Badge>
                                      )}
                                      {isSelected && (
                                        <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                                      )}
                                    </div>

                                    <div className="text-xs text-text-secondary space-y-1">
                                      {cert.buildingCategory && (
                                        <div className="flex items-center gap-1">
                                          <Home className="w-3 h-3" />
                                          {cert.buildingCategory}
                                        </div>
                                      )}
                                      {cert.constructionYear && (
                                        <div className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          {cert.constructionYear}
                                        </div>
                                      )}
                                      {cert.energyConsumption && (
                                        <div className="flex items-center gap-1">
                                          <Zap className="w-3 h-3" />
                                          {cert.energyConsumption} kWh/år
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* Building Data Form Modal */}
      <BuildingDataFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        address={address || ''}
        lat={lat || ''}
        lon={lon || ''}
        municipality={municipality || ''}
        municipalityNumber={municipalityNumber || ''}
        postalCode={postalCode || ''}
        gnr={gnr || ''}
        bnr={bnr || ''}
        bygningsnummer={selectedCertificate || ''}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmittingForm}
      />
    </div>
  );
}

// Loading component for Suspense boundary
function SelectBuildingLoading() {
  return (
    <div className="h-screen bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-aurora-green/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-aurora-cyan/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="text-center">
          <Building className="w-16 h-16 text-aurora-cyan mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Laster bygningsvalg...</h1>
          <p className="text-text-tertiary">Klargjør bygningsdata</p>
        </div>
      </div>
    </div>
  );
}

// Main exported component with Suspense boundary
export default function SelectBuildingPage() {
  return (
    <Suspense fallback={<SelectBuildingLoading />}>
      <SelectBuildingContent />
    </Suspense>
  );
}

// Separate component for building markers to handle dynamic icons
interface BuildingMarkerProps {
  building: MapBuilding;
  buildingNumber: number;
  buildingLabel: string;
  isSelected: boolean;
  onSelect: () => void;
  showCertificates: boolean;
  showForm: boolean;
  enovaCertificates: EnovaCertificate[];
  selectedBuildingId: string | null;
  currentZoom: number;
  selectedCertificate: string | null;
  address: string;
  isOnSelectedProperty?: boolean;
}

function BuildingMarker({ building, buildingNumber, buildingLabel, isSelected, onSelect, showCertificates, showForm, enovaCertificates, selectedBuildingId, currentZoom, selectedCertificate, address, isOnSelectedProperty = false }: BuildingMarkerProps) {
  const [centroid, setCentroid] = useState<[number, number] | null>(null);
  const [numberIcon, setNumberIcon] = useState<any>(null);

  // Building color scheme: use theme-aware colors from design token system
  // IMPORTANT: All hooks must be called before any conditional returns
  const polygonColors = usePolygonColors();

  // Calculate polygon centroid
  useEffect(() => {
    if (building.coordinates && building.coordinates.length > 0) {
      // Calculate centroid of the polygon
      const coords = building.coordinates;
      let x = 0, y = 0;

      for (const [lat, lon] of coords) {
        x += lat;
        y += lon;
      }

      const centroidLat = x / coords.length;
      const centroidLon = y / coords.length;
      setCentroid([centroidLat, centroidLon]);
    }
  }, [building.coordinates]);

  // Create number/grade icon for centroid
  useEffect(() => {
    const createNumberIcon = async () => {
      if (typeof window === 'undefined') return;

      const L = await import('leaflet');

      // Determine what to display: energy grade (if available) or address label
      let displayText = buildingLabel;
      let bgColor = 'bg-secondary text-foreground';

      // Check if this building has a matched Enova certificate
      const matchedCert = building.bygningsnummer
        ? enovaCertificates.find(c => c.bygningsnummer === building.bygningsnummer)
        : null;

      if (matchedCert && matchedCert.energyClass) {
        // Show energy grade with appropriate color
        displayText = matchedCert.energyClass;

        // Color code the energy grade using design system colors
        const gradeColors: Record<string, string> = {
          'A': 'bg-success text-success-foreground',
          'B': 'bg-success text-success-foreground',
          'C': 'bg-warning text-warning-foreground',
          'D': 'bg-warning text-warning-foreground',
          'E': 'bg-destructive text-destructive-foreground',
          'F': 'bg-destructive text-destructive-foreground',
          'G': 'bg-destructive text-destructive-foreground'
        };
        bgColor = gradeColors[matchedCert.energyClass.toUpperCase()] || 'bg-secondary text-foreground';
      }

      // Hide markers when zoomed out 2+ levels from starting zoom (19)
      const shouldShowMarker = currentZoom > 17; // Show only at zoom 18, 19+ (hide at 17 and below)

      const iconHtml = shouldShowMarker ? `
        <div class="flex items-center justify-center w-8 h-8 rounded-full font-bold text-lg shadow-lg cursor-pointer transition-all duration-300 border-2 ${bgColor} ${
          isSelected
            ? 'border-primary scale-110'
            : 'border-input-border'
        }">
          ${displayText}
        </div>
      ` : `
        <div style="display: none;"></div>
      `;

      const icon = L.divIcon({
        html: iconHtml,
        className: 'building-number-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      setNumberIcon(icon);
    };

    createNumberIcon();
  }, [buildingLabel, isSelected, enovaCertificates, building.id, building.bygningsnummer, currentZoom]);

  if (!building.coordinates || building.coordinates.length === 0 || !centroid || !numberIcon) {
    return null;
  }

  // Convert coordinates to Leaflet format [lat, lon]
  const polygonCoords = building.coordinates.map(([lat, lon]) => [lat, lon] as [number, number]);

  // Get CSS color for property buildings - use accent (magenta/pink) for good dark mode visibility
  const propertyBuildingColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ec4899';

  // Use polygon colors: accent color for buildings on property, default otherwise
  // Always use full opacity - no transparency or dimming
  let polygonStyle;
  if (isOnSelectedProperty) {
    polygonStyle = {
      color: propertyBuildingColor,
      fillColor: propertyBuildingColor,
      fillOpacity: isSelected ? 0.8 : 0.4, // More filled when selected, less when not
      weight: isSelected ? 3 : 2,
    };
  } else {
    polygonStyle = {
      ...polygonColors.default,
      fillOpacity: 0.6, // Ensure default buildings also have good visibility
    };
  }

  return (
    <>
      {/* Building Polygon */}
      <Polygon
        positions={polygonCoords}
        pathOptions={polygonStyle}
        eventHandlers={{
          click: (e) => {
            // Immediately blur the element to remove focus
            e.target.getElement()?.blur();
            // Prevent default focus behavior
            e.originalEvent?.preventDefault();
            // Call our selection handler
            onSelect();
          },
        }}
      >
        <Tooltip direction="top" offset={[0, -10]} className="custom-tooltip">
          <div className="p-2 min-w-48">
            <h3 className={`font-bold text-sm mb-2 ${isSelected ? 'text-primary' : 'text-text-tertiary'}`}>
              🏢 {isSelected ? 'Valgt bygning' : 'Klikk for å velge'}
            </h3>
            <div className="space-y-1 text-xs text-text-secondary">
              <div><strong>Kjennemerke:</strong> {buildingLabel}</div>
              {building.address && <div><strong>Adresse:</strong> {building.address}</div>}
              {building.bygningsnummer && <div><strong>Bygningsnummer:</strong> {building.bygningsnummer}</div>}
              {building.name && <div><strong>Navn:</strong> {building.name}</div>}
              {building.type && <div><strong>Type:</strong> {building.type}</div>}
              {building.area && <div><strong>Areal:</strong> ~{Math.round(building.area)} m²</div>}
              {building.levels && <div><strong>Etasjer:</strong> {building.levels}</div>}
              {building.matchesSearchedAddress && (
                <div className="text-accent mt-2 text-xs">✓ Matcher søkt adresse</div>
              )}
              <div className="text-text-tertiary mt-2 text-xs">Kilde: OpenStreetMap</div>
            </div>
          </div>
        </Tooltip>
      </Polygon>

      {/* Number Label at Centroid - Only show when zoomed in enough */}
      {currentZoom > 17 && (
        <Marker
          position={centroid}
          icon={numberIcon}
          eventHandlers={{
            click: onSelect,
          }}
        />
      )}
    </>
  );
}