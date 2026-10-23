import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

/* =========================================================================
 * The visual sweep of 2026-10-22 (built site, headless Chrome, every tab in
 * light and dark at desktop and phone width) found defects no test could
 * see, because each lived in what the page draws rather than in what the
 * model computes. These hold the four that a test can read from source or
 * rendered HTML: a page set in bold by the compiler's own HTML repair, chart
 * text with no fill rule (black on the dark surface), text tokens below
 * WCAG AA, and pages with no icon.
 * ========================================================================= */

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (rel: string): string => readFileSync(join(REPO_ROOT, rel), 'utf8');
const PAGES = import.meta.glob('../../src/pages/*.astro');
const pageName = (path: string): string => path.replace(/^.*\/(\w+)\.astro$/, '$1');

async function serverHtml(path: string): Promise<string> {
  const container = await AstroContainer.create();
  const mod = (await PAGES[path]()) as { default: Parameters<typeof container.renderToString>[0] };
  return container.renderToString(mod.default);
}

const FORMATTING = new Set(['strong', 'b', 'em', 'i']);
const BLOCK = new Set(['div', 'section', 'p', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'ul', 'ol',
  'li', 'article', 'header', 'footer', 'nav', 'main', 'aside', 'figure', 'details', 'summary',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/* Where a block element opens inside a formatting element, and every empty
   <strong>, <b> or <em>: the two marks Astro's compiler leaves when its HTML
   repair re-opens a formatting element it judged still open (Workforce's pay
   table did this, and every later section on the page drew bold). Empty <i>
   is left out: the Overview's map connectors are empty <i> by design. */
function formattingFaults(html: string): string[] {
  const body = html.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
  const out: string[] = [];
  for (const m of body.matchAll(/<(strong|b|em)\b[^>]*>\s*<\/\1>/gi)) {
    out.push('empty <' + m[1] + '> at "' + body.slice(Math.max(0, m.index! - 60), m.index!).replace(/\s+/g, ' ') + '"');
  }
  const open: string[] = [];
  for (const m of body.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g)) {
    const tag = m[2].toLowerCase();
    if (FORMATTING.has(tag)) {
      if (m[1]) { const k = open.lastIndexOf(tag); if (k >= 0) open.splice(k, 1); }
      else if (!m[3]) open.push(tag);
    } else if (!m[1] && BLOCK.has(tag) && open.length) {
      out.push('<' + tag + '> inside <' + open[open.length - 1] + '> at "' +
        body.slice(Math.max(0, m.index! - 60), m.index!).replace(/\s+/g, ' ') + '"');
    }
  }
  return out;
}

test('no page sets a block inside a formatting element, or leaves an empty <strong>, <b> or <em>', async () => {
  const byPage: Record<string, string[]> = {};
  const paths = Object.keys(PAGES);
  expect(paths.length).toBeGreaterThan(0);
  for (const path of paths) {
    const faults = formattingFaults(await serverHtml(path));
    if (faults.length) byPage[pageName(path)] = faults.slice(0, 3);
  }
  expect(byPage).toEqual({});
}, 120000);

test('the formatting check catches the repair marks it is meant to catch', () => {
  expect(formattingFaults('<p><strong>a</strong> b</p>')).toEqual([]);
  expect(formattingFaults('<span class="x"><i></i></span>')).toEqual([]);
  expect(formattingFaults('</table><strong> </strong></div><strong><div>x</div></strong>').length).toBe(2);
  expect(formattingFaults('<b><section>x</section></b>').length).toBe(1);
});

/* ---- chart text ---------------------------------------------------------- */

const CHART_SOURCES = ['src/lib', 'src/scripts'].flatMap((d) =>
  readdirSync(join(REPO_ROOT, d)).filter((f) => f.endsWith('.ts')).map((f) => d + '/' + f));

/* Every SVG <text> the chart code draws, as its attribute object's source. */
function textAttributeBlocks(): { file: string; attrs: string }[] {
  const out: { file: string; attrs: string }[] = [];
  for (const file of CHART_SOURCES) {
    for (const m of read(file).matchAll(/\bel\(\s*'text'\s*,\s*\{([^}]*)\}/g)) out.push({ file: file, attrs: m[1] });
  }
  return out;
}

test('every SVG text the charts draw has a class whose rule sets its fill, or a fill of its own', () => {
  const css = read('src/styles/global.css');
  const blocks = textAttributeBlocks();
  expect(blocks.length).toBeGreaterThan(20);
  const faults: string[] = [];
  for (const b of blocks) {
    if (/\bfill\s*:/.test(b.attrs)) continue;
    const cls = /\bclass\s*:\s*'([^']+)'/.exec(b.attrs);
    if (!cls) { faults.push(b.file + ': text with neither a class nor a fill'); continue; }
    for (const c of cls[1].split(/\s+/)) {
      const rule = new RegExp('\\.' + c.replace(/[-]/g, '\\-') + '(?![\\w-])[^{}]*\\{[^}]*\\bfill\\s*:');
      if (!rule.test(css)) faults.push(b.file + ': .' + c + ' has no fill rule in global.css');
    }
  }
  expect([...new Set(faults)]).toEqual([]);
});

/* ---- text contrast ------------------------------------------------------- */

const AA_SMALL_TEXT = 4.5;
const TEXT_TOKENS = ['--text-primary', '--text-secondary', '--text-muted'];
const SURFACES = ['--surface-1', '--page'];

function tokens(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)) out[m[1]] = m[2];
  return out;
}
function luminance(hex: string): number {
  const f = (x: number): number => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2]);
}
function contrast(a: string, b: string): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('every text token reads at WCAG AA for small text on both surfaces, in each theme block', () => {
  const css = read('src/styles/global.css');
  const light = /^:root\s*\{([^}]*)\}/m.exec(css);
  const darkMedia = /:root:not\(\[data-theme="light"\]\)\s*\{([^}]*)\}/.exec(css);
  const darkAttr = /:root\[data-theme="dark"\]\s*\{([^}]*)\}/.exec(css);
  expect(light && darkMedia && darkAttr).toBeTruthy();
  const faults: string[] = [];
  for (const [name, block] of [['light', light![1]], ['dark (media)', darkMedia![1]], ['dark (attribute)', darkAttr![1]]] as const) {
    const t = tokens(block);
    for (const fg of TEXT_TOKENS) for (const bg of SURFACES) {
      expect(t[fg] && t[bg], name + ' declares ' + fg + ' and ' + bg).toBeTruthy();
      const r = contrast(t[fg], t[bg]);
      if (r < AA_SMALL_TEXT) faults.push(name + ': ' + fg + ' ' + t[fg] + ' on ' + bg + ' ' + t[bg] + ' is ' + r.toFixed(2) + ':1');
    }
  }
  expect(faults).toEqual([]);
});

/* ---- icon ---------------------------------------------------------------- */

test('every page declares an icon, and the file it names is in public/', async () => {
  const faults: string[] = [];
  for (const path of Object.keys(PAGES)) {
    const html = await serverHtml(path);
    const m = /<link\b[^>]*\brel="icon"[^>]*\bhref="([^"]+)"/.exec(html);
    if (!m) { faults.push(pageName(path) + ': no icon'); continue; }
    const file = m[1].replace(/^.*\//, '');
    if (!existsSync(join(REPO_ROOT, 'public', file))) faults.push(pageName(path) + ': icon ' + m[1] + ' is not in public/');
  }
  expect(faults).toEqual([]);
}, 120000);
