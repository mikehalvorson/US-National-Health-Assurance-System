import { afterEach, expect, test } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NODE_FS_MODULES, nodeFsDrift } from '../../src/lib/manifest-check';

/* Review of P22 [§S16]: CONVENTIONS kept every check that reads the repo's
   own text in manifest-check.ts, so node:fs stayed in one build-time module.
   P22 added such checks in other modules; they moved, and the convention
   is a check now. Since the split of 2026-10-21 a check that reads files
   lives in a module declared in NODE_FS_MODULES (the *-check.ts modules and
   repo-text.ts), and this holds that list. */

test('only the declared modules import node:fs', () => {
  expect(nodeFsDrift()).toEqual([]);
  expect(Object.keys(NODE_FS_MODULES)).toContain('src/lib/manifest-check.ts');
});

const roots: string[] = [];
afterEach(() => { while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true }); });
function fixture(files: Record<string, string>): string {
  /* one root per case: sourceText memoises by root and path */
  const root = mkdtempSync(join(tmpdir(), 'nha-fs-'));
  roots.push(root);
  mkdirSync(join(root, 'src', 'lib'), { recursive: true });
  for (const [rel, body] of Object.entries(files)) writeFileSync(join(root, rel), body, 'utf8');
  return root;
}

test('a new module reading files is reported, in each import spelling', () => {
  for (const line of [
    "import { readFileSync } from 'node:fs';",
    'import * as fs from "fs";',
    "const fs = await import('node:fs');",
    "const fs = require('fs');",
    "import { readFile } from 'node:fs/promises';",
    "const fsp = await import('fs/promises');",
    "import 'node:fs';"
  ]) {
    const root = fixture({ 'src/lib/home.ts': "import { readFileSync } from 'node:fs';\n", 'src/lib/probe.ts': line + '\n' });
    expect(nodeFsDrift(root, { 'src/lib/home.ts': 'home' }), line)
      .toEqual(['src/lib/probe.ts imports node:fs; a check that reads files lives in a module declared in NODE_FS_MODULES']);
  }
});

test('a package whose name only starts with fs is not node:fs', () => {
  for (const line of ["import x from 'fs-extra';", "import 'fsevents';", "const y = require('node:fsx');"]) {
    const root = fixture({ 'src/lib/probe.ts': line + '\n' });
    expect(nodeFsDrift(root, {}), line).toEqual([]);
  }
});

test('an import named in a comment is not an import, and a stale declaration is reported', () => {
  const root = fixture({ 'src/lib/probe.ts': "// this used to import { readFileSync } from 'node:fs'\nexport const x = 1;\n" });
  expect(nodeFsDrift(root, { 'src/lib/probe.ts': 'reads nothing now' }))
    .toEqual(['src/lib/probe.ts is declared as an fs module and no longer imports it']);
});
