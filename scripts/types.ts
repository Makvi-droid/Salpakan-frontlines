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

export type PieceUpgradeId = "iron-veil" | "double-blind" | "martyrs-eye";

export type BoardPiece = {
  side: Side;
  pieceId: string;
  revealedToPlayer: boolean;
  revealedToAI: boolean;
  upgrade?: PieceUpgradeId;
  /** Player has confirmed this piece has Iron Veil via challenge reveal */
  ironVeilKnownToPlayer?: boolean;
  /** Remaining challenge activations for challenge-limited upgrades */
  upgradeCharges?: number;
  /** Permanently visible to player due to Martyr's Eye mark */
  markedByPlayer?: boolean;
  /** Permanently visible to AI due to Martyr's Eye mark */
  markedByAI?: boolean;
  /** Board decoy label shown to player for marked Double-Blind pieces */
  decoyShortLabelForPlayer?: string;
  /** Board decoy label shown to AI for marked Double-Blind pieces */
  decoyShortLabelForAI?: string;
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

/**
 * Carries everything the ChallengeModal needs to animate and display,
 * plus the pre-computed resolution that gets applied once dismissed.
 */
export type ChallengeEvent = {
  from: number;
  to: number;
  /** Who initiated the challenge */
  attackerSide: Side;
  attackerPieceId: string;
  attackerName: string;
  attackerShortLabel: string;
  defenderSide: Side;
  defenderPieceId: string;
  defenderName: string;
  defenderShortLabel: string;
  attackerUpgrade?: PieceUpgradeId;
  defenderUpgrade?: PieceUpgradeId;
  /** Optional decoy short label shown to player (Double-Blind) */
  attackerDecoyShortLabelForPlayer?: string;
  /** Optional decoy short label shown to player (Double-Blind) */
  defenderDecoyShortLabelForPlayer?: string;
  /** If true, this rank stays hidden to the player in challenge reveal */
  attackerHiddenFromPlayer: boolean;
  /** If true, this rank stays hidden to the player in challenge reveal */
  defenderHiddenFromPlayer: boolean;
  /** outcome > 0 attacker wins, < 0 defender wins, 0 draw */
  outcome: number;
  /** The fully resolved board/state, applied when modal is dismissed */
  resolution: BattleResolution;
};
