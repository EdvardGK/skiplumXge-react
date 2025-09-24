"use client"

import * as React from "react"
import { X, Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export interface MultiSelectOption {
  value: string
  label: string
  color?: string // Hex color for the tag
  icon?: React.ComponentType<{ className?: string }>
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onSelectedChange: (selected: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  maxHeight?: string
  disabled?: boolean
}

// Color palette for tags (Notion-inspired)
const defaultColors = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#ec4899", // pink
  "#f43f5e", // rose
]

function getColorForOption(option: MultiSelectOption, index: number): string {
  return option.color || defaultColors[index % defaultColors.length]
}

export function MultiSelect({
  options,
  selected,
  onSelectedChange,
  placeholder = "Velg alternativer...",
  searchPlaceholder = "Søk...",
  emptyMessage = "Ingen resultater funnet.",
  className,
  maxHeight = "200px",
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    onSelectedChange(newSelected)
  }

  const handleRemove = (value: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    onSelectedChange(selected.filter((item) => item !== value))
  }

  const selectedOptions = options.filter((opt) => selected.includes(opt.value))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between min-h-[2.5rem] h-auto",
            !selected.length && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selected.length > 0 ? (
              selectedOptions.map((option, index) => (
                <Badge
                  key={option.value}
                  variant="secondary"
                  className="mr-1 mb-1"
                  style={{
                    backgroundColor: `${getColorForOption(option, options.indexOf(option))}20`,
                    borderColor: getColorForOption(option, options.indexOf(option)),
                    color: getColorForOption(option, options.indexOf(option)),
                  }}
                >
                  {option.icon && <option.icon className="w-3 h-3 mr-1" />}
                  {option.label}
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRemove(option.value)
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => handleRemove(option.value, e)}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              ))
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandList style={{ maxHeight }}>
            <CommandGroup>
              {options.map((option, index) => {
                const isSelected = selected.includes(option.value)
                const color = getColorForOption(option, index)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                        isSelected
                          ? "text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                      style={{
                        backgroundColor: isSelected ? color : "transparent",
                        borderColor: color,
                      }}
                    >
                      <Check className={cn("h-4 w-4")} />
                    </div>
                    <div className="flex items-center">
                      {option.icon && (
                        <span style={{ color }}>
                          <option.icon className="w-4 h-4 mr-2" />
                        </span>
                      )}
                      <span>{option.label}</span>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}