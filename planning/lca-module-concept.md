# LCA-modul — Produktkonsept

**Status:** Konsept
**Dato:** 2026-03-04
**Modul:** Klimagassregnskap fra materialer (TEK17 §17-1)

---

## Oversikt

skiplumXge utvides med en LCA-modul for klimagassregnskap fra materialer. Modulen er **uavhengig av energimodulen** (TEK17 §14-2) — brukeren kan velge en eller begge. Begge deler samme inngangspunkt: adressesøk → eiendom → bygg.

### To forskrifter, én plattform

| Modul | Forskrift | Hva den dekker |
|-------|-----------|---------------|
| Energi (eksisterende) | TEK17 §14-2 | Energibruk i drift — kWh/m²/år |
| **Materialer (ny)** | **TEK17 §17-1** | **Klimagassutslipp fra byggematerialer — kg CO2e/m² BTA/år** |

Energimodulen svarer på: *Hvor mye energi bruker bygget?*
LCA-modulen svarer på: *Hvor mye CO2 koster materialene?*

---

## Brukerflyt

### Delt inngang (allerede implementert)

```
Adressesøk (Kartverket) → Velg eiendom → Velg bygg
```

Denne flyten eksisterer. Brukeren har allerede:
- Validert adresse med koordinater
- Bygningstype fra Matrikkelen (NS 3457)
- BTA (bruttoareal)
- Etasjer

### Fra byggsiden: velg modul

```
┌─────────────────────────────────────────┐
│  [Eiendom: Storgata 15, Dovre]          │
│  [Bygg: Kontorbygning, 2400 m² BTA]    │
│                                         │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │  Energi     │  │  Materialer      │  │
│  │  TEK17 §14-2│  │  TEK17 §17-1    │  │
│  │  [Åpne →]   │  │  [Åpne →]       │  │
│  └─────────────┘  └──────────────────┘  │
└─────────────────────────────────────────┘
```

---

## To innganger til LCA

### Modus 1: Rask estimat (uten BIM)

**Hvem:** Byggherre, eiendomsutvikler, rådgiver i tidlig fase.
**Når:** Mulighetsstudie, reguleringsplan, tidlig prosjektering.
**Input:** Bygningstype + BTA (allerede kjent fra adressesøk).

**Hvordan det fungerer:**

1. Systemet slår opp bygningstype (fra Matrikkelen eller brukerinput)
2. Referanseverdier fra DFØ/Asplan Viak hentes for denne bygningstypen
3. Mengder beregnes fra BTA med referansefordeling per bygningsdel
4. Resultat: totalt klimagassutslipp, fordelt på bygningsdeler og moduler

**Referansedata vi har (DFØ Klimagassutslipp_bygg.xlsx):**

| Bygningstype | Referanse A1-A3 | Lavutslipp A1-A3 | Enhet |
|---|---:|---:|---|
| Kontorbygg | ~8,5 | ~5,5 | kg CO2e/m² BTA/år |
| Boligblokk | ~7,0 | ~4,5 | kg CO2e/m² BTA/år |
| Skolebygg | ~7,5 | ~5,0 | kg CO2e/m² BTA/år |

*Verdiene er fordelt på bygningsdelene 22-26 i kilden. Eksakte tall fra DFØ-verktøyet.*

**Nøyaktighet:** ±30%. Tilstrekkelig for å sammenligne scenarier og identifisere størrelsesorden. Ikke tilstrekkelig for detaljprosjektering eller ferdigattest.

**Brukeropplevelse:**

```
Adresse → Bygg valgt → [Start LCA-estimat]
→ Bekreft/korriger: bygningstype, BTA, etasjer
→ Velg ambisjonsnivå: [Referanse] [Lavutslipp]
→ Resultat: dashboard med CO2e per bygningsdel
```

Hele prosessen: **under 1 minutt**.

### Modus 2: Detaljert beregning (med BIM)

**Hvem:** Prosjekterende, entreprenør, BIM-koordinator.
**Når:** Forprosjekt, detaljprosjektering, ferdigattest.
**Input:** IFC-fil fra BIM-modell.

**Hvordan det fungerer:**

1. Bruker laster opp IFC-fil
2. Backend parser filen med ifcopenshell:
   - Ekstraher elementtyper, materialer, mengder (areal, volum)
   - Klassifiser automatisk med NS 3451-regelmotor
   - Match materialer til EPD-er (generiske eller spesifikke)
3. Beregn utslipp per element, per bygningsdel, per modul
4. Generer TEK17-kompatibel rapport

**Hva systemet gjør automatisk:**

| Steg | Verktøy | Status |
|------|---------|--------|
| IFC-parsing | ifcopenshell | Finnes (Python) |
| NS 3451-klassifisering | Regelmotor | Finnes (`~/dev/resources/standards/mappings/ns3451_rules/`) |
| EPD-matching | Materialnavnmatching → generisk database | Delvis (Enova-verdier + DFØ) |
| Mengdeuttak | IFC QuantitySet / geometri | Finnes |
| Beregning | mengde × utslippsverdi per modul | Må bygges (enkel logikk) |

**Hva brukeren kan justere manuelt:**
- Klassifisering (flytte elementer mellom bygningsdeler)
- EPD-valg (velge produktspesifikk EPD i stedet for generisk)
- Transport (faktisk avstand i stedet for 300 km default)

**Brukeropplevelse:**

```
Adresse → Bygg valgt → [Last opp IFC]
→ Automatisk analyse (10-30 sek)
→ Gjennomgå: elementliste med klassifisering og EPD-match
→ Juster om nødvendig
→ Resultat: detaljert dashboard + TEK17-rapport
```

---

## Eksisterende bygg vs nybygg

### Eksisterende bygg (rehabilitering)

Adresseoppslaget gir oss et eksisterende bygg med kjent type og areal. For rehabilitering er spørsmålet: *Hva beholdes, hva rives, og hva er nytt?*

**Uten BIM:** Forenklet scenario der brukeren angir andel som beholdes/fornyes per bygningsdel (slider: 0-100%).

```
22 Bæresystem:  [████████░░] 80% beholdes
23 Yttervegger:  [██████░░░░] 60% beholdes
24 Innervegger:  [████░░░░░░] 40% beholdes
25 Dekker:       [█████████░] 90% beholdes
26 Yttertak:     [██░░░░░░░░] 20% beholdes
```

Beholdte elementer: 0 kg CO2e (sunk cost).
Nye elementer: full produksjonsbyrde.
Differanse = besparelse ved rehabilitering vs nybygg.

**Med BIM:** MMI-koder per element (300 nytt, 700 beholdt, 800 ombruk, 900 riving). Full beregning per kategori med riktige moduler.

### Nybygg

Ingen eksisterende bygg å referere til. Brukeren angir bygningstype og BTA (eller bare tomten, og vi foreslår basert på reguleringsplan/arealbruk).

- Uten BIM: referanseverdier basert på bygningstype
- Med BIM: full detaljberegning
- Tillegg: sammenligning referanse vs lavutslipp materialer

---

## Output

### Dashboard (begge moduser)

```
┌────────────────────────────────────────────────────────┐
│  Klimagassregnskap — Storgata 15, Dovre                │
│  Kontorbygg · 2 400 m² BTA · 50 år                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  [Total: 8,2 kg CO2e/m²/år]  [TEK17: Dokumentert ✓]  │
│                                                        │
│  Fordeling per bygningsdel:                            │
│  ┌──────────────────────────────────────┐              │
│  │ 22 Bæresystem        ████████  42%  │              │
│  │ 23 Yttervegger        ████     22%  │              │
│  │ 25 Dekker             ███      18%  │              │
│  │ 24 Innervegger        ██       10%  │              │
│  │ 26 Yttertak           █         5%  │              │
│  │ 215/216 Fundamenter   █         3%  │              │
│  └──────────────────────────────────────┘              │
│                                                        │
│  Fordeling per modul:                                  │
│  A1-A3: 72%  A4: 12%  A5: 4%  B2: 3%  B4: 9%        │
│                                                        │
│  [Sammenlign med lavutslipp]  [Last ned PDF-rapport]   │
└────────────────────────────────────────────────────────┘
```

### PDF-rapport

Følger DiBK-malen (Tabell 8-1):
- Eiendom/bygg-identifikasjon (gnr, bnr, kommune, adresse)
- Tiltakstype (nybygg / hovedombygging)
- Bruk/formål og bygningstype
- Areal (BTA, BRA)
- Bygningsdel × modul-matrise med kg CO2e/(m² BTA, år)
- Kildehenvisning per byggevare (EPD-nummer eller generisk kilde)

### Sammenligning (rehabilitering)

```
┌─────────────────────────────────────────┐
│  Scenario A: Nybygg     12,4 tonn CO2e │ ████████████
│  Scenario B: Rehab       5,8 tonn CO2e │ █████
│  Besparelse:             6,6 tonn (53%) │
└─────────────────────────────────────────┘
```

---

## Datakilder

| Kilde | Hva | Tilgjengelighet |
|-------|-----|-----------------|
| DFØ Klimagassutslipp_bygg.xlsx | Referanseverdier per bygningstype, 32 materialer, A1-A3 + A4/B4 | Lokal fil, allerede analysert |
| Enova/Reduzer EPD-verdier | 41 generiske utslippsfaktorer (A1-A3) | Lokal JSON (`enova_materials.json`) |
| EPD-Norge API | Produktspesifikke EPD-er | Offentlig API (epd-norge.no) |
| NS 3451 regelmotor | IFC-klasse → bygningsdelskode | Lokal (`ns3451_rules_table2_building.json`) |
| DiBK veileder | Kapp/svinn-%, transport defaults, B4-formel, dokumentasjonsmal | Lokal PDF |
| Kartverket / Matrikkelen | Bygningstype, BTA, etasjer, koordinater | API (allerede integrert) |

### Beregningslogikk (forenklet)

```
For hvert materiallag:
  A1-A3 = mengde × utslippsverdi_A1-A3 × (1 + påslag_generisk)
  A4    = mengde × vekt × transportavstand × transportfaktor
  A5    = kapp_svinn_% × (A1-A3 + A4)
  B2    = vedlikeholds_utslipp × antall_vedlikehold_50år
  B4    = (A1-A3 + A4 + A5) × antall_utskiftinger

  antall_utskiftinger = max(0, ceil(50 / estimert_levetid - 1))

Total = Σ (A1-A3 + A4 + A5 + B2 + B4) per bygningsdel
Resultat = Total / BTA / 50  →  kg CO2e/(m² BTA, år)
```

---

## Arkitektur (high-level)

### Delt med energimodulen
- Adressesøk + validering (Kartverket API)
- Bygningsvalg + Matrikkelen-oppslag
- Property state (Zustand store)
- Brukerautentisering / Supabase

### Nytt for LCA-modulen

**Frontend (Next.js):**
- `/lca` — LCA dashboard (parallell til `/dashboard`)
- `/lca/upload` — IFC-opplasting
- `/lca/review` — gjennomgang av klassifisering/EPD-match
- LCA-spesifikke komponenter: bygningsdel-breakdown chart, modul-fordeling, scenario-sammenligning
- LCA PDF-rapport generator

**Backend (FastAPI / Python):**
- `POST /api/lca/estimate` — rask estimat fra bygningstype + BTA
- `POST /api/lca/upload-ifc` — IFC-opplasting og parsing
- `GET /api/lca/results/{id}` — hent beregningsresultater
- `GET /api/lca/report/{id}/pdf` — generer PDF

**Database (Supabase):**
- `lca_projects` — prosjekt-metadata (adresse, bygningstype, BTA)
- `lca_results` — beregningsresultater per bygningsdel/modul
- `lca_elements` — detaljerte elementdata (fra BIM-modus)
- `ifc_uploads` — metadata for opplastede IFC-filer

### IFC-prosessering

IFC-parsing kjører server-side (Python med ifcopenshell). For MVP kan dette være en synkron prosess (< 30 sek for typiske modeller). Ved behov kan det flyttes til en jobb-kø (Celery/Redis).

---

## MVP — Faseinndeling

### Fase 1: Rask estimat (uten BIM)

**Scope:** Bruker angir bygningstype + BTA → får instant klimagassestimat.

**Hva som må bygges:**
- [ ] DFØ referanseverdier som strukturert JSON (fra Excel)
- [ ] API-endepunkt: bygningstype + BTA → beregning
- [ ] LCA dashboard-side med resultatvisning
- [ ] Bygningsdel-breakdown chart (Recharts)
- [ ] Lavutslipp-sammenligning toggle
- [ ] PDF-rapport i DiBK-mal

**Estimat:** Minimal ny kode. Referanseverdiene er tabelloppslag, beregningen er aritmetikk.

### Fase 2: BIM-modus

**Scope:** IFC-opplasting → automatisk klassifisering → detaljert beregning.

**Hva som må bygges:**
- [ ] IFC-opplasting (frontend + backend)
- [ ] ifcopenshell parsing-pipeline (elementtyper, materialer, mengder)
- [ ] NS 3451 auto-klassifisering integrert i pipeline
- [ ] EPD-matching logikk (materialnavn → generisk database)
- [ ] Review-grensesnitt: bruker kan justere klassifisering/EPD
- [ ] Detaljert resultatvisning per element

**Estimat:** Mer arbeid, men kjernekomponentene (parser, regelmotor, EPD-data) finnes allerede som Python-verktøy.

### Fase 3: Rehabilitering og scenario

**Scope:** MMI-kategorisering, rehab vs nybygg, sertifiseringstilpasning.

**Hva som må bygges:**
- [ ] Rehab-modus: slider per bygningsdel (beholdt/nytt %)
- [ ] BIM-rehab: MMI-kode per element
- [ ] Scenariosammenligning med side-by-side visning
- [ ] BREEAM/FutureBuilt rapporteringsformat
- [ ] NS 3720 full rapport (utvidet scope utover TEK17)

---

## Konkurranseposisjon

| Konkurrent | Hva de gjør | Hva vi gjør annerledes |
|------------|-------------|----------------------|
| Reduzer | Full LCA-plattform, BIM-import, EPD-database | Vi er raskere inngang: adressesøk → estimat på 30 sek. Reduzer krever prosjektoppsett og BIM. |
| OneClickLCA | Europeisk LCA-verktøy med BIM-integrasjon | Vi er norskspesifikk, enklere, og koblet til energianalyse. OneClickLCA er komplekst og dyrt. |
| DFØ-verktøy (Excel) | Gratis referanseverktøy | Vi automatiserer det DFØ-malen gjør manuelt, og legger til BIM-import og visuell rapport. |
| Manuell (rådgiver) | Konsulent gjør beregningen i Excel | Vi gjør den raskest mulige versjonen selv, og kan levere detaljert med BIM. Rådgiver bruker oss som verktøy. |

**Nøkkeldifferensiator:** Ingen andre kobler eiendomsoppslag + energianalyse + materialklima i én plattform. Brukeren kommer inn via adressen og får begge perspektivene.

---

*Konseptdokument — skiplumXge LCA-modul. Mars 2026.*
