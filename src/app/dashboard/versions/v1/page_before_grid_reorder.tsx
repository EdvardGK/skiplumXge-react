'use client';

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building,
  Zap,
  Target,
  TrendingUp,
  Award,
  DollarSign,
  FileText,
  Settings,
  MapPin,
  AlertTriangle,
  ArrowLeft,
  Download,
  Share,
  CheckCircle
} from "lucide-react";
import { calculateEnergyAnalysis, BuildingEnergyData } from "@/lib/energy-calculations";
import { BuildingType, HeatingSystem, LightingSystem, VentilationSystem, HotWaterSystem } from "@/types/norwegian-energy";

// Real energy calculation function
function calculateRealEnergyData(
  buildingType: string,
  totalArea: string,
  heatedArea: string,
  heatingSystem: string,
  lightingSystem: string,
  ventilationSystem: string,
  hotWaterSystem: string,
  buildingYear?: string
) {
  if (!buildingType || !totalArea || !heatedArea || !heatingSystem) {
    return null; // No data available
  }

  const energyData: BuildingEnergyData = {
    buildingType: buildingType as BuildingType,
    totalArea: parseInt(totalArea),
    heatedArea: parseInt(heatedArea),
    heatingSystem: heatingSystem as HeatingSystem,
    lightingSystem: (lightingSystem || 'LED') as LightingSystem,
    ventilationSystem: (ventilationSystem || 'Naturlig') as VentilationSystem,
    hotWaterSystem: (hotWaterSystem || 'Elektrisitet') as HotWaterSystem,
    buildingYear: buildingYear ? parseInt(buildingYear) : undefined,
  };

  return calculateEnergyAnalysis(energyData);
}

export default function Dashboard() {
  const searchParams = useSearchParams();
  const addressParam = searchParams.get('address');
  const buildingType = searchParams.get('buildingType');
  const totalArea = searchParams.get('totalArea');
  const heatedArea = searchParams.get('heatedArea');
  const heatingSystem = searchParams.get('heatingSystem');
  const lightingSystem = searchParams.get('lightingSystem');
  const ventilationSystem = searchParams.get('ventilationSystem');
  const hotWaterSystem = searchParams.get('hotWaterSystem');
  const buildingYear = searchParams.get('buildingYear');

  // Calculate real energy data if we have building information
  const realEnergyData = calculateRealEnergyData(
    buildingType || '',
    totalArea || '',
    heatedArea || '',
    heatingSystem || '',
    lightingSystem || '',
    ventilationSystem || '',
    hotWaterSystem || '',
    buildingYear || ''
  );

  const hasRealBuildingData = realEnergyData !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* DATA SOURCE BANNER */}
      {hasRealBuildingData ? (
        <div className="bg-emerald-500/20 border-b border-emerald-500/50 backdrop-blur-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">REAL BUILDING DATA</span>
              <span className="text-emerald-300 text-sm">
                Analysis based on your input: {buildingType}, {totalArea}m², {heatingSystem}
              </span>
            </div>
          </div>
        </div>
      ) : MOCK_DATA_WARNING && (
        <div className="bg-red-500/20 border-b border-red-500/50 backdrop-blur-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">DEVELOPMENT MODE - MOCK DATA</span>
              <span className="text-red-300 text-sm">
                All data shown below is fake. Real API integration required for production.
                {addressParam && ` Selected address: ${addressParam}`}
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="container mx-auto px-4 py-6 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tilbake til søk
            </Button>
            <div className="flex items-center space-x-2">
              <Zap className="w-8 h-8 text-cyan-400" />
              <span className="text-2xl font-bold text-white">SkiplumXGE</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-slate-900"
            >
              <Download className="w-4 h-4 mr-2" />
              Last ned rapport
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-900"
            >
              <Share className="w-4 h-4 mr-2" />
              Del analyse
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 text-slate-300 hover:bg-white/10"
            >
              <Settings className="w-4 h-4 mr-2" />
              Endre data
            </Button>
          </div>
        </div>
      </header>

      <main className="dashboard-container">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="text-sm text-slate-400 mb-2">
            Hjem → Bygningsdata → <span className="text-cyan-400">Dashboard</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-cyan-400">{addressParam || "Ingen adresse valgt"}</span>
              </h1>
              <div className="text-slate-300 text-sm">
                {hasRealBuildingData ? `${buildingType} • ${totalArea}m²` : "Ingen bygningsdata"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                TEK17 Status: {hasRealBuildingData ? (
                  <span className={realEnergyData.isCompliant ? "text-emerald-400" : "text-red-400"}>
                    {realEnergyData.isCompliant ? 'ETTERLEVELSE OK' : 'OVER GRENSE'}
                  </span>
                ) : (
                  <span className="text-slate-400">IKKE BEREGNET</span>
                )}
              </div>
              <div className="text-slate-300 text-sm">
                {hasRealBuildingData ? `${buildingType} krav: ${realEnergyData.tek17Requirement} kWh/m²/år` : "Trenger bygningsdata for beregning"}
              </div>
            </div>
          </div>
        </div>

        {/* BI-Style Dashboard Grid */}
        <div className="metrics-grid">
          {/* TEK17 Compliance - Top Left Priority */}
          <Card className="backdrop-blur-lg bg-white/5 border-white/20 hover:bg-white/10 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Building className="w-8 h-8 text-cyan-400" />
                {hasRealBuildingData ? (
                  <span className={`text-xs px-2 py-1 rounded-full ${!realEnergyData.isCompliant ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {realEnergyData.isCompliant ? 'ETTERLEVELSE OK' : 'OVER GRENSE'}
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-500/20 text-slate-400">INGEN DATA</span>
                )}
              </div>
              <div className="text-slate-300 text-sm mb-2">TEK17 Compliance</div>
              <div className="text-3xl font-bold text-white mb-2">
                {hasRealBuildingData ? `${realEnergyData.totalEnergyUse} kWh/m²` : "–"}
              </div>
              <div className="text-slate-400 text-xs">
                {hasRealBuildingData ?
                  `Krav: ${realEnergyData.tek17Requirement} kWh/m² (${realEnergyData.deviation > 0 ? '+' : ''}${realEnergyData.deviation}% avvik)`
                  : "Mangler bygningsdata for beregning"
                }
              </div>
            </CardContent>
          </Card>

          {/* Energy Usage */}
          <Card className="backdrop-blur-lg bg-white/5 border-white/20 hover:bg-white/10 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Zap className="w-8 h-8 text-emerald-400" />
                <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                  KARAKTER {hasRealBuildingData ? realEnergyData.energyGrade : "–"}
                </span>
              </div>
              <div className="text-slate-300 text-sm mb-2">Bygningsareal</div>
              <div className="text-3xl font-bold text-white mb-2">{hasRealBuildingData ? totalArea : "–"}m²</div>
              <div className="text-slate-400 text-xs">
                {hasRealBuildingData ?
                  `Total BRA • ${heatedArea}m² oppvarmet • ${heatingSystem}`
                  : "Mangler arealdata"
                }
              </div>
            </CardContent>
          </Card>

          {/* Annual Waste Cost */}
          <Card className="backdrop-blur-lg bg-white/5 border-white/20 hover:bg-white/10 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-8 h-8 text-orange-400" />
                <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400">
                  {hasRealBuildingData && realEnergyData.annualWaste > 0 ? "ÅRLIG SLØSING" : "TOTAL KOSTNAD"}
                </span>
              </div>
              <div className="text-slate-300 text-sm mb-2">
                {hasRealBuildingData && realEnergyData.annualWaste > 0 ? "Energisløsing" : "Energikostnad"}
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {hasRealBuildingData ?
                  (realEnergyData.annualWaste > 0 ?
                    `${realEnergyData.annualWasteCost.toLocaleString()} kr` :
                    `${realEnergyData.annualEnergyCost.toLocaleString()} kr`
                  ) : "–"
                }
              </div>
              <div className="text-slate-400 text-xs">
                {hasRealBuildingData ?
                  (realEnergyData.annualWaste > 0 ?
                    `${realEnergyData.annualWaste.toLocaleString()} kWh sløsing • 2.80 kr/kWh (SSB 2024)`
                    : `${realEnergyData.annualEnergyConsumption.toLocaleString()} kWh totalt • 2.80 kr/kWh (SSB 2024)`
                  ) : "Mangler energidata"
                }
              </div>
            </CardContent>
          </Card>

          {/* Investment Room */}
          <Card className="backdrop-blur-lg bg-white/5 border-white/20 hover:bg-white/10 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Target className="w-8 h-8 text-purple-400" />
                <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                  {hasRealBuildingData && realEnergyData.investmentRoom > 0 ? "INVESTERINGSROM" : "INGEN SLØSING"}
                </span>
              </div>
              <div className="text-slate-300 text-sm mb-2">Investeringspotensial</div>
              <div className="text-3xl font-bold text-white mb-2">
                {hasRealBuildingData ?
                  (realEnergyData.investmentRoom > 0 ?
                    `${realEnergyData.investmentRoom.toLocaleString()} kr` :
                    "Ingen besparinger"
                  ) : "–"
                }
              </div>
              <div className="text-slate-400 text-xs">
                {hasRealBuildingData ?
                  (realEnergyData.investmentRoom > 0 ?
                    "7 års NPV • 6% rente + buffer • Konservativ beregning"
                    : "Bygningen er energieffektiv eller over TEK17-krav"
                  ) : "Mangler data for investeringsberegning"
                }
              </div>
            </CardContent>
          </Card>

          {/* Enova Certificate Status */}
          <Card className="backdrop-blur-lg bg-white/5 border-white/20 hover:bg-white/10 transition-all duration-300">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Award className="w-8 h-8 text-green-400" />
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">ENOVA STATUS</span>
              </div>
              <div className="text-slate-300 text-sm">Energisertifikat</div>
              <div className="text-3xl font-bold text-white">Ikke registrert</div>
              <div className="text-slate-400 text-xs">
                SQLite database • Flytter til Supabase i prod • Kan søke sertifisering
              </div>
            </CardContent>
          </Card>

          {/* Interactive Property Map - 2x2 grid position */}
          <Card className="backdrop-blur-lg bg-white/5 border-white/20 hover:bg-white/10 transition-all duration-300 map-2x2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <MapPin className="w-8 h-8 text-blue-400" />
                <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">EIENDOMSKART</span>
              </div>
              <div className="text-slate-300 text-sm mb-4">Interaktiv eiendomsvisning</div>
              {addressParam ? (
                <div className="bg-slate-800/50 rounded-lg p-8 text-center border border-white/10">
                  <MapPin className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                  <div className="text-white font-medium mb-2">Kartkomponent kommer snart</div>
                  <div className="text-slate-400 text-sm mb-4">
                    Interaktivt kart med bygningsomriss og eiendomsgrenser for:<br/>
                    <span className="text-cyan-400 font-medium">{addressParam}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Integrert med Kartverkets tjenester • WMS/WFS • Målestokk 1:1000
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/30 rounded-lg p-8 text-center border border-white/5">
                  <MapPin className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <div className="text-slate-500">Ingen adresse valgt for kartvisning</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Grid */}
        <div className="action-grid">
          <Card className="backdrop-blur-lg bg-emerald-500/10 border-emerald-500/30 hover:scale-105 transition-all duration-300">
            <CardContent className="p-6 text-center">
              <FileText className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Detaljert rapport</h3>
              <p className="text-slate-300 text-sm mb-4">PDF med komplett analyse og TEK17-dokumentasjon</p>
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                <Download className="w-4 h-4 mr-2" />
                Last ned rapport
              </Button>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-lg bg-cyan-500/10 border-cyan-500/30 hover:scale-105 transition-all duration-300">
            <CardContent className="p-6 text-center">
              <Target className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Book konsultasjon</h3>
              <p className="text-slate-300 text-sm mb-4">Gratis veiledning fra sertifiserte energirådgivere</p>
              <Button variant="outline" className="w-full border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-900">
                <Award className="w-4 h-4 mr-2" />
                Book møte
              </Button>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-lg bg-purple-500/10 border-purple-500/30 hover:scale-105 transition-all duration-300">
            <CardContent className="p-6 text-center">
              <Share className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Del analyse</h3>
              <p className="text-slate-300 text-sm mb-4">Send resultater til leverandører eller kollegaer</p>
              <Button variant="outline" className="w-full border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-slate-900">
                <Share className="w-4 h-4 mr-2" />
                Del resultater
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}