import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Overview from '../../src/pages/index.astro';
import { PROBLEM_STATS } from '../../src/lib/params';

test('overview includes Act-1/Act-2 with build-time tiles and sponsor table', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('id="flow-today-solo"');
  expect(html).toContain('id="sponsor-table"');
  expect(html).toContain('id="problem-tiles"');
  expect(html).toContain('The system today');
  // problem tiles rendered at build time (at least one tile value present)
  expect(html).toContain('17.6% of GDP');
  // sponsor table rendered at build time (a source label present)
  expect(html).toContain('Households');
});

test('overview renders one tile per problem stat and no model tiles', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  // Only #problem-tiles remain on the overview; the hero and outcome tiles
  // moved to the Healthcare chapter with the rest of the cost model.
  expect((html.match(/class="tile"/g) ?? []).length).toBe(PROBLEM_STATS.length);
});

test('overview includes Act-3/Act-4 proposal prose', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('The fixable part');
  expect(html).toContain('The proposal: National Health Assurance');
  expect(html).toContain('lever-list');
});

test('overview includes the four operating-system diagrams with base-aware links', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('overview-system-map');
  expect(html).toContain('overview-care-path');
  expect(html).toContain('overview-money-shift');
  expect(html).toContain('overview-rollout-arc');
  // SPA buttons converted to real links
  expect(html).not.toContain('data-dashboard-view');
  expect(html).toContain('/US-National-Health-Assurance-System/health');
  expect(html).toContain('/US-National-Health-Assurance-System/rollout');
});

test('overview ends with the chapter grid and story pager', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview, {
    request: new Request('http://localhost/US-National-Health-Assurance-System/'),
  });
  expect(html).toContain('overview-chapter-grid');
  expect(html).toContain('Each chapter answers a different implementation question');
  const grid = html.slice(html.indexOf('overview-chapter-grid'));
  const links = (grid.match(/<a /g) ?? []).length;
  expect(links).toBeGreaterThanOrEqual(11);
  expect(html).toContain('/US-National-Health-Assurance-System/quality');
  // story pager (Next -> Healthcare) restored at the end of the page
  expect(html).toContain('chapter-nav');
  expect(html).toContain('Walk the story');
});

test('overview no longer carries the cost model (moved to Healthcare)', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).not.toContain('id="controls"');
  expect(html).not.toContain('id="hero-value"');
  expect(html).not.toContain('id="path-chart"');
  expect(html).not.toContain('id="financing-chart"');
  expect(html).not.toContain('id="bridge-chart"');
  expect(html).not.toContain('id="benchmark-nhe"');
  expect(html).not.toContain('id="param-table"');
  expect(html).not.toContain('id="care-cards"');
  expect(html).not.toContain('id="household-calc"');
  expect(html).not.toContain('id="flow-today"');
  expect(html).not.toContain('id="flow-nha"');
  expect(html).not.toContain('Methodology and limits');
  expect(html).not.toContain('The system-level price tag');
});

test('overview shell has no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html.includes('—')).toBe(false);
});
