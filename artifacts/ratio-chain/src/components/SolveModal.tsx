import { useMemo } from "react";
import { WILD, makeOptions, type ChainAnalysis, type Cell } from "@/game/logic";

export function SolveModal({
  vals,
  info,
  onPick,
  accent,
  scope = "screen",
}: {
  vals: Cell[];
  info: Extract<ChainAnalysis, { type: "unknown" }>;
  onPick: (n: number) => void;
  accent: "p1" | "p2";
  /** panel = 仅覆盖该玩家侧；screen = 全屏（单人模式） */
  scope?: "panel" | "screen";
}) {
  const options = useMemo(() => makeOptions(info), [info]);

  const pairs: string[] = [];
  for (let i = 0; i < vals.length; i += 2) {
    const a = vals[i];
    const b = vals[i + 1];
    pairs.push(`${a === WILD ? "?" : a} : ${b === WILD ? "?" : b}`);
  }

  return (
    <div
      className={`modal-overlay modal-overlay-${scope} modal-overlay-${accent}`}
    >
      <div className="modal-card">
        <h2 className="modal-title">解出未知数 ?</h2>
        <div className="modal-question">{pairs.join("  =  ")}</div>
        <div className="modal-options">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              className="modal-option-btn"
              onPointerDown={(e) => {
                e.stopPropagation();
                if (e.pointerType === "mouse" && e.button !== 0) return;
                onPick(o);
              }}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
