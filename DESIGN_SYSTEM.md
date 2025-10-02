# SkiplumXGE Energy Analysis - Comprehensive Design System

**Last Updated**: 2025-10-01
**Version**: 1.0.0

## Overview

This design system provides a centralized color palette where **all visual elements** (buttons, backgrounds, accents, polygons, charts, maps, etc.) are controlled through CSS variables and semantic Tailwind classes. This allows for:

- **Single Source of Truth**: Change colors globally from `src/app/globals.css`
- **Theme Consistency**: Automatic light/dark mode support
- **Maintainability**: Update the entire app's color scheme in one place
- **Developer Experience**: Semantic naming makes intent clear

---

## Quick Start

### Using Semantic Colors

Instead of hard-coded colors, use semantic tokens:

```tsx
// ❌ DON'T: Hard-coded colors
<div className="bg-slate-900 text-white border-gray-800">

// ✅ DO: Semantic tokens (adapts to light/dark mode automatically)
<div className="bg-background text-foreground border">
```

### Common Patterns

```tsx
// Backgrounds
<div className="bg-background">           // Main background
<div className="bg-background-elevated">  // Elevated surface
<Card className="bg-card">                // Card background

// Text
<h1 className="text-foreground">          // Primary text
<p className="text-text-secondary">       // Secondary text
<span className="text-text-muted">        // Muted text

// Buttons
<Button className="bg-button-primary-bg hover:bg-button-primary-hover">
<Button className="bg-secondary hover:bg-secondary-hover">

// Borders
<div className="border border-border">    // Standard border
<div className="border border-strong">    // Emphasized border

// Interactive states
<div className="hover:bg-card-hover">     // Card hover
<input className="border-input-border focus:border-input-border-focus">
```

---

## Color System Architecture

### 1. Base Surfaces

Control the fundamental background layers of your application.

| Token | Usage | Tailwind Class |
|-------|-------|----------------|
| `--background` | Main app background | `bg-background` |
| `--background-elevated` | Raised surfaces (modals, dropdowns) | `bg-background-elevated` |
| `--background-subtle` | Subtle background variations | `bg-background-subtle` |
| `--foreground` | Primary text color | `text-foreground` |

**Example:**
```tsx
<div className="bg-background min-h-screen">
  <main className="bg-background-elevated p-6">
    <h1 className="text-foreground">Energy Dashboard</h1>
  </main>
</div>
```

### 2. Cards & Containers

For card components and grouped content.

| Token | Usage | Tailwind Class |
|-------|-------|----------------|
| `--card` | Card background | `bg-card` |
| `--card-foreground` | Card text | `text-card-foreground` |
| `--card-border` | Card borders | `border-card-border` |
| `--card-hover` | Card hover state | `hover:bg-card-hover` |

**Example:**
```tsx
<Card className="bg-card border-card-border hover:bg-card-hover">
  <CardContent className="text-card-foreground">
    <h2>Building Energy</h2>
  </CardContent>
</Card>
```

### 3. Glass Morphism

For glassmorphic UI elements with backdrop blur.

| Token | Usage | Tailwind Class |
|-------|-------|----------------|
| `--glass-bg` | Translucent background | `bg-glass-bg` |
| `--glass-border` | Glass border | `border-glass-border` |
| `--glass-backdrop` | Backdrop blur | `backdrop-blur-glass` |

**Example:**
```tsx
<div className="bg-glass-bg border-glass-border backdrop-blur-glass rounded-lg">
  <p className="text-foreground">Glass card content</p>
</div>
```

### 4. Brand Colors

#### Primary (Emerald - Energy theme)

| Token | Usage | Tailwind Class |
|-------|-------|----------------|
| `--primary` | Primary actions, highlights | `bg-primary`, `text-primary` |
| `--primary-hover` | Primary hover state | `hover:bg-primary-hover` |
| `--primary-foreground` | Text on primary | `text-primary-foreground` |
| `--primary-muted` | Muted primary background | `bg-primary-muted` |

#### Secondary

| Token | Usage | Tailwind Class |
|-------|-------|----------------|
| `--secondary` | Secondary actions | `bg-secondary` |
| `--secondary-hover` | Secondary hover | `hover:bg-secondary-hover` |
| `--secondary-foreground` | Text on secondary | `text-secondary-foreground` |

#### Accent (Cyan)

| Token | Usage | Tailwind Class |
|-------|-------|----------------|
| `--accent` | Accent highlights | `bg-accent`, `text-accent` |
| `--accent-hover` | Accent hover | `hover:bg-accent-hover` |
| `--accent-foreground` | Text on accent | `text-accent-foreground` |
| `--accent-muted` | Muted accent background | `bg-accent-muted` |

**Example:**
```tsx
<Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
  Start Analysis
</Button>
<Button className="bg-secondary hover:bg-secondary-hover text-secondary-foreground">
  Cancel
</Button>
```

### 5. Semantic Status Colors

| Token | Usage | Tailwind Class |
|-------|-------|----------------|
| `--success` | Success states | `bg-success`, `text-success` |
| `--destructive` | Errors, dangerous actions | `bg-destructive` |
| `--warning` | Warnings, attention needed | `bg-warning` |

**Example:**
```tsx
<Alert className="bg-success-muted border-success text-success-foreground">
  Energy analysis complete!
</Alert>
<Button className="bg-destructive hover:bg-destructive-hover">
  Delete Building
</Button>
```

### 6. Text Hierarchy

| Token | Usage | Tailwind Class |
|-------|-------|----------------|
| `--text-primary` | Headings, emphasis | `text-text-primary` |
| `--text-secondary` | Body text | `text-text-secondary` |
| `--text-tertiary` | Supporting text | `text-text-tertiary` |
| `--text-muted` | Subtle text | `text-text-muted` |
| `--text-disabled` | Disabled text | `text-text-disabled` |

**Example:**
```tsx
<article>
  <h1 className="text-text-primary">Building Energy Report</h1>
  <p className="text-text-secondary">Analysis for Kontor building...</p>
  <span className="text-text-muted">Generated 2025-10-01</span>
</article>
```

### 7. Inputs & Forms

| Token | Usage | Tailwind Class |
|-------|-------|----------------|
| `--input` | Input background | `bg-input` |
| `--input-border` | Input border | `border-input-border` |
| `--input-border-hover` | Hover border | `hover:border-input-border-hover` |
| `--input-border-focus` | Focus border | `focus:border-input-border-focus` |
| `--input-placeholder` | Placeholder text | `placeholder-input-placeholder` |

**Example:**
```tsx
<Input
  className="bg-input border-input-border hover:border-input-border-hover focus:border-input-border-focus"
  placeholder="Enter building name..."
/>
```

### 8. Buttons (Granular Control)

For custom button implementations:

```tsx
// Primary button
<button className="bg-button-primary-bg hover:bg-button-primary-hover active:bg-button-primary-active text-button-primary-text">
  Primary Action
</button>

// Secondary button
<button className="bg-button-secondary-bg hover:bg-button-secondary-hover text-button-secondary-text">
  Secondary Action
</button>

// Ghost button
<button className="hover:bg-button-ghost-hover active:bg-button-ghost-active">
  Ghost Action
</button>

// Outline button
<button className="border-button-outline-border hover:bg-button-outline-hover-bg">
  Outline Action
</button>
```

### 9. Charts & Data Visualization

| Token | Usage | Tailwind Class | Use Case |
|-------|-------|----------------|----------|
| `--chart-1` | Primary data | `fill-chart-1`, `stroke-chart-1` | Energy consumption |
| `--chart-2` | Secondary data | `fill-chart-2` | Energy savings |
| `--chart-3` | Tertiary data | `fill-chart-3` | Comparative data |
| `--chart-4` | Warning data | `fill-chart-4` | Attention areas |
| `--chart-5` | Critical data | `fill-chart-5` | Energy loss |
| `--chart-6` | Accent data | `fill-chart-6` | Highlights |
| `--chart-grid` | Grid lines | `stroke-chart-grid` | Chart grids |
| `--chart-axis` | Axis lines | `stroke-chart-axis` | Chart axes |
| `--chart-label` | Labels | `fill-chart-label` | Text labels |

**Example with Recharts:**
```tsx
<BarChart data={energyData}>
  <CartesianGrid stroke="var(--chart-grid)" />
  <XAxis stroke="var(--chart-axis)" />
  <Bar dataKey="consumption" fill="var(--chart-1)" />
  <Bar dataKey="savings" fill="var(--chart-2)" />
</BarChart>
```

### 10. 3D Visualization & Polygons

For Three.js visualizations and map polygons.

| Token | Usage | Three.js / Leaflet |
|-------|-------|---------------------|
| `--polygon-fill` | Polygon fill | `fillColor: 'var(--polygon-fill)'` |
| `--polygon-stroke` | Polygon outline | `color: 'var(--polygon-stroke)'` |
| `--polygon-hover-fill` | Hover state | Interactive fill |
| `--polygon-selected-fill` | Selected state | Selection highlight |
| `--polygon-selected-stroke` | Selected outline | Selection border |
| `--mesh-ambient` | Ambient light | Three.js ambient light |
| `--mesh-directional` | Directional light | Three.js directional light |

**Example (Three.js):**
```tsx
<ambientLight color="var(--mesh-ambient)" intensity={0.5} />
<directionalLight color="var(--mesh-directional)" intensity={0.8} />

<meshStandardMaterial
  color="var(--polygon-fill)"
  emissive={selected ? "var(--polygon-selected-stroke)" : "#000000"}
/>
```

**Example (Leaflet):**
```tsx
<Polygon
  positions={buildingFootprint}
  pathOptions={{
    fillColor: 'var(--polygon-fill)',
    color: 'var(--polygon-stroke)',
    weight: 2,
  }}
  eventHandlers={{
    mouseover: (e) => {
      e.target.setStyle({ fillColor: 'var(--polygon-hover-fill)' });
    },
  }}
/>
```

### 11. Map Components

| Token | Usage | Tailwind / Leaflet |
|-------|-------|---------------------|
| `--map-base` | Map background | `bg-map-base` |
| `--map-water` | Water features | Polygon color |
| `--map-land` | Land areas | Polygon color |
| `--map-border` | Borders | Stroke color |
| `--map-label` | Labels | Text color |
| `--map-marker` | Markers | Marker color |
| `--map-marker-hover` | Hover marker | Hover state |

### 12. Aurora / Northern Lights Theme

Special accent colors inspired by Northern Lights.

| Token | Usage | Tailwind Class |
|-------|-------|----------------|
| `--aurora-green` | Emerald aurora | `text-aurora-green` |
| `--aurora-cyan` | Ice blue | `text-aurora-cyan` |
| `--aurora-purple` | Violet aurora | `text-aurora-purple` |
| `--aurora-pink` | Magenta aurora | `text-aurora-pink` |
| `--aurora-yellow` | Golden aurora | `text-aurora-yellow` |
| `--aurora-red` | Red aurora | `text-aurora-red` |
| `--aurora-glow-green` | Green glow | `bg-aurora-glow-green` |

**Example:**
```tsx
<div className="relative">
  <div className="absolute inset-0 bg-aurora-glow-green blur-xl animate-pulse" />
  <h1 className="text-aurora-green relative z-10">Energy Insights</h1>
</div>
```

### 13. Gradients

Pre-defined gradient backgrounds.

| Token | Usage | Tailwind Class |
|-------|-------|----------------|
| `--gradient-primary` | Primary gradient | `bg-gradient-primary` |
| `--gradient-accent` | Accent gradient | `bg-gradient-accent` |
| `--gradient-aurora` | Aurora gradient | `bg-gradient-aurora` |
| `--gradient-energy` | Energy gradient | `bg-gradient-energy` |

**Example:**
```tsx
<div className="bg-gradient-aurora p-6 rounded-lg">
  <h2 className="text-white">Northern Energy Solutions</h2>
</div>
```

### 14. Shadows

| Token | Usage | Tailwind Class |
|-------|-------|----------------|
| `--shadow-sm` | Small shadow | `shadow-sm` |
| `--shadow-md` | Medium shadow | `shadow-md` |
| `--shadow-lg` | Large shadow | `shadow-lg` |
| `--shadow-xl` | Extra large shadow | `shadow-xl` |
| `--shadow-glow` | Glow effect | `shadow-glow` |

---

## How to Customize Colors

### Step 1: Edit CSS Variables

Open `src/app/globals.css` and modify the color values in either `:root` (light mode) or `.dark` (dark mode):

```css
:root {
  /* Change primary brand color */
  --primary: #10b981;  /* Emerald */
  --primary-hover: #059669;  /* Darker emerald */

  /* Adjust background colors */
  --background: #ffffff;  /* White */
  --card: #f8fafc;  /* Light gray */
}

.dark {
  /* Dark mode adjustments */
  --primary: #10b981;  /* Keep same emerald */
  --background: #0a0a0a;  /* True black */
  --card: #111111;  /* Dark gray */
}
```

### Step 2: Changes Apply Globally

All components using semantic tokens will update automatically:

```tsx
// This button updates when you change --primary
<Button className="bg-primary hover:bg-primary-hover">
  Analyze Energy
</Button>

// These cards update when you change --card
<Card className="bg-card border-card-border">
  Building Data
</Card>
```

### Step 3: Add New Colors

To add a new semantic color:

1. Add to `globals.css`:
```css
:root {
  --energy-efficient: #22c55e;  /* Green for efficiency */
}

.dark {
  --energy-efficient: #4ade80;  /* Brighter green for dark mode */
}
```

2. Add to `tailwind.config.js`:
```js
colors: {
  energy: {
    efficient: 'var(--energy-efficient)',
  },
}
```

3. Use in components:
```tsx
<div className="bg-energy-efficient">
  A-rated building
</div>
```

---

## Best Practices

### DO ✅

1. **Use semantic tokens for all colors**
   ```tsx
   <div className="bg-card text-foreground border-border">
   ```

2. **Let CSS variables handle theme switching**
   - No need for `dark:` prefix when using semantic tokens
   - `bg-card` automatically adapts to light/dark

3. **Use hierarchy for text**
   ```tsx
   <h1 className="text-text-primary">Title</h1>
   <p className="text-text-secondary">Body</p>
   <span className="text-text-muted">Meta</span>
   ```

4. **Leverage component-specific tokens**
   ```tsx
   // Charts
   <Bar fill="var(--chart-1)" />

   // Polygons
   <Polygon color="var(--polygon-stroke)" />

   // Maps
   <Marker fillColor="var(--map-marker)" />
   ```

### DON'T ❌

1. **Don't use hard-coded colors**
   ```tsx
   // ❌ Hard-coded - doesn't adapt to themes
   <div className="bg-slate-900 text-white">
   ```

2. **Don't duplicate theme logic**
   ```tsx
   // ❌ Manual theme switching - unnecessary
   <div className="bg-white dark:bg-gray-900">

   // ✅ Use semantic token instead
   <div className="bg-background">
   ```

3. **Don't use Tailwind color names for brand colors**
   ```tsx
   // ❌ Direct color - no central control
   <Button className="bg-emerald-500">

   // ✅ Semantic token - centrally controlled
   <Button className="bg-primary">
   ```

---

## Migration Guide

### Converting Existing Components

**Before:**
```tsx
<div className="bg-gray-50 dark:bg-slate-900">
  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
    <h2 className="text-gray-900 dark:text-white">Title</h2>
    <p className="text-gray-600 dark:text-gray-300">Content</p>
  </Card>
</div>
```

**After:**
```tsx
<div className="bg-background">
  <Card className="bg-card border-card-border">
    <h2 className="text-foreground">Title</h2>
    <p className="text-text-secondary">Content</p>
  </Card>
</div>
```

### Common Replacements

| Old Pattern | New Pattern |
|-------------|-------------|
| `bg-white dark:bg-slate-900` | `bg-background` |
| `bg-gray-50 dark:bg-gray-800` | `bg-card` |
| `text-gray-900 dark:text-white` | `text-foreground` |
| `text-gray-600 dark:text-gray-300` | `text-text-secondary` |
| `border-gray-200 dark:border-gray-700` | `border-border` |
| `bg-emerald-500` | `bg-primary` |
| `hover:bg-gray-100 dark:hover:bg-gray-800` | `hover:bg-card-hover` |

---

## Reference: Complete Token List

### 🎨 All Available Tokens

```
Base: background, background-elevated, background-subtle, foreground
Cards: card, card-foreground, card-border, card-hover
Glass: glass-bg, glass-border
Modals: popover, popover-foreground, modal-overlay
Primary: primary, primary-hover, primary-foreground, primary-muted
Secondary: secondary, secondary-hover, secondary-foreground
Accent: accent, accent-hover, accent-foreground, accent-muted
Status: success, destructive, warning (+ foreground, muted variants)
Text: text-primary, text-secondary, text-tertiary, text-muted, text-disabled
Borders: border, border-subtle, border-strong, divider
Inputs: input, input-border, input-border-hover, input-border-focus, input-foreground, input-placeholder, input-disabled
Buttons: button-primary-*, button-secondary-*, button-ghost-*, button-outline-*
Focus: ring, ring-offset, selection-bg, selection-text
Charts: chart-1 through chart-6, chart-grid, chart-axis, chart-label
3D/Polygons: polygon-*, mesh-*
Maps: map-*
Sidebar: sidebar, sidebar-*
Aurora: aurora-green, aurora-cyan, aurora-purple, aurora-pink, aurora-yellow, aurora-red, aurora-blue
Gradients: gradient-primary, gradient-accent, gradient-aurora, gradient-energy
Shadows: shadow-sm, shadow-md, shadow-lg, shadow-xl, shadow-glow
Overlays: overlay-light, overlay-dark, overlay-blur
```

---

## Support & Questions

For questions about the design system:
1. Check this documentation first
2. Refer to `src/app/globals.css` for color values
3. Refer to `tailwind.config.js` for available classes
4. Create an issue with examples of your use case

**Happy building! 🏗️⚡**
