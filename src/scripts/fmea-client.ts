/* Failure Modes and Effects Analysis tab client. Renders the five-by-five
   risk chart, the most-probable / most-consequential / both headlines, the
   criticality tiers with their effect-class breakdown, the parameter gaps,
   and a filterable explorer with a per-record detail panel. Site-wide acronym
   hovers are attached by scripts/acronyms-client.ts, so this file does not
   decorate acronyms itself. Runs on astro:page-load; idempotent via the
   matrix host's dataset.wired guard. */
import {
  FMEA_DATA as F, cellBand, BAND_META, PROBABILITY_CEILING, PROBABILITY_FLOOR,
  PROBABILITY_SCALE, PROBABILITY_SOURCE_NOTE, SCORE_PUBLISHING_SOURCES, type FmeaRecord
} from '../lib/fmea';

/* The bands the risk grid produces, in worst-first order. 'unscored' is not
   here on purpose: it is not a risk level, it is the absence of one (R276). */
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
/* R274: both charts size their column track from the reachable score range. */
function setMatrixColumns(grid: HTMLElement): void {
  grid.style.setProperty('--fmea-cols', String(PROBABILITY_CEILING - PROBABILITY_FLOOR + 1));
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

/* ---- Deferred targets (R279) ------------------------------------------
   The page used to state the count as the word "Seven" in prose beside a
   description that did not say what a deferred target is, or that these
   records are off the risk chart because of it. Both come from the data. */
function renderDeferredNote(): void {
  const host = byId('fmea-deferred-note');
  if (!host) return;
  host.innerHTML = '';
  host.appendChild(el('b', '', 'How many, and what that means. '));
  host.appendChild(document.createTextNode(
    F.gaps.deferredParamIds.length.toLocaleString('en-US') + ' of the ' +
    F.counts.kpptpp.toLocaleString('en-US') + ' phase-target failure modes are ' +
    'deferred, across ' + F.gaps.deferredParamIds.length.toLocaleString('en-US') +
    ' outcome parameters. ' + F.gaps.deferredDefinition));
}

/* ---- Probability scale (R274) -----------------------------------------
   The page used to list five scores including a "1 Rare" the model cannot
   produce. The list is built from the reachable range instead, and the reason
   the range starts where it does is stated rather than reported as a finding
   about the programme. */
function renderProbabilityScale(): void {
  const list = byId('fmea-prob-scale');
  if (list) {
    list.innerHTML = '';
    for (let p = PROBABILITY_CEILING; p >= PROBABILITY_FLOOR; p--) {
      const li = el('li');
      li.appendChild(el('b', '', String(p)));
      li.appendChild(document.createTextNode(' ' + PROBABILITY_SCALE[p]));
      list.appendChild(li);
    }
  }
  const floorNote = byId('fmea-prob-floor');
  if (floorNote) {
    floorNote.textContent =
      'The scale runs ' + PROBABILITY_FLOOR + ' to ' + PROBABILITY_CEILING +
      ', not 1 to ' + PROBABILITY_CEILING + '. Every score starts from one shared ' +
      'baseline and only rises from there, so ' + PROBABILITY_FLOOR + ' is the floor ' +
      'of the model rather than a reading of any particular target. A score of 1 ' +
      'would mean a settled target on a system already running at the level ' +
      'required, and nothing in a rollout plan is that.';
  }
}

/* ---- Five-by-five risk chart ------------------------------------------ */
function renderMatrix(): void {
  const host = byId('fmea-matrix');
  if (!host) return;
  host.innerHTML = '';

  const grid = el('div', 'fmea-matrix');
  /* R274: the columns are the reachable occurrence scores, not a hardcoded
     1..5, so a band the model cannot produce is never drawn. */
  setMatrixColumns(grid);
  /* top-left corner label */
  grid.appendChild(el('div', 'fmea-matrix-corner', 'Consequence ↓ / Probability →'));
  for (let p = PROBABILITY_FLOOR; p <= PROBABILITY_CEILING; p++) {
    grid.appendChild(el('div', 'fmea-matrix-colhead', String(p)));
  }

  for (let c = 5; c >= 1; c--) {
    grid.appendChild(el('div', 'fmea-matrix-rowhead', String(c)));
    for (let p = PROBABILITY_FLOOR; p <= PROBABILITY_CEILING; p++) {
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

  /* R274: the old note read "No failure mode scores probability 1: every
     controlled target sits on an unproven or ambitious trajectory", which
     presented a property of the scoring baseline as a result of the analysis.
     What the columns are is stated instead, floor included and derived. */
  const axisNote = el('p', 'fmea-axis-note',
    'Columns are probability, ' + PROBABILITY_FLOOR + ' unlikely to ' +
    PROBABILITY_CEILING + ' almost certain. Rows are consequence, 1 negligible ' +
    'to 5 catastrophic. The scale starts at ' + PROBABILITY_FLOOR +
    ' because every score begins from a shared baseline and only rises: nothing ' +
    'here is a routine target on a settled system, so the model does not offer a ' +
    '"rare" score for one.');
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
/* R276: the table lists every record, so it needs a group for the ones that
   carry no risk band at all. The criticality tiers above deliberately do not:
   an unscored record has no tier to sit in, and inventing one for it is the
   defect this row exists to remove. */
const TABLE_GROUPS: { band: Band | 'unscored'; tier: string }[] =
  (TIER_ORDER as { band: Band | 'unscored'; tier: string }[])
    .concat([{ band: 'unscored', tier: BAND_META.unscored.tier }]);
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
  setMatrixColumns(grid);
  grid.appendChild(el('div', 'fmea-matrix-corner', 'Consequence ↓ / Probability →'));
  for (let p = PROBABILITY_FLOOR; p <= PROBABILITY_CEILING; p++) {
    grid.appendChild(el('div', 'fmea-matrix-colhead', String(p)));
  }
  for (let c = 5; c >= 1; c--) {
    grid.appendChild(el('div', 'fmea-matrix-rowhead', String(c)));
    for (let p = PROBABILITY_FLOOR; p <= PROBABILITY_CEILING; p++) {
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
  const unscored = F.counts.cpUnscored;
  const note = el('p', 'fmea-axis-note',
    'Occurrence here is borrowed: cost parameters have no controlled likelihood ' +
    'attribute, so probability is read from the weakest confidence grade among the ' +
    'simulation parameters that calibrate each family (low maps to 4, medium 3, ' +
    'high 2). Consequence is scored from the ledger\'s domain and its model role. ' +
    (unscored
      ? unscored.toLocaleString('en-US') + ' of the ' + F.counts.cp.toLocaleString('en-US') +
        ' records are not on this chart at all: their family has no sampled parameter ' +
        'in the simulation either, so there is nothing to borrow. They are listed as ' +
        'unscored in the table below and in the parameter gaps. '
      : '') +
    'Select a cell to filter the explorer.');
  left.appendChild(note);
  const legend = el('div', 'fmea-matrix-legend');
  const cpLegend: (Band | 'unscored')[] = (BANDS as readonly (Band | 'unscored')[])
    .concat(['unscored']);
  cpLegend.forEach(function (b) {
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
    'scorekeeping board. ' + F.gaps.deferredDefinition));
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
/* R276: the disclosure that belongs beside a score of this provenance. A
   borrowed score is a real score taken from another layer and says so; only a
   record with no score at all is called unscored. */
function basisWithSource(r: FmeaRecord): string {
  const note = PROBABILITY_SOURCE_NOTE[r.probabilitySource];
  return note ? r.probabilityBasis + ' (' + note + ')' : r.probabilityBasis;
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
  /* R276: a record with no probability has no risk and no RPN either, so the
     pills that would multiply through it are not drawn. Consequence is still
     assessed and is still shown, which is what the page says happens. */
  if (SCORE_PUBLISHING_SOURCES.indexOf(r.probabilitySource) < 0) {
    pills.appendChild(scorePill('consequence', r.consequence, 'fmea-pill-c'));
    pills.appendChild(el('span', 'fmea-pill fmea-pill-p', 'probability not published'));
  } else {
    pills.appendChild(scorePill('probability', r.probability, 'fmea-pill-p'));
    pills.appendChild(scorePill('consequence', r.consequence, 'fmea-pill-c'));
    pills.appendChild(scorePill('risk', r.risk, 'fmea-pill-r'));
    pills.appendChild(scorePill('RPN', r.rpn, 'fmea-pill-d'));
  }
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
  grid.appendChild(detailField('Probability basis', basisWithSource(r), true));
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

  /* group by band so the table reads worst-first, unscored last */
  TABLE_GROUPS.forEach(function (t) {
    const group = records.filter(function (r) { return r.band === t.band; });
    if (!group.length) return;
    const tb = el('tbody', 'fmea-group');
    const grow = el('tr', 'fmea-group-row');
    const gc = el('th');
    (gc as HTMLTableCellElement).colSpan = 8;
    gc.appendChild(el('span', 'fmea-group-dot fmea-cell-' + t.band));
    gc.appendChild(el('span', '', t.band === 'unscored'
      ? t.tier + ' · no probability could be derived'
      : t.tier + ' · ' + BAND_META[t.band].label + ' risk'));
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
  renderDeferredNote();
  renderProbabilityScale();
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
