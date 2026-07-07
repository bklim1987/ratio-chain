export const WILD = "?" as const;
export type Cell = number | typeof WILD;
export type Grid = (Cell | null)[][];
export interface Pos {
  r: number;
  c: number;
}

export const COLS = 6;
export const ROWS = 6;

export const POOL_WEIGHTS_FULL: Record<number, number> = {
  1: 5,
  2: 7,
  3: 7,
  4: 8,
  5: 6,
  6: 10,
  8: 6,
  9: 6,
  10: 7,
  12: 9,
  15: 5,
  18: 7,
  20: 5,
  24: 6,
  36: 6,
};

export interface RoundConfig {
  weights: Record<number, number>;
  unknownProb: number;
  durationSeconds: number;
}

// 单一回合配置：整局同一个混合池（小到大数字并存），难度由玩家自选挖哪种链体现。
// 双人对战每一侧、练习模式（单人）都从这一份配置读取，杜绝两处漂移。
export const ROUND_CONFIG: RoundConfig = {
  weights: POOL_WEIGHTS_FULL,
  unknownProb: 0.1,
  durationSeconds: 120,
};

export function buildWeightedPool(weights: Record<number, number>): number[] {
  const arr: number[] = [];
  for (const [n, w] of Object.entries(weights)) {
    for (let i = 0; i < w; i++) arr.push(Number(n));
  }
  return arr;
}

export function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 8 邻域（含斜向），用于找链（提示/保底）的深度优先搜索。
const N8: [number, number][] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

export function randVal(pool: number[], unknownProb: number): Cell {
  return Math.random() < unknownProb
    ? WILD
    : pool[Math.floor(Math.random() * pool.length)];
}

export function evaluateKnown(vals: Cell[]): boolean {
  if (vals.length < 4 || vals.length % 2 !== 0) return false;
  let ref: string | null = null;
  for (let i = 0; i < vals.length; i += 2) {
    const a = vals[i];
    const b = vals[i + 1];
    if (a === WILD || b === WILD || a == null || b == null) return false;
    const g = gcd(a as number, b as number);
    const key = `${(a as number) / g}:${(b as number) / g}`;
    if (ref == null) ref = key;
    else if (ref !== key) return false;
  }
  return ref != null;
}

const LEN_MULT: Record<number, number> = { 2: 1, 3: 2, 4: 3.5, 5: 5 };
export function lenMult(ratios: number): number {
  return LEN_MULT[ratios] ?? 7 + (ratios - 6) * 2;
}

export const COMBO_G = 0.12;
export const COMBO_CAP = 5;
export const SCORE_SCALE = 1;

export function comboMult(combo: number): number {
  return Math.min(COMBO_CAP, 1 + combo * COMBO_G);
}

export function formatComboMult(cm: number): string {
  return cm % 1 === 0 ? String(cm) : cm.toFixed(2);
}

// 难度系数（混合规则）：最简比形状 + m:n 需 ≥3 个不同数字才 ×3。
// 1:1→×1；1:n→×2；m:n 且 distinct≥3→×3；m:n 但仅重复同一对（2 个数）→×2。
export function ratioTier(
  a: number,
  b: number,
  vals: number[],
): { coef: number; simp: string } {
  const g = gcd(a, b);
  const p = a / g;
  const q = b / g;
  let coef: number;
  if (p === 1 && q === 1) coef = 1;
  else if (p === 1 || q === 1) coef = 2;
  else coef = new Set(vals).size >= 3 ? 3 : 2;
  return { coef, simp: `${p}:${q}` };
}

export interface BestPtsDetail {
  text: string;
  points: number;
  fullSum: number;
  lm: number;
  coef: number;
  simp: string;
  combo: number;
  comboMult: number;
  deepHalved: boolean;
}

export function formatBestPtsFormula(d: BestPtsDetail): string {
  const cm = formatComboMult(d.comboMult);
  let s = `全加${d.fullSum} × 长度${d.lm} × 难度${d.coef}(${d.simp}) × 连击${cm}`;
  if (d.deepHalved) s += " × 0.5（深提示减半）";
  return `${s} = ${d.points}`;
}

export interface ScoreResult {
  points: number;
  fullSum: number;
  ratios: number;
  lm: number;
  coef: number;
  simp: string;
  combo: number;
  comboMult: number;
  text: string;
}

export function scoreKnown(vals: Cell[], combo = 0): ScoreResult | null {
  if (!evaluateKnown(vals)) return null;
  const pairs: [number, number][] = [];
  for (let i = 0; i < vals.length; i += 2) {
    pairs.push([vals[i] as number, vals[i + 1] as number]);
  }
  let fullSum = 0;
  for (const v of vals) fullSum += v as number;
  const ratios = pairs.length;
  const lm = lenMult(ratios);
  const cm = comboMult(combo);
  const [a0, b0] = pairs[0];
  const nums = vals.map((v) => v as number);
  const { coef, simp } = ratioTier(a0, b0, nums);
  return {
    points: Math.max(1, Math.round(fullSum * lm * coef * cm * SCORE_SCALE)),
    fullSum,
    ratios,
    lm,
    coef,
    simp,
    combo,
    comboMult: cm,
    text: pairs.map(([a, b]) => `${a}:${b}`).join(" = "),
  };
}

export type UnknownChainInfo = {
  type: "unknown";
  idx: number;
  required: number;
  ref: [number, number];
  unkSide: "left" | "right";
  partner: number;
  kc: number | null;
  kd: number | null;
};

export type ChainAnalysis =
  | { type: "invalid"; reason?: string }
  | { type: "known" }
  | UnknownChainInfo;

export function analyzeChain(vals: Cell[]): ChainAnalysis {
  if (vals.length < 4 || vals.length % 2 !== 0) return { type: "invalid" };
  const wilds: number[] = [];
  vals.forEach((v, i) => {
    if (v === WILD) wilds.push(i);
  });
  if (wilds.length === 0) return { type: "known" };
  if (wilds.length > 1) {
    return { type: "invalid", reason: "一次只能解 1 个未知数" };
  }
  const pairs: [Cell, Cell][] = [];
  for (let i = 0; i < vals.length; i += 2) pairs.push([vals[i], vals[i + 1]]);
  let ref: string | null = null;
  for (const [a, b] of pairs) {
    if (a === WILD || b === WILD) continue;
    const g = gcd(a as number, b as number);
    const key = `${(a as number) / g}:${(b as number) / g}`;
    if (ref == null) ref = key;
    else if (ref !== key) return { type: "invalid", reason: "已知的比不相等" };
  }
  if (ref == null) return { type: "invalid", reason: "需至少一组已知的比" };
  const [rp, rq] = ref.split(":").map(Number);
  const wi = wilds[0];
  const pi = Math.floor(wi / 2);
  const [a, b] = pairs[pi];
  let required: number;
  if (a === WILD) {
    if (((b as number) * rp) % rq !== 0) {
      return { type: "invalid", reason: "这里填不出整数" };
    }
    required = ((b as number) * rp) / rq;
  } else {
    if (((a as number) * rq) % rp !== 0) {
      return { type: "invalid", reason: "这里填不出整数" };
    }
    required = ((a as number) * rq) / rp;
  }
  if (required <= 0) return { type: "invalid", reason: "填不出正整数" };

  const unkSide: "left" | "right" = a === WILD ? "left" : "right";
  const partner = (a === WILD ? b : a) as number;
  let kc: number | null = null;
  let kd: number | null = null;
  for (const [pa, pb] of pairs) {
    if (pa !== WILD && pb !== WILD) {
      kc = pa as number;
      kd = pb as number;
      break;
    }
  }

  return {
    type: "unknown",
    idx: wi,
    required,
    ref: [rp, rq],
    unkSide,
    partner,
    kc,
    kd,
  };
}

export function makeOptions(info: UnknownChainInfo): number[] {
  const { required, ref, unkSide, partner, kc, kd } = info;
  const [rp, rq] = ref;
  const set = new Set<number>([required]);
  const out: number[] = [];
  const push = (x: number) => {
    if (Number.isInteger(x) && x > 0 && !set.has(x)) {
      set.add(x);
      out.push(x);
    }
  };

  const delta = kc != null && kd != null ? kd - kc : 0;
  push(unkSide === "left" ? partner - delta : partner + delta);
  push(unkSide === "left" ? (partner * rq) / rp : (partner * rp) / rq);
  push(required * 2);
  push(Math.round(required / 2));
  push(partner);
  [required + 1, required - 1, required + 2, required - 2].forEach(push);

  const opts = out.slice(0, 3);
  let extra = required + 3;
  while (opts.length < 3) {
    if (extra > 0 && !set.has(extra)) {
      set.add(extra);
      opts.push(extra);
    }
    extra++;
  }
  return shuffle([required, ...opts]);
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

export function findChainCoords(grid: Grid, length: number): Pos[] | null {
  const order: Pos[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) order.push({ r, c });
  }
  shuffle(order);
  const used = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const path: number[] = [];
  const co: Pos[] = [];

  function consistent(): boolean {
    let ref: string | null = null;
    for (let i = 0; i + 1 < path.length; i += 2) {
      const a = path[i];
      const b = path[i + 1];
      const g = gcd(a, b);
      const key = `${a / g}:${b / g}`;
      if (ref == null) ref = key;
      else if (ref !== key) return false;
    }
    return true;
  }
  function ok(r: number, c: number) {
    const v = grid[r][c];
    return v != null && v !== WILD;
  }
  function dfs(r: number, c: number): Pos[] | null {
    used[r][c] = true;
    path.push(grid[r][c] as number);
    co.push({ r, c });
    if (path.length % 2 === 0 && !consistent()) {
      used[r][c] = false;
      path.pop();
      co.pop();
      return null;
    }
    if (path.length === length && evaluateKnown(path)) {
      const res = [...co];
      used[r][c] = false;
      path.pop();
      co.pop();
      return res;
    }
    if (path.length < length) {
      for (const [dc, dr] of shuffle(N8)) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc) || used[nr][nc] || !ok(nr, nc)) continue;
        const g = dfs(nr, nc);
        if (g) {
          used[r][c] = false;
          path.pop();
          co.pop();
          return g;
        }
      }
    }
    used[r][c] = false;
    path.pop();
    co.pop();
    return null;
  }
  for (const { r, c } of order) {
    if (!ok(r, c)) continue;
    const g = dfs(r, c);
    if (g) return g;
  }
  return null;
}

export function findAnyValidChain(grid: Grid): boolean {
  return !!findChainCoords(grid, 4);
}

function isKnownCell(grid: Grid, r: number, c: number): boolean {
  const v = grid[r][c];
  return v != null && v !== WILD;
}

function findChainFromCell(
  grid: Grid,
  sr: number,
  sc: number,
  length: number,
): Pos[] | null {
  if (!isKnownCell(grid, sr, sc)) return null;
  const used = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const path: number[] = [];
  const co: Pos[] = [];

  function consistent(): boolean {
    let ref: string | null = null;
    for (let i = 0; i + 1 < path.length; i += 2) {
      const a = path[i];
      const b = path[i + 1];
      const g = gcd(a, b);
      const key = `${a / g}:${b / g}`;
      if (ref == null) ref = key;
      else if (ref !== key) return false;
    }
    return true;
  }

  function dfs(r: number, c: number): Pos[] | null {
    used[r][c] = true;
    path.push(grid[r][c] as number);
    co.push({ r, c });
    if (path.length % 2 === 0 && !consistent()) {
      used[r][c] = false;
      path.pop();
      co.pop();
      return null;
    }
    if (path.length === length && evaluateKnown(path)) {
      const res = [...co];
      used[r][c] = false;
      path.pop();
      co.pop();
      return res;
    }
    if (path.length < length) {
      for (const [dc, dr] of shuffle(N8)) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc) || used[nr][nc] || !isKnownCell(grid, nr, nc)) {
          continue;
        }
        const g = dfs(nr, nc);
        if (g) {
          used[r][c] = false;
          path.pop();
          co.pop();
          return g;
        }
      }
    }
    used[r][c] = false;
    path.pop();
    co.pop();
    return null;
  }

  return dfs(sr, sc);
}

function boardRichness(grid: Grid): number {
  let total = 0;
  let canStart = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!isKnownCell(grid, r, c)) continue;
      total++;
      if (findChainFromCell(grid, r, c, 4)) canStart++;
    }
  }
  return total === 0 ? 0 : canStart / total;
}

function chainBaseScore(vals: number[]): number {
  if (!evaluateKnown(vals)) return 0;
  let fullSum = 0;
  for (const v of vals) fullSum += v;
  const ratios = vals.length / 2;
  const lm = lenMult(ratios);
  const { coef } = ratioTier(vals[0], vals[1], vals);
  return fullSum * lm * coef;
}

const CHAIN_SAMPLE_LENGTHS = [8, 6, 4];
const CHAIN_SAMPLE_COUNT = 30;

function sampleFattestChainBase(grid: Grid): number {
  let maxBase = 0;
  for (let i = 0; i < CHAIN_SAMPLE_COUNT; i++) {
    let chain: Pos[] | null = null;
    for (const len of CHAIN_SAMPLE_LENGTHS) {
      chain = findChainCoords(grid, len);
      if (chain) break;
    }
    if (!chain) continue;
    const vals = chain.map((p) => grid[p.r][p.c] as number);
    maxBase = Math.max(maxBase, chainBaseScore(vals));
  }
  return maxBase;
}

interface StartBoardSpec {
  richnessMin: number;
  baseMin: number;
  baseMax: number;
  maxTries: number;
}

const START_BOARD_STRICT: StartBoardSpec = {
  richnessMin: 0.65,
  baseMin: 600,
  baseMax: 900,
  maxTries: 30,
};

const START_BOARD_RELAXED: StartBoardSpec = {
  richnessMin: 0.6,
  baseMin: 500,
  baseMax: 1000,
  maxTries: 30,
};

function passesStartBoardSpec(grid: Grid, spec: StartBoardSpec): boolean {
  if (!findAnyValidChain(grid)) return false;
  if (boardRichness(grid) < spec.richnessMin) return false;
  const base = sampleFattestChainBase(grid);
  return base >= spec.baseMin && base <= spec.baseMax;
}

function randomGrid(pool: number[], unknownProb: number): Grid {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => randVal(pool, unknownProb)),
  );
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

export function newBoard(pool: number[], unknownProb: number): Grid {
  for (const spec of [START_BOARD_STRICT, START_BOARD_RELAXED]) {
    for (let tries = 0; tries < spec.maxTries; tries++) {
      const grid = randomGrid(pool, unknownProb);
      if (passesStartBoardSpec(grid, spec)) return grid;
    }
  }

  let grid: Grid;
  let tries = 0;
  do {
    grid = randomGrid(pool, unknownProb);
    tries++;
  } while (!findAnyValidChain(grid) && tries < 200);
  return grid;
}

export function gravityAndRefill(
  grid: Grid,
  pool: number[],
  unknownProb: number,
): { grid: Grid; drops: number[][] } {
  const next: Grid = grid.map((row) => [...row]);
  const drops = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

  for (let c = 0; c < COLS; c++) {
    const kept: { v: Cell; oldR: number }[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (next[r][c] != null) kept.push({ v: next[r][c] as Cell, oldR: r });
    }
    const need = ROWS - kept.length;
    for (let r = 0; r < ROWS; r++) {
      if (r < need) {
        next[r][c] = randVal(pool, unknownProb);
        // 顶部新数字：从棋盘上方逐行落入
        drops[r][c] = r + 1;
      } else {
        const { v, oldR } = kept[r - need];
        next[r][c] = v;
        const fall = r - oldR;
        drops[r][c] = fall > 0 ? fall : 0;
      }
    }
  }

  let t = 0;
  while (!findAnyValidChain(next) && t++ < 20) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        next[r][c] = randVal(pool, unknownProb);
        drops[r][c] = 0;
      }
    }
  }
  return { grid: next, drops };
}

export function adjacent(a: Pos, b: Pos): boolean {
  // 切比雪夫距离：含斜向的 8 方向相邻（排除自身）。
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c)) === 1;
}
