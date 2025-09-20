'use client';

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Building, MapPin, Zap, CheckCircle, Home, Calendar } from "lucide-react";

interface BuildingInfo {
  bygningsnummer: string;
  energyClass?: string;
  buildingCategory?: string;
  heatedArea?: number;
  energyConsumption?: number;
  constructionYear?: number;
  isRegistered: boolean;
}

interface BuildingDetectionResult {
  hasMultipleBuildings: boolean;
  buildingCount: number;
  buildings: BuildingInfo[];
}

export default function SelectBuildingPage() {
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

  const [buildingData, setBuildingData] = useState<BuildingDetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);

  // Fetch building data using new Enova API
  useEffect(() => {
    const fetchBuildings = async () => {
      if (!address || !gnr || !bnr) {
        router.push('/');
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch(`/api/buildings/detect?gnr=${gnr}&bnr=${bnr}&address=${encodeURIComponent(address)}`);

        if (!response.ok) {
          throw new Error('Failed to fetch building data');
        }

        const data = await response.json();
        setBuildingData(data);

        // If only one building, auto-select it
        if (!data.hasMultipleBuildings && data.buildings.length === 1) {
          setSelectedBuilding(data.buildings[0].bygningsnummer);
        }
      } catch (error) {
        console.error('Failed to fetch building data:', error);
        // Fallback to building form
        const params = new URLSearchParams({
          address: address,
          lat: lat || '',
          lon: lon || '',
          municipality: municipality || '',
          municipalityNumber: municipalityNumber || '',
          postalCode: postalCode || '',
          gnr,
          bnr,
        });
        router.push(`/building-data?${params.toString()}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBuildings();
  }, [address, gnr, bnr, lat, lon, municipality, municipalityNumber, postalCode, router]);

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

  const handleBuildingSelect = (buildingNumber: string) => {
    setSelectedBuilding(buildingNumber);
  };

  const handleContinue = () => {
    if (!selectedBuilding) return;

    const params = new URLSearchParams({
      address: address || '',
      lat: lat || '',
      lon: lon || '',
      municipality: municipality || '',
      municipalityNumber: municipalityNumber || '',
      postalCode: postalCode || '',
      gnr: gnr || '',
      bnr: bnr || '',
      bygningsnummer: selectedBuilding,
    });

    router.push(`/building-data?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c0c0e] relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Building className="w-16 h-16 text-cyan-400 mx-auto mb-4 animate-pulse" />
            <h1 className="text-2xl font-bold text-white mb-2">Søker etter bygninger...</h1>
            <p className="text-slate-400">Sjekker Enova-registeret for denne eiendommen</p>
          </div>
        </div>
      </div>
    );
  }

  if (!buildingData || buildingData.buildings.length === 0) {
    // No buildings found - redirect handled in useEffect
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-violet-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbake til søk
          </Button>
        </div>

        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Velg bygning</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            {buildingData.hasMultipleBuildings
              ? `Vi fant ${buildingData.buildingCount} bygninger registrert på denne eiendommen. Velg riktig bygning.`
              : 'Bekreft bygningen du vil analysere.'
            }
          </p>
        </div>

        {/* Address Info */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10 mb-8 max-w-2xl mx-auto">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-white">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="font-medium">{address}</div>
                <div className="text-slate-400 text-sm">
                  {municipality} • {postalCode}
                </div>
                <div className="text-slate-500 text-xs mt-1">
                  Gnr: {gnr} • Bnr: {bnr}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color-Coded Building Selection */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-cyan-400" />
                Registrerte bygninger
              </CardTitle>
              <CardDescription className="text-slate-300">
                Klikk på bygningen du vil analysere. Informasjon hentet fra Enova-registeret.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {buildingData.buildings.map((building) => {
                const isSelected = selectedBuilding === building.bygningsnummer;
                const energyColor = getEnergyClassColor(building.energyClass);
                const badgeColor = getEnergyClassBadgeColor(building.energyClass);

                return (
                  <Card
                    key={building.bygningsnummer}
                    className={`cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? 'bg-cyan-400/20 border-cyan-400/50 scale-[1.02]'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                    onClick={() => handleBuildingSelect(building.bygningsnummer)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Building Number Badge */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                            isSelected ? 'bg-cyan-400 text-slate-900' : 'bg-slate-700 text-white'
                          }`}>
                            {building.bygningsnummer}
                          </div>

                          {/* Building Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-white font-semibold">
                                Bygning {building.bygningsnummer}
                              </h3>

                              {/* Energy Class Badge */}
                              {building.energyClass && (
                                <div className={`px-2 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
                                  Klasse {building.energyClass}
                                </div>
                              )}

                              {/* Registration Status */}
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                building.isRegistered
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              }`}>
                                {building.isRegistered ? '✓ Registrert' : 'Ikke registrert'}
                              </div>
                            </div>

                            {/* Building Details */}
                            <div className="flex items-center gap-4 text-sm text-slate-300">
                              {building.buildingCategory && (
                                <div className="flex items-center gap-1">
                                  <Home className="w-4 h-4" />
                                  {building.buildingCategory}
                                </div>
                              )}

                              {building.heatedArea && (
                                <div className="flex items-center gap-1">
                                  <Building className="w-4 h-4" />
                                  {building.heatedArea} m²
                                </div>
                              )}

                              {building.constructionYear && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {building.constructionYear}
                                </div>
                              )}

                              {building.energyConsumption && (
                                <div className="flex items-center gap-1">
                                  <Zap className="w-4 h-4" />
                                  {building.energyConsumption} kWh/år
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Selection Indicator */}
                        {isSelected && (
                          <CheckCircle className="w-6 h-6 text-cyan-400" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Continue Button */}
        {selectedBuilding && (
          <div className="max-w-4xl mx-auto mt-8 text-center">
            <Button
              size="lg"
              onClick={handleContinue}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-8 py-4 text-lg shadow-xl shadow-emerald-500/25"
            >
              <ArrowRight className="w-5 h-5 mr-2" />
              Fortsett med bygning {selectedBuilding}
            </Button>
          </div>
        )}

        {/* Help Text */}
        <div className="text-center mt-8 text-slate-400 text-sm max-w-2xl mx-auto">
          <p>
            Velg bygningen som samsvarer med eiendommen du vil analysere.
            Data hentet fra Enova energisertifikatregister og Kartverket.
          </p>
        </div>
      </div>
    </div>
  );
}