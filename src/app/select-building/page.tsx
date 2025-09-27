'use client';

import React, { useState, useEffect, useRef, Suspense, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Building, MapPin, Zap, CheckCircle, Home, Calendar, Map, FormInput } from "lucide-react";
import { MapDataService } from "@/services/map-data.service";
import { BuildingDataForm } from "@/components/BuildingDataForm";
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
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<string | null>(null);
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

  // Fetch map buildings and Enova certificates in parallel
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
        setMapBuildings(buildingsWithLabels);

        // Simple: just center on address coordinates
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
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
            ? 'bg-cyan-400 border-cyan-300 scale-125 shadow-lg shadow-cyan-400/50'
            : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
        }">
          ${buildingNumber}
        </div>
        ${isSelected ? '<div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-cyan-400 rotate-45"></div>' : ''}
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
    if (!energyClass) return 'bg-gray-600 text-white border-gray-500';

    const colorMap: Record<string, string> = {
      'A': 'bg-green-500 text-white border-green-400',
      'B': 'bg-lime-500 text-white border-lime-400',
      'C': 'bg-yellow-500 text-black border-yellow-400',
      'D': 'bg-orange-500 text-white border-orange-400',
      'E': 'bg-red-500 text-white border-red-400',
      'F': 'bg-red-600 text-white border-red-500',
      'G': 'bg-red-700 text-white border-red-600'
    };
    return colorMap[energyClass.toUpperCase()] || 'bg-gray-600 text-white border-gray-500';
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
      <div className="h-screen bg-[#0c0c0e] relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="text-center">
            <Building className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Mangler adresseinformasjon</h1>
            <p className="text-slate-400 mb-4">Gå tilbake til søket for å velge en adresse.</p>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
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
      <div className="h-screen bg-[#0c0c0e] relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="text-center">
            <Building className="w-16 h-16 text-cyan-400 mx-auto mb-4 animate-pulse" />
            <h1 className="text-2xl font-bold text-white mb-2">Laster bygningsdata...</h1>
            <p className="text-slate-400">
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
    <div className="h-screen bg-[#0c0c0e] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-violet-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Inactivity Prompt Overlay */}
      {showInactivityPrompt && selectedBuildingId && !showForm && !showCertificates && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="bg-gray-900/95 border-cyan-500/30 max-w-md">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <Building className="w-12 h-12 text-cyan-400 mx-auto" />
                <h3 className="text-xl font-semibold text-white">
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
                    className="border-gray-600 hover:bg-gray-800"
                  >
                    Velg annet bygg
                  </Button>
                  <Button
                    onClick={() => {
                      setShowInactivityPrompt(false);
                      proceedToForm();
                    }}
                    className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
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
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {showForm ? 'Tilbake til sertifikater' : showCertificates ? 'Tilbake til bygninger' : 'Tilbake til søk'}
            </Button>
          </div>

          {/* Center column - Address (always centered) */}
          <div className="flex items-center justify-center gap-3 text-white">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <div className="text-sm">
              <span className="font-medium">{address}</span>
              <span className="text-slate-400 ml-2">
                {municipality}{municipalityNumber && <span className="text-slate-500 ml-1">({municipalityNumber})</span>}
              </span>
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
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
              >
                Fortsett
              </Button>
            )}
            {showCertificates && !showForm && (
              <Button
                onClick={proceedToForm}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
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
                <Card className="bg-white/5 backdrop-blur-lg border-white/10 max-w-md">
                  <CardContent className="text-center py-8 text-slate-400">
                    <Building className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <h3 className="text-white text-lg font-semibold mb-2">Ingen bygninger funnet</h3>
                    <p className="mb-4">Ingen bygningsdata tilgjengelig for denne adressen.</p>
                    <Button
                      className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
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
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10">
                      <div className="text-white text-sm">Laster kart...</div>
                    </div>
                  )}
                  <div className="w-full h-full bg-slate-900">
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
                          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                          maxZoom={20}
                          minZoom={10}
                        />

                        {mapBuildings.map((building) => (
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
                          />
                        ))}
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
                            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                              <FormInput className="w-5 h-5 text-cyan-400" />
                              Bygningsdata
                            </h3>
                            <p className="text-slate-400 text-sm mt-1">
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
                            className="border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 text-sm px-3 py-1"
                          >
                            Bruk estimater
                          </Button>
                        </div>
                      </>
                    ) : !showCertificates ? (
                      <>
                        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                          <Building className="w-5 h-5 text-cyan-400" />
                          Bygninger ({mapBuildings.length})
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">
                          Klikk bygning i kartet eller listen
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                          <Zap className="w-5 h-5 text-cyan-400" />
                          Tilleggssertifikater ({enovaCertificates.filter(cert =>
                            !mapBuildings.some(building => building.bygningsnummer === cert.bygningsnummer)
                          ).length})
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">
                          Koble sertifikater til bygninger eller fortsett uten
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {showForm ? (
                      // Building Data Form
                      <BuildingDataForm
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
                        onResetRequest={() => {/* Handled by global function */}}
                      />
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
                                          ? 'bg-fuchsia-500 border-fuchsia-400 text-white'
                                          : 'bg-slate-700 border-slate-600 text-white'
                                      }`}>
                                        {buildingLabel}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h4 className="text-white font-medium text-sm truncate">
                                            {building.name || (building.addressLabel ? `Adresse ${buildingLabel}` : `Bygning ${building.bygningsnummer || buildingLabel}`)}
                                          </h4>
                                          {isSelected && (
                                            <CheckCircle className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
                                          )}
                                        </div>

                                        <div className="text-xs text-slate-300 space-y-1">
                                          {building.area && (
                                            <div>{Math.round(building.area)} m²</div>
                                          )}
                                          {building.type && (
                                            <div className="capitalize">{building.type}</div>
                                          )}
                                          {building.matchesSearchedAddress && (
                                            <div className="text-cyan-400 font-medium">
                                              ✓ Matcher søkt adresse
                                            </div>
                                          )}
                                          {matchingCertificate && (
                                            <div className="bg-emerald-500/20 border border-emerald-400/30 rounded px-3 py-2 mt-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                                                <span className="text-emerald-400 font-medium text-xs">
                                                  Energimerke {matchingCertificate.energyClass}
                                                </span>
                                              </div>
                                              <div className="space-y-1">
                                                {matchingCertificate.energyConsumption && (
                                                  <div className="text-xs text-emerald-300">
                                                    ⚡ {Math.round(matchingCertificate.energyConsumption)} kWh/m²
                                                  </div>
                                                )}
                                                {matchingCertificate.address && (
                                                  <div className="text-xs text-emerald-300">
                                                    📍 {matchingCertificate.address}
                                                  </div>
                                                )}
                                                {matchingCertificate.city && (
                                                  <div className="text-xs text-emerald-300">
                                                    🏛️ {matchingCertificate.city}
                                                  </div>
                                                )}
                                                {matchingCertificate.buildingCategory && (
                                                  <div className="text-xs text-emerald-300">
                                                    🏢 {matchingCertificate.buildingCategory}
                                                  </div>
                                                )}
                                                {matchingCertificate.constructionYear && (
                                                  <div className="text-xs text-emerald-300">
                                                    📅 Byggeår {matchingCertificate.constructionYear}
                                                  </div>
                                                )}
                                              </div>
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
                                selectedCertificate === null ? 'bg-cyan-400 text-slate-900' : 'bg-slate-700 text-white'
                              }`}>
                                ✕
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-white font-medium text-sm">Ikke bruk sertifikat</h4>
                                  {selectedCertificate === null && (
                                    <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-slate-400 text-xs">Fyll ut energidata manuelt</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Available certificates - only show unmatched certificates for manual mapping */}
                        {enovaCertificates
                          .filter(cert =>
                            // Show certificates that are NOT automatically matched to any building
                            !mapBuildings.some(building => building.bygningsnummer === cert.bygningsnummer)
                          )
                          .map((cert) => {
                          const isSelected = selectedCertificate === cert.bygningsnummer;
                          const badgeColor = getEnergyClassBadgeColor(cert.energyClass);

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
                                        Bygning {cert.bygningsnummer}
                                      </h4>
                                      {cert.energyClass && (
                                        <div className={`px-1.5 py-0.5 rounded text-xs font-bold border ${badgeColor}`}>
                                          {cert.energyClass}
                                        </div>
                                      )}
                                      {isSelected && (
                                        <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                                      )}
                                    </div>

                                    <div className="text-xs text-slate-300 space-y-1">
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
    </div>
  );
}

// Loading component for Suspense boundary
function SelectBuildingLoading() {
  return (
    <div className="h-screen bg-[#0c0c0e] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="text-center">
          <Building className="w-16 h-16 text-cyan-400 mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold text-white mb-2">Laster bygningsvalg...</h1>
          <p className="text-slate-400">Klargjør bygningsdata</p>
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
}

function BuildingMarker({ building, buildingNumber, buildingLabel, isSelected, onSelect, showCertificates, showForm, enovaCertificates, selectedBuildingId, currentZoom, selectedCertificate, address }: BuildingMarkerProps) {
  const [centroid, setCentroid] = useState<[number, number] | null>(null);
  const [numberIcon, setNumberIcon] = useState<any>(null);

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

      // Determine what to display: address label or energy grade
      let displayText = buildingLabel;
      let bgColor = 'bg-slate-700 text-white';

      if (showCertificates && enovaCertificates.length > 0 && building.id === selectedBuildingId) {
        // Only show energy grade for the selected building
        let cert = null;

        if (selectedCertificate) {
          // Find the specific selected certificate
          cert = enovaCertificates.find(c => c.bygningsnummer === selectedCertificate);
        } else {
          // If no certificate selected (user chose "Ikke bruk sertifikat"), don't show any grade
          cert = null;
        }

        if (cert && cert.energyClass) {
          displayText = cert.energyClass;
          // Color code the energy grade
          const gradeColors: Record<string, string> = {
            'A': 'bg-green-500 text-white',
            'B': 'bg-lime-500 text-white',
            'C': 'bg-yellow-500 text-black',
            'D': 'bg-orange-500 text-white',
            'E': 'bg-red-500 text-white',
            'F': 'bg-red-600 text-white',
            'G': 'bg-red-700 text-white'
          };
          bgColor = gradeColors[cert.energyClass.toUpperCase()] || 'bg-gray-500 text-white';
        }
      }

      // Hide markers when zoomed out 2+ levels from starting zoom (19)
      const shouldShowMarker = currentZoom > 17; // Show only at zoom 18, 19+ (hide at 17 and below)

      const iconHtml = shouldShowMarker ? `
        <div class="flex items-center justify-center w-8 h-8 rounded-full font-bold text-lg shadow-lg cursor-pointer transition-all duration-300 border-2 ${bgColor} ${
          isSelected
            ? 'border-fuchsia-500 scale-110'
            : 'border-slate-600'
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
  }, [buildingLabel, isSelected, showCertificates, enovaCertificates, selectedBuildingId, building.id, currentZoom, selectedCertificate]);

  if (!building.coordinates || building.coordinates.length === 0 || !centroid || !numberIcon) {
    return null;
  }

  // Convert coordinates to Leaflet format [lat, lon]
  const polygonCoords = building.coordinates.map(([lat, lon]) => [lat, lon] as [number, number]);

  // Building color scheme: magenta for selected, neutral gray for unselected (like dashboard)
  const polygonStyle = {
    fillColor: isSelected ? '#d946ef' : '#475569', // Magenta for selected, neutral gray for unselected
    color: isSelected ? '#e879f9' : '#64748b', // Border colors
    weight: isSelected ? 3 : 2, // Thicker border for selected
    opacity: 1,
    stroke: true,
    fillOpacity: isSelected ? 0.6 : 0.3,
  };

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
            <h3 className={`font-bold text-sm mb-2 ${isSelected ? 'text-fuchsia-400' : 'text-slate-400'}`}>
              🏢 {isSelected ? 'Valgt bygning' : 'Klikk for å velge'}
            </h3>
            <div className="space-y-1 text-xs text-slate-300">
              <div><strong>Label:</strong> {buildingLabel}</div>
              {building.address && <div><strong>Adresse:</strong> {building.address}</div>}
              {building.bygningsnummer && <div><strong>Bygningsnummer:</strong> {building.bygningsnummer}</div>}
              {building.name && <div><strong>Navn:</strong> {building.name}</div>}
              {building.type && <div><strong>Type:</strong> {building.type}</div>}
              {building.area && <div><strong>Areal:</strong> ~{Math.round(building.area)} m²</div>}
              {building.levels && <div><strong>Etasjer:</strong> {building.levels}</div>}
              {building.matchesSearchedAddress && (
                <div className="text-cyan-400 mt-2 text-xs">✓ Matcher søkt adresse</div>
              )}
              <div className="text-slate-400 mt-2 text-xs">Kilde: OpenStreetMap</div>
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