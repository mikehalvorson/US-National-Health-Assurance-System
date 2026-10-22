// R280 [§S15]: the row's declared test, as a probe a person runs against a
// served build. It cannot run in CI: it needs a real browser and a server.
//
//   pnpm build && pnpm preview        (or pnpm dev)
//   node tools/listener-probe.mjs http://localhost:4321 [chapter ...]
//
// The row: "navigate away and back twice, then assert the listener count did
// not increase". For each chapter the probe loads the away page (the Overview,
// or Healthcare for the Overview itself), navigates to the chapter through the
// nav link and counts: that is the baseline, taken once both pages' modules
// have been evaluated, so a module's one-time registrations are in it. It then
// goes away and back twice, counting after each return. Any count above the
// baseline is a rise. Review 2 of P21 found the first version compared later
// cycles with the first and ignored the baseline, so a rise that happened
// once was invisible.
//
// What is counted: listeners on window, document, <html> and <head>, read
// through the DevTools protocol; listeners added and not removed on any other
// target that is not a node - a matchMedia() list, the visual viewport, the
// font set, the screen orientation, which the build gate also treats as kept -
// and intervals started and not cleared, both from wrappers installed before
// any page script runs. A listener added with { once: true } on one of those
// other targets and then fired is still counted; none is used today.
//
// Exit code 1 if any chapter rises, even when a later one could not be
// measured; 2 if the probe could not run and nothing rose; 0 otherwise.
// Headless Chrome with a throwaway profile in the OS temp directory; set
// CHROME to another Chromium binary if Chrome is not at the default path.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;
const SEND_TIMEOUT_MS = 30000;
const ORIGIN = process.argv[2] || 'http://localhost:4321';
const BASE = '/US-National-Health-Assurance-System/';
const ALL = ['', 'health', 'tax', 'legislation', 'units', 'ltc', 'medications', 'data',
  'workforce', 'gov', 'hardening', 'risk', 'rollout', 'quality'];
const PAGES = process.argv.length > 3 ? process.argv.slice(3).map((p) => (p === 'overview' ? '' : p)) : ALL;
const DOM_TARGETS = ['window', 'document', 'document.documentElement', 'document.head'];

/* Installed before any page script on each new document. Counts net listener
   registrations on targets that are neither nodes nor window, and intervals
   that are still running. */
const WRAPPERS = `(() => {
  const intervals = new Set();
  const key = (t, type, fn, opts) => [t, type, fn, typeof opts === 'boolean' ? opts : !!(opts && opts.capture)];
  const keys = [];
  const find = (k) => keys.findIndex((x) => x[0] === k[0] && x[1] === k[1] && x[2] === k[2] && x[3] === k[3]);
  const kept = (t) => t !== window && !(t instanceof Node);
  const add = EventTarget.prototype.addEventListener;
  const remove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if (kept(this) && fn) { const k = key(this, type, fn, opts); if (find(k) < 0) keys.push(k); }
    return add.call(this, type, fn, opts);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, opts) {
    if (kept(this) && fn) { const i = find(key(this, type, fn, opts)); if (i >= 0) keys.splice(i, 1); }
    return remove.call(this, type, fn, opts);
  };
  const set = window.setInterval;
  const clear = window.clearInterval;
  window.setInterval = function (...a) { const id = set.apply(window, a); intervals.add(id); return id; };
  window.clearInterval = function (id) { intervals.delete(id); return clear.call(window, id); };
  Object.defineProperty(window, '__probeKept', { value: () => ({ listeners: keys.length, intervals: intervals.size }) });
})();`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  let closed = null;
  const pending = new Map();
  const handlers = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { res, rej, timer } = pending.get(msg.id);
      clearTimeout(timer);
      pending.delete(msg.id);
      if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result);
    } else if (msg.method) {
      for (const fn of handlers.get(msg.method) || []) fn(msg.params);
    }
  };
  /* review 2 of P21: a closed socket used to leave every pending send, and
     every waitFor loop behind it, waiting forever */
  ws.onclose = () => {
    closed = new Error('the DevTools connection closed');
    for (const { rej, timer } of pending.values()) { clearTimeout(timer); rej(closed); }
    pending.clear();
  };
  return {
    send(method, params = {}) {
      if (closed) return Promise.reject(closed);
      id += 1;
      const mine = id;
      ws.send(JSON.stringify({ id: mine, method, params }));
      return new Promise((res, rej) => {
        const timer = setTimeout(() => {
          pending.delete(mine);
          rej(new Error(method + ' had no answer in ' + SEND_TIMEOUT_MS + ' ms'));
        }, SEND_TIMEOUT_MS);
        pending.set(mine, { res, rej, timer });
      });
    },
    once(method) {
      return new Promise((res) => {
        const list = handlers.get(method) || [];
        const fn = (p) => { list.splice(list.indexOf(fn), 1); res(p); };
        list.push(fn);
        handlers.set(method, list);
      });
    },
    close() { ws.close(); }
  };
}

async function evaluate(s, expression) {
  const r = await s.send('Runtime.evaluate', { expression, returnByValue: true });
  if (r.exceptionDetails) throw new Error('evaluate threw: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
}

async function waitFor(s, expression, timeoutMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      if (await evaluate(s, expression)) return;
    } catch (err) {
      if (err && /connection closed/.test(err.message)) throw err;   // not a page mid-swap
    }
    await sleep(100);
  }
  throw new Error('timed out waiting for: ' + expression);
}

async function count(s) {
  let dom = 0;
  for (const target of DOM_TARGETS) {
    const ref = await s.send('Runtime.evaluate', { expression: target });
    const { listeners } = await s.send('DOMDebugger.getEventListeners', { objectId: ref.result.objectId });
    dom += listeners.length;
  }
  const kept = await evaluate(s, 'window.__probeKept()');
  return { total: dom + kept.listeners + kept.intervals, dom, other: kept.listeners, intervals: kept.intervals };
}

async function go(s, path) {
  const before = await evaluate(s, 'window.__probeLoads');
  const href = BASE + path;
  const clicked = await evaluate(s, "(function () { var a = document.querySelector('nav.tabs a[href=\"" + href +
    "\"]'); if (!a) return false; a.click(); return true; })()");
  if (!clicked) throw new Error('no nav link for ' + href);
  await waitFor(s, 'window.__probeLoads > ' + before + " && location.pathname === '" + href + "'");
  await sleep(1200);
}

function stopChrome(child) {
  /* review 2 of P21: on Windows, kill() ends the parent and leaves Chrome's
     child processes holding the profile, so it could not be deleted */
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill();
}

const profile = mkdtempSync(join(tmpdir(), 'nha-listener-probe-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile,
  '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
let rose = false;
let failed = null;
let session = null;
try {
  for (let i = 0; i < 100; i += 1) {
    try { if ((await fetch('http://127.0.0.1:' + PORT + '/json/version')).ok) break; } catch { /* starting */ }
    await sleep(100);
  }
  const targets = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('Chrome opened no page');
  session = await connect(page.webSocketDebuggerUrl);
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Page.addScriptToEvaluateOnNewDocument', { source: WRAPPERS });
  for (const chapter of PAGES) {
    const away = chapter === '' ? 'health' : '';
    const loaded = session.once('Page.loadEventFired');
    await session.send('Page.navigate', { url: ORIGIN + BASE + away });
    await loaded;
    await waitFor(session, "document.readyState === 'complete'");
    await sleep(1500);
    /* one counter, registered once per document, before the first count */
    await evaluate(session, "if (window.__probeLoads === undefined) { window.__probeLoads = 0; " +
      "document.addEventListener('astro:page-load', function () { window.__probeLoads += 1; }); } true");
    await go(session, chapter);
    const counts = [await count(session)];
    for (let c = 1; c <= 2; c += 1) {
      await go(session, away);
      await go(session, chapter);
      counts.push(await count(session));
    }
    const baseline = counts[0].total;
    const flat = counts.every((c) => c.total === baseline);
    if (!flat) rose = true;
    console.log((chapter || 'overview').padEnd(12) + 'baseline ' + counts.map((c) => c.total).join(' -> ') +
      '  (dom ' + counts.map((c) => c.dom).join('/') + ', other ' + counts.map((c) => c.other).join('/') +
      ', intervals ' + counts.map((c) => c.intervals).join('/') + ')' + (flat ? '  flat' : '  RISING'));
  }
} catch (err) {
  failed = err && err.message ? err.message : String(err);
  console.log('the probe could not finish: ' + failed);
} finally {
  if (session) session.close();
  stopChrome(chrome);
  for (let i = 0; i < 10; i += 1) {
    try { rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(300); }
  }
}
process.exit(rose ? 1 : failed ? 2 : 0);
