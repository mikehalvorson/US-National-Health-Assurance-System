import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Quality from '../../src/pages/quality.astro';

test('quality page renders prose + filter controls, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Quality);
  expect(html).toContain('Explore all 440 parameters');
  expect(html).toContain('id="quality-table"');
  expect(html).toContain('id="quality-phase-overview"');
  expect(html).toContain('id="quality-selected"');
  expect(html).toContain('The equation behind every target');
  expect(html).toContain('id="quality-eq-scenario"');
  expect(html).toContain('id="quality-eq-diagram"');
  expect(html).toContain('id="quality-eq-detail"');
  expect(html.includes('—')).toBe(false);
});
