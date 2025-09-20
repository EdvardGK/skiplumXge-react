/**
 * Storm Theme Design System
 * Inspired by "information is beautiful" with electric storm aesthetics
 * for Norwegian Energy Analysis Dashboard
 */

export const stormColors = {
  // Storm base colors - deep, dramatic grays and blues
  storm: {
    900: 'rgb(15, 23, 42)',    // slate-900 - deepest storm
    800: 'rgb(30, 41, 59)',    // slate-800 - storm clouds
    700: 'rgb(51, 65, 85)',    // slate-700 - storm gray
    600: 'rgb(71, 85, 105)',   // slate-600 - lighter storm
    500: 'rgb(100, 116, 139)', // slate-500 - storm mid
  },

  // Lightning accents - electric energy
  lightning: {
    cyan: 'rgb(6, 182, 212)',     // cyan-500 - primary lightning
    electric: 'rgb(14, 165, 233)', // sky-500 - electric blue
    neon: 'rgb(34, 197, 94)',     // emerald-500 - neon green
    aurora: 'rgb(168, 85, 247)',  // purple-500 - aurora purple
    thunder: 'rgb(239, 68, 68)',  // red-500 - thunder red
    gold: 'rgb(245, 158, 11)',    // amber-500 - lightning gold
  },

  // Energy grade colors
  energyGrades: {
    A: 'rgb(34, 197, 94)',   // emerald-500 - excellent
    B: 'rgb(132, 204, 22)',  // lime-500 - good
    C: 'rgb(245, 158, 11)',  // amber-500 - average
    D: 'rgb(249, 115, 22)',  // orange-500 - below average
    E: 'rgb(239, 68, 68)',   // red-500 - poor
    F: 'rgb(190, 18, 60)',   // rose-700 - very poor
    G: 'rgb(136, 19, 55)',   // rose-900 - terrible
  },

  // Norwegian regional colors (for price zones)
  norway: {
    NO1: 'rgb(59, 130, 246)',   // blue-500 - Oslo/Øst
    NO2: 'rgb(16, 185, 129)',   // emerald-500 - Sør
    NO3: 'rgb(245, 158, 11)',   // amber-500 - Midt
    NO4: 'rgb(168, 85, 247)',   // purple-500 - Nord
    NO5: 'rgb(239, 68, 68)',    // red-500 - Vest
  }
} as const;

export const stormGradients = {
  // Main background gradients
  stormSky: 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900',
  stormNight: 'bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900',
  lightningStrike: 'bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500',

  // Card gradients
  stormGlass: 'bg-gradient-to-br from-white/10 via-white/5 to-white/10',
  electricGlow: 'bg-gradient-to-br from-cyan-500/20 via-sky-500/10 to-purple-500/20',

  // Accent gradients
  success: 'bg-gradient-to-r from-emerald-500 to-green-500',
  warning: 'bg-gradient-to-r from-amber-500 to-orange-500',
  danger: 'bg-gradient-to-r from-red-500 to-rose-500',
  info: 'bg-gradient-to-r from-cyan-500 to-blue-500',
} as const;

export const stormEffects = {
  // Glass morphism effects
  stormGlass: 'backdrop-blur-xl bg-white/10 border border-white/20',
  lightningGlass: 'backdrop-blur-xl bg-cyan-500/10 border border-cyan-500/30',

  // Glow effects
  stormGlow: 'shadow-2xl shadow-cyan-500/25',
  lightningGlow: 'shadow-2xl shadow-cyan-400/50',
  electricGlow: 'shadow-2xl shadow-purple-500/30',

  // Hover effects
  stormHover: 'hover:bg-white/15 hover:border-white/30 hover:shadow-xl hover:shadow-cyan-500/20',
  lightningHover: 'hover:bg-cyan-500/15 hover:border-cyan-400/50 hover:shadow-xl hover:shadow-cyan-400/40',

  // Animation classes
  stormPulse: 'animate-pulse',
  lightningFlash: 'animate-bounce',
} as const;

export const stormTypography = {
  // Display text
  stormTitle: 'text-4xl font-bold text-white tracking-tight',
  lightningTitle: 'text-3xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent',

  // Body text
  stormText: 'text-slate-300',
  lightningText: 'text-cyan-400',
  electricText: 'text-purple-400',

  // Labels and metadata
  stormLabel: 'text-slate-400 text-sm font-medium',
  stormMeta: 'text-slate-500 text-xs',

  // Values and metrics
  stormValue: 'text-white font-bold',
  lightningValue: 'text-cyan-400 font-bold',
  successValue: 'text-emerald-400 font-bold',
  warningValue: 'text-amber-400 font-bold',
  dangerValue: 'text-red-400 font-bold',
} as const;

export const stormSpacing = {
  // Card spacing
  cardPadding: 'p-6',
  cardGap: 'space-y-4',

  // Grid spacing
  gridGap: 'gap-6',
  gridPadding: 'p-6',

  // Component spacing
  componentGap: 'space-y-3',
  iconGap: 'space-x-2',
} as const;

// Utility functions for dynamic theming
export const getEnergyGradeColor = (grade: string): string => {
  return stormColors.energyGrades[grade as keyof typeof stormColors.energyGrades] || stormColors.lightning.cyan;
};

export const getNorwayZoneColor = (zone: string): string => {
  return stormColors.norway[zone as keyof typeof stormColors.norway] || stormColors.lightning.cyan;
};

export const getStormIntensity = (value: number, max: number): 'low' | 'medium' | 'high' => {
  const ratio = value / max;
  if (ratio < 0.3) return 'low';
  if (ratio < 0.7) return 'medium';
  return 'high';
};

export const stormIntensityColors = {
  low: stormColors.lightning.cyan,
  medium: stormColors.lightning.aurora,
  high: stormColors.lightning.thunder,
} as const;