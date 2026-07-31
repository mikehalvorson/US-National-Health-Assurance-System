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
