/* =========================================================================
 * The Data chapter's renderers: the phase timeline and its detail panel, the
 * fix grid, the plane grid, the store table, the transfer map and the cyber
 * controls. Moved here from data-client.ts, which now only finds the hosts
 * and calls these.
 *
 * R295 [§S15]: each renderer owns its host and replaces what is in it.
 * selectDataPhase used to be the only one that cleared, and the other six
 * appended, so each was correct only because the init that called it ran
 * once per page instance - and that init's guard sits on #data-fixes, a
 * different element from five of the six hosts. The failure mode was silent
 * duplication, and R280 had already shown what happens when a guard and the
 * thing it is meant to protect are on different elements. Now calling any of
 * them twice draws the same thing once, and none of them depends on the guard.
 *
 * They build their nodes and hand them to replaceChildren(), so the clear and
 * the draw are one step. The store table keeps its caption, which is static
 * markup a blanket clear would have deleted.
 *
 * Every element is made with a plain `const x = document.createElement(...)`,
 * as the code this was moved from did. Review of P21 found that the first
 * version's small factory helper hid each element's tag from the R245 check
 * (orphanAriaLabelFaults), which recognises only that statement and el():
 * an aria-label on a role-less element made through the helper would have
 * passed it.
 *
 * They live here, not in the client, because a client script touches
 * `document` as it is evaluated and so cannot be imported by a test. These
 * touch `document` only when called.
 * ========================================================================= */
import { DATA_PHASES, denominatorText, methodologyUrl, scopeNoteText } from './data-phases';
import {
  FIXES, PLANES, STORE_ROWS, CARE_ACTORS, PUBLIC_ACTORS,
  CYBER_CONTROLS, MESH_SERVICES, type Actor
} from './data-view';

export interface PhaseHosts {
  timeline: HTMLElement;
  detail: HTMLElement;
  methodologyLink: HTMLAnchorElement | null;
}

export function renderDataPhaseTimeline(hosts: PhaseHosts): void {
  if (!DATA_PHASES.length) return;
  const buttons = DATA_PHASES.map(function (phase) {
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
    button.addEventListener('click', function () { selectDataPhase(hosts, phase.id); });
    return button;
  });
  hosts.timeline.replaceChildren(...buttons);
  selectDataPhase(hosts, 'P0');
}

export function selectDataPhase(hosts: PhaseHosts, id: string): void {
  const phase = DATA_PHASES.filter(function (candidate) {
    return candidate.id === id;
  })[0] || DATA_PHASES[0];
  if (!phase) return;
  Array.prototype.forEach.call(hosts.timeline.children, function (button: HTMLElement) {
    if (button.dataset.phaseId === undefined) return;
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
  /* R299 [§S16], third review of P22: the phase's own denominator, from
     derivation rule 4, so a ladder that crosses into this phase is marked
     here even where its wording does not change. */
  scopeText.className = 'data-phase-denominator';
  scopeText.textContent = denominatorText(phase.denominator) + ' ' + (phase.id === 'P8'
    ? 'Targets are the controlled maturity values.'
    : 'Specified values remain controlling where shown.');
  const method = document.createElement('a');
  method.href = methodologyUrl(phase.id.toLowerCase());
  method.target = '_blank';
  method.rel = 'noopener';
  method.textContent = "Open this phase's derivation register";
  scope.appendChild(scopeTitle); scope.appendChild(scopeText); scope.appendChild(method);
  overview.appendChild(work); overview.appendChild(scope);

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
      /* R111 [§S12]: basisNotRendered() reads these three statements - the
         read, the label, the append - so keep them as three. */
      const basis = document.createElement('span');
      basis.className = 'data-basis ' + metric.basis;
      basis.textContent = metric.basis === 'framework' ? 'Specified' : 'Derived';
      /* the metric's catalog id is not drawn: the owner's 2026-10-10 decision
         keeps catalog ids on Quality and Risk, and the row names its metric */
      identity.appendChild(basis);

      const body = document.createElement('div');
      body.className = 'data-target-body';
      const name = document.createElement('h5');
      name.textContent = metric.name;
      const target = document.createElement('p');
      target.className = 'data-phase-target-value';
      target.textContent = metric.phaseTarget;
      /* R299 [§S16]: the population under the number, where it changes. */
      const scopeNote = document.createElement('p');
      scopeNote.className = 'data-scope-change';
      scopeNote.textContent = metric.scopeChange ? scopeNoteText(metric.scopeChange) : '';
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
      body.appendChild(name); body.appendChild(target);
      if (metric.scopeChange) body.appendChild(scopeNote);
      body.appendChild(mature);
      body.appendChild(rationale);
      row.appendChild(identity); row.appendChild(body);
      section.appendChild(row);
    });
    scorecards.appendChild(section);
  });
  hosts.detail.replaceChildren(head, overview, scorecards);

  if (hosts.methodologyLink) hosts.methodologyLink.href = methodologyUrl(phase.id.toLowerCase());
}

export function renderFixes(host: HTMLElement): void {
  host.replaceChildren(...FIXES.map(function (item, index) {
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
    const problemTitle = document.createElement('h3');
    problemTitle.textContent = item.problem;
    const problemText = document.createElement('p');
    problemText.textContent = item.mechanism;
    problemBody.appendChild(problemTitle); problemBody.appendChild(problemText);
    problem.appendChild(number); problem.appendChild(problemBody);

    const arrow = document.createElement('div');
    arrow.className = 'data-fix-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';

    const fix = document.createElement('div');
    fix.className = 'data-fix-side fix';
    const fixTitle = document.createElement('h3');
    fixTitle.textContent = item.fix;
    const fixText = document.createElement('p');
    fixText.textContent = item.result;
    fix.appendChild(fixTitle); fix.appendChild(fixText);

    row.appendChild(problem); row.appendChild(arrow); row.appendChild(fix);
    return row;
  }));
}

/* The host is a role="list", so each plane is a listitem. A <div>, not an
   <article>: HTML does not allow the listitem role on an article, and an
   article without it leaves the list with no items to announce. */
export function renderPlanes(host: HTMLElement): void {
  host.replaceChildren(...PLANES.map(function (plane, index) {
    const item = document.createElement('div');
    item.setAttribute('role', 'listitem');
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
    return item;
  }));
}

export function renderStoreTable(table: HTMLTableElement): void {
  const thead = document.createElement('thead');
  const head = document.createElement('tr');
  ['Domain', 'Representative records', 'What makes them safe and usable'].forEach(function (label) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    head.appendChild(th);
  });
  thead.appendChild(head);
  const body = document.createElement('tbody');
  STORE_ROWS.forEach(function (values) {
    const row = document.createElement('tr');
    /* the first cell heads its row; one plain createElement statement per
       tag, which review 2 of P21 found a conditional expression was not */
    values.forEach(function (value, index) {
      if (index === 0) {
        const rowHeader = document.createElement('th');
        rowHeader.setAttribute('scope', 'row');
        rowHeader.textContent = value;
        row.appendChild(rowHeader);
      } else {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      }
    });
    body.appendChild(row);
  });
  /* the caption is static markup that names the table for a screen reader */
  const caption = table.caption;
  table.replaceChildren(...(caption ? [caption] : []), thead, body);
}

function buildMapColumn(title: string, subtitle: string, actors: Actor[], side: string): HTMLElement {
  const column = document.createElement('section');
  column.className = 'data-map-column data-map-' + side;
  const heading = document.createElement('div');
  heading.className = 'data-map-column-head';
  const columnTitle = document.createElement('h3');
  columnTitle.textContent = title;
  const columnSubtitle = document.createElement('p');
  columnSubtitle.textContent = subtitle;
  heading.appendChild(columnTitle); heading.appendChild(columnSubtitle);
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
    const serviceName = document.createElement('b');
    serviceName.textContent = service[0];
    const serviceText = document.createElement('span');
    serviceText.textContent = service[1];
    item.appendChild(serviceName); item.appendChild(serviceText);
    core.appendChild(item);
  });

  const boundary = document.createElement('p');
  boundary.className = 'data-mesh-boundary';
  boundary.textContent = 'Common identity + provenance + purpose-bound access + correction + conformance + audit';
  core.appendChild(boundary);
  return core;
}

export function renderTransferMap(host: HTMLElement): void {
  host.replaceChildren(
    buildMeshCore(),
    buildMapColumn(
      'Care delivery and people',
      'Person-level clinical and service events',
      CARE_ACTORS,
      'care'
    ),
    buildMapColumn(
      'Public operations and assurance',
      'Payment, capacity, rights, evidence, and governed reuse',
      PUBLIC_ACTORS,
      'public'
    )
  );
}

export function renderCyberControls(host: HTMLElement): void {
  host.replaceChildren(...CYBER_CONTROLS.map(function (control, index) {
    const item = document.createElement('article');
    item.className = 'cyber-control';
    const number = document.createElement('span');
    number.textContent = String(index + 1).padStart(2, '0');
    const body = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = control[0];
    const text = document.createElement('p');
    text.textContent = control[1];
    body.appendChild(title); body.appendChild(text);
    item.appendChild(number); item.appendChild(body);
    return item;
  }));
}
