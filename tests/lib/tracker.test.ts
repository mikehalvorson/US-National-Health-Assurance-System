import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  KEY_DATE_TYPES, statedEffectiveDates, TRACKER_FILE, TRACKER_STATUS, trackerDateContradictions,
  trackerParameterLinkFaults, trackerRows, trackerSchemaFaults, trackerShortName, trackerTemplateFaults
} from '../../src/lib/tracker';
import { PARAMS_BY_ID } from '../../src/lib/params';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const committed = (): string => readFileSync(join(REPO_ROOT, TRACKER_FILE), 'utf8');

/* One row of the committed file, rewritten through the parser so a fixture
   changes exactly the field it names and nothing else. */
function withField(title: string, column: string, value: string): string {
  return withFields(title, { [column]: value });
}

function withFields(title: string, values: Record<string, string>): string {
  const { head, rows } = trackerRows(committed());
  const quote = (s: string): string => /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  const hits = rows.filter((r) => r.fields.title === title);
  expect(hits).toHaveLength(1);
  return [head.join(','), ...rows.map((r) => head.map((h) =>
    quote(r === hits[0] && h in values ? values[h] : r.fields[h])).join(','))].join('\n') + '\n';
}

const ACA = 'Affordable Care Act (ACA)';

/* ---- R201 [§S17]: staleness is queryable ---------------------------------- */

test('R201: the committed tracker is dated, typed and classified on every row', () => {
  const scan = trackerSchemaFaults(committed());
  expect(scan.faults).toEqual([]);
  expect(scan.rows).toBeGreaterThanOrEqual(33);
});

test('R201: every row has a last_verified date', () => {
  expect(trackerSchemaFaults(withField(ACA, 'last_verified', '')).faults[0])
    .toMatch(/last_verified "" is not a date/);
  /* after date_added, so the ordering rule cannot be what reports it */
  expect(trackerSchemaFaults(withField(ACA, 'last_verified', '2026-09-31')).faults)
    .toEqual(['line 2 (Affordable Care Act (ACA)): last_verified "2026-09-31" is not a date']);
  /* checked before it was added cannot be */
  expect(trackerSchemaFaults(withField(ACA, 'last_verified', '2026-07-13')).faults[0])
    .toMatch(/is before date_added/);
  const dropped = committed().replace(/^date_added,last_verified,/, 'date_added,');
  expect(trackerSchemaFaults(dropped).faults).toEqual([TRACKER_FILE + ' has no last_verified column']);
});

test('R201: status is a member of a declared vocabulary', () => {
  /* "superseded" did three jobs before; a word nobody declared is the shape
     that let it */
  const faults = trackerSchemaFaults(withField(ACA, 'status', 'lapsed')).faults;
  expect(faults).toHaveLength(1);
  expect(faults[0]).toMatch(/status "lapsed" is not declared/);
});

test('R201: key_date carries a date_type', () => {
  expect(trackerSchemaFaults(withField(ACA, 'key_date_type', '')).faults[0])
    .toMatch(/key_date_type "" is not declared/);
  expect(trackerSchemaFaults(withField(ACA, 'key_date_type', 'signed')).faults[0])
    .toMatch(/key_date_type "signed" is not declared/);
});

test('R201: an empty tracker is a fault, not a pass', () => {
  expect(trackerSchemaFaults(committed().split('\n')[0] + '\n').faults)
    .toEqual([TRACKER_FILE + ' has no rows']);
});

/* Review of P23: titled "no two say the same thing" while it checked only
   that no two meanings are the same sentence. That is what it checks. */
test('R201: each declared word says what it means, and no two meanings are the same sentence', () => {
  for (const vocab of [TRACKER_STATUS, KEY_DATE_TYPES] as Record<string, string>[]) {
    const meanings = Object.values(vocab);
    expect(meanings.every((m) => m.trim().length > 20)).toBe(true);
    expect(new Set(meanings).size).toBe(meanings.length);
  }
});

test('R201: the three rows "superseded" used to cover are classified by what happened', () => {
  const by = (needle: string): string => {
    const hits = trackerRows(committed()).rows.filter((r) => r.fields.title.includes(needle));
    expect(hits).toHaveLength(1);
    return hits[0].fields.status;
  };
  expect(by('Expiration of ACA Enhanced Premium Tax Credits')).toBe('expired');
  expect(by('Pandemic and All-Hazards Preparedness Act')).toBe('expired');
  expect(by('Idaho v. United States')).toBe('dismissed');
});

/* ---- R202 [§S17]: a status its own dates contradict ------------------------ */

const IFC = 'CMS Interim Final Rule - Medicaid Community Engagement (Work) Requirement (CMS-2454-IFC)';
/* the local date, the calendar the tracker's dates are written in (review 2
   of P23: this was the UTC date, which turns over hours early here) */
const today = (): string => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

/* The control. The build checks each row as of its own last_verified and
   never reads the clock; this reads it. When a trigger date in the file
   passes, this fails until someone re-checks the row against its source,
   corrects its status and moves its last_verified. That is the work the
   tracker exists to prompt, so a red run here is the tracker doing its job. */
test('R202: no row\'s status contradicts a date its own summary states as passed, as of today', () => {
  const scan = trackerDateContradictions(committed(), today());
  expect(scan.faults).toEqual([]);
  expect(scan.dated).toBeGreaterThan(0);
});

/* Second review of the owner fix run (J2): nothing bounded last_verified from
   above. A stamp after today would pass every check and would move the
   build's "as of" date for that row into the future, where no trigger has
   passed yet. The build cannot read the clock; this can. */
test('no row is stamped as checked after today', () => {
  const rows = trackerRows(committed()).rows;
  /* review of the content run: a filter over no rows, or over stamps that
     compare as text but are not dates, passes on silence */
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.filter((r) => !/^\d{4}-\d{2}-\d{2}$/.test(r.fields.last_verified))
    .map((r) => 'line ' + r.line + ' last_verified "' + r.fields.last_verified + '"')).toEqual([]);
  const late = rows.filter((r) => r.fields.last_verified > today())
    .map((r) => 'line ' + r.line + ' last_verified ' + r.fields.last_verified);
  expect(late).toEqual([]);
});

test('R202: as of its own last_verified, every row agrees with its dates (the build half)', () => {
  expect(trackerDateContradictions(committed()).faults).toEqual([]);
});

test('R202: the work-requirement row as it was loaded passes its load date and fails after its trigger', () => {
  const asLoaded = withFields(IFC, { status: 'final', last_verified: '2026-07-14' });
  expect(trackerDateContradictions(asLoaded).faults).toEqual([]);
  const after = trackerDateContradictions(asLoaded, '2026-08-01').faults;
  expect(after).toHaveLength(1);
  expect(after[0]).toMatch(/`final`, but it took effect on 2026-07-31, on or before 2026-08-01/);
  /* and the corrected row could not have been written on the load date */
  expect(trackerDateContradictions(withFields(IFC, { last_verified: '2026-07-14' })).faults[0])
    .toMatch(/`in_effect` before its effective date 2026-07-31 \(as of 2026-07-14\)/);
});

test('R202: a date the summary states counts as well as the key date', () => {
  const marketplace = 'One Big Beautiful Bill Act - ACA Marketplace & Individual Market Provisions (P.L. 119-21)';
  /* its key date is the signing; the 2026 effective date is only in prose */
  const faults = trackerDateContradictions(withField(marketplace, 'status', 'enacted')).faults;
  expect(faults).toHaveLength(1);
  expect(faults[0]).toMatch(/`enacted`, but it took effect on 2026-01-01, on or before 2026-07-14/);
});

test('R202: in force before its effective date, or expired before its expiry, is a fault', () => {
  const second = 'Medicare Drug Price Negotiation Program - Second Cycle (IPAY 2027, 15 Drugs)';
  expect(trackerDateContradictions(withField(second, 'status', 'in_effect')).faults[0])
    .toMatch(/`in_effect` before its effective date 2027-01-01/);
  const conrad = 'Conrad State 30 and Physician Access Reauthorization Act (S.709 / H.R.1585) - Program Lapsed Pending Reauthorization';
  const lapsing = withField(conrad, 'status', 'expired').replace('2025-10-01,expiry', '2027-10-01,expiry');
  expect(trackerDateContradictions(lapsing).faults[0]).toMatch(/`expired` before its expiry date 2027-10-01/);
});

test('R202: the summary reader finds the stated day in either case, and none where none is named', () => {
  expect(statedEffectiveDates('the rule itself takes effect July 31, 2026.')).toEqual(['2026-07-31']);
  expect(statedEffectiveDates('Effective October 1, 2025.')).toEqual(['2025-10-01']);
  expect(statedEffectiveDates('(effective January 1, 2026), and effective on March 2, 2027'))
    .toEqual(['2026-01-01', '2027-03-02']);
  expect(statedEffectiveDates('Effective dates are staggered through 2027-2028.')).toEqual([]);
  expect(statedEffectiveDates('do not take effect until January 1, 2027')).toEqual([]);
});

test('R202: a file with no dated row reports that nothing was checked', () => {
  const head = committed().split('\n')[0];
  const row = '2026-07-14,2026-07-14,X,final_rule,federal,final,T,2026-01-01,issued,https://x,no dates here,n';
  expect(trackerDateContradictions(head + '\n' + row + '\n').faults[0]).toMatch(/nothing was checked/);
});

/* ---- R198 [§S17]: no template text ---------------------------------------- */

test('R198: no row summary contains template text', () => {
  const scan = trackerTemplateFaults(committed());
  expect(scan.faults).toEqual([]);
  expect(scan.fields).toBeGreaterThanOrEqual(99);
});

test('R198: the sentence that shipped, and the other tells, are each reported', () => {
  const nsa = 'No Surprises Act';
  const shipped = trackerTemplateFaults(withField(nsa, 'summary',
    'Example row - replace with your own research. Restricts surprise billing.')).faults;
  expect(shipped).toEqual([
    'line 3 summary carries template text (example row)',
    'line 3 summary carries template text (replace with your own)'
  ]);
  for (const [text, what] of [['TBD', 'a to-do marker'], ['Lorem ipsum dolor', 'lorem ipsum'],
    ['placeholder until research lands', 'placeholder']]) {
    expect(trackerTemplateFaults(withField(nsa, 'relevance_note', text)).faults)
      .toEqual(['line 3 relevance_note carries template text (' + what + ')']);
  }
});

test('R198: the two foundational rows are researched, dated and sourced to the statute', () => {
  const rows = trackerRows(committed()).rows;
  const aca = rows.find((r) => r.fields.title === 'Affordable Care Act (ACA)')!;
  const nsa = rows.find((r) => r.fields.title === 'No Surprises Act')!;
  expect(aca.fields.summary).toContain('P.L. 111-148');
  expect(aca.fields.source_url).toBe('https://www.govinfo.gov/app/details/PLAW-111publ148');
  expect(nsa.fields.summary).toContain('P.L. 116-260');
  for (const r of [aca, nsa]) expect(r.fields.last_verified > r.fields.date_added).toBe(true);
});

test('R198: a tracker with no text to read is a fault, not a pass', () => {
  expect(trackerTemplateFaults(committed().split('\n')[0] + '\n').faults)
    .toEqual([TRACKER_FILE + ': no row has text to read']);
});

/* ---- R200 [§S17] (§BG7): the tracker read back into the model -------------- */


const fieldOf = (needle: string, column: string): string => {
  const hits = trackerRows(committed()).rows.filter((r) => r.fields.title.includes(needle));
  expect(hits).toHaveLength(1);
  return hits[0].fields[column];
};

test('R200: every tracker row with status in_effect/enacted names the parameters it affects, or is marked no-model-impact', () => {
  const scan = trackerParameterLinkFaults(committed(), PARAMS_BY_ID);
  expect(scan.faults).toEqual([]);
  expect(scan.linked).toEqual(['baselineRealGrowth', 'coverageDemandShare', 'drugPriceCut', 'utilIncrease', 'wealthTaxPotential']);
  const inForce = trackerRows(committed()).rows.filter((r) => ['in_effect', 'enacted'].includes(r.fields.status));
  expect(inForce.every((r) => r.fields.affects_parameter.trim() !== '')).toBe(true);
});

/* Review of P23: the Rural Health Transformation Program was first marked
   no-model-impact for ending before the mature year, while the rest of the
   same law was linked to the baseline growth for postdating its projections;
   it is linked by the same reason now, and two of §BG7's four move nothing. */
test('R200: the enacted changes that move parameters, and the two the audit named that measured as moving none', () => {
  const coverage = 'baselineRealGrowth;utilIncrease;coverageDemandShare';
  expect(fieldOf('One Big Beautiful Bill Act - Medicaid Provisions', 'affects_parameter')).toBe(coverage);
  expect(fieldOf('CMS-2454-IFC', 'affects_parameter')).toBe(coverage);
  expect(fieldOf('ACA Marketplace & Individual Market Provisions', 'affects_parameter')).toBe(coverage);
  expect(fieldOf('First Cycle, IPAY 2026', 'affects_parameter')).toBe('drugPriceCut');
  expect(fieldOf('PBM Reform Provisions', 'affects_parameter')).toBe('drugPriceCut');
  expect(fieldOf('Rural Health Transformation', 'affects_parameter')).toBe('baselineRealGrowth');
  expect(fieldOf('PBM Reform Provisions', 'model_link_note')).toContain("Workforce chapter's PBM slice");
  expect(fieldOf('Nursing Home Minimum Staffing', 'model_link_note')).not.toMatch(/\bP23\b/);
  for (const t of ['Nursing Home Minimum Staffing', 'Noncompete Ban']) {
    expect(fieldOf(t, 'affects_parameter')).toBe('no-model-impact');
    expect(fieldOf(t, 'model_link_note').length).toBeGreaterThan(80);
  }
});

test('R200: no parameter\'s source note is silent about an in-force row that names it', () => {
  const silent = { ...PARAMS_BY_ID, drugPriceCut: { ...PARAMS_BY_ID.drugPriceCut, source: 'US net prices only.' } };
  const faults = trackerParameterLinkFaults(committed(), silent).faults;
  expect(faults.length).toBe(3);
  expect(faults.every((f) => f.includes("drugPriceCut's source note does not mention"))).toBe(true);
  expect(faults.some((f) => f.endsWith('"Consolidated Appropriations Act, 2026"'))).toBe(true);
});

test('R200: an unanswered row, an unknown id, a mixed answer and a missing reason are each reported', () => {
  const nh = 'CMS Repeal of Nursing Home Minimum Staffing Standards';
  expect(trackerParameterLinkFaults(withField(nh, 'affects_parameter', ''), PARAMS_BY_ID).faults)
    .toEqual(['line 29 (CMS Repeal of Nursing Home Minimum Staff): `in_effect` and names no parameter and no no-model-impact']);
  expect(trackerParameterLinkFaults(withField(nh, 'affects_parameter', 'ltcStaffing'), PARAMS_BY_ID).faults)
    .toEqual(['line 29 (CMS Repeal of Nursing Home Minimum Staff): "ltcStaffing" is not a parameter']);
  expect(trackerParameterLinkFaults(withField(nh, 'affects_parameter', 'ltcExpansion;no-model-impact'), PARAMS_BY_ID).faults)
    .toContain('line 29 (CMS Repeal of Nursing Home Minimum Staff): names parameters and no-model-impact at once');
  expect(trackerParameterLinkFaults(withField(nh, 'model_link_note', 'none'), PARAMS_BY_ID).faults)
    .toEqual(['line 29 (CMS Repeal of Nursing Home Minimum Staff): says no-model-impact without a model_link_note saying why']);
});

test('R200: a tracker with no parameter column, or no link at all, is a fault', () => {
  const dropped = committed().replace(',affects_parameter,model_link_note', '');
  expect(trackerParameterLinkFaults(dropped.split('\n')[0] + '\n', PARAMS_BY_ID).faults)
    .toEqual([TRACKER_FILE + ' has no affects_parameter column', TRACKER_FILE + ' has no model_link_note column']);
  const head = committed().split('\n')[0];
  const row = '2026-07-14,2026-07-14,X,final_rule,federal,in_effect,T,2026-01-01,effective,https://x,s,n,no-model-impact,' +
    'a reason that is long enough to count as a reason here';
  expect(trackerParameterLinkFaults(head + '\n' + row + '\n', PARAMS_BY_ID).faults)
    .toEqual([TRACKER_FILE + ': no row names a parameter, so nothing was read back into the model']);
});

test('R200: a short name is the title up to its first " - " or " ("', () => {
  expect(trackerShortName('Consolidated Appropriations Act, 2026 - PBM Reform Provisions (H.R. 7148)'))
    .toBe('Consolidated Appropriations Act, 2026');
  expect(trackerShortName('Rural Health Transformation (RHT) Program (One Big Beautiful Bill Act)')).toBe('Rural Health Transformation');
  expect(trackerShortName('CMS Repeal of Nursing Home Minimum Staffing Standards')).toBe('CMS Repeal of Nursing Home Minimum Staffing Standards');
});

/* ---- Review of P23 --------------------------------------------------------- */

test('review of P23: a rule in force on paper but not enforced is its own status, and dates read accordingly', () => {
  const mhpaea = 'Mental Health Parity and Addiction Equity Act - 2024 Final Rule (Non-Enforcement Status)';
  expect(trackerRows(committed()).rows.find((r) => r.fields.title === mhpaea)!.fields.status).toBe('not_enforced');
  /* a true effective date in its summary is not a contradiction for not_enforced */
  const dated = withFields(mhpaea, { summary: 'The rule took effect January 1, 2025, and is not enforced.' });
  expect(trackerDateContradictions(dated).faults).toEqual([]);
  /* it is for `final`, which now means only "not yet in force" */
  expect(trackerDateContradictions(withFields(mhpaea, {
    status: 'final', summary: 'The rule took effect January 1, 2025, and is not enforced.'
  })).faults[0]).toMatch(/`final`, but it took effect on 2025-01-01/);
  /* and not_enforced before its own effective date is the in_effect fault */
  expect(trackerDateContradictions(withFields(mhpaea, { key_date: '2027-01-01', key_date_type: 'effective' })).faults[0])
    .toMatch(/`not_enforced` before its effective date 2027-01-01/);
});

/* Review 2 of P23: the date check read `not_enforced` as in force and R200
   did not, so a non-enforced rule naming no parameter passed silently. */
test('review 2 of P23: a rule in force but not enforced must say what it does to the model', () => {
  const mhpaea = 'Mental Health Parity and Addiction Equity Act - 2024 Final Rule (Non-Enforcement Status)';
  expect(trackerParameterLinkFaults(withFields(mhpaea, { affects_parameter: '', model_link_note: '' }), PARAMS_BY_ID).faults)
    .toEqual([expect.stringMatching(/`not_enforced` and names no parameter and no no-model-impact$/)]);
  /* a status not yet in force is still not asked */
  expect(trackerParameterLinkFaults(withFields(mhpaea, { status: 'final', affects_parameter: '', model_link_note: '' }), PARAMS_BY_ID).faults)
    .toEqual([]);
});

test('review of P23: a row with both an expiry date and a stated effective date is counted once', () => {
  const head = committed().split('\n')[0];
  const row = '2026-07-14,2026-07-14,X,final_rule,federal,expired,T,2025-12-31,expiry,https://x,' +
    '"It took effect January 1, 2020.",n,no-model-impact,a reason long enough to count as one';
  expect(trackerDateContradictions(head + '\n' + row + '\n').dated).toBe(1);
});

test('review of P23: the OBBBA Medicaid row names its trigger dates, so a status left behind them is caught', () => {
  const t = 'One Big Beautiful Bill Act - Medicaid Provisions (P.L. 119-21)';
  expect(fieldOf(t, 'status')).toBe('in_effect');
  /* as loaded, the summary said only "staggered through 2027-2028", and no
     check could see that a named provision took effect on October 1, 2026.
     Review 2 of P23: an earlier one did. The state-directed-payment limit
     applied to rating periods beginning on or after enactment, so the row
     was wrong on the day it was loaded, and its summary now says so in a
     form the check reads. */
  expect(trackerDateContradictions(withFields(t, { status: 'enacted', last_verified: '2026-07-14' })).faults[0])
    .toMatch(/`enacted`, but it took effect on 2025-07-04, on or before 2026-07-14/);
  expect(statedEffectiveDates(fieldOf(t, 'summary'))).toEqual(['2025-07-04', '2026-04-03', '2026-10-01']);
});

/* Review 2 of P23: DISCREPANCY 18 left the two other `enacted` rows unchecked
   against the word's declared meaning. The NDAA row was wrong at load: the
   75-mile travel threshold it names is in force (TRICARE's page, updated
   May 27, 2026). The PBM row is `enacted` correctly, and its summary now
   states the dates on which the control above will make someone look again. */
test('review 2 of P23: the two `enacted` rows the first review left are re-checked', () => {
  const ndaa = 'FY2026 National Defense Authorization Act (P.L. 119-60) - Tricare Provisions';
  expect(fieldOf(ndaa, 'status')).toBe('in_effect');
  expect(fieldOf(ndaa, 'last_verified')).toBe('2026-10-10');
  const pbm = 'Consolidated Appropriations Act, 2026 - PBM Reform Provisions (H.R. 7148)';
  expect(fieldOf(pbm, 'status')).toBe('enacted');
  /* checked again 2026-10-12, its rebate sentence against the enacted text (below) */
  expect(fieldOf(pbm, 'last_verified')).toBe('2026-10-12');
  expect(statedEffectiveDates(fieldOf(pbm, 'summary'))).toEqual(['2028-01-01', '2029-01-01']);
  /* no row is `enacted` that was not checked after the load */
  expect(trackerRows(committed()).rows.filter((r) => r.fields.status === 'enacted' && r.fields.last_verified === '2026-07-14')).toEqual([]);
});

/* The owner, 2026-10-11 ("do the check"): the PBM row's "Requires PBMs to
   remit 100% of manufacturer rebates and fees to ERISA plans" came from
   law-firm summaries. Read against the enacted text (P.L. 119-75, sections
   6701 and 6702, on Congress.gov): the pass-through is a condition of ERISA's
   exemption for service contracts, not a free-standing duty; it covers
   remuneration from any applicable entity (wholesalers, rebate aggregators,
   affiliated purchasing organizations), not only manufacturers; it reaches
   the plan or its insurer quarterly; and it reaches a contract in force
   only when that contract is renewed or extended. The reports are at least
   every six months and show the spread claim by claim. */
test('the PBM row states the rebate pass-through as the enacted text does', () => {
  const s = fieldOf('Consolidated Appropriations Act, 2026 - PBM Reform Provisions (H.R. 7148)', 'summary');
  expect(s).toMatch(/Section 6702 amends ERISA section 408\(b\)\(2\)/);
  expect(s).toMatch(/not exempt from ERISA's prohibited-transaction rules, unless the PBM remits 100 percent of the rebates, fees, alternative discounts and other remuneration/);
  expect(s).toMatch(/other applicable entities/);
  expect(s).toMatch(/keeps its terms until it is renewed or extended/);
  expect(s).toMatch(/Section 6701 [^.]*at least every six months/);
  expect(s).not.toMatch(/manufacturer rebates and fees/);
});

test('review of P23: template text in a column the first version did not read is reported', () => {
  const nh = 'CMS Repeal of Nursing Home Minimum Staffing Standards';
  expect(trackerTemplateFaults(withField(nh, 'model_link_note', 'TBD')).faults)
    .toEqual(['line 29 model_link_note carries template text (a to-do marker)']);
  /* every column is read, and today every field is non-empty */
  const parsed = trackerRows(committed());
  expect(trackerTemplateFaults(committed()).fields).toBe(parsed.rows.length * parsed.head.length);
});

/* The P23 carry list, done on the owner's 2026-10-10 instruction: the seven
   rows whose open-ended state claims dated from the July load are
   re-checked; the NDAA row's start date, which no check could read
   (DISCREPANCY 19), is in the enacted text and now in the row; and two rules
   issued since the load have rows of their own, each with the date on which
   the as-of-today control will make someone look again. */
test('owner\'s carry list: the open-ended rows are re-checked, and every new trigger is readable', () => {
  for (const t of ['Expiration of ACA Enhanced Premium Tax Credits', 'St. Luke\'s Health System v. Labrador',
    'Pandemic and All-Hazards Preparedness Act', 'Conrad State 30', 'Mental Health Parity and Addiction Equity Act',
    'Transparency in Coverage Final Rule (CMS-9915-F)', '340B Rebate Model Pilot Vacated']) {
    /* on or after the carry-list check (St. Luke's was re-checked again on
       2026-10-11, when the review found a later docket entry) */
    expect(fieldOf(t, 'last_verified') >= '2026-10-10', t).toBe(true);
  }
  /* the NDAA row as loaded would now be caught */
  const ndaa = 'FY2026 National Defense Authorization Act (P.L. 119-60) - Tricare Provisions';
  expect(statedEffectiveDates(fieldOf(ndaa, 'summary'))).toEqual(['2025-12-18']);
  expect(trackerDateContradictions(withFields(ndaa, { status: 'enacted', last_verified: '2026-07-14' })).faults[0])
    .toMatch(/`enacted`, but it took effect on 2025-12-18, on or before 2026-07-14/);
  /* the two new rules: issued, not yet in force, each with its effective date */
  const tic = 'Transparency in Coverage Final Rule (CMS-9882-F)';
  const rebate = '340B Rebate Model Pilot Program - Revised Notice';
  expect([fieldOf(tic, 'status'), fieldOf(tic, 'key_date'), fieldOf(tic, 'key_date_type')]).toEqual(['final', '2026-12-07', 'effective']);
  expect([fieldOf(rebate, 'status'), fieldOf(rebate, 'key_date'), fieldOf(rebate, 'key_date_type')]).toEqual(['final', '2027-01-01', 'effective']);
  /* fault lines carry a title's first 40 characters */
  /* review of the owner batch: the St. Luke's row states the September 23,
     2026 scheduling order, which it missed when first stamped */
  expect(fieldOf('St. Luke\'s Health System v. Labrador', 'summary')).toContain('a September 23, 2026 order extended fact discovery to March 22, 2027');
  /* second review: the new rule's own file dates, and what it says about the
     drug file (a plan to begin, not the end of the deferral) */
  expect(fieldOf(tic, 'summary')).toContain('Its machine-readable file changes apply beginning March 6, 2027');
  expect(fieldOf(tic, 'summary')).toContain('they plan to begin working to implement it in short order');
  expect(fieldOf('Transparency in Coverage Final Rule (CMS-9915-F)', 'summary')).toContain('remains deferred under enforcement discretion');
  expect(trackerDateContradictions(committed(), '2026-12-07').faults)
    .toEqual([expect.stringMatching(/^line \d+ \(Transparency in Coverage Final Rule \(CMS\): `final`, but it took effect on 2026-12-07/)]);
});
