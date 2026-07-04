import { useCallback, useEffect, useRef, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import {
  ROUND_CONFIGS,
  SOLO_CONFIG,
  buildWeightedPool,
} from "@/game/logic";
import { Engine } from "@/game/engine";
import type { Mode, Phase, RoundScore } from "@/game/types";
import { setMuted, playCountdownBeep, playGo } from "@/game/sound";
import { StartMenu } from "@/components/StartMenu";
import { Countdown } from "@/components/Countdown";
import { PlayerBoard } from "@/components/PlayerBoard";
import {
  MatchEndScreen,
  RoundEndScreen,
} from "@/components/ResultsScreen";

const queryClient = new QueryClient();

const ROUND_SECONDS = 80;
const SOLO_SECONDS = 120;
const MAX_ROUNDS = 3;

function RatioChainGame() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [mode, setMode] = useState<Mode>("duo");
  const [muted, setMutedState] = useState(false);
  const [seedOn, setSeedOn] = useState(true);
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundsWon, setRoundsWon] = useState<[number, number]>([0, 0]);
  const [roundScores, setRoundScores] = useState<RoundScore[]>([]);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [countdownVal, setCountdownVal] = useState(3);
  const [, forceTick] = useState(0);

  const engine1Ref = useRef<Engine | null>(null);
  const engine2Ref = useRef<Engine | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const totalSecondsRef = useRef(ROUND_SECONDS);

  const rerender = useCallback(() => forceTick((t) => t + 1), []);

  useEffect(() => {
    setMuted(muted);
  }, [muted]);

  function configFor(rIndex: number, m: Mode) {
    if (m === "solo") return SOLO_CONFIG;
    return ROUND_CONFIGS[Math.min(rIndex, ROUND_CONFIGS.length - 1)];
  }

  function startEngines(rIndex: number, m: Mode) {
    const cfg = configFor(rIndex, m);
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
    setRoundIndex(0);
    setRoundsWon([0, 0]);
    setRoundScores([]);
    startEngines(0, selectedMode);
    setCountdownVal(3);
    setPhase("countdown");
  }

  // countdown ticking
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdownVal <= 0) {
      playGo();
      setTimeLeft(mode === "duo" ? ROUND_SECONDS : SOLO_SECONDS);
      setPhase("playing");
      return;
    }
    playCountdownBeep();
    const t = setTimeout(() => setCountdownVal((v) => v - 1), 650);
    return () => clearTimeout(t);
  }, [phase, countdownVal, mode]);

  const endRoundRef = useRef<() => void>(() => {});
  endRoundRef.current = function endRound() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (engine1Ref.current) engine1Ref.current.running = false;
    if (engine2Ref.current) engine2Ref.current.running = false;
    if (mode === "duo" && engine1Ref.current && engine2Ref.current) {
      const s1 = engine1Ref.current.score;
      const s2 = engine2Ref.current.score;
      setRoundScores((prev) => [...prev, { p1: s1, p2: s2 }]);
      setRoundsWon((prev) => {
        const next: [number, number] = [...prev];
        if (s1 > s2) next[0]++;
        else if (s2 > s1) next[1]++;
        return next;
      });
      setPhase("roundEnd");
    } else {
      setPhase("matchEnd");
    }
    rerender();
  };

  // round timer via rAF
  useEffect(() => {
    if (phase !== "playing") return;
    totalSecondsRef.current = mode === "duo" ? ROUND_SECONDS : SOLO_SECONDS;
    startTimeRef.current = performance.now();

    function tick() {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const left = Math.max(0, totalSecondsRef.current - Math.floor(elapsed));
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

  function continueAfterRound() {
    const [w1, w2] = roundsWon;
    if (w1 >= 2 || w2 >= 2 || roundIndex >= MAX_ROUNDS - 1) {
      setPhase("matchEnd");
    } else {
      const next = roundIndex + 1;
      setRoundIndex(next);
      startEngines(next, mode);
      setCountdownVal(3);
      setPhase("countdown");
    }
  }

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
      {phase === "menu" && (
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
          <PlayerBoard engine={e1} accent="p1" label="玩家一" mode={mode} />

          {mode === "duo" && (
            <div className="center-hud">
              <div className="hud-round">
                第 {roundIndex + 1} / {MAX_ROUNDS} 局
              </div>
              <div className={`hud-timer ${timeLeft <= 10 ? "hud-timer-low" : ""}`}>
                {timeLeft}
              </div>
              <div className="hud-vs">
                <span>{e1.score}</span>
                <span>:</span>
                <span>{e2?.score ?? 0}</span>
              </div>
              <div className="hud-round-marks">
                {Array.from({ length: MAX_ROUNDS }, (_, i) => (
                  <span
                    key={`w1-${i}`}
                    className={`hud-round-mark ${i < roundsWon[0] ? "hud-round-mark-won" : ""}`}
                  />
                ))}
              </div>
              <div className="hud-round-marks">
                {Array.from({ length: MAX_ROUNDS }, (_, i) => (
                  <span
                    key={`w2-${i}`}
                    className={`hud-round-mark ${i < roundsWon[1] ? "hud-round-mark-won" : ""}`}
                  />
                ))}
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
            <PlayerBoard engine={e2} mirror accent="p2" label="玩家二" mode={mode} />
          )}
        </div>
        </>
      )}

      {phase === "roundEnd" && (
        <RoundEndScreen
          roundIndex={roundIndex}
          roundsWon={roundsWon}
          roundScores={roundScores}
          onContinue={continueAfterRound}
        />
      )}

      {phase === "matchEnd" && e1 && (
        <MatchEndScreen
          mode={mode}
          roundsWon={roundsWon}
          engine1={e1}
          engine2={mode === "duo" ? e2 : null}
          onReplay={replay}
          onMenu={backToMenu}
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
