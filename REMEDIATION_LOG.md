# Remediation log

Durable cross-session memory for the 25-prompt remediation of the NHA dashboard.
One entry per prompt, appended in run order. A prompt that has not written its
entry has not finished.

## P0 — Orientation & baseline · 2026-08-12 · abd0aab1dc231d35d5be267a8c6755cd5b5e0ade
STATUS: complete

PREMISES CHECKED:
  - "python3 works" — ran `python3 --version`; returns the Microsoft Store alias stub
    ("Python was not found"). `python` is 3.13.15 and runs the harness clean. CONFIRMED STALE,
    already corrected in REMEDIATION_PROMPT.md.
  - "19 assertions exist and none can fail a build" — ran `pnpm test`: 43 files, 137 tests,
    all green. `tests/lib/selftests.test.ts` already asserts `expect(s.passed).toBe(s.total)`.
    CONFIRMED STALE. The real gap is the build/CI gate, verified below.
  - "a failing self-test cannot fail the build" (R152) — REPRODUCES. `health.astro:407-410`
    renders the styled "N of M self-tests FAILING" branch and never throws;
    `fmea.ts:647-653` calls `fmeaSelfTests()` at import and on failure only `console.error`s;
    no `throw` in `src/lib/` gates any invariant; `.github/workflows/deploy.yml` runs
    `withastro/action@v3` only and never runs `pnpm test`. `astro build` passes today.
  - "`equationSelfTests` is written, correct, and never executed" (R230) — STALE.
    `tests/lib/equations.test.ts:15` calls it, 11 tests in that file. It is not called anywhere
    in `src/`, so it is absent from the build and from the footer panel. That work is real;
    the severity is not the stated one.
  - "`fmeaSelfTests` is never executed" (R273) — WRONG. It IS executed at import
    (`fmea.ts:647`) and there is a `tests/lib/fmea.test.ts`. It does not gate; that is the fix.
  - "both surviving tab-local maps" / "four acronym implementations" — REPRODUCES AS SIX.
    Six per-tab decorators, every one building its pattern with `\b`:
    `data-client.ts:356`, `hardening-client.ts:22`, `legislation-client.ts:86`,
    `quality-client.ts:712`, `units-client.ts:666`, `workforce-client.ts:34`.
  - `§S2` / `R226` off-by-one — REPRODUCES. `PHASE_T.P0 = 1` is used as a zero-based index
    into an array whose element 0 is Year 1 = 2027, so P0 reads `years[1] = 2028`. Verified
    for P0, P1 and P8; `rampValueAt('cov','P0')` reads index 1.
  - `R251` / `R293` / `V2` — CONFIRMED CLEAN. All three phase to year maps (`rollout.ts`,
    `data-phases.ts`, `equations.ts` `PHASE_T`) are identical: P0:1 P1:2 P2:3 P3:4 P4:6 P5:7
    P6:8 P7:10 P8:12. Drift prevention, not divergence repair.
  - `R133` — REPRODUCES, and the verification log's E1 table is correct. Seven ramps, not six.
    Three differ between slot 11 (the P8 anchor, Year 12) and slot 12 (what is read today):
    `units` 0.90 to 0.95, `hospitals` 0.90 to 0.95, `expansions` 0.80 to 1.00.
    `coverage`, `costShareElim`, `drugs`, `infra` are identical at both slots.
  - `R272` — REPRODUCES. FMEA probability inputs read `p.rollout[].value`, which
    `applyEquationTargets` has already rewritten at import. Full ranking captured.
  - `R271` — REPRODUCES. See INVENTORY below.
  - `R129` — REPRODUCES exactly as diagnosed. 15 seed IDs are absent from the canonical
    registry and all 15 are the letter-suffixed inventions the row names: `CP-TOT-004a` to
    `-004f`, `CP-POP-004a/b`, `CP-FIN-011a`, `CP-FIN-015a/b`, `CP-FIN-016a/b`, `CP-OFF-003a/b`.
  - `R296` — REPRODUCES. `medications.astro` carries `$467B` (line 94), `$717.9B` (line 117)
    and `<span style="width:65%">$467B retail</span>` (line 120) on one page.
  - `R303` — DONE. `quality-data.ts` read locally for the first time; results below.
  - "`docs/` is undeployed and README still documents it" (P2) — REPRODUCES, and is worse
    than "documents". `README.md:90-92` instructs the reader to set GitHub Pages to
    "Deploy from a branch, folder /docs", which would publish the retired tree over the live
    app at the same URL. `README.md:51` still calls `docs/` "the interactive public dashboard".

PREMISES FAILED: none. No section is blocked. Two rows are narrower than written
  (`R230`, `R273` — both surfaces already run under vitest; only the build gate is missing)
  and two are wider (`R101`/`R305` — six decorators not two; `R278` — 41 gate-linked IDs not 36).

SKILLS — model-invocable (no disable-model-invocation):
  `code-review`, `codebase-design`, `diagnosing-bugs`, `domain-modeling`, `prototype`,
  `research`, `resolving-merge-conflicts`, `tdd`, `wizard`
SKILLS — user-only (disable-model-invocation: true):
  `ask-matt`, `grill-with-docs`, `handoff`, `implement`, `improve-codebase-architecture`,
  `setup-matt-pocock-skills`, `to-spec`, `to-tickets`, `triage`, `wayfinder`
SKILLS — disagreed with Standing Order 7's table: none of the six it calls verified.
  `tdd` and `prototype` carry no flag; `setup-matt-pocock-skills`, `triage`, `grill-with-docs`
  and `improve-codebase-architecture` all carry `true`. All six agree with the installed files.
  The four it calls unverified — `diagnose`, `zoom-out`, `to-prd`, `to-issues` — are
  NOT INSTALLED under any name. Their installed counterparts are `diagnosing-bugs` (open),
  `wayfinder` (gated), `to-spec` (gated), `to-tickets` (gated). Three further gated skills
  the table never names: `implement`, `handoff`, `ask-matt`.

DISCREPANCY:
  - D1. The audit documents are not at the repo root. `REMEDIATION_PROMPT.md`,
    `CLAUDE_CODE_INSTRUCTIONS.md`, `CODEBASE_GAP_AUDIT.md`, `AUDIT_VERIFICATION_LOG.md` and
    `check_audit_docs.py` all live in `Desktop/Claude/NHA-Mental-Health/`, outside the repo.
    Every prompt's `python check_audit_docs.py` gate must be run from that directory.
  - D2. `AUDIT_VERIFICATION_LOG.md` E6's never-named list is itself wrong on four entries.
    `bridge-chart.ts`, `model-types.ts`, `overview-tables.ts` and `tax-types.ts` ARE named in
    `CODEBASE_GAP_AUDIT.md`. It also misses five files that appear in neither document:
    `src/lib/hardening.ts`, `src/lib/legislation.ts`, `src/scripts/health-client.ts`,
    `src/scripts/tax-client.ts`, `src/env.d.ts`. Code wins; the corrected list is in INVENTORY.
  - D3. `src/` holds 80 files, not the 79 the handoff records. Working tree is clean and
    nothing is untracked, so the earlier count was off by one.
  - D4. `V15` says the two live dictionaries differ on one key, `SR-DATA`. Measured across all
    five `src/lib/` maps there are THREE divergences: `SR-DATA` in `data-view.ts`
    ("System Requirement, Data" vs "System Requirement - Data"), and `LTC`
    ("Long-Term Care" vs "Long-term care") and `OI` ("Open Issue" vs "Open issue") in
    `hardening.ts`. `R101` also calls `OI` "a dead key"; it is live in `hardening.ts`.
  - D5. `V14` verifies `acronyms.ts` as a strict superset of two tab-local maps. There are
    five `src/lib/` maps. Measured: `acronyms.ts` (217 keys) contains every key of all four
    others — `data-view.ts` (52), `hardening.ts` (16), `legislation.ts` (54),
    `workforce.ts` (27). The superset property holds more widely than V14 claims. Two of those
    files (`hardening.ts`, `legislation.ts`) are named nowhere in either audit document, which
    is why the map count was missed.
  - D6. `§S13`'s Files list is incomplete. It names five files; the decorators live in six
    clients and the dictionaries in five `src/lib/` modules.
  - D7. `R278` says 36 gate-linked IDs. `GATE_PARAMS` in `fmea.ts` carries 41, hand-typed,
    and the gate records in `quality-data.ts` carry no parameter list at all. All 41 resolve
    against the 440-record catalog. Zero misses.
  - D8. `§BN`'s ten records "hand-added in 2026-08" do not reproduce against
    `quality-data.ts`: no record carries a `2026-08` marker and no record carries a `basis`
    field at all. `V5`'s 17 `basis:"framework"` entries are in `data-phases.ts`, a different
    file. Whatever `§BN` measured, it was not this artifact.
  - D9. The audit's "roughly 1,040 equation-derived interim targets" is wrong on both counts.
    `computeTargets` produces 1,170 cells (130 metrics x 9 phases); only 727 land on the
    catalog, because only 727 rollout rows exist. 1,037 is the FMEA record count, which is
    probably the number that was picked up.
  - D10. `FMEA_DATA.counts` claims 727 of 727 and 310 of 310 assessed, but 317 records carry
    `probabilityAssessed: false` — 310 CP and 7 KPP. They are charted in bands: 37 extreme,
    50 high, 230 moderate. This is `§S4`'s "proxied records charted as scored", now measured,
    and the 7 KPP records are outside the CP-proxy story the audit tells.

BASELINE:
  scenario: SCN-BASE, 600 runs, seed 42, years 2027-2042
  mature-year total (matureToday, 2024$): p50 $5.38T/yr  (p10 $5.09T, p90 $5.71T)
  2041 steady-state total: $9.39T/yr  (p10 $8.53T, p90 $10.25T) vs status quo $9.11T = +$276B (+3.0%)
  new-revenue requirement (mature): $3.42T/yr  (p10 $2.9T, p90 $4.0T)
  per-capita: $26,133  (p10 $23,703, p90 $28,721)
  NHE/GDP at maturity: 23.6%  (p10 21.3%, p90 25.9%)
  coverage ratio: the app publishes no tile by that name. Nearest published quantities are
    `pubShare` at 2041 = 0.9306 (public share of NHE) and the `coverageDemandShare` mode
    parameter = 0.32. Recorded both; P3 and P7 should say which one they mean.
  selfTestSummary().total: 19 (19 passed). 11 model + 1 bridge + 7 tax. The audit's
    "19 displayed / 21 written / README says 27" resolves to: 19 is the real number,
    and `README.md:57` still claims 27.
  astro build: pass (14 pages, 1.70s)
  pnpm test: pass (43 files, 137 tests)
  interim targets dumped to: NHA-Mental-Health/baseline-P0/baseline-interim-targets.json
    (1,170 cells across 130 metrics; 11 non-finite, listed below)
  criticality ranking dumped to: NHA-Mental-Health/baseline-P0/baseline-criticality-ranking.json
    (1,037 records, ordered; top is FM-KPP-A2-P7 at risk 25 / rpn 50 / extreme)
  full summary: NHA-Mental-Health/baseline-P0/baseline-summary.json
  (dumps are outside the git repo so P0 leaves the working tree clean)

  FMEA counts at baseline: total 1037, KPP/TPP 727, CP 310;
    bands 206 extreme / 312 high / 147 moderate / 62 low;
    CP bands 30 extreme / 50 high / 230 moderate / 0 low.
    Probability distribution: 2:217, 3:599, 4:206, 5:15. No record scores probability 1,
    and the minimum observed is 2 — so `§S4`'s claim is true today, by the rounding floor
    it identifies rather than by design.

  Equation cells that evaluate non-finite (11) — all at early phases, and ALL ARE DROPPED
  rather than published, because no rollout row exists at those phases:
    KPP-B1@P0, KPP-D7@P0, KPP-TRUST1@P0,
    TPP-9.3@P0 P1 P2 P3, TPP-9.5@P0 P1 P2 P3
  R248's detector cannot see these: it counts surviving `kind === 'derived interim target'`
  rows, and that count is genuinely 0 because `applyEquationTargets` converts every one of
  them to `'equation-derived target'` (538 rows). Zero therefore does close R147/R148 as
  written, but it is not evidence that every equation evaluates finite. It does not.

  Rollout `kind` vocabulary (727 rows): equation-derived target 538, maturity target 130,
    data-plan interim target 48, progression floor 10, phase milestone 1.
    `quality-client.ts:166` and `:232` still test for `'derived interim target'`, which no
    row carries after import — two dead branches, relevant to `§S16`.

INVENTORY:
  files in src|tools|research: 108 (src 80, tools 7, research 21)
  src/lib/tabs.ts registers 14 chapters, confirmed.
  files NOT named anywhere in CODEBASE_GAP_AUDIT.md or CLAUDE_CODE_INSTRUCTIONS.md (23):
    research/02_hospital_clinical_workforce_education.md
    research/03_drugs_pharmacy_diagnostics_devices.md
    research/04_ltc_behavioral_dvh_ems_publichealth.md
    research/05_it_governance_rd_transition.md
    research/06_tax_distribution_financing.md
    research/fmea_methodology.md
    research/quality-equation-methodology.md
    src/env.d.ts
    src/lib/benchmark-chart.ts
    src/lib/benchmarks.ts
    src/lib/financing-chart.ts
    src/lib/financing.ts
    src/lib/flow-diagram.ts
    src/lib/growth-decomp.ts
    src/lib/hardening.ts
    src/lib/household.ts
    src/lib/legislation.ts
    src/lib/money-flow.ts
    src/lib/path-chart.ts
    src/lib/tax-charts.ts
    src/pages/[chapter].astro
    src/scripts/health-client.ts
    src/scripts/tax-client.ts
  Named in CLAUDE_CODE_INSTRUCTIONS.md but not in CODEBASE_GAP_AUDIT.md (1):
    research/01_macro_financing_population_offsets.md
  Named by basename only, never by full path (3): src/lib/bridge-chart.ts,
    src/lib/model-types.ts, src/lib/tax-types.ts

HARNESS: check_audit_docs.py exit 0 — 35 passed, 0 failed
  (run from Desktop/Claude/NHA-Mental-Health/, see DISCREPANCY D1)

NOTES:
  - `quality-data.ts` read locally, closing `R303`. 440 parameters: 45 KPP, 85 TPP, 310 CP
    across 20 families. Its declared `counts` block is `{KPP:45, TPP:85, CP:310, total:440}`
    and matches the record counts exactly, so `§S16`'s "the catalog's own counts equal its
    record counts" already holds for this file. 13 concepts, 8 gates, 9 phases,
    20 cpFamilies. Every FMEA `paramId` resolves. `V3`'s 130 = 45 + 85 confirmed.
  - `R129` namespace evidence, measured: canonical registry 330 CP IDs, `quality-data.ts` 310,
    seed 80. Every `quality-data.ts` CP ID is canonical. 20 canonical IDs are absent from
    `quality-data.ts`. 15 seed IDs are absent from canonical, and they are exactly the
    letter-suffixed set the row names.
  - The `\b` defect demonstrated: `\b(CP|PA|VA)\b` against
    "CP-POP-004 and CP-UNIT-002 in PA and VA" matches ["CP","CP","PA","VA"];
    `acronyms.ts`'s lookaround pattern matches ["PA","VA"] only. `AE1` is live site-wide:
    the canonical map carries `PA` -> "Physician assistant" and `VA` -> "Department of
    Veterans Affairs" on all 14 pages.
  - HANDOFF-nha-remediation.md was not on disk at session start and was supplied mid-session.
    Its "Where things are" table is the authoritative path map; D1 above records it because
    the prompts themselves say "repo root".

---

## P1 — §S0 Harness & enumeration · 2026-08-14 · branch `nha-remediation`
STATUS: complete — all 16 recommendations landed, one commit each

DISCREPANCY:
  - `R230`/`R273` "written, correct, and **never executed**" is wrong on both counts.
    `fmeaSelfTests` IS called at import (`fmea.ts:647`) and only `console.error`s;
    `equationSelfTests` IS called by `tests/lib/equations.test.ts:15`. Neither could
    stop a deploy, which is the real defect. Code won; rows implemented against it.
  - `R248` "zero closes `R147`/`R148` outright" is unsafe. Zero is correct for the
    detector as specified, but the detector cannot see the other failure mode:
    **11 equation cells evaluate non-finite** and are dropped rather than published,
    because no rollout row exists at that metric and phase. Shipped both detectors.
  - `R137` "costw is never read by the engine" is true of `runPath` but false of the
    repo: `growth-decomp.ts` reads it and publishes the result. Its stated test
    ("2024-weighted average equals 1") asserts the claim that is false — the index is
    **1.1195**. Implemented as its honest form: assert the measured value.
  - `R149` "every progression floor matches its cited **PR-SCH-*** requirement" — the
    rows cite **gates (G1–G8), not PR-SCH ids**. PR-SCH-* exists only in `research/`
    with no join to the catalog. Checked against the gate's own floor statement in
    `rollout.ts` instead, which is the requirement the rows actually cite.
  - `R43`'s "reconcile against an independently computed figure" has no such figure
    inside the module: perturbing a sourced `rev1x` literal moves both sides together,
    because `distribution()` reads the same object. The external anchor is a worked
    example in vitest.
  - `R155`: README said **27**; the real figure was **19**, now **37**.
  - `tsc --noEmit` was green on `main` and my `node:` imports broke it. Fixed by adding
    `@types/node` (types-only devDependency) — recorded because it is a dependency add.

LANDED (one recommendation per commit):
  fff1c1b P0 log · 305f7cd R152 · 1e01d56 R154 · c03b6ec R153 · 806f124 R230
  723886e R273 · 7c726cd R248 · d75eb66 R271 · 7d16123 R267 · e575f03 R54
  bca3000 R24 · 2c79657 R206 · 64c6531 R155 · b4dd94d R46 · 6b31cfe R43
  1498f81 R137 · 96bff80 R149
SKIPPED: none

PROVEN (each broken deliberately, build failed, restored):
  - broke `RAMPS.transitionShape` → exit 1, "Self-tests failed: 1 of 19.
    - Transition outlay shape sums to 100%"
  - deleted one FMEA record → exit 1, "record count 1036 matches phase-target + CP rows 1037"
  - added an unlisted file to `src/` → exit 1, "unlisted: src/lib/__unlisted_probe.ts"
  - added a page with no TABS entry → exit 1, "no TABS entry: orphan-chapter"
  - set the README count back to 27 → exit 1, "README advertises 27 … registry has 37"

SELFTESTS: total=**37** (P0 measured 19; README.md:57 claimed 27 and now derives)
  19 baseline → +2 R153 → +1 R230 → +1 R273 → +3 R248 → +1 R271 → +1 R267
  → +5 R54 → +1 R206 → +2 R149 → +1 R137. Gate: `astro:build:start` in `astro.config.mjs`.
R248 SURVIVORS: **0** — every `'derived interim target'` row converts (538 of them)
R248 NON-FINITE CELLS: **11** — KPP-B1@P0, KPP-D7@P0, KPP-TRUST1@P0,
  TPP-9.3@P0–P3, TPP-9.5@P0–P3. All dropped, none published. §S3 owns the equations.
MANIFEST: **113 files** (src 82, tools 8, research 21); **23 previously unlisted**
  — 7 research files, `src/env.d.ts`, `src/pages/[chapter].astro`,
  `src/scripts/{health,tax}-client.ts`, and 12 `src/lib` modules including
  `hardening.ts` and `legislation.ts`, both of which export their own `ACRONYMS` map.

NEW FINDINGS (raised here, owned elsewhere):
  - **3 progression floors carry no gate** — KPP-C5@P7, KPP-C6@P7, TPP-11.5@P5.
    Exempt from `selfTestNoRegression` with nothing anchoring the exemption. Pinned.
  - `quality-client.ts:166` and `:232` test for `kind === 'derived interim target'`,
    a value no row carries after import. Two dead branches. §S16.
  - `ECON.realGrowth` and the `growth()` helper are gone; an unknown growth class
    now throws instead of silently resolving to the GDP rate.

MUST STILL PASS: `V19` twelve workforce invariants ✅ · `V24` both enrichers
  re-entry-guarded ✅ · `documentedGap` untouched (`equations.ts` unchanged) ✅
HARNESS: `python check_audit_docs.py` → 35 passed, 0 failed, exit 0
BUILD: `astro build` passes, 37 of 37 · `pnpm test` 191 tests, 46 files, green
  · `tsc --noEmit` clean · `astro check` 0 errors, 0 warnings

---

## P2 — §S1 Retarget off the retired tree · 2026-08-14 · branch `nha-remediation`
STATUS: complete — all 7 recommendations landed, one commit each, plus one reopened row

ENTRY GATE: `## P1` complete ✅ · harness proven by deleting the `tab-risk` TABS entry
  → `astro build` exit 1, "Self-tests failed: 1 of 37. - Every page is registered in
  the route registry (no TABS entry: risk)", restored ✅ · `check_audit_docs.py` 35/35
  exit 0 ✅ · `git status` clean ✅

DISCREPANCY:
  - D11. `R266` "no consumer reads `ported`" is WRONG. It is read twice:
    `src/pages/[chapter].astro`'s `getStaticPaths`, and `routeDrift`'s `unrouted`
    half in `manifest-check.ts`. Code won. It is also not provenance — the migration
    plans in `specs/` show "set `Tab.ported = true`" was the step that moved a
    chapter off the stub route, i.e. a migration checkbox whose job is finished.
    Deleted, with the stub. That closed a real hole: `unrouted` filtered on
    `t.ported`, so a tab added WITHOUT the flag was exempt and fell through to a
    "This chapter is being migrated" stub that shipped.
  - D12. `R266`'s "`ported: true` asserts `ltc` and `risk` have `docs/` originals" —
    the assertion is FALSE. `docs/index.html` carries **12** tab buttons and neither
    `tab-ltc` nor `tab-risk` is among them. The flag was wrong on two of its 13 rows.
  - D13. `R261` "`R135`, `R220`, `R245` and `R170` were all scoped against twelve and
    are incomplete" holds for **one of the four**, not four of four. Measured:
    `R245` widens by **7** (`risk.astro` has 8 `aria-label`s, 7 on role-less `<div>`s;
    the eighth, `.fmea-controls`, has `role="group"` and is correct). `R135` does not
    widen — it is parameter-scoped and its figure is exact (`params.ts` has 16 empty
    `url`s, **nine** at `confidence: "medium"`, the seven others `"low"` and outside
    its own test). `R170` does not widen — `fromYear` exists only in `care.ts` and
    `health.astro`. `R220` does not widen — neither new chapter hardcodes a count.
  - D14. `R112` reads as 111 rows to re-target. It is **30**. Three already carried a
    Pass-62 stamp (`R80`, `R103`, `R107`); 27 were stamped here. **Exactly one row
    named a full `docs/` path as its target** — `R90`, `docs/data/counties.json`.
  - D15. `R103` expects seven `.legislation-action-*` rules. There are **five**, for
    seven declared dispositions. `amend` and `preserve` have no rule of their own and
    are painted by the shared `.legislation-action` rule, so the badge is styled and
    legible, not invisible. The audit's escalation of `R95` ("unstyled becomes
    invisible") does not follow. Pinned rather than given invented colours.
  - D16. `R114`'s "the live catalog is a hand port that cannot be re-derived" is
    narrower than stated. The extraction reproduces 430 of the 440 records with
    **92 field differences of exactly 3 kinds** — 50 `calculation` em dashes, 40
    `modelRole` em dashes, and 2 CP-TOT records saying "system" where the DOCX says
    "framework". All three are deterministic and are now declared in the script. The
    catalog regenerates.
  - D17. `R107`'s test ("the methodology document regenerates byte-identically") was
    FALSE on measurement: regenerating rewrote 156 of 166 lines, because every em
    dash in the generator's markdown literals had been hand-replaced by a hyphen in
    the committed document. Fixed in the generator.
  - D18. `AN9`/`R116`'s "there is no Python on the maintainer's machine" is stale in
    a second way. `P0` established `python` runs; measured here, **`python-docx` is
    installed and the controlled DOCX is present**, so `extract_quality_catalog.py`
    runs end to end. `R116` is `§RET` and was not otherwise touched.
  - D19. Two tools nobody had flagged also targeted the retired tree.
    `model_hospital_regions.py` read `docs/data/counties.json` and stamped that path
    into its published `source` string; `serve.ps1` served `docs/`, so a local
    preview showed a different application from the deployed one. Both re-pointed.

LANDED (one recommendation per commit):
  84e567d R113 · d8e4071 R155 (§S0, reopened) · 5829edb R114 · 782f518 R107
  7e5d7a2 R103 · 241762f R266 · fe28dcc R261 · 1f88063 R112
SKIPPED: none

RETARGETED (old `docs/` path → new live path):
  docs/js/qualitydata.js   → src/lib/quality-data.ts      (R114, now generated)
  docs/js/dataphases.js    → src/lib/data-phases.ts       (R114, now generated)
  docs/data/counties.json  → public/data/counties.json    (R114 tools, R112 R90;
                             byte-identical by SHA256)
  docs/ (preview server)   → dist/                        (R114, tools/serve.ps1)
  docs/style.css           → src/styles/global.css        (R103)
  docs/index.html nav      → src/lib/tabs.ts              (R266; the authority, not
                             a thing to be matched against)
  docs/js/* (27 audit rows)→ per §8.0.2, stamped in place (R112)
  Traps called out on every row that uses them: `hospitalregions.js` is
  `src/scripts/units-client.ts`, NOT `src/pages/units.astro` (`src/lib/
  hospital-regions.ts` does not exist); `dataphases.js` is a GENERATED file, so a
  fix to it belongs in `tools/build_data_phase_targets.py`.

UNRESOLVED: none. Every row's live address was determinable, so nothing was guessed
  and there is nothing to ask about.

PROVEN (each broken deliberately, build failed, restored):
  - deleted the `tab-risk` TABS entry → exit 1, "no TABS entry: risk" (entry gate)
  - set README's phrase to "integrity checks" → exit 1, "README.md states no
    integrity-test count; the registry has 38" (R155 reopened)
  - restored `model_hospital_regions.py:36` to the retired path → exit 1,
    'tools/model_hospital_regions.py:36: COUNTIES = ROOT / "docs" / "data" /
    "counties.json"' (R114)
  - changed "A 70% foundation threshold" to 71% in the methodology document →
    exit 1, "1 rows absent", naming the TPP-FORM1 row (R107)
  - renamed `.legislation-action-sunset` to `-sunsett` → exit 1, "no rule: sunset |
    rule with no disposition: sunsett" (R103)
  - added a TABS entry with no page → exit 1, "no page: probe" (R266)
  - the stale "12 pages" in `specs/HANDOFF.md` → exit 1, five lines named with their
    numbers (R261; found by the check, not by reading)
  - added `export const NAV_SOURCE = 'docs/index.html';` to `tabs.ts` → exit 1,
    "src/lib/tabs.ts:14" (R112)

SELFTESTS: total=**44** (P1 left 37)
  37 → +1 R113 → +1 R114 → +2 R107 → +1 R103 → +1 R261 → +1 R112
CATALOG: `src/lib/quality-data.ts` regenerates from the controlled DOCX with a
  **329,243-byte payload identical to the committed one**. Only the header comment
  changed. The 10 uncontrolled records now live in
  `tools/quality_catalog_addendum.json`, which makes the 430/10 boundary machine-
  readable for the first time — relevant to `R115` (§S11b) and `R220` (§S12).
MANIFEST: **115 files** (114 after R114 added the addendum, 115 after R107 added
  `methodology-check.ts` and R103 added `style-check.ts`, minus `[chapter].astro`).
  `__pycache__/` is now ignored by `.gitignore` and by both manifest walks.
PAGES: 14, unchanged. Deleting the stub route changed no output.

NEW FINDINGS (raised here, owned elsewhere):
  - **`risk.astro` has 7 role-less `aria-label`led `<div>`s** — `.fmea-scope`,
    `#fmea-matrix`, `#fmea-headlines`, `#fmea-tiers`, `#fmea-cp`, `#fmea-gaps`,
    `#fmea-selected`. `#fmea-selected` also carries `aria-live="polite"`, which does
    not supply a role. **`§S14` (P20) owns `R245`**; its sweep is 7 larger than §BW's
    figure, on a page no pass had read.
  - **`params.ts` has 16 parameters with an empty `url`**, not 9. Nine are
    `confidence: "medium"` — `R135`'s figure is exact for its own test — and seven
    are `"low"`. **`§S11b` (P17) owns `R135`** and should say whether `low` is in
    scope.
  - `astro check` reports **3 hints**, all pre-existing and none from this section:
    `equations.ts:1158` unreachable `return NaN`, `fmea-client.ts:23` unused
    `natural`, `tests/lib/taxmodel.test.ts:7` unused `GROUPS` import.
  - A PowerShell round-trip corrupts `research/data_phase_target_methodology.md`:
    `Get-Content -Raw` reads a BOM-less UTF-8 file as ANSI, so every `≥` is mangled
    on write and all 64 rows fail at once. Edit it with a UTF-8 aware tool.

CONTRADICTIONS: D11–D19 above. Six are cases where the row's finding is real but its
  premise, count, or severity is not; two (`R107`, `R266`) are rows whose stated test
  was false when measured. None required routing around.

DOCUMENTS EDITED (outside the repo, so this entry is the record):
  `CLAUDE_CODE_INSTRUCTIONS.md` — 27 rows stamped with their live address (R112);
  re-scope notes on `R135`, `R170`, `R220`, `R245` (R261); `R112` and `R261` marked
  done; `§8.0.2` and the `§S1` section brief marked applied.
  Pre-edit copy: `CLAUDE_CODE_INSTRUCTIONS.md.pre-P2.bak`.

MUST STILL PASS: `V25` both engines are faithful ports — untouched ✅ (no engine
  file was edited; addresses changed, findings did not)
HARNESS: `python check_audit_docs.py` → 35 passed, 0 failed, exit 0
BUILD: `astro build` passes, 44 of 44, 14 pages · `pnpm test` 227 tests, 52 files,
  green · `tsc --noEmit` clean · `astro check` 0 errors, 0 warnings, 3 pre-existing
  hints

---

## P3 — §S2 Phase → year: ramps, anchors, calendar · 2026-08-14 to 2026-08-16 · branch `nha-remediation`
STATUS: complete — all 16 recommendations landed across 8 commits

ENTRY GATE: `## P1` and `## P2` both `STATUS: complete` ✅ · a broken invariant fails
  `astro build` (proven eight times in P2, and eight more times here) ✅ · `README.md`
  no longer instructs a `docs/` deploy ✅ · the `## P0` entry names both dumps and
  `NHA-Mental-Health/baseline-P0/` holds them ✅ · `check_audit_docs.py` 35/35 exit 0 ✅
  · `git status` clean ✅

  Pre-section dumps were taken fresh at `NHA-Mental-Health/baseline-P3/`
  (`preP3-*.json`) and are **byte-identical to the P0 baseline** on both the interim
  targets and the criticality ranking, which independently confirms P1 and P2 moved
  no published output.

LANDED:
  - `c36badd` `R226` + `R251` + `R293` + `R234` + `R133` — one phase map, one
    conversion, ramps that land on it
  - `16a5b15` `R255` — rollout headline tiles derived from the ramps
  - `3d67812` `R256` + `R262` — calendar anchor settled, LTC benefit start derived
  - `ebacdcb` `R258` + `R260` — off-axis buildout steps, split guards
  - `edba7d0` `R117` + `R121` — framework-basis claims checked, Gate 1 uncollapsed
  - `faaa557` `R57` — declared coverage gaps
  - `0ad6e02` `R203` — declared offset ramp pairings
  - `7b02f3d` `R123` + `R131` — index convention closed, two-toolchain split settled

INTERIM TARGETS: **716 of the 1,170 computed cells moved.** 653 became **less
  demanding** and 39 more demanding (21 carry no comparator, 3 moved in text only).
  Diff harness: `NHA-Mental-Health/baseline-P3/dump.test.ts` run with
  `DUMP_LABEL=postP3`. Both sides are kept there — `preP3-*.json` and
  `postP3-*.json` — with `diffdump.py`, which produced every figure below.

PUBLISHED TARGETS: **364 of the 727 published values changed. None was added or
  removed.** A further 84 rows moved numerically without changing the rendered
  string, so 448 of 727 computed values moved and 364 were visible to a reader. Of
  the 448, **404 became less demanding and 29 more demanding** (15 carry no
  comparator). This is `R226` landing exactly as `§BQ1` described it: every interim
  target used to be read one year further along a monotone ramp than its own phase,
  so correcting it lowers the ask nearly everywhere. **Nothing was tuned toward the
  old values.**

CRITICALITY RANKING: **996 of 1,037 positions changed, but only 74 records moved
  more than 50 places** — the rest is reshuffling inside tie groups at equal scores.
  **89 records changed RPN (58 down, 31 up)** and **49 changed band (28 down, 21
  up)**. Total RPN 25,106 → 24,897 (−0.8%); the `extreme` band 236 → 230, `high`
  362 → 369, `moderate` 377 → 374, `low` 62 → 64. Largest single move:
  `FM-KPP-B3-P6`, rank 244 → 559.

  **`R272`/`§BU1`'s prediction holds in both directions.** The Quality tab was
  systematically optimistic and is now less so; the Risk chart was systematically
  alarmed and is now slightly calmer. One bug, two chapters, opposite directions.

HEADLINE FIGURES: **all five unchanged**, which `AT4` predicted and this confirms —
  the bridge and `matureAtScale` read ramp indices that have plateaued by 2041, so a
  one-slot correction cannot reach them.

| Figure | before | after |
|---|---|---|
| mature-at-today's-scale (p50) | 5,245.17 | 5,245.17 |
| steady-state total (p50) | 9,152.53 | 9,152.53 |
| new revenue required (p50) | 3,337.62 | 3,337.62 |
| per capita (p50) | 25,471.11 | 25,471.11 |
| NHE share of GDP (p50) | 23.600% | 23.600% |
| federal increase (p50) | 4,589.90 | 4,589.90 |
| public share 2041 | 0.9306 | 0.9306 |

CALENDAR ANCHOR: **the years ARE calendar-anchored, and the code won.** Four modules
  already published the anchor (`model.ts` computes `year = START_YEAR + t`, `care.ts`
  publishes calendar years, `health.astro`'s chips say "assuming enactment in 2027",
  the README states 2027-2042) while one page denied it. It is now stated **once**, as
  `CALENDAR_ANCHOR_NOTE` in `params.ts` beside `START_YEAR`, imported by the pages
  that need it. What the denial was reaching for is kept: an anchor is an assumption
  about enactment, and a readiness gate that holds a wave moves the calendar date a
  phase lands on, not the numbering. A check scans all fourteen pages for the denial.

LTC 2026: **resolved by derivation, not by editing the number.** `rollout.ts` gained
  `phaseCarryingWork()`, which finds the phase whose work list carries a benefit;
  long-term care resolves to P7 = Year 10 = **2036**. `ltc.astro`'s paragraph is
  restated against that: 2034 is the end of the federal projection window, the benefit
  starts two years after that window closes, and the mature bar is therefore not a
  2034 quantity. `ltc.ts`'s 6.2M and 7.5M needed no re-derivation — it already labels
  them "2034 baseline" and "at maturity"; only the prose made the false link.

DISCREPANCY: ten, continuing P2's numbering. Seven were written up in the commit
  bodies as they landed; three are from the closing rows.
  - D20. `R133`'s "five of six policy ramps" names four. **There are seven ramps and
    four lag.** `costShareElim`, which the row asks to be checked because `AG1`
    depends on it, does **not** lag: its first relief lands Year 7 against a comment
    claiming Year 8, so it is *early* against its own prose, and it reaches 1.00 at
    slot 10, ahead of the P8 anchor. Not shifted. `drugs` and `infra` are correct as
    authored.
  - D21. The known non-finite set moved **11 → 14** (`KPP-B5@P0`, `KPP-E3@P0`,
    `TPP-7.2@P0`). This is `R226` landing, not a regression: P0 used to resolve index
    1 and now resolves index 0, where every build ramp is zero. All fourteen sit at a
    phase earlier than their metric's `_phaseStart`, no rollout row exists at any of
    them, and `nonFinitePublished` is still 0. Re-pinned in **both** `selftests.ts`
    and `tests/lib/selftests.test.ts` — the list is duplicated there and they must
    move together. **`§S3` (P4) still owns making them finite.**
  - D22. `R255`'s "the tiles are a year ahead of what the ramps deliver" is true only
    before `R133`. After it the coverage tile is exact; what remained was the
    two-span split, which the row raises separately.
  - D23. `R262` offers two readings — ten years early, or a superseded 2026 anchor.
    **Neither holds.** Nothing in the repository uses a 2026 anchor; `START_YEAR` has
    been 2027 throughout and the baseline is grown 2023-2026 before the clock starts,
    so 2026 is the last PRE-rollout year. The sentence was arithmetic built on the
    wrong end of that boundary.
  - D24. `R258` groups its finding with `§BI`'s bar inversion and `AE3`'s colour
    adjacency. **It is narrower than either**: the scale is not inverted and the bars
    are already hatched in the baseline series colour. The single defect is a
    qualitative step occupying a position on a quantitative axis.
  - D25. `R121`'s premise that G4 and G5 "merge two gates' progression floors into one
    rollout list" **does not hold**. Measured: G4 writes `KPP-C5` and `KPP-C6` at P8,
    G5 writes `TPP-11.5` at P8 — the two gates share a phase but never a parameter,
    and every emitted row keeps its `gate` field. The row's own test passed before the
    commit and passes now. The real defect was the row's second half, the G1 collapse.
  - D26. `R107`'s document row counter counted **every** table row in the methodology
    document, so `R57`'s second table read as eleven more phase targets and broke the
    declared-count check. It now counts within the phase target register's own
    section. The committed count is unchanged at 64; the check was too broad.
  - D27. `R117`'s test — *"every `basis:"framework"` target matches an entry in that
    parameter's extracted rollout"* — **fails sixteen times if "matches" means string
    equality, and all sixteen are false.** Measured: 17 framework entries, **zero**
    match the catalog by string. Sixteen are prose restatements of one quantity
    (`'>=98% API conformance'` against the catalog's `'>=98%'`), agreeing on
    comparator and number every time. The check compares the parsed
    (comparator, number, unit) triple. The seventeenth was real and is `R121`.
  - D28. `R57` files one metric. **Ten of the twenty-six in the register have that
    shape** — published, absent for a phase or more, published again. The remedy is a
    rule rather than a paragraph.
  - D29. `R131`'s test asks that the two extractors *"produce identical output"*. On
    bytes they do **not**: Python's text-mode write emits CRLF on Windows and the port
    emits LF, so the framework extract is 1,614,507 bytes against 1,598,905. **The
    content is identical after normalising newlines, on all three `.docx` files**, and
    every summary figure agrees exactly. The port is faithful; the row's instrument
    was one layer too literal.

BUILD GATES PROVEN (this session; the four earlier commits proved eight more the
  same way, each named in its own message):
  - recollapsed `PH-G1` to P4 only → exit 1, `G1 "Before P3 → P4" names P3+P4,
    writes P4` **and** `TPP-2.1@P3 no framework entry at this phase` (R121, R117)
  - changed a framework claim from ≥98% to ≥97% → exit 1, `TPP-10.6@P8 declares 97,
    the catalog carries 98` (R117 — proves the number is compared, not just presence)
  - gave `KPP-C5`'s P8 maturity row a second gate → exit 1, `KPP-C5@P8: G4 and G5`
    (R121)
  - deleted the P3 uptime target, widening a declared gap → generator `ValueError`,
    `TPP-11.1 declares P4 P5, misses P3 P4 P5` (R57)
  - hand-edited the generated declaration to cover only P4 → exit 1, `TPP-11.1 misses
    P4+P5, declares P4` (R57 — proves the build gate, not just the generator)
  - renamed the `offLowValue` declaration → build fails, `Offset offLowValue declares
    no ramp pairing` (R203, thrown by `offsetRamp` before the row can report)
  - emptied that pairing's reason → exit 1, `offLowValue declares no reason` (R203)
  - added `tools/scratch_new_tool.mjs` → exit 1, `no declared runtime:
    tools/scratch_new_tool.mjs` (R131)

SELFTESTS: total **61** (P2 left 44)
  44 → +6 R226/R251/R293/R234/R133 → +2 R255 → +2 R256/R262 → +1 R258/R260
     → +3 R117/R121 → +1 R57 (its second half folded into R107's rendering row)
     → +1 R203 → +1 R131
CATALOG: `src/lib/quality-data.ts` regenerates from the controlled DOCX. `R121`
  changes **exactly one parameter and adds exactly one row**: `TPP-2.1` gains its P3
  progression floor. No count, gate, phase or other parameter moves.
MANIFEST: **116 files** (115, +`toolchain-check.ts`, +`phase-map-check.ts`,
  −`extract_docx.py`).
PAGES: 14, unchanged.

NEW FINDINGS (raised here, owned elsewhere):
  - **`§S3` (P4) owns the 14 non-finite cells**, up from 11. See D21. The list is
    duplicated in `src/lib/selftests.ts` and `tests/lib/selftests.test.ts` and the two
    must be edited together.
  - **`R81` (§S8) — `AG1` is now pinned by a test, not just measured.**
    `costShareElim` reaches 1.00 at index 10 = 2037; the care cards promise `$0` from
    2034, where a tenth of cost sharing has gone; the gap is exactly three years.
    `tests/lib/params.test.ts` asserts all three, so closing the gap in §S8 requires a
    deliberate edit here.
  - **`units`' ramp comment claimed "65% pop P5 yr 7"** and the array reaches 0.55
    there under every convention. The 65% figure belongs to the rollout page's
    buildout steps, not to the model. Nobody owns it yet.
  - **`R290` (§S12) is wider than it reads.** `TPP-11.3` is published at P2 and P8
    only — two points a decade apart — against a flat `≥99%` headline tile with no
    phase. That gap is now declared (`R57`), but the tile is still flat.
  - `astro check` reports **3 hints**, all pre-existing, none from this section.

CONTRADICTIONS: D20–D29 above. Seven are cases where the row's finding is real but
  its premise, count or severity is not; two (`R117`, `R131`) are rows whose stated
  test was wrong as an instrument; one (`R107`) is a check written in an earlier
  section that this section's data broke. None required routing around.

DOCUMENTS EDITED (outside the repo, so this entry is the record):
  `CLAUDE_CODE_INSTRUCTIONS.md` — 16 `§S2` rows marked done with their sha; the `§S2`
  section brief marked applied; `R81`, `R290` and `§S3`'s non-finite scope re-noted.
  Pre-edit copy: `CLAUDE_CODE_INSTRUCTIONS.md.pre-P3.bak`.

MUST STILL PASS: `V1` index 0 = Year 1 = 2027 ✅ (asserted three ways in
  `params.test.ts`) · `V2` all three phase maps identical ✅ (now one definition and
  two importers, with the equality check kept as drift prevention) · `V5` seventeen
  framework-basis entries ✅
HARNESS: `python check_audit_docs.py` → 35 passed, 0 failed, exit 0
BUILD: `astro build` passes, 61 of 61, 14 pages · `pnpm test` 249 tests, 53 files,
  green · `astro check` 0 errors, 0 warnings, 3 pre-existing hints
