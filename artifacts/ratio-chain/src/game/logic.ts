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
  30: 3,
  36: 3,
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
  unknownProb: 0.08,
  durationSeconds: 120,
};

/** 全盘 ? 个数下限 / 上限（生成与补格后校正） */
export const WILD_MIN = 1;
export const WILD_MAX = 4;

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

export const COMBO_G = 0.16;
export const COMBO_CAP = 3;
export const SCORE_SCALE = 1;

export function comboMult(combo: number): number {
  return Math.min(COMBO_CAP, 1 + combo * COMBO_G);
}

export function formatComboMult(cm: number): string {
  return cm.toFixed(2);
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
  const cm = formatComboMult(comboMult(d.combo));
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

const DISTRACTOR_COUNT = 5;

function pushOneOf(candidates: number[], push: (x: number) => void) {
  const valid = candidates.filter((x) => Number.isInteger(x) && x > 0);
  if (valid.length === 0) return;
  push(valid[Math.floor(Math.random() * valid.length)]);
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
  pushOneOf([required + 10, required - 10], push);
  pushOneOf([required + 20, required - 20], push);
  if (kc != null) push(kc);
  if (kd != null) push(kd);
  push(required * 3);
  [required + 1, required - 1, required + 2, required - 2, required + 3, required - 3].forEach(
    push,
  );

  const opts = out.slice(0, DISTRACTOR_COUNT);
  let extra = required + 4;
  while (opts.length < DISTRACTOR_COUNT) {
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

function chainPathKey(chain: Pos[]): string {
  return chain.map((p) => `${p.r}-${p.c}`).join("|");
}

function chainDfsConsistent(path: number[]): boolean {
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

function isKnownChainCell(grid: Grid, r: number, c: number): boolean {
  const v = grid[r][c];
  return v != null && v !== WILD;
}

/** 枚举棋盘上所有不重复的合法链（固定邻域顺序，保证完备）。 */
function findAllChainCoords(grid: Grid, length: number): Pos[][] {
  const found: Pos[][] = [];
  const seen = new Set<string>();

  for (let sr = 0; sr < ROWS; sr++) {
    for (let sc = 0; sc < COLS; sc++) {
      if (!isKnownChainCell(grid, sr, sc)) continue;

      const used = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
      const path: number[] = [];
      const co: Pos[] = [];

      function dfs(r: number, c: number) {
        used[r][c] = true;
        path.push(grid[r][c] as number);
        co.push({ r, c });

        if (path.length % 2 === 0 && !chainDfsConsistent(path)) {
          used[r][c] = false;
          path.pop();
          co.pop();
          return;
        }

        if (path.length === length) {
          if (evaluateKnown(path)) {
            const key = chainPathKey(co);
            if (!seen.has(key)) {
              seen.add(key);
              found.push([...co]);
            }
          }
          used[r][c] = false;
          path.pop();
          co.pop();
          return;
        }

        for (const [dc, dr] of N8) {
          const nr = r + dr;
          const nc = c + dc;
          if (
            !inBounds(nr, nc) ||
            used[nr][nc] ||
            !isKnownChainCell(grid, nr, nc)
          ) {
            continue;
          }
          dfs(nr, nc);
        }

        used[r][c] = false;
        path.pop();
        co.pop();
      }

      dfs(sr, sc);
    }
  }

  return found;
}

/** 从全盘所有合法链中均匀随机选一条，避免「先搜到的那条」总在上半区。 */
export function pickRandomChainCoords(
  grid: Grid,
  length: number,
): Pos[] | null {
  const all = findAllChainCoords(grid, length);
  if (all.length === 0) return null;
  return all[Math.floor(Math.random() * all.length)];
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

function countWilds(grid: Grid): number {
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === WILD) n++;
    }
  }
  return n;
}

/** 开局：一次性生成全盘，随机指定 1～4 个 ? 位置（不做事后改写） */
function generateGridWithWildCount(pool: number[], wildCount: number): Grid {
  const positions: Pos[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) positions.push({ r, c });
  }
  shuffle(positions);
  const grid: Grid = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () =>
      pool[Math.floor(Math.random() * pool.length)],
    ),
  );
  for (let i = 0; i < wildCount; i++) {
    const p = positions[i];
    grid[p.r][p.c] = WILD;
  }
  return grid;
}

function fillRandomGrid(pool: number[], unknownProb: number): Grid {
  for (let i = 0; i < 50; i++) {
    const grid = randomGrid(pool, unknownProb);
    const n = countWilds(grid);
    if (n >= WILD_MIN && n <= WILD_MAX) return grid;
  }
  const wildCount =
    WILD_MIN + Math.floor(Math.random() * (WILD_MAX - WILD_MIN + 1));
  return generateGridWithWildCount(pool, wildCount);
}

/** 补格：只给新落入格赋值；已有格（含 ?）绝不改写 */
function assignNewRefills(
  grid: Grid,
  newRefills: Pos[],
  pool: number[],
  unknownProb: number,
  keptWildCount: number,
): void {
  const minNew = Math.max(0, WILD_MIN - keptWildCount);
  const maxNew = Math.max(0, WILD_MAX - keptWildCount);
  const slots = shuffle([...newRefills]);
  let wildRequired = minNew;
  let wildBudget = maxNew;

  for (const { r, c } of slots) {
    if (wildRequired > 0 && wildBudget > 0) {
      grid[r][c] = WILD;
      wildRequired--;
      wildBudget--;
    } else if (wildBudget > 0 && Math.random() < unknownProb) {
      grid[r][c] = WILD;
      wildBudget--;
    } else {
      grid[r][c] = pool[Math.floor(Math.random() * pool.length)];
    }
  }
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

export function newBoard(pool: number[], unknownProb: number): Grid {
  for (const spec of [START_BOARD_STRICT, START_BOARD_RELAXED]) {
    for (let tries = 0; tries < spec.maxTries; tries++) {
      const grid = fillRandomGrid(pool, unknownProb);
      if (passesStartBoardSpec(grid, spec)) return grid;
    }
  }

  let grid: Grid;
  let tries = 0;
  do {
    grid = fillRandomGrid(pool, unknownProb);
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
  const newRefills: Pos[] = [];

  for (let c = 0; c < COLS; c++) {
    const kept: { v: Cell; oldR: number }[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (next[r][c] != null) kept.push({ v: next[r][c] as Cell, oldR: r });
    }
    const need = ROWS - kept.length;
    for (let r = 0; r < ROWS; r++) {
      if (r < need) {
        drops[r][c] = r + 1;
        newRefills.push({ r, c });
      } else {
        const { v, oldR } = kept[r - need];
        next[r][c] = v;
        const fall = r - oldR;
        drops[r][c] = fall > 0 ? fall : 0;
      }
    }
  }

  const newRefillSet = new Set(newRefills.map((p) => `${p.r},${p.c}`));
  let keptWildCount = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (next[r][c] === WILD && !newRefillSet.has(`${r},${c}`)) keptWildCount++;
    }
  }
  assignNewRefills(next, newRefills, pool, unknownProb, keptWildCount);

  let t = 0;
  let filled = next;
  while (!findAnyValidChain(filled) && t++ < 20) {
    filled = fillRandomGrid(pool, unknownProb);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) drops[r][c] = 0;
    }
  }
  return { grid: filled, drops };
}

export function adjacent(a: Pos, b: Pos): boolean {
  // 切比雪夫距离：含斜向的 8 方向相邻（排除自身）。
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c)) === 1;
}
