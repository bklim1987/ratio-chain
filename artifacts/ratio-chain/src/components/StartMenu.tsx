import { useState } from "react";
import type { Mode } from "@/game/types";
import { LeaderboardModal } from "@/components/LeaderboardModal";

const RULES: React.ReactNode[] = [
  <>
    在 <b>6×6</b> 棋盘上，沿<b>八个方向</b>（含斜向）拖动相邻数字，连成至少两对比且彼此相等的链（如
    6:9 = 8:12），至少 4 格、偶数长度，松手即消除得分
  </>,
  <>
    单次得分 = <b>全加</b>（链上所有数字之和）× <b>连比倍率</b>（段数越多越高）×{" "}
    <b>难度系数</b> × <b>连击倍率</b>
  </>,
  <>
    <b>难度系数</b>按最简比定：1:1 → ×1；1:n → ×2；m:n（m、n 均大于 1）→ ×3。越需化简、越难辨认的比越值钱
  </>,
  <>每消除一条链连击 +1，连击倍率随连击升高（最高 ×5）；数字越大、链越长，得分越高</>,
  <>约 10% 的格子为 ? 未知数，松手后从选项里选出正整数让比例成立；一次只能解 1 个 ?，答对照常计分</>,
  <>比值不相等或 ? 选错不再扣分，但<b>连击会减半</b>——保住连击才是关键</>,
  <>消除后上方数字下落填补，顶部补新数字；盘面小数字与大数字并存，挖哪种链由你自己决定</>,
  <>可选开启「提示种子」：某条可消链的起点会微微发光，帮你找突破口</>,
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
