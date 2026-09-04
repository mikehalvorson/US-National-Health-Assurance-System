/* Legislation tab client: master-detail domain browser + acronym hovers.
   Port of docs/js/legislation.js:358-485. Runs on astro:page-load; idempotent
   via the list container's dataset.wired guard. */
import { DOMAINS } from '../lib/legislation';

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

function initLegislation(): void {
  const list = document.getElementById('legislation-law-list');
  const host = document.getElementById('legislation-law-detail');
  if (!list || !host) return; // not on the legislation page
  if (list.dataset.wired === '1') return;
  list.dataset.wired = '1';
  renderList(list, host);
}

/* Also init on first load without waiting for astro:page-load: if this module
   finishes evaluating after ClientRouter fired that event, the listener alone
   would miss it and leave the page blank (see quality-client.ts).
   initLegislation is idempotent via dataset.wired. */
document.addEventListener('astro:page-load', initLegislation);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLegislation);
} else {
  initLegislation();
}
