/* Phased-rollout tab client: milestone timeline master-detail, 13-domain
   matrix, unit-ramp + drug-pipeline buildouts, agency/gate/workstream grids.
   Port of docs/js/rollout.js:278-560. Runs on astro:page-load; idempotent
   via the timeline's dataset.wired guard. */
import { PHASES, DOMAINS, GATES, AGENCIES, WORKSTREAMS } from '../lib/rollout';

function renderTimeline(): void {
  const host = document.getElementById('rollout-timeline');
  if (!host) return;
  PHASES.forEach(function (phase) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'phase-node';
    btn.style.gridColumn = String(phase.year);
    btn.setAttribute('aria-pressed', phase.id === 'P0' ? 'true' : 'false');
    btn.setAttribute('aria-label', phase.id + ', Year ' + phase.year + ': ' + phase.title);

    const dot = document.createElement('span');
    dot.className = 'phase-node-dot';
    dot.setAttribute('aria-hidden', 'true');
    const id = document.createElement('span');
    id.className = 'phase-node-phase';
    id.textContent = phase.id;
    const year = document.createElement('span');
    year.className = 'phase-node-year';
    year.textContent = 'Year ' + phase.year;
    btn.appendChild(dot);
    btn.appendChild(id);
    btn.appendChild(year);
    btn.addEventListener('click', function () { selectPhase(phase.id); });
    host.appendChild(btn);
  });
  selectPhase('P0');
}

function selectPhase(id: string): void {
  const phase = PHASES.filter(function (p) { return p.id === id; })[0] || PHASES[0];
  const timeline = document.getElementById('rollout-timeline');
  if (!timeline) return;
  const buttons = timeline.querySelectorAll('.phase-node');
  Array.prototype.forEach.call(buttons, function (btn: Element) {
    btn.setAttribute('aria-pressed',
      (btn.getAttribute('aria-label') || '').indexOf(phase.id + ',') === 0 ? 'true' : 'false');
  });

  const detail = document.getElementById('rollout-detail');
  if (!detail) return;
  detail.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'rollout-detail-head';
  const titleWrap = document.createElement('div');
  const kicker = document.createElement('div');
  kicker.className = 'rollout-detail-kicker';
  kicker.textContent = phase.id + ' · Year ' + phase.year;
  const h3 = document.createElement('h3');
  h3.textContent = phase.title;
  titleWrap.appendChild(kicker);
  titleWrap.appendChild(h3);
  head.appendChild(titleWrap);
  detail.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'rollout-detail-grid';
  const main = document.createElement('div');
  const summary = document.createElement('p');
  summary.className = 'rollout-detail-summary';
  summary.textContent = phase.summary;
  const ul = document.createElement('ul');
  phase.work.forEach(function (item) {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  });
  main.appendChild(summary);
  main.appendChild(ul);
  const evidence = document.createElement('div');
  evidence.className = 'rollout-evidence';
  const eb = document.createElement('b');
  eb.textContent = 'Exit evidence';
  const et = document.createElement('span');
  et.textContent = phase.evidence;
  evidence.appendChild(eb);
  evidence.appendChild(et);
  grid.appendChild(main);
  grid.appendChild(evidence);
  detail.appendChild(grid);
}

function renderDomainMatrix(): void {
  const table = document.getElementById('rollout-domain-matrix') as HTMLTableElement | null;
  if (!table) return;
  const bands = [
    ['P0–P1', 'Foundation'],
    ['P2–P3', 'First operation'],
    ['P4–P5', 'Pilots and scale'],
    ['P6–P7', 'National and benefits'],
    ['P8', 'Maturity']
  ];
  const thead = table.createTHead();
  const row = thead.insertRow();
  const domainHead = document.createElement('th');
  domainHead.scope = 'col';
  domainHead.textContent = 'Domain';
  row.appendChild(domainHead);
  bands.forEach(function (band) {
    const th = document.createElement('th');
    th.scope = 'col';
    const p = document.createElement('span');
    p.className = 'phase-band';
    p.textContent = band[0];
    th.appendChild(p);
    th.appendChild(document.createTextNode(band[1]));
    row.appendChild(th);
  });
  const tbody = table.createTBody();
  DOMAINS.forEach(function (domain) {
    const tr = tbody.insertRow();
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = domain[0];
    tr.appendChild(th);
    domain.slice(1).forEach(function (text) {
      const td = tr.insertCell();
      td.textContent = text;
    });
  });
}

interface UnitStep { value: string; label: string; phase: string; level: string; qual?: boolean }

function renderBuildouts(): void {
  const ramp = document.getElementById('unit-ramp');
  if (!ramp) return;
  const chart = document.createElement('div');
  chart.className = 'unit-ramp-chart';
  chart.setAttribute('aria-hidden', 'true');
  const unitSteps: UnitStep[] = [
    { value: 'Plan', label: 'standards, siting, workforce, prototypes', phase: 'P0–P3', level: '24%', qual: true },
    { value: 'Pilot', label: 'all four unit types in representative regions', phase: 'P4', level: '34%', qual: true },
    { value: '≥65%', label: 'population coverage by phase end', phase: 'P5', level: '65%' },
    { value: '≥80%', label: 'Gate 2 floor before broad $0 care', phase: 'P6', level: '80%' },
    { value: '≥95%', label: 'within access-time standard', phase: 'P8', level: '95%' }
  ];
  unitSteps.forEach(function (step) {
    const el = document.createElement('div');
    el.className = 'unit-ramp-step';
    const plot = document.createElement('div');
    plot.className = 'unit-ramp-plot';
    const bar = document.createElement('div');
    bar.className = 'unit-ramp-bar' + (step.qual ? ' qualitative' : '');
    bar.style.setProperty('--level', step.level);
    const value = document.createElement('div');
    value.className = 'unit-ramp-value';
    value.textContent = step.value;
    const phase = document.createElement('div');
    phase.className = 'unit-ramp-phase';
    phase.textContent = step.phase;
    bar.appendChild(value);
    plot.appendChild(bar);
    el.appendChild(plot);
    el.appendChild(phase);
    chart.appendChild(el);
  });
  ramp.appendChild(chart);

  const legend = document.createElement('div');
  legend.className = 'unit-ramp-legend';
  unitSteps.forEach(function (step) {
    const item = document.createElement('div');
    item.className = 'unit-ramp-legend-item';
    const key = document.createElement('div');
    key.className = 'unit-ramp-legend-key';
    key.textContent = step.phase + ' · ' + step.value;
    const text = document.createElement('div');
    text.className = 'unit-ramp-legend-text';
    text.textContent = step.label;
    item.appendChild(key);
    item.appendChild(text);
    legend.appendChild(item);
  });
  ramp.appendChild(legend);

  const pipeline = document.getElementById('drug-pipeline');
  if (!pipeline) return;
  ([
    ['P0–P1', 'Authority and supply baseline', 'Formulary, products, suppliers, purchasing authority, and shortage map'],
    ['P2', 'First operation', 'Public claims utility, national purchasing, PBM replacement, and PMC Phase I'],
    ['P3–P5', 'Portfolio and continuity scale', 'Onboard pharmacies; qualify suppliers; expand shortage controls and production'],
    ['P6–P7', 'National access', 'National formulary access, production capacity, inventory visibility, and backup supply'],
    ['P8', 'Mature capability', 'Public manufacturing, lifecycle evaluation, dual sourcing, and secure inputs']
  ] as [string, string, string][]).forEach(function (stage) {
    const row = document.createElement('div');
    row.className = 'drug-stage';
    const phase = document.createElement('div');
    phase.className = 'drug-stage-phase';
    phase.textContent = stage[0];
    const body = document.createElement('div');
    const b = document.createElement('b');
    b.textContent = stage[1];
    const span = document.createElement('span');
    span.textContent = stage[2];
    body.appendChild(b);
    body.appendChild(span);
    row.appendChild(phase);
    row.appendChild(body);
    pipeline.appendChild(row);
  });
}

function renderAgencies(): void {
  const host = document.getElementById('rollout-agencies');
  if (!host) return;
  AGENCIES.forEach(function (group) {
    const section = document.createElement('section');
    section.className = 'agency-group';
    section.style.setProperty('--agency-color', group.color);
    const h3 = document.createElement('h3');
    h3.textContent = group.title;
    const desc = document.createElement('p');
    desc.textContent = group.desc;
    const ul = document.createElement('ul');
    ul.className = 'agency-list';
    group.items.forEach(function (item) {
      const li = document.createElement('li');
      const code = document.createElement('span');
      code.className = 'agency-code';
      code.textContent = item[0];
      const text = document.createElement('span');
      text.textContent = item[1];
      li.appendChild(code);
      li.appendChild(text);
      ul.appendChild(li);
    });
    section.appendChild(h3);
    section.appendChild(desc);
    section.appendChild(ul);
    host.appendChild(section);
  });
}

function renderGates(): void {
  const host = document.getElementById('rollout-gates');
  if (!host) return;
  GATES.forEach(function (gate) {
    const item = document.createElement('article');
    item.className = 'gate-item';
    const number = document.createElement('div');
    number.className = 'gate-number';
    number.textContent = gate.n;
    const body = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.textContent = gate.title;
    const when = document.createElement('div');
    when.className = 'gate-when';
    when.textContent = gate.when;
    const floor = document.createElement('p');
    floor.textContent = gate.floor;
    const fallback = document.createElement('p');
    fallback.className = 'gate-fallback';
    fallback.textContent = 'If not ready: ' + gate.fallback;
    body.appendChild(h3);
    body.appendChild(when);
    body.appendChild(floor);
    body.appendChild(fallback);
    item.appendChild(number);
    item.appendChild(body);
    host.appendChild(item);
  });
}

function renderWorkstreams(): void {
  const host = document.getElementById('rollout-workstreams');
  if (!host) return;
  WORKSTREAMS.forEach(function (stream) {
    const item = document.createElement('div');
    item.className = 'workstream-item';
    const id = document.createElement('div');
    id.className = 'workstream-id';
    id.textContent = stream[0];
    const body = document.createElement('div');
    const b = document.createElement('b');
    b.textContent = stream[1];
    const span = document.createElement('span');
    span.textContent = stream[2];
    body.appendChild(b);
    body.appendChild(span);
    item.appendChild(id);
    item.appendChild(body);
    host.appendChild(item);
  });
}

function initRollout(): void {
  const timeline = document.getElementById('rollout-timeline');
  if (!timeline) return; // not on the rollout page
  if (timeline.dataset.wired === '1') return;
  timeline.dataset.wired = '1';
  renderTimeline();
  renderDomainMatrix();
  renderBuildouts();
  renderAgencies();
  renderGates();
  renderWorkstreams();
}

document.addEventListener('astro:page-load', initRollout);
