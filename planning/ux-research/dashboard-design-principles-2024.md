# Dashboard Design Principles - 2024 Research
## Modern BI Dashboard Best Practices

**Research Date**: September 18, 2025
**Sources**: Grafana, Plotly, Tableau, PowerBI, Apache Superset
**Purpose**: Guide dashboard redesign for Norwegian energy analysis app

## Universal Dashboard Design Principles

### 1. Purpose-Driven Design
> **Golden Rule**: Do so with a specific purpose or use case in mind. Your dashboard should either tell a story through a logical progression of data (such as large to small or general to specific), answer a question, or both.

**For Our App**:
- **Story**: Property address → TEK17 compliance status → Investment opportunity
- **Question**: "Is my building compliant and how much can I invest to improve it?"

### 2. Cognitive Load Reduction
> **Key Principle**: Cognitive load is basically how hard you need to think about something in order to figure it out. Make your dashboard easy to interpret.

**Application**:
- No scrolling required - everything visible at once
- Focus on critical metrics that offer the most value
- Use Steve Jobs' "3-click rule" for all user paths

### 3. Visual Hierarchy and Layout

#### Top-Left Priority
> **Best Practice**: Largest and most important visualization should be top-left

**For Energy Analysis**:
- **Top-left**: TEK17 compliance status (primary concern)
- **Top-right**: Current energy use vs requirement
- **Bottom**: Action items and next steps

#### Grid-Based Layout
> **Modern Standard**: Avoid dashboard sprawl, use organized grid systems

```
┌─────────────────────────────────────────────────┐
│ Header: Property Context + Primary Status        │
├─────────────────────────────────────────────────┤
│ Key Metrics Row (No Scrolling)                 │
│ [Compliance] [Energy Use] [Waste] [Investment]  │
├─────────────────────────────────────────────────┤
│ Action Row                                      │
│ [Report] [Consultation] [Share]                 │
└─────────────────────────────────────────────────┘
```

## Color Psychology and Best Practices

### 2024 Color Trends
> **Trend**: "Dashboards are made with a lighter background for the flexibility it provides with colors. But with people having digital fatigue growing increasingly, the use of darker backgrounds is being preferred for the comfort it provides."

### Semantic Color Usage
> **Rule**: Use meaningful colors - Blue means it's good, red means it's bad.

**Standard Semantic Colors**:
- **Red**: Alerts, over-threshold, problems
- **Green**: OK states, compliance, success
- **Orange/Amber**: Caution, warnings
- **Blue**: Information, neutral, brand
- **Gray**: Inactive, disabled

### Accessibility Requirements
> **Critical**: Ensure sufficient contrast, don't rely on color alone to convey information

**Compliance Standards**:
- Color contrast ratios meet WCAG guidelines
- Use icons + color for state indication
- Consider color vision deficiencies

## Platform-Specific Insights

### Grafana Best Practices
- **Focus**: Keep graphs simple and focused on answering the question
- **Context**: If question is "which servers are in trouble?", show only troubled ones
- **Avoid**: Dashboard sprawl (uncontrolled growth of dashboards)

### Power BI Design Principles
- **Gestalt Principles**: Proximity, Similarity, Enclosure
- **Layout**: Group similar elements, use visual borders for grouping
- **Performance**: Test with end users, don't over-beautify at expense of usability

### Tableau Guidelines
- **Responsiveness**: Design for desktop, tablet, phone with Device Layout feature
- **Performance**: Keep extracts lean, limit custom calculations
- **Purpose**: Well-designed dashboard aligns organization efforts, speeds decision-making

### Apache Superset Approach
- **Audience-First**: Analysts need granular data, executives need high-level overviews
- **Simplification**: Less is more - avoid overwhelming with excessive charts
- **Whitespace**: Organize information logically, prevent clutter

## Multi-Page vs Single Page Strategy

### Steve Jobs' 3-Click Rule Applied
> **Philosophy**: Maximum 3 clicks/actions to reach any destination

**For Energy Analysis Journey**:
```
Click 1: Enter Address → Click 2: Input Building Data → Click 3: View Results
```

**Each Page Should**:
- Have single, clear purpose
- Minimize cognitive load for that step
- Provide obvious path to next step
- Avoid information overload

### Why Multi-Page Beats Scrolling
**Problems with Long Scrolling Pages**:
- Disrupts flow, makes comprehensive overview difficult
- Hides CTAs at bottom
- Increases cognitive load
- Poor mobile experience

**Benefits of Focused Pages**:
- Clear mental models for each step
- Better conversion rates (clear next action)
- Easier responsive design
- Better analytics tracking

## Color Strategy for Partnership Context

### GE.no Brand Analysis
**GE.no Uses**:
- Primary: Professional green and white
- Aesthetic: Clean, nature-inspired, reliable
- Focus: Energy efficiency, customer service
- Visual: Norwegian landscapes, geometric logo

### Complementary Color Strategy
**Our Approach** (Complement, Don't Compete):
- **Primary**: Cyan-blue (#0ea5e9) - tech/innovation focus
- **Accent**: Teal/green (#10b981) - energy harmony with GE.no
- **Background**: Professional dark gradient (#0a1525)
- **Semantic**: Red (problems), Green (good), Orange (caution)

**Partnership Harmony**:
- Blue-cyan positions us as tech/analysis partner
- Green accents acknowledge shared energy focus
- Dark theme differentiates from GE.no's light theme
- Professional tone maintains credibility

## Implementation Guidelines

### Color System Definition
```css
:root {
  /* Brand Colors */
  --primary-blue: #0ea5e9;      /* Main brand, interactive */
  --accent-teal: #10b981;       /* Energy harmony, success */

  /* Semantic Colors */
  --success: #10b981;           /* TEK17 compliant */
  --warning: #f59e0b;           /* Attention needed */
  --danger: #ef4444;            /* Over threshold */
  --info: #3b82f6;              /* Neutral information */

  /* Background System */
  --bg-primary: #0a1525;        /* Main background */
  --bg-secondary: #1e293b;      /* Card backgrounds */
  --bg-tertiary: rgba(255,255,255,0.05); /* Glass morphism */

  /* Text Colors */
  --text-primary: #f8fafc;      /* Main text */
  --text-secondary: #cbd5e1;    /* Secondary text */
  --text-muted: #64748b;        /* Muted text */
}
```

### Layout Grid System
```css
.dashboard-grid {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 1.5rem;
  height: 100vh; /* No scrolling */
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.actions-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
```

## Testing and Validation

### Usability Testing Approach
> **Key**: When you focus too much on beautification you might lose sight of usability. Test with end users.

**Testing Checklist**:
- Can user complete primary task without instruction?
- Is TEK17 compliance status immediately clear?
- Are next steps obvious from each page?
- Does color usage enhance or confuse understanding?
- Is navigation intuitive for Norwegian property owners?

### Performance Considerations
- Dashboard loads under 2 seconds
- Responsive on mobile devices
- Accessible to users with disabilities
- Works without JavaScript for critical info

---

*This research should guide all dashboard design decisions for the Norwegian energy analysis platform, ensuring modern UX while serving the specific needs of TEK17 compliance checking and investment guidance.*