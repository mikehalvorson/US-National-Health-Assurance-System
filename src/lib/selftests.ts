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

export function selfTestSummary(): { rows: SelfTestRow[]; passed: number; total: number } {
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
