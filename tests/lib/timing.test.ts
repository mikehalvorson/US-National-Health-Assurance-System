import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import {
  debounce, coalesce, SEARCH_DEBOUNCE_MS, ACRONYM_SWEEP_DELAY_MS,
  animationFrames, boundToPage, coalesceOn, type Clock
} from '../../src/lib/timing';

/** A seeded generator, so an "uneven hand" is the same hand every run. */
function lehmer(seed: number): () => number {
  let state = seed;
  return (): number => { state = (state * 48271) % 2147483647; return state / 2147483647; };
}

/* =========================================================================
 * R304 [S14] declares: "typing in a search field triggers at most one render
 * and one acronym sweep per debounce interval". R246's second test declares
 * the same bound on announcements, and the page's only live region is written
 * once per render, so the render count is the announcement count.
 *
 * Review 9 of P20 replaced a test here that compared two literals it had
 * declared itself - `const A = 200; const B = 180; expect(B).toBeLessThan(A)` -
 * which could not fail whatever the code did. These drive the real debounce
 * into the real coalescer, the way the page wires them: a render mutates the
 * document, and the mutation observer calls the coalescer.
 * ========================================================================= */

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

interface Rig { type: () => void; renders: number[]; sweeps: number[] }

type Deferrer = (fn: () => void, ms: number) => () => void;

function rig(defer: Deferrer = debounce): Rig {
  const renders: number[] = [];
  const sweeps: number[] = [];
  const schedule = coalesce(() => { sweeps.push(Date.now()); }, ACRONYM_SWEEP_DELAY_MS);
  const refresh = defer(() => {
    renders.push(Date.now());
    /* A catalog render is not one mutation callback: the table, the detail
       card and the equation panel land in separate turns. Three callbacks
       spread over 60 ms, so a sweep count of one depends on the coalescer
       doing its job rather than on there being one call to coalesce. */
    schedule();
    setTimeout(schedule, 25);
    setTimeout(schedule, 60);
  }, SEARCH_DEBOUNCE_MS);
  return { type: refresh, renders, sweeps };
}

test('R304: a burst of keystrokes produces one render and one acronym sweep', () => {
  vi.useFakeTimers();
  const r = rig();
  for (let i = 0; i < 8; i++) { r.type(); vi.advanceTimersByTime(40); }
  expect(r.renders.length, 'rendered during the burst').toBe(0);
  vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS + ACRONYM_SWEEP_DELAY_MS + 50);
  expect(r.renders.length).toBe(1);
  expect(r.sweeps.length).toBe(1);
});

test('R304: separate bursts are not coalesced forever', () => {
  vi.useFakeTimers();
  const r = rig();
  for (let burst = 0; burst < 3; burst++) {
    r.type();
    vi.advanceTimersByTime(1000);
  }
  expect(r.renders.length).toBe(3);
  expect(r.sweeps.length).toBe(3);
});

/** An irregular typist: 400 keystrokes with gaps either side of both
 *  intervals, then the tightest spacing of each series. */
function irregularTyping(defer?: Deferrer): { renders: number; minRender: number; minSweep: number } {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const r = rig(defer);
  const next = lehmer(7);
  for (let i = 0; i < 400; i++) {
    r.type();
    vi.advanceTimersByTime(Math.floor(next() * 420));   /* 0 to 419 ms */
  }
  vi.advanceTimersByTime(2000);
  const tightest = (xs: number[]): number =>
    xs.slice(1).reduce((m, t, i) => Math.min(m, t - xs[i]), Infinity);
  return { renders: r.renders.length, minRender: tightest(r.renders), minSweep: tightest(r.sweeps) };
}

test('R304 / R246: at most one render and one sweep in any debounce interval', () => {
  /* The declared bound, checked as the property it states rather than at one
     hand-picked rhythm. */
  const out = irregularTyping();
  expect(out.renders, 'the rig never rendered').toBeGreaterThan(20);
  expect(out.minRender).toBeGreaterThanOrEqual(SEARCH_DEBOUNCE_MS);
  expect(out.minSweep).toBeGreaterThanOrEqual(SEARCH_DEBOUNCE_MS);
});

test('R304: the same check fails when the render is wired straight to the keystroke', () => {
  /* The property has to be capable of failing, so it is run here against the
     defect the row describes - a render on every input event - through the
     same rig and the same measurement. Review 9 replaced a version of this
     test that built its own 40 ms gaps and then confirmed they were under
     180 ms, which is a statement about the test, not the code. */
  const passThrough: Deferrer = (fn) => fn;
  const out = irregularTyping(passThrough);
  expect(out.minRender).toBeLessThan(SEARCH_DEBOUNCE_MS);
});

test('R304: cancel drops a pending render', () => {
  /* the timer is module state in the client and outlives a navigation away */
  vi.useFakeTimers();
  let renders = 0;
  const run = debounce(() => { renders++; }, SEARCH_DEBOUNCE_MS);
  run();
  run.cancel();
  vi.advanceTimersByTime(1000);
  expect(renders).toBe(0);
});

test('the acronym coalescer merges a burst of mutations into one sweep', () => {
  /* Review 9: every test above passed with a coalescer that ran on every call,
     because one render made one call. This is the test that pins the merge. */
  vi.useFakeTimers();
  let sweeps = 0;
  const schedule = coalesce(() => { sweeps++; }, ACRONYM_SWEEP_DELAY_MS);
  for (let i = 0; i < 10; i++) { schedule(); vi.advanceTimersByTime(10); }
  vi.advanceTimersByTime(ACRONYM_SWEEP_DELAY_MS);
  expect(sweeps).toBe(1);
});

test('the acronym coalescer runs even while mutations never pause', () => {
  /* Why it is not a debounce: a page that keeps mutating must still be swept,
     once per delay and no more. Calls every 20 ms for a second sweep at 200,
     400, 600, 800 and 1000 - a debounce would sweep zero times, a pass-through
     fifty. */
  vi.useFakeTimers();
  let sweeps = 0;
  const schedule = coalesce(() => { sweeps++; }, ACRONYM_SWEEP_DELAY_MS);
  for (let i = 0; i < 50; i++) { schedule(); vi.advanceTimersByTime(20); }
  expect(sweeps).toBe(5);
});

/* =========================================================================
 * The Physical Care visits slider. Its input listener called refreshUnits()
 * on every event: the allocation over 3,144 counties, the tiles, the map's
 * 3,144 dots and the state table, once per event however fast they came. The
 * listener now writes the readout and asks coalesceOn for the refresh.
 *
 * units-client.ts cannot be imported here, so `visitsSlider` is its listener
 * and the frames are run by hand. The drag measurement is also run against
 * three wirings it rules out, so each of its three properties is shown to be
 * able to fail. A rig proves nothing about the call site, so the last two
 * tests read units-client.ts and check the wiring itself.
 * ========================================================================= */

/** requestAnimationFrame's contract, advanced by hand: `frame()` runs every
 *  callback requested before it began, and one requested during a frame
 *  waits for the next. */
function handFrames(): Clock<number> & { frame(): void } {
  let nextHandle = 1;
  let due = new Map<number, () => void>();
  return {
    request(callback) { due.set(nextHandle, callback); return nextHandle++; },
    cancel(handle) { due.delete(handle); },
    frame() {
      const running = due;
      due = new Map();
      running.forEach((callback) => callback());
    }
  };
}

type FrameDeferrer = (fn: () => void, frames: Clock<number>) => () => void;

/** units-client.ts's listener without the readout: set the value, ask for a
 *  refresh. The refresh records the value it drew. */
function visitsSlider(frames: Clock<number>, defer: FrameDeferrer): { input(value: number): void; drawn: number[] } {
  let visitsPerCapita = 1.5;
  const drawn: number[] = [];
  const refresh = defer(() => { drawn.push(visitsPerCapita); }, frames);
  return {
    input(value) { visitsPerCapita = value; refresh(); },
    drawn
  };
}

interface Drag {
  /** frames with at least one input event before them */
  moved: number;
  /** refreshes run */
  draws: number;
  /** the most refreshes run between one frame and the next */
  busiest: number;
  /** frames that ended with the page showing a value other than the slider's */
  behind: number;
}

/** An uneven hand that never lets go for long: 0 to 4 input events between
 *  consecutive frames, 16 ms of clock per frame, for 300 frames. */
function irregularDrag(defer: FrameDeferrer): Drag {
  vi.useFakeTimers();
  const frames = handFrames();
  const slider = visitsSlider(frames, defer);
  const next = lehmer(11);
  let value = NaN;
  const out: Drag = { moved: 0, draws: 0, busiest: 0, behind: 0 };
  for (let f = 0; f < 300; f++) {
    const before = slider.drawn.length;
    const events = Math.floor(next() * 5);
    for (let e = 0; e < events; e++) {
      value = 1.2 + 0.05 * Math.floor(next() * 13);
      slider.input(value);
    }
    if (events > 0) out.moved++;
    vi.advanceTimersByTime(16);
    frames.frame();
    out.busiest = Math.max(out.busiest, slider.drawn.length - before);
    /* before the first input there is nothing to be behind; after it, a page
       that has drawn nothing is as far behind as one showing a stale value */
    if (!Number.isNaN(value) && slider.drawn[slider.drawn.length - 1] !== value) out.behind++;
  }
  out.draws = slider.drawn.length;
  return out;
}

test('units slider: a drag refreshes at most once a frame, and every frame ends on the slider value', () => {
  const out = irregularDrag(coalesceOn);
  expect(out.moved, 'the drag never moved').toBeGreaterThan(200);
  expect(out.busiest).toBe(1);
  expect(out.behind).toBe(0);
  /* and never starved: every frame that follows an input draws */
  expect(out.draws).toBe(out.moved);
});

test('units slider: the same measurement fails for a refresh wired straight to the input event', () => {
  /* the defect as found: one refresh per event */
  const out = irregularDrag((fn) => fn);
  expect(out.busiest).toBeGreaterThan(1);
});

test('units slider: and for a throttle that draws the first value of a frame and drops the rest', () => {
  /* it bounds the work as well as the right answer does, which is why the
     value a frame ends on is measured separately */
  const firstOfFrame: FrameDeferrer = (fn, frames) => {
    let open = true;
    return () => {
      if (!open) return;
      open = false;
      fn();
      frames.request(() => { open = true; });
    };
  };
  const out = irregularDrag(firstOfFrame);
  expect(out.busiest).toBeLessThanOrEqual(1);
  expect(out.behind).toBeGreaterThan(0);
});

test('units slider: and for a debounce, which draws nothing while the hand keeps moving', () => {
  const out = irregularDrag((fn) => debounce(fn, 100));
  expect(out.draws).toBeLessThan(out.moved);
  expect(out.behind).toBeGreaterThan(0);
});

test('units slider: cancel drops a pending frame, and the next call still draws', () => {
  /* initUnits() cancels it: a frame left over from the page being left would
     run refreshUnits() after the county list is reset to null */
  const frames = handFrames();
  let draws = 0;
  const refresh = coalesceOn(() => { draws++; }, frames);
  refresh();
  refresh.cancel();
  frames.frame();
  expect(draws, 'the cancelled frame drew').toBe(0);
  refresh();
  frames.frame();
  expect(draws, 'nothing drew after the cancel').toBe(1);
});

test('units slider: a refresh that throws does not stop the frames after it', () => {
  const frames = handFrames();
  let calls = 0;
  const refresh = coalesceOn(() => {
    calls++;
    if (calls === 1) throw new TypeError("Cannot read properties of null (reading 'forEach')");
  }, frames);
  refresh();
  expect(() => frames.frame()).toThrow(TypeError);
  refresh();
  frames.frame();
  expect(calls).toBe(2);
});

test('the browser clock calls requestAnimationFrame as a function, not as its own method', () => {
  /* a browser refuses any receiver but the window: "Illegal invocation" */
  const calls: string[] = [];
  vi.stubGlobal('requestAnimationFrame', function (this: unknown, callback: () => void): number {
    if (this !== undefined && this !== globalThis) throw new TypeError('Illegal invocation');
    calls.push('request');
    callback();
    return 7;
  });
  vi.stubGlobal('cancelAnimationFrame', function (this: unknown, handle: number): void {
    if (this !== undefined && this !== globalThis) throw new TypeError('Illegal invocation');
    calls.push('cancel ' + handle);
  });
  const handle = animationFrames.request(() => { calls.push('frame'); });
  animationFrames.cancel(handle);
  expect(calls).toEqual(['request', 'frame', 'cancel 7']);
});

/* =========================================================================
 * The wiring, which the rig above cannot reach.
 *
 * The review of the slider fix measured the gap: putting the listener back to
 * a synchronous refresh failed none of the 618 tests, because every one of
 * them drove the coalescer directly. A client script touches `document` as it
 * is evaluated and cannot be imported here, so these two read it as text.
 *
 * Both identifiers are READ OUT of the source rather than typed in, so a
 * rename keeps the check honest: what is pinned is that the listener calls
 * the coalesced wrapper and not the refresh itself, which is the defect this
 * work removed. Comments are masked first, so a sentence about the code
 * cannot satisfy a check about the code.
 * ========================================================================= */

/** units-client.ts with comments masked. */
function unitsClientSource(): string {
  const src = readFileSync('src/scripts/units-client.ts', 'utf8');
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/gm, '$1');
}

test('the visits slider asks the coalescer, and initUnits cancels it before it empties DATA', () => {
  const src = unitsClientSource();
  const built = /const\s+(\w+)\s*=\s*coalesceOn\(\s*(\w+)\s*,/.exec(src);
  expect(built, 'units-client.ts builds no coalescer').toBeTruthy();
  const wrapper = built![1], refresh = built![2];

  const listener = /addEventListener\(\s*'input'\s*,\s*function\s*\([^)]*\)\s*\{([\s\S]*?)\n\s*\}\)/.exec(src);
  expect(listener, "the visits slider's input listener was not found").toBeTruthy();
  const body = listener![1];
  expect(body, 'the listener no longer asks the coalescer').toMatch(
    new RegExp(wrapper + '\\s*\\('));
  expect(body, 'the listener refreshes synchronously again').not.toMatch(
    new RegExp(refresh + '\\s*\\('));

  /* the cancel has to come before the reset, not merely exist: a frame that
     runs after DATA is emptied throws on the null county list */
  const init = /function initUnits\(\)[\s\S]*?\n\}/.exec(src);
  expect(init, 'initUnits was not found').toBeTruthy();
  const cancelAt = init![0].indexOf(wrapper + '.cancel()');
  const emptiedAt = init![0].indexOf('DATA.counties = null');
  expect(cancelAt, 'initUnits does not cancel a pending refresh').toBeGreaterThan(-1);
  expect(emptiedAt, 'initUnits no longer empties DATA').toBeGreaterThan(-1);
  expect(emptiedAt, 'DATA is emptied before the pending frame is cancelled')
    .toBeGreaterThan(cancelAt);
});

test('the page being left cancels what it asked for, before ClientRouter swaps it', () => {
  /* initUnits() only runs on a page that has a county map, so on a navigation
     to any other chapter it returns at its own guard and cancels nothing. */
  const src = unitsClientSource();
  const swap = /addEventListener\(\s*'astro:before-swap'\s*,\s*function\s*\([^)]*\)\s*\{([\s\S]*?)\n\}\)/.exec(src);
  expect(swap, 'nothing cancels on astro:before-swap').toBeTruthy();
  const body = swap![1];
  const frame = /const\s+(\w+)\s*=\s*coalesceOn\(/.exec(src)![1];
  const table = /const\s+(\w+)\s*=\s*debounce\(/.exec(src)![1];
  expect(body, 'the pending refresh survives the swap').toContain(frame + '.cancel()');
  expect(body, 'the pending table rebuild survives the swap').toContain(table + '.cancel()');
});

/* =========================================================================
 * P21 [§S15]: deferred work runs only for the page that asked for it.
 *
 * Two defects of one shape, both measured in headless Chrome before this
 * existed. The health page's 160 ms render, scheduled by a slider and still
 * pending when the reader left, ran on the Overview in 4 of 4 trials (0 of 4
 * with the slider untouched): it redrew #flow-today-solo, the one id the two
 * pages share, and ran a Monte Carlo pass on the page that had just arrived.
 * And the Physical Care data fetch, still in flight when the reader left and
 * came back, wired the returned page a second time: 2 listeners on the
 * slider, the region select and each filter button, against 1 without the
 * round trip.
 * ========================================================================= */

test('a bound callback runs while its page is in the document', () => {
  const host = { isConnected: true };
  const calls: number[] = [];
  const bound = boundToPage(host, function (n: number) { calls.push(n); });
  bound(1);
  bound(2);
  expect(calls).toEqual([1, 2]);
});

test('a bound callback does nothing once its page has left, checked when it runs', () => {
  /* One wrapper, called before and after its page leaves: a wrapper that
     read isConnected once, when it was made, would run both calls. Review of
     P21 removed a third test here whose comment claimed a case this one did
     not already cover. */
  const host = { isConnected: true };
  const calls: string[] = [];
  const bound = boundToPage(host, function (s: string) { calls.push(s); });
  bound('before');
  host.isConnected = false;
  bound('after the swap');
  expect(calls).toEqual(['before']);
});
