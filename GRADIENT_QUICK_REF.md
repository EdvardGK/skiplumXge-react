# Nordic Gradient Quick Reference

## 🎨 CSS Variables (Use These!)

```tsx
// Primary gradients
background: 'var(--gradient-primary)'          // Fjord Fade (45deg forest → blue)
background: 'var(--gradient-accent)'           // Aurora Accent (horizontal CTA)
background: 'var(--gradient-aurora)'           // Nordic Aurora (135deg full spectrum)
background: 'var(--gradient-energy)'           // Energy gradient (180deg vertical)
background: 'var(--gradient-forest-whisper)'   // Radial (center → edge)
background: 'var(--gradient-snowy-subtle)'     // Conic (rotating)
```

## 🚀 Common Patterns

### Hero Background
```tsx
<div style={{ background: 'var(--gradient-primary)', minHeight: '400px' }}>
  {/* Content */}
</div>
```

### CTA Button
```tsx
<Button style={{ background: 'var(--gradient-accent)' }}>
  Forbedre Energiytelsen
</Button>
```

### Progress Bar
```tsx
<div style={{
  background: 'var(--gradient-energy)',
  width: '65%',
  height: '12px'
}} />
```

### Map Highlight
```tsx
<div style={{
  background: 'var(--gradient-forest-whisper)',
  opacity: 0.5
}} />
```

### Loading Spinner
```tsx
<div
  className="w-12 h-12 rounded-full animate-spin"
  style={{ background: 'var(--gradient-snowy-subtle)' }}
/>
```

### Gradient Text
```tsx
<h1 style={{
  background: 'var(--gradient-aurora)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
}}>
  Nordic Energy
</h1>
```

## 🎯 Use Cases

| Gradient | Best For | Performance |
|----------|----------|-------------|
| `primary` | Hero sections, large backgrounds | ⚡ Fast (linear) |
| `accent` | CTA buttons, important actions | ⚡ Fast (linear) |
| `aurora` | Feature highlights, decorative | ⚡ Fast (linear) |
| `energy` | Progress bars, metrics | ⚡ Fast (linear) |
| `forest-whisper` | Map overlays, selections | ⚠️ Medium (radial) |
| `snowy-subtle` | Small icons, badges (< 100px) | ⚠️ Slower (conic) |

## 🔧 Helper Functions

```tsx
import { useGradients, createGradientText } from '@/lib/gradient-utilities';

// Get gradient programmatically
const { getGradient } = useGradients();
const heroGradient = getGradient('primary');

// Create gradient text style
const textStyle = createGradientText('aurora');
<h1 style={textStyle}>Title</h1>
```

## ⚡ Performance Tips

### ✅ DO
```tsx
// Use CSS variables (no re-render)
style={{ background: 'var(--gradient-primary)' }}

// Animate with transform/opacity (GPU)
className="hover:scale-105 transition-transform"

// Limit gradient count (2-3 per page)
```

### ❌ DON'T
```tsx
// Inline gradient definitions (causes re-render)
style={{ background: 'linear-gradient(45deg, ...)' }}

// Animate with width/margin (CPU-bound)
style={{ width: isHovered ? '200px' : '100px' }}

// Too many gradients (GPU overload)
```

## 🎨 Color Reference

| Name | Light | Dark | Hex (Light) |
|------|-------|------|-------------|
| Forest Green | Primary | - | #2C4A3A |
| Fjord Blue | Accent | Primary | #4A7C92 |
| Ice Blue | - | Accent | #A4C8E1 |
| Terracotta | CTA | CTA | #D97C30 |
| Warm Amber | - | CTA | #F2B05C |

## 📱 Responsive Usage

```tsx
// Tailwind responsive gradients (when available)
className="bg-gradient-primary md:bg-gradient-accent"

// React responsive
const isMobile = useMediaQuery('(max-width: 768px)');
const gradient = isMobile ? 'var(--gradient-primary)' : 'var(--gradient-aurora)';
```

## 🧪 Testing Checklist

- [ ] Gradient visible in light mode
- [ ] Gradient visible in dark mode
- [ ] Text contrast ≥ 4.5:1 on gradient
- [ ] No layout shift (CLS < 0.1)
- [ ] Smooth on mobile (< 60fps)
- [ ] Fallback color works (old browsers)

## 📋 Examples

See `src/components/examples/GradientExamples.tsx` for working code.
