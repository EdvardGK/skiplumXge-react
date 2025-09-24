"use client"

import * as React from "react"
import { GripVertical, Plus, Trash2, ChevronDown } from "lucide-react"
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

export interface RankedOption {
  value: string
  label: string
  color?: string
  icon?: React.ComponentType<{ className?: string }>
}

export interface RankedSelection {
  value: string
  percentage: number
  ranking: 'primary' | 'secondary' | 'tertiary'
}

interface RankedMultiSelectProps {
  options: RankedOption[]
  selections: RankedSelection[]
  onSelectionsChange: (selections: RankedSelection[]) => void
  title?: string
  placeholder?: string
  className?: string
  maxSelections?: number
  disabled?: boolean
}

// Color palette for tags (energy-themed)
const energyColors: Record<string, string> = {
  // Heating sources
  'Elektrisitet': '#fbbf24', // amber-400
  'Varmepumpe luft-luft': '#34d399', // emerald-400
  'Varmepumpe luft-vann': '#10b981', // emerald-500
  'Varmepumpe': '#34d399', // emerald-400 (fallback)
  'Fjernvarme': '#f87171', // red-400
  'Biobrensel': '#a78bfa', // violet-400
  'Olje': '#64748b', // slate-500
  'Gass': '#60a5fa', // blue-400
  'Bergvarme': '#c084fc', // purple-400
  'Solvarme': '#fde047', // yellow-300

  // Lighting types
  'LED': '#10b981', // emerald-500
  'Fluorescerende': '#3b82f6', // blue-500
  'Halogen': '#f59e0b', // amber-500
  'Glødepære': '#ef4444', // red-500

  // Default fallback colors
  default: '#94a3b8', // slate-400
}

function getColorForOption(value: string): string {
  return energyColors[value] || energyColors.default
}

function getRankingLabel(ranking: 'primary' | 'secondary' | 'tertiary'): string {
  switch (ranking) {
    case 'primary': return 'Primær'
    case 'secondary': return 'Sekundær'
    case 'tertiary': return 'Andre'
    default: return ranking
  }
}

function getRankingColor(ranking: 'primary' | 'secondary' | 'tertiary'): string {
  switch (ranking) {
    case 'primary': return 'text-emerald-400 border-emerald-400'
    case 'secondary': return 'text-cyan-400 border-cyan-400'
    case 'tertiary': return 'text-slate-400 border-slate-400'
    default: return 'text-slate-400 border-slate-400'
  }
}

export function RankedMultiSelect({
  options,
  selections,
  onSelectionsChange,
  title = "Energikilder",
  placeholder = "Legg til energikilde...",
  className,
  maxSelections = 3,
  disabled = false,
}: RankedMultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const availableOptions = options.filter(
    opt => !selections.some(sel => sel.value === opt.value)
  )

  const handleAddSource = (value: string) => {
    const option = options.find(opt => opt.value === value)
    if (!option) return

    // Create a copy of existing selections to avoid mutation
    let updatedExistingSelections = [...selections]
    let newPercentage = 0
    const currentTotal = updatedExistingSelections.reduce((sum, sel) => sum + sel.percentage, 0)

    if (updatedExistingSelections.length === 0) {
      // First option gets 100%
      newPercentage = 100
    } else if (updatedExistingSelections.length === 1) {
      // Second option: suggest 80/20 split
      newPercentage = 20
      // Adjust first option to 80%
      updatedExistingSelections[0] = { ...updatedExistingSelections[0], percentage: 80 }
    } else {
      // Third option: fill the remaining percentage
      newPercentage = Math.max(0, 100 - currentTotal)
    }

    const newSelection: RankedSelection = {
      value,
      percentage: newPercentage,
      ranking: updatedExistingSelections.length === 0 ? 'primary' :
               updatedExistingSelections.length === 1 ? 'secondary' : 'tertiary'
    }

    const newSelections = [...updatedExistingSelections, newSelection]

    // Re-assign rankings based on order automatically
    const finalSelections = newSelections.map((sel, index) => ({
      ...sel,
      ranking: index === 0 ? 'primary' as const :
               index === 1 ? 'secondary' as const : 'tertiary' as const
    }))

    onSelectionsChange(finalSelections)
    setIsOpen(false)
  }

  const handleRemoveSource = (index: number) => {
    const newSelections = selections.filter((_, i) => i !== index)

    // Recalculate percentages if needed
    if (newSelections.length > 0 && selections[index].percentage > 0) {
      const removedPercentage = selections[index].percentage
      const totalOtherPercentages = newSelections.reduce((sum, sel) => sum + sel.percentage, 0)

      if (totalOtherPercentages === 0) {
        newSelections[0].percentage = 100
      } else {
        // Distribute the removed percentage proportionally
        newSelections.forEach(sel => {
          sel.percentage = Math.round(sel.percentage + (sel.percentage / totalOtherPercentages) * removedPercentage)
        })
      }
    }

    // Re-assign rankings based on order automatically
    const updatedSelections = newSelections.map((sel, index) => ({
      ...sel,
      ranking: index === 0 ? 'primary' as const :
               index === 1 ? 'secondary' as const : 'tertiary' as const
    }))

    onSelectionsChange(updatedSelections)
  }

  const handlePercentageChange = (index: number, value: string) => {
    const percentage = Math.min(100, Math.max(0, parseInt(value) || 0))
    const newSelections = [...selections]
    newSelections[index].percentage = percentage

    // Auto-adjust other percentages
    const total = newSelections.reduce((sum, sel) => sum + sel.percentage, 0)
    if (total > 100) {
      const excess = total - 100
      const othersCount = newSelections.length - 1
      if (othersCount > 0) {
        const reductionPerItem = Math.ceil(excess / othersCount)
        newSelections.forEach((sel, i) => {
          if (i !== index && sel.percentage > 0) {
            sel.percentage = Math.max(0, sel.percentage - reductionPerItem)
          }
        })
      }
    }

    onSelectionsChange(newSelections)
  }

  const handleSelectionChange = (index: number, newValue: string) => {
    // Check if the new value is already selected
    if (selections.some((sel, i) => sel.value === newValue && i !== index)) {
      return; // Don't allow duplicate selections
    }

    const newSelections = [...selections]
    newSelections[index] = {
      ...newSelections[index],
      value: newValue
    }

    onSelectionsChange(newSelections)
  }


  const totalPercentage = selections.reduce((sum, sel) => sum + sel.percentage, 0)

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{title}</Label>
        <span className={cn(
          "text-xs min-w-[60px] text-right",
          totalPercentage !== 100 && selections.length > 0
            ? (totalPercentage > 100 ? "text-red-400" : "text-yellow-400")
            : "text-transparent"
        )}>
          {totalPercentage !== 100 && selections.length > 0 ? `Total: ${totalPercentage}%` : 'Total: 100%'}
        </span>
      </div>

      <div className="space-y-2">
        {selections.map((selection, index) => {
          const option = options.find(opt => opt.value === selection.value)
          if (!option) return null

          return (
            <div
              key={selection.value}
              className="flex items-center gap-2 p-2 rounded-lg border border-white/20 bg-white/5"
            >
              <GripVertical className="w-4 h-4 text-slate-500 cursor-move" />

              <Badge
                variant="outline"
                className={cn("min-w-[80px]", getRankingColor(selection.ranking))}
              >
                {getRankingLabel(selection.ranking)}
              </Badge>

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getColorForOption(selection.value) }}
                />
                <Select
                  value={selection.value}
                  onValueChange={(value) => handleSelectionChange(index, value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 border-none bg-transparent text-sm font-medium px-2 py-1 hover:bg-white/5 focus:ring-0 focus:ring-offset-0 [&>svg]:hidden">
                    <SelectValue className="text-sm font-medium">
                      {option?.label || selection.value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {options
                      .filter(opt => opt.value === selection.value || !selections.some(sel => sel.value === opt.value))
                      .map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getColorForOption(opt.value) }}
                            />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={selection.percentage}
                  onChange={(e) => handlePercentageChange(index, e.target.value)}
                  className="w-16 h-8 text-center"
                  min="0"
                  max="100"
                  disabled={disabled}
                />
                <span className="text-sm text-slate-400">%</span>
              </div>


              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveSource(index)}
                disabled={disabled}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          )
        })}

        {selections.length < maxSelections && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                disabled={disabled || availableOptions.length === 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                {placeholder}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <div className="p-2 space-y-1">
                {availableOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant="ghost"
                    className="w-full justify-start h-auto p-2"
                    onClick={() => handleAddSource(option.value)}
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

      {selections.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-white/20 rounded-lg">
          Ingen energikilder valgt ennå
        </p>
      )}
    </div>
  )
}