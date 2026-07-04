import {
  WILD,
  type Cell,
  type Grid,
  type Pos,
  type ChainAnalysis,
  type ScoreResult,
  adjacent,
  analyzeChain,
  findChainCoords,
  gravityAndRefill,
  newBoard,
  scoreKnown,
} from "./logic";
import { playCombo, playCorrect, playDrop, playFail, playSuccess, type Pan } from "./sound";

export type Readout =
  | { kind: "idle" }
  | { kind: "building"; text: string; valid: boolean }
  | { kind: "ready"; text: string; points: number }
  | { kind: "invalid"; text: string; reason?: string }
  | { kind: "unknown"; text: string }
  | { kind: "flash"; ok: boolean; text: string };

export interface ModalState {
  vals: Cell[];
  info: Extract<ChainAnalysis, { type: "unknown" }>;
}

export class Engine {
  pool: number[];
  unknownProb: number;
  grid: Grid;
  chain: Pos[] = [];
  dragging = false;
  score = 0;
  bestChain = 0;
  bestPts = 0;
  chainLengthCounts: Record<number, number> = {};
  unknownAttempts = 0;
  unknownCorrect = 0;
  seed: Pos[] = [];
  seedOn = true;
  deepCells: Pos[] = [];
  deepPenalty = false;
  deepDisabled = false;
  modal: ModalState | null = null;
  readout: Readout = { kind: "idle" };
  popCells: Pos[] = [];
  badCells: Pos[] = [];
  shakeToken = 0;
  shakeLevel = 1;
  comboText: string | null = null;
  comboToken = 0;
  floatText: string | null = null;
  floatToken = 0;
  running = true;
  paused = false;
  pan: Pan;
  private timers: number[] = [];
  private onChange: () => void;

  constructor(
    pool: number[],
    unknownProb: number,
    onChange: () => void,
    pan: Pan = 0,
  ) {
    this.pool = pool;
    this.unknownProb = unknownProb;
    this.onChange = onChange;
    this.pan = pan;
    this.grid = newBoard(pool, unknownProb);
    this.computeSeed();
  }

  private emit() {
    this.onChange();
  }

  private setTimer(fn: () => void, ms: number) {
    const id = window.setTimeout(fn, ms);
    this.timers.push(id);
    return id;
  }

  destroy() {
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers = [];
  }

  computeSeed() {
    if (!this.seedOn) {
      this.seed = [];
      return;
    }
    const ch = findChainCoords(this.grid, 4);
    this.seed = ch ? [ch[0], ch[1]] : [];
  }

  toggleSeed(on: boolean) {
    this.seedOn = on;
    this.computeSeed();
    this.emit();
  }

  hasGem(p: Pos) {
    return this.grid[p.r][p.c] != null;
  }

  pointerDown(p: Pos) {
    if (!this.running || this.paused || this.modal) return;
    if (!this.hasGem(p)) return;
    this.dragging = true;
    this.chain = [p];
    this.updateReadout();
    this.emit();
  }

  pointerMove(p: Pos) {
    if (!this.dragging) return;
    const last = this.chain[this.chain.length - 1];
    if (p.r === last.r && p.c === last.c) return;
    if (this.chain.length >= 2) {
      const prev = this.chain[this.chain.length - 2];
      if (p.r === prev.r && p.c === prev.c) {
        this.chain.pop();
        this.updateReadout();
        this.emit();
        return;
      }
    }
    if (this.chain.some((q) => q.r === p.r && q.c === p.c)) return;
    if (!adjacent(last, p) || !this.hasGem(p)) return;
    this.chain.push(p);
    this.updateReadout();
    this.emit();
  }

  pointerUp() {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.chain.length < 2) {
      this.chain = [];
      this.updateReadout();
      this.emit();
      return;
    }
    const vals = this.chain.map((p) => this.grid[p.r][p.c] as Cell);
    const info = analyzeChain(vals);
    if (info.type === "known") {
      const res = scoreKnown(vals);
      if (res) {
        this.succeed(res);
        return;
      }
      this.fail("比不相等，−2 分");
      return;
    }
    if (info.type === "unknown") {
      this.openModal(vals, info);
      return;
    }
    this.fail(info.reason || "无效链条");
  }

  private succeed(res: ScoreResult, note = "") {
    let points = res.points;
    if (this.deepPenalty) {
      points = Math.max(1, Math.round(points * 0.5));
      note += "（深提示减半）";
      this.deepPenalty = false;
    }
    this.score += points;
    this.bestChain = Math.max(this.bestChain, this.chain.length);
    this.bestPts = Math.max(this.bestPts, points);
    this.chainLengthCounts[this.chain.length] =
      (this.chainLengthCounts[this.chain.length] || 0) + 1;
    this.popCells = [...this.chain];
    this.shakeLevel = res.ratios >= 5 ? 3 : res.ratios >= 3 ? 2 : 1;
    this.shakeToken++;
    const toClear = [...this.chain];
    const clearedLen = this.chain.length;
    this.chain = [];
    this.deepCells = [];
    this.readout = {
      kind: "flash",
      ok: true,
      text: `+${points} 分 (${res.numScore}×${res.lm})${note}`,
    };
    playSuccess(res.ratios, this.pan);
    if (res.ratios >= 3) {
      this.comboText = `连比 x${res.ratios}！`;
      this.comboToken++;
      this.setTimer(() => playCombo(this.pan), 90);
    }
    this.floatText = `+${points}`;
    this.floatToken++;
    this.emit();
    this.setTimer(() => {
      toClear.forEach((p) => {
        this.grid[p.r][p.c] = null;
      });
      this.grid = gravityAndRefill(this.grid, this.pool, this.unknownProb);
      playDrop(this.pan);
      this.computeSeed();
      this.popCells = [];
      this.emit();
    }, 230);
    this.setTimer(() => {
      if (!this.dragging) this.updateReadout();
      this.emit();
    }, 1250);
    void clearedLen;
  }

  private fail(msg: string) {
    if (this.chain.length >= 2) {
      this.score = Math.max(0, this.score - 2);
      this.badCells = [...this.chain];
      this.shakeLevel = 1;
      this.shakeToken++;
      this.readout = { kind: "flash", ok: false, text: msg };
      playFail(this.pan);
      this.setTimer(() => {
        this.badCells = [];
        this.emit();
      }, 420);
      this.setTimer(() => {
        if (!this.dragging) this.updateReadout();
        this.emit();
      }, 1100);
    }
    this.chain = [];
    this.emit();
  }

  private openModal(vals: Cell[], info: Extract<ChainAnalysis, { type: "unknown" }>) {
    this.modal = { vals, info };
    this.unknownAttempts++;
    this.emit();
  }

  pickAnswer(choice: number) {
    if (!this.modal) return;
    const { vals, info } = this.modal;
    this.modal = null;
    if (choice === info.required) {
      this.unknownCorrect++;
      playCorrect(this.pan);
      const solved = [...vals];
      solved[info.idx] = info.required;
      const res = scoreKnown(solved);
      if (res) {
        this.succeed(res, "（解出未知数）");
      } else {
        this.chain = [];
        this.emit();
      }
    } else {
      this.fail("未知数选错了，−2 分");
    }
  }

  closeModalAsFail() {
    if (!this.modal) return;
    this.modal = null;
    this.fail("未作答，−2 分");
  }

  useDeepHint(): boolean {
    if (!this.running || this.paused || this.modal || this.deepDisabled) {
      return false;
    }
    const ch = findChainCoords(this.grid, 4);
    if (!ch) return false;
    this.deepCells = ch;
    this.deepPenalty = true;
    this.deepDisabled = true;
    this.emit();
    this.setTimer(() => {
      this.deepDisabled = false;
      this.emit();
    }, 2500);
    this.setTimer(() => {
      this.deepCells = [];
      if (!this.dragging) this.updateReadout();
      this.emit();
    }, 3200);
    return true;
  }

  private updateReadout() {
    if (this.chain.length === 0) {
      this.readout = { kind: "idle" };
      return;
    }
    const vals = this.chain.map((p) => this.grid[p.r][p.c] as Cell);
    const disp = vals.map((v) => (v === WILD ? "?" : v)).join(" → ");
    if (this.chain.length < 4 || this.chain.length % 2 !== 0) {
      this.readout = { kind: "building", text: disp, valid: false };
      return;
    }
    const info = analyzeChain(vals);
    if (info.type === "known") {
      const res = scoreKnown(vals);
      this.readout = res
        ? { kind: "ready", text: res.text, points: res.points }
        : { kind: "invalid", text: disp };
    } else if (info.type === "unknown") {
      this.readout = { kind: "unknown", text: disp };
    } else {
      this.readout = { kind: "invalid", text: disp, reason: info.reason };
    }
  }

  reset(pool: number[], unknownProb: number) {
    this.destroy();
    this.pool = pool;
    this.unknownProb = unknownProb;
    this.grid = newBoard(pool, unknownProb);
    this.chain = [];
    this.dragging = false;
    this.score = 0;
    this.bestChain = 0;
    this.bestPts = 0;
    this.chainLengthCounts = {};
    this.unknownAttempts = 0;
    this.unknownCorrect = 0;
    this.deepCells = [];
    this.deepPenalty = false;
    this.deepDisabled = false;
    this.modal = null;
    this.readout = { kind: "idle" };
    this.popCells = [];
    this.badCells = [];
    this.comboText = null;
    this.floatText = null;
    this.running = true;
    this.paused = false;
    this.computeSeed();
    this.emit();
  }
}
