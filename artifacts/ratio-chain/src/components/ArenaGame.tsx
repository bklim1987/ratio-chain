import { useCallback, useEffect, useRef, useState } from "react";
import { PlayerBoard } from "@/components/PlayerBoard";
import { Engine } from "@/game/engine";
import {
  ROUND_CONFIG,
  buildWeightedPool,
  cloneGrid,
  newBoard,
} from "@/game/logic";
import { clearBoardSeed, setBoardSeed } from "@/game/rng";
import { setMuted } from "@/game/sound";

const MANIFEST = {
  v: 1,
  gameId: "ratio-chain",
  scoreType: "points",
  scoreDirection: "desc",
  scoreFormat: "number",
  supportsInteraction: false,
  extraFields: ["bestChain"],
} as const;

type ArenaPhase = "waiting" | "playing" | "frozen";

interface PlatformTarget {
  win: WindowProxy | null;
  origin: string;
}

declare global {
  interface Window {
    __arenaBuf?: MessageEvent[];
    __arenaLive?: boolean;
  }
}

export function ArenaGame() {
  const [phase, setPhase] = useState<ArenaPhase>("waiting");
  const [initialized, setInitialized] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_CONFIG.durationSeconds);
  const [playerName, setPlayerName] = useState("玩家");
  const [, forceTick] = useState(0);

  const engineRef = useRef<Engine | null>(null);
  const platformRef = useRef<PlatformTarget>({ win: null, origin: "*" });
  const arenaModeRef = useRef<"match" | "practice">("match");
  const durationSecRef = useRef(ROUND_CONFIG.durationSeconds);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const finishSentRef = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const rerender = useCallback(() => forceTick((t) => t + 1), []);

  const postToPlatformRef = useRef((msg: Record<string, unknown>) => {
    const payload = { v: 1, ...msg };
    const { win, origin } = platformRef.current;
    const targetOrigin = origin === "null" ? "*" : origin;
    if (win) {
      win.postMessage(payload, targetOrigin);
      return;
    }
    window.parent.postMessage(payload, "*");
  });

  const onScoreDeltaRef = useRef((delta: number) => {
    if (delta === 0) return;
    postToPlatformRef.current({
      type: "arena:event",
      kind: "score",
      amount: delta,
    });
  });

  const stableOnScoreDelta = useRef((delta: number) => {
    onScoreDeltaRef.current(delta);
  }).current;

  function bestChainSegments(engine: Engine): number {
    return engine.bestChain ? engine.bestChain / 2 : 0;
  }

  function createEngine(): Engine {
    const cfg = ROUND_CONFIG;
    const pool = buildWeightedPool(cfg.weights);
    const startGrid = newBoard(pool, cfg.unknownProb);
    const engine = new Engine(
      pool,
      cfg.unknownProb,
      rerender,
      0,
      cloneGrid(startGrid),
      stableOnScoreDelta,
    );
    engine.seedOn = false;
    engine.running = false;
    engineRef.current = engine;
    return engine;
  }

  function freezeEngine() {
    const engine = engineRef.current;
    if (engine) engine.running = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setPhase("frozen");
    rerender();
  }

  function sendPracticeFinish() {
    if (finishSentRef.current || arenaModeRef.current !== "practice") return;
    finishSentRef.current = true;
    const engine = engineRef.current;
    if (!engine) return;
    engine.running = false;
    postToPlatformRef.current({
      type: "arena:finish",
      extra: {
        score: engine.score,
        bestChain: bestChainSegments(engine),
      },
    });
    freezeEngine();
  }

  const handleMessageRef = useRef((e: MessageEvent) => {
    const m = e.data;
    if (!m || typeof m !== "object" || typeof m.type !== "string") return;
    if (m.v !== 1) return;

    switch (m.type) {
      case "arena:init": {
        platformRef.current = {
          win: (e.source as WindowProxy | null) ?? null,
          origin: typeof e.origin === "string" ? e.origin : "*",
        };

        const config =
          m.config && typeof m.config === "object"
            ? (m.config as Record<string, unknown>)
            : null;
        if (config && typeof config.muted === "boolean") {
          setMuted(config.muted);
        }

        arenaModeRef.current = m.mode === "practice" ? "practice" : "match";
        finishSentRef.current = false;

        if (typeof m.playerName === "string" && m.playerName.trim()) {
          setPlayerName(m.playerName.trim());
        }

        if (m.seed != null) {
          setBoardSeed(m.seed as number | string);
        }

        createEngine();
        setInitialized(true);
        setPhase("waiting");
        setTimeLeft(ROUND_CONFIG.durationSeconds);

        postToPlatformRef.current({
          type: "arena:ready",
          manifest: MANIFEST,
        });
        rerender();
        break;
      }

      case "arena:start": {
        const serverNow =
          typeof m.serverNow === "number" ? m.serverNow : Date.now();
        const endAt = typeof m.endAt === "number" ? m.endAt : null;
        const durationSec =
          endAt != null && typeof m.serverNow === "number"
            ? Math.max(5, Math.round((endAt - serverNow) / 1000))
            : ROUND_CONFIG.durationSeconds;

        durationSecRef.current = durationSec;
        setTimeLeft(durationSec);

        const engine = engineRef.current ?? createEngine();
        engine.running = true;
        finishSentRef.current = false;
        setPhase("playing");
        rerender();
        break;
      }

      case "arena:end": {
        freezeEngine();
        break;
      }

      default:
        break;
    }
  });

  useEffect(() => {
    const listener = (ev: MessageEvent) => handleMessageRef.current(ev);
    window.addEventListener("message", listener);
    window.__arenaLive = true;
    const buffered = (window.__arenaBuf || []).splice(0);
    for (const ev of buffered) listener(ev);

    return () => {
      window.removeEventListener("message", listener);
      window.__arenaLive = false;
      clearBoardSeed();
      engineRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;

    startTimeRef.current = performance.now();
    let prevLeft = durationSecRef.current;

    function tick() {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const left = Math.max(
        0,
        durationSecRef.current - Math.floor(elapsed),
      );
      if (left !== prevLeft) prevLeft = left;
      setTimeLeft(left);

      if (left <= 0) {
        if (arenaModeRef.current === "practice") {
          sendPracticeFinish();
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  const engine = engineRef.current;

  return (
    <div
      className="game-root display-vivid"
      style={{ width: "100%", height: "100%", minHeight: "100vh" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {!initialized && (
        <div className="overlay-screen">
          <div className="overlay-card">
            <div className="in-game-title">比例消消</div>
            <p style={{ marginTop: "1rem", fontSize: "1.25rem" }}>待命中…</p>
          </div>
        </div>
      )}

      {initialized && engine && (
        <div className="game-layout game-layout-solo">
          <PlayerBoard
            engine={engine}
            accent="p1"
            label={playerName}
            mode="solo"
          />
          <div className="center-hud center-hud-solo">
            {phase === "playing" && (
              <div
                className={`hud-timer ${timeLeft <= 15 ? "hud-timer-low" : ""}`}
              >
                {timeLeft}
              </div>
            )}
            {phase === "waiting" && (
              <div className="hud-timer" style={{ opacity: 0.7 }}>
                待开赛
              </div>
            )}
          </div>
        </div>
      )}

      {phase === "frozen" && engine && (
        <div className="overlay-screen">
          <div className="overlay-card">
            <div className="in-game-title">比例消消</div>
            <p style={{ marginTop: "1rem", fontSize: "1.5rem" }}>
              本局得分：{engine.score}
            </p>
            <p style={{ marginTop: "0.5rem", opacity: 0.85 }}>
              最长链：{bestChainSegments(engine)} 段
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
