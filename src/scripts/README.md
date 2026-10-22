# Client scripts: one lifecycle

Every `*-client.ts` file here is the browser half of one chapter. A page
imports it from a bottom `<script>` block, and `BaseLayout.astro` puts
`<ClientRouter />` on every page. Three facts about that router decide how
every file here has to be written:

1. **A module is evaluated once per document.** Navigating back to a chapter
   does not evaluate its client again; the browser already holds the module.
   Anything a module declares at its top level lives until the reader
   reloads or leaves the site.
2. **Every in-app navigation replaces `<body>`.** `window`, `document`,
   `<html>` and `<head>` stay. So does the JavaScript realm: timers, frames
   and pending promises keep running across the swap.
3. **`astro:page-load` fires after every navigation, and after the first
   load.**

This file is the one strategy the clients follow. Before it was written
down, four were in use (explicit reset, persist and re-sync, no state at
all, and reset with a leaking listener), and the fourth was a defect the
other three would have prevented.

## The strategy: every visit starts from nothing

### 1. The init runs once per visit

Register `initX` on `astro:page-load` at module scope, and also call it
directly when the document has finished loading, because a module that
finishes evaluating after the router fired the event would otherwise miss
it. Guard it with `dataset.wired = '1'` on an element inside `<main>` that
the page owns. The swap replaces that element, so the guard is fresh on
every visit and the init runs exactly once per visit.

Checked, for the registration, by the self-test *Every client script
registers its init on astro:page-load at module scope*
(`clientsWithoutPageLoad`). The fallback call and the guard are not
checked.

### 2. Listeners on what the swap keeps are registered at module scope

A listener on `window`, `document`, `<html>` or `<head>` (or on anything
else that outlives the page, such as a `matchMedia()` list), and any
`setInterval`, is registered at the top level of the module and never
inside a function. Registered inside the init, it gains one registration
per visit and none is ever removed: the Risk chapter did this, and after
three return visits one click ran its selection handler four times.

Delegate instead. Resolve what was clicked from the event target, and
return early when the page's own host is not in the document.
`acronyms-client.ts` is the reference, and so is the record-selection
handler at the bottom of `fmea-client.ts`.

A page script marked `data-astro-rerun` is run again on every visit, so in
one of those even a top-level registration accumulates.

Checked by the self-test *No document or window listener is registered
inside a function* (`globalRegistrationCensus` in
`src/lib/lifecycle-check.ts`).

### 3. Page state is reset on arrival

Keep state inside the init's closure where you can; most clients hold no
module-level state at all. Where a binding has to live at module scope, the
init assigns it its starting value as a plain statement of the init's own
body (a `try` block counts), on every arrival:

- not inside a handler the init defines, which runs later or never;
- not inside a helper the init calls, which the next edit can stop calling;
- not under an `if`, which does not run on every arrival;
- not as a memo such as `if (!x) x = d`, `x = x ?? d` or `x || (x = d)`,
  which keeps the value from the last visit.

Put resets straight after the guard. The check cannot tell a `return` placed
before a reset for some other reason from the guard's own early returns, so
it will not notice one.

A module-level `debounce`, `coalesce` or `coalesceOn` is pending work, and
counts as state: cancel it in the init or in a module-scope
`astro:before-swap` handler. A module-level object written by property has
each of those properties reset in the init.

A binding that should outlive a page is declared in
`DOCUMENT_LIFETIME_STATE` in `src/lib/lifecycle-check.ts`, with the reason.
The Quality chapter's explorer view settings are the example, kept between
visits by the owner's decision of 2026-10-07: a reader who picks a
scenario, a diagram group or a phase finds it still picked on return, and
the init sets each control from it. A selection is not a view setting. The explorer's selected node
used to persist while the catalog's selection reset, and after a return
visit the two panels pointed at different parameters.

Checked by the self-test *Every client resets its page state on arrival or
declares why not* (`undeclaredPageState`). A declaration that no longer
names live state, or names state the init now resets, fails it too.

### 4. Deferred work runs only for the page that started it

A timer, a frame or a promise continuation started by a page can fire after
the page has gone, against the next page's document. Wrap the callback in
`boundToPage(host, fn)` from `src/lib/timing.ts`, passing an element the
page owns: it does nothing once that element has left the document. Two
cases of this were measured before the rule existed. A health render that
was still pending ran on the Overview. A Physical Care fetch that was still
in flight when the reader left and came back wired the returned page a
second time.

An `async` function in browser code may fetch and parse, but may not reach
the page, because the code after an `await` cannot be wrapped: it may not
name `document` or `window`, call a function declared outside it, or call a
method of or write to anything declared outside it, its own parameters and
`this` included. Continue with `.then(boundToPage(host, ...))` instead.

The checks resolve names, so an alias, a bracket access, an import under
another name or a namespace import is read for what it is. What they cannot
follow is listed at `referent()` in `src/lib/lifecycle-check.ts`: a value
stored in an object and read back, `.bind()`, and an alias made in one file
and imported by another among them.

Checked by the self-test *Deferred work in browser code runs only for the
page that started it* (`unboundDeferredWork`).

### 5. A renderer owns its host

A function that draws into an element replaces what that element holds, so
calling it twice draws the same thing once. Build the nodes and hand them to
`replaceChildren()`, which makes the clear and the draw one step, and keep
any static markup the element carries, such as a table's caption. The init's
guard makes the init run once per visit; it does not make a renderer safe to
call again, and it usually sits on a different element from the one the
renderer draws into.

There is no build check for this across every client. The Data chapter's
renderers, in `src/lib/data-render.ts`, are held to it by
`tests/lib/data-render.test.ts`, which calls each one twice on the same
element.

## Adding a client

Copy the shape of a client that holds no module state, such as
`rollout-client.ts`. If you need module state, reset it at the top of the
init, after the guard. If a check above fails, its message names the file
and the binding or the call, and the section above that it belongs to
explains why.
