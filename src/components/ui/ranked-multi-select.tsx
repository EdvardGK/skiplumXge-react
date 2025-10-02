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
  percentage?: number
  quantity?: number
  year?: number
  thickness?: number  // For insulation thickness in mm
  uValue?: number     // For U-value in W/m²K
  power?: number      // For electrical power in watts
  ranking?: 'primary' | 'secondary' | 'tertiary'
}

interface RankedMultiSelectProps {
  options: RankedOption[]
  selections: RankedSelection[]
  onSelectionsChange: (selections: RankedSelection[]) => void
  title?: string
  placeholder?: string
  emptyStateText?: string // Custom text for when no selections are made
  className?: string
  maxSelections?: number
  disabled?: boolean
  useQuantityYear?: boolean // Switch between percentage and quantity/year mode
  useThicknessUValue?: boolean // New prop for insulation mode with thickness and U-value
  useQuantityUValue?: boolean // New prop for windows/doors with quantity and U-value
  useQuantityPower?: boolean // New prop for electrical equipment with quantity and power
  uValueLabel?: string // Label for U-value (e.g., "TEK17: ≤ 0.18")
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
    case 'primary': return 'text-success border-success'
    case 'secondary': return 'text-accent border-accent'
    case 'tertiary': return 'text-text-tertiary border-text-tertiary'
    default: return 'text-text-tertiary border-text-tertiary'
  }
}

export function RankedMultiSelect({
  options,
  selections,
  onSelectionsChange,
  title = "Energikilder",
  placeholder = "Legg til energikilde...",
  emptyStateText,
  className,
  maxSelections = 3,
  disabled = false,
  useQuantityYear = false,
  useThicknessUValue = false,
  useQuantityUValue = false,
  useQuantityPower = false,
  uValueLabel,
}: RankedMultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [localPercentages, setLocalPercentages] = React.useState<{ [key: number]: string }>({})

  // Sync local percentages with selections when they change
  React.useEffect(() => {
    const newLocal: { [key: number]: string } = {}
    selections.forEach((sel, index) => {
      if (sel.percentage !== undefined) {
        newLocal[index] = sel.percentage.toString()
      }
    })
    setLocalPercentages(newLocal)
  }, [selections])

  const availableOptions = options.filter(
    opt => !selections.some(sel => sel.value === opt.value)
  )

  const handleAddSource = (value: string) => {
    const option = options.find(opt => opt.value === value)
    if (!option) return

    if (useQuantityYear) {
      // For quantity/year mode, just add with default values
      const newSelection: RankedSelection = {
        value: option.value,
        quantity: 1,
        year: new Date().getFullYear(),
      }
      onSelectionsChange([...selections, newSelection])
      setIsOpen(false)
      return
    }

    if (useThicknessUValue) {
      // For insulation mode with thickness and U-value
      const newSelection: RankedSelection = {
        value: option.value,
        thickness: 200, // Default 200mm
        uValue: 0.18,   // Default U-value
      }
      onSelectionsChange([...selections, newSelection])
      setIsOpen(false)
      return
    }

    if (useQuantityUValue) {
      // For windows/doors mode with quantity and U-value
      const newSelection: RankedSelection = {
        value: option.value,
        quantity: 1,    // Default 1 unit
        uValue: 0.80,   // Default U-value for windows/doors
      }
      onSelectionsChange([...selections, newSelection])
      setIsOpen(false)
      return
    }

    if (useQuantityPower) {
      // For electrical equipment with quantity and power consumption
      const newSelection: RankedSelection = {
        value: option.value,
        quantity: 1,    // Default 1 unit
        power: 100,     // Default 100W power consumption
      }
      onSelectionsChange([...selections, newSelection])
      setIsOpen(false)
      return
    }

    // Original percentage-based logic
    let newPercentage = 0
    let finalSelections: RankedSelection[] = []

    if (selections.length === 0) {
      // First option gets 100%
      newPercentage = 100
      finalSelections = [{
        value,
        percentage: newPercentage,
        ranking: 'primary'
      }]
    } else if (selections.length === 1) {
      // Second option: suggest 80/20 split
      finalSelections = [
        { ...selections[0], percentage: 80, ranking: 'primary' },
        { value, percentage: 20, ranking: 'secondary' }
      ]
    } else if (selections.length === 2) {
      // Third option: Keep primary locked, adjust secondary to make room for 5%
      const primaryPercentage = selections[0].percentage || 0

      finalSelections = [
        { ...selections[0], ranking: 'primary' },  // Keep primary unchanged
        { ...selections[1], percentage: Math.max(0, 100 - primaryPercentage - 5), ranking: 'secondary' },
        { value, percentage: 5, ranking: 'tertiary' }
      ]
    } else {
      // Fourth+ option: shouldn't happen with max 3, but handle it
      finalSelections = [
        ...selections.map((sel, i) => ({
          ...sel,
          ranking: i === 0 ? 'primary' as const : i === 1 ? 'secondary' as const : 'tertiary' as const
        })),
        { value, percentage: 0, ranking: 'tertiary' as const }
      ]
    }

    onSelectionsChange(finalSelections)
    setIsOpen(false)
  }

  const handleRemoveSource = (index: number) => {
    const newSelections = selections.filter((_, i) => i !== index)

    // Recalculate percentages if needed
    if (newSelections.length > 0 && selections[index].percentage && selections[index].percentage > 0) {
      const removedPercentage = selections[index].percentage || 0

      // Special handling when removing tertiary (index 2) - only adjust secondary
      if (index === 2 && newSelections.length === 2) {
        // Only add the tertiary percentage to secondary, keep primary unchanged
        newSelections[1].percentage = (newSelections[1].percentage || 0) + removedPercentage
      } else if (newSelections.length === 1) {
        // If only one remains, it gets 100%
        newSelections[0].percentage = 100
      } else {
        // For removing primary or secondary, distribute proportionally
        const totalOtherPercentages = newSelections.reduce((sum, sel) => sum + (sel.percentage || 0), 0)

        if (totalOtherPercentages === 0) {
          newSelections[0].percentage = 100
        } else {
          // Distribute the removed percentage proportionally
          newSelections.forEach(sel => {
            const currentPercentage = sel.percentage || 0
            sel.percentage = Math.round(currentPercentage + (currentPercentage / totalOtherPercentages) * removedPercentage)
          })
        }
      }
    }

    // Re-assign rankings based on order automatically
    const updatedSelections = newSelections.map((sel, index) => ({
      ...sel,
      ranking: index === 0 ? 'primary' as const :
               index === 1 ? 'secondary' as const : 'tertiary' as const
    }))

    // Clean up local state for removed items and shift indices
    const newLocal: { [key: number]: string } = {}
    Object.keys(localPercentages).forEach(key => {
      const oldIndex = parseInt(key)
      if (oldIndex < index) {
        newLocal[oldIndex] = localPercentages[oldIndex]
      } else if (oldIndex > index) {
        newLocal[oldIndex - 1] = localPercentages[oldIndex]
      }
    })
    setLocalPercentages(newLocal)

    onSelectionsChange(updatedSelections)
  }

  const handlePercentageBlur = (index: number) => {
    const value = localPercentages[index] || '0'
    const percentage = Math.min(100, Math.max(0, parseInt(value) || 0))
    const newSelections = [...selections]
    newSelections[index].percentage = percentage

    // Special handling for tertiary (index 2) - adjust secondary to balance
    if (index === 2 && newSelections.length === 3) {
      const primaryPercentage = newSelections[0].percentage || 0
      const tertiaryPercentage = percentage
      const total = primaryPercentage + tertiaryPercentage

      if (total <= 100) {
        // Adjust secondary to fill the gap
        newSelections[1].percentage = 100 - total
      } else {
        // If primary + tertiary > 100%, cap tertiary and zero secondary
        newSelections[2].percentage = Math.max(0, 100 - primaryPercentage)
        newSelections[1].percentage = 0
      }
    } else {
      // Original logic for primary and secondary editing
      // Calculate total up to and including the current index
      let runningTotal = 0
      for (let i = 0; i <= index; i++) {
        runningTotal += newSelections[i].percentage || 0
      }

      // If we're over 100%, adjust items BELOW the current index
      if (runningTotal > 100) {
        const excess = runningTotal - 100

        // First, try to subtract from items below
        let remainingExcess = excess
        for (let i = index + 1; i < newSelections.length && remainingExcess > 0; i++) {
          const currentPercentage = newSelections[i].percentage || 0
          const reduction = Math.min(currentPercentage, remainingExcess)
          newSelections[i].percentage = currentPercentage - reduction
          remainingExcess -= reduction
        }

        // If there's still excess after zeroing all below, cap the current field
        if (remainingExcess > 0) {
          newSelections[index].percentage = Math.max(0, percentage - remainingExcess)
        }
      }
    }

    // Update local state to match the final values (including any adjusted secondary)
    const updatedLocal: { [key: number]: string } = {}
    newSelections.forEach((sel, i) => {
      if (sel.percentage !== undefined) {
        updatedLocal[i] = sel.percentage.toString()
      }
    })
    setLocalPercentages(updatedLocal)

    onSelectionsChange(newSelections)
  }

  const handlePercentageChange = (index: number, value: string) => {
    // Allow any input, just update local state
    setLocalPercentages(prev => ({ ...prev, [index]: value }))
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


  const totalPercentage = selections.reduce((sum, sel) => sum + (sel.percentage || 0), 0)
  const showPercentageTotal = !useQuantityYear && !useThicknessUValue && !useQuantityUValue && !useQuantityPower && selections.length > 0

  return (
    <div className={cn("space-y-2", className)}>
      {/* Only show label/total row if there's a title or we need to show percentage total */}
      {(title || (showPercentageTotal && totalPercentage !== 100)) && (
        <div className="flex items-center justify-between">
          {title && <Label className="text-sm font-medium">{title}</Label>}
          {showPercentageTotal && totalPercentage !== 100 && (
            <span className={cn(
              "text-xs min-w-[60px] text-right",
              totalPercentage > 100 ? "text-destructive" : "text-warning"
            )}>
              Total: {totalPercentage}%
            </span>
          )}
        </div>
      )}

      <div className="space-y-1">
        {selections.map((selection, index) => {
          const option = options.find(opt => opt.value === selection.value)
          if (!option) return null

          return (
            <div
              key={selection.value}
              className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg border border-border bg-muted/30"
            >
              {!useQuantityYear && !useThicknessUValue && !useQuantityUValue && !useQuantityPower && (
                <>
                  <GripVertical className="w-4 h-4 text-text-muted cursor-move hidden sm:block" />
                  {selection.ranking && (
                    <Badge
                      variant="outline"
                      className={cn("hidden lg:inline-flex min-w-[80px]", getRankingColor(selection.ranking))}
                    >
                      {getRankingLabel(selection.ranking)}
                    </Badge>
                  )}
                </>
              )}

              <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getColorForOption(selection.value) }}
                />
                <Select
                  value={selection.value}
                  onValueChange={(value) => handleSelectionChange(index, value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 border-none bg-transparent text-sm font-medium px-2 py-1 hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 [&>svg]:hidden flex-1">
                    <SelectValue className="text-sm font-medium">
                      {option?.label || selection.value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent style={{ zIndex: 9999 }}>
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

              {useQuantityUValue ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={selection.quantity ?? ''}
                      onChange={(e) => {
                        const updated = [...selections]
                        updated[index] = { ...updated[index], quantity: e.target.value === '' ? undefined : parseInt(e.target.value) || 0 }
                        onSelectionsChange(updated)
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          const updated = [...selections]
                          updated[index] = { ...updated[index], quantity: 1 }
                          onSelectionsChange(updated)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                        }
                      }}
                      className="w-16 h-8 text-center bg-input border-input-border text-input-foreground"
                      min="0"
                      disabled={disabled}
                      placeholder="1"
                    />
                    <span className="text-sm text-text-tertiary">stk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={selection.uValue ?? ''}
                      onChange={(e) => {
                        const updated = [...selections]
                        updated[index] = { ...updated[index], uValue: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 }
                        onSelectionsChange(updated)
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          const updated = [...selections]
                          updated[index] = { ...updated[index], uValue: 0.80 }
                          onSelectionsChange(updated)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                        }
                      }}
                      className="w-20 h-8 text-center bg-input border-input-border text-input-foreground"
                      min="0"
                      max="5"
                      disabled={disabled}
                      placeholder="0.80"
                    />
                    <span className="text-sm text-text-tertiary">W/m²K</span>
                  </div>
                  {uValueLabel && (
                    <span className="text-xs text-success sm:ml-2">
                      {uValueLabel}
                    </span>
                  )}
                </div>
              ) : useThicknessUValue ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={selection.thickness ?? ''}
                      onChange={(e) => {
                        const updated = [...selections]
                        updated[index] = { ...updated[index], thickness: e.target.value === '' ? undefined : parseInt(e.target.value) || 0 }
                        onSelectionsChange(updated)
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          const updated = [...selections]
                          updated[index] = { ...updated[index], thickness: 0 }
                          onSelectionsChange(updated)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                        }
                      }}
                      className="w-20 h-8 text-center bg-input border-input-border text-input-foreground"
                      min="0"
                      disabled={disabled}
                      placeholder="200"
                    />
                    <span className="text-sm text-text-tertiary">mm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={selection.uValue ?? ''}
                      onChange={(e) => {
                        const updated = [...selections]
                        updated[index] = { ...updated[index], uValue: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 }
                        onSelectionsChange(updated)
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          const updated = [...selections]
                          updated[index] = { ...updated[index], uValue: 0.18 }
                          onSelectionsChange(updated)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                        }
                      }}
                      className="w-20 h-8 text-center bg-input border-input-border text-input-foreground"
                      min="0"
                      max="5"
                      disabled={disabled}
                      placeholder="0.18"
                    />
                    <span className="text-sm text-text-tertiary">W/m²K</span>
                  </div>
                  {uValueLabel && (
                    <span className="text-xs text-success sm:ml-2">
                      {uValueLabel}
                    </span>
                  )}
                </div>
              ) : useQuantityPower ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={selection.quantity ?? ''}
                      onChange={(e) => {
                        const updated = [...selections]
                        updated[index] = { ...updated[index], quantity: e.target.value === '' ? undefined : parseInt(e.target.value) || 0 }
                        onSelectionsChange(updated)
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          const updated = [...selections]
                          updated[index] = { ...updated[index], quantity: 1 }
                          onSelectionsChange(updated)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                        }
                      }}
                      className="w-16 h-8 text-center bg-input border-input-border text-input-foreground"
                      min="0"
                      disabled={disabled}
                      placeholder="1"
                    />
                    <span className="text-sm text-text-tertiary">stk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={selection.power ?? ''}
                      onChange={(e) => {
                        const updated = [...selections]
                        updated[index] = { ...updated[index], power: e.target.value === '' ? undefined : parseInt(e.target.value) || 0 }
                        onSelectionsChange(updated)
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          const updated = [...selections]
                          updated[index] = { ...updated[index], power: 100 }
                          onSelectionsChange(updated)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                        }
                      }}
                      className="w-20 h-8 text-center bg-input border-input-border text-input-foreground"
                      min="0"
                      max="10000"
                      step="10"
                      disabled={disabled}
                      placeholder="100"
                    />
                    <span className="text-sm text-text-tertiary">W/stk</span>
                  </div>
                </div>
              ) : useQuantityYear ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={selection.quantity ?? ''}
                      onChange={(e) => {
                        const updated = [...selections]
                        updated[index] = { ...updated[index], quantity: e.target.value === '' ? undefined : parseInt(e.target.value) || 0 }
                        onSelectionsChange(updated)
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          const updated = [...selections]
                          updated[index] = { ...updated[index], quantity: 1 }
                          onSelectionsChange(updated)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                        }
                      }}
                      className="w-16 h-8 text-center bg-input border-input-border text-input-foreground"
                      min="0"
                      disabled={disabled}
                      placeholder="1"
                    />
                    <span className="text-sm text-text-tertiary">stk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={selection.year ?? ''}
                      onChange={(e) => {
                        const updated = [...selections]
                        updated[index] = { ...updated[index], year: e.target.value === '' ? undefined : parseInt(e.target.value) || 0 }
                        onSelectionsChange(updated)
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          const updated = [...selections]
                          updated[index] = { ...updated[index], year: new Date().getFullYear() }
                          onSelectionsChange(updated)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                        }
                      }}
                      className="w-20 h-8 text-center bg-input border-input-border text-input-foreground"
                      min="1900"
                      max="2100"
                      disabled={disabled}
                      placeholder={new Date().getFullYear().toString()}
                    />
                    <span className="text-sm text-text-tertiary">år</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input
                    type="text"
                    value={localPercentages[index] !== undefined ? localPercentages[index] : selection.percentage}
                    onChange={(e) => handlePercentageChange(index, e.target.value)}
                    onBlur={() => handlePercentageBlur(index)}
                    onFocus={(e) => {
                      // Select all text on focus for easy replacement
                      e.target.select()
                    }}
                    onKeyDown={(e) => {
                      // Prevent Enter from triggering form submit or delete
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.currentTarget.blur() // Trigger blur to save the value
                      }
                    }}
                    className="w-16 h-8 text-center bg-input border-input-border text-input-foreground"
                    disabled={disabled}
                    placeholder="0"
                  />
                  <span className="text-sm text-text-tertiary">%</span>
                </div>
              )}


              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveSource(index)}
                disabled={disabled}
                className="h-8 w-8 p-0 self-start sm:self-center mt-0"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          )
        })}

        {selections.length < maxSelections && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                disabled={disabled || availableOptions.length === 0}
              >
                <Plus className="w-3 h-3 mr-1.5" />
                {placeholder}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start" style={{ zIndex: 9999 }}>
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

      {selections.length === 0 && emptyStateText && (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-white/20 rounded-lg">
          {emptyStateText}
        </p>
      )}
    </div>
  )
}