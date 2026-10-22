import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/* R20 [§S18]: the build brief (HANDOFF.md until abd0aab renamed it, before
   the campaign began) lists the gaps the first research passes left open.
   Its BLS gap said the occupation data "blocked automated fetch" after P11
   closed it in the research file that recorded it. Each gap now states its
   status with the date it was last checked, and a gap the research file
   marks closed cannot read as open here. */

const brief = readFileSync(join(REPO_ROOT, 'BUILD-BRIEF.md'), 'utf8');

function gapBullets(text: string): string[] {
  const start = text.indexOf('## Known open gaps');
  expect(start).toBeGreaterThan(0);
  const rest = text.slice(start).split('\n').slice(1);
  const end = rest.findIndex((l) => /^## |^These are documented/.test(l));
  const body = rest.slice(0, end < 0 ? undefined : end).join('\n');
  return body.split(/\n- /).slice(1).map((b) => b.replace(/\s+/g, ' ').trim());
}

const STATUS = /Status \((\d{4}-\d{2}-\d{2})\): (closed|partly closed|still open)\b/;

test('R20: every gap the build brief lists says its status and when it was checked', () => {
  const bullets = gapBullets(brief);
  expect(bullets.length).toBe(3);
  const today = new Date();
  const local = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');
  for (const b of bullets) {
    const m = STATUS.exec(b);
    expect(m, b.slice(0, 60)).not.toBeNull();
    expect(m![1] <= local, b.slice(0, 60)).toBe(true);
  }
  /* a bullet with no status is reported, not skipped */
  expect(gapBullets(brief.replace(/\n {2}Status \(2026-08-24\): closed\./, '\n  Closed.'))
    .filter((b) => !STATUS.test(b))).toHaveLength(1);
});

test('R20: the BLS gap reads as closed because the research file closed it', () => {
  const research = readFileSync(join(REPO_ROOT, 'research/05_it_governance_rd_transition.md'), 'utf8');
  const closedThere = /### RB-05-TRN-NEW-001: BLS data access constraint - CLOSED/.test(research);
  const bls = gapBullets(brief).find((b) => b.startsWith('BLS occupational headcount data'))!;
  expect(bls).toBeDefined();
  expect(STATUS.exec(bls)![2] === 'closed').toBe(closedThere);
  expect(closedThere).toBe(true);
});

/* Review 3 of P24: only the BLS gap was held to its research file, and the
   third gap shipped as "still open" for a ratio research/03 had sourced. Its
   status is held now: the ratio is sourced there, and the items of
   research/01's gap summary the brief names are the four it lists, still open. */
test('review 3 of P24: the third gap says what research/03 and research/01 record', () => {
  const r03 = readFileSync(join(REPO_ROOT, 'research/03_drugs_pharmacy_diagnostics_devices.md'), 'utf8');
  const r01 = readFileSync(join(REPO_ROOT, 'research/01_macro_financing_population_offsets.md'), 'utf8');
  const gap = gapBullets(brief).find((b) => b.startsWith('No clean single citation yet'))!;
  expect(gap).toBeDefined();
  /* the ratio is sourced in research/03, so the gap is not "still open" */
  expect(r03).toMatch(/### RB-03-RX-003\b/);
  expect(STATUS.exec(gap)![2]).toBe('partly closed');
  /* the items the brief names are research/01's open ones, by topic */
  const m = /\(items (\d+) to (\d+)\)/.exec(gap)!;
  expect(m).not.toBeNull();
  const summary = r01.slice(r01.indexOf('## Summary of Highest-Priority Gaps'));
  const item = (n: number) => new RegExp('^' + n + '\\. \\*\\*([^*]+)\\*\\*(.*)$', 'm').exec(summary)!;
  const topics = [/age-based/i, /diabetes/i, /CHIP-only/i, /employer health spending/i];
  for (let n = Number(m[1]), t = 0; n <= Number(m[2]); n++, t++) {
    const it = item(n);
    expect(it, 'item ' + n).not.toBeNull();
    expect(it[1], 'item ' + n).toMatch(topics[t]!);
    expect(it[2], 'item ' + n).not.toMatch(/\*\*Closed/);
  }
  expect(Number(m[2]) - Number(m[1]) + 1).toBe(topics.length);
});
