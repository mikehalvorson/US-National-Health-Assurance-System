import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Quality from '../../src/pages/quality.astro';

test('quality page renders prose + filter controls, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Quality);
  expect(html).toContain('Explore all 430 parameters');
  expect(html).toContain('id="quality-table"');
  expect(html).toContain('id="quality-phase-overview"');
  expect(html).toContain('id="quality-selected"');
  expect(html.includes('—')).toBe(false);
});
