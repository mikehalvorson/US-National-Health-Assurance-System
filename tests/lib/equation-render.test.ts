import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { linearizeExpr, renderEquation, renderExpr } from '../../src/lib/equation-render';
import type { TokenResolver } from '../../src/lib/equation-render';
import { EQUATIONS } from '../../src/lib/equations';
import type { ExprNode } from '../../src/lib/equations';

/* =========================================================================
 * R243 [S14] declares three tests. All three are here, because P19 closed a
 * row on its headline instruction while two of its declared tests went
 * unimplemented, and this row is the one with three.
 *
 *   1. every operator in the rendered tree has a non-CSS representation
 *   2. .eq-frac resolves to a rule in the shipped stylesheet
 *   3. a linear text rendering of each equation round-trips to the same AST
 * ========================================================================= */

/* ---- a parser for the linear form, so test 3 can be an actual round trip --
 *
 * The parser is test-only on purpose: production needs to WRITE the linear
 * form, not read it. What the round trip proves is that the writing preserves
 * structure and precedence - which is exactly the property an aria-label
 * carrying a linear rendering has to have, because a reader who is given
 * `a / b * c` when the tree means `a / (b * c)` has been told a different
 * equation with no way to notice.
 *
 * Leaves are carried by reference through a side table rather than being
 * serialised. That is a deliberate limit and it is worth stating plainly:
 * this test proves the OPERATOR structure round-trips. It does not prove
 * anything about leaf rendering, which test 1 covers separately.
 */
interface Parser { src: string; i: number; leaves: ExprNode[] }

function skipSpace(p: Parser): void {
  while (p.i < p.src.length && p.src[p.i] === ' ') p.i++;
}

function eat(p: Parser, text: string): boolean {
  skipSpace(p);
  if (p.src.startsWith(text, p.i)) { p.i += text.length; return true; }
  return false;
}

function expect_(p: Parser, text: string): void {
  if (!eat(p, text)) {
    throw new Error('expected ' + JSON.stringify(text) + ' at ' + p.i + ' in ' + p.src);
  }
}

const BINARY: Record<string, { k: 'add' | 'sub' | 'mul' | 'div' | 'pow'; prec: number }> = {
  '+': { k: 'add', prec: 1 },
  '-': { k: 'sub', prec: 1 },
  '*': { k: 'mul', prec: 2 },
  '/': { k: 'div', prec: 2 },
  '^': { k: 'pow', prec: 3 }
};

function parseAtom(p: Parser): ExprNode {
  skipSpace(p);
  if (eat(p, '(')) {
    const inner = parseExpr(p, 1);
    expect_(p, ')');
    return inner;
  }
  for (const fn of ['min', 'max'] as const) {
    if (p.src.startsWith(fn + '(', p.i)) {
      p.i += fn.length;
      expect_(p, '(');
      const args: ExprNode[] = [parseExpr(p, 1)];
      while (eat(p, ',')) args.push(parseExpr(p, 1));
      expect_(p, ')');
      return { k: fn, args };
    }
  }
  for (const fn of ['base8', 'basep'] as const) {
    if (p.src.startsWith(fn + '(', p.i)) {
      p.i += fn.length;
      expect_(p, '(');
      const of = parseExpr(p, 1);
      expect_(p, ')');
      return { k: fn, of };
    }
  }
  /* a leaf token: L<index> into the side table */
  const m = /^L(\d+)/.exec(p.src.slice(p.i));
  if (!m) throw new Error('no atom at ' + p.i + ' in ' + p.src);
  p.i += m[0].length;
  return p.leaves[Number(m[1])];
}

function parseExpr(p: Parser, minPrec: number): ExprNode {
  let left = parseAtom(p);
  for (;;) {
    skipSpace(p);
    const ch = p.src[p.i];
    const op = ch ? BINARY[ch] : undefined;
    if (!op || op.prec < minPrec) return left;
    p.i += 1;
    /* `^` is right-associative, everything else left-associative */
    const right = parseExpr(p, op.k === 'pow' ? op.prec : op.prec + 1);
    left = { k: op.k, a: left, b: right };
  }
}

/* The page speaks the linear form in words (review 9: brackets and `^` are not
   voiced at a screen reader's default punctuation setting). The parser reads
   symbols, so the words are mapped back first - function prefixes before the
   bare bracket they end in. */
const SPOKEN_TO_SYMBOL: [string, string][] = [
  ['the minimum of open bracket, ', 'min('],
  ['the maximum of open bracket, ', 'max('],
  ['the base case at maturity of open bracket, ', 'base8('],
  ['the base case at this phase of open bracket, ', 'basep('],
  ['open bracket, ', '('],
  [', close bracket', ')'],
  [' plus ', ' + '],
  [' minus ', ' - '],
  [' times ', ' * '],
  [' divided by ', ' / '],
  [' to the power of ', ' ^ ']
];

function decodeSpoken(text: string): string {
  return SPOKEN_TO_SYMBOL.reduce((t, [word, symbol]) => t.split(word).join(symbol), text);
}

function roundTrip(node: ExprNode): ExprNode {
  const leaves: ExprNode[] = [];
  const text = decodeSpoken(linearizeExpr(node, (leaf) => 'L' + (leaves.push(leaf) - 1)));
  const p: Parser = { src: text, i: 0, leaves };
  const parsed = parseExpr(p, 1);
  skipSpace(p);
  if (p.i !== text.length) throw new Error('trailing input at ' + p.i + ' in ' + text);
  return parsed;
}

/* ---- test 3 ------------------------------------------------------------- */

test('every equation round-trips from its linear rendering to the same AST', () => {
  const ids = Object.keys(EQUATIONS);
  expect(ids.length).toBeGreaterThan(0);
  for (const id of ids) {
    expect(roundTrip(EQUATIONS[id].expr), id).toEqual(EQUATIONS[id].expr);
  }
});

test('the round trip can fail: a rendering that drops parentheses is caught', () => {
  /* a / (b * c) and a / b * c are different trees and the same characters
     without the parentheses. If linearizeExpr ever stopped emitting them,
     the test above would go green while announcing the wrong equation, so
     the guard is checked here rather than assumed. */
  const a: ExprNode = { k: 'num', v: 1, label: 'a' };
  const b: ExprNode = { k: 'num', v: 2, label: 'b' };
  const c: ExprNode = { k: 'num', v: 3, label: 'c' };
  const tree: ExprNode = { k: 'div', a, b: { k: 'mul', a: b, b: c } };
  const leaves: ExprNode[] = [];
  const text = decodeSpoken(linearizeExpr(tree, (leaf) => 'L' + (leaves.push(leaf) - 1)));
  expect(text).toBe('L0 / (L1 * L2)');
  const flattened = text.replace('(', '').replace(')', '');
  const reparsed = parseExpr({ src: flattened, i: 0, leaves }, 1);
  expect(reparsed).not.toEqual(tree);
});

test('left and right nesting of the same operator stay distinguishable', () => {
  const a: ExprNode = { k: 'num', v: 1, label: 'a' };
  const b: ExprNode = { k: 'num', v: 2, label: 'b' };
  const c: ExprNode = { k: 'num', v: 3, label: 'c' };
  const leftNested: ExprNode = { k: 'add', a: { k: 'add', a, b }, b: c };
  const rightNested: ExprNode = { k: 'add', a, b: { k: 'add', a: b, b: c } };
  expect(roundTrip(leftNested)).toEqual(leftNested);
  expect(roundTrip(rightNested)).toEqual(rightNested);
  const leaves1: ExprNode[] = [];
  const leaves2: ExprNode[] = [];
  expect(linearizeExpr(leftNested, (l) => 'L' + (leaves1.push(l) - 1)))
    .not.toBe(linearizeExpr(rightNested, (l) => 'L' + (leaves2.push(l) - 1)));
});

/* ---- test 1 ------------------------------------------------------------- */

/* Review 9 of P20 replaced this test. The version it replaced read the SOURCE
   of equation-render.ts for three strings - the slash marker, `role="math"`
   and a call spelling - so it rendered nothing, checked no operator but
   division, and failed on a harmless refactor while passing the real defect:
   the slash marker carried no brackets, and 66 of the model's 168 divisions
   have a compound operand, so `(a + b) / c` read as `a + b / c`. The test
   below renders every formula and asks the question the row asks. */

/* A minimal document, enough for renderExpr: elements with a class, their own
   text, children in order, attributes and a dataset. `textContent` reads the
   way the real one does - own text first, then each child's. */
class StubNode {
  className = '';
  title = '';
  own = '';
  children: StubNode[] = [];
  dataset: Record<string, string> = {};
  attributes: Record<string, string> = {};
  constructor(public tagName: string) {}
  appendChild(child: StubNode): StubNode { this.children.push(child); return child; }
  setAttribute(name: string, value: string): void { this.attributes[name] = value; }
  get textContent(): string { return this.own + this.children.map((c) => c.textContent).join(''); }
  set textContent(value: string) { this.own = value; this.children = []; }
}

function renderStub(expr: ExprNode, resolve: TokenResolver): StubNode {
  const g = globalThis as { document?: unknown };
  const saved = g.document;
  g.document = { createElement: (tag: string) => new StubNode(tag) };
  try {
    return renderExpr(expr, resolve) as unknown as StubNode;
  } finally {
    if (saved === undefined) delete g.document; else g.document = saved;
  }
}

/**
 * The rendered formula read without its layout: what a copy-paste, a failed
 * stylesheet, or a screen reader walking the spans receives.
 *
 * Two things are decoded because they are notation, not operators: the `×`
 * sign, and the base-case construct `[x]` with its subscript. Hidden brackets
 * can be dropped, which is how the companion test shows this one can fail.
 */
function flatReading(n: StubNode, dropHiddenBrackets = false): string {
  if (/\beq-base\b/.test(n.className)) {
    const sub = n.children.find((c) => /\beq-sub\b/.test(c.className));
    const fn = sub && sub.own === 'base case, maturity' ? 'base8' : 'basep';
    const inner = n.children.filter((c) => !/\beq-(paren|sub)\b/.test(c.className));
    return fn + '(' + inner.map((c) => flatReading(c, dropHiddenBrackets)).join('') + ')';
  }
  if (dropHiddenBrackets && n.className === 'sr-only' && (n.own === '(' || n.own === ')')) {
    return '';
  }
  return n.own.split('×').join(' * ') +
    n.children.map((c) => flatReading(c, dropHiddenBrackets)).join('');
}

function evaluate(n: ExprNode, value: (leaf: ExprNode) => number): number {
  switch (n.k) {
    case 'add': return evaluate(n.a, value) + evaluate(n.b, value);
    case 'sub': return evaluate(n.a, value) - evaluate(n.b, value);
    case 'mul': return evaluate(n.a, value) * evaluate(n.b, value);
    case 'div': return evaluate(n.a, value) / evaluate(n.b, value);
    case 'pow': return Math.pow(evaluate(n.a, value), evaluate(n.b, value));
    case 'min': return Math.min(...n.args.map((a) => evaluate(a, value)));
    case 'max': return Math.max(...n.args.map((a) => evaluate(a, value)));
    /* any two distinct affine maps will do: the question is structure */
    case 'base8': return 1.37 * evaluate(n.of, value) + 0.21;
    case 'basep': return 0.83 * evaluate(n.of, value) + 0.57;
    default: return value(n);
  }
}

/**
 * Whether two trees compute the same function of their leaves.
 *
 * Equal as functions, not identical as trees: the screen draws `a + (b + c)`
 * as `a + b + c`, which is a different tree and the same equation, and a
 * reader has not been misled. `a + b / c` for `(a + b) / c` is a different
 * function, and random leaf values separate the two at once.
 */
function sameFunction(a: ExprNode, b: ExprNode): boolean {
  let seed = 11;
  const rand = (): number => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
  let compared = 0;
  for (let trial = 0; trial < 20 && compared < 3; trial++) {
    const values = new Map<ExprNode, number>();
    const value = (leaf: ExprNode): number => {
      if (!values.has(leaf)) values.set(leaf, 0.5 + 1.5 * rand());
      return values.get(leaf)!;
    };
    const x = evaluate(a, value);
    const y = evaluate(b, value);
    if (!Number.isFinite(x)) continue;
    if (!Number.isFinite(y) || Math.abs(x - y) > 1e-9 * Math.max(1, Math.abs(x))) return false;
    compared++;
  }
  return compared === 3;
}

type Verdict = 'same' | 'different' | 'unreadable';

function readingVerdict(expr: ExprNode, dropHiddenBrackets = false): Verdict {
  const leaves: ExprNode[] = [];
  const rendered = renderStub(expr, (node) => ({ text: 'L' + (leaves.push(node) - 1) }));
  const text = flatReading(rendered, dropHiddenBrackets);
  const p: Parser = { src: text, i: 0, leaves };
  let parsed: ExprNode;
  try {
    parsed = parseExpr(p, 1);
    skipSpace(p);
    if (p.i !== text.length) return 'unreadable';
  } catch {
    return 'unreadable';
  }
  return sameFunction(expr, parsed) ? 'same' : 'different';
}

test('every rendered formula, read without its layout, is the same equation', () => {
  /* R243's declared test: "every operator in the rendered tree has a non-CSS
     representation". An operator whose only marker is CSS makes the reading
     unparseable; a marker without the grouping it needs makes it parse to a
     different function. Both fail here, per equation. */
  const ids = Object.keys(EQUATIONS);
  expect(ids.length).toBeGreaterThan(0);
  const wrong = ids
    .map((id) => [id, readingVerdict(EQUATIONS[id].expr)] as const)
    .filter(([, verdict]) => verdict !== 'same');
  expect(wrong).toEqual([]);
});

test('the rendered reading can fail: without the hidden brackets, equations misread', () => {
  /* the exact state P20 shipped - a bare slash - measured through the same
     rendering and the same comparison */
  const ids = Object.keys(EQUATIONS);
  const misread = ids.filter((id) => readingVerdict(EQUATIONS[id].expr, true) !== 'same');
  expect(misread).toContain('IDX-SPEC');
  expect(misread.length).toBeGreaterThan(20);
});

test('a hand-built fraction of a sum reads as a fraction of a sum', () => {
  const a: ExprNode = { k: 'num', v: 1, label: 'a' };
  const b: ExprNode = { k: 'num', v: 2, label: 'b' };
  const c: ExprNode = { k: 'num', v: 3, label: 'c' };
  const tree: ExprNode = { k: 'div', a: { k: 'add', a, b }, b: c };
  const leaves: ExprNode[] = [];
  const rendered = renderStub(tree, (node) => ({ text: 'L' + (leaves.push(node) - 1) }));
  expect(flatReading(rendered)).toBe('(L0+L1) / L2');
  expect(flatReading(rendered, true)).toBe('L0+L1 / L2');
});

test('a fraction raised to a power, and a power of a sum, keep their grouping', () => {
  /* No equation in the model raises a fraction to a power today, so the
     branch that brackets one had nothing holding it until this case: the
     mutation run that removed it passed every other test. */
  const a: ExprNode = { k: 'num', v: 1, label: 'a' };
  const b: ExprNode = { k: 'num', v: 2, label: 'b' };
  const c: ExprNode = { k: 'num', v: 3, label: 'c' };
  const fractionBase: ExprNode = { k: 'pow', a: { k: 'div', a, b }, b: c };
  const sumExponent: ExprNode = { k: 'pow', a, b: { k: 'add', a: b, b: c } };
  for (const tree of [fractionBase, sumExponent]) {
    expect(readingVerdict(tree)).toBe('same');
    expect(readingVerdict(tree, true)).not.toBe('same');
  }
});

test('the label the page sets carries no bracket, including in input names', () => {
  /* The page's resolver writes time-varying inputs as `cov(t)`. Every
     equation, with a resolver that does the same. */
  const g = globalThis as { document?: unknown };
  const saved = g.document;
  g.document = { createElement: (tag: string) => new StubNode(tag) };
  try {
    for (const id of Object.keys(EQUATIONS)) {
      let n = 0;
      const box = renderEquation(id, EQUATIONS[id].expr,
        (node) => ({ text: node.k === 'num' ? String(node.v) : 'in' + (n++) + '(t)' })) as unknown as StubNode;
      const label = box.attributes['aria-label'];
      expect(label.startsWith(id + ' of t equals '), id).toBe(true);
      expect(label.slice(id.length), id).not.toMatch(/[()*^/[\]]/);
    }
  } finally {
    if (saved === undefined) delete g.document; else g.document = saved;
  }
});

test('the spoken reading voices every operator and bracket as a word', () => {
  /* review 9: a screen reader at default punctuation does not voice brackets
     or `^`, so the aria-label may not contain them */
  for (const id of Object.keys(EQUATIONS)) {
    const leaves: ExprNode[] = [];
    const spoken = linearizeExpr(EQUATIONS[id].expr, (leaf) => 'L' + (leaves.push(leaf) - 1));
    expect(spoken, id).not.toMatch(/[()*^/+\-[\]]/);
  }
});

/* ---- test 2 ------------------------------------------------------------- */

test('.eq-frac resolves to a rule in the stylesheet BaseLayout ships', () => {
  /* The audit flagged this as unverified because its grep for eq-* returned
     zero matches - but the read had truncated mid-selector, so the negative
     was a fact about the reader, not the stylesheet. Measured here instead:
     global.css is the single unscoped sheet BaseLayout imports. */
  const css = readFileSync(
    fileURLToPath(new URL('../../src/styles/global.css', import.meta.url)), 'utf8');
  for (const selector of ['.eq-frac', '.eq-frac-num', '.eq-frac-den', '.sr-only']) {
    expect(css, selector + ' has no rule').toMatch(
      new RegExp('\\' + selector.slice(0, 1) + selector.slice(1) + '\\s*[,{]'));
  }
  /* the fraction bar really is a CSS artifact, which is why the marker above
     has to exist: this is the rule that draws it and nothing else does */
  expect(css).toMatch(/\.eq-frac-num\s*\{[^}]*border-bottom/);
});
