import { useState } from "react";
import type { Mode } from "@/game/types";
import { LeaderboardModal } from "@/components/LeaderboardModal";
import { RulesOverlay } from "@/components/RulesOverlay";

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
  const [showRules, setShowRules] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

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
            <span className="menu-mode-desc">120 秒单局 · 比分高者胜</span>
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

        <div className="menu-entry-row">
          <button
            type="button"
            className="menu-rules-entry"
            onClick={() => setShowRules(true)}
          >
            📖 玩法说明
          </button>
          <button
            type="button"
            className="menu-rules-entry"
            onClick={() => setShowLeaderboard(true)}
          >
            🏆 排行榜
          </button>
        </div>
      </div>
      {showRules && <RulesOverlay onClose={() => setShowRules(false)} />}
      {showLeaderboard && (
        <LeaderboardModal onClose={() => setShowLeaderboard(false)} />
      )}
    </div>
  );
}
