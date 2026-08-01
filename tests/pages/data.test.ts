import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Data from '../../src/pages/data.astro';

test('data page renders prose + empty render targets, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Data);
  expect(html).toContain('Why the current health-data system fails');
  expect(html).toContain('id="data-fixes"');
  expect(html).toContain('id="data-phase-timeline"');
  expect(html).toContain('id="data-transfer-map"');
  expect(html.includes('—')).toBe(false);
});
