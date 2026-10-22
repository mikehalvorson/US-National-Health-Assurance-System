import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, expect, test } from 'vitest';
import { readmeDeployDrift } from '../../src/lib/manifest-check';

/* R113 [§S1] — the README told the reader to set Pages to "Deploy from a
   branch, folder /docs". Following it switches Pages off the Actions workflow
   and publishes the retired tree over the live app at the same URL. It is a
   documented instruction that breaks the site, in the one file every new
   contributor and agent reads first.

   Each case builds its own repo root, because the detector memoises per root
   and because a detector only proves anything when it is shown the defect. */

const WORKFLOW = 'name: Deploy\njobs:\n  deploy:\n    steps:\n      - uses: actions/deploy-pages@v4\n';

const roots: string[] = [];

function fixture(readme: string, workflow: string | null = WORKFLOW): string {
  const root = mkdtempSync(join(tmpdir(), 'nha-readme-'));
  roots.push(root);
  writeFileSync(join(root, 'README.md'), readme, 'utf8');
  if (workflow !== null) {
    mkdirSync(join(root, '.github', 'workflows'), { recursive: true });
    writeFileSync(join(root, '.github', 'workflows', 'deploy.yml'), workflow, 'utf8');
  }
  return root;
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

test('R113: the harmful deploy instruction is reported', () => {
  const drift = readmeDeployDrift(fixture(
    'Deploy: Settings -> Pages -> Source: "Deploy from a branch" -> folder `/docs`.\n' +
    'See .github/workflows/deploy.yml.\n'
  ));
  expect(drift.retiredPaths).toHaveLength(1);
  expect(drift.retiredPaths[0].startsWith('README.md:1:')).toBe(true);
});

test('R113: a file manifest documenting the retired tree is reported', () => {
  const drift = readmeDeployDrift(fixture(
    'Built by .github/workflows/deploy.yml.\n\n```\ndocs/js/model.js   the engine\n```\n'
  ));
  expect(drift.retiredPaths).toHaveLength(1);
  expect(drift.retiredPaths[0]).toContain('docs/js/model.js');
});

test('R113: warning the reader off the retired directory is allowed', () => {
  /* The distinction the check draws: naming a path INTO the retired tree is the
     defect; naming the bare directory to warn about it is this file's job. */
  const drift = readmeDeployDrift(fixture(
    'The `docs/` directory is a retired predecessor, kept for provenance only.\n' +
    'Pages is served by .github/workflows/deploy.yml.\n'
  ));
  expect(drift.retiredPaths).toEqual([]);
  expect(drift.missingWorkflowReference).toBe(false);
});

test('R113: a README that never names the deploying workflow is reported', () => {
  const drift = readmeDeployDrift(fixture('This project builds a dashboard.\n'));
  expect(drift.missingWorkflowReference).toBe(true);
});

test('R113: the workflow reference is only demanded when Actions deploys', () => {
  /* If Pages ever legitimately moves off Actions this half goes quiet, rather
     than forcing the README to describe something that no longer runs. */
  const drift = readmeDeployDrift(fixture('This project builds a dashboard.\n', null));
  expect(drift.missingWorkflowReference).toBe(false);
});

test('R113: the committed README passes both halves', () => {
  const drift = readmeDeployDrift();
  expect(drift.retiredPaths).toEqual([]);
  expect(drift.missingWorkflowReference).toBe(false);
});
