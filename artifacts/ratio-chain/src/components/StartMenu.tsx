import { useState } from "react";
import type { Mode } from "@/game/types";
import { LeaderboardModal } from "@/components/LeaderboardModal";

const RULES: React.ReactNode[] = [
  <>沿上下左右相邻方向拖动数字，连成两两相等的比（如 6:9 = 8:12），松手即消除得分</>,
  <>
    单次得分 = <b>全加</b>（链上所有数字之和）× <b>连比倍率</b>（段数越多越高）×{" "}
    <b>连击倍率</b> × 2
  </>,
  <>每消除一条链连击 +1，连击越高倍率越高（最高 ×5）；数字越大、链越长越值钱</>,
  <>遇到 ? 未知数，松手后从选项里选出让比例成立的正整数，选对照常计分</>,
  <>比值不相等或未知数选错不再扣分，但<b>连击会减半</b>——保住连击才是关键</>,
  <>盘面小数字与大数字并存，难度由你自己选择要挖哪种链</>,
];

function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay-screen" onClick={onClose}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="overlay-title">玩法说明</h2>
        <ol className="rules-modal-list">
          {RULES.map((rule, i) => (
            <li key={i} className="rules-modal-item">
              <span className="rules-modal-num">{i + 1}</span>
              <span className="rules-modal-text">{rule}</span>
            </li>
          ))}
        </ol>
        <button className="menu-start-btn" onClick={onClose}>
          知道了
        </button>
      </div>
    </div>
  );
}

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
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {showLeaderboard && (
        <LeaderboardModal onClose={() => setShowLeaderboard(false)} />
      )}
    </div>
  );
}
