/* Build-time self-test aggregator: reconciles the model self-tests
   (selfTest, {name,ok,note}), the bridge-decomposition identity check
   (bridgeSteps().identityError), and the tax invariants (TAX_SELFTESTS,
   {name,run}) into one flat list. Port of docs/js/app.js renderSelfTests
   (608-641) minus the DOM. Runs at build time; pure. */
import { selfTest } from './model';
import { runOverviewMc } from './overview';
import { bridgeSteps } from './bridge';
import { TAX_SELFTESTS } from './taxmodel';
import { selfTestEveryRelevantPhase, selfTestNoRegression } from './phase-targets';
import { QUALITY_DATA } from './quality';
import { equationSelfTests } from './equations';

export interface SelfTestRow { name: string; ok: boolean; note: string }
export interface SelfTestReport { rows: SelfTestRow[]; passed: number; total: number }

/* R152 [§S0]: the build gate. selfTestSummary reports; this one refuses.
   Called from astro.config.mjs's astro:build:start hook, so a broken invariant
   stops the build before any page is emitted rather than rendering as a red row
   in the footer of a site that ships anyway. */
export function assertSelfTestsPass(summary: SelfTestReport): void {
  const failed = summary.rows.filter(function (r) { return !r.ok; });
  if (!failed.length) return;
  throw new Error(
    'Self-tests failed: ' + failed.length + ' of ' + summary.total + '.\n' +
    failed.map(function (r) {
      return '  - ' + r.name + (r.note ? '  (' + r.note + ')' : '');
    }).join('\n')
  );
}

/* Pure and deterministic (the Monte Carlo is seeded), so the result is cached:
   the build gate and the footer panel would otherwise each pay for a 600-draw run. */
let cached: SelfTestReport | null = null;

export function selfTestSummary(): SelfTestReport {
  if (cached) return cached;
  cached = buildSummary();
  return cached;
}

/* R154 [§S0]: the one runner. Every registered surface goes through this, so a
   throw becomes a named failed row instead of taking down the whole summary.
   Before this, only the tax loop was wrapped: a throw in selfTest() or
   bridgeSteps() rendered NO self-test section at all, which reads as success. */
export function runGuarded(
  name: string,
  run: () => { ok: boolean; note?: string }
): SelfTestRow {
  try {
    const r = run();
    return { name: name, ok: !!r.ok, note: r.note || '' };
  } catch (e) {
    return { name: name, ok: false, note: 'threw: ' + String(e) };
  }
}

function buildSummary(): SelfTestReport {
  const rows: SelfTestRow[] = [];

  /* model.ts — selfTest() returns its own array of {name, ok, note}. Guard the
     call itself, so a throw before the array is built is still a reported row. */
  const modelRows = runGuardedList('model self-tests', function () {
    return selfTest().map(function (r) {
      return { name: r.name, ok: r.ok, note: r.note || '' };
    });
  });
  rows.push(...modelRows);

  rows.push(runGuarded('Bridge decomposition matches engine total exactly', function () {
    const identityError = bridgeSteps(runOverviewMc('SCN-BASE', null)).identityError;
    return { ok: identityError < 0.01, note: 'err=' + identityError.toExponential(1) };
  }));

  for (const t of TAX_SELFTESTS) {
    rows.push(runGuarded(t.name, function () { return { ok: !!t.run() }; }));
  }

  /* R153 [§S0]: phase-targets.ts's two tests. Third harness shape — a bare
     predicate taking the catalog — which is why selftests.ts never picked them
     up. They are the only coverage of the module that generates the published
     phase trajectories. */
  rows.push(runGuarded('Every relevant phase carries a target', function () {
    return { ok: selfTestEveryRelevantPhase(QUALITY_DATA) };
  }));
  rows.push(runGuarded('Phase targets show no regression toward maturity', function () {
    return { ok: selfTestNoRegression(QUALITY_DATA) };
  }));

  /* R230 [§S0]: the equation layer's only test surface. Asserts coverage (every
     catalog parameter has an EQUATIONS entry), acyclicity and finiteness from
     each metric's _phaseStart, and maturity closure at P8. It ran under vitest
     and nowhere else, so it could not stop a deploy. Its messages carry the
     failing IDs, so they belong in the row note. */
  rows.push(runGuarded('Equation layer: coverage, acyclicity and P8 closure', function () {
    const r = equationSelfTests(QUALITY_DATA);
    return { ok: r.ok, note: r.messages.join('; ') };
  }));

  const passed = rows.filter(function (r) { return r.ok; }).length;
  return { rows: rows, passed: passed, total: rows.length };
}

/* A surface that yields many rows at once. If it throws before producing them,
   report one failed row naming the surface rather than losing all of them
   silently — losing them would shrink `total`, which nothing would notice. */
function runGuardedList(name: string, run: () => SelfTestRow[]): SelfTestRow[] {
  try {
    return run();
  } catch (e) {
    return [{ name: name, ok: false, note: 'threw: ' + String(e) }];
  }
}
