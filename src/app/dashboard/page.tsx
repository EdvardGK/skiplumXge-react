'use client';

import { useSearchParams } from "next/navigation";
import { useMemo, Suspense, useState } from "react";
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
import { usePdfReport, extractBuildingDataFromParams, buildAnalysisData } from "@/hooks/use-pdf-report";
import { getZoneMessaging, getUrgencyColor, getInvestmentMessage, getHeatPumpRecommendation } from "@/lib/zone-messaging";
import DataEditingOverlay from "@/components/DataEditingOverlay";

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
    ['action-analysis', 'action-share', 'action-consultation', 'action-report']
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

function DashboardContent() {
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

  // Prevent infinite redirects - if no address, show error instead of redirecting
  if (!addressParam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-slate-400">
          <h1 className="text-2xl font-bold text-white mb-2">Mangler adresseinformasjon</h1>
          <p className="mb-4">Gå tilbake til søket for å starte energianalysen.</p>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbake til søk
          </Button>
        </div>
      </div>
    );
  }

  // Additional parameters for real data integration
  const priceZoneParam = searchParams.get('priceZone') as PriceZone | null;
  const gnr = searchParams.get('gnr');
  const bnr = searchParams.get('bnr');
  const bygningsnummer = searchParams.get('bygningsnummer');
  const selectedBygningsnummer = searchParams.get('selectedBygningsnummer');
  const selectedBuildingOsmId = searchParams.get('selectedBuildingOsmId');

  const municipalityNumber = searchParams.get('municipalityNumber');
  const postalCode = searchParams.get('postalCode');
  const fnr = searchParams.get('fnr');
  const snr = searchParams.get('snr');

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
  // PDF Report generation hook
  const { isGenerating, progress, error, generateReport } = usePdfReport();

  // Data editing overlay state
  const [isEditingOverlayOpen, setIsEditingOverlayOpen] = useState(false);

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
    addressParam || undefined,
    priceZoneParam,
    gnr || undefined,
    bnr || undefined,
    realEnergyData,
    municipalityNumber || undefined,
    bygningsnummer || undefined,
    directCertificateData
  );

  // Zone-specific messaging based on real price data
  const zoneMessaging = getZoneMessaging(dashboardData.priceZone);
  const urgencyColors = getUrgencyColor(zoneMessaging.urgencyLevel);
  const heatPumpRec = getHeatPumpRecommendation(dashboardData.priceZone);

  // Calculate zone-specific investment message
  const annualSavings = hasRealBuildingData ? realEnergyData.annualWasteCost : 0;
  const investmentMessage = annualSavings > 0
    ? getInvestmentMessage(dashboardData.priceZone, annualSavings)
    : zoneMessaging.investmentFocus;

  // PDF Report generation handler
  const handleGenerateReport = async () => {
    if (!addressParam) return;

    try {
      const buildingData = extractBuildingDataFromParams(searchParams);

      // Add energy grade from dashboard data if available
      if (dashboardData.energyGrade) {
        buildingData.energyGrade = dashboardData.energyGrade;
      }
      if (dashboardData.energyConsumption) {
        buildingData.energyConsumption = dashboardData.energyConsumption;
      }

      const analysisData = hasRealBuildingData && realEnergyData
        ? buildAnalysisData(
            realEnergyData.annualWaste,
            realEnergyData.annualWasteCost,
            realEnergyData.investmentRoom,
            realEnergyData.breakdown
          )
        : undefined;

      await generateReport({
        address: addressParam,
        buildingData,
        municipalityNumber: municipalityNumber || undefined,
        analysisData
      });
    } catch (error) {
      console.error('Failed to generate PDF report:', error);
    }
  };

  // Handle data editing save
  const handleDataEditingSave = (data: any) => {
    console.log('Saving energy assessment data:', data);
    // Here you would typically send the data to your backend
    // and potentially refresh the dashboard with updated calculations
  };

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
        <div className="dashboard-header pt-1 pb-1">
          <div className="text-xs text-slate-400">
            Hjem → Velg bygg → <span className="text-cyan-400">Dashboard</span>
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
                  TEK17 § 14-2
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

                    // Simple comparison text
                    const comparisonText = percentageDeviation > 0
                      ? "Dårligere enn krav til nybygg"
                      : "Bedre enn krav til nybygg";

                    return (
                      <div>
                        <div>
                          <span className="text-2xl font-bold text-cyan-400">
                            {Math.round(realEnergyData.totalEnergyUse)}
                          </span>
                          <span className="text-sm font-normal text-cyan-400"> kWh/m²/år</span>
                          <span className="text-2xl font-bold text-slate-400 mx-1">|</span>
                          <span className={`text-2xl font-bold ${colorClass}`}>
                            {percentageDeviation > 0 ? '+' : ''}{percentageDeviation}%
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 mt-1">
                          {comparisonText}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <span className="text-4xl font-bold text-slate-400">–</span>
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
                  <EnergyGaugeChart
                    currentGrade={'' as any}
                    currentValue={0}
                    maxValue={300}
                    tek17Limit={115}
                    size={160}
                    showLabels={false}
                    className="opacity-60"
                  />
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

          {/* 3. Recommended First Step */}
          <DashboardTile id="energy-zone">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Target className="w-5 h-5 text-emerald-400" />
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                  Anbefalt første steg
                </span>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400 mb-2">
                  {hasRealBuildingData && realEnergyData.annualWaste === 0 ? 'Optimalisering' : 'Varmepumpe'}
                </div>
                <div className="text-xs text-slate-300">
                  {hasRealBuildingData && realEnergyData.annualWaste === 0
                    ? ''
                    : heatPumpRec.reasoning
                  }
                </div>
              </div>
            </CardContent>
          </DashboardTile>

          {/* 4. ROI Budget */}
          <DashboardTile id="roi-budget" variant="default">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Target className="w-5 h-5 text-fuchsia-400" />
                <span className="text-xs px-2 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-400">Budsjett</span>
              </div>
              <div className="text-center">
                <div>
                  <span className={hasRealBuildingData && realEnergyData.annualWaste === 0 ?
                    "text-lg font-bold text-fuchsia-400" :
                    "text-2xl font-bold text-fuchsia-400"}>
                    {hasRealBuildingData && realEnergyData.investmentRoom > 0 ?
                      `${realEnergyData.investmentRoom.toLocaleString()} kr` :
                      hasRealBuildingData && realEnergyData.annualWaste === 0 ?
                      "Ingen øyeblikkelige investeringsbehov" : "–"
                    }
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  {hasRealBuildingData && realEnergyData.annualWaste === 0
                    ? ''
                    : dashboardData.priceZone === 'NO4' && annualSavings < 30000
                    ? 'Miljø og komfort viktigere enn økonomi i NO4'
                    : dashboardData.priceZone === 'NO2' && annualSavings > 50000
                    ? 'Høye strømpriser gir rask tilbakebetaling'
                    : 'Estimert budsjett for tilbakebetaling over 10 år'
                  }
                </div>
              </div>
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
                  (() => {
                    const chartData = dashboardData.priceHistory.map(p => ({
                      month: `${p.weekNumber}/${p.year}`,
                      consumption: Math.round(p.spotPrice),
                      cost: Math.round(p.spotPrice),
                      temperature: 10,
                      tek17Limit: 115
                    }));
                    console.log('📊 Chart data being passed:', chartData.length, 'points');
                    console.log('Sample chart data:', chartData.slice(0, 3));
                    return (
                      <EnergyTimeSeriesChart
                        data={chartData}
                        type="bar"
                        chartMode="price"
                        showSavings={false}
                        height={140}
                        showTitle={false}
                        energyZone={dashboardData.priceZone || "NO1"}
                      />
                    );
                  })()
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
              <div className="flex gap-4 flex-1 min-h-0 max-h-full">
                {/* Energy Breakdown Chart */}
                <div className="flex-1 flex items-center justify-center overflow-hidden">
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
                      isEfficientBuilding={hasRealBuildingData && realEnergyData.annualWaste === 0}
                    />
                  </div>
                </div>

                {/* Investment & Data Summary */}
                <div className="w-48 space-y-1.5 flex flex-col h-full">
                  {/* Energy Analysis Insights - Expanded */}
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <div className="text-sm text-fuchsia-400 mb-2 font-semibold">Energifordeling</div>
                    <div className="space-y-1 text-sm mb-3">
                      <div className="flex justify-between">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-fuchsia-400"></span>
                          <span className="text-slate-300">Oppvarming</span>
                        </span>
                        <span className="text-fuchsia-400 font-bold">
                          {hasRealBuildingData && realEnergyData.annualWaste === 0 ?
                            `${realEnergyData.breakdown.heating}%` :
                            hasRealBuildingData ?
                            `${Math.round(realEnergyData.investmentRoom * (realEnergyData.breakdown.heating / 100)).toLocaleString()} kr` :
                            '315.000 kr'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                          <span className="text-slate-300">Belysning</span>
                        </span>
                        <span className="text-amber-400 font-bold">
                          {hasRealBuildingData && realEnergyData.annualWaste === 0 ?
                            `${realEnergyData.breakdown.lighting}%` :
                            hasRealBuildingData ?
                            `${Math.round(realEnergyData.investmentRoom * (realEnergyData.breakdown.lighting / 100)).toLocaleString()} kr` :
                            '67.500 kr'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-teal-500"></span>
                          <span className="text-slate-300">Ventilasjon</span>
                        </span>
                        <span className="text-teal-500 font-bold">
                          {hasRealBuildingData && realEnergyData.annualWaste === 0 ?
                            `${realEnergyData.breakdown.ventilation}%` :
                            hasRealBuildingData ?
                            `${Math.round(realEnergyData.investmentRoom * (realEnergyData.breakdown.ventilation / 100)).toLocaleString()} kr` :
                            '45.000 kr'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-green-500"></span>
                          <span className="text-slate-300">Varmtvann</span>
                        </span>
                        <span className="text-green-500 font-bold">
                          {hasRealBuildingData && realEnergyData.annualWaste === 0 ?
                            `${realEnergyData.breakdown.hotWater}%` :
                            hasRealBuildingData ?
                            `${Math.round(realEnergyData.investmentRoom * (realEnergyData.breakdown.hotWater / 100)).toLocaleString()} kr` :
                            '22.500 kr'
                          }
                        </span>
                      </div>
                    </div>

                    {/* Zone-specific Lead Domino Action */}
                    <div className={`p-2 rounded border-l-4 ${urgencyColors.background} ${urgencyColors.border}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-fuchsia-400"></span>
                        <span className="text-xs font-semibold text-white">Anbefalt første steg</span>
                      </div>
                      <div className="text-xs text-slate-300">
                        {heatPumpRec.recommendation}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {heatPumpRec.reasoning}
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
                  selectedBuildingId={selectedBuildingOsmId || selectedBygningsnummer}
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
          <DashboardTile id="action-analysis">
            <CardContent className="p-4 text-center h-full flex flex-col justify-center">
              <TrendingUp className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-3">Energianalyse</h3>
              <Button variant="outline" size="sm" className="w-full" disabled>
                Kommer snart
              </Button>
            </CardContent>
          </DashboardTile>

          <DashboardTile id="action-report">
            <CardContent className="p-4 text-center h-full flex flex-col justify-center">
              <FileText className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-3">Detaljert rapport</h3>
              <Button
                size="sm"
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleGenerateReport}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent mr-1" />
                    Genererer...
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3 mr-1" />
                    Last ned
                  </>
                )}
              </Button>
              {error && (
                <p className="text-red-400 text-xs mt-2">{error}</p>
              )}
            </CardContent>
          </DashboardTile>

          <DashboardTile id="action-consultation" variant="default">
            <CardContent className="p-4 text-center h-full flex flex-col justify-center">
              <Settings className="w-12 h-12 text-purple-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-3">Avansert analyse</h3>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsEditingOverlayOpen(true)}
              >
                {hasRealBuildingData ? "Rediger data" : "Legg til data"}
              </Button>
            </CardContent>
          </DashboardTile>

          <DashboardTile id="action-share" variant="default">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400">
                  Sløsing
                </span>
              </div>
              <div className="text-center">
                <div>
                  <span className="text-2xl font-bold text-orange-400">
                    {hasRealBuildingData && realEnergyData.annualWaste > 0 ?
                      `${realEnergyData.annualWaste.toLocaleString()} kWh` :
                      hasRealBuildingData && realEnergyData.annualWaste === 0 ?
                      "God effektivitet" : "–"
                    }
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  {hasRealBuildingData && realEnergyData.annualWaste === 0
                    ? ''
                    : hasRealBuildingData && realEnergyData.annualWasteCost > 0
                    ? `${realEnergyData.annualWasteCost.toLocaleString()} kr/år`
                    : "Legg inn bygningsdata"
                  }
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2" disabled>
                Artikkel <span className="text-xs">(kommer snart)</span>
              </Button>
            </CardContent>
          </DashboardTile>

        </DashboardGrid>

      </main>

      {/* Data Editing Overlay */}
      <DataEditingOverlay
        isOpen={isEditingOverlayOpen}
        onClose={() => setIsEditingOverlayOpen(false)}
        onSave={handleDataEditingSave}
        buildingData={{
          buildingType: buildingType || '',
          totalArea: totalArea ? parseInt(totalArea) : undefined,
          heatedArea: heatedArea ? parseInt(heatedArea) : undefined,
          buildingYear: buildingYear ? parseInt(buildingYear) : undefined,
          numberOfFloors: undefined, // Not available in URL params yet
          annualEnergyConsumption: annualEnergyConsumption ? parseInt(annualEnergyConsumption) : undefined,
          heatingSystem: heatingSystem || '',
          lightingSystem: lightingSystem || '',
          ventilationSystem: ventilationSystem || '',
          hotWaterSystem: hotWaterSystem || '',
          address: addressParam || '',
          gnr: gnr || '',
          bnr: bnr || '',
          fnr: fnr || '',
          snr: snr || '',
          municipalityNumber: municipalityNumber || '',
          bygningsnummer: bygningsnummer || '',
          postalCode: postalCode || '',
          energyClass: energyClass || 'Ikke sertifisert',
        }}
        initialData={{
          bygningstype: buildingType || '',
          bruksareal: totalArea || '',
          oppforingsaar: buildingYear || '',
          oppvarmingsType: heatingSystem || '',
          belysningType: lightingSystem || '',
          ventilasjonsType: ventilationSystem || '',
          varmtvannsType: hotWaterSystem || '',
          energimerking: energyClass || 'Ikke sertifisert',
          totalEnergibruk: energyConsumptionParam || '',
        }}
      />

      {/* Dashboard ready indicator for screenshot capture */}
      <div data-dashboard-ready="true" className="hidden" />
    </div>
  );
}

// Loading component for Suspense boundary
function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-16 h-16 text-cyan-400 mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold text-white mb-2">Laster energianalyse...</h1>
          <p className="text-slate-400">Beregner energidata for eiendommen</p>
        </div>
      </div>
    </div>
  );
}

// Main exported component with Suspense boundary
export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}