/* Code review [§S9b]: the county file, read once, for build-time callers.
 *
 * §S9b put this reader in manifest-check.ts because that module already had
 * node:fs and a cache. That made src/pages/units.astro import the audit
 * harness to render a page, which is the wrong dependency: `countyDemand` is
 * a loader, not a check, and the page has no business knowing that the
 * self-test module exists.
 *
 * It lives here instead. manifest-check.ts imports it too, so there is still
 * one reader and one cache.
 *
 * Build-time only. `src/lib/units.ts` is the pure half -- it is imported by
 * the browser client, so node:fs must never reach it. Anything the client
 * needs goes there; anything that touches disk goes here.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CountyDemand } from './units';

/* src/lib/counties.ts -> repo root */
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/* The same file src/scripts/units-client.ts fetches at runtime. The client
   reaches it through BASE + 'data/counties.json'; this is the copy that
   serves. `docs/data/counties.json` is the retired tree and is not this. */
export const COUNTY_DATA = 'public/data/counties.json';

/* Memoised per root, the repo convention for any filesystem read inside a
   self-test: the file is 244 KB and both the self-test pass and the page
   render would otherwise re-parse it. */
const countyCache = new Map<string, CountyDemand[]>();

export function countyDemand(root = REPO_ROOT): CountyDemand[] {
  const hit = countyCache.get(root);
  if (hit) return hit;
  const parsed = JSON.parse(
    readFileSync(join(root, COUNTY_DATA), 'utf8')) as CountyDemand[];
  countyCache.set(root, parsed);
  return parsed;
}
