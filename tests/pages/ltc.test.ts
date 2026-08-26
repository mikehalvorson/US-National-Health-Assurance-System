import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Ltc from '../../src/pages/ltc.astro';
import { WHAT_WORKS, MEDICARE_GAP, LTC_GDP_2021 } from '../../src/lib/ltc';
import { LTC_WORKFORCE } from '../../src/lib/workforce';

test('LTC page renders the three-part story and mount points, no em dash', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Ltc);
  // Part 1: why the current system fails
  expect(html).toContain('Why the current system fails');
  expect(html).toContain('Medicare does not pay for long-term custodial care');
  expect(html).toContain('id="ltc-failure-stats"');
  // Part 2: systems that work
  expect(html).toContain('id="ltc-gdp-chart"');
  expect(html).toContain('id="ltc-country-cards"');
  // Part 3: the plan
  expect(html).toContain('id="ltc-pillars"');
  expect(html).toContain('id="ltc-cost-note"');
  expect(html).toContain('id="ltc-workforce-fig"');
  expect(html.includes('—')).toBe(false);
});

/* R282 [S9d]: WHAT_WORKS and MEDICARE_GAP were exported, never rendered, and
   had already drifted from the copies hand-typed into this page -- four
   divergences across two constants, one of them a substantive clause the page
   had and the constant did not. Rendered from the frontmatter rather than the
   client, so they stay in the static HTML with no script. */
test('R282: the page renders the constants rather than repeating them', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Ltc);
  expect(html).toContain(MEDICARE_GAP.headline);
  for (const thread of WHAT_WORKS) {
    expect(html).toContain(thread);
  }
  // the clause that existed only on the page before this section
  expect(html).toContain('largest single payer of it in the country');
  // and the clause that existed only in the constant
  expect(html).toContain('an insurance contribution or a tax');
});

/* R283 [S9d]: the page attributes these to "The Workforce model" and now
   reads it. Rendered at build time, so the sentences survive with no JS. */
test('R283: the attributed headcounts are the workforce model figures', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Ltc);
  const w = LTC_WORKFORCE;
  /* The page wraps these sentences, so an interpolation and the words after
     it are separated by a newline and indentation in the rendered HTML.
     Flatten before matching. */
  const flat = html.replace(/\s+/g, ' ');
  expect(flat).toContain('The Workforce model');
  expect(flat).toContain('about ' + w.currentDirectCareM + ' million aides today');
  expect(flat).toContain('roughly ' + w.projected2034M + ' million needed by 2034');
  expect(flat).toContain('order of ' + w.matureFrameworkM + ' million once a universal');
  expect(flat).toContain('about ' + w.openings2034M + ' million total hires');
  expect(flat).toContain('$' + w.medianWageNow.toFixed(2) + '-an-hour median');
});

/* R285 [S9d]: per-person spending existed only inside a hover tooltip for
   seven of the eight rows, while the page's own note told the reader to look
   for it there. The note now points at a column the chart draws. */
test('R285: the page does not send the reader to a tooltip for a whole series', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Ltc);
  expect(html).not.toContain("Each bar's tooltip carries two readings");
  expect(html).toContain('both on the chart');
  // the US figure in the note is computed from the chart's own data
  const us = LTC_GDP_2021.find((r) => r.kind === 'us')!;
  expect(html).toContain('about $' + us.perCapita.toLocaleString('en-US') + ' a head');
  // and the workforce bars have somewhere to put their grades
  expect(html).toContain('id="ltc-workforce-grades"');
});
