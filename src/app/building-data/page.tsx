'use client';

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building, Zap, ArrowRight, Loader2, CheckCircle, MapPin } from "lucide-react";
import { BuildingType, HeatingSystem, LightingSystem, VentilationSystem, HotWaterSystem } from "@/types/norwegian-energy";
import MapDataService from "@/services/map-data.service";
import { getEnovaGrade } from "@/services/enova.service";

// Form validation schema
const buildingDataSchema = z.object({
  buildingType: z.string().min(1, "Bygningstype er påkrevd"),
  totalArea: z.number().min(20, "Minimum 20 m²").max(50000, "Maksimum 50,000 m²"),
  heatedArea: z.number().min(10, "Minimum 10 m²").max(50000, "Maksimum 50,000 m²"),
  buildingYear: z.number().min(1800, "Minimum 1800").max(new Date().getFullYear(), "Kan ikke være i fremtiden").optional(),
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

export default function BuildingDataPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const municipality = searchParams.get('municipality');
  const municipalityNumber = searchParams.get('municipalityNumber');
  const postalCode = searchParams.get('postalCode');
  const gnr = searchParams.get('gnr');
  const bnr = searchParams.get('bnr');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        const result = await getEnovaGrade(address, gnr, bnr);

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

          if (certificate.energy_consumption && certificate.energy_consumption > 0) {
            form.setValue("annualEnergyConsumption", certificate.energy_consumption);
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
  }, [gnr, bnr, address, form]);

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

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

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
        buildingType: data.buildingType,
        totalArea: data.totalArea.toString(),
        heatedArea: data.heatedArea.toString(),
        annualEnergyConsumption: data.annualEnergyConsumption.toString(),
        heatingSystem: data.heatingSystem,
        lightingSystem: data.lightingSystem,
        ventilationSystem: data.ventilationSystem,
        hotWaterSystem: data.hotWaterSystem,
        ...(data.buildingYear && { buildingYear: data.buildingYear.toString() }),
      });

      router.push(`/dashboard?${queryParams.toString()}`);
    } catch (error) {
      console.error('Failed to submit building data:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="aurora-card max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-foreground mb-4">Ingen adresse valgt</h2>
            <p className="text-muted-foreground mb-6">Du må først søke og velge en adresse.</p>
            <Button onClick={() => router.push('/')} className="bg-primary hover:bg-primary/90">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tilbake til søk
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tilbake til søk
            </Button>
            <div className="flex items-center space-x-2">
              <Zap className="w-8 h-8 text-cyan-400" />
              <span className="text-2xl font-bold text-foreground">SkiplumXGE</span>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Steg 2 av 3
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Progress indicator */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-emerald-400 mr-2" />
              Adresse valgt
            </div>
            <div className="flex items-center text-cyan-400 font-medium">
              <Building className="w-4 h-4 mr-2" />
              Bygningsdata
            </div>
            <div className="flex items-center text-muted-foreground">
              <ArrowRight className="w-4 h-4 mr-2" />
              Energianalyse
            </div>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div className="bg-primary h-2 rounded-full w-2/3 transition-all duration-300"></div>
          </div>
        </div>

        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bygningsinformasjon
          </h1>
          <p className="text-muted-foreground mb-4">
            Fortell oss om bygningen for nøyaktig energianalyse
          </p>
          <div className="max-w-md mx-auto p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-md">
            <div className="text-cyan-400 text-sm font-medium mb-2">Valgt adresse:</div>
            <div className="text-foreground text-base font-medium mb-3">{address}</div>

            {/* Property details in a grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {municipality && (
                <div>
                  <span className="text-gray-400">Kommune:</span>
                  <span className="text-foreground ml-2">{municipality}</span>
                </div>
              )}
              {municipalityNumber && (
                <div>
                  <span className="text-gray-400">Kommunenr:</span>
                  <span className="text-foreground ml-2">{municipalityNumber}</span>
                </div>
              )}
              {postalCode && postalCode !== 'undefined' && (
                <div>
                  <span className="text-gray-400">Postnr:</span>
                  <span className="text-foreground ml-2">{postalCode}</span>
                </div>
              )}
              {gnr && (
                <div>
                  <span className="text-gray-400">Gnr:</span>
                  <span className="text-foreground ml-2">{gnr}</span>
                </div>
              )}
              {bnr && (
                <div>
                  <span className="text-gray-400">Bnr:</span>
                  <span className="text-foreground ml-2">{bnr}</span>
                </div>
              )}
            </div>

            {/* Data fetch status indicators */}
            {(isFetchingBuildingData || isFetchingEnovaData) && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-cyan-500/20 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                {isFetchingEnovaData ? 'Henter Enova-data...' : 'Henter bygningsdata...'}
              </div>
            )}

            {enovaDataSource && !isFetchingEnovaData && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-cyan-500/20 text-xs text-emerald-400">
                <CheckCircle className="w-3 h-3" />
                {enovaDataSource}
              </div>
            )}

            {buildingDataSource && !isFetchingBuildingData && !enovaDataSource && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-cyan-500/20 text-xs text-emerald-400">
                <CheckCircle className="w-3 h-3" />
                {buildingDataSource}
              </div>
            )}
          </div>
        </div>

        {/* Building Data Form */}
        <div className="max-w-4xl mx-auto">
          <Card className="aurora-card">
            <CardHeader className="pt-8">
              <CardTitle className="text-foreground flex items-center gap-2">
                <Building className="w-6 h-6 text-cyan-400" />
                Bygningsdetaljer
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Alle felt er påkrevd for nøyaktig TEK17-analyse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Building Type */}
                  <FormField
                    control={form.control}
                    name="buildingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Bygningstype</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
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
                        <FormDescription className="text-muted-foreground">
                          Påvirker TEK17-krav og energiberegninger
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Areas */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="totalArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Total BRA (bruksareal)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="120"
                              className=""
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription className="text-muted-foreground">
                            Kvadratmeter (m²) {buildingDataSource && "• Auto-utfylt fra kartdata"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="heatedArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Oppvarmet areal</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="110"
                              className=""
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription className="text-muted-foreground">
                            Kvadratmeter (m²) - justeres automatisk til 90% av BRA
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Building Year */}
                  <FormField
                    control={form.control}
                    name="buildingYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Byggeår (valgfritt)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="2000"
                            className=""
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription className="text-muted-foreground">
                          Påvirker forventede energikrav og isolasjonsstandard
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Annual Energy Consumption */}
                  <FormField
                    control={form.control}
                    name="annualEnergyConsumption"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Årlig energiforbruk</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="15000"
                            className=""
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription className="text-muted-foreground">
                          kWh per år - fra strømregning eller målerdata (siste 12 måneder)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Energy Systems */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                      Energisystemer
                    </h3>

                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="heatingSystem"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Oppvarmingssystem</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
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
                            <FormLabel className="text-foreground">Belysningssystem</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
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
                            <FormLabel className="text-foreground">Ventilasjonssystem</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
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
                            <FormLabel className="text-foreground">Varmtvannssystem</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
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
                  <div className="flex justify-center pt-6 pb-8">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isSubmitting}
                      className="bg-primary hover:bg-primary/90 px-8 py-4 text-lg min-w-[200px]"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Beregner...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-5 h-5 mr-2" />
                          Start energianalyse
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-20 border-t border-border">
        <div className="text-center text-muted-foreground">
          <p>SkiplumXGE - Drevet av Skiplum | Data fra Kartverket, SSB, SINTEF og Enova</p>
        </div>
      </footer>
    </div>
  );
}