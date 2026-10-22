import { afterEach, describe, expect, test } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

/* Review of P22 [§S16]: the generators' own refusals had no test that ran
   them. R119's raise in kpp_concept(), the addendum's concept check, and the
   data-phase generator's refusals for R104 (no P8 row) and R299 (an
   undeclared change of population) were each proved once by hand. These run
   the real Python, importing the generator modules without letting them
   write anything.

   They need CPython with python-docx (the catalog extractor imports it at the
   top). Where that is missing, as on a runner without Python, vitest reports
   these tests as skipped, not passed. (Review 2 of P22 removed a companion
   test that asserted `typeof havePython` was a boolean: it could not fail,
   and it counted as a pass.) */

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const probe = spawnSync('python', ['-c', 'import docx'], { cwd: REPO_ROOT, encoding: 'utf8' });
const havePython = probe.status === 0;

function py(code: string, ...args: string[]): { status: number | null; out: string } {
  const r = spawnSync('python', ['-c', code, ...args], { cwd: join(REPO_ROOT, 'tools'), encoding: 'utf8' });
  return { status: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

const roots: string[] = [];
afterEach(() => { while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true }); });

describe.skipIf(!havePython)('the generators refuse what they promise to refuse', () => {
  test('R119: kpp_concept() raises on a domain it does not know, and maps the named ones', () => {
    const ok = py(
      'import extract_quality_catalog as e\n' +
      'print(e.kpp_concept("coverage/affordability; SN-02"))\n' +
      'print(e.kpp_concept("rural and underserved staffing; SN-10"))\n'
    );
    expect(ok.status, ok.out).toBe(0);
    expect(ok.out).toContain('Coverage, affordability & eligibility');
    expect(ok.out).toContain('Workforce & care delivery');
    const bad = py('import extract_quality_catalog as e\ne.kpp_concept("zoning and land use; SN-99")\n');
    expect(bad.status).not.toBe(0);
    expect(bad.out).toContain("KPP domain 'zoning and land use; SN-99' matches no concept prefix");
  });

  test('an addendum record whose concept disagrees with its domain stops the extractor', () => {
    const real = JSON.parse(readFileSync(join(REPO_ROOT, 'tools', 'quality_catalog_addendum.json'), 'utf8'));
    real.records.find((r: { id: string }) => r.id === 'KPP-W3').concept = 'Governance, transition & continuity';
    const dir = mkdtempSync(join(tmpdir(), 'nha-addendum-'));
    roots.push(dir);
    const path = join(dir, 'addendum.json');
    writeFileSync(path, JSON.stringify(real), 'utf8');
    const run = py(
      'import sys\nfrom pathlib import Path\nimport extract_quality_catalog as e\n' +
      'e.ADDENDUM = Path(sys.argv[1])\ne.load_addendum()\n', path);
    expect(run.status).not.toBe(0);
    expect(run.out).toContain("addendum record KPP-W3 says concept 'Governance, transition & continuity'");
    /* and the real addendum loads */
    const clean = py('import extract_quality_catalog as e\nprint(len(e.load_addendum()))\n');
    expect(clean.out.trim()).toBe(String(real.records.length));
  });

  test('R104: the data-phase generator refuses a register metric with no P8 row', () => {
    const run = py(
      'import build_data_phase_targets as b\n' +
      'p8 = [p for p in b.PHASES if p["id"] == "P8"][0]\n' +
      'for g in p8["groups"]:\n' +
      '    g["metrics"] = [m for m in g["metrics"] if m[0] != "TPP-9.1"]\n' +
      'b.build_payload()\n');
    expect(run.status).not.toBe(0);
    expect(run.out).toContain('R104: register metrics with no P8 certification row: TPP-9.1');
  });

  test('R299: the data-phase generator refuses an undeclared change of population', () => {
    const run = py(
      'import build_data_phase_targets as b\n' +
      'del b.SCOPE_CHANGES["TPP-10.5"]["P1"]\n' +
      'b.build_payload()\n');
    expect(run.status).not.toBe(0);
    expect(run.out).toContain('R299: a ladder changes its wording with no declaration: TPP-10.5 P1');
    const clean = py('import build_data_phase_targets as b\nprint(b.build_payload()["targetCount"])\n');
    expect(clean.status, clean.out).toBe(0);
  });

  /* R109 [§S18]: the count sentence is the generator's, written from the
     payload in the same run, and the committed document is that run's. */
  test('R109: the generator writes the register\'s counts from its own payload', () => {
    const run = py('import build_data_phase_targets as b\nprint(b.register_counts(b.build_payload()))\n');
    expect(run.status, run.out).toBe(0);
    const sentence = run.out.trim();
    expect(sentence).toMatch(/^The register holds \*\*\d+\*\* metrics and \*\*\d+\*\* phase targets/);
    expect(readFileSync(join(REPO_ROOT, 'research/data_phase_target_methodology.md'), 'utf8')).toContain(sentence);
    /* it reads the payload, field by field: a payload with a target removed
       says one fewer target. (A first version compared whole sentences, and
       a typed target count passed it, because the derived count moved.) */
    const n = Number(/\*\*(\d+)\*\* phase targets/.exec(sentence)![1]);
    const fewer = py('import build_data_phase_targets as b\np = b.build_payload()\n' +
      'p["phases"][0]["groups"][0]["metrics"].pop()\np["targetCount"] -= 1\nprint(b.register_counts(p))\n');
    expect(fewer.status, fewer.out).toBe(0);
    expect(fewer.out).toContain('**' + (n - 1) + '** phase targets');
    const morePhases = py('import build_data_phase_targets as b\np = b.build_payload()\n' +
      'p["phases"].append({"groups": []})\np["metricCount"] += 1\nprint(b.register_counts(p))\n');
    expect(morePhases.out).toContain('across **' + (Number(/across \*\*(\d+)\*\* phases/.exec(sentence)![1]) + 1) + '** phases');
    expect(morePhases.out).toContain('**' + (Number(/\*\*(\d+)\*\* metrics/.exec(sentence)![1]) + 1) + '** metrics');
  });
});

/* Review 3 of P24: the catalog note names each addition from the addendum's
   own description of it, and the extractor's number words are format.ts's. */
describe.skipIf(!havePython)('review 3 of P24: the catalog note and its words', () => {
  test('the extractor\'s number words are the same list format.ts holds', async () => {
    const { NUMBER_WORDS } = await import('../../src/lib/format');
    const run = py('import extract_quality_catalog as e\nprint(",".join(e.NUMBER_WORDS))\n');
    expect(run.status, run.out).toBe(0);
    expect(run.out.trim().split(',')).toEqual(NUMBER_WORDS);
  });

  test('every addendum record names a declared addition, and the note names every addition present', async () => {
    const real = JSON.parse(readFileSync(join(REPO_ROOT, 'tools', 'quality_catalog_addendum.json'), 'utf8'));
    const { NHA_QUALITY_DATA } = await import('../../src/lib/quality-data');
    for (const phrase of Object.values(real.additions) as string[]) {
      expect(NHA_QUALITY_DATA.provenance!.note).toContain(phrase);
    }
    /* a record naming no declared addition stops the extractor */
    real.records[0].addition = 'not-declared';
    const dir = mkdtempSync(join(tmpdir(), 'nha-addendum-'));
    roots.push(dir);
    const path = join(dir, 'addendum.json');
    writeFileSync(path, JSON.stringify(real), 'utf8');
    const run = py('import sys\nfrom pathlib import Path\nimport extract_quality_catalog as e\n' +
      'e.ADDENDUM = Path(sys.argv[1])\ne.load_addendum()\n', path);
    expect(run.status).not.toBe(0);
    expect(run.out).toContain('names no declared addition');
    /* two additions are joined with "and", three with commas and "and" */
    const note = py('import extract_quality_catalog as e\nprint(e.catalog_provenance_note(430, 3, ["a", "b", "c"]))\n');
    expect(note.out).toContain('Three do not: a, b, and c.');
  });
});
