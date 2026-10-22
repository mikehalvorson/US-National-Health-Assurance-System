/* R132 [§S18]: the plan's two upstream documents, read once.
 *
 * The repository carries two transcriptions of the plan, made by two
 * different toolchains (research/task_zero_findings.md): the Source Package
 * (`research/source_package_extract.md`, one definition per line, "ID: name.
 * Target X." or "ID: text. Trace: ... Verification: ...") and the full v2.0.0
 * FINAL document (`research/framework_v2_extract.md`, the same dictionaries
 * as table rows, plus Table G-1, which declares each cost family's id range
 * and count). The catalog in quality-data.ts is generated from the second;
 * the canonical CP registry from the first.
 *
 * The check that reads them here (R132): the two documents define the same
 * CP, KPP, TPP, SR and PR ids, and the same cost families with the same
 * counts, which Table G-1 declares too, so a future edit to one cannot
 * silently diverge from the other. The audit filed it as already passing
 * and asked for it to be held; measured 2026-10-12, it passes.
 *
 * R58 [§S18] reads the Source Package for a second purpose: every Data-tab
 * target marked as the plan's own matches it, a maturity row against the
 * metric's dictionary target, a row below maturity against a requirement
 * that traces to the metric and sets that floor. R117 (P3) already holds
 * each one against the catalog, which is generated from the full document;
 * this holds them against the other document, the one the row named.
 *
 * R169 [§S18] reads its requirements: requirements.ts decides which are
 * quantified and how each is shown, from the map `sourcePackage()` returns.
 * How a requirement's bound is read (`requirementBound`) lives there too.
 *
 * Build-time only: it reads files. Nothing a client script imports may
 * import it.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DATA_PHASES } from './data-phases';
import { everyMetric, type PhaseClaim } from './data-phases-checks';
import type { NumMeta } from './phase-targets';
import { boundsAgree, requirementBound, targetBound, type RequirementText } from './requirements';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

export const SOURCE_PACKAGE_EXTRACT = 'research/source_package_extract.md';
export const FRAMEWORK_EXTRACT = 'research/framework_v2_extract.md';

export type IdKind = 'CP' | 'KPP' | 'TPP' | 'SR' | 'PR';
export const ID_KINDS: IdKind[] = ['CP', 'KPP', 'TPP', 'SR', 'PR'];

const ID = '(?:CP-[A-Z]+-\\d{3}|(?:KPP|TPP)-[A-Z]*\\d+(?:\\.\\d+)?|(?:SR|PR)-[A-Z]+-\\d{3})';

export function idKind(id: string): IdKind {
  return id.split('-')[0] as IdKind;
}

export interface SourcePackage {
  ids: Set<string>;
  /* KPP/TPP id -> the target its dictionary line states */
  targets: Map<string, string>;
  requirements: Map<string, RequirementText>;
  /* CP family code -> number of definitions */
  families: Map<string, number>;
  /* CP id -> its name, for the registry check (review 3 of P24: one parser) */
  cpNames: Map<string, string>;
}

export interface FrameworkDocument {
  ids: Set<string>;
  families: Map<string, number>;
  /* Table G-1: family code -> the count it declares */
  declaredFamilies: Map<string, number>;
}

function read(rel: string, root: string): string[] {
  return readFileSync(join(root, rel), 'utf8').split('\n').map((l) => l.replace(/\r$/, ''));
}

const spCache = new Map<string, SourcePackage>();
const fwCache = new Map<string, FrameworkDocument>();

export function sourcePackage(root = REPO_ROOT): SourcePackage {
  const hit = spCache.get(root);
  if (hit) return hit;
  const out: SourcePackage = {
    ids: new Set(), targets: new Map(), requirements: new Map(),
    families: new Map(), cpNames: new Map()
  };
  const cp = /^\s*(CP-([A-Z]+)-\d{3}):\s*([^.]+)\./;
  const metric = /^\s*((?:KPP|TPP)-[A-Z]*\d+(?:\.\d+)?):\s*.*?\.\s+Target\s+(.*?)\.(?:\s+Domain:|\s*$)/;
  const requirement = /^\s*((?:SR|PR)-[A-Z]+-\d{3}):\s*(.*?)\s+Trace:\s*(.*?)\.\s+Verification:/;
  for (const line of read(SOURCE_PACKAGE_EXTRACT, root)) {
    let m = cp.exec(line);
    if (m) {
      out.ids.add(m[1]);
      out.families.set(m[2], (out.families.get(m[2]) || 0) + 1);
      out.cpNames.set(m[1], m[3]!.trim());
      continue;
    }
    m = metric.exec(line);
    if (m) { out.ids.add(m[1]); out.targets.set(m[1], m[2].trim()); continue; }
    m = requirement.exec(line);
    if (m) {
      out.ids.add(m[1]);
      out.requirements.set(m[1], {
        id: m[1], text: m[2].trim(),
        trace: m[3].split(',').map((t) => t.trim()).filter(Boolean)
      });
    }
  }
  spCache.set(root, out);
  return out;
}

/* Owner, 2026-10-12: the plan's per-capita cost ceiling, read from the
   requirement that sets it, for the Healthcare tab's per-person line. Here
   rather than in the page so the page's source names no requirement id. */
export const PER_CAPITA_CEILING_REQUIREMENT = 'PR-CST-003';
export function perCapitaCeiling(sp = sourcePackage()): number {
  return requiredBound(PER_CAPITA_CEILING_REQUIREMENT, 'a per-person dollar ceiling',
    (b) => b.cmp === '<=' && b.unit === 'money', sp).num;
}

/* Review 3 of P24: a page that publishes a requirement's figure reads it
   here, with the shape it needs said and checked, rather than writing out
   the lookup, the parse and the throw again (the Data tab's audit tile did). */
export function requiredBound(
  id: string, what: string, accept: (b: NumMeta) => boolean,
  sp: Pick<SourcePackage, 'requirements'> = sourcePackage()
): NumMeta {
  const req = sp.requirements.get(id);
  if (!req) throw new Error(id + ' is not a requirement the plan defines');
  const bound = requirementBound(req.text);
  if (!bound || !accept(bound)) throw new Error(id + ' does not state ' + what);
  return bound;
}

export function frameworkDocument(root = REPO_ROOT): FrameworkDocument {
  const hit = fwCache.get(root);
  if (hit) return hit;
  const out: FrameworkDocument = { ids: new Set(), families: new Map(), declaredFamilies: new Map() };
  /* a definition is a table row that starts with the id: the dictionaries and
     the requirement tables. An id quoted inside another row's cells is a
     reference, and family headers ("TPP-1") are not ids of either shape. */
  const row = new RegExp('^\\| (' + ID + ') \\|');
  /* Table G-1: | TOT | Total system | CP-TOT-001–CP-TOT-010 | 10 | owner | */
  const g1 = /^\| ([A-Z]+) \| [^|]+ \| CP-([A-Z]+)-\d{3}\s*[–-]\s*CP-[A-Z]+-\d{3} \| (\d+) \|/;
  for (const line of read(FRAMEWORK_EXTRACT, root)) {
    const m = row.exec(line);
    if (m) out.ids.add(m[1]);
    const g = g1.exec(line);
    if (g && g[1] === g[2]) out.declaredFamilies.set(g[1], Number(g[3]));
  }
  for (const id of out.ids) {
    if (idKind(id) !== 'CP') continue;
    const f = id.split('-')[1];
    out.families.set(f, (out.families.get(f) || 0) + 1);
  }
  fwCache.set(root, out);
  return out;
}

/* ---- P25: the plan's product-family register (Table T-2) ----------------
 * medications.ts's 200 families carry no external citation, and the plan
 * says why: its Table T-1 calls the portfolio a design decision that outside
 * evidence informs, and its Table T-2 is the register, each family with its
 * essential forms and the phase it must be qualified by. That register is
 * the families' source, and nothing held the module to it. Read from the
 * framework extract, one row per family. */
export interface PfRegisterRow { id: string; name: string; forms: string; qualifiedBy: string }
const pfCache = new Map<string, PfRegisterRow[]>();
export function pfRegister(root = REPO_ROOT): PfRegisterRow[] {
  const hit = pfCache.get(root);
  if (hit) return hit;
  const lines = read(FRAMEWORK_EXTRACT, root);
  const start = lines.findIndex((l) => l.startsWith('Table T-2. Controlled PMC product families'));
  if (start < 0) throw new Error('the framework extract has no Table T-2');
  const row = /^\| (PF-\d{3}) \| ([^|]+) \| ([^|]+) \| [^|]+ \| ([^|]+) \|\s*$/;
  const out: PfRegisterRow[] = [];
  for (const line of lines.slice(start + 1)) {
    const m = row.exec(line);
    if (m && m[1] && m[2] && m[3] && m[4]) {
      out.push({ id: m[1], name: m[2].trim(), forms: m[3].trim(), qualifiedBy: m[4].trim() });
    } else if (out.length && /^Table /.test(line)) break;
  }
  pfCache.set(root, out);
  return out;
}

/* Each family against its register row: the same id, name and essential
   forms, and a qualification phase equal to the one the register sets. Both
   directions, and the families checked are returned with the faults. */
export function pfRegisterDrift(
  families: Array<{ id: string; name: string; form: string; phase: string }>,
  register: PfRegisterRow[] = pfRegister()
): { checked: number; faults: string[] } {
  const faults: string[] = [];
  const byId = new Map(register.map((r) => [r.id, r]));
  let checked = 0;
  for (const f of families) {
    const r = byId.get(f.id);
    if (!r) { faults.push(f.id + ' is not in the plan\'s register'); continue; }
    checked++;
    if (r.name !== f.name) faults.push(f.id + ' is "' + f.name + '"; the register says "' + r.name + '"');
    if (r.forms !== f.form) faults.push(f.id + '\'s forms are "' + f.form + '"; the register says "' + r.forms + '"');
    if (r.qualifiedBy !== 'PH-' + f.phase) faults.push(f.id + ' qualifies by ' + f.phase + '; the register says ' + r.qualifiedBy);
  }
  const ids = new Set(families.map((f) => f.id));
  for (const r of register) if (!ids.has(r.id)) faults.push(r.id + ' is in the register and not in the module');
  return { checked, faults };
}

/* ---- R132: the two documents agree -------------------------------------- */

export interface CrossDocumentReport {
  counts: Record<IdKind, { sourcePackage: number; framework: number }>;
  families: number;
  faults: string[];
}

export function crossDocumentDrift(
  sp: Pick<SourcePackage, 'ids' | 'families'> = sourcePackage(),
  fw: FrameworkDocument = frameworkDocument()
): CrossDocumentReport {
  const faults: string[] = [];
  const counts = {} as CrossDocumentReport['counts'];
  for (const kind of ID_KINDS) {
    const a = [...sp.ids].filter((id) => idKind(id) === kind);
    const b = [...fw.ids].filter((id) => idKind(id) === kind);
    counts[kind] = { sourcePackage: a.length, framework: b.length };
    const onlyA = a.filter((id) => !fw.ids.has(id));
    const onlyB = b.filter((id) => !sp.ids.has(id));
    if (onlyA.length) faults.push(kind + ': ' + onlyA.length + ' only in the Source Package (' + onlyA.slice(0, 5).join(', ') + ')');
    if (onlyB.length) faults.push(kind + ': ' + onlyB.length + ' only in the framework document (' + onlyB.slice(0, 5).join(', ') + ')');
    if (!a.length) faults.push(kind + ': the Source Package defines none, so nothing was compared');
  }
  /* Families by code and count. R132's test says the CP family names
     match; the two documents word the names differently ("Total System Cost
     Parameters" in one, "Total system" in Table G-1), so the code and the
     count are what both state the same way (review of P24). */
  const names = new Set([...sp.families.keys(), ...fw.families.keys(), ...fw.declaredFamilies.keys()]);
  for (const f of [...names].sort()) {
    const a = sp.families.get(f), b = fw.families.get(f), d = fw.declaredFamilies.get(f);
    if (a === undefined || b === undefined || d === undefined || a !== b || b !== d) {
      faults.push('CP-' + f + ': Source Package ' + (a ?? 'absent') + ', framework document ' +
        (b ?? 'absent') + ', its Table G-1 declares ' + (d ?? 'absent'));
    }
  }
  return { counts, families: names.size, faults };
}

/* ---- R58: the plan's own targets, against the Source Package ------------ */


export interface SourcePackageClaim extends PhaseClaim {
  /* the dictionary target or requirement it resolved to, or '' */
  resolvedBy: string;
  via: 'dictionary' | 'requirement' | '';
}

export function frameworkClaimsAgainstSourcePackage(
  phases = DATA_PHASES,
  sp: Pick<SourcePackage, 'targets' | 'requirements'> = sourcePackage()
): SourcePackageClaim[] {
  const out: SourcePackageClaim[] = [];
  const mature = phases[phases.length - 1]?.id;
  for (const { phase: phaseId, metric } of everyMetric(phases)) {
    if (metric.basis !== 'framework') continue;
    /* review 3 of P24: the claim is read as the target is, with
       targetBound(), so a claim worded the way the dictionary words it
       ("+25 percentage points") agrees with itself */
    const claim = targetBound(metric.phaseTarget);
    const base = { id: metric.id, phase: phaseId, declared: metric.phaseTarget, resolvedBy: '', via: '' as SourcePackageClaim['via'], problem: '' };
    if (phaseId === mature) {
      const target = sp.targets.get(metric.id);
      if (target === undefined) { out.push({ ...base, problem: 'the Source Package has no dictionary entry for ' + metric.id }); continue; }
      out.push(boundsAgree(claim, targetBound(target))
        ? { ...base, resolvedBy: metric.id + ' target ' + target, via: 'dictionary' }
        : { ...base, problem: 'declares "' + metric.phaseTarget + '", the Source Package\'s target is "' + target + '"' });
      continue;
    }
    /* below maturity: a requirement that traces to this metric and sets
       this floor */
    const match = [...sp.requirements.values()].filter((r) =>
      r.trace.indexOf(metric.id) >= 0 && boundsAgree(claim, requirementBound(r.text)));
    out.push(match.length
      ? { ...base, resolvedBy: match.map((r) => r.id).join(', '), via: 'requirement' }
      : { ...base, problem: 'no Source Package requirement traced to ' + metric.id + ' sets "' + metric.phaseTarget + '"' });
  }
  return out;
}
