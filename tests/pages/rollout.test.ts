import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Rollout from '../../src/pages/rollout.astro';

test('rollout page renders prose + empty render targets, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Rollout);
  expect(html).toContain('Twelve years, sequenced by readiness');
  expect(html).toContain('id="rollout-timeline"');
  expect(html).toContain('id="rollout-domain-matrix"');
  expect(html).toContain('id="rollout-gates"');
  expect(html.includes('—')).toBe(false);
});
