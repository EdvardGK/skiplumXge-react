'use client';

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { BuildingType, HeatingSystem, LightingSystem, VentilationSystem, HotWaterSystem } from "@/types/norwegian-energy";
import MapDataService from "@/services/map-data.service";
import { getEnovaGrade } from "@/services/enova.service";

// Form validation schema
const buildingDataSchema = z.object({
  buildingType: z.string().min(1, "Bygningstype er påkrevd"),
  totalArea: z.number().min(20, "Minimum 20 m²").max(50000, "Maksimum 50,000 m²"),
  heatedArea: z.number().min(10, "Minimum 10 m²").max(50000, "Maksimum 50,000 m²"),
  buildingYear: z.number().min(1800, "Minimum 1800").max(new Date().getFullYear(), "Kan ikke være i fremtiden").optional(),
  numberOfFloors: z.number().min(1, "Minimum 1 etasje").max(100, "Maksimum 100 etasjer").optional(),
  sdInstallation: z.enum(["ja", "nei"]).optional(),
  annualEnergyConsumption: z.number().min(1000, "Minimum 1000 kWh/år").max(1000000, "Maksimum 1,000,000 kWh/år"),
  heatingSystem: z.string().min(1, "Oppvarmingssystem er påkrevd"),
  lightingSystem: z.string().min(1, "Belysningssystem er påkrevd"),
  ventilationSystem: z.string().min(1, "Ventilasjonssystem er påkrevd"),
  hotWaterSystem: z.string().min(1, "Varmtvannssystem er påkrevd"),
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

const heatingSystemOptions: { value: HeatingSystem; label: string }[] = [
  { value: 'Elektrisitet', label: 'Elektrisk oppvarming (panelovner, kabler)' },
  { value: 'Varmepumpe', label: 'Varmepumpe (luft-luft, luft-vann)' },
  { value: 'Bergvarme', label: 'Bergvarme / jordvarme' },
  { value: 'Fjernvarme', label: 'Fjernvarme' },
  { value: 'Biobrensel', label: 'Biobrensel (ved, pellets)' },
  { value: 'Olje', label: 'Fyringsolje' },
  { value: 'Gass', label: 'Naturgass' },
];

const lightingSystemOptions: { value: LightingSystem; label: string }[] = [
  { value: 'LED', label: 'LED-belysning' },
  { value: 'Fluorescerende', label: 'Fluorescerende lys (lysstofrør)' },
  { value: 'Halogen', label: 'Halogenpærer' },
  { value: 'Glødepære', label: 'Glødepærer' },
];

const ventilationSystemOptions: { value: VentilationSystem; label: string }[] = [
  { value: 'Naturlig', label: 'Naturlig ventilasjon (vinduer, ventiler)' },
  { value: 'Mekanisk tilluft', label: 'Mekanisk tilluft' },
  { value: 'Mekanisk fraluft', label: 'Mekanisk fraluft' },
  { value: 'Balansert med varmegjenvinning', label: 'Balansert ventilasjon med varmegjenvinning' },
  { value: 'Balansert uten varmegjenvinning', label: 'Balansert ventilasjon uten varmegjenvinning' },
];

const hotWaterSystemOptions: { value: HotWaterSystem; label: string }[] = [
  { value: 'Elektrisitet', label: 'Elektrisk varmtvannsbereder' },
  { value: 'Varmepumpe', label: 'Varmepumpe for varmtvann' },
  { value: 'Solvarme', label: 'Solvarme' },
  { value: 'Fjernvarme', label: 'Fjernvarme' },
  { value: 'Olje', label: 'Fyringsolje' },
  { value: 'Gass', label: 'Naturgass' },
];

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
  isSubmitting = false
}: BuildingDataFormProps) {
  const [isFetchingBuildingData, setIsFetchingBuildingData] = useState(false);
  const [buildingDataSource, setBuildingDataSource] = useState<string | null>(null);
  const [buildingDataTimeout, setBuildingDataTimeout] = useState(false);
  const [isFetchingEnovaData, setIsFetchingEnovaData] = useState(false);
  const [enovaDataSource, setEnovaDataSource] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(buildingDataSchema),
    defaultValues: {
      buildingType: "",
      totalArea: 120,
      heatedArea: 110,
      buildingYear: 2000,
      numberOfFloors: undefined,
      annualEnergyConsumption: 15000,
      heatingSystem: "",
      lightingSystem: "",
      ventilationSystem: "",
      hotWaterSystem: "",
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

          // Set building area if available
          if (building.area && building.area > 20) { // Minimum reasonable size
            form.setValue("totalArea", Math.round(building.area));
            setBuildingDataSource(`Hentet fra kart (${building.type})`);
          }

          // Set building type if we can map it
          const mappedType = mapOSMToBuildingType(building.type);
          if (mappedType) {
            form.setValue("buildingType", mappedType);
          }

          // Set building levels if available (estimate from levels)
          if (building.levels && building.levels >= 1) {
            // Very rough estimate: 120m² per level for typical buildings
            const estimatedArea = building.levels * 120;
            if (!building.area || building.area < 50) {
              // Only use level-based estimate if we don't have footprint area
              form.setValue("totalArea", estimatedArea);
              setBuildingDataSource(`Hentet fra kart (${building.levels} etasjer)`);
            }
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
            form.setValue("buildingYear", certificate.construction_year);
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
                <Select onValueChange={field.onChange} value={field.value}>
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
                      onChange={(e) => field.onChange(Number(e.target.value))}
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
                      onChange={(e) => field.onChange(Number(e.target.value))}
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
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="2000"
                      className="bg-white/5 border-white/20 text-white"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
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

                        // Update BRA and heated BRA based on floors
                        if (floors && floors > 0) {
                          // Typical floor area for Norwegian buildings: 120-150 m² per floor
                          const estimatedTotalArea = floors * 130; // Use 130 m² as average
                          const estimatedHeatedArea = Math.round(estimatedTotalArea * 0.92); // 92% heated

                          form.setValue("totalArea", estimatedTotalArea);
                          form.setValue("heatedArea", estimatedHeatedArea);
                        }
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
                      placeholder="15000"
                      className="bg-white/5 border-white/20 text-white"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Energy Systems */}
          <div className="space-y-2">
            <h4 className="text-white font-medium text-sm border-b border-white/20 pb-1">
              Energisystemer
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="heatingSystem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm">Oppvarming</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Velg oppvarmingssystem" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {heatingSystemOptions.map((option) => (
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
                name="lightingSystem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm">Belysning</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Velg belysningssystem" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {lightingSystemOptions.map((option) => (
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
                name="ventilationSystem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm">Ventilasjon</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Velg ventilasjonssystem" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ventilationSystemOptions.map((option) => (
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
                name="hotWaterSystem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm">Varmtvann</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Velg varmtvannssystem" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {hotWaterSystemOptions.map((option) => (
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