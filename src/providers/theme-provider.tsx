'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, ThemeProviderProps } from 'next-themes';

/**
 * Theme Provider for SkiplumXGE Energy Analysis Application
 *
 * Provides system-aware theme switching between light and dark modes
 * with persistence and SSR-safe rendering.
 *
 * Features:
 * - Automatic system preference detection
 * - localStorage persistence
 * - No flash of unstyled content (FOUC)
 * - SSR-safe hydration
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
