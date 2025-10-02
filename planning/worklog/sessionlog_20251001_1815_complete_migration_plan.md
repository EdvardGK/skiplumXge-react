# Session Log: Complete Design Token Migration Plan
**Date**: 2025-10-01 18:15
**Session Type**: Analysis & Planning
**Status**: 📋 Plan Ready for Execution

## Session Objective
Create a comprehensive, line-by-line migration plan to bring the entire application up to speed with the design token system. Address all hard-coded colors and fix critical UX issues (scrolling, theme switching, contrast).

## Problem Statement
After implementing the design token system, user reported multiple issues:
1. **Poor contrast in light mode** - Dark mode colors bleeding through
2. **Loading screens still dark mode** - Components not using tokens
3. **Building selector dark mode** - Hard-coded colors
4. **Waterfall page not scrollable** - Global CSS overflow restriction
5. **Three.js components dark colors** - Not using design tokens
6. **No visible difference** - Most components still hard-coded

**Root cause:** Design token system is working correctly, but only 1 component (PropertyMap) has been migrated. 43+ files still use hard-coded Tailwind classes.

## Analysis Performed

### Codebase Scan Results

**Pages needing migration (4 files):**
- `src/app/page.tsx` (Landing): **38 hard-coded instances**
- `src/app/select-building/page.tsx`: **49 hard-coded instances**
- `src/app/dashboard/page.tsx`: **28 hard-coded instances**
- `src/app/dashboard-waterfall/page.tsx`: **2 hard-coded instances**

**Total page instances: 117**

**Components needing migration:**
- **40 component files** contain hard-coded colors
- Most critical: Forms, modals, charts, UI components

### Critical Issue Identified

**File:** `src/app/globals.css` lines 290-297
```css
/* Prevent body scrolling on desktop/tablet */
@media (min-width: 768px) {
  html, body {
    overflow: hidden;  /* ← BREAKS WATERFALL PAGE */
    height: 100%;
    max-height: 100vh;
  }
}
```

**Impact:** Waterfall page (meant to be scrollable) cannot scroll on desktop.

### Why Migration Didn't Happen Automatically

1. **Tailwind config exists** ✓ - Maps CSS variables correctly
2. **CSS variables generated** ✓ - All tokens available
3. **Component usage** ❌ - Still using hard-coded classes like:
   - `bg-gray-50 dark:bg-[#0c0c0e]` instead of `bg-background`
   - `text-emerald-500 dark:text-emerald-400` instead of `text-primary`
   - `from-emerald-500 via-cyan-500 to-violet-500` instead of `bg-gradient-aurora`

**Manual component migration required** - No automatic way to replace these.

## Session Timeline

- **18:15** - Session started, user reported contrast/visibility issues
- **18:20** - Analyzed codebase, counted hard-coded instances
- **18:25** - Identified global overflow:hidden issue
- **18:30** - Scanned all pages and components
- **18:35** - Created comprehensive migration plan
- **18:40** - Documented plan with line-by-line checklist
- **18:45** - Ready for execution

---

# COMPLETE MIGRATION PLAN

## Overview

**Total work:** 4.5-5.5 hours
**Files to migrate:** 44 files (4 pages + 40 components)
**Replacements needed:** 150+ hard-coded color instances
**Approach:** Line-by-line replacement, one file at a time

---

## Phase 1: Fix Critical Global Issues ⚠️
**Priority:** URGENT
**Time:** 5 minutes
**File:** `src/app/globals.css`

### Issue: Desktop Scrolling Disabled

**Location:** Lines 290-297

**Current code:**
```css
/* Prevent body scrolling on desktop/tablet */
@media (min-width: 768px) {
  html, body {
    overflow: hidden;
    height: 100%;
    max-height: 100vh;
  }
}
```

**Problem:**
- Breaks waterfall page (needs vertical scroll)
- Prevents any page from scrolling on desktop
- Dashboard pages may also need scrolling

**Solutions (choose one):**

**Option A - Remove entirely (RECOMMENDED):**
```css
/* REMOVE LINES 290-297 */
```

**Option B - Make page-specific:**
```css
/* Only apply to specific pages that need it */
body[data-no-scroll="true"] {
  overflow: hidden;
  height: 100%;
}
```

**Option C - Exclude waterfall page:**
```css
@media (min-width: 768px) {
  html:not(.allow-scroll), body:not(.allow-scroll) {
    overflow: hidden;
    height: 100%;
    max-height: 100vh;
  }
}
```

**Recommendation:** Option A (remove) - Let pages control their own overflow

---

## Phase 2: Landing Page Migration
**Priority:** HIGH
**Time:** 30 minutes
**File:** `src/app/page.tsx`
**Instances:** 38 replacements

### Line-by-Line Replacement Checklist

#### ✅ Already Fixed (3 instances)
- [x] Line 117: `bg-background` (was `bg-gray-50 dark:bg-[#0c0c0e]`)
- [x] Line 134: `text-foreground` (was `text-gray-900 dark:text-white`)
- [x] Line 158: `bg-gradient-aurora` (was `from-emerald-500 via-cyan-500...`)

#### 🔲 Remaining Replacements (35 instances)

**Background Aurora Effects (Lines 119-122):**
- [ ] Line 120: `bg-emerald-400/20` → `bg-aurora-green/20`
- [ ] Line 121: `bg-cyan-400/20` → `bg-aurora-cyan/20`
- [ ] Line 122: `bg-violet-400/20` → `bg-aurora-purple/20`

**Header Section (Lines 126-145):**
- [ ] Line 126: `border-gray-200 dark:border-gray-800/50` → `border`
- [ ] Line 126: `bg-white/80 dark:bg-[#0c0c0e]/80` → `bg-background/80`
- [ ] Line 131: `text-emerald-500 dark:text-emerald-400` → `text-primary`
- [ ] Line 132: `bg-emerald-400/20` → `bg-primary/20`
- [ ] Line 138: `text-gray-600 dark:text-gray-300` → `text-text-secondary`
- [ ] Line 138: `hover:text-emerald-500 dark:hover:text-emerald-400` → `hover:text-primary`
- [ ] Line 142: `border-emerald-500/30` → `border-primary/30`
- [ ] Line 142: `text-emerald-600 dark:text-emerald-400` → `text-primary`
- [ ] Line 142: `hover:bg-emerald-500/10` → `hover:bg-primary/10`
- [ ] Line 142: `hover:border-emerald-400` → `hover:border-primary-hover`

**Hero Section (Lines 163-165):**
- [ ] Line 163: `text-gray-600 dark:text-gray-300` → `text-text-secondary`

**Search Card (Lines 170-198):**
- [ ] Line 172: `text-gray-900 dark:text-white` → `text-card-foreground`
- [ ] Line 175: `text-gray-500 dark:text-gray-400` → `text-text-tertiary`
- [ ] Line 181: `text-gray-400 dark:text-gray-400` → `text-text-muted`
- [ ] Line 185: `bg-white dark:bg-gray-800/50` → `bg-input`
- [ ] Line 185: `border-gray-300 dark:border-gray-600/50` → `border-input-border`
- [ ] Line 185: `text-gray-900 dark:text-white` → `text-input-foreground`
- [ ] Line 185: `placeholder-gray-400 dark:placeholder-gray-400` → `placeholder-input-placeholder`
- [ ] Line 185: `focus:border-emerald-400/50` → `focus:border-input-border-focus`
- [ ] Line 185: `focus:ring-emerald-400/20` → `focus:ring-primary/20`
- [ ] Line 197: `hover:bg-gray-700/50` → `hover:bg-secondary-hover`

**Search Results Dropdown:**
(Lines 200-250 approximately - check exact line numbers)
- [ ] Background: `bg-white dark:bg-gray-900` → `bg-card`
- [ ] Border: `border-gray-200 dark:border-gray-700` → `border-card-border`
- [ ] Text: `text-gray-900 dark:text-white` → `text-card-foreground`
- [ ] Hover: `hover:bg-gray-50 dark:hover:bg-gray-800` → `hover:bg-card-hover`

**Feature Cards Section:**
(Lines 260-320 approximately)
- [ ] Card backgrounds: `bg-white/80 dark:bg-gray-900/50` → `bg-card/80`
- [ ] Card borders: `border-gray-200 dark:border-gray-700/50` → `border-card-border`
- [ ] Card text: `text-gray-900 dark:text-white` → `text-card-foreground`
- [ ] Icon colors: `text-emerald-500 dark:text-emerald-400` → `text-primary`
- [ ] Description text: `text-gray-600 dark:text-gray-300` → `text-text-secondary`

**Loading States:**
- [ ] Spinner: `text-emerald-500` → `text-primary`
- [ ] Background: `bg-gray-900/50` → `bg-modal-overlay`

---

## Phase 3: Select-Building Page Migration
**Priority:** HIGH
**Time:** 45 minutes
**File:** `src/app/select-building/page.tsx`
**Instances:** 49 replacements

### Major Sections

#### Page Background & Layout
- [ ] Main container: `bg-gray-50 dark:bg-[#0c0c0e]` → `bg-background`
- [ ] Header: Same patterns as landing page

#### Map Loading State
- [ ] Loading overlay: `bg-gray-900/95 dark:bg-black/95` → `bg-modal-overlay`
- [ ] Loading text: `text-white` → `text-foreground`
- [ ] Spinner: `text-emerald-400` → `text-primary`

#### Building Selection Cards
- [ ] Card backgrounds: `bg-white dark:bg-gray-900` → `bg-card`
- [ ] Card borders: `border-gray-200 dark:border-gray-700` → `border-card-border`
- [ ] Card hover: `hover:bg-gray-50 dark:hover:bg-gray-800` → `hover:bg-card-hover`
- [ ] Selected state: `border-emerald-500` → `border-primary`
- [ ] Selected bg: `bg-emerald-50 dark:bg-emerald-900/20` → `bg-primary-muted`

#### Building Info Display
- [ ] Title text: `text-gray-900 dark:text-white` → `text-foreground`
- [ ] Label text: `text-gray-500 dark:text-gray-400` → `text-text-tertiary`
- [ ] Value text: `text-gray-900 dark:text-white` → `text-foreground`
- [ ] Badge backgrounds: Various colors → Use semantic tokens

#### Action Buttons
- [ ] Primary button: `bg-emerald-500 hover:bg-emerald-600` → `bg-primary hover:bg-primary-hover`
- [ ] Secondary button: `bg-gray-200 dark:bg-gray-700` → `bg-secondary hover:bg-secondary-hover`
- [ ] Button text: Match foreground patterns

#### Form Modal
- [ ] Modal overlay: `bg-black/50` → `bg-modal-overlay`
- [ ] Modal background: `bg-white dark:bg-gray-900` → `bg-popover`
- [ ] Form inputs: Same patterns as landing page search input
- [ ] Form labels: `text-gray-700 dark:text-gray-300` → `text-foreground`

---

## Phase 4: Dashboard Page Migration
**Priority:** MEDIUM
**Time:** 30 minutes
**File:** `src/app/dashboard/page.tsx`
**Instances:** 28 replacements

### Major Sections

#### Energy Metric Tiles
- [ ] Tile backgrounds: `bg-white dark:bg-gray-900` → `bg-card`
- [ ] Tile borders: `border-gray-200 dark:border-gray-700` → `border-card-border`
- [ ] Metric values: `text-gray-900 dark:text-white` → `text-foreground`
- [ ] Metric labels: `text-gray-600 dark:text-gray-400` → `text-text-secondary`
- [ ] Grade badges: Use semantic colors (success, warning, destructive)

#### Charts
- [ ] Chart container: `bg-card`
- [ ] Chart colors: Use `chart-1` through `chart-6` tokens
  ```tsx
  // Example for Recharts
  import { useChartColors } from '@/hooks/useThemeColors';

  const chartColors = useChartColors();
  <Line dataKey="energy" stroke={chartColors.energy} />
  ```

#### Investment Breakdown
- [ ] Section background: `bg-card`
- [ ] Breakdown bars: Use `chart` tokens
- [ ] Amount text: `text-foreground`
- [ ] Percentage text: `text-text-secondary`

#### Action Buttons
- [ ] "Generate Report": `bg-primary hover:bg-primary-hover text-primary-foreground`
- [ ] "Contact Expert": `bg-accent hover:bg-accent-hover text-accent-foreground`
- [ ] "Download PDF": Secondary button pattern

---

## Phase 5: Waterfall Page Migration
**Priority:** LOW (only 2 instances)
**Time:** 10 minutes
**File:** `src/app/dashboard-waterfall/page.tsx`
**Instances:** 2 replacements

### Changes Needed

**Line 165:**
- [x] Already uses `bg-background` ✓

**Line 173:**
- [ ] Verify Three.js component uses `useMeshColors()` hook

**Three.js Scene Colors:**
```tsx
// In the Building3DVisualization component:
import { useMeshColors } from '@/hooks/useThemeColors';

const meshColors = useMeshColors();

// Apply to materials:
<meshStandardMaterial color={meshColors.wall} />
<meshStandardMaterial color={meshColors.roof} />
```

**Scrolling Fix:**
- Verify page scrolls after Phase 1 fix
- Test section transitions work correctly

---

## Phase 6: Component Migration
**Priority:** MEDIUM-LOW
**Time:** 2-3 hours
**Files:** 40 component files

### High Priority Components (User-facing)

#### 1. BuildingDataFormModal.tsx
- [ ] Modal overlay: `bg-modal-overlay`
- [ ] Modal background: `bg-popover`
- [ ] Form fields: Use input tokens
- [ ] Labels: `text-foreground`
- [ ] Helper text: `text-text-tertiary`
- [ ] Buttons: Use button tokens

#### 2. ContactFormModal.tsx
- [ ] Same patterns as BuildingDataFormModal
- [ ] Submit button: `bg-primary hover:bg-primary-hover`
- [ ] Cancel button: `bg-secondary hover:bg-secondary-hover`

#### 3. EnergyGradeVisualization.tsx
- [ ] Chart colors: Use `chart` tokens
- [ ] Grade indicators: Use semantic colors
- [ ] Background: `bg-card`
- [ ] Text: `text-foreground`

#### 4. Dashboard Tile Components
For each tile component:
- [ ] Container: `bg-card border-card-border`
- [ ] Title: `text-card-foreground`
- [ ] Value: `text-foreground text-2xl font-bold`
- [ ] Label: `text-text-secondary text-sm`
- [ ] Icon: `text-primary` or appropriate semantic color

### Medium Priority Components (15-20 files)

Dashboard components, chart wrappers, data display components:
- Follow same patterns as above
- Use semantic tokens consistently
- Test in both light and dark modes

### Low Priority Components (20 files)

UI components that already inherit colors:
- May not need changes if they inherit from parent
- Focus on any hard-coded backgrounds/borders
- Verify hover states work

---

## Phase 7: Testing & Verification
**Priority:** CRITICAL
**Time:** 30 minutes

### Per-Page Testing Checklist

#### Landing Page (src/app/page.tsx)
**Light Mode:**
- [ ] White background (#ffffff)
- [ ] Amber-orange gradient text (#d6894a)
- [ ] Black text readable on white
- [ ] Search input has proper borders
- [ ] Hover states work (buttons, links)
- [ ] Feature cards have good contrast
- [ ] Loading states visible

**Dark Mode:**
- [ ] Dark background (#0a0a0a)
- [ ] Emerald-cyan-purple gradient text
- [ ] White/light text readable on dark
- [ ] All elements visible
- [ ] Aurora background blobs visible

**Theme Toggle:**
- [ ] Smooth transition (no flash)
- [ ] All elements update immediately
- [ ] No layout shifts
- [ ] Theme persists on refresh

---

#### Select-Building Page
**Light Mode:**
- [ ] Map visible with proper contrast
- [ ] Building cards readable
- [ ] Selected building highlighted clearly
- [ ] Form modal readable
- [ ] Buttons have good contrast

**Dark Mode:**
- [ ] Map adapts to dark theme
- [ ] Polygon colors use design tokens (already done ✓)
- [ ] Building info cards visible
- [ ] Modal has proper backdrop

**Functionality:**
- [ ] Building selection works
- [ ] Theme toggle updates map colors
- [ ] Form submission works

---

#### Dashboard Page
**Light Mode:**
- [ ] Metric tiles readable
- [ ] Charts use amber-orange palette
- [ ] Numbers have strong contrast
- [ ] Investment breakdown visible
- [ ] Action buttons clear

**Dark Mode:**
- [ ] Tiles visible against dark background
- [ ] Charts use emerald-cyan palette
- [ ] White text readable
- [ ] All metrics visible

**Functionality:**
- [ ] Charts render correctly
- [ ] Theme toggle updates chart colors
- [ ] All interactions work

---

#### Waterfall Page
**Critical Tests:**
- [ ] **PAGE SCROLLS** on desktop ✓✓✓
- [ ] **PAGE SCROLLS** on mobile
- [ ] Section transitions trigger on scroll
- [ ] Three.js scene visible in both themes
- [ ] Building model colors adapt to theme
- [ ] All sections reachable by scrolling

**Light Mode:**
- [ ] White background
- [ ] 3D model has proper lighting
- [ ] Text sections readable

**Dark Mode:**
- [ ] Dark background
- [ ] 3D model visible
- [ ] Proper ambient lighting

---

### Cross-Browser Testing

**Chrome (Primary):**
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

**Firefox:**
- [ ] Desktop view
- [ ] Mobile view

**Safari (if available):**
- [ ] Desktop view
- [ ] Mobile view

### Accessibility Testing

**Contrast Ratios (WCAG AA):**
- [ ] Light mode: All text meets 4.5:1 minimum
- [ ] Dark mode: All text meets 4.5:1 minimum
- [ ] Check with browser DevTools or online tool

**Keyboard Navigation:**
- [ ] Tab through all interactive elements
- [ ] Focus states visible
- [ ] Theme toggle accessible via keyboard

**Screen Reader:**
- [ ] Theme toggle announces state
- [ ] All buttons have accessible names
- [ ] Form labels properly associated

---

## Color Replacement Quick Reference

### Most Common Replacements

| Hard-coded Pattern | Design Token | Usage |
|--------------------|--------------|-------|
| `bg-gray-50 dark:bg-[#0c0c0e]` | `bg-background` | Main page background |
| `bg-white dark:bg-gray-900` | `bg-card` | Card/panel backgrounds |
| `bg-white/80 dark:bg-gray-900/50` | `bg-card/80` | Semi-transparent cards |
| `text-gray-900 dark:text-white` | `text-foreground` | Main text |
| `text-gray-600 dark:text-gray-300` | `text-text-secondary` | Secondary text |
| `text-gray-500 dark:text-gray-400` | `text-text-tertiary` | Tertiary text |
| `text-gray-400` | `text-text-muted` | Muted/placeholder text |
| `bg-emerald-500 dark:bg-emerald-400` | `bg-primary` | Primary brand color |
| `text-emerald-500 dark:text-emerald-400` | `text-primary` | Primary text color |
| `hover:bg-emerald-500/10` | `hover:bg-primary/10` | Hover states |
| `border-gray-200 dark:border-gray-700` | `border` | Standard borders |
| `border-gray-200 dark:border-gray-700/50` | `border-card-border` | Card borders |

### Gradient Replacements

| Hard-coded | Design Token |
|------------|--------------|
| `from-emerald-500 via-cyan-500 to-violet-500 dark:from-emerald-400 dark:via-cyan-400 dark:to-violet-400` | `bg-gradient-aurora` |
| `from-emerald-500 to-cyan-500` | `bg-gradient-primary` |
| `from-cyan-500 to-violet-500` | `bg-gradient-accent` |

### Form Input Replacements

| Element | Hard-coded | Design Token |
|---------|------------|--------------|
| Background | `bg-white dark:bg-gray-800` | `bg-input` |
| Border | `border-gray-300 dark:border-gray-600` | `border-input-border` |
| Border hover | `hover:border-gray-400` | `hover:border-input-border-hover` |
| Border focus | `focus:border-emerald-400` | `focus:border-input-border-focus` |
| Text | `text-gray-900 dark:text-white` | `text-input-foreground` |
| Placeholder | `placeholder-gray-400` | `placeholder-input-placeholder` |

### Button Replacements

| Button Type | Hard-coded | Design Token |
|-------------|------------|--------------|
| Primary bg | `bg-emerald-500` | `bg-button-primary-bg` or `bg-primary` |
| Primary hover | `hover:bg-emerald-600` | `hover:bg-button-primary-hover` or `hover:bg-primary-hover` |
| Primary text | `text-white` | `text-button-primary-text` or `text-primary-foreground` |
| Secondary bg | `bg-gray-200 dark:bg-gray-700` | `bg-button-secondary-bg` or `bg-secondary` |
| Secondary hover | `hover:bg-gray-300` | `hover:bg-button-secondary-hover` or `hover:bg-secondary-hover` |

---

## Available Design Tokens Reference

### Background Tokens
```tsx
bg-background           // Main page background
bg-background-elevated  // Raised surfaces
bg-background-subtle    // Subtle variations
bg-card                // Card backgrounds
bg-card-hover          // Card hover states
bg-glass-bg            // Glass morphism backgrounds
bg-popover             // Popover/dropdown backgrounds
bg-modal-overlay       // Modal backdrop overlays
```

### Text Tokens
```tsx
text-foreground        // Primary text
text-card-foreground   // Text on cards
text-text-secondary    // Secondary text (600 weight in light)
text-text-tertiary     // Tertiary text (500 weight)
text-text-muted        // Muted text (400 weight)
text-text-disabled     // Disabled text
```

### Brand Color Tokens
```tsx
bg-primary             // #d6894a (light) / #10b981 (dark)
text-primary           // Same as bg-primary for text
bg-primary-hover       // Darker shade for hover
text-primary-hover     // Hover text color
bg-primary-muted       // Subtle background tint
border-primary         // Primary border color
```

### Semantic Color Tokens
```tsx
bg-success / text-success       // Green (#10b981)
bg-destructive / text-destructive  // Red (#ef4444)
bg-warning / text-warning       // Amber (#f59e0b)
bg-accent / text-accent         // Cyan (#06b6d4)
```

### Border Tokens
```tsx
border                 // Standard border
border-card-border     // Card borders
border-subtle          // Subtle borders
border-strong          // Strong borders
```

### Input Tokens
```tsx
bg-input               // Input background
border-input-border    // Input border
border-input-border-hover    // Input border hover
border-input-border-focus    // Input border focus
text-input-foreground        // Input text
placeholder-input-placeholder // Placeholder text
```

### Button Tokens
```tsx
// Primary button
bg-button-primary-bg
hover:bg-button-primary-hover
active:bg-button-primary-active
text-button-primary-text

// Secondary button
bg-button-secondary-bg
hover:bg-button-secondary-hover
active:bg-button-secondary-active
text-button-secondary-text

// Ghost button
hover:bg-button-ghost-hover
active:bg-button-ghost-active
```

### Chart Tokens
```tsx
bg-chart-1             // #d6894a (light) / #10b981 (dark) - Primary data
bg-chart-2             // Secondary data series
bg-chart-3             // Tertiary data series
bg-chart-4             // Warning/attention (#f59e0b)
bg-chart-5             // Critical/loss (#ef4444)
bg-chart-6             // Efficiency/savings (#10b981)
text-chart-grid        // Grid lines
text-chart-axis        // Axis labels
text-chart-label       // Data labels
```

### Gradient Tokens
```tsx
bg-gradient-primary    // Amber-orange gradient (light) / Emerald-cyan (dark)
bg-gradient-accent     // Lighter gradient variation
bg-gradient-aurora     // Multi-color gradient (amber-orange family light / emerald-cyan-purple dark)
bg-gradient-energy     // Energy-themed gradient
```

### Aurora Theme Tokens
```tsx
bg-aurora-green        // #10b981
bg-aurora-cyan         // #06b6d4
bg-aurora-purple       // #8b5cf6
bg-aurora-pink         // #ec4899
bg-aurora-yellow       // #f59e0b
bg-aurora-red          // #ef4444
bg-aurora-blue         // #3b82f6
bg-aurora-glow-green   // With opacity
bg-aurora-glow-cyan    // With opacity
bg-aurora-glow-purple  // With opacity
```

---

## Execution Strategy

### Working Method

**For each file:**
1. Open file in editor
2. Search for patterns:
   - `bg-gray-`
   - `text-gray-`
   - `bg-slate-`
   - `dark:bg-`
   - `dark:text-`
   - `bg-emerald-`
   - `text-emerald-`
   - `from-emerald-`
3. Replace each instance with appropriate token
4. Save file
5. Test in browser (both themes)
6. Fix any issues
7. Mark file as complete
8. Move to next file

**Best practices:**
- Complete one file fully before moving to next
- Test immediately after each file
- Keep browser DevTools open
- Toggle theme frequently to verify
- Check console for warnings
- Verify no visual regressions

### Git Strategy

**Commit after each phase:**
```bash
# After Phase 1
git add src/app/globals.css
git commit -m "fix: remove desktop overflow restriction for scrolling"

# After Phase 2
git add src/app/page.tsx
git commit -m "feat: migrate landing page to design tokens"

# After Phase 3
git add src/app/select-building/page.tsx
git commit -m "feat: migrate select-building page to design tokens"

# And so on...
```

**Benefits:**
- Easy to revert if issues
- Clear history of changes
- Can deploy incrementally if needed

---

## Risk Mitigation

### Potential Issues

**Issue 1: Color contrast problems**
- **Risk:** Some token combinations may not have sufficient contrast
- **Mitigation:** Test each page with contrast checker, adjust tokens if needed
- **Fallback:** Keep hard-coded values in comments for reference

**Issue 2: Missing hover states**
- **Risk:** Some interactions may lose hover feedback
- **Mitigation:** Verify all interactive elements have hover states
- **Fallback:** Add explicit hover colors where needed

**Issue 3: Chart colors not theme-aware**
- **Risk:** Charts may need special handling
- **Mitigation:** Use `useChartColors()` hook explicitly
- **Fallback:** Pass colors as props

**Issue 4: Three.js lighting issues**
- **Risk:** 3D scene may be too dark or too bright
- **Mitigation:** Test both themes carefully, adjust intensity values
- **Fallback:** Use `useMeshColors()` hook with custom intensity

**Issue 5: Performance regression**
- **Risk:** CSS variable lookups could slow rendering
- **Mitigation:** Monitor performance, CSS variables are native and fast
- **Fallback:** None needed - this is not a real concern

### Rollback Plan

If major issues arise:
1. Revert last commit
2. Fix specific issue
3. Re-apply changes
4. Test again

**Per-file rollback:**
```bash
git checkout HEAD~1 src/app/page.tsx
# Fix issues
git add src/app/page.tsx
git commit -m "fix: correct contrast issues in landing page"
```

---

## Success Metrics

### Functional Metrics
- [ ] All pages load without errors
- [ ] Theme toggle works on all pages
- [ ] No visual regressions (compare screenshots)
- [ ] All interactions work (forms, buttons, links)
- [ ] Waterfall page scrolls properly
- [ ] Map colors theme-aware

### Quality Metrics
- [ ] WCAG AA contrast ratios met (light mode)
- [ ] WCAG AA contrast ratios met (dark mode)
- [ ] No hard-coded `bg-gray-*` in main pages
- [ ] No hard-coded `dark:` classes in main pages
- [ ] Consistent use of design tokens
- [ ] Clean console (no warnings/errors)

### Performance Metrics
- [ ] No performance regression
- [ ] Smooth theme transitions (<200ms)
- [ ] No layout shift on theme toggle
- [ ] Page load time unchanged

---

## Timeline Estimate

### Conservative Estimate (includes breaks)

**Day 1 (3 hours):**
- Phase 1: Fix scrolling (5 min)
- Phase 2: Landing page (30 min)
- Phase 3: Select-building page (45 min)
- Testing: Landing + Select-building (20 min)
- *Break: 20 min*
- Phase 4: Dashboard page (30 min)
- Phase 5: Waterfall page (10 min)
- Testing: Dashboard + Waterfall (20 min)

**Day 2 (2.5 hours):**
- Phase 6: High-priority components (1 hour)
- Phase 6: Medium-priority components (1 hour)
- Phase 7: Final testing (30 min)

**Total: 5.5 hours over 2 sessions**

### Aggressive Estimate (no breaks)

**Single session (4.5 hours):**
- All phases completed sequentially
- Minimal testing between phases
- Bulk testing at end
- Higher risk of issues

**Recommended:** Conservative approach with testing after each phase

---

## Post-Migration Tasks

After all migrations complete:

### Documentation
- [ ] Update DESIGN_SYSTEM.md with migration examples
- [ ] Update DESIGNER_GUIDE.md with lessons learned
- [ ] Document any custom patterns discovered
- [ ] Create component migration guide for future use

### Code Quality
- [ ] Run linter, fix any warnings
- [ ] Run TypeScript compiler, ensure no errors
- [ ] Check for unused CSS classes
- [ ] Remove any commented-out code

### Optimization
- [ ] Review bundle size (should be unchanged)
- [ ] Check for duplicate CSS variable definitions
- [ ] Verify Tailwind purge working correctly
- [ ] Test production build

### Communication
- [ ] Demo theme switching to stakeholders
- [ ] Share before/after screenshots
- [ ] Document color changes from previous version
- [ ] Get feedback on color choices

---

## Session Notes - Key Decisions

### Decision 1: Remove Global Overflow Hidden
**Rationale:** Waterfall page needs to scroll, dashboard may need scrolling in future. Better to let pages control their own overflow behavior.

**Alternative considered:** Page-specific classes
**Chosen approach:** Remove entirely (simplest, most flexible)

### Decision 2: Line-by-Line Migration
**Rationale:** Ensures every instance is reviewed and tested. Reduces risk of missing edge cases.

**Alternative considered:** Bulk find/replace script
**Chosen approach:** Manual with checklist (more careful, higher quality)

### Decision 3: Phase-by-Phase Execution
**Rationale:** Complete one page fully before moving to next. Easier to test, easier to roll back if issues.

**Alternative considered:** Fix all backgrounds, then all text, then all borders
**Chosen approach:** Per-file completion (more logical, easier to track)

### Decision 4: Commit After Each Phase
**Rationale:** Clear git history, easy to revert individual pages if needed, supports incremental deployment.

**Alternative considered:** Single large commit at end
**Chosen approach:** Per-phase commits (better version control)

---

## Ready for Execution

**All analysis complete**
**Plan documented with checklists**
**Success criteria defined**
**Rollback plan in place**

✅ **Ready to begin Phase 1: Fix scrolling issue**

---

## Files Modified (Tracking)

### To Be Modified
- [ ] `src/app/globals.css` - Remove overflow restriction
- [ ] `src/app/page.tsx` - 38 replacements
- [ ] `src/app/select-building/page.tsx` - 49 replacements
- [ ] `src/app/dashboard/page.tsx` - 28 replacements
- [ ] `src/app/dashboard-waterfall/page.tsx` - 2 replacements
- [ ] `src/components/*.tsx` - 40 component files

### Already Modified
- [x] `tokens/colors/light.json` - Updated to #d6894a palette
- [x] `tokens/colors/dark.json` - Already correct
- [x] `tokens/core/common.json` - Updated gradients
- [x] `scripts/build-tokens.js` - Fixed variable naming
- [x] `src/hooks/useThemeColors.ts` - Fixed TypeScript error
- [x] `src/components/PropertyMapWithRealData.tsx` - Uses design tokens ✓

---

**End of Plan Document**
