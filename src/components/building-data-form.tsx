"use client"

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RankedMultiSelect, RankedSelection, RankedOption } from '@/components/ui/ranked-multi-select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BuildingType,
  HeatingSystem,
  LightingSystem,
  VentilationSystem,
  HotWaterSystem,
  BuildingDataForm,
  EnergySource
} from '@/types/norwegian-energy'

// Convert energy source types to ranked options
const heatingOptions: RankedOption[] = [
  { value: 'Elektrisitet', label: 'Elektrisitet (direkte)' },
  { value: 'Varmepumpe', label: 'Varmepumpe (luft/luft eller luft/vann)' },
  { value: 'Bergvarme', label: 'Bergvarme/jordvarme' },
  { value: 'Fjernvarme', label: 'Fjernvarme' },
  { value: 'Biobrensel', label: 'Biobrensel (ved/pellets)' },
  { value: 'Olje', label: 'Oljefyring' },
  { value: 'Gass', label: 'Gassfyring' },
]

const lightingOptions: RankedOption[] = [
  { value: 'LED', label: 'LED' },
  { value: 'Fluorescerende', label: 'Fluorescerende/sparepærer' },
  { value: 'Halogen', label: 'Halogen' },
  { value: 'Glødepære', label: 'Glødepære (tradisjonell)' },
]

const hotWaterOptions: RankedOption[] = [
  { value: 'Elektrisitet', label: 'Elektrisk varmtvannsbereder' },
  { value: 'Varmepumpe', label: 'Varmepumpevannvarmer' },
  { value: 'Solvarme', label: 'Solfanger' },
  { value: 'Fjernvarme', label: 'Fjernvarme' },
  { value: 'Olje', label: 'Oljefyring' },
  { value: 'Gass', label: 'Gassfyring' },
]

const buildingTypes: BuildingType[] = [
  'Småhus', 'Flerbolig', 'Kontor', 'Handel', 'Hotell',
  'Skole', 'Universitet', 'Sykehus', 'Barnehage',
  'Kultur', 'Idrett', 'Industri', 'Andre'
]

const ventilationSystems: VentilationSystem[] = [
  'Naturlig',
  'Mekanisk tilluft',
  'Mekanisk fraluft',
  'Balansert med varmegjenvinning',
  'Balansert uten varmegjenvinning'
]

const formSchema = z.object({
  buildingType: z.string(),
  totalArea: z.number().min(1).max(100000),
  heatedArea: z.number().min(1).max(100000),
  buildingYear: z.number().min(1800).max(new Date().getFullYear()).optional(),
  ventilationSystem: z.string(),
})

interface BuildingDataFormComponentProps {
  onSubmit: (data: BuildingDataForm) => void
  initialData?: Partial<BuildingDataForm>
}

export function BuildingDataFormComponent({
  onSubmit,
  initialData
}: BuildingDataFormComponentProps) {
  const [heatingSelections, setHeatingSelections] = React.useState<RankedSelection[]>(
    initialData?.heatingSystems?.map(s => ({
      value: s.type,
      percentage: s.percentage,
      ranking: s.ranking
    })) || []
  )

  const [lightingSelections, setLightingSelections] = React.useState<RankedSelection[]>(
    initialData?.lightingSystems?.map(s => ({
      value: s.type,
      percentage: s.percentage,
      ranking: s.ranking
    })) || []
  )

  const [hotWaterSelections, setHotWaterSelections] = React.useState<RankedSelection[]>(
    initialData?.hotWaterSystems?.map(s => ({
      value: s.type,
      percentage: s.percentage,
      ranking: s.ranking
    })) || []
  )

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      buildingType: initialData?.buildingType || 'Kontor',
      totalArea: initialData?.totalArea || 0,
      heatedArea: initialData?.heatedArea || 0,
      buildingYear: initialData?.buildingYear,
      ventilationSystem: initialData?.ventilationSystem || 'Balansert med varmegjenvinning',
    }
  })

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const formData: BuildingDataForm = {
      buildingType: values.buildingType as BuildingType,
      totalArea: values.totalArea,
      heatedArea: values.heatedArea,
      buildingYear: values.buildingYear,
      heatingSystems: heatingSelections.map(s => ({
        type: s.value as HeatingSystem,
        percentage: s.percentage,
        ranking: s.ranking
      })),
      lightingSystems: lightingSelections.map(s => ({
        type: s.value as LightingSystem,
        percentage: s.percentage,
        ranking: s.ranking
      })),
      ventilationSystem: values.ventilationSystem as VentilationSystem,
      hotWaterSystems: hotWaterSelections.map(s => ({
        type: s.value as HotWaterSystem,
        percentage: s.percentage,
        ranking: s.ranking
      }))
    }

    onSubmit(formData)
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white">
            Bygningsinformasjon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buildingType">Bygningstype</Label>
              <Select
                value={form.watch('buildingType')}
                onValueChange={(value) => form.setValue('buildingType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg bygningstype" />
                </SelectTrigger>
                <SelectContent>
                  {buildingTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="buildingYear">Byggeår</Label>
              <Input
                {...form.register('buildingYear', { valueAsNumber: true })}
                type="number"
                placeholder="F.eks. 1985"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalArea">Total BRA (m²)</Label>
              <Input
                {...form.register('totalArea', { valueAsNumber: true })}
                type="number"
                placeholder="F.eks. 1200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="heatedArea">Oppvarmet areal (m²)</Label>
              <Input
                {...form.register('heatedArea', { valueAsNumber: true })}
                type="number"
                placeholder="F.eks. 1000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white">
            Energisystemer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RankedMultiSelect
            title="Oppvarmingssystemer"
            options={heatingOptions}
            selections={heatingSelections}
            onSelectionsChange={setHeatingSelections}
            placeholder="Legg til oppvarmingskilde..."
            maxSelections={4}
          />

          <RankedMultiSelect
            title="Belysningssystemer"
            options={lightingOptions}
            selections={lightingSelections}
            onSelectionsChange={setLightingSelections}
            placeholder="Legg til belysningstype..."
            maxSelections={3}
          />

          <div className="space-y-2">
            <Label htmlFor="ventilationSystem">Ventilasjonssystem</Label>
            <Select
              value={form.watch('ventilationSystem')}
              onValueChange={(value) => form.setValue('ventilationSystem', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Velg ventilasjonssystem" />
              </SelectTrigger>
              <SelectContent>
                {ventilationSystems.map(system => (
                  <SelectItem key={system} value={system}>{system}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <RankedMultiSelect
            title="Varmtvannssystemer"
            options={hotWaterOptions}
            selections={hotWaterSelections}
            onSelectionsChange={setHotWaterSelections}
            placeholder="Legg til varmtvannskilde..."
            maxSelections={3}
          />
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-900 font-bold hover:shadow-lg"
      >
        Analyser energiforbruk
      </Button>
    </form>
  )
}