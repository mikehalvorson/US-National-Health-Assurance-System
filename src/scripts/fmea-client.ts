/* Failure Modes and Effects Analysis tab client. Renders the five-by-five
   risk chart, the most-probable / most-consequential / both headlines, the
   criticality tiers with their effect-class breakdown, the parameter gaps,
   and a filterable explorer with a per-record detail panel. Site-wide acronym
   hovers are attached by scripts/acronyms-client.ts, so this file does not
   decorate acronyms itself. Runs on astro:page-load; idempotent via the
   matrix host's dataset.wired guard. */
import { FMEA_DATA as F, cellBand, BAND_META, type FmeaRecord } from '../lib/fmea';

const BANDS = ['extreme', 'high', 'moderate', 'low'] as const;
type Band = typeof BANDS[number];

let selectedId = '';
let selectedCell: { c: number; p: number } | null = null;

function el(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function byId(id: string): HTMLElement | null { return document.getElementById(id); }
function natural(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/* ---- Intro counts ----------------------------------------------------- */
function renderCounts(): void {
  const kpp = F.records.filter(function (r) { return r.paramType === 'KPP'; }).length;
  const tpp = F.records.filter(function (r) { return r.paramType === 'TPP'; }).length;
  const set = function (id: string, n: number) { const h = byId(id); if (h) h.textContent = n.toLocaleString('en-US'); };
  set('fmea-n-kpp', kpp);
  set('fmea-n-tpp', tpp);
  set('fmea-n-cp', F.counts.cp);
}

/* ---- Five-by-five risk chart ------------------------------------------ */
function renderMatrix(): void {
  const host = byId('fmea-matrix');
  if (!host) return;
  host.innerHTML = '';

  const grid = el('div', 'fmea-matrix');
  /* top-left corner label */
  grid.appendChild(el('div', 'fmea-matrix-corner', 'Consequence ↓ / Probability →'));
  /* probability column headers 1..5 */
  for (let p = 1; p <= 5; p++) grid.appendChild(el('div', 'fmea-matrix-colhead', String(p)));

  for (let c = 5; c >= 1; c--) {
    grid.appendChild(el('div', 'fmea-matrix-rowhead', String(c)));
    for (let p = 1; p <= 5; p++) {
      const band = cellBand(c, p);
      const count = F.matrix[c][p];
      const cell = el('button', 'fmea-cell fmea-cell-' + band) as HTMLButtonElement;
      cell.type = 'button';
      cell.dataset.c = String(c);
      cell.dataset.p = String(p);
      if (selectedCell && selectedCell.c === c && selectedCell.p === p) cell.classList.add('is-selected');
      if (!count) cell.classList.add('is-empty');
      cell.appendChild(el('b', '', count ? String(count) : ''));
      cell.setAttribute('aria-label', count + ' failure modes at consequence ' + c +
        ', probability ' + p + ', ' + BAND_META[band].label + ' risk');
      grid.appendChild(cell);
    }
  }
  host.appendChild(grid);

  /* legend */
  const legend = el('div', 'fmea-matrix-legend');
  BANDS.forEach(function (b) {
    const item = el('span', 'fmea-legend-item');
    const sw = el('i', 'fmea-swatch fmea-cell-' + b);
    item.appendChild(sw);
    item.appendChild(document.createTextNode(BAND_META[b].label + ' (' + BAND_META[b].tier + '): ' +
      (F.counts as Record<string, number>)[b].toLocaleString('en-US')));
    legend.appendChild(item);
  });
  host.appendChild(legend);

  const axisNote = el('p', 'fmea-axis-note',
    'Columns are probability, 1 rare to 5 almost certain. Rows are consequence, ' +
    '1 negligible to 5 catastrophic. No failure mode scores probability 1: every ' +
    'controlled target sits on an unproven or ambitious trajectory.');
  host.appendChild(axisNote);
}

/* ---- Headlines: most probable, most consequential, both --------------- */
function headlineCard(title: string, blurb: string, records: FmeaRecord[]): HTMLElement {
  const card = el('article', 'fmea-headline');
  card.appendChild(el('span', 'fmea-kicker', title));
  card.appendChild(el('strong', '', records.length.toLocaleString('en-US')));
  card.appendChild(el('p', 'fmea-headline-blurb', blurb));
  const list = el('ul', 'fmea-headline-list');
  const seen: Record<string, boolean> = {};
  let shown = 0;
  records.forEach(function (r) {
    if (shown >= 4 || seen[r.paramId]) return;
    seen[r.paramId] = true;
    shown++;
    const li = el('li');
    const btn = el('button', 'fmea-mini-link', r.paramId + ' · ' + r.paramName) as HTMLButtonElement;
    btn.type = 'button';
    btn.dataset.fmeaId = r.id;
    li.appendChild(btn);
    list.appendChild(li);
  });
  card.appendChild(list);
  return card;
}
function renderHeadlines(): void {
  const host = byId('fmea-headlines');
  if (!host) return;
  host.innerHTML = '';
  host.appendChild(headlineCard('Most probable', 'Failure modes scored 5 of 5 on probability: near-certain misses if unmanaged.', F.mostProbable));
  host.appendChild(headlineCard('Most consequential', 'Failure modes scored 5 of 5 on consequence: catastrophic if they occur.', F.mostConsequential));
  host.appendChild(headlineCard('Both, the critical few', 'Scored 5 on both axes: the top-right red cell where attention belongs first.', F.both));
}

/* ---- Criticality tiers ------------------------------------------------ */
const TIER_ORDER: { band: Band; tier: string }[] = [
  { band: 'extreme', tier: 'Critical' },
  { band: 'high', tier: 'Serious' },
  { band: 'moderate', tier: 'Moderate' },
  { band: 'low', tier: 'Minor' }
];
function renderTiers(): void {
  const host = byId('fmea-tiers');
  if (!host) return;
  host.innerHTML = '';
  TIER_ORDER.forEach(function (t) {
    const recs = F.records.filter(function (r) { return r.band === t.band && r.paramType !== 'CP'; });
    const card = el('article', 'fmea-tier fmea-tier-' + t.band);
    const head = el('div', 'fmea-tier-head');
    head.appendChild(el('span', 'fmea-tier-dot fmea-cell-' + t.band));
    const htext = el('div');
    htext.appendChild(el('b', '', t.tier));
    htext.appendChild(el('small', '', BAND_META[t.band].label + ' risk'));
    head.appendChild(htext);
    head.appendChild(el('strong', 'fmea-tier-count', recs.length.toLocaleString('en-US')));
    card.appendChild(head);

    /* effect-class breakdown */
    const byClass: Record<string, { label: string; n: number }> = {};
    recs.forEach(function (r) {
      byClass[r.effectClass] = byClass[r.effectClass] || { label: r.effectClassLabel, n: 0 };
      byClass[r.effectClass].n++;
    });
    const rows = Object.keys(byClass).map(function (k) { return byClass[k]; })
      .sort(function (a, b) { return b.n - a.n; });
    const list = el('ul', 'fmea-tier-classes');
    rows.slice(0, 5).forEach(function (row) {
      const li = el('li');
      li.appendChild(el('span', 'fmea-tier-class-label', row.label));
      li.appendChild(el('b', 'fmea-tier-class-n', String(row.n)));
      list.appendChild(li);
    });
    card.appendChild(list);

    /* a couple of representative failures (highest risk in the tier) */
    const examples = recs.slice(0, 2);
    if (examples.length) {
      const ex = el('div', 'fmea-tier-examples');
      examples.forEach(function (r) {
        const btn = el('button', 'fmea-tier-example') as HTMLButtonElement;
        btn.type = 'button';
        btn.dataset.fmeaId = r.id;
        btn.appendChild(el('b', '', r.paramId + (r.phase !== 'calibration' ? ' at ' + r.phase : '')));
        btn.appendChild(el('span', '', r.effect));
        ex.appendChild(btn);
      });
      card.appendChild(ex);
    }
    host.appendChild(card);
  });

  /* R272: the ranking compares two populations, and which one a row belongs to
     decides whether a correction inside the equation layer moves it. Say so
     where the ranking is read, with counts derived from the records. */
  const kinds = F.committedKinds.map(function (k) { return k.rows + ' ' + k.kind; });
  const note = el('p', 'fmea-axis-note',
    'Two populations are ranked against each other here. ' +
    F.counts.equationDerived.toLocaleString('en-US') + ' of these failure modes score a ' +
    'target the equation layer recomputes from the model, and ' +
    F.counts.committed.toLocaleString('en-US') + ' score a value the plan committed to and ' +
    'the equation layer is required to leave alone (' + kinds.join(', ') + '). ' +
    'A correction inside the equation layer therefore moves part of this ranking ' +
    'and leaves the rest exactly where it was, which changes the order without ' +
    'any of the committed targets having changed.');
  host.appendChild(note);
}

/* ---- Cost-parameter calibration risk (separate chart) ----------------- */
function miniMatrix(matrix: number[][], labelPrefix: string): HTMLElement {
  const grid = el('div', 'fmea-matrix fmea-matrix-cp');
  grid.appendChild(el('div', 'fmea-matrix-corner', 'Consequence ↓ / Probability →'));
  for (let p = 1; p <= 5; p++) grid.appendChild(el('div', 'fmea-matrix-colhead', String(p)));
  for (let c = 5; c >= 1; c--) {
    grid.appendChild(el('div', 'fmea-matrix-rowhead', String(c)));
    for (let p = 1; p <= 5; p++) {
      const band = cellBand(c, p);
      const count = matrix[c][p];
      const cell = el('button', 'fmea-cell fmea-cell-' + band) as HTMLButtonElement;
      cell.type = 'button';
      cell.dataset.c = String(c);
      cell.dataset.p = String(p);
      cell.dataset.cp = '1';
      if (!count) cell.classList.add('is-empty');
      cell.appendChild(el('b', '', count ? String(count) : ''));
      cell.setAttribute('aria-label', count + ' ' + labelPrefix + ' at consequence ' + c +
        ', probability ' + p + ', ' + BAND_META[band].label + ' risk');
      grid.appendChild(cell);
    }
  }
  return grid;
}
function renderCpChart(): void {
  const host = byId('fmea-cp');
  if (!host) return;
  host.innerHTML = '';

  const layout = el('div', 'fmea-cp-layout');

  const left = el('div', 'fmea-cp-left');
  left.appendChild(miniMatrix(F.cpMatrix, 'cost-parameter calibration failures'));
  const note = el('p', 'fmea-axis-note',
    'Occurrence here is borrowed: cost parameters have no controlled likelihood ' +
    'attribute, so probability is imported from the confidence grade of the modeled ' +
    'quantity each family calibrates (low maps to 4, medium 3, high 2). Consequence ' +
    'is scored from the ledger\'s domain and its model role. Select a cell to filter ' +
    'the explorer.');
  left.appendChild(note);
  const legend = el('div', 'fmea-matrix-legend');
  BANDS.forEach(function (b) {
    const item = el('span', 'fmea-legend-item');
    item.appendChild(el('i', 'fmea-swatch fmea-cell-' + b));
    const cntKey = ('cp' + b.charAt(0).toUpperCase() + b.slice(1)) as keyof typeof F.counts;
    item.appendChild(document.createTextNode(BAND_META[b].label + ': ' +
      (F.counts[cntKey] as number).toLocaleString('en-US')));
    legend.appendChild(item);
  });
  left.appendChild(legend);
  layout.appendChild(left);

  /* per-family worst-band roster */
  const right = el('div', 'fmea-cp-right');
  right.appendChild(el('span', 'fmea-kicker', 'Calibration risk by ledger family'));
  const list = el('div', 'fmea-cp-families');
  F.cpFamilyRisk.slice().sort(function (a, b) {
    return BAND_META[a.worst].order - BAND_META[b.worst].order || b.records - a.records;
  }).forEach(function (f) {
    const row = el('button', 'fmea-cp-family') as HTMLButtonElement;
    row.type = 'button';
    row.dataset.cpFamily = f.id;
    row.appendChild(el('span', 'fmea-cp-family-dot fmea-cell-' + f.worst));
    const body = el('span', 'fmea-cp-family-body');
    body.appendChild(el('b', '', f.id));
    body.appendChild(el('small', '', f.domain + ' · ' + f.records + ' records'));
    row.appendChild(body);
    row.appendChild(el('span', 'fmea-cp-family-worst', BAND_META[f.worst].label));
    list.appendChild(row);
  });
  right.appendChild(list);
  layout.appendChild(right);

  host.appendChild(layout);
}

/* ---- Parameter gaps --------------------------------------------------- */
function renderGaps(): void {
  const host = byId('fmea-gaps');
  if (!host) return;
  host.innerHTML = '';

  const a = el('article', 'fmea-gap');
  a.appendChild(el('span', 'fmea-kicker', 'Cost parameters have no likelihood control'));
  a.appendChild(el('p', 'fmea-gap-lead', 'Occurrence for all ' + F.counts.cp +
    ' cost-parameter calibration failures had to be borrowed from the confidence ' +
    'grade of the modeled quantity each family calibrates. A native ' +
    'calibration-confidence attribute on each family would let this be assessed ' +
    'inside the controlled catalog. One proposed parameter per family:'));
  const table = el('table', 'data fmea-gap-table');
  const thead = el('thead'); const hr = el('tr');
  ['Family', 'Domain', 'Records', 'Proposed parameter'].forEach(function (h) { hr.appendChild(el('th', '', h)); });
  thead.appendChild(hr); table.appendChild(thead);
  const tb = el('tbody');
  F.gaps.cpFamilies.forEach(function (f) {
    const tr = el('tr');
    tr.appendChild(el('th', 'text-nowrap', f.id));
    tr.appendChild(el('td', '', f.domain));
    tr.appendChild(el('td', 'text-nowrap', String(f.records)));
    tr.appendChild(el('td', 'fmea-gap-proposed', f.proposed));
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  const scroll = el('div', 'tbl-scroll'); scroll.appendChild(table);
  a.appendChild(scroll);
  host.appendChild(a);

  const b = el('article', 'fmea-gap');
  b.appendChild(el('span', 'fmea-kicker', 'Deferred numeric targets'));
  b.appendChild(el('p', 'fmea-gap-lead', F.gaps.deferredParamIds.length +
    ' outcome parameters were deliberately left as a number to be calibrated ' +
    'later, so their probability cannot be scored against a real value. The ' +
    'missing parameter is the calibrated target itself, adopted by the ' +
    'scorekeeping board. Consequence is still assessed; probability is shown ' +
    'as unscored on their records.'));
  const list = el('ul', 'fmea-gap-ids');
  F.gaps.deferredParamIds.forEach(function (id) {
    const rec = F.gaps.deferredTargets.filter(function (r) { return r.paramId === id; })[0];
    const li = el('li');
    const btn = el('button', 'fmea-mini-link', id + (rec ? ' · ' + rec.paramName : '')) as HTMLButtonElement;
    btn.type = 'button';
    if (rec) btn.dataset.fmeaId = rec.id;
    li.appendChild(btn);
    list.appendChild(li);
  });
  b.appendChild(list);
  host.appendChild(b);
}

/* ---- Explorer --------------------------------------------------------- */
function populateConcepts(): void {
  const sel = byId('fmea-concept');
  if (!sel) return;
  F.concepts.forEach(function (c) {
    const opt = el('option', '', c) as HTMLOptionElement;
    opt.value = c;
    sel.appendChild(opt);
  });
}

function searchText(r: FmeaRecord): string {
  return (r.paramId + ' ' + r.paramType + ' ' + r.paramName + ' ' + r.concept + ' ' +
    r.family + ' ' + r.effectClassLabel + ' ' + r.effect + ' ' + r.failureMode + ' ' +
    r.phase + ' ' + r.tier).toLowerCase();
}
function filtered(): FmeaRecord[] {
  const q = (byId('fmea-search') as HTMLInputElement | null);
  const type = (byId('fmea-type') as HTMLSelectElement | null);
  const concept = (byId('fmea-concept') as HTMLSelectElement | null);
  const phase = (byId('fmea-phase') as HTMLSelectElement | null);
  const band = (byId('fmea-band') as HTMLSelectElement | null);
  const query = q ? q.value.trim().toLowerCase() : '';
  return F.records.filter(function (r) {
    if (type && type.value !== 'all' && r.paramType !== type.value) return false;
    if (concept && concept.value !== 'all' && r.concept !== concept.value) return false;
    if (phase && phase.value !== 'all' && r.phase !== phase.value) return false;
    if (band && band.value !== 'all' && r.band !== band.value) return false;
    if (selectedCell && (r.consequence !== selectedCell.c || r.probability !== selectedCell.p)) return false;
    return !query || searchText(r).indexOf(query) >= 0;
  });
}

function scorePill(label: string, value: number, cls: string): HTMLElement {
  const pill = el('span', 'fmea-pill ' + cls);
  pill.appendChild(el('b', '', value ? String(value) : 'n/a'));
  pill.appendChild(document.createTextNode(' ' + label));
  return pill;
}
function detailField(label: string, value: string, wide?: boolean): HTMLElement {
  const f = el('div', 'fmea-detail-field' + (wide ? ' fmea-detail-wide' : ''));
  f.appendChild(el('span', 'fmea-kicker', label));
  f.appendChild(el('p', '', value || 'Not specified'));
  return f;
}
function renderSelected(r: FmeaRecord | undefined): void {
  const host = byId('fmea-selected');
  if (!host) return;
  host.innerHTML = '';
  if (!r) { host.appendChild(el('p', 'fmea-empty', 'Select a failure mode to see its detail.')); return; }

  const head = el('div', 'fmea-selected-head');
  const idwrap = el('div');
  const idline = el('div', 'fmea-id-line');
  idline.appendChild(el('span', 'quality-type quality-type-' + r.paramType.toLowerCase(), r.paramType));
  idline.appendChild(el('b', '', r.paramId + (r.phase !== 'calibration' ? ' · ' + r.phase + ' (' + r.phaseAnchor + ')' : ' · calibration')));
  if (r.gate) idline.appendChild(el('span', 'fmea-gate-tag', r.gate + ' gate'));
  idwrap.appendChild(idline);
  idwrap.appendChild(el('h3', '', r.paramName));
  idwrap.appendChild(el('p', 'fmea-selected-concept', r.concept + ' · ' + r.effectClassLabel));
  head.appendChild(idwrap);

  const scoreWrap = el('div', 'fmea-selected-scores');
  scoreWrap.appendChild(el('span', 'fmea-band-chip fmea-cell-' + r.band, BAND_META[r.band].label + ' · ' + r.tier));
  const pills = el('div', 'fmea-pills');
  pills.appendChild(scorePill('probability', r.probability, 'fmea-pill-p'));
  pills.appendChild(scorePill('consequence', r.consequence, 'fmea-pill-c'));
  pills.appendChild(scorePill('risk', r.risk, 'fmea-pill-r'));
  pills.appendChild(scorePill('RPN', r.rpn, 'fmea-pill-d'));
  scoreWrap.appendChild(pills);
  head.appendChild(scoreWrap);
  host.appendChild(head);

  const modeBox = el('div', 'fmea-mode-box');
  modeBox.appendChild(el('span', 'fmea-kicker', 'Failure mode'));
  modeBox.appendChild(el('p', 'fmea-mode-text', r.failureMode));
  modeBox.appendChild(el('span', 'fmea-kicker', 'Effect'));
  modeBox.appendChild(el('p', 'fmea-effect-text', r.effect));
  host.appendChild(modeBox);

  const grid = el('div', 'fmea-detail-grid');
  grid.appendChild(detailField('Probability basis',
    r.probabilityAssessed ? r.probabilityBasis : r.probabilityBasis + ' (unscored: see parameter gaps)', true));
  grid.appendChild(detailField('Consequence basis', r.consequenceBasis, true));
  grid.appendChild(detailField('Detectability basis', r.detectBasis, true));
  if (r.needsNewParam) grid.appendChild(detailField('Parameter gap', r.newParamNote, true));
  host.appendChild(grid);
}

function renderTable(records: FmeaRecord[]): void {
  const table = byId('fmea-table');
  if (!table) return;
  table.innerHTML = '';
  const thead = el('thead'); const hr = el('tr');
  ['ID', 'Parameter', 'Phase', 'Effect class', 'P', 'C', 'Risk', 'Band']
    .forEach(function (h) { hr.appendChild(el('th', '', h)); });
  thead.appendChild(hr); table.appendChild(thead);

  if (!records.length) {
    const tb = el('tbody'); const tr = el('tr');
    const td = el('td', 'fmea-empty', 'No failure modes match the current filters.');
    (td as HTMLTableCellElement).colSpan = 8;
    tr.appendChild(td); tb.appendChild(tr); table.appendChild(tb);
    return;
  }

  /* group by band so the table reads worst-first */
  TIER_ORDER.forEach(function (t) {
    const group = records.filter(function (r) { return r.band === t.band; });
    if (!group.length) return;
    const tb = el('tbody', 'fmea-group');
    const grow = el('tr', 'fmea-group-row');
    const gc = el('th');
    (gc as HTMLTableCellElement).colSpan = 8;
    gc.appendChild(el('span', 'fmea-group-dot fmea-cell-' + t.band));
    gc.appendChild(el('span', '', t.tier + ' · ' + BAND_META[t.band].label + ' risk'));
    gc.appendChild(el('small', '', group.length + ' failure modes'));
    grow.appendChild(gc); tb.appendChild(grow);

    group.forEach(function (r) {
      const tr = el('tr');
      if (r.id === selectedId) tr.classList.add('is-selected');
      const idCell = el('th', 'text-nowrap');
      const btn = el('button', 'fmea-select', r.id.replace(/^FM-/, '')) as HTMLButtonElement;
      btn.type = 'button';
      btn.dataset.fmeaId = r.id;
      btn.setAttribute('aria-pressed', r.id === selectedId ? 'true' : 'false');
      idCell.appendChild(btn);
      tr.appendChild(idCell);
      tr.appendChild(el('td', 'fmea-cell-name', r.paramName));
      tr.appendChild(el('td', 'text-nowrap', r.phase === 'calibration' ? 'calibration' : r.phase));
      tr.appendChild(el('td', '', r.effectClassLabel));
      tr.appendChild(el('td', 'fmea-num', r.probability ? String(r.probability) : ' - '));
      tr.appendChild(el('td', 'fmea-num', String(r.consequence)));
      tr.appendChild(el('td', 'fmea-num', r.risk ? String(r.risk) : ' - '));
      const bandCell = el('td');
      bandCell.appendChild(el('span', 'fmea-band-chip fmea-cell-' + r.band, BAND_META[r.band].label));
      tr.appendChild(bandCell);
      tb.appendChild(tr);
    });
    table.appendChild(tb);
  });
}

function refresh(): void {
  const records = filtered();
  if (!records.some(function (r) { return r.id === selectedId; })) {
    selectedId = records.length ? records[0].id : '';
  }
  const results = byId('fmea-results');
  if (results) {
    let msg = records.length.toLocaleString('en-US') + ' of ' +
      F.counts.total.toLocaleString('en-US') + ' failure modes shown';
    if (selectedCell) msg += ' · chart cell consequence ' + selectedCell.c + ', probability ' + selectedCell.p;
    results.textContent = msg;
  }
  renderSelected(records.filter(function (r) { return r.id === selectedId; })[0]);
  renderTable(records);
  updateMatrixSelection();
}

function updateMatrixSelection(): void {
  const cells = document.querySelectorAll('#fmea-matrix .fmea-cell');
  cells.forEach(function (node) {
    const cell = node as HTMLElement;
    const on = !!selectedCell && cell.dataset.c === String(selectedCell.c) && cell.dataset.p === String(selectedCell.p);
    cell.classList.toggle('is-selected', on);
  });
}

function selectRecord(id: string): void {
  const rec = F.records.filter(function (r) { return r.id === id; })[0];
  if (!rec) return;
  selectedId = id;
  /* make sure the record is visible: clear conflicting filters */
  const band = byId('fmea-band') as HTMLSelectElement | null;
  if (band && band.value !== 'all' && band.value !== rec.band) band.value = 'all';
  const type = byId('fmea-type') as HTMLSelectElement | null;
  if (type && type.value !== 'all' && type.value !== rec.paramType) type.value = 'all';
  const phase = byId('fmea-phase') as HTMLSelectElement | null;
  if (phase && phase.value !== 'all' && phase.value !== rec.phase) phase.value = 'all';
  selectedCell = null;
  refresh();
  const sel = byId('fmea-selected');
  if (sel) sel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function initFmea(): void {
  const matrixHost = byId('fmea-matrix');
  if (!matrixHost) return;                 // not on the FMEA page
  if (matrixHost.dataset.wired === '1') return;
  matrixHost.dataset.wired = '1';
  selectedId = F.records.length ? F.records[0].id : '';
  selectedCell = null;

  renderCounts();
  renderMatrix();
  renderHeadlines();
  renderTiers();
  renderCpChart();
  renderGaps();
  populateConcepts();
  refresh();

  /* CP calibration chart: cell clicks filter the explorer to CP + that cell */
  const cpHost = byId('fmea-cp');
  if (cpHost) cpHost.addEventListener('click', function (e) {
    const cell = (e.target as Element).closest('.fmea-cell') as HTMLElement | null;
    if (cell) {
      const c = Number(cell.dataset.c), p = Number(cell.dataset.p);
      if (selectedCell && selectedCell.c === c && selectedCell.p === p) selectedCell = null;
      else selectedCell = { c: c, p: p };
      const type = byId('fmea-type') as HTMLSelectElement | null; if (type) type.value = 'CP';
      ['fmea-concept', 'fmea-phase', 'fmea-band'].forEach(function (id) {
        const s = byId(id) as HTMLSelectElement | null; if (s) s.value = 'all';
      });
      refresh();
      const table = byId('fmea-table');
      if (table) table.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    const fam = (e.target as Element).closest('.fmea-cp-family') as HTMLElement | null;
    if (fam) {
      selectedCell = null;
      const search = byId('fmea-search') as HTMLInputElement | null;
      if (search) search.value = fam.dataset.cpFamily || '';
      const type = byId('fmea-type') as HTMLSelectElement | null; if (type) type.value = 'CP';
      ['fmea-concept', 'fmea-phase', 'fmea-band'].forEach(function (id) {
        const s = byId(id) as HTMLSelectElement | null; if (s) s.value = 'all';
      });
      refresh();
      const table = byId('fmea-table');
      if (table) table.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  /* matrix cell click filters the explorer to that cell */
  matrixHost.addEventListener('click', function (e) {
    const cell = (e.target as Element).closest('.fmea-cell') as HTMLElement | null;
    if (!cell) return;
    const c = Number(cell.dataset.c), p = Number(cell.dataset.p);
    if (selectedCell && selectedCell.c === c && selectedCell.p === p) selectedCell = null;
    else selectedCell = { c: c, p: p };
    ['fmea-type', 'fmea-concept', 'fmea-phase', 'fmea-band'].forEach(function (id) {
      const s = byId(id) as HTMLSelectElement | null; if (s) s.value = 'all';
    });
    refresh();
    const table = byId('fmea-table');
    if (table) table.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  /* any button carrying data-fmea-id selects that record */
  document.addEventListener('click', function (e) {
    const btn = (e.target as Element).closest('button[data-fmea-id]') as HTMLElement | null;
    if (!btn) return;
    selectRecord(btn.dataset.fmeaId || '');
  });

  ['fmea-search', 'fmea-type', 'fmea-concept', 'fmea-phase', 'fmea-band'].forEach(function (id) {
    const node = byId(id);
    if (!node) return;
    const evt = id === 'fmea-search' ? 'input' : 'change';
    node.addEventListener(evt, function () { selectedCell = null; refresh(); });
  });
  const reset = byId('fmea-reset');
  if (reset) reset.addEventListener('click', function () {
    (byId('fmea-search') as HTMLInputElement).value = '';
    ['fmea-type', 'fmea-concept', 'fmea-phase', 'fmea-band'].forEach(function (id) {
      (byId(id) as HTMLSelectElement).value = 'all';
    });
    selectedCell = null;
    selectedId = F.records.length ? F.records[0].id : '';
    refresh();
  });
}

/* Also init on first load without waiting for astro:page-load: if this module
   finishes evaluating after ClientRouter fired that event, the listener alone
   would miss it and leave the page blank (see quality-client.ts). initFmea is
   idempotent via dataset.wired. */
document.addEventListener('astro:page-load', initFmea);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFmea);
} else {
  initFmea();
}
