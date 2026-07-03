import { useEffect, useRef } from "react";
import { COLS, ROWS, WILD, type Cell, type Pos } from "@/game/logic";
import type { Engine } from "@/game/engine";

function cellKey(p: Pos) {
  return `${p.r}-${p.c}`;
}

function useBoardPointerHandlers(
  engine: Engine,
  boardRef: React.RefObject<HTMLDivElement | null>,
) {
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
      return { r, c };
    }

    function onDown(e: PointerEvent) {
      const p = cellFromPoint(e.clientX, e.clientY);
      if (p) {
        e.preventDefault();
        engine.pointerDown(p);
      }
    }
    function onMove(e: PointerEvent) {
      if (!engine.dragging) return;
      e.preventDefault();
      const p = cellFromPoint(e.clientX, e.clientY);
      if (p) engine.pointerMove(p);
    }
    function onUp(e: PointerEvent) {
      if (!engine.dragging) return;
      e.preventDefault();
      engine.pointerUp();
    }
    boardEl.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      boardEl.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
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
}: {
  engine: Engine;
  mirror?: boolean;
  accent: "p1" | "p2";
  label: string;
}) {
  const boardRef = useRef<HTMLDivElement | null>(null);
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
        <span className="player-score">{engine.score}</span>
      </div>
      <div ref={boardRef} className="board-shake-outer">
        <div
          key={`shake-${engine.shakeToken}`}
          className={
            engine.shakeToken > 0 ? `board-shake-wrap shake-lv${engine.shakeLevel}` : "board-shake-wrap"
          }
        >
          <div className="board-grid" data-mirror={mirror}>
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
          {engine.floatText && (
            <div key={`float-${engine.floatToken}`} className="float-score">
              {engine.floatText}
            </div>
          )}
          {engine.comboText && (
            <div key={`combo-${engine.comboToken}`} className="combo-banner">
              {engine.comboText}
            </div>
          )}
        </div>
      </div>
      <ReadoutBar engine={engine} />
    </div>
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
    content = `${r.text}  → +${r.points}`;
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
