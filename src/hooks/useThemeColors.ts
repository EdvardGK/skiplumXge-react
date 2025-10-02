'use client';

import { useTheme } from 'next-themes';
import { useMemo } from 'react';
import { themeColors, flatColors, type ThemeMode } from '@/lib/theme-colors';

/**
 * Hook to access theme-aware colors for runtime usage
 * Perfect for libraries that need hex values (Leaflet, Three.js, Canvas)
 *
 * @example
 * ```tsx
 * const colors = useThemeColors();
 *
 * // Nested access
 * <div style={{ color: colors.primary.default }} />
 *
 * // Polygon colors for Leaflet
 * L.polygon(coords, {
 *   color: colors.polygon.selected.stroke,
 *   fillColor: colors.polygon.selected.fill,
 * })
 *
 * // Flat access for dynamic keys
 * const color = colors.flat['polygon-target-stroke'];
 * ```
 */
export function useThemeColors() {
  const { theme, systemTheme } = useTheme();

  // Determine effective theme (respecting system preference)
  const effectiveTheme = useMemo(() => {
    if (theme === 'system') {
      return (systemTheme || 'light') as ThemeMode;
    }
    return (theme || 'light') as ThemeMode;
  }, [theme, systemTheme]);

  // Return theme-specific colors
  return useMemo(() => {
    const colors = themeColors[effectiveTheme];
    const flat = flatColors[effectiveTheme];

    return {
      // Nested color object (type-safe access)
      ...colors,

      // Flat colors for dynamic access
      flat,

      // Convenience getters
      get primary() { return colors.primary.default; },
      get primaryHover() { return colors.primary.hover; },
      get background() { return colors.base.background; },
      get foreground() { return colors.base.foreground; },

      // Current theme mode
      mode: effectiveTheme,
    };
  }, [effectiveTheme]);
}

/**
 * Hook variant for Leaflet polygon styling
 * Returns ready-to-use Leaflet PathOptions
 *
 * @example
 * ```tsx
 * const polygonColors = usePolygonColors();
 *
 * // Use in Leaflet
 * L.polygon(coords, polygonColors.selected);
 * L.polygon(coords, polygonColors.target);
 * L.polygon(coords, polygonColors.neighbor);
 * ```
 */
export function usePolygonColors() {
  const colors = useThemeColors();

  return useMemo(() => ({
    selected: {
      color: colors.polygon.selected.stroke,
      fillColor: colors.polygon.selected.fill,
      fillOpacity: parseOpacity(colors.polygon.selected.fill),
      weight: 3,
    },
    target: {
      color: colors.polygon.target.stroke,
      fillColor: colors.polygon.target.fill,
      fillOpacity: parseOpacity(colors.polygon.target.fill),
      weight: 2,
    },
    neighbor: {
      color: colors.polygon.neighbor.stroke,
      fillColor: colors.polygon.neighbor.fill,
      fillOpacity: parseOpacity(colors.polygon.neighbor.fill),
      weight: 2,
    },
    default: {
      color: colors.polygon.stroke,
      fillColor: colors.polygon.fill,
      fillOpacity: parseOpacity(colors.polygon.fill),
      weight: 2,
    },
    hover: {
      fillColor: colors.polygon.hover.fill,
      fillOpacity: parseOpacity(colors.polygon.hover.fill),
    },
  }), [colors]);
}

/**
 * Hook variant for Three.js mesh materials
 * Returns color values ready for Three.js
 *
 * @example
 * ```tsx
 * const meshColors = useMeshColors();
 *
 * <meshStandardMaterial color={meshColors.primary} />
 * <ambientLight color={meshColors.ambient} intensity={0.5} />
 * ```
 */
export function useMeshColors() {
  const colors = useThemeColors();

  return useMemo(() => ({
    primary: colors.primary, // Use convenience getter
    ambient: colors.mesh.ambient,
    directional: colors.mesh.directional,
    background: colors.background, // Use convenience getter

    // Building materials
    wall: colors.background,
    roof: colors.primary,
    floor: colors.secondary.default,
  }), [colors]);
}

/**
 * Hook variant for chart colors
 * Returns Recharts-compatible color array
 *
 * @example
 * ```tsx
 * const chartColors = useChartColors();
 *
 * <Line dataKey="energy" stroke={chartColors[0]} />
 * <Bar dataKey="savings" fill={chartColors.savings} />
 * ```
 */
export function useChartColors() {
  const colors = useThemeColors();

  return useMemo(() => ({
    // Array for multi-series charts
    series: [
      colors.chart['1'],
      colors.chart['2'],
      colors.chart['3'],
      colors.chart['4'],
      colors.chart['5'],
      colors.chart['6'],
    ],

    // Named colors for specific metrics
    energy: colors.chart['1'],
    heating: colors.chart['2'],
    lighting: colors.chart['3'],
    warning: colors.chart['4'],
    loss: colors.chart['5'],
    savings: colors.chart['6'],

    // Chart infrastructure
    grid: colors.chart.grid,
    axis: colors.chart.axis,
    label: colors.chart.label,

    // Get by index
    get(index: number) {
      return this.series[index % this.series.length];
    },
  }), [colors]);
}

// Helper to extract opacity from rgba() string
function parseOpacity(rgbaString: string): number {
  const match = rgbaString.match(/rgba?\([^)]+,\s*([\d.]+)\)/);
  return match ? parseFloat(match[1]) : 1;
}
