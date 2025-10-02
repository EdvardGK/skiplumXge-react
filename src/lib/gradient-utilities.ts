/**
 * Nordic Gradient Utilities for React Components
 *
 * Helper functions and hooks for working with the Nordic-inspired
 * gradient system. These utilities provide type-safe access to
 * gradients and common patterns for gradient animations.
 */

import { useTheme } from 'next-themes';
import { useMemo } from 'react';

/**
 * Available gradient types from the design token system
 */
export type GradientType =
  | 'primary'           // Fjord Fade
  | 'accent'            // Aurora Accent
  | 'aurora'            // Nordic Aurora
  | 'energy'            // Energy gradient
  | 'forest-whisper'    // Radial forest gradient
  | 'snowy-subtle';     // Conic gradient for spinners

/**
 * Gradient definitions for light and dark modes
 */
const GRADIENTS = {
  light: {
    primary: 'linear-gradient(45deg, #2C4A3A 0%, #4A7C92 100%)',
    accent: 'linear-gradient(to right, #D97C30 0%, #F9F9F9 50%, #4A7C92 100%)',
    aurora: 'linear-gradient(135deg, #2C4A3A 0%, #4A7C92 50%, #A4C8E1 100%)',
    energy: 'linear-gradient(180deg, #2C4A3A 0%, #D97C30 100%)',
    'forest-whisper': 'radial-gradient(circle at center, #E8F1E5 0%, #F9F9F9 70%, #2C4A3A 100%)',
    'snowy-subtle': 'conic-gradient(from 0deg, #333333 0deg, #E8F1E5 90deg, #2C4A3A 180deg, #333333 270deg)',
  },
  dark: {
    primary: 'linear-gradient(45deg, #4A7C92 0%, #A4C8E1 50%, #1A1A1A 100%)',
    accent: 'linear-gradient(to right, #F2B05C 0%, #1A1A1A 50%, #A4C8E1 100%)',
    aurora: 'linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #8b5cf6 100%)',
    energy: 'linear-gradient(180deg, #10b981 0%, #f59e0b 100%)',
    'forest-whisper': 'radial-gradient(circle at center, #2C4A3A 0%, #1A1A1A 70%, #4A7C92 100%)',
    'snowy-subtle': 'conic-gradient(from 0deg, #E8E8E8 0deg, #2C4A3A 90deg, #4A7C92 180deg, #E8E8E8 270deg)',
  },
} as const;

/**
 * Hook to get theme-aware gradient values
 *
 * @example
 * const { getGradient } = useGradients();
 * const heroGradient = getGradient('primary');
 *
 * return <div style={{ background: heroGradient }} />;
 */
export function useGradients() {
  const { theme, systemTheme } = useTheme();

  const effectiveTheme = useMemo(() => {
    return theme === 'system' ? systemTheme : theme;
  }, [theme, systemTheme]);

  const getGradient = (type: GradientType): string => {
    const mode = effectiveTheme === 'dark' ? 'dark' : 'light';
    return GRADIENTS[mode][type];
  };

  const getCSSVariable = (type: GradientType): string => {
    return `var(--gradient-${type})`;
  };

  return {
    getGradient,
    getCSSVariable,
    theme: effectiveTheme,
  };
}

/**
 * Common gradient style presets for React components
 */
export const gradientStyles = {
  /**
   * Hero section background
   */
  hero: {
    background: 'var(--gradient-primary)',
    minHeight: '400px',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },

  /**
   * CTA button with gradient
   */
  ctaButton: {
    background: 'var(--gradient-accent)',
    border: 'none',
    color: 'var(--foreground)',
    fontWeight: 600,
    transition: 'all 0.3s ease',
  },

  /**
   * Progress bar fill
   */
  progressBar: {
    background: 'var(--gradient-energy)',
    height: '100%',
    transition: 'width 0.5s ease-out',
    borderRadius: '9999px',
  },

  /**
   * Card gradient border (top accent)
   */
  cardBorder: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: 'var(--gradient-primary)',
  },

  /**
   * Loading spinner
   */
  spinner: {
    background: 'var(--gradient-snowy-subtle)',
    borderRadius: '50%',
    animation: 'spin 2s linear infinite',
  },

  /**
   * Map overlay highlight
   */
  mapOverlay: {
    background: 'var(--gradient-forest-whisper)',
    opacity: 0.5,
    transition: 'opacity 0.3s ease',
  },
} as const;

/**
 * Gradient animation utilities
 */
export const gradientAnimations = {
  /**
   * Subtle gradient shift animation (low GPU usage)
   */
  shift: `
    @keyframes gradient-shift {
      0%, 100% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
    }
  `,

  /**
   * Fade in gradient on mount
   */
  fadeIn: `
    @keyframes gradient-fade-in {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,

  /**
   * Pulse glow effect for focus states
   */
  pulse: `
    @keyframes gradient-pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(44, 74, 58, 0.4);
      }
      50% {
        box-shadow: 0 0 0 10px rgba(44, 74, 58, 0);
      }
    }
  `,
};

/**
 * Utility to create gradient text (webkit-only)
 *
 * @example
 * const textStyle = createGradientText('aurora');
 * return <h1 style={textStyle}>Nordic Energy</h1>;
 */
export function createGradientText(gradientType: GradientType) {
  return {
    background: `var(--gradient-${gradientType})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as React.CSSProperties;
}

/**
 * Utility to create animated gradient background
 *
 * @example
 * const bgStyle = createAnimatedGradient('primary', 'shift');
 * return <div style={bgStyle}>Content</div>;
 */
export function createAnimatedGradient(
  gradientType: GradientType,
  animation: 'shift' | 'fadeIn' | 'pulse' = 'shift'
) {
  return {
    background: `var(--gradient-${gradientType})`,
    backgroundSize: '200% 200%',
    animation: `gradient-${animation} 3s ease infinite`,
  } as React.CSSProperties;
}

/**
 * Performance-optimized gradient component props
 * Use will-change for animated gradients to hint GPU acceleration
 */
export function createPerformantGradient(gradientType: GradientType, animate = false) {
  return {
    background: `var(--gradient-${gradientType})`,
    ...(animate && {
      willChange: 'background-position',
      backgroundSize: '200% 200%',
    }),
  } as React.CSSProperties;
}
