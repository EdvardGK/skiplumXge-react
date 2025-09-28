"use client"

import * as React from "react"
import { GripVertical, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// ============= TYPE DEFINITIONS =============

export interface BaseOption {
  value: string
  label: string
  color?: string
  icon?: React.ComponentType<{ className?: string }>
}

// Selection modes with specific constraints
export type SelectionMode =
  | "energy-percentage"    // Energy systems that must total 100%
  | "insulation"           // Insulation with thickness (mm) and U-value
  | "window-door"          // Windows/doors with quantity and U-value
  | "equipment-quantity"   // Equipment with quantity and installation year
  | "control-systems"      // Control systems (simple selection)
  | "sensors"             // IoT sensors (simple selection)

// Context-specific selection types
export interface EnergySelection {
  value: string
  percentage: number
  ranking: 'primary' | 'secondary' | 'tertiary'
}

export interface InsulationSelection {
  value: string
  thickness: number  // mm
  uValue: number    // W/m²K
}

export interface WindowDoorSelection {
  value: string
  quantity: number
  uValue: number    // W/m²K
}

export interface EquipmentSelection {
  value: string
  quantity: number
  year: number
}

export interface SimpleSelection {
  value: string
}

export type ContextualSelection =
  | EnergySelection
  | InsulationSelection
  | WindowDoorSelection
  | EquipmentSelection
  | SimpleSelection

// ============= CONFIGURATION =============

interface SelectionModeConfig {
  mode: SelectionMode
  emptyText: string
  addButtonText: string
  inputLabels?: {
    primary?: string
    secondary?: string
    unit1?: string
    unit2?: string
  }
  validation?: {
    min?: number
    max?: number
    step?: number
    totalMustEqual?: number
  }
  maxSelections?: number
  showRanking?: boolean
  showDragHandle?: boolean
}

const MODE_CONFIGS: Record<SelectionMode, SelectionModeConfig> = {
  "energy-percentage": {
    mode: "energy-percentage",
    emptyText: "Ingen energikilder valgt",
    addButtonText: "Legg til energikilde",
    inputLabels: {
      unit1: "%"
    },
    validation: {
      min: 0,
      max: 100,
      totalMustEqual: 100
    },
    maxSelections: 3,
    showRanking: true,
    showDragHandle: true
  },
  "insulation": {
    mode: "insulation",
    emptyText: "Ingen isolasjon registrert",
    addButtonText: "Legg til isolasjon",
    inputLabels: {
      primary: "Tykkelse",
      secondary: "U-verdi",
      unit1: "mm",
      unit2: "W/m²K"
    },
    validation: {
      min: 0,
      max: 1000,
      step: 10
    },
    maxSelections: 2,
    showRanking: false,
    showDragHandle: false
  },
  "window-door": {
    mode: "window-door",
    emptyText: "Ingen registrert",
    addButtonText: "Legg til",
    inputLabels: {
      primary: "Antall",
      secondary: "U-verdi",
      unit1: "stk",
      unit2: "W/m²K"
    },
    validation: {
      min: 0,
      max: 100,
      step: 1
    },
    maxSelections: 5,
    showRanking: false,
    showDragHandle: false
  },
  "equipment-quantity": {
    mode: "equipment-quantity",
    emptyText: "Ingen utstyr registrert",
    addButtonText: "Legg til utstyr",
    inputLabels: {
      primary: "Antall",
      secondary: "År",
      unit1: "stk",
      unit2: ""
    },
    validation: {
      min: 0,
      max: 100,
      step: 1
    },
    maxSelections: 5,
    showRanking: false,
    showDragHandle: false
  },
  "control-systems": {
    mode: "control-systems",
    emptyText: "Ingen styringssystemer registrert",
    addButtonText: "Legg til system",
    maxSelections: 3,
    showRanking: false,
    showDragHandle: false
  },
  "sensors": {
    mode: "sensors",
    emptyText: "Ingen sensorer registrert",
    addButtonText: "Legg til sensor",
    maxSelections: 6,
    showRanking: false,
    showDragHandle: false
  }
}

// ============= COMPONENT PROPS =============

interface ContextualMultiSelectProps {
  mode: SelectionMode
  options: BaseOption[]
  selections: ContextualSelection[]
  onSelectionsChange: (selections: ContextualSelection[]) => void
  title?: string
  className?: string
  disabled?: boolean
  tekRequirement?: string // e.g., "TEK17: ≤ 0.18"
  customConfig?: Partial<SelectionModeConfig>
}

// ============= HELPER FUNCTIONS =============

function getColorForOption(value: string): string {
  const energyColors: Record<string, string> = {
    // Heating sources
    'Elektrisitet': '#fbbf24',
    'Varmepumpe luft-luft': '#34d399',
    'Varmepumpe luft-vann': '#10b981',
    'Bergvarme': '#c084fc',
    'Fjernvarme': '#f87171',
    'Biobrensel': '#a78bfa',
    'Olje': '#64748b',
    'Gass': '#60a5fa',
    // Insulation
    'Mineralull': '#94a3b8',
    'EPS': '#cbd5e1',
    'XPS': '#93c5fd',
    'Polyuretan': '#c7d2fe',
    // Default
    default: '#94a3b8',
  }
  return energyColors[value] || energyColors.default
}

function isEnergySelection(sel: ContextualSelection): sel is EnergySelection {
  return 'percentage' in sel && 'ranking' in sel
}

function isInsulationSelection(sel: ContextualSelection): sel is InsulationSelection {
  return 'thickness' in sel && 'uValue' in sel
}

function isWindowDoorSelection(sel: ContextualSelection): sel is WindowDoorSelection {
  return 'quantity' in sel && 'uValue' in sel && !('year' in sel)
}

function isEquipmentSelection(sel: ContextualSelection): sel is EquipmentSelection {
  return 'quantity' in sel && 'year' in sel
}

// ============= MAIN COMPONENT =============

export function ContextualMultiSelect({
  mode,
  options,
  selections,
  onSelectionsChange,
  title,
  className,
  disabled = false,
  tekRequirement,
  customConfig
}: ContextualMultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const config = { ...MODE_CONFIGS[mode], ...customConfig }

  const availableOptions = options.filter(
    opt => !selections.some(sel => sel.value === opt.value)
  )

  const handleAddItem = (value: string) => {
    const option = options.find(opt => opt.value === value)
    if (!option) return

    let newSelection: ContextualSelection

    switch (mode) {
      case "energy-percentage":
        const energySelections = selections as EnergySelection[]
        let percentage = 0
        let ranking: 'primary' | 'secondary' | 'tertiary' = 'primary'

        if (energySelections.length === 0) {
          percentage = 100
        } else if (energySelections.length === 1) {
          percentage = 20
          ranking = 'secondary'
        } else {
          percentage = 5
          ranking = 'tertiary'
        }

        newSelection = {
          value,
          percentage,
          ranking
        } as EnergySelection
        break

      case "insulation":
        newSelection = {
          value,
          thickness: 200,
          uValue: 0.18
        } as InsulationSelection
        break

      case "window-door":
        newSelection = {
          value,
          quantity: 1,
          uValue: 0.80
        } as WindowDoorSelection
        break

      case "equipment-quantity":
        newSelection = {
          value,
          quantity: 1,
          year: new Date().getFullYear()
        } as EquipmentSelection
        break

      default:
        newSelection = { value } as SimpleSelection
    }

    onSelectionsChange([...selections, newSelection])
    setIsOpen(false)
  }

  const handleRemoveItem = (index: number) => {
    const newSelections = selections.filter((_, i) => i !== index)

    // Recalculate percentages for energy systems
    if (mode === "energy-percentage" && newSelections.length > 0) {
      const energySelections = newSelections as EnergySelection[]
      const removedPercentage = (selections[index] as EnergySelection).percentage || 0

      if (energySelections.length === 1) {
        energySelections[0].percentage = 100
        energySelections[0].ranking = 'primary'
      } else {
        // Distribute removed percentage proportionally
        const totalOther = energySelections.reduce((sum, sel) => sum + sel.percentage, 0)
        energySelections.forEach((sel, i) => {
          sel.percentage = Math.round(sel.percentage + (sel.percentage / totalOther) * removedPercentage)
          sel.ranking = i === 0 ? 'primary' : i === 1 ? 'secondary' : 'tertiary'
        })
      }
    }

    onSelectionsChange(newSelections)
  }

  const handleUpdateSelection = (index: number, updates: Partial<ContextualSelection>) => {
    const newSelections = [...selections]
    newSelections[index] = { ...newSelections[index], ...updates }
    onSelectionsChange(newSelections)
  }

  // Calculate total percentage for energy systems
  const totalPercentage = mode === "energy-percentage"
    ? selections.reduce((sum, sel) => sum + ((sel as EnergySelection).percentage || 0), 0)
    : 0

  const showPercentageWarning = mode === "energy-percentage" &&
    totalPercentage !== 100 &&
    selections.length > 0

  return (
    <div className={cn("space-y-2", className)}>
      {/* Title and total percentage */}
      {(title || showPercentageWarning) && (
        <div className="flex items-center justify-between">
          {title && <Label className="text-sm font-medium">{title}</Label>}
          {showPercentageWarning && (
            <span className={cn(
              "text-xs min-w-[60px] text-right",
              totalPercentage > 100 ? "text-red-400" : "text-yellow-400"
            )}>
              Total: {totalPercentage}%
            </span>
          )}
        </div>
      )}

      {/* Selection items */}
      <div className="space-y-2">
        {selections.map((selection, index) => {
          const option = options.find(opt => opt.value === selection.value)
          if (!option) return null

          return (
            <div
              key={selection.value}
              className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg border border-white/20 bg-white/5"
            >
              {/* Drag handle and ranking */}
              {config.showDragHandle && (
                <GripVertical className="w-4 h-4 text-slate-500 cursor-move hidden sm:block" />
              )}

              {config.showRanking && isEnergySelection(selection) && (
                <Badge
                  variant="outline"
                  className={cn(
                    "hidden lg:inline-flex min-w-[80px]",
                    selection.ranking === 'primary' ? "text-emerald-400 border-emerald-400" :
                    selection.ranking === 'secondary' ? "text-cyan-400 border-cyan-400" :
                    "text-slate-400 border-slate-400"
                  )}
                >
                  {selection.ranking === 'primary' ? 'Primær' :
                   selection.ranking === 'secondary' ? 'Sekundær' : 'Andre'}
                </Badge>
              )}

              {/* Option selector */}
              <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getColorForOption(selection.value) }}
                />
                <span className="text-sm font-medium flex-1">
                  {option.label}
                </span>
              </div>

              {/* Context-specific inputs */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                {mode === "energy-percentage" && isEnergySelection(selection) && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={selection.percentage}
                      onChange={(e) => handleUpdateSelection(index, { percentage: parseInt(e.target.value) || 0 })}
                      className="w-16 h-8 text-center bg-white/5 border-white/20 text-white"
                      min={0}
                      max={100}
                      disabled={disabled}
                    />
                    <span className="text-sm text-slate-400">%</span>
                  </div>
                )}

                {mode === "insulation" && isInsulationSelection(selection) && (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={selection.thickness}
                        onChange={(e) => handleUpdateSelection(index, { thickness: parseInt(e.target.value) || 0 })}
                        className="w-20 h-8 text-center bg-white/5 border-white/20 text-white"
                        min={0}
                        step={10}
                        disabled={disabled}
                      />
                      <span className="text-sm text-slate-400">mm</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={selection.uValue}
                        onChange={(e) => handleUpdateSelection(index, { uValue: parseFloat(e.target.value) || 0 })}
                        className="w-20 h-8 text-center bg-white/5 border-white/20 text-white"
                        min={0}
                        max={5}
                        disabled={disabled}
                      />
                      <span className="text-sm text-slate-400">W/m²K</span>
                    </div>
                  </>
                )}

                {mode === "window-door" && isWindowDoorSelection(selection) && (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={selection.quantity}
                        onChange={(e) => handleUpdateSelection(index, { quantity: parseInt(e.target.value) || 0 })}
                        className="w-16 h-8 text-center bg-white/5 border-white/20 text-white"
                        min={0}
                        disabled={disabled}
                      />
                      <span className="text-sm text-slate-400">stk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={selection.uValue}
                        onChange={(e) => handleUpdateSelection(index, { uValue: parseFloat(e.target.value) || 0 })}
                        className="w-20 h-8 text-center bg-white/5 border-white/20 text-white"
                        min={0}
                        max={5}
                        disabled={disabled}
                      />
                      <span className="text-sm text-slate-400">W/m²K</span>
                    </div>
                  </>
                )}

                {mode === "equipment-quantity" && isEquipmentSelection(selection) && (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={selection.quantity}
                        onChange={(e) => handleUpdateSelection(index, { quantity: parseInt(e.target.value) || 0 })}
                        className="w-16 h-8 text-center bg-white/5 border-white/20 text-white"
                        min={0}
                        disabled={disabled}
                      />
                      <span className="text-sm text-slate-400">stk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={selection.year}
                        onChange={(e) => handleUpdateSelection(index, { year: parseInt(e.target.value) || 0 })}
                        className="w-20 h-8 text-center bg-white/5 border-white/20 text-white"
                        min={1900}
                        max={2100}
                        disabled={disabled}
                      />
                      <span className="text-sm text-slate-400">år</span>
                    </div>
                  </>
                )}

                {tekRequirement && (mode === "insulation" || mode === "window-door") && (
                  <span className="text-xs text-emerald-400 sm:ml-2">
                    {tekRequirement}
                  </span>
                )}
              </div>

              {/* Delete button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveItem(index)}
                disabled={disabled}
                className="h-8 w-8 p-0 self-start sm:self-center"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          )
        })}

        {/* Add button */}
        {selections.length < (config.maxSelections || 10) && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                disabled={disabled || availableOptions.length === 0}
              >
                <Plus className="w-3 h-3 mr-1.5" />
                {config.addButtonText}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start" style={{ zIndex: 9999 }}>
              <div className="p-2 space-y-1">
                {availableOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant="ghost"
                    className="w-full justify-start h-auto p-2"
                    onClick={() => handleAddItem(option.value)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getColorForOption(option.value) }}
                      />
                      <span className="text-sm">{option.label}</span>
                    </div>
                  </Button>
                ))}
                {availableOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Ingen flere alternativer tilgjengelig
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Empty state */}
      {selections.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-white/20 rounded-lg">
          {config.emptyText}
        </p>
      )}
    </div>
  )
}