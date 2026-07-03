import { useMemo } from "react";
import { WILD, makeOptions, type ChainAnalysis, type Cell } from "@/game/logic";

export function SolveModal({
  vals,
  info,
  onPick,
  accent,
}: {
  vals: Cell[];
  info: Extract<ChainAnalysis, { type: "unknown" }>;
  onPick: (n: number) => void;
  accent: "p1" | "p2";
}) {
  const options = useMemo(
    () => makeOptions(info.required, info.ref),
    [info.required, info.ref],
  );

  const pairs: string[] = [];
  for (let i = 0; i < vals.length; i += 2) {
    const a = vals[i];
    const b = vals[i + 1];
    pairs.push(`${a === WILD ? "?" : a} : ${b === WILD ? "?" : b}`);
  }

  return (
    <div className={`modal-overlay modal-overlay-${accent}`}>
      <div className="modal-card">
        <h2 className="modal-title">解出未知数 ?</h2>
        <div className="modal-question">{pairs.join("  =  ")}</div>
        <div className="modal-options">
          {options.map((o) => (
            <button
              key={o}
              className="modal-option-btn"
              onClick={() => onPick(o)}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
