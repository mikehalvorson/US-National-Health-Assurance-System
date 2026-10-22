/* The research checks: what the research documents and the tracker say,
 * held to the code and data that cite them.
 *
 * Moved out of manifest-check.ts unchanged (the branch review against main,
 * 2026-10-21, found that module changing for every reason any of its checks
 * did). These read research/*.md and the extracts of the plan's
 * documents: the path citations, the IRA score's re-scoring caveat, the care
 * cards' cited evidence and quoted requirements, the offset architecture
 * document, the generated catalogs' provenance, the additions register, the
 * legislation crosswalk, the removal ruling's one sentence, the open-items
 * register, the date stamps, and healthcare-docs-tracker.csv (its schema,
 * dates, template, parameter links and the cited enactments). The chapters
 * with a methodology of their own (Physical Care, Workforce, Long-Term Care)
 * have their own check modules.
 *
 * Build-time only; manifest-check.ts re-exports each of them, and
 * NODE_FS_MODULES there declares this module with what it reads. */
import { NUMBER_WORDS } from './format';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CARE_SCENARIOS } from './care';
import { FRAMEWORK_EXTRACT, SOURCE_PACKAGE_EXTRACT } from './source-package';
import { PARAMS_BY_ID } from './params';
/* R298 [§S12]: both provenance stamps, reachable for the first time now that
   neither generated payload is cast through `unknown`. */
import { DATA_PHASE_METHODOLOGY_PATH, DATA_PHASE_SOURCE } from './data-phases';
import { NHA_QUALITY_DATA, type QualityData } from './quality-data';
import { GOV_GROUPS, PLAN_DEFINED_ENTITIES } from './gov';
import {
  DISPOSITIONS, DOMAINS, ENABLING_ACT_TITLE_COUNT, REMOVAL_RULING, removalRulingSentence
} from './legislation';
import {
  isDate, TRACKER_FILE, trackerDateContradictions, trackerParameterLinkFaults,
  trackerRows, trackerSchemaFaults, trackerTemplateFaults
} from './tracker';
import {
  REPO_ROOT, sourceText, AUDIT_CODE_IN_RENDERED_TEXT, walk, maskComments
} from './repo-text';
import { CATALOG_ID } from './code-check';

/* Finding 10 [P16 review 3]: `research/README.md` cited
 * `baseline-P16/negative_test.py`, which is load-bearing for its claim that
 * every gate has a negative case, and which a reader of this repo cannot open -
 * it lives in the audit working set. Sweeping the class rather than the
 * instance found two more the review had not: the same shape in
 * `05_it_governance_rd_transition.md`, and `tools/extract_docx.py` in
 * `task_zero_findings.md`, which is the opposite - a true historical record of
 * a file R131 deleted on purpose.
 *
 * That third one is why this is an exemption table and not a rule. A blanket
 * "every cited path resolves" would fire on an accurate account of the past and
 * push a writer to falsify it. So an unresolvable citation is allowed, once
 * someone writes down why, next to the code that checks it - the shape
 * `PRIORITY_EXEMPT` already uses one directory over.
 *
 * Scope, stated rather than assumed: backticked tokens containing `/`, no
 * spaces, not a URL, ending in a source or data extension. A prose mention
 * without backticks is out of scope and always was. */
const RESEARCH_PATH_EXTENSIONS = [
  '.py', '.ts', '.mjs', '.js', '.csv', '.md', '.json', '.astro', '.yml'
];

/* Two of these reasons END in a claim about the document - that the citation
 * itself tells the reader the file is elsewhere. A reason that asserts
 * something about a file and is checked against nothing is the defect this
 * whole check exists to catch, one level up. So `disclose` is the string the
 * citation must actually carry, and null means the reason stands on its own. */
export interface PathExemption { why: string; disclose: string | null }

export const RESEARCH_PATH_EXEMPT: Record<string, PathExemption> = {
  'baseline-P16/negative_test.py': {
    why: 'the negative-test harness, in the audit working set',
    disclose: 'not in this repo'
  },
  'baseline-P16/migrate_seed.py': {
    why: 'the P16 seed migration, in the audit working set',
    disclose: 'not in this repo'
  },
  'tools/extract_docx.py': {
    why: 'deleted at R131 after the .mjs port was proved against it; cited as history',
    disclose: null
  }
};

export function researchPathCitationLeaks(root = REPO_ROOT): string[] {
  const out: string[] = [];
  const files: string[] = [];
  walk(join(root, 'research'), root, files);
  for (const rel of files.filter((f) => f.endsWith('.md')).sort()) {
    const text = sourceText(rel, root);
    const tick = /`([^`\n]+)`/g;
    let m: RegExpExecArray | null;
    while ((m = tick.exec(text)) !== null) {
      const tok = m[1].trim();
      if (!tok.includes('/') || /\s/.test(tok)) continue;
      if (tok.startsWith('http://') || tok.startsWith('https://')) continue;
      if (!RESEARCH_PATH_EXTENSIONS.some((e) => tok.endsWith(e))) continue;
      const line = text.slice(0, m.index).split('\n').length;
      const exempt = RESEARCH_PATH_EXEMPT[tok];
      if (exempt !== undefined) {
        /* The window is the citing paragraph, not the file: a disclosure four
           screens away is not a disclosure the reader of this line meets. */
        const near = text.slice(Math.max(0, m.index - 400), m.index + 400);
        if (exempt.disclose !== null && !near.includes(exempt.disclose)) {
          out.push(rel + ':' + line + ' cites `' + tok + '`, exempt because '
            + exempt.why + ', but the citation does not say "'
            + exempt.disclose + '"');
        }
        continue;
      }
      if (existsSync(join(root, tok))) continue;
      out.push(rel + ':' + line + ' cites `' + tok
        + '`, which is not in this repo and is not an exempt citation');
    }
  }
  return out;
}

/* An exemption nobody re-reads is a comment. This fails when a path on the
   table above comes BACK, which is the moment the reason stops being true. */
export function staleResearchPathExemptions(root = REPO_ROOT): string[] {
  return Object.keys(RESEARCH_PATH_EXEMPT)
    .filter((tok) => existsSync(join(root, tok)))
    .map((tok) => tok + ' is exempt as absent, but exists in the tree now');
}

/* R11 [§S6a]: the offset architecture document, held to the engine.
 *
 * A document that describes code is a claim with no test attached, and this one
 * describes the property HANDOFF.md's constraint 4 asks for: that no savings
 * mechanism is counted twice. So it is read, and every mechanism the engine
 * declares has to appear in it. A fifth offset added without a paragraph fails
 * the build, which is the only way a document like this stays true. */
export function mechanismsMissingFromDoc(
  mechanisms: string[],
  doc: string,
  root = REPO_ROOT
): string[] {
  const text = readFileSync(join(root, doc), 'utf8').toLowerCase();
  return mechanisms.filter((m) => !text.includes(m.toLowerCase()));
}

/* R82/R83 [§S8]: a card's cited source has to contain the figures it is cited
 * for. §AG2: the therapy card named "SAMHSA spending data" for per-session
 * prices, and SAMHSA publishes an aggregate national total. §AG3: the insulin
 * card cited Civica Rx while showing an uninsured floor Civica undercuts.
 *
 * A card that declares `evidence` names the research file its figures live in
 * and the exact strings to find there. Whitespace is collapsed on both sides
 * because a research file wraps and a TypeScript string concatenates; nothing
 * else is normalised, so a figure that moves without its source moving fails. */
export function careEvidenceMisses(root = REPO_ROOT): string[] {
  const cache = new Map<string, string>();
  const out: string[] = [];
  for (const card of CARE_SCENARIOS) {
    const ev = card.evidence;
    if (!ev) continue;
    let text = cache.get(ev.file);
    if (text === undefined) {
      try {
        text = collapse(readFileSync(join(root, ev.file), 'utf8'));
      } catch {
        out.push(card.id + ': ' + ev.file + ' does not exist');
        continue;
      }
      cache.set(ev.file, text);
    }
    if (!ev.cites.length) out.push(card.id + ': declares evidence and cites no figure');
    const strings = ev.cites.map((c) => c.find).concat(ev.also || []);
    for (const f of strings) {
      if (!text.includes(collapse(f))) {
        out.push(card.id + ': ' + ev.file + ' does not contain "' + f + '"');
      }
    }
  }
  return out;
}

/* R170 [§S8]: a framework requirement a card quotes has to be in the framework.
 *
 * §AG2's complaint about the therapy card was that its cited source does not
 * contain the figures it is cited for. The same test applied to a requirement:
 * the id has to exist in the extract and the card's words have to be that
 * requirement's words, not a paraphrase that drifted. Whitespace is collapsed
 * because the card wraps its quote across source lines and the extract does not. */

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export function careRequirementsNotInFramework(root = REPO_ROOT): string[] {
  const text = collapse(sourceText(FRAMEWORK_EXTRACT, root));
  const out: string[] = [];
  for (const card of CARE_SCENARIOS) {
    const f = card.nha.framework;
    if (!f) continue;
    if (!text.includes(f.id)) { out.push(card.id + ': ' + f.id + ' is not in the extract'); continue; }
    if (!text.includes(collapse(f.quote))) {
      out.push(card.id + ': ' + f.id + ' does not read the way the card quotes it');
    }
  }
  return out;
}

/* R34 [§S7]: the IRA scores are correct as original scores and overstated as
 * current standing, and they appear in four places that did not agree about
 * that. `research/03` graded them High-for-original and Medium-for-durability
 * and named the 2025 re-scoring; `research/01` graded the identical figures
 * HIGH and called them the most authoritative data point in the section with
 * no re-scoring caveat at all; the seed CSV carried `high` with a note that
 * said the same; BUILD-BRIEF repeated the claim.
 *
 * Rather than declare the four sites, the scan finds them: a file that states
 * the $98.5B score in an IRA context has to carry the caveat. A new site
 * quoting the figure is caught without anyone remembering to add it to a list.
 * The IRA token is what keeps `fmea.ts`, which uses 98.5 as a headroom
 * percentage, out of the sweep. */
export const IRA_SCORE = /\$?98\.5\b/g;
export const IRA_CONTEXT = /\bIRA\b|Inflation Reduction Act/;
export const IRA_RESCORING = /re-scor|rescor|revised .{0,40}downward|downward .{0,40}re-?scor/i;

/* The caveat has to sit with the figure, not merely somewhere in the same
 * file. The first version of this asked whether the file contained the token
 * anywhere, and the break written to prove it could not fail: research/01's
 * new text mentions "re-scoring" a second time while explaining the history,
 * so deleting the caveat from the confidence line left the check passing. A
 * window is what makes the check about the quotation rather than the document.
 * 1200 characters covers the value line to the confidence line in the research
 * entries, which is the longest gap any of the four sites has.
 *
 * The window reads both ways. A first attempt read only forward and called a
 * caveat written immediately BEFORE the figure missing, which is the wrong
 * answer: a reader meets it either way round. */
export const IRA_CAVEAT_WINDOW = 1200;

const IRA_SCAN_DIRS = ['research', 'src/lib'];
const IRA_SCAN_FILES = ['BUILD-BRIEF.md'];

function iraScanFiles(root: string): string[] {
  const files: string[] = [...IRA_SCAN_FILES];
  for (const dir of IRA_SCAN_DIRS) {
    for (const name of readdirSync(join(root, dir))) {
      if (/\.(md|csv|ts)$/.test(name)) files.push(dir + '/' + name);
    }
  }
  return files;
}

/* Every place the score is quoted, with the offset, so a file quoting it three
 * times has to caveat all three. */
function iraQuotations(root: string, rel: string): number[] {
  const text = readFileSync(join(root, rel), 'utf8');
  if (!IRA_CONTEXT.test(text)) return [];
  const at: number[] = [];
  for (const m of text.matchAll(IRA_SCORE)) at.push(m.index ?? 0);
  return at;
}

export function iraScoresWithoutCaveat(root = REPO_ROOT): string[] {
  const bad: string[] = [];
  for (const rel of iraScanFiles(root)) {
    const at = iraQuotations(root, rel);
    if (!at.length) continue;
    const text = readFileSync(join(root, rel), 'utf8');
    for (const i of at) {
      const window = text.slice(Math.max(0, i - IRA_CAVEAT_WINDOW),
        i + IRA_CAVEAT_WINDOW);
      if (!IRA_RESCORING.test(window)) bad.push(rel + '@' + i);
    }
  }
  return bad;
}

/* The quotations that do carry it, so the check reports a number rather than
 * only an absence, and a scan that silently stops matching anything is
 * visible. */
export function iraScoreSites(root = REPO_ROOT): string[] {
  const out: string[] = [];
  for (const rel of iraScanFiles(root)) {
    for (const i of iraQuotations(root, rel)) out.push(rel + '@' + i);
  }
  return out;
}

/* R298 [§S12]: the two generated catalogs each carry a provenance stamp, and
 * until the casts came off neither was reachable from any consumer, so nothing
 * could compare them.
 *
 * They are not one value read twice. `tools/extract_quality_catalog.py` types
 * the string at its line 668-equivalent and `tools/build_data_phase_targets.py`
 * types it again in its own payload dict; neither reads it from the other. So
 * regenerating one and not the other publishes two different provenance claims
 * from one repository, which is exactly the state a reader cannot detect. The
 * two sides of this check are two independently authored literals.
 *
 * The stamp is not rendered on any page, and this check must not start
 * rendering it. The FIRST version of this comment said exactly that and then
 * put both stamps into the note - and health.astro renders a failing row as
 * `'✗ ' + r.name + ': ' + r.note`, so the one state in which the check speaks
 * is the state in which it would have printed the plan's own document title to
 * a public page. Golden rule 2, defeated by the mechanism written to respect
 * it. The note now names the files and the remedy and carries no stamp; a
 * developer reads the values from the two sources. */
export function provenanceStampDrift(): string[] {
  if (DATA_PHASE_SOURCE === NHA_QUALITY_DATA.source) return [];
  return ['data-phases.ts and quality-data.ts declare different provenance'
    + ' stamps; regenerate both from the same document'];
}

/* R298 [§S12]: the third acceptance clause - "the declared framework version
 * matches the repo's".
 *
 * provenanceStampDrift holds the two generators to each other, which is a
 * different property: both can agree and both be stale. This one holds the
 * stamp to the document actually sitting in the repository, so replacing the
 * source document without regenerating fails the build.
 *
 * The filename is the only machine-readable statement of the version the repo
 * carries. Normalised rather than parsed: underscores to spaces, extension
 * dropped, which is exactly how the stamp is written. Same rule-2 discipline
 * as above - the note names neither the stamp nor the filename. */
export function frameworkVersionDrift(root = REPO_ROOT): string[] {
  const docs = readdirSync(root)
    .filter((f) => f.endsWith('.docx'))
    .map((f) => f.replace(/\.docx$/, '').split('_').join(' '));
  if (!docs.length) return []; /* no document in the tree: not this check's claim */
  return docs.includes(DATA_PHASE_SOURCE)
    ? []
    : ['the catalogs were generated against a framework document the repository'
      + ' no longer carries; regenerate them, or restore the document'];
}

/* R298 [§S12]: the methodology path the payload publishes, resolved against
 * the tree. `researchPathCitationLeaks` sweeps backticked paths in
 * research/*.md and never looked at a path held as DATA in src/lib, so this
 * one had been unchecked since it was written. A generated file naming a
 * methodology document that is not there is a dead reference a reader meets
 * before the code does. */
export function unresolvedMethodologyPath(root = REPO_ROOT): string[] {
  const rel = DATA_PHASE_METHODOLOGY_PATH;
  if (rel === '') return ['data-phases.ts publishes no methodology path'];
  return existsSync(join(root, rel))
    ? []
    : ['data-phases.ts cites ' + rel + ', which is not in the tree'];
}

/* R165 [§S16]: one register for what the plan added after the controlled
 * framework. The merit health-talent immigration pathway reached the catalog
 * (its plan-defined records), the governance architecture (its added
 * entities) and many other files in 2026-08 with nothing recording it as
 * one feature. The register is research/post_framework_additions.md. This
 * holds its tables to the data, both ways: every record the catalog marks plan-defined and every
 * entity gov.ts declares added is listed, every listed one is still marked or
 * declared, and every declared entity exists. */
export const ADDITIONS_REGISTER = 'research/post_framework_additions.md';

/* The text under every `### <heading>`, each up to the next heading; empty
   when the register has no such section.
   Owner, 2026-10-12: one table per addition. This read only the first
   "### Catalog records", so a second addition's table, under its own
   section, would have been invisible to every check below while they
   passed on the first. */
function registerSections(text: string, heading: string): string[] {
  const marker = '\n### ' + heading + '\n';
  const out: string[] = [];
  for (let start = text.indexOf(marker); start >= 0; start = text.indexOf(marker, start + marker.length)) {
    const rest = text.slice(start + marker.length);
    const end = rest.search(/\n#{2,3} /);
    out.push(end < 0 ? rest : rest.slice(0, end));
  }
  return out;
}

function registerTableIds(text: string, heading: string): string[] {
  const out: string[] = [];
  for (const body of registerSections(text, heading)) {
    for (const m of body.matchAll(/^\| ([A-Z][A-Z0-9.\-]*) \|/gm)) {
      if (m[1] !== 'Id' && m[1] !== 'Code') out.push(m[1]);
    }
  }
  return out;
}

/* Review 2 of P22: R165 asks for every addition "with date, rationale, and
 * source status". Each table must carry those three columns, every row must
 * fill every cell, and an Added cell must read as a date and a commit. */
const REGISTER_COLUMNS = ['Added', 'Why it is in the plan', 'Source status'];
const ADDED_CELL = /^\d{4}-\d{2}-\d{2}, `[0-9a-f]{7,40}`$/;

function tableCells(line: string): string[] {
  return line.split('|').slice(1, -1).map((c) => c.trim());
}

export function registerRowFaults(text: string, heading: string): string[] {
  const bodies = registerSections(text, heading);
  if (!bodies.length) return [heading + ': no such table'];
  const out: string[] = [];
  for (const body of bodies) {
    const lines = body.split('\n').filter((l) => l.startsWith('|'));
    const header = tableCells(lines[0] || '');
    REGISTER_COLUMNS.filter((c) => header.indexOf(c) < 0)
      .forEach((c) => out.push(heading + ': no "' + c + '" column'));
    const added = header.indexOf('Added');
    for (const line of lines.slice(2)) {
      const cells = tableCells(line);
      const id = cells[0] || '?';
      if (cells.length !== header.length) { out.push(heading + ' ' + id + ': ' + cells.length + ' cells under ' + header.length + ' columns'); continue; }
      cells.forEach((c, i) => { if (!c) out.push(heading + ' ' + id + ': empty "' + header[i] + '"'); });
      if (added >= 0 && cells[added] && !ADDED_CELL.test(cells[added]!)) {
        out.push(heading + ' ' + id + ': Added reads "' + cells[added] + '", not a date and a commit');
      }
    }
  }
  return out;
}

export function additionsRegisterDrift(
  root?: string, Q: QualityData = NHA_QUALITY_DATA,
  entities: string[] = PLAN_DEFINED_ENTITIES, groups: { members: { code: string }[] }[] = GOV_GROUPS
): string[] {
  const text = sourceText(ADDITIONS_REGISTER, root);
  const out: string[] = [];
  const listedRecords = registerTableIds(text, 'Catalog records');
  const listedEntities = registerTableIds(text, 'Governance entities');
  const marked = Q.parameters.filter((p) => p.provenance === 'plan-defined').map((p) => p.id);
  if (!listedRecords.length) out.push('the register lists no catalog records');
  marked.filter((id) => listedRecords.indexOf(id) < 0)
    .forEach((id) => out.push(id + ' is plan-defined in the catalog and not in the register'));
  listedRecords.filter((id) => marked.indexOf(id) < 0)
    .forEach((id) => out.push(id + ' is in the register and not marked plan-defined in the catalog'));
  entities.filter((c) => listedEntities.indexOf(c) < 0)
    .forEach((c) => out.push(c + ' is declared added in gov.ts and not in the register'));
  listedEntities.filter((c) => entities.indexOf(c) < 0)
    .forEach((c) => out.push(c + ' is in the register and not declared added in gov.ts'));
  const codes = new Set(groups.flatMap((g) => g.members.map((m) => m.code)));
  entities.filter((c) => !codes.has(c))
    .forEach((c) => out.push(c + ' is declared added and is not a governance entity'));
  return out.concat(registerRowFaults(text, 'Catalog records'), registerRowFaults(text, 'Governance entities'));
}

/* R247 [§S16]: the crosswalk methodology states the disposition vocabulary as
 * a bulleted list of bold capitalised words ("- **PRESERVE** - ..."), and it
 * was one of the five places the vocabulary was declared. DISPOSITIONS in
 * legislation.ts is the one declaration now; this holds the document's list
 * to it, word for word and in order, so the two cannot drift apart again. */
export const CROSSWALK_DOC = 'research/legislation_crosswalk.md';

export function crosswalkDispositions(root = REPO_ROOT): string[] {
  const text = sourceText(CROSSWALK_DOC, root);
  const out: string[] = [];
  for (const m of text.matchAll(/^- \*\*([A-Z]+)\*\* - /gm)) out.push(m[1]);
  return out;
}

/* R98 [§S17] (§AJ7): two of the thirteen domain titles differed between
 * legislation.ts and the crosswalk's numbered list, which is where the
 * methodology names them. The code took the crosswalk's titles; this holds
 * the list to DOMAINS, title for title and in order. */
export function crosswalkDomainTitles(root = REPO_ROOT): string[] {
  const text = sourceText(CROSSWALK_DOC, root);
  const start = text.indexOf('## Major-law-family crosswalk');
  if (start < 0) return [];
  const out: string[] = [];
  for (const line of text.slice(start).split('\n').slice(1)) {
    if (line.startsWith('## ')) break;
    const m = /^\d+\. (.+)\.$/.exec(line);
    if (m) out.push(m[1]);
  }
  return out;
}

export function crosswalkDomainDrift(root = REPO_ROOT, domains: { title: string }[] = DOMAINS): { compared: number; faults: string[] } {
  const listed = crosswalkDomainTitles(root);
  const faults: string[] = [];
  if (!listed.length) faults.push(CROSSWALK_DOC + ' lists no numbered domains under its crosswalk heading');
  const n = Math.max(listed.length, domains.length);
  for (let i = 0; i < n; i += 1) {
    const code = domains[i] ? domains[i].title : undefined;
    if (code !== listed[i]) {
      faults.push('domain ' + (i + 1) + ': legislation.ts "' + (code ?? 'none') + '", ' +
        CROSSWALK_DOC + ' "' + (listed[i] ?? 'none') + '"');
    }
  }
  return { compared: Math.min(listed.length, domains.length), faults: faults };
}

/* R80 [§S17]: re-targeted at Pass 62 from the retired tree. The page's three
 * counters are derived (R240, R297), and the list above holds the titles. What
 * remained is the crosswalk's own prose, which states both counts as figures a
 * reader takes on trust: "thirteen domains" and a "19-title enabling act".
 * Each is held to the collection it counts, and a sentence that stops stating
 * its count is drift, not a pass. */
export function crosswalkCountDrift(
  root = REPO_ROOT, domainCount: number = DOMAINS.length, titleCount: number = ENABLING_ACT_TITLE_COUNT
): { stated: number; faults: string[] } {
  const text = sourceText(CROSSWALK_DOC, root).replace(/\s+/g, ' ');
  const faults: string[] = [];
  let stated = 0;
  const domains = /\binto ([a-z]+) domains\b/.exec(text);
  if (!domains) faults.push(CROSSWALK_DOC + ' no longer states how many domains it groups the law into');
  else {
    stated += 1;
    if (NUMBER_WORDS.indexOf(domains[1]) !== domainCount) {
      faults.push(CROSSWALK_DOC + ' says ' + domains[1] + ' domains; legislation.ts has ' + domainCount);
    }
  }
  const titles = /\b(\d+)-title enabling act\b/.exec(text);
  if (!titles) faults.push(CROSSWALK_DOC + ' no longer states how many titles the enabling act has');
  else {
    stated += 1;
    if (Number(titles[1]) !== titleCount) {
      faults.push(CROSSWALK_DOC + ' says a ' + titles[1] + '-title act; legislation.ts has ' + titleCount);
    }
  }
  return { stated: stated, faults: faults };
}

export function crosswalkDispositionDrift(root = REPO_ROOT): string[] {
  const stated = crosswalkDispositions(root);
  const declared = DISPOSITIONS.map((d) => d.toUpperCase());
  if (stated.join(',') === declared.join(',')) return [];
  return [CROSSWALK_DOC + ' lists ' + (stated.join(', ') || 'nothing') +
    '; legislation.ts declares ' + declared.join(', ')];
}

/* Review of P22 [§S16]: R165's test is "every catalog record is either
 * traceable to the framework extract or listed in the additions register".
 * additionsRegisterDrift() held the register to the catalog's own provenance
 * mark and never read the extract, so a record mismarked "framework" would
 * have passed both. This reads research/framework_v2_extract.md, the text
 * extract of the controlled document: every record marked framework must be
 * named there, and every plan-defined one must not be. */
export function catalogTraceDrift(root = REPO_ROOT, Q: QualityData = NHA_QUALITY_DATA): string[] {
  const named = new Set(sourceText(FRAMEWORK_EXTRACT, root).match(CATALOG_ID) || []);
  const out: string[] = [];
  if (!named.size) return [FRAMEWORK_EXTRACT + ' names no catalog id'];
  Q.parameters.forEach(function (p) {
    const there = named.has(p.id);
    if (p.provenance === 'framework' && !there) out.push(p.id + ' is marked framework and the extract does not name it');
    if (p.provenance !== 'framework' && there) out.push(p.id + ' is marked ' + p.provenance + ' and the extract names it');
  });
  return out;
}

/* Review of P22 [§S16]: the Data tab links readers straight to the generated
 * methodology ("Open this phase's derivation register"), so an audit code
 * there reaches a reader one click from the page. P22 removed "R105:" from the
 * document's gap reasons and then wrote "R104 and R106." into its version
 * history; the history's first three entries carried R57, R105 and R122.
 * The codes are source comments in the generator now. This reads the
 * committed document line by line against the one list of audit-code shapes. */
export function methodologyAuditCodes(root = REPO_ROOT): string[] {
  const out: string[] = [];
  sourceText(DATA_PHASE_METHODOLOGY_PATH, root).split('\n').forEach(function (line, i) {
    for (const [pattern, what] of AUDIT_CODE_IN_RENDERED_TEXT) {
      const hit = pattern.exec(line);
      if (hit) { out.push(DATA_PHASE_METHODOLOGY_PATH + ':' + (i + 1) + ' carries ' + what + ' ("' + hit[0] + '")'); return; }
    }
  });
  return out;
}

/* R201 [§S17]: the tracker's schema and vocabularies live in tracker.ts,
 * which is pure; this is the read. */
export function trackerSchemaDrift(root = REPO_ROOT): { rows: number; faults: string[] } {
  return trackerSchemaFaults(sourceText(TRACKER_FILE, root));
}

/* R202 [§S17]: each row against its own dates, as of its own last_verified.
 * Deterministic on purpose; the as-of-today half is a vitest control (see
 * tracker.ts). */
export function trackerDateDrift(root = REPO_ROOT): { rows: number; dated: number; faults: string[] } {
  return trackerDateContradictions(sourceText(TRACKER_FILE, root));
}

/* R198 [§S17]: template text in any field of the tracker. */
export function trackerTemplateDrift(root = REPO_ROOT): { fields: number; faults: string[] } {
  return trackerTemplateFaults(sourceText(TRACKER_FILE, root));
}

/* ---- R76 + R97 [§S17]: one statement of the removal ruling ---------------
 * Five places stated Trump v. Slaughter in four sentences and none said the
 * Court overruled Humphrey's Executor. Pages now render
 * src/components/RemovalRuling.astro, whose words are REMOVAL_RULING's, and
 * the crosswalk states removalRulingSentence() word for word. This holds
 * both, by what can go wrong rather than by the sites found today:
 *   - a page or component that names the case outside a link is stating it
 *     in its own words (the anchor text of a citation is a citation);
 *   - a page that links the opinion without rendering the ruling cites it
 *     without saying what it held;
 *   - a research document that names it outside a link must carry the
 *     sentence, typography (curly quotes, emphasis, line breaks) aside;
 *   - no other module states it: legislation.ts is its declaration, and its
 *     source label for the Administration domain is a citation.
 * The extracts are not swept: they transcribe the source documents, which
 * predate the ruling. Every .ts and .astro file under src/ is read, the
 * generated payloads included (review of P23: the first version used
 * sourceScanFiles, which skips them, while this comment said "no other
 * module"). Returns the sites it found; none is a fault. */
/* Assembled, not typed: this file is in the sweep, and a typed needle would
   report the checker as a site. Do not simplify it back to one literal. */
const REMOVAL_CASE_WORD = ['Slaugh', 'ter'].join('');
const REMOVAL_HOME = 'src/lib/legislation.ts';
const REMOVAL_COMPONENT_TAG = '<RemovalRuling';
const EXTRACT_DOCS = new Set([FRAMEWORK_EXTRACT, SOURCE_PACKAGE_EXTRACT]);

function plainProse(text: string): string {
  return text.replace(/[’‘]/g, "'").replace(/[*_]/g, '').replace(/\s+/g, ' ');
}

export function removalRulingSites(root = REPO_ROOT): { sites: string[]; faults: string[] } {
  const sites: string[] = [];
  const faults: string[] = [];
  for (const rel of everySourceFile(root)) {
    if (rel === REMOVAL_HOME) continue;
    const code = maskComments(sourceText(rel, root));
    if (rel.endsWith('.ts')) {
      if (code.includes(REMOVAL_CASE_WORD)) faults.push(rel + ' states the removal ruling outside ' + REMOVAL_HOME);
      continue;
    }
    const anchors = code.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) || [];
    const unlinked = code.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, ' ');
    const renders = code.split(REMOVAL_COMPONENT_TAG).length - 1;
    for (let i = 0; i < renders; i += 1) sites.push(rel);
    if (unlinked.includes(REMOVAL_CASE_WORD)) {
      faults.push(rel + ' names the removal ruling in its own words rather than through RemovalRuling');
    }
    const cites = anchors.some((a) => a.includes(REMOVAL_CASE_WORD) || a.includes(REMOVAL_RULING.url));
    if (cites && !renders) faults.push(rel + ' links the opinion without stating what it held');
  }
  const sentence = plainProse(removalRulingSentence());
  for (const rel of walkResearchDocs(root)) {
    if (EXTRACT_DOCS.has(rel)) continue;
    const text = sourceText(rel, root);
    const unlinked = text.replace(/\[[^\]]*\]\([^)]*\)/g, ' ');
    if (!unlinked.includes(REMOVAL_CASE_WORD)) continue;
    if (plainProse(text).includes(sentence)) sites.push(rel);
    else faults.push(rel + ' names the removal ruling without the shared sentence');
  }
  if (!sites.length) faults.push('no page or document states the removal ruling');
  return { sites: sites, faults: faults };
}

/* Every .ts and .astro file under src/, the generated payloads included:
   the client renders them, so a sweep of what a reader can meet reads them. */
function everySourceFile(root: string): string[] {
  const out: string[] = [];
  walk(join(root, 'src'), root, out);
  return out.filter((f) => /\.(ts|astro)$/.test(f)).sort();
}

function walkResearchDocs(root: string): string[] {
  const out: string[] = [];
  walk(join(root, 'research'), root, out);
  return out.filter((f) => f.endsWith('.md')).sort();
}

/* ---- R199 [§S17] (§BG2): every decision a chapter cites has a tracker row --
 * Trump v. Slaughter was decided two weeks before the tracker's load and
 * cited on five sites, and it had no row; the tracker exists to catch
 * exactly that. The row's declared test is "every legal authority cited in a
 * public chapter has a tracker row". Scoped, and the scope is the tracker's
 * own: it tracks current developments (README.md), not the standing law the
 * crosswalk maps, so a 1974 statute in the Legislation domain list is a map
 * entry, not a currency item.
 *   - Court decisions are found by their shape, "Party v. Party", in every
 *     .ts and .astro file under src/ with comments masked, the generated
 *     payloads included, and each must be named in some row's title or
 *     summary. A first party keeps all its capitalized words, less a
 *     leading word that opens a sentence ("In", "After"), so the name
 *     compared is "Humphrey's Executor v. United States", not its tail
 *     (review of P23). The first sweep
 *     found two: Trump v. Slaughter, and Moore v. United States on the Tax
 *     page, which had no row either.
 *   - Enactments cannot be found by shape. The recent ones a chapter relies
 *     on are declared below with the file that cites them, and the
 *     declaration is held both ways: the file must still cite it and the
 *     tracker must carry a row. An enactment cited and not declared is not
 *     seen; that is this check's stated limit. An empty declaration is a
 *     fault: the half would check nothing. */
/* A party word takes an apostrophe or a dot only between letters, so a
   quote closing a string literal or a full stop ending a sentence is not
   part of the name (first run: "Trump v. Slaughter'" from a source label). */
const PARTY_WORD = "[A-Z][\\w&-]*(?:['’.]\\w+)*";
const DECISION_SHAPE = new RegExp(
  '\\b((?:' + PARTY_WORD + ' )*' + PARTY_WORD + ') v\\. (' + PARTY_WORD + '(?: ' + PARTY_WORD + ')*)', 'g');
/* words that open a sentence before a case name rather than belong to it */
const LEADING_WORDS = new Set(['In', 'After', 'See', 'Under', 'Since', 'Before', 'Following', 'Per', 'Cf', 'The', 'Unlike', 'Like']);

export function decisionName(firstParty: string, secondParty: string): string {
  const words = firstParty.split(' ');
  while (words.length > 1 && LEADING_WORDS.has(words[0])) words.shift();
  return (words.join(' ') + ' v. ' + secondParty).replace(/’/g, "'");
}

export const CITED_ENACTMENTS: Array<{ row: string; file: string; spelled: string }> = [
  { row: 'One Big Beautiful Bill Act', file: 'src/lib/taxparams.ts', spelled: 'OBBBA' },
  { row: 'Inflation Reduction Act', file: 'src/lib/params.ts', spelled: 'IRA first-cycle' },
  { row: 'No Surprises Act', file: 'src/lib/legislation.ts', spelled: 'No Surprises Act' },
  { row: 'Affordable Care Act', file: 'src/lib/legislation.ts', spelled: 'ACA · Public Law 111-148' }
];

export function legalAuthorityTrackerFaults(
  root = REPO_ROOT, enactments: Array<{ row: string; file: string; spelled: string }> = CITED_ENACTMENTS
): { decisions: string[]; enactments: number; faults: string[] } {
  const { rows } = trackerRows(sourceText(TRACKER_FILE, root));
  const titles = rows.map((r) => (r.fields.title || '').replace(/’/g, "'"));
  const tracked = rows.map((r) => ((r.fields.title || '') + ' ' + (r.fields.summary || '')).replace(/’/g, "'"));
  const found = new Map<string, string>();
  for (const rel of everySourceFile(root)) {
    const code = maskComments(sourceText(rel, root));
    DECISION_SHAPE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = DECISION_SHAPE.exec(code)) !== null) {
      const name = decisionName(m[1], m[2]);
      if (!found.has(name)) found.set(name, rel);
    }
  }
  const faults: string[] = [];
  found.forEach(function (rel, name) {
    if (!tracked.some((t) => t.includes(name))) faults.push(rel + ' cites ' + name + ', and no tracker row names it');
  });
  enactments.forEach(function (e) {
    if (!maskComments(sourceText(e.file, root)).includes(e.spelled)) {
      faults.push(e.file + ' no longer cites ' + e.row + ' as "' + e.spelled + '"; the declaration is stale');
    }
    if (!titles.some((t) => t.includes(e.row))) faults.push(e.row + ' is cited by ' + e.file + ' and has no tracker row');
  });
  if (!found.size) faults.push('no chapter cites a court decision, so the decision sweep checked nothing');
  if (!enactments.length) faults.push('no enactment is declared, so the enactment half checked nothing');
  return { decisions: [...found.keys()].sort(), enactments: enactments.length, faults: faults };
}

/* ---- R77 [§S17] (§AF5): the open-item register, held both ways -----------
 * R15 (P15) published research/open_items_register.md under the rule "every
 * open item referenced outside the extract files appears here", and nothing
 * checked it. The crosswalk cites a RANGE of ten items, first "through" last,
 * and the register had read it as two. A range names every item in it, so
 * references are expanded before they are compared. Read: every file under
 * src/ (the generated payloads too: the quality catalog cites open items),
 * tools/, every research document except the extracts and the register
 * itself, and README.md. Held both ways: a reference with no row, and a row
 * nothing references, are faults; so is reading none of either. */
export const OPEN_ITEM_REGISTER = 'research/open_items_register.md';
const OPEN_ITEM_REFERENCE = /OI-(\d{3})(?:\s*(?:through|to|–|-)\s*(?:OI-)?(\d{3}))?/g;
const OPEN_ITEM_ROW = /^\| \*\*`(OI-\d{3})`\*\* \|/gm;

export function openItemReferences(root = REPO_ROOT): Map<string, string> {
  const files: string[] = [];
  walk(join(root, 'src'), root, files);
  walk(join(root, 'tools'), root, files);
  files.push(...walkResearchDocs(root).filter((f) => !EXTRACT_DOCS.has(f) && f !== OPEN_ITEM_REGISTER));
  if (existsSync(join(root, 'README.md'))) files.push('README.md');
  const out = new Map<string, string>();
  for (const rel of files) {
    if (!/\.(ts|astro|md|mjs|py|json|csv)$/.test(rel)) continue;
    const text = sourceText(rel, root);
    OPEN_ITEM_REFERENCE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = OPEN_ITEM_REFERENCE.exec(text)) !== null) {
      const lo = Number(m[1]);
      const hi = m[2] === undefined ? lo : Number(m[2]);
      /* every item a range names, however wide (review of P23: the first
         version capped it at thirty and read a wider range as one item) */
      const last = hi > lo ? hi : lo;
      for (let n = lo; n <= last; n += 1) {
        const id = 'OI-' + String(n).padStart(3, '0');
        if (!out.has(id)) out.set(id, rel);
      }
    }
  }
  return out;
}

export function openItemRegisterDrift(root = REPO_ROOT): { referenced: number; rows: number; faults: string[] } {
  const refs = openItemReferences(root);
  const text = existsSync(join(root, OPEN_ITEM_REGISTER)) ? sourceText(OPEN_ITEM_REGISTER, root) : '';
  const rows: string[] = [];
  OPEN_ITEM_ROW.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = OPEN_ITEM_ROW.exec(text)) !== null) rows.push(m[1]);
  const faults: string[] = [];
  refs.forEach(function (rel, id) {
    if (rows.indexOf(id) < 0) faults.push(rel + ' cites ' + id + ', and ' + OPEN_ITEM_REGISTER + ' has no row for it');
  });
  rows.forEach(function (id, i) {
    if (rows.indexOf(id) !== i) faults.push(OPEN_ITEM_REGISTER + ' lists ' + id + ' twice');
    else if (!refs.has(id)) faults.push(OPEN_ITEM_REGISTER + ' lists ' + id + ', which nothing outside the extracts cites');
  });
  if (!refs.size) faults.push('no file outside the extracts cites an open item, so nothing was checked');
  if (!rows.length) faults.push(OPEN_ITEM_REGISTER + ' has no rows');
  return { referenced: refs.size, rows: rows.length, faults: faults.sort() };
}

/* ---- R216 [§S17] (§BK4): every research methodology is dated --------------
 * The row names medications_methodology.md, which already said "Compiled
 * 2026-07-19"; §BK4 is the audit of long_term_care_methodology.md, which had
 * no date at all and backs the largest benefit expansion, and quotes the
 * medications file only as the comparison. The row's test covers every
 * methodology, so every research document now opens (after its title, before
 * its first section) with one line: "Compiled YYYY-MM-DD. Last revised
 * YYYY-MM-DD." Compiled is the date the document states, else its first
 * commit; Last revised is its last content revision. The row asked for a
 * last-REVIEWED date; the repository can evidence revisions and not reviews
 * it did not record, so the stamp says what it can stand behind.
 * Exempt, each with its reason, and an exemption that names no file, or a
 * file that carries a stamp anyway, is reported. */
export const RESEARCH_DATE_EXEMPT: Record<string, string> = {
  'research/framework_v2_extract.md': 'a transcription of the source document; its extraction is dated in task_zero_findings.md',
  'research/source_package_extract.md': 'a transcription of the source package; its extraction is dated in task_zero_findings.md',
  'research/README.md': 'the index of the research documents, not one of them',
  'research/data_phase_target_methodology.md': 'regenerated on every run; its dated change log is kept in the generator',
  'research/task_zero_findings.md': 'a dated record of one extraction ("Date: 2026-08-09"), not a methodology later work revises'
};
const DATE_STAMP = /^Compiled (\d{4}-\d{2}-\d{2})\. Last revised (\d{4}-\d{2}-\d{2})\.$/m;

export function researchDateStampFaults(
  root = REPO_ROOT, exempt: Record<string, string> = RESEARCH_DATE_EXEMPT
): { stamped: number; faults: string[] } {
  const faults: string[] = [];
  let stamped = 0;
  const docs = walkResearchDocs(root);
  for (const rel of docs) {
    const text = sourceText(rel, root);
    const firstSection = text.search(/^## /m);
    const head = firstSection < 0 ? text : text.slice(0, firstSection);
    const m = DATE_STAMP.exec(head);
    if (exempt[rel] !== undefined) {
      if (m) faults.push(rel + ' is exempt from the date stamp and carries one; drop the exemption');
      continue;
    }
    if (!m) { faults.push(rel + ' has no "Compiled ... Last revised ..." line before its first section'); continue; }
    if (!isDate(m[1]) || !isDate(m[2])) faults.push(rel + ': a stamp date is not a real date');
    else if (m[2] < m[1]) faults.push(rel + ': last revised ' + m[2] + ' is before compiled ' + m[1]);
    else stamped += 1;
  }
  Object.keys(exempt).forEach(function (rel) {
    if (docs.indexOf(rel) < 0) faults.push('the date-stamp exemption for ' + rel + ' names no research document');
    else if (!exempt[rel].trim()) faults.push('the date-stamp exemption for ' + rel + ' gives no reason');
  });
  if (!stamped) faults.push('no research document carries a date stamp');
  return { stamped: stamped, faults: faults };
}

/* R200 [§S17]: the tracker's parameter links, read against PARAMS_BY_ID. */
export function trackerParameterDrift(root = REPO_ROOT): { linked: string[]; answered: number; faults: string[] } {
  return trackerParameterLinkFaults(sourceText(TRACKER_FILE, root), PARAMS_BY_ID);
}
