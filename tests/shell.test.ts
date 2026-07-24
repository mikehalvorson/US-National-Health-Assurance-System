import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import BaseLayout from '../src/layouts/BaseLayout.astro';

test('BaseLayout renders the document title', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(BaseLayout, {
    props: { title: 'National Health Assurance: Story & System Dashboard' },
    slots: { default: '<main>x</main>' },
  });
  expect(html).toContain('<title>National Health Assurance');
  expect(html).toContain('<main>x</main>');
});
