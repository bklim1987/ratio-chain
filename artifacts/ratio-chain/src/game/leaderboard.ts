import type { Mode } from "./types";

export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
  mode: Mode;
  date: number;
}

const STORAGE_KEY = "ratio-chain-scores";
const MAX_ENTRIES = 100;

export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return (arr as ScoreEntry[]).filter(
      (e) => e && typeof e.name === "string" && typeof e.score === "number",
    );
  } catch {
    return [];
  }
}

export function saveScore(entry: Omit<ScoreEntry, "id" | "date">): ScoreEntry {
  const full: ScoreEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: Date.now(),
  };
  const all = loadScores();
  all.push(full);
  all.sort((a, b) => b.score - a.score);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, MAX_ENTRIES)));
  } catch {
    /* 忽略写入失败（如隐私模式/配额） */
  }
  return full;
}

export function clearScores(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 忽略 */
  }
}
