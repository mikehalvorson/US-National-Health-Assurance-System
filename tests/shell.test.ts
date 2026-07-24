import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import TabNav from '../src/components/TabNav.astro';
import BaseLayout from '../src/layouts/BaseLayout.astro';

const TAB_IDS = [
  'tab-overview','tab-health','tab-tax','tab-legislation','tab-units',
  'tab-medications','tab-data','tab-workforce','tab-gov','tab-hardening',
  'tab-rollout','tab-quality',
];

test('TabNav renders all twelve tab buttons in order', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(TabNav);
  const positions = TAB_IDS.map((id) => html.indexOf(`id="${id}"`));
  for (const pos of positions) expect(pos).toBeGreaterThan(-1);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  const buttonCount = (html.match(/<button/g) ?? []).length;
  expect(buttonCount).toBe(12);
});

test('rendered shell contains no em dashes (hard content rule)', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(BaseLayout, {
    props: { title: 'National Health Assurance: Story & System Dashboard' },
    slots: { default: '<main></main>' },
  });
  expect(html.includes('—')).toBe(false);
});
