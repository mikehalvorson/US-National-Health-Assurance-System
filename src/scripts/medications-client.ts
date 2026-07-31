/* Medications tab client: filterable 200-family portfolio + savings
   attribution sliders. Port of docs/js/medications.js:256-356. Runs on
   astro:page-load; idempotent via the family list's dataset.wired guard. */
import { FAMILIES, PHASE_META, ALL_DRUG_SPEND_2024, calcSavings } from '../lib/medications';

function element(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function money(value: number): string {
  return '$' + (value >= 100 ? value.toFixed(0) : value.toFixed(1)) + 'B';
}

function setText(id: string, text: string): void {
  const e = document.getElementById(id);
  if (e) e.textContent = text;
}

function renderPortfolio(): void {
  const host = document.getElementById('medications-family-list');
  const queryNode = document.getElementById('medications-family-search') as HTMLInputElement | null;
  const phaseNode = document.getElementById('medications-phase-filter') as HTMLSelectElement | null;
  const reasonNode = document.getElementById('medications-reason-filter') as HTMLSelectElement | null;
  const countNode = document.getElementById('medications-family-count');
  if (!host || !queryNode || !phaseNode || !reasonNode || !countNode) return;

  const query = queryNode.value.trim().toLowerCase();
  const phase = phaseNode.value;
  const reason = reasonNode.value;
  const matches = FAMILIES.filter(function (family) {
    const searchable = (family[1] + ' ' + family[2] + ' ' + family[4].join(' ')).toLowerCase();
    return (!query || searchable.indexOf(query) >= 0) &&
      (!phase || family[3] === phase) &&
      (!reason || family[4].indexOf(reason) >= 0);
  });

  host.textContent = '';
  countNode.textContent = matches.length + ' of 200 product families';
  if (!matches.length) {
    host.appendChild(element('p', 'medications-no-results',
      'No product family matches these filters.'));
    return;
  }

  matches.forEach(function (family) {
    const card = element('article', 'medications-family');
    const head = element('div', 'medications-family-head');
    head.appendChild(element('h3', '', family[1]));
    head.appendChild(element('span', 'medications-phase-chip', PHASE_META[family[3]]));
    card.appendChild(head);
    card.appendChild(element('p', 'medications-family-form', family[2]));
    const tags = element('div', 'medications-family-tags');
    family[4].forEach(function (tag) {
      tags.appendChild(element('span', '', tag));
    });
    card.appendChild(tags);
    host.appendChild(card);
  });
}

function renderSavings(): void {
  const share = document.getElementById('medications-share') as HTMLInputElement | null;
  const reduction = document.getElementById('medications-reduction') as HTMLInputElement | null;
  if (!share || !reduction) return;
  const shareValue = Number(share.value);
  const reductionValue = Number(reduction.value);
  const pmc = calcSavings(shareValue, reductionValue);
  const wholePriceLever = ALL_DRUG_SPEND_2024 * reductionValue / 100;
  const purchasing = wholePriceLever - pmc;

  setText('medications-share-value', shareValue.toFixed(0) + '%');
  setText('medications-reduction-value', reductionValue.toFixed(0) + '%');
  setText('medications-pmc-savings', money(pmc));
  setText('medications-pmc-savings-copy', money(pmc));
  setText('medications-purchasing-savings', money(purchasing));
  setText('medications-total-drug-savings', money(wholePriceLever));
  setText('medications-savings-formula',
    '$717.9B × ' + shareValue.toFixed(0) + '% × ' +
    reductionValue.toFixed(0) + '% = ' + money(pmc) + ' per year');
  const bar = document.getElementById('medications-pmc-share-bar');
  if (bar) bar.style.width = shareValue + '%';
}

function initMedications(): void {
  const host = document.getElementById('medications-family-list');
  if (!host) return; // not on the medications page
  if (host.dataset.wired === '1') return;
  host.dataset.wired = '1';
  const query = document.getElementById('medications-family-search');
  const phase = document.getElementById('medications-phase-filter');
  const reason = document.getElementById('medications-reason-filter');
  const share = document.getElementById('medications-share');
  const reduction = document.getElementById('medications-reduction');
  if (query) query.addEventListener('input', renderPortfolio);
  if (phase) phase.addEventListener('change', renderPortfolio);
  if (reason) reason.addEventListener('change', renderPortfolio);
  if (share) share.addEventListener('input', renderSavings);
  if (reduction) reduction.addEventListener('input', renderSavings);
  renderPortfolio();
  renderSavings();
}

document.addEventListener('astro:page-load', initMedications);
