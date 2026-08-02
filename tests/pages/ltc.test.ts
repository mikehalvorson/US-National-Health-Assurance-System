import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Ltc from '../../src/pages/ltc.astro';

test('LTC page renders the three-part story and mount points, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Ltc);
  // Part 1: why the current system fails
  expect(html).toContain('Why the current system fails');
  expect(html).toContain('Medicare does not pay for long-term custodial care');
  expect(html).toContain('id="ltc-failure-stats"');
  // Part 2: systems that work
  expect(html).toContain('id="ltc-gdp-chart"');
  expect(html).toContain('id="ltc-country-cards"');
  // Part 3: the plan
  expect(html).toContain('id="ltc-pillars"');
  expect(html).toContain('id="ltc-cost-note"');
  expect(html).toContain('id="ltc-workforce-fig"');
  expect(html.includes('—')).toBe(false);
});
