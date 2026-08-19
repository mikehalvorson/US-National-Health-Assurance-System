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
STATUS: complete — all 12 rows landed across 9 commits (`R214`+`R296` as one, `R173`+`R204` as
one, `R174`+`R175`+`R176` as one), plus 4 new findings, plus 1 self-inflicted defect found and
fixed by the repo's own gates

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
- **CONTRADICTIONS:** five, `D68`–`D72`. Two are the audit contradicting the code, two are the
  code contradicting itself, and one is a row whose checkable claim is unsatisfiable.

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
