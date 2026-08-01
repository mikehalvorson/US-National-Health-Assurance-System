/* Legislation tab client: master-detail domain browser + acronym hovers.
   Port of docs/js/legislation.js:358-485. Runs on astro:page-load; idempotent
   via the list container's dataset.wired guard. */
import { DOMAINS, ACRONYMS } from '../lib/legislation';

function element(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderDetail(list: HTMLElement, host: HTMLElement, index: number): void {
  const domain = DOMAINS[index];
  const buttons = list.querySelectorAll('button');
  buttons.forEach(function (button, buttonIndex) {
    button.setAttribute('aria-pressed', buttonIndex === index ? 'true' : 'false');
  });

  host.textContent = '';
  const head = element('div', 'legislation-law-detail-head');
  head.appendChild(element('span', '', 'Domain ' + String(index + 1).padStart(2, '0')));
  head.appendChild(element('h3', '', domain.title));

  const badges = element('div', 'legislation-action-badges');
  domain.actions.forEach(function (action) {
    badges.appendChild(element('span', 'legislation-action legislation-action-' + action.toLowerCase(), action));
  });

  const lawSection = element('section', 'legislation-law-field legislation-law-field-wide');
  lawSection.appendChild(element('h4', '', 'Affected laws and legal systems'));
  const laws = element('ul', '');
  domain.laws.forEach(function (law) { laws.appendChild(element('li', '', law)); });
  lawSection.appendChild(laws);

  function field(label: string, value: string): HTMLElement {
    const section = element('section', 'legislation-law-field');
    section.appendChild(element('h4', '', label));
    section.appendChild(element('p', '', value));
    return section;
  }

  const grid = element('div', 'legislation-law-fields');
  grid.appendChild(lawSection);
  grid.appendChild(field('What changes', domain.change));
  grid.appendChild(field('What remains protected', domain.preserve));
  grid.appendChild(field('How the change is performed', domain.method));
  grid.appendChild(field('Activation and sunset', domain.phase));

  const sources = element('div', 'legislation-law-sources');
  sources.appendChild(element('span', '', 'Primary law'));
  domain.sources.forEach(function (source) {
    const link = element('a', '', source[0]) as HTMLAnchorElement;
    link.href = source[1];
    link.target = '_blank';
    link.rel = 'noopener';
    sources.appendChild(link);
  });

  host.appendChild(head);
  host.appendChild(badges);
  host.appendChild(grid);
  host.appendChild(sources);
  addAcronymHovers(host);
}

function renderList(list: HTMLElement, host: HTMLElement): void {
  DOMAINS.forEach(function (domain, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'legislation-law-button';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', 'Open legal domain ' + (index + 1) + ': ' + domain.title);
    button.appendChild(element('span', '', String(index + 1).padStart(2, '0')));
    button.appendChild(element('strong', '', domain.short));
    button.addEventListener('click', function () { renderDetail(list, host, index); });
    list.appendChild(button);
  });
  renderDetail(list, host, 0);
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
      abbr.className = 'legislation-acronym';
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

function initLegislation(): void {
  const list = document.getElementById('legislation-law-list');
  const host = document.getElementById('legislation-law-detail');
  if (!list || !host) return; // not on the legislation page
  if (list.dataset.wired === '1') return;
  list.dataset.wired = '1';
  renderList(list, host);
  addAcronymHovers(document.querySelector('main'));
}

document.addEventListener('astro:page-load', initLegislation);
