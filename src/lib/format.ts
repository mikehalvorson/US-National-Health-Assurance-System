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

/* R194 [§S16]: round before testing the unit threshold.
 *
 * money() tested `a >= 1000` on the unrounded value and then rounded in the
 * B branch, so everything in [999.5, 1000) printed "$1000B", a form the app
 * uses nowhere else, where "$1.00T" was meant. moneyShort() had the same
 * shape. The B branch's own rounding now decides the unit: a value is shown in
 * B only when it still reads below 1000 once rounded the way B rounds.
 *
 * The same shape sat in three formatters inside tax-charts.ts, where it
 * printed "$1000k" and "1000.0M"; they live below now so they can be tested,
 * and tests/lib/format.test.ts holds every unit formatter here to one
 * property: no printed figure reaches the next unit's threshold. */

/* Review 3 of P24: a count in words, for prose. One list: the catalog note
   check, the Governance and manifest sentences and the workforce derivation
   read it, and tools/extract_quality_catalog.py's copy is held to it by a test. */
export const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
export function numberWord(n: number): string {
  const w = NUMBER_WORDS[n];
  if (w === undefined) throw new Error('no word for ' + n);
  return w;
}

/** $B -> compact string; keeps one decimal below 10T */
export function money(b: number): string {
  if (!isFinite(b)) return NOT_FINITE;
  var neg = b < 0 ? MINUS : "", a = Math.abs(b), whole = Math.round(a);
  if (whole >= 1000) return neg + "$" + (a / 1000).toFixed(2) + "T";
  return neg + "$" + whole + "B";
}

export function moneyShort(b: number): string {
  if (!isFinite(b)) return NOT_FINITE;
  var neg = b < 0 ? MINUS : "", a = Math.abs(b), whole = Math.round(a);
  if (whole >= 1000) return neg + "$" + (a / 1000).toFixed(1) + "T";
  return neg + "$" + whole + "B";
}

/** Whole dollars -> "$850k", "$4.2M", "$1.3B": whole thousands below a
    million, one decimal above. Unsigned on purpose: the wealth chart passes
    averages, which are positive. Was fmtW inside tax-charts.ts. */
export function dollarsKMB(v: number): string {
  if (!isFinite(v)) return NOT_FINITE;
  if (v >= 1e9 || +(v / 1e6).toFixed(1) >= 1000) return '$' + (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6 || Math.round(v / 1000) >= 1000) return '$' + (v / 1e6).toFixed(1) + 'M';
  return '$' + Math.round(v / 1000) + 'k';
}

/** Whole dollars -> "$640", "$4.2k", "$38k", "$1.2M", by magnitude only: the
    save-vs-pay chart writes "ahead" or "pays" (or a sign) itself, so the
    sign of `v` is deliberately dropped. Was fmtC inside tax-charts.ts. */
export function dollarsMagnitude(v: number): string {
  if (!isFinite(v)) return NOT_FINITE;
  const a = Math.abs(v);
  if (a >= 1e6 || Math.round(a / 1000) >= 1000) return '$' + (a / 1e6).toFixed(1) + 'M';
  if (a >= 1e4 || +(a / 1000).toFixed(1) >= 10) return '$' + Math.round(a / 1000) + 'k';
  if (a >= 1e3 || Math.round(a) >= 1000) return '$' + (a / 1000).toFixed(1) + 'k';
  return '$' + Math.round(a);
}

/** Millions of households -> "128.4M" or "850k". Was inline in tax-charts.ts. */
export function householdsMillions(m: number): string {
  if (!isFinite(m)) return NOT_FINITE;
  if (m >= 1 || Math.round(m * 1000) >= 1000) return m.toFixed(1) + 'M';
  return Math.round(m * 1000) + 'k';
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
