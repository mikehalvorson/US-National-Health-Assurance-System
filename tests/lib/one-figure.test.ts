import { expect, test } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import {
  EQUATIONS, RAMP_ARRAY, TODAY_LEVELS, collectDeps, modelPerCapitaAtMaturity, numLeaves
} from '../../src/lib/equations';
import {
  BASE2023, DEFLATOR_2023_TO_2024, FRAMEWORK_CLAIM, PARAM_REGISTRY, PROBLEM_STATS, RAMPS,
  US_PEER_DRUG_PRICE_RATIO, base2023Text, claimPerPerson, nheGdpSharePct, nhePerPerson
} from '../../src/lib/params';
import { baselineAdminSpend } from '../../src/lib/model';
import { lookupOrThrow } from '../../src/lib/registry-lookup';
import { NHA_QUALITY_DATA } from '../../src/lib/quality-data';
import { parseNum } from '../../src/lib/phase-targets';
import { ANNUAL_TRAINING_TARGET, TRAINING_SUPPORT_K, trainingSupportPositions } from '../../src/lib/workforce';
import { numberWord } from '../../src/lib/format';
import { GOV_GROUPS } from '../../src/lib/gov';
import { claimPerPersonText } from '../../src/lib/benchmarks';
import { perCapitaCeiling, sourcePackage } from '../../src/lib/source-package';
import { requirementBound } from '../../src/lib/requirements';
import { SZ_LETTER } from '../../src/lib/score-rebase';

/* Owner, 2026-10-12: "The model should always use the same parameters. It
   should never duplicate parameters and should always calculate them." */

function eq(id: string) {
  const d = EQUATIONS[id];
  if (!d) throw new Error('no equation ' + id);
  return d;
}
/* a record, its target and its number, read here by the test rather than
   through the engine's reader, so a check compares two reads, not one read
   with itself (review 5 of P24: this sat above the first helper only) */
function catalogRecord(id: string) {
  return NHA_QUALITY_DATA.parameters.find((p) => p.id === id);
}
function catalogMeta(id: string) {
  const rec = catalogRecord(id);
  return rec ? parseNum(rec.target) : null;
}
function catalogNum(id: string): number {
  const meta = catalogMeta(id);
  if (!meta) throw new Error(id + ' states no number');
  return meta.num;
}
/* Every number leaf anywhere in a tree, found by walking every object value
   rather than through the engine's childrenOf(): a check that walked with
   the engine's own walker would go blind exactly where the walker did. */
type Num = ReturnType<typeof numLeaves>[number];
function anyLeaves(x: unknown, out: Num[] = []): Num[] {
  if (x && typeof x === 'object') {
    if ((x as { k?: string }).k === 'num') out.push(x as Num);
    for (const v of Object.values(x)) anyLeaves(v, out);
  }
  return out;
}
/* equal to within floating-point noise: 100 - 99.97 is not 0.03 exactly */
const near = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

test('owner 2026-10-12: the cost targets\' baselines are computed from BASE2023, not typed', () => {
  const base = (id: string) => numLeaves(eq(id).expr).filter((l) => /^baseline .*CMS/.test(l.label)).map((l) => l.v);
  expect(base('KPP-C1')).toEqual([nheGdpSharePct()]);
  expect(base('KPP-C2')).toEqual([nhePerPerson() * DEFLATOR_2023_TO_2024]);
  expect(base('KPP-C3')).toEqual([100 * baselineAdminSpend() / BASE2023.nheTotal]);
  /* review 3 of P24: the helpers compute from the base they are handed, so a
     typed copy of today's value, which would not move, fails here */
  const other = { nheTotal: 1000, gdp: 4000, populationM: 10, netInsCost: 30, govtAdmin: 20 };
  expect(nheGdpSharePct(other)).toBe(25);
  expect(nhePerPerson(other)).toBe(100000);
  expect(baselineAdminSpend(other)).toBe(50);
  /* and today's values, restated from CMS's 2024 release (2023 column:
     NHE 4,925.3, GDP 27,811.5, population 337.8M, non-medical insurance
     313.4, government administration 57.7) and the display deflator; owner,
     2026-10-19 */
  expect(base('KPP-C1')[0]).toBeCloseTo(100 * 4925.3 / 27811.5, 3);
  expect(base('KPP-C2')[0]).toBeCloseTo(4925.3e3 / 337.8 * 1.026, 1);
  expect(base('KPP-C3')[0]).toBeCloseTo(100 * (313.4 + 57.7) / 4925.3, 3);
});

test('owner 2026-10-12: the Healthcare tab states the plan\'s per-person ceiling, read from its requirement, beside its total per person', async () => {
  const req = sourcePackage().requirements.get('PR-CST-003');
  const bound = req ? requirementBound(req.text) : null;
  expect(bound?.cmp).toBe('<=');
  expect(perCapitaCeiling()).toBe(bound!.num);
  const page = (await import('../../src/pages/health.astro')).default;
  const html = await (await AstroContainer.create()).renderToString(page);
  const line = /id="benchmark-claim-per-person"[^>]*>([^<]*)</.exec(html);
  expect(line).not.toBeNull();
  const text = line![1]!.replace(/&#39;/g, '\'');
  const model = modelPerCapitaAtMaturity();
  expect(text).toBe(claimPerPersonText(bound!.num, model));
  /* the plan's total over CMS's 2023 population (337.8M since the owner's
     recalibration, 2026-10-19; 334.0M gave $14,222) */
  expect(Math.round(claimPerPerson())).toBe(14062);
  expect(text).toContain('$14,062 a year');
  expect(text).toContain('$' + bound!.num.toLocaleString('en-US') + ' per person');
  expect(text).toContain('about ' + (FRAMEWORK_CLAIM.mode * 1e3 / bound!.num).toFixed(1) + ' million people');
  /* review 3 of P24: the model's own per-person figure on the same basis is
     set beside the ceiling, and no future year is paired with a total stated
     at today's scale (rule 6) */
  expect(model).toBeGreaterThan(0);
  const { computeTargets } = await import('../../src/lib/equations');
  const { QUALITY_DATA } = await import('../../src/lib/quality');
  expect(model).toBe(computeTargets(QUALITY_DATA, 'SCN-BASE')['KPP-C2']!['P8']!.num);
  expect(text).toContain('model\'s mature cost is $' + Math.round(model).toLocaleString('en-US') + ' per person');
  expect(text.match(/\b20\d\d\b/g)).toEqual(['2023', '2024', '2024', '2024', '2023']);
});

test('owner 2026-10-12: every equation leaf that reads a figure defined elsewhere holds that figure', () => {
  const reached: Record<string, number> = {};
  for (const d of Object.values(EQUATIONS)) {
    /* review 4 of P24: the independent walker, not the engine's */
    for (const l of anyLeaves(d.expr)) {
      if (!l.from) continue;
      const [kind, key] = l.from.split(':') as [string, string];
      reached[kind] = (reached[kind] || 0) + 1;
      const want = kind === 'param' ? lookupOrThrow(PARAM_REGISTRY, key).mode
        : kind === 'ramp' ? RAMPS[key as 'coverage'].slice(-1)[0]
        : kind === 'catalog' ? (l.own === 'shortfall' ? 100 - catalogNum(key) : catalogNum(key))
        /* owner, 2026-10-19: the baseline-start form's today's level */
        : kind === 'today' ? lookupOrThrow(TODAY_LEVELS, key).pct
        : NaN;
      expect(l.v, d.id + ': ' + l.label).toBe(want);
    }
  }
  /* each of the four sources is read somewhere, so none of the checks above is vacuous */
  expect(Object.keys(reached).sort()).toEqual(['catalog', 'param', 'ramp', 'today']);
  /* and every declared today's level is read, twice, by its own equation's
     baseline-start form (B, and B again inside M - B) */
  expect(reached.today).toBe(2 * Object.keys(TODAY_LEVELS.entries).length);
});

test('owner 2026-10-12: no equation leaf types a parameter\'s central value under a "planned" label', () => {
  const typed = Object.values(EQUATIONS).flatMap((d) => numLeaves(d.expr)
    .filter((l) => !l.from && /\b(?:planned|central)\b/i.test(l.label)).map((l) => d.id + ': ' + l.label));
  expect(typed).toEqual([]);
  /* the cases measured on 2026-10-12, each now a read */
  const reads = (id: string) => numLeaves(eq(id).expr).map((l) => l.from).filter(Boolean);
  expect(reads('TPP-3.3')).toContain('param:drugPriceCut');
  expect(reads('TPP-9.1')).toContain('param:ltcExpansion');
  expect(reads('KPP-W2')).toEqual(expect.arrayContaining(['catalog:TPP-W1', 'catalog:TPP-W2']));
  expect(reads('KPP-A7')).toEqual(expect.arrayContaining(['catalog:KPP-A7', 'catalog:KPP-A4']));
  expect(reads('TPP-8.3')).toContain('catalog:TPP-8.3');
  expect(reads('IDX-CLAIMS')).toContain('ramp:coverage');
});

/* A label can be reworded; a value is harder to hide. An equation that reads
   a parameter, a ramp or a catalog record (through q() or ctrl()) and also
   carries a bare number equal to that figure, or to one of the forms a
   retype of it has taken here (f/100, 1 + f/100, 100 - f, (100 - f)/100,
   f - 1: 0.08, 1.08, 92, 0.10), has typed it again. What this cannot see,
   said rather than implied: a retype in any other form, and a figure of 0,
   1 or 100, which equal the arithmetic's own constants. Review 3 of P24:
   the first version saw only q() reads and exact equality, and the log
   called it a rule no label can dodge. */
const ARITHMETIC = [0, 1, 100];
const forms = (f: number): number[] => [f, f / 100, 1 + f / 100, 100 - f, (100 - f) / 100, f - 1]
  .filter((v) => !ARITHMETIC.some((a) => near(a, v)));
/* Measured on 2026-10-13, and not retypes: each is declared with its reason,
   and a declaration that no longer matches a leaf fails as stale. */
const COINCIDENCES: Record<string, string> = {
  'KPP-W2: domestic pipeline weight (planning)':
    'the 80/20 planning split between the domestic pipeline and merit immigration (quality-equation-methodology.md, its constants table) is not TPP-W2\'s 80% slot-to-hire conversion',
  'KPP-W2: merit-immigration pipeline weight (planning)':
    'the other side of the same planning split'
};
test('owner 2026-10-12: no equation types the value of a figure it also reads', () => {
  const faults: string[] = [];
  const declared = new Set<string>();
  let compared = 0;
  for (const d of Object.values(EQUATIONS)) {
    const deps = collectDeps(d.expr);
    const figures: Array<[number, string]> = [];
    const add = (f: number, what: string) => forms(f).forEach((v) => figures.push([v, what]));
    deps.params.forEach((id) => add(lookupOrThrow(PARAM_REGISTRY, id).mode, 'parameter ' + id));
    deps.ramps.forEach((id) => {
      const v = RAMPS[RAMP_ARRAY[id] as 'coverage'].slice(-1)[0];
      if (v !== undefined) add(v, 'ramp ' + id);
    });
    const records = new Set(deps.refs);
    anyLeaves(d.expr).forEach((l) => { if (l.from?.startsWith('catalog:')) records.add(l.from.slice('catalog:'.length)); });
    records.forEach((id) => {
      const meta = catalogMeta(id);
      if (meta) add(meta.num, 'record ' + id);
    });
    compared += figures.length;
    for (const l of anyLeaves(d.expr)) {
      if (l.from || l.kappa || l.label === 'component count') continue;
      const hit = figures.find(([v]) => near(v, l.v));
      if (!hit) continue;
      if (COINCIDENCES[d.id + ': ' + l.label]) declared.add(d.id + ': ' + l.label);
      else faults.push(d.id + ': "' + l.label + '" = ' + l.v + ', a form of ' + hit[1]);
    }
  }
  expect(faults).toEqual([]);
  expect([...declared].sort()).toEqual(Object.keys(COINCIDENCES).sort());
  expect(compared).toBeGreaterThan(0);
});

/* R252's class across the catalog: an equation that types its own
   controlled target, as ceil2's, err3's or queue's M, or a "controlled" leaf,
   beside the record that states it. Each reads it now. A bare leaf equal to
   the equation's own target, or to 100 less it, under any label, is the
   retype (review 3 of P24: the first version looked for the shortfall only
   under "mature shortfall allowance" and compared exactly, and TPP-11.1's
   0.03 sat beside its 99.97% target under another label). Not compared,
   because no value can tell them from a target: the arithmetic's 0, 1 and
   100, and avg()'s divisor, its number of terms. So a target of 1 or 100
   (KPP-A4, TPP-2.3, KPP-C5, TPP-IMM4) is read but not policed. */
test('owner 2026-10-12: no equation types its own catalog target', () => {
  const faults: string[] = [];
  let ownReads = 0;
  let compared = 0;
  for (const d of Object.values(EQUATIONS)) {
    const rec = catalogRecord(d.id);
    const meta = catalogMeta(d.id);
    if (meta && !ARITHMETIC.includes(meta.num)) compared++;
    for (const l of anyLeaves(d.expr)) {
      /* an OWN placeholder def() never filled is NaN and claims no source */
      if (l.own) {
        ownReads++;
        if (l.from !== 'catalog:' + d.id || Number.isNaN(l.v)) faults.push(d.id + ': "' + l.label + '" was never read from its record');
      }
      if (!meta || l.from || l.kappa || ARITHMETIC.some((a) => near(a, l.v)) || l.label === 'component count') continue;
      if (near(l.v, meta.num) || near(l.v, 100 - meta.num)) {
        faults.push(d.id + ': "' + l.label + '" = ' + l.v + ', its own target ' + rec!.target + ' or 100 less it');
      }
    }
  }
  expect(faults).toEqual([]);
  expect(ownReads).toBeGreaterThan(0);
  expect(compared).toBeGreaterThan(0);
});

test('owner 2026-10-12: the drug price ratio and the training-slot count are each one figure', () => {
  /* the 64% price-parity reduction is computed from the ratio it states */
  const parity = numLeaves(eq('TPP-3.3').expr).filter((l) => /price-parity/.test(l.label));
  expect(parity.map((l) => l.v)).toEqual([100 * (1 - 1 / US_PEER_DRUG_PRICE_RATIO)]);
  expect(PROBLEM_STATS.some((s) => s.value === US_PEER_DRUG_PRICE_RATIO + '×')).toBe(true);
  /* defined once in params.ts (review 3 of P24; workforce.ts re-exports it),
     and held to the catalog record and the requirement that state it */
  expect(ANNUAL_TRAINING_TARGET).toBe(catalogNum('TPP-8.3'));
  const req = sourcePackage().requirements.get('PR-WF-002');
  expect(req ? requirementBound(req.text)?.num : null).toBe(ANNUAL_TRAINING_TARGET);
  const roles = GOV_GROUPS.flatMap((g) => g.members).map((m) => m.role + ' ' + m.why).join(' ');
  expect(roles).toContain(ANNUAL_TRAINING_TARGET.toLocaleString('en-US') + ' new annual training slots');
  expect(roles).toContain(US_PEER_DRUG_PRICE_RATIO + ' times peer countries');
});

test('owner 2026-10-12: the per-person read refuses a requirement that states no dollar ceiling', () => {
  const sp = (text: string) => ({
    ...sourcePackage(),
    requirements: new Map([['PR-CST-003', { id: 'PR-CST-003', text, trace: [] }]])
  });
  expect(perCapitaCeiling(sp('The project shall keep cost at or below $12,000 in real 2024 dollars by Phase 8.'))).toBe(12000);
  expect(() => perCapitaCeiling(sp('The project shall keep cost at least $12,000 in real 2024 dollars by Phase 8.'))).toThrow();
  expect(() => perCapitaCeiling(sp('The project shall keep cost at or below 12% of GDP by Phase 8.'))).toThrow();
  expect(() => perCapitaCeiling(sp('The project shall reconcile cost later.'))).toThrow();
});

/* The 2023 total, its GDP share and its per-person figure were typed on the
   Overview and Healthcare pages ("$4.87T", "17.6% of GDP", "$14,570") beside
   the BASE2023 figures they round. The pages read BASE2023_TEXT now, and no
   page's source types them. */
test('owner 2026-10-12: the pages state the 2023 baseline formatted from BASE2023', async () => {
  const { BASE2023_TEXT } = await import('../../src/lib/params');
  const { readFileSync } = await import('node:fs');
  /* review 3 of P24: computed from the base it is handed, so a typed string
     that would not move fails, and today's strings pinned */
  expect(base2023Text({ nheTotal: 1000, gdp: 4000, populationM: 10 }))
    .toEqual({ total: '$1.00T', gdpShare: '25.0%', perPerson: '$100,000' });
  /* a typed object equal to this passes here; the formatted-copy scan below
     refuses one, since its strings are among the needles it looks for in
     every module (review 4 of P24, measured by mutation) */
  expect(BASE2023_TEXT).toEqual(base2023Text());
  /* $14,581 on Table 1's printed population; CMS's own $14,580 divides by
     the unrounded count (owner recalibration, 2026-10-19) */
  expect(BASE2023_TEXT).toEqual({ total: '$4.93T', gdpShare: '17.7%', perPerson: '$14,581' });
  const first = PROBLEM_STATS[0]!;
  expect(first.value).toBe(BASE2023_TEXT.gdpShare + ' of GDP');
  expect(first.note).toContain(BASE2023_TEXT.total + ', or ' + BASE2023_TEXT.perPerson + ' per person');
  for (const page of ['index', 'health']) {
    const src = readFileSync(new URL('../../src/pages/' + page + '.astro', import.meta.url), 'utf8');
    for (const typed of [BASE2023_TEXT.total, BASE2023_TEXT.gdpShare + ' of GDP', BASE2023_TEXT.perPerson]) {
      expect(src, page + ' types ' + typed).not.toContain(typed);
    }
    expect(src).toContain('{BASE2023_TEXT.total}');
  }
});

/* Review 2 of the owner decisions: the methodology's constants table states
   the KPP-C1 to C3 baselines in prose ("about 17.7%"), and nothing held them
   to the code after the recalibration moved them. Each is held to the
   function that computes it. */
test('the methodology states the KPP-C1 to C3 baselines the code computes', async () => {
  const { readFileSync } = await import('node:fs');
  const method = readFileSync(new URL('../../research/quality-equation-methodology.md', import.meta.url), 'utf8');
  const row = (start: string) => {
    const r = method.split('\n').find((l) => l.startsWith('| ' + start));
    if (!r) throw new Error('no methodology row ' + start);
    return r;
  };
  const gdp = nheGdpSharePct().toFixed(1) + '%';
  const perPerson = '$' + (Math.round(nhePerPerson() * DEFLATOR_2023_TO_2024 / 10) * 10).toLocaleString('en-US');
  const admin = (100 * baselineAdminSpend() / BASE2023.nheTotal).toFixed(1) + '%';
  expect(row('Baseline health share of GDP')).toContain('about ' + gdp);
  expect(row('Baseline per-person cost')).toContain('about ' + perPerson);
  expect(row('Baseline administration share')).toContain('about ' + admin);
});

/* Review 3 of P24: the owner's Q1 work left figures typed beside the one
   they restate: the money-flow total and its sums, "$506B", the training
   slots on the Workforce tab and in workforceEdu's note, both RAND ratios,
   the IRA cut range, the plan's 55% drug target, the payroll and donut
   rates in the Tax tab's text, and the figures in equation explanations.
   Each reads one definition now. This reads the sources a reader's text is
   built from and refuses each formatted copy, and holds the plan figures to
   the requirements that state them. */
test('review 3 of P24: no page or module types a formatted copy of a figure defined once', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const params = await import('../../src/lib/params');
  const root = new URL('../../', import.meta.url);
  const read = (rel: string) => readFileSync(new URL(rel, root), 'utf8');
  /* code and markup only: a constant's own comment may state its value */
  const code = (src: string) => src.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"])\/\/[^\n]*/g, '$1');
  const pages = readdirSync(new URL('src/pages/', root)).filter((f) => f.endsWith('.astro')).map((f) => 'src/pages/' + f);
  /* every page and every module but the generated catalog, whose text is
     the plan's own and is what the figures are held to */
  const libs = readdirSync(new URL('src/lib/', root)).filter((f) => f.endsWith('.ts') && f !== 'quality-data.ts').map((f) => 'src/lib/' + f);
  /* review 4 of P24: the client scripts and the components draw text too */
  const scripts = readdirSync(new URL('src/scripts/', root)).filter((f) => f.endsWith('.ts')).map((f) => 'src/scripts/' + f);
  const components = readdirSync(new URL('src/components/', root)).filter((f) => f.endsWith('.astro')).map((f) => 'src/components/' + f);
  const files = [...pages, ...libs, ...scripts, ...components];
  /* review 4 of P24: the equation explanations' figures, read from their
     records. Review 5 of P24: each needle keeps the words that say which
     figure it is, since a bare number false-fires here (measured: a slider's
     maximum, the figure wealthCollectionEff's note quotes from its
     requirement, the historical top marginal rates); a copy reworded around
     the number is not seen. */
  const fig = (id: string) => { const m = catalogMeta(id)!; return m.num.toFixed(m.decimals); };
  const whyTyped = [
    'controlled ' + fig('KPP-E3'), fig('KPP-E3') + ' ratio',
    fig('KPP-C6') + '-month', fig('KPP-C6') + ' months', fig('KPP-C6') + '-months',
    'controlled ' + fig('KPP-C7') + '%', fig('KPP-C7') + '% ambition'
  ];
  const oop = params.moneyFlowChannel('oop');
  /* review 4 of P24: the tax figures' needles computed from the figures,
     each in the spellings measured not to false-fire (%, percent, pp,
     points, $B, billion, $250,000, $250k), and the rest with the words that
     say which figure it is */
  const { PAYROLL_FIGURES: PF, DONUT_FIGURES: DF, PAYROLL_RATE_POINTS, PAYROLL_PER_POINT_B, RENTS_PLAN_B, ratePoints } = await import('../../src/lib/taxparams');
  const pct = (v: string) => [v + '%', v + ' percent', v + 'pp', v + ' points'];
  const payrollPts = PAYROLL_RATE_POINTS, perPoint = PAYROLL_PER_POINT_B;
  const maxPts = ratePoints(PF.rate * PF.scaleMax), floorK = DF.floor / 1000;
  const taxTyped = [
    /* review 6 of P24: the bare points with a space before them, since "4pp"
       is inside the corporate rate's "+14pp" */
    ...pct(String(ratePoints(DF.rate))), ...pct(payrollPts.toFixed(1)), ' ' + payrollPts + 'pp', ' ' + payrollPts + ' points',
    'payroll at ' + payrollPts + ' ', 'default ' + payrollPts + 'pp', maxPts + 'pp', 'max ' + maxPts + ' ',
    '$' + perPoint + 'B', '$' + perPoint + ' billion',
    '$' + DF.floor.toLocaleString('en-US'), '$' + floorK + 'k', '$' + floorK + 'K'
  ];
  const typed = [
    params.BASE2023_TEXT.total, params.BASE2023_TEXT.gdpShare + ' of GDP', params.BASE2023_TEXT.perPerson,
    '$' + oop + 'B', params.ANNUAL_TRAINING_TARGET.toLocaleString('en-US'),
    Math.round(params.ANNUAL_TRAINING_TARGET / 1000) + 'k training',
    params.US_PEER_DRUG_PRICE_RATIO + '×', params.US_PEER_BRAND_PRICE_RATIO + '×',
    params.US_PEER_DRUG_PRICE_RATIO + ' times', params.iraCutRange(), params.iraCutRange().replace('–', '-'),
    'at least ' + params.PLAN_DRUG_PRICE_CUT_TARGET + '%', 'the ' + params.PLAN_DRUG_PRICE_CUT_TARGET + '% net-price',
    ...taxTyped,
    ...whyTyped,
    params.RAND_PEER_COUNTRIES + ' peer countries', params.RAND_PEER_COUNTRIES + ' comparison countries',
    /* review 6 of P24: the support positions in words and in digits (the
       page reads them; the scan ignores case) */
    numberWord(TRAINING_SUPPORT_K) + ' thousand positions', trainingSupportPositions().toLocaleString('en-US') + ' positions',
    params.PARAMS_BY_ID.drugPriceCut!.low + ' to ' + params.PARAMS_BY_ID.drugPriceCut!.high + '%',
    /* review 2 of P25: the figures the evidence pass declared once (review 1
       of P25), which care.ts had typed again ("$4,672") and which the notes'
       own tests restate from the expressions that build them */
    ...[' to ', '-', '–'].map((sep) => params.CBO_SINGLE_PAYER_ADMIN_PCT.low + sep + params.CBO_SINGLE_PAYER_ADMIN_PCT.high + '%'),
    '$' + params.TAA_COST_PER_PARTICIPANT_2006.toLocaleString('en-US'),
    '$' + params.HEARING_AID_PAIR_USD.survey2018.toLocaleString('en-US'),
    '$' + params.HEARING_AID_PAIR_USD.survey2025.toLocaleString('en-US'),
    (params.DISPLACED_ADMIN_WORKERS_K.plan * 1000).toLocaleString('en-US') + ' eliminated administrative',
    '$' + SZ_LETTER.firstYearB.total + 'B in ' + SZ_LETTER.firstYear, '$' + SZ_LETTER.firstYearB.total + 'B for ' + SZ_LETTER.firstYear,
    /* review 1 of the owner decisions: the figures the decisions of
       2026-10-19 and the citation reads declared once, each with the words
       that say which figure it is */
    params.CENSUS_UNINSURED_2024.pct.toFixed(1) + '% of people',
    '$' + params.NHE_2023_PRIVATE_INSURANCE_B.toLocaleString('en-US') + 'B',
    'about ' + params.CBO_LTSS_NHE_INCREASE_PCT + ' percent larger',
    'nominal NHE growth at ' + params.NHE_PROJECTIONS.current.averageNominal + '%',
    '$' + params.CMS_AGE_PER_CAPITA_2020.allAges.toLocaleString('en-US'),
    '$' + params.DIRECT_CARE_MEDIAN_WAGE_2024.toFixed(2),
    ...['-', '–', ' to '].map((sep) => '$' + params.LOW_VALUE_POOL_B.low + sep + params.LOW_VALUE_POOL_B.high),
    params.LOW_VALUE_POOL_B.low + ' to ' + params.LOW_VALUE_POOL_B.high,
    /* the observed 2024 total as the Healthcare page states it (it typed the
       preliminary "~$5.3T" until review 1 of the owner decisions) */
    '$' + (params.NHE_2024_OBSERVED.mid / 1000).toFixed(2) + 'T',
    /* the branch review against main: the plan's transition claim, in both
       range spellings */
    ...['–', '-'].map((sep) => '$' + (params.TRANSITION_PLAN_CLAIM_B.low / 1000).toFixed(1) + sep +
      (params.TRANSITION_PLAN_CLAIM_B.high / 1000).toFixed(1) + 'T'),
    /* and the rent levy's figure, which its note typed beside its rev1x */
    '$' + RENTS_PLAN_B + 'B/yr'
  ];
  const ts = (await import('typescript')).default;
  /* the initializers of every `excerpts` and `source` property, blanked to
     spaces so offsets hold */
  const withoutQuotedSource = (text: string): string => {
    const sf = ts.createSourceFile('citation-excerpts.ts', text, ts.ScriptTarget.Latest, true);
    const cuts: [number, number][] = [];
    const visit = (n: import('typescript').Node): void => {
      if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name) && (n.name.text === 'excerpts' || n.name.text === 'source')) {
        cuts.push([n.initializer.getStart(sf), n.initializer.getEnd()]);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
    let out = text;
    for (const [a, b] of cuts.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + ' '.repeat(b - a) + out.slice(b);
    return out;
  };
  const faults: string[] = [];
  for (const f of files) {
    /* citation-excerpts.ts quotes its sources: an excerpt and the figure as
       the source states it are the source's words, held to the constants by
       its own test, so those two fields are left out; its note figures are
       scanned like any other code. Review 2 of the owner decisions: the
       fields are found by TypeScript's parser (CONVENTIONS: a scan that
       excludes code parses it), where a regex found them */
    const src = f === 'src/lib/citation-excerpts.ts' ? code(withoutQuotedSource(read(f))) : code(read(f));
    const lower = src.toLowerCase();
    for (const t of typed) if (lower.indexOf(t.toLowerCase()) >= 0) faults.push(f + ' types "' + t + '"');
  }
  expect(faults).toEqual([]);
  /* the money flow: the total is BASE2023's and no source or channel types
     its value; the ribbons are the only typed figures */
  expect(params.MONEYFLOW.total).toBe(params.BASE2023.nheTotal);
  const flow = read('src/lib/params.ts');
  const block = flow.slice(flow.indexOf('export const MONEYFLOW = {'), flow.indexOf('export function moneyFlowChannel'));
  /* review 4 of P24: `total: 4866.5` is a typed value too */
  expect(block).not.toMatch(/\b(?:value|total)\s*:\s*[\d.]/);
  /* CMS's 2024 release, Table 5-2: out-of-pocket health spending, 2023 */
  expect(oop).toBe(525.4);
  /* review 1 of the owner decisions: each source is its sponsor's rows,
     summed and rounded to CMS's tenth as sponsorTotal2023() reports them */
  for (const s of params.MONEYFLOW.sources) {
    const sum = params.MONEYFLOW.ribbons.filter((r) => r.from === s.id).reduce((a, r) => a + r.value, 0);
    expect(s.value, s.id).toBe(Math.round(sum * 10) / 10);
  }
  /* the plan figures, held to the requirements that state them */
  const sp = sourcePackage();
  expect(requirementBound(sp.requirements.get('SR-DRUG-002')!.text)!.num).toBe(params.PLAN_DRUG_PRICE_CUT_TARGET);
  /* the reserve the Equalization Fund's card states is held to its record
     by a build row (review 6 of P24: this test had copied it) */
  expect(requirementBound(sp.requirements.get('PR-WF-002')!.text)!.num).toBe(params.ANNUAL_TRAINING_TARGET);
  /* and each reader states them */
  const notes = params.PARAM_DEFS.map((p) => p.source + ' ' + p.label).join(' ');
  expect(notes).toContain('at least ' + params.PLAN_DRUG_PRICE_CUT_TARGET + '%');
  expect(notes).toContain(params.ANNUAL_TRAINING_TARGET.toLocaleString('en-US') + ' new annual');
  const cards = GOV_GROUPS.flatMap((g) => g.members).map((m) => [m.role, m.why, m.leader].join(' ')).join(' ');
  expect(cards).toContain(params.iraCutRange() + ' on selected drugs');
  expect(cards).toContain('the ' + params.PLAN_DRUG_PRICE_CUT_TARGET + '% net-price-reduction target');
});
