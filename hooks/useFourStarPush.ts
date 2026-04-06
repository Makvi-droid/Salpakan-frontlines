import { useState } from "react";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../constants/constants";
import type { BoardPiece, PieceDefinition } from "../scripts/types";

/** 5-minute wall-clock cooldown in milliseconds */
export const FOUR_STAR_DIAGONAL_COOLDOWN_MS = 5 * 60 * 1000;

/** All 4 diagonal directions */
export const DIAGONAL_DIRECTIONS = [
  { x: 1, y: 1 }, // down-right
  { x: -1, y: 1 }, // down-left
  { x: 1, y: -1 }, // up-right
  { x: -1, y: -1 }, // up-left
] as const;

interface UseFourStarPushOptions {
  pieceById: Record<string, PieceDefinition>;
}

/**
 * Hook for the 4-Star General's "Diagonal March" ability.
 *
 * When activated the player sees all diagonal tiles (1 or 2 squares away)
 * highlighted. They can move to an empty tile OR challenge an enemy on a
 * diagonal tile. If they tap elsewhere the ability is simply cancelled with
 * no cooldown consumed.
 *
 * Cooldown: 5 real-time minutes, shared between the player and AI instances.
 */
export function useFourStarPush({ pieceById }: UseFourStarPushOptions) {
  // ── State ────────────────────────────────────────────────────────────────────

  /**
   * True while the player has pressed the Diagonal March button and is
   * picking a diagonal destination tile.
   */
  const [fourStarPushActive, setFourStarPushActive] = useState(false);

  /**
   * The tile index of the 4-Star General when the ability was activated.
   * Latched so we don't lose track if selectedBattleTileIndex changes.
   */
  const [generalTileIndex, setGeneralTileIndex] = useState<number | null>(null);

  /**
   * Wall-clock timestamp (ms) after which the PLAYER may use the ability again.
   * null = no cooldown active.
   */
  const [playerCooldownUntil, setPlayerCooldownUntil] = useState<number | null>(
    null,
  );

  /**
   * Wall-clock timestamp (ms) after which the AI may use the ability again.
   * null = no cooldown active.
   */
  const [aiCooldownUntil, setAICooldownUntil] = useState<number | null>(null);

  // ── Piece identification ──────────────────────────────────────────────────────

  const isPlayerFourStarGeneral = (piece: BoardPiece): boolean =>
    piece.side === "player" &&
    pieceById[piece.pieceId]?.label === "4 Star\nGeneral";

  const isAIFourStarGeneral = (piece: BoardPiece): boolean =>
    piece.side === "ai" &&
    pieceById[piece.pieceId]?.label === "4 Star\nGeneral";

  // ── Cooldown queries ──────────────────────────────────────────────────────────

  const isPlayerOnCooldown = (): boolean => {
    if (playerCooldownUntil === null) return false;
    return Date.now() < playerCooldownUntil;
  };

  const isAIOnCooldown = (): boolean => {
    if (aiCooldownUntil === null) return false;
    return Date.now() < aiCooldownUntil;
  };

  // ── Diagonal tile computation ─────────────────────────────────────────────────

  /**
   * Returns all valid diagonal destination tiles (1 or 2 squares) for the
   * 4-Star General at `fromTileIndex`.
   *
   * Rules:
   * - Step 1 diagonal: valid if empty OR occupied by an enemy (challenge).
   *   If occupied by an ally → blocked for both step 1 AND step 2 in that dir.
   * - Step 2 diagonal: the General can jump over an ENEMY at step 1 to reach
   *   step 2 only if step 2 is empty. It cannot jump over an ally. It cannot
   *   land on an ally.
   *
   * Returns two arrays so the caller can distinguish normal move targets from
   * challenge targets.
   */
  const getDiagonalMarchTiles = (
    board: Record<number, BoardPiece>,
    fromTileIndex: number,
    side: "player" | "ai",
  ): { allTiles: number[]; challengeTiles: number[] } => {
    const fromRow = Math.floor(fromTileIndex / BOARD_WIDTH);
    const fromCol = fromTileIndex % BOARD_WIDTH;
    const opponent = side === "player" ? "ai" : "player";

    const allTiles = new Set<number>();
    const challengeTiles = new Set<number>();

    DIAGONAL_DIRECTIONS.forEach((dir) => {
      // ── Step 1 ──────────────────────────────────────────────────────────────
      const r1 = fromRow + dir.y;
      const c1 = fromCol + dir.x;
      if (r1 < 0 || r1 >= BOARD_HEIGHT || c1 < 0 || c1 >= BOARD_WIDTH) return;

      const tile1 = r1 * BOARD_WIDTH + c1;
      const occupant1 = board[tile1];

      if (!occupant1) {
        // Empty — valid move destination
        allTiles.add(tile1);
      } else if (occupant1.side === opponent) {
        // Enemy — valid challenge destination
        allTiles.add(tile1);
        challengeTiles.add(tile1);
        // Can still look at step 2 (jump over enemy)
      } else {
        // Ally at step 1 — entire direction blocked
        return;
      }

      // ── Step 2 ──────────────────────────────────────────────────────────────
      const r2 = fromRow + dir.y * 2;
      const c2 = fromCol + dir.x * 2;
      if (r2 < 0 || r2 >= BOARD_HEIGHT || c2 < 0 || c2 >= BOARD_WIDTH) return;

      const tile2 = r2 * BOARD_WIDTH + c2;
      const occupant2 = board[tile2];

      if (!occupant2) {
        // Empty — valid move destination
        allTiles.add(tile2);
      } else if (occupant2.side === opponent) {
        // Enemy — valid challenge destination
        allTiles.add(tile2);
        challengeTiles.add(tile2);
      }
      // Ally at step 2 — blocked, skip
    });

    return {
      allTiles: Array.from(allTiles),
      challengeTiles: Array.from(challengeTiles),
    };
  };

  // ── Activate / cancel ─────────────────────────────────────────────────────────

  /**
   * Activates diagonal march mode and latches the General's current tile.
   * No-op if the player is on cooldown.
   */
  const activateFourStarPush = (tileIndex: number) => {
    if (isPlayerOnCooldown()) return;
    setGeneralTileIndex(tileIndex);
    setFourStarPushActive(true);
  };

  const cancelFourStarPush = () => {
    setFourStarPushActive(false);
    setGeneralTileIndex(null);
  };

  // ── Cooldown starters ─────────────────────────────────────────────────────────

  const startPlayerCooldown = () => {
    setPlayerCooldownUntil(Date.now() + FOUR_STAR_DIAGONAL_COOLDOWN_MS);
  };

  const startAICooldown = () => {
    setAICooldownUntil(Date.now() + FOUR_STAR_DIAGONAL_COOLDOWN_MS);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const resetFourStarPush = () => {
    setFourStarPushActive(false);
    setGeneralTileIndex(null);
    setPlayerCooldownUntil(null);
    setAICooldownUntil(null);
  };

  return {
    fourStarPushActive,
    generalTileIndex,
    playerCooldownUntil,
    aiCooldownUntil,
    isPlayerOnCooldown,
    isAIOnCooldown,
    startPlayerCooldown,
    startAICooldown,
    activateFourStarPush,
    cancelFourStarPush,
    resetFourStarPush,
    isPlayerFourStarGeneral,
    isAIFourStarGeneral,
    getDiagonalMarchTiles,
  };
}
