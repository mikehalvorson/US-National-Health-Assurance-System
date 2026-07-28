import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Overview from '../../src/pages/index.astro';
import { runMonteCarlo } from '../../src/lib/model';
import { DEFLATOR_2023_TO_2024 as DEF } from '../../src/lib/params';
import { money } from '../../src/lib/format';
import { computeOverview } from '../../src/lib/overview';
import { PROBLEM_STATS } from '../../src/lib/params';

test('overview includes the data-table containers and growth-decomp note', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('id="path-table"');
  expect(html).toContain('id="bridge-table"');
  expect(html).toContain('id="financing-table"');
  expect(html).toContain('id="growth-decomp"');
});

test('overview includes the benchmarks card containers', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('id="benchmark-nhe"');
  expect(html).toContain('id="benchmark-verdict"');
  expect(html).toContain('id="benchmark-fed-model"');
});

test('overview includes the bridge card container', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('id="bridge-chart"');
});

test('overview includes the financing card containers', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('id="financing-chart"');
  expect(html).toContain('id="financing-note"');
});

test('overview includes the money-flow comparison card containers', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain('id="flow-today"');
  expect(html).toContain('id="flow-nha"');
  expect(html).toContain('id="flow-nha-title"');
});

test('overview renders the build-time hero value from the model', async () => {
  const mc = runMonteCarlo('SCN-BASE', null, 600, 42);
  const expected = money(mc.steady.matureToday.p50 * DEF) + '/yr';
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain(expected);
  const nha2041 = money(mc.steady.total.p50 * DEF) + '/yr';
  expect(html).toContain(nha2041);
});

test('overview renders four hero tiles plus the problem-stats tiles', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  // 4 hero tiles (#tiles) + one per PROBLEM_STATS entry (#problem-tiles)
  expect((html.match(/class="tile"/g) ?? []).length).toBe(4 + PROBLEM_STATS.length);
});

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

test('overview shell has no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html.includes('—')).toBe(false);
});

test('overview fills the family-burden note and controls markup at build time', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  const v = computeOverview('SCN-BASE', null);
  expect(html).toContain(v.heroValue);
  expect(html).toContain(v.tiles[0].value);
  expect(html).toContain('id="controls"');
  expect(html).toContain('id="reset-btn"');
  // family note filled, not the empty slice-1 element
  expect(html).toMatch(/id="family-burden-note"[^>]*>\s*\S/);
});
