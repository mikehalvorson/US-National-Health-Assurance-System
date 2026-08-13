import { expect, test } from 'vitest';
import { TABS } from '../../src/lib/tabs';
import { routeDrift, pageRoutes } from '../../src/lib/manifest-check';

/* R267 [§S0] — ChapterNav does `const i = TABS.findIndex(...)` and renders
   nothing when i === -1, so a page whose path is absent from TABS reaches a
   dead end at the foot of the chapter with no error. Latent today, but the
   audit believed the same about its own manifest until BT1 found two entire
   chapters that were in no inventory. */

test('R267: every page under src/pages has a TABS entry', () => {
  expect(routeDrift().unregistered).toEqual([]);
});

test('R267: every TABS entry has a page or is served by the dynamic route', () => {
  expect(routeDrift().unrouted).toEqual([]);
});

test('R267: the route list is derived from the manifest, not typed', () => {
  // index.astro is the '' path; [chapter].astro is the dynamic fallback
  expect(pageRoutes()).toContain('');
  expect(pageRoutes()).toContain('ltc');
  expect(pageRoutes()).toContain('risk');
  expect(pageRoutes()).not.toContain('[chapter]');
});

test('R267: an unregistered page is detected as drift', () => {
  const drift = routeDrift([...pageRoutes(), 'orphan-chapter']);
  expect(drift.unregistered).toEqual(['orphan-chapter']);
});

test('R267: TABS itself is free of duplicate paths and ids', () => {
  expect(new Set(TABS.map((t) => t.path)).size).toBe(TABS.length);
  expect(new Set(TABS.map((t) => t.id)).size).toBe(TABS.length);
});
