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
  /**
   * Veteran System: true when this piece has earned Veteran status via the
   * 25% proc after winning a challenge. Grants draw-immunity (same-rank clash
   * becomes a win for the veteran) but the badge is consumed on use.
   * Hidden on the board — only revealed inside the ChallengeModal.
   */
  isVeteran?: boolean;
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
  /** 0–1 chance an AI Private uses Kamikaze when it is the attacker */
  kamikazeChance: number;
};
export type BattleResolution = {
  board: Record<number, BoardPiece>;
  winner: Side | null;
  message: string;
  revealMessage: string | null;
  capturedByPlayer: string[];
  capturedByAI: string[];
};
export type FlagSwapEvent = {
  /** Tile the Flag currently occupies */
  flagTileIndex: number;
  /** Tile the chosen ally currently occupies */
  allyTileIndex: number;
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
  // ── Veteran System ──────────────────────────────────────────────────────────
  /** True when the attacker holds Veteran status entering this challenge */
  attackerIsVeteran: boolean;
  /** True when the defender holds Veteran status entering this challenge */
  defenderIsVeteran: boolean;
  /**
   * True when Veteran draw-immunity actually fired (same-rank clash where
   * exactly one side was a veteran). Used by the modal to show the
   * "Veteran's Edge" flavour text instead of the standard draw message.
   */
  veteranEdgeApplied: boolean;
};

/**
 * Intercept event shown before the ChallengeModal when the attacking Private
 * has the Kamikaze ability available and the target is NOT another Private
 * (same-rank clash is already mutual elimination — no prompt needed).
 *
 * Holds everything the KamikazeModal needs to render, plus the pre-built
 * mutual-elimination resolution so we can apply it without recomputing.
 */
export type KamikazeEvent = {
  /** Tile the Private is moving FROM */
  from: number;
  /** Tile the target piece occupies */
  to: number;
  /** Side that owns the attacking Private */
  attackerSide: Side;
  /** Short label of the Private (always "Pvt" or equivalent) */
  attackerShortLabel: string;
  /** Short label of the target piece — shown in the modal */
  defenderShortLabel: string;
  /** Full name of the target piece — shown in the modal */
  defenderName: string;
  /**
   * Pre-built BattleResolution for the mutual-elimination path.
   * Applied directly if Kamikaze is confirmed, bypassing normal combat.
   */
  kamikazeResolution: BattleResolution;
  /** The original BattleMove so we can fall through to normal combat */
  legalMove: BattleMove;
};
