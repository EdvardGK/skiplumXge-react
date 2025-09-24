'use client';

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Loader2, CheckCircle, HelpCircle } from "lucide-react";
import { BuildingType, HeatingSystem, LightingSystem, VentilationSystem, HotWaterSystem, EnergySource } from "@/types/norwegian-energy";
import { RankedMultiSelect, RankedSelection, RankedOption } from "@/components/ui/ranked-multi-select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import MapDataService from "@/services/map-data.service";
import { getEnovaGrade } from "@/services/enova.service";
import { calculateEnergyEstimate, getBuildingStandards } from "@/lib/norwegian-building-standards";

// Form validation schema
const buildingDataSchema = z.object({
  buildingType: z.string().min(1, "Bygningstype er påkrevd"),
  totalArea: z.number().min(20, "Minimum 20 m²").max(50000, "Maksimum 50,000 m²"),
  heatedArea: z.number().min(10, "Minimum 10 m²").max(50000, "Maksimum 50,000 m²"),
  buildingYear: z.string().optional(),
  numberOfFloors: z.number().min(1, "Minimum 1 etasje").max(100, "Maksimum 100 etasjer").optional(),
  sdInstallation: z.enum(["ja", "nei"]).optional(),
  annualEnergyConsumption: z.number().min(1000, "Minimum 1000 kWh/år").max(1000000, "Maksimum 1,000,000 kWh/år"),
  heatingSystems: z.array(z.object({
    value: z.string(),
    percentage: z.number().min(0).max(100),
    ranking: z.enum(['primary', 'secondary', 'tertiary'])
  })).min(1, "Minst ett oppvarmingssystem er påkrevd"),
  lightingSystems: z.array(z.object({
    value: z.string(),
    percentage: z.number().min(0).max(100),
    ranking: z.enum(['primary', 'secondary', 'tertiary'])
  })).min(1, "Minst ett belysningssystem er påkrevd"),
  ventilationSystem: z.string().min(1, "Ventilasjonssystem er påkrevd"),
  hotWaterSystems: z.array(z.object({
    value: z.string(),
    percentage: z.number().min(0).max(100),
    ranking: z.enum(['primary', 'secondary', 'tertiary'])
  })).min(1, "Minst ett varmtvannssystem er påkrevd"),
});

type FormData = z.infer<typeof buildingDataSchema>;

const buildingTypeOptions: { value: BuildingType; label: string }[] = [
  { value: 'Småhus', label: 'Småhus (enebolig, rekkehus)' },
  { value: 'Flerbolig', label: 'Flerboligbygg' },
  { value: 'Kontor', label: 'Kontorbygg' },
  { value: 'Handel', label: 'Handel og service' },
  { value: 'Skole', label: 'Skole' },
  { value: 'Barnehage', label: 'Barnehage' },
  { value: 'Sykehus', label: 'Sykehus og helseinstitusjon' },
  { value: 'Hotell', label: 'Hotell og overnattingssteder' },
  { value: 'Kultur', label: 'Kultur og fritidsbygg' },
  { value: 'Idrett', label: 'Idrettshall' },
  { value: 'Industri', label: 'Industri og lager' },
  { value: 'Andre', label: 'Andre bygningstyper' },
];

const heatingSystemOptions: RankedOption[] = [
  { value: 'Elektrisitet', label: 'Elektrisk' },
  { value: 'Varmepumpe luft-luft', label: 'Varmepumpe, luft-luft' },
  { value: 'Varmepumpe luft-vann', label: 'Varmepumpe, luft-vann' },
  { value: 'Bergvarme', label: 'Bergvarme' },
  { value: 'Fjernvarme', label: 'Fjernvarme' },
  { value: 'Biobrensel', label: 'Biobrensel' },
  { value: 'Olje', label: 'Fyringsolje' },
  { value: 'Gass', label: 'Naturgass' },
];

const heatingSystemDescriptions: Record<string, string> = {
  'Elektrisitet': 'Elektrisk oppvarming med panelovner, gulvvarme eller varmekabler',
  'Varmepumpe luft-luft': 'Varmepumpe luft-til-luft som varmer opp lufta direkte',
  'Varmepumpe luft-vann': 'Varmepumpe luft-til-vann tilkoblet vannbårent system eller gulvvarme',
  'Bergvarme': 'Bergvarme eller jordvarme med varmepumpe og energibrønner',
  'Fjernvarme': 'Sentralt fjernvarmesystem tilkoblet lokalt varmenettverk',
  'Biobrensel': 'Biobrensel som ved, pellets eller flis i vedovn eller pelletsovn',
  'Olje': 'Fyringsolje i oljekjel eller oljetank',
  'Gass': 'Naturgass til oppvarming og varmt vann',
};

const lightingSystemOptions: RankedOption[] = [
  { value: 'LED', label: 'LED' },
  { value: 'Fluorescerende', label: 'Fluorescerende' },
  { value: 'Halogen', label: 'Halogen' },
  { value: 'Glødepære', label: 'Glødepære' },
];

const lightingSystemDescriptions: Record<string, string> = {
  'LED': 'LED-belysning med høy energieffektivitet og lang levetid',
  'Fluorescerende': 'Fluorescerende lys som lysstofrør og kompaktlysrør',
  'Halogen': 'Halogenpærer med god lysqualitet men høyt strømforbruk',
  'Glødepære': 'Tradisjonelle glødepærer med høyt energiforbruk',
};

const ventilationSystemOptions: { value: VentilationSystem; label: string }[] = [
  { value: 'Naturlig', label: 'Naturlig' },
  { value: 'Mekanisk tilluft', label: 'Mekanisk tilluft' },
  { value: 'Mekanisk fraluft', label: 'Mekanisk fraluft' },
  { value: 'Balansert med varmegjenvinning', label: 'Balansert m/varmegjenvinning' },
  { value: 'Balansert uten varmegjenvinning', label: 'Balansert u/varmegjenvinning' },
];

const ventilationSystemDescriptions: Record<string, string> = {
  'Naturlig': 'Naturlig ventilasjon gjennom vinduer og ventiler uten mekanisk drift',
  'Mekanisk tilluft': 'Mekanisk tilluft med vifte, naturlig fraluft',
  'Mekanisk fraluft': 'Mekanisk fraluft med vifte, naturlig tilluft',
  'Balansert med varmegjenvinning': 'Balansert ventilasjon med varmegjenvinning for energieffektivitet',
  'Balansert uten varmegjenvinning': 'Balansert ventilasjon uten varmegjenvinning',
};

const hotWaterSystemOptions: RankedOption[] = [
  { value: 'Elektrisitet', label: 'Elektrisk bereder' },
  { value: 'Varmepumpe', label: 'Varmepumpe' },
  { value: 'Solvarme', label: 'Solvarme' },
  { value: 'Fjernvarme', label: 'Fjernvarme' },
  { value: 'Olje', label: 'Fyringsolje' },
  { value: 'Gass', label: 'Naturgass' },
];

const hotWaterSystemDescriptions: Record<string, string> = {
  'Elektrisitet': 'Elektrisk varmtvannsbereder med tank eller gjennomstrømningsvarmer',
  'Varmepumpe': 'Varmepumpe dedikert for varmtvann eller integrert system',
  'Solvarme': 'Solvarme med solfangere og akkumuleringstank',
  'Fjernvarme': 'Fjernvarme tilkoblet sentralt varmenettverk',
  'Olje': 'Fyringsolje i kombitank eller separat varmtvannsbereder',
  'Gass': 'Naturgass til oppvarming av varmt vann',
};

const buildingYearOptions = [
  { value: 'before_1980', label: 'Før 1980' },
  { value: '1980_2010', label: '1980-2010' },
  { value: 'after_2010', label: 'Nyere enn 2010' },
];

// Helper component for system info tooltips
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

interface BuildingDataFormProps {
  address?: string;
  lat?: string;
  lon?: string;
  municipality?: string;
  municipalityNumber?: string;
  postalCode?: string;
  gnr?: string;
  bnr?: string;
  bygningsnummer?: string;
  onSubmit: (data: FormData & { address: string; lat?: string; lon?: string; municipality?: string; municipalityNumber?: string; postalCode?: string; gnr?: string; bnr?: string; }) => void;
  isSubmitting?: boolean;
  onResetRequest?: () => void;
}

export function BuildingDataForm({
  address,
  lat,
  lon,
  municipality,
  municipalityNumber,
  postalCode,
  gnr,
  bnr,
  bygningsnummer,
  onSubmit,
  isSubmitting = false,
  onResetRequest
}: BuildingDataFormProps) {
  const [isFetchingBuildingData, setIsFetchingBuildingData] = useState(false);
  const [buildingDataSource, setBuildingDataSource] = useState<string | null>(null);
  const [buildingDataTimeout, setBuildingDataTimeout] = useState(false);
  const [isFetchingEnovaData, setIsFetchingEnovaData] = useState(false);
  const [enovaDataSource, setEnovaDataSource] = useState<string | null>(null);

  // State for multi-select components
  const [heatingSelections, setHeatingSelections] = useState<RankedSelection[]>([
    { value: 'Elektrisitet', percentage: 100, ranking: 'primary' }
  ]);
  const [lightingSelections, setLightingSelections] = useState<RankedSelection[]>([
    { value: 'Fluorescerende', percentage: 100, ranking: 'primary' }
  ]);
  const [hotWaterSelections, setHotWaterSelections] = useState<RankedSelection[]>([
    { value: 'Elektrisitet', percentage: 100, ranking: 'primary' }
  ]);

  // Track data sources for each field
  const [fieldSources, setFieldSources] = useState<Record<string, 'manual' | 'auto' | 'map' | 'enova' | 'calculated'>>({
    totalArea: 'auto',
    heatedArea: 'auto',
    numberOfFloors: 'auto',
    buildingType: 'auto',
    annualEnergyConsumption: 'calculated',
  });

  // Store OSM building data for calculations
  const [osmBuildingData, setOsmBuildingData] = useState<{
    footprintArea: number | null;
    levels: number | null;
    height: number | null;
  }>({ footprintArea: null, levels: null, height: null });

  // Calculate maximum selections across all energy systems for dynamic height
  const maxSelections = Math.max(
    heatingSelections.length,
    lightingSelections.length,
    hotWaterSelections.length,
    1 // Ventilation always has 1 selection when filled
  );

  // Base height + space for each selection row (48px per selection + 8px spacing)
  const dynamicHeight = 80 + (maxSelections * 56) + 48; // Header + selections + add button


  // Handle reset to calculated values
  const handleResetToCalculated = () => {
    if (osmBuildingData.levels) {
      form.setValue("numberOfFloors", osmBuildingData.levels);
      setFieldSources(prev => ({ ...prev, numberOfFloors: 'map' }));
    }

    if (osmBuildingData.footprintArea) {
      let totalArea: number;

      if (osmBuildingData.levels && osmBuildingData.levels > 1) {
        // Recalculate BRA using formula with top floor reduction
        totalArea = Math.round(osmBuildingData.footprintArea * (osmBuildingData.levels - 0.3));
        form.setValue("totalArea", totalArea);
        setFieldSources(prev => ({ ...prev, totalArea: 'calculated' }));
      } else {
        // Single floor
        totalArea = Math.round(osmBuildingData.footprintArea);
        form.setValue("totalArea", totalArea);
        setFieldSources(prev => ({ ...prev, totalArea: 'map' }));
      }

      // Recalculate heated area
      const heatedArea = Math.round(totalArea * 0.92);
      form.setValue("heatedArea", heatedArea);
      setFieldSources(prev => ({ ...prev, heatedArea: 'calculated' }));

      // Recalculate energy estimate
      const buildingType = form.getValues('buildingType');
      if (buildingType) {
        const energyEstimate = calculateEnergyEstimate(buildingType as BuildingType, totalArea);
        form.setValue('annualEnergyConsumption', energyEstimate);
        setFieldSources(prev => ({ ...prev, annualEnergyConsumption: 'calculated' }));
      }
    }
  };

  // Register reset handler with parent
  useEffect(() => {
    if (onResetRequest) {
      // This is a bit hacky but allows parent to trigger reset
      // A better pattern would be to use a ref, but this works for now
      (window as any).resetBuildingFormToCalculated = handleResetToCalculated;
    }
    return () => {
      if ((window as any).resetBuildingFormToCalculated) {
        delete (window as any).resetBuildingFormToCalculated;
      }
    };
  }, [osmBuildingData, onResetRequest]);

  const form = useForm<FormData>({
    resolver: zodResolver(buildingDataSchema),
    defaultValues: {
      buildingType: "",
      totalArea: 120,
      heatedArea: 110,
      buildingYear: "",
      numberOfFloors: undefined,
      annualEnergyConsumption: calculateEnergyEstimate('Kontor', 120), // Smart default based on office building
      heatingSystems: [{ value: 'Elektrisitet', percentage: 100, ranking: 'primary' }],
      lightingSystems: [{ value: 'Fluorescerende', percentage: 100, ranking: 'primary' }],
      ventilationSystem: "",
      hotWaterSystems: [{ value: 'Elektrisitet', percentage: 100, ranking: 'primary' }],
    },
  });

  // Fetch building data from OpenStreetMap when coordinates are available
  useEffect(() => {
    const fetchBuildingData = async () => {
      if (!lat || !lon) return;

      setIsFetchingBuildingData(true);
      setBuildingDataTimeout(false);

      // Create a timeout promise
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          setBuildingDataTimeout(true);
          resolve(null);
        }, 2000); // 2 second timeout
      });

      try {
        // Race between fetch and timeout
        const building = await Promise.race([
          MapDataService.fetchPrimaryBuilding(
            parseFloat(lat),
            parseFloat(lon)
          ),
          timeoutPromise
        ]);

        if (building) {
          console.log('Found building data:', building);

          // Store OSM data for later calculations
          setOsmBuildingData({
            footprintArea: building.area || null,
            levels: building.levels || null,
            height: building.height || null
          });

          // Prefill number of floors if available
          if (building.levels && building.levels >= 1) {
            form.setValue("numberOfFloors", building.levels);
            setFieldSources(prev => ({ ...prev, numberOfFloors: 'map' }));
          }

          // Set building area if available
          if (building.area && building.area > 20) { // Minimum reasonable size
            // If we have multiple floors, calculate total BRA using formula
            if (building.levels && building.levels > 1) {
              // Use formula: footprint × (floors - 0.3) to account for reduced top floor
              const totalBRA = Math.round(building.area * (building.levels - 0.3));
              form.setValue("totalArea", totalBRA);
              setFieldSources(prev => ({ ...prev, totalArea: 'calculated' }));
              setBuildingDataSource(`Hentet fra kart (${building.type}, ${building.levels} etg)`);

              // Calculate heated area
              const heatedArea = Math.round(totalBRA * 0.92);
              form.setValue("heatedArea", heatedArea);
              setFieldSources(prev => ({ ...prev, heatedArea: 'calculated' }));
            } else {
              // Single floor or no floor data - use footprint directly
              form.setValue("totalArea", Math.round(building.area));
              setFieldSources(prev => ({ ...prev, totalArea: 'map' }));
              setBuildingDataSource(`Hentet fra kart (${building.type})`);

              // Calculate heated area
              const heatedArea = Math.round(building.area * 0.92);
              form.setValue("heatedArea", heatedArea);
              setFieldSources(prev => ({ ...prev, heatedArea: 'calculated' }));
            }
          }

          // Set building type if we can map it
          const mappedType = mapOSMToBuildingType(building.type);
          if (mappedType) {
            form.setValue("buildingType", mappedType);
            setFieldSources(prev => ({ ...prev, buildingType: 'map' }));
          }
        } else if (!buildingDataTimeout) {
          console.log('No building found at this location');
          setBuildingDataSource(null);
        }
      } catch (error) {
        if (!buildingDataTimeout) {
          console.error('Failed to fetch building data:', error);
          setBuildingDataSource(null);
        }
      } finally {
        setIsFetchingBuildingData(false);
      }
    };

    fetchBuildingData();
  }, [lat, lon, form]);

  // Fetch Enova certificate data when gnr/bnr are available
  useEffect(() => {
    const fetchEnovaData = async () => {
      if (!gnr || !bnr || !address) return;

      setIsFetchingEnovaData(true);
      setEnovaDataSource(null);

      try {
        const result = await getEnovaGrade(municipalityNumber || '', gnr, bnr, bygningsnummer, address);

        if (result.found && result.certificate) {
          console.log('Found Enova certificate:', result.certificate);

          // Pre-fill form with Enova data
          const certificate = result.certificate;

          // Map building category to our building types
          const buildingTypeMapping: { [key: string]: BuildingType } = {
            'småhus': 'Småhus',
            'flerbolig': 'Flerbolig',
            'kontor': 'Kontor',
            'skole': 'Skole',
            'barnehage': 'Barnehage',
            'handel': 'Handel',
            'hotell': 'Hotell',
            'sykehus': 'Sykehus',
            'kultur': 'Kultur',
            'idrett': 'Idrett',
            'industri': 'Industri'
          };

          // Set building data from certificate
          if (certificate.building_category) {
            const mappedType = buildingTypeMapping[certificate.building_category.toLowerCase()];
            if (mappedType) {
              form.setValue("buildingType", mappedType);
            }
          }

          if (certificate.heated_area && certificate.heated_area > 0) {
            form.setValue("heatedArea", certificate.heated_area);
            form.setValue("totalArea", Math.round(certificate.heated_area * 1.1)); // Estimate total as 110% of heated
          }

          if (certificate.construction_year && certificate.construction_year > 1800) {
            // Map construction year to our year ranges
            let yearRange = "";
            if (certificate.construction_year < 1980) {
              yearRange = "before_1980";
            } else if (certificate.construction_year <= 2010) {
              yearRange = "1980_2010";
            } else {
              yearRange = "after_2010";
            }
            form.setValue("buildingYear", yearRange);
          }

          if (certificate.energy_consumption && certificate.energy_consumption > 0 && certificate.heated_area && certificate.heated_area > 0) {
            // Enova provides kWh/m²/year, so multiply by heated area to get total kWh/year
            const totalEnergyConsumption = certificate.energy_consumption * certificate.heated_area;
            form.setValue("annualEnergyConsumption", Math.round(totalEnergyConsumption));
          }

          setEnovaDataSource(`Enova energisertifikat (${result.energyGrade || 'registrert'})`);
        } else {
          console.log('No Enova certificate found for this property');
          setEnovaDataSource(null);
        }
      } catch (error) {
        console.error('Failed to fetch Enova data:', error);
        setEnovaDataSource(null);
      } finally {
        setIsFetchingEnovaData(false);
      }
    };

    fetchEnovaData();
  }, [gnr, bnr, address, form, bygningsnummer]);

  // Map OSM building types to our form options
  const mapOSMToBuildingType = (osmType: string): BuildingType | null => {
    const typeMapping: { [key: string]: BuildingType } = {
      'Kontor': 'Kontor',
      'Bolig': 'Småhus',
      'Flerbolig': 'Flerbolig',
      'Småhus': 'Småhus',
      'Enebolig': 'Småhus',
      'Industri': 'Industri',
      'Butikk': 'Handel',
      'Skole': 'Skole',
      'Sykehus': 'Sykehus',
      'Hotell': 'Hotell',
    };
    return typeMapping[osmType] || null;
  };

  // Auto-adjust heated area based on total area
  const totalAreaValue = form.watch("totalArea");
  useEffect(() => {
    if (totalAreaValue) {
      const heatedArea = Math.round(totalAreaValue * 0.9); // 90% as heated area default
      form.setValue("heatedArea", heatedArea);
    }
  }, [totalAreaValue, form]);

  const handleSubmit = async (data: FormData) => {
    if (!address) return;

    onSubmit({
      ...data,
      address,
      lat,
      lon,
      municipality,
      municipalityNumber,
      postalCode,
      gnr,
      bnr,
    });
  };

  return (
    <div className="space-y-3">
      {/* Data Source Status */}
      {(isFetchingBuildingData || isFetchingEnovaData) && (
        <div className="flex items-center gap-2 text-xs text-slate-400 p-2 bg-white/5 rounded border border-white/10">
          <Loader2 className="w-3 h-3 animate-spin" />
          {isFetchingEnovaData ? 'Henter Enova-data...' : 'Henter bygningsdata...'}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
          {/* Building Type */}
          <FormField
            control={form.control}
            name="buildingType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm">Bygningstype</FormLabel>
                <Select onValueChange={(value) => {
                  field.onChange(value);
                  setFieldSources(prev => ({ ...prev, buildingType: 'manual' }));

                  // Recalculate energy estimate if not manually entered
                  if (fieldSources.annualEnergyConsumption !== 'manual') {
                    const totalArea = form.getValues('totalArea');
                    if (totalArea && value) {
                      const energyEstimate = calculateEnergyEstimate(value as BuildingType, totalArea);
                      form.setValue('annualEnergyConsumption', energyEstimate);
                      setFieldSources(prev => ({ ...prev, annualEnergyConsumption: 'calculated' }));
                    }
                  }
                }} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Velg bygningstype" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {buildingTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Areas */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="totalArea"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm">Total BRA</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="120"
                      className="bg-white/5 border-white/20 text-white"
                      {...field}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        field.onChange(value);
                        setFieldSources(prev => ({ ...prev, totalArea: 'manual' }));

                        // Update heated area only if it's not manual
                        if (fieldSources.heatedArea !== 'manual' && value > 0) {
                          const heatedArea = Math.round(value * 0.92);
                          form.setValue("heatedArea", heatedArea);
                          setFieldSources(prev => ({ ...prev, heatedArea: 'calculated' }));
                        }

                        // Recalculate energy estimate if not manually entered
                        if (fieldSources.annualEnergyConsumption !== 'manual' && value > 0) {
                          const buildingType = form.getValues('buildingType');
                          if (buildingType) {
                            const energyEstimate = calculateEnergyEstimate(buildingType as BuildingType, value);
                            form.setValue('annualEnergyConsumption', energyEstimate);
                            setFieldSources(prev => ({ ...prev, annualEnergyConsumption: 'calculated' }));
                          }
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="heatedArea"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm">Oppvarmet</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="110"
                      className="bg-white/5 border-white/20 text-white"
                      {...field}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        field.onChange(value);
                        setFieldSources(prev => ({ ...prev, heatedArea: 'manual' }));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Building Year and Number of Floors */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="buildingYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm">Byggeår (valgfritt)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Velg byggeperiode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {buildingYearOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="numberOfFloors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm">Antall etasjer (valgfritt)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="2"
                      className="bg-white/5 border-white/20 text-white"
                      {...field}
                      onChange={(e) => {
                        const floors = Number(e.target.value);
                        field.onChange(floors);
                        setFieldSources(prev => ({ ...prev, numberOfFloors: 'manual' }));

                        // Only update BRA if it wasn't manually entered and we have real footprint data
                        if (floors && floors > 0 && fieldSources.totalArea !== 'manual' && osmBuildingData.footprintArea) {
                          // Use real footprint with top floor reduction: footprint × (floors - 0.3)
                          const totalArea = Math.round(osmBuildingData.footprintArea * (floors - 0.3));
                          form.setValue("totalArea", totalArea);
                          setFieldSources(prev => ({ ...prev, totalArea: 'calculated' }));

                          // Update heated area only if it's not manual
                          if (fieldSources.heatedArea !== 'manual') {
                            const heatedArea = Math.round(totalArea * 0.92);
                            form.setValue("heatedArea", heatedArea);
                            setFieldSources(prev => ({ ...prev, heatedArea: 'calculated' }));
                          }
                        }
                        // Don't calculate if no real footprint data - avoid fake estimates
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* SD-anlegg and Annual Energy Consumption */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="sdInstallation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm">SD-anlegg (valgfritt)</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white h-9">
                        <SelectValue placeholder="SD-anlegg" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="ja" className="text-white hover:bg-slate-700">
                          Ja
                        </SelectItem>
                        <SelectItem value="nei" className="text-white hover:bg-slate-700">
                          Nei
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="annualEnergyConsumption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm">Årlig energiforbruk</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="28200"
                      className="bg-white/5 border-white/20 text-white"
                      {...field}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        field.onChange(value);
                        setFieldSources(prev => ({ ...prev, annualEnergyConsumption: 'manual' }));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Energy Systems */}
          <div className="space-y-4">
            <h4 className="text-white font-medium text-sm border-b border-white/20 pb-1">
              Energisystemer
            </h4>

            {/* Two-column layout for energy systems with dynamic heights */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Heating Systems */}
                <div
                  className="flex flex-col transition-all duration-300 ease-in-out"
                  style={{ minHeight: `${dynamicHeight}px` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white text-sm font-medium">Oppvarmingssystemer</span>
                    <SystemInfoTooltip
                      title="Oppvarmingssystemer"
                      descriptions={heatingSystemDescriptions}
                    />
                  </div>
                  <div className="flex-1">
                    <RankedMultiSelect
                      title=""
                      options={heatingSystemOptions}
                      selections={heatingSelections}
                      onSelectionsChange={(selections) => {
                        setHeatingSelections(selections);
                        form.setValue('heatingSystems', selections);
                      }}
                      placeholder="Legg til oppvarmingskilde..."
                      maxSelections={3}
                    />
                  </div>
                </div>

                {/* Ventilation System (single select with multi-select styling) */}
                <div
                  className="flex flex-col transition-all duration-300 ease-in-out"
                  style={{ minHeight: `${dynamicHeight}px` }}
                >
                  <div className="space-y-3 flex-1">
                    {/* Header matching multi-select style */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">Ventilasjonssystem</span>
                        <SystemInfoTooltip
                          title="Ventilasjonssystemer"
                          descriptions={ventilationSystemDescriptions}
                        />
                      </div>
                      {/* Invisible spacer to match multi-select header alignment */}
                      <span className="text-xs min-w-[60px] text-right text-transparent">Total: 100%</span>
                    </div>

                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name="ventilationSystem"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="sr-only">Ventilasjonssystem</FormLabel>
                            {/* Selected item display (matching multi-select style exactly) */}
                            {field.value && (
                              <div className="flex items-center gap-2 p-2 rounded-lg border border-white/20 bg-white/5">
                                <div className="lucide lucide-grip-vertical w-4 h-4 text-slate-500 opacity-30">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="9" cy="12" r="1"></circle>
                                    <circle cx="9" cy="5" r="1"></circle>
                                    <circle cx="9" cy="19" r="1"></circle>
                                    <circle cx="15" cy="12" r="1"></circle>
                                    <circle cx="15" cy="5" r="1"></circle>
                                    <circle cx="15" cy="19" r="1"></circle>
                                  </svg>
                                </div>

                                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-w-[80px] text-emerald-400 border-emerald-400">
                                  Primær
                                </div>

                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className="w-3 h-3 rounded-full flex-shrink-0 bg-blue-400" />
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="h-8 border-none bg-transparent text-sm font-medium px-2 py-1 hover:bg-white/5 focus:ring-0 focus:ring-offset-0 [&>svg]:hidden">
                                      <SelectValue className="text-sm font-medium">
                                        {ventilationSystemOptions.find(opt => opt.value === field.value)?.label || field.value}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ventilationSystemOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-blue-400" />
                                            {option.label}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="w-16 h-8 text-center text-sm text-white bg-white/5 border border-white/20 rounded flex items-center justify-center">100</span>
                                  <span className="text-sm text-slate-400">%</span>
                                </div>

                                {/* Empty space where delete button would be for alignment */}
                                <div className="w-8 h-8"></div>
                              </div>
                            )}

                            {/* Add button when no selection */}
                            {!field.value && (
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="w-full justify-start text-muted-foreground border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground">
                                  <SelectValue placeholder="Velg ventilasjonssystem" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ventilationSystemOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-blue-400" />
                                        {option.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Lighting Systems */}
                <div
                  className="flex flex-col transition-all duration-300 ease-in-out"
                  style={{ minHeight: `${dynamicHeight}px` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white text-sm font-medium">Belysningssystemer</span>
                    <SystemInfoTooltip
                      title="Belysningssystemer"
                      descriptions={lightingSystemDescriptions}
                    />
                  </div>
                  <div className="flex-1">
                    <RankedMultiSelect
                      title=""
                      options={lightingSystemOptions}
                      selections={lightingSelections}
                      onSelectionsChange={(selections) => {
                        setLightingSelections(selections);
                        form.setValue('lightingSystems', selections);
                      }}
                      placeholder="Legg til belysningstype..."
                      maxSelections={3}
                    />
                  </div>
                </div>

                {/* Hot Water Systems */}
                <div
                  className="flex flex-col transition-all duration-300 ease-in-out"
                  style={{ minHeight: `${dynamicHeight}px` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white text-sm font-medium">Varmtvannssystemer</span>
                    <SystemInfoTooltip
                      title="Varmtvannssystemer"
                      descriptions={hotWaterSystemDescriptions}
                    />
                  </div>
                  <div className="flex-1">
                    <RankedMultiSelect
                      title=""
                      options={hotWaterSystemOptions}
                      selections={hotWaterSelections}
                      onSelectionsChange={(selections) => {
                        setHotWaterSelections(selections);
                        form.setValue('hotWaterSystems', selections);
                      }}
                      placeholder="Legg til varmtvannskilde..."
                      maxSelections={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              size="sm"
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Beregner...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Start energianalyse
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}