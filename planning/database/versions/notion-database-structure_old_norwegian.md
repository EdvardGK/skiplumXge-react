# Notion Database Structure for Norwegian Energy Engineering Control Center

## Database 1: Beregningsformler (Calculation Formulas)

**Purpose**: Core investment/energy calculation constants used in production

### Properties:
- **Navn** (Title) - Formula identifier (e.g., "norwegian_discount_rate")
- **Beskrivelse** (Rich Text) - Norwegian description of what this formula does
- **Verdi** (Number) - Current value used in production
- **Enhet** (Select) - Unit of measurement
  - Options: %, kWh/m², m, kr, år, multiplier, ratio
- **Norsk kilde** (Rich Text) - Norwegian source/standard reference
- **Kategori** (Select) - Formula category
  - Options: Investering, Energi, Volum, Prisberegning
- **Status** (Select) - Current status
  - Options: Utkast, Under vurdering, Godkjent, Aktiv, Arkivert
- **Ansvarlig ingeniør** (People) - Responsible engineer
- **Sist endret** (Date) - Last modification date
- **Gyldig fra** (Date) - Valid from date
- **Kommentarer** (Rich Text) - Engineering notes

---

## Database 2: Bygningstyper og energiforbruk (Building Types & Energy)

**Purpose**: Building types with kWh/m² consumption from NVE Report 2019-31

### Properties:
- **Bygningstype** (Select) - Building type
  - Options: Småhus, Flerbolig, Kontor, Handel, Skole, Barnehage, Sykehus, Hotell, Kultur, Idrett, Industri, Andre
- **Energiforbruk kWh/m²** (Number) - Energy consumption per square meter
- **Takhøyde standard (m)** (Number) - Standard ceiling height
- **Kommersiell størrelse regel** (Rich Text) - Commercial size rules (for Handel)
- **NVE referanse** (Rich Text) - Reference to NVE Report 2019-31
- **Status** (Select) - Current status
  - Options: Utkast, Under vurdering, Godkjent, Aktiv, Arkivert
- **Ansvarlig ingeniør** (People) - Responsible engineer
- **Sist validert** (Date) - Last validation date
- **Kommentarer** (Rich Text) - Engineering notes

---

## Database 3: Energisystem faktorer (Energy System Factors)

**Purpose**: Heating/lighting/ventilation consumption factors and efficiency multipliers

### Properties:
- **System type** (Select) - Energy system type
  - Options: Elektrisitet, Varmepumpe, Bergvarme, Fjernvarme, Biobrensel, Olje, Gass, LED, Halogen, Naturlig, Mekanisk, Balansert
- **Forbruk kWh/m²** (Number) - Consumption per square meter
- **Effektivitetsfaktor** (Number) - Efficiency multiplier (e.g., COP 3.0 for heat pumps)
- **Anvendelse** (Select) - Application type
  - Options: Oppvarming, Belysning, Ventilasjon, Varmtvann
- **Kilde** (Rich Text) - Norwegian source/standard
- **Status** (Select) - Current status
  - Options: Utkast, Under vurdering, Godkjent, Aktiv, Arkivert
- **Ansvarlig ingeniør** (People) - Responsible engineer
- **Kommentarer** (Rich Text) - Engineering notes

---

## Database 4: API endepunkter (API Endpoints)

**Purpose**: All current production API endpoints with status monitoring

### Properties:
- **Endepunkt** (URL) - Full API endpoint URL
- **Metode** (Select) - HTTP method
  - Options: GET, POST, PUT, DELETE
- **Formål** (Rich Text) - Norwegian description of endpoint purpose
- **Forespørsel eksempel** (Rich Text) - Example request
- **Svar eksempel** (Rich Text) - Example response
- **Status** (Select) - Current status
  - Options: Aktiv, Under utvikling, Avviklet, Planlagt
- **Sist testet** (Date) - Last test date
- **Responstid (ms)** (Number) - Response time in milliseconds
- **Kommentarer** (Rich Text) - Technical notes

---

## Database 5: Dashboard komponenter (Dashboard Components)

**Purpose**: All dashboard tiles and their data sources for visual component registry

### Properties:
- **Komponent navn** (Title) - Component ID (e.g., "tek17-gauge")
- **Norsk visningsnavn** (Rich Text) - Norwegian display name
- **Beskrivelse** (Rich Text) - Component description
- **Type** (Select) - Component type
  - Options: Energikort, Investeringskort, Kart, Graf, Handlingskort
- **Status** (Select) - Current status
  - Options: Aktiv, Test, Arkivert
- **Datakilder** (Rich Text) - Data sources used
- **Beregninger brukt** (Rich Text) - Calculations used from formula database
- **Kommentarer** (Rich Text) - Technical notes

---

## Implementation Notes

### Engineering Workflow
1. **Ingeniør foreslår endring** - Engineer proposes change in Notion
2. **Faglig vurdering** - Technical review process
3. **Godkjenning** - Approval by senior engineer
4. **Aktivering** - Goes live automatically via API sync
5. **Overvåkning** - Monitor impact on calculations

### Data Population
Once databases are created, run:
```bash
node scripts/extract-current-values.js
node scripts/populate-notion-data.js
```

### Key Benefits
- ✅ **Live editing** of production formulas without code deployment
- ✅ **Norwegian language** interface for energy engineers
- ✅ **Engineering validation** workflow with approval process
- ✅ **Audit trail** of all formula changes
- ✅ **Data source transparency** - every value linked to Norwegian standards
- ✅ **Team collaboration** between developers and domain experts

### Next Phase: Live Integration
After database creation, implement `/api/config/notion-sync` endpoint to:
- Fetch approved values from Notion databases
- Validate data ranges and Norwegian standards
- Update production configuration dynamically
- Log changes for audit trail