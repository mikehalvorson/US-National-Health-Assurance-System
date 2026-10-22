import { expect, test } from 'vitest';
import * as FORMAT from '../../src/lib/format';
import { maskComments, sourceText } from '../../src/lib/manifest-check';
import {
  money, moneyShort, pct, perCap, axis, dollarsKMB, dollarsMagnitude, householdsMillions
} from '../../src/lib/format';

const FORMATTERS: Array<[string, (n: number) => string]> = [
  ['money', money],
  ['moneyShort', moneyShort],
  ['pct', pct],
  ['perCap', perCap],
  ['axis', axis]
];

test('money: one decimal T above 1000B, whole B below', () => {
  expect(money(5340)).toBe('$5.34T');
  expect(money(300)).toBe('$300B');
  expect(money(-1200)).toBe('−$1.20T'); // U+2212 minus sign
  expect(money(Infinity)).toBe('n/a');
});

test('moneyShort: one-decimal T, whole B', () => {
  expect(moneyShort(3300)).toBe('$3.3T');
  expect(moneyShort(300)).toBe('$300B');
});

test('pct default one decimal, perCap grouped, axis compact', () => {
  expect(pct(17.6)).toBe('17.6%');
  expect(pct(17.6, 0)).toBe('18%');
  expect(perCap(14570)).toBe('$14,570');
  /* R197 [§S12]: was '$2T'. axis() now fixes the T branch to one decimal, so
     an axis reads $2.0T / $2.5T / $3.0T rather than mixing $2T with $2.5T. */
  expect(axis(2000)).toBe('$2.0T');
  expect(axis(300)).toBe('$300B');
});

/* R195 [§S12]: only money() guarded isFinite. Its four siblings rendered
   "$InfinityT", "Infinity%", "$∞" and "$NaNB" straight into the DOM.
   This is not hypothetical: taxmodel's coverage returns Infinity when need is
   zero and revenue is positive, and coverage is rendered as a percentage. */
test('R195: every formatter guards non-finite input', () => {
  for (const [name, fn] of FORMATTERS) {
    for (const bad of [Infinity, -Infinity, NaN]) {
      expect(fn(bad), name + '(' + String(bad) + ')').toBe('n/a');
    }
  }
});

/* R196 [§S12]: money rendered −$500B (U+2212, sign before the symbol) while
   axis and perCap rendered $-500B and $-500 (U+002D, sign after the symbol),
   so one negative had two renderings on one chart - axis ticks in one form and
   value labels in the other. The property, not the five strings: whatever the
   convention is, all five obey it. */
test('R196: one negative rendering across every formatter', () => {
  for (const [name, fn] of FORMATTERS) {
    const out = fn(-500);
    expect(out, name + ' must use U+2212, not the hyphen-minus').not.toContain('-');
    expect(out, name + ' must sign the value').toContain('−');
    /* the sign leads: nothing precedes it. */
    expect(out.indexOf('−'), name + ' must put the sign first').toBe(0);
  }
});

test('R196: the negative is the positive with a leading minus sign', () => {
  for (const [name, fn] of FORMATTERS) {
    for (const v of [500, 1234, 5340, 17.6]) {
      expect(fn(-v), name + '(-' + v + ')').toBe('−' + fn(v));
    }
  }
});

/* R197 [§S12]: axis emitted "$" + (b / 1000) + "T" with no toFixed, so a tick
   at 1234 rendered "$1.234T". niceTicks can produce a step below 100 on a
   narrow range, which is exactly when that happens. */
test('R197: the T branch of axis carries one decimal', () => {
  expect(axis(1234)).toBe('$1.2T');
  expect(axis(1000)).toBe('$1.0T');
  expect(axis(-1500)).toBe('−$1.5T');
  expect(axis(5340)).toBe('$5.3T');
});

/* axis keeps sub-unit precision below 1000B on purpose, which is the one place
   it still differs from moneyShort. Ticks come from niceTicks, and rounding
   4.5 to 5 would print two neighbouring ticks with the same label. */
test('axis keeps tick precision below 1000B, unlike moneyShort', () => {
  expect(axis(4.5)).toBe('$4.5B');
  expect(moneyShort(4.5)).toBe('$5B');
});

/* R194 [§S16]: round before testing the unit threshold. money() tested
   `a >= 1000` on the unrounded value and rounded in the B branch, so
   [999.5, 1000) printed "$1000B". moneyShort() had the same shape, and so did
   three formatters inside tax-charts.ts, which now live in format.ts. */
test('R194: the half-unit window below a trillion reads in T', () => {
  expect(money(999.5)).toBe('$1.00T');
  expect(moneyShort(999.5)).toBe('$1.0T');
  expect(money(999.4)).toBe('$999B');
  expect(money(-999.5)).toBe('−$1.00T');
  expect(dollarsKMB(999_600)).toBe('$1.0M');
  expect(dollarsKMB(999_960_000)).toBe('$1.0B');
  expect(dollarsMagnitude(999.6)).toBe('$1.0k');
  expect(dollarsMagnitude(9_960)).toBe('$10k');
  expect(dollarsMagnitude(-999_600)).toBe('$1.0M');
  expect(householdsMillions(0.9996)).toBe('1.0M');
});

/* The property, over every formatter that changes unit: walk each threshold
   from just below to just above it, and read back what was printed. No figure
   may reach the next unit's threshold in the unit below it, and the value read
   back may never fall as the input rises. */
const UNITS: Record<string, number> = { '': 1, k: 1e3, M: 1e6, B: 1e9, T: 1e12 };
const UNIT_FORMATTERS: Array<{
  name: string; fn: (n: number) => string; scale: number; top: string;
  thresholds: number[]; cap: Record<string, number>;
}> = [
  /* money and moneyShort take billions: T is their top unit. */
  { name: 'money', fn: money, scale: 1e9, top: 'T', thresholds: [1000], cap: { B: 1000 } },
  { name: 'moneyShort', fn: moneyShort, scale: 1e9, top: 'T', thresholds: [1000], cap: { B: 1000 } },
  { name: 'dollarsKMB', fn: dollarsKMB, scale: 1, top: 'B', thresholds: [1e6, 1e9],
    cap: { k: 1000, M: 1000 } },
  /* the decimal-k branch stops at 10k, where whole thousands take over */
  { name: 'dollarsMagnitude', fn: dollarsMagnitude, scale: 1, top: 'M', thresholds: [1e3, 1e4, 1e6],
    cap: { '': 1000, k: 1000 } },
  { name: 'householdsMillions', fn: householdsMillions, scale: 1e6, top: 'M', thresholds: [1],
    cap: { k: 1000 } }
];

function readBack(out: string): { value: number; unit: string } {
  const m = /^−?\$?([\d.]+)([kMBT]?)$/.exec(out);
  if (!m) throw new Error('unparseable: ' + out);
  return { value: Number(m[1]), unit: m[2] };
}

test('R194: no unit formatter prints a figure that belongs to the next unit', () => {
  let checked = 0;
  for (const f of UNIT_FORMATTERS) {
    for (const t of f.thresholds) {
      let last = -Infinity;
      for (let k = -200; k <= 200; k++) {
        const v = t * (1 + k * 0.00005);
        const out = readBack(f.fn(v));
        checked++;
        if (out.unit !== f.top && f.cap[out.unit] !== undefined) {
          expect(out.value, f.name + '(' + v + ') = ' + f.fn(v)).toBeLessThan(f.cap[out.unit]);
        }
        const base = out.value * UNITS[out.unit] / f.scale;
        expect(base, f.name + ' falls at ' + v).toBeGreaterThanOrEqual(last);
        last = base;
      }
    }
  }
  /* eight thresholds across five formatters, 401 points each: proof the walk
     ran rather than a count anything depends on */
  expect(checked).toBe(401 * 8);
});

test('R194: the moved formatters keep their outputs away from the boundary', () => {
  /* What tax-charts.ts printed before the move, for ordinary values. */
  expect(dollarsKMB(850_000)).toBe('$850k');
  expect(dollarsKMB(4_200_000)).toBe('$4.2M');
  expect(dollarsKMB(1_300_000_000)).toBe('$1.3B');
  expect(dollarsMagnitude(640)).toBe('$640');
  expect(dollarsMagnitude(4_200)).toBe('$4.2k');
  expect(dollarsMagnitude(38_000)).toBe('$38k');
  expect(dollarsMagnitude(-38_000)).toBe('$38k');
  expect(householdsMillions(128.44)).toBe('128.4M');
  expect(householdsMillions(0.85)).toBe('850k');
  for (const fn of [dollarsKMB, dollarsMagnitude, householdsMillions]) {
    expect(fn(NaN)).toBe('n/a');
    expect(fn(Infinity)).toBe('n/a');
  }
});

/* Review of P22: the R194 run meant to delete tax-charts.ts's local alias for
   dollarsMagnitude and did not (an inline script did nothing, silently). */
test('R194: tax-charts.ts formats through format.ts, with no local alias', () => {
  /* Review 2 of P22: any binding whose value is a format.ts export, under
     any name, not only names that start with fmt. */
  const code = maskComments(sourceText('src/lib/tax-charts.ts'));
  const alias = new RegExp('\\b(?:const|let|var)\\s+\\w+\\s*=\\s*(?:' +
    Object.keys(FORMAT).join('|') + ')\\s*[;,\\n]');
  /* Review 3 of P22: and any local function that only forwards to one,
     declared or arrow, under any name (this matched fmt* names only). */
  const exported = Object.keys(FORMAT).join('|');
  const wrapper = new RegExp('\\bfunction\\s+\\w+\\s*\\([^)]*\\)[^{]*\\{\\s*return\\s+(?:' + exported + ')\\s*\\(' +
    '|\\b(?:const|let|var)\\s+\\w+\\s*=\\s*\\([^)]*\\)\\s*(?::[^=]+)?=>\\s*(?:' + exported + ')\\s*\\(');
  expect(code).not.toMatch(alias);
  expect(code).not.toMatch(wrapper);
  /* the patterns do see each form */
  expect('const asDollars = dollarsMagnitude;\n').toMatch(alias);
  expect('function label(v: number): string { return money(v); }').toMatch(wrapper);
  expect('const label = (v: number): string => moneyShort(v);').toMatch(wrapper);
  expect('ticks.map((v) => money(v))').not.toMatch(wrapper);
});
