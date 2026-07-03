import { useState } from "react";
import type { Mode } from "@/game/types";

export function StartMenu({
  onStart,
  muted,
  onToggleMute,
  seedOn,
  onToggleSeed,
}: {
  onStart: (mode: Mode) => void;
  muted: boolean;
  onToggleMute: () => void;
  seedOn: boolean;
  onToggleSeed: () => void;
}) {
  const [mode, setMode] = useState<Mode>("duo");

  return (
    <div className="menu-screen">
      <div className="menu-card">
        <h1 className="menu-title">比例消消</h1>
        <p className="menu-subtitle">Ratio Chain · 连一连，比一比</p>

        <div className="menu-mode-select">
          <button
            className={`menu-mode-btn ${mode === "duo" ? "menu-mode-btn-active" : ""}`}
            onClick={() => setMode("duo")}
          >
            <span className="menu-mode-icon">⚔️</span>
            双人对战
            <span className="menu-mode-desc">80 秒 × 三局两胜</span>
          </button>
          <button
            className={`menu-mode-btn ${mode === "solo" ? "menu-mode-btn-active" : ""}`}
            onClick={() => setMode("solo")}
          >
            <span className="menu-mode-icon">🎯</span>
            单人练习
            <span className="menu-mode-desc">120 秒挑战最高分</span>
          </button>
        </div>

        <div className="menu-toggles">
          <label className="menu-toggle">
            <input
              type="checkbox"
              checked={seedOn}
              onChange={onToggleSeed}
            />
            提示种子（微光起点）
          </label>
          <label className="menu-toggle">
            <input type="checkbox" checked={!muted} onChange={onToggleMute} />
            开启音效
          </label>
        </div>

        <button className="menu-start-btn" onClick={() => onStart(mode)}>
          开始游戏
        </button>

        <div className="menu-rules">
          <div className="menu-rules-title">玩法说明</div>
          <ul>
            <li>沿上下左右相邻方向拖动数字，组成两两相等的比（如 6:9 = 8:12）</li>
            <li>比值不相等或链条太短会判定失败，扣 2 分</li>
            <li>遇到 ? 号宝石代表未知数，松手后需要选出正确答案</li>
            <li>连出 3 组以上的比会触发连击奖励</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
