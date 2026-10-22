import { expect, test } from 'vitest';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  clientsWithoutPageLoad, DOCUMENT_LIFETIME_STATE, globalRegistrationCensus, maskComments,
  unboundDeferredWork, undeclaredPageState
} from '../../src/lib/manifest-check';

/* =========================================================================
 * R280 [§S15]: a listener on a target the page swap does not replace.
 *
 * <ClientRouter /> replaces <body> on every navigation. `window`, `document`,
 * <html> and <head> survive it. A listener registered on one of those from
 * inside a function runs up a count every time the function runs again, and
 * every client's init runs again on every visit, because its dataset.wired
 * guard sits on an element the swap replaces.
 *
 * The gate that shipped with the fix in 08fc01e looked for that inside a
 * named function declaration whose body spelled `dataset.wired`. These tests
 * drive the gate under mutated copies of src/ and hold it to the shape of the
 * defect rather than to one spelling of it: an arrow-function init, a helper
 * the init calls, an unguarded page-load handler, <html> as the target, a
 * repeating timer, a lib helper, and an inline page script.
 *
 * Every mutation throws if its anchor is missing, so a mutation that silently
 * fails to apply cannot turn "the gate reports nothing" into a pass.
 * ========================================================================= */

const SRC = fileURLToPath(new URL('../../src', import.meta.url));

interface Edit { file: string; from: string; to: string }

function mutated<T>(edits: Edit[], run: (root: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), 'p21-lifecycle-'));
  try {
    cpSync(SRC, join(root, 'src'), { recursive: true });
    for (const e of edits) {
      const path = join(root, e.file);
      if (e.from === '') {
        if (existsSync(path)) throw new Error('refusing to overwrite ' + e.file);
        writeFileSync(path, e.to);
        continue;
      }
      const text = readFileSync(path, 'utf8');
      const hits = text.split(e.from).length - 1;
      if (hits !== 1) {
        throw new Error('anchor found ' + hits + ' times in ' + e.file + ': ' + e.from.slice(0, 60));
      }
      writeFileSync(path, text.replace(e.from, e.to));
    }
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const faults = (root: string) =>
  globalRegistrationCensus(root).insideFunctions.map((f) => f.file + ' ' + f.target + ' in ' + f.fn);

const FMEA_GUARD = "  matrixHost.dataset.wired = '1';\n";

test('the tree as it stands registers every global listener at module scope', () => {
  expect(globalRegistrationCensus().insideFunctions).toEqual([]);
});

test("R280's own shape: a document listener inside the element-guarded init", () => {
  expect(mutated([{
    file: 'src/scripts/fmea-client.ts', from: FMEA_GUARD,
    to: FMEA_GUARD + "  document.addEventListener('click', function () { selectRecord(''); });\n"
  }], faults)).toEqual(['src/scripts/fmea-client.ts document in initFmea']);
});

test('the same with window as the target', () => {
  expect(mutated([{
    file: 'src/scripts/fmea-client.ts', from: FMEA_GUARD,
    to: FMEA_GUARD + "  window.addEventListener('resize', function () { refresh(); });\n"
  }], faults)).toEqual(['src/scripts/fmea-client.ts window in initFmea']);
});

test('an init written as an arrow function', () => {
  expect(mutated([{
    file: 'src/scripts/probe-client.ts', from: '',
    to: [
      'const initProbe = (): void => {',
      "  const host = document.getElementById('probe');",
      "  if (!host || host.dataset.wired === '1') return;",
      "  host.dataset.wired = '1';",
      "  document.addEventListener('keydown', function () { host.focus(); });",
      '};',
      "document.addEventListener('astro:page-load', initProbe);",
      ''
    ].join('\n')
  }], faults)).toEqual(['src/scripts/probe-client.ts document in initProbe']);
});

test('a helper the guarded init calls, whose own body carries no guard', () => {
  expect(mutated([{
    file: 'src/scripts/fmea-client.ts', from: FMEA_GUARD,
    to: FMEA_GUARD + '  wireKeys();\n'
  }, {
    file: 'src/scripts/fmea-client.ts', from: 'function initFmea(): void {',
    to: "function wireKeys(): void {\n  window.addEventListener('keydown', function () { refresh(); });\n}\n\nfunction initFmea(): void {"
  }], faults)).toEqual(['src/scripts/fmea-client.ts window in wireKeys']);
});

test('a page-load handler with no guard at all', () => {
  expect(mutated([{
    file: 'src/scripts/probe-client.ts', from: '',
    to: [
      "document.addEventListener('astro:page-load', function () {",
      "  document.addEventListener('click', function () { return; });",
      '});',
      ''
    ].join('\n')
  }], faults)).toEqual(['src/scripts/probe-client.ts document in (anonymous)']);
});

test('<html>, which the swap keeps, as the target', () => {
  expect(mutated([{
    file: 'src/scripts/fmea-client.ts', from: FMEA_GUARD,
    to: FMEA_GUARD + "  document.documentElement.addEventListener('click', function () { refresh(); });\n"
  }], faults)).toEqual(['src/scripts/fmea-client.ts document.documentElement in initFmea']);
});

test('a repeating timer started inside an init', () => {
  expect(mutated([{
    file: 'src/scripts/fmea-client.ts', from: FMEA_GUARD,
    to: FMEA_GUARD + '  setInterval(refresh, 1000);\n'
  }], faults)).toEqual(['src/scripts/fmea-client.ts setInterval in initFmea']);
});

test('a library helper a client calls on every visit', () => {
  expect(mutated([{
    file: 'src/lib/probe-lib.ts', from: '',
    to: "export function bindResize(fn: () => void): void {\n  window.addEventListener('resize', fn);\n}\n"
  }], faults)).toEqual(['src/lib/probe-lib.ts window in bindResize']);
});

test('an inline page script', () => {
  expect(mutated([{
    file: 'src/pages/risk.astro', from: '<script>',
    to: "<script>\n  function wire(): void { document.addEventListener('keyup', function () { return; }); }\n  wire();\n</script>\n<script>"
  }], faults)).toEqual(['src/pages/risk.astro document in wire']);
});

test('a page script the router runs again on every visit', () => {
  /* Measured in P21 with a counter in a mutated risk.astro, across two
     away-and-back cycles: 1, 2, 3 with data-astro-rerun. A top-level
     registration in such a script accumulates exactly as one inside an init
     does. */
  expect(mutated([{
    file: 'src/pages/risk.astro', from: '<script>',
    to: "<script is:inline data-astro-rerun>\n  document.addEventListener('keyup', function () { return; });\n</script>\n<script>"
  }], faults)).toEqual(['src/pages/risk.astro document in (script run on every visit)']);
});

test('a plain is:inline script runs once, so a top-level registration in it is not reported', () => {
  /* The same probe without the attribute read 1, 1, 1: the router did not
     run the script again on return. Pinned so the rule does not widen to
     every inline script on a belief about the router. */
  expect(mutated([{
    file: 'src/pages/risk.astro', from: '<script>',
    to: "<script is:inline>\n  document.addEventListener('keyup', function () { return; });\n</script>\n<script>"
  }], faults)).toEqual([]);
});

/* Review of P21 walked the gate past four more spellings, each checked with
   a throwaway copy: a local alias, bracket access, document.defaultView, and
   a matchMedia() list. Two more of the same family are pinned with them. */
test.each([
  ['a local alias of <html>',
    "  const root = document.documentElement;\n  root.addEventListener('click', function () { refresh(); });\n",
    'document.documentElement'],
  ['bracket access', "  document['addEventListener']('click', function () { refresh(); });\n", 'document'],
  ['document.defaultView', "  document.defaultView?.addEventListener('resize', function () { refresh(); });\n", 'window'],
  ['a matchMedia() list',
    "  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { refresh(); });\n",
    'matchMedia()'],
  ['addEventListener.call', "  EventTarget.prototype.addEventListener.call(window, 'resize', refresh);\n", 'window'],
  ['an alias of setInterval', '  const tick = setInterval;\n  tick(refresh, 1000);\n', 'setInterval'],
  /* review 2 of P21: three more, each 0 faults against the second version */
  ['a destructured alias',
    "  const { documentElement: root } = document;\n  root.addEventListener('click', function () { refresh(); });\n",
    'document.documentElement'],
  ['an alias made by assignment',
    "  let w: Window | null = null;\n  w = window;\n  w.addEventListener('resize', function () { refresh(); });\n", 'window'],
  ['an element\'s ownerDocument',
    "  matrixHost.ownerDocument.addEventListener('click', function () { refresh(); });\n", 'document']
])('respelled: %s', (_label, line, target) => {
  expect(mutated([{ file: 'src/scripts/fmea-client.ts', from: FMEA_GUARD, to: FMEA_GUARD + line }], faults))
    .toEqual(['src/scripts/fmea-client.ts ' + target + ' in initFmea']);
});

test('a parameter that shadows a module-level alias is not the alias', () => {
  /* Review 2 of P21: aliases were keyed by name, so a parameter `root` was
     read as <html> because the file declared `const root =
     document.documentElement` at module level. */
  expect(mutated([{
    file: 'src/scripts/probe-client.ts', from: '',
    to: [
      'const root = document.documentElement;',
      "root.addEventListener('click', function () { return; });",
      'export function draw(root: HTMLElement): void {',
      "  root.addEventListener('click', function () { return; });",
      '}',
      ''
    ].join('\n')
  }], faults)).toEqual([]);
});

test('every client registers its init on astro:page-load at module scope', () => {
  /* The first floor here was "at least two registrations per client", which
     a tree of 32 passed with one client skipped. This asks each client. */
  expect(clientsWithoutPageLoad()).toEqual([]);
  const clients = readdirSync(join(SRC, 'scripts')).filter((f) => /-client\.ts$/.test(f));
  expect(clients.length).toBeGreaterThanOrEqual(15);
  expect(globalRegistrationCensus().pageLoadRegistered.length).toBe(clients.length);
});

test('a client that stops registering its init is named', () => {
  expect(mutated([{
    file: 'src/scripts/overview-client.ts',
    from: "document.addEventListener('astro:page-load', initOverview);\n", to: ''
  }], clientsWithoutPageLoad)).toEqual(['src/scripts/overview-client.ts']);
});

test('what the gate must not report', () => {
  /* The registration the R280 fix moved to module scope; a string and a
     comment that spell the needle inside a function; and <body>, which the
     swap replaces, so a listener on it dies with the page. */
  expect(mutated([{
    file: 'src/scripts/probe-client.ts', from: '',
    to: [
      "document.addEventListener('click', function () { return; });",
      "if (document.readyState === 'loading') {",
      "  document.addEventListener('DOMContentLoaded', function () { return; });",
      '}',
      'function initProbe(): string {',
      "  document.body.addEventListener('click', function () { return; });",
      '  const b = document.body;',
      "  b.addEventListener('keyup', function () { return; });",
      "  // document.addEventListener('click', f) would leak here",
      "  return \"document.addEventListener('click', f)\";",
      '}',
      ''
    ].join('\n')
  }], faults)).toEqual([]);
});

/* =========================================================================
 * R223 [§S15]: page state starts from nothing on every arrival.
 *
 * Measured before the gate existed, with an AST census of every module-level
 * binding in src/scripts/: nine of fifteen clients hold none; fmea, units and
 * workforce reset every one in their init; tax reset all but one, and that
 * one only through a helper the init happened to call; quality persisted four
 * explorer bindings, one of which - the selected diagram node - left the
 * explorer and the catalog pointing at different parameters after a return
 * visit (measured: explorer TPP-1.1, catalog KPP-A1); acronyms holds one
 * observer for the whole document by design.
 * ========================================================================= */

const pageState = (root: string) => undeclaredPageState(root);

const probeClient = (body: string[]): Edit => ({
  file: 'src/scripts/probe-client.ts', from: '',
  to: [
    ...body,
    "document.addEventListener('astro:page-load', initProbe);",
    ''
  ].join('\n')
});
const PROBE_GUARD = [
  "  const host = document.getElementById('probe');",
  "  if (!host || host.dataset.wired === '1') return;",
  "  host.dataset.wired = '1';"
];

test('every client resets its page state on arrival or declares why not', () => {
  expect(undeclaredPageState()).toEqual([]);
});

test('every declaration names a file that exists and gives a reason', () => {
  for (const [file, names] of Object.entries(DOCUMENT_LIFETIME_STATE)) {
    expect(existsSync(join(SRC, '..', file)), file).toBe(true);
    for (const [name, reason] of Object.entries(names)) {
      expect(reason.length, file + ' ' + name).toBeGreaterThan(20);
    }
  }
});

test('a reset line deleted from an init', () => {
  expect(mutated([{
    file: 'src/scripts/fmea-client.ts',
    from: "  selectedId = F.records.length ? F.records[0].id : '';\n  selectedCell = null;\n\n  renderCounts();",
    to: "  selectedId = F.records.length ? F.records[0].id : '';\n\n  renderCounts();"
  }], pageState)).toEqual([
    'src/scripts/fmea-client.ts: selectedCell is module state; initFmea does not reset it on arrival, and nothing declares it'
  ]);
});

test('a reset that only happens in a handler the init defines', () => {
  expect(mutated([probeClient([
    "let picked = '';",
    'function initProbe(): void {',
    ...PROBE_GUARD,
    "  host.addEventListener('click', function () { picked = 'a'; });",
    '}'
  ])], pageState)).toEqual([
    'src/scripts/probe-client.ts: picked is module state; initProbe does not reset it on arrival, and nothing declares it'
  ]);
});

test('a memo is not a reset: if (!x) x = d, and x = x ?? d', () => {
  expect(mutated([probeClient([
    "let picked = '';",
    'let mode: string | null = null;',
    'function initProbe(): void {',
    ...PROBE_GUARD,
    "  if (!picked) picked = 'a';",
    "  mode = mode ?? 'b';",
    '}'
  ])], pageState)).toEqual([
    'src/scripts/probe-client.ts: picked is module state; initProbe does not reset it on arrival, and nothing declares it',
    'src/scripts/probe-client.ts: mode is module state; initProbe does not reset it on arrival, and nothing declares it'
  ]);
});

test('pending work that nothing cancels', () => {
  expect(mutated([{
    file: 'src/scripts/quality-client.ts', from: '  refreshDebounced.cancel();\n', to: ''
  }], pageState)).toEqual([
    'src/scripts/quality-client.ts: refreshDebounced holds pending work that is not cancelled on arrival or ' +
      'on leaving, and nothing declares it'
  ]);
});

test('one field of a module-level object left out of the reset', () => {
  expect(mutated([{
    file: 'src/scripts/units-client.ts',
    from: 'DATA.counties = null; DATA.states = null; DATA.regions = null; DATA.error = null;',
    to: 'DATA.counties = null; DATA.states = null; DATA.regions = null;'
  }], pageState)).toEqual([
    'src/scripts/units-client.ts: DATA.error is written; initUnits does not reset it on arrival'
  ]);
});

test('an object mutated by key, which no reset can be read from', () => {
  expect(mutated([probeClient([
    'const seen: Record<string, number> = {};',
    'function initProbe(): void {',
    ...PROBE_GUARD,
    "  host.addEventListener('click', function () { seen[host.id] = 1; });",
    '}'
  ])], pageState)).toEqual([
    'src/scripts/probe-client.ts: seen is mutated by key or by method, which no arrival reset can be read ' +
      'from, and nothing declares it'
  ]);
});

test('module state in a file that registers no init', () => {
  expect(mutated([{
    file: 'src/scripts/probe-client.ts', from: '',
    to: "let picked = '';\ndocument.addEventListener('click', function () { picked = 'a'; });\n"
  }], pageState)).toEqual([
    'src/scripts/probe-client.ts: picked is module state; the file registers no init on astro:page-load to ' +
      'reset it, and nothing declares it'
  ]);
});

test('a declaration whose reason stopped being true', () => {
  /* The init now resets a binding the table says outlives the page. */
  expect(mutated([{
    file: 'src/scripts/quality-client.ts',
    from: "  eqNode = arrival.eqNode;\n\n  populateConcepts();",
    to: "  eqNode = arrival.eqNode;\n  eqPhase = 'P8';\n\n  populateConcepts();"
  }], pageState)).toEqual([
    'src/scripts/quality-client.ts: eqPhase is declared as outliving the page, but initQuality resets it'
  ]);
});

test('a declaration naming a binding that is gone', () => {
  expect(mutated([{
    file: 'src/scripts/acronyms-client.ts', from: 'let running = false;', to: 'let busy = false;'
  }], pageState)).toEqual([
    'src/scripts/acronyms-client.ts: declares running as outliving the page, and it is not module state here'
  ]);
});

/* Review of P21 walked the first version past five spellings: a destructured
   let, a memo written with ||, a reset under an if, a write below the first
   level of an object, and Object.assign. */
test('a destructured let the init never resets', () => {
  expect(mutated([probeClient([
    "let [picked, mode] = ['', ''];",
    'function initProbe(): void {',
    ...PROBE_GUARD,
    "  host.addEventListener('click', function () { [picked, mode] = ['a', 'b']; });",
    '}'
  ])], pageState)).toEqual([
    'src/scripts/probe-client.ts: picked is module state; initProbe does not reset it on arrival, and nothing declares it',
    'src/scripts/probe-client.ts: mode is module state; initProbe does not reset it on arrival, and nothing declares it'
  ]);
});

test('a memo written with ||, and a reset that happens only under an if', () => {
  expect(mutated([probeClient([
    "let picked = '';",
    "let mode = '';",
    'function initProbe(): void {',
    ...PROBE_GUARD,
    "  picked || (picked = 'a');",
    "  if (host.id === 'probe') mode = '';",
    "  host.addEventListener('click', function () { mode = 'b'; });",
    '}'
  ])], pageState)).toEqual([
    'src/scripts/probe-client.ts: picked is module state; initProbe does not reset it on arrival, and nothing declares it',
    'src/scripts/probe-client.ts: mode is module state; initProbe does not reset it on arrival, and nothing declares it'
  ]);
});

test('an object written below its first level, or through Object.assign', () => {
  expect(mutated([probeClient([
    "const state = { sel: { id: '' } };",
    "const view = { mode: '' };",
    'function initProbe(): void {',
    ...PROBE_GUARD,
    "  host.addEventListener('click', function () { state.sel.id = 'a'; Object.assign(view, { mode: 'b' }); });",
    '}'
  ])], pageState)).toEqual([
    'src/scripts/probe-client.ts: state is mutated by key or by method, which no arrival reset can be read ' +
      'from, and nothing declares it',
    'src/scripts/probe-client.ts: view is mutated by key or by method, which no arrival reset can be read ' +
      'from, and nothing declares it'
  ]);
});

test('resets written as destructuring, a comma list, a chain, or inside try are resets', () => {
  /* Review 2 of P21: the second version reported all four as missing. */
  expect(mutated([probeClient([
    "let a = ''; let b = ''; let c = ''; let d = ''; let e = ''; let f = ''; let g = ''; let h = '';",
    'function initProbe(): void {',
    ...PROBE_GUARD,
    "  [a, b] = ['', ''];",
    "  c = '', d = '';",
    "  e = f = '';",
    "  try { g = ''; } catch { return; }",
    /* a property with the binding's name is not a read of the binding: the
       fix run that added this test had just tripped over it */
    "  const fresh = { h: '' };",
    '  h = fresh.h;',
    "  host.addEventListener('click', function () { a = b = c = d = e = f = g = h = 'x'; });",
    '}'
  ])], pageState)).toEqual([]);
});

test('keyed writes by Object[\'assign\'], Reflect.set, and through a local alias', () => {
  /* Review 2 of P21: all three walked past the second version. */
  expect(mutated([probeClient([
    "const view = { mode: '' };",
    "const store = { mode: '' };",
    "const state = { sel: '' };",
    'function initProbe(): void {',
    ...PROBE_GUARD,
    "  host.addEventListener('click', function () {",
    "    Object['assign'](view, { mode: 'b' });",
    "    Reflect.set(store, 'mode', 'c');",
    '    const s = state;',
    "    s.sel = 'a';",
    '  });',
    '}'
  ])], pageState)).toEqual([
    'src/scripts/probe-client.ts: view is mutated by key or by method, which no arrival reset can be read ' +
      'from, and nothing declares it',
    'src/scripts/probe-client.ts: store is mutated by key or by method, which no arrival reset can be read ' +
      'from, and nothing declares it',
    'src/scripts/probe-client.ts: state is mutated by key or by method, which no arrival reset can be read ' +
      'from, and nothing declares it'
  ]);
});

test('a module-level debounce imported under another name is still pending work', () => {
  expect(mutated([probeClient([
    "import { debounce as later } from '../lib/timing';",
    "const soon = later(function () { return; }, 50);",
    'function initProbe(): void {',
    ...PROBE_GUARD,
    "  host.addEventListener('input', soon);",
    '}'
  ])], pageState)).toEqual([
    'src/scripts/probe-client.ts: soon holds pending work that is not cancelled on arrival or on leaving, ' +
      'and nothing declares it'
  ]);
});

test('what the state gate must not report', () => {
  /* State in the init's closure is fresh by construction; a table the file
     never writes is not state. */
  expect(mutated([probeClient([
    "const LABELS = ['a', 'b'];",
    'function initProbe(): void {',
    ...PROBE_GUARD,
    '  let count = 0;',
    "  host.addEventListener('click', function () { count += 1; host.textContent = LABELS[count % 2] ?? ''; });",
    '}'
  ])], pageState)).toEqual([]);
});

/* =========================================================================
 * R229 [§S15]: the strategy is written where a client author meets it, and
 * what it says about its checks stays true. A README that names a self-test
 * the registry no longer has, or a function the code no longer exports, is
 * the "comment promising a guard" failure this campaign keeps finding.
 * ========================================================================= */

test('the lifecycle README names checks and helpers that exist', async () => {
  const readme = readFileSync(join(SRC, 'scripts', 'README.md'), 'utf8').replace(/\s+/g, ' ');
  /* masked, so a commented-out row cannot stand in for a registered one */
  const registry = maskComments(readFileSync(join(SRC, 'lib', 'selftests.ts'), 'utf8'));
  const named = [...readme.matchAll(/\*([A-Z][^*]+)\*/g)].map((m) => (m[1] ?? '').trim());
  const rows = named.filter((n) => registry.includes("runGuarded('" + n + "'"));
  expect(rows).toEqual([
    'Every client script registers its init on astro:page-load at module scope',
    'No document or window listener is registered inside a function',
    'Every client resets its page state on arrival or declares why not',
    'Deferred work in browser code runs only for the page that started it'
  ]);
  const check = await import('../../src/lib/manifest-check');
  const timing = await import('../../src/lib/timing');
  for (const name of ['clientsWithoutPageLoad', 'globalRegistrationCensus', 'undeclaredPageState',
    'unboundDeferredWork', 'DOCUMENT_LIFETIME_STATE']) {
    expect(readme, name).toContain('`' + name + '`');
    expect(Object.keys(check), name).toContain(name);
  }
  expect(readme).toContain('`boundToPage(host, fn)`');
  expect(Object.keys(timing)).toContain('boundToPage');
  const cited = [...readme.matchAll(/`((?:src\/[\w/.-]+|[\w-]+-client)\.ts|BaseLayout\.astro)`/g)]
    .map((m) => m[1] ?? '');
  /* a pattern that matched nothing would make the loop below pass on air */
  expect(new Set(cited).size).toBeGreaterThanOrEqual(5);
  for (const path of cited) {
    const full = path.startsWith('src/') ? join(SRC, '..', path)
      : path.endsWith('.astro') ? join(SRC, 'layouts', path) : join(SRC, 'scripts', path);
    expect(existsSync(full), path).toBe(true);
  }
});

/* =========================================================================
 * P21 [§S15]: deferred work runs only for the page that asked for it.
 * Line numbers are dropped from the comparison: they move with every edit
 * above them, and the file and the scheduler are what identify the site.
 * ========================================================================= */

const deferred = (root: string) => unboundDeferredWork(root).map((f) => f.replace(/:\d+ /, ' '));

test('every deferred callback in browser code is bound to its page', () => {
  expect(unboundDeferredWork()).toEqual([]);
});

test("the health page's pending render, unbound again", () => {
  expect(mutated([{
    file: 'src/scripts/health-client.ts',
    from: 'pending = window.setTimeout(boundToPage(pageHost, render), 160);',
    to: 'pending = window.setTimeout(render, 160);'
  }], deferred)).toEqual([
    'src/scripts/health-client.ts setTimeout schedules a callback that is not bound to its page'
  ]);
});

test("the Physical Care fetch continuation, unbound again", () => {
  expect(mutated([{
    file: 'src/scripts/units-client.ts',
    from: 'Promise.allSettled(UNITS_FILES.map(grab)).then(boundToPage(guard, function (res) {',
    to: 'Promise.allSettled(UNITS_FILES.map(grab)).then((function (res) {'
  }], deferred)).toEqual([
    'src/scripts/units-client.ts .then continues with a callback that is not bound to its page'
  ]);
});

test('a frame, an idle callback and a catch, each unbound', () => {
  expect(mutated([probeClient([
    'function initProbe(): void {',
    ...PROBE_GUARD,
    '  requestAnimationFrame(function () { host.hidden = false; });',
    '  window.requestIdleCallback(function () { host.hidden = true; });',
    "  fetch('x').catch(function () { host.textContent = 'failed'; });",
    '}'
  ])], deferred)).toEqual([
    'src/scripts/probe-client.ts requestAnimationFrame schedules a callback that is not bound to its page',
    'src/scripts/probe-client.ts requestIdleCallback schedules a callback that is not bound to its page',
    'src/scripts/probe-client.ts .catch continues with a callback that is not bound to its page'
  ]);
});

test('an async function that renders after its await', () => {
  expect(mutated([probeClient([
    'function paint(n: number): void { const h = document.getElementById("probe"); if (h) h.textContent = String(n); }',
    'async function load(): Promise<void> {',
    "  const r = await fetch('x');",
    '  paint(r.status);',
    '}',
    'function initProbe(): void {',
    ...PROBE_GUARD,
    '  void load();',
    '}'
  ])], deferred)).toEqual([
    'src/scripts/probe-client.ts an async function reaches the page, and the code after an await cannot be bound to it'
  ]);
});

test('a timer in a library helper is in scope too', () => {
  expect(mutated([{
    file: 'src/lib/probe-lib.ts', from: '',
    to: 'export function later(fn: () => void): void {\n  setTimeout(fn, 10);\n}\n'
  }], deferred)).toEqual([
    'src/lib/probe-lib.ts setTimeout schedules a callback that is not bound to its page'
  ]);
});

test('a scheduler reached by alias, by bracket, or through a timing.ts clock', () => {
  expect(mutated([probeClient([
    'function initProbe(): void {',
    ...PROBE_GUARD,
    '  const later = setTimeout;',
    '  later(function () { host.hidden = true; }, 10);',
    "  window['requestAnimationFrame'](function () { host.hidden = false; });",
    '  animationFrames.request(function () { host.hidden = true; });',
    '}'
  ])], deferred)).toEqual([
    'src/scripts/probe-client.ts setTimeout schedules a callback that is not bound to its page',
    'src/scripts/probe-client.ts requestAnimationFrame schedules a callback that is not bound to its page',
    'src/scripts/probe-client.ts animationFrames.request schedules a callback that is not bound to its page'
  ]);
});

test('a debounce made inside an init, which nothing can cancel', () => {
  expect(mutated([probeClient([
    'function initProbe(): void {',
    ...PROBE_GUARD,
    "  const soon = debounce(function () { host.textContent = 'x'; }, 50);",
    "  host.addEventListener('input', soon);",
    '}'
  ])], deferred)).toEqual([
    'src/scripts/probe-client.ts debounce made inside a function holds work nothing can cancel, and its ' +
      'callback is not bound to its page'
  ]);
});

test('async functions that reach the page through an arrow helper or a captured element', () => {
  /* Review of P21: the first version knew only declared functions and the
     word `document`, so both of these walked past it. */
  expect(mutated([probeClient([
    'const paint = (n: number): void => { const h = document.getElementById("probe"); if (h) h.textContent = String(n); };',
    'async function load(): Promise<void> {',
    "  const r = await fetch('x');",
    '  paint(r.status);',
    '}',
    'function initProbe(): void {',
    ...PROBE_GUARD,
    "  const go = async (): Promise<void> => { const r = await fetch('x'); host.textContent = String(r.status); };",
    '  void go();',
    '  void load();',
    '}'
  ])], deferred)).toEqual([
    'src/scripts/probe-client.ts an async function reaches the page, and the code after an await cannot be bound to it',
    'src/scripts/probe-client.ts an async function reaches the page, and the code after an await cannot be bound to it'
  ]);
});

test('timing.ts reached under another name or through a namespace import', () => {
  /* Review 2 of P21: all three gave 0 faults against the second version. */
  expect(mutated([probeClient([
    "import { debounce as soon } from '../lib/timing';",
    "import * as timing from '../lib/timing';",
    'function initProbe(): void {',
    ...PROBE_GUARD,
    "  host.addEventListener('input', soon(function () { host.hidden = true; }, 50));",
    "  host.addEventListener('change', timing.debounce(function () { host.hidden = false; }, 50));",
    '  timing.animationFrames.request(function () { host.hidden = true; });',
    '}'
  ])], deferred)).toEqual([
    'src/scripts/probe-client.ts debounce made inside a function holds work nothing can cancel, and its ' +
      'callback is not bound to its page',
    'src/scripts/probe-client.ts debounce made inside a function holds work nothing can cancel, and its ' +
      'callback is not bound to its page',
    'src/scripts/probe-client.ts animationFrames.request schedules a callback that is not bound to its page'
  ]);
});

test('async functions that reach out through a local alias, an imported renderer, or this', () => {
  /* Review 2 of P21: all three gave 0 faults against the second version. */
  const reach = 'src/scripts/probe-client.ts an async function reaches the page, and the code after an await ' +
    'cannot be bound to it';
  expect(mutated([probeClient([
    "import { paintInto } from '../lib/probe-paint';",
    'class Panel {',
    '  host: HTMLElement;',
    '  constructor(h: HTMLElement) { this.host = h; }',
    "  async load(): Promise<void> { const r = await fetch('x'); this.host.textContent = String(r.status); }",
    '}',
    'function initProbe(): void {',
    ...PROBE_GUARD,
    "  const viaAlias = async (): Promise<void> => { const h = host; const r = await fetch('x'); h.textContent = String(r.status); };",
    "  const viaImport = async (): Promise<void> => { const r = await fetch('x'); paintInto(host, r.status); };",
    '  void viaAlias(); void viaImport(); void new Panel(host).load();',
    '}'
  ])], deferred)).toEqual([reach, reach, reach]);
});

test('async I/O that only reads the standard library is not reported', () => {
  /* Review 2 of P21: performance.now() and Reflect.get flagged honest code. */
  expect(mutated([probeClient([
    'async function timed(url: string): Promise<number> {',
    '  const t = performance.now();',
    '  const r = await fetch(url);',
    "  const ok = Reflect.get(r, 'ok') === true;",
    '  const rows = [1, 2].map(function (n) { return n * 2; });',
    '  rows.push(3);',
    '  return ok ? performance.now() - t + rows.length : 0;',
    '}',
    'function initProbe(): void {',
    ...PROBE_GUARD,
    "  timed('x').then(boundToPage(host, function (ms: number) { host.textContent = String(ms); }));",
    '}'
  ])], deferred)).toEqual([]);
});

test('what the deferred-work gate must not report', () => {
  /* An async function that only does I/O - Physical Care's grab() is the
     real one - and a bound timer and continuation. */
  expect(mutated([probeClient([
    'async function grab(name: string): Promise<unknown> {',
    '  const r = await fetch(name);',
    "  if (!r.ok) throw new Error(name + ' ' + r.status);",
    '  return r.json();',
    '}',
    'function initProbe(): void {',
    ...PROBE_GUARD,
    '  setTimeout(boundToPage(host, function () { host.hidden = true; }), 10);',
    "  grab('x').then(boundToPage(host, function () { host.hidden = false; }));",
    "  host.addEventListener('input', debounce(boundToPage(host, function () { host.hidden = true; }), 50));",
    '}'
  ])], deferred)).toEqual([]);
});
