/* Physical Care tab client. Ports docs/js/unitsmap.js (Albers composite US
   projection + county dot map), docs/js/hospitalregions.js (13-region
   administration map, controls, scores, acronym decoration), and
   docs/js/unitsapp.js (need-based county unit allocation, verdict, type
   cards, state table, integrity). Data is fetched from public/data at the
   configured base path rather than reproduced into a module. init on
   astro:page-load; idempotent via #units-map dataset.wired; module state is
   reset on init for View-Transition safety. */
import { el, div, showTip, hideTip, tipRow } from '../lib/chart-util';

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
interface UnitCounts { a: number; b: number; c: number; d: number; total: number }
interface County { f: string; n: string; s: string; p: number; r: number; la: number; lo: number; units?: UnitCounts }
interface UnitType {
  key: string; name: string; color: string;
  opLo: number; opMode: number; opHi: number; capital: number;
  throughput: number; staff: string; role: string;
}

const UNIT_TYPES: Record<'a' | 'b' | 'c' | 'd', UnitType> = {
  a: { key: 'a', name: 'Type A: Micro-unit',
    color: 'var(--series-2)',
    opLo: 0.30, opMode: 0.45, opHi: 0.65, capital: 0.25,
    throughput: 15000, staff: '2–3 (nurse/tech + teleclinician link)',
    role: 'Sits inside pharmacies, groceries, schools, workplaces, and transit hubs. Vitals, point-of-care tests, vaccinations, prescription refills, screening, and a teleclinician on screen for anything ambiguous.' },
  b: { key: 'b', name: 'Type B: Neighborhood unit',
    color: 'var(--series-1)',
    opLo: 1.2, opMode: 1.6, opHi: 2.2, capital: 1.8,
    throughput: 30000, staff: '~10 (physician or senior NP/PA lead, nurses, techs)',
    role: 'The default urgent-care replacement and the network\'s workhorse: ECG, basic labs, X-ray, splinting, common procedures, uncomplicated respiratory/ENT/UTI/skin/musculoskeletal care, chronic-disease measurement and follow-up.' },
  c: { key: 'c', name: 'Type C: Rural enhanced unit',
    color: 'var(--series-3)',
    opLo: 2.0, opMode: 2.6, opHi: 3.5, capital: 3.5,
    throughput: 12000, staff: '~14 (adds observation nursing, ultrasound, EMS liaison)',
    role: 'Everything Type B does, plus tele-specialty, longer observation, point-of-care ultrasound, limited IV therapy, EMS coordination, maternal and pediatric triage, and mobile outreach. Built to hold a patient safely when the nearest hospital is an hour away.' },
  d: { key: 'd', name: 'Type D: Urban public-health unit',
    color: 'var(--series-6)',
    opLo: 2.5, opMode: 3.4, opHi: 4.5, capital: 4.5,
    throughput: 40000, staff: '~20 (adds behavioral-health and public-health staff)',
    role: 'High-volume urban front door: respiratory surge capacity, vaccines, STI and reproductive services, behavioral-health touchpoints, addiction-care linkage, wound care, heat/smoke/climate response, and neighborhood outreach.' }
};

let visitsPerCapita = 1.5;

interface Totals { a: number; b: number; c: number; d: number; total: number; pop: number; floored: number }
interface CostRow { op: number; opLo: number; opHi: number; capital: number }
interface Costs {
  a: CostRow; b: CostRow; c: CostRow; d: CostRow;
  opTotal: number; opTotalLo: number; opTotalHi: number; capitalTotal: number;
}
interface Allocated { totals: Totals; costs: Costs }

const DATA: { counties: County[] | null; states: StatesGeo | null; regions: RegionsData | null; error: string | null } =
  { counties: null, states: null, regions: null, error: null };
let typeFilter = 'all';
let allocated: Allocated | null = null;

function allocate(): void {
  const T = UNIT_TYPES;
  const totals: Totals = { a: 0, b: 0, c: 0, d: 0, total: 0, pop: 0, floored: 0 };
  DATA.counties!.forEach(function (c) {
    const urbanPop = c.p * (1 - c.r), ruralPop = c.p * c.r;
    const uv = urbanPop * visitsPerCapita, rv = ruralPop * visitsPerCapita;

    let a = uv * 0.28 / T.a.throughput;
    const dRaw = uv * 0.15;
    let d = 0, bExtra = 0;
    if (urbanPop >= 200000) d = dRaw / T.d.throughput;
    else bExtra = dRaw; /* small-city D demand folds into B */
    let b = (uv * 0.57 + bExtra + rv * 0.30) / T.b.throughput;
    let cc = rv * 0.70 / T.c.throughput;

    a = Math.round(a); b = Math.round(b); cc = Math.round(cc); d = Math.round(d);

    /* rural access floor: majority-rural or small counties keep a C */
    if ((c.r >= 0.5 || c.p < 20000) && ruralPop > 0 && cc === 0) { cc = 1; totals.floored++; }
    /* every county gets at least one unit of its dominant character */
    if (a + b + cc + d === 0) {
      if (c.r >= 0.5) cc = 1; else b = 1;
      totals.floored++;
    }
    c.units = { a: a, b: b, c: cc, d: d, total: a + b + cc + d };
    totals.a += a; totals.b += b; totals.c += cc; totals.d += d;
    totals.total += c.units.total; totals.pop += c.p;
  });

  const costs = {} as Costs;
  (['a', 'b', 'c', 'd'] as const).forEach(function (k) {
    costs[k] = {
      op: totals[k] * T[k].opMode / 1000,       /* $B/yr */
      opLo: totals[k] * T[k].opLo / 1000,
      opHi: totals[k] * T[k].opHi / 1000,
      capital: totals[k] * T[k].capital / 1000  /* $B one-time */
    };
  });
  costs.opTotal = costs.a.op + costs.b.op + costs.c.op + costs.d.op;
  costs.opTotalLo = costs.a.opLo + costs.b.opLo + costs.c.opLo + costs.d.opLo;
  costs.opTotalHi = costs.a.opHi + costs.b.opHi + costs.c.opHi + costs.d.opHi;
  costs.capitalTotal = costs.a.capital + costs.b.capital + costs.c.capital + costs.d.capital;

  allocated = { totals: totals, costs: costs };
}

/* ---- renderers ---- */
function fmtB(x: number): string { return '$' + (x >= 10 ? Math.round(x) : x.toFixed(1)) + 'B'; }

function renderTypeCards(): void {
  const host = $('unit-type-cards');
  if (!host) return;
  host.innerHTML = '';
  (['a', 'b', 'c', 'd'] as const).forEach(function (k) {
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

function renderVerdict(): void {
  const host = $('unit-verdict');
  if (!host) return;
  const t = allocated!.totals, c = allocated!.costs;
  host.innerHTML = '';
  const tiles = [
    { label: 'Total units, need-based', value: t.total.toLocaleString('en-US'),
      range: 'at ' + visitsPerCapita.toFixed(2) + ' network visits/person/yr' },
    { label: "Plan's minimum (SR-ACC-010)", value: '≥ 15,000',
      range: t.total > 16500
        ? 'the floor undercounts need by ~' + Math.round(100 * (t.total - 15000) / 15000) +
          '%; either build ~' + Math.round(t.total / 1000) + 'k or certify existing urgent-care/retail/FQHC sites into the network'
        : 'consistent with the need-based count at these assumptions' },
    { label: 'Network operating cost', value: fmtB(c.opTotal) + '/yr',
      range: fmtB(c.opTotalLo) + ' – ' + fmtB(c.opTotalHi) +
        ' · healthcare model\'s parameter covers $15–36B' },
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
  /* resolve CSS variables for SVG fills (SVG attr can use var(), but
     resolve anyway for safety in older browsers) */
  return { a: 'var(--series-2)', b: 'var(--series-1)',
           c: 'var(--series-3)', d: 'var(--series-6)' };
}

function renderMapUnits(): void {
  const host = $('units-map');
  if (!host) return;
  renderUnitsMap(host, DATA.states!, DATA.counties!, typeFilter, typeColorsPlain());
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
     Math.round(s.pop / s.total).toLocaleString('en-US')].forEach(function (v) {
      tr.insertCell().textContent = String(v);
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
    (allCovered ? 'yes' : 'NO (bug)') + ' · ' + allocated!.totals.floored +
    ' counties reached only by the rural access floor.';
}

function refreshUnits(): void {
  allocate();
  renderTypeCards();
  renderVerdict();
  renderMapUnits();
  renderStateTable();
  renderIntegrity();
  decorateAcronyms(mainEl());
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
interface Region {
  id: string; name: string; states: string[]; population: number;
  rural_share: number; centroid: number[]; mean_state_centroid_miles?: number;
}
interface RegionsData {
  regions: Region[];
  model: { tested_region_counts: { regions: number; total: number }[]; selected_region_count: number };
}

let selectedId = 'R01';

const STATE_TO_ABBR: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'District of Columbia': 'DC', 'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI',
  'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME',
  'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
  'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE',
  'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM',
  'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX',
  'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA',
  'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

const REGION_COLORS = [
  'var(--series-1)', 'var(--series-6)', 'var(--series-3)',
  'var(--series-2)', 'var(--series-5)', 'var(--series-1)',
  'var(--series-8)', 'var(--series-4)', 'var(--series-6)',
  'var(--series-2)', 'var(--series-5)', 'var(--series-7)',
  'var(--series-3)'
];

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
  detail.appendChild(document.createTextNode(
    ' · ' + region.states.join(', ') +
    ' · ' + formatPopulation(region.population) +
    ' · ' + Math.round(region.rural_share * 100) + '% rural' +
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
  const projection = buildUsProjection(DATA.states!, width, height);
  const regionForState: Record<string, Region> = {};
  const colorForRegion: Record<string, string> = {};
  DATA.regions!.regions.forEach(function (region, index) {
    colorForRegion[region.id] = REGION_COLORS[index % REGION_COLORS.length];
    region.states.forEach(function (state) { regionForState[state] = region; });
  });

  const svg = el('svg', {
    viewBox: '0 0 ' + width + ' ' + height,
    class: 'chart-svg hospital-region-map',
    role: 'img',
    'aria-labelledby': 'hospital-region-map-title hospital-region-map-desc'
  }, container);
  const title = el('title', { id: 'hospital-region-map-title' }, svg);
  title.textContent = 'Thirteen proposed nonprofit hospital administration regions';
  const desc = el('desc', { id: 'hospital-region-map-desc' }, svg);
  desc.textContent =
    'Every state and the District of Columbia is assigned once. Hover or focus a state for its region, population, and rural share.';

  DATA.states!.features.forEach(function (feature) {
    const name = stateNameOf(feature);
    const abbreviation = STATE_TO_ABBR[name];
    const region = regionForState[abbreviation];
    if (!region) return;
    const path = el('path', {
      d: featurePath(feature, projection),
      class: 'hospital-map-state' + (region.id === selectedId ? ' is-selected' : ''),
      fill: colorForRegion[region.id],
      'fill-opacity': '0.52',
      tabindex: '0',
      'data-region': region.id,
      'aria-label': name + ', ' + region.name + ' hospital administration region'
    }, svg);
    function showRegionTip(event: PointerEvent): void {
      const box = document.createElement('div');
      div('tip-head', box).textContent = region.id + ' · ' + region.name;
      const states = div('tip-row', box);
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

  DATA.regions!.regions.forEach(function (region) {
    const point = projection(region.centroid[0], region.centroid[1]);
    const label = el('text', {
      x: point[0].toFixed(1),
      y: point[1].toFixed(1),
      class: 'hospital-map-label',
      'aria-hidden': 'true'
    }, svg);
    label.textContent = region.id.replace('R', '');
  });
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

function renderScores(): void {
  const host = $('hospital-region-scores');
  if (!host) return;
  host.innerHTML = '';
  const tested = DATA.regions!.model.tested_region_counts;
  const max = Math.max.apply(null, tested.map(function (row) { return row.total; }));
  tested.forEach(function (row) {
    const cell = document.createElement('div');
    cell.className = 'hospital-score' +
      (row.regions === DATA.regions!.model.selected_region_count ? ' is-selected' : '');
    cell.setAttribute(
      'aria-label',
      row.regions + ' regions, composite score ' + row.total.toFixed(3) +
      (row.regions === DATA.regions!.model.selected_region_count ? ', selected' : '')
    );
    const value = document.createElement('span');
    value.textContent = row.total.toFixed(3);
    const bar = document.createElement('span');
    bar.className = 'hospital-score-bar';
    bar.style.height = Math.max(7, Math.round(49 * row.total / max)) + 'px';
    const label = document.createElement('span');
    label.textContent = String(row.regions);
    cell.appendChild(value);
    cell.appendChild(bar);
    cell.appendChild(label);
    host.appendChild(cell);
  });
}

/* =========================================================================
 * Acronym decoration (docs/js/hospitalregions.js, verbatim)
 * ========================================================================= */
const ACRONYMS: Record<string, string> = {
  'CMS': 'Centers for Medicare & Medicaid Services',
  'DOJ': 'Department of Justice',
  'ECG': 'Electrocardiogram',
  'ED': 'Emergency department',
  'EMS': 'Emergency medical services',
  'ENT': 'Ear, nose, and throat',
  'FQHC': 'Federally Qualified Health Center',
  'FTC': 'Federal Trade Commission',
  'HHS': 'Department of Health and Human Services',
  'ICU': 'Intensive care unit',
  'IV': 'Intravenous',
  'NHSA': 'National Hospital Stewardship Authority',
  'NP': 'Nurse practitioner',
  'PA': 'Physician assistant',
  'RHA': 'Regional Health Administrators',
  'STI': 'Sexually transmitted infection',
  'UTI': 'Urinary tract infection',
  'VHA': 'Veterans Health Administration'
};
const acronymPattern = new RegExp('\\b(' + Object.keys(ACRONYMS).join('|') + ')\\b', 'g');
let decorating = false;

function decorateAcronyms(root: HTMLElement | null): void {
  if (!root || decorating) return;
  decorating = true;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent || parent.closest('abbr, script, style, option') || !acronymPattern.test(node.nodeValue || '')) {
      acronymPattern.lastIndex = 0;
      continue;
    }
    acronymPattern.lastIndex = 0;
    nodes.push(node);
  }
  nodes.forEach(function (node) {
    const fragment = document.createDocumentFragment();
    const value = node.nodeValue || '';
    let last = 0;
    value.replace(acronymPattern, function (match: string, acronym: string, offset: number): string {
      fragment.appendChild(document.createTextNode(value.slice(last, offset)));
      const abbr = document.createElement('abbr');
      abbr.className = 'physical-acronym';
      abbr.title = ACRONYMS[acronym];
      abbr.textContent = acronym;
      fragment.appendChild(abbr);
      last = offset + match.length;
      return match;
    });
    fragment.appendChild(document.createTextNode(value.slice(last)));
    node.parentNode!.replaceChild(fragment, node);
    acronymPattern.lastIndex = 0;
  });
  decorating = false;
}

function mainEl(): HTMLElement | null {
  return document.querySelector('main');
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
  visitsPerCapita = 1.5;
  typeFilter = 'all';
  selectedId = 'R01';
  allocated = null;
  DATA.counties = null; DATA.states = null; DATA.regions = null; DATA.error = null;

  const main = mainEl();
  decorateAcronyms(main);

  Promise.all([
    fetch(BASE + 'data/counties.json').then(function (r) {
      if (!r.ok) throw new Error('counties.json ' + r.status);
      return r.json();
    }),
    fetch(BASE + 'data/us-states.json').then(function (r) {
      if (!r.ok) throw new Error('us-states.json ' + r.status);
      return r.json();
    }),
    fetch(BASE + 'data/hospital-regions.json').then(function (r) {
      if (!r.ok) throw new Error('hospital-regions.json ' + r.status);
      return r.json();
    })
  ]).then(function (res) {
    DATA.counties = (res[0] as County[]).map(function (c) {
      return { f: c.f, n: c.n, s: c.s, p: c.p, r: c.r, la: c.la, lo: c.lo };
    });
    DATA.states = res[1] as StatesGeo;
    DATA.regions = res[2] as RegionsData;

    /* county unit network */
    wireUnitControls();
    refreshUnits();

    /* hospital administration regions */
    renderRegionMap();
    renderRegionControls();
    renderScores();
    decorateAcronyms(mainEl());
  }).catch(function (e) {
    DATA.error = String(e);
    const host = $('units-map');
    if (host) host.textContent =
      'County data failed to load (' + DATA.error +
      '). The Physical Care tab needs its data files under public/data.';
    const rhost = $('hospital-region-map');
    if (rhost) rhost.textContent = 'Regional model data failed to load (' + DATA.error + ').';
  });
}

document.addEventListener('astro:page-load', initUnits);
