/* =========================================================================
 * Keeping keyboard focus across a wholesale rebuild.
 *
 * R242 [S14]: a render strategy that empties a container and builds it again
 * destroys the element the user just activated, while it holds focus, so
 * focus falls to <body>. Measured in the browser before the fix: activating an
 * equation node left `document.activeElement` on `<body>` and the activated
 * `<g>` reporting `isConnected === false`.
 *
 * This lives here rather than inside the client script for one reason: a
 * client script touches `document` while it is being evaluated, so vitest
 * cannot import one. Review 8 of P20 found both of this row's declared tests
 * unimplemented for exactly that reason - the fix had been verified in a
 * browser and had nothing holding it. The decision is DOM-light and injectable
 * so it can be tested; the client keeps only the wiring.
 * ========================================================================= */

/** The minimum an element has to offer for focus to be restored to it. */
export interface FocusableLike {
  getAttribute(name: string): string | null;
  focus(): void;
}

/** A container that can be searched and can itself take focus. */
export interface FocusScope extends FocusableLike {
  contains(node: unknown): boolean;
  querySelector(selector: string): FocusableLike | null;
}

/** What was focused before the rebuild, and which scope it lived in. */
export interface CapturedFocus {
  /** the value of the identifying attribute, '' if the element had none */
  key: string;
  /** the name of the attribute that identified it within its scope */
  attribute: string;
  /** index into the scopes array the element was found in */
  scopeIndex: number;
}

/**
 * Which scope holds `active`, and how to find that element again.
 *
 * Returns null when focus is somewhere else entirely - a filter control, the
 * search box, the page. Restoring in that case would be focus theft, which is
 * a worse defect than the one being fixed.
 */
export function captureFocus(
  active: unknown,
  scopes: { scope: FocusScope | null; attribute: string }[]
): CapturedFocus | null {
  if (!active) return null;
  for (let i = 0; i < scopes.length; i++) {
    const entry = scopes[i];
    if (!entry.scope || !entry.scope.contains(active)) continue;
    const el = active as FocusableLike;
    /* Read every scope's attribute, not just this one's: a node carries the
       diagram's identifier and a legend button carries the panel's, and which
       one is present is a better guide than which scope it turned up in. */
    let key = '';
    for (const candidate of scopes) {
      key = key || el.getAttribute(candidate.attribute) || '';
    }
    return { key: key, attribute: entry.attribute, scopeIndex: i };
  }
  return null;
}

/**
 * Put focus back, on the same element if it survived the rebuild and inside
 * the same region if it did not.
 *
 * The fallback matters: selecting a leaf swaps the detail panel for one with
 * different buttons, so the exact element often does not come back. Landing on
 * the panel's first focusable child keeps the user in the region they were
 * working in, which is what the row asks for.
 */
export function restoreFocus(
  saved: CapturedFocus | null,
  scopes: (FocusScope | null)[],
  fallbackSelector = '[tabindex="0"], button, a[href]'
): boolean {
  if (!saved) return false;
  const scope = scopes[saved.scopeIndex];
  if (!scope) return false;
  let target: FocusableLike | null = saved.key
    ? scope.querySelector('[' + saved.attribute + '="' + saved.key + '"]')
    : null;
  if (!target) target = scope.querySelector(fallbackSelector);
  if (!target) target = scope;
  target.focus();
  return true;
}
