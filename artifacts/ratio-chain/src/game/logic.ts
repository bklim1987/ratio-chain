export const WILD = "?" as const;
export type Cell = number | typeof WILD;
export type Grid = (Cell | null)[][];
export interface Pos {
  r: number;
  c: number;
}

export const COLS = 8;
export const ROWS = 7;

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
}

export const ROUND_CONFIGS: RoundConfig[] = [
  { weights: { 1: 6, 2: 8, 3: 8, 4: 9, 5: 7, 6: 10 }, unknownProb: 0.04 },
  {
    weights: { 1: 4, 2: 6, 3: 6, 4: 8, 5: 6, 6: 10, 8: 8, 9: 8, 10: 7, 12: 9 },
    unknownProb: 0.06,
  },
  { weights: POOL_WEIGHTS_FULL, unknownProb: 0.08 },
];

export const SOLO_CONFIG: RoundConfig = {
  weights: POOL_WEIGHTS_FULL,
  unknownProb: 0.06,
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

const N4: [number, number][] = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
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

export interface ScoreResult {
  points: number;
  numScore: number;
  ratios: number;
  lm: number;
  text: string;
}

export function scoreKnown(vals: Cell[]): ScoreResult | null {
  if (!evaluateKnown(vals)) return null;
  const pairs: [number, number][] = [];
  for (let i = 0; i < vals.length; i += 2) {
    pairs.push([vals[i] as number, vals[i + 1] as number]);
  }
  let numScore = 0;
  for (const [a, b] of pairs) numScore += Math.max(a, b);
  const ratios = pairs.length;
  const lm = lenMult(ratios);
  return {
    points: Math.max(1, Math.round(numScore * lm)),
    numScore,
    ratios,
    lm,
    text: pairs.map(([a, b]) => `${a}:${b}`).join(" = "),
  };
}

export type ChainAnalysis =
  | { type: "invalid"; reason?: string }
  | { type: "known" }
  | { type: "unknown"; idx: number; required: number; ref: [number, number] };

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
  return { type: "unknown", idx: wi, required, ref: [rp, rq] };
}

export function makeOptions(required: number, ref: [number, number]): number[] {
  const [rp, rq] = ref;
  const set = new Set<number>([required]);
  const out: number[] = [];
  const cand = [
    Math.round((required * rq) / rp),
    required * 2,
    Math.max(1, required - 1),
    required + 1,
    Math.round((required * rp) / rq),
    required + 2,
    required * 3,
    Math.max(1, Math.round(required / 2)),
  ];
  for (const x of cand) {
    if (Number.isInteger(x) && x > 0 && !set.has(x)) {
      set.add(x);
      out.push(x);
    }
    if (out.length >= 3) break;
  }
  let extra = required + 3;
  while (out.length < 3) {
    if (!set.has(extra)) {
      set.add(extra);
      out.push(extra);
    }
    extra++;
  }
  return shuffle([required, ...out]);
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
      for (const [dc, dr] of shuffle(N4)) {
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

export function newBoard(pool: number[], unknownProb: number): Grid {
  let grid: Grid;
  let tries = 0;
  do {
    grid = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => randVal(pool, unknownProb)),
    );
    tries++;
  } while (!findAnyValidChain(grid) && tries < 200);
  return grid;
}

export function gravityAndRefill(
  grid: Grid,
  pool: number[],
  unknownProb: number,
): Grid {
  const next: Grid = grid.map((row) => [...row]);
  for (let c = 0; c < COLS; c++) {
    const kept: Cell[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (next[r][c] != null) kept.push(next[r][c] as Cell);
    }
    const need = ROWS - kept.length;
    const col: Cell[] = [];
    for (let i = 0; i < need; i++) col.push(randVal(pool, unknownProb));
    for (const v of kept) col.push(v);
    for (let r = 0; r < ROWS; r++) next[r][c] = col[r];
  }
  let t = 0;
  while (!findAnyValidChain(next) && t++ < 20) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) next[r][c] = randVal(pool, unknownProb);
    }
  }
  return next;
}

export function adjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}
