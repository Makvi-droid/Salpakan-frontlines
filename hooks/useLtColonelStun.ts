import { useCallback, useRef, useState } from "react";
import type { BoardPiece, PieceDefinition } from "../scripts/types";

/**
 * useLtColonelStun
 *
 * Ability: "Suppression Fire"
 *  - Player selects the Lt. Colonel, activates the ability, then taps a
 *    diagonal enemy piece within 1 square.
 *  - That enemy piece is stunned and cannot move for the AI's next turn.
 *  - The player's normal move turn continues after the stun is applied
 *    (turn does NOT pass to AI — the player still moves this turn).
 *  - Cooldown: 5 minutes (300 000 ms).
 *
 * Stun is tracked as a Set of tile indices rather than a flag on BoardPiece
 * so we don't need to mutate the board object for a purely UI/logic effect.
 */

const STUN_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export type LtColonelStunHook = ReturnType<typeof useLtColonelStun>;

export function useLtColonelStun({
  pieceById,
}: {
  pieceById: Record<string, PieceDefinition>;
}) {
  // ── Ability active flag ───────────────────────────────────────────────────
  const [ltColonelStunActive, setLtColonelStunActive] = useState(false);

  // ── Cooldown timestamps ───────────────────────────────────────────────────
  const [playerCooldownUntil, setPlayerCooldownUntil] = useState<number | null>(
    null,
  );
  const [aiCooldownUntil, setAiCooldownUntil] = useState<number | null>(null);

  // ── Stunned tile indices (persists for exactly 1 AI turn) ─────────────────
  // Using a ref for the raw set so clearing it during the AI turn doesn't
  // trigger an unnecessary re-render, while a mirrored state value drives UI.
  const stunnedTilesRef = useRef<Set<number>>(new Set());
  const [stunnedTileIndices, setStunnedTileIndices] = useState<Set<number>>(
    new Set(),
  );

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Returns true when the given board piece is the player's Lt. Colonel. */
  const isPlayerLtColonelPiece = useCallback(
    (piece: BoardPiece): boolean => {
      if (piece.side !== "player") return false;
      return pieceById[piece.pieceId]?.label === "Lt Col";
    },
    [pieceById],
  );

  /**
   * Returns tile indices that are exactly 1 diagonal step from `fromTileIndex`
   * and occupied by an enemy (AI) piece.
   *
   * Board geometry: BOARD_WIDTH = 9 columns.
   */
  const getDiagonalEnemyTiles = useCallback(
    (board: Record<number, BoardPiece>, fromTileIndex: number): number[] => {
      const BOARD_WIDTH = 9;
      const BOARD_HEIGHT = 8;
      const row = Math.floor(fromTileIndex / BOARD_WIDTH);
      const col = fromTileIndex % BOARD_WIDTH;

      const diagonals = [
        { dr: -1, dc: -1 },
        { dr: -1, dc: 1 },
        { dr: 1, dc: -1 },
        { dr: 1, dc: 1 },
      ];

      return diagonals
        .map(({ dr, dc }) => {
          const r = row + dr;
          const c = col + dc;
          if (r < 0 || r >= BOARD_HEIGHT || c < 0 || c >= BOARD_WIDTH)
            return null;
          const idx = r * BOARD_WIDTH + c;
          const piece = board[idx];
          // Only highlight tiles occupied by a hidden or revealed AI piece
          if (piece && piece.side === "ai") return idx;
          return null;
        })
        .filter((idx): idx is number => idx !== null);
    },
    [],
  );

  // ── Ability lifecycle ─────────────────────────────────────────────────────

  const activateLtColonelStun = useCallback(() => {
    setLtColonelStunActive(true);
  }, []);

  const cancelLtColonelStun = useCallback(() => {
    setLtColonelStunActive(false);
  }, []);

  /**
   * Apply the stun to the tapped diagonal tile.
   * Returns the tile index that was stunned so the caller can show a message.
   */
  const applyLtColonelStun = useCallback((targetTileIndex: number): void => {
    stunnedTilesRef.current = new Set([
      ...stunnedTilesRef.current,
      targetTileIndex,
    ]);
    setStunnedTileIndices(new Set(stunnedTilesRef.current));
    setLtColonelStunActive(false);
  }, []);

  /**
   * Called by the AI turn hook to check whether a move's `from` tile is
   * currently stunned before executing the move.
   */
  const isTileStunned = useCallback(
    (tileIndex: number): boolean => stunnedTilesRef.current.has(tileIndex),
    [],
  );

  /**
   * Called at the END of the AI's turn (after it has moved) to clear all
   * stuns — a stun lasts exactly 1 AI turn.
   */
  const clearStuns = useCallback((): void => {
    stunnedTilesRef.current = new Set();
    setStunnedTileIndices(new Set());
  }, []);

  // ── Cooldown helpers ──────────────────────────────────────────────────────

  const startPlayerCooldown = useCallback(() => {
    setPlayerCooldownUntil(Date.now() + STUN_COOLDOWN_MS);
  }, []);

  const startAiCooldown = useCallback(() => {
    setAiCooldownUntil(Date.now() + STUN_COOLDOWN_MS);
  }, []);

  const isPlayerOnCooldown = useCallback((): boolean => {
    if (playerCooldownUntil === null) return false;
    return Date.now() < playerCooldownUntil;
  }, [playerCooldownUntil]);

  const isAiOnCooldown = useCallback((): boolean => {
    if (aiCooldownUntil === null) return false;
    return Date.now() < aiCooldownUntil;
  }, [aiCooldownUntil]);

  // ── Reset (called on retry / forfeit / new battle) ────────────────────────
  const resetLtColonelStun = useCallback(() => {
    setLtColonelStunActive(false);
    setPlayerCooldownUntil(null);
    setAiCooldownUntil(null);
    stunnedTilesRef.current = new Set();
    setStunnedTileIndices(new Set());
  }, []);

  return {
    ltColonelStunActive,
    playerCooldownUntil,
    aiCooldownUntil,
    stunnedTileIndices,
    isPlayerLtColonelPiece,
    getDiagonalEnemyTiles,
    activateLtColonelStun,
    cancelLtColonelStun,
    applyLtColonelStun,
    isTileStunned,
    clearStuns,
    startPlayerCooldown,
    startAiCooldown,
    isPlayerOnCooldown,
    isAiOnCooldown,
    resetLtColonelStun,
  };
}
