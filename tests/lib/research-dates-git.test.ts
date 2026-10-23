import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, expect, test } from 'vitest';
import { RESEARCH_DATE_EXEMPT } from '../../src/lib/manifest-check';

/* =========================================================================
 * Review of P23 (R216 [§S17], §BK4): the build checks that every research
 * methodology carries "Compiled ... Last revised ..." in a valid order, and
 * nothing tied "Last revised" to the document's real last revision, so the
 * next edit would leave the stamp stale and every check green. The reason
 * §BK4 asked for the date at all is to let a reader tell whether a document
 * predates a change in the law.
 *
 * This reads git: the newest commit that changed a document's content, other
 * than its stamp line and blank lines, must be no later than the stamp. An
 * uncommitted content change counts as today. It lives in vitest, not the
 * build, because CI checks out one commit and has no history to read; it
 * fails `pnpm test`, never a deploy.
 * ========================================================================= */

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const STAMP = /^Compiled (\d{4}-\d{2}-\d{2})\. Last revised (\d{4}-\d{2}-\d{2})\.$/m;
const gitIn = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd: cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const git = (...args: string[]): string => gitIn(REPO_ROOT, ...args);

/* Changed lines of a diff, less the stamp and blank lines. Only lines inside
 * a hunk count: a file's "--- a/x" and "+++ b/x" headers come before its
 * first "@@", so a changed line whose own text opens with "--" or "++" is
 * read as content. (Review 2 of P23: the first version skipped any changed
 * line opening "-- ", "++ ", "+- " or "-+ ", wherever it stood.) A merge's
 * combined diff has one marker column per parent and "@@@" hunks; the marker
 * width is the hunk header's run of "@" less one. */
function substantive(diff: string): boolean {
  let width = 0;
  for (const l of diff.split('\n')) {
    if (l.startsWith('diff ')) { width = 0; continue; }
    const hunk = /^(@{2,}) /.exec(l);
    if (hunk) { width = hunk[1].length - 1; continue; }
    if (!width || !/[+-]/.test(l.slice(0, width))) continue;
    const body = l.slice(width);
    if (body.trim() !== '' && !STAMP.test(body)) return true;
  }
  return false;
}

/* the local date, the calendar the stamps are written in (review 2 of P23:
   this was the UTC date, a day ahead in the evening here) */
function localToday(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/* Squash-merges into main. The owner's decision of 2026-10-21 lands a
 * working branch as one commit, so the branch's history (which held the
 * remediation log) is not published; a squash dates every change it carries
 * to its own day, so a document last changed inside one reads as revised that
 * day. Each entry is a squash commit and what it squashed; the strict check
 * ran on that branch's own history before the squash. A new squash adds its
 * line here. */
const SQUASHES: Record<string, string> = {
  '2c4a5802a6835126d12ec1c698b2fa859281148b': 'nha-remediation at eb0d284'
};

interface Revision { date: string; sha: string | null }

function lastContentCommit(rel: string, cwd = REPO_ROOT): Revision | null {
  if (substantive(gitIn(cwd, 'diff', '--unified=0', 'HEAD', '--', rel))) return { date: localToday(), sha: null };
  /* --follow reads through a rename, which would otherwise show the renamed
     file's first commit as a rewrite of every line; --cc shows what a merge
     itself changed (a conflict resolution), which plain -p leaves out */
  const log = gitIn(cwd, 'log', '--follow', '--cc', '--format=%x00%H %as', '--unified=0', '-p', '--', rel);
  for (const block of log.split('\u0000').slice(1)) {
    const sha = block.slice(0, 40);
    const date = block.slice(41, 51);
    if (substantive(block.slice(51))) return { date: date, sha: sha };
  }
  return null;
}

function lastContentRevision(rel: string, cwd = REPO_ROOT): string | null {
  const r = lastContentCommit(rel, cwd);
  return r ? r.date : null;
}

/* A stamp holds when it is no earlier than the last content change; when that
   change came in a squash, when it falls inside the squash's window instead:
   later than the squash's parent and no later than the squash. */
function stampHolds(stamp: string, changed: string, squashParent: string | null): boolean {
  return squashParent === null ? changed <= stamp : squashParent < stamp && stamp <= changed;
}

test('review of P23: each research methodology\'s "Last revised" is no earlier than its last content change', () => {
  const docs = git('ls-files', 'research/*.md').trim().split('\n').filter((f) => !(f in RESEARCH_DATE_EXEMPT));
  const checked: string[] = [];
  const stale: string[] = [];
  for (const rel of docs) {
    const m = STAMP.exec(readFileSync(join(REPO_ROOT, rel), 'utf8'));
    if (!m) continue; /* the build check reports a missing stamp */
    const changed = lastContentCommit(rel);
    expect(changed).not.toBeNull();
    checked.push(rel);
    const squash = changed!.sha !== null && changed!.sha in SQUASHES;
    const parent = squash ? git('log', '-1', '--format=%as', changed!.sha + '^').trim() : null;
    if (!stampHolds(m[2], changed!.date, parent)) {
      stale.push(rel + ': last revised ' + m[2] + ', content changed ' + changed!.date +
        (squash ? ' (in the squash of ' + SQUASHES[changed!.sha!] + ', after ' + parent + ')' : ''));
    }
  }
  expect(stale).toEqual([]);
  expect(checked.length).toBeGreaterThanOrEqual(16);
});

test('a stamp inside a squash\'s window holds, and one outside it or behind a later edit does not', () => {
  expect(stampHolds('2026-10-21', '2026-10-22', '2026-08-12')).toBe(true);
  expect(stampHolds('2026-08-12', '2026-10-22', '2026-08-12')).toBe(false);
  expect(stampHolds('2026-08-01', '2026-10-22', '2026-08-12')).toBe(false);
  expect(stampHolds('2026-10-23', '2026-10-22', '2026-08-12')).toBe(false);
  expect(stampHolds('2026-10-21', '2026-10-22', null)).toBe(false);
  expect(stampHolds('2026-10-22', '2026-10-22', null)).toBe(true);
});

test('review of P23: a stamp line or a blank line alone is not a content change', () => {
  expect(substantive('@@ -0,0 +1,3 @@\n+Compiled 2026-07-15. Last revised 2026-08-31.\n+\n-')).toBe(false);
  expect(substantive('diff --git a/x.md b/x.md\n--- a/x.md\n+++ b/x.md\n@@ -3 +3 @@\n+Compiled 2026-07-15. Last revised 2026-08-31.')).toBe(false);
  expect(substantive('@@ -1 +1 @@\n+A new sentence.')).toBe(true);
  expect(substantive('@@ -1 +0,0 @@\n-An old sentence.')).toBe(true);
});

test('review 2 of P23: a changed line opening with dashes or pluses is content, and headers are not', () => {
  const head = 'diff --git a/x.md b/x.md\nindex 1..2 100644\n--- a/x.md\n+++ b/x.md\n';
  expect(substantive(head)).toBe(false);
  expect(substantive(head + '@@ -4 +4 @@\n--- a removed list item')).toBe(true);
  expect(substantive(head + '@@ -4 +4 @@\n++ an added line')).toBe(true);
  expect(substantive(head + '@@ -4 +4 @@\n+- an added list item')).toBe(true);
  /* a line before any hunk is never content, whatever it opens with */
  expect(substantive('+++ b/x.md\n--- a/x.md\n+Text')).toBe(false);
});

test('review 2 of P23: a second file\'s headers are not read as the first file\'s content', () => {
  const stampOnly = (f: string): string => 'diff --git a/' + f + ' b/' + f + '\n--- a/' + f + '\n+++ b/' + f +
    '\n@@ -3 +3 @@\n+Compiled 2026-07-15. Last revised 2026-08-31.\n';
  expect(substantive(stampOnly('x.md') + stampOnly('y.md'))).toBe(false);
});

/* A throwaway repository with dated commits: a rename, and a merge whose
   resolution wrote a line neither parent had. */
const scratch: string[] = [];
afterAll(() => { for (const d of scratch) rmSync(d, { recursive: true, force: true }); });

function dated(cwd: string, day: string, ...args: string[]): void {
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid', ...args], {
    cwd: cwd, stdio: 'ignore',
    env: { ...process.env, GIT_AUTHOR_DATE: day + 'T12:00:00', GIT_COMMITTER_DATE: day + 'T12:00:00' }
  });
}

function fixture(): string {
  const d = mkdtempSync(join(tmpdir(), 'nha-dates-'));
  scratch.push(d);
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: d, stdio: 'ignore' });
  writeFileSync(join(d, 'a.md'), 'Compiled 2026-01-01. Last revised 2026-01-01.\n\nOne.\nTwo.\n');
  dated(d, '2026-01-01', 'add', 'a.md');
  dated(d, '2026-01-01', 'commit', '-q', '-m', 'first');
  return d;
}

test('review 2 of P23: a rename is read through, not as a rewrite on the day of the move', () => {
  const d = fixture();
  dated(d, '2026-02-01', 'mv', 'a.md', 'b.md');
  dated(d, '2026-02-01', 'commit', '-q', '-m', 'move');
  expect(lastContentRevision('b.md', d)).toBe('2026-01-01');
});

test('review 2 of P23: what a merge\'s conflict resolution wrote counts, on the merge\'s date', () => {
  const d = fixture();
  dated(d, '2026-02-01', 'checkout', '-q', '-b', 'side');
  writeFileSync(join(d, 'a.md'), 'Compiled 2026-01-01. Last revised 2026-01-01.\n\nOne, side.\nTwo.\n');
  dated(d, '2026-02-01', 'commit', '-q', '-am', 'side');
  dated(d, '2026-02-02', 'checkout', '-q', 'main');
  writeFileSync(join(d, 'a.md'), 'Compiled 2026-01-01. Last revised 2026-01-01.\n\nOne, main.\nTwo.\n');
  dated(d, '2026-02-02', 'commit', '-q', '-am', 'main');
  try { dated(d, '2026-03-01', 'merge', '-q', 'side'); } catch { /* the conflict is the point */ }
  writeFileSync(join(d, 'a.md'), 'Compiled 2026-01-01. Last revised 2026-01-01.\n\nOne, resolved.\nTwo.\n');
  dated(d, '2026-03-01', 'commit', '-q', '-am', 'merge');
  expect(lastContentRevision('a.md', d)).toBe('2026-03-01');
});

test('review 2 of P23: a merge\'s combined diff is read by its own marker columns', () => {
  const cc = 'diff --cc x.md\nindex 1,2..3\n--- a/x.md\n+++ b/x.md\n@@@ -4,1 -4,1 +4,1 @@@\n';
  expect(substantive(cc + '++A line the resolution wrote')).toBe(true);
  expect(substantive(cc + ' -A line one parent had')).toBe(true);
  expect(substantive(cc + ' +Compiled 2026-07-15. Last revised 2026-08-31.')).toBe(false);
  expect(substantive(cc + '  unchanged context')).toBe(false);
});
