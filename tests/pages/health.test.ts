import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Health from '../../src/pages/health.astro';

test('health page renders care subset + household calc, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Health);
  expect(html).toContain('What people would receive, and what care costs them');
  expect(html).toContain('What you\'d pay for care');
  expect(html).toContain('Beyond dollars: what the model does not price');
  expect(html).toContain("Your household's annual healthcare bill");
  expect(html).toContain('id="care-cards"');
  expect(html).toContain('id="outcome-tiles"');
  expect(html).toContain('id="household-calc"');
  // static catalogs actually rendered rows
  expect(html).toContain('care-card');
  expect(html).toContain('Under NHA');
  expect(html.includes('—')).toBe(false);
});
