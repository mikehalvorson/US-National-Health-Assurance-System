/* Code review [§S9b]: the county file, read once, for build-time callers.
 *
 * §S9b put this reader in manifest-check.ts because that module already had
 * node:fs and a cache. That made src/pages/units.astro import the audit
 * harness to render a page, which is the wrong dependency: `countyDemand` is
 * a loader, not a check, and the page has no business knowing that the
 * self-test module exists.
 *
 * It lives here instead. units-check.ts imports it too, so there is still
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
/* Review 3 of P24: one read and one cache for the parsed file and the
   precision its text writes (countyRuralDecimals below read the file a
   second time into a second cache, against the header's "one reader"). */
const countyCache = new Map<string, { file: CountyFile; decimals: number[] }>();

function countyEntry(root: string): { file: CountyFile; decimals: number[] } {
  const hit = countyCache.get(root);
  if (hit) return hit;
  const text = readFileSync(join(root, COUNTY_DATA), 'utf8');
  const file = JSON.parse(text) as CountyFile;
  const body = text.slice(text.indexOf('"counties"'));
  const decimals = [...body.matchAll(/"r"\s*:\s*(-?\d+)(?:\.(\d+))?/g)].map((m) => (m[2] || '').length);
  if (decimals.length !== file.counties.length) {
    throw new Error('countyRuralDecimals: read ' + decimals.length + ' rural shares for ' + file.counties.length + ' counties');
  }
  const entry = { file, decimals };
  countyCache.set(root, entry);
  return entry;
}
function countyFile(root: string): CountyFile {
  return countyEntry(root).file;
}

export function countyDemand(root = REPO_ROOT): CountyRecord[] {
  return countyFile(root).counties;
}

export function countyMeta(root = REPO_ROOT): CountyMeta {
  return countyFile(root).meta;
}

/* Review of P24 (R91): each record's rural share as the file text writes
 * it, in decimals. JSON.parse turns "0.50" into 0.5 and "1.00" into 1, so
 * the precision a rounding argument needs is in the text and nowhere else.
 * Read in record order from the counties array; the meta block's "r" is a
 * description string, not a number, so the number-shaped match skips it.
 * Throws if the count read differs from the records parsed, so a format
 * change cannot pass as a shorter list. */
export function countyRuralDecimals(root = REPO_ROOT): number[] {
  return countyEntry(root).decimals;
}
