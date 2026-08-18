/* =========================================================================
 * Cost-bridge step builder: pure port of docs/js/app.js bridgeSteps
 * (lines 235-286). Decomposes the status-quo->NHA total at maturity (2041)
 * into additions and savings, each appearing exactly once. Returns the steps
 * plus the identity error (baseline + adds - subs - nheNha), which the old
 * self-test footer recorded as NHA._bridgeIdentityError.
 * ========================================================================= */
import { BASE2023 } from './params';
import { buildRamps, baselineCategorySplit } from './model';
import { scenarioStructural } from './scenarios';
import type { MonteCarloResult } from './model-types';
import type { BridgeStep } from './bridge-chart';

export function bridgeSteps(mc: MonteCarloResult):
  { steps: BridgeStep[]; identityError: number; excludedOneTime: number } {
  const B = BASE2023, p = mc.modeParams;
  const structural = scenarioStructural(mc.scenarioId);
  const ramps = buildRamps(structural);
  const t = mc.years.length - 2; // 2041, transition fully wound down
  const d = mc.modePath.detail[t];
  const G = d.nheBase / B.nheTotal;

  /* R157 [§S5]: one definition, shared with runPath and matureAtScale. */
  const split = baselineCategorySplit(p.embeddedDrugSpend);
  const hosp0 = split.hosp0, clin0 = split.clin0;
  const phcBase = (hosp0 + clin0 + split.drug0 + split.other0) * G;
  const drug0 = split.drug0;

  const covR = ramps.coverage[t] || 0, csR = ramps.costShareElim[t] || 0;
  const drugR = ramps.drugs[t] || 0, hospR = ramps.hospitals[t] || 0;
  const cds = p.coverageDemandShare;
  const u = 1 + (p.utilIncrease / 100) * (cds * covR + (1 - cds) * csR);
  const pay = 1 - (1 - p.providerPaymentFactor) * hospR;

  const utilAdd = phcBase * (u - 1);
  const paySave = (hosp0 + clin0) * G * u * (1 - pay);
  const drugSave = drug0 * G * u * (p.drugPriceCut / 100) * drugR;
  const expansions = d.cLtc + d.cLtcAides + d.cBh + d.cDvh + d.cEmsPh + d.cUnits + d.cRd + d.cWf + d.cItOp;
  const adminNet = (d.legacyAdmin + d.newAdmin + d.govCost) - (B.netInsCost + B.govtAdmin) * G;

  /* R156 [§S5]: this chart used to carry
   *
   *     const oneTime = d.trans + d.itcap + d.shock;
   *     if (Math.abs(oneTime) > 0.5) { steps.push({ 'Transition & shocks...' }) }
   *
   * at t = 2041, where `transitionShape[14]` and `itCapitalShape[14]` are both
   * 0 by construction (the shapes run 12 and 8 years from 2027) and no shock
   * scenario reaches past 2034. `oneTime` was therefore always exactly 0, the
   * branch never rendered, and the chart that answers "where does the money
   * go" silently omitted the plan's largest one-time commitment while looking
   * as though it sometimes showed it.
   *
   * A MATURE-YEAR bridge is the right choice and is kept: every other step is
   * an annual flow at 2041, and adding a cumulative stock to that column would
   * be a category error - and would break the identity, which is exact
   * precisely because transition has wound down by then.
   *
   * So the branch is gone and the exclusion is stated instead, with the number
   * derived from the path rather than typed. `excludedOneTime` is the sum of
   * the transition, IT-capital and shock outlays across the whole horizon:
   * ~$1,600B on the base case, which is the midpoint of the model's own
   * transitionTotal + itCapital range. Callers render it; `rollout.astro`
   * shows the same quantity beside the envelope tile. */
  const excludedOneTime = mc.modePath.detail.reduce(function (a, r) {
    return a + r.trans + r.itcap + r.shock;
  }, 0);

  const steps: BridgeStep[] = [
    { label: 'Status-quo baseline (2041)', value: d.nheBase, kind: 'total' },
    { label: 'Demand response (coverage + $0 care)', value: utilAdd, kind: 'add' },
    { label: 'Benefit expansions (LTC, LTC aide pay, BH, DVH, EMS, units…)', value: expansions, kind: 'add' }
  ];
  steps.push(
    { label: 'Administration & governance (net change)', value: adminNet, kind: adminNet >= 0 ? 'add' : 'sub' },
    { label: 'Provider payment-rate compression', value: -paySave, kind: 'sub' },
    { label: 'Drug price negotiation', value: -drugSave, kind: 'sub' },
    { label: 'Provider billing & revenue-cycle savings', value: -d.offProvAdmin, kind: 'sub' },
    { label: 'Care-model savings (ED diversion, admissions)', value: -d.offCareModel, kind: 'sub' },
    { label: 'Low-value care reduction', value: -d.offLowValue, kind: 'sub' },
    { label: 'Extraction limits', value: -d.offExtraction, kind: 'sub' },
    { label: 'NHA total (2041)', value: d.nheNha, kind: 'total' }
  );

  /* identity check (old NHA._bridgeIdentityError).
     R239 [§S5]: this is an ALGEBRAIC identity, not a cross-check. Both sides
     reduce to the same expression by construction, so the error is exactly
     zero rather than small - see BRIDGE_IDENTITY_NOTE, which is what the page
     states so a reader does not read it as independent corroboration. */
  const running = d.nheBase + utilAdd + expansions + adminNet -
    paySave - drugSave - d.offProvAdmin - d.offCareModel - d.offLowValue - d.offExtraction;
  const identityError = Math.abs(running - d.nheNha);
  return { steps, identityError, excludedOneTime };
}

/* R156 [§S5]: what the bridge leaves out, in the words the chart needs. */
export const BRIDGE_EXCLUSION_NOTE =
  'This is a mature-year decomposition: every step is an annual flow in 2041, ' +
  'by which point transition outlays have wound down to zero. One-time ' +
  'transition and IT-capital cost is therefore not in it, and is not a ' +
  'residual it could show. That spending is cumulative and is stated on the ' +
  'rollout chapter as its own envelope.';

/* R239 [§S5]: §AT2 re-derived the identity symbolically and found both sides
   equal by construction - the embedded-drug split nets out and the ten PHC
   categories reconcile against nheTotal by definition - which is why the
   measured error is 0.000e+00 rather than merely small. It genuinely
   re-derives the price and demand side from modeParams, so it catches a
   bridge.ts <-> model.ts divergence there; the offsets and expansions it reads
   straight from detail[] and cannot validate. Stating that is the whole of
   this row: the identity is worth having and is not corroboration. */
export const BRIDGE_IDENTITY_NOTE =
  'The bridge closes to zero by construction, not by agreement between two ' +
  'independent calculations: it is an algebraic identity, so an exact close ' +
  'confirms the decomposition was assembled correctly and is not evidence ' +
  'that the total is right. It does re-derive the price and demand terms from ' +
  'the parameters, so a divergence there would break it; the offsets are read ' +
  'from the engine and pass through unchecked.';
