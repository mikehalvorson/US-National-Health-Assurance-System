/* =========================================================================
 * Equation visualizer: renders an equation expression tree as structured
 * HTML (stacked fractions, superscript exponents, labeled variables) with
 * no external math library. Every variable is a hoverable/clickable token;
 * the caller supplies a resolver that knows symbols, labels, and current
 * values under the active scenario and phase.
 * ========================================================================= */
import type { ExprNode } from './equations';

export interface TokenInfo {
  text: string;        /* symbol shown in the formula */
  title?: string;      /* hover tooltip */
  cls?: string;        /* extra class for coloring by node type */
  nodeId?: string;     /* diagram node id for click-through */
}
export type TokenResolver = (node: ExprNode) => TokenInfo;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* precedence: add/sub 1, mul 2, pow 3, atoms 4 (div renders as a fraction,
   which needs no parentheses) */
function prec(node: ExprNode): number {
  switch (node.k) {
    case 'add': case 'sub': return 1;
    case 'mul': return 2;
    case 'pow': return 3;
    default: return 4;
  }
}

function token(info: TokenInfo): HTMLElement {
  const t = el('span', 'eq-var' + (info.cls ? ' ' + info.cls : ''), info.text);
  if (info.title) t.title = info.title;
  if (info.nodeId) t.dataset.eqNode = info.nodeId;
  return t;
}

function group(child: HTMLElement): HTMLElement {
  const g = el('span', 'eq-group');
  g.appendChild(el('span', 'eq-paren', '('));
  g.appendChild(child);
  g.appendChild(el('span', 'eq-paren', ')'));
  return g;
}

function renderChild(node: ExprNode, parentPrec: number, resolve: TokenResolver): HTMLElement {
  const child = renderExpr(node, resolve);
  return prec(node) < parentPrec ? group(child) : child;
}

/**
 * Append `child` to `host`, bracketed for a non-visual reading only.
 *
 * Review 9 of P20: a fraction groups its numerator and denominator by
 * position, and an exponent by being raised. Flattened text - a copy-paste, a
 * failed stylesheet, a screen reader walking the spans - has no position, and
 * P20's hidden ` / ` marker read `(a + b) / c` as `a + b / c`, a different
 * equation, in 66 of the model's 168 divisions. The brackets go exactly where
 * the linear reading needs them and the two-dimensional layout does not draw
 * them; `.sr-only` is absolutely positioned, so they take no room in the flex
 * row either.
 */
function appendReadable(host: HTMLElement, child: HTMLElement, bracket: boolean): void {
  if (bracket) host.appendChild(el('span', 'sr-only', '('));
  host.appendChild(child);
  if (bracket) host.appendChild(el('span', 'sr-only', ')'));
}

export function renderExpr(node: ExprNode, resolve: TokenResolver): HTMLElement {
  switch (node.k) {
    case 'num': case 'param': case 'ramp': case 'model': case 'ref':
      return token(resolve(node));
    case 'add': case 'sub': {
      const wrap = el('span', 'eq-row');
      wrap.appendChild(renderChild(node.a, 1, resolve));
      wrap.appendChild(el('span', 'eq-op', node.k === 'add' ? '+' : '-'));
      /* the right side of a subtraction needs parens at equal precedence */
      const right = renderExpr(node.b, resolve);
      wrap.appendChild(node.k === 'sub' && prec(node.b) <= 1 ? group(right)
        : (prec(node.b) < 1 ? group(right) : right));
      return wrap;
    }
    case 'mul': {
      const wrap = el('span', 'eq-row');
      wrap.appendChild(renderChild(node.a, 2, resolve));
      wrap.appendChild(el('span', 'eq-op eq-times', '×'));
      wrap.appendChild(renderChild(node.b, 2, resolve));
      return wrap;
    }
    case 'div': {
      const frac = el('span', 'eq-frac');
      const num = el('span', 'eq-frac-num');
      appendReadable(num, renderExpr(node.a, resolve), linearPrec(node.a) < 2);
      const den = el('span', 'eq-frac-den');
      appendReadable(den, renderExpr(node.b, resolve), linearPrec(node.b) <= 2);
      frac.appendChild(num);
      /* R243 [S14]: the only representation of division that survives a
         copy-paste or a missing stylesheet. It sits between the operands so
         that the flattened text reads in the right order. Do not delete it as
         redundant with the CSS bar - the CSS bar is the redundant one. */
      frac.appendChild(el('span', 'sr-only', ' / '));
      frac.appendChild(den);
      return frac;
    }
    case 'pow': {
      const wrap = el('span', 'eq-row');
      /* A fraction base is not bracketed on screen - the bar groups it - so it
         needs brackets in the flattened reading, or `(a / b)^c` reads as
         `a / b^c`. Every other compound base already gets visible ones. */
      appendReadable(wrap, renderChild(node.a, 4, resolve),
        linearPrec(node.a) <= 3 && prec(node.a) >= 4);
      /* Review 9: an exponent is shown by being raised, and raising is CSS.
         Without this marker `a^b` flattened to `ab`. */
      wrap.appendChild(el('span', 'sr-only', ' ^ '));
      const sup = el('sup', 'eq-sup');
      appendReadable(sup, renderExpr(node.b, resolve), linearPrec(node.b) < 3);
      wrap.appendChild(sup);
      return wrap;
    }
    case 'min': case 'max': {
      const wrap = el('span', 'eq-row');
      wrap.appendChild(el('span', 'eq-fn', node.k));
      wrap.appendChild(el('span', 'eq-paren', '('));
      node.args.forEach(function (a, i) {
        if (i) wrap.appendChild(el('span', 'eq-op eq-comma', ','));
        wrap.appendChild(renderExpr(a, resolve));
      });
      wrap.appendChild(el('span', 'eq-paren', ')'));
      return wrap;
    }
    case 'base8': case 'basep': {
      const wrap = el('span', 'eq-row eq-base');
      wrap.appendChild(el('span', 'eq-paren', '['));
      wrap.appendChild(renderExpr(node.of, resolve));
      wrap.appendChild(el('span', 'eq-paren', ']'));
      const sub = el('sub', 'eq-sub', node.k === 'base8' ? 'base case, maturity' : 'base case, same phase');
      sub.title = node.k === 'base8'
        ? 'The same expression evaluated in the base scenario at maturity (P8)'
        : 'The same expression evaluated in the base scenario at this phase';
      wrap.appendChild(sub);
      return wrap;
    }
  }
}

/* A leaf as it is spoken. On screen a time-varying input is written `cov(t)`;
   the label already opens "<id> of t equals", so its inputs say "cov of t" to
   match - and a screen reader at default punctuation would otherwise voice
   the name and the letter with nothing between them. */
function spokenLeaf(resolve: TokenResolver): LeafRenderer {
  return function (node: ExprNode): string {
    return resolve(node).text.replace(/\(t\)$/, ' of t');
  };
}

/* Full equation line: "<id> value(t) = <expression>" */
export function renderEquation(
  id: string, expr: ExprNode, resolve: TokenResolver
): HTMLElement {
  const box = el('div', 'eq-formula');
  const lhs = el('span', 'eq-lhs');
  lhs.appendChild(el('b', '', id));
  lhs.appendChild(el('span', 'eq-lhs-t', '(t)'));
  box.appendChild(lhs);
  box.appendChild(el('span', 'eq-op eq-equals', '='));
  box.appendChild(renderExpr(expr, resolve));
  /* R243 [S14]: role="math" with a linear rendering of the same tree. The
     two-dimensional layout is unreadable in the accessibility tree whatever
     markers the operands carry, so the tree is given the one-dimensional
     reading instead. linearizeExpr is the same code the round-trip test
     exercises, so a precedence bug here fails a test rather than being
     announced to somebody as a different equation. */
  box.setAttribute('role', 'math');
  box.setAttribute('aria-label',
    id + ' of t equals ' + linearizeExpr(expr, spokenLeaf(resolve)));
  return box;
}

/* =========================================================================
 * R243 [S14]: division outside CSS.
 *
 * Nine of the ten operators renderExpr emits carry a textual or semantic
 * marker. `div` emitted a numerator span above a denominator span and nothing
 * else: the bar is a `border-bottom` rule, and the accessibility tree is built
 * from the DOM, so `v = M · L(t)/L(mature)` was announced as a product.
 * Copy-paste and any consumer that ignores the stylesheet lost it too.
 *
 * Two things are added, and they answer different consumers:
 *   - a visually-hidden `/` inside every `.eq-frac`, which fixes copy-paste
 *     and stylesheet-less rendering, and
 *   - `role="math"` plus an `aria-label` on `.eq-formula` carrying the linear
 *     rendering below, which is what assistive technology actually reads.
 *
 * The audit asked to verify that `.eq-frac` resolves to a rule in the shipped
 * stylesheet, because its grep found none. Measured: it does, at three rules
 * in `src/styles/global.css`. The grep returned zero because the file
 * truncated mid-read, which is a fact about the reader, not the stylesheet.
 * The assertion lives in `tests/lib/equation-render.test.ts`, in the test
 * named for that rule. Review 8 caught this sentence naming a
 * `manifest-check.ts` function that was never written: a comment describing a
 * guard is worth nothing unless the guard is where the comment says it is.
 * ========================================================================= */

/** Precedence in the LINEAR form. Unlike prec() above, `div` is an operator
 *  here rather than a two-dimensional layout, so it binds like `mul`.
 *
 *  Review 9: this was a second copy of prec()'s cascade differing in one case,
 *  so it is written as that one case. */
function linearPrec(node: ExprNode): number {
  return node.k === 'div' ? 2 : prec(node);
}

/*
 * The spoken vocabulary.
 *
 * Review 9 of P20: the aria-label used to say `a * (b + c) ^ d`. A screen
 * reader at its default punctuation setting does not voice brackets, and
 * voices `*` as "star" and `^` not at all, so the one channel R243 built to
 * carry the structure dropped the structure - the defect the row exists to
 * remove, moved rather than fixed. Words are voiced at every setting.
 */
const SPOKEN_OP: Record<'add' | 'sub' | 'mul' | 'div' | 'pow', string> = {
  add: ' plus ', sub: ' minus ', mul: ' times ', div: ' divided by ',
  pow: ' to the power of '
};
const OPEN = 'open bracket, ';
const CLOSE = ', close bracket';
const SPOKEN_CALL: Record<'min' | 'max' | 'base8' | 'basep', string> = {
  min: 'the minimum of ', max: 'the maximum of ',
  base8: 'the base case at maturity of ', basep: 'the base case at this phase of '
};

/** Render a leaf. The page resolves symbols; the round-trip test emits a
 *  canonical token instead, which is why this is a parameter. */
export type LeafRenderer = (node: ExprNode) => string;

/**
 * A linear, fully bracketed reading of the expression tree, in words.
 *
 * Bracketing is deliberately stricter than mathematics requires: the right
 * operand of a left-associative operator is wrapped whenever its own
 * precedence is less than or equal to the operator's. `a + (b + c)` and
 * `(a + b) + c` evaluate alike and are different trees, and this reading
 * keeps them apart so that it can round-trip.
 */
export function linearizeExpr(node: ExprNode, leaf: LeafRenderer): string {
  switch (node.k) {
    case 'num': case 'param': case 'ramp': case 'model': case 'ref':
      return leaf(node);
    case 'add': case 'sub': case 'mul': case 'div': case 'pow': {
      const p = linearPrec(node);
      /* pow is right-associative: its left operand needs the brackets. */
      const leftNeeds = node.k === 'pow' ? linearPrec(node.a) <= p : linearPrec(node.a) < p;
      const rightNeeds = node.k === 'pow' ? linearPrec(node.b) < p : linearPrec(node.b) <= p;
      const a = linearizeExpr(node.a, leaf);
      const b = linearizeExpr(node.b, leaf);
      return (leftNeeds ? OPEN + a + CLOSE : a) + SPOKEN_OP[node.k] +
        (rightNeeds ? OPEN + b + CLOSE : b);
    }
    case 'min': case 'max':
      return SPOKEN_CALL[node.k] + OPEN +
        node.args.map(function (a) { return linearizeExpr(a, leaf); }).join(', ') + CLOSE;
    case 'base8': case 'basep':
      return SPOKEN_CALL[node.k] + OPEN + linearizeExpr(node.of, leaf) + CLOSE;
  }
}
