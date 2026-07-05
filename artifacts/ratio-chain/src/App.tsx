import { useCallback, useEffect, useRef, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import {
  ROUND_CONFIG,
  buildWeightedPool,
} from "@/game/logic";
import { Engine } from "@/game/engine";
import type { Mode, Phase } from "@/game/types";
import { setMuted, playCountdownBeep, playGo } from "@/game/sound";
import { StartMenu } from "@/components/StartMenu";
import { Countdown } from "@/components/Countdown";
import { PlayerBoard } from "@/components/PlayerBoard";
import { MatchEndScreen } from "@/components/ResultsScreen";

const queryClient = new QueryClient();

const ROUND_SECONDS = ROUND_CONFIG.durationSeconds;

// ===== Tournament Hub 集成（仅当 URL 带 mode=tournament 时生效）=====
// 独立运行（无 mode 参数）时以下常量不影响任何行为。
const tournamentParams = new URLSearchParams(window.location.search);
const IS_TOURNAMENT = tournamentParams.get("mode") === "tournament";
const TOURNAMENT_MATCH_ID = tournamentParams.get("matchId") || "";
const TOURNAMENT_NAME_A = tournamentParams.get("teamA") || "玩家 A";
const TOURNAMENT_NAME_B = tournamentParams.get("teamB") || "玩家 B";

function RatioChainGame() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [mode, setMode] = useState<Mode>("duo");
  const [muted, setMutedState] = useState(false);
  const [seedOn, setSeedOn] = useState(true);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [countdownVal, setCountdownVal] = useState(3);
  const [, forceTick] = useState(0);

  const engine1Ref = useRef<Engine | null>(null);
  const engine2Ref = useRef<Engine | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const totalSecondsRef = useRef(ROUND_SECONDS);

  const rerender = useCallback(() => forceTick((t) => t + 1), []);

  const nameA = IS_TOURNAMENT ? TOURNAMENT_NAME_A : "玩家一";
  const nameB = IS_TOURNAMENT ? TOURNAMENT_NAME_B : "玩家二";

  useEffect(() => {
    setMuted(muted);
  }, [muted]);

  // 锦标赛模式：跳过首页菜单，直接进入 duo 单场决胜。
  const tournamentStartedRef = useRef(false);
  useEffect(() => {
    if (!IS_TOURNAMENT || tournamentStartedRef.current) return;
    tournamentStartedRef.current = true;
    beginMatch("duo");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEngines(m: Mode) {
    const cfg = ROUND_CONFIG;
    const pool = buildWeightedPool(cfg.weights);
    if (!engine1Ref.current) {
      engine1Ref.current = new Engine(
        pool,
        cfg.unknownProb,
        rerender,
        m === "duo" ? -1 : 0,
      );
    } else {
      engine1Ref.current.reset(pool, cfg.unknownProb);
      engine1Ref.current.pan = m === "duo" ? -1 : 0;
    }
    engine1Ref.current.seedOn = seedOn;
    engine1Ref.current.computeSeed();

    if (m === "duo") {
      if (!engine2Ref.current) {
        engine2Ref.current = new Engine(
          pool,
          cfg.unknownProb,
          rerender,
          1,
        );
      } else {
        engine2Ref.current.reset(pool, cfg.unknownProb);
        engine2Ref.current.pan = 1;
      }
      engine2Ref.current.seedOn = seedOn;
      engine2Ref.current.computeSeed();
    }
    rerender();
  }

  function beginMatch(selectedMode: Mode) {
    setMode(selectedMode);
    startEngines(selectedMode);
    setCountdownVal(3);
    setPhase("countdown");
  }

  // countdown ticking
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdownVal <= 0) {
      playGo();
      setTimeLeft(ROUND_SECONDS);
      setPhase("playing");
      return;
    }
    playCountdownBeep();
    const t = setTimeout(() => setCountdownVal((v) => v - 1), 650);
    return () => clearTimeout(t);
  }, [phase, countdownVal, mode]);

  // 单场结束时把结果回传给 Tournament Hub（仅 tournament 模式发一次）。
  // winner：先比总分，同分比最长链（段数），仍同分为 draw。
  function reportTournamentResult() {
    const e1 = engine1Ref.current;
    const e2 = engine2Ref.current;
    if (!IS_TOURNAMENT || !e1 || !e2) return;
    const scoreA = e1.score;
    const scoreB = e2.score;
    const longestChainA = e1.bestChain ? e1.bestChain / 2 : 0;
    const longestChainB = e2.bestChain ? e2.bestChain / 2 : 0;
    const accuracyA =
      e1.unknownAttempts > 0 ? e1.unknownCorrect / e1.unknownAttempts : null;
    const accuracyB =
      e2.unknownAttempts > 0 ? e2.unknownCorrect / e2.unknownAttempts : null;
    let winner: "A" | "B" | "draw";
    if (scoreA > scoreB) winner = "A";
    else if (scoreB > scoreA) winner = "B";
    else if (longestChainA > longestChainB) winner = "A";
    else if (longestChainB > longestChainA) winner = "B";
    else winner = "draw";
    window.parent.postMessage(
      {
        type: "tournamentMatchEnd",
        matchId: TOURNAMENT_MATCH_ID,
        scoreA,
        scoreB,
        winner,
        extra: { longestChainA, longestChainB, accuracyA, accuracyB },
      },
      "*",
    );
  }

  const endRoundRef = useRef<() => void>(() => {});
  endRoundRef.current = function endRound() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (engine1Ref.current) engine1Ref.current.running = false;
    if (engine2Ref.current) engine2Ref.current.running = false;
    setPhase("matchEnd");
    reportTournamentResult();
    rerender();
  };

  // round timer via rAF
  useEffect(() => {
    if (phase !== "playing") return;
    totalSecondsRef.current = ROUND_SECONDS;
    startTimeRef.current = performance.now();
    let prevLeft = totalSecondsRef.current;

    function tick() {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const left = Math.max(0, totalSecondsRef.current - Math.floor(elapsed));
      if (left !== prevLeft) {
        if (left === 3 || left === 2 || left === 1) playCountdownBeep();
        prevLeft = left;
      }
      setTimeLeft(left);
      if (left <= 0) {
        endRoundRef.current();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, mode]);

  function replay() {
    beginMatch(mode);
  }

  function backToMenu() {
    setPhase("menu");
  }

  const e1 = engine1Ref.current;
  const e2 = engine2Ref.current;

  return (
    <div
      className={`game-root ${phase === "playing" && mode === "duo" ? "game-root-bottom" : ""}`}
    >
      {phase === "menu" && !IS_TOURNAMENT && (
        <StartMenu
          onStart={beginMatch}
          muted={muted}
          onToggleMute={() => setMutedState((m) => !m)}
          seedOn={seedOn}
          onToggleSeed={() => setSeedOn((s) => !s)}
        />
      )}

      {phase === "countdown" && <Countdown value={countdownVal} />}

      {phase === "playing" && e1 && (
        <>
        {mode === "duo" && <div className="in-game-title">比例消消</div>}
        <div
          className={`game-layout ${mode === "duo" ? "game-layout-duo" : "game-layout-solo"}`}
        >
          <PlayerBoard engine={e1} accent="p1" label={nameA} mode={mode} />

          {mode === "duo" && (
            <div className="center-hud">
              <div className={`hud-timer ${timeLeft <= 10 ? "hud-timer-low" : ""}`}>
                {timeLeft}
              </div>
              <div className="hud-vs">
                <span>{e1.score}</span>
                <span>:</span>
                <span>{e2?.score ?? 0}</span>
              </div>
              <button
                className="hud-mute-btn"
                onClick={() => setMutedState((m) => !m)}
              >
                {muted ? "🔇 静音" : "🔊 音效"}
              </button>
            </div>
          )}

          {mode === "solo" && (
            <div className="center-hud center-hud-solo">
              <div className={`hud-timer ${timeLeft <= 15 ? "hud-timer-low" : ""}`}>
                {timeLeft}
              </div>
            </div>
          )}

          {mode === "duo" && e2 && (
            <PlayerBoard engine={e2} mirror accent="p2" label={nameB} mode={mode} />
          )}
        </div>
        </>
      )}

      {phase === "matchEnd" && e1 && (
        <MatchEndScreen
          mode={mode}
          engine1={e1}
          engine2={mode === "duo" ? e2 : null}
          onReplay={replay}
          onMenu={backToMenu}
          tournament={IS_TOURNAMENT}
          nameA={nameA}
          nameB={nameB}
        />
      )}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RatioChainGame} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
