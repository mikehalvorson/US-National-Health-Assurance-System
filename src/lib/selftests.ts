/* Build-time self-test aggregator: reconciles the model self-tests
   (selfTest, {name,ok,note}), the bridge-decomposition identity check
   (bridgeSteps().identityError), and the tax invariants (TAX_SELFTESTS,
   {name,run}) into one flat list. Port of docs/js/app.js renderSelfTests
   (608-641) minus the DOM. Runs at build time; pure. */
import { selfTest } from './model';
import { runOverviewMc } from './overview';
import { bridgeSteps } from './bridge';
import { TAX_SELFTESTS } from './taxmodel';

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

function buildSummary(): SelfTestReport {
  const rows: SelfTestRow[] = selfTest().map(function (r) {
    return { name: r.name, ok: r.ok, note: r.note || '' };
  });

  const mc = runOverviewMc('SCN-BASE', null);
  const identityError = bridgeSteps(mc).identityError;
  rows.push({
    name: 'Bridge decomposition matches engine total exactly',
    ok: identityError < 0.01,
    note: 'err=' + identityError.toExponential(1)
  });

  for (const t of TAX_SELFTESTS) {
    let ok = false;
    let note = '';
    try { ok = !!t.run(); } catch (e) { note = String(e); }
    rows.push({ name: t.name, ok: ok, note: note });
  }

  const passed = rows.filter(function (r) { return r.ok; }).length;
  return { rows: rows, passed: passed, total: rows.length };
}
