/* Site-wide acronym hovers. Wraps every acronym from src/lib/acronyms.ts in an
   <abbr> whose title states what it stands for, so inline prose and source
   copy on every tab get the same hover. Runs on astro:page-load (covers static
   content and View Transitions) and watches <main> so client-rendered content
   (param tables, source lines, entity detail panels) is decorated too.

   Individual tabs keep their own decorators for their detail panels; this pass
   is idempotent (it never re-wraps text already inside an <abbr>), so running
   both is safe. */

import { ACRONYMS, acronymPattern } from '../lib/acronyms';

const PATTERN = acronymPattern();
// Skip inputs/controls, existing abbrs, and SVG (an HTML <abbr> nested in an
// <svg> is invalid and would hide chart labels).
const SKIP = 'abbr, script, style, option, select, textarea, svg, [data-no-acronyms]';

function decorate(root: ParentNode | null): void {
  if (!root) return;
  const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP)) continue;
    PATTERN.lastIndex = 0;
    if (PATTERN.test(node.nodeValue || '')) targets.push(node);
  }
  targets.forEach((node) => {
    const text = node.nodeValue || '';
    const fragment = document.createDocumentFragment();
    let last = 0;
    PATTERN.lastIndex = 0;
    text.replace(PATTERN, (match: string, acronym: string, offset: number) => {
      if (offset > last) fragment.appendChild(document.createTextNode(text.slice(last, offset)));
      const abbr = document.createElement('abbr');
      abbr.className = 'acronym';
      abbr.title = ACRONYMS[acronym];
      abbr.setAttribute('aria-label', acronym + ': ' + ACRONYMS[acronym]);
      abbr.textContent = acronym;
      fragment.appendChild(abbr);
      last = offset + match.length;
      return match;
    });
    if (last < text.length) fragment.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode!.replaceChild(fragment, node);
  });
}

let observer: MutationObserver | null = null;
let scheduled = false;
let running = false;

function sweep(): void {
  const root = document.querySelector('main');
  if (!root || running) return;
  running = true;
  // Disconnect while we mutate so our own <abbr> insertions do not re-trigger
  // the observer; reconnect to the current <main> afterwards.
  if (observer) observer.disconnect();
  decorate(root);
  if (observer) observer.observe(root, { childList: true, subtree: true });
  running = false;
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  // Let a tab's own synchronous render + decorator finish first, then sweep up
  // anything it did not cover.
  setTimeout(() => {
    scheduled = false;
    sweep();
  }, 200);
}

function start(): void {
  if (!observer) observer = new MutationObserver(schedule);
  sweep();
}

document.addEventListener('astro:page-load', start);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
