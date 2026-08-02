/* Long-Term Care tab client: renders the OECD spending chart, the
   country-system cards, and the workforce-gap figure. Hand-rolled SVG, no
   dependencies. Runs on astro:page-load; idempotent via dataset.wired. */
import { el, div, showTip, hideTip, tipRow, niceTicks, barPath, legend } from '../lib/chart-util';
import { LTC_GDP_2021, COUNTRY_SYSTEMS, WORKFORCE_ASSESS, US_FAILURE_STATS,
  PLAN_PILLARS, COST_IN_FRAMEWORK, type GdpBar } from '../lib/ltc';

/* ---- Cost, read from the fiscal model so the figure cannot drift ---- */
function renderCost(): void {
  const host = document.getElementById('ltc-cost-note');
  if (!host) return;
  host.textContent = COST_IN_FRAMEWORK.body + ' ';
  const c = document.createElement('span');
  c.className = 'conf ' + COST_IN_FRAMEWORK.confidence;
  c.textContent = COST_IN_FRAMEWORK.confidence;
  host.appendChild(c);
}

/* ---- Why the current system fails: sourced stat tiles ---- */
function renderFailureStats(): void {
  const host = document.getElementById('ltc-failure-stats');
  if (!host) return;
  host.innerHTML = '';
  US_FAILURE_STATS.forEach(function (s) {
    const a = div('ltc-stat', host);
    const v = document.createElement('strong');
    v.textContent = s.value;
    a.appendChild(v);
    const l = document.createElement('span');
    l.textContent = s.label;
    a.appendChild(l);
    const n = document.createElement('small');
    n.textContent = s.note + ' ';
    const c = document.createElement('span');
    c.className = 'conf ' + s.confidence;
    c.textContent = s.confidence;
    n.appendChild(c);
    a.appendChild(n);
  });
}

/* ---- The plan, pillar by pillar ---- */
function renderPillars(): void {
  const host = document.getElementById('ltc-pillars');
  if (!host) return;
  host.innerHTML = '';
  PLAN_PILLARS.forEach(function (p) {
    const a = div('ltc-pillar', host);
    const h = document.createElement('h3');
    h.textContent = p.title;
    a.appendChild(h);
    const b = document.createElement('p');
    b.textContent = p.body;
    a.appendChild(b);
    const borrow = div('ltc-pillar-borrow', a);
    const bb = document.createElement('b');
    bb.textContent = 'Borrows from ';
    borrow.appendChild(bb);
    borrow.appendChild(document.createTextNode(p.borrows));
  });
}

function kindColor(k: GdpBar['kind']): string {
  return k === 'us' ? 'var(--series-5)'
    : k === 'insurance' ? 'var(--series-1)'
    : 'var(--series-3)';
}

/* ---- Long-term care spending, % of GDP ---- */
function renderGdpChart(): void {
  const host = document.getElementById('ltc-gdp-chart');
  if (!host) return;
  host.innerHTML = '';

  const rows = LTC_GDP_2021;
  const W = 860, rowH = 40, M = { l: 200, r: 54, t: 8, b: 30 };
  const H = M.t + rows.length * rowH + M.b;
  const hi = Math.max.apply(null, rows.map(function (r) { return r.pct; })) * 1.12;
  const x = function (v: number): number { return M.l + (W - M.l - M.r) * (v / hi); };

  const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg',
    role: 'img', 'aria-label': 'Long-term care spending as a share of GDP, 2021' }, host);

  niceTicks(0, hi, 5).forEach(function (tv) {
    el('line', { x1: x(tv), x2: x(tv), y1: M.t, y2: H - M.b, class: 'gridline' }, svg);
    const t = el('text', { x: x(tv), y: H - 10, class: 'axis-text', 'text-anchor': 'middle' }, svg);
    t.textContent = tv + '%';
  });

  rows.forEach(function (r, i) {
    const cy = M.t + i * rowH + rowH / 2;
    const color = kindColor(r.kind);
    const lab = el('text', { x: M.l - 10, y: cy + 4, class: 'row-label', 'text-anchor': 'end' }, svg);
    lab.textContent = r.country;
    const g = el('g', { class: 'bench-row', tabindex: 0 }, svg);
    el('path', {
      d: barPath(x(0), cy - 9, Math.max(2, x(r.pct) - x(0)), 18, 5, 'right'),
      fill: color, 'fill-opacity': r.kind === 'us' ? 0.9 : 0.6
    }, g);
    const val = el('text', { x: x(r.pct) + 7, y: cy + 4, class: 'axis-text', 'text-anchor': 'start' }, svg);
    val.textContent = r.pct.toFixed(1) + '%';
    function tipIt(evt: { clientX: number; clientY: number }): void {
      const box = document.createElement('div');
      div('tip-head', box).textContent = r.country;
      tipRow(box, color, 'Share of GDP', r.pct.toFixed(1) + '%', true);
      tipRow(box, '', 'Per person', '$' + r.perCapita.toLocaleString('en-US') + ' (2021, PPP)', true);
      tipRow(box, '', '', r.note, false);
      showTip(box, evt.clientX, evt.clientY);
    }
    g.addEventListener('pointermove', function (e) { tipIt(e as PointerEvent); });
    g.addEventListener('pointerleave', hideTip);
  });

  const leg = document.getElementById('ltc-gdp-legend');
  if (leg) {
    leg.innerHTML = '';
    legend(leg, [
      { label: 'Social insurance', color: 'var(--series-1)' },
      { label: 'Tax-funded', color: 'var(--series-3)' },
      { label: 'United States', color: 'var(--series-5)' }
    ]);
  }
}

/* ---- The systems that work: one card per country ---- */
function renderCountryCards(): void {
  const host = document.getElementById('ltc-country-cards');
  if (!host) return;
  host.innerHTML = '';
  COUNTRY_SYSTEMS.forEach(function (c) {
    const card = div('ltc-country-card', host);
    const head = div('ltc-country-head', card);
    const nm = document.createElement('strong');
    nm.textContent = c.country;
    head.appendChild(nm);
    const since = document.createElement('span');
    since.textContent = 'since ' + c.since;
    head.appendChild(since);
    const sys = div('ltc-country-system', card);
    sys.textContent = c.system;

    function row(label: string, text: string): void {
      const r = div('ltc-country-row', card);
      const b = document.createElement('b');
      b.textContent = label + ' ';
      r.appendChild(b);
      r.appendChild(document.createTextNode(text));
    }
    row('How it is funded.', c.funding);
    row('How it is built.', c.design);
    row('Why it works.', c.why);
  });
}

/* ---- Workforce gap: today's direct-care workforce vs. openings by 2034 ---- */
function renderWorkforce(): void {
  const host = document.getElementById('ltc-workforce-fig');
  if (!host) return;
  host.innerHTML = '';

  const W = 860, M = { l: 240, r: 60, t: 8, b: 30 }, rowH = 46;
  const rows = [
    { label: 'Aides employed today (2024)', v: WORKFORCE_ASSESS.directCare2024, color: 'var(--series-1)' },
    { label: 'Current system needs by 2034', v: WORKFORCE_ASSESS.projected2034, color: 'var(--series-3)' },
    { label: 'Universal benefit at maturity', v: WORKFORCE_ASSESS.matureFramework, color: 'var(--series-5)' }
  ];
  const H = M.t + rows.length * rowH + M.b;
  const hi = Math.max.apply(null, rows.map(function (r) { return r.v; })) * 1.15;
  const x = function (v: number): number { return M.l + (W - M.l - M.r) * (v / hi); };

  const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg',
    role: 'img', 'aria-label': 'Direct-care aides employed today, needed by the current system in 2034, and needed by a universal home-first benefit at maturity, in millions of workers' }, host);
  niceTicks(0, hi, 5).forEach(function (tv) {
    el('line', { x1: x(tv), x2: x(tv), y1: M.t, y2: H - M.b, class: 'gridline' }, svg);
    const t = el('text', { x: x(tv), y: H - 10, class: 'axis-text', 'text-anchor': 'middle' }, svg);
    t.textContent = tv + 'M';
  });
  rows.forEach(function (r, i) {
    const cy = M.t + i * rowH + rowH / 2;
    const lab = el('text', { x: M.l - 10, y: cy + 4, class: 'row-label', 'text-anchor': 'end' }, svg);
    lab.textContent = r.label;
    el('path', { d: barPath(x(0), cy - 10, Math.max(2, x(r.v) - x(0)), 20, 5, 'right'),
      fill: r.color, 'fill-opacity': 0.7 }, svg);
    const val = el('text', { x: x(r.v) + 7, y: cy + 4, class: 'axis-text', 'text-anchor': 'start' }, svg);
    val.textContent = r.v.toFixed(1) + 'M';
  });
}

function initLtc(): void {
  const host = document.getElementById('ltc-gdp-chart');
  if (!host) return; // not on the LTC page
  if (host.dataset.wired === '1') return;
  host.dataset.wired = '1';
  renderFailureStats();
  renderGdpChart();
  renderCountryCards();
  renderPillars();
  renderCost();
  renderWorkforce();
}

document.addEventListener('astro:page-load', initLtc);
