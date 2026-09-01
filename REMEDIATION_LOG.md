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

DOCUMENTS EDITED: `CLAUDE_CODE_INSTRUCTIONS.md` — 16 `§S2` rows marked done with
  their sha; the `§S2` section brief marked applied; `R81`, `R290` and `§S3`'s
  non-finite scope re-noted.

  **The audit documents are now version controlled**, which closes an open question
  that had been asked in five sessions. They are a **separate local git repository**
  at `C:\Users\micha\OneDrive\Desktop\Claude\NHA-Mental-Health\`, not part of this
  one: `AGENTS.md` says *"do not add anything internal to the public repo"*, and this
  repo is public, so committing them here would have versioned them by publishing
  them. History back to the P2 session is reconstructed from the two surviving `.bak`
  files, and the commits that do so say where the seams are; from `05041a3` on, every
  commit is a real snapshot. **The `.bak` habit is retired** — commit before editing
  instead. A remote is the one part still open, because creating one is an
  account-level decision.

  This entry is therefore no longer the only record of a document edit.

MUST STILL PASS: `V1` index 0 = Year 1 = 2027 ✅ (asserted three ways in
  `params.test.ts`) · `V2` all three phase maps identical ✅ (now one definition and
  two importers, with the equality check kept as drift prevention) · `V5` seventeen
  framework-basis entries ✅
HARNESS: `python check_audit_docs.py` → 35 passed, 0 failed, exit 0
BUILD: `astro build` passes, 62 of 62, 14 pages · `pnpm test` 252 tests, 53 files,
  green · `astro check` 0 errors, 0 warnings, 3 pre-existing hints

CODE REVIEW (two axes, against `main`, after the section closed):

  **Two checks this section added could not fail, and both are fixed.**
  - `phaseYearMismatches()` compared `modelAt('year', ph)` with `PHASE_YEAR[ph]`.
    `modelAt` returns `t + 1` and `t` is `phaseIndex(ph)`, which is
    `PHASE_YEAR[ph] - 1` — the same expression on both sides. The only registered
    guard for `R226`'s *"`modelAt('year', P) === the year number of P`"* restated
    the bug it was written to catch. It now compares the calendar year the fiscal
    engine stamps on its own `path.detail` row against the year the phase map
    resolves: two independent computations, and R226's off-by-one moved one of
    them. **This is `R43`'s defect, reintroduced by the section fixing the
    conversion.**
  - `benefitStartDrift()` matched `/benefit that begins in (\d{4})/`, a phrase
    that existed only in the sentence `R262` deleted. The guard went dead in the
    commit that added it. It now matches a family of phrasings **and** requires
    the LTC page to derive the year rather than type it, so it can fail in both
    directions.

  **`R226`'s third acceptance clause was never implemented.** The row asks for
  *"a fixture asserting `costRatio` at P0 equals the 2027 row, not 2028"*; the
  fiscal-engine half of R226 — six of ten `ModelId` leaves reading
  `path.detail[t]` — had no pin at all. Added, with the 2028 case asserted false.

  **`R262` reintroduced the duplication `R251` exists to prevent.** The benefit
  start year was computed as `START_YEAR + phase.year - 1` inline on a page and
  again in a check module, against `rollout.ts`'s own header claiming one
  conversion point. There is now one named `calendarYear()` in `rollout.ts`, both
  call sites use it, and a self-test holds it against the equation layer's
  `phaseIndex()` — which stays deliberately separate, because a converter that
  resolved through the same function could not catch the two disagreeing.
  Registry 61 → 62.

  **`R262` clause 2 is partially met and says so.** The workforce horizon (2034)
  is the end of the federal projection window, an external fact that cannot be
  derived from a phase. The *relationship* the page states is now pinned: the
  benefit starts exactly two years after the window closes, so moving long-term
  care on the roadmap fails a test and forces the paragraph to be rewritten.

  **`R203` removed a duplicated pairing and left a duplicated dictionary.** The
  seven-key ramp record was typed at both offset sites in `model.ts`; it is one
  `rampsAt()` now.

  **Not accepted.** The review reads the rollout chart's `≥65%` at P5 against
  `RAMPS.units` = 0.55 and calls it a published-number mismatch. They are
  different quantities: the chart publishes POPULATION within the unit network
  (the framework's own `KPP-B7` P5 milestone), the ramp is share of the MATURE
  BUILD. A build 55% complete serving 65% of the population is not a
  contradiction. Making them agree would have moved a sourced number to satisfy
  a comparison that means nothing; `rollout.ts` now says so where the steps are
  declared. Likewise `R114` "tunes to a target" only if a declared, machine-
  readable departure counts as tuning — the `WORDING` rewrites and the ten
  addendum records are both disclosed in the generator and in `D16`.

  **Also fixed, from the standards axis:** `.agent-kb/README.md` still described
  the site as `docs/` and pinned the self-test count at 27, and `AGENTS.md` still
  said 13 tabs. All three are top-level facts this branch changed, and
  `AGENTS.md` requires the digest and the KB to move with them. The self-test
  figure is no longer pinned in the KB at all — pinning it is how it went stale.
  `.agent-kb/CONVENTIONS.md`'s em-dash sweep claim now states its real scope:
  the rule is "anywhere a reader can see", and this log is not that.

  **`care.ts`'s premium card moved and is recorded here late:** `fromYear`
  2031 → 2030 in `c36badd`, following the coverage ramp's realignment. It is a
  published year on a public chapter, it belongs in the movement report above,
  and it was only in the commit message.

---

## P4 — §S3 Equation layer · 2026-08-16 · branch `nha-remediation`
STATUS: complete — all 14 implementable rows landed across 14 commits, plus 2 review fixes

**Entry gate:** `## P1`, `## P2`, `## P3` all `STATUS: complete` ✅ · no local
`PHASE_T` definition ✅ · `evaluateAtPhase('P0')` resolves the 2027 row, pinned
by `tests/lib/equations.test.ts` ✅ · `check_audit_docs.py` exit 0, tree clean ✅.

⚠️ One gate wording correction: the P4 handoff recorded `grep -rn "PHASE_T" src/`
as returning **nothing at all**. It returns three lines — `PHASE_TOKEN` in
`gate-floors.ts` twice, and one provenance comment in `phase-map-check.ts`. The
gate's actual requirement (no local phase-to-year map in `equations.ts`) is
satisfied; the handoff overstated the measurement.

### The headline: this section moves no published number

`preP4` and `postP4` dumps over all 727 published rows: **0 values changed, 0
kinds changed, 0 rows added or removed.** FMEA ranking identical across all
1,037 records. Non-finite cells still 14. Clamp counts identical.

That is the correct outcome and it is worth stating plainly, because §S2 moved
almost everything. §S3's defects were **legibility, sourcing and silence**, not
arithmetic: a constant nobody could weigh, a disclosure written to a dead field,
a tolerance nine times looser than the model needs, a parser with two
implementations, and several fallbacks that never announced themselves. The one
row that could have moved output (`R148`) turned out to correct a scaffold that
is replaced before publication.

Self-tests **62 → 78**. `astro check`: 0 errors, 0 warnings, 3 hints (the same
three pre-existing ones; none from this branch).

### LANDED

| R | sha | What |
|---|---|---|
| R228 | `a2363b9` | The rollout `kind` vocabulary declared, with each kind's producer and disposition |
| R147 | `4a7d03d` | The thirteen entry-floor constants measured: they set no published number |
| R148 | `3d669cb` | Interpolation on the calendar rather than list position |
| R150 | `b2ced0a` | The relevance table's fallback enumerated by ID |
| R151+R277 | `690a99e` | One `parseNum`; both silent outcomes declared |
| R233 | `63d0d1f` | `!matMeta` means take no anchors, and a templated target counts as no parse |
| R227 | `ff38202` | 🔴 `KAPPA` registered, sourced to `GATES[G5]`, graded, banded |
| R232 | `fa4099d` | Raw and clamped values in the same view; clamp counts per metric |
| — | `a71d57a` | Review fix: R232's source assertion could not fail |
| R231 | `61d9f06` | Maturity tolerance 12% to 2%, and two hidden misses surfaced |
| R235 | `3f90b1b` | The maturity exemption moved onto the catalog record |
| R229 | `edc7d00` | The import-time enricher convention, written down and enforced |
| R225 | `92bf6ae` | Both enrichers' idempotence pinned, including with the guards removed |
| R221 | `d549317` | The page states where every published target came from |
| — | `c404c5f` | Review fix: two counts still saying eleven after §S2 made them fourteen |

Non-implementable, as the section brief states: **`R222`** (resolved in §BP1) and
**`R224`** (discharged in §BQ). Both confirmed still resolved; no action.

### CLAMP COUNTS

**21 of the 127 metrics that publish equation rows are bounded at least once;
40 rows in total.** The row asked for every metric bounded at three or more
phases; the full list is short enough to give whole.

| Metric | Bounded / equation rows | Phases |
|---|---|---|
| `TPP-USE1` | 5 / 7 | P1 P2 P3 P4 P5 |
| `KPP-C5` | 4 / 4 | P3 P4 P5 P6 |
| `KPP-C8` | 4 / 5 | P4 P5 P6 P7 |
| `TPP-1.1` | 3 / 5 | P2 P4 P5 |
| `TPP-10.2` | 2 / 2 | P4 P5 |
| `TPP-10.5` | 2 / 5 | P2 P3 |
| `TPP-10.6` | 2 / 4 | P3 P4 |
| `TPP-11.1` | 2 / 2 | P4 P5 |
| `TPP-11.2` | 2 / 5 | P2 P3 |
| `TPP-12.6` | 2 / 4 | P4 P5 |
| `TPP-3.3` | 2 / 6 | P6 P7 |
| `TPP-11.3` | 1 / 5 | P3 |
| `TPP-6.2` | 1 / 2 | P6 |
| `KPP-A1` `KPP-A2` `KPP-A6` `KPP-C1` `KPP-C2` `KPP-C3` `KPP-E1` `TPP-8.1` | 1 each | P7 |

**Four metrics publish nothing but committed floors** — every equation row they
carry is clamped: `KPP-A1` (1/1), `KPP-C5` (4/4), `TPP-10.2` (2/2), `TPP-11.1`
(2/2). For those the equation contributes no interim number a reader ever sees.
They are declared as `FULLY_CLAMPED` in `selftests.ts` so a fifth fails the
build. **This is not a defect to fix by loosening the clamp** — the clamp is
correct, it stops the equation contradicting a committed floor. It is a fact
about where the model is decorative.

The `P7` cluster has one cause: `KPP-C5`'s and `KPP-C6`'s `PR-SCH-*` progression
floors and the `TPP-11.5` AI floor all bind at P7, and a future committed anchor
bounds every earlier phase.

### KAPPA SENSITIVITY

Whole catalog recomputed at 4, 8 and 16 through a `withKappa` seam. Interior
phases only, because maturity is unchanged at every setting by construction —
which is exactly why the one pre-existing assertion could never have seen it.

| kappa | Metrics moved (of 130) | Median shift | 90th pct | Widest single interim target |
|---|---|---|---|---|
| 4 | 102 | 1.5% | 35.7% | `TPP-8.1@P3` `<=43.2%` to `<=22.4%` |
| **8** (fitted) | 0 | 0.0% | 0.0% | (the base case) |
| 16 | 102 | 3.1% | 76.2% | `TPP-8.1@P3` `<=43.2%` to `<=84.8%` |

The training-slot vacancy ceiling at P3 is published as `<=43.2%` and is
`<=22.4%` or `<=84.8%` depending on a scalar fitted to one observation about AI
oversight capture. **102 of 130 metrics move.** The band is published in
`research/quality-equation-methodology.md` and checked against the model at
build time.

`KAPPA`'s grade is **low**, downgraded from the methodology's previous
**medium**: one calibration point, applied uniformly, with no second
observation to test it against.

### PARSENUM

**One implementation**, `phase-targets.ts`. `equations.ts` already imported it;
`fmea.ts` reimplemented it under a comment reading *"mirrors phase-targets.ts
parseNum"* and now imports it too. Enforced by a source scan rather than an
output comparison, because the failure mode is a second implementation existing
at all — comparing outputs only catches a copy that has already diverged. FMEA
record count unchanged at 1,037.

### DISCREPANCY

- **`D30` — `R233`'s eight template metrics are not the eight strings the row
  quotes.** `§BQ9` lists catalog targets like `'>={X}% reduction in avoidable
  admissions'`. Those are the `template` field on each `EquationDef`, not the
  catalog target. The actual eight are `KPP-C2` plus `KPP-D1` to `KPP-D7`, whose
  catalog targets are prose: *"reduction to be calibrated"*, *"to be
  calibrated"*. **The code wins.** The row's "six of the eight are percentages"
  is likewise not a statement about the catalog targets.
- **`D31` — `R233`'s `!matMeta` bypass admits nothing today.** Measured across
  every authoritative anchor: no metric has an anchor whose unit differs from
  its own, and the seven null-parsing metrics have no parseable authoritative
  anchor at all. The guard was inert. **But KPP-C2 was live and the row missed
  it** — see `D32`.
- **`D32` — `R277`'s "demonstrated but unverified" hazard is live, in a
  different place.** `§BU6` predicted a calendar year parsed out of a
  parenthetical, unverified in the corpus. That does not reproduce. What does:
  `KPP-C2`'s maturity target *"to be reconciled with $4.75T total system cost
  and current population denominator"* parses as `{num: 4.75, unit: 'money'}` —
  a national total in trillions read as a per-person dollar target, and eligible
  as a clamping anchor against a metric published near $14,000 per person. It
  never bit because the comparison is `<=` and the bound could only raise a
  floor the equation was already far above. That is luck about the direction,
  not a guard. Declared in `DECLARED_TARGET_MISPARSES`; removed from the anchor
  set by `R233`.
- **`D33` — `R147` was measured, not implemented as filed.** The row asks for a
  registry entry and a source for each of thirteen constants. Replacing the
  whole function with `meta.num * 0.137` **and** replacing the linear
  interpolation with a power curve changes **0 of 727** published rows. The
  constants are a scaffold whose values are discarded; a registry entry would
  document a placeholder. They are not deleted, because the entry anchor is what
  lets the interpolation bracket the phases before a metric's first committed
  anchor, and deleting it drops the published count below 727.
- **`D34` — `R150`'s fallback is eleven ids, not zero, and ten are one family.**
  `KPP-W2` to `KPP-W5`, `TPP-W1`, `TPP-W2`, `TPP-IMM1` to `TPP-IMM4` (Workforce
  and care delivery) plus `TPP-FORM1`. They stay at P4: there is no sourced
  start phase for the health-talent channel, and writing a per-family reason
  that cannot be sourced would be the same defect in prose. Declared instead, so
  a new metric without a rule fails the build.
- **`D35` — `R231`'s 12% tolerance was hiding exactly what the exemption list
  exists to show.** 106 of 118 metrics close to within one part in a million.
  The slack was carrying a normalization residual (widest `KPP-B2`, 1.4%) and
  four real misses. Two of the four, `KPP-C7` (8.7%) and `TPP-W1` (3.9%), sat
  **inside** the old bound and appeared nowhere. `KPP-C7`'s gap was already
  written up in the methodology without the test acknowledging it; `TPP-W1`'s
  was written up nowhere. Tolerance now 2%; the exemption list is four.
- **`D36` — the header's "base-case maturity values close exactly" was nearly
  true and the assertion was nine times looser than it needed to be.** Both are
  corrected rather than one being softened to match the other.
- **`D37` — `R232` was cheaper than filed and its second half was different.**
  `§BR3`'s `!compact` removal is one condition. But `entry.interpretation` said
  only *that* an adjustment happened; it now names both numbers, and
  `RolloutEntry` carries `raw` and `bounded` so the two can be shown together.
- **`D38` — `R221`'s question resolves against the page, not the code.** The
  equation layer is real (`V3`). The page's *"Targets here are calculated, not
  asserted"* is false for 189 of 727 published rows. The page states the split
  now, counted from the catalog.
- **`D39` — the methodology overstated one self-test.** It said
  `equationSelfTests` checks finiteness *"across all 19 scenarios"*. It checks
  `SCN-BASE`; the Vitest suite does the scenario sweep. Corrected in place.

### NEW FINDINGS

- **`§S4` (P5) — the FMEA is unaffected by §S3.** All 1,037 criticality ranks
  identical before and after. `§BU1`'s dependency is real but it runs through
  the published targets, and this section moved none.
- **`§S12` (P18) / `R220` — `quality.astro` now derives four more counts** (the
  derivation split, the published-row total, the equation share, the kappa
  metric count). The hardcoded `45` / `85` / `310` in the same file are
  untouched and still `R220`'s to fix.
- **`§S16` (P22) — `RolloutEntry` and `QualityParameter` gained four optional
  fields** (`raw`, `bounded`, `documentedGap`, `documentedGapSection`), emitted
  by `tools/extract_quality_catalog.py`. The catalog regenerates cleanly; the
  payload is byte-identical apart from the four stamped records.
- **A check that could not fail shipped and was caught in the same session**
  (`a71d57a`). R232's source assertion anchored on `"computed value strip"`
  where the comment reads `"Computed value strip"`; `indexOf` returned -1 and
  every derived slice was empty. This is `R43`'s defect for the third time in
  four sections. **Breaking the code and watching is the only thing that finds
  it** — the fixed version was verified against the failing state before it was
  committed.
- **`applyPhaseTargets` is more robustly idempotent than its flag suggests.**
  Forcing it past its `have[phase]` guard changes nothing, because on a second
  pass every phase is anchored and the interpolation's bracket collapses to
  `lo === hi`. Recorded because the first attempt to prove `R225`'s test could
  fail used exactly that probe and it passed.
- **`git checkout -- <path>` cost work again**, exactly as the P3 handoff warns.
  R150's edits to `phase-targets.ts` were discarded while proving an unrelated
  gate. Committing before proving gates is the only reliable order.

### CONTRADICTIONS

None between the code and itself. Ten between the audit documents and the code,
recorded as `D30` to `D39` above. The rate is consistent with the `## P2` and
`## P3` sections (nine and ten).

### Notes for §S4 (P5), which runs next

- **Nothing to re-derive from this section.** The criticality ranking is
  unchanged, so `§BU1`'s "one bug, two chapters, opposite directions" concern is
  discharged by measurement rather than by argument.
- **`fmea.ts` no longer owns a parser.** `R277`'s consolidation means a change
  to `parseNum` now moves FMEA probability scores too. That is the point, and it
  is also a new coupling to be aware of.
- **`R244`'s pattern and `R250`'s pattern are untouched**, as the brief requires.
- **The 14 non-finite cells are still 14 and still inert.** §S3 did not close
  them; they sit at phases earlier than their metric's `_phaseStart` and no
  rollout row exists at any of them. Making them finite remains open.

### Post-section code review (two-axis, `373beca...HEAD`)

Run after the log entry above, against the §S3 diff: 16 commits, 23 files.
Standards and Spec as parallel sub-agents, reported separately and not merged.
**Eight findings, all real, all fixed.** No published value moved: 727 rows and
1,037 FMEA ranks identical to the P4 baseline after every fix.

**Spec axis, 5 findings**

- **`R277` clause 2 was never implemented.** The row says *"Collapse the third
  `parseNum` into one shared parser, **and fix the first-number match**"*, with
  the criterion `a target string containing a parenthetical year does not parse
  the year as the value`. §S3 declared the misparse instead of fixing it, and
  did not record the substitution - a deviation that should have been in
  `D32`. Fixed for real (`c009ca2`): `parseNum` strips parenthetical spans
  before matching, so the row's own worked example parses to null rather than
  2024 in unit money. Measured first: of 1,207 live strings, three contain a
  parenthesis and **zero** parses change.
- **The misparse scan stopped at the 130 maturity targets.** `parseNum` is also
  called on every rollout value inside `committedAnchors`, where a wrong number
  becomes a clamping anchor rather than a displayed target. All 727 values are
  scanned now.
- **`R277` clause 3's substitute scan was too narrow.** `\bfunction parseNum\s*\(`
  would not see `const parseNum = (…) => …`, which is how the mirror it exists
  to prevent would be written today. Widened, and the pattern is exported so
  the test exercises it on four positive and two negative forms.
- **`R148`'s test asserted the fix, not the criterion.** The row's column says
  `implied annual improvement rate is monotone across a derived trajectory, or
  the variation is declared`; the test asserted that values sit nearer the
  calendar convention than the index one. The criterion is asserted directly
  now: within a bracket the implied ANNUAL rate is constant, and the
  across-bracket variation is declared, because each bracket runs between two
  different committed anchors.
- **`R231` added a silence.** `if (!isFinite(v)) return;` entered the
  maturity-closure loop unasked. Before it, a NaN at P8 reported as "computed
  NaN"; the early return replaced a loud wrong answer with nothing, in the one
  section whose subject was silences. It reports explicitly now (`0a8b0d9`),
  and the test constructs the state with a temporary division-by-zero equation
  rather than describing it.
- Plus one prose defect: the raw-value strip head said clamped phases were
  *"marked there"*, pointing at the strip it heads, which has no markers.

**Standards axis, 3 documented-standard findings**

- **Two checks were registered under a module that does not contain them.**
  `undeclaredEnrichers` and `parserImplementations` live in `manifest-check.ts`
  and sat under `surface: 'rollout-kind-check.ts'`. `surface` is what R206
  compares against when hunting orphaned harnesses, so mis-attributing one is
  the same class of drift R206 exists to stop. **The hard finding of the pass.**
- **The parser scan mislabelled its own findings.** It filtered on `src/` and
  labelled with `rel.slice('src/lib/'.length)`, so a copy in `src/scripts/`
  would report as `ipts/foo.ts`. The gate still fired - it fires on the count -
  but the note is the only part that says WHERE the copy is.
- **A drift check typed the value it exists to keep from drifting.** The kappa
  registry row's note read `'graded low'` as a literal beside an imported
  `KAPPA_CONFIDENCE`.

**Seven baseline smells, all fixed** (`a5374a2`): the declared-versus-live
comparison written six times (now `declared-sets.ts`); the CP-skipping catalog
walk written nine times (now `quality.ts`); `rollout-kind-check.ts` carrying two
subjects (parser half split to `target-parse-check.ts`); seven `KAPPA_*`
constants travelling as a block (now `KAPPA_CALIBRATION`); a Middle Man
`documentedGap(p)`; and `anchorUnit`, which returned a `NumMeta` every caller
renamed `matMeta` (now `anchorMatchTarget`).

Extracting the declared-versus-live helper surfaced something worth keeping:
`undeclaredRelevanceFallbacks` and `staleRelevanceFallbacks` looked like
different questions and are the two directions of one set difference against
"the ids that reach the fallback". The three-clause version was the same
comparison spelled twice.

**What the review says about the section's own discipline.** Two of the eight
findings are checks that could not do their job, and one of those - R232's
source assertion, caught and fixed in-session at `a71d57a` - could not fail at
all. That is `R43`'s defect three times in four sections. The other lesson
repeated itself twice more this pass: **`git checkout -- <path>` discarded
uncommitted work again**, once on R150's edits and once on the parser change.
Commit, then prove the gate. There is no version of this that is remembered
rather than enforced by ordering.

Registry unchanged at 78; `astro check` 0 errors, 0 warnings, 3 pre-existing
hints; 329 tests pass.

---

## P5 — §S4 Risk chapter / FMEA · 2026-08-17 · branch `nha-remediation`
STATUS: complete — all 6 implementable rows landed, one commit each, plus one new finding fixed

**Entry gate:** `## P1` through `## P4` all `STATUS: complete` ✅ · `grep -rn "PHASE_T" src/`
returns no local definition (three lines, all `PHASE_TOKEN` or a provenance comment, as the
P5 handoff already corrected) ✅ · the `## P3` entry records the criticality-ranking diff path,
`NHA-Mental-Health/baseline-P3/` ✅ · `check_audit_docs.py` exit 0, `astro build` passes, tree
clean ✅.

### REPORT — the criticality ranking before and after `R226`

The section brief asks for this and it is P3's movement, not P5's. Measured from
`baseline-P3/preP3-` and `postP3-criticality-ranking.json`, all 1,037 records:

| | before `R226` | after |
|---|---|---|
| extreme | 236 | 230 |
| high | 362 | 369 |
| moderate | 377 | 374 |
| low | 62 | 64 |

**89 records changed probability, risk and RPN; 0 changed consequence; 49 changed band; 996 of
1,037 positions moved.** RPN fell on 58 and rose on 31. Band transitions: extreme to high 15,
high to extreme 9, moderate to low 9, low to moderate 7, moderate to high 5, high to moderate 4.

**`§BU1`'s prediction holds and is now measured on both sides.** The chapter read alarmed
because a target read a year further along a monotone ramp has less headroom, so
`stringencyBump` scored it harder; correcting the phase index calmed it, net six records out of
the extreme band, while the Quality tab moved the other way.

**But the distortion was uneven, and that is the part nothing on the page said.**
`applyEquationTargets` rewrites only `'derived interim target'` rows. **538 of the 727
phase-target failure modes carry a value the equation layer recomputes; 189 carry a committed
value it is required to leave alone** — 130 maturity targets, 47 data-plan interim targets, 11
progression floors, 1 phase milestone. Both sets are ranked against each other, so `R226`
reordered the ranking without any committed target having changed. `R272` publishes that split
where the ranking is read.

### The section's own movement

`preP5` vs `postP5` over all 1,037 records: **67 changed probability, risk and RPN; 0 changed
consequence; 32 changed band.** All 67 are cost parameters or deferred targets; **no natively
scored KPP/TPP failure mode moved at all.**

| | before §S4 | after |
|---|---|---|
| phase-target records on the chart | 727 | 720 |
| extreme / high / moderate / low | 200 / 319 / 144 / 64 | 193 / 319 / 144 / 64 |
| CP records on their chart | 310 | 295 |
| CP extreme / high / moderate | 30 / 50 / 230 | 27 / 44 / 224 |
| unscored (no probability published) | 0 | 22 |

Band transitions: moderate to unscored 13, extreme to unscored 7, high to moderate 7,
extreme to high 3, high to unscored 2. 1,004 of 1,037 ranking positions changed, which is what a
risk re-sort looks like when 67 records change risk.

Self-tests **78 to 86**. `astro check`: 0 errors, 0 warnings, **2 hints** (was 3; the third was
`fmea-client.ts`'s unused `natural`, removed as this section's own dead code). 361 tests pass.

### LANDED

| R | sha | What |
|---|---|---|
| R272 | `b0d22bb` | The two populations the ranking compares, named and published; `priorNum`'s phase order off `PHASE_YEAR` |
| R274 | `53d2af4` | 🔴 The occurrence scale the model can reach, and the probability-1 claim withdrawn |
| R275 | `d19551a` | 🔴 CP occurrence read from `params.ts`; the unassessable branch made reachable |
| R276 | `f45f831` | Borrowed, proxied and unscored separated; `counts.assessed` retired |
| R278 | `59deae2` | Gate linkage checked against the gate table; `G5`'s bind phase corrected |
| R279 | `c78f014` | Proxied placeholders off the risk chart and out of the band totals |
| — | `2b21738` | New finding: three failure modes shared an id with another failure mode |

**`R263` is superseded and was not implemented**, as the prompt directs. Its investigative half
was answered at Pass 53; `R272` carries its implementation half.

### DISCREPANCY

- **`D40` — the gate table does carry its parameter list, and the prompt says it does not.**
  The prompt states *"the `gates` records inside `quality-data.ts` carry no parameter list at
  all — keys are `id, name, decision, floor, evidence, fallback` — so the linkage exists only in
  `fmea.ts`."* The keys are right and the conclusion is wrong: **`evidence` carries the list**,
  in the framework's compressed notation (`"PR-SCH-013; TPP-8.1/9.1–9.7; workforce and service
  records"`). **The code wins.** `R278` therefore checks the extraction against its own source
  in both directions rather than only resolving it against the catalog. All 8 gates, 41 ids,
  zero differences.

- **`D41` — `GATE_BIND_PHASE.G5` was wrong, and `§BU7` says it is not.** `§BU7`: *"Bind phases
  reconcile with `rollout.ts` for G1 to G6."* They do not for G5. `TPP-11.5` carries a
  progression floor at **both** P5 and P8, and only the P8 row is tagged `G5`, so the +1
  consequence bump went to three ungated P5 rows and was withheld from the gated P8 rows.
  Corrected to P8. **The error was live and inert:** all six affected rows are safety-class
  parameters already at the severity ceiling of 5, so `clampScore` absorbed the +1 at both
  phases. Six published consequence bases changed; no score did.

- **`D42` — `medium-high` cannot reach `params.ts`'s sampled parameters today.** `§BU4` clause
  (a) says *"`medium-high` cannot round-trip — the type is `'low' | 'medium' | 'high'` and `§A1`
  showed the seed uses `medium-high` on load-bearing rows."* The type is correct, but all 31
  `PARAM_DEFS` entries carry one of the three simple grades. `medium-high` and `low-medium`
  appear in `OUTCOME_STATS` (outcomes the model deliberately does not price) and in the seed
  CSV, neither of which this chart reads. **Reading from `params.ts` introduces no round-trip
  failure today.** The hazard is one §S11a edit away, so `CONF_TO_OCC` and `GRADE_RANK` cover the
  compound grades and an unmapped grade fails the build.

- **`D43` — the seven unassessed KPP records are not a parser failure.** The prompt flags them
  as *"outside the CP-proxy story"* and asks why they are unassessed. They are `KPP-D1` through
  `KPP-D7`, the seven clinical-outcome parameters, and each is deferred **at P8 and only at P8**:
  *"reduction to be calibrated"*, *"increase to be calibrated"*, *"to be calibrated"*. Every one
  carries real computed targets at P4 through P7. So the catalog is not incomplete — the
  framework declined to fix the mature value for avoidable admissions, readmissions, preventive
  deferral, chronic-care control, cost-related nonadherence, safety-event reporting and care
  experience. All seven are safety-class at maturity, which is why all seven sat in the extreme
  band on a number nobody had set.

- **`D44` — `GATE_PARAMS` holds 41 ids, not the 36 the audit states.** Already recorded at P0
  and restated in the prompt; confirmed again, and all 41 resolve.

### CP OCCURRENCE, BEFORE AND AFTER

`R275` replaced twenty hand-typed family grades with a declared mapping from each family to the
sampled parameters that enter its cost line in `model.ts`. Four families moved:

| Family | records | occurrence | why |
|---|---|---|---|
| `CP-TOT` | 10 | 3 to 2 | weakest input is `baselineRealGrowth`, graded `high` on CMS NHE Projections |
| `CP-CLM` | 15 | 3 to 4 | weakest input is `legacyAdminFloor`, graded `low` |
| `CP-OFF` | 20 | 3 to 4 | weakest input is `extractionSavings`, graded `low` — **`§E1`'s complaint arriving by itself** |
| `CP-DX` | 15 | 3 to unassessable | devices, labs and diagnostics reach the engine only inside `otherPhc0`, a carried-forward CMS aggregate with no sampled parameter |

The other sixteen resolved to the grade they had been typed with. **`§BU4`'s clause (b) is not
fixed here and should not be:** `CP-POP` against `§E2` and `CP-BH` against `§D1`/`§D2` are now
one grade in `params.ts` each, and §S11b owns them. Regrading `popGrowth` or `bhExpansion` there
will move this chart with no further work, which is the architectural result the row was after.

### NEW FINDINGS

1. **Three failure modes shared an id with another failure mode.** 1,037 records carried 1,034
   distinct ids. `'FM-' + paramId + '-' + phase` assumes one rollout row per parameter per
   phase; `KPP-C5`, `KPP-C6` and `TPP-11.5` each hold a progression floor **and** a maturity
   target at P8. Every consumer resolves a record with `filter(r => r.id === id)[0]`, so the
   second of each pair could never be opened, and `renderTable` gave both rows the same
   `data-fmea-id` and the same `aria-pressed`, so selecting either lit both. **Two of the three
   are `G4` fiscal-readiness floors** — the rows a reader following the criticality ranking is
   most likely to click. Fixed at `2b21738`; six ids gained a kind suffix, 1,031 unchanged.

2. **`§S12` (P18) / `R220`** — `risk.astro` no longer hardcodes *"Seven outcome targets"*; that
   count and its definition are client-filled from the records. The page's remaining prose
   counts are unaffected.

3. **`§S14` (P20) / `R245`** — `risk.astro`'s 7 role-less `aria-label`led `<div>`s are still 7
   and still open. §S4 added no new ones: the two new hosts (`#fmea-prob-scale`,
   `#fmea-deferred-note`) are a `<ul>` and a `<p>` with no `aria-label`.

4. **`§S15` / `R280`** — the `document`-level listener leak in `initFmea` is **not** fixed here;
   it is `§S15`'s row and the section brief does not list it. Still reproducible.

5. **The 14 non-finite equation cells are still 14 and still inert.** Unchanged by this section.

### CONTRADICTIONS

None beyond `D40` to `D44`. `V3` (130/130 equation coverage) and `V6` (P8 certifies 11 of 26
metrics, neither care-interrupting metric among them) both still pass; `KPP-T1` and `KPP-T2` are
`G8`-linked and their records are unchanged by this section.

### The discipline note

Every one of the eight new checks was proven against a failing state, six of them against a
**constructed** input inside `tests/lib/fmea.test.ts` rather than by reading the assertion —
`PHASE_YEAR.P8` moved before P0, a published scale wording deleted, a parameter regraded to
`medium-high`, a mapped parameter id removed, a gate's evidence string edited in both
directions, an unscored record given a probability, and the old proxy put back on a deferred
target. The other two were proven by breaking the source and reading the build failure.

Two of them earned it immediately. `R279` broke `R276`'s "no failure mode both carries a score
and denies having one" on its first build, because that check still treated `proxied` as
score-publishing; and the duplicate-id check named all three collisions when the suffix was
removed. A check written beside its fix restates the fix — these were written to fail first.

---

## P6 — §S5 Tax, financing & bridge · 2026-08-17 · branch `nha-remediation`
STATUS: complete — all 20 recommendations landed across 6 commits

### LANDED

| Commit | Rows |
|---|---|
| `7cb560f` | `R157` — one definition of the baseline PHC category split |
| `c9f0daa` | `R144` + `R42` + `R36` + `R44` — the top-0.1% overlap, netted |
| `faed0b7` | `R156` + `R253` (+ `R239`) — the bridge's $1.6T exclusion, one derived envelope |
| `9432679` | `R143` — one wealth base, one growth rate, in both engines |
| `463b25d` | `R37` + `R38` + `R39` + `R208` — base vintage, dataset vintages, balancer uncertainty |
| `131af90` | `R217` + `R23` + `R45` + `R48` + `R63` + `R84` + `R41` — the remaining rows |

Twenty of twenty. `R239` shipped inside `faed0b7` because it is a property of the same
function.

### OVERLAP

Six instruments netted, not three. The family is **derived from incidence**, not listed: an
instrument joins when more than 30% of its incidence lands on the top 0.1% (`t9999` +
`t10000`). Measured:

```
bmin 1.00 · wealth 0.90 · estate 0.50 · msurtax 0.42 · capgains 0.40 · inherit 0.35
   |  gap  |
enforce 0.23 · buyback 0.21 · ftt 0.20 · intl 0.19 · rents 0.19 · corp 0.16 ·
surtax 0.16 · sscap 0.04 · vat 0.01 · payroll 0.01
```

The threshold sits inside a 0.12-wide gap and a self-test holds that gap open: any instrument
landing within 0.05 of it fails the build rather than being classified by luck. `bmin`'s own
`desc` named three; six qualify, which is `R144`'s and `§BL1`'s point.

How much they overlap is a judgment and is graded as one. `OVERLAP.rate` is **0.50 central,
0.30–0.75, confidence `low`**, with the pair-by-pair reasoning written into the parameter.
Within the family the largest member in a year is the anchor and keeps its revenue whole; each
other member is cut by `rate` on the part of its revenue landing on the shared base — the
arithmetic form of the file's own *"alternatives plus toppers, not a simple sum"*.

Deduction at 2041: **$119.3B/yr central**, $71.6B–$178.9B across the declared band.

### NEW-REVENUE REQUIREMENT: $3.42T/yr → $3.42T/yr (unchanged)

🛑 **The prompt's Report block expects this to rise. It does not, and it cannot from §S5.**
Measured at `mc.steady.newRevenue.p50`: **3337.62 (2023$) before and after**, identical to
twelve significant figures, = **$3.42T/yr in 2024$**, matching the `## P0` baseline exactly.

The new-revenue requirement is produced entirely inside `model.ts`'s financing block from
`pubCost`, `fedRedirect`, `stateMoe`, `empContrib` and `taxFeedback`. §S5 owns
`taxmodel.ts`, `taxparams.ts`, `bridge.ts` and the two pages; none of its rows touches any of
those five terms. `R143` does edit `model.ts`, but it moves `wealthRevenue`, which is not in
the expression; `R23` edits the expression itself but only removes a clamp that never bound,
so the value is bit-identical. The requirement is §S6a's to move.

Every other headline is likewise unmoved and correctly so — mature-year total $5.38T,
per-capita $26,133, NHE/GDP 23.6%, `pubShare` 0.9306, all identical.

### SURTAX/PAYROLL RATE: rose in all three scenarios

Solved against the **live** healthcare need path (what the page uses), at 2041:

| Scenario | Balancer | Before | After | Change |
|---|---|---|---|---|
| `goal-top` | `surtax` | **+11.93pp** | **+12.29pp** | +3.0% |
| `goal-shared` | `payroll` | **+7.50pp** | **+7.80pp** | +4.0% |
| `goal-realist` | `payroll` | **+6.87pp** | **+7.35pp** | +7.1% |

No scenario clamps at `scaleMax`, before or after, at any point in the overlap band.

**The direction is the finding, and it is the sum of two corrections that point opposite
ways.** `R42` alone takes `goal-top` to +13.24pp; `R37` then pulls it back to +12.29pp,
because carrying the wealth base to the model's own base year raises revenue and the anchor
rule leaves `wealth` un-deducted. Neither was chosen for its direction and neither was tuned
back. Under the overlap band alone the `goal-top` rate spans +12.71pp to +13.90pp.

### BRIDGE

Kept mature-year; the unreachable branch is deleted and the exclusion is stated on both tabs.

`bridgeSteps` drew at index 14 (2041), where `transitionShape[14] = 0` and
`itCapitalShape[14] = 0` by construction and no shock scenario reaches past **2034**. `oneTime`
was always exactly 0 and `if (Math.abs(oneTime) > 0.5)` never fired. Step count is 11 before
and after — the branch produced nothing, which is the whole finding.

Adding a cumulative stock to a column of annual flows would be a category error and would
break the identity, which is exact *because* transition has wound down by 2041. So the excluded
quantity is derived instead — `excludedOneTime` sums `trans + itcap + shock` across the path —
and rendered under the bridge chart on the healthcare chapter and beside the envelope tile on
the rollout chapter. **$1,600B (2023$) on the base case**, the midpoint of the model's own
`transitionTotal + itCapital` range.

The zero the framing depends on is now checked: if any scenario ever puts one-time cost in the
bridge's own year, the build fails and the decision gets revisited.

### ENVELOPE: $1.2T–$2.0T (typed, twice) → $1.1T–$2.4T, central $1.6T (derived)

`transitionEnvelope()` sums `transitionTotal` (1000/1500/2200) and `itCapital` (60/100/180).
The three quantities `§BS3` found are now one: the page's typed prose figure and its typed tile
figure are both gone, and a source scan fails the build if any trillion-scale dollar literal is
written into `rollout.astro` again. The framework's own controlled envelope — Table D6B-14's
$1.2T–$2.0T — is carried alongside as the anchor it is, with the reason the model is wider on
both ends stated rather than the difference being hidden.

### CONTRADICTIONS

**D45. `§AQ1` declares `V1`/`R37` closed and it is not.** §AQ1 found that the wealth instrument
compounds at the sourced 4.0% top-capital rate rather than at GDP, which is true and was not
undone. But that rate governs the path *from* the base year and does nothing about the base
itself being three years stale: `rev1x: 300` was the February 2021 letter's figure sitting in a
slot the file header calls the 2024 economy. Two independent things; one was fixed. Carried
forward at the instrument's own rate over its own vintage gap — `300 × 1.04³ = 337` — **not**
`research/06`'s "+50–60%", which is about the billionaire tranche and would overstate a base
that also includes everything above $50M. **The code wins.**

**D46. `R253` reads the missing workstream fields as a defect; the framework says two were
dropped in the port and one is deliberately open.** Framework Table D6B-15 is a five-column
table — ID, Workstream, CP allocation, Included transition boundary, Exit/transfer — and the
port kept three and discarded `CP allocation` and `Exit/transfer`. Both restored verbatim; the
CP allocation *is* the costed-work-package pointer and the exit *is* the transfer into mature
operations. Owner and gate belong to the whole set and the framework says so (conclusion
64-C06: *"NHTCA; TW-01–13; Gate 8"*). The per-workstream **dollar** figure does not exist and
that is the framework's own position: Table D6B-14's last row reads *"Phase/domain allocation |
Open | Cost-loaded integrated schedule required under OI-052"*. Inventing thirteen numbers would
have satisfied the row's assertion and falsified the plan. `cost` is a declared
`allocation-open` state instead, the `§S4` `probabilitySource` pattern, and the page prints the
reason where it prints the requirement. **The code wins.**

**D47. `R23`'s emphasis is the wrong way round.** The row reads as though the `newRevenue`
clamp hides a real case. Measured across all 21 scenarios × 16 years: it binds in **0 of 336
cells**, while the *unclamped* `householdRelief` is negative in **63** — the first three years
of every scenario. Then the clamp was tested for reachability rather than for whether it
happens to fire: every scenario at the all-low, all-mode and all-high corners of the declared
parameter space, plus a hand-built adversarial set. Minimum raw value **+$28.8B**
(`SCN-OPT`/all-low, 2027); the adversarial set reaches +$53.0B. **The clamp cannot fire.** Same
shape as `R156`'s bridge branch, in the same section. Removed, with the margin pinned. No
number moved.

**D48. `§AQ2`'s "+44.4% by 2042" is the ratio of growth factors, not of the series.** The
measured revenue divergence is **+38.1% at 2041 and +40.9% at 2042**; the two bases differ by
0.5% and are anchored one year apart, which absorbs the rest. The defect is real and larger
than most; the headline figure overstates it by about 3.5 points.

**D49. `R84` is a three-way split, not two.** `care.ts` uses 132.2M (Census 2024) and
taxparams's income groups sum to 131.0M (CBO 2022) — and `WEALTH_DIST`, inside taxparams,
**also sums to 132.2M**. The disagreement runs through the middle of the tax module. They are
*not* collapsed to one number: CBO's count is the universe its own income distribution is built
on, and substituting a Census total would make every per-group row disagree with its own
source. Each denominator is declared with its source, vintage and use instead.

**D50. `§AT1`'s "latest covered year is 2035" is off by one.** The three shock scenarios run
`startYear` 5/6/7 for 2–3 years from `START_YEAR = 2027`, so the latest covered year is
**2034**. Immaterial to the finding, which stands.

### NEW FINDINGS

- 🛑 **§S3 / the maturity-closure check read one scenario, and `R143` walked into it.** Moving
  the healthcare model's wealth base onto the sourced rate took `KPP-C8` from about 5.9% to
  **4.64%** on `SCN-BASE`, and the check demanded the documented gap be **deleted**. Measured
  first: **12 of the 20 scenarios still breach the 5% cap, the worst at 15.6% (`SCN-PESS`)**.
  Deleting an honest disclosure on the strength of one favourable run is the failure the check
  exists to prevent, pointed the other way. Widened: a gap is stale only when the metric meets
  its target in **every** scenario. `tests/lib/kappa.test.ts` carried its own base-case-only
  copy of the same rule and disagreed the moment this happened — two copies of one rule — so
  both now share one helper.
- **`KPP-C8` is the fifth fully-clamped metric.** All five of its published interim rows are
  now the committed cap rather than the equation, which computes 0.0 at P0/P1/P2/P5/P6, 1.5 at
  P3, 0.1 at P4 and 1.2 at P7. Added to `FULLY_CLAMPED` with the counts.
- **`coverage` returns `Infinity` today, not latently (`R48`).** The fallback need path is 0 in
  2027 and 2028 while instruments are already phasing in; disabling every funding program
  produces it for all 16 years.
- **`wealthTaxPotential`'s label overstates its scope.** It reads *"Extreme-wealth **+
  high-income** tax package gross potential"* while its source is purely the Saez–Zucman wealth
  tax. Left alone — `§S6a` owns `params.ts` labels — but it is why the top-capital growth class
  is the right one for it.

### PUBLISHED MOVEMENT

- **One published target moved**, out of 727: `KPP-C8@P3`, `<=5.4%` → `<=5%`. Five interim
  cells moved, all `KPP-C8`.
- **The criticality ranking did not move**: 0 of 1,037 positions, FMEA counts identical, the
  14 non-finite cells still 14. §S5 does not reach the risk chapter.
- `financingNote` on the healthcare chapter: *"the extreme-wealth package covers **12%** of the
  new-revenue requirement"* → **18%**, from `R143`. The wealth base at 2041 moves $423B → $611B
  (2024$).
- The tax page gains a "Top-0.1% overlap deduction" tile, a derived-family note under the
  instrument panel, per-instrument revenue labels that read net, an uncertainty line on both
  balancers, and a two-count reconciliation on the wealth chart.

### COUNTS

- Self-tests **88 → 107**. `README.md` bumped six times; the drift gate fired every time.
- `pnpm test` 361 → **370** across 57 files. Pinned tax self-test count 7 → 15.
- `astro check`: **0 errors, 0 warnings, 2 hints** — the same two pre-existing hints
  (`equations.ts` unreachable `return NaN`, `tests/lib/taxmodel.test.ts` unused `GROUPS`).
- `V20` still passes: `MONEYFLOW` reconciles and the bridge identity is still 1.819e-12.
- `tax.astro`'s Limits block untouched.

### The discipline note, and it cost three rewrites

Nineteen new checks. Every one was proven against a failing state — and **three passed against
a break the first time and had to be rewritten**, which is the whole value of the exercise:

- *"enabling any instrument never lowers total revenue"* passed against a deliberately
  **inverted anchor rule**, because enabling one instrument at a time from the defaults never
  lands the new one at the bottom of the family. Rewritten over all 64 subsets, it fails at
  once: `{wealth}` plus `capgains` drops the total from $701B to $442B.
- *"clamped outputs record whether the clamp was active"* passed against the `newRevenue` flag
  hardcoded to `false`, because the clamp never fires. That is what sent the row to a
  reachability sweep, and the sweep is what established the clamp is dead code.
- *"no effective parameter value leaves its natural domain"* passed with the clamp **removed**,
  because no shipped scenario breaches. A constructed scenario in
  `tests/lib/scenarios.test.ts` builds the breach the row names —
  `wealthCollectionEff × 1.3 → 119.6%` — and fails immediately.

Two more were wrong on their first run in a way that only a failing state shows: the
display-only import scan reported all three datasets because a self-test *names* them in a
string array, and the household-count scan reported this section's own explanatory comment.
Both were narrowed to the seam that actually matters — the import list, and the rendered body.

**A check that has never failed has not been tested.** Five of nineteen would have shipped
green and useless.

## P7 — §S6a Cost engine, offsets & headline parameters · 2026-08-18 · branch `nha-remediation`
STATUS: complete — all 11 implementable rows landed across 7 commits, plus the twelfth
(`R11`, document-only) and one new finding fixed

**Entry gate:** `## P1` and `## P2` both `STATUS: complete` ✅ · the `## P0` entry records all
five headline figures ✅ · `check_audit_docs.py` 35/35 exit 0, tree clean ✅ · **part 2 run in
this session, not reported from P6**: broke self-test 1's tolerance, `astro build` failed with
`Self-tests failed: 1 of 107`, restored, tree clean ✅

### LANDED

| Commit | Rows |
|---|---|
| `f7c505f` | `R21` + `R128` + `R32` — the engine's constants, and the reshuffle that hid their effect |
| `2647553` | `R27` + `R134` + `R33` — publicAdminRate reaches the evidence it cites |
| `c5ae6d0` | `R26` — the $4.75T figure has a basis, and the framework wrote it down |
| `026749f` | `R127` — the assertions go, not another guard |
| `e8777d2` | `R126` — the wage pass-through, exercised across the seam it spans |
| `d5d873f` | `R22` + `R25` — the mature year, the missing engine tests, and how big the ensemble should be |
| `23f048c` | `R11` — the offset architecture, written down and held to the code |

### HEADLINE FIGURES

2024 dollars, `SCN-BASE`. **Before is P0's baseline at 600 draws; after is 1,500 draws**, which
is itself one of the changes.

| Figure | Before | After | Change |
|---|---|---|---|
| Mature-year total (`matureToday`) | **$5.38T/yr** | **$5.44T/yr** | +1.15% |
| 2041 total | $9.39T/yr | $9.45T/yr | +0.64% |
| New revenue required (mature) | **$3.42T/yr** | **$3.50T/yr** | **+2.15%** |
| Per capita | $26,133 | $26,315 | +0.70% |
| NHE / GDP at maturity | 23.6% | 23.7% | +0.41% |
| Federal increase (mature) | $4.71T/yr | $4.77T/yr | +1.28% |
| Coverage ratio (see below) | 0.7853 | 0.7853 | +0.008% |

**The new-revenue requirement moved, as the P6 handoff predicted it would here and only here.**

**Published rollout targets: 727, none moved. Criticality ranking: 1,037 records, no position
moved, no RPN changed.** 28 interim cells changed below display precision on four metrics
(`KPP-C1`, `C2`, `C3`, `C8`); every one renders the same text before and after.

### COVERAGE RATIO — settled, since P3 and P7 were both told to and neither had

**It is `coverage` in `taxmodel.ts`: revenue over need, on the default package at 2041.** Three
quantities were candidates and exactly one is actually named coverage in the code, which
settles it. Its value is **0.7853 before and after** (+0.008%, the sponsor-share rounding).

The `## P0` entry named two others, and both are worth keeping distinct:

- `pubShare` at 2041 = **0.9306**, unchanged and structurally unmovable by §S6a: it is
  `coverage ramp x (1 - residualPrivateShare/100)` and this section owns neither term.
- `coverageDemandShare` = **0.32**, which is an input parameter, not a ratio the model produces.

### PUBLICADMINRATE

**1.5 / 2.2 / 3.2 at `confidence: high` → 1.5 / 2.2 / 6.0 at `confidence: medium`.** The mean of
the triangular moves 2.30% → 3.23%.

The distribution stopped at 3.2% while its own `source` string cited "Urban/RAND cross-checks
5-6% fully loaded", so it excluded evidence it named in the same object. research/05
`CP-GOV-008` recommends 2-6% and calls the spread "a meaningful and defensible modeling
uncertainty band, not noise to be collapsed to one number". The high is that ceiling now. The
low stays at 1.5%, CBO's aggressive case, which the same file names as the best case: keeping it
means the range spans everything the evidence names rather than only its unfavourable half. The
mode stays at 2.2%, where the analyst put it and for the reason the analyst gave.

**Effect, measured as a paired comparison** — the same 1,500 draws, the same per-parameter
streams, one parameter changed, nothing else re-drawn:

| Figure | Effect of the widening alone |
|---|---|
| Mature-year total | +0.84% |
| New revenue | **+2.19%** |
| Per capita | +0.74% |
| NHE/GDP | +0.86% |
| Federal increase | +1.82% |
| Mature-year p10-p90 band | **+7.1%** |
| New-revenue p10-p90 band | **+8.2%** |

The bands widen more than the centres move, which is the row's actual point: the conservative
case is reachable now, and a reader can see what it costs.

`providerPaymentFactor` diverges the opposite way and is untouched, per `§Q3`: its own cited
source implies about 0.39 if every payer moved to Medicare rates and it implements 0.85-1.00,
deliberately, because the framework is capacity-first. **That divergence is now declared rather
than left to cancel silently against the admin one.**

### CONSTANTS: 5 of 10 sourced, 5 became graded assumptions, and 2 more were found

| Constant | Outcome |
|---|---|
| `0.32` `0.16` `0.18` `0.27` sponsor shares | **Sourced.** Derived from `MONEYFLOW`, which is the CMS NHE sponsor table. The engine divides now rather than restating. |
| `88` low-value pool | **Sourced and sampled.** `lowValuePool`, triangular 75.7 / 88.45 / 101.2 from `CP-DX-007`, `confidence: medium`. |
| `0.75` state MOE fraction | Graded assumption, `low`, with the comparator: the money-flow map names 62% as state Medicaid plus state employee premiums, so 0.75 also assumes about $100B of public-health and facilities spending moves. |
| `0.5` OOP share of residual | Graded assumption, `low`. Today's comparable ratio is 26%. |
| `0.6` / `0.4` embedded-drug split | Graded assumption, `low`. Output-neutral by construction, now checked rather than asserted. |
| `0.012` program input growth | Graded assumption, `low`. Compounds to +25% by 2042; the health-cost rate would give +89%. |

Two beyond the row's ten, both registered here:

- **`0.28`, the wage tax feedback rate.** This is `R124`, which is **`§S11b`'s row** — registered
  early because R21's own check cannot go green with an unregistered literal in the engine.
  Graded `medium` against the CBO paper `wagePassThrough` already cites. **`§S11b` still owns
  whether it gets a distribution.**
- 🆕 **`0.02`, the correlated-draw quantile clamp.** Not in any row. 21 tagged parameters have
  their sampling quantile clamped to `[0.02, 0.98]`; staying inside the unit interval needs
  `[0, 1]`, and the extra 2% removes the outer tail of every one of them, so published bands are
  narrower than the declared low and high imply. Registered `low`. It narrows bands and moves no
  central estimate, which is why nobody had noticed.

### $4.75T: DERIVED

**The framework answers it in its own quality catalog.** `KPP-C2` calculates per-capita system
cost as *"CP-TOT-001 total-system cost / covered population"* and states its target as *"to be
reconciled with $4.75T total system cost and current population denominator"*. The claim is
total system cost, all payers, at maturity, in real 2024 dollars — the first of research/01's
three candidates, and `matureToday` is the quantity the model computes to be comparable with it.

research/01 calls this the single most important open question in the repository and it has been
open through every pass, because everyone looked for the answer in the prose.

Settling what it means does not make it reproducible, and the two questions were being answered
as one. On its own basis **the model centers 14.6% above it**, and the claim sits **below the
10th percentile of every scenario in the catalog**, including the optimistic one, whose central
estimate ($5.03T) does land inside the claim's stated $4.3T-$5.25T range. (14.7% at the draw
count in force when that was first measured; the figure is computed on the page, so it followed
the ensemble when R25 changed it, and the sentence recording it did not until review.)

The figure is kept, given its basis, and published as a third line on the benchmark chart with
the comparison computed rather than typed. **`BenchmarkRow` now requires a `basis` field.**

One coincidence, recorded so nobody rediscovers it as a finding: the model's mature federal
increase is $4.77T/yr, within a fraction of a percent of the claim. That is the *second*
candidate reading, on a different accounting basis, and Urban and Mercatus put that quantity at
$3.2-3.4T/yr. The match is arithmetic, not evidence.

### DISCREPANCY

- **D51. `R32`'s arithmetic.** The row says research/03's *"more recent framing: more than $100
  billion annually"* is *"above the top of the range being averaged"*. It is above the midpoint,
  not above the top: the range is $75.7-101.2B. The band is therefore not extended past its
  published high. The row's substance holds; its arithmetic does not.
- **D52. `R134(b)` is wrong, and the code wins.** The row says a user can drag `publicAdminRate`
  to 6% "yet every percentile band and headline range comes from a triangular capped at 3.2%".
  A slider does not read a mode off a frozen band: it re-centres the band on the new mode and
  rebuilds the spread proportionally, so dragging to 6% gives roughly 4.1 / 6.0 / 8.7. The
  control and the distribution never disagreed. **Its proposed test — "no adjustable parameter's
  sliderMax exceeds its distribution high" — would fail on all twelve adjustable parameters and
  is the wrong rule**: exploring past the sampled band is what the slider is for. Not
  implemented. The sweep it asked for found a real defect instead; see NEW FINDINGS.
- **D53. `R26`'s premise.** The row says the $4.75T figure "is currently rendered as a comparison
  line on a public-facing chart". It was rendered nowhere: `FRAMEWORK_CLAIM` was exported by
  `params.ts` and imported by nothing. The only place a reader met the claim was a note that had
  gone stale — it said the model "reaches it only under the optimistic scenario", and no scenario
  reaches it.
- **D54. `R22`'s scope.** The row names one hardcoded mature-year index. The scan written to
  enforce the fix found **nine, across six modules, in three spellings**.
- **D55. `R127`'s scope.** The row names the `scaleMax` casts. The audit it asks for found
  **seven sites**, one of them live on a public control.

### NEW FINDINGS

- 🛑 **Monte Carlo draws were position-dependent, so adding a parameter moved every published
  percentile.** Found by measurement: `R32` added one parameter and the mature-year total moved
  $5.38T → $5.42T. It was not the parameter — pinning the new distribution to the constant it
  replaced, so the arithmetic was identical, moved the figure by exactly as much. One shared
  stream drew z and then one number per parameter in declaration order, so inserting a parameter
  shifted every draw after it, in that run and in all 599 that followed. **Fixed**: one stream
  per parameter, seeded from the run seed and the parameter id. **This is why every measurement
  in this entry is a paired comparison and can be trusted; before it, no section adding a
  parameter could tell its own effect from a reshuffle.**
- 🛑 **A slider could push a percentage past 100.** `R63` [§S5] gave every parameter a natural
  domain from its unit and clamped the scenario `mult` path; the slider path was left open and
  reaches further, because re-centring scales the spread by the new mode. `employerCapture` at
  its slider maximum produced a high of **120%** of employer spend, `wagePassThrough` **136%**,
  `wealthCollectionEff` **104%**, all reachable by dragging a control to its end and all fed to
  the Monte Carlo. Clamped, and both slider ends of every bounded adjustable parameter are now
  swept. **§S6b (P8) owns sliders and bounds** and should know this is done.
- 🛑 **`input.step` could be `NaN` on a live control.** `health-client.ts` computed the slider
  step through two `as number` assertions on optional fields; an adjustable parameter declaring
  neither would render `min="undefined"` and `step="NaN"` with nothing reporting it. Exactly
  X4's shape, on a surface a user touches. Fixed, with a check that every adjustable parameter
  declares bounds containing its mode.
- ⚠️ **Two pages publish "new revenue needed" from different statistics of the same model.** The
  healthcare chapter's tile is the ensemble median ($3.50T). The tax chapter's need path is the
  **mode run** ($3.38T), because `buildHealthPath` reads `mc.modePath`. They were 1.4% apart
  before this section and are **3.6% apart after**, because widening a distribution moves its
  median away from its mode. Neither is wrong; they are different statistics with the same name
  on two pages. **Nobody's row.** Fixing it means choosing which statistic to publish, which
  moves numbers on both surfaces, so it belongs to a section that owns both.
- ⚠️ **`KPP-C8`'s breaching-scenario count is an ensemble statistic, not a property.** `R143`
  measured "12 of 20 scenarios breach the 5% cap". Re-drawing the same model with per-parameter
  streams, no economics changed, gives **10 of 20**. `tests/lib/kappa.test.ts` asserted
  `breaching.length > SCENARIOS.length / 2`, which was asserting a property of the seed. Pinned
  to the measured count with the reasoning in the test.
- ⚠️ **600 draws was not enough for the centre, let alone the tails.** Measured across seven
  seeds: at 600 the hero figure spans 0.72%, new revenue 2.44%. Raised to 1,500 (0.56% and
  1.37%), which is where the curve bends; 3,000 was tried and reverted after measuring the
  build, because it bought nothing on the tail and cost 17 seconds a build. **At 12,000 draws
  the hero still moves 0.25%, which is $13B on $5.4T: the dashboard publishes three significant
  figures and the ensemble supports two.** That is a display question and is written into
  `params.ts` rather than solved by adding zeroes.
- ⚠️ **`wealthTaxPotential`'s label still overstates its scope** — P6 left this for §S6a and it
  is not fixed. The label reads "Extreme-wealth **+ high-income** tax package gross potential"
  while its source is purely the Saez-Zucman wealth tax. Left alone deliberately: correcting the
  label without correcting the value would be cosmetic, and correcting the value needs the
  high-income half sourced, which is `P25`'s job.
- ⚠️ **`README.md` advertised "600 Monte Carlo draws over 27 sourced parameter distributions"**
  and both numbers were wrong before this section touched them: 31 parameters, not 27. Now
  1,500 and 32. `R136` (§S11b) filed the count; it is corrected here as a side effect rather
  than claimed.

### MUST STILL PASS: V20 ✅ · V25 ⚠️ WITH A STATED READING

The section brief requires both and the entry did not say so until review.

**`V20` (MONEYFLOW reconciles) — passes, and is now stronger than it was.** The engine no
longer restates the map's sponsor shares, it divides them, and a self-test recovers all four
back out of a computed 2041 path row and compares them against `MONEYFLOW`. A ribbon total that
stopped reconciling would move the engine with it.

**`V25` (both engines are faithful ports of `docs/js/*.js`) — holds on the reading this campaign
has used since P2, and would not hold on a literal one.** `docs/` is the retired tree: P2
retargeted every row off it, `README.md` no longer deploys it, and three build gates now fail on
a reference to it. `V25`'s substance is *"why R1-R111's defects are real while their paths are
wrong"* - it certified that the audit's findings reproduce in `src/`, which is what makes the
backlog actionable. That is intact: every §K finding this section touched reproduced before it
was fixed.

Literally, it no longer holds, and this section is where it stopped: `docs/js/model.js` draws
every parameter from one shared stream and `src/lib/model.ts` draws each from its own, so the
same seed gives different numbers. **The port is no longer bit-faithful and cannot be, because
the shared stream was the defect.** Recorded here rather than left for a later section to
discover as a surprise.

### CONTRADICTIONS

Two, both between a row's declared test and what the row's own text asks for.

- **`R11` declares `C_offsets component categories are pairwise disjoint by declared scope`.
  The scopes are not disjoint and cannot be** - three of the four offsets act on hospital
  spend. What is disjoint is the mechanism: each offset is the only home of one, which is what
  `HANDOFF.md` constraint 4 actually asks for and what `§K1` verified. The shipped check holds
  mechanism uniqueness and requires every mechanism to appear in
  `research/offset_architecture.md`, and the document says plainly that scope disjointness is
  not the claim. **The row's test as written cannot be satisfied by any correct engine.**
- **`R134` declares `no adjustable parameter's sliderMax exceeds its distribution high`, which
  would fail on all twelve adjustable parameters** and would forbid the thing sliders are for.
  Recorded as `D52`, not implemented. Its second declared test - no parameter graded `high` with
  a mode set by analyst judgement - is implemented and shipped.

### CODE REVIEW, and what it changed

Run after the section, before this entry was final, as two parallel axes against `eecf2dc`.
Every finding below was verified against the code before acting on it.

**Standards axis - five breaches of `CONVENTIONS.md` rule 2, all in text a reader sees.** The
rule bans "the framework says / calls for / specifies / assumes" and confines KPP/TPP/CP codes
to the Data and Quality tabs. §S6a put catalog codes on the Health tab and rewrote one note
*away* from compliance:

| Where | What it said | Fixed to |
|---|---|---|
| `health.astro` label | "The framework's own figure" | "The plan's own stated figure" |
| `health.astro` note | "the framework asserts a mature total system cost ... settled by the framework's own catalog" | "the plan states ... settled by the plan's own cost catalog" |
| `FRAMEWORK_CLAIM.basisSource` (rendered) | named `KPP-C2` and `CP-TOT-001` on the Health tab | states the basis plainly; the codes stay in the comment above it |
| `publicAdminRate.source` (rendered) | opened `"R27 [§S6a]: the distribution stopped at 3.2%..."` and claimed "no draw in 600 could reach", stale since R25 | plain sourced prose, no row number, no stale draw count |
| `providerPaymentFactor.divergence.note` (rendered) | "the framework states it: it is capacity-first" | "the plan builds capacity first" |

A sixth was found by reading the rendered page rather than the diff: **self-test names render in
the footer's integrity panel**, so rule 2 applies to them too, and one was called *"The
framework's claim is drawn from the declared constant"*. Renamed.

**Two stale numbers the section left behind**, both introduced by its own later commits:
`README.md`'s "~15ms in the browser" (the draw count made it ~36ms) and its second parameter
count at line 72, still 27 where line 54 had been corrected to 32. And `equations.ts` still
carried R143's *"12 of the 20 scenarios still breach"* in a comment, which this section's own
re-draw took to 10 - fixed in the test and not in the prose until review.

**Spec axis - three declared tests had not shipped**, and two that had were checking something
adjacent to what they claimed:

- `R127`'s second: *"every scenario balancer is scale-type with a defined scaleMax"*. Shipped
  against two fabricated scenarios; now runs over the real catalog.
- `R134`'s second: *"no parameter graded high has a mode set by analyst judgement"*. Not written.
  Now shipped, and it is the rule `publicAdminRate` broke.
- `R33`'s check tested `note.trim().length >= 80` - a check on effort, not content. It now
  requires the note to name the number it diverges from.
- `R26`'s check asserted `comparableWith === 'matureToday'`, which is the check checking itself.
  It now reads that band off the ensemble and compares it against what the chart draws.

**And a hole in this section's own headline check.** The engine-literal scan began at the first
sampling function, so **every module-scope declaration above it was invisible to it** - which is
where the next magic number would go, and where two of the structural entries it declared were
already sitting unread. The span starts at the first engine function now, and module-scope
declarations are scanned against their own list, because a named constant at module scope is the
right home for a structural value and the wrong place to hide a model quantity.

Three new checks, **each watched failing**, plus two strengthened ones re-proven the same way.
Self-tests **126 → 129**. No published number moved: mature-year total, 2041 total, new revenue,
per capita, NHE/GDP and `pubShare` are identical before and after the review, 727 published
targets unmoved, 1,037 criticality positions unmoved.

**One finding left alone, deliberately.** `health.astro` carries "KPP-A3 allows ≤0.5% billing
exceptions" in reader prose - a rule-2 breach that predates this section and belongs to whoever
owns that paragraph. Named here and in the prompt file rather than fixed silently in a diff that
has nothing else to do with it.

**Judgement calls accepted rather than acted on**, recorded so the next reviewer does not re-file
them: `sponsorShare()` is a middle man for one caller and is kept because it throws by name on
an unknown sponsor; `selftests.ts` is accumulating unrelated surfaces (divergent change) and
splitting it is a §S0 harness decision, not a §S6a one.

### GATES AND COUNTS

- **Self-tests 107 → 129**, the last three added by the code review. README bumped in the same edit every time; the drift gate fired on
  schedule whenever it was not.
- **22 new checks, and all 22 were watched failing**, by breaking the code and rebuilding, then
  restoring from bytes read before the break. The pass is scripted in the session scratchpad and
  reports `build failed / named its check / restored` per break. Two were caught being wrong
  *while being written* rather than after: the engine-literal scan fired on the `88` and the
  quantile clamp before it was finished, and the mature-year scan found five sites its author
  did not know about.
- `astro check`: **0 errors, 0 warnings, 1 hint.** The count fell from 2 because R126's test
  uses the `GROUPS` import that was flagged unused. The remaining hint is `equations.ts`'s
  unreachable `return NaN`, pre-existing and outside this section.
- `pnpm test`: 57 files, **372 tests**, all green. `vitest.config.ts` gains
  `testTimeout: 30000`: several tests run the whole self-test summary, which is heavier with a
  1,500-draw ensemble, and they were failing as timeouts rather than as anything real.
- Build time 12.4s → 18.0s, from the draw count.
- `tests/lib/taxmodel.test.ts` still pins `TAX_SELFTESTS.length` at 15; nothing here added a tax
  invariant, so it is untouched.

### THE MEASUREMENT DISCIPLINE THAT THIS SECTION RAN ON

Every published movement in this entry was isolated by pinning the changed thing to its old
value and re-running, rather than by reasoning about what should have moved. That is what
caught the shared random stream: the hero figure moved by the same amount whether the new
parameter varied or was frozen at the constant it replaced, which is only possible if the
parameter was not the cause.

The technique is cheap and it is the only reason the `publicAdminRate` numbers in this entry can
be stated as that parameter's effect rather than as this session's effect. **Any later section
that reports a movement below 0.7% on the hero figure or 1.4% on new revenue is reporting the
ensemble drawing different numbers**, and the self-test that measures it is now in the build.

---

## P8 — §S6b Scenarios, bounds & sliders · 2026-08-18 · branch `nha-remediation`
STATUS: complete — all 7 rows landed across 6 commits (`R59` folded into `R139` as superseded),
plus 2 new findings fixed, plus a two-axis code review that found the section's worst
defect after this entry was first drafted

**Entry gate:** `## P7` (`§S6a`) `STATUS: complete` ✅ · `publicAdminRate`'s distribution
verified in the code at `low: 1.5, mode: 2.2, high: 6.0` ✅ · `check_audit_docs.py` 35/35 exit 0,
`astro build` passes, tree clean ✅ · **part 2 run in this session:** removed the slider domain
clamp in `scenarios.ts`, the build failed on `No slider position pushes a parameter out of its
domain (employerCapture@100 -> 80.0..120.0 (domain 0..100), wagePassThrough@100 -> ...)`,
restored from bytes read before the break, tree clean ✅

### LANDED

| Commit | Rows |
|---|---|
| `baea2dc` | `R61` — the stress catalog, executed |
| `47fa4cf` | new finding — the build never type-checked, and two type errors had already shipped |
| `798162d` | `R60` — an override that names nothing now fails the build |
| `cb2eb56` | `R139` + `R59` — what the bands are, and the one bound that stopped holding |
| `a4823e3` | `R141` — fifty-two magnitudes that now say where they came from |
| `8307b64` | `R237` — the band that closes exactly where the model is least certain |
| `944c080` | `R142` — the same slider position is not the same uncertainty |
| `4798e28` | new finding — a control that stops at 6% builds a band reaching 16.4% |
| `44d57ae` | code review — the sentence both axes found, and the grade that stopped at the easy half |

### THE EXIT PROTOCOL FIELDS

- **UNKNOWN KEYS: 0.** All 52 override keys and all 9 structural knob settings resolve. There is
  no live typo and there never was one; there was no guard, and now there is.
- **OVERRIDES SOURCED: 52 of 52**, plus 7 structural blocks. Graded **50 low, 2 medium, 0 high**.
- **SCENARIOS WITH TESTS: 20 of 20** (see `DISCREPANCY D60` — it was never 0 of 19).
- **CONTRADICTIONS:** two, both between the audit and the live code, both resolved for the code.
  See `D56` and `D57`.

### HEADLINE FIGURES — nothing moved, and that is the correct answer

2024 dollars, `SCN-BASE`, paired comparison at identical seeds, `preP8` → `postP8`.

| Figure | Before | After | Change |
|---|---|---|---|
| Mature-year total (`matureToday`) | $5,305.35 | $5,305.35 | **+0.000%** |
| 2041 total | $9,210.96 | $9,210.96 | **+0.000%** |
| New revenue required | $3,409.35 | $3,409.35 | **+0.000%** |
| Per capita | $25,648.52 | $25,648.52 | **+0.000%** |
| NHE / GDP at maturity | 23.6965% | 23.6965% | **+0.000%** |
| Federal increase | $4,648.47 | $4,648.47 | **+0.000%** |

**727 published targets unchanged. 1,170 interim cells unchanged. 0 of 1,037 criticality
positions moved, 0 RPN changed.** An intermediate `midP8` label was dumped after `R141`, which
rewrote all 52 overrides into a new shape, and that comparison is separately 0.000% on every
figure.

**The section's Report asks for "any scenario whose corrected bounds change its output
materially." There is none, and the reason is the finding rather than an absence of one: no
bound was corrected, because `R139` supersedes `R59` precisely to stop a constraint being
invented that the model does not have.** The noise floor (0.56% hero, 1.37% new revenue) never
came into it; every figure is bit-identical.

### DISCREPANCIES

**Nine here, and three more (`D65`-`D67`) under the code review below, one of which
corrects `D58` in this section.**

**`D56` — "all 52 of 52 overrides fall outside their base `low`/`high`" is now 51 of 52.**
`§AP1` measured 52 of 52 and used it to withdraw `AC2`'s "scenarios violate declared bounds"
framing. `§S6a` then widened `publicAdminRate` from `high: 3.2` to `high: 6.0`, which brought
`SCN-PESS`'s `[2.5, 3.5, 4.5]` inside the base band. **The reframing survives at 51 of 52; the
arithmetic behind it does not.** The rendered note says 51 of 52 because it is assembled from
the catalog rather than stating a number.

🛑 **`D57` — "no override exceeds its `sliderMax`" is FALSE, and it is the one that mattered.**
This was `AP1`'s better finding: a real constraint the catalog respected silently, which `R139`
asks be written down. `§S6a`'s same widening put `SCN-STATE-RESIST`'s `publicAdminRate` at
`{ mult: 1.15 }` × a base high of 6.0 = **6.9% against a slider ceiling of 6%**. So **`R139`'s
own declared test, `no scenario override exceeds its parameter's sliderMax`, would fail the
build on the tree as it stands.**

The constraint was being respected by coincidence and broke the moment an unrelated parameter
was re-ranged, which is what a rule that was never a rule looks like. It is the same reasoning
`AP1` used to withdraw `AC2`, run in the other direction. **6.9% is not clamped:** a slider
ceiling is the top of what a control exposes, not a limit on what a stress case may explore, and
clamping would quietly weaken a scenario to protect a UI bound. It is declared in
`OVERRIDES_BEYOND_SLIDER` with its reason, and the check holds the declared set equal to the
measured one in both directions, so a new one fails the build until somebody writes down why and
a stale entry fails it too.

**`D58` — "of 31 parameters, only 13 carry `sliderMin`/`sliderMax`" is 13 of 32.** `§S6a` added
`lowValuePool`. The other 19 have no bound but the natural domain of their unit.

**`D59` — `AC2`/`R59`'s "sixteen parameters carry `adjustable: false`" is 19 of 32.**

**`D60` — `AC5`'s "19 of 20 scenarios have zero test coverage" is stale, and this row's scope
shrinks because of it.** `§S6a` added three checks that already sweep every scenario:
mature-at-scale for all 20, the natural-domain sweep over 20 × 32 parameters, and `pubShare`
over 20 scenarios × 3 corners × 16 years. **`R61`'s fourth declared assertion, shares in
`[0,1]`, was therefore written and then deleted:** the version in `model.ts` check 5f reaches
strictly further than the mode-path sweep drafted here, and adding a weaker copy would have
raised the test count while covering nothing. The reason is recorded in `selftests.ts` where the
check would have stood.

**`D61` — the P8 prompt's "scenarios have test coverage (there is currently **none**)" is
wrong.** `tests/lib/scenarios.test.ts` has existed since `§S5`'s `R63` and carries 5 tests,
including the constructed-breach probe for the `mult` clamp.

🛑 **`D62` — the P8 handoff's "`astro check`: 0 errors, 0 warnings, 1 hint" is wrong.** Measured
against `6242d23` before this section touched anything: **2 errors.** This became the section's
first new finding.

**`D63` — `AP2`'s "ten of 31 parameters are never stress-tested" is 11 of 32.** The eleventh is
`lowValuePool`, added by `§S6a` and touched by no scenario. The other ten are `AP2`'s list
unchanged, `wagePassThrough` among them. **`R140` (`§S7`) owns this and its figure needs
updating.**

**`D64` — `AC7`/`R237` named `utilIncrease` as the parameter whose band collapses at zero.
Measured, it is five of thirteen:** `utilIncrease`, `drugPriceCut`, `providerAdminSavings`,
`ltcWageFloor`, `wagePassThrough`. All five declare `sliderMin: 0` and all five produce
`[0, 0, 0]` there.

### NEW FINDINGS

🛑 **1. The build never type-checked, and two type errors had already shipped.** Not in any row.
Astro compiles TypeScript through esbuild, which strips types without checking them, so
`astro build` has never been able to see a type error; `pnpm check` is a separate script that
neither the build nor the deploy workflow runs. **Every gate this repo has built sat behind a
build blind to the whole class.** The two that shipped, both from `§S6a`'s code review, both
green in every build since: `selftests.ts` used `PercentileBand` in two places and imported it
in none, and `manifest-check.ts` read `digits[0]` as a `string` where
`noUncheckedIndexedAccess` types it `string | undefined`. Both fixed; `build` now runs
`astro check` first, at about 15 seconds against a 9.5-second build. Recorded in `README.md`,
`AGENTS.md` and `.agent-kb/CONVENTIONS.md` — the last two are **gitignored**, which is why the
note a contributor can actually reach is the one in `README.md`.

**2. A control that stops at 6% builds a band reaching 16.4%.** Not in any row; found while
measuring `R142`. Because the band is rebuilt in proportion to the mode, a control at its
maximum builds a band running past the maximum itself. **Eleven of thirteen adjustable
parameters do it.** Not a defect and not clamped: the relative spread *is* the model's
uncertainty, and holding the band in absolute terms while the mode moves would claim the same
confidence about a 30% induced-demand estimate as about a 10% one. `R134` settled the
neighbouring question the same way. What was missing is that nobody could see it and nothing
held it; both are now true.

**3. `ScenarioStructural` was doing two jobs.** Surfaced by `R60`'s own guard refusing `why` as
an unknown knob an hour after it was written: correct behaviour on a wrong premise. The engine's
argument type and the scenario's declaration are different things, and requiring provenance on
the former made it required of nine call sites whose only message was `{}`, "no structural
adjustment". Split into `ScenarioStructural` and `ScenarioStructuralDecl`.

**4. The rule behind `AP6`, which `AP6` did not state.** At a fixed slider position the band
differs from the base case for **22 of 33** scenario-parameter pairs and is **identical for
11**, and the split is exactly the kind of override: a `to:` override reshapes the triple so the
relative spread changes, a `mult` override scales all three points so it does not. This is more
useful than the three examples `AP6` recorded, because it tells a reader which comparisons are
safe.

### TWO CHECKS THAT WERE WRONG WHEN WRITTEN, AND HOW THAT SURFACED

Both were caught by their own break-and-restore, which is the argument for running one on every
check rather than on the ones that look risky.

- **The provenance render check asked only that SOME `.why` appeared in the picker source.** It
  passed with the per-override reason deleted, because the structural block's own `why`
  satisfied it. A render check a deletion cannot fail is not a render check. It now names each
  of the four reads separately.
- **The slider-reach metric was algebraically blind to its own purpose.** Measuring the band
  high against the parameter's declared high reads naturally and reduces to `sliderMax / mode`,
  which contains no `high` at all and therefore cannot see a base band widen. That is the exact
  movement the check exists to catch. The break written to prove it passed while tripping an
  unrelated check, which is how the hole surfaced. Measuring against the slider ceiling gives
  `high / mode`, the band's own relative width. **The corrected check fires on `§S6a`'s
  `publicAdminRate` widening, which took it from 1.45 to 2.73 with nothing anywhere noticing.**

### COUNTS AND GATES

- **Self-tests 129 → 141**, twelve added. README bumped in the same edit each time; the drift
  gate fired whenever it was not.
- **19 new or touched checks, all 19 watched failing**, by breaking the code, rebuilding, and
  restoring from bytes read before the break. One break was wrong rather than one check:
  grading `SCN-PANDEMIC`'s structural block `medium` passed, because its reason already names
  $220B and 4.5%, which is the rule working. Retargeted at a reason carrying no figure. The scripted pass is
  `baseline-P8/prove_p8.py` and reports `build failed / named its check / restored` per break,
  then `git status`. Final run: 17 of 17, tree clean.
- Two changes to P7's `prove2.py` that both cost a run: it invokes `npm run build` rather than
  `npx astro build`, because a type break has to be provable now; and **failure is read off the
  process exit code, not off the string `Self-tests failed`** — a guard that throws at module
  load kills the build during SSR evaluation and never reaches the self-test summary, so the
  string test reported a failing build as passing.
- `astro check`: **0 errors, 0 warnings, 1 hint** — genuinely, and now enforced. The hint is
  `equations.ts`'s unreachable `return NaN`, pre-existing and outside this section.
- `pnpm test`: 57 files, **372 tests**, all green. `tests/lib/scenarios.test.ts`'s probe was
  updated to the provenance shape; no test was added, because every invariant this section
  produced belongs in the build gate rather than in vitest.
- Build 9.2s → 10.3s from `R61`'s 20 ensembles, then to about 25s once `astro check` joined it.
- `tests/lib/taxmodel.test.ts` still pins `TAX_SELFTESTS.length` at 15, untouched.

### WHAT THIS SECTION CHANGED FOR A READER

Three statements now render that did not exist before, all assembled from the catalog rather
than typed, so none of them can drift from what they describe:

- **Above the full parameter table:** what `low` and `high` are, that 51 of 52 scenario
  adjustments sit outside them by design, and that the enforced bound comes from the unit.
- **Under the sliders:** that the band is rebuilt in proportion to the control, that it closes
  to nothing at zero, that it depends on the active scenario in 22 of 33 cases, and that at a
  control's maximum it reaches about 2.7 times the top of the control itself.
- **Next to the scenario picker:** whether the scenario's magnitudes are sourced or assumed, and
  every adjustment it makes with its own grade badge and its own reason.

Verified in the browser, not inferred from the diff: the picker across `SCN-BASE`,
`SCN-PANDEMIC` and `SCN-PESS`, the singular and plural forms, the grade badges, and zero em
dashes in the rendered text.

### THE CODE REVIEW, RUN AFTER THE LOG ENTRY WAS DRAFTED

Two axes against `6242d23`, Standards and Spec, in parallel and without sight of each
other. **Eleven findings on Standards, four on Spec, and nothing implemented wrong** on
the six load-bearing claims: every one reproduced by independent measurement, including
that `OVERRIDES_BEYOND_SLIDER` is complete at exactly one and that `model.ts` check 5f
really is a strict superset of the `R61` check this section deleted.

🛑 **Both axes landed on the same sentence, from opposite directions, and it was the
worst defect in the section.** `paramBandNote()` told a reader *"What cannot be crossed
comes from the unit: a percentage or a share is held between 0 and 100."* Standards
called it note/code drift: `naturalCeiling()` tests `RATE_UNIT` first and returns `null`,
so the three `%/yr` parameters are deliberately exempt. Spec reached it from the section
brief's *"every parameter has declared bounds"* and measured the real number.

**Measured with the live `naturalCeiling()`, the 32 parameters fall in three tiers:**

| Upper bound comes from | Count |
|---|---|
| The unit (a percentage or share, held at 100) | **12** |
| A slider ceiling, which caps the control and not the scenario | **6** |
| **Nothing. A floor at zero and no maximum** | **14** |

**`D65` — and this corrects `D58` in this same entry.** `D58` said the 19 parameters
without slider bounds *"have no bound but the natural domain of their unit"*, which reads
as though the unit supplies one. For 14 of the 32 it supplies nothing: they are dollar
amounts and growth rates, which have no natural maximum. The 14 include `bhExpansion`,
`wealthTaxPotential`, `careModelSavings` and `extractionSavings` — **`R59`'s own four
named examples**, which makes its sub-finding sharper than the stamp gave it credit for.
The code is right and the sentence was wrong; the sentence is now assembled from the
three measured tier counts.

**`D66` — the prompt's Done-when clause "the slider spread cannot collapse to zero width"
is unconditional, and this section did not make it true.** Five parameters still yield
`[0, 0, 0]` at `sliderMin`. `R237` explicitly permits the statement branch instead of a
floor, and the reasoning is recorded at length, so the choice is legitimate. **Recording
it only in the row and not under `DISCREPANCY` was not**, and Order 0 asks for exactly
this. Filed now.

**`D67` — `R139`'s second declared test, "every parameter declares what its low/high
represent", shipped as one collective page sentence rather than per parameter.**
`params.ts` gained no field and is untouched, despite being named in the section brief's
Files. Thirty-two copies of one sentence would be noise, so the narrowing is defensible;
not noting it was not.

### WHAT THE REVIEW CHANGED

- **The band note is true now, and held to the numbers rather than to its own wording.**
  Its check used to match three prose phrases, one of which was part of the false claim,
  so **rewriting the note to make it truer broke the check.** It now requires the note to
  state each of the six measured counts. A rewrite that keeps them stays green; vague
  prose satisfies none of them.
- **Structural blocks carried a reason and no confidence grade**, while all 52 overrides
  carried both. CONVENTIONS rule 3 wants a grade on every number, and the two figures
  `AP4` named by name, `SCN-PANDEMIC`'s $220B and `SCN-CYBER`'s $45B, are structural
  rather than parameter overrides. **They were precisely the numbers that reached a
  reader ungraded.** All seven blocks graded, and `provenanceProblems` now holds the
  structural half to the same substance rule as the overrides.
- **CONVENTIONS rule 4, in rendered text, five ways.** Shouting caps (`BELOW`),
  rhetorical flourish (*"reading it backwards"*), UI self-reference (*"which is why the
  description says"*), *"not X, not Y"* scaffolding in both note builders and the picker,
  and a crutch cadence closing 21 of the 52 `why` strings on *"The proportion is
  assumed"* or *"The fraction is judgement"*. The closers restated the confidence grade
  in prose on every entry; each now says what the magnitude is anchored to instead, which
  is shorter and carries more.
- **A self-test name that repeated itself**, rendered in the footer integrity panel.
- **`reach[0]` was an unguarded index** in a function the health page calls from its
  frontmatter, while the self-test on the same value guarded it.
- **`unreadStructuralKnobs` matched a bare substring**, so `opts.shock` would have
  satisfied `s.shock`. The same file argues elsewhere against a check a deletion cannot
  fail; the standard applies to its own.
- **`R60`'s guard caught `confidence` exactly as it caught `why`.** Two special cases is
  a set: `STRUCTURAL_PROVENANCE_KEYS` now, and a third costs nothing.

### WHAT THE REVIEW RAISED AND THIS SECTION DID NOT CHANGE

- **Scope, on the slider-reach tripwire.** Spec called `47fa4cf` (the type-check gate)
  not creep, since every gate this section declares was being enforced by a build that
  could not see a type error. It called `4798e28` half creep: the disclosure belongs to
  `R142`/`R237`, but `SLIDER_REACH_DECLARED` at 2.727 +/- 0.01 is a standing tripwire no
  row asked for, and it will fail the build for any later section that re-ranges an
  adjustable parameter's `high`. **That is the intended behaviour and it is a real cost
  on later sections, so the failure message now says what to do about it.**
- **`collapsingSliderParameters()` samples the two slider ends, not "any slider
  position".** Safe today because no parameter declares a negative `sliderMin`, so a zero
  crossing can only occur at an end. Recorded rather than generalised.
- **Four judgement-call smells, accepted under a frozen architecture and left for
  whoever moves a seam here:** `scenarios.ts` now holds catalog data, two validators, a
  module-load throw, four measurement sweeps and two prose builders (*Divergent
  Change*); those four sweeps repeat the same `adjustable`/`sliderMax`/`effectiveParams`
  loop preamble (*Duplicated Code*); `scenario + '/' + param` is built as a string in
  three places and re-split in a fourth when an `OverrideBeyondSlider` type already
  exists (*Primitive Obsession*); and only `unknownOverrideKeys` takes its catalog as an
  argument, so it alone can be probed with a fabricated one while its four neighbours
  read module state.

### FOR THE NEXT SECTION

- **`§S7` (P9) / `R140`** — its "ten of 31 parameters are never stress-tested" is **11 of 32**.
  `lowValuePool` is the addition. `wagePassThrough` is still the one that matters.
- **Adding a scenario or an override now costs more, on purpose.** Every override needs a `why`
  of at least 40 characters and a grade; a `medium` grade must name a figure; a scenario
  declaring `sourced` may carry no `low`-graded override; a structural block needs its own
  reason. The type refuses the rest.
- **`unitsCost` is still a live parameter and three scenarios still override it.** `AC6`'s
  migration hazard is unchanged, except that it is no longer silent: after the per-type rework
  those three keys will fail the build at module load rather than being ignored.
- **The audit-document repo still has no remote.** Asked in P5, P6, P7 and now P8.

## P9 — §S7 Medications & PMC · 2026-08-19 · branch `nha-remediation`
STATUS: complete — all 12 rows landed across 11 commits (`R214`+`R296` as one, `R173`+`R204` as
one, `R174`+`R175`+`R176` as one), plus 4 new findings, plus 1 self-inflicted defect found and
fixed by the repo's own gates, plus a two-axis code review that found seven more after this
entry was first drafted — three of them the same shape as defects the section had just fixed

**Entry gate:** `## P7` (`§S6a`) `STATUS: complete` ✅ · `check_audit_docs.py` 35/35 exit 0,
`astro build` passes, both trees clean ✅ · **part 2 run in this session:** changed
`STRESS_SCENARIO_COUNT` from 19 to 18, the build failed on `The catalog holds one base case and
its declared stress set`, restored from the bytes read before the break, tree clean ✅

### LANDED

| Commit | Rows |
|---|---|
| `9c7529f` | `R214` + `R296` — one owner for the retail drug line, and a bar whose labels are its widths |
| `5cef699` | `R173` + `R204` — the drug base is a mode with a range around it, and the chapter says so |
| `d8a215c` | `R50` — the two reduction controls are separate, and the page says by how much they differ |
| `e974449` | `R174` + `R175` + `R176` — the portfolio says what it rests on, per family |
| `f3f9568` | `R52` — four tests that can fail replace three that could not |
| `3a52c93` | `R140` — three parameters leave the unstressed set, eight say why they are in it |
| `44c7102` | `R140` follow-up — the household-cost breach count moves 10 → 11, and the scenario that crossed is named |
| `a38e0e0` | `R34` — the IRA scores are original scores, and all four sites now say so |
| `92fe1c8` | `R105` — rule 3 names five categories that can interrupt care; two were never certified |

### THE EXIT PROTOCOL FIELDS

- **DRUG BASE: $717.9B → $717.9B.** Retail component **`$467B` as published → `$461.4B` as
  published**, which is what it always was in the model. The defect was never that the model
  used the wrong number; it was that the page described the model's base with a CMS figure the
  model does not use. `449.7 × 1.026 = 461.4`, derived from `BASE2023.rxRetail` rather than
  typed.
- **DRUG-PRICE LEVER: $287.2B → $287.2B**, at the 40% mode. Unchanged for the same reason, and
  an intermediate `midP9` dump taken immediately after the base commit proves it: every figure
  moved 0.000%.
- **FAMILIES SOURCED: 200 of 200.** Graded **185 high, 15 medium**, across 2 declared sources.
- **SLIDER: disclosed as independent**, and the disclosure states the measured factor. See
  `D71`, which supersedes the row's own checkable claim.
- **CONTRADICTIONS:** twelve, `D68`–`D79`. **Five here**, of which two are the audit
  contradicting the code, two are the code contradicting itself, and one is a row whose
  checkable claim is unsatisfiable. **Seven more under `THE CODE REVIEW` below**, found
  after this entry was first drafted; those are the section contradicting itself.

### HEADLINE FIGURES — nothing moved on the base case

2024 dollars, `SCN-BASE`, paired comparison at identical seeds, `preP9` → `postP9`.

| Figure | Before | After | Change |
|---|---|---|---|
| Mature-year total (`matureToday`) | $5,305.35 | $5,305.35 | **+0.000%** |
| 2041 total | $9,210.96 | $9,210.96 | **+0.000%** |
| New revenue required | $3,409.35 | $3,409.35 | **+0.000%** |
| Per capita | $25,648.52 | $25,648.52 | **+0.000%** |
| NHE / GDP at maturity | 23.6965% | 23.6965% | **+0.000%** |
| Federal increase | $4,648.47 | $4,648.47 | **+0.000%** |

**727 published targets unchanged. 1,170 interim cells unchanged. 0 of 1,037 criticality
positions moved, 0 RPN changed.** The declared noise floors (0.56% hero, 1.37% new revenue,
0.40% p90 tail) never came into it on the base case: every figure is bit-identical.

**Two stress scenarios did move, and that is `R140` working.** At identical seeds:

| Scenario | Mature new revenue | Change | Against its floor |
|---|---|---|---|
| `SCN-EMP-FAIL` | $3,675.4 → $3,730.7 | **+1.50%** | above the 1.37% floor |
| `SCN-PESS` | $4,372.8 → $4,401.5 | +0.66% | **below** it |

Three intermediate labels were dumped, not one: `midP9` after the base commit, `r140P9` after
the stress commit, `postP9` at the end. `preP9 → midP9`, `midP9 → r140P9` and `preP9 → postP9`
are each 0.000% on every base-case figure, which is how each movement above is attributed to one
commit rather than to the section.

### DISCREPANCIES

**`D68` — `R214`/`R296`: the audit said it could not tell which retail figure was right. The
repository can.** `§BJ5` filed the $16.9B as "a reconciliation failure, not an error
attribution." Two things inside the repo settle it, and neither had been brought together
before. `SiteHeader.astro` publishes the calibration convention on all fourteen pages — real
2024 dollars, calibrated to CMS NHE 2023, the last finalized year — so a CMS 2024 actual and a
2023-calibrated figure deflated for display are **different quantities by construction**, and
the page was placing them side by side as though they were comparable. And `research/03`'s 2024
NHE table, the source of the $467.0B, records in its own source note that the CMS PDF *"returned
HTTP 403 on direct fetch during this research pass"* and that its figures are *"drawn from
search-result excerpts"*; it asks for a human re-pull. `research/01`'s 2023 table was read
whole, and it is the one `params.ts` calibrates on. **Resolved for `BASE2023.rxRetail`.**

**`D69` — `R140`'s count is wrong, as the section brief warned, and the brief's correction is
right.** The row says ten of 31 parameters are never touched by any scenario. Measured: **11 of
32**. `lowValuePool` is the addition and nobody re-measured after it was added. The row's ten
names are all correct. Implemented against the measurement.

**`D70` — `R52`'s premise understates the problem it names.** The row calls
`calcSavings(5,25) === 8.97375` tautological, which it is. What the row does not say is that the
same test file also pinned the phase counts, and those two things sat in one test under one
name, so a genuine reconciliation and a tautology failed and passed together. Split.

**`D71` — `R50`'s checkable claim is unsatisfiable, and satisfying its wording would have made
the dashboard worse.** The claim is *"Medications-tab savings equal the healthcare model's drug
savings at identical settings."* Measured, the engine's mature drug saving is **2.007 times**
the tab's lever, at 25%, at 40% and at 55% — a constant factor, not a shape difference. Both
apply the same percentage; the tab multiplies a 2024-scale base of $717.9B and the engine
multiplies a base grown to 2041 with utilisation applied, 1404.6 against 699.7 in 2023 dollars.
**Wiring the two controls together, which is what the row asks for, would have made the
percentages agree and left the dollars a factor of two apart** — a reader would have read the
agreement as reconciliation. Resolved for the measurement: the controls stay separate and the
page states the relationship, with the factor derived rather than asserted.

**`D72` — `R34` understates its own scope by a factor of four.** The row names the seed rows
`CP-OFF-003a/b`. The same two figures appear in **four** places, and only one of the four
carried the re-scoring caveat — and the least-qualified statement of them, `research/01`'s
*"the single most authoritative, directly-scored real-world data point in the entire offsets
section"*, was in a file with no caveat at all. All four now carry it, plus `params.ts`
`drugPriceCut`, which leans on the precedent.

### NEW FINDINGS

**🔴 `NF1` — the same 2024 NHE table is internally inconsistent on a second line, and nobody had
checked it.** `research/03` CP-DX-001 records physician & clinical services at **$1.11T (2024)**
described as having *"grew 8.1%"*, against **$978.0B (2023)** in `research/01`. That is **13.5%
growth, not 8.1%**. Applying 8.1% to the 2023 NHE total of $4,866.5B gives $5,261B, which is the
**$5.28T** total the same entry reports — so **the 8.1% is the NHE total's growth rate attached
to a category line**. The retail-drug mismatch `§BJ` found is therefore not an isolated slip in
that table, and the 403 note explains both. Recorded in `research/03` under CP-RX-001. **Nobody's
row: the physician line feeds `BASE2023.physician`, which is `§S6a`'s territory, and the 2023
value is the one the model uses, so nothing published is affected.**

**🟡 `NF2` — `itCapital` can now be reported as stressed and still move nothing the dashboard
publishes.** Raising it from 100 to 160 changes mature-year new revenue and total by **exactly
0.00**. It is one-time capital and it lands in 2027 through 2034, +4.8 to +9.0 a year, +60 in
total, seven years before the year the dashboard reports its mature system from. All of
`SCN-PESS`'s movement is `rdPublic`. This is not a new defect — `R156`'s existing self-test
already asserts that the bridge year carries no one-time cost in any scenario, and this is the
same property from the other side — but the coverage rule `R140` asks for cannot distinguish
coverage from effect, and a later reader should not mistake one for the other.

**🟡 `NF3` — four of the eight declared-unstressed parameters are gaps, not decisions.**
`coverageDemandShare`, `legacyAdminFloor`, `residualPrivateShare` and `dvhExpansion` are all
graded low or carry bands that nearly triple end to end, and no scenario moves any of them.
`UNSTRESSED_DECLARED` carries a `kind` field precisely so these four are recorded as `open`
rather than absorbed into a list that reads as justification, and the self-test reports the
split. **Whoever next opens `scenarios.ts` owns them.**

**🟡 `NF4` — the medications page's search index does not include the family id.** A reader
searching `PF-096` gets nothing, because `renderPortfolio` builds its searchable string from
name, form and tags. Small, and it is the id the audit and this log use to refer to families.
**Nobody's row.**

### THE SELF-INFLICTED DEFECT, AND WHAT CAUGHT IT

`3a52c93` changed a pinned count and did not update its test in the same commit, which golden
rule 4 requires. `pnpm test` reported it; the failure was in the same output as the pass line,
and the commit had already run in the same command chain. Fixed in `44c7102` rather than by
amending, so the sequence stays visible.

**The test that caught it is the one `R143` left deliberately exact.** `KPP-C8`'s mature
household cost against a 5% cap, with the breaching-scenario count pinned to the number rather
than to "most", *"so a real move is visible and a reseed is not mistaken for one."* It caught a
real move. Attributed by running the pre-`R140` catalog against the post-`R140` one at identical
seeds:

| Scenario | Before | After | |
|---|---|---|---|
| `SCN-EMP-FAIL` | inside the cap | **8.2489%** | **crossed**, now 4th worst of 20 |
| `SCN-PESS` | 15.5873% | 15.8801% | moved, already breaching |
| every other scenario | | | unchanged to four decimals |

**`SCN-EMP-FAIL` crossing is `R140`'s own premise confirmed.** The row calls `wagePassThrough`
*"the parameter most able to make the financing look worse"* and notes it reduces both the
new-revenue requirement and the apparent household burden. Until this section, the scenario
named for employer pass-through failure showed households **inside** the 5% cap — and the reason
it did was that the parameter the scenario is about was excluded from it.

### GATES ADDED, ALL PROVEN BY BREAKING THEM

Self-tests **141 → 155**. `README.md` bumped in the same edit as each addition. The full
break pass runs 22 breaks; **all 22 fail the build and name their own check**, no `SKIP`, tree
clean afterwards. `NHA-Mental-Health/baseline-P9/prove_p9.py`.

| Gate | What trips it |
|---|---|
| The drug base decomposes into the CMS line the model owns | Any retail term that is not `BASE2023.rxRetail × DEFLATOR` |
| The spend bar labels equal the values its widths encode | A label and a width that disagree by more than $0.05B |
| The chapter builds both segments from the model, not from a literal | A hand-typed $400–560B total on the page, or any of five `DRUG_BASE` reads going away |
| The chapter says its base is modal and says its base year | The note dropping any of its five measured figures, or leaving the page |
| The two drug-price controls are separate, and the page says by how much | The note leaving the page, dropping a figure, or the measured ratio leaving a 1.5–3.0 band |
| Every family's phase is derived from its dosage-form class | The derivation being bypassed, or 61/116/11/12 moving |
| Every family whose forms disagree with its class says why | An undeclared disagreement, a stale reason, or a reason under 60 characters |
| Every drug family carries a source and a confidence grade | A source key outside the declared table, or a table entry nothing uses |
| Every inclusion reason is a member of the declared union | A misspelled tag (compile error), or the tab's filter and the union disagreeing either way |
| The tab states what decides a family's phase | The principle leaving the page |
| Every site quoting the IRA score carries the re-scoring caveat | The caveat leaving the 1,200-character window around any quotation, or the sweep going blind |
| Every parameter is stressed by a scenario or declared | A new unstressed parameter, a stale declaration, or a reason under 40 characters |
| The wage pass-through low end is explored by a scenario | The override staying but abandoning the end that matters |
| Every metric named in derivation rule 3 is certified at P8 | A rule-3 metric losing its P8 row, or the map carrying fewer than five categories |

Plus one gate outside the self-test registry: **`tools/build_data_phase_targets.py` refuses to
write** if a rule-3 category has no P8 certification row. Proven separately; it raises
`R105: derivation rule 3 names categories with no P8 certification row: abnormal-result closure
(TPP-6.3)`.

### THREE WRONG BREAKS, AND WHAT EACH ONE WAS WORTH

The P8 handoff warns that a break can trip a different check and read as success, and that a
wrong break is not a wrong check. Three fired here, and they were not all the same kind.

1. **`whyNot`** — renaming a provenance key instead of deleting the field. `FamilyRecord`
   refuses an unknown property, so the build died at `astro check` and never reached the
   self-test. A wrong break. Incidental finding worth keeping: **a typo'd provenance key cannot
   ship silently in this module.**
2. **Renaming a family instead of moving its class** — nothing failed, correctly. A name is not
   a class.
3. **Deleting one phrasing of the IRA caveat** — the build passed, and this one was a **wrong
   check, not a wrong break.** The check asked whether the *file* contained the caveat token
   anywhere, and the same file mentions re-scoring a second time while explaining the history.
   Tightened to a window around each quotation, which then legitimately failed on two value
   lines that were fixed. A second attempt found the window read only forward and called a
   caveat written immediately *before* the figure missing; it now reads both ways. **The break
   that could not fail is what turned a weak check into a real one.**

### WHAT THIS SECTION DID NOT TOUCH

The savings calculator's arithmetic and its *"It does not add a new offset"* disclosure, as
`§S7` requires. `V8` (61 → +116 → +11 → +12 = 200) and `V9` (exact at every point including the
$9–99B stress boundary) both still pass, and `V9` is now checked against the sliders that
produce the boundary rather than against two numbers retyped into a test.

`R175`'s phasing principle was surfaced, not changed: all twelve P8 families are still
biologics and all eleven P7 families are still device-combination or inhaled.

### CARRIED FORWARD

Everything in the P8 handoff's "Findings P8 raised that other sections own" is unchanged except
`R140`, which is closed here. Still open and still nobody's or someone else's: the two pages
publishing "new revenue needed" from different statistics of the same model; `R135`'s seven
`low`-confidence parameters with empty `url` (`P25`); `risk.astro`'s 7 role-less `aria-label`led
`<div>`s (`§S14`); the 14 non-finite equation cells; `health.astro`'s "KPP-A3 allows <=0.5%
billing exceptions" prose breach; `wealthTaxPotential`'s label; the four judgement-call smells in
`scenarios.ts`; and the three significant figures the ensemble cannot support.

**`§AC6`'s `unitsCost` migration hazard is untouched and still live**, overridden by
`SCN-UNIT-UNDER`, `SCN-AI-FAIL` and `SCN-RURAL-STRESS`.

`astro check`: 0 errors, 0 warnings, **1 hint** (`equations.ts` unreachable `return NaN`),
unchanged.

### THE CODE REVIEW

Run after this entry was first drafted, two axes in parallel, fixed point `fd007ba`
so the diff is exactly §S7. **Seven findings landed, in `804c55e`. One was checked and
rejected.** The section had already dumped four labels, proven 22 breaks and written the
entry above; P8 ended the same way, and the lesson is the same one.

**`D73` 🛑 — the spend-bar gate could not fail, and it shipped inside the commit whose
subject was a tautological test.** `The spend bar labels equal the values its widths
encode` computed `(retailPct / 100) * total` and compared it against `retail`. But
`retailPct` **is** `retail / total * 100`, so all three conjuncts were algebraic
identities that no data could falsify. The break written to prove it passed only because
it perturbed `retailPct` *after* it was derived, which breaks the identity rather than
exercising the check.

This is `R52` — *"verifies that multiplication works; given a hardcoded constant it cannot
fail"* — committed in `R296`, four commits before `R52` was fixed, in the same section.
**Writing a check against a value the check itself derives is the shape, and knowing the
shape by name did not prevent it.** The replacement works on the printed strings: the sum
a reader can do on the two segments, and each printed width applied to the printed total.
Neither is an identity, because rounding is not invertible.

**`D74` 🛑 — and the labels the dead gate guarded were wrong on the rendered page.** It
printed *"$461B plus $257B is a $717.9B drug base"*. **461 + 257 is 718.** The segments
were rounded to whole billions and the total to one decimal. That is `BY2`'s defect, a
label that is not the value beside it, **reintroduced by the commit that fixed `BY2`**,
and it reached a reader. Fixed to one precision throughout: `$461.4B plus $256.5B is a
$717.9B drug base`.

**`D75` 🔴 — `DRUG_BASE_READS` defeated its own stated purpose.** `'DRUG_BASE.retail'` is
a substring of `'DRUG_BASE.retailPct'`, and `'DRUG_BASE.nonRetail'` of
`'DRUG_BASE.nonRetailPct'`, so an `includes` test was satisfied by the two percentages
alone: **the two label reads the check exists to protect could both be deleted with it
still passing.** The comment above it, copied from `SCENARIO_PROVENANCE_READS`, says
naming each read separately is what stops a check passing with the deletion it exists to
catch. It named them separately and then compared them with the wrong operator. Matched
with a trailing-character guard now, and a new break (`label read deleted`) proves it.

**`D76` 🔴 — a universal the same page contradicts.** `drugBaseNote()` opened *"Every
dollar figure in this chapter is in real 2024 dollars"*, four cards below *"$449.7B ·
retail prescription drugs in 2023"*. **Written by hand, in a sentence where every other
figure is derived** — which is verbatim the defect P8's own review ended on, and which
this entry quotes approvingly in the `R173` commit. Scoped to "The modelled figures in
this chapter".

**`D77` 🟡 — the $680–730B range stopped reproducing from its own terms.** Substituting
the owned retail line into its scope sentence gives `461.4 + 212…264 = $673–725B`, not
$680–730B. The range is `CP-RX-002`'s externally published estimate, built on the $467.0B
figure `D68` sets aside; it never was derived from the model's base. Stated as that now,
in both research files, explicitly not re-derived. **The endpoints are unchanged and the
model's $717.9B still sits inside them either way.**

**`D78` 🔴 — an internal row code reached readers.** `params.ts` `drugPriceCut.source`
began *"R34: the IRA precedent this leans on…"*, and `PARAM_DEFS[].source` renders in the
parameter table on `health.astro`. Golden rule 2 forbids surfacing internal codes in the
UI. Confirmed in `dist/health/index.html` before the fix; 0 occurrences in either rendered
page after it. **The habit of tagging edits with their row number is right in a commit
message and in a comment, and wrong in a string the build prints.**

**`D79` 🟡 — a cross-scale dollar comparison, published.** `drugLeverNote()` printed
*"$287B against a 2024-scale drug base, while the model reports about $576B in 2041,
roughly 2.0 times as much."* Golden rule 6 is *"never compare dollars across scale-years…
'mature at 2024 scale' and '2041 steady state' are different questions."* **A published
ratio between the two is that comparison, and explaining a comparison the house style
forbids is not the same as not making it.** The note now says the two answer different
questions and names only this tab's own figure. The ratio stays measured and stays gated
by the 1.5–3.0 band, where it is developer-facing. `DRUG_LEVER_RATIO_TEXT` deleted as
dead.

**One finding checked and rejected.** The Standards axis held that `medications.ts`
importing `params.ts` pulls the parameter base into the medications client bundle, which
is the concern `drug-lever.ts` was split out to avoid. Probed the built chunk for `449.7`,
`publicAdminRate`, `wagePassThrough` and `DRUG_BASE`: **all absent.** Rollup drops it.
Plausible in principle, false in fact, so nothing changed. Recorded because the next
reader will have the same worry.

**Judgement calls accepted as-is, for whoever moves a seam here:** the declared-exception
quartet is cloned between `scenarios.ts` and `medications.ts` with two names for one
threshold (`PROVENANCE_MIN_CHARS` and `FAMILY_WHY_FLOOR`, both 40 and 60 respectively);
`readFileSync(MEDICATIONS_PAGE)` appears eight times in `manifest-check.ts`;
`ALL_DRUG_SPEND_2024` leaves the total with a second owner inside a commit titled *one
owner*, deliberately, because the calculator is protected; and `medications-client.ts`
carries the only `as never` in `src/`.

**After the review:** 23 breaks, all fail the build and name their own check, no `SKIP`.
Two breaks that went stale against the fixed code were repaired rather than deleted.
`postP9` → `postP9r` is **0.000% on every figure** — none of this moved a published
number. Build green at 155 self-tests, `astro check` 0 errors, 0 warnings, 1 pre-existing
hint, 376 vitest assertions pass.

**What the section ends on.** Three of the seven findings are the same shape: a check
that cannot fail, a read that cannot be missed, a universal that was not measured. All
three were written *while fixing* defects of exactly that shape, by someone who had just
described the shape in a commit message. **Naming a failure mode does not immunise the
next thing you write against it. The only thing that caught these was a second pass with
a different brief.**


## P10 — §S8 Care cards & benefit arrival · 2026-08-22 · branch `nha-remediation`
STATUS: complete — all 10 recommendations landed across 10 commits, plus one
  finding commit for a defect none of them owned.

ENTRY GATE: `## P3` (`§S2`) is `STATUS: complete` ✅ · the `R256` calendar-anchor
  decision is recorded there and landed in `3d67812` — the years ARE anchored,
  Year 1 is 2027, stated once in `CALENDAR_ANCHOR_NOTE` ✅ ·
  `check_audit_docs.py` 35/35 exit 0 ✅ · `pnpm build` passes ✅ · tree clean ✅

  Pre-section dumps at `NHA-Mental-Health/baseline-P10/` (`preP10-*.json`), plus
  a fifth artifact this section adds: `preP10-care.json`, written by a new
  `caredump.test.ts`. The four P9 artifacts are untouched so they stay
  byte-comparable with the P9 labels.

LANDED:
  - `4d7e389` `R81`  — no care card types its year, and all ten move later
  - `64f28d7` `R170` — the insulin card checked against the framework
  - `5126ab5` `R85`  — card years move with the scenario; four scenarios move them
  - `83d4ac9` `R171` — one residual-billing caveat, four render sites
  - `9e13f5e` finding — the parameter table published seven catalog codes
  - `98f1018` `R82`  — the therapy card cites what actually holds its figures
  - `e0c4b6b` `R83`  — the insulin floor stops understating Civica Rx
  - `073733d` `R205` — every household-profile component declares its vintage
  - `04e0bfb` `R172` — the fourth household count, and the check R84 claimed
  - `3260c09` `R86`  — the withdrawn finding's fact, pinned instead of "fixed"
  - `260be8e` `R164` — 84 leadership titles, each saying whose title it is

CARD YEARS: every card, before -> after, with the gate that decides it.

  | card       | before | after | binding gate                        |
  |------------|--------|-------|-------------------------------------|
  | premium    | 2030   | 2036  | coverage >= 0.99                    |
  | er         | 2034   | 2037  | costShareElim >= 1.00               |
  | childbirth | 2034   | 2037  | costShareElim >= 1.00               |
  | insulin    | 2029   | 2037  | costShareElim >= 1.00               |
  | mri        | 2034   | 2037  | costShareElim >= 1.00               |
  | ambulance  | 2034   | 2038  | expansions >= 1.00 (EMS)            |
  | labs       | 2034   | 2037  | costShareElim >= 1.00               |
  | therapy    | 2034   | 2038  | expansions >= 1.00 (behavioral)     |
  | hearing    | 2036   | 2038  | expansions >= 1.00 (dental/vision/hearing) |
  | nursing    | 2036   | 2038  | expansions >= 1.00 (long-term care) |

  **None is unchanged and every one moves later.** Four cards carry two gates
  rather than one: an expanded benefit has to exist before it can be free, and
  the expansions ramp finishes a year after cost-sharing elimination, so the
  later gate is what the reader is told.

  Each card also prints the open end of its span, derived: cost-sharing relief
  begins 2033, expansions begin 2031, coverage migration begins 2030.

INSULIN: **2029 -> 2037**, against `SR-DRUG-001`, "$0 patient charge for at
  least 98% of essential formulary fills by Phase 8". Phase 8 is 2038, so the
  card now lands a year inside the deadline rather than nine years outside it.
  The requirement is data on the card - id, verbatim words, deadline phase -
  checked against `research/framework_v2_extract.md`, and rendered in reader
  language with no catalog code. What genuinely arrives early is named
  separately and correctly: the pharmacy utility starts cutting the price from
  2029, which is a price and not a $0 counter charge.

SCENARIO-AWARE: **yes.** Four of the twenty scenarios move the card years and
  the page says so in the care section's own intro: "Pick a stress scenario
  further down the page and these years move with the ramps it delays." The
  four are declared in `phase-map-check.ts` with their card counts and shift
  sizes and held in both directions.

    SCN-TRUST-COLLAPSE  10 cards  +1yr    SCN-UNIT-UNDER   9 cards  +2yr
    SCN-STATE-RESIST    10 cards  +1yr    SCN-LEGAL       10 cards  +1yr

  Under `SCN-UNIT-UNDER` the insulin card lands 2039 against a 2038 deadline
  and says "this scenario misses it by 1 year". That is a stress result, so the
  build gate checks the base case only.

DISCREPANCY: **eight, and the audit's own account of this section did not
  survive intact.** The handoff warned that §S8's account "verifies" and told
  P10 not to let that lower its guard on the other rows. That was the right
  warning: `AG1` and `AY2` are exact, and almost everything around them is not.

  `D80` **`AY1`'s ramp values are stale.** It reports `hearing` and `nursing`
    naming 2036 against `expansions = 0.40`, a three-year gap. Post-`R133` the
    ramp reads **0.60** in 2036 and completes in 2038, so the gap is **two**
    years, not three. The audit measured against the pre-realignment ramps. The
    code wins; the direction of the finding is unchanged and its size is not.

  `D81` **`R82`'s cited fix is not executable from the document it cites.** The
    row says to replace the therapy figures with Medicare Physician Fee Schedule
    rates for CPT 90834/90837, "see `07_mental_health.md` §3.2". §3.2
    *recommends adopting* the fee schedule as the framework's reference price
    and flags the absence of a published figure as `GAP-BH-002`; it carries no
    per-code dollar amount. Adopting one would be inventing a number, which
    golden rule 3 forbids. The card cites the record that does hold its figures
    and carries the fee schedule's commercial allowed-amount range as a
    corroborating anchor. The document wins on the diagnosis, the code wins on
    the remedy.

  `D82` **`R170`'s stated test is the wrong direction.** "No card's `fromYear`
    precedes the phase its framework requirement names" would fail the model for
    delivering in 2037 against a "by Phase 8" deadline of 2038. A deadline is
    not a start date. What is checked is that no card promises LATER than the
    requirement allows; the row's own defect - promising something the framework
    has not required yet - is caught by the gate list instead.

  `D83` **`R86` rests on a finding the audit withdrew.** `AG8` was withdrawn by
    `AY5` twenty-three passes later, in words: "Not a bug; do not 'fix'". The
    recommendation table carries `R86` with no withdrawal note, so a reader of
    the table alone would implement a change the audit had already retracted.
    No visual change was made and the fact `AG8` named is pinned instead.

  `D84` **`R164`'s two values cannot both be populated.** The row asks for
    `leaderBasis` carrying `framework` or `design`. Measured against
    `framework_v2_extract.md`, **no** entity's leadership title survives
    checking: a naive scan reports 35 of 84 "found" and every one is a generic
    word ("director", "administrator", "inspector general") matching on the word
    rather than the office. Grading any title `framework` would assert an
    unverified provenance, which is this row's own defect one level up. The
    values are `existing` (2) and `design` (82).

  `D85` **`R84`'s comment claimed a self-test that did not exist.** `params.ts`
    says of the household denominators that "a self-test holds every
    per-household output to naming one". `care.ts` was the only reader in the
    repository and nothing held it to being one; `overview.ts` went on typing
    `hhNow = 132.2` and `hh2041 = 141`. The comment is now true.

  `D86` **`AZ3` and golden rule 2 disagree about the same page.** `AZ3` praises
    `hardening.astro` for citing "both a metric ID and a requirement ID per
    tile" as the sourcing standard other modules should meet. Golden rule 2
    confines those codes to the Data and Quality chapters. `dist/hardening/`
    renders ten. Not resolved here; it belongs to whoever owns that chapter.

  `D87` **The section brief's file list is short.** `§S8` lists `src/lib/care.ts`
    and `src/pages/health.astro`. `R164` lives in `gov.ts`, `gov.astro` and
    `gov-client.ts` and touches neither. `R171` and `R172` reach `index.astro`,
    `household.ts`, `overview.ts` and `money-flow.ts`. The rows are correctly in
    `§S8`; the file list is not the section's extent.

  And one naming error in the P9 handoff, harmless but worth writing down: it
  says `GATE_FLOORS` carries `{ ramp: 'costShareElim', phase: 'P8', atLeast:
  1.00 }`. That is `RAMP_MILESTONES` in `params.ts`. `gate-floors.ts` exists and
  is about catalog progression floors. The handoff also puts the "KPP-A3 allows
  <=0.5% billing exceptions" prose in `health.astro`; it is in
  `src/lib/household.ts:71`, rendered onto that page.

NEW FINDINGS:

  🔴 **Nobody's row, and it shipped live** — the family-burden sentence under
    the hero on the Healthcare chapter read "covered care costs $0 at the point
    of use **and the the** plan caps ordinary households at 5%". A doubled word
    in rendered prose on the most-read chapter, in `overview.ts`. Fixed in
    `R171`, which rewrote that sentence anyway.

  🔴 **Golden rule 2 was breached on two chapters and nothing checked it.**
    `household.ts` rendered "KPP-A3 allows <=0.5% billing exceptions",
    `money-flow.ts` labelled a ribbon "(KPP-C8)", and the full parameter table
    rendered seven more codes from `params.ts` source strings, four of them in
    the "Framework X requires Y" register the same rule forbids. All are gone
    and a check covers the care cards, the four prose modules and the parameter
    table by value. **Measured on the built output: the Healthcare and Overview
    chapters render zero catalog codes; `dist/hardening/` renders ten.**
    ⚠️ That measurement reads static HTML, so anything a client script writes at
    runtime is invisible to it - `gov.ts` carries 33 codes and `rollout.ts` 19
    `OI-0xx` references this sweep does not see.

  🟡 **Whoever owns the Healthcare chapter's voice** — the household
    calculator's footnote opened "Honest caveats:", which is the "honest limits"
    tic golden rule 4 names by name. Fixed in `R171`; it says "What this leaves
    out:".

  🟡 **`R219` (§S12) is still open and still adjacent.** `<div
    class="care-nha-val">$0</div>` is hardcoded while `CareNha.amount` carries
    the figure and all ten cards set it to 0. §S8 deliberately did not take it -
    it is another section's row - but the `$0` now carries the residual caveat
    as a title attribute, so the natural place to attach `R171`'s caveat that
    `R219` said was missing exists either way.

  🟡 **Two cards cite a file in this repository; eight cite outside sources.**
    KFF, CDC NHAMCS, Genworth, HCCI and the federal ambulance collection are
    real citations that nothing here can verify. The self-test reports the
    split rather than implying all ten are checked.

CONTRADICTIONS:
  - `AY1` vs the post-`R133` ramps on `hearing`/`nursing` (D80). Code wins.
  - `R82`'s remedy vs `07_mental_health.md` §3.2 (D81). Code wins.
  - `R170`'s test direction vs what a deadline means (D82). Code wins.
  - `R86` vs `AY5`'s withdrawal of `AG8` (D83). The withdrawal wins.
  - `R164`'s vocabulary vs the extract (D84). The measurement wins.
  - `R84`'s comment vs the checks that existed (D85). The code won; the comment
    is now true.
  - `AZ3` vs golden rule 2 on `hardening.astro` (D86). Unresolved, not ours.

GATES ADDED: **17 new self-tests. The registry goes 155 -> 172** and `README.md`
  is updated in the same edits. Every one was proven by breaking it, watching
  `npm run build` fail, and reading the exit code rather than a grep. The full
  break/restore pass is `NHA-Mental-Health/baseline-P10/prove_p10.py`, re-run at
  section end.

  Deriving a value and then checking it against the thing it was derived from is
  the trap this section could most easily have fallen into, because ten card
  years became derived in the first commit. `premiumCardYearDrift` was deleted
  for exactly that reason rather than updated. What the new checks assert are
  pairs of independently maintained facts:

    - a gate's threshold against its ramp's maximum;
    - a card's promise KIND against the gate list it declares;
    - a card's gate against `RAMP_MILESTONES`, maintained in another file;
    - the printed phase-in year against the ramp array from the other side;
    - a quoted requirement against `framework_v2_extract.md`;
    - a declared deadline phase against the quote's own words;
    - a published bound against the one sentence cited for it;
    - a scenario's measured card movement against a declared table;
    - a rendered caveat against four separately named render sites;
    - a distribution's household sum against the universe it is declared to be;
    - a component's numerator year against its denominator year.

TRAPS MET, and what each one costs:

  🛑 **A tolerant helper answering a strict question.** `careReliefYear` asked
    the existing `firstIndexAtLeast` for "the first index above zero". That
    helper compares `>= atLeast - 1e-9`, so index 0 matches every ramp and all
    ten cards printed "phasing in from 2027". **No check caught it; rendering
    the page did.** A check now asserts the printed year against the ramp from
    the other side. The general rule: an epsilon belongs to the question it was
    written for, and reusing a comparison helper across questions silently
    changes what it means.

  🛑 **Two breaks refused to fail, and both times the check was wrong.**
    (1) The residual-caveat scan asked whether `RESIDUAL_BILLING_CAVEAT`
    appeared in the file. Every site imports it, so deleting the render left it
    passing. Import statements are stripped now. **This is the read-list defect
    the §S7 review caught, written again by the pass that had just read about
    it.** (2) The citation-bounds check searched the joined citation strings, so
    moving the therapy card's insured ceiling from $60 to $75 passed - 75
    appears in the Medicare quotation on the same card. Each bound is paired to
    its own sentence now. **Suspect the check before the break, every time.**

  🛑 **A rule breached by the pass that was fixing it.** `R170`'s first draft
    rendered "Framework requirement SR-DRUG-001" on the Healthcare chapter,
    which is a golden rule 2 breach on both halves at once - a catalog code and
    the "the framework says" register - written while §S8 was busy fixing two
    other instances of it. It is why that fix is a build check rather than a
    sweep. **Naming a failure mode does not immunise the next thing you write
    against it**, which is P9's lesson arriving on schedule.

  ⚠️ **A check whose name promised more than its scope.** "No catalog code
    reaches reader prose on these chapters" was true of the four prose modules
    and false of the parameter table on the same page. Renamed to what it
    covered, then widened, then renamed back. A check's name is read by whoever
    trusts it.

  ⚠️ **This repository has mixed line endings.** `src/pages/index.astro` is LF;
    everything else touched here is CRLF. A CRLF-built replacement payload
    matched zero times against it and reported success. Print the match count
    and assert it, which is what caught this.

  ⚠️ **A non-ASCII `print` still kills a Python edit script mid-run.** Hit once,
    printing a `>=` from a replacement payload; the script died after the
    replacements and before the write, so the file was untouched. Print an index
    and a count, never the matched text.

  ⚠️ **Generating TypeScript from Python is where the syntax errors come from.**
    Two builds died on strings this session: a note whose continuation was a raw
    newline inside a quote, and a comment block whose `*/` closed a paragraph
    early. Both were payloads assembled in Python, not code written directly.

  ⚠️ **A break payload goes stale the moment its anchor changes.** The
    `cited string drifted` break SKIPped after `R82`'s citation shape changed
    mid-row. SKIP counts as a failure; the payload was repaired, not deleted.

  ⚠️ **One break can trip two checks.** `deadline moved earlier` fails the
    requirement-quote row and the deadline row together, because one edit makes
    two things wrong. Assert the name you meant.

  ⚠️ **`npx astro build` is not the build.** `pnpm build` runs `astro check`
    first, and three of this section's failures were type errors that only that
    step sees, including one caught in a client helper's return type.

  ⚠️ **`as string` trips an existing gate.** `primitiveAssertions` fails on a
    primitive type assertion anywhere outside its declared allowlist. Write the
    typed array instead; it reads better anyway.

  ⚠️ **A `const` that reads another `const` must come after it.** Pointing
    `PARAMETER_EXPLORER` at `HEALTH_PAGE` was a module-init failure until the
    declaration moved above it.

HARNESS AND EVIDENCE: `NHA-Mental-Health/baseline-P10/` holds `dump.test.ts`,
  `taxdump.test.ts`, **`caredump.test.ts` (new)**, `baseline.vitest.config.ts`,
  `probe.vitest.config.ts`, `diff2.py`, `crlf_edit.py`, **`prove_p10.py`**, and
  `preP10-`, `r81P10-` and `postP10-` for all five artifacts.

  🆕 **`caredump.test.ts` is the fifth artifact.** `dump.test.ts` has never
  carried the care cards and §S8's whole subject is what year each card
  promises, so a `-care.json` records every card's gates, derived year, relief
  year, ranges, source and confidence, plus each ramp's delivery years and, for
  all twenty scenarios, where the shifted ramps land. It is a separate file so
  the four P9 artifacts stay byte-comparable with the P9 labels.

  `r81P10` is the intermediate label. It was taken after the first commit, which
  is what lets "the model did not move" be attributed to that commit rather than
  to the section.

WHAT MOVED, MEASURED:

  **The model did not move at all.** `preP10 -> postP10`: 0 of 727 published
  targets, 0 of 1,170 interim cells, 0 of 1,037 criticality positions, and every
  headline figure identical to four decimal places. §S8 is a section in which
  the page made promises the model does not keep, so the whole of it lands on
  what a reader is told.

  **Ten of ten card years moved, and every one moved later**: +2 to +8 years,
  the largest being the insulin card's +8. Three published dollar ranges moved,
  each toward its source: the insulin uninsured floor $70 -> $30 (Civica Rx
  undercut the card it was cited on), the therapy insured ceiling $75 -> $60 and
  the therapy uninsured ceiling $200 -> $300 (both to the record that holds
  them). One confidence grade moved, therapy `low` -> `medium`, because the
  figures now come from a record graded medium in its own file.

  Nothing was tuned toward anything. `HOUSEHOLDS_M` is unchanged at 132.2.

STILL OPEN, and whose:
  - **`R219` (§S12)** — `$0` is still hardcoded in the care-card template while
    `CareNha.amount` carries it. Deliberately not taken here.
  - **Golden rule 2 site-wide** — `dist/hardening/` renders ten catalog codes,
    and `gov.ts` (33) and `rollout.ts` (19 `OI-0xx`) carry codes a static-HTML
    sweep cannot see. `AZ3` praises the practice `hardening.astro` follows;
    golden rule 2 forbids it. Someone has to pick one.
  - **`R135` (§S11b)**, the seven `low`-confidence parameters with empty `url`:
    tenth session open, untouched here.
  - **`R245` (§S14)**, `risk.astro`'s 7 role-less `aria-label`led `<div>`s:
    still 7.
  - **The 14 non-finite equation cells**: still 14, still inert, still nobody's.
  - **Eight of the ten care cards cite outside sources** nothing in this
    repository can verify. The self-test reports the split.

### THE CODE REVIEW

Run after the section and after this entry was first written, two axes in
parallel against the fixed point `8f3f013`. **Standards raised six, Spec raised
three.** Both agents were checked against the code rather than believed: one
Standards finding was overstated and is recorded as such; the rest hold. Landed
as `5ec32b8`.

🛑 **The worst finding was the Spec axis's, and it was in `R171` - the row whose
whole subject is a disclosure reaching a reader.** The per-card carrier of the
residual-billing caveat was a `title=` attribute. Present in the markup,
reachable with a mouse, invisible on a touch device and in print, and read by
`residualCaveatSitesMissing` as though it were rendered text. **A tooltip half
the readers cannot open is worse than no per-card disclosure**, because to
whoever checks with a mouse it looks like one. The `$0` now carries
`aria-describedby` pointing at the caveat rendered visibly under the card grid;
the check strips attribute values before scanning, so a tooltip cannot satisfy
it. Proven by moving the caveat into a `title=`.

🛑 **And the fix for another finding was itself dead at compile time.**
`FRAMEWORK_SOURCED_TITLES` was added to record in code the measurement behind
`R164`'s refusal to grade any title `framework`. Written as a bare `= 0` it
takes the literal type `0`, so `FRAMEWORK_SOURCED_TITLES !== 0` is a comparison
TypeScript rejects as impossible: the guard could never fire, and the break
written to prove it died at `astro check` instead of naming its own row.
Annotated `number`. **Third time in this section that a defect of the shape
being fixed was written by the pass fixing it** - after the tolerance reuse in
`R81` and the read-list scan in `R171`. 🆕 **A count a later edit is meant to
raise has to be typed as a count**; a bare integer literal in TypeScript is not
a number, it is that number.

⚠️ **`reliefYearProblems` overclaimed, and the review overstated it back.** The
Standards agent reported the check "cannot fail". Mutating the gate selection
from `min` to `max` fails the build on all four two-gate cards, so it is real
for those four and vacuous for the six single-gate ones, where one gate makes
both sides the same arithmetic. **Measured by mutation, not argued.** The
comment now states which of the three things the function does are checkable
and which is not, and the prefix is scanned in full rather than only the year
before, which covers a non-monotone ramp the single-year test would miss.

⚠️ **`careGatesWithoutMilestone` claimed more independence than it has.** Its
comment said the two lists are "maintained in different files by different
rows"; `R81` added the `coverage@P7 0.99` milestone in the same commit as the
gate that needed it. Corrected in place: separate from here on, not separate at
birth, and the check earns its keep from the next edit.

⚠️ **Five duplications, every one against a principle this section had just
written down.** The catalog-code regex was written three times, once per commit
that needed it - the same duplication `PARAMETER_EXPLORER = HEALTH_PAGE` was
collapsed to avoid, one field over. `params.ts` owns the shape now
(`CATALOG_CODE_SOURCE` + `catalogCode(flags?)` returning a fresh RegExp, so no
caller inherits another caller's `lastIndex`). The mask-and-strip pair was
written out in three checks and is now `renderedSource`, memoised. `overview.ts`
lower-cased the first character of a shared sentence to splice it mid-clause.

⚠️ **Golden rules 2 and 4, in strings this section added.**
`LEADER_BASIS_NOTE` told the reader the titles were "not quoted from" the plan,
which advertises a quotable source document rule 2 keeps off this chapter, and
leaned on "X is not the same as Y" scaffolding rule 4 names. The badge read
"Staffing design, not plan text" on all 84 cards; it now reads "Proposed by this
dashboard". "Sooner, and a different thing:" is now "Arriving sooner:".

**Recorded and deliberately not acted on**, both from the Spec axis:
  - `9e13f5e` carries no `R` number, against the one-rec-per-commit order. Real,
    disclosed in the commit itself, and already pushed.
  - `care.ts` at 892 lines is Divergent Change - card data, ramp arithmetic,
    view-string builders, household profiles and thirteen checks in one module.
    Splitting data from checks is a seam move under a frozen architecture, and
    the repo's own precedent (`model.ts` `selfTest()`, `equations.ts`
    `equationSelfTests`) keeps checks beside their data. **Filed for whoever
    moves that seam, not done here.**

**`R164` keeps `existing`/`design`** over grading all 84 `design`. The Spec axis
is right that the row's binary is unsatisfiable in letter; it is answered by
measurement instead, and that measurement is now a declared constant with a
check on it rather than a sentence in a commit message.

**After the review: 32 breaks, all behaving, tree clean, self-tests still 172.**
The break pass was re-run in full and one break was repaired mid-pass, which is
how the dead comparison was found: it failed the build without naming its check,
and the harness reports that as a failure rather than a pass.

## P11 — §S9a Workforce & transition ledger · 2026-08-24 · branch `nha-remediation`
STATUS: complete — all 12 recommendations landed across 12 commits. `R66` and
  `R178` are the same defect and landed as one commit; `R188` is a scope
  reduction for `§S9b` and landed as the check its own evidence needed.

ENTRY GATE: `## P1` (`§S0`) and `## P2` (`§S1`) both `STATUS: complete` ✅ ·
  a broken invariant fails `astro build`, proven and restored ✅ ·
  `check_audit_docs.py` 35/35 exit 0 ✅ · tree clean ✅

  Step 3 — "record the twelve workforce invariants passing before you start" —
  could not be satisfied as written, and that is the finding the section opens
  with. At the fixed point `a4d1f97` there were not twelve invariants. There
  was **one boolean**. `preP11-workforce.json`, taken from a worktree at
  `a4d1f97`, records `invariants=1/1`, note `"true"`. That is the whole of
  what the before-state could say.

  So the split landed first, before any number moved, and the before-state was
  recorded from it: `splitP11-workforce.json`, **12 of 12**, each named, each
  carrying both sides.

    [low/plan/high]  sum(LEGACY.values) = eliminated    560 / 760 / 1000
    [low/plan/high]  sum(CREATED.values) = created      390 / 510 / 650
    [low/plan/high]  sum(CREATED.fills) = inside        270 / 360 / 460
    [low/plan/high]  supported = eliminated x 0.75      420 / 570 / 750

  Six artifacts at `NHA-Mental-Health/baseline-P11/`. Five are the P9/P10 set;
  the sixth is new — `workforcedump.test.ts`, the workforce ledger in all three
  scenarios, every LEGACY and CREATED row, the derived flow quantities, the LTC
  block and every invariant with its note. Written as its own file so the P9
  and P10 labels stay byte-comparable.

LANDED:
  - `fc84989` `R65`  — the twelve become twelve named checks, and reach the build
  - `de88ac2` `R65`  — the second decomposition of `inside`, and "twelve" was two twelves
  - `dab8403` `R177` — the 75% declared, sourced to KPP-W1, rendered, checked four ways
  - `d0e7fef` `R179` — the unit model behind `CREATED.units` is data, and joined
  - `d8adf17` `R64`  — every ledger figure the chapter states, held to one derivation
  - `5ac55a4` `R67`  — the gross-position floor's scope exclusion is in the data
  - `3ca4ced` `R66` + `R178` — the one non-monotone `fills`, declared; stale declarations fail too
  - `c66c1ca` `R69`  — the denominator declares its BLS series and refuses the OEWS swap
  - `3b31931` `R29`  — research/05's BLS blocker closed; a solved blocker cannot be re-advertised
  - `d7d2fb7` `R168` — the plan is thinnest where it spends most, and the chapter says so
  - `0b4cc5e` `R62`  — the three unit-cost stressors named, for the case `R60` cannot see
  - `6bc00c9` `R188` — the printed reconciliation gap held to the range it prints against

INVARIANTS BEFORE: **1 of 1** at `a4d1f97` (one boolean) · **12 of 12** after the
  split, before any number moved.
INVARIANTS AFTER: **23 of 23**, and the count is not a re-derivation of the
  twelve. It is five relations across three scenarios (15), one monotonicity
  row per CREATED item (7), and `R179`'s planning-case unit derivation (1).

RE-DERIVED: **none.** No invariant that was true became false. No published
  figure moved anywhere in the application.

  - headline `SCN-BASE` p50: `matureToday` 5305.3529, `steadyTotal` 9210.9550,
    `newRevenue` 3409.3518, `perCapita` 25648.5182, `gdpPct` 23.6965 — all
    identical to nine significant figures.
  - 727 published targets: 0 added, 0 removed, 0 moved.
  - 1,170 interim target cells: 0 changed.
  - 1,037 criticality positions: 0 moved, 0 RPN changes.
  - the workforce ledger: `SCENARIOS`, `LEGACY`, `CREATED` and `LTC_WORKFORCE`
    byte-identical between `preP11` and `postP11`. Every derived quantity
    unchanged in all three scenarios: entrants 120 / 150 / 190, annual pace
    10,000 / 12,500 / 15,833, training ratio 5.5x / 4.4x / 3.47x, labour share
    0.0706% / 0.0883% / 0.1118%.

  🛑 **This is the section's most important result and it contradicts the
  prompt's central expectation.** `R179` predicted four broken invariants and
  the prompt asked which four. **None broke, and none could have.** See
  `DISCREPANCY 1`.

REGRESSIONS: none.

TOTAL_US_EMPLOYMENT_2024: **unchanged at 169,956,100, vintage labelled.** The
  second of the two options `R69` allows. `TOTAL_US_EMPLOYMENT_SERIES` now
  declares it as "BLS employment by industry, all industries, 2024" and the
  chapter renders that under the labour-share tile. `OEWS_TOTAL_EMPLOYMENT_2024
  = 155,495,730` is declared as the measure it must not become, and a check
  refuses the swap by name. Updating from the industry series would need a
  newer release of that specific table, which this section has no way to
  verify.

DISCREPANCY: eleven, and the first two change what the section is.

  **Nine of the twelve rows needed correction, reinterpretation, or could not
  be executed as written.** That is a higher rate than §S8's five of ten and
  should be carried as a prior into §S9b:

    wrong as stated          `R179` `R177` `R168` `R67`
    one defect, two rows     `R66` + `R178`
    not executable here      `R64` (needs Type E), `R62` (covered by `R60`
                             except in one case), `R29` (its figures could
                             not be verified)
    correct as written       `R65` `R69` `R188`

  Every one of them still landed. The point is not that the rows are bad, it
  is that the row is a hypothesis and the code is the evidence.

  1. 🛑 **`R179`'s four invariants cannot break in `§S9a`, and there are three
     of them, not four.**

     `R179` and `R64` are both conditional on Part 1 and Part 2 landing. Part 1
     is `§S9b`'s (`R188` says so explicitly) and Type E is Part 2's. `§S9a`
     lands neither. Measured: `UNIT_TYPES` in `units-client.ts` carries types
     A to D and no fifth, so the recompute `R64` asks for has nothing to
     recompute against.

     And the count is wrong independently of that. `R179` says "the four
     `CREATED.values` → `created` invariants". There are **three** — one per
     scenario. `§AD4`'s own table lists five affected *quantities* (unit teams,
     `created`, entrants, annual pace, training ratio), of which only `created`
     is among the twelve; the other four live in self-test 2.

     **The code wins.** What `§S9a` could do instead is make the break loud
     when `§S9b` lands it, and that is what shipped: `CREATED.units` is joined
     to the unit model's own inputs, and every figure the chapter types is
     joined to the ledger. Before this section, restaffing a unit type changed
     nothing downstream. It now fails the build and names the sentence.

  2. 🛑 **The audit describes two different sets of twelve invariants, and the
     section brief and the P11 prompt quote the one the code does not
     implement.**

       `§AD1`'s four relations        `§BA1`'s four relations
       ---------------------------    ---------------------------
       sum(LEGACY.values)             sum(LEGACY.values)
       sum(CREATED.values)            sum(CREATED.values)
       sum(CREATED.fills)             sum(CREATED.fills)
       supported = eliminated x 0.75  sum(LEGACY.inside)        <- differs

     They share three and disagree on the fourth. `§AD1`'s set is what the code
     asserted. `§BA1` counts `sum(LEGACY.inside)` among "twelve passes" — an
     invariant the same audit records at `§AD3`, as a red finding, as untested.
     Both cannot be right. `§AD3` matches the code, which is why `R65` exists.

     **The code wins**, and the honest count is five relations, four of them
     decompositions. `V19`'s twelve is now wrong in the direction of
     understating the guard.

  3. **`R177` / `§BA3`: "it appears nowhere — not in the file, not on the tab,
     not in `transitionTotal`'s source note."** Two of three hold. Genuinely
     absent from `workforce.ts` and from `transitionTotal`'s source note. **Not
     absent from the tab**: `workforce.astro` has said "controlled 75%
     worker-protection floor" and "the 75% floor" since before this section.
     What the tab lacked was the rate's *basis* — nothing said what
     "controlled" meant, so a reader could not tell an obligation from a
     modelling choice. **The code wins.**

  4. **`R66` and `R178` are the same defect filed twice.** `R66` cites `AD5`.
     `R178` cites `BA4` and `AD5`, and `BA4` is the pass that confirmed `AD5`.
     Same three numbers, same fix. Third instance of the pattern Standing Order
     0 already counts twice. Landed once.

  5. **`R179`'s test as written would be a tautology.** "`CREATED.units` equals
     unit count x mix-weighted FTE, both read from the unit model" — if
     `CREATED.units` becomes that product, the assertion compares a value with
     its own derivation. Same for `R177`'s "`supported` equals the declared
     support rate x eliminated". **Both left AUTHORED**, with the derivation
     compared against them. Nine authored inputs against one authored figure
     can disagree; a value against its own derivation cannot. This is the
     defect class `§S6a`, `§S7` and `§S8` each shipped an instance of.

  6. **`R168` understates itself twice.** It names `SR-ARCH`, `SR-ADP` and
     `SR-ACC` at 15 each; **`SR-IF` also carries 15** and it does not say so.
     And **public health has no requirement family at all** — there is no
     `SR-PH`. It is priced inside `emsPhExpansion`, has no cost line of its
     own, and is governed by nothing. Both figures the row does give are exact:
     ten requirements across the four thinnest families, $457B/yr.

  7. **`R29`'s May 2025 counts are unverified and were not written.** The row
     states 43-9041 = 214,260, 43-3021 = 404,060, 29-2072 = 194,720. The
     repository holds the **May 2024** release — 229,070 / 417,500 / 194,570 —
     and nothing in it can verify the 2025 figures. Standing Order 0 puts
     counts first among the things this document has been wrong about. The row
     is satisfiable without them: what it asks is that the blocker note stop
     sending people after data the repo already has.

  8. **`R62` is covered by `R60` except in the case Part 1 specifies.** `R60`
     (`§S6b`) refuses an override keyed to a parameter that does not exist, at
     module load. Part 1 `§1.2` says to keep `unitsCost` resolving to a shim —
     which satisfies `R60` while the three scenarios go on multiplying a number
     that no longer drives per-type cost. That half is now guarded.

  9. **`AD6` / `R67` put the field one level too low.** Both ask for the scope
     exclusion on `CREATED`. It is a property of the floor, not of any
     operating function — no single `CREATED` row excludes behavioral health,
     the total does. On the items it would mean the same sentence seven times
     or six blanks. Landed at module level.

  10. **The methodology note's `15,000 x 9.225 = 138,375` uses the ROUNDED
      average.** The exact allocation gives 9.22540 and 138,381 — six FTE
      apart, both rounding to the published 138,000. The check compares the
      note's average against the model at the note's own precision and the
      note's product against its own base times its own average, rather than
      reporting a rounding as a disagreement.

  11. **`R188` verifies in full, and its evidence rested on a hardcoded copy.**
      `UNIT_TYPES` mode spread is 3.4 / 0.45 = 7.56x (the row says ~7.6x) and
      `renderVerdict()` does print the gap. But the "$15–36B" it prints it
      against is `unitsCost.low`/`.high` retyped into the client. Move a bound
      and the page advertises a disagreement that is not the one that exists.

NEW FINDINGS: five, all landed rather than filed.

  - 🔴 **`workforce.ts` reached no build gate at all.** It was in no
    `SELF_TEST_SOURCES` entry, so a broken workforce ledger failed `pnpm test`
    and passed `pnpm build` — and `deploy.yml` runs the build. Registered.

  - 🔴 **The per-type unit FTE existed in the codebase only as PROSE.** Inside
    the `staff` strings of `UNIT_TYPES`: `'~10 (physician or senior NP/PA lead,
    nurses, techs)'`. The allocation existed only in the methodology note, and
    `units-client.ts` computes it at runtime from `counties.json`, so it is not
    available at build time at all. The headline unit-workforce number was the
    hand-typed result of a calculation none of whose inputs anything could
    check. `unitModelDrift()` reads the prose, deliberately, because that is
    where the numbers live and `§S9b` is going to edit those strings.

  - 🟡 **The chapter published 138,000 twice, for two different reasons.**
    `CREATED.units` plan is 138. The immigration tile says "138,000 of the gap
    is unit-clinical and rural-clinical", which is units entrants 108 plus
    rural entrants 30. Equal today; not equal after `§S9b`. Both checked
    against their own derivations.

  - 🟡 **The no-script fallbacks were unchecked.** 22 elements the client
    overwrites on init carried static values nothing compared to the model.
    A stale fallback is invisible to anyone testing in a browser, because the
    client repaints it, and it is what a crawler indexes.

  - 🟡 **One CREATED figure is written in words.** "Eleven thousand positions"
    — the only value small enough for the page to spell out, and the one a
    digit-only scan cannot see. Checked against `education.values`.

CONTRADICTIONS: `§AZ3` versus golden rule 2 is still open and still nobody's
  row (carried from `## P10`). `R177`'s catalog identifiers are kept in the
  module comment rather than in the rendered basis string for exactly that
  reason: `WORKER_SUPPORT_RATE_BASIS` is reader-facing prose and the site's
  rule keeps catalog codes out of it. The tie to `KPP-W1` is checked instead —
  `supportRateDrift()` reads the threshold out of the framework transcription.

COUNTS: self-tests **172 → 202**. `README.md` bumped in every commit that moved
  it. Full suite 400 passing, 57 files. `astro check` 0 errors, 0 warnings,
  **1 hint** — the same `equations.ts:1252` unreachable `return NaN`; the
  refactor in `R64` briefly took it to 4 by leaving three imports unused, and
  they were removed. File manifest unchanged at 122 — no file was added under
  `src/`, `tools/` or `research/`.

BREAK-AND-RESTORE: **40 breaks, all asserted by check NAME**, re-run in full
  against the final tree at section end, because a break payload goes stale
  the moment a later commit edits its anchor. Three did: the README count in
  the entry-gate break, and the registry figure the "delete a relation" break
  expects, both of which this section moved seven times. `prove_p11.py` in
  `baseline-P11/`. The ones worth naming:

  - restaffing Type B from `~10` to `~12` in `units-client.ts` — `§S9b`'s edit
    in miniature, and the break the whole of `R179` exists for. Before this
    section the same edit changed nothing.
  - swapping the OEWS total into `TOTAL_US_EMPLOYMENT_2024` — `R69`'s trap.
  - rebasing `unitsCost`'s label while leaving the ID resolving — Part 1 `§1.2`
    exactly, which `R60` alone passes.
  - deleting a render call while leaving its import, three times, on three
    different strings. That is the `§S7` review's defect, which `§S8` wrote
    again.
  - deleting a relation from the invariant table: caught at the registry count.
  - a declared `fills` exception that is no longer an exception.
  - each of the five relations broken on a DIFFERENT scenario, so the split is
    shown to have actually separated them rather than merely renamed one
    boolean.

TRAPS THAT FIRED THIS SESSION: eight, six of them already on a previous
  session's list.

  - 🛑 **`sed -i` stripped `README.md` from CRLF to LF** on the whole file
    while `git diff` showed a one-line change. Reverted with
    `git checkout --` and redone with the Edit tool. Already in memory as
    `nha-repo-crlf-trap`; fired anyway, in the first hour.
  - 🛑 **A `*/` closed a comment block early**, in a `workforce.ts` comment,
    leaving six lines of prose as syntax. `§S8` hit this twice. Caught by
    reading the file back, not by the compiler, because the stray text
    happened to parse.
  - 🛑 **A duplicate `FRAMEWORK_EXTRACT` constant**, and a second name
    (`SUPPORT_RATE_FRAMEWORK`) for the same path declared earlier in the same
    section. `§S8`'s review found this shape three times. Grep before
    declaring; I did not, twice.
  - ⚠️ **The bare-integer-literal type trap was avoided, not found.**
    `TOTAL_US_EMPLOYMENT_2024` and `OEWS_TOTAL_EMPLOYMENT_2024` are both
    annotated `: number` because `169956100 !== 155495730` between two literal
    types is a comparison `astro check` rejects as impossible, and the guard
    would have been dead at compile time. `§S8` shipped that defect.
  - ⚠️ **A refactor left three unused imports** and took `astro check` from
    1 hint to 4. Hints do not fail the build, so the only thing that catches
    this is reading the count against the handoff's pinned figure.
  - ⚠️ **My own check flagged my own resolution note.** `R29`'s check looks for
    blocker phrasing; the sentence explaining that the data *had* been
    retrieved used the words "could not retrieve". Reworded rather than
    teaching the check to skip lines marked RESOLVED — that exemption would
    silence it on any line someone chose to label.
  - ⚠️ **Guessing prose vocabulary from data produced two false failures.**
    `R67`'s check derived the words to look for from each domain's name; the
    page writes "EMS" for the full name and splits "dental, vision, and
    hearing" on its Oxford comma into "and hearing". Declared as `pageWords`
    instead. A check that has to guess what prose looks like is a check that
    gets loosened until it passes.
  - ⚠️ **Re-running a dump label overwrote the before-state.** Taking `preP11`
    a second time to pick up a renamed constant destroyed the evidence it was
    taken for. Regenerated from a detached worktree at `a4d1f97` — which is how
    the "one boolean" figure above is a measurement rather than a recollection.
    The worktree needed its `tsconfig.json` removed and only the `@lib` alias
    repointed, because it has no `node_modules`.

FOR §S9b, WHICH DEPENDS ON THIS SECTION: four tripwires are now aimed at it,
  and all four are meant to fire.

  - `unitModelDrift()` — the four per-type FTEs against `UNIT_TYPES`' staffing
    prose, the controlled target against the unit page's floor, and the
    allocation and its product against the methodology note. **If `§S9b` gives
    `UNIT_TYPES` a typed `fte` field, retarget the check at the field and
    delete the parser.** The comment says so.
  - the sixteenth invariant — `CREATED.units` against `15,000 x mix-weighted
    FTE`. Reworking the mix breaks it, which is correct, and the note prints
    both sides.
  - `workforceProseDrift()` — 22 no-script fallbacks and 14 stated claims.
    Landing Type E moves all of them; the build names the sentences.
  - `unitsCostStressorDrift()` — `SCN-UNIT-UNDER`, `SCN-AI-FAIL` and
    `SCN-RURAL-STRESS`. Fires when `unitsCost` stops being one blended network
    parameter, including when the ID is kept resolving.

  **`R64`'s recompute is still open and is `§S9b`/Part 2's**: unit teams 138k →
  ~197k, `created` 510k → ~570k, entrants 150k → ~210k, pace 12,500 → ~17,500,
  training ratio **4.4x → ~3.1x**. That ratio is the chapter's central
  feasibility argument. It must be restated, not inherited, and self-test 2
  pins `entrants === 150` and `annualEntrants === 12500` and will fail —
  correctly. Update the expected values deliberately; do not "fix" the test.


THE CODE REVIEW: run after the entry above was written, against the same
  fixed point `a4d1f97`, on two axes in parallel. **Both found real defects in
  this section's own work, and one of them is a Done-when clause the entry
  above claimed complete.** Fixed in `e660d10`.

  Standards axis, six findings:

  1. 🛑 **Golden rule 2, broken twice, by me.** "Never write 'the framework
     says/calls for...'. State things directly as 'the plan' / 'the system.'"
     I read the rule as being about catalog codes and wrote "the framework
     specifies least" on the chapter and "the framework requires" into the
     rendered support-rate basis -- the latter in a commit whose comment cites
     golden rule 2 as its reason for keeping identifiers out of that string.
     Both rewritten. **Two PRE-EXISTING violations remain on the same page**,
     at lines 369 and 684; not mine, not touched, and they belong to the
     site-wide golden-rule-2 row this log already carries as nobody's.

  2. 🛑 **"fifteen each" was typed prose, on the page `R64` landed on.** The
     guard asserted only that the thickest family was at or above the
     threshold, so the sentence could go stale at sixteen with nothing
     failing. **That is the exact defect class this section exists to close,
     shipped in the commit that closed it.** Derived now. Verified by
     injecting a sixteenth SR-ARCH requirement and rebuilding: the page reads
     "16 rules each", and "15" again when it is removed.

  3. **Duplicate path constants, four more of them**, after I recorded the
     trap mid-section and fixed one instance. Collapsed to one name each.

  4. **Twelve raw filesystem reads inside self-tests**, four of them re-reading
     the same 20 KB note per pass, against a documented memoisation
     convention. Routed through a cached reader. Stated accurately: 39 raw
     reads predate this change, so the convention is honoured in the newer
     checks rather than enforced.

  5. **A coverage figure that could return {0, 0}.** The self-audit commit
     replaced a typed count with module-level counters set as a side effect of
     the check. Reading them first gave zeros: wrong rather than absent, which
     is worse than the typed count it replaced. **The fix for a bad number
     introduced a worse one.**

  6. A duplicated `/* 4.` ordinal, and a ternary whose empty branch rendered
     "spending, .".

  Spec axis, three findings and four verifications:

  7. 🛑 **The fourth "Done when" clause was neither met nor disputed** -- "the
     direct-care headcounts have one source (coordinate with `§S9d`)". Seven
     figures authored twice, in `LTC_WORKFORCE` and `ltc.ts`'s
     `WORKFORCE_ASSESS`, with nothing holding them together. **`STATUS:
     complete` above was wrong when written.** Now asserted equal, both sides
     left authored, so `§S9d` can collapse them knowing it is safe.

  8. 🛑 **`research/05` stated SOC 29-2072 two ways after my own edit**:
     194,800 against 194,570. Different BLS products (OOH against OEWS), not a
     correction of one by the other, and the file now says so. **R29's own
     defect, committed while closing R29.**

  9. **A comment claiming twelve registered rows while registering 23**, citing
     "V19 and the audit both count them as twelve" -- contradicting this
     section's own DISCREPANCY 2. The count is no longer restated there.

  Verified and upheld: `ltcWageFloorCost()` untouched; "three, not four"
  correct (`§BA5`'s "four" counts relations, not invariants); "none broke"
  correct; and the 75% Done-when satisfied by a named sourced constant without
  requiring `supported` to be derived.

  Not done, and now recorded rather than silently skipped: **`R168`'s first
  test, "every parameter above $50B/yr cites at least one governing
  requirement", is not implemented.** Seven parameters qualify -- `lowValuePool`
  88.5, `ltcExpansion` 230, `ltcWageFloor` 52, `bhExpansion` 70, `dvhExpansion`
  60, `rdPublic` 85, `wealthTaxPotential` 350. Implementing it means authoring
  a requirement citation per parameter in `params.ts`, which is `§S11b`/`§S10`
  territory and needs sourcing this section cannot do. The seven are named here
  so the next section has the list.

  Counts after the review: self-tests **203**, full suite **400** passing,
  `astro check` 0 errors / 0 warnings / 1 hint.

STILL OPEN, NOT THIS SECTION'S: `R135`'s seven `low`-confidence parameters with
  empty `url` (`§S11b`, eleventh session). `R245`'s 7 role-less `aria-label`led
  `<div>`s on `risk.astro` (`§S14`). The 14 non-finite equation cells. Golden
  rule 2 site-wide. `wealthTaxPotential`'s label. `§AC6`'s `unitsCost`
  migration hazard, now partly guarded by `R62` above. The three
  `medium`-confidence expansion parameters with empty `url` that `R168`
  identified as half of its own fix are `R135`'s.

## P12 — §S9b Unit network & absorption · 2026-08-25 · branch `nha-remediation`
STATUS: complete — three recommendations landed in one commit, plus a
  repo-hygiene commit the handoff asked for that is not a §S9b row.

ENTRY GATE: `## P11` (`§S9a`) `STATUS: complete` with `INVARIANTS AFTER`
  accounting for all 23 ✅ · `check_audit_docs.py` exit 0 ✅ · `astro build`
  passes ✅ · tree clean ✅ · `astro check` 0/0/1 hint, the pinned figure ✅

LANDED:
  - `c4e095e` repo hygiene — `.gitattributes`, and the two files whose prose
    about the CRLF trap contained the trap
  - `1c79188` `R185` `R186` `R187` `R188` — the unit model becomes graded data

  **Four rows in one commit, deliberately.** The six assumptions cannot be
  graded where they lived (bare literals inside a client-side function), the
  reconciliation cannot be stated until the allocation is computable outside a
  browser, and the absorption control's independence is only worth declaring
  once both are true. Splitting it would produce states that do not build.

SIX ASSUMPTIONS: all six, individually, and none was given an invented source.

  absorption 1.5 (1.2-1.8)  -> graded `low`, owner: a substitution study.
                               Nothing in the repository measures it, and it
                               multiplies every other input.
  throughputs 15k/30k/12k/40k -> graded `low`, owner: the visits-per-site and
                               visits-per-clinical-FTE pull research/02
                               proposed and never ran. **Comparator sourced**:
                               HRSA UDS national rollup, about 121.8M in-person
                               clinic visits across 16,200+ service delivery
                               sites, roughly 7,500 per site per year. Every
                               framework throughput is above it, Type A about
                               double and Type B about four times. Stated
                               beside them with the URL. Grade stays `low`
                               because a comparator is not the plan's figure.
  urban split 28/57/15      -> graded `low`, owner: the same substitution study
  rural split 30/70         -> graded `low`, owner: the same study, run
                               separately for rural counties
  Type D threshold 200,000  -> graded `low`, owner: a siting study. The page
                               already says it is a capacity plan and not one.
  rural floor 0.50 / 20,000 -> graded `low`, owner: the access standard that
                               sets it. A policy choice to ratify, not a figure
                               to source. **And measured inert, see DISCREPANCY 3.**

  ~1.1bn ambulatory encounters -> **removed, because nothing read it.** See
                               DISCREPANCY 2.

ABSORPTION SLIDER: **independent, and now declared.** `visitsPerCapita` is
  module state in `units-client.ts` that reaches `allocateCounty` and nothing
  else; `unitsCost` is a `PARAM_DEFS` entry the Monte Carlo samples. `§BD5`
  suspected this and `§BE` did not confirm it. `R187` allows wiring them or
  declaring the independence and declaring it is right: the count is a capacity
  plan, the parameter is a sampled cost input with its own range.

  Stated on `units.astro` and asserted two ways, because a declaration of
  independence is only honest if the control does something: the control moves
  the network 19,436 -> 28,889 units and $31B -> $46B/yr across its range, and
  `unitsCost` is byte-identical either side of the move.

UNITSCOST vs UNIT_TYPES: **they agree, and the gap the page advertised was a
  count difference.** This is the section's main result and it contradicts the
  premise Part 1 was scoped on.

    need-based, 24,099 units   $38.5B/yr operating   [$28.8 - 52.5B]
    same mix, 15,000 units     $24.0B/yr operating + $28.5B capital
      capital over 10 years    $26.81B/yr
      capital over 20 years    $25.38B/yr
      capital over 30 years    $24.90B/yr
    unitsCost                  $25B/yr, range $15 - 36B

  Inside the parameter's range at every amortisation from ten to thirty years,
  within 1.5% of its mode at twenty. `unitsCost` is labelled "15,000 units,
  operating + amortized capital"; the page's bottom-up total prices the
  need-based count. The tile says so in those words now.

INVARIANTS BEFORE: 23 of 23. AFTER: 23 of 23, unchanged — `workforceSelfTests()`
  is untouched. The registry moved 203 -> 207: five added, one deleted.

RE-DERIVED: **none. No published figure moved anywhere in the application.**
  `postP11` against `postP12`, six artifacts:

  - headline `SCN-BASE` p50 identical to nine significant figures:
    `matureToday` 5305.3529, `steadyTotal` 9210.9550, `newRevenue` 3409.3518,
    `perCapita` 25648.5182, `gdpPct` 23.6965, `fedIncrease` 4648.4699.
  - 727 published targets: 0 added, 0 removed, 0 moved.
  - 1,170 interim target cells: 0 changed.
  - 1,037 criticality positions: 0 moved, 0 RPN changes.
  - the workforce ledger and the care dump are byte-identical apart from the
    label and the timestamp. The tax dump differs on the self-test count only.

  ⚠️ `postP11` records `selftests 202`, not the 203 the `## P11` entry states.
  The label was taken before that section's own code-review commit `e660d10`.
  So this diff spans four commits rather than two; every model output is
  identical across all of them, so the conclusion holds either way. **Take the
  after-label last** is the lesson, and it is the mirror of P11's "take a label
  once".

REGRESSIONS: none. Full suite 400 -> 418 passing, 57 files -> 58.

DISCREPANCY: five.

  1. 🛑 **`R188`'s premise is wrong, and so is `§BE7`'s reading of it.** Both
     describe the unit page as printing a top-down / bottom-up cost
     disagreement, and Part 1 was scoped around reconciling one. **There is no
     disagreement.** The measurement is under `UNITSCOST vs UNIT_TYPES` above.
     The two price different networks, and at the same count they agree to
     within a couple of percent at any plausible capital amortisation. The
     page was inviting a reader to compare 24,099 units' operating cost against
     a parameter scoped to 15,000. **The code wins**, and the finding is
     better than the row: nothing has to be rebuilt, and the sentence that
     advertised the gap was the defect.

     ⚠️ **The amortisation window is itself undeclared.** `unitsCost`'s label
     says "amortized capital" and nothing anywhere states over how long.
     `CAPITAL_AMORTISATION_YEARS` carries both ends for that reason: an
     agreement that held at one horizon and not the others would be a
     coincidence. It holds across all of them.

  2. 🛑 **"~1.1 billion annual ambulatory encounters" is consumed by nothing.**
     The method note said the model "converts the network's expected share" of
     it into units. It does not. Demand is population times absorption. The
     figure appeared **exactly once in the entire repository** — in the
     sentence claiming the model used it — and at the default the network
     places 510M visits, so the "share" would be 46% and no code computes that
     either. `R186` asks for it to be sourced; sourcing a number nothing reads
     would have been worse than removing it. **The code wins.** Replaced by a
     cited national comparator with its year and its caveat: the survey counts
     office-based physician visits, emergency and hospital outpatient are on
     top, and the survey that counted those ended in 2022, so no single current
     federal total for "ambulatory encounters" exists to cite.

  3. 🛑 **The rural-share half of the access floor decides nothing, and
     `§AI2`/`§BE6`'s rounding hazard cannot occur.** Both filed the county
     file's two-decimal rural share against a boundary at exactly 0.50 as live:
     a county at 0.495 rounds up and trips the floor. Measured over all 3,144
     counties at every setting of the control: the floor fires on 491 counties
     at the default, **all 491 also satisfy the population test**, and with the
     population test removed entirely the share test adds **zero**. Twenty-five
     counties sit exactly on the boundary and none of their allocations changes
     at 0.51. A majority-rural county with enough people to miss the population
     test already earns a Type C from demand. **The code wins.** The test is
     kept — it states the policy and another county file could make it bite —
     and recorded as inert so nobody treats it as a live guard.

  4. **The last-resort floor's rural branch is unreachable.** `if (a+b+c+d ===
     0) { if (r >= floorShare) c = 1; else b = 1; }` fires 1 to 7 times across
     the control and **always takes the `b = 1` branch**, because any county
     with rural population has already been given a Type C above. Same shape as
     `§BU4`/`R275`'s unreachable "unassessable" branch in `fmea.ts`. Kept and
     documented rather than deleted: it is a real guard for a county file this
     one is not.

  5. **`R186`'s count is wrong three times over.** The row says six, `§BE6`
     corrected it to twelve, and the honest total is **sixteen**: four
     throughputs, **five** visit splits (the row says three; the note lists
     28/57/15 urban and 30/70 rural), three population thresholds, the
     absorption default and its two control bounds, and the 1.1bn figure that
     is in the code nowhere. Six graded ROWS cover all of them, because five
     splits are two decisions and three bounds are one control.

NEW FINDINGS: four, all landed rather than filed.

  - 🔴 **The workforce chapter's unit-team headcount descended from a
    computation that only ran in a browser.** `UNIT_MODEL.allocation` carried
    7,470 / 9,055 / 6,397 / 1,177 as authored figures; they are the output of
    `allocate()`, which lived in `units-client.ts` and fetched
    `counties.json`, so nothing at build time could re-derive them. The
    chapter's 138,000 unit-team positions rest on them. `allocateUnits()` is a
    pure function now and the build re-runs it over every county. Both sides
    stay independent: `allocated` is still authored.

  - 🔴 **A visit split that stopped closing on 1 would have removed demand from
    the country silently.** The five splits were bare literals inside one
    arithmetic expression; editing 0.57 to 0.50 loses 7% of urban demand with
    every test green. Both splits are now asserted to close.

  - 🟡 **Golden rule 2, on the units page, unguarded.** The verdict tile read
    "Plan's minimum (SR-ACC-010)" — the plan's internal requirement identifier
    in rendered prose. `narrativeCatalogCodes` scans five surfaces and
    `units.astro` and `units-client.ts` are not among them, so nothing caught
    it. Removed. **The site-wide row is still nobody's.**

  - 🟡 **The absorption control's own bounds were markup, not data.**
    `min="1.2" max="1.8" step="0.05" value="1.5"` was typed into `units.astro`
    beside a module-level `1.5` in the client. They are one declaration now,
    and the page's statement of what the control spans is computed from it.

TRAPS THAT FIRED THIS SESSION: six, four of them already on a previous
  session's list.

  - 🛑 **A `with open(..., "w")` truncated a 624 KB audit document to zero
    bytes.** The stamping script encoded to UTF-8 *inside* the with-block, hit
    a lone-surrogate error from an emoji written as `🔴` in the
    source, and left the file empty. Recovered from the `.pre-P12.bak` taken
    one command earlier — which is the only reason this is a footnote rather
    than the end of the session. **Encode the payload BEFORE opening for
    write, and take the backup first.** The script now does both.
  - 🛑 **Non-ASCII in a Python `print` aborted the break-and-restore run
    mid-break.** Already in memory as `nha-scripting-traps`. It fired on the
    failure path, so it only appeared once a break actually failed, and it left
    the tree mid-edit. `.encode("ascii", "replace")` on anything printed from a
    build log.
  - 🛑 **A bash heredoc refused a Python patch script** with `unexpected EOF
    while looking for matching '`. Same family as the heredoc trap already
    recorded. Every subsequent patch was written to a file and run.
  - ⚠️ **Deleting the prose parser left `UNITS_PAGE_CLIENT` unused and took
    `astro check` from 1 hint to 2.** Exactly P11's trap, on exactly the same
    counter. Hints do not fail the build; reading the count against the pinned
    figure is the only thing that catches it.
  - ⚠️ **A shell-quoted `python -c` silently made zero replacements twice** and
    reported success both times, because the escaping consumed the backslashes.
    Once it wrote a literal newline into a string literal and produced a
    `SyntaxError` the next run swallowed. Use the Edit tool or a file.
  - ⚠️ **A break payload was stale on the first full run**, reported SKIP
    rather than passing: the anchor `  ruralFloorPop: 20000,` had no trailing
    comma in the file. That is the mechanism P11 added after shipping three
    stale payloads, working.

BREAK-AND-RESTORE: **15 breaks, all asserted by check NAME**, re-run in full
  against the final tree. `prove_p12.py` in `baseline-P12/`. The ones worth
  naming:

  - a visit split set to 0.50, which no test before this section could see.
  - an assumption row renamed, so the coverage check meets a table that is
    present but wrong — the shape that reports "nothing ungraded" for a table
    that has vanished.
  - `unitsCost`'s bounds cut to 8/12/18, and separately a unit type repriced
    3x: the reconciliation fails from either side.
  - the controlled target moved to 24,000, which makes the two price the same
    network and is therefore the break that proves the check is about the
    count difference rather than about the numbers.
  - the absorption control flattened to a single value, which is the only way
    `R187`'s declaration could become dishonest.
  - `R62`, `R179`, the README count and the file manifest all still fire.

  **A sixteenth was written, ran, and is deliberately not in the set**: moving
  `ruralFloorShare` from 0.50 to 0.51 breaks nothing. That is DISCREPANCY 3,
  not a hole in the guard.

COUNTS: self-tests **203 → 207** (five added, `unitsCostRangeDrift`'s row
  deleted). `README.md` bumped in the same commit. Full suite **418** passing,
  **58** files. `astro check` 0 errors, 0 warnings, **1 hint** — the same
  `equations.ts:1252` unreachable `return NaN`. File manifest **122 → 123**:
  `src/lib/units.ts`. `tests/lib/units.test.ts` is not in the manifest, which
  covers `src/`, `tools/` and `research/` only.

VERIFIED IN THE BROWSER: 3,144 county dots, 51 region paths, five verdict
  tiles, the control driving 19,436 / 24,099 / 28,889 units at 1.20 / 1.50 /
  1.80 while the 15,000-unit tile holds at $24B/yr throughout — which is the
  independence, visible. No console errors, no failed requests.

REPO HYGIENE (`c4e095e`), not a §S9b row: the handoff's item 5.

  `core.autocrlf = true`, set at SYSTEM level — not in `.git/config`, not in
  the user's global config, so it does not travel with a clone and CI does not
  have it. `git ls-files --eol` before: 177 `i/lf w/crlf`, 67 `i/lf w/lf`,
  **4 `i/lf w/mixed`**, 6 `-text`, 2 `none`. The index was already LF
  throughout, so `* text=auto eol=lf` changes no blob — `git add --renormalize
  .` touched nothing beyond the two files below, which is the evidence the
  declaration matches what was committed. Working tree renormalised: **251
  files `i/lf w/lf`**, no mixed, no text file classified binary.

  **Two ASCII text files git had classified as binary**, and the reason is the
  finding: `research/task_zero_findings.md` and `tools/extract_docx.mjs` both
  carry the sentence *"Python's text-mode write translates \r\n to \r\r\n on
  Windows"* and both wrote the escape sequences as **real CR and LF bytes**.
  The document explaining the `\r\r\n` bug contained a `\r\r\n`. One lone CR
  each, so git read them as binary: no diff, no merge, no normalisation.
  `git diff` on either said "Binary files differ". Repaired byte-exact with a
  single asserted match per file.

CONTRADICTIONS: `§AZ3` versus golden rule 2 is still open and still nobody's
  row, and this section adds a fourth instance to the pile — the units page had
  a catalog code in a rendered tile label and is outside the five surfaces
  `narrativeCatalogCodes` scans. **The scan's surface list is the problem, not
  any one page.**
THE CODE REVIEW: run after the entry above was written and after fifteen
  breaks were proven, against the same fixed point `38d3e3c`, on two axes in
  parallel. **Sixteen findings. Both axes re-ran the allocation over the county
  file independently and confirmed every figure above; what they found wrong
  was the reporting around it, and one live defect.** Fixed in `25db18f`.

  🛑 **Three claims in the entry above were wrong when written**, and are
  corrected here rather than edited out:

  1. **"Replaced by a cited national comparator"** -- the comparator held a
     `source` and a `url` and the page rendered neither. A reader saw a count,
     a label and a year, with nothing to check them against. It is a graded row
     now, rendered in the table with its link, and the survey name is a link in
     the lead paragraph.
  2. **"Stated on `units.astro`"**, of the absorption control's independence
     from `unitsCost`. It was not stated anywhere on the page. It is now, in
     the paragraph under the grade table, and it says why the two are
     deliberately apart rather than only that they are.
  3. **"the figure appeared exactly once in the entire repository"**, of
     `~1.1 billion`. It appears twice: `docs/index.html` carries it in the
     retired tree. Nothing reads it there either, so the substance of
     DISCREPANCY 2 holds and the wording did not. The same sentence is in
     `1c79188`'s commit body.

  Standards axis, seven findings:

  1. 🛑 **A check that cannot fail, in the section that exists to close them.**
     `tests/lib/units.test.ts` asserted `t.fte === UNIT_TYPES[t.key].fte` while
     `workforce.ts` assigned `fte: UNIT_TYPES.a.fte`. **The same commit added
     the comment stating the rule it broke.** Fourth consecutive section to
     ship one of these, and the second in a row where the review rather than
     the section caught it.

     🆕 **Replacing it found something worse.** `UNIT_MODEL.allocation` was an
     array literal, so it read `UNIT_TYPES` **once at module load** -- still a
     copy, just taken at import rather than typed by hand. The replacement
     test moves `UNIT_TYPES.c.fte` and watches the ledger, and it **failed**:
     nothing downstream moved. `allocation` is a getter now. This is the
     finding the tautology was hiding, and it is why the fix for a vacuous
     assertion has to be an assertion that can fail rather than a deletion.

  2. 🛑 **A dead guard.** A regex testing `confidence` against
     `low|medium|high` on a field typed as exactly those three. Same shape as
     `§BU4`/`R275`'s unreachable branch in `fmea.ts`, and the second one this
     section shipped -- DISCREPANCY 4 above is the other. Replaced with the
     claim the page and the note both make: no model input is graded above
     `low`.

  3. **A threshold standing in for an equality.** The reconciliation asserted
     only that the annualised window overlapped `unitsCost`'s range, leaving
     operating cost free to fall 40% or rise 34% while the note advertised
     agreement "within a couple of percent". `modeErrorPct` was computed,
     printed, and never gated. Gated at 10% against a measured 3.4%, with a
     test that reprices every type by a third to show the ranges can still
     overlap while the check correctly fails.

  4. **A note claiming what its check did not assert** ("none above low").
     5. **A title over-promising** ("...and not the modelled cost", from an
     `ok` that only checked the count moves). Both are the same shape as the
     typed-figure defect `e660d10` caught: **the string a reader sees is not
     held to the boolean beside it.**

  6. **A page importing the audit harness.** `units.astro` pulled
     `countyDemand` from `manifest-check.ts`. It is a loader, not a check;
     `src/lib/counties.ts` owns it now and `manifest-check.ts` re-exports it,
     so there is still one reader and one cache.

  7. **Duplicated declarations**: `pct` in two files, `UnitCounts` and
     `Totals` in two files.

  Spec axis, nine findings. Three are the corrections above. The rest:

  8. 🛑 **Done-when clause 2 was violated by the commit that claimed it.**
     "the relationship between the existing `UNIT_TYPES` model and `unitsCost`
     is stated in **one place**". `unitsCostComparison()` computed the scaling
     in `units.ts`; `renderVerdict()` recomputed it inline and never imported
     the function, and the self-test only exercised the `units.ts` path. **The
     number a reader saw was not the number the build checked** -- the exact
     defect class this section exists to remove, in the tile that exists to
     close it. Rendered values are unchanged, which is what makes it the
     dangerous kind.

  9. **`GAP-BH-013` was never touched**, while `R186` carried a DONE stamp.
     The row says in as many words: "Add the throughput vector to
     `GAP-BH-013`". Now done, with the note that one UDS Table 5 pull closes
     the skill mixes and the throughputs together.

  10. **The HRSA comparator had no vintage**, on a rollup page that changes
      yearly. It says 2025 now.

  11. **Two floors counted as one.** `totals.floored` summed the rural access
      floor and the last-resort floor, and the page rendered the total as if
      it were all the first: 493 was 491 + 2. Split, and both are stated.
      DISCREPANCY 3 and NEW FINDING 4 above both depend on the distinction,
      and the page was contradicting them.

  Verified and upheld: every number in the entry above and in `1c79188`'s
  body, re-derived independently by both axes -- 24,099 units, $38.484B,
  $23.95B at the target, $26.807B/$24.905B annualised, 19,436/28,889 at the
  ends of the control, 491 floored, and "the share test adds zero" exact.
  Memoisation, `units.ts` purity, the manifest, the README count, no em dash,
  and `unitAllocationDrift`'s two-sidedness all clean.

  **Not done, and now recorded rather than implied: `R188`'s first test.**
  "`unitsCost`'s distribution is derived from `UNIT_TYPES` x the allocated
  counts" means replacing the authored `15/25/36` in `params.ts` with a
  computed distribution. The parameter is one of `R135`'s empty-`url` entries
  and belongs to `§S11b` with the rest of its sourcing; deriving it here would
  also couple the Monte Carlo to a county file, which is a modelling decision
  no row authorises. `R188`'s stamp says so now. Its second test, "the tab and
  the model report the same network operating cost", is met.

  Counts after the review: self-tests **207**, unchanged -- five rows edited,
  none added or removed. Full suite **424** passing, **58** files. `astro
  check` 0 errors, 0 warnings, 1 hint. File manifest **123 -> 124**
  (`src/lib/counties.ts`). Break-and-restore **19**, four of them new and
  aimed at the review's own fixes.

  🆕 **Two traps to add to the P12 list above.**
  - **A shell-quoted replacement wrote a literal newline into a Python string
    literal, twice**, producing a `SyntaxError` on the next run. Third and
    fourth instance of A4 in one session.
  - **A break payload that introduces a duplicate object key fails the build
    for the wrong reason** and reports a PASS if the expected substring
    happens to appear in the compiler's error. Caught because the payload
    reported `exit=0` with a plugin error in the tail, which is not a shape
    the harness models. **Assert the check name, and read the exit code.**

STILL OPEN, NOT THIS SECTION'S: `R135`'s seven `low`-confidence parameters with
  empty `url` (`§S11b`, twelfth session) — and `unitsCost` is one of the nine
  `medium`/`low` empty-URL parameters, still empty, because this section
  graded what feeds it rather than sourcing the parameter itself. `R168`'s
  first test, the $50B/yr requirement citations, still not implemented and
  still `§S11b`/`§S10`'s. `AE1` / `R70` / `R307` — `PA` still resolves to
  *Physician assistant* in the region detail line; untouched, and `§S9c`'s.
  `R245`'s 7 role-less `aria-label`led `<div>`s on `risk.astro` (`§S14`). The
  14 non-finite equation cells. Golden rule 2 site-wide. `V19`'s twelve, which
  `## P11` already recorded as understating a guard that is five relations.

## P13 — §S9c Hospital regions & maps · 2026-08-25 · branch `nha-remediation`
STATUS: complete — all 15 recommendations landed across 5 commits

ENTRY GATE: `## P1` and `## P2` both `STATUS: complete` ✅ ·
  `RECONCILIATION_MAX_ERROR_PCT` cut from 10 to 1 made the build fail
  ("Self-tests failed: 1 of 207") and was restored ✅ ·
  `check_audit_docs.py` exit 0 ✅ · both trees clean ✅

LANDED:
  - `6acc083` — `R70` `R71` `R72` `R87` `R88` `R89` `R190` `R191` `R192`
    `R193` `R211` `R212` `R213`, the map and the page
  - `ca327b4` — `R90` `R92`, the county file
  - `c7876af` — `R87` `R88` `R89` `R211` `R212` `R213`, the published
    methodology and the check that keeps it honest
  - `dcf1a84` + `e8bb467` — `tests/lib/hospital-regions.test.ts`

### DISCREPANCY

Five, three of them load-bearing.

1. 🛑 **`AE1` is LIVE on the units page, not latent, and the audit's own
   downgrade is what hid it.** `§BI3` reasoned at Pass 41 that
   `decorateAcronyms` runs once at init against `R01`, whose states collide
   with no acronym key. That is correct about `units-client.ts` and wrong
   about the page, because it predates `src/scripts/acronyms-client.ts` —
   which runs the site-wide glossary under a **MutationObserver on `<main>`
   with `subtree: true`** and therefore re-decorates anything the tab
   renders, 200ms after it renders it.

   Reproduced against the dev server rather than argued. Selecting R11:

   ```
   <abbr class="acronym" title="Physician assistant"
         aria-label="PA: Physician assistant">PA</abbr>
   <abbr class="acronym" title="Department of Veterans Affairs"
         aria-label="VA: Department of Veterans Affairs">VA</abbr>
   ```

   It is also **worse than `AE1` describes**. `AE1` reports a `title`, which
   is a hover a mouse user might never trigger. The site-wide decorator adds
   an `aria-label`, so a screen reader *announces* Pennsylvania as a clinical
   job title inside a list of states. The finding's severity was downgraded
   on the strength of a mechanism that a later file had already made
   obsolete. **The code won.**

2. 🆕 **A second live vector on the same page that no pass of the audit
   reached.** `renderStateTable` renders **51 bare state codes** in column 0
   of the allocation table, inside `<main>`, so PA and VA were decorated
   there too — on every view with the `<details>` open, for every reader,
   not only when R11 is selected. `AE1` names the region detail line and the
   map tooltip and does not name this.

3. **`R72`/`AE3` says "six colours are used twice". It is five.** 8 distinct
   + 5 doubled = 13. `AE3`'s own table lists exactly five pairs (R01/R06,
   R04/R10, R03/R13, R05/R11, R02/R09) directly under the prose that says
   six.

4. **`R72`/`R191`'s stated harm is not occurring.** Computed over the
   model's own adjacency graph: of the five doubled colours, **zero pairs
   are adjacent**. No border on the deployed map dissolves today. The row
   reads as though it does. Same shape as `AE1` before this section — what
   is wrong is that nothing enforces the property, not that the property is
   violated. Recorded because the difference decides what the fix is: a
   guard, not a repair.

5. **`AH5`'s specific sensitivity guess is wrong.** It says "shifting
   population scale from 0.45 to 0.40 could plausibly flip the answer". It
   does not. Population scale can be weighted anywhere in **0% to 81%** and
   13 regions still wins. The fragile weights are the two **15%** terms,
   not the 45% one. The instinct behind `AH5` and `R87` was right and the
   worked example was backwards.

### AE1

Fixed on this page, and the fix is not the one `R70` describes, because
`R70`'s fix does not work.

Emptying this module's acronym map — which `R70` asks for, and which is
done — changes nothing on the deployed page, because the collision now
arrives from `src/lib/acronyms.ts` through a different client script. What
closes it is that the **three containers rendering bare state codes carry
`data-no-acronyms`**: the region detail line, the region tooltip, and the
state table's first column. `acronyms-client.ts` already honoured that
attribute in its skip list; `units-client.ts`'s own decorator honours it
now too, so the two agree about what counts as prose. The page declares
which of its text is state codes, and every decorator present and future
respects the declaration.

Verified live: R11 renders `DC, MD, PA, VA` inside a `data-no-acronyms`
span with **zero `<abbr>` elements**, and the state table with **zero**.

**`§S13`/`R307` is still outstanding and still owns the site-wide half** —
`PA` and `VA` remain in the shared glossary and any other page rendering a
bare state code is still exposed. A self-test pins the collision set at
exactly `{PA, VA}`, so a new colliding glossary entry fails the build, and
so does *removing* one without updating the pin — which is how `R307` will
show its work when it lands.

### COLOURS

13 regions now use **8 distinct colours** — the whole palette — and
adjacency is respected: **y**.

Adjacency is the model's own, not a second table. `tools/model_hospital_regions.py`
already held a 51-state `ADJACENCY` map (it is what enforces the contiguity
hard constraint) and now emits it, so the browser colours from the same
graph the partition was built on. A second adjacency table in TypeScript
would have been the drift this campaign keeps finding.

`assignRegionColors` is greedy, highest-degree-first, with two objectives in
strict order: never take a neighbour's colour, then among the legal ones
take the least-used. The second half matters — plain first-fit is correct
and produces a **four**-colour map, which is worse to look at than the
eight-colour one it replaced. The region graph has 13 nodes, 21 shared
borders and a maximum degree of 7 (R07).

The clash check alone would have been unfailable, so the graph is checked
for substance first: every region has a neighbour, the relation is
symmetric, every assigned state has an adjacency entry. That is class B2
and this campaign has now shipped it twice.

### ASSIGNED-ONCE

Test added; passes. `regionAssignmentFaults` checks all five ways the SVG
description's claim can be false — a state in two rosters, a state in none,
a roster naming a non-state, a GeoJSON feature resolving to no abbreviation
(`R190`'s "Washington, D.C." case), and a feature drawn twice — against the
shipped rosters **and** the shipped outlines.

The data is correct and always was: 51 assigned exactly once, 51 features
all resolving. `§AH1` established that by hand at Pass 14. Hand verification
is not a guard, which is the whole of what `R71` asks for.

The description now states what was drawn rather than what was intended,
and a **sighted** reader gets the same information in a note beside the map
— a screen-reader-only correction would leave the map looking complete to
everyone else.

### COUNTIES.JSON

**Yes, `src/` uses it, at build time and at run time both.** This was
"never established" for twelve sections and is settled: `src/lib/counties.ts`
reads `public/data/counties.json` from disk for the page and the self-tests,
and `src/scripts/units-client.ts` fetches the same file in the browser.
`tools/model_hospital_regions.py` is the third reader. `docs/data/` is the
retired tree and is not any of them.

`R90` is filed as an audit task, and auditing it once would have closed the
row and guarded nothing. It is a self-test: 3,144 records, 3,144 distinct
FIPS, every FIPS prefix agreeing with its state code, 51 states, populations
summing to 340,110,988, no rural share outside 0 to 1, no coordinate off the
globe, Connecticut present as its 9 planning regions exactly as `SOURCES.md`
describes. Clean.

No fourth copy of the state table was added to do it. The FIPS prefix and
the USPS code are both *in* the file, so the mapping is checked for
self-consistency and the state set is checked against the region model's
`state_names`.

`R92`: the file is an object now, with a `meta` block declaring population
vintage **2024**, rural vintage **2020**, geometry vintage 2024, the field
glossary, the Census source per field, the record count and the population
total. The array was wrapped **textually** — the 3,144 records copied byte
for byte — because `json.dump` would have rewritten `1.00` as `1.0` and
reformatted every record, burying the one change that matters in a
3,144-line diff. Regression proof: the model tool reproduces the shipped
`hospital-regions.json` byte for byte after the shape change.

### THE 13-REGION RESULT

`R87` has asked for a weight-sensitivity sweep since Pass 14 and nobody
could run one, because the published file carried only the weighted total.
The four components existed in the emitter the whole time. With them
emitted, they reconstruct every published total exactly, and the sweep runs
at build time:

| Component | Weight | 13 wins while the weight is | |
|---|---:|---|---|
| Population scale | 45% | 0% to 81% | robust |
| Geographic compactness | 25% | 0% to 92% | robust |
| Rural workload balance | 15% | 0% to 20% | flips to 12 at +5 |
| Administrative fragmentation | 15% | 11% to 100% | flips to 12 at −5 |

**`R211` is right and stronger than filed.** The fragmentation term is
exactly `0.04 × (n − 13)²` — zero for the candidate it scores best and a
penalty for every other one. 15% of the objective is a parabola centred on
the answer. Zero that weight and **10 regions** wins; drop it to 10% and
**12** wins. The U-curve with its minimum at 13 is what this procedure
produces whether or not 13 is optimal, which is exactly what `§BI1` said and
could not demonstrate.

`R212`'s margin was published in the methodology and withheld from the page:
the tile carries it now, derived. `R88` and `R213`'s figures all verify
against the audit — R13 at 0.59× target against R04 at 1.37×, spread 2.66×,
rural 6.0% to 37.5% for a 6.3× spread.

### CONTRADICTIONS

Two, both between a row's declared test and what the row's own text asks
for.

- **`R70` declares `no acronym key collides with a US state abbreviation in
  a geographic view`.** That test passes on this module today and the bug
  was live anyway, because the glossary that produced it is not in a
  geographic view — it is site-wide. The declared test is satisfiable
  without fixing the defect. Implemented as written *and* fixed properly;
  the discrepancy is recorded rather than routed around.
- **`R191` declares `no two adjacent regions share a fill colour` and
  offers "either add 13 distinct values or run a graph colouring".** The
  first branch does not satisfy the test — 13 distinct values from a
  palette of 8 is impossible, and 13 arbitrary distinct values would still
  have no adjacency logic. Only the second branch implements the declared
  test. Taken.

### NEW FINDINGS

Four.

1. **The state allocation table's first column** — 51 bare state codes,
   decorated by the site-wide glossary. Second live `AE1` vector, above.
2. **`hospital-regions.json` shipped a stale `docs/data/` path** in its
   `source` field. Three build gates fail on a `docs/` reference in source
   and prose; none of them reads a data file. Corrected in the emitter, so
   it is gone from the shipped data too.
3. **`research/hospital_regionalization_methodology.md` carried two more**,
   for the input and the output. Both corrected.
4. **`#hospital-region-scores` was laid out as `repeat(7, ...)` in CSS**
   because the model happens to score seven candidate counts. Scoring an
   eighth would have overflowed the row silently. Driven from the data now.

### INVARIANTS AFTER

- Self-tests **207 → 216**. `README.md` bumped in the same edits, three
  times, because the count moved three times.
- Full suite **424 → 455** passing, **58 → 59** files
  (`tests/lib/hospital-regions.test.ts`, 31 tests). `tests/` is not in the
  manifest.
- File manifest **124 → 126** (`src/lib/hospital-regions.ts`,
  `src/lib/region-data.ts`), rebuilt with `node tools/build_file_manifest.mjs`.
- `astro check`: 0 errors, 0 warnings, **1 hint** (`equations.ts:1252`).
  It went to 2 in `dcf1a84` and was corrected in `e8bb467` — see the traps.
- `V18` holds: thirteen region populations sum to **340,110,988**, and that
  figure is now *compared* against the county file's independent total
  rather than measured twice and never reconciled. The handoff called this
  free and it was.
- `tests/lib/kappa.test.ts`'s `KPP-C8` breach count did not fire: this
  section moved no model output.
- `tests/lib/workforce.test.ts`'s 23-row pin untouched.

### BREAK-AND-RESTORE

`baseline-P13/prove_p13.py`, **24 payloads, 24 pass, 0 skip, 0 fail.**

Hardened against trap D8: every payload asserts the check **name** *and*
that the failure output contains `self-tests failed`, so a payload that
breaks the build for the wrong reason — a compile error, a plugin error —
cannot score a pass by having the expected substring turn up in a
compiler message.

Four payloads reported SKIP on the first run, correctly: `"CT",\n "MA",`
matches twice in the model file, because the region rosters and the
`state_adjacency` block sit at the same indentation. Retargeted on the
region name. That is trap C6 behaving as designed rather than three stale
payloads shipping the way P11's did.

### TRAPS THAT FIRED THIS SESSION

- **A4 again, twice.** A shell heredoc carrying a Python payload ate the
  backslashes: once turning `\n` into a literal newline inside a TypeScript
  string literal, which esbuild rejected as `Unterminated string literal`,
  and once silently matching zero times so an assertion fired instead of a
  write. Fifth and sixth instance of A4 in the campaign. **Both were
  recovered because the scripts assert their match count before writing.**
  That pattern is now the thing that matters more than avoiding heredocs.
- **C5.** `astro check` went 1 → 2 hints on an unused `type` import in the
  test file, and the commit shipped before the count was read. Corrected in
  the next commit. Third session running.
- 🆕 **A check that cannot fail, written inside a measurement script.** The
  first premise script ended with a FIPS/state cross-check whose expression
  was `... and False`, so it reported "0 mismatches" over an empty set. It
  was caught by reading the script, not by running it, and the real check
  found 0 mismatches anyway. **Measurement scripts are code and get the same
  class-B audit as shipped checks.**
- 🆕 **`git stash push --staged -- <pathspec>` ignored the pathspecs** and
  stashed the entire index, which silently emptied a commit that was about
  to be made ("nothing to commit, working tree clean"). Nothing was lost —
  it was all in the stash — but the failure mode is a commit that appears to
  succeed while containing nothing. **Read `git status` after a partial
  stash, before committing.**

### THE CODE REVIEW

`/code-review 66834a8`, pinned to exactly this section, run after the entry
above was written and after the 24 break payloads were proven. **Standards
returned 2 hard findings and 6 judgement calls; Spec returned 10.** All were
believed addressed in `489e240`. **One was not, and a second review found
three further defects in the fixes themselves** — see `THE SECOND CODE REVIEW`
below.

**Four of them correct claims this entry made when it was written**, which is
why the amendment reads as it does. Read the amendment, not just the entry.

#### 🛑 The section rendered a false sentence, in the paragraph R88 exists to fix

`units.astro` printed *"New England is further from target than California and
Hawaii is."* New England sits **0.412** from the equal-population target and
California and Hawaii **0.562**. The claim is false. It is true against Texas
and Louisiana at 0.372, which is what `R88`'s own text says and what the
methodology file says three feet away.

The page picked `LARGEST[0]` — the largest region by population, and therefore
the one furthest from target in the other direction. **The entry above claims
"R88 and R213's figures all verify". The figures did; the sentence built out of
them did not.**

The fix is not a different index. `outsizedComparator` returns the largest
above-target region the smallest one still beats, and null when there is none,
in which case the page renders no claim at all rather than a false one.

**This is `D2` in a form the trap catalogue does not yet describe.** Every
number in that sentence was derived. The *comparison between them* was
authored, and it inherited the credibility of the derived figures around it.
🆕 **A derived figure is not the same as a derived claim.**

#### 🛑 The clash check, and where the review was half wrong

The review called `colorClashes(adjacency, assignRegionColors(...))`
unfailable, since the colourer never takes a neighbour's colour and throws
when it cannot.

**Measured, and it fires.** Breaking `assignRegionColors` to ignore its
neighbours fails the build — that payload has been in `prove_p13.py` since the
section landed. It is a live regression test on the colourer. What it cannot
do is notice anything about the **data**, because the colourer adapts to
whatever graph it is handed.

Dropping it from `ok`, which the review proposed, was tried and **reverted**:
the break-and-restore pass caught the regression within one run, because a
payload that used to fail the build stopped failing it. 🆕 **A guard that
fires on a real regression is not a guard to delete; it is a guard to put
something beside.** Three conditions were added alongside it, none satisfiable
by the colourer: the graph has substance, the palette has room to spare over
the busiest region (7 neighbours against 8 colours — one added border from the
throw), and thirteen regions still spread across all eight entries rather than
the four a first-fit colourer would use.

**The entry above lists this row's B1 risk as "mitigated, not removed" and
flagged it for the review. The review found it; the review's remedy was
wrong; the harness settled it.**

#### 🛑 A check that produced false failures

`regionMethodologyDrift` matched markdown rows with regexes hard-coding a
single space either side of each pipe. Reproduced before accepting: padding
one table cell, which every markdown formatter does, turned **all four** sweep
rows into "no published row". Also re-wrapping the margin sentence, and
closing the spaces in `0.04 * (n - 13)^2`.

That is class `D4`, and it was shipped in the commit whose message argues for
gating prose. It splits on the pipe and trims now, and flattens whitespace
before matching prose.

**The rewrite immediately failed the build for a reason the regexes had been
hiding.** Two tables in that file begin with the weight label — the objective
components table and the sweep — so matching on the label alone picks
whichever comes first. 🆕 **The old regexes disambiguated by accident, which
is not the same as disambiguating**, and replacing an accidental correctness
with an explicit one is what surfaced it.

#### 🛑 A gate that pinned the defect its own row asks to remove

`R211`'s declared test is `no objective term is anchored to the selected
candidate`. The self-test this section shipped failed when the anchor was
**absent** — so a future section that fixed the model would have been met with
a red build, by a check written to support that row.

It holds the documents and the model to the same story now: if the term is
anchored, the chapter must disclose it; if it stops being anchored, no page
may keep claiming one. It breaks in both directions and both are proven.

🆕 **A tripwire that pins a defect in place is not the same as a tripwire that
pins a disclosure.** `R70`'s pin is the second kind and was written knowingly;
this one was the first kind and was not.

#### Corrections to CONTRADICTIONS above, which was incomplete

The section disclosed both of these in the row stamps in
`CLAUDE_CODE_INSTRUCTIONS.md` and **left them out of the log's own
CONTRADICTIONS list**, which is the list a later session reads.

- **`R71` declares `render throws otherwise`. It does not throw.** Faults are
  counted and displayed, which is what `R190` asks for and is strictly more
  informative — a throw would blank a correct 50-state map over one bad row.
  Defensible, and it was disclosed in the wrong place.
- **`R211`'s two declared tests are not implemented**, and `STATUS: complete`
  sits above a section that delivered disclosure instead. Candidate maps are
  still merges and splits of the 13-seed, and the fragmentation term is still
  anchored. Both are modelling changes that would move the published result
  and no row authorises them. **Recorded here as unmet rather than left to be
  inferred from a stamp.**

#### A fifth DISCREPANCY the entry missed

**The P13 prompt asserts `src/lib/units.ts` and `src/lib/hospital-regions.ts`
"do not exist — both 404" and instructs "do not go looking for a
`hospital-regions` module".** `units.ts` exists — `§S9b` created it — and this
section imports and edits it. The prompt was written before P12 and its
"Where this code actually lives" block is stale. Standing Order 0, and it
should have been recorded when it was noticed rather than only acted on.

#### The rest

⚠️ **This heading read "The rest, all fixed" and one of them was not.** See
`THE SECOND CODE REVIEW` below: the `SOURCES.md` correction never reached the
working tree, and this entry asserted it had.

- **`R92` says every data file and this section did one.** `us-states.json`
  declares its geometry vintage, feature count and source now, and the county
  audit checks all three.
- 🛑 **The methodology moved the input path to `public/data/` and in the same
  sentence still sent readers to `docs/data/SOURCES.md`** — the retired tree,
  which now holds a differently shaped file. **NOT FIXED HERE.** The edit was
  made and then discarded by a `git checkout --` aimed at unrelated test
  damage in the same file, and the verifying grep had already run. Fixed in
  `dea30ca`.
- 🆕 **`units-client.ts` carried a second acronym glossary and a second
  decorator.** Sixteen of its seventeen keys duplicated `src/lib/acronyms.ts`,
  which runs on every page under a MutationObserver, so it re-did work that
  had already happened on the same nodes 200ms earlier. **It also sat outside
  `KNOWN_STATE_ACRONYM_COLLISIONS`**, so a future `'OR': 'Operating room'`
  added there would not have failed the build — the pin this section added did
  not cover the map this section kept. Deleted.

  The seventeenth key was `IV`, and moving it site-wide is **not available**:
  `tests/lib/acronyms.test.ts` excludes `IV` on purpose because it shadows a
  legislative Title IV, and **that test caught the attempt**. The Type C
  description reads "intravenous" now, which needs no hover and no second
  glossary. 🆕 **An existing test knew something this section did not; the
  right response to a red test is to read it, not to route around it.**
- **Two `WEIGHT_LABELS` maps**, and the drift check parsed the methodology by
  *its* copy while the page rendered the other, so a rename in one place would
  have compared against a stale string instead of reporting a drift. One map,
  exported from the pure module.
- `weightIntervals` ran twice per `regionSelection()`; `M`/`MILLION` merged; a
  51-key walk hoisted out of four call sites; trailing whitespace.

#### Verified and upheld

Every other number in the entry above and in `6acc083`'s body, re-derived by
both axes: `V18` at 340,110,988 from both files, the 3.2219% margin, 8 distinct
colours and 0 clashes over 21 shared borders, the four sweep intervals, the
`0.04 × (n − 13)²` coefficient, 216 self-tests, the 207 → 216 arithmetic, and
the `COUNTIES.JSON` report answer. **The region map's keyboard support is
untouched, as the prompt requires**: county dots `tabindex: -1`, region paths
`tabindex: "0"` with a live focus handler.

#### Counts after the review

Self-tests **216**, unchanged — rows reshaped, none added or removed. Full
suite **466** passing, **59** files, up from 455. File manifest **126**,
unchanged. `astro check` 0 errors, 0 warnings, **1 hint**.
Break-and-restore **29 payloads, 29 pass, 0 skip, 0 fail** — five new, and the
two `us-states.json` payloads reported SKIP on their first run because the
metadata is written with `json.dumps`' default spacing rather than compact
separators. Retargeted, not ignored.

#### 🧨 Traps to add to the P13 list above

- 🆕 **A derived figure is not a derived claim.** Every number in the false
  sentence was computed; the comparison drawn between them was authored, and
  read as derived because of its neighbours. **Extends `D2`.**
- 🆕 **Replacing an accidental correctness with an explicit one surfaces what
  the accident was hiding.** The regex rewrite failed instantly on a table
  ambiguity the regexes had been masking.
- 🆕 **A tripwire can pin a defect instead of a disclosure.** Check which one
  you have written by asking what happens on the day the row is finally
  satisfied.
- 🆕 **A guard that fires is not a guard to delete.** The review's proposed
  remedy for the clash check would have removed a payload's ability to fail.
  **When a review says a check cannot fail, break it and read the exit code
  before agreeing.**

### THE SECOND CODE REVIEW

`/code-review a61ce79`, pinned to the FIX RUN rather than to the section, on
the reasoning that the code written in response to a review is the code
nothing has reviewed. **Standards returned 4 hard findings, Spec returned 10.**
All are addressed, in `dea30ca`.

**It was worth running.** It found a fix that never landed, two more checks
that cannot fail, and the R211 gate still backwards inside the commit that
claimed to have straightened it.

#### 🛑 A fix that never landed, claimed in the commit AND in the amendment above

`docs/data/SOURCES.md` — the amendment above lists it under *"The rest, all
fixed"*. **It was not fixed.** `git diff a61ce79...HEAD -- research/` was
empty; the file still pointed readers at the retired tree.

What happened is worth recording exactly. The fix was made. A later test left
that same file dirty, and `git checkout -- research/hospital_regionalization_methodology.md`
was run to undo the test's damage — which discarded the uncommitted fix along
with it. **The grep used to verify the fix had run before the revert**, so the
verification was true when it was taken and false by the time it was reported.

🆕 **A destructive restore aimed at test damage also discards uncommitted real
work in the same file.** Verify AFTER the revert, or commit the real change
before running anything that will dirty the file. This is the second time this
campaign has had a git operation silently empty work that was then reported as
done; the first was `git stash push --staged` taking the whole index.

**The amendment above is corrected on this point, and this is the third
consecutive section whose log entry needed correcting after a review.** The
pattern is not carelessness about the code — it is that the write-up is done
last, from memory of what was intended, rather than from the diff.

#### 🛑 Two MORE clauses that cannot fail, on the row that keeps producing them

The first review called the clash check unfailable. The response kept it and
added three conditions *"none of which the colourer can satisfy on its own"*.
**Two of those three cannot fail either.**

- **`distinctColors === REGION_PALETTE.length`.** Taking the least-used LEGAL
  colour means a never-used colour is always available while one exists, so
  with more regions than palette entries all eight are always used, whatever
  the graph. Measured: eight with the real adjacency, **eight with an EMPTY
  adjacency map**. The comment defending it as *"genuinely losable"* described
  a first-fit colourer this repo does not have.
- **`spare > 0`.** The palette can never be exhausted while the colourer
  RETURNS: a region whose neighbours hold every colour is precisely the case
  that throws, and `runGuarded` already turns a throw into a named failure. It
  was a second copy of a gate that already existed. Measured across palette
  sizes 8 down to 3: spare stays at 1 or 2, then the colourer throws.

So this one row has now produced **three** unfailable clauses across two
attempts to fix it, each written by the pass that was removing the previous
one. `ok` is now the two things that move: `graphFaults`, which is about the
data, and `clashes`, which is a regression test on the colourer. The
comparative claim — that this strategy spreads wider than first-fit — is a
unit test that colours the same graph both ways.

🆕 **The break payload is what found `spare`.** Cutting the palette to five
left the build green. Three is the real boundary. **A payload written from
reasoning about where a gate fires is a hypothesis; running it is the
measurement.**

#### 🛑 The R211 gate was still backwards, in the fix for its being backwards

`fragmentationClaimRendered` greped the page SOURCE for the disclosure
sentence. That sentence lives inside `{ANCHOR && (...)}`, so it is present in
the file whatever the model does — `claimed` was a constant `true`, and
`ok: anchored === claimed` reduced to `ok: anchored`. **The original gate,
verbatim, still reddening the build on the day R211 is satisfied.**

What is checkable is whether the disclosure is still WIRED to the model, and
that is what it asserts now: the sentence must sit inside the guard. It fails
when someone moves it out — the page asserting something it cannot know — and
stays green when the model is fixed.

That needed a brace-depth scan rather than a search for `)}`, because the
block's own `{Math.round(... * 100)}` closes first and reported a correctly
guarded paragraph as unguarded. The build caught that within one run.

#### The rest

- **`markdownRows` was not total.** No fenced-block tracking — and this very
  methodology file has a fence, around the reproduce command — and no
  escaped-pipe handling, where one `\|` shifts every later cell so the region
  table's population is read out of the wrong column and reported as a drift
  that is not there. The audit's own recommendation table has six rows broken
  by exactly that, which is how the hazard is known.
- **`regionMethodologyDrift`'s `override?` was a test-only production
  parameter.** It is a defaulted DATA parameter now, which is how every other
  seam in that file is shaped: `statedChapterCountDrift(root, tabs = TABS)`,
  `routeDrift(routes = pageRoutes(), tabs = TABS)`. **The repo already had an
  idiom for this and the fix run invented a different one.**
- **`spare` was palette minus DEGREE**, which is not what its own comment said
  and not what the note rendered: the busiest region has 7 neighbours
  consuming 6 colours between them, so the note told a reader the map was
  "one border away from being uncolourable" when it was two.
- **Stale prose after the glossary deletion**: the file header still credited
  `docs/js/hospitalregions.js` with "acronym decoration", the section banner
  still read "Acronym decoration", and a `});` was left mis-indented.
- 🆕 **A NUL byte reached `src/lib/manifest-check.ts`** during the fix run and
  made git classify the file as binary. Caught by grep reporting *"Binary file
  ... matches"*, replaced with the escape sequence, and the whole of `src/`
  swept for control bytes afterwards. **Trap C2 arriving from a new
  direction** — not a lone CR in old data, but a control character written by
  an edit.

#### What the review checked and upheld

Every figure in the amendment above: 0.412 / 0.562 / 0.372, the 21 shared
borders and max degree 7, 8 distinct colours, `0.04 × (n − 13)²`, 216
self-tests, `astro check` at 0/0/1. The page renders *"than Texas and
Louisiana is"*. No regressions from the glossary deletion — no dangling
references, and `physical-acronym` is still used by the hand-authored `<abbr>`
elements on the page. The `meta` foreign member added to `us-states.json` is
legal GeoJSON (RFC 7946 §6.1) and breaks no consumer. `outsizedComparator`
returns R04, matching the row and the methodology, and `below[0]` is provably
the most extreme.

⚠️ One thing the review could **not** verify: the 29 break payloads, because
`prove_p13.py` lives in the audit-document repository and not in this one. A
reviewer working from this repo alone cannot check the campaign's central
evidence. **Recorded as a gap, not resolved** — moving the harness here would
put the audit's own scripts in the public tree, which is a decision this
section does not own.

#### Counts after the second review

Self-tests **216**, unchanged — clauses removed from two rows, no rows added
or removed. Full suite **475** passing, **59** files, up from 466. File
manifest **126**, unchanged. `astro check` 0 errors, 0 warnings, **1 hint**.
Break-and-restore **29 payloads, 29 pass, 0 skip, 0 fail** — three retargeted
and **two RETIRED rather than left passing**, because the clauses they aimed
at turned out to be unfailable and a payload against an unfailable clause
passes for the wrong reason.

#### 🧨 Traps to add

- 🆕 **A destructive restore aimed at test damage discards uncommitted real
  work in the same file.** Verify after the revert, not before.
- 🆕 **A break payload is a hypothesis until it runs.** Two of this section's
  payloads were written from reasoning about where a gate fires; running them
  found that the gate could not fire at all.
- 🆕 **A control character written by an edit makes git call a source file
  binary.** Same consequence as the lone-CR trap, different cause. `grep`
  saying "Binary file ... matches" is the tell.
- 🆕 **Check whether the repo already has an idiom before inventing a seam.**
  The test-only `override?` had three existing counterexamples in the same
  file.

### STILL OPEN, NOT THIS SECTION'S

`R307` / `§S13` — the site-wide half of `AE1`. `PA` and `VA` are still in
`src/lib/acronyms.ts` and still expand on all fourteen pages; the units page
is inoculated and no other page is. **The collision set is pinned, so
`§S13` has a failing test waiting for it.**

`R135`'s seven `low`-confidence parameters with empty `url` (`§S11b`,
thirteenth session). `unitsCost` still among them; `§S9b` graded what feeds
it, `§S9c` did not touch it. `R188`'s first test, still `§S11b`'s.
`unitsCost`'s undeclared amortisation window. `R168`'s $50B/yr requirement
citations. `R245`'s 7 role-less `aria-label`led `<div>`s on `risk.astro`
(`§S14`). The 14 non-finite equation cells. `narrativeCatalogCodes` covering
five of fourteen chapters.

🆕 **The `docs/data/` tree and `public/data/` are no longer byte-identical.**
`hospital-regions.json` and `counties.json` diverged here, deliberately:
`docs/` is retired, three build gates fail on references to it, and
regenerating it would re-bless a dead tree. `P2` recorded the two trees as
byte-identical and that is no longer true for two of the three data files.
Nothing gates on the identity.

🆕 **The 13-region count now has a published sensitivity result saying it is
not robust, and the framework still treats thirteen as settled** — thirteen
RHAs, thirteen operating regions, the governance layer, the map. That is a
substantive tension the dashboard now states honestly and does not resolve.
Resolving it means either seeding candidates independently at each count or
accepting thirteen as a policy choice in the text of the framework itself.
**Nobody's row.**

## P14 — §S9d Long-Term Care · 2026-08-26 · branch `nha-remediation`
STATUS: complete — all 8 recommendations landed across 2 commits, plus `R180`,
which belongs to no section and which `R285` could not be finished without,
and **two fix runs** (`0a5d9d1`, `5f99bdf`) after two two-axis code reviews.
⚠️ **Read `### THE CODE REVIEW` and `### THE SECOND CODE REVIEW` at the end of
this entry, in order, before believing anything above them.** The first found
that three of the four checks this section wrote were weaker than their own
notes claimed. The second was pinned at the first fix run — the code nothing
had reviewed — and found **nine more, four of them written by that fix run.**
⚠️ **A later commit (`2029a90`) fixed a pre-existing mobile overflow in
this chapter**, found while verifying this section and left out of its diff as
scope creep; see `### After the section closed` at the very end of this entry.
Its first rationale was wrong in two of three claims.

Written from `git diff fdd01a6..HEAD`, not from memory of what was intended.
Three consecutive sections have needed their log entry corrected by a review
for exactly that reason.

DISCREPANCY: **four, and two of them change what the row is.**

1. 🛑 **`R265`'s premise is true and its framing is misleading, and correcting
   it answers the prompt's Report question.** The prompt and `§BV1` both say
   the correction *"reached the methodology, the data file and the public page
   and stopped before the model"*, which reads as though the model was
   sampling from a range floored on a withdrawn value. **Measured: the
   "2.0-4.4%" lives inside the `source:` prose string. `ltcExpansion` samples
   `low: 150, mode: 230, high: 330` and always did.** The correction moved the
   sampled range by **zero**. It is a provenance defect on the framework's
   largest expansion — worth fixing, and not an arithmetic one. **The code
   won.**
2. 🛑 **`R283`'s open question resolves to the branch neither the row nor
   `§BW1` expected, and the entry gate's item 2 with it.** `workforce.ts`
   **does** hold all three headcounts, in `LTC_WORKFORCE`, plus openings, the
   median wage and the turnover rate. `§BW1` established that
   `workforce.astro` — the **page** — does not, and the row then framed the
   open question as *"either duplicated with no assertion, or the attribution
   is false"*. It was neither: `§S9b`'s code review had already found the
   duplication and added `directCareHeadcountDrift` to hold the copies level,
   with a comment saying `§S9d` could collapse them safely. **The code won,
   and the previous section's review had already answered the gate.**
3. ⚠️ **`R284` is half wrong in the repository's favour.** It says the two
   inputs behind `7.5M` *"carry no source and no separate grade"*.
   `research/long_term_care_methodology.md` grades the figure **`Confidence:
   low (the FTE count and part-time fraction are planning assumptions)`** and
   names both inputs. The grade existed and never reached the code or the
   reader. **The fix is to carry the grade, not to invent a source.**
4. ⚠️ **`R286` undercounts.** It says `$600B` appears five times and `$17.36`
   six. Measured: **six** and **eight**. The row was scoped before
   `workforce.astro` was counted, which `§BW1` later widened it to include.

LANDED:
- `R265` `R288` — `47144bc`
- `R283` `R284` `R285` `R282` `R286` `R287`, and `R180` — `b1f5301`

**Two commits, not eight, and both orderings are deliberate.** `R288` landed
**before** `R265` although the prompt orders `R265` first: `R265`'s gate
expresses the universal-coverage cluster as a predicate over `kind`, and until
`'benchmark'` exists there is no kind separating the OECD average from the
tax-funded countries — the gate would have computed 1.8-4.4%. The six rows in
`b1f5301` touch one data shape (`WORKFORCE_ASSESS` gaining per-figure grades
while losing its literals) and could not be usefully split.

OECD RANGE: `params.ts` **2.0-4.4% → 2.2-4.4%**; effect on `ltcExpansion`
sampling: **none, and this is the finding.** The range is prose inside
`source:`; the sampled distribution is `150 / 230 / 330` in 2023 dollars and
did not move. `ltcOecdRangeDrift()` now ties four statements to
`LTC_GDP_2021`: the parameter's source note, `ltc.astro`'s sentence (its
`1.3%` too), the methodology's cluster clause, and a refusal of the retired
`2.0` anywhere in the source string — because the range clause could be
corrected while `2.0` survived beside it, which is the shape of the defect
that produced the row.

DEAD CONSTANTS: `WHAT_WORKS` **rendered**; `MEDICARE_GAP` **rendered**. Both
from `ltc.astro`'s frontmatter at build time, so they stay in the static HTML
— client rendering would have cost that. The constants carry the page's
published wording, since that is what readers have seen. **The merge was not
lossless in either direction and both halves are recorded at the constants:**
the page's *"and the largest single payer of it in the country"* is kept; the
constant's *"an insurance contribution or a tax"* is **restored**; the
constant's *"bathing, dressing, eating, and supervision"* is **dropped** for
the page's *"daily living"*, because the chapter's opening paragraph already
spells that list out.

HEADCOUNTS: **wired to `workforce.ts`** — `5.4M / 6.2M / 7.5M`, and `9.7M`,
`$17.36` and `75%` with them, now sourced from `LTC_WORKFORCE` in
`src/lib/workforce.ts`. `WORKFORCE_ASSESS` reads it; `ltc.astro` and
`workforce.astro` interpolate it in their frontmatter. The page's attribution
to *"The Workforce model"* is true for the first time.

7.5M INPUTS: `~5.0M covered FTE` / `~0.67 full-time fraction` — **both are
plan assumptions, and neither has an external source, which is now what the
page says.** `matureFramework` is graded `low`, alone among the seven, with a
`basis` string naming both inputs and stating that neither is a published
figure. ⚠️ **As first written this met `R284`'s second declared test and broke
it one level down** — the two inputs themselves carried no grade, only an
explanation inside the parent figure's `basis`, which is exactly the
sibling-inheritance the test forbids. Corrected in the fix run: both now carry
their own `confidence` and `basis` in `LTC_WORKFORCE`, exported as
`PLANNING_INPUTS`. The chart renders all three bars' grades beneath them.
`ltcPlanningInputFaults()` pins `5.4 + 0.772 = 6.2` and `5.0 / 0.67 = 7.5`,
which were comments beside the numbers they described, and asserts the
methodology still states the grade the code publishes.

CONTRADICTIONS: the four DISCREPANCY items above, plus `V18` re-verified —
`ltcWageFloor` 29/52/94 still matches `params.ts` to the dollar, and nothing
in this section touched `ltcWageFloorCost()`.

### 🆕 The finding this section did not come for: `R180` is live, and every chart in the application was affected

`§BB` filed `R180` on inference from reading `chart-util.ts`, `R285` cited it
as a compounding risk (*"the series **may** be unreachable by any input at
all"*), and no section owns it. It is not a risk. Reproduced in a browser:

| after one in-app navigation | before the fix | after |
|---|---|---|
| `.nha-tooltip` nodes in the document on **hover** | **0** | 1 |
| `.nha-tooltip` nodes in the document on **focus** | **0** | 1 |
| the node the singleton points at, still in the document | **false** | true |

`tooltip()` memoised its node in a module-level `tip` and returned it whenever
`tip` was truthy. `<ClientRouter />` replaces `<body>` on every in-app
navigation, so from the second page onward it returned a node the router had
discarded: `showTip` filled it, set `display: block` on it, and nothing
appeared. **Every chart in the application shares that one singleton.**

`!tip.isConnected` is the whole fix. It landed here because **`R285` is not
finished without it** — the focus handler `R285` adds showed nothing at all.
Regression test in `tests/lib/chart-util.test.ts`, run against a document stub
because the suite's environment is `node`; the test fails with the guard
removed.

**This is the third instance of the pattern the P13 handoff named:** a finding
downgraded or softened because a mechanism *"only runs once at init"* turns
out to be live once you ask what a second page load does. `AE1` was the first,
`R70` the second.

### 🆕 Three checks this section wrote were wrong, and one measurement was

All four were caught inside the section rather than by a review. ⚠️ **Four
more were not, and the review found them — including three separate weaknesses
in one check. See `### THE CODE REVIEW` below.** Each is commented where it was
fixed.

1. **A grade clause that could not fail.** `ltcPlanningInputFaults` asserted
   the methodology still grades the maturity figure `low`, with
   `/Universal benefit at maturity[^|]*?Confidence: low/` over the flowed
   file. **There are two `Confidence: low` grades in that file** — the
   maturity figure's and the wage floor's, twenty lines apart — so the pattern
   matched the second one whatever the first said. Downgrading the maturity
   bullet to `high` left the check green. Found by `prove_p14.py` reporting
   **CANNOT FAIL**, not by reading it again. Bounded to the bullet now.
2. **A literal scan that identified a percentage by its digits.**
   `ltcRepeatedLiterals` listed a bare `'3.4%'` for Sweden's share of GDP and
   went red on Germany's payroll contribution of *3.4% **of wages***. Two
   different quantities, two shared digits. The literals carry their context
   now — and the check caught its own defect on the first run, which is the
   argument for writing it at all.
3. **A cast the repo already forbids.** The same clause reached for
   `(match ?? [, 'no grade'])[1] as string` to squeeze a value out in one
   expression, and `primitiveAssertions` failed the build **by name**. An
   existing check catching a new one.
4. **Two measurements in `measure_s9d.py` that reported comfortable answers.**
   A `confidence` regex matched the **first** `as Conf` in `ltc.ts`, which is
   `MEDICARE_GAP`'s, and reported `WORKFORCE_ASSESS` as `high` when it is
   `medium` — it would have made `R284` look wrong. A single-line search for
   the methodology's grade reported `False` for a grade that sits three lines
   below its figure — it would have made `R284` look right for the wrong
   reason. **A measurement is a hypothesis too**, and both errors pointed the
   same way: toward less work.

### 🆕 The harness was blind, and every payload looked broken

`prove_p14.py`'s first oracle ran vitest and grepped its output for the
failing self-test's name. **Vitest truncates `assertSelfTestsPass`'s thrown
message to about forty characters before it reaches stdout — in the default,
`basic` **and** `json` reporters alike.** The row name never appears. All
seven early payloads reported *"the suite failed, but on some other test"*,
which reads as seven broken payloads rather than one blind harness.

The oracle asks the registry directly now, through a probe test file written
and removed in a `try`/`finally` (vitest's `include` is `tests/**/*.test.ts`
and nothing else in the repo executes TypeScript; `tests/` is not in the file
manifest, so nothing else notices).

A second harness error in the same file: the payload that retires a `kind`
used `str.replace(old, new, 1)` and moved **Norway only**, leaving Sweden and
Denmark on `'tax'`. The check correctly stayed green and was reported as
**CANNOT FAIL**. **A payload that does not do what its name says is
indistinguishable from a check that does not work.** Replacement is now
global.

### What was measured, and what it changed

`baseline-P14/measure_s9d.py`, run before any implementation, with its output
in `baseline-P14/preP14-measure.txt`. Six of eight rows confirmed as written;
`R265` and `R283` confirmed in fact but wrong in framing; `R284` half wrong;
`R286` undercounted.

**`R287` had the cleanest measured answer in the section.** `perCapita` was
eight typed literals under a header calling them derived. Back-solving
`perCapita / (pct/100)` for each row and rounding to the nearest **$10**
reproduces **all eight published figures exactly**, so the switch to a
computed field changed no number a reader has seen. At $100 rounding four of
the eight would have shifted by $1; the finer precision was chosen to avoid
churning published figures for a structural gain. Three back-solve to exactly
round values — Norway 92,200, Japan 46,000, Germany 62,640 — which
corroborates that the original author used the real World Bank
`NY.GDP.PCAP.PP.CD` 2021 series the methodology names. ⚠️ **Not independently
re-verified against the live World Bank series**, and the comment in `ltc.ts`
says so rather than claiming a lookup that did not happen.

### Gates

- Self-tests **216 → 220** (`ltcOecdRangeDrift`, `gdpKindStyleFaults`,
  `ltcPlanningInputFaults`, `ltcRepeatedLiterals`; `directCareHeadcountDrift`
  re-pointed rather than added). README bumped in the same commits — it moved
  three times during the section.
- Full suite **475 → 486 passing, 59 files**. File manifest unchanged at
  **126** — no new files under `src/`, `tools/` or `research/`.
- `astro check`: **0 errors, 0 warnings, 1 hint** (`equations.ts:1252`), read
  and confirmed rather than assumed.
- `tests/lib/kappa.test.ts`'s `KPP-C8` breach count did not fire: no model
  output moved. Correct — `ltcExpansion`'s distribution is untouched.
- `src/` swept for bytes `< 0x09` after every scripted edit: none.
- `python check_audit_docs.py` exits 0, 35 passed.

### Proof

`baseline-P14/prove_p14.py` — **22 payloads, every one turning its intended
check red**; output in `baseline-P14/postP14-prove-run.txt`. Six are asserted
in vitest rather than in the self-test registry and are marked with a leading
`!`, because the probe cannot see those.

### Deliberately not done

- **`R265`'s first declared test in its literal form** — *"the OECD LTC range
  appears **once**, as a parameter, with both the page and the model reading
  it."* `params.ts` cannot import `ltc.ts` without a cycle, so the single
  source is `LTC_GDP_2021` and a build gate is what makes all three quote it.
  Met in substance, not in form, and recorded rather than glossed.
- **`R285`'s tooltip is still `chart-util`'s body-level singleton.** `R180`'s
  fix makes it work; it does not make it per-chart. The row's *"every tooltip
  is reachable by keyboard focus"* is met; the singleton design is not this
  row's to change.
- **`workforce.astro`'s remaining prose figures** beyond the six the check
  covers. The stat tiles, the risk rows and the wage table are interpolated;
  the surrounding narrative is not exhaustively swept. `R286` is a `§S9d` row
  scoped to the LTC chapter and `§BW1` widened it one page; widening it to
  every chapter is nobody's row.

### THE CODE REVIEW

Two agents, one on standards and one against the spec, both pinned at
`fdd01a6`. The standards pass ran **mutation probes** against the new checks
rather than reading them, which is how four of these were found. Fix run:
`0a5d9d1`. Suite **486 → 488**; self-tests still 220; `astro check` 0/0/1.

**Three of the four checks this section wrote were weaker than their notes.**

`directCareHeadcountDrift`, in three ways at once, all under a green note
reading *"12 figure-and-page pairs, every one interpolated from
`LTC_WORKFORCE`"*:

| probe | result | why |
|---|---|---|
| type `9.9 million` into a page | **GREEN** | needles built from the live model, so only today's digits were blocked — while the comment claimed *"a literal is the defect regardless of its value"* |
| delete a figure from a page | **GREEN** | nothing verified interpolation at all |
| the turnover figure | **GREEN** | `newJobs2034M` and `homeTurnoverPct` were dropped from the list, and `workforce.astro` hand-typed *"roughly 75% annual home-care turnover"* one div below the tile that interpolates it |
| a comment quoting a figure | **RED, falsely** | the comment said `renderedSource` strips imports and masks comments; the code called `sourceText`, which does neither |

And the `12` was six figures times two pages. Nine pairs exist. Rewritten as
two halves — every figure must appear as an interpolation expression, and any
literal *shaped* like a direct-care figure is a fault whatever its value. ⚠️ **The rewrite was itself too weak in two ways, and the
second review measured both.** It silently dropped `flowed()`, so a
line-wrapped literal stayed invisible; and its "shape" for the turnover figure
was the page's own sentence with the digits blanked, which could not fire at
either site that states it. See `### THE SECOND CODE REVIEW`.

🆕 **One exemption in that rewrite is worth reading.** The shape scan found
`169.96 million jobs nationally` hand-typed beside a share the model computes
*from* `TOTAL_US_EMPLOYMENT_2024`. Interpolating it broke `workforceProseDrift`
— an earlier section's check that **already gates that literal against the
constant**. So the drift was defended, and rewriting a value gate into a shape
gate to remove a literal it was watching would have been the worse trade.
Reverted and exempted, with that as the stated reason. **An exemption is safe
when another check holds it, and not otherwise.**

`ltcRepeatedLiterals` pinned **hand-typed** needles (`'Denmark 3.2%'`), so
correcting a share would have silently retired the guard for that country —
the check would have gone green about a figure it had stopped watching.
Derived from `LTC_GDP_2021` now. Its note claimed *"every repeated figure
resolves to one exported field"* while watching five. ⚠️ **And the replacement
note over-counted**: `ltcRepeatedWatched()` reported **24** for **16** distinct
pairs, in the same commit that removed `directCareSharedCount`'s `6 × 2 = 12`
over-count. See `### THE SECOND CODE REVIEW`.

`ltcOecdRangeDrift`'s retired-value clause matched only the paired form
`2.0-4.4` while its message claimed *"no superseded OECD value anywhere in the
source note"*. A bare `2.0%` beside the corrected range passed. The
methodology **names** what it superseded, so the list is parsed from the
document that retired them and extends itself.

`gdpKindStyleFaults`' first clause cannot fire with the default arguments —
`KIND_STYLE` is a `Record` over the same union the data's `kind` uses, so
TypeScript has already refused the bad case. **That is P13's colourer finding
again**: a live regression test on the function, blind to the data. Kept and
now exercised through its injected arguments, rather than deleted, because
deleting it would lose the payload that does fail.

🛑 **`R282`'s defect, recreated by the commit that fixed `R282`.**
`WORKFORCE_ASSESS.note` was exported with **no consumer anywhere in `src/`**,
and it was *rewritten* by that commit. The page's paragraph is the published
copy and now reads `LTC_WORKFORCE`, so the constant was the dead one. Deleted.
**Naming the defect class does not immunise the next thing you write** — for
the third campaign section running.

🛑 **A citation for a number nobody read.** `gdpPc2021`'s **field** comment
said `(World Bank)`. The eight values were back-solved; the block comment
above disclosed that and the field comment did not, and a field comment is
what a reader of the data sees. This is `BU4`/`R283`'s own pattern — a value
attributed to a source it was not read from — **introduced by the row that
removed an instance of it.** It says `implied` now, and the methodology
publishes all eight figures so the arithmetic can be checked. The methodology
also still called dollars-per-person *"the second reading in each tooltip"*
after `R285` moved it onto the chart, in the file the chapter links as its
sources.

**Three more repeated figures `R286`'s first pass missed** — `$415B` of LTSS
spending, the `$2,000` asset test, the `711,000`-person waiting list — each
with one authored home now.

**The source-shape test earned its keep only after being fixed.** It sliced on
a function name and ran to EOF if that name moved, landing on
`renderWorkforce`'s `role: 'img'` — which is **correct** there, that chart has
no focusable children. Both anchors are asserted before the slice now.

🆕 **Recorded, not fixed.** `role="img"` over `tabindex` with no `focus`
handler survives in `tax-charts.ts` (**6 sites, 4 with tabindex**),
`benchmark-chart.ts`, `financing-chart.ts` and `gov-client.ts`. `AW5`'s other
sites; `§S9d` fixed its own. **Nobody's row.**

🆕 **Two scope items the section should have recorded and did not.**
`COST_IN_FRAMEWORK.body` was edited under a *"Do not touch"* heading — the
parameter mechanism the prompt protects is untouched and `R286` names the
string, but the prompt's own rule is to record every contradiction, and this
entry listed four and not this one. And `.bench-row:focus-visible` in
`global.css` is app-wide: `.bench-row` is also the tax and benchmark charts'
row class, so focus styling changed on four chapters outside `§S9d`. Adding an
outline where there was none is an improvement, and it is still scope.

⚠️ **`R265`'s first declared test, re-judged.** The spec reviewer's objection
is fair and is recorded rather than argued away: tying three statements with a
gate is the same *"leaves both authored and asserts they agree"* shape this
entry criticises elsewhere, and **moving `LTC_GDP_2021` to a leaf module both
`params.ts` and `ltc.ts` could import was never evaluated.** Not done in the
fix run — it moves a seam under the framework's largest expansion on a review
comment, which is a `§S11b` decision, not a fix-run one. **Recorded as open.**

🆕 **The proving harness grew from 22 payloads to 31**, six of them mutations
the review found green. One of the six was itself a wrong payload first: it
replaced one of **two** occurrences of an interpolation and read as CANNOT
FAIL — the same mistake the `R288` kind-retirement payload made earlier in the
section, in a different shape. **That is twice in one section for one error,
which is the argument for `replace-all` being the default.**

### THE SECOND CODE REVIEW

Pinned at `dde09e4`, so the diff was exactly the first fix run and its log
amendment — **the code nothing had reviewed**, which is what the P13 handoff
says to spend a second pass on. Both axes again, and the standards pass ran
**mutation probes** rather than reading. Fix run: `5f99bdf`.

**Nine defects. Four were written by the first fix run.** That is this
campaign's signature failure, now observed for the fourth section running: the
pass removing a defect authors a fresh one.

🛑 **`R282`'s defect reached its THIRD generation, and nothing was enforcing
`R282`'s own first declared test.**

| generation | constant | authored by |
|---|---|---|
| 1 | `WHAT_WORKS`, `MEDICARE_GAP` | already dead when the row was filed |
| 2 | `WORKFORCE_ASSESS.note` | the commit that fixed generation 1 |
| 3 | `PLANNING_INPUTS` | the fix run that deleted generation 2 |

Every one found by a human review, never by the build — because *"every
exported content constant has at least one consumer"* had **no check**.
`deadLtcExports()` is that check. **A test is deliberately not a consumer:**
`PLANNING_INPUTS` was imported by one and read as covered.

🛑 **The shape scan silently lost `flowed()`.** The line was
`flowed(sourceText(page, root))`. Correcting `sourceText` → `renderedSource`
— which was right, and fixed the false-failure on comments — **dropped the
whitespace flatten with it**, while every shape hard-codes a single space.
`ltc.astro` already wraps in exactly that shape. **Two independent fixes were
needed and one was made**, and the note went on claiming the stronger
behaviour.

🛑 **The turnover "shape" was the page's own sentence with the digits
blanked.** `/\b\d{1,3}% annual home-care turnover\b/` could not fire at either
site that states the figure: the tile writes `~75%/yr`, the LTC page writes
*"turnover runs near 75%"*. **A shape copied from one occurrence is not a
shape, it is that occurrence.**

🛑 **`ltcRepeatedWatched()` returned 24 for 16 distinct pairs**, because each
country emits two needles. **The same commit removed `directCareSharedCount`'s
`6 × 2 = 12` over-count and shipped `12 × 2 = 24` in the function it was
writing at the time.**

⚠️ **The retired-value clause identified a value by its digits** — the exact
thing `gdpShareNeedles`' comment forbids six hundred lines away.
`ltcExpansion.source` says *"raises NHE ~4.4%"*, a share of **national health
expenditure**, not of GDP, and the retired list is **self-extending**, so the
day it names 4.4 the build reddens over a correct number.

🆕 **And the first attempt at fixing that made things worse in the other
direction.** Requiring the match to read as a share of GDP turned this row's
own payload green: a bare *", up from 2.0% (OECD)"* beside the corrected range
passed. **The `current` guard was already doing the work** — a value cannot be
both retired and current, so 4.4 is skipped before it can collide — so the
context regex bought nothing and cost a real payload. Removed. **A narrowing
that survives only because you did not re-run the payloads is a regression.**

⚠️ **Exemptions matched by value, page-wide**, so a second unrelated
`1.9 million` anywhere in the file would have been waved through with the
first. Counted now, and an exemption nothing spends is itself a fault.

⚠️ **`coveredFteMBasis` named an internal parameter id in reader-facing prose
and misdescribed it.** It said `params.ltcWageFloor`*"whose range spans
4-6M"*; that parameter's range is **29 / 52 / 94 `$B/yr`**, and the 4-6M lives
inside its own prose source string. The two planning inputs were also four
parallel `Basis`/`Confidence` fields on a flat object of bare numbers **in the
model module**, when `GradedFigure` already types that shape. Moved to
`ltc.ts`; `workforce.ts` is back to two numbers, which is the right seam — the
model owns the figures, the chapter owns how they are presented.

✅ **And `R284`'s first declared test is now actually met.** The two planning
inputs **reach a reader**, rendered under the workforce chart with their own
grades. Each carries a `display` string, because `5.0` reaches the DOM as
`"5"` and the two inputs are in different units. **Measured in the browser,
not assumed** — the first render said *"Covered full-time-equivalent aides:
5"*.

### 🆕 The trap that bit four times in one section

**Shell heredocs collapse backslash pairs.** `<<'EOF'` protects against shell
*expansion*, not against the text passing through the shell at all. In this
section it:

1. broke a Python patch script (`\'` → `'`),
2. broke a second one (`\n` → a real newline, leaving `prove_p14.py`
   unparseable),
3. wrote `'\b'` into TypeScript — **U+0008, backspace, not a word boundary** —
   which made `deadLtcExports` report **every export in `ltc.ts` as dead**.
   Seventeen findings that were one broken check.
4. then wrote a **literal backspace into the comment explaining the trap**,
   which is the control character that makes git call a source file binary.

**Each one produced a plausible-looking wrong answer rather than an error.**
Anything containing a backslash now goes through a file written with the
editor, never a heredoc. This is already in the campaign's notes and was used
anyway, four times, which is the actual lesson.

### Gates after the second fix run

- Self-tests **220 → 221** (`deadLtcExports`). README bumped; it moved **five
  times** across this section.
- Suite **488 passing, 59 files**. Manifest **126**. `astro check`
  **0 / 0 / 1**.
- `prove_p14.py` is **37 payloads**, up from 31. Six are mutations this review
  found green. **One of the six was a wrong payload first** — its anchor did
  not exist, because the page wraps that sentence — which is the **third**
  payload this section wrote that did not do what its name said.
- Control-character sweep of `src/`: clean.

### Recorded, not fixed

- **The `/favicon.ico` 404** the browser logs on every page. No favicon exists
  anywhere in the project and this section's diff touches nothing under
  `public/` or `src/layouts/`. Site-wide, pre-existing, nobody's row.
- **`R285` at the other sites.** Precisely: `role="img"` over `tabindex` with
  **no** focus handler in `src/lib/tax-charts.ts` (6 `role="img"`, 4 with
  tabindex), `src/lib/benchmark-chart.ts`, `src/lib/financing-chart.ts` and
  `src/scripts/gov-client.ts`; **and with** a focus handler, which is milder
  but still prunes the subtree, in `src/lib/bridge-chart.ts` and
  `src/lib/flow-diagram.ts`. `src/lib/path-chart.ts` has `role="img"` and no
  focusable children, which is correct. **The first review's list of these was
  incomplete and this one is measured.**
- **`R265`'s first declared test**, still. The second reviewer agrees the
  deferral is *partly* defensible — the range lives inside a prose `source`
  string, so it cannot become a parameter without a schema change — and notes
  correctly that establishing that was one grep, and the section is stamped
  complete regardless. **Open for `§S11b`.**

### 🆕 After the section closed: a pre-existing overflow, and a first fix whose rationale was wrong

Found while verifying `§S9d` in the browser and deliberately left out of that
section's diff as scope creep, then fixed on its own commit after the entry
above was written. **Pre-existing, and that was checked rather than assumed:**
`git diff fdd01a6..HEAD -- src/lib/ltc.ts` changes no `since:` field, and the
`global.css` diff touches no `country-head` rule.

At a 375px viewport the chapter scrolled sideways: `clientWidth` **375**
against `scrollWidth` **396**. Exactly one element passed the viewport, the
`since` span in the fourth country card, `COUNTRY_SYSTEMS[3]`, whose sourced
text is a clause and not a year: *"Long-standing; reablement required since
2015"*, **257px wide with its right edge at 396**.

🛑 **The stated cause was wrong, and it is the cause everyone reaches for.**
The overflow was attributed to a grid child's default `min-width: auto`, which
is the usual explanation for this exact symptom. **`.ltc-country-card` already
carries `min-width: 0`.** The grid was never at fault. The cause was
`white-space: nowrap` on the span: as a flex item its automatic minimum was
already its max-content width, and nowrap removed the last break point the row
had.

⚠️ **The first fix worked, and the rationale committed with it was wrong in
two of its three claims.** It shipped `flex-wrap: wrap`, `min-width: 0` and the
removal of nowrap, with a message asserting *"Both are needed. Wrapping alone
still leaves a single item that cannot shrink below 257px on any narrower
card."* That was reasoning, not measurement. Measured afterwards by toggling
each declaration in the live page, at **card** widths (the 375px viewport
renders a **258px** card content box, between the 280 and 320 columns):

| configuration | 200px | 240px | 280px | 320px | 375px |
|---|---|---|---|---|---|
| **old**: nowrap, no flex-wrap | 168 | 128 | 88 | 48 | 0 |
| drop nowrap only | **0** | **0** | **0** | **0** | **0** |
| keep nowrap, add `flex-wrap` | 90 | 50 | 10 | 0 | 0 |
| **shipped**: drop nowrap + `flex-wrap` | **0** | **0** | **0** | **0** | **0** |

Worst pixels past the card content box; 0 is safe.

1. **Dropping `white-space: nowrap` is necessary and sufficient**, alone, at
   every width down to a 200px card.
2. **`flex-wrap: wrap` alone does not fix it.** It still overflows below a
   320px card. The commit message claimed the reverse of what the row three
   measures.
3. **`min-width: 0` was inert.** Identical geometry with and without it, in
   both configurations, down to the pixel. Removed, and the page re-measured
   afterwards to confirm the removal changed nothing: `minWidth` computes to
   `auto`, head heights still 24 / 24 / 24 / 67, `scrollWidth` still 375.

**The margin that produced the bug was one pixel.** The card content box is
**258px** and the string's max-content width is **257px**. At desktop's 439px
card the old head already fit only because the country name wrapped to two
lines beside the pinned clause; it had a single pixel of room and nothing
watching it.

WHAT SHIPPED: the nowrap removal, which is the fix, plus `flex-wrap: wrap`,
which is **legibility and not the fix** and now says so at the rule. It keeps
*"Denmark and the Nordics"* whole on one line instead of squeezing it into a
narrow column beside the clause. No `min-width`.

MEASURED AFTER: at 375px, `scrollWidth` **375**, equal to `clientWidth`, and
no element with a right edge past the viewport. The first three cards are
untouched, heads one line at 24px with the value inline. A sweep from a 200px
card to a 480px card finds zero overflow. Desktop moves from a 48px head (name
wrapped to two lines, clause pinned right) to **51px** (name on one line,
clause beneath): **+3px**, and the country name reads whole.

**This is the entry above's own closing lesson, applied to the entry above.**
`§S9d` recorded that *"naming the defect class does not immunise the next thing
you write"* about a dead constant recreated by the commit that removed one.
The first pass at this fix then shipped **a dead declaration and a comment
claiming it did the work**, in the same chapter, one commit later. It was
caught by toggling declarations rather than by re-reading the rule, which is
the same thing the standards review's mutation probes did to this section's
checks.

### Deliberately not done

- **No self-test for this.** A layout assertion needs a rendering engine and
  the suite's environment is `node`; the checks that could run there would be
  a character bound on the `since` strings or a scan for `nowrap` in the
  stylesheet, and both gate the wrong thing. The durable guard is structural
  instead: **the text can now break at any length**, so no bound on the
  sourced string is needed to keep the page from scrolling. Recorded rather
  than papered over with a check that would pass for the wrong reason.
- **The other `nowrap` sites in `global.css` were not swept.** This row fixed
  the one that overflowed. Whether any other holds sourced prose that could
  grow is unmeasured, and is **nobody's row**.

### Gates

- Self-tests **220, unchanged**; no registry entry added, README untouched.
- Full suite **488 passing, 59 files** — unchanged, and the change is
  stylesheet-only so no test count could move.
- `astro check`: **0 errors, 0 warnings, 1 hint** (`equations.ts:1252`).
- `astro build`: 14 pages.
- Verified in the running dev server at a 375px viewport, not from the built
  output.


## P15 — §S11a Seed CSV & research sourcing · 2026-08-26 · branch `nha-remediation`
STATUS: complete — all 14 recommendations resolved, four of them by measuring
that the row's premise was false rather than by changing code, plus **three fix
runs** after two reviews.

⚠️ **Read `### THE REVIEW OF THE SECTION, AND THE FIX RUNS` and then
`### THE TWO-AXIS CODE REVIEW, AND FIX RUN 3` at the end of this entry, in
order, before believing anything above them.** The first found seven defects,
all seven citations that did not support their row. The second — parallel
Standards and Spec sub-agents pinned at `1460194` — found **fifteen more,
thirteen of them real, and the first review had missed every one.** Among them:
**`R6` had a third site this section never touched**, and **`R13`'s first
declared test cannot fail**.

⚠️ **The sentence you are reading replaces one the backslash-and-backtick trap
silently ate.** A `python -c "..."` amendment to this line contained a
backticked section name; bash command-substituted it and wrote the line back
with the name deleted and no error. Seventh occurrence in the campaign. It is
recorded here rather than only in the tooling notes because **the damage landed
in the pointer telling a reader where the corrections are.**

DISCREPANCY: **ten, and four of them change what the row is.**

1. 🛑 **`R40`'s seed side does not exist, and both `R40` and its twin cite a
   verification tag that is about something else.** The prompt says `rents`
   "appears here as a seed row and in `params.ts` as `R145`". There is **no
   `rents` row in the seed** and no `CP-FIN-007` either; the seed's only
   "rent" hit is `CP-OFF-003b`, the IRA drug-pricing package. And `rents` is
   not in `params.ts` — it is `src/lib/taxparams.ts:323`, `rev1x: 20`,
   `default: true`, `confidence: "low"`, exactly as described but at a
   different address. Both `R40` and `R145` cite **`[V4]`**, and `V4` in the
   audit is *"`metricCount: 26` and `targetCount: 64` both reconcile by
   hand"* in `data-phases.ts`. It has nothing to do with `rents`. **The seed
   side is a null set; the row is `taxparams.ts`'s and belongs to `P17`.** Not
   invented a seed row to have something to fix: adding one would be the
   fabrication this section exists to prevent.

2. 🛑 **`R3`'s `HANDOFF.md` is not in this repository, and `R3` was already
   satisfied.** `specs/HANDOFF.md` is the Astro migration handoff, 71 lines,
   and contains no mention of elasticity, coefficient or RAND. The document
   `R3` means is from the original framework build. The row's substance was
   checked against the code instead: `utilIncrease` carries
   `confidence: "low"`, carries `url: "https://www.rand.org/health-care/projects/hie.html"`,
   and **that `low` grade reaches the rendered page in two places** —
   `gapsList` at `health.astro:15` filters `PARAM_DEFS` to `confidence ===
   'low'` and prints their labels, and the parameter table prints a `conf
   low` cell. Both are in `dist/health/index.html`, with the utilization
   parameter named first in the gaps list. **The row asks for either a cited
   value or a visible grade; the code has both.** Recorded in
   `specs/HANDOFF.md`, nothing changed. This is `P14`'s `R284` shape for the
   second section running: **measure whether the grade reaches a reader
   before deciding which branch you are on.**

3. 🛑 **`R6`'s premise is true and its diagnosis is wrong, and the real defect
   is worse.** `R6` says the 26.7M headline "applies a 2024 rate to a 2023
   population". Both figures are 2024 and the denominator is 2023, so the
   vintage half is right. But the load-bearing error is a **measure**
   mismatch. `research/01`'s own `CP-POP-004` records two figures explicitly
   labelled *"not directly comparable"*: Census CPS ASEC **8.0% all ages**,
   and KFF/Census-ACS **26.7 million uninsured under age 65** at a **9.8%**
   rate. `equations.ts` pairs them as *"26.7M of 334M"*, and `PROBLEM_STATS`
   labelled the result "(KFF/Census, 2024)" — naming both sources, which is
   what let the mismatch pass. **26.7 / 334.0 = 8.0% is arithmetically true
   and semantically empty:** the numerator counts a population the
   denominator does not. The seed's `CP-POP-004a` has carried the note *"two
   incompatible measures exist"* since it was written and nothing read it.

4. ⚠️ **`R4`'s replacement numbers are real, are not where it says, and its
   second figure is nowhere at all.** `R4` says replace `CP-BH-003` with
   `CP-BH-011`'s "36,780–86,430 by 2038". `CP-BH-011` in `research/04` holds
   the **child and adolescent** figures (7,470 by 2036, 19,770 by 2038); the
   adult 36,780–86,430 is in **`research/02`**, unnumbered, inside the
   `CP-EDU-004` psychiatry paragraph. Worse, the two files disagree on the
   release: `research/02` attributes it to a **January 2026** HRSA release,
   `research/04` to the **2025** brief, and both link the same 2025 PDF.
   **`R4`'s other half — "the verified June 30 2026 figure: 157,149,246
   people, 26.53% of need met, 7,825 practitioners needed" — appears nowhere
   in this repository**, and `bhw.hrsa.gov` returns HTTP 403 to automated
   fetch, so it could not be checked. **It was not written.** The row keeps
   the 122 million with its actual repo provenance (`CP-BH-010`, HRSA HPSA
   dashboard, October 2024 designation list) and says so.

5. ⚠️ **The "~45 rows" premise is three different numbers and all three are
   correct.** Measured at `1460194`: **49** rows had an empty `source_url` at
   any grade; **41** of those were graded `high` or `medium-high`, which is
   the audit's "~45"; and **49** were graded `≥ medium`, because **no row in
   the file was graded below `medium` at all**. The P15 handoff reported 49
   as a correction to the audit's 45; they are answers to different
   questions. The handoff's own conclusion — that the Done-when clause
   therefore applies to the whole file — is right.

6. ⚠️ **`R15` names five open items; ten are referenced outside the extract
   files.** `OI-008`, `OI-033`, `OI-034`, `OI-035` and `OI-043` in
   `workforce_transition_methodology.md`, plus **`OI-061` and `OI-070`** in
   `legislation_crosswalk.md`, **`OI-001` and `OI-023`** in the generated
   `quality-data.ts`, and **`OI-052`** in `rollout.ts` and `selftests.ts`.
   The register covers all ten, because one covering only the five somebody
   noticed reproduces the problem it was written to fix.

7. ⚠️ **`research/03` had already downgraded `CP-RX-001` to Low and the seed
   still said `high`.** The research entry reads
   `**Confidence:** ~~High~~ **Downgraded to Low, and not used by the
   model.**` The seed was never told. This is the strongest single argument
   for the crosswalk this section built: the evidence base and its own
   distillation had drifted apart in the direction that matters.

8. ⚠️ **`R30`'s recommendation was not adopted for a reason that turns out to
   be good.** `CP-GOV-NEW-001` wants core agency overhead split from
   contractor claims processing. `params.ts` splits `publicAdminRate`
   (claims, enrolment, operations) from `governanceRate` (oversight, appeals,
   legitimacy). The note's seam exists because MAC payments are booked
   against the trust funds while Program Management is a discretionary
   appropriation — **an artifact of current U.S. accounting with no referent
   in the modelled system**, where there are no MACs. Recorded in
   `research/05` with the reasoning and with the half of the note that is
   still right.

9. ⚠️ **`R35`'s 403 is gone and the gap it was recorded against is not.**
   `cms.gov` now returns **200** on all three URLs that refused, including
   `files/document/highlights.pdf`. But the DME, other-non-durable and
   other-professional-services splits `BASE2023` carries are not on any HTML
   page — they are in `nhe-tables.zip`, which also now serves. **The blocker
   changed from "the host refuses" to "the archive is unopened", and the
   check is a `params.ts` change.** Still 403 as of 2026-08-26: `cbo.gov`
   direct PDFs (the publication page serves), `bhw.hrsa.gov` PDFs,
   `gao.gov/products`, `jamanetwork.com`.

10. ⚠️ **Six seed rows were structurally broken by an unquoted comma** — the
    same shape as the audit's own *"6 rows structurally broken by an
    unescaped pipe"*, in a different file format and, by coincidence, the
    same count. `CP-POP-001`, `CP-FIN-001`, `CP-FIN-010`, `CP-OFF-003a`,
    `CP-HOSP-006`, `CP-GOV-001`. Because `notes` is the last column the
    damage was contained to it, so no grade or year was ever shifted — but
    `CP-HOSP-006`'s peer-nation comparison was split into three fields, and
    any consumer strict enough to reject an 11-field row would have rejected
    the file. All 81 lines now carry exactly 11 fields.

LANDED: `R3` `R4` `R5` `R6` `R7` `R8` `R9` `R10` `R13` `R14` `R15` `R30` `R35`
`R40` — sha below.
BACKFILLED: **46** rows given a real `source_url`, plus **2 re-sourced** away
from secondary outlets (`R9`, `R10`) = 48 rows now carrying a working citation.
DOWNGRADED: **12** rows whose grade dropped because no evidence carries the old
one.  **UPGRADED: 0.**
YEARS: **25** `recent` → numeric, and 11 further placeholders (`estimate`,
`historical`, `ongoing`, `various`, `study year varies`, `FY2025 enacted`, and
four undeclared ranges) resolved. **Remaining placeholders: 0.** **Nine** rows
carry a declared span whose endpoints are named in `notes` — this entry said
six until the two-axis review counted them. `R7`'s own test asks for "a numeric
year" and nine rows do not have one; the argument that a declared span is not a
placeholder is made below and is a judgement, not a pass.
DENOMINATOR: canonical population per output type = **334.0M (2023)** for every
per-capita figure derived from the NHE calibration, **340,110,988 (2024)** for
regional and county allocation only, **347.3M (2025)** for current-state
description only. Declared in `research/README.md` with the reason each is not
interchangeable.
26.7M HEADLINE: **corrected to "people under 65 uninsured", 9.8%, KFF analysis
of Census ACS 2024.** The model's 8.0% all-ages input is deliberately
unchanged — see below.
CMS.GOV 403: **now fetchable** (200 on the fact sheet, the historical index and
the Highlights PDF). `cbo.gov`, `bhw.hrsa.gov`, `gao.gov` and `jamanetwork.com`
still block.
RENTS (seed side): **no seed row exists** — the premise is false, see
DISCREPANCY 1. `taxparams.ts` twin deferred to `P17`.

### 🛑 The trap that would have shipped 49 wrong citations

The seed and `research/01`–`06` share a `CP-*` id namespace. Matching the 49
unsourced rows to research entries by id reported **49 exact hits out of 49** —
a clean, total, and entirely wrong result.

The seed dropped the research files' `CP-HOSP-001` (hospital care spending,
already in the seed as `CP-TOT-004a`) and shifted the rest of the block up by
one **without renumbering**. So:

| seed row | is really | id match would have cited |
|---|---|---|
| `CP-HOSP-001` — number of hospitals, 6,120 | research `CP-HOSP-002` | hospital *spending*, $1.5T |
| `CP-HOSP-002` — operating margin 4.9% | research `CP-HOSP-003` | the hospital *count* |
| `CP-HOSP-004` — 289% outpatient markup | research `CP-HOSP-005` | *rural closures* |
| `CP-CLIN-001` — 1.03M physicians | research `CP-CLIN-003` | physician *spending* |
| `CP-RX-004` — generics 90%/12% | research `CP-RX-010` | insulin *price gap* |

Same shift in `CP-CLIN`, and in `CP-RX` from 002 onward. `CP-BH-003` means the
psychiatrist shortage in the seed and unmet adult mental-health need in
`research/04`. **A 100% match rate was the signal, not the reassurance** — the
P14 handoff's *"a check firing on everything is as suspect as one firing on
nothing"*, arriving as a matcher succeeding on everything.

The rebuild scored description overlap **and** required the candidate entry to
contain the row's number. Even then the automated proposal picked an AMA
prior-authorization survey as the source for an $83,000 billing-cost figure,
and every one of the 46 was read by hand before it was written.

### 🛑 A 200 is not verification

`R10` needed the Census CPS ASEC primary source. Guessing the report number
gave `census.gov/library/publications/2025/demo/p60-287.html`, which returns
**200**. Its title is **"Poverty in the United States: 2024"**. The health
insurance report is **p60-288**, one number away, and was confirmed by reading
the title and the table list, not the status code.

The same discipline caught `R9`. `research/01`'s `CP-OFF-002` offers
`nejm.org/doi/full/10.1056/NEJMc1215485` as its NEJM link and the row needs
Himmelstein and Woolhandler *directly*. Crossref says that DOI is *"Reducing
Administrative Costs"*, NEJM, 2013-02-14, **author Samuel Metz**. Citing it
would have written `R10`'s exact defect — a misattributed source — into the row
`R9` is about. `10.1056/NEJMsa022033` was verified through Crossref as
Woolhandler, Campbell and Himmelstein, 2003, and is what shipped.

### The twelve downgrades

The count that matters, and the honest measure of the seed's evidentiary base.
Every one is the seed catching up to what its own research file already said.

| row | was | now | why |
|---|---|---|---|
| `CP-RX-001` | `high` | `low` | `research/03` downgraded it to Low and recorded that the model does not use it. |
| `CP-FIN-010` | `medium` | `low` | A derived sum with no external source. The FMEA borrows occurrence from these grades, so a derived aggregate must not rank alongside a measured CMS line. |
| `CP-DVH-002` | `medium-high` | `low-medium` | Credited to the Hearing Industries Association; `research/04` credits consumer price guides and gives no URL for any of them. |
| `CP-TRN-002` | `high` | `low-medium` | `research/05` reaches the Mathematica evaluation only through Wikipedia and an advocacy site. |
| `CP-EDU-001` | `high` | `medium` | The per-resident range is a 2013 contractor study on 2015 projected data; only the national totals are firm. |
| `CP-HOSP-005` | `high` | `medium` | Bundles a CDC visit count (High) with a Peterson-KFF average cost (Medium). The weaker half governs. |
| `CP-DX-001` | `medium-high` | `medium` | Only the CLFS side is an official schedule; the billed charge is a cost-aggregator site. |
| `CP-GOV-003` | `medium-high` | `medium` | `research/05` grades Taiwan MEDIUM and calls 1.07% a lower bound of the possible, not a transferable rate. |
| `CP-IT-001` | `medium-high` | `medium` | The GAO reports are named without links and `gao.gov` refuses automated fetch; the URL is trade reporting. |
| `CP-RD-002` | `medium-high` | `medium` | The range mixes bases as well as years: $83B is CBO 2019 for the industry, $105B the top of the PhRMA-member range for 2021. |
| `CP-HOSP-002` | `high` | `medium-high` | Kaufman Hall's panel is ~1,300 hospitals, not the ~6,120 universe, and this row is an exact percentage. |
| `CP-BH-003` | `high` | `medium-high` | The replacement figures are real but the two research files disagree on which HRSA release published them. |

### Rows whose value or meaning changed

- **`CP-BH-003`** (`R4`): `18000 to 21000` by **2030** → `36780 to 86430` by
  **2038**, adult psychiatrists, status-quo to elevated-need scenarios.
- **`CP-CLIN-001`**: `1030000` → **`1032365`**, the figure `research/02`
  actually states. The rounding is why the value matcher found no hit.
- **`CP-LTC-001`**: `111000 to 128000` → **`111325 to 127750`**. Not an
  uncertainty band: semi-private and private room, both 2024.
- **`CP-LTC-003`**: the `33 to 34` band is **two services**, home health aide
  and homemaker, both 2024 medians — not a range and not two years.
- **`CP-LTC-002`**: `70800 to 74400` is a **+5% year-over-year move**, 2024 to
  2025, not a band. Left as a declared span with the endpoints named.
- **`CP-HOSP-003`**: description gains the word **rural**, which the seed had
  dropped, and the note stops attributing 150–210 to the Sheps Center — Chartis
  counts 206 since 2010, Sheps 197 since 2005, on different definitions.
- **`CP-EMS-001`**: `source_name` read *"Government Accountability and Data
  Collection Study (GADCS)"*. GADCS is CMS's **Ground Ambulance Data Collection
  System**. The expansion was invented and is corrected.
- **`CP-RX-004`**: credited to *"FDA/IQVIA"*; `research/03` traces it to
  **AAM/IQVIA**, a generics trade association. Corrected, grade kept, because
  the volume/spend split is corroborated and the association's savings headline
  is not used.
- **`CP-IT-002`**: credited to the UK National Audit Office; the linked
  document is the **Public Accounts Committee** report.

### `R13`, recorded rather than applied

`CP-BH-001` is $139.6B for **2021** against a 2023 calibration year, and
`research/04`'s `CP-BH-015` supplies 3.27%/yr real per-capita growth for
exactly this. **The trend is recorded in the row's notes and deliberately not
applied.** Applying it would replace a measured 2021 level with a projected
2023 one and lose the fact that no 2023 measurement exists — which is the
thing a reader needs. The `use_as` column now says `benchmark`, so nothing can
sum it into a 2023 total by accident.

### `R14`, resolved as "no newer figure exists"

`CP-EMS-002` flagged itself as needing an inflation update. It is **not**
refreshed, because there is no newer national median air-ambulance charge
anywhere in this repo. It is marked superseded-in-context: the No Surprises Act
changed the billing regime from 2022, `research/04`'s `CP-EMS-005` carries the
post-Act evidence, and the note now says explicitly **not** to inflate the 2017
figure forward as though the regime were unchanged. *"No newer figure exists"*
is a different answer from *"refreshed"* and the row says which one it got.

### What landed outside `research/`

Two label corrections in `src/`, done deliberately and against the prompt's
statement that this section touches only `research/` and `HANDOFF.md` — which
is provably not the section's shape, since `R3`, `R5`, `R6` and `R35` all name
`params.ts`.

- `src/lib/params.ts` `PROBLEM_STATS`: **"people uninsured" → "people under 65
  uninsured"**, note rewritten to name the measure and its 9.8% rate. This is
  the public front page stating something false.
- `src/lib/equations.ts` `KPP-A1`: the operand label read *"26.7M of 334M,
  KFF/Census 2024"* and now reads *"all ages (Census CPS ASEC, 2024)"*.

**The 8.0% value was not changed.** It is the right input for a national
coverage rate, and moving it would move scenario economics into the
`KPP-C8`-breach-count-of-11 tripwire on a labelling defect. Verified in the
built output: `dist/index.html` carries the new front-page text and
`dist/_astro/quality.*.js` no longer contains the string `26.7M of 334M`.

### Recorded, not fixed

- **`R6`'s other half.** The headline is a string literal, not a value derived
  from a declared parameter, so `R6`'s first declared test — *"headline
  `PROBLEM_STATS` values reproduce from declared parameter inputs"* — is not
  met and cannot be met without adding a seed row, which would collide with
  `§S10`'s namespace work.
- **`R3` has no guard.** Nothing fails if `gapsList` is deleted or its filter
  stops matching, and `utilIncrease` is the model's most consequential
  assumption. A check that every `low`-graded `PARAM_DEF` label reaches the
  rendered page would close it and is not written.
- **`R35`'s `BASE2023` half.** `otherProf: 159.9`, `dme: 72.8` and
  `nondurables: 124.1` have still never been traced to NHE Table 2. The
  archive now serves; nobody has opened it.
- **The `CP-*` namespace collision itself.** The seed, the research files and
  `cp_registry_canonical.csv` use the same ids for different parameters —
  `CP-BH-011` is "psychiatrist shortage projection" in `research/04` and
  "behavioural health unmet-demand release factor" in the canonical registry.
  **This is `§S10`'s (`P16`) whole subject** and nothing was renumbered.
- **`CP-OFF-001` cites `pnhp.org`**, an advocacy summary, for an Annals paper.
  Same shape as `R9` and `R10`; not named by any row, and `V22` checked it.

### Verification

- Full suite: **488 passing, 59 files**. Unchanged.
- `astro check`: **0 errors, 0 warnings, 1 hint** (`equations.ts`). Unchanged.
- `astro build`: 14 pages, exit 0.
- File manifest **126 → 127** for `research/open_items_register.md`, rebuilt
  with `node tools/build_file_manifest.mjs` before committing. Nothing pins 126.
- Self-test count **221**, untouched — nothing in `src/` gained a self-test.
- Seed CSV: **80 rows, 11 columns, all 81 lines exactly 11 fields**, zero
  control bytes, LF only.
- Control-character sweep of `src/`: clean.
- Premises measured **before** implementing:
  `NHA-Mental-Health/baseline-P15/preP15-measure.txt`.

### Two tooling traps, one of them for the fifth time

- 🛑 **The backslash-through-the-shell trap bit again**, on the first
  `python -c` patch of a helper script: `\\\\` collapsed and the assertion
  caught it. It is in the campaign notes, it bit four times in P14, and it bit
  here on a one-line edit. **The rule holds: anything with a backslash goes
  through a file written with the Write tool, or through Edit.**
- ⚠️ **`pnpm build 2>&1 | tail -30` discarded the `astro check` counts.** Exit
  code 0 says both commands succeeded; it does not say the hint count is 1.
  The gate is *read the count*, and piping to `tail` is how the count stops
  being readable. Re-run without the pipe.

### THE REVIEW OF THE SECTION, AND THE FIX RUNS

Pinned at `6155cac`, so the diff reviewed was exactly what P15 committed. Run
inline rather than through review sub-agents, which this session was told not
to spawn.

**Seven defects. All seven were written by this section**, and all seven were
found by the same move: **fetching what the section had cited and reading what
came back.** The section's own stated rule was *"a URL is only a citation if
the entry it sits in states the row's number"*, and it then broke that rule
seven times in the act of enforcing it 46 times.

That is this campaign's signature failure arriving on schedule — the fifth
section running where the pass removing a defect authors a fresh one — with
one difference worth keeping: **the check that caught them is the check the
section should have run before committing, not after.** `check_urls.py` takes
under two minutes.

#### Fix run 1 (`6155cac`..): three citations that did not support their row

| row | what shipped | why it is a defect |
|---|---|---|
| `CP-UNIT-002` | `urgentcareassociation.org/wp-content/uploads/Finance-v9.pdf` | **404.** It came from `research/02`'s own source line, so a repo-internal citation was dead and nothing had ever fetched it. Replaced with UCA's 2023 Industry White Paper, same publisher, 200. |
| `CP-EMS-001` | `cms.gov/.../nhe-fact-sheet` | Resolves to **"NHE Fact Sheet \| CMS"**, which is national health expenditure and says nothing about ground-ambulance cost. **A citation that resolves and does not support its number is worse than an empty cell, because it looks finished.** The real page exists: `cms.gov/medicare/payment/fee-schedules/ambulance/medicare-ground-ambulance-data-collection-system`, verified by title. |
| `CP-DX-003` | `healthleadersmedia.com/...` | A trade-press summary of a JAMA paper — **`R9`'s and `R10`'s exact defect, written into a row while fixing two others.** Replaced with `doi.org/10.1001/jama.2019.13978`, confirmed against Crossref as Shrank, Rogstad and Parekh, JAMA, 2019-10-15. |

`CP-EMS-001` is the instructive one. The section *knew* the URL was weak — the
note it shipped said "the URL is the CMS data landing page; GADCS has no
stable public report URL recorded anywhere in this repo." **The note was
honest and the fix was three searches away, and writing the disclosure
substituted for doing the work.** A disclosure is not a licence.

#### Fix run 2: living pages cited for dated figures

A class the section never considered. Several backfills point at a page the
publisher maintains rather than publishes once, so the number the row states
is not the number a reader following the link will see.

- **`CP-HOSP-001`** states **6,120** hospitals for 2024. AHA Fast Facts at the
  same URL now shows **6,100** for its 2026 edition. Both numbers are right
  and a reader will conclude one of them is wrong.
- **`CP-LTC-001`–`CP-LTC-003`** verify *exactly* — CareScout carries a 2024
  and a 2025 column, and $9,277/mo semi-private for 2024 annualises to
  $111,324 against the row's $111,325. But **CareScout publishes monthly
  medians and the rows state annual ones.** The x12 is the row's arithmetic,
  not the publisher's, and nothing said so.

Neither is fixed by swapping the URL: no archived per-edition link exists in
this repo for either publisher. Both are fixed by the row telling the reader
what they will actually find. The rule is now in `research/README.md`:
**a citation is finished when the row says what the reader will see.**

#### What the review checked and did not find

- **No grade was raised.** Re-verified against the pre-P15 file after both fix
  runs: 12 down, 0 up.
- **No row was added, removed or renumbered**, so nothing collides with
  `§S10`. `diff_seed.py` asserts the id set is unchanged and it holds.
- **Every remaining empty `source_url` is graded below `medium`** — three
  rows, and each says in `notes` why nothing citable exists.
- **The three LTC values now verify against the live publisher**, which is
  more than the section claimed for them when it committed.
- Structure re-checked after each fix run: 80 rows, all 81 lines at exactly 11
  fields, no control bytes, LF only.

#### Carried forward

- ⚠️ **`check_urls.py` is a script, not a gate.** Nothing in the build fails if
  a `source_url` 404s, and one already had. The seed is in
  `src/lib/file-manifest.ts`, so a build-time check could read it — but it
  would need the network, which no other check in this repo does, and a
  network-dependent build gate is a worse problem than the one it solves.
  **Recorded as a decision, not an oversight.**
- ⚠️ **The living-page problem is not fully swept.** Two cases were measured
  because two rows were spot-checked. `cvs.com/minuteclinic/services/price-lists`,
  `officeofbudget.od.nih.gov/`, `cdc.gov/budget/` and the KFF pages are the
  same shape and were not each compared against their row. **Nobody's row
  yet.**

### THE TWO-AXIS CODE REVIEW, AND FIX RUN 3

Pinned at `1460194`, so the diff was the whole section plus the merged LTC
branch. Standards and Spec run as parallel sub-agents. **Fifteen findings,
thirteen of them real**, and the inline review recorded above missed every one
of them — it checked whether the citations resolved and never checked whether
the section's own prose was true.

🛑 **The single worst finding, and it is the campaign's signature defect built
fresh: `R13`'s first declared test cannot fail.** The test is *"no
calibration-class parameter is more than 1 year off the declared base year
without a trend applied"*. This section wrote the definition of
calibration-class — `research/README.md` says `calibration` is a level measured
at the **2023** base year — and then classed `CP-BH-001` (2021) as `benchmark`.
So every row in the class is 2023 by construction, "more than 1 year off" is
unsatisfiable, and **the test passes because nothing can be in its failing
set.** The row's substance was also not done: `CP-BH-001` is still `139.6` at
`2021` and `CP-BH-015`'s 3.27%/yr is still unused, exactly as `R13` says.
Recording the trend in `notes` is a defensible call and was disclosed; **what
was not disclosed is that the check certifying it is empty.**

#### Standards, seven findings

| # | Finding | Verdict |
|---|---|---|
| 1 | `params.ts` and `README.md` both assert `CP-POP-004a`'s note *"has read 'two incompatible measures exist' since it was written"* — **and the same commit deleted that phrase.** Two live claims citing a string their own change removed. | **Real.** Phrase restored to the note, because it was true and load-bearing. |
| 2 | `README.md` stale on arrival: present tense about `equations.ts` text the same commit had already removed. | **Real.** Rewritten to past tense. |
| 3 | 🛑 **`R6` had three sites and the section fixed two.** `research/quality-equation-methodology.md` documented `KPP-A1`'s derivation as *"26.7M uninsured / 334M population"* and graded it **`high`** — the exact defective pairing, in the file explaining the exact equation being corrected. `params.ts:362`'s `utilIncrease` source string carried it too. | **Real, and the most consequential.** Both fixed; grade dropped to `medium-high`. A repo-wide sweep now finds no site pairing the two measures. |
| 4 | `CP-HOSP-001` and `CP-CLIN-001` notes were overwritten wholesale, so both said *"the previous note"* about text that no longer existed, and the figures it held (critical-access and AMC counts; NP and PA headcounts) were **deleted, not relocated**. | **Real.** Restored with their caveats. |
| 5 | The section **added** "and ACA subsidy expiration" to the front-page label while **deleting** its only support — `CP-POP-004b`'s *"likely higher in 2025-2026 with ACA subsidy expiration"*. | **Real, and a sourcing regression on a public page.** Support restored. |
| 6 | 🛑 **The `use_as` rule is unsafe against its own data.** `README.md` said `calibration` rows *"may be summed"*. The class holds `CP-TOT-001` (total NHE) **and** `CP-TOT-004a`-`004f` + `CP-TOT-005`, its own components — summing them double-counts — plus a percent and a per-capita figure that are not summands at all. | **Real.** The rule now states what the column actually guarantees (no row from a year other than 2023) and names both traps. |
| 7 | `CP-OFF-003a`/`003b` were `benchmark` while structurally identical `CP-FIN-015a/b` and `CP-FIN-016a/b` were `trend`. | **Real.** Rule is now forward projection -> `trend`, backward window -> `benchmark`; only those two moved. |

#### Spec, eight findings

Verified clean by the Spec axis first: id set and order identical, no
duplicates, **12 downgrades and 0 upgrades**, zero rows `>= medium` with an
empty `source_url`, zero `year: "recent"`, `use_as` on all 80 rows, and of 48
new or changed URLs only three are absent from `research/01`-`06` — each a
spec-mandated re-source or a fix-run correction.

| # | Finding | Verdict |
|---|---|---|
| 1 | `R13` not done, and its test vacuous. | **Real.** See above. |
| 2 | `R6`'s first declared test not met — the headlines are still string literals. | **Real, already disclosed**, still open. |
| 3 | `R35`'s test not met — the three `BASE2023` categories still untraced. | **Real, already disclosed**, still open. |
| 4 | `R9` half-landed: the spec asks for PERI/Friedman **and** Himmelstein-Woolhandler; only the NEJM DOI is in `source_url`, PERI is a bare string in `notes`. | **Real.** One URL field, two required sources. Left as disclosed; a second URL column is `§S11b`'s call, not a P15 fix. |
| 5 | `R8`'s test has no guard — nothing in `src/` or `tools/` reads `use_as`, or the seed at all. | **Real.** Now stated in `README.md` next to the rule. |
| 6 | 🛑 **Two downgrades drop below the grade their own research file states.** `research/04` grades the hearing-aid figure **Medium-High**; `CP-DVH-002` went to `low-medium`. `research/05` grades the TAA figure **MEDIUM**; `CP-TRN-002` went to `low-medium`. | **Real.** A source hunt was made and failed — `dol.gov` refuses automated fetch, the Mathematica publication URL could not be located, and neither hearing-aid site resolves. **No URL was guessed.** Both notes now open with `DOWNGRADED FOR ABSENCE OF A CITATION, NOT ON THE EVIDENCE` and state the research file's own grade, so the gap is visible instead of inherited. |
| 7 | The entry claimed **six** rows carry a declared span. There are **nine**. | **Real.** Corrected above. |
| 8 | `check_urls.py` and `diff_seed.py` are not in this repo, and the review's load-bearing claims rest on them. | **Half real.** They are committed, to the audit repo at `e89c131` — which the Spec axis could not see, which is precisely the point. This is open item 10 in the handoff, now demonstrated rather than hypothesised: **a reviewer working from the dashboard repo alone cannot reproduce this section's central claims.** |

#### Scope creep, as the Spec axis called it

The two `src/lib/` label edits are creep against *"It touches only `research/`
and `HANDOFF.md`"*. The Spec axis's own judgement is that **the spec is
genuinely self-contradictory here**, since `R5`, `R30` and `R35` all re-target
to `params.ts`. Recorded as deliberate, not as licence. `file-manifest.ts` is a
build consequence; `global.css` came in with the merge.

#### What this review says about the inline one

The inline review recorded above found seven defects and all seven were
citations. It ran `check_urls.py` and read what came back — and it never once
asked whether the section's own prose was true. **Every finding here is in that
blind spot:** a comment citing a deleted string, a README stale against its own
commit, a third site of the defect being fixed, a rule that contradicts the
data it governs, a count that was wrong, and a test that cannot fail. **A
review that only checks the thing the section was careful about will only find
the defects the section was careless about, and those are different sets.**

## P16 — §S10 Namespace separation · 2026-08-27 · branch `nha-remediation`
STATUS: complete — all 7 recommendations resolved
DISCREPANCY: five, all recorded below; in three of them the code won
LANDED: R129, R236, R28, R31, R2, R12, R1 (seed half)
MIGRATED: 80 seed rows -> BL-0001..BL-0080; values changed: 0
MEASURES_STATUS: mapped 27 / unmapped 25 / no-canonical-equivalent 33
LETTER-SUFFIXED: 15 IDs became 15 BL rows under 3 CP parents (4 mapped, 11 no-canonical-equivalent)
CP-GOV-002: resolved to research/05 `RB-05-GOV-007`, NOT to canonical `CP-GOV-007`; percentage/dollar collision recorded in the row itself
RESOLVER: resolveDefinition throws on miss — copied from build_data_phase_targets.py: yes
ADDED: RAND commercial-to-Medicare ratio (2 rows) / HRSA FQHC analogue (2 rows) / CP-GOV-001 as a distribution / institutional-to-home LTC multiplier

**Any ID that resolves to two definitions after the split: zero.** Checked
across all three namespaces by reading the files rather than the loaded
structures, for the reason in `### THE CHECK I WROTE THAT COULD NOT FAIL`
below.

### What the section did

The backlog's original model was *the seed renumbered parameters, so a join by
ID binds the wrong value; remap the seed onto canonical IDs.* That model needed
an authoritative value layer to remap **onto**, and `§AN2` established there
isn't one. Re-measured here and confirmed exactly: **310 canonical rows, 0 with
a value, 0 with a year, 0 with a source.** So the layers were separated instead.

| Prefix | Holds | Lives in | Count |
|---|---|---|---|
| `CP-*` | definitions only | `research/cp_registry_canonical.csv`, sole authority | 310 |
| `BL-*` | measurements: value, year, citation, grade | `research/parameter_baseline_seed.csv` | 85 |
| `RB-0N-*` | evidence: one index per research file | `research/01`–`05` | 187 |

`research/01`–`05` renumbered **313 references over 187 heading definitions**,
resolved to the file that *defines* each id rather than the file it appears in,
which is why `research/01`'s single cross-file reference landed on
`research/03`. Zero references resolved to no research file, so nothing was
guessed. Nine self-tests now hold the separation, taking the registry from
**221 to 230**, and the suite from 488 to **506 across 60 files**.

### 🛑 Five discrepancies. The first is the one that would have caused damage.

**1. `§8.0.3`'s own worked example matches by ID, in the same document that
forbids it.** Point 4 says the six `CP-TOT-004a`–`f` rows "become six `BL-*`
rows each carrying `measures = CP-TOT-004`". Canonical `CP-TOT-004` is **"Public
share of system cost"**. The "NHE by category" reading comes from `research/01`,
which is the *measurement* layer — so the instruction is to bind six spending
categories to a share-of-total parameter, by ID, three points before point 7
says *"map by description, never by ID."* Followed literally it would have
written the section's own defect into six permanent rows. **The code won.** One
of the six maps (hospital care spending to `CP-HOSP-002`, the hospital global
budget total); the other five are `no-canonical-equivalent`, because the
dictionary names no all-payer service-category totals. A test pins this.

**2. `R28`'s "canonical ID" is not a canonical ID.** The prompt says
`CP-GOV-002`'s canonical id is `CP-GOV-007`. In `cp_registry_canonical.csv` —
the file `§8.0.3` names as the sole authority — **`CP-GOV-007` is "Appeal
volume"**. The claim is true of `research/05`'s numbering, now `RB-05-GOV-007`.
Setting `measures = CP-GOV-007` would have bound the CBO single-payer
administrative-cost estimate to a count of appeals: the same
percentage-versus-dollar-amount class of error `R28` exists to stop, committed
while fixing `R28`. **The code won.** `BL-0074` carries `measures` empty,
`measures_status = unmapped`, and the whole correction in its `notes` — because
a correction that lives only in a migration script's comment is not a
correction; the row still ships wrong.

**3. `§AN2` and `§8.0.3` say all 310 canonical entries are "a name, a
definition, and sometimes a unit."** Measured: **a definition on 50 of 310, a
unit on 32.** 260 are a bare name. Only `CP-TOT`, `CP-POP`, `CP-HOSP` and
`CP-CLIN` carry definitions at all. This is why so much of the mapping resolves
to `no-canonical-equivalent` rather than to a judgement: on 260 rows there was
nothing but a name to read.

**4. `§AN4`'s 160 research heading IDs undercounts by 27.** The real figure is
**187**. The 160 counts only plain `CP-<FAM>-NNN` headings; it misses 23 marked
`(NEW, proposed)` / `(proposed)` / `[NEW PARAMETER]` and 4 of the form
`CP-<FAM>-NEW-NNN`. **Sixteen of those 23 mint an ID into an occupied canonical
slot** — `CP-POP-009/010`, `CP-FIN-018/019/020`, `CP-OFF-005/006`,
`CP-UNIT-005`, `CP-RX-014/015`, `CP-DX-009/010/011`, `CP-DVH-009`,
`CP-EMS-009`, `CP-PH-007` — which is the worst class of collision in the set, a
research file deliberately claiming a taken address. ⚠️ **Corrected from twelve
after the first commit.** The probe that produced twelve required the literal
string `NEW` on the heading line, so it never examined the eleven headings
marked only `(proposed)`, four of which collide. A count, wrong, again — and
found by re-deriving it during review rather than by rereading the sentence.
`R31`'s own two parameters are in the sixteen: canonical `CP-RX-015` is "Drug quality failure
cost" and `CP-DX-011` is "DME/supply cost", so **the prompt's instruction to
"add `CP-RX-015`/`CP-DX-011` to the seed" would have created a fresh collision.**
Separation dissolves it: they are `BL-0081` and `BL-0082`, and their evidence is
`RB-03-RX-015` / `RB-03-DX-011`.

**5. I filed a sixth discrepancy and then withdrew it.** A first count put the
research heading namespace at 183 against `§AN4`'s 160. That was my regex, not
the document: it matched every `#` line *containing* a CP id, including summary
tables and cross-referencing headings. The strict count is exactly 160, and
`§AN4` is right about the population it measured. Recorded because a withdrawn
finding is evidence about the method, and this campaign has withdrawn four.

### 🛑 THE CHECK I WROTE THAT COULD NOT FAIL

`R236`'s acceptance criterion is *"no `CP-*` ID resolves to two different
definitions across files."* The obvious implementation iterates
`CP_DEFINITIONS` looking for a duplicate id — **in a Map keyed by that id** —
and iterates the seed rows looking for a `BL-*` bound twice, **after the id
check has already required `BL-*` ids to be unique.** Both failing sets are
empty by construction. I wrote it, it went green, and it was green for the same
reason `R13`'s test was green in P15 and check 20 was green in the audit
harness: **nothing could be in its failing set.**

It was caught by asking the question the P15 handoff says to ask — *after
writing a definition and a check that reference each other, ask whether the two
sides can differ at all* — and specifically by noticing that two of the eight
new checks had no negative test. **The two without a negative test were the two
worth doubting.** That is a usable heuristic and it is now written down.

The rewrite reads the **files** instead of the loaded structures and asks what
`B1` actually asks: does any one string denote two things? A duplicate row in
either CSV, a research heading defined in two files, an identifier living in
two namespaces, or a retired `superseded_id` coming back as a live id all fail.
Both new failure modes were then injected and watched fail.

**Twelve negative tests, `baseline-P16/negative_test.py`.** Each edits one real
file and requires the **named** row to go red, because a check that fails for
someone else's reason has not been tested. All twelve fire; the registry
restores to 230 green.

### The three additions, and a fourth nobody asked for

- **`R31`** — RAND Round 5.1, commercial prices at **254%** of Medicare
  inpatient (`BL-0081`) and **279%** outpatient (`BL-0082`). Two rows, not one
  range: 254 and 279 are two measurements, not two endpoints.
- **`R2`** — the FQHC pull `research/02` called *"the single highest-value
  follow-up data pull"* and nobody had done. **HRSA UDS serves.** `BL-0083`
  carries HRSA's own published figure, **$1,671.85 total accrued cost per
  patient (2025)**, which reproduces exactly from the two other published
  totals on the same page ($54,747,047,587 over 32,746,392 patients).
  `BL-0084` is cost per **visit**, which HRSA does *not* publish: the division
  is the row's arithmetic and the row says so, with both denominators —
  **$379.91** over 144,103,619 clinic-plus-virtual visits, **$437.56** over
  125,120,071 clinic visits alone. `research/02` guessed $200–300 without
  pulling the data. Both derived figures sit above the **top** of that guess,
  by 27 and 46 percent, and above its bottom by 90 and 119 percent — which is
  what the pull was for. ⚠️ **The first wording said only "27 to 46 percent
  higher" and did not name which endpoint**, which reads as a comparison
  against the whole range and is not one. Corrected in the row's `notes` too.
- **`R12`** — `CP-GOV-001` becomes a distribution. New `value_low`,
  `value_high` and `value_type` columns; `BL-0073` is the one
  `contested-range`, 1.3% on the narrow CMS accounting basis to 6.4% fully
  loaded, which is what `RB-05-GOV-001` recommends and what a point estimate
  with a caveat in a notes column could not express.
- **`BL-0085`, which no row asked for.** `R31`'s standing check — *any
  parameter a research file calls most load-bearing or highest-value must
  appear in the seed* — was written, run, and immediately found a **third**
  dropped parameter: `RB-04-LTC-011`, the institutional-to-home cost multiplier
  that `research/04` calls *"the single most important parameter for avoided
  institutionalization savings."* The check earned its place before it was
  committed. Recomputing the multiplier on the seed's own 2024 rows gives
  **2.1–2.5** against `research/04`'s **2.5–3**; the gap is a 2021 home-care
  rate, and the row says so.

### A citation that resolves and does not support its row, again

`RB-05-GOV-006` is *"arguably the single most important calibration number for
NHA governance costs"* by `research/05`'s own words: insurance-administration
overhead at 7.0% of NHE in 2024, 7.5% in 2023. Both URLs it cites **fetch 200
and neither carries the number.** The NHE Fact Sheet has no "net cost of health
insurance" line at all; `files/document/highlights.pdf` is *National Health
Expenditures 2024 Highlights* and covers type of service, sponsor and source of
funds. Verified by extracting the PDF's text, including its UTF-16 literals,
after a first extractor read only the 8-bit ones and produced a clean-looking
miss.

The figure is in the NHE Tables archive — **the same `nhe-tables.zip` that has
been open work since `R35`**. So it is not seeded: seeding it would mean
inventing a citation. It is on `PRIORITY_EXEMPT` with that reason, `research/05`
now carries the measurement inline, and `stalePriorityExemptions()` will fail
the build if the flag ever disappears.

**A related self-correction.** `RB-01-OFF-006` was on `PRIORITY_EXEMPT` for one
run and came off it. My first scanner attributed *"the single most important
open item"* to that parameter when the phrase sits in the **"Summary of
Highest-Priority Gaps" section below it** — the scanner stopped a section body
only at the next `RB-` heading, so it bled across an intervening `##`. Fixed by
stopping at any heading of the same level or shallower, which also removes a
second false positive. **An exemption written on an over-report is a lie with a
reason attached**, and `stalePriorityExemptions()` is what caught it.

### What is enforced now, and what still is not

Nine rows, all negative-tested: the definition namespace is single-authority;
the extract the registry is generated from must agree with it on all 310, which
is what stops that exemption being a free pass; `BL-*` ids are sequential and
unique; `measures` is non-empty **if and only if** `measures_status` is
`mapped`; the resolver throws on both kinds of miss; no identifier resolves to
two definitions; `value_type` carries the band it claims; and every
research-flagged priority parameter is seeded or exempt with a reason. And
`R1`'s seed half is finally gated rather than merely true: a row graded
`medium` or better states where its number came from, and the three honestly
empty rows are counted out loud in the note rather than hidden, which is the
noisy backlog counter the row asked for. **That ninth check was added after the
section was first committed, in the review below** - the section had verified
`R1`'s condition and shipped without enforcing it, which is the difference
between a fact and a guarantee.

⚠️ **Still not enforced: anything needing the network.** A dead `source_url`
still 404s silently. That remains a deliberate decision, not an oversight — a
network-dependent build gate is a worse problem than the one it solves — and
P15's `check_urls.py` plus this section's `negative_test.py` are the manual
halves. ⚠️ **`use_as` is still unenforced** as a summation rule.

### Notes on method

- **`measures` is non-empty if and only if `measures_status` is `mapped`.** An
  analogue relationship is prose in `notes`, where no code can join on it. This
  is the single rule that prevents the recurrence: 57 rows collided because a
  resemblance was recorded somewhere a join could reach it.
- **27 of 85 mapped is the result, and a high number would have been the
  warning.** P15's lesson was that 49/49 was the signal, not the reassurance.
  A migration that mapped everything would have meant mapping by id similarity.
- **`diff_seed.py` rebuilds every prose edit from the pre-P16 text** by
  re-applying only the rewrites `migrate_seed.py` declares, then compares byte
  for byte. It caught two `source_name` changes I had not declared, and the fix
  was to declare them rather than to loosen the column.
- 🛑 **The backslash trap fired twice more, occurrences eight and nine**, both
  in `python -c` inside double quotes — the exact construction the rule
  forbids, written by the session that had just read the rule. Once in a patch
  script whose `assert` then failed loudly, once in a PDF extractor whose regex
  died. **Both were loud. That is luck, not safety**: the seventh occurrence
  silently deleted a section name from the log's own pointer.

### FIX RUN 2: findings 1-5 of the two-axis review, and two the review missed

**2026-08-31.** The two-axis review pinned at `5566f36...HEAD` found sixteen
defects and fixed none — it was interrupted at "Fixing now". This run closes
the first five. Findings 6-16 are open and are the next two runs.

Counts in the `## P16` header above are left as written. They record what P16
shipped, and this entry records what changed since. **`MEASURES_STATUS` is now
`mapped 25 / unmapped 27 / no-canonical-equivalent 33`**, and `### Notes on
method`'s "27 of 85 mapped" is superseded by that, for the reason below.

| # | Defect | Resolution |
|---|---|---|
| 1 | Nine self-test names rendered audit codes in the site footer, breaching golden rule 2 | renamed to reader-facing sentences; the R-numbers stay in the comments, which do not render |
| 2 | `research/quality-equation-methodology.md` cited `RB-01-POP-004a`/`004b`, neither of which has ever existed | corrected to `BL-0015` / `BL-0016`, which is what `params.ts` uses for the same note; gated |
| 3 | `BL-0055` bound an annual private-pay price to a per-resident-day system cost, ~365x apart | `unmapped`, and the row now states the conversion and whose arithmetic it is |
| 4 | Four components and their $2,050B total all bind `CP-FIN-002`; only free-text separated parent from parts | gated, plus `boundCuts()` so the first consumer has a correct path available |
| 5 | `BL-0014`, a 71M single-age-band headcount, bound `CP-POP-003` "Age-risk distribution" | `unmapped`; a band is an input to a distribution, not a measurement of it |

**Three checks added, all four branches negative-tested.** `negative_test.py`
goes from twelve cases to sixteen and every one was watched fail for its own
named row and pass again. The self-test total is **233**, up from 230.

- `renderedSelfTestNameLeaks()` — no self-test name carries an audit code.
- `researchReferenceProblems()` — every `RB-*` reference in the 128-file
  inventory names a heading that exists. 187 defined, 85 referenced elsewhere.
- `multiBindProblems()` — a canonical id bound by more than one row declares a
  disaggregation on every such row and marks at most one as the whole.

#### 🛑 Two findings the two-axis review did not have

**17. A tenth name breached golden rule 2, and the review counted nine.** The
review measured "10 of 230 self-test names carry a doc code, and 9 are mine",
adjudicating the tenth as `KPP-W1`, framework vocabulary. It missed
`selftests.ts:2618`, *"…and are named for §S9b"* — a source-document section
number, the exact class rule 2 names. Sweeping the source rather than reading
the review's list found eleven candidates: those ten, plus three names carrying
`P8`. **`P8` is not a breach**: "Phase 8" is published on five pages, so it is
the plan's language. That judgement is now pinned in a test, because it is the
only judgement in the check and an unpinned judgement is the next defect.

**18. `research/README.md` claimed a verification that had not happened.** It
read *"Each of the nine was broken on purpose and watched fail before it was
trusted."* **That was false the day it was written.** The same session recorded
in the same sitting that two of the nine had no negative test, and the review
then proved three of them cannot fail at all. The paragraph also said "nine"
and listed seven, which is the review's finding 14 — but 14 undersells it: a
wrong count is a typo, and a written claim of verification is the mechanism
that let three unfailable checks read as green for a whole section. Corrected
to eleven, enumerated, with the negative-test coverage stated honestly: ten of
the eleven have a case, the resolver's throw does not, and that is finding 7's
territory.

#### The prediction held, at ten minutes

The handoff said to budget for the pass removing a defect authoring a fresh
one. It did not take a review to find this one: **`researchReferenceProblems()`
flagged its own documentation on its first run.** The doc comment explaining
finding 2 spelled the two dead ids, and the check correctly called that a
citation to a heading that does not exist. It is the same defect wearing the
fix's clothes.

The comment was reworded rather than the check loosened, and the scope note in
`baseline-registry.ts` now says why: the sweep covers the 128 manifest files
under `research/`, `src/` and `tools/`, and deliberately not repo-root
documents, which is what lets *this log* name `RB-01-POP-004a` in the sentence
that explains it. **Stating a check's scope in the check is the answer to
finding 15**, which is the same complaint one level up.

#### Two consequences of the rename that nothing would have caught

- **`baseline-P16/negative_test.py` asserts on self-test names as strings.**
  All twelve cases named rows by their old names, so the rename silently
  invalidated the entire negative-test suite — the one artefact whose whole
  job is to prove the checks can fail. Renaming a rendered string is never
  only a rendering change when something asserts on it. All twelve repointed.
- **The block comment said "These eight rows" when there were nine, and this
  run made it eleven.** It now states no count at all. A count in prose that
  no check maintains is a claim with a half-life, and this block has grown
  twice in five days. That is the review's finding 13, taken early because the
  alternative was shipping it wrong by three instead of by one.

#### The permission that was unsafe against its own data

`migrate_seed.py`'s mapping rule read *"A unit change is allowed (annual vs
per-day)"*. **Its worked example was the defect.** Finding 3 is precisely an
annual figure bound to a per-day parameter, so the rule as written permitted
the thing it was there to prevent, was authored by the same pass that needed
the permission, and was never tested against its own rows. Both the docstring
and `research/README.md` now read: a unit change is allowed only where the row
states the conversion and whose arithmetic it is.

#### Gates

`pnpm test` 513 across 60 files (was 506). `astro check` 0 errors / 0 warnings
/ 1 hint. `astro build` 14 pages. File manifest 128, unchanged. Audit-repo
`check_audit_docs.py` all green. `negative_test.py` 16/16.

**Verified against the built HTML, not the source**: `dist/health/index.html`
renders 233 self-test rows and **zero** carry an audit code. A rendered-output
rule is only closed when the rendered output is what was read.

### FIX RUN 3: findings 6-12, and a harness that could not see three of them

**2026-08-31.** Findings 6, 7, 8 and 12 are checks that cannot fail. Findings
9, 10 and 11 are notes that assert what nothing computed. Four of the seven
were **relayed** by the reviewing agent rather than run, so each was measured
here before it was touched. Two of those measurements changed the finding.

| # | What it was | What it is now |
|---|---|---|
| 6 | `letterSuffixSurvivors()` filtered the parsed seed rows for `/[a-f]$/`, which the position rule empties by construction. It was **not even a build gate** - it lived only in a vitest asserting `[]`. | Reads all three namespaces from the files, and runs as a gate. The room to fail is real: `RB_HEADING` accepts `[0-9]+[a-f]?`, so a suffixed research heading is legal and nothing else forbids it. |
| 7 | Two hardcoded misses, counted. Neither could fail on the data. | The resolver's naming contract over all 85 rows. |
| 8 | A `/^CP-/` clause and a duplicate loop, both strict subsets of the position check. | Deleted. The properties are gated independently, from the FILES, by `idsResolvingToTwoDefinitions()`. |
| 9 | *"all below medium"*, a hardcoded string printed beside the grades that would refute it. | Computed, and it names the exceptions when there are any. |
| 10 | *"310 agree"*, a literal. | `CP_DEFINITIONS.size`. |
| 11 | Four value types named in a fixed sentence whatever the census. | The census. |
| 12 | `blob.includes(f.id)`, a substring match standing in for an identifier comparison. | A token match, both boundaries asserted. |

#### The review was wrong twice, in the direction that matters

**Finding 9's mechanism was a prediction, not a measurement.** The review said
`sourceBacklog()` returns url-less rows *"including, by construction, a
`pending`-exempt `high` one"*. Measured: **no row anywhere carries a `pending`
source_name**, and all three backlog rows are below `medium`. The sentence was
**true**. That does not save it - a hardcoded claim that happens to be true is
the harder case, because reading it confirms it. But the finding's stated cause
was not the actual state, and propagating it would have put a false measurement
in the log.

**Finding 12 is latent, not live.** The review's example was `RB-01-FIN-01`
matching inside `RB-01-FIN-015`. Measured: **no RB id is a strict prefix of any
other**, all four flagged parameters resolve identically under substring and
token matching, and the spurious set is empty. The bug is one heading away from
biting - `RB_HEADING` has no width rule, so `RB-04-LTC-01` is legal - and a
latent defect in a check is still a defect in a check. Fixed, and the negative
test creates the prefix condition rather than pretending it exists.

#### Finding 7 was understated, and the rewrite proves it

The review's complaint was redundancy: both branches true unless a neighbour is
already red. True, and confirmed. But the important half is what **nothing**
tested. `bindProblems` only asks whether `measures` exists in the registry. A
resolver that ignored its argument, bound by position, or fell back to a
default would satisfy it completely and bind all 25 mapped rows to one wrong
parameter - **silently, which is the exact failure the namespace split was done
to end**. The check now asserts `resolveDefinition(row).id === row.measures`
for every row.

Evidence it was not merely tidier: three cases that already existed in
`negative_test.py` now light this row up, and never did before - *an analogue
recorded as a bind*, *a bind pointing at a canonical id that does not exist*,
and *a canonical id defined twice*. A redundant check does not start catching
things.

The two refusal branches are kept, and the comment says exactly what they are
worth: on the data axis they remain subsumed by `bindProblems`; they survive as
protection against a rewrite of the resolver. Stating that is the difference
between the old row and this one.

#### 🛑 The harness was blind to three of the seven findings

Findings 9, 10 and 11 are defects in **notes**, and a note never flips a row's
`ok`. `negative_test.py` watched only the failing set, so no case it could hold
would ever have seen them: all three rows were green the entire time, saying
things nothing had computed. **A proving harness that watches one channel
cannot prove a claim made on the other.**

`NOTE_CASES` is the second channel. A note case requires the named row's note
to **change** and then to **contain the true thing** - both halves, because a
constant passes the content test on its own. Three cases:

- a `pending` row given a `high` grade stays green, and the note must stop
  saying "all below medium";
- a definition removed from the registry but not the extract, and the note must
  report `registry holds 309`;
- the single `contested-range` row retyped, and the note must show
  `contested-range 0` - the vacuity finding 11 named, made visible.

`negative_test.py` is now **20 failure cases and 3 note cases**, and all twelve
registry rows have one. The claim in `research/README.md` moves from "ten of
eleven" to all twelve, which is the first time that sentence has been true.

#### 🛑 The check flagged its own documentation. Again.

Fix run 2 recorded `researchReferenceProblems()` catching the comment that
explained it, and reworded the comment. **It happened again in this run**, in
the finding-12 comment, which cannot explain the defect without showing
`RB-04-LTC-01` inside `RB-04-LTC-011`. Rewording won a round and lost the next
one, which means rewording was not the fix.

Comments in `.ts` and `.astro` are now masked before the sweep, using
`manifest-check.ts`'s existing `maskComments` rather than a second copy of it.
The scope was chosen by measurement, not preference: **code strings stay
swept**, and that is where the real source references live - `params.ts` holds
`parameterId: 'RB-05-GOV-008'` and its kin as data, which go stale silently
when a heading is renamed. Dropping `.ts` entirely would have lost those. The
cost, stated: a stale "see RB-XX-YYY-NNN" in a comment is no longer caught.

#### A tooling trap, and it cost a wrong reading

`grep "^HIT"` over `npx vitest` output **silently drops the first line**: the
first `console.log` shares a line with vitest's `stdout | file > test` banner,
so it does not start at column 0. This produced a count of 2 where the failing
test correctly said 3, and the missing one was in a file the sweep had just
been changed to read. Counts are this campaign's most-failed claim class and
this is a new way to get one wrong. **Grep vitest output with `-o` on the
pattern, or read the assertion instead of the console.** Same family as piping
to `tail`.

#### Gates

`pnpm test` 517 across 60 files (was 513). `astro check` 0 / 0 / 1. `astro
build` 14 pages. File manifest 128. `negative_test.py` 23/23. Audit-repo
`check_audit_docs.py` 35 pass, 0 fail. `dist/health/index.html` renders **234**
rows, zero carrying an audit code.

### FIX RUN 4: findings 13-16, and a second definition source nobody was checking

**2026-08-31.** Findings 13 and 14 were closed as side effects of fix run 2:
the block comment stopped stating a count, and the README paragraph was
enumerated. This run does 15 and 16, and converts 14 from corrected prose into
a gated claim - because a count in prose that no check maintains has a
half-life, and this one had already gone wrong twice.

| # | Status |
|---|---|
| 13 | Closed in fix run 2. The comment said "These eight rows" while nine was already wrong; it now states no count, and the block holds fourteen. |
| 14 | Corrected in fix run 2, **gated here**. It said "nine self-tests gate it" and listed seven. A README cannot resolve this the way a comment can, because there the count IS the claim. |
| 15 | The claim was pointed at the wrong surface. Below. |
| 16 | Nineteen `CP-*` family headings removed from `research/01`-`05`, and the check widened so they cannot come back. |

#### 🛑 Finding 15 was much larger than the review knew

The review said `definitionNamespaceLeaks()` sweeps only markdown headings
under `research/`, and that the README's *"Nothing outside
`cp_registry_canonical.csv` may define a `CP-*` id"* should be scoped down to
match. Scoping it down would have been the wrong repair, because measuring the
claim instead of reading it found this:

**`src/lib/quality-data.ts` carries all 310 CP ids** with `name`, `unit`,
`family` and a `calculation` that is a prose definition. It is a second
registry of the same namespace by any reading, and **two of the 310 names
disagree with the canonical registry**, neither ever seen:

| id | registry and extract | quality catalog |
|---|---|---|
| `CP-TOT-009` | Gross added **framework** spending | Gross added **system** spending |
| `CP-TOT-010` | Gross **framework** savings | Gross **system** savings |

And the sweep that backed the sentence could not have found it in principle:
measured, **its live search space is empty**. Zero markdown headings anywhere
in the repo, exempt files included, match a numbered `CP-*` id. It was a pure
regression gate for a shape already removed - correct, negative-tested, and
nothing to do with the claim printed above it.

**Neither file is hand-editable.** Both are generated: the registry from the
Source Package extract, which `extractDisagreements()` pins it to, and
quality-data from the v2.0.0 document by `tools/extract_quality_catalog.py`.
So the only honest model is not "one file holds the namespace" but **"one file
rules it, and every copy is checked against it"** - the shape the extract's
exemption already had, one file further out. The two divergences are declared
by id with their reason, and `staleMirrorDivergences()` reports a declaration
that has stopped diverging, so the exemption cannot outlive its cause.

#### Finding 16, counted rather than propagated

**Nineteen** family headings, 4+4+2+5+4 across `01`-`05`. The reviewing agent
said twenty and listed nineteen; the handoff caught that and this run counted
it a third time. Nineteen.

They are gone: `## CP-LTC: Long-Term Care` is `## LTC: Long-Term Care`. The
family word survives because it is the same segment the `RB-*` ids underneath
carry - `RB-04-LTC-011` sits under `## LTC:`, and the heading now names its
rows instead of contradicting them. `definitionNamespaceLeaks()` gained a
family pattern, since the numbered one requires a trailing number and was
structurally blind to all nineteen. The research-file-to-CP-family crosswalk
survives in `research/README.md`'s file table, which is one place rather than
nineteen.

#### 🛑 The fix run authored a defect again, and this one hung the build

The new gate-count row first asked
`SELF_TEST_SOURCES.find(s => s.surface === 'baseline-registry.ts').rows()` for
its count - **from inside that very surface**. `rows()` builds every row in the
block including the one asking. It recursed until the process died on a
five-minute timeout, with no error and no failing row: a check written to
enforce honesty about a count, unable to finish counting.

It reads the source text now, which is what `renderedSelfTestNameLeaks` does
one screen up and for the same reason. **A self-test that measures its own
surface cannot execute it.** That is a new entry in the trap list, and it is
the fourth consecutive run in which the pass removing a defect authored one.

#### What is gated now that was not

- The quality catalog agrees with the registry on all 310 names.
- A declared wording divergence that stops diverging is reported.
- No research file heads a section with a `CP-*` id **or family**.
- `research/README.md`'s stated gate count matches the block, in both
  directions - a check that only fires one way lets the README run ahead.

`negative_test.py` is **24 failure cases and 3 note cases**, all green.

#### Gates

`pnpm test` 521 across 60 files (was 517). `astro check` 0 / 0 / 1. `astro
build` 14 pages. File manifest 128. `negative_test.py` 27/27. Audit-repo
`check_audit_docs.py` 35 pass, 0 fail. `dist/health/index.html` renders **236**
rows, zero carrying an audit code.

**All sixteen review findings are now closed.** The remaining item is the
`### THE TWO-AXIS REVIEW` block, and then a third review pinned at these four
fix runs - which four consecutive self-inflicted defects say is not optional.

### THE TWO-AXIS REVIEW

Two reviews, not one. Both ran `code-review` with Standards and Spec as
parallel sub-agents, and this block is the record of both, written late: the
previous handoff asked for it after the first review and four fix runs went by
without it, which is itself the reason the second review had two reviews' worth
of material to find.

**Review 1 — pinned at the P16 section, 2026-08-27. Sixteen findings, all
closed.** What each one was and what closed it is in `### FIX RUN 2`, `### FIX
RUN 3` and `### FIX RUN 4` above, and in `git log 384ef3f..a1c9776`. The shape
worth carrying forward is that the section's own inline review, recorded in
`### 🛑 Five discrepancies` above, found five things and missed all sixteen of
these — it checked whether the work was done and never checked whether the
claims about the work were true.

**Review 2 — pinned at `384ef3f..HEAD`, 2026-08-31, so its diff was fix runs 2,
3 and 4: the work no review had seen. Eleven findings.** Every one is closed
below, in fix run 5.

#### The finding that is the campaign in one line

**A count in a published document was wrong, inside the fix for the previous
review's finding that a count in a published document was wrong, and the gate
written to prevent it was green the whole time.**

`research/README.md` said **fourteen** self-tests gate the seed and then listed
**twelve**. `registryGateCountDrift()` had been written one commit earlier for
exactly this. It compares the spelled word against the row count: 14 == 14,
green. **It never counted the list, which is the half that failed.** The two
halves fail for different reasons — the number drifts when someone edits prose,
the list drifts when someone adds a gate and stops after the number — and a
single check over the easy half reads as coverage of both.

Fixed three ways, because one would not have been enough:

- the enumeration is a **bullet list** now, one gate per line. A
  comma-separated English sentence cannot be counted without guessing what a
  comma means, and a parser that guesses is the next check that cannot fail.
- `registryGateCountDrift()` reports **both** halves, separately.
- the negative harness has **two** cases, one per half. The number half was
  already proved; the list half had never been.

#### Review 2, the eleven

| # | Axis | Finding | Verdict and fix |
|---|---|---|---|
| 1 | both | `research/README.md` says fourteen, lists twelve; the gate cannot see the list. `:207` also carried two stale figures. | **Real, and the worst.** See above. Both `:207` figures corrected — and the case counts were then **removed** rather than corrected, because nothing in this repo can count cases in the audit working set, and finding 13's precedent is to state no count where none can be gated. |
| 2 | Standards | `renderedSelfTestNameLeaks()` sweeps single-quoted names only. | **Real, latent.** Measured: **183 call sites, 179 single-quoted, 3 double-quoted, 1 variable.** The three double-quoted names were clean, which is exactly why nothing showed. All three quote styles are swept; the unreadable remainder is now **counted and printed in the row's own note** by `unsweptSelfTestNameSites()`, and the rendered set is swept in vitest with the shipped list. |
| 3 | Standards | `tests/lib/selftests.test.ts` inlines a three-alternative copy of an eight-pattern production list. | **Real.** `AUDIT_CODE_IN_RENDERED_TEXT` is exported and imported. The five codes the copy passed — `Appendix C`, `OI-014`, `Table 3`, `Section 8`, `S9b` — are named individually in the test, each asserted to hit the shipped list **and** to have passed the deleted copy, so the reason the copy had to go is pinned rather than remembered. |
| 4 | Standards | `health.astro:455` renders a failing row's `note`, and the new notes carry `CP-*`/`RB-*` ids and paths by design. | **Not a live breach** — `astro:build:start` runs `assertSelfTestsPass` before any route is emitted, so a red row stops the build. **But the reason it is not a breach was asserted in five code comments and read by nothing.** Unregister the integration and all five keep reading true. `buildGateWiring()` reads `astro.config.mjs` now: hook present, both asserts called, and the integration actually in `integrations: []`. Three negative cases, plus one in the harness. |
| 5 | Standards | `tests/lib/baseline-registry.test.ts` rebuilds `namesId` without its regex escape and calls it *"the fix itself, exercised"*; the CP projection is rebuilt in three places. | **Real.** `namesIdAsToken()` and `catalogCpParameters()` are exported and used by both sides. The test now also asserts the escape's own behaviour, which the copy could not have caught. |
| 6 | Standards | `manifest-check.ts` gained three functions about the registry surface and README prose, citing a "the scan lives here" convention `.agent-kb/CONVENTIONS.md` does not document. | **Real, and the self-issued half is the real part.** The module header now states the convention in full where a reader of this repo meets it: every check that reads the repo's own text lives in one module because `node:fs` is confined to one module. The local agent knowledge base carries it too. ⚠️ **The first version of this fix cited `.agent-kb/CONVENTIONS.md` from a tracked source comment - and `.agent-kb/` is gitignored, so it was finding 10 committed inside the fix for finding 6.** Caught before commit. The functions stay. |
| 7 | Spec | `### THE TWO-AXIS REVIEW` never written. | **Real.** This block. |
| 8 | Spec | `rename_research_ids.py`'s docstring still states the CP family-header decision that fix run 4 reversed. | **Real.** Retracted in place, with the old text quoted, because that script is the record of what the migration believed. Verified before writing: nineteen headers gone, `CP_FAMILY_HEADING` in place. |
| 9 | Spec | `boundCuts()` is scope creep — exported, unused by the site. | **Real, and kept on judgement.** It is tested, its comment already says it is unused, and it exists so the first consumer of `measures` has a correct path rather than a plausible wrong one. Recording that it was added unasked is the disclosure the finding wanted. |
| 10 | Spec | `research/README.md` cites `baseline-P16/negative_test.py`, which a reader of this repo cannot open, load-bearing for its claim of proof. | **Real, and bigger than the instance.** See below. |
| 11 | Spec | Finding 3 from the Spec side: the negative test should drive the production list. | **Real, same fix.** The rendered-set sweep runs the shipped list; production cannot, because a self-test calling `selfTestSummary()` from inside `selfTestSummary()` recurses. |

#### What sweeping finding 10's class found that the review did not

The review named one unresolvable path citation. Sweeping every backticked
path-shaped token in `research/*.md` found **three of forty**:

- `baseline-P16/negative_test.py` in `research/README.md` — the reported one.
- `baseline-P16/migrate_seed.py` in `research/05_it_governance_rd_transition.md`
  — **the same defect, unreported**, and it is the citation supporting why a
  `high`-graded parameter is exempt from the priority sweep.
- `tools/extract_docx.py` in `research/task_zero_findings.md`, twice — **the
  opposite**. R131 deleted that file on purpose after proving the `.mjs` port
  against it, and the document is a dated record of the pre-port state.

That third one is why the new gate carries an **exemption table with a reason
per entry** rather than a flat rule. A blanket "every cited path resolves"
would have fired on an accurate account of the past and pressed a writer to
falsify it. `staleResearchPathExemptions()` fails when an exempt path comes
back, which is the moment its reason stops being true.

The two real ones are fixed in prose — each citation now says at the point of
citation that the file lives in the audit working set and not in this repo.
**This is the no-remote problem producing a defect in a published document, for
the first time.** It is the nineteenth session in which the audit repo has no
remote.

#### 🆕 A trap this fix run created and caught before it shipped

`sourceText()` memoises by root + path. A negative test that writes two
different broken versions of the same file into one temp directory therefore
**tests the first one twice** — the second read is served from cache. The
build-gate test did exactly this and passed the second assertion for the wrong
reason; it only surfaced because the two cases expected different messages. One
temp root per mutation now, and a scan of every `mkdtempSync` span in `tests/`
confirms no other test reuses a path within one root.

This is a new member of a family the campaign keeps meeting: **a negative test
that proves one case and reports two.**

#### 🆕 Two corrections to the review, and one to the handoff

- The Spec agent said *"181 of the 236 rendered names are covered."* The
  handoff corrected it to 179 of 184. **Both are wrong about the denominator:
  there are 183 call sites.** The 184th `runGuarded(` is the function's own
  declaration. Third consecutive review with a wrong count in it, and the
  correction to the count was also wrong.
- The Standards agent's finding 4 omitted the build gate, so its severity was
  wrong while its direction was right. Recorded because it is the same failure
  mode as the counts: **an agent stated a mechanism without checking whether the
  mechanism exists.**
- The previous handoff's own run instruction, `python
  baseline-P16/negative_test.py` from the dashboard root, **does not work.**
  There is no `baseline-P16/` in the dashboard repo. The harness must be invoked
  by absolute path from the dashboard root, because it mutates files here and
  reads the build here while living there. Same root cause as finding 10.

#### What is gated now that was not

- The README's gate enumeration is counted, not only its spelled number.
- Double- and backtick-quoted self-test names are swept, and the names no
  source sweep can read are counted rather than assumed empty.
- One pattern list, one home; the test cannot drift from production.
- Every backticked path a research file cites resolves, or is exempt with a
  written reason that fails when it stops being true.
- The build gate that makes a rendered note safe is read, including the
  defined-but-never-registered case that no comment could have caught.
- `namesIdAsToken` and `catalogCpParameters` have one implementation each.

#### Deliberately not done

- `boundCuts()` kept. See finding 9.
- The `manifest-check.ts` functions stay where they are. See finding 6.
- The audit working set still has no remote. Two decisions are the user's:
  which account, and private. This is now the direct cause of a defect in a
  published file, not only a reproducibility gap.

#### Gates

`pnpm test` **525 across 60 files** (was 521). `astro check` **0 errors / 0
warnings / 1 hint**. `astro build` **14 pages**, self-tests **239 of 239** (was
236; three rows added). File manifest **128**, unchanged. `negative_test.py`
**31 of 31** (28 failure + 3 note; four cases added, every one watched failing
for its own reason and passing again). Audit working set `check_audit_docs.py`
**35 pass, 0 fail**. `dist/health/index.html` renders **239** rows and **zero**
carry an audit code, swept with the eight-pattern production list rather than
the three-alternative copy that used to stand in for it.

The three added rows are the path-citation sweep, its staleness check, and the
build-gate wiring read. `README.md`'s advertised count moved 236 to 239 in the
same commits, which its own gate required.

---

## P17 — §S11b Live-code sourcing & confidence · 2026-08-31 · branch `nha-remediation`
STATUS: partial. The premise pass is complete; `R138` and `R135` have landed.
`R218`, `R252` and `R130` are the sourcing work still open.

DISCREPANCY: **five of seventeen recommendations rest on premises the code
contradicts.** Each is below with what was measured. In every case the code
wins, per Standing Order 0.

LANDED: `R138`, `R135`
URLS: 9 backfilled? **yes** - eight cited against verified page content, one
downgraded because no source for it exists. Remaining `url:""` in
`params.ts`: **8**, every one graded `low` and saying why.

### Entry gate

1. `## P1` `STATUS: complete` ✓
2. `grep -c 'url: ""' src/lib/params.ts` → **16**, not the nine the gate names.
   **Reconciled, and both numbers are right for different questions:** 16 is
   every parameter with an empty `url`; `R135`'s nine is the `medium`-graded
   subset, which is what the prompt's own body says two paragraphs on. Measured
   through the module rather than by grep: 32 parameters, 16 with no URL, split
   **9 `medium` / 7 `low`**, and the nine are exactly the nine the prompt names.
   The P17 handoff had already reached this; it is re-derived here rather than
   carried, because the campaign's most-failed claim class is counts.
3. `astro build` passes ✓ · `git status` clean ✓

### 🛑 The five premises that did not survive measurement

**`R124` — already done.** *"Register `0.28`. `taxFeedback = wageGain * 0.28`
sourced only to a code comment citing CBO convention. `R21` lists ten literals;
this is the eleventh."* Measured: `model.ts:399` reads
`wageGain * WAGE_TAX_FEEDBACK_RATE`, and `wageTaxFeedbackRate` is in
`ENGINE_CONSTANTS` graded `medium` **with a URL**. There is no `0.28` literal
in `model.ts` or `taxmodel.ts`. Registered in `§S6a`; nothing to do.

**`R241` — one real site of three.** *"Register `0.27`, now in three modules."*
Measured, per module:
- `overview.ts:88` — `0.27 * 5300` and `0.27 * baseMature`. **Real, and
  unregistered.** This is the one.
- `params.ts:975, :979` — inside a comment that derives the household sponsor
  share as `1314/4866.5 = 0.2700`. Not a literal; it is the explanation of why
  there is no literal.
- `taxparams.ts:257` — `t9999: 0.27`, a distributional bracket rate. **A
  different quantity that happens to equal 0.27.** The audit matched on the
  digits.

**`R254` — the claim it quotes does not exist.** *"`rollout.astro` states the
plan explicitly does not invent phase shares or straight-line the total ...
One of the two sides is wrong."* Measured: `grep -rn "invent" src/` returns no
such sentence anywhere, and `grep -rni "phase share" src/` returns nothing at
all. What `rollout.astro:116` actually says is that transition cost *"is not
straight-lined: the model carries an annual outlay profile"* — which asserts
that `transitionShape` exists and is doing exactly what it does. **The page and
the code agree.** The residual real point is different and smaller: those twelve
fractions have no source, and `model.ts:655` gates only that they sum to 1.

**`R51` — stale.** *"`medications.ts` has no sources at all: none for `717.9`,
none for anything."* Measured through the module: **200 of 200 families carry a
`source` and a `confidence`** (185 `high`, 15 `medium`). `R174` in `§S7` did
this. `ALL_DRUG_SPEND_2024 = 717.9` carries a fifty-line provenance comment.
What remains open is the 52 scenario overrides, which the "Done when" also names.

**`R138` — backwards, and this one mattered.** See below.

### `R138`: the vocabulary the recommendation would have thrown away

*"`PARAM_DEFS` uses `high`/`medium`/`low`; `OUTCOME_STATS` invents `medium-high`.
Pick one and enforce it."* Read as written, that says standardise on three.

Measured first:

| Surface | Grades in use |
|---|---|
| `params.ts` `PARAM_DEFS` | high 3 · medium 19 · low 10 |
| `params.ts` `ENGINE_CONSTANTS` | medium 1 · low 6 |
| `params.ts` `OUTCOME_STATS` | medium 2 · **medium-high 1** · **low-medium 1** |
| `medications.ts` `FAMILIES` | high 185 · medium 15 |
| `research/parameter_baseline_seed.csv` | high 47 · **medium-high 17** · medium 17 · **low-medium 2** · low 2 |

🛑 **The seed grades nineteen of its eighty-five rows on the two hyphenated
levels, and `SOURCED_GRADES = ['high', 'medium-high', 'medium']` in
`baseline-registry.ts` has gated "a row graded medium or better states where its
number came from" against `medium-high` since P15.** So `medium-high` is not an
invention of `OUTCOME_STATS`; it is the project's own scale with a build gate
behind it, and `PARAM_DEFS`'s three grades are the narrow surface.

**Enforcing high/medium/low repo-wide would have re-graded nineteen sourced seed
rows — a substantive change to what the project claims about its own evidence,
carried out under the description of a vocabulary cleanup.** The recommendation
also under-counts: `OUTCOME_STATS` uses two hyphenated grades, not one.

Landed the other way round. `CONFIDENCE_GRADES` in `model-types.ts` declares the
five levels **in order**, `Confidence` is its type, `ParamDef.confidence` is
typed from it instead of restating three, `SOURCED_GRADES` is now
`CONFIDENCE_GRADES.slice(0, 3)` rather than a second list, and `isConfidence` /
`isSourcedGrade` are the one place a string from a CSV column or a generated
catalog becomes a grade. A self-test sweeps `PARAM_DEFS`, `ENGINE_CONSTANTS`,
`OUTCOME_STATS`, `FAMILIES` and every seed row against the scale, and fails if
`SOURCED_GRADES` drifts from the scale's head.

`ltc.ts` is not swept: `§BV10` makes its per-figure grades the model for the
rest, and they are typed at their declarations rather than gathered into a list
a check could read. Stated rather than left as an unexplained absence.

### Recorded, not fixed

- **`R135`, the nine URLs.** All nine name real studies in prose — Himmelstein,
  CDC NHAMCS, SAMHSA NSDUH, PhRMA/CBO, MedPAC/CMS GME, Saez–Zucman, GADCS, TFAH.
  It is transcription, and it needs the network. The seven `low`-graded ones are
  a separate question: the P17 handoff's instruction to **re-measure rather than
  carry them forward** still stands.
- **`R115`, the ten uncontrolled records.** Confirmed by arithmetic: the live
  catalog is **440** (45 KPP + 85 TPP + 310 CP) against the extractor's 430
  (41 + 79 + 310), so ten records were added by hand. P0's correction is right
  on both halves — **no record carries a `basis` field**, and no record carries
  a `2026-08` string — so nothing identifies *which* ten. Three records already
  say `provisional`. Identifying the ten needs a diff against extractor output,
  and `R220` in P18 and `§S16` must land on the same words.
- **`R160`** is three pages, not one: `health.astro:366`, `quality.astro:222`
  and `hardening.astro:262` all point *"Sources and methodology"* at the
  repository root.
- **`R252`** is live: `equations.ts:466` carries `n(15000, 'controlled
  certified-unit count at maturity')` with no source.
- **`R145`** is live: `rents` is `enabled: true` in all three goal scenarios.
- `R125`, `R264`, `R68`, `R218`, `R130`, `R257`, `R16` not started.

### Gates

`pnpm test` **526 across 60 files**. `astro check` **0 / 0 / 1**. `astro build`
**14 pages**, self-tests **240 of 240**. File manifest **128**.
`negative_test.py` **32 of 32** (29 failure + 3 note). `README.md` advertises
**240**, moved by its own gate.

### Method note

Five wrong premises in seventeen rows is the highest rate this campaign has
measured in one section, and every one of them was cheap to check and expensive
to have implemented. `R138` is the sharp case: implemented as written, it would
have looked like tidying and been a re-grading of nineteen sourced rows.
**Measure the premise. The recommendation is a hypothesis about the code.**

### R135: the nine URLs, and the two citations that did not carry their numbers

Nine parameters graded `medium` carried `url: ""`. The prompt calls this
transcription rather than research, and it mostly was - the seed CSV and
`research/01`-`05` already held the citations. What it was not is a copy job,
because **two of the nine were pointing at the wrong source and one of them had
no source to point at.**

Every URL below was verified against the page's own content, not its status
code. That distinction is not ceremony here: it is the third time in this
campaign that a citation has resolved, been topically right, and not carried
its number.

| Parameter | Citation | How it was verified |
|---|---|---|
| `governanceRate` | SSA administrative expenses by trust fund | Read the page. It carries the ratio the parameter is: *"one percent or less of combined cost"* since 1989, and the 0.3% / 1.9% split brackets the 0.5-1.4% band. Chosen over the HHS OIG and GAO analogues because those are dollar budgets for differently-scoped bodies, and this parameter is a rate. |
| `careModelSavings` | CDC/NCHS ED visit estimates (NHAMCS) | Read the page. Right source for the 155M visit count. |
| `lowValueCapture` | **none, and downgraded to `low`** | See below. |
| `bhExpansion` | SAMHSA 2023 NSDUH annual national report | 200, title matches, needles hit. |
| `dvhExpansion` | CMS NHE fact sheet | 200, carries the dental category. |
| `emsPhExpansion` | CMS Ground Ambulance Data Collection System | 200, title matches. |
| `rdPublic` | CBO, *Research and Development in the Pharmaceutical Industry* | **Verbatim**: *"In 2019, the pharmaceutical industry spent $83 billion dollars on R&D."* |
| `workforceEdu` | the study summary carrying the PRA range | **Verbatim**: `105,761`, `182,233` and the `$150,000` mark all present. |
| `wealthCollectionEff` | Saez-Zucman memo to Sen. Warren | **Verbatim**: *"households subject to the wealth tax are able to reduce their tax liability by 15% through a combination of tax evasion and tax avoidance"* - which is the 85% the parameter cites. |

`cbo.gov`, `ssa.gov` and `cdc.gov` all refuse automated fetch with 403, so those
three were read in a browser rather than by `curl`. **A 403 is a bot block and
not a dead link**, which `baseline-P15/check_urls.py` already says; what it does
not do is tell you whether the page carries the figure, and for `rdPublic` that
turned out to be the whole question.

### 🛑 `workforceEdu`: the source did not contain the number

`research/02`'s `RB-02-EDU-001` attributed the **$105,761-$182,233** per-resident
amount range to a named MedPAC contractor report, and `params.ts` carried the
attribution forward as *"$100-180k/resident/yr (CMS/MedPAC)"*.

**It is not in that report.** Fetched and extracted whole - 94 pages, 231,000
characters, so extraction plainly worked - and neither figure appears in any
formatting, with or without the comma, and neither does the `$150,000` mark.
The report is topically correct: it discusses per-resident amounts at length and
has a table of them. Its own PRAs run about **$57k to $150k**, which does not
support the `$100-180k` range either.

All three numbers are in the Fierce Healthcare summary `research/02` lists
separately for a different figure. Both files are corrected: `params.ts` cites
what carries the range, and `research/02` carries the correction at the row,
with the measurement rather than an assertion.

⚠️ **This is the same shape as `RB-05-GOV-006`, where two URLs fetch 200 and
neither carries the "net cost of health insurance" figure.** Twice now the
defect has been a citation that a reader would accept and a fetcher would pass.
A URL check that reads status codes cannot find either one.

### `lowValueCapture`: downgraded rather than given a URL that fits

The parameter is the **share** of low-value care that a records mesh and
protocol stewardship actually remove. The waste literature sizes the pool -
`lowValuePool` is $75.7-101.2B/yr with a real citation - and does not estimate
what fraction of it any intervention removes.

So there was a URL available that would have looked right and been wrong: the
pool's own source. Attaching it would have produced exactly the defect above,
authored deliberately. **Graded `low` instead, with the search recorded in the
prose so the next pass does not repeat it**, following the seed's precedent
where a hearing-aid row was *"DOWNGRADED FOR ABSENCE OF A CITATION, NOT ON THE
EVIDENCE."*

⚠️ This has a consequence worth naming: `§BT4` says the FMEA borrows cost-
parameter likelihood from the confidence grade, so a downgrade moves a published
risk ranking. That is the honest direction - the grade now reflects the evidence
- and it is `R264`'s territory, which is still open.

### Three attributions corrected in passing

The nine parameters' `source` strings are rendered on the Healthcare chapter, so
they are reader prose under golden rule 2 and a wrong attribution there is
published. Three were compressing two or three sources into one parenthetical:

- `careModelSavings` read *"155M ED visits x $2,453 avg (CDC NHAMCS)"*. The
  **$2,453 is Peterson-KFF, not CDC** - the seed row for this same pair was
  corrected for precisely this in P15, and `params.ts` had not been.
- `dvhExpansion` cited three figures as one. Dental is CMS; vision is a Vision
  Council industry estimate including non-medical eyewear; **the $4,672
  hearing-aid figure has no primary source located at all**, which its seed row
  already records.
- `rdPublic` read *"(PhRMA/CBO)"* across a `$83-105B` band whose two ends come
  from differently-scoped counts.

Each now says which figure the citation covers and which it does not.

### The check `params.ts` did not have

The prompt said `params.ts` needs the seed's ninth check and does not have it,
and to copy the shape rather than design a new one. `unsourcedGradedParameters()`
fails the build on a parameter graded `medium` or better with no `url`;
`parameterSourceBacklog()` prints the honestly-uncited ones by id, because a bare
pass hides a gap.

**Eight parameters remain with no URL and all eight are graded `low`.** That is
the state the rule permits and the note names them, so the number can go down
rather than disappear.

`URLS: 9 backfilled? yes (8 cited + 1 downgraded); remaining url:"" in
params.ts: 8, all below medium` - the exit protocol's target of 0 covers those
eight too, and they are the `low`-graded set P17's handoff says to re-measure
rather than carry forward.

### Gates

`pnpm test` **527 across 60 files**. `astro check` **0 / 0 / 1**. `astro build`
**14 pages**, self-tests **241 of 241**. `negative_test.py` **33 of 33**, the new
case watched failing: re-grading `lowValueCapture` back to `medium` turns the row
red, which is the exact defect the rule forbids.
