import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Overview from '../../src/pages/index.astro';
import { runMonteCarlo } from '../../src/lib/model';
import { DEFLATOR_2023_TO_2024 as DEF } from '../../src/lib/params';
import { money } from '../../src/lib/format';

test('overview renders the build-time hero value from the model', async () => {
  const mc = runMonteCarlo('SCN-BASE', null, 600, 42);
  const expected = money(mc.steady.matureToday.p50 * DEF) + '/yr';
  const container = await AstroContainer.create();
  const html = await container.renderToString(Overview);
  expect(html).toContain(expected);
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
