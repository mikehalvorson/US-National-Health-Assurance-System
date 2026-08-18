/* =========================================================================
 * Overview "View as table" data tables: pure builders + a small DOM helper.
 * Ports the path/bridge/financing tables from docs/js/app.js (renderPathTable
 * 213-232, the bridge table 292-308, the financing table 344-363). Column 0
 * is text; columns >= 1 are numeric (get class="num").
 * ========================================================================= */
import { money, moneyShort } from './format';
import { bridgeSteps } from './bridge';
import { MATURE_INDEX, MONEYFLOW } from './params';
import type { MonteCarloResult } from './model-types';

export interface TableData {
  head: string[];
  rows: string[][];
}

export function renderDataTable(tableEl: HTMLTableElement, data: TableData): void {
  tableEl.innerHTML = '';
  const thead = tableEl.createTHead().insertRow();
  data.head.forEach(function (h, i) {
    const th = document.createElement('th');
    th.textContent = h;
    if (i) th.className = 'num';
    thead.appendChild(th);
  });
  const tb = tableEl.createTBody();
  data.rows.forEach(function (r) {
    const row = tb.insertRow();
    r.forEach(function (cellText, i) {
      const c = row.insertCell();
      if (i) c.className = 'num';
      c.textContent = cellText;
    });
  });
}

/* app.js:213-232 */
export function pathTableData(mc: MonteCarloResult, DEF: number): TableData {
  return {
    head: ['Year', 'Status quo', 'NHA p10', 'NHA median', 'NHA p90'],
    rows: mc.years.map(function (yr, i) {
      return [
        String(yr),
        money(mc.baseline[i] * DEF),
        money(mc.yearBands[i].p10 * DEF),
        money(mc.yearBands[i].p50 * DEF),
        money(mc.yearBands[i].p90 * DEF)
      ];
    })
  };
}

/* app.js:292-308 */
export function bridgeTableData(mc: MonteCarloResult, DEF: number): TableData {
  const { steps } = bridgeSteps(mc);
  return {
    head: ['Component', 'Effect (2024$)'],
    rows: steps.map(function (s) {
      const v = s.value * DEF;
      const amount = (s.kind === 'total' ? '' : (v >= 0 ? '+' : '−')) + money(Math.abs(v));
      return [s.label, amount];
    })
  };
}

/* app.js:344-363 */
export function financingTableData(mc: MonteCarloResult, DEF: number): TableData {
  const t = MATURE_INDEX;
  const d = mc.modePath.detail[t];
  const need = d.pubCost;
  const fedUse = Math.min(d.fedRedirect, need);
  const stateUse = Math.min(d.stateMoe, Math.max(0, need - fedUse));
  const empUse = Math.min(d.empContrib, Math.max(0, need - fedUse - stateUse));
  const fbUse = Math.min(d.taxFeedback || 0, Math.max(0, need - fedUse - stateUse - empUse));
  const newRev = Math.max(0, need - fedUse - stateUse - empUse - fbUse);
  const rows: [string, number][] = [
    ['Total public cost', need],
    ['Redirected federal spending', fedUse],
    ['State maintenance-of-effort', stateUse],
    ['Employer contribution', empUse],
    ['Income/payroll tax on wages passed through from employer savings', fbUse],
    ['New revenue needed', newRev],
    ['...of which the wealth-tax package could cover', Math.min(newRev, d.wealthRevenue)]
  ];
  return {
    head: ['Source (mature year 2041)', 'Amount (2024$)'],
    rows: rows.map(function (r) { return [r[0], money(r[1] * DEF)]; })
  };
}

/* app.js:547-573 renderSponsorTable (static CMS 2023 sponsor map). No num
   cells (unlike the other tables); rendered at build time. */
export function sponsorTableData(): TableData {
  return {
    head: ['Who pays', '2023 amount', 'Share', 'What it consists of'],
    rows: MONEYFLOW.sources.map(function (s) {
      const notes = MONEYFLOW.ribbons
        .filter(function (r) { return r.from === s.id; })
        .map(function (r) {
          const ch = MONEYFLOW.channels.filter(function (c) { return c.id === r.to; })[0];
          return ch.label + ' ' + moneyShort(r.value) + ' (' + r.note + ')';
        });
      return [
        s.label,
        money(s.value),
        String(Math.round(100 * s.value / MONEYFLOW.total)) + '%',
        notes.join('; ')
      ];
    })
  };
}
