/* Household annual calculator: client DOM port of docs/js/care.js
   renderHouseholdCalc (204-272). The tax-share line reads live model numbers
   via getModelNumbers(), supplied by the Overview client so it tracks the
   shared Monte Carlo run. KPP-C8: ordinary households bear <=5% of new financing. */
import { HOUSEHOLD_PROFILES, HOUSEHOLDS_M, moneyRange } from './care';
import { money } from './format';

export interface HouseholdModelNumbers { newRevenueB: number }

export function renderHouseholdCalc(
  container: HTMLElement,
  getModelNumbers: () => HouseholdModelNumbers
): () => void {
  container.innerHTML = '';

  function div(cls: string, parent: HTMLElement | null, text?: string): HTMLDivElement {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    if (parent) parent.appendChild(d);
    return d;
  }

  const picker = div('hh-picker', container);
  const lab = document.createElement('label');
  lab.textContent = 'Your situation: ';
  lab.setAttribute('for', 'hh-select');
  const sel = document.createElement('select');
  sel.id = 'hh-select';
  HOUSEHOLD_PROFILES.forEach(function (p) {
    const o = document.createElement('option');
    o.value = p.id; o.textContent = p.label;
    sel.appendChild(o);
  });
  picker.appendChild(lab); picker.appendChild(sel);

  const grid = div('hh-grid', container);
  const todayCol = div('hh-col', grid);
  const nhaCol = div('hh-col hh-col-nha', grid);
  const foot = div('hh-foot note', container);

  function render(): void {
    const p = HOUSEHOLD_PROFILES.filter(function (x) { return x.id === sel.value; })[0] ||
              HOUSEHOLD_PROFILES[0];
    const m = getModelNumbers();
    /* KPP-C8: 5% of incremental financing, $B -> $/household */
    const kppShare = (0.05 * m.newRevenueB * 1e9) / (HOUSEHOLDS_M * 1e6);

    todayCol.innerHTML = ''; nhaCol.innerHTML = '';

    div('hh-col-head', todayCol, 'Today (per year)');
    const tPrem = div('hh-line', todayCol);
    div('hh-line-label', tPrem, 'Premiums');
    div('hh-line-val', tPrem, moneyRange(p.premium.lo, p.premium.hi));
    div('hh-line-note', todayCol, p.premium.note);
    const tOop = div('hh-line', todayCol);
    div('hh-line-label', tOop, 'Out-of-pocket care costs');
    div('hh-line-val', tOop, moneyRange(p.oop.lo, p.oop.hi));
    div('hh-line-note', todayCol, p.oop.note);
    const tTot = div('hh-line hh-total', todayCol);
    div('hh-line-label', tTot, 'Typical total');
    div('hh-line-val', tTot, moneyRange(p.premium.lo + p.oop.lo, p.premium.hi + p.oop.hi));

    div('hh-col-head', nhaCol, 'Under NHA at maturity (per year)');
    const nPrem = div('hh-line', nhaCol);
    div('hh-line-label', nPrem, 'Premiums');
    div('hh-line-val', nPrem, '$0');
    const nOop = div('hh-line', nhaCol);
    div('hh-line-label', nOop, 'Point-of-care costs for covered care');
    div('hh-line-val', nOop, '$0');
    div('hh-line-note', nhaCol, 'covered medically necessary care is free at the point of use (KPP-A3 allows ≤0.5% billing exceptions); non-covered extras remain private');
    const nTax = div('hh-line', nhaCol);
    div('hh-line-label', nTax, 'Avg. household share of new taxes if financed per the plan’s cap');
    div('hh-line-val', nTax, '≤ $' + Math.round(kppShare).toLocaleString('en-US'));
    div('hh-line-note', nhaCol,
      'the plan caps ordinary households at 5% of new financing: 5% of the model’s ' +
      money(m.newRevenueB) + '/yr new-revenue requirement ÷ ' + HOUSEHOLDS_M + 'M households. ' +
      'The rest falls on wealth, high-income, employer, and health-sector taxes, if those levers deliver.');

    foot.textContent =
      'Honest caveats: employer payroll contributions are widely expected to show up partly in wages over time (not modeled); ' +
      'the uninsured today spend little on average because they skip care, so the comparison understates what coverage is worth to them; ' +
      'and the tax line depends entirely on Congress honoring the plan’s household-protection cap.';
  }

  sel.addEventListener('change', render);
  render();
  return render;
}
