/* R229 [§S3]: the import-time enricher convention.
 *
 * Two modules mutate the shared catalog at import time and both guard with a
 * re-entry flag on the catalog object. That had been implemented twice as a
 * coincidence rather than written down once as a rule. The rule is at the top
 * of quality.ts; these tests are what stop a third enricher ignoring it. */
import { describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { ENRICHERS, undeclaredEnrichers } from '../../src/lib/manifest-check';

describe('R229: every import-time enricher is declared and guarded', () => {
  test('the two known enrichers are declared with their flags', () => {
    expect(Object.keys(ENRICHERS).sort()).toEqual([
      'applyEquationTargets', 'applyPhaseTargets'
    ]);
    expect(ENRICHERS.applyPhaseTargets.flag).toBe('__enriched');
    expect(ENRICHERS.applyEquationTargets.flag).toBe('__equationApplied');
  });

  test('no exported apply* in src/lib is undeclared', () => {
    expect(undeclaredEnrichers()).toEqual([]);
  });

  test('each declared guard really appears in its module', () => {
    for (const name of Object.keys(ENRICHERS)) {
      const { module, flag } = ENRICHERS[name];
      const text = readFileSync('src/lib/' + module, 'utf8');
      expect(text, module).toContain('export function ' + name);
      expect(text, module + ' guard ' + flag).toContain(flag);
    }
  });

  test('the convention is written where the pipeline is assembled', () => {
    /* Not in AGENTS.md: that file is gitignored, so a convention recorded
       there does not reach a contributor who clones the repo. */
    const assembler = readFileSync('src/lib/quality.ts', 'utf8');
    expect(assembler).toContain('import-time enricher convention');
    for (const name of Object.keys(ENRICHERS)) {
      expect(assembler, name).toContain(ENRICHERS[name].flag);
    }
  });
});

/* R225 [§S3]: the regression test the row asked for.
 *
 * BQ5 closed R225 by reading the code: applyEquationTargets IS re-entry
 * guarded, same as applyPhaseTargets. The row's residual was "still worth
 * adding as a regression test", and this is it. Both halves matter and they
 * fail differently:
 *
 *   - guarded: running an enricher twice on the same catalog changes nothing.
 *   - idempotent in fact: it changes nothing even with the flag cleared, so
 *     the guard is a cheap short-circuit rather than the only thing standing
 *     between the catalog and doubled enrichment.
 *
 * The second is the one worth having. A guard that hides a non-idempotent
 * function still breaks the moment someone works on a clone. */
describe('R225: importing the catalog twice produces identical output', () => {
  async function freshEnriched() {
    vi.resetModules();
    const data = await import('../../src/lib/quality-data');
    const phases = await import('../../src/lib/data-phases');
    const pt = await import('../../src/lib/phase-targets');
    const eq = await import('../../src/lib/equations');
    const Q = JSON.parse(JSON.stringify(data.NHA_QUALITY_DATA));
    pt.applyPhaseTargets(Q, phases.DATA_PHASES);
    eq.applyEquationTargets(Q, eq.computeTargets(Q, 'SCN-BASE'));
    return { Q, pt, eq, phases };
  }

  const rollouts = (Q: { parameters: Array<{ id: string; rollout?: unknown }> }) =>
    JSON.stringify(Q.parameters.map((p) => ({ id: p.id, rollout: p.rollout })));

  test('a second run over the same catalog changes nothing', async () => {
    const { Q, pt, eq, phases } = await freshEnriched();
    const once = rollouts(Q);
    pt.applyPhaseTargets(Q, phases.DATA_PHASES);
    eq.applyEquationTargets(Q, eq.computeTargets(Q, 'SCN-BASE'));
    expect(rollouts(Q)).toBe(once);
  });

  test('and still nothing with both re-entry flags cleared', async () => {
    const { Q, pt, eq, phases } = await freshEnriched();
    const once = rollouts(Q);
    const flagged = Q as { __enriched?: boolean; __equationApplied?: boolean };
    expect(flagged.__enriched).toBe(true);
    expect(flagged.__equationApplied).toBe(true);
    delete flagged.__enriched;
    delete flagged.__equationApplied;
    pt.applyPhaseTargets(Q, phases.DATA_PHASES);
    eq.applyEquationTargets(Q, eq.computeTargets(Q, 'SCN-BASE'));
    expect(rollouts(Q)).toBe(once);
  });

  test('two independent realms produce the same catalog', async () => {
    const a = await freshEnriched();
    const b = await freshEnriched();
    expect(rollouts(b.Q)).toBe(rollouts(a.Q));
  });

  test('the live singleton matches an independently enriched clone', async () => {
    const { Q } = await freshEnriched();
    vi.resetModules();
    const live = await import('../../src/lib/quality');
    expect(rollouts(live.QUALITY_DATA)).toBe(rollouts(Q));
  });
});
