/* Checks over the Legislation chapter's data that need another module's
   registry. Kept apart from legislation.ts because that file is imported by
   the chapter's client script, and these would carry the rollout registry
   into the reader's bundle for nothing. Pure; build time and tests only. */
import { DISPOSITIONS, DOMAINS } from './legislation';
import { GATES, PHASES } from './rollout';

/* R99 [§S17] (§AJ8): every domain's `phase` field is free text naming the
   rollout's phases and gates ("P1 charter authority; P3 claims; P5-P6
   scale; ... Gate 8 continuity proof"), and nothing tied a token to the
   phase registry, so renaming or renumbering a phase would leave thirteen
   public strings pointing at nothing. Each token now resolves against
   rollout.ts: a P-number against PHASES, a range's two ends in order, and
   "Gate N" against GATES. Returns how many tokens it resolved, and reading
   none is a fault. */
const PHASE_TOKEN = /\bP(\d+)(?:\s*[-–]\s*P(\d+))?\b/g;
const GATE_TOKEN = /\bGate (\d+)\b/g;

export function phaseTokenFaults(
  domains: { title: string; phase: string }[] = DOMAINS,
  phaseIds: string[] = PHASES.map((p) => p.id),
  gateIds: string[] = GATES.map((g) => g.n)
): { tokens: number; faults: string[] } {
  const faults: string[] = [];
  let tokens = 0;
  domains.forEach(function (d) {
    PHASE_TOKEN.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PHASE_TOKEN.exec(d.phase)) !== null) {
      tokens += 1;
      const ends = m[2] === undefined ? [m[1]] : [m[1], m[2]];
      ends.forEach(function (n) {
        if (phaseIds.indexOf('P' + n) < 0) faults.push(d.title + ': "' + m![0] + '" names P' + n + ', which the rollout does not declare');
      });
      if (m[2] !== undefined && Number(m[2]) <= Number(m[1])) {
        faults.push(d.title + ': "' + m[0] + '" runs backwards or names one phase twice');
      }
    }
    GATE_TOKEN.lastIndex = 0;
    while ((m = GATE_TOKEN.exec(d.phase)) !== null) {
      tokens += 1;
      if (gateIds.indexOf('G' + m[1]) < 0) faults.push(d.title + ': "' + m[0] + '" names a gate the rollout does not declare');
    }
  });
  if (!tokens) faults.push('no domain names a phase or gate, so nothing was resolved');
  return { tokens: tokens, faults: faults };
}

/* ---- R100 [§S17] (§AJ9): the chapter's invariants, as self-tests ----------
 * legislation.js shipped with no self-test; the live port had two rows (the
 * stylesheet and the crosswalk vocabulary) and its vitest cases, and nothing
 * on the self-test surface that renders in the site footer. The row lists
 * the invariants, each one assertion: thirteen domains; each with a law, a
 * source, and its four prose fields; every source a [label, url] pair with an
 * absolute https url; plus the counter, vocabulary and phase assertions of
 * R94, R95 and R99. selftests.ts registers six rows as the surface
 * 'legislation-check.ts': the two shape rows, every declared disposition
 * used (R95's other direction; that every badge is declared is the
 * import-time throw in legislation.ts and its vitest cases), the Preserve
 * badge (R96), the phase tokens (R99), and the act's nineteen titles (the
 * V10 count R94 asserts). R94's counters themselves are vitest-only: they
 * are what the page renders, which a build row cannot read. (Review of
 * P23: this said all three rows' assertions were registered here.) */
const PROSE_FIELDS = ['change', 'preserve', 'method', 'phase'] as const;

export function domainShapeFaults(
  domains: Array<{ title: string; laws: string[]; sources: unknown[] } & Record<(typeof PROSE_FIELDS)[number], string>> = DOMAINS
): { domains: number; faults: string[] } {
  const faults: string[] = [];
  domains.forEach(function (d, i) {
    const name = d.title || 'domain ' + (i + 1);
    if (!d.laws.length || d.laws.some((l) => !l.trim())) faults.push(name + ': no law, or an empty one');
    if (!d.sources.length) faults.push(name + ': no source');
    PROSE_FIELDS.forEach(function (f) { if (!(d[f] || '').trim()) faults.push(name + ': empty ' + f); });
  });
  if (!domains.length) faults.push('no legal domain to check');
  return { domains: domains.length, faults: faults };
}

export function sourceShapeFaults(
  domains: Array<{ title: string; sources: unknown[] }> = DOMAINS
): { sources: number; faults: string[] } {
  const faults: string[] = [];
  let sources = 0;
  domains.forEach(function (d) {
    d.sources.forEach(function (s, j) {
      sources += 1;
      const where = d.title + ' source ' + (j + 1);
      if (!Array.isArray(s) || s.length !== 2 || typeof s[0] !== 'string' || typeof s[1] !== 'string') {
        faults.push(where + ' is not a [label, url] pair');
        return;
      }
      if (!s[0].trim()) faults.push(where + ' has no label');
      let url: URL | null = null;
      try { url = new URL(s[1]); } catch { url = null; }
      if (!url || url.protocol !== 'https:' || s[1] !== s[1].trim()) {
        faults.push(where + ' is not an absolute https url: "' + s[1] + '"');
      }
    });
  });
  if (!sources) faults.push('no legal source to check');
  return { sources: sources, faults: faults };
}

/* That every badge is a declared disposition is enforced where it cannot be
   missed: legislation.ts throws at import on an undeclared one, so a row
   asking it again could never fail on its own. This asks the other
   direction, which nothing held: a declared disposition no domain uses sits
   in the page's key describing nothing. */
export function unusedDispositions(
  domains: Array<{ actions: readonly string[] }> = DOMAINS,
  declared: readonly string[] = DISPOSITIONS
): { badges: number; unused: string[] } {
  const badges = domains.reduce((n, d) => n + d.actions.length, 0);
  return { badges: badges, unused: declared.filter((d) => !domains.some((x) => x.actions.indexOf(d) >= 0)) };
}

/* R96 [§S17] (§AJ4): a domain whose `preserve` field is non-empty, as the row's
   test puts it, carries the Preserve badge, unless it is declared here with the reason the
   badge would mislead. Empty since R96; an entry naming a domain that carries
   the badge, or no domain at all, is reported, so an exemption cannot outlive
   its reason. */
export const PRESERVE_BADGE_EXCEPTIONS: Record<string, string> = {};

export function preserveBadgeFaults(
  domains: { title: string; preserve: string; actions: readonly string[] }[] = DOMAINS,
  exceptions: Record<string, string> = PRESERVE_BADGE_EXCEPTIONS
): { read: number; faults: string[] } {
  const faults: string[] = [];
  let read = 0;
  domains.forEach(function (d) {
    if (!d.preserve.trim()) return;
    read += 1;
    const badged = d.actions.indexOf('Preserve') >= 0;
    if (!badged && !exceptions[d.title]) {
      faults.push(d.title + ': its preserve field is non-empty and it carries no Preserve badge');
    }
  });
  Object.keys(exceptions).forEach(function (title) {
    const d = domains.find((x) => x.title === title);
    if (!d) faults.push('the Preserve exception for "' + title + '" names no domain');
    else if (d.actions.indexOf('Preserve') >= 0) faults.push('the Preserve exception for "' + title + '" is stale: it carries the badge');
    else if (!exceptions[title].trim()) faults.push('the Preserve exception for "' + title + '" states no reason');
  });
  if (!read) faults.push('no domain states what it preserves, so nothing was checked');
  return { read: read, faults: faults };
}
