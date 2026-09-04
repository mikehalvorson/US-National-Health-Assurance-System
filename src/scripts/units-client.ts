/* Physical Care tab client. Ports docs/js/unitsmap.js (Albers composite US
   projection + county dot map), docs/js/hospitalregions.js (13-region
   administration map, controls, scores) and docs/js/unitsapp.js (need-based
   county unit allocation, verdict, type cards, state table, integrity).
   The acronym decoration this file used to port is gone: one glossary and
   one decorator, site-wide, in src/lib/acronyms.ts and
   src/scripts/acronyms-client.ts. Data is fetched from public/data at the
   configured base path rather than reproduced into a module. init on
   astro:page-load; idempotent via #units-map dataset.wired; module state is
   reset on init for View-Transition safety. */
import { el, div, showTip, hideTip, tipRow } from '../lib/chart-util';
import { PARAMS_BY_ID } from '../lib/params';
import {
  allocateCounty, NETWORK_ABSORPTION, networkCost, UNIT_TYPE_KEYS, UNIT_TYPES,
  unitsCostComparison,
  type AllocationTotals, type NetworkCost, type UnitCounts
} from '../lib/units';
import {
  assignRegionColors, regionAdjacency, regionAssignmentFaults, scoreBarFraction,
  type Region, type RegionsData
} from '../lib/hospital-regions';

const BASE = import.meta.env.BASE_URL;
function $(id: string): HTMLElement | null { return document.getElementById(id); }

/* ---- shared geo types ---- */
type Pt = number[];
type Poly = number[][][];
interface GeoFeature {
  properties?: { name?: string; NAME?: string; State?: string };
  geometry: { type: string; coordinates: Poly | Poly[] };
}
interface StatesGeo { features: GeoFeature[] }
type Projection = (lon: number, lat: number) => [number, number];

/* =========================================================================
 * US map projection (docs/js/unitsmap.js, verbatim)
 * ========================================================================= */
const RAD = Math.PI / 180;

/* Longitudes east of the antimeridian (western Aleutians, +178 etc.)
   normalize to the negative continuation so Alaska stays contiguous. */
function normLon(lon: number): number { return lon > 0 ? lon - 360 : lon; }

function albersRaw(p1: number, p2: number, lam0: number): Projection {
  const phi1 = p1 * RAD, phi2 = p2 * RAD, l0 = lam0 * RAD;
  const n = (Math.sin(phi1) + Math.sin(phi2)) / 2;
  const C = Math.cos(phi1) * Math.cos(phi1) + 2 * n * Math.sin(phi1);
  return function (lon: number, lat: number): [number, number] {
    const theta = n * (normLon(lon) * RAD - l0);
    const rho = Math.sqrt(Math.max(0, C - 2 * n * Math.sin(lat * RAD))) / n;
    /* +rho*cos(theta): screen y grows southward (SVG y-down), north on top */
    return [rho * Math.sin(theta), rho * Math.cos(theta)];
  };
}

interface Box { x: number; y: number; w: number; h: number }

/* Fit a raw projection to a pixel box using a set of [lon,lat] points */
function fitZone(raw: Projection, points: Pt[], box: Box): Projection {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  points.forEach(function (pt) {
    const xy = raw(pt[0], pt[1]);
    if (xy[0] < minX) minX = xy[0];
    if (xy[0] > maxX) maxX = xy[0];
    if (xy[1] < minY) minY = xy[1];
    if (xy[1] > maxY) maxY = xy[1];
  });
  const s = Math.min((box.w) / (maxX - minX), (box.h) / (maxY - minY));
  const ox = box.x + (box.w - s * (maxX - minX)) / 2 - s * minX;
  const oy = box.y + (box.h - s * (maxY - minY)) / 2 - s * minY;
  return function (lon: number, lat: number): [number, number] {
    const xy = raw(lon, lat);
    return [ox + s * xy[0], oy + s * xy[1]];
  };
}

function featurePoints(feature: GeoFeature): Pt[] {
  const pts: Pt[] = [];
  const g = feature.geometry;
  const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates) as Poly[];
  polys.forEach(function (poly) {
    poly.forEach(function (ring) {
      ring.forEach(function (pt) { pts.push(pt); });
    });
  });
  return pts;
}

function stateNameOf(f: GeoFeature): string {
  const p = f.properties || {};
  return p.name || p.NAME || p.State || '';
}

/* Build the composite projection from the states GeoJSON */
function buildUsProjection(statesGeo: StatesGeo, W: number, H: number): Projection {
  let lower: Pt[] = [], ak: Pt[] = [], hi: Pt[] = [];
  statesGeo.features.forEach(function (f) {
    const nm = stateNameOf(f);
    const pts = featurePoints(f);
    if (nm === 'Alaska') ak = ak.concat(pts);
    else if (nm === 'Hawaii') hi = hi.concat(pts);
    else lower = lower.concat(pts);
  });
  const main = fitZone(albersRaw(29.5, 45.5, -96), lower,
    { x: 8, y: 8, w: W - 16, h: H - 130 });
  const akP = fitZone(albersRaw(55, 65, -154), ak,
    { x: 12, y: H - 150, w: 200, h: 140 });
  const hiP = fitZone(albersRaw(19, 21, -157), hi,
    { x: 235, y: H - 105, w: 120, h: 95 });
  return function (lon: number, lat: number): [number, number] {
    const L = normLon(lon);
    if (lat > 50 && L < -125) return akP(lon, lat);
    if (lat < 25 && L < -150) return hiP(lon, lat);
    return main(lon, lat);
  };
}

/* ---- county unit map ---- */
type TypeColors = { a: string; b: string; c: string; d: string };

function renderUnitsMap(container: HTMLElement, statesGeo: StatesGeo,
    counties: County[], typeFilter: string, typeColors: TypeColors): void {
  container.innerHTML = '';
  const W = 960, H = 620;
  const proj = buildUsProjection(statesGeo, W, H);

  const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg units-map',
    role: 'img', 'aria-label': 'Map of proposed community diagnostic-treatment units by county' }, container);

  /* state boundaries */
  statesGeo.features.forEach(function (f) {
    const g = f.geometry;
    const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates) as Poly[];
    let d = '';
    polys.forEach(function (poly) {
      poly.forEach(function (ring) {
        ring.forEach(function (pt, i) {
          const xy = proj(pt[0], pt[1]);
          d += (i ? 'L' : 'M') + xy[0].toFixed(1) + ' ' + xy[1].toFixed(1);
        });
        d += 'Z';
      });
    });
    el('path', { d: d, class: 'map-state' }, svg);
  });

  /* county dots, biggest first so small ones stay hoverable */
  function countOf(c: County): number {
    if (typeFilter === 'all') return c.units!.total;
    return c.units![typeFilter as 'a' | 'b' | 'c' | 'd'];
  }
  let maxCount = 1;
  counties.forEach(function (c) { maxCount = Math.max(maxCount, countOf(c)); });
  const sorted = counties.slice().sort(function (x, y) { return countOf(y) - countOf(x); });

  function colorOf(c: County): string {
    if (typeFilter !== 'all') return typeColors[typeFilter as 'a' | 'b' | 'c' | 'd'];
    /* dominant type colors the dot in "all" view */
    const u = c.units!;
    let best: 'a' | 'b' | 'c' | 'd' = 'b', bv = u.b;
    if (u.a > bv) { best = 'a'; bv = u.a; }
    if (u.c > bv) { best = 'c'; bv = u.c; }
    if (u.d > bv) { best = 'd'; bv = u.d; }
    return typeColors[best];
  }

  sorted.forEach(function (c) {
    const n = countOf(c);
    if (n <= 0) return;
    const xy = proj(c.lo, c.la);
    if (!isFinite(xy[0]) || !isFinite(xy[1])) return;
    const rr = Math.max(1.1, 1.1 * Math.sqrt(n));
    const dot = el('circle', {
      cx: xy[0].toFixed(1), cy: xy[1].toFixed(1), r: Math.min(rr, 16).toFixed(1),
      fill: colorOf(c), 'fill-opacity': 0.55, class: 'map-dot', tabindex: -1
    }, svg);
    function tipIt(evt: PointerEvent): void {
      const box = document.createElement('div');
      div('tip-head', box).textContent = c.n + ', ' + c.s;
      tipRow(box, '', 'Population', c.p.toLocaleString('en-US') +
        ' (' + Math.round(c.r * 100) + '% rural)', false);
      tipRow(box, typeColors.a, 'Type A micro-units', String(c.units!.a), false);
      tipRow(box, typeColors.b, 'Type B neighborhood', String(c.units!.b), false);
      tipRow(box, typeColors.c, 'Type C rural enhanced', String(c.units!.c), false);
      tipRow(box, typeColors.d, 'Type D urban public-health', String(c.units!.d), false);
      tipRow(box, '', 'Total', String(c.units!.total), true);
      showTip(box, evt.clientX, evt.clientY);
    }
    dot.addEventListener('pointermove', tipIt as EventListener);
    dot.addEventListener('pointerleave', hideTip);
  });
}

/* =========================================================================
 * County unit allocation (docs/js/unitsapp.js, verbatim)
 * ========================================================================= */
interface County { f: string; n: string; s: string; p: number; r: number; la: number; lo: number; units?: UnitCounts }

/* R185 [§S9b]: UNIT_TYPES, the visit splits, the population thresholds and the
   absorption range used to be literals in this file, which meant they were
   unreachable at build time and unreadable by anything that had to agree with
   them. They are src/lib/units.ts now, with a confidence grade and a named
   owner apiece, and the allocation rules moved with them so the page and the
   build run the same code rather than two copies of it. */
let visitsPerCapita = NETWORK_ABSORPTION.default;

/* Code review [§S9b]: `Totals` and `UnitCounts` were declared here as
   well as in units.ts. One shape, one declaration. */
interface Allocated { totals: AllocationTotals; costs: NetworkCost }

const DATA: { counties: County[] | null; states: StatesGeo | null; regions: RegionsData | null; error: string | null } =
  { counties: null, states: null, regions: null, error: null };
let typeFilter = 'all';
let allocated: Allocated | null = null;

function allocate(): void {
  const totals: AllocationTotals = {
    a: 0, b: 0, c: 0, d: 0, total: 0, pop: 0,
    flooredAccess: 0, flooredLastResort: 0, visits: 0
  };
  DATA.counties!.forEach(function (c) {
    const out = allocateCounty(c, visitsPerCapita);
    c.units = out.units;
    totals.a += out.units.a; totals.b += out.units.b;
    totals.c += out.units.c; totals.d += out.units.d;
    totals.total += out.units.total; totals.pop += c.p;
    totals.visits += c.p * visitsPerCapita;
    totals.flooredAccess += out.flooredAccess;
    totals.flooredLastResort += out.flooredLastResort;
  });
  allocated = { totals: totals, costs: networkCost(totals) };
}

/* ---- renderers ---- */
function fmtB(x: number): string { return '$' + (x >= 10 ? Math.round(x) : x.toFixed(1)) + 'B'; }

function renderTypeCards(): void {
  const host = $('unit-type-cards');
  if (!host) return;
  host.innerHTML = '';
  UNIT_TYPE_KEYS.forEach(function (k) {
    const t = UNIT_TYPES[k];
    const n = allocated!.totals[k];
    const card = document.createElement('div');
    card.className = 'care-card';
    const title = document.createElement('div');
    title.className = 'care-title';
    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch'; swatch.style.background = t.color;
    swatch.style.marginRight = '7px';
    title.appendChild(swatch);
    title.appendChild(document.createTextNode(t.name));
    card.appendChild(title);

    const count = document.createElement('div');
    count.className = 'care-nha-val';
    count.style.color = 'var(--text-primary)';
    count.textContent = n.toLocaleString('en-US') + ' units';
    card.appendChild(count);

    const role = document.createElement('div');
    role.className = 'care-row-note'; role.style.marginTop = '6px';
    role.textContent = t.role;
    card.appendChild(role);

    const facts = document.createElement('div');
    facts.className = 'care-src'; facts.style.marginTop = '9px';
    facts.textContent =
      'Staffing: ' + t.staff + ' · Throughput: ~' +
      (t.throughput / 1000) + 'k visits/yr · Operating cost: $' +
      t.opMode + 'M/yr each ($' + t.opLo + '–' + t.opHi + 'M) · Build-out: $' +
      t.capital + 'M · National: ' + fmtB(allocated!.costs[k].op) + '/yr + ' +
      fmtB(allocated!.costs[k].capital) + ' capital';
    card.appendChild(facts);
    host.appendChild(card);
  });
}

/* R188 [§S9b]: the two numbers this tile puts side by side.
 *
 * The page has always printed its own bottom-up operating total against the
 * healthcare model's unit parameter, and both §BE7 and Part 1 read that as a
 * top-down / bottom-up disagreement. It is not one. The parameter prices the
 * controlled target; the bottom-up total prices the need-based count, which is
 * larger. Scale the same type mix down to the target and the two agree.
 *
 * The parameter's range is READ from params.ts rather than retyped here. §S9a
 * had to add a check because "$15-36B" was a hardcoded copy; a copy that is
 * derived does not need one. */
function unitsCostParam(): { low: number; high: number; mode: number } {
  const p = PARAMS_BY_ID['unitsCost'];
  return { low: p.low, high: p.high, mode: p.mode };
}

function renderVerdict(): void {
  const host = $('unit-verdict');
  if (!host) return;
  const t = allocated!.totals, c = allocated!.costs;
  const param = unitsCostParam();
  /* Code review [§S9b]: this recomputed the scaling inline while
     unitsCostComparison() did the same arithmetic in units.ts, and the
     self-test only ever exercised the units.ts path -- so the number a reader
     saw was not the number the build checked. Done-when clause 2 asks for the
     relationship "stated in one place". This is that one place. */
  const cmp = unitsCostComparison(t);
  const target = cmp.targetUnits;
  const atTarget = cmp.targetOp;
  host.innerHTML = '';
  const tiles = [
    { label: 'Total units, need-based', value: t.total.toLocaleString('en-US'),
      range: 'at ' + visitsPerCapita.toFixed(2) + ' network visits/person/yr' },
    /* Golden rule 2 [§S9b]: this label carried the plan's internal requirement
       identifier into rendered prose. The rule is site-wide and this page is
       outside narrativeCatalogCodes' five surfaces, so nothing caught it. */
    { label: "Plan's minimum", value: '≥ ' + target.toLocaleString('en-US'),
      range: t.total > target * 1.1
        ? 'the floor undercounts need by ~' + Math.round(100 * (t.total - target) / target) +
          '%; either build ~' + Math.round(t.total / 1000) + 'k or certify existing urgent-care/retail/FQHC sites into the network'
        : 'consistent with the need-based count at these assumptions' },
    { label: 'Network operating cost', value: fmtB(c.opTotal) + '/yr',
      range: fmtB(c.opTotalLo) + ' – ' + fmtB(c.opTotalHi) +
        ' for these ' + t.total.toLocaleString('en-US') + ' units' },
    { label: 'The same model at ' + (target / 1000) + 'k units',
      value: fmtB(atTarget) + '/yr',
      range: 'the healthcare model carries $' + param.low + '–' + param.high +
        'B for this network, centred on $' + param.mode +
        'B. The two price different counts, not different units.' },
    { label: 'One-time build-out', value: fmtB(c.capitalTotal),
      range: "part of the model's IT-and-infrastructure capital envelope" }
  ];
  tiles.forEach(function (it) {
    const tl = document.createElement('div'); tl.className = 'tile';
    const l = document.createElement('div'); l.className = 'label'; l.textContent = it.label;
    const v = document.createElement('div'); v.className = 'value'; v.textContent = it.value;
    const r = document.createElement('div'); r.className = 'range'; r.textContent = it.range;
    tl.appendChild(l); tl.appendChild(v); tl.appendChild(r);
    host.appendChild(tl);
  });
}

function typeColorsPlain(): TypeColors {
  /* SVG fill attributes take var() directly; read them from the unit model so
     a recoloured type recolours the map and the cards together. */
  return {
    a: UNIT_TYPES.a.color, b: UNIT_TYPES.b.color,
    c: UNIT_TYPES.c.color, d: UNIT_TYPES.d.color
  };
}

function renderMapUnits(): void {
  const host = $('units-map');
  /* R193 [§S9c]: the outlines are their own fetch now, so this can be reached
     with counties loaded and us-states.json missing. The caller writes the
     message; this just declines to draw. */
  if (!host || !DATA.states || !DATA.counties) return;
  renderUnitsMap(host, DATA.states, DATA.counties, typeFilter, typeColorsPlain());
}

function renderStateTable(): void {
  const tbl = $('units-state-table') as HTMLTableElement | null;
  if (!tbl) return;
  const byState: Record<string, { a: number; b: number; c: number; d: number; total: number; pop: number; st?: string }> = {};
  DATA.counties!.forEach(function (c) {
    const s = byState[c.s] || (byState[c.s] = { a: 0, b: 0, c: 0, d: 0, total: 0, pop: 0 });
    s.a += c.units!.a; s.b += c.units!.b; s.c += c.units!.c; s.d += c.units!.d;
    s.total += c.units!.total; s.pop += c.p;
  });
  const rows = Object.keys(byState).map(function (k) {
    const s = byState[k]; s.st = k; return s;
  }).sort(function (x, y) { return y.total - x.total; });

  tbl.innerHTML = '';
  const hd = tbl.insertRow();
  ['State', 'Population', 'Type A', 'Type B', 'Type C', 'Type D', 'Total',
   'People per unit'].forEach(function (h) {
    const th = document.createElement('th'); th.textContent = h; hd.appendChild(th);
  });
  rows.forEach(function (s) {
    const tr = tbl.insertRow();
    [s.st!, s.pop.toLocaleString('en-US'), s.a, s.b, s.c, s.d, s.total,
     Math.round(s.pop / s.total).toLocaleString('en-US')].forEach(function (v, i) {
      const cell = tr.insertCell();
      /* R70 [§S9c]: column 0 is 51 bare state codes, so PA and VA were being
         decorated here on every page view with the details open -- a second
         live vector on this page, and one no pass of the audit reached. */
      if (i === 0) stateCodeHost(cell);
      cell.textContent = String(v);
    });
  });
}

function renderIntegrity(): void {
  const host = $('units-integrity');
  if (!host) return;
  const n = DATA.counties!.length;
  const pop = allocated!.totals.pop;
  const allCovered = DATA.counties!.every(function (c) { return c.units!.total >= 1; });
  host.textContent =
    'Data integrity: ' + n.toLocaleString('en-US') + ' counties loaded · ' +
    (pop / 1e6).toFixed(1) + 'M people covered · every county has at least one unit: ' +
    (allCovered ? 'yes' : 'NO (bug)') + ' · ' +
    allocated!.totals.flooredAccess +
    ' counties reached only by the rural access floor, ' +
    allocated!.totals.flooredLastResort +
    ' only by the last-resort floor.';
}

function refreshUnits(): void {
  allocate();
  renderTypeCards();
  renderVerdict();
  renderMapUnits();
  renderStateTable();
  renderIntegrity();
}

/* ---- controls ---- */
function wireUnitControls(): void {
  const slider = $('units-vpc') as HTMLInputElement | null;
  const lab = $('units-vpc-val');
  if (slider && lab) {
    slider.addEventListener('input', function () {
      visitsPerCapita = parseFloat(slider.value);
      lab.textContent = visitsPerCapita.toFixed(2) + ' visits/person/yr';
      refreshUnits();
    });
    lab.textContent = visitsPerCapita.toFixed(2) + ' visits/person/yr';
  }

  document.querySelectorAll('#units-filter button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      typeFilter = (btn as HTMLElement).getAttribute('data-type') || 'all';
      document.querySelectorAll('#units-filter button').forEach(function (b) {
        (b as HTMLElement).className = b === btn ? 'active' : '';
      });
      renderMapUnits();
    });
  });
}

/* =========================================================================
 * Hospital administration regions (docs/js/hospitalregions.js, verbatim)
 * ========================================================================= */
let selectedId = 'R01';

/* R71/R190/R72/R191 [§S9c]: the name table and the colour list used to be
   literals here.

   The name table was 51 entries of `'Pennsylvania': 'PA'` maintained beside
   the identical table in tools/model_hospital_regions.py, and the render loop
   dropped any GeoJSON feature it could not find in it -- silently, under an
   SVG description telling screen readers that every state is drawn. The
   colour list was thirteen entries drawn from eight variables, applied by
   array index, with no notion of which regions share a border.

   Both now come from the model file, which the model tool emits: one name
   table, one adjacency graph, and a colouring computed from it. */
function stateToAbbr(model: RegionsData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const abbr of Object.keys(model.model.state_names)) {
    out[model.model.state_names[abbr]] = abbr;
  }
  return out;
}

function featurePath(feature: GeoFeature, projection: Projection): string {
  const geometry = feature.geometry;
  const polygons = (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates) as Poly[];
  let path = '';
  polygons.forEach(function (polygon) {
    polygon.forEach(function (ring) {
      ring.forEach(function (point, index) {
        const xy = projection(point[0], point[1]);
        path += (index ? 'L' : 'M') + xy[0].toFixed(1) + ' ' + xy[1].toFixed(1);
      });
      path += 'Z';
    });
  });
  return path;
}
function formatPopulation(value: number): string {
  return (value / 1000000).toFixed(1) + ' million';
}
function regionById(id: string): Region | undefined {
  return DATA.regions!.regions.filter(function (region) { return region.id === id; })[0];
}

function updateSelection(id: string): void {
  selectedId = id;
  const region = regionById(id);
  if (!region) return;
  const select = $('hospital-region-select') as HTMLSelectElement | null;
  if (select && select.value !== id) select.value = id;
  document.querySelectorAll('.hospital-map-state').forEach(function (path) {
    path.classList.toggle('is-selected', path.getAttribute('data-region') === id);
  });
  const detail = $('hospital-region-detail');
  if (!detail) return;
  detail.innerHTML = '';
  const head = document.createElement('strong');
  head.textContent = region.id + ' ' + region.name;
  detail.appendChild(head);
  detail.appendChild(document.createTextNode(' · '));
  /* R70 [§S9c]: the state codes go in their own marked span rather than the
     whole line, so the rest of the sentence still gets its hovers. */
  const states = stateCodeHost(document.createElement('span'));
  states.textContent = region.states.join(', ');
  detail.appendChild(states);
  detail.appendChild(document.createTextNode(
    ' · ' + formatPopulation(region.population) +
    ' · ' + Math.round(region.rural_share * 100) + '% rural' +
    /* R11 is the multi-state case and R09 the single-state one; the model
       writes 0 miles for a single-state region rather than omitting the
       field, so this reads a 0 as "no distance to average" and both the
       missing and the zero case land on the same sentence. */
    (region.mean_state_centroid_miles
      ? ' · mean state-centroid distance ' +
        region.mean_state_centroid_miles.toLocaleString('en-US') + ' miles'
      : ' · single-state region')
  ));
}

function renderRegionMap(): void {
  const container = $('hospital-region-map');
  if (!container) return;
  container.innerHTML = '';
  const width = 960, height = 610;
  const model = DATA.regions!;
  const projection = buildUsProjection(DATA.states!, width, height);
  const abbrOf = stateToAbbr(model);
  const regionForState: Record<string, Region> = {};
  model.regions.forEach(function (region) {
    region.states.forEach(function (state) { regionForState[state] = region; });
  });

  /* R72/R191 [§S9c]: adjacency-aware, so no two regions that share a border
     share a fill and dissolve into one shape on a map whose only job is
     showing where the borders are. */
  const colorForRegion = assignRegionColors(
    model.regions, regionAdjacency(model.regions, model.model.state_adjacency));

  /* R71/R190 [§S9c]: measured before the loop, not discovered inside it.
     `if (!region) return;` used to drop an unresolvable feature and carry on
     under a description asserting that every state is drawn. */
  const featureNames = DATA.states!.features.map(stateNameOf);
  const faults = regionAssignmentFaults(
    model.regions, model.model.state_names, featureNames);
  /* Code review [§S9c]: read once. The same 51-entry key walk appeared
     four times in this function. */
  const jurisdictions = Object.keys(model.model.state_names).length;

  const svg = el('svg', {
    viewBox: '0 0 ' + width + ' ' + height,
    class: 'chart-svg hospital-region-map',
    role: 'img',
    'aria-labelledby': 'hospital-region-map-title hospital-region-map-desc'
  }, container);
  const title = el('title', { id: 'hospital-region-map-title' }, svg);
  title.textContent = model.regions.length +
    ' proposed nonprofit hospital administration regions';
  const desc = el('desc', { id: 'hospital-region-map-desc' }, svg);
  /* The description states what was drawn. It used to state what was intended,
     which is the same sentence exactly as long as nothing has gone wrong. */
  desc.textContent = faults.length
    ? jurisdictions + ' state-level jurisdictions were expected; ' +
      faults.length + ' could not be placed and are missing from this map: ' +
      faults.map(function (f) { return f.state + ' ' + f.problem; }).join('; ') +
      '. Hover or focus a state for its region, population, and rural share.'
    : jurisdictions +
      ' state-level jurisdictions, the fifty states and the District of Columbia, each assigned to exactly one region and each drawn once. ' +
      'Hover or focus a state for its region, population, and rural share.';

  DATA.states!.features.forEach(function (feature) {
    const name = stateNameOf(feature);
    const abbreviation = abbrOf[name];
    const region = regionForState[abbreviation];
    /* Still skips, because there is nothing to draw -- but the skip is now
       counted above and reported below, so absence is never silent. */
    if (!region) return;
    const path = el('path', {
      d: featurePath(feature, projection),
      class: 'hospital-map-state' + (region.id === selectedId ? ' is-selected' : ''),
      fill: colorForRegion.get(region.id)!,
      'fill-opacity': '0.52',
      tabindex: '0',
      'data-region': region.id,
      'aria-label': name + ', ' + region.name + ' hospital administration region'
    }, svg);
    function showRegionTip(event: PointerEvent): void {
      const box = document.createElement('div');
      div('tip-head', box).textContent = region.id + ' · ' + region.name;
      /* R70 [§S9c]: marked for the same reason as the detail line. The
         tooltip host currently sits outside <main>, so no decorator reaches
         it today; that is a fact about where one element is appended, not a
         property anything holds, and this costs one attribute. */
      const states = stateCodeHost(div('tip-row', box));
      states.textContent = region.states.join(', ');
      const metrics = div('tip-row', box);
      metrics.textContent = formatPopulation(region.population) +
        ' · ' + Math.round(region.rural_share * 100) + '% rural';
      showTip(box, event.clientX || 20, event.clientY || 20);
    }
    path.addEventListener('pointermove', showRegionTip as EventListener);
    path.addEventListener('pointerleave', hideTip);
    path.addEventListener('focus', function () {
      updateSelection(region.id);
    });
    path.addEventListener('blur', hideTip);
    path.addEventListener('click', function () {
      updateSelection(region.id);
    });
  });

  model.regions.forEach(function (region) {
    const point = projection(region.centroid[0], region.centroid[1]);
    const label = el('text', {
      x: point[0].toFixed(1),
      y: point[1].toFixed(1),
      class: 'hospital-map-label',
      'aria-hidden': 'true'
    }, svg);
    label.textContent = region.id.replace('R', '');
  });

  /* R71/R190 [§S9c]: and a sighted reader is told too. A screen-reader-only
     correction would leave the map looking complete to everyone else. */
  const note = $('hospital-region-integrity');
  if (note) {
    note.textContent = faults.length
      ? 'Map integrity: ' + faults.length + ' of ' +
        jurisdictions +
        ' states could not be placed and are missing from the map above (' +
        faults.map(function (f) { return f.state + ' ' + f.problem; }).join('; ') + ').'
      : 'Map integrity: all ' + jurisdictions +
        ' state-level jurisdictions are assigned to exactly one of the ' +
        model.regions.length + ' regions and drawn exactly once, checked against the ' +
        featureNames.length + ' outlines on this map. No two regions that share a border share a color.';
    /* the shared warning style, so a fault is not a grey footnote */
    note.className = faults.length ? 'note warnbox' : 'note';
  }
}

function renderRegionControls(): void {
  const select = $('hospital-region-select') as HTMLSelectElement | null;
  if (!select) return;
  select.innerHTML = '';
  DATA.regions!.regions.forEach(function (region) {
    const option = document.createElement('option');
    option.value = region.id;
    option.textContent = region.id + ' · ' + region.name;
    select.appendChild(option);
  });
  select.addEventListener('change', function () {
    updateSelection(select.value);
  });
  updateSelection(selectedId);
}

/* R192 [§S9c]: the bar used to be proportional to the composite score, and
 * the composite score is lower-is-better -- so the winning candidate drew the
 * shortest bar and read, at a glance, as the worst of the seven. The caption
 * said "lower is better" and the aria-label stated the score correctly, which
 * makes the chart labelled and still backwards: taller-means-more is a
 * stronger convention than a caption.
 *
 * The bar now encodes advantage over the worst candidate, so the best option
 * is the tallest. The printed number stays the raw score, because that is the
 * figure the methodology publishes and a reader may want to compare. */
const SCORE_BAR_MAX_PX = 49;
const SCORE_BAR_MIN_PX = 7;

function renderScores(): void {
  const host = $('hospital-region-scores');
  if (!host) return;
  host.innerHTML = '';
  const model = DATA.regions!.model;
  const tested = model.tested_region_counts;
  /* the stylesheet lays this out as seven columns because the model happens
     to score seven candidate counts; drive it from the data so scoring an
     eighth does not silently overflow the row. */
  host.style.gridTemplateColumns = 'repeat(' + tested.length + ', minmax(0, 1fr))';
  const worst = Math.max.apply(null, tested.map(function (row) { return row.total; }));
  const best = Math.min.apply(null, tested.map(function (row) { return row.total; }));
  tested.forEach(function (row) {
    const selected = row.regions === model.selected_region_count;
    const cell = document.createElement('div');
    cell.className = 'hospital-score' + (selected ? ' is-selected' : '');
    cell.setAttribute(
      'aria-label',
      row.regions + ' regions, composite score ' + row.total.toFixed(3) +
      ' where lower is better' + (selected ? ', selected' : '')
    );
    const value = document.createElement('span');
    value.textContent = row.total.toFixed(3);
    const bar = document.createElement('span');
    bar.className = 'hospital-score-bar';
    /* the best candidate fills the axis, the worst sits at the floor */
    bar.style.height = Math.round(SCORE_BAR_MIN_PX +
      (SCORE_BAR_MAX_PX - SCORE_BAR_MIN_PX) *
      scoreBarFraction(row.total, best, worst)) + 'px';
    const label = document.createElement('span');
    label.textContent = String(row.regions);
    cell.appendChild(value);
    cell.appendChild(bar);
    cell.appendChild(label);
    host.appendChild(cell);
  });
}

/* =========================================================================
 * State codes are not acronyms
 * ========================================================================= */
/* R70 [§S9c] + code review: this module used to carry its own 17-entry
 * acronym glossary and its own decorator, ported from
 * docs/js/hospitalregions.js. Both are gone.
 *
 * Sixteen of the seventeen keys duplicated src/lib/acronyms.ts, which
 * src/scripts/acronyms-client.ts already applies to every page under a
 * MutationObserver -- so this module's decorator was re-doing work that had
 * already happened, 200ms earlier, on the same nodes. The seventeenth, IV,
 * moved into the site-wide glossary, which is what that file's own header
 * says to do with a tab-local entry.
 *
 * It also mattered for R70. `stateAcronymCollisions` pins the set of glossary
 * keys that collide with US state abbreviations, and it reads
 * src/lib/acronyms.ts -- so a second glossary here sat outside the tripwire,
 * and a future `'OR': 'Operating room'` added to it would not have failed the
 * build. One glossary, one decorator, one pin.
 *
 * What stays is the part that fixes the live bug: the containers rendering
 * bare state codes mark themselves, and the site-wide decorator skips them.
 */

/* The attribute src/scripts/acronyms-client.ts honours in its skip list.
 * Marking a container with it is what actually closes R70, and the reason it
 * is needed is worth stating plainly:
 *
 * the site-wide glossary defined `PA` as "Physician assistant" and defines
 * `VA` as "Department of Veterans Affairs", and acronyms-client.ts runs a
 * MutationObserver over <main> -- so it decorates anything this file renders,
 * 200ms after it renders it. The audit downgraded the Pennsylvania collision
 * to latent on the grounds that decoration ran once at init against a region
 * whose states do not collide. With that observer in place it was not latent:
 * select R11 and the detail line came back with PA and VA wrapped, aria-label
 * and all, which reads them out to a screen reader as job titles.
 *
 * R307 [S13] then removed `PA` from the glossary outright, because nothing on
 * the site ever wrote the role as `PA`. `VA` stays and is real prose
 * elsewhere, so containment is still what protects this page.
 *
 * So the containers that render bare state codes declare themselves. The
 * decorator respects the declaration, and so will the next one. */
const ACRONYM_SAFE = 'data-no-acronyms';

/* Marks an element as state codes rather than prose, and returns it. */
function stateCodeHost<T extends HTMLElement>(node: T): T {
  node.setAttribute(ACRONYM_SAFE, '');
  return node;
}

/* =========================================================================
 * boot
 * ========================================================================= */
function initUnits(): void {
  const guard = $('units-map');
  if (!guard) return; /* not on the units page */
  if (guard.dataset.wired === '1') return;
  guard.dataset.wired = '1';

  /* reset module state for a fresh page instance (View-Transition safe) */
  visitsPerCapita = NETWORK_ABSORPTION.default;
  typeFilter = 'all';
  selectedId = 'R01';
  allocated = null;
  DATA.counties = null; DATA.states = null; DATA.regions = null; DATA.error = null;

  /* R193 [§S9c]: three files, two independent sections, and it used to be one
   * Promise.all with one .catch that wrote the same error into both maps. A
   * 404 on hospital-regions.json destroyed the county map even though
   * counties.json had loaded fine, and vice versa.
   *
   * allSettled, and each section renders if the files it actually needs
   * arrived. The two maps share us-states.json -- that one failing does take
   * both down, correctly, because neither can be drawn without the outlines,
   * and the message says which file it was. */
  async function grab(name: string): Promise<unknown> {
    const r = await fetch(BASE + 'data/' + name);
    if (!r.ok) throw new Error(name + ' ' + r.status);
    return r.json();
  }
  const NAMES = ['counties.json', 'us-states.json', 'hospital-regions.json'];

  Promise.allSettled(NAMES.map(grab)).then(function (res) {
    const failed: string[] = [];
    res.forEach(function (r, i) {
      if (r.status === 'rejected') failed.push(NAMES[i] + ' (' + String(r.reason) + ')');
    });
    DATA.error = failed.length ? failed.join('; ') : null;

    /* R92 [§S9c]: counties.json declares its own vintages now, so it is an
       object with a `counties` array rather than a bare array. */
    const countyFile = res[0].status === 'fulfilled'
      ? res[0].value as { meta: unknown; counties: County[] } : null;
    const counties = countyFile ? countyFile.counties : null;
    const states = res[1].status === 'fulfilled' ? res[1].value as StatesGeo : null;
    const regions = res[2].status === 'fulfilled' ? res[2].value as RegionsData : null;
    if (counties) {
      DATA.counties = counties.map(function (c) {
        return { f: c.f, n: c.n, s: c.s, p: c.p, r: c.r, la: c.la, lo: c.lo };
      });
    }
    DATA.states = states;
    DATA.regions = regions;

    /* county unit network: needs counties, and needs the outlines only for
       the dot map, so the verdict, the type cards and the state table survive
       a missing us-states.json. */
    if (counties) {
      wireUnitControls();
      refreshUnits();
    }
    if (!counties || !states) {
      const host = $('units-map');
      if (host) host.textContent = 'The county map could not be drawn: ' +
        (failed.join('; ') || 'data missing') + '.';
    }

    /* hospital administration regions */
    if (regions && states) {
      renderRegionMap();
      renderRegionControls();
      renderScores();
    } else {
      const rhost = $('hospital-region-map');
      if (rhost) rhost.textContent = 'The region map could not be drawn: ' +
        (failed.join('; ') || 'data missing') + '.';
      /* the score chart does not need the outlines */
      if (regions) {
        renderRegionControls();
        renderScores();
      }
    }
  });
}

/* Also init on first load without waiting for astro:page-load: if this module
   finishes evaluating after ClientRouter fired that event, the listener alone
   would miss it and leave the page blank (see quality-client.ts). initUnits is
   idempotent via dataset.wired. */
document.addEventListener('astro:page-load', initUnits);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUnits);
} else {
  initUnits();
}
