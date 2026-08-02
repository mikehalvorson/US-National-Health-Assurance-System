/* Workforce tab client: scenario-driven labor-flow reconciliation spans,
   legacy master-detail, created-position chart, acronym hovers.
   Port of docs/js/workforce.js:190-528. Runs on astro:page-load; idempotent
   via the legacy list's dataset.wired guard. */
import {
  SCENARIOS, LEGACY, CREATED, ACRONYMS,
  ROLLOUT_YEARS, TOTAL_US_EMPLOYMENT_2024, ANNUAL_TRAINING_TARGET,
  LTC_WORKFORCE, ltcWageFloorCost,
  type ScenarioId
} from '../lib/workforce';

let activeScenario: ScenarioId = 'plan';
let selectedLegacy = 'insurer';
let selectedCreated = 'units';
const numberFormat = new Intl.NumberFormat('en-US');

function fmtThousands(value: number): string {
  return numberFormat.format(value * 1000);
}

function fmtShort(value: number): string {
  return numberFormat.format(value) + 'k';
}

function setText(id: string, text: string): void {
  const e = document.getElementById(id);
  if (e) e.textContent = text;
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
    if (!parent || parent.closest('abbr, script, style')) continue;
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
      const abbr = document.createElement('abbr');
      abbr.className = 'workforce-acronym';
      abbr.title = ACRONYMS[acronym];
      abbr.setAttribute('aria-label', acronym + ': ' + ACRONYMS[acronym]);
      abbr.textContent = acronym;
      fragment.appendChild(abbr);
      lastIndex = offset + match.length;
      return match;
    });
    if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    node.parentNode!.replaceChild(fragment, node);
  });
}

function setBar(id: string, value: number, denominator: number): void {
  const bar = document.getElementById(id);
  if (!bar) return;
  bar.style.width = Math.max(2, Math.min(100, value / denominator * 100)) + '%';
}

function renderFlow(): void {
  const scenario = SCENARIOS[activeScenario];
  const external = scenario.supported - scenario.inside;
  const gap = scenario.eliminated - scenario.supported;
  const entrants = scenario.created - scenario.inside;
  const annualEntrants = Math.round(entrants * 1000 / ROLLOUT_YEARS);
  const scopedDifference = scenario.eliminated - scenario.created;
  const employmentShare = entrants * 1000 / TOTAL_US_EMPLOYMENT_2024 * 100;
  const transitionShare = scenario.inside / scenario.created * 100;
  const trainingRatio = ANNUAL_TRAINING_TARGET / annualEntrants;

  setText('wf-eliminated', fmtThousands(scenario.eliminated));
  setText('wf-inside', fmtThousands(scenario.inside));
  setText('wf-supported', fmtThousands(scenario.supported));
  setText('wf-created', fmtThousands(scenario.created));
  setText('wf-new-hires', fmtThousands(entrants));
  setText('wf-ledger-transfer', fmtThousands(scenario.inside) + ' skills matches');

  setText('wf-reconcile-created', fmtThousands(scenario.created));
  setText('wf-reconcile-inside', fmtThousands(scenario.inside));
  setText('wf-reconcile-entrants', fmtThousands(entrants));
  setText('wf-scope-eliminated', fmtThousands(scenario.eliminated));
  setText('wf-scope-created', fmtThousands(scenario.created));
  setText('wf-scope-difference', fmtThousands(Math.abs(scopedDifference)));

  setText('wf-labor-entrants', fmtThousands(entrants));
  setText('wf-labor-annual', numberFormat.format(annualEntrants) + '/year');
  setText('wf-labor-share', employmentShare.toFixed(2) + '%');
  setText('wf-labor-transition', Math.round(transitionShare) + '%');
  setText('wf-training-ratio', trainingRatio.toFixed(1) + '×');
  setText('wf-table-annual', numberFormat.format(annualEntrants));

  setText('wf-flow-eliminated', fmtShort(scenario.eliminated));
  setText('wf-flow-inside', fmtShort(scenario.inside));
  setText('wf-flow-external', fmtShort(external));
  setText('wf-flow-gap', fmtShort(gap));

  setBar('wf-flow-eliminated-bar', scenario.eliminated, 1000);
  setBar('wf-flow-inside-bar', scenario.inside, scenario.eliminated);
  setBar('wf-flow-external-bar', external, scenario.eliminated);
  setBar('wf-flow-gap-bar', gap, scenario.eliminated);
}

function renderLegacyDetail(id: string): void {
  const item = LEGACY.filter(function (entry) { return entry.id === id; })[0];
  if (!item) return;
  selectedLegacy = id;
  const host = document.getElementById('workforce-legacy-detail');
  const list = document.getElementById('workforce-legacy-list');
  if (!host || !list) return;
  const eliminated = item.values[activeScenario];
  const inside = item.inside[activeScenario];
  const buttons = list.querySelectorAll('button');
  buttons.forEach(function (button) {
    button.setAttribute('aria-pressed', button.dataset.legacyId === id ? 'true' : 'false');
  });

  host.textContent = '';
  const kicker = document.createElement('span');
  kicker.className = 'workforce-section-label';
  kicker.textContent = fmtShort(eliminated) + ' eliminated / ' +
    fmtShort(inside) + ' internal matches';
  const title = document.createElement('h3');
  title.textContent = item.name;
  const reason = document.createElement('p');
  reason.textContent = item.reason;

  function field(label: string, value: string): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'workforce-legacy-field';
    const head = document.createElement('strong');
    head.textContent = label;
    const body = document.createElement('p');
    body.textContent = value;
    wrap.appendChild(head);
    wrap.appendChild(body);
    return wrap;
  }

  host.appendChild(kicker);
  host.appendChild(title);
  host.appendChild(reason);
  host.appendChild(field('Likely destinations', item.destinations));
  host.appendChild(field('Counting boundary', item.boundary));
  host.appendChild(field('Evidence and confidence', item.evidence));
  host.appendChild(field('Work that continues', item.continues));
  addAcronymHovers(host);
}

function renderLegacyList(): void {
  const host = document.getElementById('workforce-legacy-list');
  if (!host) return;
  const scenario = SCENARIOS[activeScenario];
  host.textContent = '';

  LEGACY.forEach(function (item) {
    const value = item.values[activeScenario];
    const inside = item.inside[activeScenario];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'workforce-legacy-row';
    button.dataset.legacyId = item.id;
    button.setAttribute('aria-pressed', item.id === selectedLegacy ? 'true' : 'false');

    const top = document.createElement('span');
    top.className = 'workforce-legacy-row-top';
    const name = document.createElement('strong');
    name.textContent = item.name;
    const count = document.createElement('b');
    count.textContent = fmtShort(value);
    top.appendChild(name);
    top.appendChild(count);

    const track = document.createElement('span');
    track.className = 'workforce-row-track';
    const fill = document.createElement('i');
    fill.style.width = Math.max(4, value / scenario.eliminated * 100) + '%';
    track.appendChild(fill);

    const foot = document.createElement('small');
    foot.textContent = fmtShort(inside) + ' could match new-system roles';
    button.appendChild(top);
    button.appendChild(track);
    button.appendChild(foot);
    button.addEventListener('click', function () {
      renderLegacyDetail(item.id);
    });
    host.appendChild(button);
  });
  addAcronymHovers(host);
  renderLegacyDetail(selectedLegacy);
}

function renderCreatedChart(): void {
  const host = document.getElementById('workforce-created-chart');
  if (!host) return;
  const maxValue = Math.max.apply(null, CREATED.map(function (item) {
    return item.values[activeScenario];
  }));
  host.textContent = '';

  CREATED.forEach(function (item) {
    const value = item.values[activeScenario];
    const fill = item.fills[activeScenario];
    const wrap = document.createElement('div');
    wrap.className = 'workforce-created-item';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'workforce-created-row';
    button.setAttribute('aria-expanded', item.id === selectedCreated ? 'true' : 'false');
    const label = document.createElement('span');
    label.textContent = item.name;
    const track = document.createElement('span');
    track.className = 'workforce-created-track';
    const transitioned = document.createElement('i');
    transitioned.className = 'transitioned';
    transitioned.style.width = value ? (fill / value * 100) + '%' : '0';
    const entrants = document.createElement('i');
    entrants.className = 'entrants';
    entrants.style.width = value ? ((value - fill) / value * 100) + '%' : '0';
    track.style.width = Math.max(8, value / maxValue * 100) + '%';
    track.appendChild(transitioned);
    track.appendChild(entrants);
    const count = document.createElement('strong');
    count.textContent = fmtShort(value);
    button.appendChild(label);
    button.appendChild(track);
    button.appendChild(count);

    const detail = document.createElement('div');
    detail.className = 'workforce-created-detail';
    detail.hidden = item.id !== selectedCreated;
    const dText = document.createElement('p');
    dText.textContent = item.derivation;
    const dRoles = document.createElement('p');
    dRoles.innerHTML = '<strong>Roles:</strong> ' + item.roles;
    const dFill = document.createElement('small');
    dFill.textContent = fmtShort(fill) + ' positions modeled as fillable by displaced workers; ' +
      fmtShort(value - fill) + ' require other entrants. Confidence: ' +
      item.confidence + '.';
    detail.appendChild(dText);
    detail.appendChild(dRoles);
    detail.appendChild(dFill);

    button.addEventListener('click', function () {
      selectedCreated = item.id;
      renderCreatedChart();
    });
    wrap.appendChild(button);
    wrap.appendChild(detail);
    host.appendChild(wrap);
  });

  const legend = document.createElement('div');
  legend.className = 'workforce-created-legend';
  legend.innerHTML =
    '<span><i class="transitioned"></i> fillable by displaced workers</span>' +
    '<span><i class="entrants"></i> clinicians, technicians, graduates, or other entrants</span>';
  host.appendChild(legend);
  addAcronymHovers(host);
}

/* LTC direct-care workforce: the one figure that must match the fiscal model
   (aide compensation) is rendered here from the shared source; the rest is
   static prose in the page. */
function renderLtcWorkforce(): void {
  const host = document.getElementById('wf-ltc-comp');
  if (!host) return;
  const w = LTC_WORKFORCE;
  const c = ltcWageFloorCost();
  setText('wf-ltc-comp', '$' + c.mode2024B + 'B/yr');
  setText('wf-ltc-comp-formula',
    w.coveredFteM.toFixed(1) + 'M covered aides x ' + numberFormat.format(w.hoursPerFteYear) +
    ' hr x $' + w.loadedUpliftPerHour.toFixed(2) + '/hr lift = about $' + c.mode2024B +
    'B per year (range $' + c.low2024B + 'B to $' + c.high2024B + 'B).');
}

function setScenario(id: string): void {
  if (!SCENARIOS[id as ScenarioId]) return;
  activeScenario = id as ScenarioId;
  document.querySelectorAll<HTMLElement>('[data-wf-scenario]').forEach(function (button) {
    button.setAttribute('aria-pressed', button.dataset.wfScenario === id ? 'true' : 'false');
  });
  renderFlow();
  renderLegacyList();
  renderCreatedChart();
}

function initWorkforce(): void {
  const list = document.getElementById('workforce-legacy-list');
  if (!list) return; // not on the workforce page
  if (list.dataset.wired === '1') return;
  list.dataset.wired = '1';
  activeScenario = 'plan';
  selectedLegacy = 'insurer';
  selectedCreated = 'units';
  document.querySelectorAll<HTMLElement>('[data-wf-scenario]').forEach(function (button) {
    button.addEventListener('click', function () {
      setScenario(button.dataset.wfScenario || 'plan');
    });
  });
  setScenario('plan');
  renderLtcWorkforce();
  addAcronymHovers(document.querySelector('main'));
}

document.addEventListener('astro:page-load', initWorkforce);
