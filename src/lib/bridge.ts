/* =========================================================================
 * Cost-bridge step builder: pure port of docs/js/app.js bridgeSteps
 * (lines 235-286). Decomposes the status-quo->NHA total at maturity (2041)
 * into additions and savings, each appearing exactly once. Returns the steps
 * plus the identity error (baseline + adds - subs - nheNha), which the old
 * self-test footer recorded as NHA._bridgeIdentityError.
 * ========================================================================= */
import { BASE2023 } from './params';
import { buildRamps } from './model';
import { scenarioStructural } from './scenarios';
import type { MonteCarloResult } from './model-types';
import type { BridgeStep } from './bridge-chart';

export function bridgeSteps(mc: MonteCarloResult): { steps: BridgeStep[]; identityError: number } {
  const B = BASE2023, p = mc.modeParams;
  const structural = scenarioStructural(mc.scenarioId);
  const ramps = buildRamps(structural);
  const t = mc.years.length - 2; // 2041, transition fully wound down
  const d = mc.modePath.detail[t];
  const G = d.nheBase / B.nheTotal;

  const e = p.embeddedDrugSpend;
  const hosp0 = B.hospital - 0.6 * e, clin0 = B.physician + B.otherProf - 0.4 * e;
  const drug0 = B.rxRetail + e;
  const oth0 = B.dental + B.otherPersonal + B.homeHealth + B.nursing + B.dme + B.nondurables;
  const phcBase = (hosp0 + clin0 + drug0 + oth0) * G;

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
  const oneTime = d.trans + d.itcap + d.shock;

  const steps: BridgeStep[] = [
    { label: 'Status-quo baseline (2041)', value: d.nheBase, kind: 'total' },
    { label: 'Demand response (coverage + $0 care)', value: utilAdd, kind: 'add' },
    { label: 'Benefit expansions (LTC, LTC aide pay, BH, DVH, EMS, units…)', value: expansions, kind: 'add' }
  ];
  if (Math.abs(oneTime) > 0.5) {
    steps.push({ label: 'Transition & shocks (residual)', value: oneTime, kind: 'add' });
  }
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

  /* identity check (old NHA._bridgeIdentityError) */
  const running = d.nheBase + utilAdd + expansions + oneTime + adminNet -
    paySave - drugSave - d.offProvAdmin - d.offCareModel - d.offLowValue - d.offExtraction;
  const identityError = Math.abs(running - d.nheNha);
  return { steps, identityError };
}
