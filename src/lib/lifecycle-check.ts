/* The client lifecycle gates: the rules src/scripts/README.md writes for
 * every client, held to each client's syntax tree.
 *
 * Moved out of manifest-check.ts unchanged (the branch review against main,
 * 2026-10-21, found that module changing for every reason any of its checks
 * did). They read the client scripts and each page's <script> bodies through
 * repo-text.ts and parse them with the TypeScript compiler API, loaded on
 * first use, so they change when the lifecycle rules do and for nothing
 * else. Build-time only; manifest-check.ts re-exports each of them. */
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { REPO_ROOT, sourceText, sourceScanFiles } from './repo-text';

/* R280 [§S15]: a listener on a target the page swap does not replace.
 *
 * <ClientRouter /> replaces <body> on every navigation, and with it the
 * element each client's dataset.wired guard sits on, so every client's init
 * runs again in full on every visit. `window`, `document`, <html> and <head>
 * are not replaced. A listener registered on one of them from inside a
 * function therefore gains one registration each time that function runs,
 * and none is ever removed. fmea-client.ts did exactly this and gained one
 * listener per return visit, measured linear, until one click ran
 * selectRecord four times.
 *
 * The rule, written for readers in src/scripts/README.md: a listener on a
 * target that outlives the page, and a repeating timer, are registered at
 * module scope and nowhere else. A module is evaluated once per document,
 * which is exactly the lifetime those targets have. acronyms-client.ts is the
 * reference (§CB3).
 *
 * The first version of this gate (08fc01e) looked for the needle inside a
 * named function declaration whose body spelled `dataset.wired`. P21 drove it
 * under seven respellings of the same defect - an arrow-function init, a
 * helper the init calls, an unguarded page-load handler, <html> as the
 * target, a repeating timer, a helper in src/lib, an inline page script - and
 * it reported none of them. This version asks the question the defect poses,
 * "is this registration inside a function?", of the syntax tree, so a comment
 * or a string cannot trip it. Review of P21 then walked past it four more ways
 * (a local alias of <html>, `document['addEventListener']`,
 * `document.defaultView`, a matchMedia() list), so targets are resolved by
 * referent() below rather than read as text; its own comment says what it
 * still does not follow.
 *
 * A page script marked `data-astro-rerun` is run again by the router on every
 * visit, so in one of those even a top-level registration accumulates.
 * Measured in P21 with a counter in a mutated risk.astro, across two
 * away-and-back cycles: 1, 2, 3 with the attribute; 1, 1, 1 for a plain
 * `is:inline` script, which is why `is:inline` alone is not the trigger. */
type TsApi = typeof import('typescript');
type TsNode = import('typescript').Node;
let tsApiMemo: TsApi | null = null;

/* Loaded on first use rather than imported: nothing else in this module needs
   the compiler, and every vitest file that imports the module would pay for
   it at load. */
function typescriptApi(): TsApi {
  if (!tsApiMemo) {
    const api: TsApi = createRequire(join(REPO_ROOT, 'package.json'))('typescript');
    tsApiMemo = api;
  }
  return tsApiMemo;
}

/* The objects <ClientRouter /> does not replace, as referent() below names
   them. <body> is deliberately absent: it IS replaced, so a listener on it
   dies with the page. Beyond window, document, <html> and <head>, each of
   these outlives the page and takes listeners: the MediaQueryList matchMedia()
   returns, the visual viewport, the font set, the screen orientation.
   document.defaultView is window, and resolves to it. */
const PERSISTENT_TARGETS = new Set([
  'window', 'document', 'document.documentElement', 'document.head',
  'matchMedia()', 'visualViewport', 'document.fonts', 'screen.orientation'
]);
const WINDOW_NAMES = new Set(['window', 'self', 'globalThis']);
const DEFERRING_CALLS = new Set(['setTimeout', 'requestAnimationFrame', 'requestIdleCallback', 'queueMicrotask']);
/* timing.ts's clocks, reached directly rather than through a coalescer */
const CLOCK_OBJECTS = new Set(['animationFrames', 'timeoutClock()']);

export interface GlobalListenerSite { file: string; line: number; fn: string; target: string }
export interface GlobalRegistrationCensus {
  insideFunctions: GlobalListenerSite[];
  atModuleScope: number;
  /** files that register an `astro:page-load` listener on document at module scope */
  pageLoadRegistered: string[];
}

/* An alias is keyed by the declaration that made it - a variable, a
   destructured binding, an import - not by its name, so a later parameter or
   local of the same name that shadows it does not resolve through it. Review
   2 of P21 found the name-keyed first version flagged a parameter `root` as
   <html> because a module-level `const root = document.documentElement`
   existed. */
type Aliases = Map<TsNode, string>;

/* Names an alias may stand for: the targets and schedulers the rules list,
   the timing.ts factories, and '@ns' for `import * as x` of any module. */
const ALIASABLE = new Set([
  'setInterval', 'addEventListener', 'matchMedia', 'timeoutClock', 'debounce', 'coalesce', 'coalesceOn', '@ns'
]);
function aliasable(r: string | null): r is string {
  return r !== null && (PERSISTENT_TARGETS.has(r) || CLOCK_OBJECTS.has(r) || DEFERRING_CALLS.has(r) ||
    ALIASABLE.has(r));
}

function memberName(ts: TsApi, expr: TsNode): string | null {
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  if (ts.isElementAccessExpression(expr) && ts.isStringLiteralLike(expr.argumentExpression)) {
    return expr.argumentExpression.text;
  }
  return null;
}

/* Every name a binding introduces, `{ a, b: [c] }` included. */
function bindingNamesOf(ts: TsApi, b: TsNode): string[] {
  if (ts.isIdentifier(b)) return [b.text];
  if (ts.isArrayBindingPattern(b) || ts.isObjectBindingPattern(b)) {
    return b.elements.flatMap((el) => (ts.isBindingElement(el) ? bindingNamesOf(ts, el.name) : []));
  }
  return [];
}

/* The node that declares `name` within a binding: the variable itself, or the
   destructured element that binds it. */
function declaringNode(ts: TsApi, decl: TsNode, binding: TsNode, name: string): TsNode | null {
  if (ts.isIdentifier(binding)) return binding.text === name ? decl : null;
  if (ts.isArrayBindingPattern(binding) || ts.isObjectBindingPattern(binding)) {
    for (const el of binding.elements) {
      if (!ts.isBindingElement(el)) continue;
      const hit = ts.isIdentifier(el.name) ? (el.name.text === name ? el : null)
        : declaringNode(ts, el, el.name, name);
      if (hit) return hit;
    }
  }
  return null;
}

/* The identifier, or `this`, an access chain starts from: `a` in
   `a.b[c].d()`. Null when it starts from anything else - an await, a literal,
   a `new`. One helper for every rule here; review 2 found two copies. */
function accessRoot(ts: TsApi, node: TsNode): TsNode | null {
  let e = node;
  while (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) || ts.isCallExpression(e) ||
    ts.isNonNullExpression(e) || ts.isParenthesizedExpression(e) || ts.isAsExpression(e)) e = e.expression;
  return ts.isIdentifier(e) || e.kind === ts.SyntaxKind.ThisKeyword ? e : null;
}

/* The declaration a name resolves to where it is used: a parameter, a
   variable, a destructured binding, a function, an import, a catch binding,
   from the nearest enclosing scope that declares it. Null for a global.
   Block scoping is approximated the way a reader would: a declaration in any
   block on the way up counts. */
function nearestDeclaration(ts: TsApi, id: import('typescript').Identifier): TsNode | null {
  const name = id.text;
  const inList = (list: import('typescript').VariableDeclarationList): TsNode | null => {
    for (const d of list.declarations) {
      const hit = declaringNode(ts, d, d.name, name);
      if (hit) return hit;
    }
    return null;
  };
  for (let scope: TsNode | undefined = id.parent; scope; scope = scope.parent) {
    if (ts.isFunctionLike(scope)) {
      for (const p of scope.parameters) {
        if (bindingNamesOf(ts, p.name).includes(name)) return declaringNode(ts, p, p.name, name) ?? p;
      }
      if (ts.isFunctionExpression(scope) && scope.name && scope.name.text === name) return scope;
    }
    if (ts.isCatchClause(scope) && scope.variableDeclaration) {
      const hit = declaringNode(ts, scope.variableDeclaration, scope.variableDeclaration.name, name);
      if (hit) return hit;
    }
    if ((ts.isForStatement(scope) || ts.isForOfStatement(scope) || ts.isForInStatement(scope)) &&
      scope.initializer && ts.isVariableDeclarationList(scope.initializer)) {
      const hit = inList(scope.initializer);
      if (hit) return hit;
    }
    if (ts.isBlock(scope) || ts.isSourceFile(scope) || ts.isModuleBlock(scope)) {
      for (const st of scope.statements) {
        if (ts.isVariableStatement(st)) {
          const hit = inList(st.declarationList);
          if (hit) return hit;
        }
        if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name && st.name.text === name) return st;
        if (ts.isImportDeclaration(st) && st.importClause) {
          const clause = st.importClause;
          if (clause.name && clause.name.text === name) return clause;
          const nb = clause.namedBindings;
          if (nb && ts.isNamespaceImport(nb) && nb.name.text === name) return nb;
          if (nb && ts.isNamedImports(nb)) {
            for (const spec of nb.elements) if (spec.name.text === name) return spec;
          }
        }
      }
    }
  }
  return null;
}

/* What an expression refers to, as a path from a global: `document`,
   `document.head`, `window`, `matchMedia()`, `setTimeout`, `debounce`. These
   resolve: `window.`/`self.`/`globalThis.` prefixes, bracket access,
   `document.defaultView`, any `.ownerDocument`, a local alias made by
   `const`, `let` then assignment, or destructuring, and an import under
   another name or through `import * as`. A name declared locally that is not
   such an alias resolves to `local:<name>`, which no rule lists, so a
   parameter that happens to be called `document` is not the document.

   What it does not follow, and so what can still walk past every rule built
   on it: `.bind()`, `.call()` on anything but addEventListener, a target or
   function handed back by a call other than matchMedia() or timeoutClock(), a
   value stored in an object or array and read back, and an alias made in one
   file and imported by another. Review 1 of P21 walked past four spellings
   of the first version and review 2 past five more of the second; each is a
   test in tests/lib/lifecycle-gates.test.ts. */
function referent(ts: TsApi, node: TsNode, aliases: Aliases): string | null {
  let expr = node;
  while (ts.isParenthesizedExpression(expr) || ts.isNonNullExpression(expr) || ts.isAsExpression(expr)) {
    expr = expr.expression;
  }
  if (expr.kind === ts.SyntaxKind.ThisKeyword) return 'local:this';
  if (ts.isIdentifier(expr)) {
    const decl = nearestDeclaration(ts, expr);
    if (decl) return aliases.get(decl) ?? 'local:' + expr.text;
    return WINDOW_NAMES.has(expr.text) ? 'window' : expr.text;
  }
  if (ts.isCallExpression(expr)) {
    const fn = referent(ts, expr.expression, aliases);
    if (fn === 'matchMedia') return 'matchMedia()';
    if (fn === 'timeoutClock') return 'timeoutClock()';
    return null;
  }
  const name = memberName(ts, expr);
  if (name === null || !(ts.isPropertyAccessExpression(expr) || ts.isElementAccessExpression(expr))) return null;
  const owner = referent(ts, expr.expression, aliases);
  if (owner === null) return null;
  return memberPath(owner, name);
}

function memberPath(owner: string, name: string): string {
  if (owner === '@ns') return name;
  if (name === 'ownerDocument') return 'document';
  if (owner === 'window') return WINDOW_NAMES.has(name) ? 'window' : name;
  const path = owner + '.' + name;
  return path === 'document.defaultView' ? 'window' : path;
}

/* The aliases a file makes, in source order, so an alias of an alias
   resolves too. Every named import is recorded under its original name, so
   `import { debounce as soon }` makes `soon` mean debounce. */
function collectAliases(ts: TsApi, sf: TsNode): Aliases {
  const aliases: Aliases = new Map();
  const walk = (n: TsNode): void => {
    if (ts.isImportDeclaration(n) && n.importClause && n.importClause.namedBindings) {
      const nb = n.importClause.namedBindings;
      if (ts.isNamespaceImport(nb)) aliases.set(nb, '@ns');
      else for (const spec of nb.elements) aliases.set(spec, (spec.propertyName ?? spec.name).text);
    }
    if (ts.isVariableDeclaration(n) && n.initializer) {
      const r = referent(ts, n.initializer, aliases);
      if (ts.isIdentifier(n.name) && aliasable(r)) aliases.set(n, r);
      /* const { documentElement: root } = document */
      if (ts.isObjectBindingPattern(n.name) && r !== null && !r.startsWith('local:')) {
        for (const el of n.name.elements) {
          if (!ts.isBindingElement(el) || !ts.isIdentifier(el.name)) continue;
          const prop = el.propertyName && (ts.isIdentifier(el.propertyName) || ts.isStringLiteral(el.propertyName))
            ? el.propertyName.text : el.name.text;
          const path = memberPath(r, prop);
          if (aliasable(path)) aliases.set(el, path);
        }
      }
    }
    /* let w; ... w = window */
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(n.left)) {
      const decl = nearestDeclaration(ts, n.left);
      const r = referent(ts, n.right, aliases);
      if (decl && !aliases.has(decl) && aliasable(r)) aliases.set(decl, r);
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return aliases;
}

/* A call that registers with something the swap keeps ('listen', with the
   target; 'repeat', a setInterval), or that schedules a callback for later
   ('defer'). */
interface CallShape { kind: 'listen' | 'repeat' | 'defer'; target: string }

function callShape(ts: TsApi, call: import('typescript').CallExpression, aliases: Aliases): CallShape | null {
  const callee = call.expression;
  const name = memberName(ts, callee);
  if (name !== null && (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee))) {
    const owner = referent(ts, callee.expression, aliases);
    if (name === 'addEventListener') {
      return owner !== null && PERSISTENT_TARGETS.has(owner) ? { kind: 'listen', target: owner } : null;
    }
    /* addEventListener.call(document, ...) and its prototype spelling */
    if ((name === 'call' || name === 'apply') && owner !== null && /(?:^|\.)addEventListener$/.test(owner)) {
      const first = call.arguments[0];
      const target = first ? referent(ts, first, aliases) : null;
      return target !== null && PERSISTENT_TARGETS.has(target) ? { kind: 'listen', target } : null;
    }
    if (name === 'request' && owner !== null && CLOCK_OBJECTS.has(owner)) {
      return { kind: 'defer', target: owner + '.request' };
    }
  }
  const fn = referent(ts, callee, aliases);
  if (fn === 'addEventListener') return { kind: 'listen', target: 'window' };
  if (fn === 'setInterval') return { kind: 'repeat', target: 'setInterval' };
  if (fn !== null && DEFERRING_CALLS.has(fn)) return { kind: 'defer', target: fn };
  return null;
}

interface ScriptChunk { code: string; line: number; rerun: boolean }

/* A .ts file is one chunk. An .astro file contributes each <script> body:
   its frontmatter runs on the server and its markup registers nothing. */
function browserChunks(rel: string, text: string): ScriptChunk[] {
  if (rel.endsWith('.ts')) return [{ code: text, line: 0, rerun: false }];
  const out: ScriptChunk[] = [];
  const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = SCRIPT.exec(text)) !== null) {
    const bodyAt = m.index + m[0].indexOf('>') + 1;
    out.push({
      code: m[2] ?? '',
      line: text.slice(0, bodyAt).split('\n').length - 1,
      rerun: /\bdata-astro-rerun\b/.test(m[1] ?? '')
    });
  }
  return out;
}

function functionLabel(ts: TsApi, fn: TsNode): string {
  if ((ts.isFunctionDeclaration(fn) || ts.isFunctionExpression(fn) || ts.isMethodDeclaration(fn)) &&
    fn.name) return fn.name.getText();
  const parent = fn.parent;
  if (parent && (ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent))) {
    return parent.name.getText();
  }
  return '(anonymous)';
}

const censusCache = new Map<string, GlobalRegistrationCensus>();

export function globalRegistrationCensus(root = REPO_ROOT): GlobalRegistrationCensus {
  const hit = censusCache.get(root);
  if (hit) return hit;
  const ts = typescriptApi();
  const census: GlobalRegistrationCensus = { insideFunctions: [], atModuleScope: 0, pageLoadRegistered: [] };
  for (const rel of sourceScanFiles(root)) {
    for (const chunk of browserChunks(rel, sourceText(rel, root))) {
      const sf = ts.createSourceFile(rel, chunk.code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const aliases = collectAliases(ts, sf);
      const visit = (node: TsNode, fn: string | null): void => {
        const inner = ts.isFunctionLike(node) ? functionLabel(ts, node) : fn;
        if (ts.isCallExpression(node)) {
          const shape = callShape(ts, node, aliases);
          if (shape && shape.kind !== 'defer') {
            const where = inner ?? (chunk.rerun ? '(script run on every visit)' : null);
            if (where) {
              const line = chunk.line + sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
              census.insideFunctions.push({ file: rel, line, fn: where, target: shape.target });
            } else {
              census.atModuleScope += 1;
              const event = node.arguments[0];
              if (shape.target === 'document' && event && ts.isStringLiteralLike(event) &&
                event.text === 'astro:page-load' && !census.pageLoadRegistered.includes(rel)) {
                census.pageLoadRegistered.push(rel);
              }
            }
          }
        }
        ts.forEachChild(node, (child) => { visit(child, inner); });
      };
      visit(sf, null);
    }
  }
  censusCache.set(root, census);
  return census;
}

/* The first rule in src/scripts/README.md: a client registers its init on
   `astro:page-load` at module scope, because a module is evaluated once per
   document and the event fires on every visit. A client without that
   registration draws on its first visit and never again. Review of P21
   found the census's first floor (registrations at least equal to the
   number of clients) passed a tree with one client skipped, since each
   client registers two; this names the clients one by one. */
/* What a client script's path looks like; selftests.ts reads it from here
   rather than spelling it again. */
export const CLIENT_SCRIPT = /^src\/scripts\/[^/]+-client\.ts$/;

/* What this does not check: that the handler does anything, and how many
   times it is registered. A second registration of the same init is
   harmless behind its dataset.wired guard, and a handler that does nothing is
   a defect no shape check can see. */
export function clientsWithoutPageLoad(root = REPO_ROOT): string[] {
  const registered = new Set(globalRegistrationCensus(root).pageLoadRegistered);
  return sourceScanFiles(root).filter((f) => CLIENT_SCRIPT.test(f) && !registered.has(f));
}

/* R223 [§S15]: page state starts from nothing on every arrival.
 *
 * A client module is evaluated once per document, so a module-level binding
 * outlives the page that set it. On a return visit the page's markup is new
 * and the binding is not: a control can show one value while the code runs
 * on another, or two panels can point at different things. The audit found
 * four strategies for this across the clients and none written down (R229).
 * The one this repo uses is in src/scripts/README.md: state lives in the
 * init's closure where it can, and where it cannot, the init assigns it, as
 * a direct statement, on every arrival.
 *
 * What this checks, per file in src/scripts/:
 *   - every module-level `let` or `var` the file writes, destructured ones
 *     included, is assigned by a top-level statement of the init registered
 *     on `astro:page-load` - not in a handler that init defines, which runs
 *     later; not in a helper it calls, which the next edit can stop calling;
 *     not under an `if`, which does not run on every arrival;
 *   - every module-level debounce, coalesce or coalesceOn has `.cancel()`
 *     called directly in that init or in a module-scope astro:before-swap
 *     handler, because pending work is state too;
 *   - every module-level object a file mutates by property has each of those
 *     properties assigned in the init, and one mutated by computed key or by
 *     a method has to be declared, since per-key reset cannot be read;
 *   - anything else is declared in DOCUMENT_LIFETIME_STATE with its reason,
 *     and a declaration that no longer names live state, or names state the
 *     init now resets, is itself a fault so an exemption cannot outlive its
 *     reason.
 *
 * What it does not read: state held in a closure, which is fresh by
 * construction, and state in src/lib, which a client reaches only through a
 * call it makes on arrival. */
export const DOCUMENT_LIFETIME_STATE: Record<string, Record<string, string>> = {
  'src/scripts/acronyms-client.ts': {
    observer: 'one MutationObserver for the whole document, re-targeted at each new <main> (§CB3)',
    running: 'true only while a sweep runs, and a sweep never spans a navigation',
    schedule: 'the sweep coalescer serves every page; a sweep still pending across a swap decorates the page that arrived'
  },
  /* The explorer's three view settings outlive a page by the owner's decision
     of 2026-10-07, which closed the question P21 left open: a reader who
     picks a scenario, a group or a phase finds it still picked on return.
     Its two selections are not view settings and reset on arrival
     (explorer-selection.ts). */
  'src/scripts/quality-client.ts': {
    eqScenario: 'an explorer view setting a reader keeps between visits (owner decision, 2026-10-07); initQuality sets its control from it',
    eqGroup: 'the same, for the diagram group',
    eqPhase: 'the same, for the phase',
    eqTargetCache: 'a memo keyed by scenario, holding no page state',
    diagramCache: 'a memo keyed by group, holding no page state'
  }
};

const PENDING_WORK_FACTORIES = new Set(['debounce', 'coalesce', 'coalesceOn']);
const MUTATING_METHODS = new Set([
  'push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'set', 'add', 'delete', 'clear'
]);

const moduleStateCache = new Map<string, string[]>();

export function undeclaredPageState(root = REPO_ROOT): string[] {
  const hit = moduleStateCache.get(root);
  if (hit) return hit;
  const ts = typescriptApi();
  const faults: string[] = [];
  const clients = sourceScanFiles(root).filter((f) => /^src\/scripts\/[^/]+\.ts$/.test(f));

  for (const rel of clients) {
    const sf = ts.createSourceFile(rel, sourceText(rel, root), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const declared = DOCUMENT_LIFETIME_STATE[rel] ?? {};
    const lets: string[] = [];
    const pending: string[] = [];
    const objects: string[] = [];
    const functions = new Map<string, TsNode>();
    const swapBodies: TsNode[] = [];
    let initName: string | null = null;
    const aliases = collectAliases(ts, sf);

    for (const st of sf.statements) {
      if (ts.isFunctionDeclaration(st) && st.name && st.body) functions.set(st.name.text, st.body);
      if (ts.isVariableStatement(st)) {
        const isConst = (st.declarationList.flags & ts.NodeFlags.Const) !== 0;
        for (const d of st.declarationList.declarations) {
          if (!isConst) {
            lets.push(...bindingNamesOf(ts, d.name));
            continue;
          }
          if (!ts.isIdentifier(d.name)) continue;
          const name = d.name.text;
          const init = d.initializer;
          /* resolved, so `import { debounce as soon }` is still a debounce */
          const factory = init && ts.isCallExpression(init) ? referent(ts, init.expression, aliases) : null;
          if (factory !== null && PENDING_WORK_FACTORIES.has(factory)) pending.push(name);
          else if (init && (ts.isObjectLiteralExpression(init) || ts.isArrayLiteralExpression(init) ||
            (ts.isNewExpression(init) && ts.isIdentifier(init.expression) &&
              /^(?:Weak)?(?:Map|Set)$/.test(init.expression.text)))) objects.push(name);
        }
      }
      if (ts.isExpressionStatement(st) && ts.isCallExpression(st.expression)) {
        const call = st.expression;
        const shape = callShape(ts, call, aliases);
        const [event, handler] = call.arguments;
        if (shape && shape.kind === 'listen' && shape.target === 'document' &&
          event && ts.isStringLiteralLike(event) && handler) {
          if (event.text === 'astro:page-load' && ts.isIdentifier(handler)) initName = handler.text;
          if (event.text === 'astro:before-swap' &&
            (ts.isFunctionExpression(handler) || ts.isArrowFunction(handler))) swapBodies.push(handler.body);
        }
      }
    }

    /* What a body does as its own top-level statements, a `try` block's
       included: assignments to a name or to a name's property - plain,
       chained (`a = b = ''`), comma-separated (`a = '', b = ''`) or
       destructuring (`[a, b] = ['', '']`) - and `.cancel()` calls. Only those
       count as happening on every arrival. A handler the init defines runs
       later or never; a statement under an `if` - `if (!x) x = d`, or a reset
       only for some hosts - does not run on every arrival; and an assignment
       that reads the old value (`x = x ?? d`, `x || (x = d)`) keeps it.

       What it cannot tell: a `return` before a reset. Every init returns
       early at its guard, so `if (cond) return;` followed by a reset is the
       normal shape, and a return placed there for another reason defeats the
       reset without this check seeing it. Review 2 of P21 found the comment
       above claimed otherwise. */
    /* the variables an expression names: `a.selectedId` reads `a`, not a
       variable called selectedId, and `{ mode: x }` reads `x`. P21's second
       fix run found the first version counted property names, and so took
       `selectedId = arrival.selectedId` for a memo of selectedId. */
    const identifiersIn = (n: TsNode): Set<string> => {
      const out = new Set<string>();
      const walk = (m: TsNode): void => {
        const parent = m.parent;
        const propertyName = !!parent && (
          (ts.isPropertyAccessExpression(parent) && parent.name === m) ||
          (ts.isPropertyAssignment(parent) && parent.name === m) ||
          (ts.isBindingElement(parent) && parent.propertyName === m));
        if (ts.isIdentifier(m) && !propertyName) out.add(m.text);
        ts.forEachChild(m, walk);
      };
      walk(n);
      return out;
    };
    const direct = (body: TsNode | undefined) => {
      const names = new Set<string>();
      const props = new Set<string>();
      const cancels = new Set<string>();
      const statements: TsNode[] = [];
      const take = (list: readonly TsNode[]): void => {
        for (const st of list) {
          if (ts.isTryStatement(st)) take(st.tryBlock.statements);
          else statements.push(st);
        }
      };
      if (body && ts.isBlock(body)) take(body.statements);
      const assignment = (e: TsNode): void => {
        if (!ts.isBinaryExpression(e)) return;
        if (e.operatorToken.kind === ts.SyntaxKind.CommaToken) {
          assignment(e.left);
          assignment(e.right);
          return;
        }
        if (e.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return;
        const reads = identifiersIn(e.right);
        if (ts.isIdentifier(e.left)) {
          if (!reads.has(e.left.text)) names.add(e.left.text);
        } else if (ts.isPropertyAccessExpression(e.left) && ts.isIdentifier(e.left.expression)) {
          if (!reads.has(e.left.expression.text)) props.add(e.left.expression.text + '.' + e.left.name.text);
        } else if (ts.isArrayLiteralExpression(e.left) || ts.isObjectLiteralExpression(e.left)) {
          for (const name of identifiersIn(e.left)) if (!reads.has(name)) names.add(name);
        }
        assignment(e.right);   // a = b = ''
      };
      for (const st of statements) {
        if (!ts.isExpressionStatement(st)) continue;
        const e = st.expression;
        assignment(e);
        if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) &&
          e.expression.name.text === 'cancel' && ts.isIdentifier(e.expression.expression)) {
          cancels.add(e.expression.expression.text);
        }
      }
      return { names, props, cancels };
    };

    /* What the whole file writes, anywhere. A write below the first level of
       an object (`state.sel.id = ...`), by key, by a mutating method, by
       Object.assign/defineProperty, by Reflect.set/defineProperty/
       deleteProperty or by delete cannot be matched to a reset, so it counts
       as keyed and has to be declared. So does any write through a local
       alias of a module-level object (`const s = state; s.sel = 'a'`), which
       review 2 of P21 found walked past. */
    const moduleLevel = (decl: TsNode): boolean =>
      ts.isVariableDeclaration(decl) && !!decl.parent && !!decl.parent.parent &&
      ts.isVariableStatement(decl.parent.parent) && decl.parent.parent.parent === sf;
    /* the module-level name a write lands on, following local aliases */
    const ownerOf = (n: TsNode): { name: string; viaAlias: boolean } | null => {
      let root = accessRoot(ts, n);
      let viaAlias = false;
      for (let hop = 0; hop < 8 && root && ts.isIdentifier(root); hop += 1) {
        const decl = nearestDeclaration(ts, root);
        if (!decl || moduleLevel(decl)) return { name: root.text, viaAlias };
        const init = ts.isVariableDeclaration(decl) ? decl.initializer : undefined;
        const next = init ? accessRoot(ts, init) : null;
        if (!next || !ts.isIdentifier(next)) return { name: root.text, viaAlias };
        root = next;
        viaAlias = true;
      }
      return null;
    };
    const written = new Set<string>();
    const propWrites = new Map<string, Set<string>>();
    const keyedWrites = new Set<string>();
    const keyed = (n: TsNode | undefined): void => {
      const owner = n ? ownerOf(n) : null;
      if (owner) keyedWrites.add(owner.name);
    };
    const OBJECT_WRITERS = new Set(['assign', 'defineProperty', 'defineProperties', 'setPrototypeOf']);
    const REFLECT_WRITERS = new Set(['set', 'defineProperty', 'deleteProperty', 'setPrototypeOf']);
    const scan = (n: TsNode): void => {
      if (ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        n.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
        const left = n.left;
        if (ts.isIdentifier(left)) written.add(left.text);
        else if (ts.isPropertyAccessExpression(left) && ts.isIdentifier(left.expression) &&
          !(ownerOf(left)?.viaAlias)) {
          const set = propWrites.get(left.expression.text) ?? new Set<string>();
          set.add(left.name.text);
          propWrites.set(left.expression.text, set);
        } else if (ts.isArrayLiteralExpression(left) || ts.isObjectLiteralExpression(left)) {
          /* [a, b] = ... writes each name it destructures into */
          for (const name of identifiersIn(left)) written.add(name);
        } else keyed(left);
      }
      if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && ts.isIdentifier(n.operand)) {
        written.add(n.operand.text);
      }
      if (ts.isDeleteExpression(n)) keyed(n.expression);
      if (ts.isCallExpression(n)) {
        const callee = n.expression;
        const method = memberName(ts, callee);
        if (method !== null && (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee))) {
          const owner = ts.isIdentifier(callee.expression) ? callee.expression.text : null;
          if ((owner === 'Object' && OBJECT_WRITERS.has(method)) ||
            (owner === 'Reflect' && REFLECT_WRITERS.has(method))) keyed(n.arguments[0]);
          else if (MUTATING_METHODS.has(method)) keyed(callee.expression);
        }
      }
      ts.forEachChild(n, scan);
    };
    scan(sf);

    const initBody = initName ? functions.get(initName) : undefined;
    const onArrival = direct(initBody);
    const onLeaving = swapBodies.map((b) => direct(b));
    const where = rel + ': ';
    const notReset = initBody
      ? (initName ?? '') + ' does not reset it on arrival'
      : 'the file registers no init on astro:page-load to reset it';
    const stateful: string[] = [];
    const isDeclared = (name: string) => Object.prototype.hasOwnProperty.call(declared, name);

    for (const name of lets) {
      if (!written.has(name)) continue;
      stateful.push(name);
      const reset = onArrival.names.has(name);
      if (reset && isDeclared(name)) {
        faults.push(where + name + ' is declared as outliving the page, but ' + initName + ' resets it');
      } else if (!reset && !isDeclared(name)) {
        faults.push(where + name + ' is module state; ' + notReset + ', and nothing declares it');
      }
    }
    for (const name of pending) {
      stateful.push(name);
      const cancelled = onArrival.cancels.has(name) || onLeaving.some((b) => b.cancels.has(name));
      if (cancelled && isDeclared(name)) {
        faults.push(where + name + ' is declared as outliving the page, but it is cancelled');
      } else if (!cancelled && !isDeclared(name)) {
        faults.push(where + name + ' holds pending work that is not cancelled on arrival or on ' +
          'leaving, and nothing declares it');
      }
    }
    for (const name of objects) {
      const props = propWrites.get(name);
      const keyed = keyedWrites.has(name);
      if (!props && !keyed) continue;           // a constant table, never written
      stateful.push(name);
      if (isDeclared(name)) continue;
      if (keyed) {
        faults.push(where + name + ' is mutated by key or by method, which no arrival reset can be ' +
          'read from, and nothing declares it');
        continue;
      }
      for (const p of props ?? []) {
        if (!onArrival.props.has(name + '.' + p)) {
          faults.push(where + name + '.' + p + ' is written; ' + notReset);
        }
      }
    }
    for (const name of Object.keys(declared)) {
      if (!stateful.includes(name)) {
        faults.push(where + 'declares ' + name + ' as outliving the page, and it is not module state here');
      }
    }
  }
  for (const file of Object.keys(DOCUMENT_LIFETIME_STATE)) {
    if (!clients.includes(file)) faults.push(file + ' is declared in DOCUMENT_LIFETIME_STATE and does not exist');
  }
  moduleStateCache.set(root, faults);
  return faults;
}

/* P21 [§S15]: deferred work runs only for the page that asked for it.
 *
 * <ClientRouter /> swaps <body> without ending the realm, so a timer, a frame
 * or a promise continuation a page started runs after that page is gone,
 * against whichever document replaced it. P21 measured two: the health
 * page's pending render ran on the Overview (4 of 4 trials) and redrew the
 * one host id the two pages share; and a Physical Care fetch still in flight
 * when the reader left and came back wired the new page a second time (2
 * listeners where there should be 1). Neither threw. Both were found by
 * holding the work and navigating, not by reading.
 *
 * The rule: a callback handed to setTimeout, requestAnimationFrame,
 * requestIdleCallback or queueMicrotask, or to a promise's then, catch or
 * finally, is wrapped in boundToPage(host, ...) from timing.ts, which does
 * nothing once the host has left the document. The same goes for a clock's
 * request() called directly, and for a debounce, coalesce or coalesceOn made
 * inside a function: the state gate requires the module-level ones to be
 * cancelled, and one held in a closure has nothing that could cancel it.
 *
 * An async function in browser code may not reach outside itself, because
 * the code after an await is a continuation with no wrapper to put it in.
 * Every name it uses is resolved to its declaration, and it reaches outside
 * when it: names `document` or `window`; calls a function declared outside
 * it (in the file or imported), other than the pure globals in
 * PURE_FUNCTIONS such as fetch; calls a method of, or writes to, anything
 * declared outside it, `this` included; or does either through a local that
 * starts as an outside value (`const h = host`). Parameters count as outside,
 * since a caller can hand in an element. The standard-library objects in
 * PURE_GLOBALS may be read and called, except Reflect's writers.
 *
 * Review 1 of P21 found the first version checked only the word `document`
 * and declared same-file functions; review 2 walked the second past a local
 * alias of a captured element, an imported renderer and `this`, and found it
 * flagged `performance.now()` in honest I/O code. What it still cannot see:
 * a write through a value pulled out of an object or array it built from an
 * outside value, and anything a called pure global does with what it is given.
 *
 * Scope is every .ts under src/ and every <script> in an .astro file, except
 * timing.ts, which implements the clocks and has to call them bare. */
const CONTINUATIONS = new Set(['then', 'catch', 'finally']);
const COALESCER_FACTORIES = new Set(['debounce', 'coalesce', 'coalesceOn']);
const TIMING_MODULE = 'src/lib/timing.ts';
const PAGE_BINDER = 'boundToPage';
/* standard-library objects: reading from them and calling their methods
   touches no page */
const PURE_GLOBALS = new Set([
  'JSON', 'Math', 'Object', 'Array', 'Number', 'String', 'Boolean', 'Promise', 'Date', 'console', 'URL',
  'Error', 'performance', 'Reflect', 'Symbol', 'Map', 'Set', 'Intl', 'BigInt', 'RegExp'
]);
/* standard-library functions called by name */
const PURE_FUNCTIONS = new Set([
  'fetch', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent',
  'encodeURI', 'decodeURI', 'Number', 'String', 'Boolean', 'BigInt', 'Symbol', 'structuredClone', 'Array', 'Error'
]);
/* the members of PURE_GLOBALS that write to what they are given */
const REFLECT_WRITERS = new Set(['set', 'defineProperty', 'deleteProperty', 'setPrototypeOf']);

const deferredCache = new Map<string, string[]>();

export function unboundDeferredWork(root = REPO_ROOT): string[] {
  const hit = deferredCache.get(root);
  if (hit) return hit;
  const ts = typescriptApi();
  const faults: string[] = [];

  for (const rel of sourceScanFiles(root)) {
    if (rel === TIMING_MODULE) continue;
    for (const chunk of browserChunks(rel, sourceText(rel, root))) {
      const sf = ts.createSourceFile(rel, chunk.code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const aliases = collectAliases(ts, sf);
      const at = (n: TsNode) => rel + ':' + (chunk.line + sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1);
      /* resolved, so boundToPage imported under another name still counts */
      const isBound = (n: TsNode | undefined): boolean => !!n && ts.isCallExpression(n) &&
        referent(ts, n.expression, aliases) === PAGE_BINDER;

      const reachesOutside = (fn: TsNode): boolean => {
        const inside = (decl: TsNode): boolean => {
          for (let p: TsNode | undefined = decl; p; p = p.parent) if (p === fn) return true;
          return false;
        };
        /* 'own': declared in fn and not an outside value under a new name;
           'pure': a standard-library global; 'outside': anything else */
        const classify = (node: TsNode, seen: Set<TsNode> = new Set()): 'own' | 'pure' | 'outside' => {
          if (node.kind === ts.SyntaxKind.ThisKeyword || !ts.isIdentifier(node) || seen.has(node)) return 'outside';
          seen.add(node);
          const decl = nearestDeclaration(ts, node);
          if (decl === null) return PURE_GLOBALS.has(node.text) ? 'pure' : 'outside';
          if (!inside(decl) || ownParameter(decl)) return 'outside';
          const source = ts.isVariableDeclaration(decl) ? decl.initializer
            : ts.isBindingElement(decl) ? enclosingInitializer(decl) : undefined;
          const from = source ? accessRoot(ts, source) : null;
          if (from && classify(from, seen) === 'outside') return 'outside';
          return 'own';
        };
        /* a parameter of fn itself: its value comes from a caller. A nested
           callback's parameter is fn's own business. */
        const ownParameter = (decl: TsNode): boolean => {
          for (let p: TsNode | undefined = decl; p && p !== fn; p = p.parent) {
            if (ts.isParameter(p)) return p.parent === fn;
          }
          return false;
        };
        const enclosingInitializer = (el: TsNode): TsNode | undefined => {
          for (let p: TsNode | undefined = el.parent; p; p = p.parent) {
            if (ts.isVariableDeclaration(p)) return p.initializer;
          }
          return undefined;
        };
        let reaches = false;
        const look = (m: TsNode): void => {
          const isName = ts.isIdentifier(m) && !(m.parent && ts.isPropertyAccessExpression(m.parent) && m.parent.name === m);
          if (isName && (m.text === 'document' || WINDOW_NAMES.has(m.text)) && nearestDeclaration(ts, m) === null) {
            reaches = true;
          }
          if (ts.isCallExpression(m)) {
            const callee = m.expression;
            if (ts.isIdentifier(callee)) {
              const decl = nearestDeclaration(ts, callee);
              if (decl === null ? !PURE_FUNCTIONS.has(callee.text) : !inside(decl)) reaches = true;
            } else if (memberName(ts, callee) !== null &&
              (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee))) {
              const r = accessRoot(ts, callee.expression);
              const kind = r ? classify(r) : 'own';
              if (kind === 'outside') reaches = true;
              if (kind === 'pure' && r && ts.isIdentifier(r) && r.text === 'Reflect' &&
                REFLECT_WRITERS.has(memberName(ts, callee) ?? '')) {
                const target = m.arguments[0] ? accessRoot(ts, m.arguments[0]) : null;
                if (!target || classify(target) !== 'own') reaches = true;
              }
            }
          }
          if (ts.isBinaryExpression(m) && m.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            m.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
            const r = accessRoot(ts, m.left);
            if (r && classify(r) !== 'own') reaches = true;
          }
          if (ts.isDeleteExpression(m)) {
            const r = accessRoot(ts, m.expression);
            if (r && classify(r) !== 'own') reaches = true;
          }
          ts.forEachChild(m, look);
        };
        look(fn);
        return reaches;
      };

      const visit = (n: TsNode, inFunction: boolean): void => {
        if (ts.isCallExpression(n)) {
          const shape = callShape(ts, n, aliases);
          if (shape && shape.kind === 'defer' && !isBound(n.arguments[0])) {
            faults.push(at(n) + ' ' + shape.target + ' schedules a callback that is not bound to its page');
          }
          const member = memberName(ts, n.expression);
          if (member !== null && CONTINUATIONS.has(member) && n.arguments.some((a) => !isBound(a))) {
            faults.push(at(n) + ' .' + member + ' continues with a callback that is not bound to its page');
          }
          const factory = referent(ts, n.expression, aliases);
          if (inFunction && factory !== null && COALESCER_FACTORIES.has(factory) && !isBound(n.arguments[0])) {
            faults.push(at(n) + ' ' + factory + ' made inside a function holds work nothing can cancel, ' +
              'and its callback is not bound to its page');
          }
        }
        if (ts.isFunctionLike(n) && ts.canHaveModifiers(n) &&
          (ts.getModifiers(n) ?? []).some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) && reachesOutside(n)) {
          faults.push(at(n) + ' an async function reaches the page, and the code after an await ' +
            'cannot be bound to it');
        }
        const inner = inFunction || ts.isFunctionLike(n);
        ts.forEachChild(n, (child) => { visit(child, inner); });
      };
      visit(sf, false);
    }
  }
  deferredCache.set(root, faults);
  return faults;
}
