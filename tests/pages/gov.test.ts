import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Gov from '../../src/pages/gov.astro';

test('gov page renders prose + empty render targets, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Gov);
  expect(html).toContain('The governance architecture');
  expect(html).toContain('id="gov-summary"');
  expect(html).toContain('id="gov-groups"');
  expect(html.includes('—')).toBe(false);
});
