---
name: React key change silently detaches manually-attached DOM listeners
description: A changing `key` prop on an ancestor element unmounts descendants and breaks addEventListener-based refs, even for non-list elements
---

Changing a `key` prop on an element (even a singleton, non-list element used just to force a CSS animation restart, e.g. `key={`shake-${token}`}`) makes React treat it as a brand-new element identity: it unmounts the old subtree and mounts a fresh one. Any descendant DOM node that had listeners attached imperatively (e.g. via `addEventListener` in a `useEffect` keyed only on stable deps like `[engine, boardRef]`) loses those listeners silently — the effect doesn't re-run because its own dependencies didn't change, but the underlying DOM node it captured is now detached and replaced.

**Why:** This exactly caused a "works once, then unresponsive" bug in a drag-based grid game: the board's shake-wrapper used a re-keyed div to restart a CSS shake animation on every successful/failed move, which remounted the child grid div holding pointer event listeners. The first interaction worked (listeners attached at initial mount); every interaction after was silently ignored since the listener-bearing DOM node had already been discarded.

**How to apply:** Never nest an element you imperatively attach listeners to (via a ref-based `useEffect`) inside an ancestor whose `key` changes to retrigger CSS animations. Instead: (1) attach listeners on a stable ancestor that is never re-keyed and rely on event delegation (e.g. `elementFromPoint` + `closest('[data-cell]')`), or (2) restart CSS animations without remounting (toggle a class + force reflow via `el.offsetWidth`, or use the Web Animations API) instead of changing `key`.
