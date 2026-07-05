import { useEffect, useRef } from "react";
import { COLS, ROWS, WILD, comboMult, formatComboMult, type Cell, type Pos } from "@/game/logic";
import type { Engine } from "@/game/engine";
import type { Mode } from "@/game/types";
import { SolveModal } from "@/components/SolveModal";

function cellKey(p: Pos) {
  return `${p.r}-${p.c}`;
}

// 触发半径：指针必须落在格心 0.42×格宽 内才算选中，避免斜向拖动误触相邻格。
// 太容易误触就调小（如 0.35），太难选中就调大。
const HIT_RADIUS_RATIO = 0.42;

function useBoardPointerHandlers(
  engine: Engine,
  boardRef: React.RefObject<HTMLDivElement | null>,
) {
  const activePointersRef = useRef(new Set<number>());

  useEffect(() => {
    const boardEl = boardRef.current;
    if (!boardEl) return;

    function cellFromPoint(x: number, y: number): Pos | null {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      const cellEl = (el as HTMLElement).closest(
        "[data-cell]",
      ) as HTMLElement | null;
      if (!cellEl || !boardEl!.contains(cellEl)) return null;
      const r = Number(cellEl.dataset.r);
      const c = Number(cellEl.dataset.c);
      if (Number.isNaN(r) || Number.isNaN(c)) return null;
      const rect = cellEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist > HIT_RADIUS_RATIO * rect.width) return null;
      return { r, c };
    }

    function onDown(e: PointerEvent) {
      if (engine.modal) return;
      const p = cellFromPoint(e.clientX, e.clientY);
      if (!p) return;
      e.preventDefault();
      activePointersRef.current.add(e.pointerId);
      try {
        boardEl!.setPointerCapture(e.pointerId);
      } catch {
        /* ignore if capture unsupported */
      }
      engine.pointerDown(p);
    }
    function onMove(e: PointerEvent) {
      if (!activePointersRef.current.has(e.pointerId)) return;
      if (!engine.dragging) return;
      e.preventDefault();
      const p = cellFromPoint(e.clientX, e.clientY);
      if (p) engine.pointerMove(p);
    }
    function onUp(e: PointerEvent) {
      if (!activePointersRef.current.delete(e.pointerId)) return;
      try {
        boardEl!.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (!engine.dragging) return;
      e.preventDefault();
      engine.pointerUp();
    }
    boardEl.addEventListener("pointerdown", onDown);
    boardEl.addEventListener("pointermove", onMove, { passive: false });
    boardEl.addEventListener("pointerup", onUp);
    boardEl.addEventListener("pointercancel", onUp);
    return () => {
      boardEl.removeEventListener("pointerdown", onDown);
      boardEl.removeEventListener("pointermove", onMove);
      boardEl.removeEventListener("pointerup", onUp);
      boardEl.removeEventListener("pointercancel", onUp);
    };
  }, [engine, boardRef]);
}

function gemColorClass(v: Cell): string {
  if (v === WILD) return "gem-wild";
  return `gem-v${v}`;
}

export function PlayerBoard({
  engine,
  mirror = false,
  accent,
  label,
  mode = "duo",
}: {
  engine: Engine;
  mirror?: boolean;
  accent: "p1" | "p2";
  label: string;
  mode?: Mode;
}) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  useBoardPointerHandlers(engine, boardRef);

  const chainSet = new Set(engine.chain.map(cellKey));
  const popSet = new Set(engine.popCells.map(cellKey));
  const badSet = new Set(engine.badCells.map(cellKey));
  const seedSet = new Set(engine.seed.map(cellKey));
  const deepSet = new Set(engine.deepCells.map(cellKey));

  const cols = Array.from({ length: COLS }, (_, i) => i);
  const rows = Array.from({ length: ROWS }, (_, i) => i);
  if (mirror) cols.reverse();

  return (
    <div className={`player-panel player-panel-${accent}`}>
      <div className="player-header">
        <span className={`player-badge player-badge-${accent}`}>{label}</span>
        <div className="player-header-stats">
          <span className={`player-combo${engine.combo > 0 ? " player-combo-active" : ""}`}>
            ⚡连击 {engine.combo}
            {engine.combo > 0 && (
              <span className="player-combo-mult">×{formatComboMult(comboMult(engine.combo))}</span>
            )}
          </span>
          <span className="player-score">{engine.score}</span>
        </div>
      </div>
      <ReadoutBar engine={engine} />
      <div ref={boardRef} className="board-shake-outer">
        <div
          key={`shake-${engine.shakeToken}`}
          className={
            engine.shakeToken > 0 ? `board-shake-wrap shake-lv${engine.shakeLevel}` : "board-shake-wrap"
          }
        >
          {engine.floatText && (
            <div
              key={`float-${engine.floatToken}`}
              className={`float-score${engine.floatText.startsWith("⚡") ? " float-score-streak" : ""}`}
            >
              {engine.floatText}
            </div>
          )}
          <div className="board-grid" data-mirror={mirror} ref={gridRef}>
            <ChainLine engine={engine} gridRef={gridRef} accent={accent} />
            {rows.map((r) =>
              cols.map((c) => {
                const v = engine.grid[r][c];
                const key = cellKey({ r, c });
                const classes = ["cell"];
                if (v == null) classes.push("cell-empty");
                if (chainSet.has(key)) classes.push("cell-selected");
                if (popSet.has(key)) classes.push("cell-pop");
                if (badSet.has(key)) classes.push("cell-bad");
                if (seedSet.has(key) && v != null) classes.push("cell-seed");
                if (deepSet.has(key) && v != null) classes.push("cell-deep");
                return (
                  <div
                    key={key}
                    data-cell="true"
                    data-r={r}
                    data-c={c}
                    className={classes.join(" ")}
                  >
                    {v != null && (
                      <div className={`gem ${gemColorClass(v)}`}>
                        {v === WILD ? "?" : v}
                      </div>
                    )}
                  </div>
                );
              }),
            )}
          </div>
          {engine.comboText && (
            <div key={`combo-${engine.comboToken}`} className="combo-banner">
              {engine.comboText}
            </div>
          )}
        </div>
      </div>
      {engine.modal && (
        <SolveModal
          vals={engine.modal.vals}
          info={engine.modal.info}
          onPick={(n) => engine.pickAnswer(n)}
          accent={accent}
          scope={mode === "duo" ? "panel" : "screen"}
        />
      )}
    </div>
  );
}

function ChainLine({
  engine,
  gridRef,
  accent,
}: {
  engine: Engine;
  gridRef: React.RefObject<HTMLDivElement | null>;
  accent: "p1" | "p2";
}) {
  const gridEl = gridRef.current;
  if (!gridEl || engine.chain.length < 2) return null;
  const gr = gridEl.getBoundingClientRect();
  if (gr.width === 0) return null;
  const pts: [number, number][] = [];
  for (const p of engine.chain) {
    const el = gridEl.querySelector(
      `[data-r="${p.r}"][data-c="${p.c}"]`,
    ) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    pts.push([
      r.left + r.width / 2 - gr.left,
      r.top + r.height / 2 - gr.top,
    ]);
  }
  const points = pts.map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <svg
      className={`chain-line chain-line-${accent}`}
      width={gr.width}
      height={gr.height}
      viewBox={`0 0 ${gr.width} ${gr.height}`}
      aria-hidden="true"
    >
      <polyline className="chain-line-stroke" points={points} />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} className="chain-line-node" />
      ))}
    </svg>
  );
}

function ReadoutBar({ engine }: { engine: Engine }) {
  const r = engine.readout;
  let content: React.ReactNode = "拖动相邻数字，组成相等的比";
  let cls = "readout-idle";
  if (r.kind === "building") {
    content = r.text;
    cls = "readout-building";
  } else if (r.kind === "ready") {
    const cm = formatComboMult(r.comboMult);
    content = `${r.text}  → +${r.points}（全加${r.fullSum}×长度${r.lm}　⚡${r.combo}×${cm}）`;
    cls = "readout-ready";
  } else if (r.kind === "invalid") {
    content = r.reason ? `${r.text}（${r.reason}）` : r.text;
    cls = "readout-invalid";
  } else if (r.kind === "unknown") {
    content = `${r.text}（含未知数 ?，松手求解）`;
    cls = "readout-unknown";
  } else if (r.kind === "flash") {
    content = r.text;
    cls = r.ok ? "readout-flash-ok" : "readout-flash-bad";
  }
  return <div className={`readout-bar ${cls}`}>{content}</div>;
}
