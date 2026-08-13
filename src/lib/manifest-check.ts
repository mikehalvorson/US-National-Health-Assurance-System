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
