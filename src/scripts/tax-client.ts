/* Tax tab client: financing scenario picker, editable instruments, programs,
   and the revenue/distribution charts. Port of docs/js/taxapp.js (tax logic
   only; SPA showView/tab-wiring/story-nav are handled by Astro's multi-page
   navigation). The healthcare financing path (NHA._healthPath in app.js) is
   computed once at load from the model's SCN-BASE default, matching the
   Overview default; cross-tab live re-coupling is inherently out of scope in
   the multi-page split. Runs on astro:page-load; idempotent via the
   instrument host's dataset.wired guard. */
import { runOverviewMc } from '../lib/overview';
import { DEFLATOR_2023_TO_2024 } from '../lib/params';
import { defaultSettings, instrumentRevenue, compute, distribution, solveScenario } from '../lib/taxmodel';
import { INSTRUMENTS, PROGRAMS, SCENARIOS, WEALTH_DIST, makeCustomProgram } from '../lib/taxparams';
import { money } from '../lib/format';
import {
  renderRevenueNeedChart, renderNetImpactChart, renderRateCurve,
  renderTopRateChart, renderWealthChart, renderSaveVsPayChart
} from '../lib/tax-charts';
import type { TaxSettings, TaxProgram, DistributionRow } from '../lib/tax-types';

function $(id: string): HTMLElement | null { return document.getElementById(id); }

interface HealthPath { years: number[]; newRevenue: number[]; relief: number[]; wageGain: number[] }

/* ---- state ---- */
let settings: TaxSettings = defaultSettings();
let customPrograms: TaxProgram[] = [];
let distYear = 2041;
let distMode = 'dollars';
let activeScenario = 'goal-top';
let nhaEnabled = true;
let healthPath: HealthPath | null = null;

/* ---- health link (computed once from the model's default path) ---- */
function buildHealthPath(): void {
  const mc = runOverviewMc('SCN-BASE', null);
  const DEF = DEFLATOR_2023_TO_2024;
  healthPath = {
    years: mc.years.slice(),
    newRevenue: mc.modePath.detail.map(function (d) { return d.newRevenue * DEF; }),
    relief: mc.modePath.detail.map(function (d) { return d.householdRelief * DEF; }),
    wageGain: mc.modePath.detail.map(function (d) { return (d.wageGain || 0) * DEF; })
  };
}
function healthNeed(year: number): number {
  const hp = healthPath;
  if (!hp) return PROGRAMS[0].need(year); /* fallback path */
  const i = hp.years.indexOf(year);
  return i >= 0 ? hp.newRevenue[i] : 0;
}
function healthRelief(year: number): number {
  const hp = healthPath;
  if (!hp) return 0;
  const i = hp.years.indexOf(year);
  return i >= 0 ? hp.relief[i] : 0;
}
function healthWage(year: number): number {
  const hp = healthPath;
  if (!hp || !hp.wageGain) return 0;
  const i = hp.years.indexOf(year);
  return i >= 0 ? hp.wageGain[i] : 0;
}

function activePrograms(): TaxProgram[] {
  const nha: TaxProgram = {
    id: 'nha', label: PROGRAMS[0].label, builtin: true,
    enabled: nhaEnabled, need: healthNeed,
    source: PROGRAMS[0].source
  };
  return [nha].concat(customPrograms);
}

/* ---- controls ---- */
type CardWithUpdate = HTMLElement & { _updateRev?: () => void };

function buildInstrumentControls(): void {
  const host = $('tax-instruments');
  if (!host) return;
  host.innerHTML = '';
  INSTRUMENTS.forEach(function (ins) {
    const st = settings.instruments[ins.id];
    const card = document.createElement('div') as CardWithUpdate;
    card.className = 'tax-ins';

    const head = document.createElement('div');
    head.className = 'tax-ins-head';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = st.enabled;
    cb.setAttribute('aria-label', 'Enable ' + ins.label);
    const name = document.createElement('span');
    name.className = 'name'; name.textContent = ins.label;
    const rev = document.createElement('span');
    rev.className = 'rev';
    head.appendChild(cb); head.appendChild(name); head.appendChild(rev);
    card.appendChild(head);

    const desc = document.createElement('div');
    desc.className = 'desc-sm';
    desc.textContent = ins.desc + (ins.defaultNote ? ' (' + ins.defaultNote + ')' : '');
    card.appendChild(desc);

    const row = document.createElement('div');
    row.className = 'row2';
    let slider: HTMLInputElement | null = null;
    if (ins.kind === 'scale') {
      slider = document.createElement('input');
      slider.type = 'range'; slider.min = '0'; slider.max = String(ins.scaleMax);
      slider.step = '0.05'; slider.value = String(st.value);
      slider.setAttribute('aria-label', ins.label + ' scale');
      row.appendChild(slider);
    } else {
      const spacer = document.createElement('span');
      spacer.style.flex = '1'; row.appendChild(spacer);
    }
    const phaseLab = document.createElement('span');
    phaseLab.textContent = 'starts';
    const phase = document.createElement('input');
    phase.type = 'number'; phase.className = 'phase-inp';
    phase.min = '2027'; phase.max = '2042'; phase.value = String(st.phaseStart);
    phase.setAttribute('aria-label', ins.label + ' start year');
    row.appendChild(phaseLab); row.appendChild(phase);
    card.appendChild(row);

    function updateRev(): void {
      const r = instrumentRevenue(ins, st, distYear);
      rev.textContent = st.enabled && st.value > 0 ? money(r) + '/yr' : 'off';
    }
    card._updateRev = updateRev;
    updateRev();

    cb.addEventListener('change', function () {
      st.enabled = cb.checked;
      if (ins.kind === 'toggle') st.value = cb.checked ? 1 : 0;
      refresh();
    });
    if (slider) slider.addEventListener('input', function () {
      st.value = parseFloat(slider!.value);
      st.enabled = st.value > 0 ? cb.checked : st.enabled;
      refresh();
    });
    phase.addEventListener('change', function () {
      const v = parseInt(phase.value, 10);
      if (v >= 2027 && v <= 2042) { st.phaseStart = v; refresh(); }
    });

    host.appendChild(card);
  });
}

function buildProgramList(): void {
  const host = $('program-list');
  if (!host) return;
  host.innerHTML = '';
  activePrograms().forEach(function (p) {
    const row = document.createElement('div');
    row.className = 'program-row';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = p.enabled;
    cb.setAttribute('aria-label', 'Enable program ' + p.label);
    cb.addEventListener('change', function () {
      if (p.builtin) nhaEnabled = cb.checked; else p.enabled = cb.checked;
      refresh();
    });
    const lab = document.createElement('span');
    lab.className = 'p-label';
    lab.textContent = p.label + (p.builtin ? '' : ' (custom)');
    const need = document.createElement('span');
    need.className = 'p-need';
    need.textContent = money(p.need(distYear)) + ' in ' + distYear;
    row.appendChild(cb); row.appendChild(lab); row.appendChild(need);
    if (!p.builtin) {
      const rm = document.createElement('button');
      rm.className = 'rm'; rm.textContent = 'remove';
      rm.addEventListener('click', function () {
        customPrograms = customPrograms.filter(function (x) { return x.id !== p.id; });
        refresh();
      });
      row.appendChild(rm);
    }
    host.appendChild(row);
  });
}

function wireProgramAdd(): void {
  const btn = $('p-add-btn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    const nameEl = $('p-add-name') as HTMLInputElement;
    const amtEl = $('p-add-amt') as HTMLInputElement;
    const startEl = $('p-add-start') as HTMLInputElement;
    const rampEl = $('p-add-ramp') as HTMLInputElement;
    const name = nameEl.value.trim() || 'Custom program';
    const amt = parseFloat(amtEl.value);
    const start = parseInt(startEl.value, 10);
    const ramp = parseInt(rampEl.value, 10) || 0;
    if (!(amt > 0) || !(start >= 2027 && start <= 2042)) return;
    customPrograms.push(makeCustomProgram(name, amt, start, ramp));
    nameEl.value = ''; amtEl.value = '';
    refresh();
  });
}

/* ---- render ---- */
function refresh(): void {
  const progs = activePrograms();
  const comp = compute(settings, progs);
  const pathChart = $('tax-path-chart');
  if (pathChart) renderRevenueNeedChart(pathChart, comp);

  const i = comp.years.indexOf(distYear);
  const tiles = $('tax-tiles');
  if (tiles) {
    tiles.innerHTML = '';
    [
      { label: 'Revenue in ' + distYear, value: money(comp.totalRev[i]) + '/yr',
        range: 'all instruments, phased as scheduled' },
      { label: 'Funding need in ' + distYear, value: money(comp.need[i]) + '/yr',
        range: progs.filter(function (p) { return p.enabled; }).length + ' program(s)' },
      { label: 'Coverage in ' + distYear,
        value: comp.need[i] > 0 ? Math.round(100 * comp.totalRev[i] / comp.need[i]) + '%' : 'n/a',
        range: comp.totalRev[i] >= comp.need[i] ? 'fully funded' : 'shortfall: ' +
          money(comp.need[i] - comp.totalRev[i]) + '/yr' },
      { label: 'Cumulative 2027–2042',
        value: money(comp.totalRev.reduce(function (a, b) { return a + b; }, 0)),
        range: 'vs. need ' + money(comp.need.reduce(function (a, b) { return a + b; }, 0)) }
    ].forEach(function (it) {
      const tl = document.createElement('div'); tl.className = 'tile';
      const l = document.createElement('div'); l.className = 'label'; l.textContent = it.label;
      const v = document.createElement('div'); v.className = 'value'; v.textContent = it.value;
      const r = document.createElement('div'); r.className = 'range'; r.textContent = it.range;
      tl.appendChild(l); tl.appendChild(v); tl.appendChild(r);
      tiles.appendChild(tl);
    });
  }

  const reliefB = nhaEnabled ? healthRelief(distYear) : 0;
  const wageB = nhaEnabled ? healthWage(distYear) : 0;
  const rows = distribution(settings, distYear, reliefB, wageB);
  const spYear = $('savepay-year');
  if (spYear) spYear.textContent = String(distYear);
  const savepay = $('tax-savepay-chart');
  if (savepay) renderSaveVsPayChart(savepay, rows);
  const impact = $('tax-impact-chart');
  if (impact) renderNetImpactChart(impact, rows, distMode);
  const rate = $('tax-rate-chart');
  if (rate) renderRateCurve(rate, rows);

  const instHost = $('tax-instruments');
  if (instHost) {
    const cards = instHost.children;
    for (let c = 0; c < cards.length; c++) {
      const upd = (cards[c] as CardWithUpdate)._updateRev;
      if (upd) upd();
    }
  }
  buildProgramList();
  renderDistTable(rows, reliefB);
}

function renderDistTable(rows: DistributionRow[], reliefB: number): void {
  const host = $('tax-dist-table');
  if (!host) return;
  host.innerHTML = '';
  const tbl = document.createElement('table');
  const hd = tbl.insertRow();
  ['Income group', 'Avg income (' + distYear + ')', 'New taxes /hh',
   'Health savings /hh', 'Wage gains /hh', 'Net /hh', 'Net % of income',
   'Avg fed rate: now → new'].forEach(function (h) {
    const th = document.createElement('th'); th.textContent = h; hd.appendChild(th);
  });
  rows.forEach(function (r) {
    const tr = tbl.insertRow();
    function cell(v: string): HTMLTableCellElement { const c = tr.insertCell(); c.textContent = v; return c; }
    cell(r.group.label);
    cell('$' + Math.round(r.avgIncomeNow).toLocaleString('en-US'));
    cell('$' + Math.round(r.taxPerHH).toLocaleString('en-US'));
    cell('−$' + Math.round(r.reliefPerHH).toLocaleString('en-US'));
    cell('−$' + Math.round(r.wagePerHH || 0).toLocaleString('en-US'));
    const net = cell((r.netPerHH >= 0 ? '+$' : '−$') +
      Math.round(Math.abs(r.netPerHH)).toLocaleString('en-US'));
    net.style.fontWeight = '650';
    cell((r.netPctIncome >= 0 ? '+' : '') + (r.netPctIncome * 100).toFixed(1) + '%');
    cell((r.curRate * 100).toFixed(1) + '% → ' + (r.newRate * 100).toFixed(1) + '%');
  });
  host.appendChild(tbl);
  const note = document.createElement('div');
  note.className = 'note';
  note.textContent = reliefB > 0
    ? "Health savings distribute the healthcare model's " + money(reliefB) +
      '/yr of replaced household health spending across groups per the BLS Consumer ' +
      'Expenditure Survey 2024 pattern ($3,445/yr in the lowest quintile to $9,771 in the ' +
      'highest, or 20.7% vs 3.7% of income). Shares are muted at the bottom because Medicaid ' +
      'already covers many low-income households.'
    : 'Health savings are zero because the NHA program is disabled; this shows pure tax incidence.';
  host.appendChild(note);
}

/* ---- year & mode controls ---- */
function wireViewControls(): void {
  const sel = $('dist-year') as HTMLSelectElement | null;
  if (sel) {
    for (let y = 2030; y <= 2042; y++) {
      const o = document.createElement('option');
      o.value = String(y); o.textContent = String(y);
      if (y === distYear) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener('change', function () {
      distYear = parseInt(sel.value, 10); refresh();
    });
  }
  const modeDollars = $('mode-dollars');
  const modePct = $('mode-pct');
  function setModeButtons(): void {
    if (modeDollars) modeDollars.className = distMode === 'dollars' ? 'active' : '';
    if (modePct) modePct.className = distMode === 'pct' ? 'active' : '';
  }
  if (modeDollars) modeDollars.addEventListener('click', function () {
    distMode = 'dollars'; setModeButtons(); refresh();
  });
  if (modePct) modePct.addEventListener('click', function () {
    distMode = 'pct'; setModeButtons(); refresh();
  });
  setModeButtons();
}

/* ---- financing scenario picker (selectable, then fully editable) ---- */
function applyScenario(id: string): void {
  activeScenario = id;
  const scn = SCENARIOS.filter(function (s) { return s.id === id; })[0];
  if (!scn) return;
  settings = solveScenario(scn, activePrograms());
  const desc = $('tax-scenario-desc');
  let balNote = '';
  if (settings._balanced) {
    const ins = INSTRUMENTS.filter(function (i) { return i.id === settings._balanced!.id; })[0];
    balNote = ' Auto-balanced: ' + ins.label + ' set to ' +
      settings._balanced.value.toFixed(2) + '× to meet the goal' +
      (settings._balanced.clamped ?
        ' (hit its ceiling; the goal may still be short, check the tiles)' : '') + '.';
  } else if (scn.balancer === null) {
    balNote = ' No auto-balancing.';
  }
  if (desc) {
    desc.textContent = scn.desc + balNote +
      ' Everything below remains editable; re-select the scenario to re-balance ' +
      'after changing healthcare assumptions.';
  }
  buildInstrumentControls();
  refresh();
}

function wireScenarioPicker(): void {
  const sel = $('tax-scenario') as HTMLSelectElement | null;
  if (!sel) return;
  SCENARIOS.forEach(function (s) {
    const o = document.createElement('option');
    o.value = s.id; o.textContent = s.name;
    if (s.id === activeScenario) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener('change', function () { applyScenario(sel.value); });
}

/* ---- inequality story (static, rendered once) ---- */
function renderInequality(): void {
  const toprate = $('toprate-chart');
  if (toprate) renderTopRateChart(toprate);
  const wealth = $('wealth-chart');
  if (wealth) renderWealthChart(wealth);

  const Wd = WEALTH_DIST;
  function grp(id: string) {
    return Wd.groups.filter(function (g) { return g.id === id; })[0];
  }
  const t001 = grp('top001'), t999 = grp('p9999'), b50 = grp('b50');
  const top01T = t001.wealthT + t999.wealthT;                 /* top 0.1% */
  const top05T = top01T + grp('p9990').wealthT;               /* top 0.5% */
  const avg001 = t001.wealthT * 1e12 / (t001.hhM * 1e6);
  const host = $('inequality-tiles');
  if (!host) return;
  host.innerHTML = '';
  [
    { label: 'The top 0.01% vs the bottom half',
      value: '$' + t001.wealthT.toFixed(1) + 'T vs $' + b50.wealthT.toFixed(1) + 'T',
      range: 'about 13,200 households hold three times the combined wealth of 66 million households' },
    { label: 'One average top-0.01% household',
      value: '$' + (avg001 / 1e9).toFixed(1) + 'B',
      range: 'roughly ' + Math.round(avg001 / Wd.medianHH).toLocaleString('en-US') +
        " times the median household's $205k" },
    { label: 'The top 0.5% together',
      value: '$' + top05T.toFixed(0) + 'T',
      range: Math.round(100 * top05T / Wd.totalT) + '% of all U.S. household wealth, held by half of one percent of households' },
    { label: 'The top 0.1%',
      value: '$' + top01T.toFixed(1) + 'T',
      range: "nearly 6 times the entire bottom half; this is why the model taxes bands, not 'the rich'" }
  ].forEach(function (it) {
    const tl = document.createElement('div'); tl.className = 'tile';
    const l = document.createElement('div'); l.className = 'label'; l.textContent = it.label;
    const v = document.createElement('div'); v.className = 'value'; v.textContent = it.value;
    const r = document.createElement('div'); r.className = 'range'; r.textContent = it.range;
    tl.appendChild(l); tl.appendChild(v); tl.appendChild(r);
    host.appendChild(tl);
  });
}

function initTax(): void {
  const host = $('tax-instruments');
  if (!host) return; // not on the tax page
  if (host.dataset.wired === '1') return;
  host.dataset.wired = '1';

  /* reset state for a fresh page instance (View-Transition safe) */
  settings = defaultSettings();
  customPrograms = [];
  distYear = 2041;
  distMode = 'dollars';
  activeScenario = 'goal-top';
  nhaEnabled = true;

  buildHealthPath();
  wireProgramAdd();
  wireViewControls();
  wireScenarioPicker();
  renderInequality();
  applyScenario(activeScenario); /* builds controls + refreshes, goal met */
}

/* Also init on first load without waiting for astro:page-load: if this module
   finishes evaluating after ClientRouter fired that event, the listener alone
   would miss it and leave the page blank (see quality-client.ts). initTax is
   idempotent via dataset.wired. */
document.addEventListener('astro:page-load', initTax);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTax);
} else {
  initTax();
}
