import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Hardening from '../../src/pages/hardening.astro';

test('hardening page renders prose + empty widget containers, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Hardening);
  expect(html).toContain('Defense in depth');
  expect(html).toContain('id="hardening-stepper"');
  expect(html).toContain('id="hardening-detail"');
  expect(html.includes('—')).toBe(false);
});
