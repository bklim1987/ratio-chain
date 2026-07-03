export type Mode = "duo" | "solo";
export type Phase = "menu" | "countdown" | "playing" | "roundEnd" | "matchEnd";

export interface RoundScore {
  p1: number;
  p2: number;
}
