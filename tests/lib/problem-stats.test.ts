import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { PROBLEM_STATS, PROBLEM_STAT_INPUTS } from '../../src/lib/params';

/* R6 [§S11a], closed in P25: its declared test is "headline PROBLEM_STATS
   values reproduce from declared parameter inputs". The statistics are
   formatted from PROBLEM_STAT_INPUTS; this holds each input to the place it
   names, read here from the files themselves, and each statistic to its
   inputs, so neither a typed headline nor an input drifting from its source
   passes. */

interface SeedRow { value: string; valueLow: string; valueHigh: string; year: string; description: string; notes: string }
function seed(): Map<string, SeedRow> {
  const text = readFileSync('research/parameter_baseline_seed.csv', 'utf8');
  const out = new Map<string, SeedRow>();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const header = splitCsv(lines[0]!);
  const at = (name: string) => header.indexOf(name);
  for (const line of lines.slice(1)) {
    const cells = splitCsv(line);
    out.set(cells[at('baseline_id')]!, {
      value: cells[at('value')]!, valueLow: cells[at('value_low')]!, valueHigh: cells[at('value_high')]!,
      year: cells[at('year')]!, description: cells[at('description')]!, notes: cells[at('notes')]!
    });
  }
  return out;
}
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}
const thousands = (x: number) => x.toLocaleString('en-US');

test('R6: every problem-statistic input is the figure its declared source states', () => {
  const S = seed();
  const P = PROBLEM_STAT_INPUTS;
  const row = (id: string) => {
    const r = S.get(id);
    expect(r, id).toBeDefined();
    return r!;
  };
  /* the seed's own value column, and its year */
  expect(Number(row(P.uninsuredUnder65.statedIn).value)).toBe(P.uninsuredUnder65.ratePct);
  expect(Number(row(P.uninsuredUnder65.statedIn).year)).toBe(P.uninsuredUnder65.year);
  expect(row(P.uninsuredUnder65.statedIn).notes).toContain(P.uninsuredUnder65.countM + 'M');
  expect(row(P.uninsuredUnder65.statedIn).notes).toContain(P.uninsuredUnder65.riseM + 'M');
  expect(Number(row(P.hospitalAdmin.statedIn).value)).toBe(P.hospitalAdmin.usPct);
  expect(Number(row(P.hospitalAdmin.statedIn).year)).toBe(P.hospitalAdmin.year);
  expect(row(P.hospitalAdmin.statedIn).notes).toContain(P.hospitalAdmin.peerLowPct + '%');
  expect(row(P.hospitalAdmin.statedIn).notes).toContain(P.hospitalAdmin.peerHighPct + '%');
  expect(row(P.waste.statedIn).notes).toContain('$' + P.waste.lowB + '-' + P.waste.highB + 'B');
  expect(Number(row(P.waste.statedIn).year)).toBe(P.waste.year);
  expect(Number(row(P.billing.statedIn).value)).toBe(P.billing.usPerPhysicianD);
  expect(row(P.billing.statedIn).notes).toContain('$' + thousands(P.billing.ontarioPerPhysicianD));
  expect(Number(row(P.rural.statedIn).value)).toBe(P.rural.atRisk);
  expect(row(P.rural.statedIn).notes).toContain(P.rural.closedOrConvertedSince2010 + ' rural hospitals closed or converted since ' + P.rural.since);
  expect(row(P.uninsuredUnder65.statedIn).description).toContain('under age ' + P.uninsuredUnder65.underAge);
  expect(Number(row(P.premium.statedIn).value)).toBe(P.premium.familyD);
  expect(Number(row(P.premium.statedIn).year)).toBe(P.premium.year);
  expect(row(P.premium.statedIn).notes).toContain(String(P.premium.workerD));
  /* the CES quintile figures, in research/06's table */
  const r06 = readFileSync(P.healthBurden.statedIn, 'utf8');
  expect(r06).toContain('| Lowest | $' + thousands(P.healthBurden.q1IncomeD) + ' | $' + thousands(P.healthBurden.q1HealthD) + ' |');
  expect(r06).toContain('| Highest | $' + thousands(P.healthBurden.q5IncomeD) + ' | $' + thousands(P.healthBurden.q5HealthD) + ' |');
});

/* P25: the Census household count, named only in params.ts until now, is the
   figure the Bureau's table states, as research/06 records it. */
test('the Census household denominator is the count research/06 records from the Census table', async () => {
  const { CENSUS_HOUSEHOLDS_2024_K, householdDenominator } = await import('../../src/lib/params');
  const r06 = readFileSync('research/06_tax_distribution_financing.md', 'utf8');
  expect(r06).toContain(thousands(CENSUS_HOUSEHOLDS_2024_K) + ' thousand households in 2024');
  /* review 1 of P25: this restated the production rounding, so it held the
     formula to itself; the millions figure is read from research/06's own
     heading for the count */
  const stated = r06.match(/\*\*Census, ([\d.]+)M \(2024\)\*\*/);
  expect(stated, 'research/06 states the count in millions').not.toBeNull();
  expect(householdDenominator('census').households).toBe(Number(stated![1]));
  expect(householdDenominator('census').source).toContain(thousands(CENSUS_HOUSEHOLDS_2024_K));
});

test('R6: every problem statistic is formatted from its inputs, and none is typed', async () => {
  const P = PROBLEM_STAT_INPUTS;
  const all = PROBLEM_STATS.map((s) => s.value + ' ' + s.label + ' ' + s.note).join(' | ');
  for (const needle of [
    P.uninsuredUnder65.countM + 'M', P.uninsuredUnder65.ratePct + '%',
    (100 * P.healthBurden.q1HealthD / P.healthBurden.q1IncomeD).toFixed(1) + '%',
    P.hospitalAdmin.usPct + '%', '$' + thousands(P.billing.usPerPhysicianD),
    String(P.rural.atRisk), String(P.rural.closedOrConvertedSince2010), '$' + thousands(P.premium.familyD)
  ]) expect(all, needle).toContain(needle);
  /* the CES pair, against the research table's own column (20.7% and 3.7%) */
  const r06 = readFileSync(P.healthBurden.statedIn, 'utf8');
  for (const v of PROBLEM_STATS[2]!.value.match(/[\d.]+%/g) || []) expect(r06).toContain('**' + v + '**');
  /* No figure is typed into a statistic. Review 1 of P25: this scanned only
     `value:` fields, so a figure typed into a note passed. Review 2 of P25:
     the module is parsed and every literal in PROBLEM_STATS is read, string,
     template text and number alike, and none may carry a figure: the dates
     and definitions it once exempted (the spending tile's year, "under 65",
     RAND's data year, Chartis's window) read declarations now. A number may
     be arithmetic only (0, 1 and 100, as the one-figure scan allows). */
  const ts = (await import('typescript')).default;
  const src = readFileSync('src/lib/params.ts', 'utf8');
  const sf = ts.createSourceFile('params.ts', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const typed: string[] = [];
  const numbers: string[] = [];
  let strings = 0;
  const visit = (n: import('typescript').Node, inside: boolean): void => {
    const here = inside || (ts.isVariableDeclaration(n) && n.name.getText(sf) === 'PROBLEM_STATS');
    if (here && ts.isNumericLiteral(n)) numbers.push(n.text);
    if (here && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) ||
      ts.isTemplateMiddle(n) || ts.isTemplateTail(n))) {
      strings++;
      for (const m of n.text.match(/\d[\d.,]*/g) || []) typed.push(m);
    }
    ts.forEachChild(n, (c) => visit(c, here));
  };
  visit(sf, false);
  /* reach: the scan read the statistics' strings, and their arithmetic */
  expect(strings).toBeGreaterThan(30);
  expect(numbers.length).toBeGreaterThan(0);
  expect(typed).toEqual([]);
  expect(numbers.filter((x) => ['0', '1', '100'].indexOf(x) < 0)).toEqual([]);
  /* the dates they read, held to where they are stated */
  const { BASE_YEAR, RAND_PRICE_DATA_YEAR } = await import('../../src/lib/params');
  expect(PROBLEM_STATS[0]!.label).toBe('U.S. health spending, ' + BASE_YEAR);
  expect(BASE_YEAR).toBe(2023);
  expect(Number(seed().get('BL-0048')!.year)).toBe(RAND_PRICE_DATA_YEAR);
});

/* Review 1 of P25: figures parameter notes and scenario reasons state that a
   seed row or a research file defines, declared once in params.ts and held
   here to where they are defined, so a note cannot drift from its source. */
test('the figures parameter notes read are the ones their seed rows and research state', async () => {
  const P = await import('../../src/lib/params');
  const { SCENARIOS } = await import('../../src/lib/scenarios');
  const S = seed();
  /* CBO's single-payer administrative share, BL-0074's range */
  expect(Number(S.get('BL-0074')!.valueLow)).toBe(P.CBO_SINGLE_PAYER_ADMIN_PCT.low);
  expect(Number(S.get('BL-0074')!.valueHigh)).toBe(P.CBO_SINGLE_PAYER_ADMIN_PCT.high);
  /* These hold each note's figure as the note states it; the one-figure
     scan holds that no source types it (review 2 of P25: a note restated
     from the expression that built it cannot see a typed copy). */
  const admin = P.PARAM_DEFS.find((d) => d.id === 'publicAdminRate')!;
  expect(admin.source).toContain(P.CBO_SINGLE_PAYER_ADMIN_PCT.low + '-' + P.CBO_SINGLE_PAYER_ADMIN_PCT.high + '% of total spending in 2030');
  expect(admin.low).toBe(P.CBO_SINGLE_PAYER_ADMIN_PCT.low);
  const opt = SCENARIOS.find((s) => s.id === 'SCN-OPT')!;
  expect(JSON.stringify(opt.overrides)).toContain(P.CBO_SINGLE_PAYER_ADMIN_PCT.low + ' to ' + P.CBO_SINGLE_PAYER_ADMIN_PCT.high + '%');
  /* the TAA cost per participant, BL-0079 */
  expect(Number(S.get('BL-0079')!.value)).toBe(P.TAA_COST_PER_PARTICIPANT_2006);
  /* the hearing-aid prices: BL-0063's value, and research/04's 2025 survey */
  expect(Number(S.get('BL-0063')!.value)).toBe(P.HEARING_AID_PAIR_USD.survey2018);
  expect(readFileSync('research/04_ltc_behavioral_dvh_ems_publichealth.md', 'utf8'))
    .toContain('2025 survey of more than 1,100 purchasers puts the average at $' +
      thousands(P.HEARING_AID_PAIR_USD.survey2025) + ' a pair');
  /* transitionTotal's note states its arithmetic from the workforce ledger's
     planning case, and the ledger reads the same declaration */
  const { SCENARIOS: LEDGER } = await import('../../src/lib/workforce');
  expect(LEDGER.plan.eliminated).toBe(P.DISPLACED_ADMIN_WORKERS_K.plan);
  expect(LEDGER.low.eliminated).toBe(P.DISPLACED_ADMIN_WORKERS_K.low);
  expect(LEDGER.high.eliminated).toBe(P.DISPLACED_ADMIN_WORKERS_K.high);
  /* a typed copy has the same value, so the ledger's code is read too, with
     the parser (review 2 of P25: it was sliced and matched by regex) */
  const ts = (await import('typescript')).default;
  const wf = ts.createSourceFile('workforce.ts', readFileSync('src/lib/workforce.ts', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const eliminated: string[] = [];
  const walk = (n: import('typescript').Node, inLedger: boolean): void => {
    const here = inLedger || (ts.isVariableDeclaration(n) && n.name.getText(wf) === 'SCENARIOS');
    if (here && ts.isPropertyAssignment(n) && n.name.getText(wf) === 'eliminated') eliminated.push(n.initializer.getText(wf));
    ts.forEachChild(n, (c) => walk(c, here));
  };
  walk(wf, false);
  expect(eliminated).toEqual(['DISPLACED_ADMIN_WORKERS_K.low', 'DISPLACED_ADMIN_WORKERS_K.plan', 'DISPLACED_ADMIN_WORKERS_K.high']);
  const transition = P.PARAM_DEFS.find((d) => d.id === 'transitionTotal')!;
  const workers = P.DISPLACED_ADMIN_WORKERS_K.plan * 1000;
  expect(transition.source).toContain("chapter's " + thousands(workers) + ' eliminated administrative jobs');
  expect(transition.source).toContain('about $' + Math.round(workers * P.TAA_COST_PER_PARTICIPANT_2006 / 1e9) + 'B in 2006 dollars');
  expect(workers * P.TAA_COST_PER_PARTICIPANT_2006 / 1e9 / transition.mode).toBeLessThan(0.01);
  /* SCN-WEALTH-LOW's description states the cut to wealth revenue that the
     model's own scenario parameters make (review 2 of P25: it stated the cut
     to the base alone, while the scenario also lowers collection efficiency,
     and the model multiplies the two) */
  const { effectiveParams } = await import('../../src/lib/scenarios');
  const base = effectiveParams('SCN-BASE', null), low = effectiveParams('SCN-WEALTH-LOW', null);
  const revenue = (e: typeof base) => e.wealthTaxPotential!.mode * e.wealthCollectionEff!.mode;
  const cut = Math.round((1 - revenue(low) / revenue(base)) * 100);
  expect(SCENARIOS.find((s) => s.id === 'SCN-WEALTH-LOW')!.desc).toContain('revenue by about ' + cut + '%');
  expect(cut).toBeGreaterThan(50);
});
