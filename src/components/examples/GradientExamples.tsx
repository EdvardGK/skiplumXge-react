/**
 * Nordic Gradient Examples
 *
 * This file demonstrates how to use the Nordic-inspired gradients
 * from the design token system in React components.
 *
 * All gradients are theme-aware and automatically switch between
 * light and dark mode variants.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Example 1: Fjord Fade Hero Background
 * Usage: Landing page hero sections, large background areas
 */
export function FjordFadeHero() {
  return (
    <div
      className="relative h-[400px] flex items-center justify-center overflow-hidden"
      style={{
        background: 'var(--gradient-primary)',
        // Light: linear-gradient(45deg, #2C4A3A 0%, #4A7C92 100%)
        // Dark: linear-gradient(45deg, #4A7C92 0%, #A4C8E1 50%, #1A1A1A 100%)
      }}
    >
      <div className="text-center z-10">
        <h1 className="text-4xl font-bold text-white mb-4">
          Spar tusenvis på energikostnadene
        </h1>
        <p className="text-white/90 text-lg">
          Nordic-inspired design that feels like home
        </p>
      </div>

      {/* Optional gradient overlay for depth */}
      <div
        className="absolute inset-0 opacity-30"
        style={{ background: 'var(--gradient-forest-whisper)' }}
      />
    </div>
  );
}

/**
 * Example 2: Aurora Accent CTA Button
 * Usage: Primary call-to-action buttons, "Improve Now" actions
 */
export function AuroraAccentButton() {
  return (
    <Button
      size="lg"
      className="relative overflow-hidden group"
      style={{
        background: 'var(--gradient-accent)',
        // Light: linear-gradient(to right, #D97C30 0%, #F9F9F9 50%, #4A7C92 100%)
        // Dark: linear-gradient(to right, #F2B05C 0%, #1A1A1A 50%, #A4C8E1 100%)
      }}
    >
      <span className="relative z-10 text-foreground font-semibold">
        Forbedre Energiytelsen
      </span>

      {/* Animated scale on hover */}
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Button>
  );
}

/**
 * Example 3: Forest Whisper Map Overlay
 * Usage: Map polygon highlights, building selection backgrounds
 */
export function ForestWhisperMapHighlight({ isSelected }: { isSelected: boolean }) {
  return (
    <div
      className="absolute inset-0 transition-opacity duration-300"
      style={{
        background: isSelected ? 'var(--gradient-forest-whisper)' : 'transparent',
        opacity: isSelected ? 0.6 : 0,
        // Light: radial-gradient(circle at center, #E8F1E5 0%, #F9F9F9 70%, #2C4A3A 100%)
        // Dark: radial-gradient(circle at center, #2C4A3A 0%, #1A1A1A 70%, #4A7C92 100%)
      }}
    />
  );
}

/**
 * Example 4: Energy Progress Bar with Gradient
 * Usage: Energy savings metrics, performance indicators
 */
export function EnergyProgressBar({ progress = 65 }: { progress?: number }) {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-foreground">Energibesparelse</span>
        <span className="text-sm font-medium text-foreground">{progress}%</span>
      </div>
      <div className="h-3 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: 'var(--gradient-energy)',
            // Light: linear-gradient(180deg, #2C4A3A 0%, #D97C30 100%)
            // Dark: linear-gradient(180deg, #10b981 0%, #f59e0b 100%)
          }}
        />
      </div>
    </div>
  );
}

/**
 * Example 5: Snowy Subtle Rotating Icon
 * Usage: Loading spinners, certificate badges, performance indicators
 */
export function SnowySubtleSpinner() {
  return (
    <div
      className="w-12 h-12 rounded-full animate-spin"
      style={{
        background: 'var(--gradient-snowy-subtle)',
        // Light: conic-gradient(from 0deg, #333333 0deg, #E8F1E5 90deg, #2C4A3A 180deg, #333333 270deg)
        // Dark: conic-gradient(from 0deg, #E8E8E8 0deg, #2C4A3A 90deg, #4A7C92 180deg, #E8E8E8 270deg)
      }}
    >
      <div className="w-10 h-10 bg-background rounded-full m-1" />
    </div>
  );
}

/**
 * Example 6: Card with Nordic Shadow and Gradient Border
 * Usage: Feature cards, metric displays, information panels
 */
export function NordicCard() {
  return (
    <Card
      className="relative overflow-hidden border-2"
      style={{
        boxShadow: 'var(--shadow-md)',
        // Light: 0 4px 12px rgba(74, 124, 146, 0.1) - Nordic blue shadow
        // Dark: 0 4px 6px -1px rgba(0, 0, 0, 0.5)
      }}
    >
      {/* Gradient border effect */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: 'var(--gradient-primary)' }}
      />

      <CardHeader>
        <CardTitle>Total BRA</CardTitle>
        <CardDescription>Bruksareal</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">1,200 m²</div>
      </CardContent>
    </Card>
  );
}

/**
 * Example 7: Animated Gradient Background (Performance-Optimized)
 * Usage: Background effects, hero sections with movement
 */
export function AnimatedGradientBackground() {
  return (
    <div className="relative h-screen overflow-hidden">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{ background: 'var(--gradient-primary)' }}
      />

      {/* Animated overlay - uses CSS animation for GPU acceleration */}
      <div
        className="absolute inset-0 opacity-30 animate-gradient-shift"
        style={{ background: 'var(--gradient-aurora)' }}
      />

      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-10px) translateY(-10px); }
        }
        .animate-gradient-shift {
          animation: gradient-shift 20s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

/**
 * Usage Guide:
 *
 * 1. Import the gradient via CSS variables:
 *    style={{ background: 'var(--gradient-primary)' }}
 *
 * 2. Available gradient variables:
 *    - var(--gradient-primary)      // Fjord Fade
 *    - var(--gradient-accent)        // Aurora Accent (for CTAs)
 *    - var(--gradient-aurora)        // Nordic Aurora (full spectrum)
 *    - var(--gradient-energy)        // Energy gradient
 *    - var(--gradient-forest-whisper) // Radial gradient for overlays
 *    - var(--gradient-snowy-subtle)   // Conic gradient for spinners
 *
 * 3. Combine with Tailwind utilities for responsive design:
 *    className="bg-gradient-primary sm:bg-gradient-accent"
 *
 * 4. Performance tips:
 *    - Use CSS variables instead of inline gradients to reduce bundle size
 *    - Prefer transform and opacity for animations (GPU-accelerated)
 *    - Apply backdrop-blur sparingly (expensive on mobile)
 *    - Test with Chrome DevTools Lighthouse for CLS < 0.1
 *
 * 5. Accessibility:
 *    - Ensure text on gradients has contrast ratio ≥ 4.5:1 (WCAG AA)
 *    - Use text-white or text-foreground depending on gradient darkness
 *    - Test with color blindness simulators
 */
