import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Ltc from '../../src/pages/ltc.astro';
import Workforce from '../../src/pages/workforce.astro';
import { WORKFORCE_ASSESS } from '../../src/lib/ltc';
import { LTC_WORKFORCE } from '../../src/lib/workforce';

/* 2026-10-20, and review 1 of that change. Both pages credited the home-care
   turnover to PHI, whose Key Facts 2025 states no home-care rate; the figure
   is Activated Insights' benchmarking median. The first guard matched raw
   HTML, so a capital T or a credit split by a tag ("turnover: <a>PHI</a>")
   passed, and a page could drop the credit and the grade beside the figure
   while a Sources note elsewhere kept it green. This reads the rendered text
   block by block: a tag that opens or closes a block (paragraph, tile, row)
   ends one, every other tag is dropped, and a grade badge is kept as a
   marker so the test can see which grade sits in the block. */
const BLOCK_TAG = /<\/?(?:p|div|article|section|li|ul|ol|h[1-6]|table|tr|td|th|header|footer|main|nav|aside|br)\b[^>]*>/gi;

function blocks(html: string): string[] {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<span\b[^>]*\bclass="conf ([a-z-]+)"[^>]*>[^<]*<\/span>/g, ' [grade:$1] ')
    .replace(BLOCK_TAG, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/* a clause ends at a full stop or a semicolon followed by a space or the end,
   so "$17.36" stays whole */
const clauses = (block: string): string[] => block.split(/[.;](?=\s|$)/);

const STATES_FIGURE = new RegExp('(?:^|[^\\d.])' + LTC_WORKFORCE.homeTurnoverPct + '%');
const GRADE = '[grade:' + WORKFORCE_ASSESS.homeTurnover.confidence + ']';

function turnoverFaults(html: string): string[] {
  const all = blocks(html);
  const stating = all.filter((b) => /turnover/i.test(b) && STATES_FIGURE.test(b));
  const out: string[] = [];
  if (!stating.length) out.push('no block states the turnover figure');
  for (const b of stating) {
    if (!b.includes('Activated Insights')) out.push('no credit beside the figure: ' + b);
    if (!b.includes(GRADE)) out.push('no ' + GRADE + ' beside the figure: ' + b);
  }
  for (const c of all.flatMap(clauses)) {
    if (/turnover/i.test(c) && /\bPHI\b/.test(c)) out.push('a clause credits turnover to PHI: ' + c.trim());
  }
  return out;
}

test('the turnover reader sees through a capital T, a tag and a missing grade', () => {
  const pct = LTC_WORKFORCE.homeTurnoverPct;
  expect(turnoverFaults('<p>Turnover: <a href="#">PHI</a>, 2025.</p>').join('\n'))
    .toContain('credits turnover to PHI');
  expect(turnoverFaults('<p>Home-care turnover runs near ' + pct + '% (Activated Insights).</p>').join('\n'))
    .toContain('no ' + GRADE);
  expect(turnoverFaults('<p>Turnover near ' + pct + '%.</p><p>Turnover: Activated Insights.</p>').join('\n'))
    .toContain('no credit beside the figure');
  expect(turnoverFaults('<p>Wages only.</p>')).toEqual(['no block states the turnover figure']);
  expect(turnoverFaults('<article><span>Home-care turnover</span><strong>' + pct + '%</strong>' +
    '<small>(Activated Insights) <span class="conf ' + WORKFORCE_ASSESS.homeTurnover.confidence + '">x</span></small></article>'))
    .toEqual([]);
});

test('LTC page: the turnover is credited to the survey beside its own grade, never to PHI', async () => {
  const container = await AstroContainer.create();
  expect(turnoverFaults(await container.renderToString(Ltc))).toEqual([]);
});

test('Workforce page: the turnover is credited to the survey beside its own grade, never to PHI', async () => {
  const container = await AstroContainer.create();
  expect(turnoverFaults(await container.renderToString(Workforce))).toEqual([]);
});
