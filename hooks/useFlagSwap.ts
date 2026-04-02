import { useMemo, useState } from "react";

import type {
  BoardPiece,
  FlagSwapEvent,
  PieceDefinition,
} from "../scripts/types";

interface UseFlagSwapOptions {
  pieceById: Record<string, PieceDefinition>;
}

export function useFlagSwap({ pieceById }: UseFlagSwapOptions) {
  // ── State ────────────────────────────────────────────────────────────────────

  /** True while the player is in ally-picking mode after pressing the button */
  const [flagSwapActive, setFlagSwapActive] = useState(false);

  /** Kept for potential future modal use (currently unused — swap is instant) */
  const [pendingFlagSwap, setPendingFlagSwap] =
    useState<FlagSwapEvent | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** True if a board piece is the player's Flag */
  const isFlagPiece = (piece: BoardPiece): boolean =>
    piece.side === "player" && pieceById[piece.pieceId]?.label === "Flag";

  /**
   * Returns all tile indices that are valid swap targets for the Flag.
   * Valid = player-owned, not the Flag itself.
   */
  const getAllySwapTiles = (
    board: Record<number, BoardPiece>,
    flagTileIndex: number | null,
  ): number[] => {
    if (flagTileIndex === null) return [];
    const flagPiece = board[flagTileIndex];
    if (!flagPiece || !isFlagPiece(flagPiece)) return [];

    return Object.entries(board)
      .filter(([tileKey, piece]) => {
        if (Number(tileKey) === flagTileIndex) return false;
        return piece.side === "player";
      })
      .map(([tileKey]) => Number(tileKey));
  };

  // ── Activate / deactivate ────────────────────────────────────────────────────

  const activateFlagSwap = () => setFlagSwapActive(true);

  const cancelFlagSwap = () => {
    setFlagSwapActive(false);
    setPendingFlagSwap(null);
  };

  // ── Apply swap ───────────────────────────────────────────────────────────────

  /**
   * Swaps the Flag and the chosen ally in the board snapshot.
   * Returns a new board — does NOT mutate the original.
   */
  const applyFlagSwap = (
    board: Record<number, BoardPiece>,
    flagTileIndex: number,
    allyTileIndex: number,
  ): Record<number, BoardPiece> => {
    const flagPiece = board[flagTileIndex];
    const allyPiece = board[allyTileIndex];
    if (!flagPiece || !allyPiece) return board;

    return {
      ...board,
      [allyTileIndex]: { ...flagPiece },
      [flagTileIndex]: { ...allyPiece },
    };
  };

  const resetFlagSwap = () => {
    setFlagSwapActive(false);
    setPendingFlagSwap(null);
  };

  return {
    flagSwapActive,
    pendingFlagSwap,
    setPendingFlagSwap,
    activateFlagSwap,
    cancelFlagSwap,
    applyFlagSwap,
    getAllySwapTiles,
    isFlagPiece,
    resetFlagSwap,
  };
}
