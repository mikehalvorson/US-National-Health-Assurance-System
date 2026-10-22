import { expect, test } from 'vitest';
import { FILE_MANIFEST } from '../../src/lib/file-manifest';
import { enumerateSourceFiles, manifestDrift } from '../../src/lib/manifest-check';

/* R271 [§S0] — the audit could not list a directory. git/trees?recursive=1, the
   Contents API and the HTML tree view all returned empty, so its only discovery
   mechanism was seeing a file named inside another file. That missed two public
   chapters, the route registry that enumerates every chapter, and 23 files that
   appear in neither audit document. A committed manifest, checked at build
   time, is the interim form of R238. */

test('R271: the committed manifest matches the working tree exactly', () => {
  const drift = manifestDrift();
  expect(drift.unlisted).toEqual([]); // a file on disk that nobody listed
  expect(drift.missing).toEqual([]); // a listed file that no longer exists
});

test('R271: the manifest covers src, tools and research', () => {
  expect(FILE_MANIFEST.some((p) => p.startsWith('src/'))).toBe(true);
  expect(FILE_MANIFEST.some((p) => p.startsWith('tools/'))).toBe(true);
  expect(FILE_MANIFEST.some((p) => p.startsWith('research/'))).toBe(true);
});

test('R271: the manifest is sorted and free of duplicates, so a diff is readable', () => {
  expect(FILE_MANIFEST).toEqual([...FILE_MANIFEST].sort());
  expect(new Set(FILE_MANIFEST).size).toBe(FILE_MANIFEST.length);
});

test('R271: an unlisted file in src/ is detected as drift', () => {
  const drift = manifestDrift(
    [...enumerateSourceFiles(), 'src/lib/__not-in-the-manifest.ts'].sort()
  );
  expect(drift.unlisted).toEqual(['src/lib/__not-in-the-manifest.ts']);
});

test('R271: the route registry lists every routable chapter page', () => {
  // BT1: ltc.astro and risk.astro existed in no inventory and no queue. The
  // manifest is only useful if it is compared against something.
  const pages = FILE_MANIFEST.filter(
    (p) => p.startsWith('src/pages/') && p.endsWith('.astro') && !p.includes('[')
  );
  expect(pages.length).toBeGreaterThanOrEqual(14);
  expect(pages).toContain('src/pages/ltc.astro');
  expect(pages).toContain('src/pages/risk.astro');
});
