/* Data tab client: phase-target master-detail scorecards, fix grid, plane
   grid, store table, transfer map, cyber controls, acronym hovers.
   Port of docs/js/data.js:238-633. Runs on astro:page-load; idempotent via
   the fix grid's dataset.wired guard. */
import { DATA_PHASES, methodologyUrl } from '../lib/data-phases';
import {
  FIXES, PLANES, STORE_ROWS, CARE_ACTORS, PUBLIC_ACTORS,
  CYBER_CONTROLS, MESH_SERVICES, type Actor
} from '../lib/data-view';

function renderDataPhaseTimeline(): void {
  const host = document.getElementById('data-phase-timeline');
  if (!host || !DATA_PHASES.length) return;
  DATA_PHASES.forEach(function (phase) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'phase-node data-phase-node';
    button.style.gridColumn = String(phase.year);
    button.dataset.phaseId = phase.id;
    button.setAttribute('aria-pressed', phase.id === 'P0' ? 'true' : 'false');
    button.setAttribute('aria-label', phase.id + ', Year ' + phase.year + ': ' + phase.title);

    const dot = document.createElement('span');
    dot.className = 'phase-node-dot';
    dot.setAttribute('aria-hidden', 'true');
    const id = document.createElement('span');
    id.className = 'phase-node-phase';
    id.textContent = phase.id;
    const year = document.createElement('span');
    year.className = 'phase-node-year';
    year.textContent = 'Year ' + phase.year;
    button.appendChild(dot); button.appendChild(id); button.appendChild(year);
    button.addEventListener('click', function () { selectDataPhase(phase.id); });
    host.appendChild(button);
  });
  selectDataPhase('P0');
}

function selectDataPhase(id: string): void {
  const phase = DATA_PHASES.filter(function (candidate) {
    return candidate.id === id;
  })[0] || DATA_PHASES[0];
  const timeline = document.getElementById('data-phase-timeline');
  if (!timeline) return;
  const buttons = timeline.querySelectorAll('.data-phase-node');
  Array.prototype.forEach.call(buttons, function (button: HTMLElement) {
    button.setAttribute('aria-pressed', button.dataset.phaseId === phase.id ? 'true' : 'false');
  });

  let metricCount = 0;
  let derivedCount = 0;
  phase.groups.forEach(function (group) {
    metricCount += group.metrics.length;
    group.metrics.forEach(function (metric) {
      if (metric.basis === 'derived') derivedCount += 1;
    });
  });

  const detail = document.getElementById('data-phase-detail');
  if (!detail) return;
  detail.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'rollout-detail-head data-phase-detail-head';
  const titleWrap = document.createElement('div');
  const kicker = document.createElement('div');
  kicker.className = 'rollout-detail-kicker';
  kicker.textContent = phase.id + ' · Year ' + phase.year;
  const title = document.createElement('h3');
  title.textContent = phase.title;
  titleWrap.appendChild(kicker); titleWrap.appendChild(title);
  const count = document.createElement('span');
  count.className = 'data-phase-count';
  count.textContent = metricCount + ' priority measures · ' + derivedCount + ' derived';
  head.appendChild(titleWrap); head.appendChild(count);
  detail.appendChild(head);

  const overview = document.createElement('div');
  overview.className = 'data-phase-overview';
  const work = document.createElement('div');
  const summary = document.createElement('p');
  summary.className = 'rollout-detail-summary';
  summary.textContent = phase.summary;
  const list = document.createElement('ul');
  phase.work.forEach(function (item) {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
  work.appendChild(summary); work.appendChild(list);
  const scope = document.createElement('div');
  scope.className = 'data-phase-scope';
  const scopeTitle = document.createElement('b');
  scopeTitle.textContent = 'How to read this phase';
  const scopeText = document.createElement('p');
  scopeText.textContent = phase.id === 'P8'
    ? 'Targets are controlled national maturity values.'
    : 'Derived values apply only to the named test, pilot, Wave I, scaled, or national denominator. Specified values remain controlling where shown.';
  const method = document.createElement('a');
  method.href = methodologyUrl(phase.id.toLowerCase());
  method.target = '_blank';
  method.rel = 'noopener';
  method.textContent = "Open this phase's derivation register";
  scope.appendChild(scopeTitle); scope.appendChild(scopeText); scope.appendChild(method);
  overview.appendChild(work); overview.appendChild(scope);
  detail.appendChild(overview);

  const scorecards = document.createElement('div');
  scorecards.className = 'data-scorecard-grid';
  phase.groups.forEach(function (group) {
    const section = document.createElement('section');
    section.className = 'data-score-section';
    const sectionTitle = document.createElement('h4');
    sectionTitle.textContent = group.section;
    const why = document.createElement('p');
    why.className = 'data-score-why';
    why.textContent = group.why;
    section.appendChild(sectionTitle); section.appendChild(why);

    group.metrics.forEach(function (metric) {
      const row = document.createElement('article');
      row.className = 'data-target-row';
      const identity = document.createElement('div');
      identity.className = 'data-target-identity';
      const metricId = document.createElement('b');
      metricId.textContent = metric.id;
      const basis = document.createElement('span');
      basis.className = 'data-basis ' + metric.basis;
      basis.textContent = metric.basis === 'framework' ? 'Specified' : 'Derived';
      identity.appendChild(metricId); identity.appendChild(basis);

      const body = document.createElement('div');
      body.className = 'data-target-body';
      const name = document.createElement('h5');
      name.textContent = metric.name;
      const target = document.createElement('p');
      target.className = 'data-phase-target-value';
      target.textContent = metric.phaseTarget;
      const mature = document.createElement('p');
      mature.className = 'data-mature-target';
      mature.textContent = 'Mature: ' + metric.matureTarget;
      const rationale = document.createElement('details');
      rationale.className = 'data-target-rationale';
      const rationaleLabel = document.createElement('summary');
      rationaleLabel.textContent = 'Why this value';
      const rationaleText = document.createElement('p');
      rationaleText.textContent = metric.justification;
      rationale.appendChild(rationaleLabel); rationale.appendChild(rationaleText);
      body.appendChild(name); body.appendChild(target); body.appendChild(mature);
      body.appendChild(rationale);
      row.appendChild(identity); row.appendChild(body);
      section.appendChild(row);
    });
    scorecards.appendChild(section);
  });
  detail.appendChild(scorecards);

  const methodology = document.getElementById('data-methodology-link') as HTMLAnchorElement | null;
  if (methodology) {
    methodology.href = methodologyUrl(phase.id.toLowerCase());
  }
}

function renderFixes(): void {
  const host = document.getElementById('data-fixes');
  if (!host) return;
  FIXES.forEach(function (item, index) {
    const row = document.createElement('article');
    row.className = 'data-fix-row';
    row.setAttribute('aria-label', 'Problem: ' + item.problem + '. The fix: ' + item.fix + '.');

    const problem = document.createElement('div');
    problem.className = 'data-fix-side problem';
    const number = document.createElement('span');
    number.className = 'data-fix-number';
    number.setAttribute('aria-hidden', 'true');
    number.textContent = String(index + 1).padStart(2, '0');
    const problemBody = document.createElement('div');
    const ph = document.createElement('h3');
    ph.textContent = item.problem;
    const pp = document.createElement('p');
    pp.textContent = item.mechanism;
    problemBody.appendChild(ph); problemBody.appendChild(pp);
    problem.appendChild(number); problem.appendChild(problemBody);

    const arrow = document.createElement('div');
    arrow.className = 'data-fix-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';

    const fix = document.createElement('div');
    fix.className = 'data-fix-side fix';
    const fh = document.createElement('h3');
    fh.textContent = item.fix;
    const fp = document.createElement('p');
    fp.textContent = item.result;
    fix.appendChild(fh); fix.appendChild(fp);

    row.appendChild(problem); row.appendChild(arrow); row.appendChild(fix);
    host.appendChild(row);
  });
}

function renderPlanes(): void {
  const host = document.getElementById('data-planes');
  if (!host) return;
  PLANES.forEach(function (plane, index) {
    const item = document.createElement('article');
    item.className = 'data-plane';
    const num = document.createElement('span');
    num.className = 'data-plane-number';
    num.textContent = String(index + 1).padStart(2, '0');
    const title = document.createElement('h3');
    title.textContent = plane[0];
    const body = document.createElement('p');
    body.textContent = plane[1];
    const control = document.createElement('small');
    control.textContent = plane[2];
    item.appendChild(num); item.appendChild(title); item.appendChild(body); item.appendChild(control);
    host.appendChild(item);
  });
}

function renderStoreTable(): void {
  const table = document.getElementById('data-store-table') as HTMLTableElement | null;
  if (!table) return;
  const thead = table.createTHead();
  const head = thead.insertRow();
  ['Domain', 'Representative records', 'What makes them safe and usable'].forEach(function (label) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    head.appendChild(th);
  });
  const body = table.createTBody();
  STORE_ROWS.forEach(function (values) {
    const row = body.insertRow();
    values.forEach(function (value, index) {
      const cell = index === 0 ? document.createElement('th') : document.createElement('td');
      if (index === 0) (cell as HTMLTableCellElement).scope = 'row';
      cell.textContent = value;
      row.appendChild(cell);
    });
  });
}

function buildMapColumn(title: string, subtitle: string, actors: Actor[], side: string): HTMLElement {
  const column = document.createElement('section');
  column.className = 'data-map-column data-map-' + side;
  const heading = document.createElement('div');
  heading.className = 'data-map-column-head';
  const h3 = document.createElement('h3');
  h3.textContent = title;
  const p = document.createElement('p');
  p.textContent = subtitle;
  heading.appendChild(h3); heading.appendChild(p);
  column.appendChild(heading);

  actors.forEach(function (actor) {
    const item = document.createElement('article');
    item.className = 'data-map-entity data-map-entity-' + side;
    const code = document.createElement('span');
    code.className = 'data-map-code';
    code.textContent = actor.code;
    const name = document.createElement('h4');
    name.textContent = actor.name;
    const sends = document.createElement('p');
    const sendsLabel = document.createElement('b');
    sendsLabel.textContent = 'Sends: ';
    sends.appendChild(sendsLabel);
    sends.appendChild(document.createTextNode(actor.sends));
    const receives = document.createElement('p');
    const receivesLabel = document.createElement('b');
    receivesLabel.textContent = 'Receives: ';
    receives.appendChild(receivesLabel);
    receives.appendChild(document.createTextNode(actor.receives));
    item.appendChild(code); item.appendChild(name); item.appendChild(sends); item.appendChild(receives);
    column.appendChild(item);
  });
  return column;
}

function buildMeshCore(): HTMLElement {
  const core = document.createElement('section');
  core.className = 'data-mesh-core';
  const kicker = document.createElement('span');
  kicker.className = 'data-kicker';
  kicker.textContent = 'AHIRC / NHRA shared national coordination layer';
  const title = document.createElement('h3');
  title.textContent = 'National Health Assurance Information Mesh';
  const note = document.createElement('p');
  note.className = 'data-mesh-note';
  note.textContent = 'A governed longitudinal view over distributed, attributable source records.';
  core.appendChild(kicker); core.appendChild(title); core.appendChild(note);

  MESH_SERVICES.forEach(function (service) {
    const item = document.createElement('div');
    item.className = 'data-mesh-service';
    const b = document.createElement('b');
    b.textContent = service[0];
    const span = document.createElement('span');
    span.textContent = service[1];
    item.appendChild(b); item.appendChild(span);
    core.appendChild(item);
  });

  const boundary = document.createElement('p');
  boundary.className = 'data-mesh-boundary';
  boundary.textContent = 'Common identity + provenance + purpose-bound access + correction + conformance + audit';
  core.appendChild(boundary);
  return core;
}

function renderTransferMap(): void {
  const host = document.getElementById('data-transfer-map');
  if (!host) return;
  host.appendChild(buildMeshCore());
  host.appendChild(buildMapColumn(
    'Care delivery and people',
    'Person-level clinical and service events',
    CARE_ACTORS,
    'care'
  ));
  host.appendChild(buildMapColumn(
    'Public operations and assurance',
    'Payment, capacity, rights, evidence, and governed reuse',
    PUBLIC_ACTORS,
    'public'
  ));
}

function renderCyberControls(): void {
  const host = document.getElementById('cyber-controls');
  if (!host) return;
  CYBER_CONTROLS.forEach(function (control, index) {
    const item = document.createElement('article');
    item.className = 'cyber-control';
    const number = document.createElement('span');
    number.textContent = String(index + 1).padStart(2, '0');
    const body = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = control[0];
    const p = document.createElement('p');
    p.textContent = control[1];
    body.appendChild(title); body.appendChild(p);
    item.appendChild(number); item.appendChild(body);
    host.appendChild(item);
  });
}

function initData(): void {
  const host = document.getElementById('data-fixes');
  if (!host) return; // not on the data page
  if (host.dataset.wired === '1') return;
  host.dataset.wired = '1';
  renderDataPhaseTimeline();
  renderFixes();
  renderPlanes();
  renderStoreTable();
  renderTransferMap();
  renderCyberControls();
}

/* Also init on first load without waiting for astro:page-load: if this module
   finishes evaluating after ClientRouter fired that event, the listener alone
   would miss it and leave the page blank (see quality-client.ts). initData is
   idempotent via dataset.wired. */
document.addEventListener('astro:page-load', initData);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initData);
} else {
  initData();
}
