import { useCallback, useState } from "react";
import {
  getTileColumn,
  getTileIndex,
  getTileRow,
  isInsideBoard,
} from "../scripts/gameLogic";
import type { BoardPiece, PieceDefinition } from "../scripts/types";

/** 5-minute wall-clock cooldown in milliseconds — same as other abilities */
export const MAJOR_SWAP_COOLDOWN_MS = 5 * 60 * 1000;

/** Orthogonal (NSEW) direction vectors — 1 square only */
const ORTHOGONAL_DIRECTIONS = [
  { x: 0, y: -1 }, // up
  { x: 0, y: 1 }, // down
  { x: -1, y: 0 }, // left
  { x: 1, y: 0 }, // right
] as const;

interface UseMajorSwapOptions {
  pieceById: Record<string, PieceDefinition>;
}

export function useMajorSwap({ pieceById }: UseMajorSwapOptions) {
  // ── State ─────────────────────────────────────────────────────────────────

  /** True while the player is in ally-picking mode after pressing the button */
  const [majorSwapActive, setMajorSwapActive] = useState(false);

  /** Wall-clock timestamp after which the player may use the ability again */
  const [playerCooldownUntil, setPlayerCooldownUntil] = useState<number | null>(
    null,
  );

  // ── Piece helpers ─────────────────────────────────────────────────────────

  /** Returns true when the given BoardPiece is the player's Major */
  const isPlayerMajorPiece = useCallback(
    (piece: BoardPiece): boolean =>
      piece.side === "player" && pieceById[piece.pieceId]?.label === "Major",
    [pieceById],
  );

  // ── Valid swap target computation ─────────────────────────────────────────

  /**
   * Returns tile indices of all player-owned pieces that are exactly 1 square
   * orthogonally adjacent to the Major tile (i.e. valid Tactical Shift targets).
   * Any allied piece qualifies — including the Flag.
   */
  const getOrthogonalAllyTiles = useCallback(
    (board: Record<number, BoardPiece>, majorTileIndex: number): number[] => {
      const fromRow = getTileRow(majorTileIndex);
      const fromCol = getTileColumn(majorTileIndex);
      const targets: number[] = [];

      ORTHOGONAL_DIRECTIONS.forEach(({ x, y }) => {
        const r = fromRow + y;
        const c = fromCol + x;
        if (!isInsideBoard(r, c)) return;
        const ti = getTileIndex(r, c);
        const occupant = board[ti];
        // Any player-owned piece qualifies (including the Flag)
        if (occupant?.side === "player") {
          targets.push(ti);
        }
      });

      return targets;
    },
    [],
  );

  // ── Cooldown queries ──────────────────────────────────────────────────────

  const isPlayerOnCooldown = useCallback(
    (): boolean =>
      playerCooldownUntil !== null && Date.now() < playerCooldownUntil,
    [playerCooldownUntil],
  );

  // ── Cooldown starters ─────────────────────────────────────────────────────

  const startPlayerCooldown = useCallback(() => {
    setPlayerCooldownUntil(Date.now() + MAJOR_SWAP_COOLDOWN_MS);
  }, []);

  // ── Activate / cancel ─────────────────────────────────────────────────────

  /** Call when the player presses the Major ability button */
  const activateMajorSwap = useCallback(() => {
    if (isPlayerOnCooldown()) return;
    setMajorSwapActive(true);
  }, [isPlayerOnCooldown]);

  /** Call when the player taps elsewhere to cancel */
  const cancelMajorSwap = useCallback(() => {
    setMajorSwapActive(false);
  }, []);

  // ── Apply swap ────────────────────────────────────────────────────────────

  /**
   * Swaps the Major and the chosen ally in the board snapshot.
   * Returns a new board — does NOT mutate the original.
   */
  const applyMajorSwap = useCallback(
    (
      board: Record<number, BoardPiece>,
      majorTileIndex: number,
      allyTileIndex: number,
    ): Record<number, BoardPiece> => {
      const majorPiece = board[majorTileIndex];
      const allyPiece = board[allyTileIndex];
      if (!majorPiece || !allyPiece) return board;
      return {
        ...board,
        [allyTileIndex]: { ...majorPiece },
        [majorTileIndex]: { ...allyPiece },
      };
    },
    [],
  );

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetMajorSwap = useCallback(() => {
    setMajorSwapActive(false);
    setPlayerCooldownUntil(null);
  }, []);

  return {
    majorSwapActive,
    playerCooldownUntil,
    isPlayerOnCooldown,
    isPlayerMajorPiece,
    getOrthogonalAllyTiles,
    activateMajorSwap,
    cancelMajorSwap,
    applyMajorSwap,
    startPlayerCooldown,
    resetMajorSwap,
  };
}
