# Designer Guide: Color Palette Management

**Last Updated**: October 1, 2025

## Overview

All colors in this application are controlled from **3 JSON files**. Edit these files to change colors across the entire application - no code changes needed!

## Quick Start

### 1. Edit Color Tokens

Navigate to `tokens/colors/` and open the file for your target theme:

- **Light mode**: `tokens/colors/light.json`
- **Dark mode**: `tokens/colors/dark.json`

### 2. Find the Color You Want to Change

Example: Change the primary brand color in light mode

```json
// tokens/colors/light.json
{
  "color": {
    "light": {
      "primary": {
        "default": {
          "value": "#d09951",  // ← Change this hex value
          "type": "color",
          "description": "Warm gold - Primary brand color"
        }
      }
    }
  }
}
```

### 3. Run the Build Command

```bash
npm run build:tokens
```

This regenerates the CSS and TypeScript files automatically.

### 4. See Your Changes

```bash
npm run dev
```

The app will reload with your new colors!

---

## Color Token Organization

### Structure

```
tokens/
├── colors/
│   ├── light.json       # Light theme colors
│   ├── dark.json        # Dark theme colors
└── core/
    └── common.json      # Gradients, shadows, etc.
```

### Token Format

Each color token has this structure:

```json
{
  "name-of-color": {
    "value": "#hexcode",
    "type": "color",
    "description": "What this color is used for"
  }
}
```

---

## Common Design Tasks

### Change Primary Brand Color

**Light Mode:**
```json
// tokens/colors/light.json
"primary": {
  "default": { "value": "#d09951" },      // Main primary color
  "hover": { "value": "#b8823f" },        // Hover state
  "foreground": { "value": "#ffffff" },   // Text on primary background
  "muted": { "value": "rgba(208, 153, 81, 0.1)" }  // Subtle background
}
```

**Dark Mode:**
```json
// tokens/colors/dark.json
"primary": {
  "default": { "value": "#10b981" },      // Main primary color
  "hover": { "value": "#34d399" },
  "foreground": { "value": "#0a0a0a" },
  "muted": { "value": "rgba(16, 185, 129, 0.15)" }
}
```

**Used for:**
- Buttons, links, accents
- Charts (primary energy data)
- Map markers
- Selected building polygons

---

### Change Building Polygon Colors (Map)

These colors appear on the interactive property map:

```json
// tokens/colors/light.json OR dark.json
"polygon": {
  "target": {
    "stroke": { "value": "#14b8a6" },                 // Teal outline
    "fill": { "value": "rgba(20, 184, 166, 0.4)" }    // Teal fill (40% opacity)
  },
  "neighbor": {
    "stroke": { "value": "#22c55e" },                 // Green outline
    "fill": { "value": "rgba(34, 197, 94, 0.3)" }     // Green fill (30% opacity)
  },
  "selected": {
    "fill": { "value": "rgba(208, 153, 81, 0.7)" },   // Gold fill (70% opacity)
    "stroke": { "value": "#b8823f" }                  // Gold outline
  }
}
```

**Color meanings:**
- **Target** (Teal): Buildings from the searched address
- **Neighbor** (Green): Surrounding buildings for context
- **Selected**: Currently selected building for analysis

---

### Change Chart Colors

```json
// tokens/colors/light.json
"chart": {
  "1": { "value": "#d09951", "description": "Primary energy data" },
  "2": { "value": "#8b7355", "description": "Secondary energy" },
  "3": { "value": "#c4a574", "description": "Tertiary" },
  "4": { "value": "#f59e0b", "description": "Warning/attention" },
  "5": { "value": "#ef4444", "description": "Critical/loss" },
  "6": { "value": "#10b981", "description": "Efficiency/savings" }
}
```

**Used in:**
- Energy consumption charts
- Investment breakdown pie charts
- TEK17 compliance visualizations

---

### Change Gradients

```json
// tokens/core/common.json
"gradient": {
  "light": {
    "aurora": {
      "value": "linear-gradient(135deg, #d09951 0%, #c4a574 50%, #8b7355 100%)",
      "type": "string"
    }
  }
}
```

**Used for:**
- Landing page gradient text (e.g., "energikostnadene")
- Header backgrounds
- Button hover effects

---

### Change Background Colors

```json
// tokens/colors/light.json
"base": {
  "background": { "value": "#ffffff", "description": "Main background" },
  "foreground": { "value": "#0a0a0a", "description": "Main text color" }
}
```

```json
// tokens/colors/dark.json
"base": {
  "background": { "value": "#0a0a0a", "description": "Main background" },
  "foreground": { "value": "#fafafa", "description": "Main text color" }
}
```

---

## Color Guidelines

### Opacity in RGBA

For colors with transparency, use `rgba()` format:

```json
{
  "value": "rgba(208, 153, 81, 0.3)"
}
```

Where:
- `208, 153, 81` = RGB values (from hex #d09951)
- `0.3` = Opacity (30%)

**Opacity guide:**
- `0.1` - Very subtle background tint
- `0.3` - Neighbor building fill
- `0.4` - Target building fill
- `0.6-0.7` - Selected building fill
- `0.8-0.9` - Glass morphism backgrounds
- `1.0` - Fully opaque

### Hex Color Format

Use 6-digit hex codes:

✅ Good: `"#d09951"`
❌ Bad: `"#d09"` (shorthand not supported)
❌ Bad: `"d09951"` (missing #)

### Color Contrast

Ensure sufficient contrast for accessibility:

- **Text on background**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio
- **Icons and UI**: Minimum 3:1 contrast ratio

Use a contrast checker: https://webaim.org/resources/contrastchecker/

### Semantic Color Consistency

Keep semantic meanings consistent:

```json
"semantic": {
  "success": { "value": "#10b981" },      // Always green
  "destructive": { "value": "#ef4444" },  // Always red
  "warning": { "value": "#f59e0b" }       // Always amber/orange
}
```

---

## Testing Your Changes

### 1. Build Tokens
```bash
npm run build:tokens
```

Should output:
```
🎨 Building design tokens...
📝 Generating globals.css...
✅ globals.css generated
📝 Generating theme-colors.ts...
✅ theme-colors.ts generated
🎉 Design tokens build complete!
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Test Theme Switching

1. Open the app in your browser
2. Click the theme toggle (sun/moon icon in header)
3. Verify colors change correctly
4. Check polygon colors on the map
5. Verify chart colors in dashboard

### 4. Test on Mobile

Use browser DevTools responsive mode to test:
- Color contrast on small screens
- Touch targets remain visible
- Gradients render correctly

---

## Troubleshooting

### Colors Don't Update

1. **Rebuild tokens:**
   ```bash
   npm run build:tokens
   ```

2. **Hard refresh browser:**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

3. **Check for JSON errors:**
   - Missing commas
   - Unclosed brackets
   - Invalid hex codes

### Build Fails

**Error: Invalid JSON**
```
SyntaxError: Unexpected token } in JSON
```

**Solution**: Use a JSON validator
- https://jsonlint.com/
- Paste your file content
- Fix syntax errors

**Error: Missing color value**
```
Error: Cannot read property 'value' of undefined
```

**Solution**: Ensure all color tokens have a `value` field:
```json
{
  "primary": {
    "default": {
      "value": "#d09951"  // ← This is required
    }
  }
}
```

### Theme Doesn't Switch

1. Check that both light and dark modes have the same token structure
2. Verify `next-themes` is installed
3. Clear browser cache

---

## Advanced: Adding New Colors

### 1. Add to Token File

```json
// tokens/colors/light.json
{
  "color": {
    "light": {
      "my-new-category": {
        "custom-color": {
          "value": "#your-hex-code",
          "type": "color",
          "description": "What it's used for"
        }
      }
    }
  }
}
```

### 2. Add to Dark Mode (Match Structure)

```json
// tokens/colors/dark.json
{
  "color": {
    "dark": {
      "my-new-category": {
        "custom-color": {
          "value": "#different-dark-mode-value",
          "type": "color",
          "description": "What it's used for"
        }
      }
    }
  }
}
```

### 3. Rebuild Tokens

```bash
npm run build:tokens
```

### 4. Use in CSS (via Tailwind)

First, add to `tailwind.config.js`:

```javascript
colors: {
  'my-custom': 'var(--my-new-category-custom-color)',
}
```

Then use in components:

```tsx
<div className="bg-my-custom">
  Content
</div>
```

### 5. Use in TypeScript (Runtime)

```typescript
import { useThemeColors } from '@/hooks/useThemeColors';

const colors = useThemeColors();
const myColor = colors.flat['my-new-category-custom-color'];
```

---

## Color Palette Reference

### Light Mode Primary Colors
- **Primary**: #d09951 (Warm gold)
- **Accent**: #06b6d4 (Cyan)
- **Success**: #10b981 (Emerald green)
- **Warning**: #f59e0b (Amber)
- **Error**: #ef4444 (Red)

### Dark Mode Primary Colors
- **Primary**: #10b981 (Emerald green)
- **Accent**: #06b6d4 (Cyan)
- **Success**: #10b981 (Emerald green)
- **Warning**: #f59e0b (Amber)
- **Error**: #ef4444 (Red)

### Norwegian Energy Branding

**Light Mode**: Warm, professional tones
- Gold (#d09951) - Represents energy efficiency savings
- Earth tones - Grounded, trustworthy

**Dark Mode**: Tech-forward, modern
- Emerald (#10b981) - Energy, growth, sustainability
- Cyan (#06b6d4) - Technology, innovation

---

## File Locations

**Token Source Files (EDIT THESE):**
- `tokens/colors/light.json`
- `tokens/colors/dark.json`
- `tokens/core/common.json`

**Generated Files (DO NOT EDIT):**
- `src/app/globals.css` - Auto-generated CSS variables
- `src/lib/theme-colors.ts` - Auto-generated TypeScript

**Build Script:**
- `scripts/build-tokens.js`

---

## Getting Help

**For designers:**
1. Check this guide first
2. Use JSON validator if build fails
3. Ask developer to verify token structure

**For developers:**
- See `planning/worklog/sessionlog_20251001_1700_design_token_system.md`
- Review `src/hooks/useThemeColors.ts` for hook usage
- Check `DESIGN_SYSTEM.md` for full technical documentation

---

## Best Practices

### ✅ Do
- Use descriptive color names
- Add descriptions to tokens
- Test both light and dark themes
- Check color contrast
- Rebuild tokens after edits

### ❌ Don't
- Edit `globals.css` directly (it's auto-generated)
- Edit `theme-colors.ts` directly (it's auto-generated)
- Use shorthand hex codes (#abc)
- Skip testing theme switching
- Commit without rebuilding tokens

---

**Questions?** Check the session log or ask a developer for assistance.

**Happy designing! 🎨**
