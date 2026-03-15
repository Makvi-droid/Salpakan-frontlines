// ─── Domain types ────────────────────────────────────────────────────────────

export type Difficulty = "easy" | "medium" | "hard";
export type Side = "player" | "ai";
export type Phase = "formation" | "battle" | "ended";

export type PieceDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  initialCount: number;
};

export type BoardPiece = {
  side: Side;
  pieceId: string;
  revealedToPlayer: boolean;
  revealedToAI: boolean;
};

export type BattleMove = {
  side: Side;
  from: number;
  to: number;
};

export type MoveScoreWeights = {
  capture: number;
  advancement: number;
  center: number;
  support: number;
  threat: number;
  reveal: number;
};

export type AIProfile = {
  label: string;
  flavor: string;
  opening: "easy" | "medium" | "hard";
  randomness: number;
  topSlice: number;
  blunderFloor: number;
  weights: MoveScoreWeights;
};

export type BattleResolution = {
  board: Record<number, BoardPiece>;
  winner: Side | null;
  message: string;
  revealMessage: string | null;
  capturedByPlayer: string[];
  capturedByAI: string[];
};
