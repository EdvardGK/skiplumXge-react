'use client';

import { useState, useEffect, Suspense } from "react";
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
}

interface EnovaCertificate {
  bygningsnummer: string;
  energyClass?: string;
  buildingCategory?: string;
  energyConsumption?: number;
  constructionYear?: number;
}

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

  // Fetch map buildings and Enova certificates in parallel
  useEffect(() => {
    const fetchData = async () => {
      if (!address || !lat || !lon) {
        router.push('/');
        return;
      }

      // Fetch map buildings
      setIsLoadingMap(true);
      let fetchedBuildings: MapBuilding[] = [];
      try {
        const buildings = await MapDataService.fetchNearbyBuildings(
          parseFloat(lat),
          parseFloat(lon),
          100 // 100m radius for building selection
        );
        fetchedBuildings = buildings;
        setMapBuildings(buildings);

        // Simple: just center on address coordinates
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
      } catch (error) {
        console.error('Failed to fetch map buildings:', error);
        setMapBuildings([]);
      } finally {
        setIsLoadingMap(false);
      }

      // Fetch Enova certificates if we have gnr/bnr
      let fetchedCertificates: EnovaCertificate[] = [];
      if (gnr && bnr) {
        setIsLoadingEnova(true);
        try {
          const response = await fetch(`/api/buildings/detect?gnr=${gnr}&bnr=${bnr}&address=${encodeURIComponent(address)}`);
          if (response.ok) {
            const data = await response.json();
            fetchedCertificates = data.buildings || [];
            setEnovaCertificates(fetchedCertificates);
          }
        } catch (error) {
          console.error('Failed to fetch Enova certificates:', error);
          setEnovaCertificates([]);
        } finally {
          setIsLoadingEnova(false);
        }
      } else {
        setIsLoadingEnova(false);
      }

      // Auto-select if only one building
      if (fetchedBuildings.length === 1) {
        const singleBuilding = fetchedBuildings[0];
        setSelectedBuildingId(singleBuilding.id);

        // If no Enova certificates exist, skip certificate selection entirely
        if (fetchedCertificates.length === 0) {
          // Wait a moment for UI to render, then auto-proceed
          setTimeout(() => {
            setShowForm(true);
          }, 1000);
        }
      }
    };

    fetchData();
  }, [address, lat, lon, gnr, bnr, router]);

  // Helper function to get building number for display
  const getBuildingNumber = (building: MapBuilding) => {
    const index = mapBuildings.findIndex(b => b.id === building.id);
    return index + 1;
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

      // Create query params with all data including property identifiers
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
        heatingSystem: formData.heatingSystem,
        lightingSystem: formData.lightingSystem,
        ventilationSystem: formData.ventilationSystem,
        hotWaterSystem: formData.hotWaterSystem,
        ...(formData.buildingYear && { buildingYear: formData.buildingYear.toString() }),
        ...(selectedCertificate && { bygningsnummer: selectedCertificate }),
        // Pass certificate data directly to avoid re-querying
        ...(selectedCertificate && (() => {
          const cert = enovaCertificates.find(c => c.bygningsnummer === selectedCertificate);
          return cert ? {
            energyClass: cert.energyClass,
            energyConsumption: cert.energyConsumption?.toString(),
            buildingCategory: cert.buildingCategory,
            constructionYear: cert.constructionYear?.toString()
          } : {};
        })()),
      });

      router.push(`/dashboard?${queryParams.toString()}`);
    } catch (error) {
      console.error('Failed to submit building data:', error);
    } finally {
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
      router.push('/');
    }
  };

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

      <div className="relative z-10 h-screen flex flex-col">
        {/* Minimal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/20 backdrop-blur-lg">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {showForm ? 'Tilbake til sertifikater' : showCertificates ? 'Tilbake til bygninger' : 'Tilbake til søk'}
          </Button>

          <div className="flex items-center gap-3 text-white">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <div className="text-sm">
              <span className="font-medium">{address}</span>
              <span className="text-slate-400 ml-2">{municipality}</span>
            </div>
          </div>

          {selectedBuildingId && !showCertificates && !showForm && (
            <Button
              onClick={() => {
                if (enovaCertificates.length > 0) {
                  setShowCertificates(true);
                } else {
                  proceedToForm();
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
                            isSelected={selectedBuildingId === building.id}
                            onSelect={() => handleMapBuildingSelect(building.id)}
                            showCertificates={showCertificates}
                            showForm={showForm}
                            enovaCertificates={enovaCertificates}
                            selectedBuildingId={selectedBuildingId}
                            currentZoom={currentZoom}
                            selectedCertificate={selectedCertificate}
                          />
                        ))}
                      </MapContainer>
                    )}
                  </div>
                </div>

                {/* Building/Certificate List - Right sidebar */}
                <div className="w-80 border-l border-white/10 bg-black/20 backdrop-blur-lg flex flex-col">
                  <div className="p-4 border-b border-white/10">
                    {showForm ? (
                      <>
                        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                          <FormInput className="w-5 h-5 text-cyan-400" />
                          Bygningsdata
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">
                          Fyll ut bygningsinformasjon for analyse
                        </p>
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
                          Energisertifikater ({enovaCertificates.length})
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">
                          Velg sertifikat eller fortsett uten
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
                      />
                    ) : !showCertificates ? (
                      // Building List - Sort selected building to top
                      [...mapBuildings]
                        .sort((a, b) => {
                          if (selectedBuildingId === a.id) return -1;
                          if (selectedBuildingId === b.id) return 1;
                          return 0;
                        })
                        .map((building) => {
                        const isSelected = selectedBuildingId === building.id;
                        const originalIndex = mapBuildings.findIndex(b => b.id === building.id);
                        const buildingNumber = originalIndex + 1;

                        return (
                          <Card
                            key={building.id}
                            className={`cursor-pointer transition-all duration-300 ${
                              isSelected
                                ? 'bg-fuchsia-500/20 border-fuchsia-400/50 scale-[1.02]'
                                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                            }`}
                            onClick={() => handleMapBuildingSelect(building.id)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                                  isSelected
                                    ? 'bg-fuchsia-500 border-fuchsia-400 text-white'
                                    : 'bg-slate-700 border-slate-600 text-white'
                                }`}>
                                  {buildingNumber}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-white font-medium text-sm truncate">
                                      {building.name || `Bygning ${buildingNumber}`}
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
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
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

                        {/* Available certificates */}
                        {enovaCertificates.map((cert) => {
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
  isSelected: boolean;
  onSelect: () => void;
  showCertificates: boolean;
  showForm: boolean;
  enovaCertificates: EnovaCertificate[];
  selectedBuildingId: string | null;
  currentZoom: number;
  selectedCertificate: string | null;
}

function BuildingMarker({ building, buildingNumber, isSelected, onSelect, showCertificates, showForm, enovaCertificates, selectedBuildingId, currentZoom, selectedCertificate }: BuildingMarkerProps) {
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

      // Determine what to display: number or energy grade
      let displayText = buildingNumber.toString();
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

      // Hide numbers when zoomed out 2+ levels from starting zoom (19)
      const shouldShowNumber = currentZoom >= 17; // 19 - 2 = 17

      console.log('Current zoom:', currentZoom, 'Should show number:', shouldShowNumber);

      const iconHtml = shouldShowNumber ? `
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
  }, [buildingNumber, isSelected, showCertificates, enovaCertificates, selectedBuildingId, building.id, currentZoom, selectedCertificate]);

  if (!building.coordinates || building.coordinates.length === 0 || !centroid || !numberIcon) {
    return null;
  }

  // Convert coordinates to Leaflet format [lat, lon]
  const polygonCoords = building.coordinates.map(([lat, lon]) => [lat, lon] as [number, number]);

  // Dashboard color palette - completely remove stroke
  const polygonStyle = {
    fillColor: isSelected ? '#e879f9' : '#22c55e', // Magenta for selected, Green for others
    weight: 0, // No stroke/border
    opacity: 0, // No stroke opacity
    stroke: false, // Disable stroke entirely
    fillOpacity: isSelected ? 0.8 : 0.6,
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
          mouseover: (e) => {
            const target = e.target;
            target.setStyle({
              fillOpacity: isSelected ? 0.9 : 0.7,
              stroke: false,
              weight: 0,
            });
          },
          mouseout: (e) => {
            const target = e.target;
            target.setStyle({
              fillOpacity: isSelected ? 0.8 : 0.6,
              stroke: false,
              weight: 0,
            });
          },
        }}
      >
        <Tooltip direction="top" offset={[0, -10]} className="custom-tooltip">
          <div className="p-2 min-w-48">
            <h3 className={`font-bold text-sm mb-2 ${isSelected ? 'text-fuchsia-400' : 'text-emerald-400'}`}>
              🏢 {isSelected ? 'Valgt bygning' : 'Klikk for å velge'}
            </h3>
            <div className="space-y-1 text-xs text-slate-300">
              <div><strong>Bygning:</strong> {buildingNumber}</div>
              {building.name && <div><strong>Navn:</strong> {building.name}</div>}
              {building.type && <div><strong>Type:</strong> {building.type}</div>}
              {building.area && <div><strong>Areal:</strong> ~{Math.round(building.area)} m²</div>}
              {building.levels && <div><strong>Etasjer:</strong> {building.levels}</div>}
              <div className="text-slate-400 mt-2 text-xs">Kilde: OpenStreetMap</div>
            </div>
          </div>
        </Tooltip>
      </Polygon>

      {/* Number Label at Centroid */}
      <Marker
        position={centroid}
        icon={numberIcon}
        eventHandlers={{
          click: onSelect,
        }}
      />
    </>
  );
}