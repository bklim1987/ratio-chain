---
name: Testing drag/canvas games with runTest
description: Reliability caveats when using the Playwright-based testing subagent to verify drag-to-match grid games
---

Simulated mouse-drag gestures (mousedown/move/up via Playwright) against a grid-based drag-to-match game (e.g. candy-crush style) are unreliable as a sole verification method. Multiple test runs against the same working code produced inconsistent results — some runs correctly detected a score increase after a valid drag, others reported "score stuck at 0" when the chosen cell path was actually invalid (e.g. it picked a non-matching adjacent cell) or when the subagent misread a transient floating "+N" score popup as the persistent score element.

**Why:** Grid-hit-testing via `elementFromPoint` plus a `pointermove`-driven drag depends on the exact path of intermediate coordinates chosen by the test agent, and random/heuristic path choices frequently do not satisfy the game's win condition (e.g. equal-ratio chain), which is indistinguishable from a genuine UI bug without deeper verification.

**How to apply:** For algorithmic correctness of matching/scoring logic, write a standalone script (e.g. via `npx tsx` importing the game-logic module directly) to unit-test core functions (board generation solvability, scoring, chain validation) instead of relying only on e2e drag simulation. Use e2e testing to confirm the overall flow (menu → countdown → gameplay → results, no console errors, layout) and cross-check with at least 2 independent drag attempts before concluding a UI bug exists.
