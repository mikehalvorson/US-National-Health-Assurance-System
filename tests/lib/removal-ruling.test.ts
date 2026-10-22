import { afterAll, expect, test } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import {
  CITED_ENACTMENTS, decisionName, legalAuthorityTrackerFaults, removalRulingSites
} from '../../src/lib/manifest-check';
import { REMOVAL_RULING, removalRulingSentence } from '../../src/lib/legislation';
import { TRACKER_FILE, trackerRows } from '../../src/lib/tracker';
import Legislation from '../../src/pages/legislation.astro';
import Gov from '../../src/pages/gov.astro';
import Hardening from '../../src/pages/hardening.astro';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const roots: string[] = [];
afterAll(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

/* One temp root per case: the checks read through a cache keyed on root and
   path, so a second variant written to the same root would never be read. */
function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'nha-removal-'));
  roots.push(root);
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text, 'utf8');
  }
  return root;
}

function copied(rels: string[], extra: Record<string, string>): string {
  const root = tree(extra);
  for (const rel of rels) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    cpSync(join(REPO_ROOT, rel), join(root, rel));
  }
  return root;
}

const text = (html: string): string => html
  .replace(/<[^>]+>/g, '').replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

/* ---- R76 + R97 [§S17] ------------------------------------------------------- */

test('R76: the shared sentence says the Court overruled Humphrey\'s Executor', () => {
  expect(removalRulingSentence()).toBe(
    "In Trump v. Slaughter, decided June 29, 2026, the Supreme Court held the FTC's " +
    "for-cause removal protection unconstitutional and overruled Humphrey's Executor v. " +
    'United States (1935), the precedent on which removal protection for multimember ' +
    'independent agencies had rested.');
});

test('R97: the three chapters render the sentence, word for word, at all four page sites', async () => {
  const container = await AstroContainer.create();
  const want = removalRulingSentence();
  const count = (s: string): number => s.split(want).length - 1;
  expect(count(text(await container.renderToString(Legislation)))).toBe(2);
  expect(count(text(await container.renderToString(Gov)))).toBe(1);
  expect(count(text(await container.renderToString(Hardening)))).toBe(1);
});

test('R97: the committed tree states it at five sites and in no other words', () => {
  const scan = removalRulingSites();
  expect(scan.faults).toEqual([]);
  expect(scan.sites).toEqual([
    'src/pages/gov.astro', 'src/pages/hardening.astro',
    'src/pages/legislation.astro', 'src/pages/legislation.astro',
    'research/legislation_crosswalk.md'
  ]);
});

test('R97: a page that states the case in its own words is reported', () => {
  const root = tree({ 'src/pages/x.astro': '<p>After <i>Trump v. Slaughter</i>, regulators answer to the President.</p>' });
  expect(removalRulingSites(root).faults).toEqual([
    'src/pages/x.astro names the removal ruling in its own words rather than through RemovalRuling',
    'no page or document states the removal ruling'
  ]);
});

test('R97: a page that links the opinion without saying what it held is reported', () => {
  const root = tree({ 'src/pages/x.astro': '<p><a href="' + REMOVAL_RULING.url + '">the opinion</a>.</p>' });
  expect(removalRulingSites(root).faults[0]).toBe('src/pages/x.astro links the opinion without stating what it held');
  /* the citation is fine once the page states the ruling */
  const ok = tree({ 'src/pages/x.astro': '<p><RemovalRuling /> <a href="' + REMOVAL_RULING.url + '">Trump v. Slaughter</a>.</p>' });
  expect(removalRulingSites(ok)).toEqual({ sites: ['src/pages/x.astro'], faults: [] });
});

test('R97: a document must carry the sentence, typography aside', () => {
  const curly = removalRulingSentence().replace(/'/g, '’')
    .replace('Trump v. Slaughter', '*Trump v.\nSlaughter*');
  const good = tree({ 'research/a.md': 'Intro.\n\n' + curly + '\n' });
  expect(removalRulingSites(good)).toEqual({ sites: ['research/a.md'], faults: [] });
  const bad = tree({ 'research/a.md': 'The Court decided **Trump v. Slaughter** and struck the FTC provision.\n' });
  expect(removalRulingSites(bad).faults[0]).toBe('research/a.md names the removal ruling without the shared sentence');
  /* a link label alone is a citation */
  const linked = tree({ 'research/a.md': '- [Trump v. Slaughter](https://example.org)\n' });
  expect(removalRulingSites(linked).faults).toEqual(['no page or document states the removal ruling']);
});

test('R97: a module other than the declaration that states the case is reported', () => {
  const root = tree({ 'src/lib/x.ts': "export const NOTE = 'After Trump v. Slaughter the board is advisory';\n" });
  expect(removalRulingSites(root).faults[0]).toBe('src/lib/x.ts states the removal ruling outside src/lib/legislation.ts');
});

/* ---- R199 [§S17] ------------------------------------------------------------ */

const ENACTMENT_FILES = [...new Set(CITED_ENACTMENTS.map((e) => e.file))];

test('R199: every legal authority cited in a public chapter has a tracker row', () => {
  const scan = legalAuthorityTrackerFaults();
  expect(scan.faults).toEqual([]);
  expect(scan.decisions).toEqual(["Humphrey's Executor v. United States", 'Moore v. United States', 'Trump v. Slaughter']);
});

test('R199: a decision a page cites with no row is reported, wherever on the page it sits', () => {
  const root = copied([TRACKER_FILE, ...ENACTMENT_FILES], {
    'src/pages/tax.astro': '<li>(<i>Pollock v. Farmers\' Loan &amp; Trust Co.</i> is the older case.)</li>'
  });
  /* a possessive ending a party ("Farmers'") ends the name there; the
     citation is still found and still reported */
  expect(legalAuthorityTrackerFaults(root).faults).toEqual([
    'src/pages/tax.astro cites Pollock v. Farmers, and no tracker row names it'
  ]);
});

test('R199: the row as it stood before this commit fails: the case had no row', () => {
  const root = copied([...ENACTMENT_FILES], {
    [TRACKER_FILE]: 'date_added,title,summary\n2026-07-14,Other,none\n',
    'src/pages/gov.astro': '<p>In <i>Trump v. Slaughter</i> ...</p>'
  });
  /* reported once, against the first file that cites it */
  expect(legalAuthorityTrackerFaults(root).faults.filter((f) =>
    f.endsWith('cites Trump v. Slaughter, and no tracker row names it'))).toHaveLength(1);
});

test('R199: a declared enactment is held both ways', () => {
  const noRow = copied([...ENACTMENT_FILES], {
    [TRACKER_FILE]: 'date_added,title,summary\n2026-07-14,Other,none\n',
    'src/pages/p.astro': '<p>Moore v. United States</p>'
  });
  const faults = legalAuthorityTrackerFaults(noRow).faults;
  for (const e of CITED_ENACTMENTS) expect(faults).toContain(e.row + ' is cited by ' + e.file + ' and has no tracker row');
  const stale = copied([TRACKER_FILE, ...ENACTMENT_FILES.filter((f) => f !== 'src/lib/taxparams.ts')], {
    'src/lib/taxparams.ts': 'export const X = 1;\n',
    'src/pages/p.astro': '<p>Moore v. United States</p>'
  });
  expect(legalAuthorityTrackerFaults(stale).faults).toEqual([
    'src/lib/taxparams.ts no longer cites One Big Beautiful Bill Act as "OBBBA"; the declaration is stale'
  ]);
});

test('R199: a tree citing no decision reports that the sweep checked nothing', () => {
  /* stubs that still cite each declared enactment, and no case */
  const stubs: Record<string, string> = {};
  CITED_ENACTMENTS.forEach((e, i) => {
    stubs[e.file] = (stubs[e.file] || '') + 'export const S' + i + " = '" + e.spelled + "';\n";
  });
  const root = copied([TRACKER_FILE], stubs);
  expect(legalAuthorityTrackerFaults(root).faults).toEqual([
    'no chapter cites a court decision, so the decision sweep checked nothing'
  ]);
});

/* ---- Review of P23 ---------------------------------------------------------- */

test('review of P23: the hardening limits say which thing forecloses insulation', async () => {
  const container = await AstroContainer.create();
  const page = text(await container.renderToString(Hardening));
  /* "It" after the shared sentence read as Humphrey's Executor, the last thing it names */
  expect(page).toContain(removalRulingSentence() + ' That ruling forecloses ordinary for-cause insulation');
});

/* Review 2 of P23: the test above also blocked one spelling, "It
   forecloses". The property: wherever the shared sentence renders, the next
   sentence does not open with a pronoun standing alone, which reads as the
   last thing the shared sentence names, Humphrey's Executor. A determiner
   with its noun ("That ruling", "This dashboard") is fine; "This forecloses"
   is not. */
const LEADS_WITH_PRONOUN = /^(?:It|Its|They|Their)\b|^(?:This|That|These|Those) [a-z]+s\b/;

function pronounLeads(page: string): string[] {
  const s = removalRulingSentence();
  const out: string[] = [];
  for (let i = page.indexOf(s); i >= 0; i = page.indexOf(s, i + 1)) {
    const next = page.slice(i + s.length).trimStart().slice(0, 40);
    if (LEADS_WITH_PRONOUN.test(next)) out.push(next);
  }
  return out;
}

test('review 2 of P23: no sentence after the shared one opens with a pronoun standing alone', async () => {
  const container = await AstroContainer.create();
  let sites = 0;
  for (const page of [Legislation, Gov, Hardening]) {
    const t = text(await container.renderToString(page));
    sites += t.split(removalRulingSentence()).length - 1;
    expect(pronounLeads(t)).toEqual([]);
  }
  expect(sites).toBe(4);
  expect(pronounLeads(removalRulingSentence() + ' It forecloses x.')).toEqual(['It forecloses x.']);
  expect(pronounLeads(removalRulingSentence() + ' This forecloses x.')).toEqual(['This forecloses x.']);
  expect(pronounLeads(removalRulingSentence() + ' That ruling forecloses x.')).toEqual([]);
});

test('review of P23: the decision the crosswalk cites to bound the ruling has a tracker row too', () => {
  const crosswalk = readFileSync(join(REPO_ROOT, 'research/legislation_crosswalk.md'), 'utf8').replace(/\s+/g, ' ');
  expect(crosswalk).toContain('*Trump v. Cook*');
  expect(crosswalk).not.toMatch(/left for-cause protection for Federal Reserve governors in place/);
  const tracker = readFileSync(join(REPO_ROOT, TRACKER_FILE), 'utf8');
  expect(tracker).toMatch(/^2026-10-10,2026-10-10,"Trump v\. Cook - /m);
});

/* Review 2 of P23: the Cook row's only source was CRS LSB11448, a source a
   comment here said had got Cook wrong, and the first review's correction
   ("without deciding whether the protection is valid") came from news
   reports. The slip opinion settles it: the row cites the opinion, and the
   crosswalk links the same document the row does. */
test('review 2 of P23: Trump v. Cook is cited from the Court\'s own opinion, in the tracker and the crosswalk alike', () => {
  const rows = trackerRows(readFileSync(join(REPO_ROOT, TRACKER_FILE), 'utf8')).rows
    .filter((r) => r.fields.title.startsWith('Trump v. Cook - '));
  expect(rows).toHaveLength(1);
  const url = rows[0].fields.source_url;
  expect(url).toMatch(/^https:\/\/www\.supremecourt\.gov\/opinions\/25pdf\/25a312_\w+\.pdf$/);
  const crosswalk = readFileSync(join(REPO_ROOT, 'research/legislation_crosswalk.md'), 'utf8').replace(/\s+/g, ' ');
  const cook = crosswalk.slice(crosswalk.indexOf('*Trump v. Cook*'));
  expect(cook.slice(0, cook.indexOf('So the dashboard'))).toContain('(' + url + ')');
});

test('review of P23: a first party keeps all its words, less a word that opens the sentence', () => {
  expect(decisionName("In Humphrey's Executor", 'United States')).toBe("Humphrey's Executor v. United States");
  expect(decisionName('After Trump', 'Slaughter')).toBe('Trump v. Slaughter');
  expect(decisionName('In', 'Re')).toBe('In v. Re'); /* never strips the whole party */
  /* so a row naming only the tail of a party no longer counts */
  const root = copied([...ENACTMENT_FILES], {
    [TRACKER_FILE]: 'date_added,title,summary\n2026-07-14,Executor v. United States,x\n',
    'src/pages/p.astro': "<p>Under <i>Humphrey's Executor v. United States</i> ...</p>"
  });
  /* reported once, against the first file citing it (legislation.ts here) */
  expect(legalAuthorityTrackerFaults(root).faults.filter((f) =>
    f.endsWith("cites Humphrey's Executor v. United States, and no tracker row names it"))).toHaveLength(1);
});

test('review of P23: the generated payloads are swept, and an empty enactment declaration is a fault', () => {
  const root = copied([TRACKER_FILE, ...ENACTMENT_FILES], {
    'src/lib/quality-data.ts': 'const X = {"where":"after Roe v. Wade"};\n'
  });
  expect(legalAuthorityTrackerFaults(root).faults).toContain(
    'src/lib/quality-data.ts cites Roe v. Wade, and no tracker row names it');
  expect(legalAuthorityTrackerFaults(undefined, []).faults)
    .toEqual(['no enactment is declared, so the enactment half checked nothing']);
  const ruling = copied([], { 'src/lib/data-phases.ts': 'const Y = "after Trump v. Slaughter";\n', 'src/pages/x.astro': '<RemovalRuling />' });
  expect(removalRulingSites(ruling).faults).toEqual(['src/lib/data-phases.ts states the removal ruling outside src/lib/legislation.ts']);
});
