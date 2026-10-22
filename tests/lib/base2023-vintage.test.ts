import type { SponsorId } from '../../src/lib/params';
import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  BASE2023, MONEYFLOW, NHE_2023_SPONSOR_ROWS, NHE_2024_OBSERVED, moneyFlowChannel, nheGdpSharePct,
  nhePerPerson, sponsorTotal2023
} from '../../src/lib/params';

/* Owner, 2026-10-19: BASE2023 was recalibrated to CMS's 2024 release, whose
   2023 column revises the 2023 release the model was built on. Before it,
   nothing held the seed's 2023 CMS rows to BASE2023: the build passed with
   the seed still carrying the old vintage. These hold the two copies to each
   other, and the money flow to the CMS sponsor and payer totals it is
   read from. */

function seedRows(): Map<string, { value: string; year: string; notes: string }> {
  const lines = readFileSync('research/parameter_baseline_seed.csv', 'utf8').split(/\r?\n/).filter((l) => l.trim());
  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') quoted = false;
        else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const header = split(lines[0]!);
  const at = (h: string) => header.indexOf(h);
  const out = new Map<string, { value: string; year: string; notes: string }>();
  for (const line of lines.slice(1)) {
    const c = split(line);
    out.set(c[at('baseline_id')]!, { value: c[at('value')]!, year: c[at('year')]!, notes: c[at('notes')]! });
  }
  return out;
}

test('owner 2026-10-19: the seed\'s 2023 CMS rows are the figures BASE2023 calibrates on', () => {
  const S = seedRows();
  const row = (id: string) => { const r = S.get(id); expect(r, id).toBeDefined(); expect(r!.year, id).toBe('2023'); return Number(r!.value); };
  const b = BASE2023;
  expect(row('BL-0001')).toBe(b.nheTotal);
  expect(row('BL-0004')).toBe(b.hospital);
  expect(row('BL-0005')).toBe(b.physician);
  expect(row('BL-0006')).toBe(b.rxRetail);
  expect(row('BL-0007')).toBe(b.nursing);
  expect(row('BL-0008')).toBe(b.dental);
  expect(row('BL-0009')).toBe(b.homeHealth);
  expect(row('BL-0010')).toBeCloseTo(b.netInsCost + b.govtAdmin, 6);
  expect(row('BL-0067')).toBe(b.publicHealth);
  expect(row('BL-0002')).toBe(Number(nheGdpSharePct().toFixed(1)));
  /* CMS's per-person figure divides by the unrounded population; BASE2023
     carries the population as Table 1 prints it, a dollar apart */
  expect(Math.abs(row('BL-0003') - nhePerPerson())).toBeLessThan(1);
  /* the same release's 2024 total, stated in BL-0001's notes, is the observed
     row the benchmark chart draws */
  expect(S.get('BL-0001')!.notes).toContain('$' + NHE_2024_OBSERVED.mid.toLocaleString('en-US') + 'B');
  /* the categories sum to the total, with investment the rest: in this
     release that rest is CMS's own investment line (Table 2: 233.4) */
  expect(b.investmentResidual).toBeCloseTo(233.4, 6);
});

test('owner 2026-10-19: the money flow is CMS\'s sponsor rows, and lands on CMS\'s sponsor and payer totals', () => {
  /* CMS's 2024 release, Table 5 (sponsors) and Table 3 (payers), 2023
     column, restated so the rows are held to something other than themselves */
  const sponsors: Record<SponsorId, number> = { hh: 1364.9, emp: 916.1, fed: 1566.4, state: 767.1, oth: 310.8 };
  for (const [id, total] of Object.entries(sponsors) as [SponsorId, number][]) {
    /* the rows are rounded to a tenth, so a sum may sit a tenth or two off */
    expect(Math.abs(sponsorTotal2023(id) - total), id).toBeLessThanOrEqual(0.2);
  }
  expect(MONEYFLOW.total).toBe(BASE2023.nheTotal);
  let sum = 0;
  MONEYFLOW.sources.forEach((s) => { sum += s.value; });
  expect(Math.abs(sum - BASE2023.nheTotal)).toBeLessThanOrEqual(0.3);
  /* Medicaid and out-of-pocket are exactly CMS's payer lines; private
     insurance and Medicare within the gap the params comment states */
  expect(moneyFlowChannel('medicaid')).toBeCloseTo(873.7, 6);
  expect(moneyFlowChannel('oop')).toBeCloseTo(525.4, 6);
  /* review 1 of the owner decisions: the two channel totals the params
     comment states beside CMS's payer lines, held exactly (a tolerance of 15
     and 20 let either move; review 2 dropped two gap lines that followed
     from these by arithmetic) */
  expect(moneyFlowChannel('priv')).toBeCloseTo(1500.5, 6);
  expect(moneyFlowChannel('medicare')).toBeCloseTo(1021.4, 6);
  /* every ribbon is a sum of named rows, and every row reaches a ribbon */
  let rows = 0;
  NHE_2023_SPONSOR_ROWS.forEach((r) => { rows += r.value; });
  let ribbons = 0;
  MONEYFLOW.ribbons.forEach((r) => { ribbons += r.value; });
  expect(Math.abs(rows - ribbons)).toBeLessThan(0.05);
  for (const r of MONEYFLOW.ribbons) expect(r.note.length, r.from + '>' + r.to).toBeGreaterThan(5);
});
