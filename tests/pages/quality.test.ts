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
     exactly what kept the two numbers one view apart.
     Anchored on the statement the strip opens with rather than on a comment,
     and the match itself is asserted: an assertion that silently finds nothing
     to check is the failure mode this whole section exists to catch. */
  const source = client.replace(/\r/g, '');
  const strip = /if \(([^)]*)\) \{\s*const t = eqTargets\(\)\[id\];/.exec(source);
  expect(strip, 'strip condition not found in buildEquationPanel').toBeTruthy();
  expect(strip![1]).toBe('cat');

  /* And the field applyEquationTargets has always written is now read. */
  expect(client).toContain('entry.interpretation');
  expect(client).toContain('entry.bounded');
  expect(client).toContain('entry.raw');
});

/* R221 [§S3]: the page's stated derivation matches how targets were computed.
 *
 * The claim was "Targets here are calculated, not asserted." 538 of the 727
 * published rows are calculated and 189 are the plan's own commitments carried
 * as written, so the blanket form was false for a quarter of what the page
 * shows. It states the split now, counted from the catalog. Asserted against
 * the RENDERED html rather than the template, because a template assertion
 * would pass on an expression that never evaluates. */
test('the Quality tab states where every published target came from', async () => {
  const { derivationCounts } = await import('../../src/lib/rollout-kind-check');
  const container = await AstroContainer.create();
  const html = await container.renderToString(Quality);

  const derivations = derivationCounts();
  expect(derivations.length).toBeGreaterThan(1);
  const total = derivations.reduce((n, d) => n + d.rows, 0);

  /* Astro escapes apostrophes and stamps dev attributes onto elements, so the
     comparison runs on text with tags stripped and entities restored. */
  const text = html.replace(/<[^>]+>/g, '').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  for (const d of derivations) {
    expect(text, d.derivation).toContain(d.rows + ' from ' + d.derivation);
  }
  expect(text).toContain(total + ' targets, from four sources');

  /* The claim that was false. */
  expect(html).not.toContain('calculated, not asserted');

  /* And the equation share is stated as a share, not as the whole. */
  const eqRows = derivations
    .filter((d) => d.kinds.includes('equation-derived target'))
    .reduce((n, d) => n + d.rows, 0);
  expect(eqRows).toBeLessThan(total);
  expect(html).toContain(eqRows + ' of the ' + total + ' published phase targets');
});
