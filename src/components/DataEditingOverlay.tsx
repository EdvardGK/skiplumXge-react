'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  X,
  Download,
  Save,
  Building,
  Thermometer,
  Zap,
  Wind,
  Sun,
  Wrench
} from 'lucide-react';
import { calculateBuildingVolume, getBuildingStandards } from '@/lib/norwegian-building-standards';
import { BuildingType } from '@/types/norwegian-energy';

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
  varmtvannsType: string;
  ventilasjonsType: string;
  oppvarmingsType: string;
  kjolesystemType: string;
  belysningType: string;
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
  heatingSystem?: string;
  lightingSystem?: string;
  ventilationSystem?: string;
  hotWaterSystem?: string;
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
    varmtvannsType: '',
    ventilasjonsType: '',
    oppvarmingsType: '',
    kjolesystemType: '',
    belysningType: '',
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
        oppvarmingsType: buildingData.heatingSystem || prev.oppvarmingsType,
        belysningType: buildingData.lightingSystem || prev.belysningType,
        ventilasjonsType: buildingData.ventilationSystem || prev.ventilasjonsType,
        varmtvannsType: buildingData.hotWaterSystem || prev.varmtvannsType,
      }));
    }
  }, [buildingData]);

  const updateField = (field: keyof EnergyAssessmentData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

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
      // Here we would call an API to generate the Excel file with the form data
      // For now, we'll simulate the download
      const response = await fetch('/api/generate-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'energikartlegging.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading Excel:', error);
      // Fallback: create a simple download
      const dataStr = JSON.stringify(formData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(dataBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'energikartlegging-data.json';
      a.click();
      window.URL.revokeObjectURL(url);
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
                className="border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-background"
              >
                {isDownloading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent mr-2" />
                    Genererer...
                  </>
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
                  Byggfysikk
                </TabsTrigger>
                <TabsTrigger value="envelope" className="data-[state=active]:bg-background data-[state=active]:text-orange-400">
                  <Thermometer className="w-3 h-3 mr-1" />
                  Isolasjon
                </TabsTrigger>
                <TabsTrigger value="windows" className="data-[state=active]:bg-background data-[state=active]:text-blue-400">
                  <Sun className="w-3 h-3 mr-1" />
                  Vinduer
                </TabsTrigger>
                <TabsTrigger value="hvac" className="data-[state=active]:bg-background data-[state=active]:text-green-400">
                  <Wind className="w-3 h-3 mr-1" />
                  Ventilasjon
                </TabsTrigger>
                <TabsTrigger value="electrical" className="data-[state=active]:bg-background data-[state=active]:text-yellow-400">
                  <Zap className="w-3 h-3 mr-1" />
                  El/Varme
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
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-6">
                    <div className="space-y-2">
                      <Label htmlFor="gnr" className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Gårdsnummer (gnr.)</Label>
                      <Input
                        id="gnr"
                        value={formData.gnr}
                        onChange={(e) => updateField('gnr', e.target.value)}
                        className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bnr" className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Bruksnummer (bnr.)</Label>
                      <Input
                        id="bnr"
                        value={formData.bnr}
                        onChange={(e) => updateField('bnr', e.target.value)}
                        className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fnr" className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Festenummer (fnr.)</Label>
                      <Input
                        id="fnr"
                        value={formData.fnr}
                        onChange={(e) => updateField('fnr', e.target.value)}
                        className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kommunenummer" className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Kommunenummer</Label>
                      <Input
                        id="kommunenummer"
                        value={formData.kommunenummer}
                        onChange={(e) => updateField('kommunenummer', e.target.value)}
                        className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader className="pt-6">
                    <CardTitle className="text-cyan-400">Bygningsinformasjon</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                    <div className="space-y-2">
                      <Label htmlFor="bygningstype" className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Bygningstype/bruksformål (NS 3457-3)</Label>
                      <Select value={formData.bygningstype} onValueChange={(value) => updateField('bygningstype', value)}>
                        <SelectTrigger className="h-10 bg-input border-input text-foreground">
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
                    <div className="space-y-2">
                      <Label htmlFor="oppforingsaar" className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Oppføringsår</Label>
                      <Input
                        id="oppforingsaar"
                        type="number"
                        value={formData.oppforingsaar}
                        onChange={(e) => updateField('oppforingsaar', e.target.value)}
                        className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bruksareal" className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Bruksareal (BRA) m²</Label>
                      <Input
                        id="bruksareal"
                        type="number"
                        value={formData.bruksareal}
                        onChange={(e) => updateField('bruksareal', e.target.value)}
                        className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="oppvarmetAreal" className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Oppvarmet areal m²</Label>
                      <Input
                        id="oppvarmetAreal"
                        type="number"
                        value={formData.oppvarmetAreal}
                        onChange={(e) => updateField('oppvarmetAreal', e.target.value)}
                        className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bygningsvolum" className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Bygningsvolum m³</Label>
                      <Input
                        id="bygningsvolum"
                        type="number"
                        value={formData.bygningsvolum}
                        onChange={(e) => updateField('bygningsvolum', e.target.value)}
                        className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="antallEtasjer" className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Antall etasjer</Label>
                      <Input
                        id="antallEtasjer"
                        type="number"
                        value={formData.antallEtasjer}
                        onChange={(e) => updateField('antallEtasjer', e.target.value)}
                        className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader className="pt-6">
                    <CardTitle className="text-cyan-400">Energibruk</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
                    <div className="space-y-2">
                      <Label htmlFor="totalEnergibruk" className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Total energibruk (kWh/år)</Label>
                      <Input
                        id="totalEnergibruk"
                        type="number"
                        value={formData.totalEnergibruk}
                        onChange={(e) => updateField('totalEnergibruk', e.target.value)}
                        className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="energimerking" className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Energimerking (A-G)</Label>
                      <Select value={formData.energimerking} onValueChange={(value) => updateField('energimerking', value)}>
                        <SelectTrigger className="h-10 bg-input border-input text-foreground">
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
                      {/* U-values section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">
                            U-verdi yttervegger
                            <span className="text-xs text-muted-foreground">(W/m²K)</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.uValueWalls}
                            onChange={(e) => updateField('uValueWalls', e.target.value)}
                            className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                            placeholder="≤ 0.18"
                          />
                          <div className="text-xs text-emerald-400">
                            TEK17 krav: ≤ 0,18 W/m²K
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">
                            U-verdi tak
                            <span className="text-xs text-muted-foreground">(W/m²K)</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.uValueRoof}
                            onChange={(e) => updateField('uValueRoof', e.target.value)}
                            className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                            placeholder="≤ 0.13"
                          />
                          <div className="text-xs text-emerald-400">
                            TEK17 krav: ≤ 0,13 W/m²K
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">
                            U-verdi gulv
                            <span className="text-xs text-muted-foreground">(W/m²K)</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.uValueFloor}
                            onChange={(e) => updateField('uValueFloor', e.target.value)}
                            className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                            placeholder="≤ 0.10"
                          />
                          <div className="text-xs text-emerald-400">
                            TEK17 krav: ≤ 0,10 W/m²K
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">
                            U-verdi vinduer/dører
                            <span className="text-xs text-muted-foreground">(W/m²K)</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.uValueWindows}
                            onChange={(e) => updateField('uValueWindows', e.target.value)}
                            className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                            placeholder="≤ 0.80"
                          />
                          <div className="text-xs text-emerald-400">
                            TEK17 krav: ≤ 0,80 W/m²K
                          </div>
                        </div>
                      </div>

                      {/* Air tightness and thermal bridges */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 border border-border rounded-lg">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">
                            Luftlekkasje n50
                            <span className="text-xs text-muted-foreground">(ac/h)</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={formData.airLeakageRate}
                            onChange={(e) => updateField('airLeakageRate', e.target.value)}
                            className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                            placeholder="≤ 0.6"
                          />
                          <div className="text-xs text-emerald-400">
                            TEK17 krav: ≤ 0,6 ac/h
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">
                            Normalisert kuldebroverdi
                            <span className="text-xs text-muted-foreground">(W/m²K)</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.normalizedThermalBridge}
                            onChange={(e) => updateField('normalizedThermalBridge', e.target.value)}
                            className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                            placeholder="≤ 0.05"
                          />
                          <div className="text-xs text-emerald-400">
                            TEK17 krav: ≤ 0,05 W/m²K
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">
                            g-verdi vinduer
                            <span className="text-xs text-muted-foreground">(0-1)</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={formData.solarHeatGainCoeff}
                            onChange={(e) => updateField('solarHeatGainCoeff', e.target.value)}
                            className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                            placeholder="0.50"
                          />
                          <div className="text-xs text-slate-400">
                            Soltransmittans
                          </div>
                        </div>
                      </div>

                      {/* Ventilation system specifications */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-accent/10 border border-accent/20 rounded-lg">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">
                            Luftmengde
                            <span className="text-xs text-muted-foreground">(m³/h per m²)</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={formData.ventilationRate}
                            onChange={(e) => updateField('ventilationRate', e.target.value)}
                            className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                            placeholder="1.2"
                          />
                          <div className="text-xs text-slate-400">
                            Typisk: 0,8-2,0 m³/h per m²
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">
                            Varmegjenvinning
                            <span className="text-xs text-muted-foreground">(%)</span>
                          </Label>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            value={formData.heatRecoveryEfficiency}
                            onChange={(e) => updateField('heatRecoveryEfficiency', e.target.value)}
                            className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                            placeholder="80"
                          />
                          <div className="text-xs text-emerald-400">
                            TEK17 krav: ≥ 80%
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">
                            SFP-faktor
                            <span className="text-xs text-muted-foreground">(kW/(m³/s))</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={formData.specificFanPower}
                            onChange={(e) => updateField('specificFanPower', e.target.value)}
                            className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                            placeholder="1.5"
                          />
                          <div className="text-xs text-emerald-400">
                            TEK17 krav: ≤ 2,5 kW/(m³/s)
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
                    <CardContent className="space-y-6 pb-6">
                    {/* Yttervegger */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-muted/50 border border-border rounded-lg">
                      <div className="col-span-3">
                        <h4 className="text-foreground font-semibold mb-1">Yttervegger (233)</h4>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Type isolasjon</Label>
                        <Select value={formData.ytterveggerIsolasjon} onValueChange={(value) => updateField('ytterveggerIsolasjon', value)}>
                          <SelectTrigger className="h-10 bg-input border-input text-foreground">
                            <SelectValue placeholder="Velg type" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-popover-foreground z-[10000]">
                            <SelectItem value="glassfiberull">Glassfiberull</SelectItem>
                            <SelectItem value="steinull">Steinull</SelectItem>
                            <SelectItem value="pir">PIR</SelectItem>
                            <SelectItem value="pur">PUR</SelectItem>
                            <SelectItem value="xps">XPS</SelectItem>
                            <SelectItem value="eps">EPS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Tykkelse (mm)</Label>
                        <Input
                          type="number"
                          value={formData.ytterveggerTykkelse}
                          onChange={(e) => updateField('ytterveggerTykkelse', e.target.value)}
                          className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="text-xs text-muted-foreground">
                          TEK17 krav: ≤ 0,18 W/m²·K
                        </div>
                      </div>
                    </div>

                    {/* Yttertak */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-muted/50 border border-border rounded-lg">
                      <div className="col-span-3">
                        <h4 className="text-foreground font-semibold mb-1">Yttertak (221)</h4>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Type isolasjon</Label>
                        <Select value={formData.yttertakIsolasjon} onValueChange={(value) => updateField('yttertakIsolasjon', value)}>
                          <SelectTrigger className="h-10 bg-input border-input text-foreground">
                            <SelectValue placeholder="Velg type" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-popover-foreground z-[10000]">
                            <SelectItem value="glassfiberull">Glassfiberull</SelectItem>
                            <SelectItem value="steinull">Steinull</SelectItem>
                            <SelectItem value="blåseisolasjon">Blåseisolasjon</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Tykkelse (mm)</Label>
                        <Input
                          type="number"
                          value={formData.yttertakTykkelse}
                          onChange={(e) => updateField('yttertakTykkelse', e.target.value)}
                          className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="text-xs text-muted-foreground">
                          TEK17 krav: ≤ 0,18 W/m²·K
                        </div>
                      </div>
                    </div>

                    {/* Gulv mot grunn */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-muted/50 border border-border rounded-lg">
                      <div className="col-span-3">
                        <h4 className="text-foreground font-semibold mb-1">Gulv mot grunn</h4>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Type isolasjon</Label>
                        <Select value={formData.gulvIsolasjon} onValueChange={(value) => updateField('gulvIsolasjon', value)}>
                          <SelectTrigger className="h-10 bg-input border-input text-foreground">
                            <SelectValue placeholder="Velg type" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-popover-foreground z-[10000]">
                            <SelectItem value="xps">XPS</SelectItem>
                            <SelectItem value="eps">EPS</SelectItem>
                            <SelectItem value="glassfiberull">Glassfiberull</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Tykkelse (mm)</Label>
                        <Input
                          type="number"
                          value={formData.gulvTykkelse}
                          onChange={(e) => updateField('gulvTykkelse', e.target.value)}
                          className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="text-xs text-muted-foreground">
                          TEK17 krav: ≤ 0,15 W/m²·K
                        </div>
                      </div>
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
                    <CardContent className="space-y-6 pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-muted/50 border border-border rounded-lg">
                      <div className="col-span-3">
                        <h4 className="text-foreground font-semibold mb-1">Vinduselementer (231)</h4>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Antall</Label>
                        <Input
                          type="number"
                          value={formData.vinduAntall}
                          onChange={(e) => updateField('vinduAntall', e.target.value)}
                          className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Type</Label>
                        <Select value={formData.vinduType} onValueChange={(value) => updateField('vinduType', value)}>
                          <SelectTrigger className="h-10 bg-input border-input text-foreground">
                            <SelectValue placeholder="Velg type" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-popover-foreground z-[10000]">
                            <SelectItem value="enkelt">Enkelt glass</SelectItem>
                            <SelectItem value="dobbelt">Dobbelt glass</SelectItem>
                            <SelectItem value="tredobbelt">Tredobbelt glass</SelectItem>
                            <SelectItem value="energi">Energivindu</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Fra år</Label>
                        <Input
                          type="number"
                          value={formData.vinduAar}
                          onChange={(e) => updateField('vinduAar', e.target.value)}
                          className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
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
                      <CardTitle className="text-green-400">Ventilasjon og varme</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-muted/50 border border-border rounded-lg">
                      <div className="col-span-3">
                        <h4 className="text-foreground font-semibold mb-1">Tekniske anlegg</h4>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Ventilasjonsystem</Label>
                        <Select value={formData.ventilasjonsType} onValueChange={(value) => updateField('ventilasjonsType', value)}>
                          <SelectTrigger className="h-10 bg-input border-input text-foreground">
                            <SelectValue placeholder="Velg type" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-popover-foreground z-[10000]">
                            <SelectItem value="Naturlig">Naturlig ventilasjon (vinduer, ventiler)</SelectItem>
                            <SelectItem value="Mekanisk tilluft">Mekanisk tilluft</SelectItem>
                            <SelectItem value="Mekanisk fraluft">Mekanisk fraluft</SelectItem>
                            <SelectItem value="Balansert med varmegjenvinning">Balansert ventilasjon med varmegjenvinning</SelectItem>
                            <SelectItem value="Balansert uten varmegjenvinning">Balansert ventilasjon uten varmegjenvinning</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Oppvarmingssystem</Label>
                        <Select value={formData.oppvarmingsType} onValueChange={(value) => updateField('oppvarmingsType', value)}>
                          <SelectTrigger className="h-10 bg-input border-input text-foreground">
                            <SelectValue placeholder="Velg type" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-popover-foreground z-[10000]">
                            <SelectItem value="Elektrisitet">Elektrisk oppvarming (panelovner, kabler)</SelectItem>
                            <SelectItem value="Varmepumpe">Varmepumpe (luft-luft, luft-vann)</SelectItem>
                            <SelectItem value="Bergvarme">Bergvarme / jordvarme</SelectItem>
                            <SelectItem value="Fjernvarme">Fjernvarme</SelectItem>
                            <SelectItem value="Biobrensel">Biobrensel (ved, pellets)</SelectItem>
                            <SelectItem value="Olje">Fyringsolje</SelectItem>
                            <SelectItem value="Gass">Naturgass</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Varmtvannssystem</Label>
                        <Select value={formData.varmtvannsType} onValueChange={(value) => updateField('varmtvannsType', value)}>
                          <SelectTrigger className="h-10 bg-input border-input text-foreground">
                            <SelectValue placeholder="Velg type" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-popover-foreground z-[10000]">
                            <SelectItem value="Elektrisitet">Elektrisk varmtvannsbereder</SelectItem>
                            <SelectItem value="Varmepumpe">Varmepumpe for varmtvann</SelectItem>
                            <SelectItem value="Solvarme">Solvarme</SelectItem>
                            <SelectItem value="Fjernvarme">Fjernvarme</SelectItem>
                            <SelectItem value="Olje">Fyringsolje</SelectItem>
                            <SelectItem value="Gass">Naturgass</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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
                      <CardTitle className="text-yellow-400">Elektrisitet og belysning</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-muted/50 border border-border rounded-lg">
                      <div className="col-span-2">
                        <h4 className="text-foreground font-semibold mb-1">Belysningsanlegg</h4>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Belysningstype</Label>
                        <Select value={formData.belysningType} onValueChange={(value) => updateField('belysningType', value)}>
                          <SelectTrigger className="h-10 bg-input border-input text-foreground">
                            <SelectValue placeholder="Velg type" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-popover-foreground z-[10000]">
                            <SelectItem value="LED">LED-belysning</SelectItem>
                            <SelectItem value="Fluorescerende">Fluorescerende lys (lysstofrør)</SelectItem>
                            <SelectItem value="Halogen">Halogenpærer</SelectItem>
                            <SelectItem value="Glødepære">Glødepærer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Antall armaturer</Label>
                        <Input
                          type="number"
                          value={formData.belysningAntall}
                          onChange={(e) => updateField('belysningAntall', e.target.value)}
                          className="h-10 bg-input border-input text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
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
                      <CardTitle className="text-purple-400">Regulering og styring</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-muted/50 border border-border rounded-lg">
                      <div className="col-span-2">
                        <h4 className="text-foreground font-semibold mb-1">Styringssystemer</h4>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Termostater</Label>
                        <Select value={formData.termostater} onValueChange={(value) => updateField('termostater', value)}>
                          <SelectTrigger className="h-10 bg-input border-input text-foreground">
                            <SelectValue placeholder="Velg type" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-popover-foreground z-[10000]">
                            <SelectItem value="mekanisk">Mekanisk</SelectItem>
                            <SelectItem value="elektronisk">Elektronisk</SelectItem>
                            <SelectItem value="smart">Smart termostat</SelectItem>
                            <SelectItem value="ingen">Ingen</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm leading-none font-medium text-foreground">Behovsstyring</Label>
                        <Select value={formData.behovsstyring} onValueChange={(value) => updateField('behovsstyring', value)}>
                          <SelectTrigger className="h-10 bg-input border-input text-foreground">
                            <SelectValue placeholder="Velg type" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-popover-foreground z-[10000]">
                            <SelectItem value="tilstedeværelse">Tilstedeværelsessensor</SelectItem>
                            <SelectItem value="dagslys">Dagslysstyring</SelectItem>
                            <SelectItem value="tid">Tidsstyring</SelectItem>
                            <SelectItem value="ingen">Ingen</SelectItem>
                          </SelectContent>
                        </Select>
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