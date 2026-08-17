/* R229 [§S3]: the import-time enricher convention.
 *
 * Two modules mutate the shared catalog at import time and both guard with a
 * re-entry flag on the catalog object. That had been implemented twice as a
 * coincidence rather than written down once as a rule. The rule is at the top
 * of quality.ts; these tests are what stop a third enricher ignoring it. */
import { describe, expect, test } from 'vitest';
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
