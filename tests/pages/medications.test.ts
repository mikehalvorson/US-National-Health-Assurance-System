import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Medications from '../../src/pages/medications.astro';

test('medications page renders prose + interactive controls, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Medications);
  expect(html).toContain('Search all 200 product families');
  expect(html).toContain('id="medications-family-list"');
  expect(html).toContain('id="medications-share"');
  expect(html).toContain('id="medications-pmc-savings"');
  expect(html.includes('—')).toBe(false);
});

/* Review 2 of the owner decisions: the ledger a reader sees before the
   script runs is the one the script draws at the sliders' defaults (the page
   had typed $244B and $287B, the old drug base's, and a 15% bar). */
test('the no-JS savings ledger is the ledger at the sliders\' defaults', async () => {
  const { savingsLedger, savingsMoney } = await import('../../src/lib/medications');
  const { medicationsSliderRange } = await import('../../src/lib/manifest-check');
  const share = medicationsSliderRange('medications-share')!;
  const reduction = medicationsSliderRange('medications-reduction')!;
  const ledger = savingsLedger(share.value, reduction.value);
  const container = await AstroContainer.create();
  const html = await container.renderToString(Medications);
  const cell = (id: string) => (html.match(new RegExp('id="' + id + '"[^>]*>([^<]*)<')) ?? [])[1];
  expect(cell('medications-pmc-savings-copy')).toBe(savingsMoney(ledger.pmc));
  expect(cell('medications-purchasing-savings')).toBe(savingsMoney(ledger.purchasing));
  expect(cell('medications-total-drug-savings')).toBe(savingsMoney(ledger.whole));
  expect(html).toMatch(new RegExp('id="medications-pmc-share-bar" style="width:' + share.value + '%"'));
});
