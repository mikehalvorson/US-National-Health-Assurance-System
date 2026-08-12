# NHA Astro Migration - P3 (slice 13): Executive Hardening tab

**Goal:** Port docs `#view-hardening` (index.html:2140-2399) to `src/pages/hardening.astro`, replacing its `[chapter].astro` stub. Same shape as the Legislation slice: verbatim static prose + one master-detail widget (the 7-layer "Defense in depth" stepper) + acronym hovers.

**Source:** prose = docs/index.html:2142-2397 (inside `<div id="view-hardening" hidden>`, wrapper stripped). Widget + data = docs/js/hardening.js (LAYERS 7, ACRONYMS 16, renderStepper/selectLayer, addAcronymHovers). CSS `hardening-*` already in global.css.

**Constraints:** TS strict; no em dash (U+2014); verbatim data + prose; client re-inits on `astro:page-load`, idempotent via `#hardening-stepper` dataset.wired; build stays 12 pages (flip `Tab.ported`).

### Task 1: `src/lib/hardening.ts` + test
`interface Layer { title; controls; summary; attack; continuity; check; proof }` (all string); `LAYERS: Layer[]` (7, verbatim js:9-73); `ACRONYMS: Record<string,string>` (16, verbatim js:75-92). Test: 7 layers, first title "Put rights above the operator", ACRONYMS.DNHA present, keys > 10.

### Task 2: `src/scripts/hardening-client.ts`
Port js:94-212 (appendField/addAcronymHovers/selectLayer/renderStepper), list+host passed as params (not `$()`), `initHardening()` on `astro:page-load`, idempotent via `#hardening-stepper` dataset.wired; guard when containers absent. Acronym class `hardening-acronym`.

### Task 3: `src/pages/hardening.astro` + flip `Tab.ported`
BaseLayout + verbatim prose (2142-2397), `#hardening-stepper`/`#hardening-detail` left empty, `<script>import '../scripts/hardening-client.ts'</script>`. Set hardening `Tab.ported=true`. Page test (prose + both containers + no em dash).

### Task 4: browser verify
7 stepper buttons, click swaps detail (Layer 01.. · EH-01), 4 fields (Attack blocked / Automatic continuity / Independent check and remedy / Evidence of readiness), acronyms wrapped `<abbr class="hardening-acronym">`, stub gone, View-Transition re-init, 0 console errors.
