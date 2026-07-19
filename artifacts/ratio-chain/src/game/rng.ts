// 确定性随机源（arena 公平性用）。未 setSeed 时 rand() === Math.random()，
// 所以独立运行 / tournament 模式行为完全不变。
function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedToInt(seed: number | string | null | undefined): number {
  if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0;
  const str = String(seed ?? "");
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

let seeded: (() => number) | null = null;

/** arena 模式：注入种子后，rand() 走确定性流（人人第 N 个抽到的数值相同）。 */
export function setBoardSeed(seed: number | string): void {
  seeded = mulberry32(seedToInt(seed));
}

/** 清除种子，回落到 Math.random（独立/tournament 用）。 */
export function clearBoardSeed(): void {
  seeded = null;
}

/** 全项目棋盘生成/补格统一走这个，而不是直接 Math.random()。 */
export function rand(): number {
  return seeded ? seeded() : Math.random();
}
