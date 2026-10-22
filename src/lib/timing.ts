/* =========================================================================
 * The timers that decide how often a client script redraws in response to
 * input, in one place so a test can drive them: `debounce`, and `coalesceOn`,
 * which runs a callback at most once per tick of whatever clock it is given -
 * a timeout for the site-wide acronym sweep, the browser's animation frames
 * for the Physical Care visits slider. And `boundToPage`, which keeps any
 * deferred callback from running after the page that scheduled it has gone.
 *
 * R304 [S14]: the Quality search ran a full catalog re-render on every
 * `input` event. Measured in the browser: the render itself is 4 to 68 ms,
 * but each rebuild is answered by `acronyms-client.ts` walking the whole
 * `<main>`, and the document did not stop mutating until 996 ms after one
 * keystroke.
 *
 * The search debounce and the acronym sweep's coalescer used to live inside
 * client scripts, which touch `document` while
 * they are evaluated and so cannot be imported by vitest. Review 8 of P20 moved
 * the debounce out and then tested its relationship to the acronym sweep by
 * typing both intervals into the test as literals - a comparison of two
 * constants the test itself declared, which could not fail. Review 9 moved the
 * sweep's coalescer here as well, so the test drives the real pair.
 * ========================================================================= */

/** How long the Quality search waits after the last keystroke before it
 *  re-renders the catalog. */
export const SEARCH_DEBOUNCE_MS = 180;

/** How long the site-wide acronym pass waits after the first mutation of a
 *  burst before it sweeps `<main>`, so a tab's own synchronous render and
 *  decorator finish first. */
export const ACRONYM_SWEEP_DELAY_MS = 200;

export interface Cancellable {
  (): void;
  /** drop a pending call - for a client script leaving the page */
  cancel(): void;
}

/** Call `fn` once, `ms` after the LAST call of the returned function. */
export function debounce(fn: () => void, ms: number): Cancellable {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const run = function (): void {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(function () {
      timer = null;
      fn();
    }, ms);
  } as Cancellable;
  run.cancel = function (): void {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  return run;
}

/** All a coalescer needs of the thing it waits on: ask to be called back, and
 *  drop that request. `H` is whatever kind of handle the clock hands out, so
 *  each clock keeps its own and nothing here asserts a type the compiler then
 *  stops checking (R127 [§S6a]). */
export interface Clock<H> {
  request(callback: () => void): H;
  cancel(handle: H): void;
}

/** A clock that ticks `ms` after it is asked. */
export function timeoutClock(ms: number): Clock<ReturnType<typeof setTimeout>> {
  return {
    request: function (callback) { return setTimeout(callback, ms); },
    cancel: function (handle) { clearTimeout(handle); }
  };
}

/** The browser's frames. Each call is wrapped rather than stored as a bare
 *  reference: invoked as a method of this object, `requestAnimationFrame`
 *  throws "Illegal invocation". */
export const animationFrames: Clock<number> = {
  request: function (callback) { return requestAnimationFrame(callback); },
  cancel: function (handle) { cancelAnimationFrame(handle); }
};

/**
 * Call `fn` at the clock's next tick; calls made before it join that tick, so
 * however many calls arrive, `fn` runs at most once per tick.
 *
 * Not a debounce, and not a throttle that runs on the first call, and on
 * `animationFrames` both differences matter to a slider. A debounce draws
 * nothing for as long as a drag keeps moving. A throttle that draws the first
 * value of a tick and drops the rest can leave the page a step behind the
 * control when the drag stops. `fn` takes no arguments and reads the current
 * state when the tick arrives, so the last call before it is the one drawn.
 *
 * Review of the slider fix: this was written twice, once over `setTimeout`
 * and once over `requestAnimationFrame`, the two bodies identical but for the
 * call they waited on. One body, two clocks.
 */
export function coalesceOn<H>(fn: () => void, clock: Clock<H>): Cancellable {
  let pending = false;
  /* undefined until the first request; a clock that answered with undefined
     itself would leave nothing to cancel, and neither clock here does */
  let handle: H | undefined;
  const run = function (): void {
    if (pending) return;
    pending = true;
    handle = clock.request(function () {
      /* cleared before fn runs: a refresh that throws must not leave every
         later call joining a tick that has already gone */
      pending = false;
      fn();
    });
  } as Cancellable;
  run.cancel = function (): void {
    if (pending && handle !== undefined) clock.cancel(handle);
    pending = false;
  };
  return run;
}

/**
 * Call `fn` once, `ms` after the FIRST call of a burst; calls made while that
 * run is pending join it.
 *
 * Not a debounce, and the difference is the point: a debounce can be starved
 * by a stream of calls that never pauses, and the acronym pass has to run even
 * while a page keeps mutating.
 */
export function coalesce(fn: () => void, ms: number): Cancellable {
  return coalesceOn(fn, timeoutClock(ms));
}

/** All `boundToPage` needs of a page: whether it is still in the document. */
export interface PageHost { readonly isConnected: boolean }

/**
 * P21 [§S15]: `fn`, run only while `host` is still in the document.
 *
 * <ClientRouter /> swaps `<body>` without ending the realm, so a timer, a
 * frame or a fetch continuation a page started keeps running after the page
 * is gone - against whatever document replaced it, looking up hosts by id
 * that may now belong to a different page. Measured twice in P21: the health
 * page's pending render redrew the Overview's money flow and ran a Monte
 * Carlo pass on arrival there, and a Physical Care fetch still in flight
 * when the reader left and came back wired the new page a second time.
 *
 * Pass the element the page's own guard sits on, or any element the page
 * owns: when the page leaves, so does it. The check is made when the
 * callback RUNS, which is the whole point - at bind time the page is always
 * still there.
 */
export function boundToPage<A extends unknown[]>(
  host: PageHost, fn: (...args: A) => void
): (...args: A) => void {
  return function (...args: A): void {
    if (host.isConnected) fn(...args);
  };
}
