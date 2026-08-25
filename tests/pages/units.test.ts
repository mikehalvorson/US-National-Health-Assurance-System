import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Units from '../../src/pages/units.astro';
import { absorptionSpan } from '../../src/lib/manifest-check';
import {
  ALLOCATION_THRESHOLDS, NATIONAL_OFFICE_VISITS, NETWORK_ABSORPTION,
  UNIT_ASSUMPTIONS, UNIT_TYPES, VISIT_SPLITS
} from '../../src/lib/units';

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

/* R186 R187 [§S9b] */
test('the method note and the grade table render from the unit model', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Units);

  // the six graded assumptions, each with its confidence and its owner
  expect(html).toContain('What the count rests on');
  for (const a of UNIT_ASSUMPTIONS) {
    expect(html).toContain(a.label);
    expect(html).toContain(a.value);
    expect(html).toContain(a.owner);
  }

  // the method note states the splits and thresholds the allocation uses
  expect(html).toContain(Math.round(VISIT_SPLITS.urban.b * 100) + '%');
  expect(html).toContain(
    ALLOCATION_THRESHOLDS.urbanPopForTypeD.toLocaleString('en-US'));
  expect(html).toContain(UNIT_TYPES.d.throughput / 1000 + 'k');

  // the slider's bounds come from the model, not from the markup
  expect(html).toContain('min="' + NETWORK_ABSORPTION.min + '"');
  expect(html).toContain('max="' + NETWORK_ABSORPTION.max + '"');

  // R186: the ~1.1bn national encounter claim was consumed by nothing and is
  // gone; what replaced it is a cited comparator with its own year
  expect(html).not.toContain('1.1 billion');
  expect(html).toContain(String(NATIONAL_OFFICE_VISITS.year));

  // R187: the absorption span is computed here, not typed
  const span = absorptionSpan();
  expect(html).toContain((span.highUnits - span.lowUnits).toLocaleString('en-US'));
});
