'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RankedMultiSelect, RankedSelection, RankedOption } from '@/components/ui/ranked-multi-select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  X,
  Download,
  Save,
  Building,
  Thermometer,
  Zap,
  Wind,
  Sun,
  Wrench,
  HelpCircle,
  Snowflake,
  Wifi,
  Cpu,
  Home,
  DoorOpen
} from 'lucide-react';
import { calculateBuildingVolume, getBuildingStandards } from '@/lib/norwegian-building-standards';
import { BuildingType } from '@/types/norwegian-energy';
import { generateEnergyAssessmentExcel } from '@/utils/excel-export';

// Form data structure based on the Excel template
interface EnergyAssessmentData {
  // Generelt (General Information)
  gnr: string;
  bnr: string;
  fnr: string;
  snr: string;
  kommunenummer: string;
  bygningstype: string;
  bygningssoner: string;
  bygningsvolum: string;
  bruksareal: string;
  oppvarmetAreal: string; // Added to match BuildingDataForm
  oppforingsaar: string;
  antallEtasjer: string; // Added to match BuildingDataForm
  fdvDokumentasjon: string;
  energimerking: string;

  // Faktisk energibruk (Actual Energy Use)
  totalEnergibruk: string;
  bygningssone1: string;
  bygningssone2: string;
  bygningssone3: string;

  // Bygningskropp (Building Envelope)
  ytterveggerIsolasjon: string;
  ytterveggerTykkelse: string;
  yttertakIsolasjon: string;
  yttertakTykkelse: string;
  innertakIsolasjon: string;
  innertakTykkelse: string;
  etasjeskillIsolasjon: string;
  etasjeskillTykkelse: string;
  fundamentIsolasjon: string;
  fundamentTykkelse: string;
  gulvIsolasjon: string;
  gulvTykkelse: string;

  // Vinduer og dører (Windows and Doors)
  vinduAntall: string;
  vinduType: string;
  vinduAar: string;
  doorAntall: string;
  doorType: string;
  doorAar: string;

  // Tekniske anlegg (Technical Systems)
  rorType: string;
  rorIsolasjon: string;
  ventilerType: string;
  ventilerIsolasjon: string;
  // Legacy single selection fields (for backward compatibility)
  varmtvannsType?: string;
  ventilasjonsType?: string;
  oppvarmingsType?: string;
  belysningType?: string;
  // HVAC Systems
  heatingSystems: RankedSelection[];
  ventilationSystems: RankedSelection[];
  hotWaterSystems: RankedSelection[];
  coolingSystems: RankedSelection[];
  // Electrical Systems
  lightingSystems: RankedSelection[];
  iotSensors: RankedSelection[];
  electricalEquipment: RankedSelection[];
  // Building Envelope
  wallInsulation: RankedSelection[];
  roofInsulation: RankedSelection[];
  floorInsulation: RankedSelection[];
  foundationInsulation: RankedSelection[];
  // Windows and Doors
  windowTypes: RankedSelection[];
  doorTypes: RankedSelection[];
  // Control Systems
  thermostatControl: RankedSelection[];
  demandControl: RankedSelection[];
  buildingManagement: RankedSelection[];
  kjolesystemType: string;
  belysningAntall: string;
  termostater: string;
  sdAnlegg: string;
  behovsstyring: string;

  // Building Physics (NS 3031:2014 compliant)
  uValueWalls: string;        // U-verdi yttervegger W/m²K
  uValueRoof: string;         // U-verdi tak W/m²K
  uValueFloor: string;        // U-verdi gulv W/m²K
  uValueWindows: string;      // U-verdi vinduer W/m²K
  normalizedThermalBridge: string; // Normalisert kuldebroverdi W/m²K
  airLeakageRate: string;     // Luftlekkasje ved 50 Pa (n50) ac/h
  ventilationRate: string;    // Luftmengde m³/h per m²
  heatRecoveryEfficiency: string; // Varmegjenvinningsgrad %
  specificFanPower: string;   // SFP-faktor kW/(m³/s)
  windowOrientation: string;  // Vindusfordeling (N/S/E/W)
  windowArea: string;         // Vindusareal m²
  solarHeatGainCoeff: string; // g-verdi for vinduer
}

interface BuildingDataFromForm {
  buildingType?: string;
  totalArea?: number;
  heatedArea?: number;
  buildingYear?: number;
  numberOfFloors?: number;
  annualEnergyConsumption?: number;
  // Legacy single fields
  heatingSystem?: string;
  lightingSystem?: string;
  ventilationSystem?: string;
  hotWaterSystem?: string;
  // New array fields from BuildingDataForm
  heatingSystems?: RankedSelection[];
  lightingSystems?: RankedSelection[];
  hotWaterSystems?: RankedSelection[];
  address?: string;
  gnr?: string;
  bnr?: string;
  fnr?: string;
  snr?: string;
  municipalityNumber?: string;
  bygningsnummer?: string;
  postalCode?: string;
  energyClass?: string;
}

// Energy system options - matching BuildingDataForm exactly
const heatingSystemOptions: RankedOption[] = [
  { value: 'Elektrisitet', label: 'Elektrisk' },
  { value: 'Varmepumpe luft-luft', label: 'Varmepumpe luft-luft' },
  { value: 'Varmepumpe luft-vann', label: 'Varmepumpe luft-vann' },
  { value: 'Bergvarme', label: 'Bergvarme' },
  { value: 'Fjernvarme', label: 'Fjernvarme' },
  { value: 'Biobrensel', label: 'Biobrensel' },
  { value: 'Olje', label: 'Fyringsolje' },
  { value: 'Gass', label: 'Naturgass' },
];

const ventilationSystemOptions: RankedOption[] = [
  { value: 'Naturlig', label: 'Naturlig' },
  { value: 'Mekanisk tilluft', label: 'Mekanisk tilluft' },
  { value: 'Mekanisk fraluft', label: 'Mekanisk fraluft' },
  { value: 'Balansert med varmegjenvinning', label: 'Balansert m/varmegjenvinning' },
  { value: 'Balansert uten varmegjenvinning', label: 'Balansert u/varmegjenvinning' },
];

const hotWaterSystemOptions: RankedOption[] = [
  { value: 'Elektrisitet', label: 'Elektrisk bereder' },
  { value: 'Varmepumpe', label: 'Varmepumpe' },
  { value: 'Solvarme', label: 'Solvarme' },
  { value: 'Fjernvarme', label: 'Fjernvarme' },
  { value: 'Olje', label: 'Fyringsolje' },
  { value: 'Gass', label: 'Naturgass' },
];

const lightingSystemOptions: RankedOption[] = [
  { value: 'LED', label: 'LED' },
  { value: 'Fluorescerende', label: 'Fluorescerende' },
  { value: 'Halogen', label: 'Halogen' },
  { value: 'Glødepære', label: 'Glødepære' },
];

const coolingSystemOptions: RankedOption[] = [
  { value: 'Ingen', label: 'Ingen kjøling' },
  { value: 'Varmepumpe', label: 'Varmepumpe (reversibel)' },
  { value: 'Kjølemaskin', label: 'Kjølemaskin' },
  { value: 'Fjernkjøling', label: 'Fjernkjøling' },
  { value: 'Naturlig', label: 'Naturlig ventilasjon' },
];

const iotSensorOptions: RankedOption[] = [
  { value: 'Bevegelse', label: 'Bevegelsessensorer' },
  { value: 'Temperatur', label: 'Temperatursensorer' },
  { value: 'Lys', label: 'Lyssensorer' },
  { value: 'CO2', label: 'CO2-sensorer' },
  { value: 'Fuktighet', label: 'Fuktighetssensorer' },
  { value: 'Vindu', label: 'Vindu/dørsensorer' },
];

const electricalEquipmentOptions: RankedOption[] = [
  { value: 'Varmepumpe', label: 'Varmepumper' },
  { value: 'Sirkulasjonspumpe', label: 'Sirkulasjonspumper' },
  { value: 'Vifter', label: 'Ventilasjonsaggregat' },
  { value: 'EV-lader', label: 'EV-ladere' },
  { value: 'Server', label: 'Server/IT-utstyr' },
  { value: 'Heis', label: 'Heis/rulletrapp' },
];

const insulationOptions: RankedOption[] = [
  { value: 'Mineralull', label: 'Mineralull' },
  { value: 'EPS', label: 'EPS (ekspandert polystyren)' },
  { value: 'XPS', label: 'XPS (ekstrudert polystyren)' },
  { value: 'Polyuretan', label: 'Polyuretan (PUR/PIR)' },
  { value: 'Trefiber', label: 'Trefiber' },
  { value: 'Cellulose', label: 'Cellulose' },
  { value: 'Ingen', label: 'Ingen isolasjon' },
];

const windowTypeOptions: RankedOption[] = [
  { value: 'Enkeltglass', label: 'Enkeltglass' },
  { value: 'Dobbeltglass', label: '2-lags isolerglass' },
  { value: 'Trippelglass', label: '3-lags isolerglass' },
  { value: 'Energiglass', label: 'Energiglass (lavemisjon)' },
  { value: 'Solskjerming', label: 'Solskjermingsglass' },
];

const doorTypeOptions: RankedOption[] = [
  { value: 'Standard', label: 'Standard inngangsdør' },
  { value: 'Isolert', label: 'Isolert dør' },
  { value: 'Glass', label: 'Glassdør' },
  { value: 'Skyvedør', label: 'Skyvedør' },
  { value: 'Garasjeport', label: 'Garasjeport' },
];

const thermostatOptions: RankedOption[] = [
  { value: 'Mekanisk', label: 'Mekanisk' },
  { value: 'Elektronisk', label: 'Elektronisk' },
  { value: 'Smart', label: 'Smart/WiFi' },
  { value: 'Sone', label: 'Sonebasert' },
  { value: 'Ingen', label: 'Ingen' },
];

const demandControlOptions: RankedOption[] = [
  { value: 'Tilstedeværelse', label: 'Tilstedeværelse' },
  { value: 'Dagslys', label: 'Dagslysstyring' },
  { value: 'Tid', label: 'Tidsstyring' },
  { value: 'CO2', label: 'CO2-styring' },
  { value: 'Temperatur', label: 'Temperaturstyring' },
  { value: 'Ingen', label: 'Ingen' },
];

const buildingManagementOptions: RankedOption[] = [
  { value: 'KNX', label: 'KNX/EIB' },
  { value: 'BACnet', label: 'BACnet' },
  { value: 'Modbus', label: 'Modbus' },
  { value: 'Proprietary', label: 'Proprietær' },
  { value: 'Cloud', label: 'Skybasert' },
  { value: 'Ingen', label: 'Ingen' },
];

// Descriptions for tooltips
const systemDescriptions = {
  heating: {
    'Elektrisitet': 'Elektrisk oppvarming med panelovner, gulvvarme eller varmekabler',
    'Varmepumpe luft-luft': 'Varmepumpe luft-til-luft som varmer opp lufta direkte',
    'Varmepumpe luft-vann': 'Varmepumpe luft-til-vann tilkoblet vannbårent system eller gulvvarme',
    'Bergvarme': 'Bergvarme eller jordvarme med varmepumpe og energibrønner',
    'Fjernvarme': 'Sentralt fjernvarmesystem tilkoblet lokalt varmenettverk',
    'Biobrensel': 'Ved, pellets eller flis i vedovn eller pelletsovn',
    'Olje': 'Fyringsolje i oljekjel eller oljetank',
    'Gass': 'Naturgass til oppvarming',
  },
  ventilation: {
    'Naturlig': 'Naturlig ventilasjon gjennom vinduer og ventiler uten mekanisk drift',
    'Mekanisk tilluft': 'Mekanisk tilluft med vifte, naturlig fraluft',
    'Mekanisk fraluft': 'Mekanisk fraluft med vifte, naturlig tilluft',
    'Balansert med varmegjenvinning': 'Balansert ventilasjon med varmegjenvinning for energieffektivitet',
    'Balansert uten varmegjenvinning': 'Balansert ventilasjon uten varmegjenvinning',
  },
  hotWater: {
    'Elektrisitet': 'Elektrisk varmtvannsbereder med tank eller gjennomstrømningsvarmer',
    'Varmepumpe': 'Varmepumpe dedikert for varmtvann eller integrert system',
    'Solvarme': 'Solvarme med solfangere og akkumuleringstank',
    'Fjernvarme': 'Fjernvarme tilkoblet sentralt varmenettverk',
    'Olje': 'Fyringsolje til varmtvannsproduksjon',
    'Gass': 'Naturgass til oppvarming av varmtvann',
  },
  lighting: {
    'LED': 'LED-belysning med høy energieffektivitet og lang levetid',
    'Fluorescerende': 'Fluorescerende lys som lysstofrør og kompaktlysrør',
    'Halogen': 'Halogenpærer med god lyskvalitet men høyt strømforbruk',
    'Glødepære': 'Tradisjonelle glødepærer med høyt energiforbruk',
  },
  cooling: {
    'Ingen': 'Bygningen har ingen aktiv kjøling',
    'Varmepumpe': 'Reversibel varmepumpe som kan både varme og kjøle',
    'Kjølemaskin': 'Dedikert kjølemaskin for komfortkjøling',
    'Fjernkjøling': 'Kjøling levert via fjernkjølenett',
    'Naturlig': 'Passiv kjøling via naturlig ventilasjon og skygge',
  },
  iotSensors: {
    'Bevegelse': 'PIR eller mikrobølgesensorer for tilstedeværelse',
    'Temperatur': 'Måler romtemperatur for optimal klimastyring',
    'Lys': 'Måler dagslys for optimal belysningsstyring',
    'CO2': 'Måler luftkvalitet for behovsstyrt ventilasjon',
    'Fuktighet': 'Måler relativ fuktighet for komfort og byggskade-prevensjon',
    'Vindu': 'Detekterer åpne vinduer og dører for energisparing',
  },
  electricalEquipment: {
    'Varmepumpe': 'Elektriske varmepumper for oppvarming/kjøling',
    'Sirkulasjonspumpe': 'Pumper for vannbåren varme og tappevann',
    'Vifter': 'Vifter og ventilasjonsaggregater',
    'EV-lader': 'Ladestasjoner for elektriske kjøretøy',
    'Server': 'Serverrom og IT-infrastruktur med kjølebehov',
    'Heis': 'Heiser, rulletrapper og rullebånd',
  },
  insulation: {
    'Mineralull': 'Glassull eller steinull, vanligste isolasjonsmateriale',
    'EPS': 'Hvit isopor, lett og fuktbestandig',
    'XPS': 'Blå/rosa ekstrudert polystyren, sterk og fuktbestandig',
    'Polyuretan': 'PUR/PIR skum, høy isolasjonsevne',
    'Trefiber': 'Miljøvennlig alternativ med god fuktregulering',
    'Cellulose': 'Resirkulert papir, miljøvennlig løsull',
    'Ingen': 'Uisolert konstruksjon',
  },
  windows: {
    'Enkeltglass': 'Eldre vinduer med kun ett glass',
    'Dobbeltglass': 'Standard 2-lags isolerglass',
    'Trippelglass': 'Moderne 3-lags isolerglass for lavenergibygg',
    'Energiglass': 'Lavemisjonsbelegg for bedre U-verdi',
    'Solskjerming': 'Glass med integrert solskjerming',
  },
  doors: {
    'Standard': 'Standard inngangsdør med basis isolasjon',
    'Isolert': 'Godt isolert dør for lavenergibygg',
    'Glass': 'Glassdør med isolerglass',
    'Skyvedør': 'Skyvedør til balkong eller terrasse',
    'Garasjeport': 'Port til garasje eller lager',
  },
  thermostat: {
    'Mekanisk': 'Enkel manuell termostat',
    'Elektronisk': 'Digital termostat med programmering',
    'Smart': 'WiFi-tilkoblet med app-styring',
    'Sone': 'Separate termostater for ulike soner',
    'Ingen': 'Ingen termostatisk kontroll',
  },
  demandControl: {
    'Tilstedeværelse': 'Styring basert på bevegelsessensorer',
    'Dagslys': 'Dimming basert på tilgjengelig dagslys',
    'Tid': 'Programmert tidsur for av/på',
    'CO2': 'Ventilasjon styrt av CO2-nivå',
    'Temperatur': 'Klimastyring basert på temperaturmåling',
    'Ingen': 'Ingen behovsstyring',
  },
  buildingManagement: {
    'KNX': 'KNX/EIB europeisk standard for bygningsautomasjon',
    'BACnet': 'Building Automation and Control network',
    'Modbus': 'Industriell kommunikasjonsprotokoll',
    'Proprietary': 'Leverandørspesifikt system',
    'Cloud': 'Skybasert styringssystem',
    'Ingen': 'Ingen sentralt styringssystem',
  },
};

// Helper functions for converting between formats
const convertToRankedSelection = (value?: string): RankedSelection[] => {
  if (!value) return [];
  return [{
    value,
    percentage: 100,
    ranking: 'primary' as const
  }];
};

const convertToString = (selections: RankedSelection[]): string => {
  if (!selections || selections.length === 0) return '';
  const primary = selections.find(s => s.ranking === 'primary');
  return primary?.value || selections[0]?.value || '';
};

// Helper component for system info tooltips - matching BuildingDataForm
const SystemInfoTooltip = ({ title, descriptions }: { title: string; descriptions: Record<string, string> }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="w-4 h-4 text-slate-400 hover:text-white cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs bg-slate-800 border-slate-600 text-white">
        <div className="space-y-2">
          <div className="font-medium text-sm">{title}</div>
          {Object.entries(descriptions).map(([key, desc]) => (
            <div key={key} className="text-xs">
              <span className="font-medium text-cyan-400">{key}:</span> {desc}
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

interface DataEditingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<EnergyAssessmentData>;
  buildingData?: BuildingDataFromForm;
  onSave: (data: EnergyAssessmentData) => void;
}

export default function DataEditingOverlay({
  isOpen,
  onClose,
  initialData = {},
  buildingData,
  onSave
}: DataEditingOverlayProps) {
  // Refs for dynamic height matching (only for tabs that still use 2x2 grid)
  // Controls tab refs
  const thermostatRef = useRef<HTMLDivElement>(null);
  const demandRef = useRef<HTMLDivElement>(null);
  const buildingMgmtRef = useRef<HTMLDivElement>(null);
  const integrationRef = useRef<HTMLDivElement>(null);
  const [topRowHeight, setTopRowHeight] = useState<number | undefined>();
  const [bottomRowHeight, setBottomRowHeight] = useState<number | undefined>();

  const [formData, setFormData] = useState<EnergyAssessmentData>({
    gnr: '',
    bnr: '',
    fnr: '',
    snr: '',
    kommunenummer: '',
    bygningstype: '',
    bygningssoner: '',
    bygningsvolum: '',
    bruksareal: '',
    oppvarmetAreal: '',
    oppforingsaar: '',
    antallEtasjer: '',
    fdvDokumentasjon: '',
    energimerking: '',
    totalEnergibruk: '',
    bygningssone1: '',
    bygningssone2: '',
    bygningssone3: '',
    ytterveggerIsolasjon: '',
    ytterveggerTykkelse: '',
    yttertakIsolasjon: '',
    yttertakTykkelse: '',
    innertakIsolasjon: '',
    innertakTykkelse: '',
    etasjeskillIsolasjon: '',
    etasjeskillTykkelse: '',
    fundamentIsolasjon: '',
    fundamentTykkelse: '',
    gulvIsolasjon: '',
    gulvTykkelse: '',
    vinduAntall: '',
    vinduType: '',
    vinduAar: '',
    doorAntall: '',
    doorType: '',
    doorAar: '',
    rorType: '',
    rorIsolasjon: '',
    ventilerType: '',
    ventilerIsolasjon: '',
    // Initialize arrays from initial data or legacy fields
    heatingSystems: initialData.heatingSystems || convertToRankedSelection(initialData.oppvarmingsType),
    ventilationSystems: initialData.ventilationSystems || convertToRankedSelection(initialData.ventilasjonsType),
    hotWaterSystems: initialData.hotWaterSystems || convertToRankedSelection(initialData.varmtvannsType),
    coolingSystems: initialData.coolingSystems || [],
    lightingSystems: initialData.lightingSystems || convertToRankedSelection(initialData.belysningType),
    iotSensors: initialData.iotSensors || [],
    electricalEquipment: initialData.electricalEquipment || [],
    wallInsulation: initialData.wallInsulation || [],
    roofInsulation: initialData.roofInsulation || [],
    floorInsulation: initialData.floorInsulation || [],
    foundationInsulation: initialData.foundationInsulation || [],
    windowTypes: initialData.windowTypes || [],
    doorTypes: initialData.doorTypes || [],
    thermostatControl: initialData.thermostatControl || [],
    demandControl: initialData.demandControl || [],
    buildingManagement: initialData.buildingManagement || [],
    kjolesystemType: '',
    belysningAntall: '',
    termostater: '',
    sdAnlegg: '',
    behovsstyring: '',

    // Building Physics defaults
    uValueWalls: '',
    uValueRoof: '',
    uValueFloor: '',
    uValueWindows: '',
    normalizedThermalBridge: '',
    airLeakageRate: '',
    ventilationRate: '',
    heatRecoveryEfficiency: '',
    specificFanPower: '',
    windowOrientation: '',
    windowArea: '',
    solarHeatGainCoeff: '',
    ...initialData
  });

  const [isDownloading, setIsDownloading] = useState(false);

  // Pre-populate form with data from BuildingDataForm
  React.useEffect(() => {
    if (buildingData) {
      setFormData(prev => ({
        ...prev,
        // Map BuildingDataForm fields to EnergyAssessmentData
        gnr: buildingData.gnr || prev.gnr,
        bnr: buildingData.bnr || prev.bnr,
        fnr: buildingData.fnr || prev.fnr,
        snr: buildingData.snr || prev.snr,
        kommunenummer: buildingData.municipalityNumber || prev.kommunenummer,
        energimerking: buildingData.energyClass || prev.energimerking,
        bygningstype: buildingData.buildingType || prev.bygningstype,
        bruksareal: buildingData.totalArea?.toString() || prev.bruksareal,
        oppvarmetAreal: buildingData.heatedArea?.toString() || prev.oppvarmetAreal,
        oppforingsaar: buildingData.buildingYear?.toString() || prev.oppforingsaar,
        antallEtasjer: buildingData.numberOfFloors?.toString() || prev.antallEtasjer,
        totalEnergibruk: buildingData.annualEnergyConsumption?.toString() || prev.totalEnergibruk,
        // Map array fields from BuildingDataForm
        heatingSystems: buildingData.heatingSystems || prev.heatingSystems,
        lightingSystems: buildingData.lightingSystems || prev.lightingSystems,
        hotWaterSystems: buildingData.hotWaterSystems || prev.hotWaterSystems,
        ventilationSystems: buildingData.ventilationSystem ? convertToRankedSelection(buildingData.ventilationSystem) : prev.ventilationSystems,
      }));
    }
  }, [buildingData]);

  // Dynamic height matching for 2x2 grid sections
  useEffect(() => {
    if (!isOpen) return;

    const calculateHeights = () => {
      // Only apply on desktop screens
      if (window.innerWidth < 1024) {
        setTopRowHeight(undefined);
        setBottomRowHeight(undefined);
        return;
      }

      // Clear heights first to get natural dimensions
      setTopRowHeight(undefined);
      setBottomRowHeight(undefined);

      requestAnimationFrame(() => {
        // Controls Tab - Top row: Thermostat vs Building Management
        const thermostatHeight = thermostatRef.current?.offsetHeight || 0;
        const buildingMgmtHeight = buildingMgmtRef.current?.offsetHeight || 0;

        // Controls Tab - Bottom row: Demand Control vs Integration
        const demandHeight = demandRef.current?.offsetHeight || 0;
        const integrationHeight = integrationRef.current?.offsetHeight || 0;

        // Calculate max heights for each row (only Controls tab now uses 2x2 grid)
        const maxTopHeight = Math.max(thermostatHeight, buildingMgmtHeight);
        const maxBottomHeight = Math.max(demandHeight, integrationHeight);

        if (maxTopHeight > 0) setTopRowHeight(maxTopHeight);
        if (maxBottomHeight > 0) setBottomRowHeight(maxBottomHeight);
      });
    };

    calculateHeights();
    window.addEventListener('resize', calculateHeights);
    return () => window.removeEventListener('resize', calculateHeights);
  }, [isOpen]);

  const updateField = (field: keyof EnergyAssessmentData, value: string | RankedSelection[]) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Sync legacy fields when array fields change
      if (field === 'heatingSystems' && Array.isArray(value)) {
        newData.oppvarmingsType = convertToString(value);
      } else if (field === 'ventilationSystems' && Array.isArray(value)) {
        newData.ventilasjonsType = convertToString(value);
      } else if (field === 'hotWaterSystems' && Array.isArray(value)) {
        newData.varmtvannsType = convertToString(value);
      } else if (field === 'lightingSystems' && Array.isArray(value)) {
        newData.belysningType = convertToString(value);
      }

      // Auto-calculate building volume when building type or area changes
      if ((field === 'bygningstype' || field === 'bruksareal') && newData.bygningstype && newData.bruksareal) {
        const totalArea = parseInt(newData.bruksareal);
        if (!isNaN(totalArea) && totalArea > 0) {
          const volume = calculateBuildingVolume(totalArea, newData.bygningstype as BuildingType);
          newData.bygningsvolum = volume.toString();
        }
      }

      return newData;
    });
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    try {
      // Generate Excel file using our utility function
      const blob = generateEnergyAssessmentExcel(formData);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `energivurdering_${buildingData?.address || 'ukjent'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Excel file has been downloaded successfully
      console.log('Excel file downloaded successfully');
    } catch (error) {
      console.error('Error downloading Excel:', error);
      // Could add toast notification here for error feedback
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[85vh] bg-background rounded-lg border border-border overflow-hidden shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <Building className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold text-foreground">Energikartlegging</h2>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground text-sm">Detaljert bygningsdata</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadExcel}
                disabled={isDownloading}
                className={`border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-background transition-all duration-300 ${
                  isDownloading ? 'cursor-wait opacity-80' : ''
                }`}
              >
                {isDownloading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-400 border-t-transparent mr-2" />
                    <span className="animate-pulse">Genererer Excel...</span>
                  </div>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Last ned Excel
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-background"
              >
                <Save className="w-4 h-4 mr-2" />
                Lagre
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0 p-6">
            <Tabs defaultValue="general" className="flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-7 bg-muted/50 mb-3 text-xs">
                <TabsTrigger value="general" className="data-[state=active]:bg-background data-[state=active]:text-cyan-400">
                  <Building className="w-3 h-3 mr-1" />
                  Generelt
                </TabsTrigger>
                <TabsTrigger value="physics" className="data-[state=active]:bg-background data-[state=active]:text-pink-400">
                  <Thermometer className="w-3 h-3 mr-1" />
                  Bygningsfysikk
                </TabsTrigger>
                <TabsTrigger value="envelope" className="data-[state=active]:bg-background data-[state=active]:text-orange-400">
                  <Thermometer className="w-3 h-3 mr-1" />
                  Isolasjon
                </TabsTrigger>
                <TabsTrigger value="windows" className="data-[state=active]:bg-background data-[state=active]:text-blue-400">
                  <Sun className="w-3 h-3 mr-1" />
                  Vindu/dør
                </TabsTrigger>
                <TabsTrigger value="hvac" className="data-[state=active]:bg-background data-[state=active]:text-green-400">
                  <Wind className="w-3 h-3 mr-1" />
                  Varme/klima
                </TabsTrigger>
                <TabsTrigger value="electrical" className="data-[state=active]:bg-background data-[state=active]:text-yellow-400">
                  <Zap className="w-3 h-3 mr-1" />
                  El/belysning
                </TabsTrigger>
                <TabsTrigger value="controls" className="data-[state=active]:bg-background data-[state=active]:text-purple-400">
                  <Wrench className="w-3 h-3 mr-1" />
                  Styring
                </TabsTrigger>
              </TabsList>

              {/* General Information Tab */}
              <TabsContent value="general" className="flex-1 overflow-auto">
                <div className="space-y-6 h-full">
                  <Card className="bg-card border-border">
                    <CardHeader className="pt-6">
                      <CardTitle className="text-cyan-400">Eiendomsinformasjon</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6">
                    <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                      <Label htmlFor="gnr" className="flex items-center gap-2 text-sm font-medium text-foreground">Gårdsnummer (gnr.)</Label>
                      <Input
                        id="gnr"
                        value={formData.gnr}
                        onChange={(e) => updateField('gnr', e.target.value)}
                        className="h-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                        placeholder="123"
                      />
                    </div>
                    <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                      <Label htmlFor="bnr" className="flex items-center gap-2 text-sm font-medium text-foreground">Bruksnummer (bnr.)</Label>
                      <Input
                        id="bnr"
                        value={formData.bnr}
                        onChange={(e) => updateField('bnr', e.target.value)}
                        className="h-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                        placeholder="45"
                      />
                    </div>
                    <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                      <Label htmlFor="fnr" className="flex items-center gap-2 text-sm font-medium text-foreground">Festenummer (fnr.)</Label>
                      <Input
                        id="fnr"
                        value={formData.fnr}
                        onChange={(e) => updateField('fnr', e.target.value)}
                        className="h-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                        placeholder="0"
                      />
                    </div>
                    <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                      <Label htmlFor="kommunenummer" className="flex items-center gap-2 text-sm font-medium text-foreground">Kommunenummer</Label>
                      <Input
                        id="kommunenummer"
                        value={formData.kommunenummer}
                        onChange={(e) => updateField('kommunenummer', e.target.value)}
                        className="h-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                        placeholder="3001"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader className="pt-6">
                    <CardTitle className="text-cyan-400">Bygningsinformasjon</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                    <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                      <Label htmlFor="bygningstype" className="flex items-center gap-2 text-sm font-medium text-foreground">Bygningstype (NS 3457-3)</Label>
                      <Select value={formData.bygningstype} onValueChange={(value) => updateField('bygningstype', value)}>
                        <SelectTrigger className="h-10 bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Velg bygningstype" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground z-[10000]">
                          <SelectItem value="Småhus">Småhus (enebolig, rekkehus)</SelectItem>
                          <SelectItem value="Flerbolig">Flerboligbygg</SelectItem>
                          <SelectItem value="Kontor">Kontorbygg</SelectItem>
                          <SelectItem value="Handel">Handel og service</SelectItem>
                          <SelectItem value="Skole">Skole</SelectItem>
                          <SelectItem value="Barnehage">Barnehage</SelectItem>
                          <SelectItem value="Sykehus">Sykehus og helseinstitusjon</SelectItem>
                          <SelectItem value="Hotell">Hotell og overnattingssteder</SelectItem>
                          <SelectItem value="Kultur">Kultur og fritidsbygg</SelectItem>
                          <SelectItem value="Idrett">Idrettshall</SelectItem>
                          <SelectItem value="Industri">Industri og lager</SelectItem>
                          <SelectItem value="Andre">Andre bygningstyper</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                      <Label htmlFor="oppforingsaar" className="flex items-center gap-2 text-sm font-medium text-foreground">Oppføringsår</Label>
                      <Input
                        id="oppforingsaar"
                        type="number"
                        value={formData.oppforingsaar}
                        onChange={(e) => updateField('oppforingsaar', e.target.value)}
                        className="h-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                        placeholder="1985"
                      />
                    </div>
                    <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                      <Label htmlFor="bruksareal" className="flex items-center gap-2 text-sm font-medium text-foreground">Bruksareal (BRA) m²</Label>
                      <Input
                        id="bruksareal"
                        type="number"
                        value={formData.bruksareal}
                        onChange={(e) => updateField('bruksareal', e.target.value)}
                        className="h-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                        placeholder="1200"
                      />
                    </div>
                    <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                      <Label htmlFor="oppvarmetAreal" className="flex items-center gap-2 text-sm font-medium text-foreground">Oppvarmet areal m²</Label>
                      <Input
                        id="oppvarmetAreal"
                        type="number"
                        value={formData.oppvarmetAreal}
                        onChange={(e) => updateField('oppvarmetAreal', e.target.value)}
                        className="h-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                        placeholder="1100"
                      />
                    </div>
                    <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                      <Label htmlFor="bygningsvolum" className="flex items-center gap-2 text-sm font-medium text-foreground">Bygningsvolum m³</Label>
                      <Input
                        id="bygningsvolum"
                        type="number"
                        value={formData.bygningsvolum}
                        onChange={(e) => updateField('bygningsvolum', e.target.value)}
                        className="h-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                        placeholder="3600"
                      />
                    </div>
                    <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                      <Label htmlFor="antallEtasjer" className="flex items-center gap-2 text-sm font-medium text-foreground">Antall etasjer</Label>
                      <Input
                        id="antallEtasjer"
                        type="number"
                        value={formData.antallEtasjer}
                        onChange={(e) => updateField('antallEtasjer', e.target.value)}
                        className="h-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                        placeholder="3"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader className="pt-6">
                    <CardTitle className="text-cyan-400">Energibruk</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
                    <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                      <Label htmlFor="totalEnergibruk" className="flex items-center gap-2 text-sm font-medium text-foreground">Total energibruk (kWh/år)</Label>
                      <Input
                        id="totalEnergibruk"
                        type="number"
                        value={formData.totalEnergibruk}
                        onChange={(e) => updateField('totalEnergibruk', e.target.value)}
                        className="h-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                        placeholder="138000"
                      />
                    </div>
                    <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                      <Label htmlFor="energimerking" className="flex items-center gap-2 text-sm font-medium text-foreground">Energimerking (A-G)</Label>
                      <Select value={formData.energimerking} onValueChange={(value) => updateField('energimerking', value)}>
                        <SelectTrigger className="h-10 bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Velg energimerking" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground z-[10000]">
                          <SelectItem value="Ikke sertifisert">Ikke sertifisert</SelectItem>
                          <SelectItem value="A">A - Meget lav</SelectItem>
                          <SelectItem value="B">B - Lav</SelectItem>
                          <SelectItem value="C">C - Middels</SelectItem>
                          <SelectItem value="D">D - Høy</SelectItem>
                          <SelectItem value="E">E - Meget høy</SelectItem>
                          <SelectItem value="F">F - Ekstremt høy</SelectItem>
                          <SelectItem value="G">G - Ekstremt høy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
                </div>
              </TabsContent>

              {/* Building Physics Tab - NS 3031:2014 Compliant */}
              <TabsContent value="physics" className="flex-1 overflow-auto">
                <div className="space-y-6 h-full">
                  <Card className="bg-card border-border">
                    <CardHeader className="pt-6">
                      <CardTitle className="text-pink-400 flex items-center gap-2">
                        U-verdier og bygningsfysikk
                        <span className="text-xs bg-pink-500/20 px-2 py-1 rounded-full text-pink-300">
                          TEK17 § 14-3
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pb-6">
                      {/* Air tightness and thermal bridges */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg flex flex-col">
                          <div className="mb-auto">
                            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                              Luftlekkasje n50
                              <span className="text-xs text-muted-foreground">(ac/h)</span>
                            </Label>
                          </div>
                          <div className="mt-4 space-y-2">
                            <Input
                              type="number"
                              step="0.1"
                              value={formData.airLeakageRate}
                              onChange={(e) => updateField('airLeakageRate', e.target.value)}
                              className="h-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                              placeholder="0.6"
                            />
                            <div className="text-xs text-emerald-400">
                              TEK17: ≤ 0,6
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg flex flex-col">
                          <div className="mb-auto">
                            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                              Normalisert kuldebroverdi
                              <span className="text-xs text-muted-foreground">(W/m²K)</span>
                            </Label>
                          </div>
                          <div className="mt-4 space-y-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.normalizedThermalBridge}
                              onChange={(e) => updateField('normalizedThermalBridge', e.target.value)}
                              className="h-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                              placeholder="0.05"
                            />
                            <div className="text-xs text-emerald-400">
                              TEK17: ≤ 0,05
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg flex flex-col">
                          <div className="mb-auto">
                            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                              g-verdi vinduer
                              <span className="text-xs text-muted-foreground">(0-1)</span>
                            </Label>
                          </div>
                          <div className="mt-4 space-y-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={formData.solarHeatGainCoeff}
                              onChange={(e) => updateField('solarHeatGainCoeff', e.target.value)}
                              className="h-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                              placeholder="0.50"
                            />
                            <div className="text-xs text-slate-400">
                              Soltransmittans
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Ventilation system specifications */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg flex flex-col">
                          <div className="mb-auto">
                            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                              Luftmengde
                              <span className="text-xs text-muted-foreground">(m³/h per m²)</span>
                            </Label>
                          </div>
                          <div className="mt-4 space-y-2">
                            <Input
                              type="number"
                              step="0.1"
                              value={formData.ventilationRate}
                              onChange={(e) => updateField('ventilationRate', e.target.value)}
                              className="h-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                              placeholder="1.2"
                            />
                            <div className="text-xs text-slate-400">
                              Typisk: 0,8-2,0
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg flex flex-col">
                          <div className="mb-auto">
                            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                              Varmegjenvinning
                              <span className="text-xs text-muted-foreground">(%)</span>
                            </Label>
                          </div>
                          <div className="mt-4 space-y-2">
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={formData.heatRecoveryEfficiency}
                              onChange={(e) => updateField('heatRecoveryEfficiency', e.target.value)}
                              className="h-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                              placeholder="80"
                            />
                            <div className="text-xs text-emerald-400">
                              TEK17: ≥ 80%
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg flex flex-col">
                          <div className="mb-auto">
                            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                              SFP-faktor
                              <span className="text-xs text-muted-foreground">(kW/(m³/s))</span>
                            </Label>
                          </div>
                          <div className="mt-4 space-y-2">
                            <Input
                              type="number"
                              step="0.1"
                              value={formData.specificFanPower}
                              onChange={(e) => updateField('specificFanPower', e.target.value)}
                              className="h-10 bg-white/5 border-white/20 text-white placeholder:text-muted-foreground"
                              placeholder="1.5"
                            />
                            <div className="text-xs text-emerald-400">
                              TEK17: ≤ 2,5
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Building Envelope Tab */}
              <TabsContent value="envelope" className="flex-1 overflow-auto">
                <div className="space-y-6 h-full">
                  <Card className="bg-card border-border">
                    <CardHeader className="pt-6">
                      <CardTitle className="text-orange-400">Bygningskropp og isolasjon</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-6 max-w-3xl mx-auto">
                      {/* Yttervegger */}
                      <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Thermometer className="w-4 h-4 text-orange-400" />
                            Yttervegger (233)
                          </Label>
                          <SystemInfoTooltip
                            title="Isolasjonsmaterialer"
                            descriptions={systemDescriptions.insulation}
                          />
                        </div>
                        <RankedMultiSelect
                          selections={formData.wallInsulation}
                          onSelectionsChange={(value) => updateField('wallInsulation', value)}
                          options={insulationOptions}
                          placeholder="Velg isolasjonstype"
                          emptyStateText="Ingen isolasjon registrert"
                          className="w-full"
                          useThicknessUValue={true}
                          uValueLabel="TEK17: ≤ 0,18"
                          title=""
                          maxSelections={2}
                        />
                      </div>

                      {/* Yttertak */}
                      <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Home className="w-4 h-4 text-blue-400" />
                            Yttertak (221)
                          </Label>
                          <SystemInfoTooltip
                            title="Isolasjonsmaterialer"
                            descriptions={systemDescriptions.insulation}
                          />
                        </div>
                        <RankedMultiSelect
                          selections={formData.roofInsulation}
                          onSelectionsChange={(value) => updateField('roofInsulation', value)}
                          options={insulationOptions}
                          placeholder="Velg isolasjonstype"
                          emptyStateText="Ingen isolasjon registrert"
                          className="w-full"
                          useThicknessUValue={true}
                          uValueLabel="TEK17: ≤ 0,13"
                          title=""
                          maxSelections={2}
                        />
                      </div>

                      {/* Gulv mot grunn */}
                      <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Building className="w-4 h-4 text-green-400" />
                            Gulv mot grunn
                          </Label>
                          <SystemInfoTooltip
                            title="Isolasjonsmaterialer"
                            descriptions={systemDescriptions.insulation}
                          />
                        </div>
                        <RankedMultiSelect
                          selections={formData.floorInsulation}
                          onSelectionsChange={(value) => updateField('floorInsulation', value)}
                          options={insulationOptions}
                          placeholder="Velg isolasjonstype"
                          emptyStateText="Ingen isolasjon registrert"
                          className="w-full"
                          useThicknessUValue={true}
                          uValueLabel="TEK17: ≤ 0,10"
                          title=""
                          maxSelections={2}
                        />
                      </div>

                      {/* Fundament/kjeller */}
                      <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Home className="w-4 h-4 text-purple-400" />
                            Fundament/kjeller
                          </Label>
                          <SystemInfoTooltip
                            title="Isolasjonsmaterialer"
                            descriptions={systemDescriptions.insulation}
                          />
                        </div>
                        <RankedMultiSelect
                          selections={formData.foundationInsulation || []}
                          onSelectionsChange={(value) => updateField('foundationInsulation', value)}
                          options={insulationOptions}
                          placeholder="Velg isolasjonstype"
                          emptyStateText="Ingen isolasjon registrert"
                          className="w-full"
                          useThicknessUValue={true}
                          uValueLabel="TEK17: ≤ 0,15"
                          title=""
                          maxSelections={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Windows and Doors Tab */}
              <TabsContent value="windows" className="flex-1 overflow-auto">
                <div className="space-y-6 h-full">
                  <Card className="bg-card border-border">
                    <CardHeader className="pt-6">
                      <CardTitle className="text-blue-400">Vinduer og dører</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-6 max-w-3xl mx-auto">
                      {/* Summary row - Total counts */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/50 border border-border rounded-lg">
                          <Label className="text-sm font-medium text-foreground">Totalt antall vinduer</Label>
                          <div className="text-2xl font-bold text-cyan-400">
                            {formData.windowTypes?.reduce((sum: number, w: any) => sum + (w.quantity || 0), 0) || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formData.windowTypes?.length || 0} forskjellige typer
                          </div>
                        </div>
                        <div className="p-4 bg-muted/50 border border-border rounded-lg">
                          <Label className="text-sm font-medium text-foreground">Totalt antall dører</Label>
                          <div className="text-2xl font-bold text-orange-400">
                            {formData.doorTypes?.reduce((sum: number, d: any) => sum + (d.quantity || 0), 0) || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formData.doorTypes?.length || 0} forskjellige typer
                          </div>
                        </div>
                      </div>

                      {/* Window Types */}
                      <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Home className="w-4 h-4 text-blue-400" />
                            Vindustyper
                          </Label>
                          <SystemInfoTooltip
                            title="Vindustyper"
                            descriptions={systemDescriptions.windows}
                          />
                        </div>
                        <RankedMultiSelect
                          selections={formData.windowTypes}
                          onSelectionsChange={(value) => updateField('windowTypes', value)}
                          options={windowTypeOptions}
                          placeholder="Velg vindustyper"
                          emptyStateText="Ingen vinduer registrert"
                          className="w-full"
                          useQuantityUValue={true}  // Use quantity/U-value mode for windows
                          uValueLabel="TEK17: ≤ 0,80"
                          title=""
                        />
                      </div>

                      {/* Door Types */}
                      <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <DoorOpen className="w-4 h-4 text-orange-400" />
                            Dørtyper
                          </Label>
                          <SystemInfoTooltip
                            title="Dørtyper"
                            descriptions={systemDescriptions.doors}
                          />
                        </div>
                        <RankedMultiSelect
                          selections={formData.doorTypes}
                          onSelectionsChange={(value) => updateField('doorTypes', value)}
                          options={doorTypeOptions}
                          placeholder="Velg dørtyper"
                          emptyStateText="Ingen dører registrert"
                          className="w-full"
                          useQuantityUValue={true}  // Use quantity/U-value mode for doors
                          uValueLabel="TEK17: ≤ 0,80"
                          title=""
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* HVAC Tab */}
              <TabsContent value="hvac" className="flex-1 overflow-auto">
                <div className="space-y-6 h-full">
                  <Card className="bg-card border-border">
                    <CardHeader className="pt-6">
                      <CardTitle className="text-green-400">Varme- og klimasystemer</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-6 max-w-3xl mx-auto">
                      {/* Heating System */}
                      <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Thermometer className="w-4 h-4 text-orange-400" />
                            Oppvarmingssystem
                          </Label>
                          <SystemInfoTooltip
                            title="Oppvarmingssystemer"
                            descriptions={systemDescriptions.heating}
                          />
                        </div>
                        <RankedMultiSelect
                          selections={formData.heatingSystems}
                          onSelectionsChange={(value) => updateField('heatingSystems', value)}
                          options={heatingSystemOptions}
                          placeholder="Velg oppvarmingssystem(er)"
                          emptyStateText="Ingen oppvarmingssystem valgt"
                          className="w-full"
                          title=""
                        />
                      </div>

                      {/* Ventilation System */}
                      <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Wind className="w-4 h-4 text-green-400" />
                            Ventilasjonsystem
                          </Label>
                          <SystemInfoTooltip
                            title="Ventilasjonssystemer"
                            descriptions={systemDescriptions.ventilation}
                          />
                        </div>
                        <RankedMultiSelect
                          selections={formData.ventilationSystems}
                          onSelectionsChange={(value) => updateField('ventilationSystems', value)}
                          options={ventilationSystemOptions}
                          placeholder="Velg ventilasjonssystem"
                          className="w-full"
                          title=""
                        />
                      </div>

                      {/* Hot Water System */}
                      <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Sun className="w-4 h-4 text-blue-400" />
                            Varmtvannssystem
                          </Label>
                          <SystemInfoTooltip
                            title="Varmtvannssystemer"
                            descriptions={systemDescriptions.hotWater}
                          />
                        </div>
                        <RankedMultiSelect
                          selections={formData.hotWaterSystems}
                          onSelectionsChange={(value) => updateField('hotWaterSystems', value)}
                          options={hotWaterSystemOptions}
                          placeholder="Velg varmtvannssystem(er)"
                          className="w-full"
                          title=""
                        />
                      </div>

                      {/* Cooling System */}
                      <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Snowflake className="w-4 h-4 text-cyan-400" />
                            Kjølesystem
                          </Label>
                          <SystemInfoTooltip
                            title="Kjølesystemer"
                            descriptions={systemDescriptions.cooling}
                          />
                        </div>
                        <RankedMultiSelect
                          selections={formData.coolingSystems}
                          onSelectionsChange={(value) => updateField('coolingSystems', value)}
                          options={coolingSystemOptions}
                          placeholder="Velg kjølesystem"
                          className="w-full"
                          title=""
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Electrical Tab */}
              <TabsContent value="electrical" className="flex-1 overflow-auto">
                <div className="space-y-6 h-full">
                  <Card className="bg-card border-border">
                    <CardHeader className="pt-6">
                      <CardTitle className="text-yellow-400">Elektrisk forbruk og belysning</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-6 max-w-3xl mx-auto">
                      {/* Summary row - Total counts */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/50 border border-border rounded-lg">
                          <Label className="text-sm font-medium text-foreground">Totalt antall lysarmaturer</Label>
                          <div className="text-2xl font-bold text-yellow-400">
                            {formData.lightingSystems?.reduce((sum: number, l: any) => sum + (l.quantity || 0), 0) || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formData.lightingSystems?.length || 0} forskjellige typer
                          </div>
                        </div>
                        <div className="p-4 bg-muted/50 border border-border rounded-lg">
                          <Label className="text-sm font-medium text-foreground">Totalt elektrisk utstyr</Label>
                          <div className="text-2xl font-bold text-cyan-400">
                            {formData.electricalEquipment?.length || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formData.iotSensors?.length || 0} IoT-sensorer
                          </div>
                        </div>
                      </div>

                      {/* Lighting System */}
                      <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            Belysningssystem
                          </Label>
                          <SystemInfoTooltip
                            title="Belysningssystemer"
                            descriptions={systemDescriptions.lighting}
                          />
                        </div>
                        <RankedMultiSelect
                          selections={formData.lightingSystems}
                          onSelectionsChange={(value) => updateField('lightingSystems', value)}
                          options={lightingSystemOptions}
                          placeholder="Velg belysningssystem(er)"
                          emptyStateText="Ingen belysning registrert"
                          className="w-full"
                          title=""
                          useQuantityPower={true}
                        />
                      </div>

                      {/* Electrical Equipment */}
                      <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Cpu className="w-4 h-4 text-cyan-400" />
                            Elektrisk utstyr
                          </Label>
                          <SystemInfoTooltip
                            title="Elektrisk utstyr"
                            descriptions={systemDescriptions.electricalEquipment}
                          />
                        </div>
                        <RankedMultiSelect
                          selections={formData.electricalEquipment}
                          onSelectionsChange={(value) => updateField('electricalEquipment', value)}
                          options={electricalEquipmentOptions}
                          placeholder="Velg elektrisk utstyr"
                          emptyStateText="Ingen utstyr registrert"
                          className="w-full"
                          title=""
                          useQuantityPower={true}
                        />
                      </div>

                      {/* IoT Sensors */}
                      <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Wifi className="w-4 h-4 text-purple-400" />
                            IoT-sensorer
                          </Label>
                          <SystemInfoTooltip
                            title="IoT-sensorer"
                            descriptions={systemDescriptions.iotSensors}
                          />
                        </div>
                        <RankedMultiSelect
                          selections={formData.iotSensors}
                          onSelectionsChange={(value) => updateField('iotSensors', value)}
                          options={iotSensorOptions}
                          placeholder="Velg sensortyper"
                          emptyStateText="Ingen sensorer registrert"
                          className="w-full"
                          title=""
                          useQuantityPower={true}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Controls Tab */}
              <TabsContent value="controls" className="flex-1 overflow-auto">
                <div className="space-y-6 h-full">
                  <Card className="bg-card border-border">
                    <CardHeader className="pt-6">
                      <CardTitle className="text-purple-400">Styring - Automasjon og kontroll</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pb-6">
                    {/* Control Systems - 2x2 Grid Layout */}
                    <div className="space-y-4">
                      <h4 className="text-foreground font-semibold">Automatiseringssystemer</h4>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                          {/* Thermostat Control */}
                          <div ref={thermostatRef} style={{ minHeight: topRowHeight }} className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                            <div className="flex items-center gap-2">
                              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <Thermometer className="w-4 h-4 text-red-400" />
                                Termostatstyring
                              </Label>
                              <SystemInfoTooltip
                                title="Termostatsystemer"
                                descriptions={systemDescriptions.thermostat}
                              />
                            </div>
                            <RankedMultiSelect
                              selections={formData.thermostatControl}
                              onSelectionsChange={(value) => updateField('thermostatControl', value)}
                              options={thermostatOptions}
                              placeholder="Velg termostattyper"
                              emptyStateText="Ingen termostatstyring registrert"
                              className="w-full"
                              title=""
                            />
                          </div>

                          {/* Demand Control */}
                          <div ref={demandRef} style={{ minHeight: bottomRowHeight }} className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                            <div className="flex items-center gap-2">
                              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <Cpu className="w-4 h-4 text-green-400" />
                                Behovsstyring
                              </Label>
                              <SystemInfoTooltip
                                title="Behovsstyringssystemer"
                                descriptions={systemDescriptions.demandControl}
                              />
                            </div>
                            <RankedMultiSelect
                              selections={formData.demandControl}
                              onSelectionsChange={(value) => updateField('demandControl', value)}
                              options={demandControlOptions}
                              placeholder="Velg styringstyper"
                              emptyStateText="Ingen behovsstyring registrert"
                              className="w-full"
                              title=""
                            />
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                          {/* Building Management System */}
                          <div ref={buildingMgmtRef} style={{ minHeight: topRowHeight }} className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                            <div className="flex items-center gap-2">
                              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <Building className="w-4 h-4 text-purple-400" />
                                Bygningsautomasjon
                              </Label>
                              <SystemInfoTooltip
                                title="Bygningsautomasjon"
                                descriptions={systemDescriptions.buildingManagement}
                              />
                            </div>
                            <RankedMultiSelect
                              selections={formData.buildingManagement}
                              onSelectionsChange={(value) => updateField('buildingManagement', value)}
                              options={buildingManagementOptions}
                              placeholder="Velg automasjonssystem"
                              emptyStateText="Ingen automasjon registrert"
                              className="w-full"
                              title=""
                            />
                          </div>

                          {/* Integration Level - placeholder for future use */}
                          <div ref={integrationRef} style={{ minHeight: bottomRowHeight }} className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <Wifi className="w-4 h-4 text-cyan-400" />
                              Integrasjonsnivå
                            </Label>
                            <Select value="" disabled>
                              <SelectTrigger className="h-10 bg-input border-input text-foreground opacity-50">
                                <SelectValue placeholder="Fremtidig funksjonalitet" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Ikke implementert</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}