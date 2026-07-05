import { useState } from "react";
import type { Mode } from "@/game/types";
import { clearScores, loadScores, type ScoreEntry } from "@/game/leaderboard";

type Filter = "all" | Mode;

const MODE_LABEL: Record<Mode, string> = {
  duo: "对战",
  solo: "练习",
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function LeaderboardModal({ onClose }: { onClose: () => void }) {
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores());
  const [filter, setFilter] = useState<Filter>("all");

  const shown = scores.filter((e) => filter === "all" || e.mode === filter);

  function handleClear() {
    if (!window.confirm("确定要清空本机所有排行榜成绩吗？此操作无法撤销。")) return;
    clearScores();
    setScores([]);
  }

  return (
    <div className="overlay-screen" onClick={onClose}>
      <div
        className="overlay-card overlay-card-wide leaderboard-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="overlay-title">🏆 排行榜</h2>
        <p className="leaderboard-note">成绩仅保存在本机</p>

        <div className="leaderboard-filters">
          {(["all", "duo", "solo"] as Filter[]).map((f) => (
            <button
              key={f}
              className={`leaderboard-filter-btn${filter === f ? " leaderboard-filter-btn-active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "全部" : MODE_LABEL[f]}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="leaderboard-empty">还没有保存的成绩</div>
        ) : (
          <ol className="leaderboard-list">
            {shown.map((e, i) => (
              <li key={e.id} className="leaderboard-item">
                <span className={`leaderboard-rank leaderboard-rank-${i + 1}`}>
                  {i + 1}
                </span>
                <span className="leaderboard-name">{e.name}</span>
                <span className="leaderboard-mode">{MODE_LABEL[e.mode]}</span>
                <span className="leaderboard-date">{formatDate(e.date)}</span>
                <span className="leaderboard-score">{e.score}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="overlay-actions">
          <button className="menu-start-btn" onClick={onClose}>
            关闭
          </button>
          {scores.length > 0 && (
            <button className="menu-secondary-btn" onClick={handleClear}>
              清空成绩
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
