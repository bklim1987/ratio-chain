# 比例消消 Ratio Chain

A classroom big-screen math game (7th grade ratio/proportion practice): drag along adjacent cells on an 8x7 board to form chains of equal ratios (e.g. 6:9 = 8:12) and clear gems, with wildcard "?" unknown-solving, hints, best-of-3 duo matches or a solo time-attack mode.

## Run & Operate

- `pnpm --filter @workspace/ratio-chain run dev` — run the game (Vite dev server)
- `pnpm --filter @workspace/ratio-chain run typecheck` — typecheck the artifact
- Frontend-only game, no backend/database/persistence required
- Workflow name in this environment: `artifacts/ratio-chain: web` (use the full composite name with `restart_workflow`, not just `web`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- React + Vite (client-only artifact, no server dependency for this app)
- Web Audio API for synthesized sound effects (no audio files)

## Where things live

- `artifacts/ratio-chain/src/game/logic.ts` — pure game algorithm: board generation/solvability (DFS-based), ratio evaluation, scoring formulas, wildcard analysis, gravity/refill
- `artifacts/ratio-chain/src/game/engine.ts` — mutable `Engine` class (one per player) driving pointer input, chain building, scoring, modals, timers
- `artifacts/ratio-chain/src/game/sound.ts` — Web Audio synth sound effects
- `artifacts/ratio-chain/src/components/` — `PlayerBoard`, `SolveModal`, `StartMenu`, `Countdown`, `ResultsScreen`
- `artifacts/ratio-chain/src/App.tsx` — top-level state machine (menu → countdown → playing → roundEnd/matchEnd), owns two `Engine` instances via refs and a pausable rAF round timer

## Architecture decisions

- Game state lives in imperative `Engine` class instances (not React state) for tight per-frame control over drag gestures and animation timers; React only re-renders via a `forceTick` callback the engine calls on changes.
- Board hit-testing uses `document.elementFromPoint` + `data-cell`/`data-r`/`data-c` attributes rather than computing grid coordinates from pointer position math, so it stays correct regardless of CSS layout/mirroring changes.
- Round timer uses `requestAnimationFrame` + wall-clock deltas (not `setInterval`) so it can be paused precisely while either player's wildcard-solve modal is open, then resume without drift.
- Board generation retries (up to 200x) until a solvable board is guaranteed via `findChainCoords`; the same check re-runs after gravity/refill so the board never becomes stuck.

## Product

- Two modes: 双人对战 (duo, best-of-3 80s rounds, side-by-side boards, mirrored second board) and 单人练习 (solo, 120s time attack).
- Drag horizontally/vertically adjacent cells to build a chain of equal ratios; releasing scores points (formula scales with chain length) or penalizes -2 for invalid/incomplete chains.
- Wildcard "?" cells trigger a solve-for-the-unknown modal with multiple-choice answers.
- Optional "seed hint" (glowing starting cells) and a deeper on-demand hint (highlights a full valid chain, at a scoring penalty).
- Heavy juice: particle-style gem pop/drop animations, screen shake scaled to chain length, floating score/combo text, synthesized sound effects.

## User preferences

_None recorded yet._

## Gotchas

- Always run `pnpm --filter @workspace/ratio-chain run typecheck` after editing `src/game/*` — the algorithm files have no runtime type safety net since this artifact has no server/tests wired in.
- Verify matching/scoring algorithm changes with a standalone `npx tsx` script importing `src/game/logic.ts` directly — e2e drag-based UI testing alone is not reliable for confirming algorithm correctness (see agent memory).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
