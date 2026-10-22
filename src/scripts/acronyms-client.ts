/* Site-wide acronym hovers. Wraps every acronym from src/lib/acronyms.ts in an
   <abbr> whose title states what it stands for, so inline prose and source
   copy on every tab get the same hover. Runs on astro:page-load (covers static
   content and View Transitions) and watches <main> so client-rendered content
   (param tables, source lines, entity detail panels) is decorated too.

   This is the only decorator (P19 removed the per-tab ones, and
   acronymLayerFaults() refuses a second). It still walks the same subtree
   more than once: every mutation inside <main> schedules a sweep of all of
   <main>, including what the last sweep wrapped. What keeps that from
   nesting an <abbr> inside an <abbr> is the SKIP selector below, which is
   load-bearing. R102 [§S17]: tests/lib/acronym-decorate.test.ts decorates
   one subtree twice and requires no nesting, so removing `abbr` from SKIP
   fails a test rather than a page. */

import { ACRONYMS, acronymPattern } from '../lib/acronyms';
import { coalesce, ACRONYM_SWEEP_DELAY_MS } from '../lib/timing';

const PATTERN = acronymPattern();
// Skip inputs/controls, existing abbrs, and SVG (an HTML <abbr> nested in an
// <svg> is invalid and would hide chart labels).
const SKIP = 'abbr, script, style, option, select, textarea, svg, [data-no-acronyms]';

/* The owner, 2026-10-11: every acronym a reader sees has a hover. An SVG
   label and a select option cannot hold an <abbr>, so the label gets an SVG
   <title> child (the browser's own hover) and the option a title attribute,
   each listing what its acronyms stand for. A label inside an element marked
   data-own-tooltip is left alone: that element's tooltip already names it
   (the Governance org boxes show each entity's full name), and a second,
   native tooltip would sit on top of the first. */
const SVG_NS = 'http://www.w3.org/2000/svg';
const OWN_HOVER = '[data-no-acronyms], [data-own-tooltip]';

/* outside <main>, the site header's and footer's own text: static, so
   decorated once per page (the header's calibration line names CMS and CBO) */
export const SITE_CHROME = 'header.site, footer.site';

function expansions(text: string): string {
  const keys: string[] = [];
  /* matchAll starts where the shared pattern's last test() stopped */
  PATTERN.lastIndex = 0;
  for (const m of text.matchAll(PATTERN)) if (keys.indexOf(m[1]) < 0) keys.push(m[1]);
  return keys.map((k) => k + ': ' + ACRONYMS[k]).join('; ');
}

function hasHover(label: Element): boolean {
  if (label.tagName.toLowerCase() === 'option') return label.hasAttribute('title');
  return Array.prototype.some.call(label.childNodes, (c: Node) =>
    (c as Element).tagName !== undefined && (c as Element).tagName.toLowerCase() === 'title');
}

function addHover(label: Element): void {
  const text = expansions(label.textContent || '');
  if (!text) return;
  if (label.tagName.toLowerCase() === 'option') { label.setAttribute('title', text); return; }
  const title = document.createElementNS(SVG_NS, 'title');
  title.setAttribute('class', 'acronym-title');
  title.textContent = text;
  label.insertBefore(title, label.firstChild);
}

export function decorate(root: ParentNode | null): void {
  if (!root) return;
  const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  const labels: Element[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent) continue;
    const inSvg = parent.closest('svg');
    if (inSvg || parent.closest('option')) {
      if (parent.closest(OWN_HOVER)) continue;
      PATTERN.lastIndex = 0;
      if (!PATTERN.test(node.nodeValue || '')) continue;
      const label = inSvg ? parent.closest('text') : parent.closest('option');
      if (label && labels.indexOf(label) < 0 && !hasHover(label)) labels.push(label);
      continue;
    }
    if (parent.closest(SKIP)) continue;
    PATTERN.lastIndex = 0;
    if (PATTERN.test(node.nodeValue || '')) targets.push(node);
  }
  labels.forEach(addHover);
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

// Let a tab's own synchronous render + decorator finish first, then sweep up
// anything it did not cover. The coalescer lives in lib/timing.ts so the
// Quality search's debounce can be tested against the real thing.
const schedule = coalesce(sweep, ACRONYM_SWEEP_DELAY_MS);

/* what each page arrival runs; exported so the page sweep
   (tests/lib/rendered-codes.test.ts) runs this path rather than its own */
export function decoratePage(): void {
  if (!observer) observer = new MutationObserver(schedule);
  document.querySelectorAll(SITE_CHROME).forEach((el) => decorate(el));
  sweep();
}

document.addEventListener('astro:page-load', decoratePage);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', decoratePage);
} else {
  decoratePage();
}
