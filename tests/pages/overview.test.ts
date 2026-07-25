import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Overview from '../../src/pages/index.astro';
import { runMonteCarlo } from '../../src/lib/model';
import { DEFLATOR_2023_TO_2024 as DEF } from '../../src/lib/params';
import { money } from '../../src/lib/format';
import { computeOverview } from '../../src/lib/overview';

test('overview renders the build-time hero value from the model', async () => {
  const mc = runMonteCarlo('SCN-BASE', null, 600, 42);
  const expected = money(mc.steady.matureToday.p50 * DEF) + '/yr';
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain(expected);
  const nha2041 = money(mc.steady.total.p50 * DEF) + '/yr';
  expect(html).toContain(nha2041);
});

test('overview renders four tiles', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect((html.match(/class="tile"/g) ?? []).length).toBe(4);
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
