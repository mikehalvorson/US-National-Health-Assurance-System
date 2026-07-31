import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Workforce from '../../src/pages/workforce.astro';

test('workforce page renders prose + empty render targets, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Workforce);
  expect(html).toContain('Labor transition ledger');
  expect(html).toContain('id="workforce-legacy-list"');
  expect(html).toContain('id="workforce-created-chart"');
  expect(html).toContain('data-wf-scenario="plan"');
  expect(html.includes('—')).toBe(false);
});
