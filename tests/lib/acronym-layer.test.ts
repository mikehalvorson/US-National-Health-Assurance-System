import { describe, expect, test } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { ACRONYMS, acronymPattern } from '../../src/lib/acronyms';

/* P19 [S13]: one dictionary, one expander, and a shape that cannot come back.
 *
 * Six acronym dictionaries and five decorators were deleted here. Every one of
 * the five decorators built its matcher as `new RegExp('\\b(' + keys + ')\\b')`,
 * and `-` is a non-word character, so `\bCP\b` matched the CP in CP-POP-004.
 * Measured against the running app before the deletion: on one load of the
 * quality tab the loose pattern fired 315 times on CP where 3 were real prose,
 * 30 on KPP where 6 were, 50 on TPP where 6 were. Each spurious match became an
 * <abbr> carrying an aria-label, so a screen reader announced "Key Performance
 * Parameter" and then "-B7".
 *
 * These tests read source text rather than behaviour, because the defect was a
 * shape: any file that rebuilds a key alternation is a second decorator whether
 * or not it currently misbehaves. */

const SRC = fileURLToPath(new URL('../../src', import.meta.url));

/* single-line generated payloads; reading them proves nothing and costs 300KB */
const GENERATED = ['quality-data.ts', 'data-phases.ts'];

function sourceFiles(dir: string = SRC): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.(ts|astro)$/.test(name) && !GENERATED.includes(name)) {
      out.push(full);
    }
  }
  return out;
}

const files = sourceFiles();
const rel = (f: string) => f.slice(SRC.length + 1).replace(/\\/g, '/');
const read = (f: string) => readFileSync(f, 'utf8');

/* The two characters a source file writes to put a word boundary into a
   RegExp built from a string: a backslash escaping a backslash, then b.
   Written with String.raw because every previous attempt in this campaign to
   type it through a shell produced U+0008 and a check that passed on
   everything. */
const DOUBLE_ESCAPED_WORD_BOUNDARY = String.raw`\\b`;

describe('acronym layer', () => {
  test('the repo has exactly one acronym dictionary', () => {
    const holders = files.filter((f) => /\bconst ACRONYMS\b/.test(read(f))).map(rel);
    expect(holders).toEqual(['lib/acronyms.ts']);
  });

  test('the repo has exactly one acronym decorator', () => {
    /* the tell is rebuilding a key alternation, not the class name or the
       regex flavour, so a decorator that "modernised" to the lookaround would
       still be caught here */
    const builders = files.filter((f) => read(f).includes("escaped.join('|')")).map(rel);
    expect(builders).toEqual(['lib/acronyms.ts']);

    const wrappers = files
      .filter((f) => rel(f).startsWith('scripts/'))
      .filter((f) => /createElement\('abbr'\)|el\('abbr'/.test(read(f)))
      .map(rel);
    expect(wrappers).toEqual(['scripts/acronyms-client.ts']);
  });

  test('no client script builds a pattern with a word boundary', () => {
    /* src/lib keeps legitimate uses in kappa-check and manifest-check, which
       match prose and identifiers rather than glossary keys; a client script
       has no reason to write one, and every deleted decorator did. */
    const offenders = files
      .filter((f) => rel(f).startsWith('scripts/'))
      .filter((f) => read(f).includes(DOUBLE_ESCAPED_WORD_BOUNDARY))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  test('the canonical matcher refuses a key inside a longer identifier', () => {
    const pattern = acronymPattern();
    const cases = [
      'CP-POP-004', 'CP-UNIT-002', 'KPP-A1', 'KPP-B7', 'TPP-11.1', 'TPP-2.1',
      'SR-LAW-001', 'SR-DATA-003', 'EH-01', 'OI-3', 'TPP-FORM1', 'A1-HCAC-X'
    ];
    for (const id of cases) {
      pattern.lastIndex = 0;
      expect([id, id.match(pattern)]).toEqual([id, null]);
    }
  });

  test('the canonical matcher still finds the same keys as bare prose', () => {
    const pattern = acronymPattern();
    const prose = 'A CP is a cost parameter, a KPP is a key one, and TPP-11.1 is neither. '
      + 'The DNHA reports to the NHAC; LTC sits with the EMS and BH lines.';
    expect(prose.match(pattern)).toEqual(['CP', 'KPP', 'DNHA', 'NHAC', 'LTC', 'EMS', 'BH']);
  });

  test('a key adjacent to a slash, ampersand or hyphen is a fragment, not a key', () => {
    const pattern = acronymPattern();
    expect('NHIS/NMPI resolve the person'.match(pattern)).toBeNull();
    expect('FTE-equivalent staffing'.match(pattern)).toBeNull();
    expect('R&D'.match(pattern)).toBeNull();
  });

  test('deleting the six maps lost no expansion', () => {
    /* the union of the keys held by src/lib/{data-view,legislation,workforce,
       hardening}.ts and the inline map in src/scripts/quality-client.ts,
       measured at b978c7b before the deletion. 140 keys; 139 survive in the
       canonical glossary and OI is deliberately gone (below). */
    const DELETED_UNION = [
      'A1-HCAC', 'ACA', 'ACDRH', 'AHIRC', 'AHWCS', 'AI', 'AICIO', 'AMDDT', 'APA',
      'API', 'ARPA-H', 'BARDA', 'BH', 'BLS', 'BPCIA', 'CBO', 'CFR', 'CHAMPVA',
      'CHAO', 'CHIP', 'CIRBAS', 'CIRCIA', 'CISA', 'COBRA', 'CP', 'DME', 'DMRCO',
      'DNHA', 'DVH', 'ED', 'EH', 'EHR', 'EMS', 'EMTALA', 'EPTO', 'ERISA', 'FA',
      'FCRA', 'FDA', 'FDCA', 'FDCPA', 'FEHBA', 'FISMA', 'FLSA', 'FOIA', 'FTC',
      'FTE', 'GDP', 'HATC', 'HCBS', 'HCCA', 'HCRB', 'HFASB', 'HIPAA', 'HITECH',
      'HIV', 'HPSA', 'HRPO', 'HSA', 'HTIP', 'ICU', 'IEN', 'IHS', 'IMG', 'INA',
      'IRA', 'IRC', 'IT', 'JCT', 'KPP', 'LDA', 'LPN', 'LTC', 'LTSS', 'MHPAEA',
      'MUA', 'MUP', 'NAIG', 'NBIA', 'NCCA', 'NCDSO', 'NCDTN', 'NCSWB', 'NDPA',
      'NEEA', 'NEMTA', 'NHA', 'NHAC', 'NHASB', 'NHETF', 'NHIS', 'NHRA', 'NHSA',
      'NHTCA', 'NHTIB', 'NHWB', 'NHWECA', 'NIH', 'NLLHR', 'NLRA', 'NMPI',
      'NOPRSL', 'NPCB', 'NPSMIB', 'NRLS', 'NSAA', 'OCDTI', 'OI', 'OMB', 'PACE',
      'PACP', 'PBM', 'PCU', 'PHSA', 'PILO', 'PMC', 'PREP', 'PROO', 'PRTO',
      'RFRA', 'RHA', 'RIF', 'RN', 'RS-CORPS', 'SR', 'SR-DATA', 'SRAE', 'SRCO',
      'STI', 'SUD', 'TBD', 'THDO', 'TPP', 'TRICARE', 'TRTO', 'USC', 'USD', 'VA',
      'WARN', 'WHO'
    ];
    expect(DELETED_UNION).toHaveLength(140);
    const missing = DELETED_UNION.filter((k) => !(k in ACRONYMS));
    expect(missing).toEqual(['OI']);
  });

  test('the three divergences are resolved, and stay resolved', () => {
    /* Each key below was spelled two ways across the deleted maps. The
       canonical text is pinned so a later edit has to argue with this test
       rather than pick a winner silently.

       LTC: "Long-Term Care" over hardening's "Long-term care", because the
       canonical LTSS and NLTCA entries hyphenate and capitalise the same way
       and data-view already agreed.

       SR-DATA: recased to match the canonical SR, which is "System
       requirement". The divergent copy read "System Requirement - Data"; the
       hyphen reads as a dash in a hover. This is a fourth divergence the
       section brief did not name, between two canonical entries.

       OI: dropped. It is a catalog-code prefix (OI-3), never bare prose: zero
       matches across all fourteen rendered pages and every non-generated file
       in src/. The canonical matcher rejects OI- by design, so the entry could
       only ever have fired on text that does not exist. */
    expect(ACRONYMS['LTC']).toBe('Long-Term Care');
    expect(ACRONYMS['LTSS']).toBe('Long-Term Services and Supports');
    expect(ACRONYMS['SR']).toBe('System requirement');
    expect(ACRONYMS['SR-DATA']).toBe('System requirement, data');
    expect(ACRONYMS['OI']).toBeUndefined();
  });

  test('R307: the glossary no longer defines a key that reads as Pennsylvania', () => {
    /* The vocabulary tripwire itself is a self-test (stateAcronymCollisions),
       because it needs the region model's state table. This asserts only the
       decision R307 made: PA is gone, VA is kept.

       PA expanded to "Physician assistant" and never fired. Zero bare PA
       across all fourteen rendered pages; the only bare PA anywhere in src/
       was the entry and the comments about this collision; workforce.astro
       writes "Physician assistants" in full. VA is different: four
       occurrences across health and legislation, all of them the Department
       of Veterans Affairs, all correctly expanded. So one was removed at
       source and one is contained. */
    expect(ACRONYMS['PA']).toBeUndefined();
    expect(ACRONYMS['VA']).toBe('Department of Veterans Affairs');
  });

  test('R307: a client script that renders state codes marks its containers', () => {
    /* The containment half. §BI downgraded AE1 by reasoning about what the
       deployed page rendered rather than about what enforced it, and was
       wrong within one file. This pins the surface set instead: a new client
       script that renders a state roster fails here and lands on whoever
       wrote it, rather than shipping a bare PA-shaped code into a decorator's
       reach. */
    const rendersStates = files
      .filter((f) => rel(f).startsWith('scripts/'))
      .filter((f) => /region\.states|stateNameOf|us-states/.test(read(f)))
      .map(rel);
    expect(rendersStates).toEqual(['scripts/units-client.ts']);
    for (const f of rendersStates) {
      const src = read(join(SRC, f));
      expect([f, src.includes('data-no-acronyms')]).toEqual([f, true]);
    }
  });

  test('no page hardcodes an expansion that contradicts the glossary', () => {
    /* Found by measurement after the deletion, in a surface neither the
       section brief nor its pre-measurement looked at: they diffed the
       src/lib dictionaries, and these are title attributes typed into page
       markup. Three of the sixteen disagreed with the glossary, and on the
       units page EMS was rendering BOTH - "Emergency medical services" typed
       into the markup and "Emergency Medical Services" injected by the
       decorator, two hovers for one acronym on one page.

       A hardcoded <abbr> is legitimate: it survives with JavaScript off and
       it is present before the sweep runs. What is not legitimate is a second
       spelling. Two keys are deliberately outside the glossary and are named
       here rather than excused by a wildcard. */
    const OUTSIDE_GLOSSARY: Record<string, string> = {
      /* the glossary's canonical matcher cannot wrap a plural: the trailing s
         is a word char and the lookahead rejects it, so the plural form has
         to be hardcoded to get a hover at all */
      PBMs: 'Pharmacy Benefit Managers',
      /* the lay overview says Emergency Room where the clinical chapters say
         Emergency Department; the glossary carries ED */
      ER: 'Emergency Room'
    };
    const abbr = /<abbr[^>]*title="([^"]*)"[^>]*>([^<]+)<\/abbr>/g;
    const wrong: string[] = [];
    let hardcoded = 0;
    for (const f of files.filter((x) => x.endsWith('.astro'))) {
      const text = read(f);
      let m: RegExpExecArray | null;
      abbr.lastIndex = 0;
      while ((m = abbr.exec(text)) !== null) {
        hardcoded += 1;
        const key = m[2].trim();
        const title = m[1].replace(/&amp;|&#38;/g, '&');
        const expected = ACRONYMS[key] ?? OUTSIDE_GLOSSARY[key];
        if (expected === undefined) {
          wrong.push(`${rel(f)}: ${key} is neither in the glossary nor declared here`);
        } else if (expected !== title) {
          wrong.push(`${rel(f)}: ${key} reads "${title}", the glossary says "${expected}"`);
        }
      }
    }
    expect(wrong).toEqual([]);
    expect(hardcoded).toBe(16);
  });

  test('the five per-tab abbr classes are gone from the stylesheet', () => {
    const css = readFileSync(fileURLToPath(new URL('../../src/styles/global.css', import.meta.url)), 'utf8');
    for (const dead of ['.data-acronym', '.quality-acronym', '.workforce-acronym',
      '.hardening-acronym', '.legislation-acronym']) {
      expect([dead, css.includes(dead)]).toEqual([dead, false]);
    }
    expect(css).toContain('.acronym {');
  });
});
