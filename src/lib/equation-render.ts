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
      num.appendChild(renderExpr(node.a, resolve));
      const den = el('span', 'eq-frac-den');
      den.appendChild(renderExpr(node.b, resolve));
      frac.appendChild(num);
      frac.appendChild(den);
      return frac;
    }
    case 'pow': {
      const wrap = el('span', 'eq-row');
      wrap.appendChild(renderChild(node.a, 4, resolve));
      const sup = el('sup', 'eq-sup');
      sup.appendChild(renderExpr(node.b, resolve));
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
  return box;
}
