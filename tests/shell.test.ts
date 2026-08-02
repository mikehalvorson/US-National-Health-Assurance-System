import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import TabNav from '../src/components/TabNav.astro';
import BaseLayout from '../src/layouts/BaseLayout.astro';
import { TABS } from '../src/lib/tabs';

const BASE = '/US-National-Health-Assurance-System/';

test('TabNav renders 13 links with base-prefixed hrefs, in order', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(TabNav, { props: { pathname: BASE } });
  const anchorCount = (html.match(/<a /g) ?? []).length;
  expect(anchorCount).toBe(13);
  for (const t of TABS) {
    const href = BASE + t.path;
    expect(html).toContain(`href="${href}"`);
  }
});

test('TabNav marks the current tab active', async () => {
  const container = await AstroContainer.create();
  const htmlHealth = await container.renderToString(TabNav, {
    props: { pathname: BASE + 'health' },
  });
  // the health anchor carries the active class; overview does not
  expect(htmlHealth).toMatch(/href="\/US-National-Health-Assurance-System\/health"[^>]*class="[^"]*active/);
});

test('rendered shell contains no em dashes', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(BaseLayout, {
    props: { title: 'x' },
    slots: { default: '<main></main>' },
  });
  expect(html.includes('—')).toBe(false); // U+2014 em dash
});
