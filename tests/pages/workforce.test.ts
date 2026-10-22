import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Workforce from '../../src/pages/workforce.astro';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

test('workforce page renders prose + empty render targets, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Workforce);
  expect(html).toContain('Labor transition ledger');
  expect(html).toContain('id="workforce-legacy-list"');
  expect(html).toContain('id="workforce-created-chart"');
  expect(html).toContain('data-wf-scenario="plan"');
  // LTC direct-care workforce section + aide compensation mount point
  expect(html).toContain('Long-term care is staffed by aides');
  expect(html).toContain('id="wf-ltc-comp"');
  expect(html).toContain('Long-term care direct-care aides');
  expect(html.includes('—')).toBe(false);
});

/* Content, 2026-10-11: the immigration evidence block stated figures with no
   citation in the repository, and one was wrong (17.8% of U.S. RNs
   "internationally educated"; NCSBN's 2022 survey gives 5.2%). Every
   percentage the immigration tiles and the shortage panel draw must now be
   stated in the methodology's "Merit immigration evidence sources" table. */
test('content: every percentage the immigration evidence draws is cited in the methodology', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Workforce);
  const methodology = readFileSync(join(REPO_ROOT, 'research/workforce_transition_methodology.md'), 'utf8');
  const start = methodology.indexOf('## Merit immigration evidence sources');
  expect(start).toBeGreaterThan(0);
  const sources = methodology.slice(start, methodology.indexOf('\n## ', start + 5));
  /* review of the content run: the first version read only the bold
     figures, so the tile's "met 80% of the time" in small type was never
     checked, and it matched by substring, so a drawn "1%" passed on "11%".
     Now: every percentage in the two blocks' text, matched whole. */
  /* the one block of that class holding the anchor */
  const block = (cls: string, anchor: string): string => {
    const found = [...html.matchAll(new RegExp('<div class="' + cls + '"[^>]*>([\\s\\S]*?)</div>', 'g'))]
      .map((m) => m[1].replace(/<[^>]+>/g, ' ')).filter((t) => t.indexOf(anchor) >= 0);
    expect(found, cls).toHaveLength(1);
    return found[0];
  };
  const tiles = block('workforce-labor-grid', 'Physicians already IMG-trained');
  const shortage = block('workforce-shortage-grid', 'projected nonmetro physician shortage');
  const drawn = [...(tiles + ' ' + shortage).matchAll(/(?<![\d.])\d+(?:\.\d+)?%/g)].map((m) => m[0]);
  expect(drawn.sort()).toEqual(['11%', '25.6%', '5.2%', '58%', '80%']);
  const cited = (v: string): boolean => new RegExp('(?<![\\d.])' + v.replace('.', '\\.') + '(?![\\d])').test(sources);
  expect(drawn.filter((v) => !cited(v))).toEqual([]);
  /* every row of the table carries a confidence grade */
  const rows = sources.split('\n').filter((l) => /^\| (?!Figure|---)/.test(l));
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.filter((l) => !/\| (?:High|Medium|Low)\b[^|]*\|$/.test(l))).toEqual([]);
  expect(html).not.toContain('17.8%');
});
