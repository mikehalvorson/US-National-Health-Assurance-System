/* Quality tab client: controlled KPP/TPP/CP catalog with rollout milestones,
   floor table, filterable grouped explorer, per-parameter phase strip, and
   acronym hovers. Port of docs/js/quality.js:1-490. Runs on astro:page-load;
   idempotent via the phase-overview host's dataset.wired guard.
   NOTE: the " — maturity" suffix on line ~120 is a verbatim em dash from
   the source; it renders only at runtime in phase-filtered cells (build-time
   HTML stays em-dash-free) and is preserved for DOM parity with the live docs. */
import { QUALITY_DATA as DATA } from '../lib/quality';
import type { QualityParameter } from '../lib/quality-data';

let selectedId = 'KPP-A1';
const PHASES = DATA.phases;

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
    return entry.value + (entry.kind === 'maturity target' ? ' — maturity' : '');
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
        const value = el('p', 'quality-cell-value', entry.value);
        value.appendChild(el('small', '',
          (entry.gate ? entry.gate + ' · ' : '') + entry.kind));
        cell.appendChild(value);
      });
    }
    strip.appendChild(cell);
  });
  host.appendChild(strip);
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
    if (!parent || parent.closest('abbr, script, style, option')) continue;
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

document.addEventListener('astro:page-load', initQuality);
