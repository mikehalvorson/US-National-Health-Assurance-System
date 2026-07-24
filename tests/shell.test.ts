import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import TabNav from '../src/components/TabNav.astro';

const TAB_IDS = [
  'tab-overview','tab-health','tab-tax','tab-legislation','tab-units',
  'tab-medications','tab-data','tab-workforce','tab-gov','tab-hardening',
  'tab-rollout','tab-quality',
];

test('TabNav renders all twelve tab buttons in order', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(TabNav);
  for (const id of TAB_IDS) expect(html).toContain(`id="${id}"`);
  const buttonCount = (html.match(/<button/g) ?? []).length;
  expect(buttonCount).toBe(12);
});

test('shell contains no em dashes (hard content rule)', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(TabNav);
  expect(html.includes('—')).toBe(false);
});
