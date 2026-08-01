import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Units from '../../src/pages/units.astro';

test('units page renders prose + interactive containers, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Units);
  expect(html).toContain('Hospitals become public-service infrastructure');
  expect(html).toContain('Thirteen nonprofit operating regions');
  expect(html).toContain('The community front door, sized from need');
  expect(html).toContain('id="hospital-region-map"');
  expect(html).toContain('id="hospital-region-select"');
  expect(html).toContain('id="hospital-region-scores"');
  expect(html).toContain('id="unit-verdict"');
  expect(html).toContain('id="unit-type-cards"');
  expect(html).toContain('id="units-map"');
  expect(html).toContain('id="units-vpc"');
  expect(html).toContain('id="units-filter"');
  expect(html).toContain('id="units-state-table"');
  expect(html).toContain('id="units-integrity"');
  // pre-wrapped acronym abbrs kept verbatim
  expect(html).toContain('National Hospital Stewardship Authority');
  expect(html.includes('—')).toBe(false);
});
