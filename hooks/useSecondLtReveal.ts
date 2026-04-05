import { useCallback, useState } from "react";
import { PIECE_STRENGTH_BY_LABEL } from "../constants/constants";
import type { BoardPiece, PieceDefinition } from "../scripts/types";

/**
 * useSecondLtReveal
 *
 * Ability: "Field Assessment"
 *  - Player selects the 2nd Lieutenant, activates the ability, then taps
 *    ANY enemy piece on the board.
 *  - A modal reveals whether that piece is:
 *      • "STRONGER" — higher strength than the 2nd Lieutenant (strength > 4)
 *      • "WEAKER"   — lower strength than the 2nd Lieutenant (strength < 4)
 *    NOTE: Equal rank (another 2nd Lt, strength === 4) is not possible in
 *    practice because there is only one 2nd Lt per side, but if it ever
 *    occurs it is treated as "STRONGER" for safety (err on caution).
 *  - Using the ability CONSUMES the player's turn (turn passes to AI after
 *    the modal is dismissed).
 *  - Cooldown: 5 minutes (300 000 ms).
 */

export const SECOND_LT_REVEAL_COOLDOWN_MS = 5 * 60 * 1_000;

/** Strength of the 2nd Lieutenant — used as the comparison baseline. */
const SECOND_LT_STRENGTH = PIECE_STRENGTH_BY_LABEL["2nd Lt"]; // 4

// ─── Result type ──────────────────────────────────────────────────────────────

export type StrengthComparison = "stronger" | "weaker";

export interface SecondLtRevealResult {
  /** Which tile was tapped (for any optional board glow) */
  tileIndex: number;
  /** Whether the tapped piece outranks or is outranked by the 2nd Lt */
  comparison: StrengthComparison;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseSecondLtRevealOptions {
  pieceById: Record<string, PieceDefinition>;
}

export function useSecondLtReveal({ pieceById }: UseSecondLtRevealOptions) {
  // ── Active flag ───────────────────────────────────────────────────────────
  const [secondLtRevealActive, setSecondLtRevealActive] = useState(false);

  // ── Modal payload ─────────────────────────────────────────────────────────
  const [pendingSecondLtReveal, setPendingSecondLtReveal] =
    useState<SecondLtRevealResult | null>(null);

  // ── Cooldown ──────────────────────────────────────────────────────────────
  const [playerCooldownUntil, setPlayerCooldownUntil] = useState<number | null>(
    null,
  );

  // ── Piece helper ──────────────────────────────────────────────────────────

  /** True when the given board piece is the player's 2nd Lieutenant. */
  const isPlayerSecondLtPiece = useCallback(
    (piece: BoardPiece): boolean =>
      piece.side === "player" &&
      pieceById[piece.pieceId]?.label === "2nd Lt",
    [pieceById],
  );

  // ── Cooldown helpers ──────────────────────────────────────────────────────

  const isPlayerOnCooldown = useCallback(
    (): boolean =>
      playerCooldownUntil !== null && Date.now() < playerCooldownUntil,
    [playerCooldownUntil],
  );

  const startPlayerCooldown = useCallback(() => {
    setPlayerCooldownUntil(Date.now() + SECOND_LT_REVEAL_COOLDOWN_MS);
  }, []);

  // ── Activate / cancel ─────────────────────────────────────────────────────

  const activateSecondLtReveal = useCallback(() => {
    if (isPlayerOnCooldown()) return;
    setSecondLtRevealActive(true);
  }, [isPlayerOnCooldown]);

  const cancelSecondLtReveal = useCallback(() => {
    setSecondLtRevealActive(false);
  }, []);

  // ── Apply — player taps a valid enemy tile ────────────────────────────────

  /**
   * Call when the player taps any tile that contains an AI piece.
   *
   * - Derives stronger / weaker relative to the 2nd Lieutenant's strength.
   * - Starts cooldown immediately.
   * - Does NOT change the turn here — the caller must pass the turn to AI
   *   only AFTER the modal is dismissed (see handleSecondLtRevealDismiss in
   *   useGameState).
   */
  const applySecondLtReveal = useCallback(
    (board: Record<number, BoardPiece>, tileIndex: number): void => {
      const piece = board[tileIndex];
      if (!piece || piece.side !== "ai") return;

      const label = pieceById[piece.pieceId]?.label ?? "";
      const strength = PIECE_STRENGTH_BY_LABEL[label] ?? 0;

      // Treat equal as "stronger" (conservative / err on caution)
      const comparison: StrengthComparison =
        strength >= SECOND_LT_STRENGTH ? "stronger" : "weaker";

      setSecondLtRevealActive(false);
      startPlayerCooldown();
      setPendingSecondLtReveal({ tileIndex, comparison });
    },
    [pieceById, startPlayerCooldown],
  );

  // ── Dismiss ───────────────────────────────────────────────────────────────

  /**
   * Called by the modal's dismiss button.
   * Clears the pending result so the modal closes.
   * The caller (useGameState) is responsible for advancing the turn to AI
   * after this returns.
   */
  const dismissSecondLtReveal = useCallback(() => {
    setPendingSecondLtReveal(null);
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetSecondLtReveal = useCallback(() => {
    setSecondLtRevealActive(false);
    setPendingSecondLtReveal(null);
    setPlayerCooldownUntil(null);
  }, []);

  return {
    // state
    secondLtRevealActive,
    pendingSecondLtReveal,
    playerCooldownUntil,
    // queries
    isPlayerOnCooldown,
    isPlayerSecondLtPiece,
    // actions
    activateSecondLtReveal,
    cancelSecondLtReveal,
    applySecondLtReveal,
    dismissSecondLtReveal,
    resetSecondLtReveal,
    startPlayerCooldown,
  };
}
