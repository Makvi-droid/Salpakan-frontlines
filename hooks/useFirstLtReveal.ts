import { useCallback, useState } from "react";
import { PIECE_STRENGTH_BY_LABEL } from "../constants/constants";
import type { BoardPiece, PieceDefinition } from "../scripts/types";

/**
 * useFirstLtReveal
 *
 * Ability: "Intel Report"
 *  - Player selects the 1st Lieutenant, activates the ability, then taps
 *    ANY enemy piece on the board.
 *  - A modal reveals whether that piece is a:
 *      • "High Rank" — 1-Star General through 5-Star General (strength 10–14)
 *      • "Low Rank"  — Flag through Colonel (strength 0–9)
 *  - The player's normal move turn continues after dismissing the modal
 *    (the ability does NOT consume the player's turn).
 *  - Cooldown: 5 minutes (300 000 ms).
 */

export const FIRST_LT_REVEAL_COOLDOWN_MS = 5 * 60 * 1000;

// ─── Tier classification ──────────────────────────────────────────────────────

/** Strength threshold — pieces AT or ABOVE this value are "High Rank". */
const HIGH_RANK_THRESHOLD = 10; // "1 Star\nGeneral" = 10

export type RankTier = "high" | "low";

/**
 * Given a piece's `label` (from PieceDefinition), returns which tier it
 * belongs to.
 */
export function getRankTier(label: string): RankTier {
  const strength = PIECE_STRENGTH_BY_LABEL[label] ?? 0;
  return strength >= HIGH_RANK_THRESHOLD ? "high" : "low";
}

// ─── Result type ──────────────────────────────────────────────────────────────

/**
 * Payload surfaced to the modal and board overlay.
 *
 * - `tileIndex`      — which tile was tapped (for any optional board glow)
 * - `tier`           — "high" | "low" — shown prominently in the modal
 * - `defenderLabel`  — full label of the piece (kept internal; not shown)
 */
export interface FirstLtRevealResult {
  tileIndex: number;
  tier: RankTier;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseFirstLtRevealOptions {
  pieceById: Record<string, PieceDefinition>;
}

export function useFirstLtReveal({ pieceById }: UseFirstLtRevealOptions) {
  // ── Active flag — player has pressed the button, awaiting target tap ─────
  const [firstLtRevealActive, setFirstLtRevealActive] = useState(false);

  // ── Modal payload — non-null while the result modal is open ──────────────
  const [pendingFirstLtReveal, setPendingFirstLtReveal] =
    useState<FirstLtRevealResult | null>(null);

  // ── Cooldown timestamps ───────────────────────────────────────────────────
  const [playerCooldownUntil, setPlayerCooldownUntil] = useState<number | null>(
    null,
  );

  // ── Piece helpers ─────────────────────────────────────────────────────────

  /** True when the given board piece is the player's 1st Lieutenant. */
  const isPlayerFirstLtPiece = useCallback(
    (piece: BoardPiece): boolean =>
      piece.side === "player" &&
      pieceById[piece.pieceId]?.label === "1st Lt",
    [pieceById],
  );

  // ── Cooldown helpers ──────────────────────────────────────────────────────

  const isPlayerOnCooldown = useCallback(
    (): boolean =>
      playerCooldownUntil !== null && Date.now() < playerCooldownUntil,
    [playerCooldownUntil],
  );

  const startPlayerCooldown = useCallback(() => {
    setPlayerCooldownUntil(Date.now() + FIRST_LT_REVEAL_COOLDOWN_MS);
  }, []);

  // ── Activate / cancel ─────────────────────────────────────────────────────

  /**
   * Called when the player presses the ability button.
   * Arms target-selection mode — the board will now accept any enemy tap.
   */
  const activateFirstLtReveal = useCallback(() => {
    if (isPlayerOnCooldown()) return;
    setFirstLtRevealActive(true);
  }, [isPlayerOnCooldown]);

  /**
   * Called when the player taps a non-enemy tile (or presses elsewhere)
   * to cancel without spending the ability.
   */
  const cancelFirstLtReveal = useCallback(() => {
    setFirstLtRevealActive(false);
  }, []);

  // ── Apply — player taps a valid enemy tile ────────────────────────────────

  /**
   * Call when the player taps any tile that contains an AI piece.
   *
   * - Builds the reveal result (tier only — true rank is never exposed).
   * - Opens the result modal via `pendingFirstLtReveal`.
   * - Starts the cooldown immediately.
   * - Does NOT change the turn — caller should NOT pass turn to AI here.
   *   The turn passes when the player makes their normal move afterwards.
   */
  const applyFirstLtReveal = useCallback(
    (board: Record<number, BoardPiece>, tileIndex: number): void => {
      const piece = board[tileIndex];
      if (!piece || piece.side !== "ai") return;

      const label = pieceById[piece.pieceId]?.label ?? "";
      const tier = getRankTier(label);

      setFirstLtRevealActive(false);
      startPlayerCooldown();
      setPendingFirstLtReveal({ tileIndex, tier });
    },
    [pieceById, startPlayerCooldown],
  );

  // ── Dismiss the result modal ──────────────────────────────────────────────

  /**
   * Called by the modal's dismiss / confirm button.
   * Clears the pending result so the modal closes.
   */
  const dismissFirstLtReveal = useCallback(() => {
    setPendingFirstLtReveal(null);
  }, []);

  // ── Reset (called on retry / forfeit / new battle) ────────────────────────

  const resetFirstLtReveal = useCallback(() => {
    setFirstLtRevealActive(false);
    setPendingFirstLtReveal(null);
    setPlayerCooldownUntil(null);
  }, []);

  return {
    // state
    firstLtRevealActive,       // bool — board is in "tap any enemy" mode
    pendingFirstLtReveal,      // FirstLtRevealResult | null — drives modal
    playerCooldownUntil,       // number | null — feeds ability button
    // queries
    isPlayerOnCooldown,
    isPlayerFirstLtPiece,
    // actions
    activateFirstLtReveal,
    cancelFirstLtReveal,
    applyFirstLtReveal,
    dismissFirstLtReveal,
    resetFirstLtReveal,
    startPlayerCooldown,
  };
}
