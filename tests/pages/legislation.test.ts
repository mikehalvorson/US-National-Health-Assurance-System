import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Legislation from '../../src/pages/legislation.astro';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

test('legislation page renders prose + empty widget containers, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Legislation);
  expect(html).toContain('What Congress must enact');
  expect(html).toContain('id="legislation-law-list"');
  expect(html).toContain('id="legislation-law-detail"');
  expect(html.includes('—')).toBe(false);
});

/* R247 [§S16] / R95's second test: the disposition key renders exactly
   DISPOSITIONS.length entries, from the declaration, and the sentence above it
   no longer spells the seventh word differently from the key. */
test('R247/R95: the disposition key renders the declared vocabulary, once each', async () => {
  const { DISPOSITIONS } = await import('../../src/lib/legislation');
  const container = await AstroContainer.create();
  const html = await container.renderToString(Legislation);
  const key = /<div role="group" class="legislation-disposition-key"[^>]*>([\s\S]*?)<\/div>/.exec(html);
  expect(key).not.toBeNull();
  /* the container renders dev-only source attributes on every element */
  const words = [...key![1].matchAll(/<span\b[^>]*><b\b[^>]*>([^<]+)<\/b>/g)].map((m) => m[1]);
  expect(words).toEqual([...DISPOSITIONS]);
  expect(html).toContain('Sunset, or Fallback.');
  expect(html).not.toContain('fall back');
});

/* R94 [§S17]: the three hero counters were typed literals; P18 derived them
   (R240, R297). These are the row's own tests, against the rendered page:
   each counter equals the collection it counts, and V10's three verified
   values still hold (19 titles, 4+6+2+4+3; 13 domains; 7 steps). If a
   derived value ever disagrees with V10, the data moved: report it, do not
   edit the data to match the old figure. */
test('R94: the rendered counters equal the collections, and V10 still holds', async () => {
  const { DOMAINS, ENABLING_ACT_TITLE_COUNT } = await import('../../src/lib/legislation');
  const container = await AstroContainer.create();
  const html = await container.renderToString(Legislation);
  const counts = /<div role="group" class="legislation-counts"[^>]*>([\s\S]*?)<\/div>/.exec(html);
  expect(counts).not.toBeNull();
  const shown = [...counts![1].matchAll(/<strong\b[^>]*>(\d+)<\/strong>/g)].map((m) => Number(m[1]));
  const stack = /<div class="legislation-title-stack"[\s\S]*?<\/section>/.exec(html)![0];
  const titles = (stack.match(/<li\b/g) || []).length;
  const steps = /<div class="legislation-steps"[\s\S]*?<div class="legislation-passage-note"/.exec(html)![0];
  const stepCount = (steps.match(/<div role="listitem"/g) || []).length;
  expect(shown).toEqual([titles, DOMAINS.length, stepCount]);
  expect(titles).toBe(ENABLING_ACT_TITLE_COUNT);
  expect(shown).toEqual([19, 13, 7]);
});

/* R79 [§S17], review of P23: the crosswalk separates binding limits from the
   plan's choices; the page said a "workable direct federal option" was part
   of what the Tenth Amendment requires, and gave the narrow preemption rule
   as if it were the law. */
test('R79: the page separates what the Constitution requires from what the plan chooses', async () => {
  const container = await AstroContainer.create();
  const text = (await container.renderToString(Legislation)).replace(/<[^>]+>/g, '').replace(/&#39;/g, "'").replace(/\s+/g, ' ');
  expect(text).toContain("The workable direct federal option is the plan's own safeguard for a state that declines, not a constitutional requirement.");
  expect(text).toContain("This is the plan's own restraint: Congress could preempt more broadly within its powers.");
  expect(text).not.toMatch(/must use clear, prospective, noncoercive funding terms and a workable direct federal option/);
});

test('owner decision: the page states the shared dispositions once, above the domain list', async () => {
  const { sharedDispositionSentence } = await import('../../src/lib/legislation');
  const container = await AstroContainer.create();
  const html = await container.renderToString(Legislation);
  const text = html.replace(/<[^>]+>/g, '').replace(/&#39;/g, "'").replace(/\s+/g, ' ');
  expect(sharedDispositionSentence()).not.toBe('');
  expect(text.split(sharedDispositionSentence()).length - 1).toBe(1);
  expect(html.indexOf(sharedDispositionSentence())).toBeLessThan(html.indexOf('id="legislation-law-list"'));
});

/* Review 2 of P23: "no coercive threat to funds a state already receives"
   narrowed the coercion rule to the facts of one case and left out
   relatedness. The page and the crosswalk now state the three Spending
   Clause conditions in the same words. */
test('review 2 of P23: the page and the crosswalk state the Spending Clause conditions alike', async () => {
  const conditions = 'stated clearly in advance, related to the federal interest in the program, ' +
    'and not so coercive that a state has no real choice';
  const container = await AstroContainer.create();
  const text = (await container.renderToString(Legislation)).replace(/<[^>]+>/g, '').replace(/&#39;/g, "'").replace(/\s+/g, ' ');
  expect(text).toContain('conditions on federal funds must be ' + conditions + '.');
  const crosswalk = readFileSync(join(REPO_ROOT, 'research/legislation_crosswalk.md'), 'utf8').replace(/\s+/g, ' ');
  expect(crosswalk).toContain('Conditions on federal funds must be ' + conditions + ',');
  expect(crosswalk).toContain('*South Dakota v. Dole*, 1987');
});
