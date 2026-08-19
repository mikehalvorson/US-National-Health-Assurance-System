/* R50 [§S7]: the Medications tab's drug-price lever and the fiscal model's
 * drug line, measured against each other at identical settings.
 *
 * R50 filed this as a wiring defect: two independent controls for the same
 * quantity, calibrated to the same range, never linked, so a visitor can set
 * them differently and see two contradictory drug-savings figures on two tabs
 * of one dashboard. §BY5 sharpened it to the caption, which says "Same range
 * as the fiscal model's national drug-price parameter" and reads as "same
 * parameter as".
 *
 * Measuring it first changed the fix. At identical settings the two figures do
 * not differ because the sliders are unlinked. They differ by a constant
 * factor of about two, at every point in the shared 25-55% range, because they
 * are the same lever applied in different years: the tab multiplies a
 * 2024-scale drug base, and the engine multiplies a base grown to the mature
 * year with utilisation applied. Wiring the two controls together would have
 * made the percentages agree and left the dollars a factor of two apart, which
 * is worse than leaving them visibly independent: it would look reconciled.
 *
 * So the controls stay independent and the page says what the relationship
 * actually is, with the factor measured here rather than asserted.
 *
 * This lives in its own module because medications-client.ts imports
 * medications.ts into the browser bundle, and the comparison needs the engine.
 * Nothing the client loads imports this file. */
import { ALL_DRUG_SPEND_2024 } from './medications';
import { runPath, sampleParams } from './model';
import type { Triangular } from './model-types';
import { DEFLATOR_2023_TO_2024, MATURE_INDEX, MATURE_YEAR, PARAMS_BY_ID } from './params';
import { BASE_SCENARIO_ID, effectiveParams } from './scenarios';

/* The mode run with one parameter pinned to a point. A null draw is the
 * engine's own way of asking for the mode (model.ts:197), so this is the same
 * path the dashboard's mode line takes, not a second implementation of it. */
function matureDrugCost(cut: number): number {
  const pinned: Record<string, Triangular> = {
    ...effectiveParams(BASE_SCENARIO_ID, null),
    drugPriceCut: { low: cut, mode: cut, high: cut }
  };
  return runPath(sampleParams(pinned, null), {}).detail[MATURE_INDEX].cDrugs;
}

export const DRUG_LEVER = (function () {
  const cut = PARAMS_BY_ID.drugPriceCut.mode;
  const withoutCut = matureDrugCost(0);
  const withCut = matureDrugCost(cut);
  /* The engine works in 2023 dollars; the tab publishes 2024 dollars. Compare
   * them in the basis the site publishes. */
  const modelSaving = (withoutCut - withCut) * DEFLATOR_2023_TO_2024;
  const tabLever = ALL_DRUG_SPEND_2024 * cut / 100;
  return {
    cut,
    matureYear: MATURE_YEAR,
    tabLever,
    modelSaving,
    ratio: modelSaving / tabLever
  };
})();

/* Code review [§S7]: this existed so the note and the check could not disagree
 * about what "about twice" meant. The note no longer publishes the multiplier,
 * so the only thing left reading it was itself. The ratio is still measured on
 * DRUG_LEVER and still gated by the 1.5-3.0 band; the export is the dead half. */

/* Code review [§S7]: the first version of this note printed both dollar
 * figures side by side and stated the multiplier between them: "$287B against
 * a 2024-scale drug base, while the model reports about $576B in 2041, roughly
 * 2.0 times as much." Golden rule 6 is "never compare dollars across
 * scale-years... 'mature at 2024 scale' and '2041 steady state' are different
 * questions", and a published ratio between the two is that comparison, even
 * with the explanation attached. Explaining a comparison the house style
 * forbids is not the same as not making it.
 *
 * What the reader needs is what BY5 found missing: that moving this slider
 * does not move the model, and that the model's drug figure is a different
 * question rather than a different answer to this one. That is said without
 * putting the two numbers in one sentence. The ratio stays measured and stays
 * gated below, where it is developer-facing. */
export function drugLeverNote(): string {
  const d = DRUG_LEVER;
  return 'This slider and the fiscal model\'s national drug-price parameter ' +
    'share a range, but they are separate controls: moving this one does not ' +
    'move the model, and moving the model does not move this one. They also ' +
    'answer different questions. This tab applies the ' + d.cut.toFixed(0) +
    '% reduction to a 2024-scale drug base and reports $' +
    d.tabLever.toFixed(0) + 'B. The model applies it to the drug bill as it ' +
    'stands at ' + d.matureYear + ', after years of growth, and reports a ' +
    'steady-state figure for that year. The two are not the same quantity and ' +
    'should not be read against each other.';
}

/* The values the note has to state, held as data for the reason
 * DRUG_BASE_NOTE_FIGURES is: the sentence can be rewritten, the figures
 * cannot be dropped. The engine's own dollar figure is deliberately not among
 * them; see the comment above. */
export const DRUG_LEVER_NOTE_FIGURES = [
  DRUG_LEVER.cut.toFixed(0),
  DRUG_LEVER.tabLever.toFixed(0),
  String(DRUG_LEVER.matureYear)
];
