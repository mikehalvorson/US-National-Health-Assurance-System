/* =========================================================================
 * R75 [§S15]: what the Physical Care page shows when a data file fails.
 *
 * The page fetches three files and fills the elements listed below from
 * them. Before this module, the client decided per branch which elements to
 * draw and wrote a failure message into the two maps only. Measured by failing each file in
 * headless Chrome: a failed hospital-regions.json left the region select, the
 * region detail and the score chart empty with no explanation, and a failed
 * counties.json left the unit counts, the unit types, the integrity line and
 * the slider readout blank while the slider and the filter buttons looked
 * live and did nothing. A failed fetch looked like an empty dataset.
 *
 * Now every element the data fills is listed here with the files it needs,
 * the client asks this plan whether to draw it, and every element that
 * cannot be drawn says why, naming the file. It lives here rather than in the
 * client because the client touches `document` as it is evaluated and so
 * cannot be imported by a test.
 * ========================================================================= */

export type UnitsFile = 'counties.json' | 'us-states.json' | 'hospital-regions.json';

/** The files the page fetches, in the order it fetches them. */
export const UNITS_FILES: readonly UnitsFile[] = ['counties.json', 'us-states.json', 'hospital-regions.json'];

export interface UnitsSurface {
  id: string;
  /** what the reader is missing, as the start of a sentence */
  what: string;
  needs: readonly UnitsFile[];
  /** block: a container; the message goes in as a note paragraph. inline:
      the element is itself a line of text (a readout, a paragraph), so the
      message replaces its text. select: the message becomes the only,
      disabled option. table: it becomes the caption. control: the element is
      disabled, and `explainedBy` is the surface whose message says why. */
  kind: 'block' | 'inline' | 'select' | 'table' | 'control';
  explainedBy?: string;
}

const COUNTIES: readonly UnitsFile[] = ['counties.json'];
const COUNTY_MAP: readonly UnitsFile[] = ['counties.json', 'us-states.json'];
const REGIONS: readonly UnitsFile[] = ['hospital-regions.json'];
const REGION_MAP: readonly UnitsFile[] = ['hospital-regions.json', 'us-states.json'];

/** Every element on the page that is filled from the data files. */
export const UNITS_SURFACES = [
  { id: 'unit-verdict', what: 'The unit counts', needs: COUNTIES, kind: 'block' },
  { id: 'unit-type-cards', what: 'The unit types', needs: COUNTIES, kind: 'block' },
  { id: 'units-vpc-val', what: 'The visits slider', needs: COUNTIES, kind: 'inline' },
  { id: 'units-vpc', what: 'The visits slider', needs: COUNTIES, kind: 'control', explainedBy: 'units-vpc-val' },
  { id: 'units-integrity', what: 'The data integrity check', needs: COUNTIES, kind: 'inline' },
  { id: 'units-state-table', what: 'The state table', needs: COUNTIES, kind: 'table' },
  { id: 'units-county-table', what: 'The county table', needs: COUNTIES, kind: 'table' },
  { id: 'units-map', what: 'The county map', needs: COUNTY_MAP, kind: 'block' },
  { id: 'units-filter', what: 'The map filter', needs: COUNTY_MAP, kind: 'control', explainedBy: 'units-map' },
  { id: 'hospital-region-map', what: 'The region map', needs: REGION_MAP, kind: 'block' },
  { id: 'hospital-region-integrity', what: 'The region map check', needs: REGION_MAP, kind: 'inline' },
  { id: 'hospital-region-select', what: 'Region selection', needs: REGIONS, kind: 'select' },
  { id: 'hospital-region-detail', what: 'The region detail', needs: REGIONS, kind: 'block' },
  { id: 'hospital-region-scores', what: 'The region-count scores', needs: REGIONS, kind: 'block' }
] as const satisfies readonly UnitsSurface[];

/** An id the plan lists, so a mistyped one fails `astro check` rather than
    reading as drawable. */
export type UnitsSurfaceId = typeof UNITS_SURFACES[number]['id'];

export interface UnitsLoadPlan {
  /** whether an element can be drawn; throws on an id the plan does not list,
      for a caller that got past the type */
  can(id: UnitsSurfaceId): boolean;
  /** the sentence each undrawable text, select or table surface shows */
  messages: Record<string, string>;
  /** the controls to disable */
  disabled: string[];
}

/** Why a file cannot be used: its request failed, or it arrived in a shape
    the page cannot read. Review 2 of P21 found both were reported as "did
    not load", which is false of a file that arrived. */
export interface UnitsFailure { kind: 'not loaded' | 'unreadable'; reason: string }
export type UnitsFailures = Partial<Record<UnitsFile, UnitsFailure>>;

function describe(file: UnitsFile, failure: UnitsFailure): string {
  return failure.kind === 'unreadable'
    ? file + ' arrived but could not be read (' + failure.reason + ')'
    : file + ' did not load (' + failure.reason + ')';
}

/** What to draw, given the files that failed and why. */
export function unitsLoadPlan(failures: UnitsFailures): UnitsLoadPlan {
  const messages: Record<string, string> = {};
  const disabled: string[] = [];
  const blocked = new Set<string>();
  for (const s of UNITS_SURFACES) {
    const missing = s.needs.filter((f) => failures[f] !== undefined);
    if (!missing.length) continue;
    blocked.add(s.id);
    if (s.kind === 'control') {
      disabled.push(s.id);
      continue;
    }
    messages[s.id] = s.what + ' could not be shown: ' +
      missing.map((f) => {
        const failure = failures[f];
        return failure ? describe(f, failure) : f;
      }).join('; ') + '.';
  }
  const known = new Set<string>(UNITS_SURFACES.map((s) => s.id));
  return {
    can(id: UnitsSurfaceId): boolean {
      if (!known.has(id)) throw new Error('unitsLoadPlan does not list an element with id "' + id + '"');
      return !blocked.has(id);
    },
    messages,
    disabled
  };
}

function field(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined;
}
function isRecord(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/* Every field the page's renderers read at the top of each file, with what
   it must be and the phrase a reader is shown when it is not. Review 2 of
   P21 found the first version checked `regions` and `tested_region_counts`
   only, so a regions file without `model.state_names` still threw in the
   map renderer before any message was written. What this does not check:
   the contents of each entry (a county's population, a region's states);
   an entry malformed inside a well-formed list can still throw. */
const REQUIRED: Record<UnitsFile, readonly [path: readonly string[], ok: (v: unknown) => boolean, says: string][]> = {
  'counties.json': [[['counties'], Array.isArray, 'no county list']],
  'us-states.json': [[['features'], Array.isArray, 'no state outlines']],
  'hospital-regions.json': [
    [['regions'], Array.isArray, 'no region list'],
    [['model', 'state_names'], isRecord, 'no state name table'],
    [['model', 'state_adjacency'], isRecord, 'no state adjacency table'],
    [['model', 'tested_region_counts'], Array.isArray, 'no scored region counts'],
    [['model', 'selected_region_count'], (v) => typeof v === 'number', 'no selected region count']
  ]
};

/** What is wrong with a file that did arrive, or null when it has every
    field the page reads. */
export function unitsFileProblem(file: UnitsFile, value: unknown): string | null {
  /* an empty body says so, rather than listing every field it lacks */
  if (value === null || typeof value !== 'object') return 'the file holds no data';
  const missing = REQUIRED[file]
    .filter(([path, ok]) => !ok(path.reduce<unknown>((v, key) => field(v, key), value)))
    .map(([, , says]) => says);
  return missing.length ? 'the file holds ' + missing.join(', ') : null;
}

/** The failures to plan from, given what each fetch settled to, in
    UNITS_FILES order: a request that failed, and a file that arrived in a
    shape the page cannot read. */
export function unitsFailures(results: readonly PromiseSettledResult<unknown>[]): UnitsFailures {
  const failures: UnitsFailures = {};
  UNITS_FILES.forEach(function (file, i) {
    const r = results[i];
    if (!r) failures[file] = { kind: 'not loaded', reason: 'no request was made' };
    else if (r.status === 'rejected') failures[file] = { kind: 'not loaded', reason: loadFailureReason(file, r.reason) };
    else {
      const problem = unitsFileProblem(file, r.value);
      if (problem !== null) failures[file] = { kind: 'unreadable', reason: problem };
    }
  });
  return failures;
}

/** What one fetch delivered, if nothing recorded a failure for its file. */
export function usableFile(results: readonly PromiseSettledResult<unknown>[], failures: UnitsFailures,
  file: UnitsFile): unknown {
  const r = results[UNITS_FILES.indexOf(file)];
  return failures[file] === undefined && r && r.status === 'fulfilled' ? r.value : null;
}

/** A fetch's rejection, reduced to what a reader can use: the status for a
    response the client refused ("counties.json 404" becomes "404"), and the
    browser's own words for a request that never completed. */
export function loadFailureReason(file: UnitsFile, reason: unknown): string {
  if (reason === undefined || reason === null) return 'unknown error';
  const text = reason instanceof Error ? reason.message : String(reason);
  return text.startsWith(file + ' ') ? text.slice(file.length + 1) : text;
}
