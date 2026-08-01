import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Health from '../../src/pages/health.astro';
import { computeOverview } from '../../src/lib/overview';

test('health page renders the household subset, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Health);
  expect(html).toContain('What people would receive, what care costs, and what the whole system costs');
  expect(html).toContain('What you\'d pay for care');
  expect(html).toContain('Beyond dollars: what the model does not price');
  expect(html).toContain("Your household's annual healthcare bill");
  expect(html).toContain('id="care-cards"');
  expect(html).toContain('id="outcome-tiles"');
  expect(html).toContain('id="household-calc"');
  // static catalogs actually rendered rows
  expect(html).toContain('care-card');
  expect(html).toContain('Under NHA');
  expect(html.includes('—')).toBe(false);
});

test('health page now carries the full system-cost model', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Health);
  // hero + scenario controls
  expect(html).toContain('The system-level price tag');
  expect(html).toContain('id="hero-value"');
  expect(html).toContain('id="controls"');
  expect(html).toContain('id="reset-btn"');
  // chart + table containers
  expect(html).toContain('id="path-chart"');
  expect(html).toContain('id="path-table"');
  expect(html).toContain('id="financing-chart"');
  expect(html).toContain('id="bridge-chart"');
  expect(html).toContain('id="growth-decomp"');
  // money-flow comparison
  expect(html).toContain('id="flow-today"');
  expect(html).toContain('id="flow-nha"');
  expect(html).toContain('id="flow-takeaway"');
  // benchmarks
  expect(html).toContain('id="benchmark-nhe"');
  expect(html).toContain('id="benchmark-verdict"');
  expect(html).toContain('id="benchmark-fed-model"');
  // methodology (build-time)
  expect(html).toContain('Methodology and limits');
  expect(html).toContain('id="param-table"');
  expect(html).toContain('id="gaps-list"');
  expect(html).toContain('id="selftest"');
  expect(html).toContain('Real GDP growth');
  expect(html).toContain('model self-tests pass');
});

test('health renders the build-time hero value and family note from the model', async () => {
  const v = computeOverview('SCN-BASE', null);
  const container = await AstroContainer.create();
  const html = await container.renderToString(Health);
  expect(html).toContain(v.heroValue);
  expect(html).toContain(v.tiles[0].value);
  // family note filled, not the empty slice-1 element
  expect(html).toMatch(/id="family-burden-note"[^>]*>\s*\S/);
});

test('health page ends with the story pager', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Health, {
    request: new Request('http://localhost/US-National-Health-Assurance-System/health'),
  });
  expect(html).toContain('chapter-nav');
  expect(html).toContain('Walk the story');
  // Back -> Overview and Next -> Taxes & Financing
  expect(html).toContain('/US-National-Health-Assurance-System/tax');
});
