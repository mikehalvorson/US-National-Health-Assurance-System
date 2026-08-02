import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Risk from '../../src/pages/risk.astro';

test('risk page renders prose + empty widget containers, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Risk);
  expect(html).toContain('From protections to failure modes');
  expect(html).toContain('id="fmea-matrix"');
  expect(html).toContain('id="fmea-cp"');
  expect(html).toContain('id="fmea-tiers"');
  expect(html).toContain('id="fmea-gaps"');
  expect(html).toContain('id="fmea-table"');
  expect(html.includes('—')).toBe(false); // U+2014 em dash
});
