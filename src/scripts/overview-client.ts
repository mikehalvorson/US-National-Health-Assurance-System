/* =========================================================================
 * Overview page client interactivity. The Overview is now the conceptual
 * front door: the full cost model moved to the Healthcare chapter, so the
 * only element here that needs the client is the standalone 2023 CMS money
 * flow (#flow-today-solo). Everything else on the page renders at build time.
 *
 * Re-initialises on astro:page-load so it survives View Transitions; the
 * `data-wired` guard keeps re-init idempotent.
 * ========================================================================= */
import { renderFlowDiagram } from '../lib/flow-diagram';
import { todayFlowSpec } from '../lib/money-flow';

function initOverview(): void {
  const solo = document.getElementById('flow-today-solo');
  if (!solo) return; // not on the overview page
  if (solo.dataset.wired === '1') return; // idempotent guard
  solo.dataset.wired = '1';
  renderFlowDiagram(solo, todayFlowSpec());
}

document.addEventListener('astro:page-load', initOverview);
