import { afterEach, expect, test } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { keyOrThrow, lookupOrThrow } from '../../src/lib/registry-lookup';
import { buildDiagram, isLeafKind, LEAF_REGISTRIES, leafLabel } from '../../src/lib/equation-diagram';
import {
  collectDeps, DIAGRAM_GROUPS, EQUATIONS, MODEL_META, MODEL_REGISTRY, RAMP_META, RAMP_REGISTRY
} from '../../src/lib/equations';
import type { ExprNode } from '../../src/lib/equations';
import { PARAMS_BY_ID } from '../../src/lib/params';
import { maskComments, registryIdAssertions, sourceText } from '../../src/lib/manifest-check';

/* R249 [§S16]: three sibling registry reads in buildDiagram, three failure
   modes - a silent raw-id label for an unknown parameter, a TypeError through
   a cast for an unknown ramp or model. One lookup now, naming the registry
   and the id; and no id reaches a registry through an assertion. */

test('R249: lookupOrThrow returns the entry or names the registry and the id', () => {
  expect(lookupOrThrow(RAMP_REGISTRY, 'cov').sym).toBe('cov(t)');
  expect(() => lookupOrThrow(RAMP_REGISTRY, 'nope')).toThrow('RAMP_META has no entry "nope"');
  /* an inherited key is not an entry */
  expect(() => lookupOrThrow(MODEL_REGISTRY, 'toString')).toThrow('MODEL_META has no entry "toString"');
  /* each registry carries its own data and its own name */
  expect(RAMP_REGISTRY.entries).toBe(RAMP_META);
  expect(MODEL_REGISTRY.entries).toBe(MODEL_META);
});

test('R249: keyOrThrow accepts exactly the registry keys, with the one message', () => {
  for (const k of Object.keys(RAMP_META)) expect(keyOrThrow(RAMP_REGISTRY, k)).toBe(k);
  for (const k of Object.keys(MODEL_META)) expect(keyOrThrow(MODEL_REGISTRY, k)).toBe(k);
  expect(() => keyOrThrow(RAMP_REGISTRY, 'constructor')).toThrow('RAMP_META has no entry "constructor"');
  expect(() => keyOrThrow(MODEL_REGISTRY, 'cov')).toThrow('MODEL_META has no entry "cov"');
});

test('R249: the error message is written in one place', () => {
  /* the review of P22 found it copied by hand beside two guards in the client */
  const client = sourceText('src/scripts/quality-client.ts');
  /* comments may describe the message; code may not build it */
  expect(maskComments(client).includes('has no entry')).toBe(false);
});

/* Review 3 of P22: one table of leaf kinds replaces the switches on kind. */
test('R249: each leaf kind reads its own registry, and nothing else is a leaf kind', () => {
  expect(Object.keys(LEAF_REGISTRIES).sort()).toEqual(['model', 'param', 'ramp']);
  expect(LEAF_REGISTRIES.ramp).toBe(RAMP_REGISTRY);
  expect(LEAF_REGISTRIES.model).toBe(MODEL_REGISTRY);
  expect(leafLabel('ramp', 'cov')).toBe(RAMP_META.cov.label);
  expect(leafLabel('model', 'util')).toBe(MODEL_META.util.label);
  const pid = Object.keys(PARAMS_BY_ID)[0]!;
  expect(leafLabel('param', pid)).toBe(PARAMS_BY_ID[pid]!.label);
  expect(isLeafKind('toString')).toBe(false);
  expect(isLeafKind('index')).toBe(false);
  expect(() => leafLabel('ramp', 'nope')).toThrow('RAMP_META has no entry "nope"');
});

test('R249: every diagram builds today, and every leaf it draws is labelled from its registry', () => {
  let leaves = 0;
  for (const g of DIAGRAM_GROUPS) {
    for (const n of buildDiagram(g.members).nodes) {
      if (n.type === 'param') { leaves++; expect(n.label).toBe(PARAMS_BY_ID[n.refId]!.label); }
      if (n.type === 'ramp') { leaves++; expect(n.label).toBe(RAMP_META[n.refId as keyof typeof RAMP_META].label); }
      if (n.type === 'model') { leaves++; expect(n.label).toBe(MODEL_META[n.refId as keyof typeof MODEL_META].label); }
    }
  }
  /* 51 leaf nodes across the eight diagrams when written (one per leaf per
     diagram); the floor only proves the walk saw some. */
  expect(leaves).toBeGreaterThan(0);
});

/* Drive buildDiagram with an equation that names a leaf no registry has. The
   equation is added to the live table for the test and removed after it. */
function withProbeEquation(expr: ExprNode, run: () => void): void {
  const id = 'TPP-PROBE9';
  const host = EQUATIONS[Object.keys(EQUATIONS)[0]!]!;
  (EQUATIONS as Record<string, typeof host>)[id] = { ...host, id: id, expr: expr };
  try { run(); } finally { delete (EQUATIONS as Record<string, typeof host>)[id]; }
}

test('R249: an unknown parameter is a named error, not a node labelled with its raw id', () => {
  withProbeEquation({ k: 'param', id: 'noSuchParam' }, () => {
    expect(() => buildDiagram(['TPP-PROBE9'])).toThrow('PARAMS_BY_ID has no entry "noSuchParam"');
  });
});

test('R249: an unknown ramp or model is a named error, not a TypeError', () => {
  withProbeEquation({ k: 'ramp', id: 'zzz' } as unknown as ExprNode, () => {
    expect(() => buildDiagram(['TPP-PROBE9'])).toThrow('RAMP_META has no entry "zzz"');
  });
  withProbeEquation({ k: 'model', id: 'zzz' } as unknown as ExprNode, () => {
    expect(() => buildDiagram(['TPP-PROBE9'])).toThrow('MODEL_META has no entry "zzz"');
  });
});

test('R249: collectDeps returns typed ids without asserting them', () => {
  const deps = collectDeps({ k: 'add', a: { k: 'ramp', id: 'cov' }, b: { k: 'model', id: 'util' } } as ExprNode);
  expect(deps.ramps).toEqual(['cov']);
  expect(deps.models).toEqual(['util']);
});

const roots: string[] = [];
afterEach(() => { while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true }); });
function fixture(body: string): string {
  const root = mkdtempSync(join(tmpdir(), 'nha-cast-'));
  roots.push(root);
  mkdirSync(join(root, 'src', 'lib'), { recursive: true });
  writeFileSync(join(root, 'src', 'lib', 'probe.ts'), body, 'utf8');
  return root;
}

test('R249: no ramp or model id in src/ is reached through an assertion', () => {
  expect(registryIdAssertions()).toEqual([]);
});

test('R249: both assertion spellings are refused; a type argument and a comment are not', () => {
  const hits = registryIdAssertions(fixture(
    "const a = META[rid as RampId];\n" +
    "const b = <ModelId>mid;\n" +
    "const ok = new Set<RampId>();\n" +
    "// the old code read `x as ModelId` here\n"
  ));
  expect(hits).toEqual(['src/lib/probe.ts:1 as RampId', 'src/lib/probe.ts:2 <ModelId>m']);
});
