/* The region model file, read once, for build-time callers.
 *
 * §S9c. Same split, and for the same reason, as src/lib/counties.ts: this is
 * the half that touches disk, so it stays out of src/lib/hospital-regions.ts,
 * which the browser client imports. node:fs must never reach that file.
 *
 * The page and the self-tests both read the model at build time so that the
 * margin, the weight sweep and the achieved spread are computed from the
 * shipped data rather than typed beside it. Every one of those numbers used
 * to be prose.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { RegionsData } from './hospital-regions';

/* src/lib/region-data.ts -> repo root */
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/* The same files src/scripts/units-client.ts fetches at runtime, through
   BASE + 'data/...'. `docs/data/` is the retired tree and is not these. */
export const REGION_DATA = 'public/data/hospital-regions.json';
export const STATES_GEO = 'public/data/us-states.json';

const regionCache = new Map<string, RegionsData>();

export function regionModel(root = REPO_ROOT): RegionsData {
  const hit = regionCache.get(root);
  if (hit) return hit;
  const parsed = JSON.parse(
    readFileSync(join(root, REGION_DATA), 'utf8')) as RegionsData;
  regionCache.set(root, parsed);
  return parsed;
}

interface GeoFeature { properties?: { name?: string; NAME?: string } }

/* Code review [§S9c]: R92's declared test is `every data file declares the
   vintage of each time-varying field`, and §S9c gave a `meta` block to
   counties.json only. State outlines change too -- boundary files are
   re-issued and re-simplified -- so this file declares its own as well. */
export interface StatesGeoMeta {
  geometry_vintage: number;
  retrieved: string;
  features: number;
  note: string;
  source: string;
  url: string;
}
interface StatesGeo { meta: StatesGeoMeta; features: GeoFeature[] }

const featureCache = new Map<string, string[]>();
const statesMetaCache = new Map<string, StatesGeoMeta>();

export function statesGeoMeta(root = REPO_ROOT): StatesGeoMeta {
  const hit = statesMetaCache.get(root);
  if (hit) return hit;
  const geo = JSON.parse(
    readFileSync(join(root, STATES_GEO), 'utf8')) as StatesGeo;
  statesMetaCache.set(root, geo.meta);
  return geo.meta;
}

/* Just the state names out of the GeoJSON. The geometry is 88 KB the build
   has no use for, and the render loop resolves a feature to a region by name
   alone, so the name list is the whole of what a check needs. */
export function stateFeatureNames(root = REPO_ROOT): string[] {
  const hit = featureCache.get(root);
  if (hit) return hit;
  const geo = JSON.parse(
    readFileSync(join(root, STATES_GEO), 'utf8')) as StatesGeo;
  const names = geo.features.map((f) => f.properties?.name ?? f.properties?.NAME ?? '');
  featureCache.set(root, names);
  return names;
}
