import { expect, test } from 'vitest';
import { bridgeSteps } from '../../src/lib/bridge';
import { runOverviewMc } from '../../src/lib/overview';

test('bridge starts at the baseline total and ends at the NHA total', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  const { steps } = bridgeSteps(mc);
  const t = mc.years.length - 2;
  const d = mc.modePath.detail[t];
  expect(steps[0].kind).toBe('total');
  expect(steps[0].value).toBeCloseTo(d.nheBase, 6);
  const last = steps[steps.length - 1];
  expect(last.kind).toBe('total');
  expect(last.value).toBeCloseTo(d.nheNha, 6);
  for (const s of steps) expect(['total', 'add', 'sub']).toContain(s.kind);
});

test('bridge identity closes (baseline + adds - subs == NHA total)', () => {
  const mc = runOverviewMc('SCN-BASE', null);
  expect(bridgeSteps(mc).identityError).toBeLessThan(0.5);
});

test('a stress scenario still closes the identity', () => {
  const mc = runOverviewMc('SCN-OPT', null);
  expect(bridgeSteps(mc).identityError).toBeLessThan(0.5);
});
