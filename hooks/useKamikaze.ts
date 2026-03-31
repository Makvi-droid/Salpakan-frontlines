import { useState } from "react";

import {
  isPrivatePiece,
  prepareChallengeEvent,
  resolveKamikazeMutualElimination,
} from "../scripts/gameLogic";
import type {
  BattleMove,
  BoardPiece,
  ChallengeEvent,
  KamikazeEvent,
  PieceDefinition,
  PieceUpgradeId,
  Side,
} from "../scripts/types";

interface UseKamikazeOptions {
  pieceById: Record<string, PieceDefinition>;
  onApplyResolution: (
    res: any,
    nextTurn: Side,
    from?: number,
    to?: number,
  ) => void;
  onPendingChallenge: (event: ChallengeEvent | null) => void;
  onPendingUpgradeActivation: (
    val: { legalMove: BattleMove; playerUpgrade: PieceUpgradeId } | null,
  ) => void;
}

export function useKamikaze(options: UseKamikazeOptions) {
  const {
    pieceById,
    onApplyResolution,
    onPendingChallenge,
    onPendingUpgradeActivation,
  } = options;

  const [pendingKamikaze, setPendingKamikaze] = useState<KamikazeEvent | null>(
    null,
  );

  // ── Intercept detection ──────────────────────────────────────────────────────
  /**
   * Returns true when a Kamikaze intercept should fire:
   *  1. Attacker is a Private
   *  2. There is an enemy piece on the target tile
   *  3. Target is NOT another Private (same-rank is already mutual elimination)
   *
   * Accepts board explicitly so callers always pass the current snapshot
   * rather than relying on a potentially stale closure.
   */
  const shouldInterceptKamikaze = (
    board: Record<number, BoardPiece>,
    legalMove: BattleMove,
  ): boolean => {
    const attacker = board[legalMove.from];
    const defender = board[legalMove.to];
    if (!attacker || !defender) return false;
    if (attacker.side === defender.side) return false;
    if (!isPrivatePiece(attacker.pieceId, pieceById)) return false;
    if (isPrivatePiece(defender.pieceId, pieceById)) return false;
    return true;
  };

  // ── Event builder ────────────────────────────────────────────────────────────
  /**
   * Call only after shouldInterceptKamikaze() returns true.
   * Accepts board explicitly for the same reason as above.
   */
  const buildKamikazeEvent = (
    board: Record<number, BoardPiece>,
    legalMove: BattleMove,
  ): KamikazeEvent => {
    const attacker = board[legalMove.from];
    const defender = board[legalMove.to];
    const kamikazeResolution = resolveKamikazeMutualElimination(
      board,
      legalMove,
      pieceById,
    );
    return {
      from: legalMove.from,
      to: legalMove.to,
      attackerSide: attacker.side,
      attackerShortLabel: pieceById[attacker.pieceId]?.shortLabel ?? "Pvt",
      defenderShortLabel: pieceById[defender.pieceId]?.shortLabel ?? "?",
      defenderName:
        defender.side === "player"
          ? (pieceById[defender.pieceId]?.label ?? "Unknown")
          : "an enemy rank",
      kamikazeResolution,
      legalMove,
    };
  };

  // ── Player confirm / decline ─────────────────────────────────────────────────
  /** Player chose to USE Kamikaze — apply mutual elimination and continue. */
  const handleKamikazeConfirm = () => {
    if (!pendingKamikaze) return;
    const { kamikazeResolution, legalMove } = pendingKamikaze;
    setPendingKamikaze(null);
    onApplyResolution(kamikazeResolution, "ai", legalMove.from, legalMove.to);
  };

  /**
   * Player chose to DECLINE Kamikaze — fall through to normal combat
   * (upgrade activation check first, then ChallengeModal).
   */
  const handleKamikazeDecline = (currentBoard: Record<number, BoardPiece>) => {
    if (!pendingKamikaze) return;
    const { legalMove } = pendingKamikaze;
    setPendingKamikaze(null);

    const attackingPiece = currentBoard[legalMove.from];
    if (attackingPiece?.side === "player" && attackingPiece.upgrade) {
      onPendingUpgradeActivation({
        legalMove,
        playerUpgrade: attackingPiece.upgrade,
      });
      return;
    }
    const event = prepareChallengeEvent(currentBoard, legalMove, pieceById);
    if (event) onPendingChallenge(event);
  };

  const resetKamikaze = () => setPendingKamikaze(null);

  return {
    pendingKamikaze,
    setPendingKamikaze,
    shouldInterceptKamikaze,
    buildKamikazeEvent,
    handleKamikazeConfirm,
    handleKamikazeDecline,
    resetKamikaze,
  };
}
