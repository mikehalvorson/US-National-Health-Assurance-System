import { expect, test } from 'vitest';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ariaAsStateFaults, orphanAriaLabelFaults, roleImgFocusFaults
} from '../../src/lib/manifest-check';

/* =========================================================================
 * The three P20 accessibility gates, each driven under a mutated copy of src/.
 *
 * Review 8 rewrote the self-test group's comment to say the vitest suite drives
 * "all four" gates this way. It drove one. Review 9 found the sentence, which
 * was the third comment in one section describing a guard that was not there,
 * and these tests are what make it true.
 *
 * Every mutation throws if its anchor is missing. A mutation that silently
 * fails to apply turns "the gate reports nothing" into a pass, which is the
 * failure these tests exist to rule out.
 * ========================================================================= */

const SRC = fileURLToPath(new URL('../../src', import.meta.url));

interface Edit { file: string; from: string; to: string }

function mutated<T>(edits: Edit[], run: (root: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), 'p20-gates-'));
  try {
    cpSync(SRC, join(root, 'src'), { recursive: true });
    for (const e of edits) {
      const path = join(root, e.file);
      if (e.from === '') {
        if (existsSync(path)) throw new Error('refusing to overwrite ' + e.file);
        writeFileSync(path, e.to);
        continue;
      }
      const text = readFileSync(path, 'utf8');
      const hits = text.split(e.from).length - 1;
      if (hits !== 1) {
        throw new Error('anchor found ' + hits + ' times in ' + e.file + ': ' + e.from.slice(0, 60));
      }
      writeFileSync(path, text.replace(e.from, e.to));
    }
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('all three gates are clean on the tree as it stands', () => {
  expect(orphanAriaLabelFaults()).toEqual([]);
  expect(roleImgFocusFaults()).toEqual([]);
  expect(ariaAsStateFaults()).toEqual([]);
});

/* ---- R245: a name on an element with no role ----------------------------- */

test('R245 gate: a labelled div in page markup with its role removed', () => {
  const faults = mutated([{
    file: 'src/pages/risk.astro',
    from: '<div class="fmea-controls" role="group" aria-label="Failure mode filters">',
    to: '<div class="fmea-controls" aria-label="Failure mode filters">'
  }], orphanAriaLabelFaults);
  expect(faults).toEqual(['src/pages/risk.astro labels a <div> that has no role']);
});

test('R245 gate: a labelled SVG path built by a client script with its role removed', () => {
  /* the fifty-one region paths - the half of the population review 8 found
     the first version of this rule could not see */
  const faults = mutated([{
    file: 'src/scripts/units-client.ts',
    from: "      tabindex: '0',\n      role: 'button',",
    to: "      tabindex: '0',"
  }], orphanAriaLabelFaults);
  expect(faults).toEqual(['src/scripts/units-client.ts labels an element it builds without giving it a role']);
});

test('R245 gate: a div labelled through setAttribute with its role removed', () => {
  const faults = mutated([{
    file: 'src/scripts/units-client.ts',
    from: "    cell.setAttribute('role', 'group');",
    to: ''
  }], orphanAriaLabelFaults);
  expect(faults).toEqual(['src/scripts/units-client.ts labels an element it builds without giving it a role']);
});

test('R245 gate: a labelled native element is not a fault', () => {
  /* the eleven false positives the first widened version reported */
  const faults = mutated([{
    file: 'src/scripts/units-client.ts',
    from: "    cell.setAttribute('role', 'group');",
    to: "    cell.setAttribute('role', 'group');\n"
      + "    const extra = document.createElement('button');\n"
      + "    extra.setAttribute('aria-label', 'a button reads its own label');"
  }], orphanAriaLabelFaults);
  expect(faults).toEqual([]);
});

/* ---- R166: a tab stop inside an image ----------------------------------- */

test('R166 gate: a tab stop added inside a chart that keeps the image role', () => {
  const faults = mutated([{
    file: 'src/lib/path-chart.ts',
    from: "  /* gridlines + y ticks */",
    to: "  el('g', { class: 'probe', tabindex: 0 }, svg);\n  /* gridlines + y ticks */"
  }], roleImgFocusFaults);
  expect(faults).toEqual(['src/lib/path-chart.ts renderPathChart puts a tab stop inside a role="img" subtree']);
});

test('R166 gate: a negative tab index inside an image is not a fault', () => {
  /* how the county map marks its dots unreachable, which is correct */
  const faults = mutated([{
    file: 'src/lib/path-chart.ts',
    from: "  /* gridlines + y ticks */",
    to: "  el('g', { class: 'probe', tabindex: -1 }, svg);\n  /* gridlines + y ticks */"
  }], roleImgFocusFaults);
  expect(faults).toEqual([]);
});

test('R166 gate: both needles in a file with no function boundary', () => {
  /* the assertion the gate's doc comment promised and review 8 wrote */
  const faults = mutated([{
    file: 'src/lib/zz-probe-unscoped.ts',
    from: '',
    to: "const a = { role: 'img' };\nconst b = { tabindex: 0 };\nexport { a, b };\n"
  }], roleImgFocusFaults);
  expect(faults).toHaveLength(1);
  expect(faults[0]).toContain('src/lib/zz-probe-unscoped.ts carries the image role and a tab stop');
});

test('R166 gate: the image role alone in an undivided file is not a fault', () => {
  const faults = mutated([{
    file: 'src/lib/zz-probe-unscoped.ts',
    from: '',
    to: "const a = { role: 'img' };\nexport { a };\n"
  }], roleImgFocusFaults);
  expect(faults).toEqual([]);
});

/* ---- R259: aria read back as state --------------------------------------- */

const ROLLOUT = 'src/scripts/rollout-client.ts';
const ROLLOUT_ANCHOR = 'btn.dataset.phaseId = phase.id;';

function withLine(line: string): string[] {
  return mutated([{ file: ROLLOUT, from: ROLLOUT_ANCHOR, to: ROLLOUT_ANCHOR + '\n    ' + line }],
    ariaAsStateFaults);
}

test('R259 gate: every spelling of an aria read is caught', () => {
  expect(withLine("void btn.getAttribute('aria-pressed');"))
    .toEqual([ROLLOUT + ' reads an aria attribute as state (getAttribute)']);
  expect(withLine("void btn.hasAttribute('aria-current');"))
    .toEqual([ROLLOUT + ' reads an aria attribute as state (hasAttribute)']);
  expect(withLine("void document.querySelector('[aria-pressed=\"true\"]');"))
    .toEqual([ROLLOUT + ' reads an aria attribute as state (selector)']);
  expect(withLine("void btn.closest('[aria-selected]');"))
    .toEqual([ROLLOUT + ' reads an aria attribute as state (selector)']);
  expect(withLine("if (btn.ariaPressed === 'true') { void 0; }"))
    .toEqual([ROLLOUT + ' reads an aria attribute as state (reflection)']);
});

test('R259 gate: writing aria state, or mentioning it in a comment, is not a read', () => {
  expect(withLine("btn.ariaPressed = 'true';")).toEqual([]);
  expect(withLine("btn.setAttribute('aria-pressed', 'true');")).toEqual([]);
  expect(withLine("/* never btn.getAttribute('aria-pressed') */")).toEqual([]);
});
