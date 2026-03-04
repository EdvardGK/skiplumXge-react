# Session: LCA-modul konsept og tjenesteartikel

## Summary
Reviewed the DiBK veileder for TEK17 §17-1 klimagassregnskap (43p PDF, already local in LCA resource dir). Used it to develop a two-tier service model (TEK17 fast report + NS 3720 deep analysis) and wrote both a client-facing methodology article and a product concept for adding an LCA module to skiplumXge. The LCA module reuses the app's existing address/building lookup and adds material climate reporting as an independent feature alongside the energy module.

## Changes
- **`~/dev/resources/standards/lca/klimagassberegning-tjenester.md`** — NEW: Client-facing article "Klimagassberegning for bygninger — fra lovkrav til sertifisering". Covers TEK17 baseline, NS 3720 full analysis, adaptation to BREEAM/FutureBuilt/EU Taxonomy. Companion to the existing rehabilitation deep-dive.
- **`~/dev/projects/skiplumXge-react/planning/lca-module-concept.md`** — NEW: Product concept for LCA module in skiplumXge. Two modes (quick estimate without BIM, detailed with BIM upload), rehab vs nybygg, MVP phasing, architecture sketch, competitive positioning.
- **`~/dev/resources/standards/lca/references.md`** — UPDATED: Added local file reference for DiBK veileder PDF + new tjenester article.

## Technical Details
- DiBK veileder confirmed: TEK17 is a subset of NS 3720 (fewer modules, fewer bygningsdeler, 50 vs 60 year period). NS 3720 is methodologically compatible with all European frameworks (EN 15978).
- Key TEK17 calculation details extracted: kapp/svinn per produktgruppe (1-10%), transport defaults (300km/50km betong), B4 formula (ceil(50/ESL - 1)), biogent karbon correction (GWP-IOBC for norske EPDer).
- skiplumXge architecture: shared property lookup (Kartverket, Matrikkelen) between energy and LCA modules. LCA Fase 1 (quick estimate) is pure tabelloppslag from DFØ reference values — minimal new code.

## Next
- Fase 1 implementation: extract DFØ reference values as structured JSON
- Design `/lca` route and dashboard components in skiplumXge-react
- Continue LCA resource work: fix Enova report markdown tables (deferred from last session)

## Notes
- The two-tier model (TEK17 → NS 3720 → sertifisering) is a strong positioning: one calculation, multiple deliveries
- skiplumXge differentiator: no one else combines eiendomsoppslag + energi + materialer in one platform
- DFØ Klimagassutslipp_bygg.xlsx is the critical data source for Fase 1 — need to extract per-bygningstype reference values as JSON
