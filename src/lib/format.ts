/* Port of NHA.fmt from docs/js/charts.js (near line 30). Verbatim logic.
 *
 * R195/R196/R197 [§S12]: three defects that were one defect. Only money()
 * guarded isFinite, so its four siblings rendered "$InfinityT", "Infinity%",
 * "$∞" and "$NaNB" into the DOM - and taxmodel's coverage returns Infinity
 * when need is zero and revenue is positive, which is rendered as a
 * percentage. money() signed a negative with U+2212 before the symbol while
 * axis(), perCap() and pct() used the hyphen-minus after it, so one negative
 * had two renderings on one chart. And axis() had no toFixed on its T branch,
 * so a tick at 1234 read "$1.234T".
 *
 * The three rules every formatter here now obeys, asserted as properties in
 * tests/lib/format.test.ts rather than as a list of expected strings:
 *   1. non-finite input renders NOT_FINITE, never a number-shaped string;
 *   2. a negative renders as MINUS followed by the formatting of its
 *      magnitude, so there is exactly one negative rendering;
 *   3. a value crossing into T carries a fixed number of decimals. */

/** U+2212. Not the hyphen-minus: this is the one negative sign. */
const MINUS = '−';

/** What every formatter renders when handed Infinity, -Infinity or NaN. */
const NOT_FINITE = 'n/a';

/** $B -> compact string; keeps one decimal below 10T */
export function money(b: number): string {
  if (!isFinite(b)) return NOT_FINITE;
  var neg = b < 0 ? MINUS : "", a = Math.abs(b);
  if (a >= 1000) return neg + "$" + (a / 1000).toFixed(2) + "T";
  return neg + "$" + Math.round(a) + "B";
}

export function moneyShort(b: number): string {
  if (!isFinite(b)) return NOT_FINITE;
  var neg = b < 0 ? MINUS : "", a = Math.abs(b);
  if (a >= 1000) return neg + "$" + (a / 1000).toFixed(1) + "T";
  return neg + "$" + Math.round(a) + "B";
}

export function pct(x: number, d?: number): string {
  if (!isFinite(x)) return NOT_FINITE;
  var neg = x < 0 ? MINUS : "", a = Math.abs(x);
  return neg + a.toFixed(d == null ? 1 : d) + "%";
}

export function perCap(x: number): string {
  if (!isFinite(x)) return NOT_FINITE;
  var neg = x < 0 ? MINUS : "", a = Math.abs(x);
  return neg + "$" + Math.round(a).toLocaleString("en-US");
}

/* Axis ticks come from niceTicks(), which can put a step below 100 on a narrow
   range - which is when the missing toFixed produced "$1.234T". Below 1000B
   axis deliberately keeps sub-unit precision where moneyShort rounds to whole
   billions: a tick at 4.5 and its neighbour at 5 must not print one label. */
export function axis(b: number): string {
  if (!isFinite(b)) return NOT_FINITE;
  var neg = b < 0 ? MINUS : "", a = Math.abs(b);
  if (a >= 1000) return neg + "$" + (a / 1000).toFixed(1) + "T";
  return neg + "$" + a + "B";
}
