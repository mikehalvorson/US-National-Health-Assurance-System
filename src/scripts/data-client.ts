/* Data tab client: finds the hosts for the phase-target master-detail
   scorecards, fix grid, plane grid, store table, transfer map and cyber
   controls, and hands each to its renderer in src/lib/data-render.ts.
   Originally a port of docs/js/data.js:238-633. Runs on astro:page-load;
   idempotent via the fix grid's dataset.wired guard.

   R295 [§S15]: the renderers used to live here, and six of the seven
   appended into their host without clearing it, so each was correct only
   because this init ran once per page instance - behind a guard on a
   different element from five of their six hosts. They moved to the library
   so a test can call each one twice, and each now replaces what its host
   holds. */
import {
  renderCyberControls, renderDataPhaseTimeline, renderFixes, renderPlanes,
  renderStoreTable, renderTransferMap
} from '../lib/data-render';

function initData(): void {
  const host = document.getElementById('data-fixes');
  if (!host) return; // not on the data page
  if (host.dataset.wired === '1') return;
  host.dataset.wired = '1';

  const timeline = document.getElementById('data-phase-timeline');
  const detail = document.getElementById('data-phase-detail');
  if (timeline && detail) {
    renderDataPhaseTimeline({
      timeline, detail,
      methodologyLink: document.getElementById('data-methodology-link') as HTMLAnchorElement | null
    });
  }
  renderFixes(host);
  const planes = document.getElementById('data-planes');
  if (planes) renderPlanes(planes);
  const store = document.getElementById('data-store-table') as HTMLTableElement | null;
  if (store) renderStoreTable(store);
  const transfer = document.getElementById('data-transfer-map');
  if (transfer) renderTransferMap(transfer);
  const cyber = document.getElementById('cyber-controls');
  if (cyber) renderCyberControls(cyber);
}

/* Also init on first load without waiting for astro:page-load: if this module
   finishes evaluating after ClientRouter fired that event, the listener alone
   would miss it and leave the page blank (see quality-client.ts). initData is
   idempotent via dataset.wired. */
document.addEventListener('astro:page-load', initData);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initData);
} else {
  initData();
}
