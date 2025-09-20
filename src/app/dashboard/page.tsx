'use client';

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
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
import { useDashboardEnergyData } from "@/hooks/use-real-energy-data";
import type { PriceZone } from "@/services/zone.service";
import EnergyTimeSeriesChart from "@/components/charts/EnergyTimeSeriesChart";
import EnergyGaugeChart from "@/components/charts/EnergyGaugeChart";
import EnergyBreakdownChart from "@/components/charts/EnergyBreakdownChart";
import NorwayPriceZoneMap from "@/components/charts/NorwayPriceZoneMap";
import NPVInvestmentChart from "@/components/charts/NPVInvestmentChart";
import DashboardGrid, { DashboardLayoutDefinition } from "@/components/grid/DashboardGrid";
import DashboardTile from "@/components/grid/DashboardTile";

// Toggle between mock and real data maps
const USE_REAL_MAP_DATA = true; // Set to false to use mock data

import PropertyMapWrapper from "@/components/PropertyMapWrapper";
import dynamic from 'next/dynamic';

// Import map component dynamically to prevent SSR issues with Leaflet
const PropertyMapWithRealData = dynamic(
  () => import("@/components/PropertyMapWithRealData"),
  { ssr: false }
);

// Expanded 5x4 Grid Layout (includes action cards in row 5)
const DASHBOARD_LAYOUT: DashboardLayoutDefinition = {
  rows: 5,
  cols: 4,
  layout: [
    // Row 1: Top row individual cards
    ['tek17-gauge', 'enova-grade', 'energy-zone', 'roi-budget'],
    // Row 2: Time series chart (2 cols), Map starts (2 cols)
    ['time-series', 'time-series', 'map', 'map'],
    // Row 3-4: Large Investment Sankey (2 cols), Map continues (2 cols)
    ['investment-sankey', 'investment-sankey', 'map', 'map'],
    ['investment-sankey', 'investment-sankey', 'map', 'map'],
    // Row 5: Action cards
    ['action-report', 'action-consultation', 'action-share', 'action-placeholder']
  ]
};

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
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const buildingType = searchParams.get('buildingType');
  const totalArea = searchParams.get('totalArea');
  const heatedArea = searchParams.get('heatedArea');
  const annualEnergyConsumption = searchParams.get('annualEnergyConsumption');
  const heatingSystem = searchParams.get('heatingSystem');
  const lightingSystem = searchParams.get('lightingSystem');
  const ventilationSystem = searchParams.get('ventilationSystem');
  const hotWaterSystem = searchParams.get('hotWaterSystem');
  const buildingYear = searchParams.get('buildingYear');

  // Additional parameters for real data integration
  const priceZoneParam = searchParams.get('priceZone') as PriceZone | null;
  const gnr = searchParams.get('gnr');
  const bnr = searchParams.get('bnr');
  const bygningsnummer = searchParams.get('bygningsnummer');
  const municipalityNumber = searchParams.get('municipalityNumber');

  // Certificate data passed directly from building selector
  const energyClass = searchParams.get('energyClass');
  const energyConsumptionParam = searchParams.get('energyConsumption');
  const buildingCategory = searchParams.get('buildingCategory');
  const constructionYear = searchParams.get('constructionYear');


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

  // Prepare direct certificate data if available (memoized to prevent infinite re-renders)
  const directCertificateData = useMemo(() => {
    if (!energyClass && !energyConsumptionParam) return null;

    return {
      energyClass,
      energyConsumption: energyConsumptionParam ? parseInt(energyConsumptionParam) : null,
      buildingCategory,
      constructionYear: constructionYear ? parseInt(constructionYear) : null
    };
  }, [energyClass, energyConsumptionParam, buildingCategory, constructionYear]);

  // Fetch real Enova and pricing data
  const dashboardData = useDashboardEnergyData(
    addressParam,
    priceZoneParam,
    gnr,
    bnr,
    realEnergyData,
    municipalityNumber,
    bygningsnummer,
    directCertificateData
  );



  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Header */}
      <header className="container mx-auto px-4 py-2 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white px-2 py-1"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Tilbake
            </Button>
            <div className="flex items-center space-x-2">
              <Zap className="w-6 h-6 text-cyan-400" />
              <span className="text-xl font-bold text-white">SkiplumXGE</span>
            </div>
            {addressParam && (
              <div className="ml-6 flex items-center space-x-2">
                <span className="text-slate-400">•</span>
                <span className="text-cyan-400 font-medium">{addressParam}</span>
                {hasRealBuildingData && (
                  <span className="text-slate-400 text-sm">({buildingType} • {totalArea}m²)</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-2 py-1 text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Rapport
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-secondary text-secondary-foreground hover:bg-secondary px-2 py-1 text-xs"
            >
              <Share className="w-3 h-3 mr-1" />
              Del
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:bg-muted px-2 py-1 text-xs"
            >
              <Settings className="w-3 h-3 mr-1" />
              Endre
            </Button>
          </div>
        </div>
      </header>

      <main className="dashboard-container px-2 md:px-4 lg:px-6">
        {/* Dashboard Header */}
        <div className="dashboard-header pt-4 pb-2">
          <div className="text-xs text-slate-400 mb-3">
            Hjem → Bygningsdata → <span className="text-cyan-400">Dashboard</span>
          </div>
          <div className="flex items-center justify-end">
            {/* Header actions removed - TEK17 info now only in main tile */}
          </div>
        </div>

        {/* Clean 4x4 Grid Dashboard */}
        <DashboardGrid
          layout={DASHBOARD_LAYOUT}
          debug={false}
          className="mb-6"
        >
          {/* ROW 1: Individual cards across 4 columns */}
          {/* 1. TEK17 Status */}
          <DashboardTile id="tek17-gauge" variant="default">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Target className="w-5 h-5 text-cyan-400" />
                <span className={`text-xs px-2 py-1 rounded-full ${
                  hasRealBuildingData
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-slate-500/20 text-slate-400'
                }`}>
                  TEK17
                </span>
              </div>
              <div className="text-center">
                {hasRealBuildingData ? (
                  (() => {
                    const percentageDeviation = Math.round(((realEnergyData.totalEnergyUse - realEnergyData.tek17Requirement) / realEnergyData.tek17Requirement) * 100);

                    // Use energy grade color scale for percentage deviation
                    let colorClass = "text-emerald-400"; // A grade (excellent)
                    if (percentageDeviation > 30) colorClass = "text-red-600";       // G grade (extreme)
                    else if (percentageDeviation > 15) colorClass = "text-red-500";  // F grade (very poor)
                    else if (percentageDeviation > 0) colorClass = "text-orange-500"; // E grade (poor)
                    else if (percentageDeviation > -15) colorClass = "text-orange-400"; // D grade (below average)
                    else if (percentageDeviation > -25) colorClass = "text-yellow-400"; // C grade (average)
                    else if (percentageDeviation > -35) colorClass = "text-lime-500";   // B grade (good)
                    // else stays emerald-400 for A grade

                    // Determine if this is an existing building vs new construction
                    const buildingAge = buildingYear ? (new Date().getFullYear() - parseInt(buildingYear)) : null;
                    const isExistingBuilding = buildingAge && buildingAge > 5; // Built more than 5 years ago

                    // Different messaging for existing vs new buildings
                    let comparisonText;
                    if (isExistingBuilding) {
                      comparisonText = percentageDeviation > 0 ? 'høyere enn krav til nybygg' : 'lavere enn krav til nybygg';
                    } else {
                      comparisonText = percentageDeviation > 0 ? 'over kravet' : 'under kravet';
                    }

                    return (
                      <div>
                        <div className={`text-3xl font-bold ${colorClass}`}>
                          {Math.abs(percentageDeviation)}%
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {comparisonText}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <span className="text-3xl font-bold text-slate-400">–</span>
                )}
              </div>
            </CardContent>
          </DashboardTile>

          {/* 2. Enova Grade with Gauge */}
          <DashboardTile id="enova-grade">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Award className="w-5 h-5 text-emerald-400" />
                <span className={`text-xs px-2 py-1 rounded-full ${
                  dashboardData.isEnovaRegistered
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-500/20 text-slate-400'
                }`}>
                  {dashboardData.isLoadingEnova ? 'LASTER...' : 'ENOVA'}
                </span>
              </div>
              <div className="flex items-center justify-center" style={{ marginTop: '-30px', height: '80px' }}>
                {dashboardData.isLoadingEnova ? (
                  <div className="text-sm text-slate-400">Laster...</div>
                ) : dashboardData.isEnovaRegistered && dashboardData.energyGrade ? (
                  <EnergyGaugeChart
                    currentGrade={dashboardData.energyGrade}
                    currentValue={dashboardData.energyConsumption || 150}
                    maxValue={300}
                    tek17Limit={realEnergyData?.tek17Requirement || 115}
                    size={160}
                    showLabels={false}
                  />
                ) : (
                  <div className="text-xl font-bold text-slate-400">–</div>
                )}
              </div>
              <div className="text-slate-400 text-xs text-center">
                {dashboardData.isLoadingEnova ? (
                  "Sjekker Enova..."
                ) : dashboardData.energyConsumption ? (
                  `${Math.round(dashboardData.energyConsumption)} kWh/m²/år`
                ) : dashboardData.enovaStatus === 'Ikke registrert' ? (
                  "Ikke registrert i Enova"
                ) : (
                  "Ingen data"
                )}
              </div>
            </CardContent>
          </DashboardTile>

          {/* 3. Energy Zone & Price */}
          <DashboardTile id="energy-zone">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <span className={`text-xs px-2 py-1 rounded-full ${
                  dashboardData.priceZone
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-slate-500/20 text-slate-400'
                }`}>
                  {dashboardData.isLoadingPricing ? 'LASTER...' : dashboardData.priceZone || 'NO1'}
                </span>
              </div>
              <div className="text-xl font-bold text-white">
                {dashboardData.average36MonthPrice ? (
                  `${Math.round(dashboardData.average36MonthPrice)} øre`
                ) : (
                  <span className="text-slate-400">–</span>
                )}
              </div>
              <div className="text-slate-400 text-xs">
                {dashboardData.priceZone ? (
                  `36 måneders snitt • SSB ${dashboardData.priceZone || 'NO1'}`
                ) : (
                  'Ukjent sone'
                )}
              </div>
            </CardContent>
          </DashboardTile>

          {/* 4. ROI Budget */}
          <DashboardTile id="roi-budget" variant="default">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Target className="w-5 h-5 text-fuchsia-400" />
                <span className="text-xs px-2 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-400">ROI</span>
              </div>
              <div className="text-xl font-bold text-white">
                {hasRealBuildingData && realEnergyData.investmentRoom > 0 ?
                  `${Math.round(realEnergyData.investmentRoom * 1.4).toLocaleString()} kr` : "–"
                }
              </div>
              <div className="text-slate-400 text-xs">Estimert budsjett for ROI over 10 år</div>
            </CardContent>
          </DashboardTile>

          {/* ROW 2: Time Series Chart (2 cols) + Map starts (2 cols) */}
          <DashboardTile id="time-series">
            <CardContent className="p-0">
              <div className="w-full ">
                {dashboardData.isLoadingHistory ? (
                  <div className="flex items-center justify-center h-20">
                    <div className="text-sm text-slate-400">Laster prisdata...</div>
                  </div>
                ) : dashboardData.priceHistory.length > 0 ? (
                  <EnergyTimeSeriesChart
                    data={dashboardData.priceHistory.map(p => ({
                      month: `${p.weekNumber}/${p.year}`,
                      consumption: Math.round(p.spotPrice),
                      cost: Math.round(p.spotPrice),
                      temperature: 10,
                      tek17Limit: 115
                    }))}
                    type="bar"
                    chartMode="price"
                    showSavings={false}
                    height={140}
                    showTitle={false}
                    energyZone={dashboardData.priceZone || "NO1"}
                  />
                ) : (
                  <div className="flex items-center justify-center h-20">
                    <div className="text-sm text-red-400">Prishistorikk ikke tilgjengelig</div>
                  </div>
                )}
              </div>
            </CardContent>
          </DashboardTile>

          {/* ROW 3-4: Large Investment & Energy Flow Sankey (2x2 tile) */}
          <DashboardTile id="investment-sankey" variant="default">
            <CardContent className="p-3 flex flex-col h-full">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0 max-h-full">
                {/* Energy Breakdown Chart */}
                <div className="lg:col-span-2 flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full max-w-full max-h-full">
                    <EnergyBreakdownChart
                      breakdown={hasRealBuildingData ? realEnergyData.breakdown : {
                        heating: 70,  // SINTEF verified data
                        lighting: 15, // SINTEF verified data
                        ventilation: 10, // SINTEF verified data
                        hotWater: 5  // SINTEF verified data
                      }}
                      totalEnergyUse={hasRealBuildingData ? realEnergyData.totalEnergyUse : 165}
                      heatingSystem={heatingSystem || 'Elektrisitet'}
                      investmentRoom={hasRealBuildingData ? realEnergyData.investmentRoom : 450000}
                    />
                  </div>
                </div>

                {/* Investment & Data Summary */}
                <div className="space-y-1.5 flex flex-col h-full overflow-y-auto overflow-x-hidden max-h-full">
                  {/* Annual Savings */}
                  <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="text-xs text-cyan-400 mb-1">Årlig besparelse</div>
                    <div className="text-sm font-bold text-white">
                      {hasRealBuildingData && realEnergyData.annualWaste > 0 ?
                        `${realEnergyData.annualWasteCost.toLocaleString()} kr` : "–"
                      }
                    </div>
                    <div className="text-xs text-slate-400">Ved optimalisering</div>
                  </div>

                  {/* SINTEF Breakdown */}
                  <div className="p-1.5 rounded-lg bg-secondary/10 border border-secondary/20">
                    <div className="text-xs text-blue-400 mb-1">SINTEF Fordeling</div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">Oppvarming</span>
                        <span className="text-white font-semibold">70%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">Belysning</span>
                        <span className="text-white font-semibold">15%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">Øvrig</span>
                        <span className="text-white font-semibold">15%</span>
                      </div>
                    </div>
                  </div>

                  {/* Energy Analysis Insights */}
                  <div className="p-1.5 rounded-lg bg-accent/10 border border-accent/20">
                    <div className="text-xs text-fuchsia-400 mb-1">Analyse</div>
                    <div className="space-y-0.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-300">Høyest forbruk:</span>
                        <span className="text-white font-semibold">Oppvarming</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">Beste potensial:</span>
                        <span className="text-yellow-400 font-semibold">
                          {heatingSystem === 'Elektrisitet' ? 'Varmepumpe' : 'LED-oppgradering'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">System:</span>
                        <span className="text-cyan-400 font-semibold">{heatingSystem}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </DashboardTile>

          {/* Property Map (2x2 in rows 2-3, columns 3-4) */}
          <DashboardTile id="map" className="h-full">
            <CardContent className="p-1 h-full">
              {USE_REAL_MAP_DATA ? (
                <PropertyMapWithRealData
                  address={addressParam}
                  coordinates={lat && lon ? { lat: parseFloat(lat), lon: parseFloat(lon) } : null}
                  className="w-full h-full rounded-md overflow-hidden"
                />
              ) : (
                <PropertyMapWrapper
                  address={addressParam}
                  coordinates={lat && lon ? { lat: parseFloat(lat), lon: parseFloat(lon) } : null}
                  className="w-full h-full rounded-md overflow-hidden"
                />
              )}
            </CardContent>
          </DashboardTile>

          {/* ROW 5: Action Cards */}
          <DashboardTile id="action-report">
            <CardContent className="p-4 text-center h-full flex flex-col justify-center">
              <FileText className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-1">Detaljert rapport</h3>
              <p className="text-slate-400 text-xs mb-3">PDF med komplett analyse</p>
              <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
                <Download className="w-3 h-3 mr-1" />
                Last ned
              </Button>
            </CardContent>
          </DashboardTile>

          <DashboardTile id="action-consultation">
            <CardContent className="p-4 text-center h-full flex flex-col justify-center">
              <Target className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-1">Book konsultasjon</h3>
              <p className="text-slate-400 text-xs mb-3">Book konsultasjon</p>
              <Button variant="outline" size="sm" className="w-full">
                <Award className="w-3 h-3 mr-1" />
                Book møte
              </Button>
            </CardContent>
          </DashboardTile>

          <DashboardTile id="action-share">
            <CardContent className="p-4 text-center h-full flex flex-col justify-center">
              <Share className="w-8 h-8 text-fuchsia-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-1">Del analyse</h3>
              <p className="text-slate-400 text-xs mb-3">Send til leverandører</p>
              <Button variant="outline" size="sm" className="w-full">
                <Share className="w-3 h-3 mr-1" />
                Del resultater
              </Button>
            </CardContent>
          </DashboardTile>

          <DashboardTile id="action-placeholder">
            <CardContent className="p-4 text-center h-full flex flex-col justify-center">
              <Settings className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-1">Endre data</h3>
              <p className="text-slate-400 text-xs mb-3">Oppdater bygningsinfo</p>
              <Button variant="outline" size="sm" className="w-full">
                <Settings className="w-3 h-3 mr-1" />
                Rediger
              </Button>
            </CardContent>
          </DashboardTile>
        </DashboardGrid>

      </main>
    </div>
  );
}