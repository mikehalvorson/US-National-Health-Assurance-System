import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Quality from '../../src/pages/quality.astro';

test('quality page renders prose + filter controls, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Quality);
  expect(html).toContain('Explore all 440 parameters');
  expect(html).toContain('id="quality-table"');
  expect(html).toContain('id="quality-phase-overview"');
  expect(html).toContain('id="quality-selected"');
  expect(html).toContain('The equation behind every target');
  expect(html).toContain('id="quality-eq-scenario"');
  expect(html).toContain('id="quality-eq-diagram"');
  expect(html).toContain('id="quality-eq-detail"');
  expect(html.includes('—')).toBe(false);
});

/* R232 [§S3]: the two disconnections, pinned at their source.
 *
 * The clamp disclosure was written twice and reached no reader both times.
 * These are source assertions rather than DOM assertions because the client
 * island is not rendered by the Astro container, and both defects were
 * one-token conditions rather than behaviour a container test would see. */
test('the raw-value strip is not gated away from the view that shows the published value', async () => {
  const { readFileSync } = await import('node:fs');
  const client = readFileSync('src/scripts/quality-client.ts', 'utf8');

  /* buildEquationPanel(id, true) is the detail card, the only call site where
     the published value is on screen. A `!compact` gate on the strip is
     exactly what kept the two numbers one view apart. */
  const strip = client.slice(client.indexOf('computed value strip'));
  const condition = strip.slice(0, strip.indexOf('{', strip.indexOf('if (')));
  expect(condition).not.toContain('!compact');

  /* And the field applyEquationTargets has always written is now read. */
  expect(client).toContain('entry.interpretation');
  expect(client).toContain('entry.bounded');
  expect(client).toContain('entry.raw');
});
