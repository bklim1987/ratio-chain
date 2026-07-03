import type { Engine } from "@/game/engine";
import type { Mode, RoundScore } from "@/game/types";

function StatBlock({ label, engine }: { label: string; engine: Engine }) {
  const acc =
    engine.unknownAttempts > 0
      ? Math.round((engine.unknownCorrect / engine.unknownAttempts) * 100)
      : 0;
  return (
    <div className="stat-block">
      <div className="stat-block-title">{label}</div>
      <div className="stat-row">
        <span>最终得分</span>
        <strong>{engine.score}</strong>
      </div>
      <div className="stat-row">
        <span>最长链</span>
        <strong>{engine.bestChain || 0}</strong>
      </div>
      <div className="stat-row">
        <span>单次最高得分</span>
        <strong>{engine.bestPts || 0}</strong>
      </div>
      <div className="stat-row">
        <span>未知数正确率</span>
        <strong>
          {engine.unknownAttempts > 0
            ? `${acc}% (${engine.unknownCorrect}/${engine.unknownAttempts})`
            : "—"}
        </strong>
      </div>
    </div>
  );
}

export function RoundEndScreen({
  roundIndex,
  roundsWon,
  roundScores,
  onContinue,
}: {
  roundIndex: number;
  roundsWon: [number, number];
  roundScores: RoundScore[];
  onContinue: () => void;
}) {
  const last = roundScores[roundScores.length - 1];
  const winner =
    last.p1 > last.p2 ? "玩家一" : last.p2 > last.p1 ? "玩家二" : "平局";
  return (
    <div className="overlay-screen">
      <div className="overlay-card">
        <h2 className="overlay-title">第 {roundIndex + 1} 局结束</h2>
        <div className="round-result-score">
          {last.p1} : {last.p2}
        </div>
        <div className="round-result-winner">本局胜者：{winner}</div>
        <div className="round-result-tally">
          总比分 {roundsWon[0]} : {roundsWon[1]}
        </div>
        <button className="menu-start-btn" onClick={onContinue}>
          继续
        </button>
      </div>
    </div>
  );
}

export function MatchEndScreen({
  mode,
  roundsWon,
  engine1,
  engine2,
  onReplay,
  onMenu,
}: {
  mode: Mode;
  roundsWon: [number, number];
  engine1: Engine;
  engine2: Engine | null;
  onReplay: () => void;
  onMenu: () => void;
}) {
  if (mode === "solo") {
    return (
      <div className="overlay-screen">
        <div className="overlay-card">
          <h2 className="overlay-title">挑战结束</h2>
          <div className="round-result-score">{engine1.score} 分</div>
          <StatBlock label="本局统计" engine={engine1} />
          <div className="overlay-actions">
            <button className="menu-start-btn" onClick={onReplay}>
              再来一局
            </button>
            <button className="menu-secondary-btn" onClick={onMenu}>
              返回菜单
            </button>
          </div>
        </div>
      </div>
    );
  }

  const winner =
    roundsWon[0] > roundsWon[1]
      ? "玩家一"
      : roundsWon[1] > roundsWon[0]
        ? "玩家二"
        : "平局";

  return (
    <div className="overlay-screen">
      <div className="overlay-card overlay-card-wide">
        <h2 className="overlay-title">对战结束</h2>
        <div className="round-result-score">
          {roundsWon[0]} : {roundsWon[1]}
        </div>
        <div className="round-result-winner">获胜方：{winner}</div>
        <div className="results-stats-row">
          <StatBlock label="玩家一" engine={engine1} />
          {engine2 && <StatBlock label="玩家二" engine={engine2} />}
        </div>
        <div className="overlay-actions">
          <button className="menu-start-btn" onClick={onReplay}>
            再来一局
          </button>
          <button className="menu-secondary-btn" onClick={onMenu}>
            返回菜单
          </button>
        </div>
      </div>
    </div>
  );
}
