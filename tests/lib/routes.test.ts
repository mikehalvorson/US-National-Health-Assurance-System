import { expect, test } from 'vitest';
import { TABS } from '../../src/lib/tabs';
import {
  exportedSelfTestSurfaces,
  pageRoutes,
  routeDrift,
  unregisteredSelfTestSurfaces
} from '../../src/lib/manifest-check';
import { SELF_TEST_SOURCES } from '../../src/lib/selftests';

/* R267 [§S0] — ChapterNav does `const i = TABS.findIndex(...)` and renders
   nothing when i === -1, so a page whose path is absent from TABS reaches a
   dead end at the foot of the chapter with no error. Latent today, but the
   audit believed the same about its own manifest until BT1 found two entire
   chapters that were in no inventory. */

test('R267: every page under src/pages has a TABS entry', () => {
  expect(routeDrift().unregistered).toEqual([]);
});

test('R267: every TABS entry has a page', () => {
  expect(routeDrift().unrouted).toEqual([]);
});

test('R267: the route list is derived from the manifest, not typed', () => {
  // index.astro is the '' path
  expect(pageRoutes()).toContain('');
  expect(pageRoutes()).toContain('ltc');
  expect(pageRoutes()).toContain('risk');
});

/* R266 [§S1] — a TABS entry with no page used to be exempt from the unrouted
   half whenever it lacked `ported: true`, and was served by the stub route
   instead: a chapter reading "This chapter is being migrated", shipped. */
test('R266: a TABS entry with no page is reported', () => {
  const drift = routeDrift(pageRoutes().filter((p) => p !== 'risk'));
  expect(drift.unrouted).toEqual(['risk']);
});

test('R266: no tab carries a provenance flag', () => {
  /* `ported` claimed ltc and risk had docs/ originals. docs/index.html carries
     twelve buttons and neither is among them, so the flag was wrong on two
     rows while nothing read it for meaning. */
  for (const tab of TABS) expect(Object.keys(tab).sort()).toEqual(['id', 'label', 'path']);
});

test('R267: an unregistered page is detected as drift', () => {
  const drift = routeDrift([...pageRoutes(), 'orphan-chapter']);
  expect(drift.unregistered).toEqual(['orphan-chapter']);
});

test('R267: TABS itself is free of duplicate paths and ids', () => {
  expect(new Set(TABS.map((t) => t.path)).size).toBe(TABS.length);
  expect(new Set(TABS.map((t) => t.id)).size).toBe(TABS.length);
});

/* R206 [§S0] — R24 unified the three shapes that existed; this stops a fourth
   appearing. Every orphaned surface in this backlog (R153's two, R230's,
   R273's) was written, exported, and then simply never called. */
test('R206: no exported self-test surface sits outside the registry', () => {
  expect(unregisteredSelfTestSurfaces(SELF_TEST_SOURCES.map((s) => s.surface))).toEqual([]);
});

test('R206: the scan finds the surfaces it is meant to police', () => {
  const found = exportedSelfTestSurfaces().map((s) => s.module + ':' + s.fn);
  expect(found).toContain('phase-targets.ts:selfTestEveryRelevantPhase');
  expect(found).toContain('phase-targets.ts:selfTestNoRegression');
  expect(found).toContain('equations.ts:equationSelfTests');
  expect(found).toContain('fmea.ts:fmeaSelfTests');
  expect(found).toContain('model.ts:selfTest');
});

test('R206: an unregistered surface is reported', () => {
  const orphans = unregisteredSelfTestSurfaces(['model.ts']); // pretend only model is registered
  expect(orphans.map((o) => o.module)).toContain('fmea.ts');
});
