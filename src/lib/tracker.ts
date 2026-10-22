/* healthcare-docs-tracker.csv: its schema, the two vocabularies its rows are
   classified by, and the checks that read it. Pure: research-check.ts reads
   the file and hands the text in, so node:fs stays where the repo keeps it.

   R201 [§S17] (§BG4-§BG6): the file was loaded once, on 2026-07-14, and the
   schema gave a reader no way to ask which rows were stale. Every row carried
   the same date_added, so that column could not tell a row checked last week
   from one written once; `status` used six words with overlapping meanings
   (`superseded` covered an expiry, a lapse and a dismissal, none of them
   superseded by anything); and key_date mixed enactment, effective, expiry
   and enforcement dates in one column with nothing saying which. The fix is
   two columns and two declared vocabularies:
   - last_verified: when the row's facts were last checked against its
     source. For a row unchanged since the bulk load that is the load date;
     editing a row's wording does not move it, checking its facts does.
   - key_date_type: what key_date is the date of.
   - TRACKER_STATUS and KEY_DATE_TYPES below, each word with what it means,
     so a status is a classification a reader can apply and not a label. */
import { parseCsv } from './baseline-registry';

export const TRACKER_FILE = 'healthcare-docs-tracker.csv';

/* The legal state of the instrument the row tracks, as of last_verified. */
export const TRACKER_STATUS = {
  pending: 'proposed, introduced or under review, and not adopted',
  enacted: 'signed into law, with no provision the row names in force yet',
  final: 'issued in final form and not yet in force',
  not_enforced: 'in force on paper, with enforcement suspended by the body that issued it',
  in_effect: 'in force now, in whole or in part, or a court ruling that binds now',
  expired: 'ended by its own terms: a sunset, a lapse, or authority not renewed',
  struck_down: 'set aside, vacated or enjoined in full by a court',
  dismissed: 'a case that ended without a ruling on the merits',
  superseded: 'replaced by a later instrument'
} as const;
export type TrackerStatus = keyof typeof TRACKER_STATUS;

/* What key_date is the date of. */
export const KEY_DATE_TYPES = {
  enacted: 'the day a statute was signed into law',
  issued: 'the day a rule, guidance, order or agency decision was issued or published',
  effective: 'the day it took or takes legal effect',
  enforcement: 'the day enforcement began or begins, when later than legal effect',
  expiry: 'the day it ended or ends',
  decided: 'the day a court ruled or a case ended'
} as const;
export type KeyDateType = keyof typeof KEY_DATE_TYPES;

export interface TrackerRow {
  line: number;
  fields: Record<string, string>;
}

export function trackerRows(text: string): { head: string[]; rows: TrackerRow[] } {
  const parsed = parseCsv(text);
  const head = parsed[0] || [];
  const rows = parsed.slice(1).map(function (r, i) {
    const fields: Record<string, string> = {};
    head.forEach(function (h, j) { fields[h] = r[j] === undefined ? '' : r[j]; });
    return { line: i + 2, fields: fields };
  });
  return { head: head, rows: rows };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/* A real calendar day in YYYY-MM-DD. Exported for the research-date check
   (review of P23: manifest-check.ts carried a second copy). */
export function isDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/* R201's three tests, and the schema they stand on. Returns what it checked
   beside what it found, so an empty file is a fault rather than a pass. */
export const R201_COLUMNS = ['date_added', 'last_verified', 'status', 'key_date', 'key_date_type'];

export function trackerSchemaFaults(text: string): { rows: number; faults: string[] } {
  const { head, rows } = trackerRows(text);
  const faults: string[] = [];
  R201_COLUMNS.forEach(function (c) {
    if (head.indexOf(c) < 0) faults.push(TRACKER_FILE + ' has no ' + c + ' column');
  });
  if (faults.length) return { rows: rows.length, faults: faults };
  if (!rows.length) return { rows: 0, faults: [TRACKER_FILE + ' has no rows'] };
  const statuses: readonly string[] = Object.keys(TRACKER_STATUS);
  const dateTypes: readonly string[] = Object.keys(KEY_DATE_TYPES);
  rows.forEach(function (r) {
    const f = r.fields;
    const where = 'line ' + r.line + ' (' + (f.title || '').slice(0, 40) + ')';
    if (!isDate(f.date_added)) faults.push(where + ': date_added "' + f.date_added + '" is not a date');
    if (!isDate(f.last_verified)) faults.push(where + ': last_verified "' + f.last_verified + '" is not a date');
    else if (isDate(f.date_added) && f.last_verified < f.date_added) {
      faults.push(where + ': last_verified ' + f.last_verified + ' is before date_added ' + f.date_added);
    }
    if (statuses.indexOf(f.status) < 0) faults.push(where + ': status "' + f.status + '" is not declared');
    if (!isDate(f.key_date)) faults.push(where + ': key_date "' + f.key_date + '" is not a date');
    if (dateTypes.indexOf(f.key_date_type) < 0) {
      faults.push(where + ': key_date_type "' + f.key_date_type + '" is not declared');
    }
  });
  return { rows: rows.length, faults: faults };
}

/* ---- R198 [§S17] (§BG1): template text in a legal tracker -----------------
 * The ACA and No Surprises Act rows, the two most foundational statutes in the
 * file, shipped reading "Example row - replace with your own research." Both
 * are researched rows now. Template scaffolding has a small set of tells, and
 * this looks for them in every field of every row, so the class is what is
 * checked and not the one sentence that was found. (Review of P23: the first
 * version read three of the columns and called that every field a reader
 * meets; model_link_note, added later, was never read.) */
export const TEMPLATE_TELLS: Array<[RegExp, string]> = [
  [/\bexample row\b/i, 'example row'],
  [/\breplace with your own\b/i, 'replace with your own'],
  [/\blorem ipsum\b/i, 'lorem ipsum'],
  [/\b(?:TODO|TBD|FIXME)\b/, 'a to-do marker'],
  [/\bplaceholder\b/i, 'placeholder']
];
export function trackerTemplateFaults(text: string): { fields: number; faults: string[] } {
  const { head, rows } = trackerRows(text);
  const faults: string[] = [];
  let fields = 0;
  rows.forEach(function (r) {
    head.forEach(function (c) {
      const v = r.fields[c] || '';
      if (!v.trim()) return;
      fields += 1;
      for (const [tell, what] of TEMPLATE_TELLS) {
        if (tell.test(v)) faults.push('line ' + r.line + ' ' + c + ' carries template text (' + what + ')');
      }
    });
  });
  if (!fields) faults.push(TRACKER_FILE + ': no row has text to read');
  return { fields: fields, faults: faults };
}

/* ---- R202 [§S17] (§BG3): a status its own dates contradict ----------------
 * The CMS work-requirement rule's row said `final` with key_date 2026-07-31,
 * and its own summary read "the rule itself takes effect July 31, 2026". The
 * row was right on the day it was written and wrong two weeks later, and
 * nothing in the file could notice: a tracker records trigger dates in prose
 * and acts on none of them.
 *
 * A status is checked against two kinds of date: the key date when its type
 * says it is an effective date, and every date the summary itself states as
 * the day something takes effect. "As of" is a parameter, and the two callers
 * mean different things by it:
 *   - the build passes nothing, and each row is checked as of its own
 *     last_verified, which is deterministic: a row that contradicted itself on
 *     the day it was checked is a defect in the file;
 *   - tests/lib/tracker.test.ts passes today's date, which is the control: a
 *     trigger that has passed since a row was checked fails `pnpm test` until
 *     someone re-checks the row and moves its last_verified. The build does
 *     not read the clock, so a deploy never fails because a date went by. */
const PRE_OPERATIVE: readonly string[] = ['pending', 'enacted', 'final'];
/* in force, whether or not enforced: the one list both checks below read
   (review 2 of P23: R200 kept its own list, without `not_enforced`) */
const IN_FORCE: readonly string[] = ['in_effect', 'not_enforced'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const STATED_EFFECTIVE = new RegExp(
  '\\b(?:takes? effect|took effect|(?:becomes?|became|is|was) effective|effective)\\s+(?:on\\s+)?(' +
  MONTHS.join('|') + ') (\\d{1,2}), (\\d{4})', 'gi');

/* Every date the summary states as the day something takes effect, as
   YYYY-MM-DD. "Effective dates are staggered" names no day and yields none. */
export function statedEffectiveDates(summary: string): string[] {
  const out: string[] = [];
  STATED_EFFECTIVE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = STATED_EFFECTIVE.exec(summary)) !== null) {
    /* case-insensitive, so "Effective January 1" opening a sentence counts */
    const month = MONTHS.findIndex((x) => x.toLowerCase() === m![1].toLowerCase()) + 1;
    out.push(m[3] + '-' + String(month).padStart(2, '0') + '-' + m[2].padStart(2, '0'));
  }
  return out;
}

export function trackerDateContradictions(text: string, asOf?: string): { rows: number; dated: number; faults: string[] } {
  const { rows } = trackerRows(text);
  const faults: string[] = [];
  let dated = 0;
  rows.forEach(function (r) {
    const f = r.fields;
    const when = asOf || f.last_verified;
    const where = 'line ' + r.line + ' (' + (f.title || '').slice(0, 40) + ')';
    const triggers = statedEffectiveDates(f.summary || '');
    if (f.key_date_type === 'effective') triggers.push(f.key_date);
    /* one row counts once, whichever dates it carries (review of P23) */
    if (triggers.length || f.key_date_type === 'expiry') dated += 1;
    if (PRE_OPERATIVE.indexOf(f.status) >= 0) {
      const passed = triggers.filter((d) => d <= when).sort();
      if (passed.length) {
        faults.push(where + ': `' + f.status + '`, but it took effect on ' + passed[0] +
          ', on or before ' + when);
      }
    }
    /* `not_enforced` is in force on paper (review of P23: the first version
       folded it into `final`, so a true effective date in a non-enforced
       rule's summary would have demanded a status the vocabulary called
       wrong) */
    if (IN_FORCE.indexOf(f.status) >= 0 &&
      f.key_date_type === 'effective' && f.key_date > when) {
      faults.push(where + ': `' + f.status + '` before its effective date ' + f.key_date + ' (as of ' + when + ')');
    }
    if (f.status === 'expired' && f.key_date_type === 'expiry' && f.key_date > when) {
      faults.push(where + ': `expired` before its expiry date ' + f.key_date + ' (as of ' + when + ')');
    }
  });
  if (!dated) faults.push(TRACKER_FILE + ': no row carries an effective or expiry date, so nothing was checked');
  return { rows: rows.length, dated: dated, faults: faults };
}

/* ---- R200 [§S17] (§BG7): the tracker read back into the model -------------
 * The schema had no column tying a row to a parameter, so an enacted change
 * that moves a model input sat in the tracker as prose for a human, and the
 * parameter it moves said nothing about it. Two columns now:
 *   - affects_parameter: the params.ts ids the change bears on, separated by
 *     semicolons, or `no-model-impact`;
 *   - model_link_note: why, for either answer.
 * A row in force (in_effect or not_enforced) or enacted must answer. Every id must be a
 * parameter, and every parameter a row names must say so in its own source
 * note, which is the text the Healthcare page renders beside the value: the
 * note has to name the change by the row's short name (its title up to " - "
 * or " ("). That is what "no parameter's source note contradicts an in-force
 * row" can mean mechanically: a parameter the tracker says is affected cannot
 * stay silent about it. Whether the note's account is right is a reader's
 * judgment; that it exists is checked. */
export const NO_MODEL_IMPACT = 'no-model-impact';
const MUST_ANSWER: readonly string[] = IN_FORCE.concat(['enacted']);

export function trackerShortName(title: string): string {
  const cuts = [' - ', ' ('].map((s) => title.indexOf(s)).filter((i) => i > 0);
  return cuts.length ? title.slice(0, Math.min(...cuts)) : title;
}

export function trackerParameterLinkFaults(
  text: string, params: Record<string, { source?: string }>
): { linked: string[]; answered: number; faults: string[] } {
  const { head, rows } = trackerRows(text);
  const faults: string[] = [];
  for (const c of ['affects_parameter', 'model_link_note']) {
    if (head.indexOf(c) < 0) faults.push(TRACKER_FILE + ' has no ' + c + ' column');
  }
  if (faults.length) return { linked: [], answered: 0, faults: faults };
  const linked = new Set<string>();
  let answered = 0;
  rows.forEach(function (r) {
    const f = r.fields;
    const where = 'line ' + r.line + ' (' + (f.title || '').slice(0, 40) + ')';
    const value = (f.affects_parameter || '').trim();
    if (!value) {
      if (MUST_ANSWER.indexOf(f.status) >= 0) faults.push(where + ': `' + f.status + '` and names no parameter and no ' + NO_MODEL_IMPACT);
      return;
    }
    answered += 1;
    if ((f.model_link_note || '').trim().length < 40) faults.push(where + ': says ' + value + ' without a model_link_note saying why');
    if (value === NO_MODEL_IMPACT) return;
    const short = trackerShortName(f.title || '').toLowerCase();
    value.split(';').map((s) => s.trim()).forEach(function (id) {
      const p = params[id];
      if (id === NO_MODEL_IMPACT) { faults.push(where + ': names parameters and ' + NO_MODEL_IMPACT + ' at once'); return; }
      if (!p) { faults.push(where + ': "' + id + '" is not a parameter'); return; }
      linked.add(id);
      if ((p.source || '').toLowerCase().indexOf(short) < 0) {
        faults.push(where + ': ' + id + '\'s source note does not mention "' + trackerShortName(f.title) + '"');
      }
    });
  });
  if (!linked.size) faults.push(TRACKER_FILE + ': no row names a parameter, so nothing was read back into the model');
  return { linked: [...linked].sort(), answered: answered, faults: faults };
}
