import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';
import {
  declaredDispositions,
  legislationStyleDrift,
  styledDispositions,
  STYLED_BY_BASE_RULE
} from '../../src/lib/style-check';

/* R103 [§S1] — legislation-client.ts builds each badge's class by lowercasing
   the action string, so a typo in the data or the stylesheet produces a class
   nothing styles. The audit could not settle this because its fetch of the
   retired stylesheet truncated mid-selector; retargeted to
   src/styles/global.css and read locally. */

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const STYLESHEET = join('src', 'styles', 'global.css');
const roots: string[] = [];

function fixture(css: string): string {
  const root = mkdtempSync(join(tmpdir(), 'nha-style-'));
  roots.push(root);
  mkdirSync(join(root, 'src', 'styles'), { recursive: true });
  writeFileSync(join(root, STYLESHEET), css, 'utf8');
  return root;
}

function committedCss(): string {
  return readFileSync(join(REPO_ROOT, STYLESHEET), 'utf8');
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

test('R103: the committed stylesheet covers every declared disposition', () => {
  const drift = legislationStyleDrift();
  expect(drift.unstyled).toEqual([]);
  expect(drift.deadRules).toEqual([]);
  expect(drift.exemptionsChanged).toEqual([]);
  expect(drift.baseRuleMissing).toBe(false);
});

test('R103: the measured shape is seven dispositions, five with their own rule', () => {
  /* Recorded because the audit expected seven rules and there are five; the
     other two are painted by the shared rule, so the badge is not invisible. */
  expect(declaredDispositions()).toEqual([
    'amend', 'fallback', 'parallel', 'preempt', 'preserve', 'sunset', 'transfer'
  ]);
  expect(styledDispositions()).toEqual([
    'fallback', 'parallel', 'preempt', 'sunset', 'transfer'
  ]);
  expect(STYLED_BY_BASE_RULE).toEqual(['amend', 'preserve']);
});

test('R103: a typo in a rule name is reported from both sides', () => {
  const drift = legislationStyleDrift(fixture(
    committedCss().replace('.legislation-action-sunset ', '.legislation-action-sunsett ')
  ));
  expect(drift.unstyled).toEqual(['sunset']);
  expect(drift.deadRules).toEqual(['sunsett']);
});

test('R103: losing the shared rule is reported, because the pin depends on it', () => {
  /* amend and preserve are exempt only because .legislation-action paints
     them. Without it they are genuinely unstyled, which is the outcome the
     row was written to rule out. */
  const drift = legislationStyleDrift(fixture(
    committedCss().replace('.legislation-action {', '.legislation-action-renamed {')
  ));
  expect(drift.baseRuleMissing).toBe(true);
});

test('R103: an eighth disposition cannot join the exempt set unnoticed', () => {
  const drift = legislationStyleDrift(fixture(
    committedCss().replace('.legislation-action-fallback ', '.legislation-action-unused ')
  ));
  expect(drift.exemptionsChanged).toContain('fallback');
});
