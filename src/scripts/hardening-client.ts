/* Executive-hardening tab client: 7-layer "Defense in depth" stepper +
   acronym hovers. Port of docs/js/hardening.js:94-212. Runs on
   astro:page-load; idempotent via the stepper's dataset.wired guard. */
import { LAYERS, ACRONYMS } from '../lib/hardening';

function appendField(host: HTMLElement, label: string, value: string): void {
  const field = document.createElement('div');
  field.className = 'hardening-detail-field';
  const heading = document.createElement('h4');
  heading.textContent = label;
  const body = document.createElement('p');
  body.textContent = value;
  field.appendChild(heading);
  field.appendChild(body);
  host.appendChild(field);
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
      abbr.className = 'hardening-acronym';
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

function selectLayer(stepper: HTMLElement, detail: HTMLElement, index: number): void {
  const layer = LAYERS[index];
  const buttons = stepper.querySelectorAll('button');
  buttons.forEach(function (button, buttonIndex) {
    button.setAttribute('aria-pressed', buttonIndex === index ? 'true' : 'false');
  });

  detail.textContent = '';
  const head = document.createElement('div');
  head.className = 'hardening-detail-head';
  const kicker = document.createElement('span');
  kicker.textContent = 'Layer ' + String(index + 1).padStart(2, '0') + ' · ' + layer.controls;
  const title = document.createElement('h3');
  title.textContent = layer.title;
  head.appendChild(kicker);
  head.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'hardening-detail-summary';
  summary.textContent = layer.summary;

  const grid = document.createElement('div');
  grid.className = 'hardening-detail-grid';
  appendField(grid, 'Attack blocked', layer.attack);
  appendField(grid, 'Automatic continuity', layer.continuity);
  appendField(grid, 'Independent check and remedy', layer.check);
  appendField(grid, 'Evidence of readiness', layer.proof);

  detail.appendChild(head);
  detail.appendChild(summary);
  detail.appendChild(grid);
  addAcronymHovers(detail);
}

function renderStepper(stepper: HTMLElement, detail: HTMLElement): void {
  LAYERS.forEach(function (layer, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hardening-step';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', 'Layer ' + (index + 1) + ': ' + layer.title);

    const number = document.createElement('span');
    number.textContent = String(index + 1).padStart(2, '0');
    const label = document.createElement('strong');
    label.textContent = layer.title;
    button.appendChild(number);
    button.appendChild(label);
    button.addEventListener('click', function () { selectLayer(stepper, detail, index); });
    stepper.appendChild(button);
  });
  selectLayer(stepper, detail, 0);
}

function initHardening(): void {
  const stepper = document.getElementById('hardening-stepper');
  const detail = document.getElementById('hardening-detail');
  if (!stepper || !detail) return; // not on the hardening page
  if (stepper.dataset.wired === '1') return;
  stepper.dataset.wired = '1';
  renderStepper(stepper, detail);
  addAcronymHovers(document.querySelector('main'));
}

/* Also init on first load without waiting for astro:page-load: if this module
   finishes evaluating after ClientRouter fired that event, the listener alone
   would miss it and leave the page blank (see quality-client.ts). initHardening
   is idempotent via dataset.wired. */
document.addEventListener('astro:page-load', initHardening);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHardening);
} else {
  initHardening();
}
