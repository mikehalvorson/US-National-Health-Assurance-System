import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Tax from '../../src/pages/tax.astro';

test('tax page renders prose + interactive containers, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Tax);
  expect(html).toContain('The same care, financed differently');
  expect(html).toContain('Start with where the money is');
  expect(html).toContain('id="inequality-tiles"');
  expect(html).toContain('id="wealth-chart"');
  expect(html).toContain('id="toprate-chart"');
  expect(html).toContain('id="program-list"');
  expect(html).toContain('id="tax-scenario"');
  expect(html).toContain('id="tax-instruments"');
  expect(html).toContain('id="tax-path-chart"');
  expect(html).toContain('id="tax-tiles"');
  expect(html).toContain('id="tax-savepay-chart"');
  expect(html).toContain('id="tax-impact-chart"');
  expect(html).toContain('id="tax-rate-chart"');
  expect(html).toContain('id="tax-dist-table"');
  expect(html).toContain('id="dist-year"');
  expect(html).toContain('id="mode-dollars"');
  expect(html).toContain('id="mode-pct"');
  expect(html.includes('—')).toBe(false);
});
