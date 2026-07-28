import { expect, test } from 'vitest';
import { CARE_SCENARIOS, moneyRange } from '../../src/lib/care';

test('moneyRange: equal lo/hi collapses to one figure', () => {
  expect(moneyRange(0, 0)).toBe('$0');
  expect(moneyRange(6850, 6850)).toBe('$6,850');
});

test('moneyRange: distinct lo/hi renders an en-dash range with no em dash', () => {
  const r = moneyRange(150, 1500);
  expect(r).toBe('$150 – $1,500');
  expect(r.includes('—')).toBe(false);
});

test('CARE_SCENARIOS: ten scenarios, first is the premium card', () => {
  expect(CARE_SCENARIOS).toHaveLength(10);
  expect(CARE_SCENARIOS[0].id).toBe('premium');
  expect(CARE_SCENARIOS[0].nha.amount).toBe(0);
  expect(CARE_SCENARIOS.every((s) => typeof s.confidence === 'string')).toBe(true);
});
