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
    const searchable = (family.name + ' ' + family.form + ' ' +
      family.tags.join(' ')).toLowerCase();
    return (!query || searchable.indexOf(query) >= 0) &&
      (!phase || family.phase === phase) &&
      (!reason || family.tags.indexOf(reason as never) >= 0);
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
    head.appendChild(element('h3', '', family.name));
    head.appendChild(element('span', 'medications-phase-chip', PHASE_META[family.phase]));
    card.appendChild(head);
    card.appendChild(element('p', 'medications-family-form', family.form));
    const tags = element('div', 'medications-family-tags');
    family.tags.forEach(function (tag) {
      tags.appendChild(element('span', '', tag));
    });
    card.appendChild(tags);
    /* R174 [§S7]: the provenance, on the family it belongs to. Declaring it in
       the data and never rendering it would repeat the omission one layer in,
       which is the trap §S6b's scenario picker walked into. */
    const why = element('p', 'medications-family-why',
      family.formClass + ' product, so it qualifies at ' + family.phase +
      (family.why ? '. ' + family.why : '.'));
    const grade = element('span', 'conf ' + family.confidence, family.confidence);
    why.appendChild(document.createTextNode(' '));
    why.appendChild(grade);
    card.appendChild(why);
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
  /* R204 [§S7]: the base was typed into this string as well as into the page,
     so a change to it would have moved one and not the other. */
  setText('medications-savings-formula',
    '$' + ALL_DRUG_SPEND_2024.toFixed(1) + 'B × ' + shareValue.toFixed(0) + '% × ' +
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

/* Also init on first load without waiting for astro:page-load: if this module
   finishes evaluating after ClientRouter fired that event, the listener alone
   would miss it and leave the page blank (see quality-client.ts).
   initMedications is idempotent via dataset.wired. */
document.addEventListener('astro:page-load', initMedications);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMedications);
} else {
  initMedications();
}
