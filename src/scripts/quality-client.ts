/* Quality tab client: controlled KPP/TPP/CP catalog with rollout milestones,
   floor table, filterable grouped explorer, per-parameter phase strip, and
   acronym hovers. Port of docs/js/quality.js:1-490. Runs on astro:page-load;
   idempotent via the phase-overview host's dataset.wired guard.
   NOTE: the " - maturity" suffix on line ~120 was a U+2014 em dash carried
   over from the retired docs/ build for DOM parity. It renders only at
   runtime in phase-filtered cells, so the build-time HTML tests never saw
   it; converted to a hyphen 2026-08-12 when docs/ parity stopped mattering. */
import { QUALITY_DATA as DATA } from '../lib/quality';
import type { QualityParameter } from '../lib/quality-data';
import {
  EQUATIONS, DIAGRAM_GROUPS, computeTargets, evaluateAtPhase, EQ_PHASES,
  RAMP_META, MODEL_META, paramValueAt, rampValueAt, modelValueAt, collectDeps
} from '../lib/equations';
import type { EqTargets, ExprNode, RampId, ModelId } from '../lib/equations';
import { renderEquation } from '../lib/equation-render';
import { buildDiagram, renderDiagram } from '../lib/equation-diagram';
import type { Diagram } from '../lib/equation-diagram';
import { SCENARIOS } from '../lib/scenarios';
import { PARAMS_BY_ID } from '../lib/params';

let selectedId = 'KPP-A1';
const PHASES = DATA.phases;

/* ---- Equation explorer state ---- */
let eqScenario = 'SCN-BASE';
let eqGroup = DIAGRAM_GROUPS[0].id;
let eqPhase = 'P8';
let eqNode: string | null = null;
const eqTargetCache: Record<string, EqTargets> = {};
function eqTargets(): EqTargets {
  if (!eqTargetCache[eqScenario]) {
    eqTargetCache[eqScenario] = computeTargets(DATA, eqScenario);
  }
  return eqTargetCache[eqScenario];
}
function eqScenarioName(): string {
  const s = SCENARIOS.filter(function (x) { return x.id === eqScenario; })[0];
  return s ? s.name : eqScenario;
}

const ACRONYMS: Record<string, string> = {
  'A1-HCAC': 'Article I Health Claims and Appeals Court',
  'ACA': 'Affordable Care Act',
  'ACDRH': 'Administration for Care Delivery and Regional Health',
  'AI': 'Artificial Intelligence',
  'AICIO': 'Artificial Intelligence Clinical Integration Office',
  'AMDDT': 'Administration for Medicines, Devices, Diagnostics, and Therapeutics',
  'API': 'Application Programming Interface',
  'BH': 'Behavioral Health',
  'CHAO': 'Congressional Health Accountability Office',
  'CP': 'Cost Parameter',
  'DME': 'Durable Medical Equipment',
  'DNHA': 'Department of National Health Assurance',
  'DVH': 'Dental, Vision, and Hearing',
  'ED': 'Emergency Department',
  'EMS': 'Emergency Medical Services',
  'EPTO': 'Employer and Payroll Transition Office',
  'FA': 'Specified assumption',
  'GDP': 'Gross Domestic Product',
  'HATC': 'Health Administration Transition Corps',
  'HCCA': 'Health Cybersecurity and Continuity Authority',
  'HFASB': 'Health Financing Actuary and Stabilization Board',
  'IT': 'Information Technology',
  'KPP': 'Key Performance Parameter',
  'LTC': 'Long-Term Care',
  'NBIA': 'National Biomedical Innovation Agency',
  'NCCA': 'National Coverage and Claims Authority',
  'NCDSO': 'National Clinical Data Standards Office',
  'NDPA': 'National Drug Purchasing Authority',
  'NEEA': 'National Enrollment and Eligibility Authority',
  'NEMTA': 'National EMS and Medical Transport Authority',
  'NHAC': 'National Health Accountability Commission',
  'NHASB': 'National Health Adaptation and Scorekeeping Board',
  'NHETF': 'National Health Equalization Trust Fund',
  'NHRA': 'National Health Records Authority',
  'NHSA': 'National Hospital Stewardship Authority',
  'NHTCA': 'National Health Transition and Continuity Authority',
  'NHWB': 'National Health Workforce Board',
  'NHWECA': 'National Health Workforce Education and Capacity Authority',
  'NOPRSL': 'National Office of Patient Rights, Safety, and Legitimacy',
  'NPSMIB': 'National Patient Safety and Medical Injury Board',
  'NSAA': 'National Specialty Access Authority',
  'OCDTI': 'Office of Community Diagnostic and Treatment Infrastructure',
  'OMB': 'Office of Management and Budget',
  'PBM': 'Pharmacy Benefit Manager',
  'PCU': 'National Pharmacy Claims Utility',
  'PILO': 'Public-Interest Licensing Office',
  'PMC': 'Public Medicines Corporation',
  'PROO': 'Patient Rights and Ombudsman Office',
  'RHA': 'Regional Health Administrators',
  'SRCO': 'State and Regional Compact Office',
  'SUD': 'Substance Use Disorder',
  'TBD': 'To Be Determined',
  'THDO': 'Treasury Health Disbursement Office',
  'TPP': 'Technical Performance Parameter',
  'TRTO': 'Tribal and Rural Transition Office',
  'USD': 'United States Dollars'
};

function el(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function natural(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}
function byId(id: string): HTMLElement | null { return document.getElementById(id); }

function entriesForPhase(parameter: QualityParameter, phase: string) {
  return parameter.rollout.filter(function (entry) { return entry.phase === phase; });
}

function targetForTable(parameter: QualityParameter, phase: string): string {
  if (phase === 'all') return parameter.target;
  const entries = entriesForPhase(parameter, phase);
  if (!entries.length) {
    return parameter.type === 'CP'
      ? 'Not phase-targeted'
      : 'No numeric target specified';
  }
  return entries.map(function (entry) {
    if (entry.kind === 'equation-derived target' && eqScenario !== 'SCN-BASE') {
      const t = eqTargets()[parameter.id];
      if (t && t[phase] && isFinite(t[phase].num)) {
        return t[phase].text + ' · ' + eqScenarioName();
      }
    }
    return entry.value + (entry.kind === 'maturity target' ? ' - maturity' : '');
  }).join(' · ');
}

function filteredParameters(): QualityParameter[] {
  const search = byId('quality-search') as HTMLInputElement | null;
  const type = byId('quality-type') as HTMLSelectElement | null;
  const concept = byId('quality-concept') as HTMLSelectElement | null;
  const query = search ? search.value.trim().toLowerCase() : '';
  return DATA.parameters.filter(function (parameter) {
    if (type && type.value !== 'all' && parameter.type !== type.value) return false;
    if (concept && concept.value !== 'all' && parameter.concept !== concept.value) return false;
    return !query || (parameter._search || '').indexOf(query) >= 0;
  });
}

function populateConcepts(): void {
  const concept = byId('quality-concept');
  if (!concept) return;
  DATA.concepts.forEach(function (c) {
    const option = el('option', '', c) as HTMLOptionElement;
    option.value = c;
    concept.appendChild(option);
  });
}

function renderPhaseOverview(): void {
  const host = byId('quality-phase-overview');
  if (!host) return;
  host.innerHTML = '';
  const milestones: Record<string, { id: string; value: string; kind: string; gate?: string }[]> = {};
  PHASES.forEach(function (phase) { milestones[phase.id] = []; });
  DATA.parameters.forEach(function (parameter) {
    parameter.rollout.forEach(function (entry) {
      if (entry.kind !== 'maturity target' &&
          entry.kind !== 'derived interim target' &&
          entry.kind !== 'equation-derived target' &&
          entry.kind !== 'data-plan interim target') {
        milestones[entry.phase].push({
          id: parameter.id, value: entry.value, kind: entry.kind, gate: entry.gate
        });
      }
    });
  });

  PHASES.forEach(function (phase) {
    const item = el('article', 'quality-phase');
    if (milestones[phase.id].length || phase.id === 'P8') {
      item.classList.add('has-target');
    }
    const top = el('div', 'quality-phase-top');
    top.appendChild(el('b', '', phase.id));
    top.appendChild(el('span', '', phase.anchor));
    item.appendChild(top);
    item.appendChild(el('h3', '', phase.purpose));

    const list = el('div', 'quality-phase-targets');
    if (!milestones[phase.id].length && phase.id !== 'P8') {
      list.appendChild(el('span', 'quality-no-target',
        'No numeric parameter milestone specified'));
    } else {
      milestones[phase.id].sort(function (a, b) { return natural(a.id, b.id); });
      milestones[phase.id].forEach(function (milestone) {
        const line = el('span', 'quality-phase-target');
        line.appendChild(el('b', '', milestone.id));
        line.appendChild(document.createTextNode(' ' + milestone.value));
        if (milestone.gate) {
          line.appendChild(el('small', '', milestone.gate + ' floor'));
        }
        list.appendChild(line);
      });
      if (phase.id === 'P8') {
        const mature = el('span', 'quality-phase-target maturity');
        mature.appendChild(el('b', '', 'All 120 KPP/TPP records'));
        mature.appendChild(document.createTextNode(' assessed against source targets'));
        list.appendChild(mature);
      }
    }
    item.appendChild(list);
    host.appendChild(item);
  });
}

function renderFloorTable(): void {
  const host = byId('quality-floor-table');
  if (!host) return;
  const table = el('table', 'data quality-floor-table');
  const caption = el('caption', 'sr-only',
    'Exact rollout milestones and progression floors compared with maturity targets');
  table.appendChild(caption);
  const thead = el('thead');
  const head = el('tr');
  ['Phase', 'Parameter', 'Progression value', 'Mature target', 'What it controls']
    .forEach(function (label) { head.appendChild(el('th', '', label)); });
  thead.appendChild(head);
  table.appendChild(thead);
  const tbody = el('tbody');
  const rows: { parameter: QualityParameter; entry: QualityParameter['rollout'][number] }[] = [];
  DATA.parameters.forEach(function (parameter) {
    parameter.rollout.forEach(function (entry) {
      if (entry.kind === 'maturity target' ||
          entry.kind === 'derived interim target' ||
          entry.kind === 'equation-derived target' ||
          entry.kind === 'data-plan interim target') return;
      rows.push({ parameter: parameter, entry: entry });
    });
  });
  rows.sort(function (a, b) {
    return natural(a.entry.phase + a.parameter.id, b.entry.phase + b.parameter.id);
  });
  rows.forEach(function (item) {
    const tr = el('tr');
    const gate = DATA.gates.filter(function (candidate) {
      return candidate.id === item.entry.gate;
    })[0];
    tr.appendChild(el('th', 'text-nowrap',
      item.entry.phase + (item.entry.gate ? ' / ' + item.entry.gate : '')));
    tr.appendChild(el('td', 'text-nowrap', item.parameter.id));
    tr.appendChild(el('td', 'quality-floor-value', item.entry.value));
    tr.appendChild(el('td', '', item.parameter.target));
    tr.appendChild(el('td', '',
      gate ? gate.decision : 'P5 delivery-scale exit milestone'));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  host.appendChild(table);
}

/* =========================================================================
 * Equation panel + flow diagrams
 * ========================================================================= */
function fmtVal(v: number, decimals: number): string {
  if (!isFinite(v)) return 'not yet measurable';
  if (Math.abs(v) >= 10000) return Math.round(v).toLocaleString('en-US');
  return v.toFixed(decimals);
}
function leafValueText(kind: string, refId: string): string {
  if (kind === 'param') {
    const d = PARAMS_BY_ID[refId];
    const v = paramValueAt(eqScenario, refId);
    return fmtVal(v, Math.abs(v) < 10 ? 2 : 1) + (d && d.unit ? ' ' + d.unit : '');
  }
  if (kind === 'ramp') return fmtVal(rampValueAt(eqScenario, refId as RampId, eqPhase), 2);
  if (kind === 'model') {
    const v = modelValueAt(eqScenario, refId as ModelId, eqPhase);
    return fmtVal(v, Math.abs(v) >= 100 ? 0 : 2);
  }
  return '';
}
function eqResolve(node: ExprNode): { text: string; title?: string; cls?: string; nodeId?: string } {
  switch (node.k) {
    case 'num': {
      const txt = Math.abs(node.v) >= 1000
        ? node.v.toLocaleString('en-US')
        : String(+node.v.toFixed(4));
      return { text: txt, title: node.label, cls: 'eq-num' };
    }
    case 'param':
      return {
        text: node.id, cls: 'eq-tok-param', nodeId: 'param:' + node.id,
        title: ((PARAMS_BY_ID[node.id] && PARAMS_BY_ID[node.id].label) || node.id) +
          ' = ' + leafValueText('param', node.id) + ' (' + eqScenarioName() + ')'
      };
    case 'ramp':
      return {
        text: RAMP_META[node.id].sym, cls: 'eq-tok-ramp', nodeId: 'ramp:' + node.id,
        title: RAMP_META[node.id].label + ' = ' + leafValueText('ramp', node.id) + ' at ' + eqPhase
      };
    case 'model':
      return {
        text: MODEL_META[node.id].sym, cls: 'eq-tok-model', nodeId: 'model:' + node.id,
        title: MODEL_META[node.id].label + ' = ' + leafValueText('model', node.id) + ' at ' + eqPhase
      };
    case 'ref': {
      const d = EQUATIONS[node.id];
      const v = evaluateAtPhase(node.id, eqScenario, eqPhase);
      return {
        text: node.id + '(t)', nodeId: node.id,
        cls: d && d.kind === 'index' ? 'eq-tok-index' : 'eq-tok-ref',
        title: (d ? d.name : node.id) + ' = ' + fmtVal(v, d ? d.decimals : 1) + ' at ' + eqPhase
      };
    }
    default:
      return { text: '' };
  }
}
function paramById(id: string): QualityParameter | null {
  return DATA.parameters.filter(function (x) { return x.id === id; })[0] || null;
}
function buildEquationPanel(id: string, compact?: boolean): HTMLElement {
  const d = EQUATIONS[id];
  const panel = el('div', 'quality-eq-card');
  if (!d) return panel;
  const cat = paramById(id);

  const head = el('div', 'quality-eq-card-head');
  const idLine = el('div', 'quality-id-line');
  idLine.appendChild(el('span',
    'quality-type quality-type-' + (d.kind === 'index' ? 'idx' : d.kind.toLowerCase()),
    d.kind === 'index' ? 'INDEX' : d.kind));
  idLine.appendChild(el('b', '', id));
  head.appendChild(idLine);
  head.appendChild(el('h3', '', cat ? cat.name : d.name));
  panel.appendChild(head);
  panel.appendChild(el('p', 'quality-eq-why', d.why));

  const formulaWrap = el('div', 'quality-eq-formula-wrap tbl-scroll');
  formulaWrap.appendChild(renderEquation(id, d.expr, eqResolve));
  panel.appendChild(formulaWrap);

  /* inputs legend */
  const deps = collectDeps(d.expr);
  const rows: { sym: string; label: string; val: string; nodeId?: string }[] = [];
  deps.params.forEach(function (pid) {
    rows.push({
      sym: pid, nodeId: 'param:' + pid,
      label: (PARAMS_BY_ID[pid] && PARAMS_BY_ID[pid].label) || pid,
      val: leafValueText('param', pid)
    });
  });
  deps.ramps.forEach(function (rid) {
    rows.push({ sym: RAMP_META[rid].sym, nodeId: 'ramp:' + rid, label: RAMP_META[rid].label, val: leafValueText('ramp', rid) });
  });
  deps.models.forEach(function (mid) {
    rows.push({ sym: MODEL_META[mid].sym, nodeId: 'model:' + mid, label: MODEL_META[mid].label, val: leafValueText('model', mid) });
  });
  deps.refs.forEach(function (rid) {
    const rd = EQUATIONS[rid];
    rows.push({
      sym: rid + '(t)', nodeId: rid,
      label: rd ? rd.name : rid,
      val: fmtVal(evaluateAtPhase(rid, eqScenario, eqPhase), rd ? rd.decimals : 1)
    });
  });
  if (rows.length) {
    const tbl = el('table', 'data quality-eq-inputs');
    const thead = el('thead');
    const hr = el('tr');
    ['Input', 'What it is', 'Value at ' + eqPhase + ' (' + eqScenarioName() + ')'].forEach(function (h) {
      hr.appendChild(el('th', '', h));
    });
    thead.appendChild(hr);
    tbl.appendChild(thead);
    const tb = el('tbody');
    rows.forEach(function (rw) {
      const tr = el('tr');
      const sym = el('th');
      const btn = el('button', 'quality-eq-input-link', rw.sym) as HTMLButtonElement;
      btn.type = 'button';
      if (rw.nodeId) btn.dataset.eqNode = rw.nodeId;
      sym.appendChild(btn);
      tr.appendChild(sym);
      tr.appendChild(el('td', '', rw.label));
      tr.appendChild(el('td', 'text-nowrap', rw.val));
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    const wrap = el('div', 'tbl-scroll');
    wrap.appendChild(tbl);
    panel.appendChild(wrap);
  }

  /* computed value strip for catalog parameters */
  if (cat && !compact) {
    const t = eqTargets()[id];
    if (t) {
      const stripHead = el('div', 'quality-phase-strip-head');
      stripHead.appendChild(el('b', '', 'Equation value by phase (' + eqScenarioName() + ')'));
      stripHead.appendChild(el('span', '',
        'Raw equation output; the catalog holds committed floors where they are stricter.'));
      panel.appendChild(stripHead);
      const strip = el('div', 'quality-phase-strip quality-eq-strip');
      const startIdx = EQ_PHASES.indexOf(cat._phaseStart || 'P0');
      EQ_PHASES.forEach(function (ph, i) {
        const cell = el('div', 'quality-phase-cell');
        const top = el('div', 'quality-phase-cell-top');
        top.appendChild(el('b', '', ph));
        cell.appendChild(top);
        if (i < startIdx || !t[ph] || !isFinite(t[ph].num)) {
          cell.appendChild(el('p', 'quality-no-target', 'Not yet measurable'));
        } else {
          cell.classList.add('has-target');
          cell.appendChild(el('p', 'quality-cell-value', t[ph].text));
        }
        strip.appendChild(cell);
      });
      panel.appendChild(strip);
    }
  } else if (d.kind === 'index' && !compact) {
    const strip = el('div', 'quality-phase-strip quality-eq-strip');
    EQ_PHASES.forEach(function (ph) {
      const cell = el('div', 'quality-phase-cell has-target');
      const top = el('div', 'quality-phase-cell-top');
      top.appendChild(el('b', '', ph));
      cell.appendChild(top);
      cell.appendChild(el('p', 'quality-cell-value', fmtVal(evaluateAtPhase(id, eqScenario, ph), 2)));
      strip.appendChild(cell);
    });
    panel.appendChild(strip);
  }
  return panel;
}

const diagramCache: Record<string, Diagram> = {};
function currentDiagram(): Diagram {
  if (!diagramCache[eqGroup]) {
    const group = DIAGRAM_GROUPS.filter(function (g) { return g.id === eqGroup; })[0];
    diagramCache[eqGroup] = buildDiagram(group ? group.members : []);
  }
  return diagramCache[eqGroup];
}
function defaultNodeFor(groupId: string): string | null {
  const group = DIAGRAM_GROUPS.filter(function (g) { return g.id === groupId; })[0];
  if (!group) return null;
  const kpps = group.members.filter(function (id) {
    return EQUATIONS[id] && EQUATIONS[id].kind === 'KPP';
  });
  return kpps[0] || group.members[0] || null;
}
function buildLeafPanel(nodeId: string): HTMLElement {
  const panel = el('div', 'quality-eq-card');
  const sep = nodeId.indexOf(':');
  const kind = nodeId.slice(0, sep);
  const refId = nodeId.slice(sep + 1);
  let label = refId;
  if (kind === 'param') label = (PARAMS_BY_ID[refId] && PARAMS_BY_ID[refId].label) || refId;
  if (kind === 'ramp') label = RAMP_META[refId as RampId].label;
  if (kind === 'model') label = MODEL_META[refId as ModelId].label;
  const head = el('div', 'quality-eq-card-head');
  const idLine = el('div', 'quality-id-line');
  idLine.appendChild(el('span', 'quality-type quality-type-input',
    kind === 'param' ? 'COST MODEL INPUT' : (kind === 'ramp' ? 'BUILD STATE' : 'FISCAL ENGINE')));
  idLine.appendChild(el('b', '', refId));
  head.appendChild(idLine);
  head.appendChild(el('h3', '', label));
  panel.appendChild(head);
  panel.appendChild(el('p', 'quality-eq-why',
    'Value at ' + eqPhase + ' under ' + eqScenarioName() + ': ' + leafValueText(kind, refId) + '.'));
  if (kind === 'param') {
    panel.appendChild(el('p', 'quality-eq-why',
      'This is a researched cost-model parameter; stress scenarios on the healthcare tab move it, and every equation that uses it moves with it.'));
  }
  /* which equations consume this input, within the current diagram */
  const consumers = currentDiagram().edges
    .filter(function (e) { return e.from === nodeId; })
    .map(function (e) { return e.to; });
  if (consumers.length) {
    const line = el('div', 'quality-eq-consumers');
    line.appendChild(el('span', 'quality-kicker', 'Feeds'));
    consumers.forEach(function (cid) {
      const btn = el('button', 'quality-eq-input-link', cid) as HTMLButtonElement;
      btn.type = 'button';
      btn.dataset.eqNode = cid;
      line.appendChild(btn);
    });
    panel.appendChild(line);
  }
  return panel;
}
function renderEqExplorer(): void {
  const host = byId('quality-eq-diagram');
  const detail = byId('quality-eq-detail');
  if (!host || !detail) return;
  const group = DIAGRAM_GROUPS.filter(function (g) { return g.id === eqGroup; })[0];
  const descNode = byId('quality-eq-groupdesc');
  if (descNode && group) descNode.textContent = group.desc;
  if (!eqNode) eqNode = defaultNodeFor(eqGroup);
  renderDiagram(host, currentDiagram(), eqNode, function (nodeId) {
    eqNode = nodeId;
    renderEqExplorer();
    if (EQUATIONS[nodeId] && paramById(nodeId)) {
      selectedId = nodeId;
      refresh();
    }
  });
  detail.innerHTML = '';
  if (eqNode) {
    detail.appendChild(eqNode.indexOf(':') >= 0 ? buildLeafPanel(eqNode) : buildEquationPanel(eqNode));
  }
}
function eqNodeClickDelegate(event: Event): void {
  const btn = (event.target as Element).closest('[data-eq-node]') as HTMLElement | null;
  if (!btn) return;
  const nodeId = btn.dataset.eqNode || '';
  const diagram = currentDiagram();
  const inDiagram = diagram.nodes.some(function (nd) { return nd.id === nodeId; });
  if (!inDiagram) {
    /* jump to the diagram that owns this equation */
    const d = EQUATIONS[nodeId];
    if (d) {
      eqGroup = d.group;
      const groupSel = byId('quality-eq-group') as HTMLSelectElement | null;
      if (groupSel) groupSel.value = eqGroup;
    }
  }
  eqNode = nodeId;
  renderEqExplorer();
}

function detailField(label: string, value: string, className?: string): HTMLElement {
  const field = el('div', 'quality-detail-field' + (className ? ' ' + className : ''));
  field.appendChild(el('span', 'quality-kicker', label));
  field.appendChild(el('p', '', value || 'Not specified'));
  return field;
}

function renderSelected(parameter: QualityParameter): void {
  const host = byId('quality-selected');
  if (!host) return;
  host.innerHTML = '';

  const header = el('div', 'quality-selected-head');
  const identity = el('div');
  const idLine = el('div', 'quality-id-line');
  idLine.appendChild(el('span', 'quality-type quality-type-' +
    parameter.type.toLowerCase(), parameter.type));
  idLine.appendChild(el('b', '', parameter.id));
  identity.appendChild(idLine);
  identity.appendChild(el('h3', '', parameter.name));
  identity.appendChild(el('p', '', parameter.concept));
  header.appendChild(identity);
  const sourceTarget = el('div', 'quality-source-target');
  sourceTarget.appendChild(el('span', 'quality-kicker',
    parameter.type === 'CP' ? 'Controlled value / status' : 'Source / maturity target'));
  sourceTarget.appendChild(el('strong', '', parameter.target));
  header.appendChild(sourceTarget);
  host.appendChild(header);

  const fields = el('div', 'quality-detail-grid');
  fields.appendChild(detailField('Where it matters',
    parameter.where + (parameter.family ? ' · ' + parameter.family : '')));
  fields.appendChild(detailField('Accountable owner / verifier',
    parameter.ownerVerifier));
  fields.appendChild(detailField(
    parameter.type === 'CP' ? 'Definition' : 'Calculation contract',
    parameter.calculation, 'quality-detail-wide'));
  fields.appendChild(detailField(
    parameter.type === 'CP' ? 'Canonical unit and model role' : 'Datasets',
    parameter.type === 'CP'
      ? [parameter.unit, parameter.modelRole, parameter.temporal].filter(Boolean).join(' · ')
      : parameter.datasets,
    'quality-detail-wide'));
  fields.appendChild(detailField('Control status',
    parameter.type === 'CP'
      ? parameter.unitStatus + ' · ' + parameter.status
      : parameter.status,
    'quality-detail-wide'));
  host.appendChild(fields);

  const phaseHeading = el('div', 'quality-phase-strip-head');
  phaseHeading.appendChild(el('b', '', 'Target by rollout phase'));
  phaseHeading.appendChild(el('span', '', parameter.phaseNote));
  host.appendChild(phaseHeading);

  const strip = el('div', 'quality-phase-strip');
  PHASES.forEach(function (phase) {
    const cell = el('div', 'quality-phase-cell');
    const entries = entriesForPhase(parameter, phase.id);
    if (entries.length) cell.classList.add('has-target');
    const phaseTop = el('div', 'quality-phase-cell-top');
    phaseTop.appendChild(el('b', '', phase.id));
    phaseTop.appendChild(el('span', '', phase.anchor));
    cell.appendChild(phaseTop);
    if (!entries.length) {
      cell.appendChild(el('p', 'quality-no-target',
        parameter.type === 'CP'
          ? 'Not phase-targeted'
          : 'No numeric target specified'));
    } else {
      entries.forEach(function (entry) {
        let text = entry.value;
        let kindNote = (entry.gate ? entry.gate + ' · ' : '') + entry.kind;
        if (entry.kind === 'equation-derived target' && eqScenario !== 'SCN-BASE') {
          const t = eqTargets()[parameter.id];
          if (t && t[phase.id] && isFinite(t[phase.id].num)) {
            text = t[phase.id].text;
            kindNote = 'equation-derived · ' + eqScenarioName();
          }
        }
        const value = el('p', 'quality-cell-value', text);
        value.appendChild(el('small', '', kindNote));
        cell.appendChild(value);
      });
    }
    strip.appendChild(cell);
  });
  host.appendChild(strip);

  /* the parameter's equation, when it has one */
  if (EQUATIONS[parameter.id]) {
    const eqHead = el('div', 'quality-phase-strip-head');
    eqHead.appendChild(el('b', '', 'Target equation'));
    eqHead.appendChild(el('span', '',
      'Input values shown at ' + eqPhase + ' under ' + eqScenarioName() +
      '; change either in the equation explorer above.'));
    host.appendChild(eqHead);
    host.appendChild(buildEquationPanel(parameter.id, true));
  }
}

function renderTable(parameters: QualityParameter[]): void {
  const table = byId('quality-table');
  if (!table) return;
  table.innerHTML = '';
  const phaseNode = byId('quality-phase') as HTMLSelectElement | null;
  const phase = phaseNode ? phaseNode.value : 'all';
  const phaseLabel = phase === 'all'
    ? 'Source / maturity value'
    : phase + ' target / value';

  const thead = el('thead');
  const head = el('tr');
  ['ID', 'Parameter', 'Type', 'Where it matters', phaseLabel]
    .forEach(function (label) { head.appendChild(el('th', '', label)); });
  thead.appendChild(head);
  table.appendChild(thead);

  if (!parameters.length) {
    const emptyBody = el('tbody');
    const emptyRow = el('tr');
    const empty = el('td', 'quality-empty', 'No parameters match the current filters.');
    (empty as HTMLTableCellElement).colSpan = 5;
    emptyRow.appendChild(empty);
    emptyBody.appendChild(emptyRow);
    table.appendChild(emptyBody);
    return;
  }

  DATA.concepts.forEach(function (concept) {
    const group = parameters.filter(function (parameter) {
      return parameter.concept === concept;
    });
    if (!group.length) return;
    group.sort(function (a, b) {
      const order: Record<string, number> = { KPP: 0, TPP: 1, CP: 2 };
      return order[a.type] - order[b.type] || natural(a.id, b.id);
    });

    const tbody = el('tbody', 'quality-group');
    const groupRow = el('tr', 'quality-group-row');
    const groupCell = el('th');
    (groupCell as HTMLTableCellElement).colSpan = 5;
    groupCell.appendChild(el('span', '', concept));
    groupCell.appendChild(el('small', '', group.length + ' records'));
    groupRow.appendChild(groupCell);
    tbody.appendChild(groupRow);

    group.forEach(function (parameter) {
      const row = el('tr');
      if (parameter.id === selectedId) row.classList.add('is-selected');
      const idCell = el('th', 'text-nowrap');
      const select = el('button', 'quality-select', parameter.id) as HTMLButtonElement;
      select.type = 'button';
      select.dataset.parameterId = parameter.id;
      select.setAttribute('aria-pressed', parameter.id === selectedId ? 'true' : 'false');
      select.setAttribute('aria-label', 'Show details for ' +
        parameter.id + ', ' + parameter.name);
      idCell.appendChild(select);
      row.appendChild(idCell);
      row.appendChild(el('td', 'quality-name', parameter.name));
      const typeCell = el('td');
      typeCell.appendChild(el('span', 'quality-type quality-type-' +
        parameter.type.toLowerCase(), parameter.type));
      row.appendChild(typeCell);
      row.appendChild(el('td', 'quality-where',
        parameter.where + (parameter.family ? ' · ' + parameter.family : '')));
      const target = el('td', 'quality-target', targetForTable(parameter, phase));
      if (phase !== 'all' && !entriesForPhase(parameter, phase).length) {
        target.classList.add('not-specified');
      }
      row.appendChild(target);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
  });
}

function addAcronymHovers(root: HTMLElement | null): void {
  if (!root) return;
  const keys = Object.keys(ACRONYMS).sort(function (a, b) { return b.length - a.length; });
  const escaped = keys.map(function (key) { return key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
  const pattern = new RegExp('\\b(' + escaped.join('|') + ')\\b', 'g');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent || parent.closest('abbr, script, style, option, svg, .eq-formula')) continue;
    pattern.lastIndex = 0;
    if (pattern.test(node.nodeValue || '')) textNodes.push(node);
  }
  textNodes.forEach(function (node) {
    const text = node.nodeValue || '';
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    pattern.lastIndex = 0;
    text.replace(pattern, function (match: string, acronym: string, offset: number) {
      if (offset > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
      const abbr = el('abbr', 'quality-acronym', acronym);
      abbr.title = ACRONYMS[acronym];
      abbr.setAttribute('aria-label', acronym + ': ' + ACRONYMS[acronym]);
      fragment.appendChild(abbr);
      lastIndex = offset + match.length;
      return match;
    });
    if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    node.parentNode!.replaceChild(fragment, node);
  });
}

function refresh(): void {
  const parameters = filteredParameters();
  if (!parameters.some(function (parameter) { return parameter.id === selectedId; })) {
    selectedId = parameters.length ? parameters[0].id : '';
  }
  const results = byId('quality-results');
  if (results) {
    results.textContent = parameters.length.toLocaleString('en-US') +
      ' of ' + DATA.counts.total.toLocaleString('en-US') + ' parameters shown';
  }

  if (selectedId) {
    const selected = DATA.parameters.filter(function (parameter) {
      return parameter.id === selectedId;
    })[0];
    renderSelected(selected);
  } else {
    const sel = byId('quality-selected');
    if (sel) sel.innerHTML = '<p class="quality-empty">Adjust the filters to select a parameter.</p>';
  }
  renderTable(parameters);
  addAcronymHovers(byId('quality-selected'));
  addAcronymHovers(byId('quality-table'));
}

function initQuality(): void {
  const overview = byId('quality-phase-overview');
  if (!overview) return; // not on the quality page
  if (overview.dataset.wired === '1') return;
  overview.dataset.wired = '1';
  selectedId = 'KPP-A1';

  populateConcepts();
  renderPhaseOverview();
  renderFloorTable();

  /* equation explorer controls */
  const eqScenarioSel = byId('quality-eq-scenario') as HTMLSelectElement | null;
  if (eqScenarioSel && !eqScenarioSel.options.length) {
    SCENARIOS.forEach(function (s) {
      const opt = el('option', '', s.name) as HTMLOptionElement;
      opt.value = s.id;
      eqScenarioSel.appendChild(opt);
    });
    eqScenarioSel.value = eqScenario;
  }
  const eqGroupSel = byId('quality-eq-group') as HTMLSelectElement | null;
  if (eqGroupSel && !eqGroupSel.options.length) {
    DIAGRAM_GROUPS.forEach(function (g) {
      const opt = el('option', '', g.title) as HTMLOptionElement;
      opt.value = g.id;
      eqGroupSel.appendChild(opt);
    });
    eqGroupSel.value = eqGroup;
  }
  const eqPhaseSel = byId('quality-eq-phase') as HTMLSelectElement | null;
  if (eqPhaseSel) eqPhaseSel.value = eqPhase;
  if (eqScenarioSel) eqScenarioSel.addEventListener('change', function () {
    eqScenario = eqScenarioSel.value;
    renderEqExplorer();
    refresh();
  });
  if (eqGroupSel) eqGroupSel.addEventListener('change', function () {
    eqGroup = eqGroupSel.value;
    eqNode = null;
    renderEqExplorer();
  });
  if (eqPhaseSel) eqPhaseSel.addEventListener('change', function () {
    eqPhase = eqPhaseSel.value;
    renderEqExplorer();
    refresh();
  });
  const eqDetail = byId('quality-eq-detail');
  if (eqDetail) eqDetail.addEventListener('click', eqNodeClickDelegate);
  const selHost = byId('quality-selected');
  if (selHost) selHost.addEventListener('click', eqNodeClickDelegate);
  renderEqExplorer();

  addAcronymHovers(document.querySelector('main'));
  refresh();

  const search = byId('quality-search');
  const type = byId('quality-type');
  const concept = byId('quality-concept');
  const phase = byId('quality-phase');
  const reset = byId('quality-reset');
  const table = byId('quality-table');
  if (search) search.addEventListener('input', refresh);
  if (type) type.addEventListener('change', refresh);
  if (concept) concept.addEventListener('change', refresh);
  if (phase) phase.addEventListener('change', refresh);
  if (reset) reset.addEventListener('click', function () {
    (byId('quality-search') as HTMLInputElement).value = '';
    (byId('quality-type') as HTMLSelectElement).value = 'all';
    (byId('quality-concept') as HTMLSelectElement).value = 'all';
    (byId('quality-phase') as HTMLSelectElement).value = 'all';
    selectedId = 'KPP-A1';
    refresh();
  });
  if (table) table.addEventListener('click', function (event) {
    const button = (event.target as Element).closest('button[data-parameter-id]') as HTMLElement | null;
    if (!button) return;
    selectedId = button.dataset.parameterId || '';
    refresh();
    const sel = byId('quality-selected');
    if (sel) sel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

/* Run on astro:page-load for View Transition navigations, and also on the
   initial load without waiting for that event: this module is the heaviest on
   the site (it statically imports the full 440-record catalog), so on a real
   network it can finish evaluating after the ClientRouter has already fired the
   first astro:page-load, missing it and leaving the catalog blank. Mirrors the
   fallback in acronyms-client.ts; initQuality is idempotent via dataset.wired. */
document.addEventListener('astro:page-load', initQuality);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initQuality);
} else {
  initQuality();
}
