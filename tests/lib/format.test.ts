import { expect, test } from 'vitest';
import { money, moneyShort, pct, perCap, axis } from '../../src/lib/format';

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
  expect(axis(2000)).toBe('$2T');
  expect(axis(300)).toBe('$300B');
});
