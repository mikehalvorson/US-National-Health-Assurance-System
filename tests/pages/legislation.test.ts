import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Legislation from '../../src/pages/legislation.astro';

test('legislation page renders prose + empty widget containers, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Legislation);
  expect(html).toContain('What Congress must enact');
  expect(html).toContain('id="legislation-law-list"');
  expect(html).toContain('id="legislation-law-detail"');
  expect(html.includes('—')).toBe(false);
});
