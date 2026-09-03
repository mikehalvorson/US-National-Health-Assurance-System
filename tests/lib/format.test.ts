import { expect, test } from 'vitest';
import { money, moneyShort, pct, perCap, axis } from '../../src/lib/format';

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
