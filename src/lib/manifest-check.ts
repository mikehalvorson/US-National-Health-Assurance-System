/* R271 [§S0]: compare the committed file manifest against the working tree.
 *
 * The audit that produced this backlog could not enumerate a directory: the
 * git trees API, the Contents API and the HTML tree view all returned empty,
 * so its only discovery mechanism was seeing a file named inside another file.
 * That mechanism missed two entire public chapters (ltc, risk), the route
 * registry that enumerates every chapter (tabs.ts), and 23 files that are named
 * in neither audit document.
 *
 * Build-time only. Imported by selftests.ts, which runs in Node during
 * `astro build` and under vitest; nothing in src/scripts/ imports it, so
 * node:fs never reaches a client bundle.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FILE_MANIFEST } from './file-manifest';
import { TABS } from './tabs';

/* src/lib/manifest-check.ts -> repo root */
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

export const MANIFEST_ROOTS = ['src', 'tools', 'research'];

export function enumerateSourceFiles(root = REPO_ROOT): string[] {
  const out: string[] = [];
  for (const dir of MANIFEST_ROOTS) walk(join(root, dir), root, out);
  return out.sort();
}

function walk(dir: string, root: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return; /* a root that does not exist is reported as drift, not a crash */
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, root, out);
    else out.push(relative(root, full).split(sep).join('/'));
  }
}

export interface ManifestDrift {
  unlisted: string[]; /* on disk, absent from the manifest */
  missing: string[]; /* in the manifest, absent from disk */
}

export function manifestDrift(actual: string[] = enumerateSourceFiles()): ManifestDrift {
  const listed = new Set(FILE_MANIFEST);
  const onDisk = new Set(actual);
  return {
    unlisted: actual.filter((p) => !listed.has(p)),
    missing: FILE_MANIFEST.filter((p) => !onDisk.has(p))
  };
}

/* R267 [§S0]: route registration.
 *
 * ChapterNav does `TABS.findIndex(...)` and renders nothing on -1, so a page
 * absent from TABS is a dead end at the foot of the chapter with no error.
 * The routes are derived from the manifest rather than typed, so adding a page
 * is enough to trip the check. */
export function pageRoutes(manifest: string[] = FILE_MANIFEST): string[] {
  return manifest
    .filter((p) => p.startsWith('src/pages/') && p.endsWith('.astro'))
    .map((p) => p.slice('src/pages/'.length, -'.astro'.length))
    .filter((name) => !name.startsWith('[')) /* dynamic route, not a fixed path */
    .map((name) => (name === 'index' ? '' : name));
}

export interface RouteDrift {
  unregistered: string[]; /* a page with no TABS entry: navigation dead end */
  unrouted: string[]; /* a TABS entry with no page and no dynamic fallback */
}

export function routeDrift(routes: string[] = pageRoutes(), tabs = TABS): RouteDrift {
  const registered = new Set(tabs.map((t) => t.path));
  const built = new Set(routes);
  return {
    unregistered: routes.filter((r) => !registered.has(r)),
    /* an unported tab is served by src/pages/[chapter].astro's getStaticPaths */
    unrouted: tabs
      .filter((t) => t.ported !== false && t.path !== '' && t.ported)
      .map((t) => t.path)
      .filter((p) => !built.has(p))
  };
}
