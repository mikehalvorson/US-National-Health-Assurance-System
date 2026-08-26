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

import type { CountyRecord } from './units';

/* src/lib/counties.ts -> repo root */
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/* The same file src/scripts/units-client.ts fetches at runtime. The client
   reaches it through BASE + 'data/counties.json'; this is the copy that
   serves. `docs/data/counties.json` is the retired tree and is not this. */
export const COUNTY_DATA = 'public/data/counties.json';

/* R92 [§S9c]: the file declares the vintage of every field of its that
 * varies with time.
 *
 * `hospital-regions.json` has always said its populations are Census 2024 and
 * its rural shares 2020 -- a deliberate four-year gap -- while the file both
 * of those are computed FROM said nothing at all. A consumer holding only
 * counties.json could not tell what year any number described, and the
 * repo's single-base-year rule had nothing to apply.
 *
 * That made the array an object, which is why this reader and two others
 * changed. `population_total` is here as well as in the records, on purpose:
 * a declared total that the rows have to reproduce is a check, and a file
 * that only carries rows can only be compared against itself. */
export interface CountyMeta {
  population_vintage: number;
  rural_vintage: number;
  geometry_vintage: number;
  retrieved: string;
  records: number;
  population_total: number;
  fields: Record<string, string>;
  sources: Record<string, string>;
  note: string;
}

export interface CountyFile {
  meta: CountyMeta;
  counties: CountyRecord[];
}

/* Memoised per root, the repo convention for any filesystem read inside a
   self-test: the file is 245 KB and both the self-test pass and the page
   render would otherwise re-parse it. */
const countyCache = new Map<string, CountyFile>();

function countyFile(root: string): CountyFile {
  const hit = countyCache.get(root);
  if (hit) return hit;
  const parsed = JSON.parse(
    readFileSync(join(root, COUNTY_DATA), 'utf8')) as CountyFile;
  countyCache.set(root, parsed);
  return parsed;
}

export function countyDemand(root = REPO_ROOT): CountyRecord[] {
  return countyFile(root).counties;
}

export function countyMeta(root = REPO_ROOT): CountyMeta {
  return countyFile(root).meta;
}
