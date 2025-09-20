# Skiplum Energianalyse - Core Service Definition
## Authoritative Service Description

**Last Updated**: September 18, 2025
**Source**: User clarifications during session

## What the Service IS

**Skiplum Energianalyse** is a Norwegian building energy compliance and investment analysis service that transforms a property address into actionable energy investment guidance with official Norwegian compliance analysis.

### Core Service Components

#### 1. Input Requirements
- **Norwegian property address** (validated via Kartverket API)
- **Building details** (type, area, energy systems, consumption data)

#### 2. Analysis Engine
- **TEK17 § 14-2 compliance analysis** (primary function)
- **Investment opportunity calculation** (financial optimization)
- **Enova certificate lookup** (when available)

#### 3. Output Deliverables
- **Compliance status** vs TEK17 standards
- **Investment guidance** with ROI scenarios
- **Professional PDF reports** for documentation
- **Energy certificate status** (if registered with Enova)

## Energy Grading System (CRITICAL CLARIFICATION)

### Primary: TEK17 § 14-2 Compliance Analysis
**This is our main grading system**

- **Input**: Building energy use (kWh/m²/år)
- **Benchmark**: TEK17 § 14-2 legal thresholds for specific building type
- **Output**: Simple compliance status + percentage deviation
- **Examples**:
  - "15% over TEK17 requirement"
  - "Meets TEK17 standards"
  - "12% under TEK17 requirement"

**Visual Representation**:
- Simple traffic light system (Red/Yellow/Green)
- Percentage above/below legal threshold
- Clear compliance messaging

### Secondary: Enova A-G Certificates (When Available)
**This is NOT our primary system**

- **Availability**: Only if building has existing Enova energy certificate
- **Display**: Official A-G grade from Enova database
- **Status Options**:
  - "Enova Grade: C" (if certificate exists)
  - "Ikke registrert hos Enova" (if no certificate)

**Important**: We do NOT create A-G grades. We only display existing Enova certificates.

### What We DON'T Do
- ❌ Create our own A-G grading system
- ❌ Compete with or replicate Enova certificates
- ❌ Provide A-G grades for uncertified buildings

## Norwegian Data Sources

### Primary Data Sources
1. **Kartverket API**
   - Address validation and geocoding
   - Building registry lookup
   - Property boundary data

2. **TEK17 Standards Database**
   - Legal compliance thresholds by building type
   - Current regulatory requirements
   - Official Norwegian building standards

3. **SSB (Statistics Norway)**
   - Current electricity prices (kr/kWh)
   - Energy cost calculations
   - Regional energy data

4. **SINTEF Research Data**
   - Energy system breakdowns (70% heating, 15% lighting, 15% other)
   - Building efficiency research
   - Investment opportunity models

### Secondary Data Sources
5. **Enova Database**
   - Existing energy certificates (A-G grades)
   - Certificate status lookup
   - Official energy ratings (when available)

6. **Matrikkel (Building Registry)**
   - Official building information
   - Construction details
   - Property classifications

## User Journey Overview

### Step 1: Address Input & Validation (30 seconds)
```
User types address → Kartverket validates → Building identified → Proceed to data input
```

### Step 2: Building Data Collection (2-3 minutes)
```
Building type → Floor area → Energy systems → Energy consumption → Ready for analysis
```

### Step 3: TEK17 Compliance Analysis (Instant)
```
Calculate energy use per m² → Compare to TEK17 threshold → Generate compliance status
```

### Step 4: Investment Guidance Generation (Instant)
```
Calculate energy waste → Apply 7-year NPV model → Generate investment recommendations
```

### Step 5: Report & Action (5+ minutes)
```
View dashboard → Explore investment options → Download PDF → Contact for consultation
```

## Value Proposition Clarification

### Primary Value
**TEK17 Compliance Assessment**: "Is your building legally compliant with Norwegian energy standards?"

### Secondary Values
1. **Investment Guidance**: "How much can you invest in energy improvements based on current waste?"
2. **Cost Savings**: "What are your potential annual energy savings?"
3. **Official Documentation**: "Professional compliance reports for regulatory purposes"

### Tertiary Value
**Enova Status**: "Check if your building has an existing Enova energy certificate"

## Service Positioning

### What We Are
- **Compliance analysis tool** for TEK17 standards
- **Investment guidance service** for energy improvements
- **Professional reporting platform** for energy analysis

### What We Are NOT
- Energy certificate issuer (that's Enova's role)
- A-G grading authority (we only display existing Enova grades)
- Energy auditing service (we provide analysis, not physical inspection)

## Critical User Journey Implications

This service definition means:

1. **Address entry** is just the first step in a multi-step process
2. **Users must provide building data** before analysis can occur
3. **Primary output** is TEK17 compliance, not A-G grades
4. **Investment guidance** is the main financial value proposition
5. **Enova grading** is bonus information when available, not core service

---

*This document defines the authoritative service description and must be referenced for all user journey design, copy writing, and feature development decisions.*