import { useState } from "react";

import type { BoardPiece, Side } from "../scripts/types";

/** Chance that a piece earns Veteran status after a successful kill. */
const VETERAN_PROC_CHANCE = 0.25;

/**
 * Rolls veteran procs for any piece that survived by winning their challenge.
 * Only the winning piece on the destination tile is eligible.
 */
export function rollVeteranProc(
  boardAfterMove: Record<number, BoardPiece>,
  movedToTileIndex: number | undefined,
  capturedByPlayer: string[],
  capturedByAI: string[],
): Record<number, BoardPiece> {
  if (movedToTileIndex === undefined) return boardAfterMove;

  const winner = boardAfterMove[movedToTileIndex];
  if (!winner) return boardAfterMove;

  const opponentLostPiece =
    winner.side === "player"
      ? capturedByAI.length > 0
      : capturedByPlayer.length > 0;

  if (!opponentLostPiece) return boardAfterMove;
  if (winner.isVeteran) return boardAfterMove;
  if (Math.random() >= VETERAN_PROC_CHANCE) return boardAfterMove;

  return {
    ...boardAfterMove,
    [movedToTileIndex]: { ...winner, isVeteran: true },
  };
}

export function useVeteranPromo(
  pieceById: Record<string, { shortLabel: string; label: string }>,
) {
  const [pendingVeteranPromo, setPendingVeteranPromo] = useState<{
    pieceShortLabel: string;
    pieceName: string;
  } | null>(null);

  const handleVeteranPromoDismiss = () => setPendingVeteranPromo(null);

  /**
   * Checks whether a veteran proc just fired for a player piece and, if so,
   * queues the promo modal. Pass the board before and after the proc roll.
   */
  const checkAndQueueVeteranPromo = (
    boardBefore: Record<number, BoardPiece>,
    boardAfter: Record<number, BoardPiece>,
    movedToTileIndex: number | undefined,
  ) => {
    if (movedToTileIndex === undefined) return;
    const before = boardBefore[movedToTileIndex];
    const after = boardAfter[movedToTileIndex];
    if (after?.isVeteran && !before?.isVeteran && after.side === "player") {
      const def = pieceById[after.pieceId];
      if (def) {
        setPendingVeteranPromo({
          pieceShortLabel: def.shortLabel,
          pieceName: def.label,
        });
      }
    }
  };

  const resetVeteranPromo = () => setPendingVeteranPromo(null);

  return {
    pendingVeteranPromo,
    handleVeteranPromoDismiss,
    checkAndQueueVeteranPromo,
    resetVeteranPromo,
  };
}
