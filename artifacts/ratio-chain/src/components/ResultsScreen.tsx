import { useState } from "react";
import type { Engine } from "@/game/engine";
import type { Mode } from "@/game/types";
import { saveScore } from "@/game/leaderboard";

interface DistEntry {
  segs: number;
  count: number;
}

interface CoefEntry {
  coef: number;
  count: number;
}

interface PlayerStats {
  score: number;
  clears: number;
  bestPts: number;
  bestCombo: number;
  unkAcc: number | null;
  unkText: string;
  dist: DistEntry[];
  coefDist: CoefEntry[];
}

const COEF_LABEL: Record<number, string> = {
  1: "×1 (1:1)",
  2: "×2 (1:n)",
  3: "×3 (m:n)",
};

function statsOf(engine: Engine): PlayerStats {
  const clears = Object.values(engine.chainLengthCounts).reduce(
    (sum, n) => sum + n,
    0,
  );
  const dist = Object.entries(engine.chainLengthCounts)
    .map(([len, count]) => ({ segs: Number(len) / 2, count }))
    .sort((a, b) => a.segs - b.segs);
  const coefDist = Object.entries(engine.coefCounts)
    .map(([coef, count]) => ({ coef: Number(coef), count }))
    .sort((a, b) => a.coef - b.coef);
  const unkAcc =
    engine.unknownAttempts > 0
      ? Math.round((engine.unknownCorrect / engine.unknownAttempts) * 100)
      : null;
  const unkText =
    unkAcc === null
      ? "—"
      : `${unkAcc}% (${engine.unknownCorrect}/${engine.unknownAttempts})`;
  return {
    score: engine.score,
    clears,
    bestPts: engine.bestPts || 0,
    bestCombo: engine.bestCombo || 0,
    unkAcc,
    unkText,
    dist,
    coefDist,
  };
}

function StatBlock({ label, engine }: { label: string; engine: Engine }) {
  const s = statsOf(engine);
  return (
    <div className="stat-block">
      <div className="stat-block-title">{label}</div>
      <div className="stat-row">
        <span>最终得分</span>
        <strong>{s.score}</strong>
      </div>
      <div className="stat-row">
        <span>消除链数</span>
        <strong>{s.clears}</strong>
      </div>
      <div className="stat-row">
        <span>单次最高得分</span>
        <strong>{s.bestPts}</strong>
      </div>
      <div className="stat-row">
        <span>最高连击</span>
        <strong>{s.bestCombo}</strong>
      </div>
      <div className="stat-row">
        <span>未知数正确率</span>
        <strong>{s.unkText}</strong>
      </div>
      <div className="stat-dist">
        <span className="stat-dist-label">难度系数</span>
        {s.coefDist.length > 0 ? (
          <div className="stat-dist-tags">
            {s.coefDist.map(({ coef, count }) => (
              <span key={coef} className="stat-dist-tag">
                {COEF_LABEL[coef] ?? `×${coef}`}
                <b>×{count}</b>
              </span>
            ))}
          </div>
        ) : (
          <span className="stat-dist-empty">—</span>
        )}
      </div>
      <div className="stat-dist">
        <span className="stat-dist-label">链长分布</span>
        {s.dist.length > 0 ? (
          <div className="stat-dist-tags">
            {s.dist.map(({ segs, count }) => (
              <span key={segs} className="stat-dist-tag">
                {segs}段<b>×{count}</b>
              </span>
            ))}
          </div>
        ) : (
          <span className="stat-dist-empty">—</span>
        )}
      </div>
    </div>
  );
}

function DistCell({ dist }: { dist: DistEntry[] }) {
  if (dist.length === 0) return <span className="cmp-dist-empty">—</span>;
  return (
    <div className="cmp-dist-tags">
      {dist.map(({ segs, count }) => (
        <span key={segs} className="stat-dist-tag">
          {segs}段<b>×{count}</b>
        </span>
      ))}
    </div>
  );
}

function CoefCell({ coefDist }: { coefDist: CoefEntry[] }) {
  if (coefDist.length === 0) return <span className="cmp-dist-empty">—</span>;
  return (
    <div className="cmp-dist-tags">
      {coefDist.map(({ coef, count }) => (
        <span key={coef} className="stat-dist-tag">
          {COEF_LABEL[coef] ?? `×${coef}`}
          <b>×{count}</b>
        </span>
      ))}
    </div>
  );
}

function ComparisonTable({
  s1,
  s2,
  nameA,
  nameB,
}: {
  s1: PlayerStats;
  s2: PlayerStats;
  nameA: string;
  nameB: string;
}) {
  const rows: {
    label: string;
    v1: React.ReactNode;
    v2: React.ReactNode;
    n1: number | null;
    n2: number | null;
  }[] = [
    { label: "最终得分", v1: s1.score, v2: s2.score, n1: s1.score, n2: s2.score },
    { label: "消除链数", v1: s1.clears, v2: s2.clears, n1: s1.clears, n2: s2.clears },
    {
      label: "单次最高得分",
      v1: s1.bestPts,
      v2: s2.bestPts,
      n1: s1.bestPts,
      n2: s2.bestPts,
    },
    {
      label: "最高连击",
      v1: s1.bestCombo,
      v2: s2.bestCombo,
      n1: s1.bestCombo,
      n2: s2.bestCombo,
    },
    {
      label: "未知数正确率",
      v1: s1.unkText,
      v2: s2.unkText,
      n1: s1.unkAcc,
      n2: s2.unkAcc,
    },
  ];

  return (
    <div className="cmp-table">
      <div className="cmp-head cmp-head-p1">{nameA}</div>
      <div className="cmp-head cmp-head-mid">对比</div>
      <div className="cmp-head cmp-head-p2">{nameB}</div>
      {rows.map((row) => {
        const win1 = row.n1 != null && row.n2 != null && row.n1 > row.n2;
        const win2 = row.n1 != null && row.n2 != null && row.n2 > row.n1;
        return (
          <div key={row.label} className="cmp-row-group">
            <div className={`cmp-val cmp-val-left${win1 ? " cmp-val-win" : ""}`}>
              {row.v1}
            </div>
            <div className="cmp-label">{row.label}</div>
            <div className={`cmp-val cmp-val-right${win2 ? " cmp-val-win" : ""}`}>
              {row.v2}
            </div>
          </div>
        );
      })}
      <div className="cmp-row-group cmp-row-dist">
        <div className="cmp-val cmp-val-left">
          <CoefCell coefDist={s1.coefDist} />
        </div>
        <div className="cmp-label">难度系数</div>
        <div className="cmp-val cmp-val-right">
          <CoefCell coefDist={s2.coefDist} />
        </div>
      </div>
      <div className="cmp-row-group cmp-row-dist">
        <div className="cmp-val cmp-val-left">
          <DistCell dist={s1.dist} />
        </div>
        <div className="cmp-label">链长分布</div>
        <div className="cmp-val cmp-val-right">
          <DistCell dist={s2.dist} />
        </div>
      </div>
    </div>
  );
}

function SaveRow({
  defaultName,
  score,
  mode,
}: {
  defaultName: string;
  score: number;
  mode: Mode;
}) {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    saveScore({ name: name.trim() || defaultName, score, mode });
    setSaved(true);
  }

  return (
    <div className="save-row">
      <div className="save-row-head">
        <span className="save-row-label">{defaultName}</span>
        <span className="save-row-score">{score} 分</span>
      </div>
      <div className="save-row-controls">
        <input
          className="save-row-input"
          type="text"
          value={name}
          placeholder={defaultName}
          maxLength={16}
          disabled={saved}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className={`save-row-btn${saved ? " save-row-btn-done" : ""}`}
          onClick={handleSave}
          disabled={saved}
        >
          {saved ? "✓ 已保存" : "保存"}
        </button>
      </div>
    </div>
  );
}

function SaveScoreModal({
  mode,
  engine1,
  engine2,
  nameA,
  nameB,
  onClose,
}: {
  mode: Mode;
  engine1: Engine;
  engine2: Engine | null;
  nameA: string;
  nameB: string;
  onClose: () => void;
}) {
  return (
    <div className="overlay-screen" onClick={onClose}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="overlay-title">保存分数</h2>
        <p className="leaderboard-note">输入名字后保存，可只存一方或双方，成绩仅保存在本机</p>
        <div className="save-rows">
          <SaveRow defaultName={nameA} score={engine1.score} mode={mode} />
          {mode === "duo" && engine2 && (
            <SaveRow defaultName={nameB} score={engine2.score} mode={mode} />
          )}
        </div>
        <div className="overlay-actions">
          <button className="menu-start-btn" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </div>
  );
}

export function MatchEndScreen({
  mode,
  engine1,
  engine2,
  onReplay,
  onMenu,
  tournament = false,
  nameA = "玩家一",
  nameB = "玩家二",
}: {
  mode: Mode;
  engine1: Engine;
  engine2: Engine | null;
  onReplay: () => void;
  onMenu: () => void;
  tournament?: boolean;
  nameA?: string;
  nameB?: string;
}) {
  const [showSave, setShowSave] = useState(false);

  if (mode === "solo") {
    return (
      <div className="overlay-screen">
        <div className="overlay-card">
          <h2 className="overlay-title">挑战结束</h2>
          <div className="round-result-score">{engine1.score} 分</div>
          <StatBlock label="本局统计" engine={engine1} />
          {!tournament && (
            <div className="overlay-actions">
              <button className="menu-start-btn" onClick={onReplay}>
                再来一局
              </button>
              <button className="menu-secondary-btn" onClick={() => setShowSave(true)}>
                保存分数
              </button>
              <button className="menu-secondary-btn" onClick={onMenu}>
                返回菜单
              </button>
            </div>
          )}
        </div>
        {!tournament && showSave && (
          <SaveScoreModal
            mode={mode}
            engine1={engine1}
            engine2={null}
            nameA={nameA}
            nameB={nameB}
            onClose={() => setShowSave(false)}
          />
        )}
      </div>
    );
  }

  const s1 = engine1.score;
  const s2 = engine2?.score ?? 0;
  // 锦标赛下同分比最长链（段数），仍同分才平局；独立运行仍按分数判定。
  const c1 = engine1.bestChain ? engine1.bestChain / 2 : 0;
  const c2 = engine2?.bestChain ? engine2.bestChain / 2 : 0;
  let winner: string;
  if (s1 > s2) winner = nameA;
  else if (s2 > s1) winner = nameB;
  else if (tournament && c1 > c2) winner = nameA;
  else if (tournament && c2 > c1) winner = nameB;
  else winner = "平局";

  return (
    <div className="overlay-screen">
      <div className="overlay-card overlay-card-wide">
        <h2 className="overlay-title">对战结束</h2>
        <div className="round-result-score">
          {s1} : {s2}
        </div>
        <div className="round-result-winner">获胜方：{winner}</div>
        {engine2 && (
          <ComparisonTable
            s1={statsOf(engine1)}
            s2={statsOf(engine2)}
            nameA={nameA}
            nameB={nameB}
          />
        )}
        {!tournament && (
          <div className="overlay-actions">
            <button className="menu-start-btn" onClick={onReplay}>
              再来一局
            </button>
            <button className="menu-secondary-btn" onClick={() => setShowSave(true)}>
              保存分数
            </button>
            <button className="menu-secondary-btn" onClick={onMenu}>
              返回菜单
            </button>
          </div>
        )}
      </div>
      {!tournament && showSave && (
        <SaveScoreModal
          mode={mode}
          engine1={engine1}
          engine2={engine2}
          nameA={nameA}
          nameB={nameB}
          onClose={() => setShowSave(false)}
        />
      )}
    </div>
  );
}
