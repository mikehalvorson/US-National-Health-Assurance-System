/* Healthcare tab client: the live household-bill calculator only. The care
   scenarios and outcome stats on this page are static (rendered at build
   time from the same catalogs the Overview uses). The household calculator
   is driven by the model's SCN-BASE default new-revenue path, computed once
   at load exactly as the Overview does (runOverviewMc('SCN-BASE', null),
   deflated to 2024 dollars). init on astro:page-load; idempotent via
   #household-calc dataset.wired; state is rebuilt on each init for
   View-Transition safety. */
import { runOverviewMc } from '../lib/overview';
import { DEFLATOR_2023_TO_2024 as DEF } from '../lib/params';
import { renderHouseholdCalc } from '../lib/household';
import type { HouseholdModelNumbers } from '../lib/household';

function initHealth(): void {
  const hh = document.getElementById('household-calc');
  if (!hh) return; // not on the health page
  if (hh.dataset.wired === '1') return; // idempotent guard
  hh.dataset.wired = '1';

  const mc = runOverviewMc('SCN-BASE', null);
  const householdNumbers: HouseholdModelNumbers = {
    newRevenueB: mc.modePath.detail[mc.years.length - 2].newRevenue * DEF,
  };
  renderHouseholdCalc(hh, () => householdNumbers);
}

document.addEventListener('astro:page-load', initHealth);
