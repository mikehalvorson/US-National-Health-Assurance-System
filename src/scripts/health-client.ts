/* =========================================================================
 * Healthcare page client interactivity. This chapter now carries the full
 * system-cost model (moved back from the Overview): the scenario controls,
 * hero recompute, cost-path / flow / financing / bridge / benchmark charts,
 * the comparison tables, and the live household-bill calculator.
 *
 * Re-initialises on astro:page-load so it survives View Transitions; the
 * `data-wired` guard on #controls keeps re-init idempotent.
 * ========================================================================= */
import { runOverviewMc, computeOverviewFromMc } from '../lib/overview';
import { renderPathChart } from '../lib/path-chart';
import { renderFlowDiagram } from '../lib/flow-diagram';
import { todayFlowSpec, nhaFlowSpec, nhaFlowTitle, flowTakeawayText } from '../lib/money-flow';
import { renderHouseholdCalc } from '../lib/household';
import type { HouseholdModelNumbers } from '../lib/household';
import { renderFinancingChart } from '../lib/financing-chart';
import { financingSpec, financingNote } from '../lib/financing';
import { renderBridgeChart } from '../lib/bridge-chart';
import { bridgeSteps } from '../lib/bridge';
import { renderBenchmarkChart } from '../lib/benchmark-chart';
import { benchmarkChartRows, benchmarkText } from '../lib/benchmarks';
import { renderDataTable, pathTableData, bridgeTableData, financingTableData } from '../lib/overview-tables';
import type { TableData } from '../lib/overview-tables';
import { growthDecompNote } from '../lib/growth-decomp';
import { SCENARIOS, SCENARIOS_BY_ID, effectiveParams } from '../lib/scenarios';
import { PARAM_DEFS, DEFLATOR_2023_TO_2024 as DEF } from '../lib/params';

interface State {
  scenario: string;
  sliders: Record<string, number>;
}

function initHealth(): void {
  const controls = document.getElementById('controls');
  if (!controls) return; // not on the health page
  if (controls.dataset.wired === '1') return; // idempotent guard
  controls.dataset.wired = '1';

  const state: State = { scenario: 'SCN-BASE', sliders: {} };
  let pending: number | undefined;

  const $ = (id: string) => document.getElementById(id);

  let householdRerender: (() => void) | null = null;
  let householdNumbers: HouseholdModelNumbers = { newRevenueB: 0 };

  function fmtSimple(v: number, unit: string): string {
    if (unit === '×') return v.toFixed(2) + '×';
    if (unit.charAt(0) === '%') return v.toFixed(1) + '%';
    if (unit.indexOf('$B') === 0) return '$' + Math.round(v) + 'B';
    return v.toFixed(1) + ' ' + unit;
  }

  function render(): void {
    const sliders = Object.keys(state.sliders).length ? state.sliders : null;
    const mc = runOverviewMc(state.scenario, sliders);
    const v = computeOverviewFromMc(mc);
    const set = (id: string, txt: string) => {
      const el = $(id);
      if (el) el.textContent = txt;
    };
    set('hero-value', v.heroValue);
    set('hero-range', v.heroRange);
    set('hero-2041-nha', v.nha2041);
    set('hero-2041-base', v.base2041);
    set('hero-2041-range', v.hero2041Range);
    set('family-burden-note', v.familyNote);
    const tilesHost = $('tiles');
    if (tilesHost) {
      tilesHost.innerHTML = '';
      for (const t of v.tiles) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        const l = document.createElement('div');
        l.className = 'label';
        l.textContent = t.label;
        const val = document.createElement('div');
        val.className = 'value';
        val.textContent = t.value;
        const r = document.createElement('div');
        r.className = 'range';
        r.textContent = t.range;
        tile.append(l, val, r);
        tilesHost.appendChild(tile);
      }
    }
    const chartHost = $('path-chart');
    if (chartHost) renderPathChart(chartHost, mc, DEF);
    const flowToday = $('flow-today');
    if (flowToday) renderFlowDiagram(flowToday, todayFlowSpec());
    const flowSolo = $('flow-today-solo');
    if (flowSolo) renderFlowDiagram(flowSolo, todayFlowSpec());
    const flowNha = $('flow-nha');
    if (flowNha) renderFlowDiagram(flowNha, nhaFlowSpec(mc, DEF));
    const flowTitle = $('flow-nha-title');
    if (flowTitle) flowTitle.textContent = nhaFlowTitle(mc, DEF);
    const finChart = $('financing-chart');
    if (finChart) renderFinancingChart(finChart, financingSpec(mc, DEF), DEF);
    const finNote = $('financing-note');
    if (finNote) finNote.textContent = financingNote(mc, DEF);
    const bridgeHost = $('bridge-chart');
    if (bridgeHost) renderBridgeChart(bridgeHost, bridgeSteps(mc).steps, DEF);
    const benchHost = $('benchmark-nhe');
    if (benchHost) {
      renderBenchmarkChart(benchHost, benchmarkChartRows(mc, DEF), {
        aria: 'Total system cost comparison, all at 2024 scale',
      });
    }
    const bt = benchmarkText(mc, DEF);
    set('benchmark-nhe-result', bt.nheResult);
    set('benchmark-fed-model', bt.fedModel);
    set('benchmark-fed-model-range', bt.fedModelRange);
    set('benchmark-fed-result', bt.fedResult);
    set('benchmark-2030-result', bt.delta2030Result);
    set('benchmark-verdict', bt.verdict);
    set('growth-decomp', growthDecompNote(state.scenario, sliders));
    const fillTable = (id: string, data: TableData) => {
      const tbl = document.getElementById(id) as HTMLTableElement | null;
      if (tbl) renderDataTable(tbl, data);
    };
    fillTable('path-table', pathTableData(mc, DEF));
    fillTable('bridge-table', bridgeTableData(mc, DEF));
    fillTable('financing-table', financingTableData(mc, DEF));

    const takeaway = $('flow-takeaway');
    if (takeaway) takeaway.textContent = flowTakeawayText(mc, DEF);

    const hh = $('household-calc');
    if (hh) {
      householdNumbers = { newRevenueB: mc.modePath.detail[mc.years.length - 2].newRevenue * DEF };
      if (!householdRerender) {
        householdRerender = renderHouseholdCalc(hh, () => householdNumbers);
      } else {
        householdRerender();
      }
    }
  }

  function scheduleRender(): void {
    if (pending) clearTimeout(pending);
    pending = window.setTimeout(render, 160);
  }

  function buildControls(): void {
    controls!.innerHTML = '';
    const scnWrap = document.createElement('div');
    scnWrap.className = 'control';
    const scnLabel = document.createElement('label');
    scnLabel.textContent = 'Stress scenario';
    const sel = document.createElement('select');
    sel.id = 'scenario-select';
    for (const s of SCENARIOS) {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = s.id.replace('SCN-', '') + ': ' + s.name;
      sel.appendChild(o);
    }
    sel.value = state.scenario;
    sel.addEventListener('change', () => {
      state.scenario = sel.value;
      state.sliders = {};
      buildControls();
      render();
    });
    scnWrap.append(scnLabel, sel);
    controls!.appendChild(scnWrap);

    const eff = effectiveParams(state.scenario, null);
    for (const p of PARAM_DEFS.filter((d) => d.adjustable)) {
      const wrap = document.createElement('div');
      wrap.className = 'control';
      const label = document.createElement('label');
      const valSpan = document.createElement('span');
      valSpan.className = 'val';
      const conf = document.createElement('span');
      conf.className = 'conf ' + p.confidence;
      conf.textContent = p.confidence ?? '';
      conf.title = p.source ?? '';
      label.appendChild(document.createTextNode((p.label ?? p.id) + ' '));
      label.appendChild(conf);
      label.appendChild(document.createElement('br'));
      label.appendChild(valSpan);
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(p.sliderMin);
      input.max = String(p.sliderMax);
      input.step = String(((p.sliderMax as number) - (p.sliderMin as number)) / 200);
      const seeded = state.sliders[p.id] != null ? state.sliders[p.id] : eff[p.id].mode;
      input.value = String(seeded);
      valSpan.textContent = fmtSimple(seeded, p.unit ?? '');
      input.addEventListener('input', () => {
        state.sliders[p.id] = +input.value;
        valSpan.textContent = fmtSimple(+input.value, p.unit ?? '');
        scheduleRender();
      });
      wrap.append(label, input);
      controls!.appendChild(wrap);
    }
    const scn = SCENARIOS_BY_ID[state.scenario];
    const desc = $('scenario-desc');
    if (desc) desc.textContent = scn ? scn.id + ': ' + scn.desc : '';
  }

  const resetBtn = $('reset-btn');
  resetBtn?.addEventListener('click', () => {
    state.sliders = {};
    buildControls();
    render();
  });

  buildControls();
  render();
}

/* Also init on first load without waiting for astro:page-load: if this module
   finishes evaluating after ClientRouter fired that event, the listener alone
   would miss it and leave the page blank (see quality-client.ts). initHealth is
   idempotent via dataset.wired. */
document.addEventListener('astro:page-load', initHealth);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHealth);
} else {
  initHealth();
}
