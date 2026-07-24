/* Port of NHA.fmt from docs/js/charts.js (near line 30). Verbatim logic. */

/** $B -> compact string; keeps one decimal below 10T */
export function money(b: number): string {
  if (!isFinite(b)) return "n/a";
  var neg = b < 0 ? "−" : "", a = Math.abs(b);
  if (a >= 1000) return neg + "$" + (a / 1000).toFixed(2) + "T";
  return neg + "$" + Math.round(a) + "B";
}

export function moneyShort(b: number): string {
  var neg = b < 0 ? "−" : "", a = Math.abs(b);
  if (a >= 1000) return neg + "$" + (a / 1000).toFixed(1) + "T";
  return neg + "$" + Math.round(a) + "B";
}

export function pct(x: number, d?: number): string {
  return x.toFixed(d == null ? 1 : d) + "%";
}

export function perCap(x: number): string {
  return "$" + Math.round(x).toLocaleString("en-US");
}

export function axis(b: number): string {
  if (Math.abs(b) >= 1000) return "$" + (b / 1000) + "T";
  return "$" + b + "B";
}
