export type BoardScale = 0.8 | 1;

export type DisplayPrefs = {
  boardScale: BoardScale;
  eyeCare: boolean;
};

const STORAGE_KEY = "ratio-chain-display-prefs";

const DEFAULT_PREFS: DisplayPrefs = {
  boardScale: 0.8,
  eyeCare: true,
};

export function loadDisplayPrefs(): DisplayPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<DisplayPrefs>;
    return {
      boardScale: parsed.boardScale === 1 ? 1 : 0.8,
      eyeCare: parsed.eyeCare !== false,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveDisplayPrefs(prefs: DisplayPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* quota / private mode */
  }
}
