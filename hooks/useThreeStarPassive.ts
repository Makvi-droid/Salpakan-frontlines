import { useState } from "react";

import type { ThreeStarPassiveEvent } from "../components/ThreeStarPassiveModal";
import type {
  BattleResolution,
  BoardPiece,
  PieceDefinition,
  Side,
} from "../scripts/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const THREE_STAR_LABEL = "3 Star\nGeneral";

/**
 * Labels that trigger the 3-Star General's Last Stand passive.
 * Applies whether the 3-Star is the attacker OR the defender.
 */
const LAST_STAND_TRIGGER_LABELS = new Set([
  "4 Star\nGeneral",
  "5 Star\nGeneral",
  "Spy",
]);

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseThreeStarPassiveOptions {
  pieceById: Record<string, PieceDefinition>;
}

export function useThreeStarPassive({ pieceById }: UseThreeStarPassiveOptions) {
  const [pendingThreeStarPassive, setPendingThreeStarPassive] = useState<{
    event: ThreeStarPassiveEvent;
    resolution: BattleResolution;
    nextTurn: Side;
    from: number;
    to: number;
  } | null>(null);

  /**
   * Returns true when a challenge should be intercepted by the Last Stand
   * passive. Fires in both directions:
   *   - Defender is 3-Star and attacker is a trigger piece (4★, 5★, Spy)
   *   - Attacker is 3-Star and defender is a trigger piece (4★, 5★, Spy)
   */
  const shouldInterceptThreeStarPassive = (
    attackerPieceId: string,
    defenderPieceId: string,
  ): boolean => {
    const attackerLabel = pieceById[attackerPieceId]?.label ?? "";
    const defenderLabel = pieceById[defenderPieceId]?.label ?? "";

    // Case 1: 3-Star is being attacked by a higher piece
    if (
      defenderLabel === THREE_STAR_LABEL &&
      LAST_STAND_TRIGGER_LABELS.has(attackerLabel)
    )
      return true;

    // Case 2: 3-Star is the attacker going after a higher piece
    if (
      attackerLabel === THREE_STAR_LABEL &&
      LAST_STAND_TRIGGER_LABELS.has(defenderLabel)
    )
      return true;

    return false;
  };

  /**
   * Builds the mutual-elimination BattleResolution for a Last Stand intercept.
   * Both pieces are removed regardless of which one is the 3-Star General.
   */
  const buildLastStandResolution = (
    board: Record<number, BoardPiece>,
    from: number,
    to: number,
  ): BattleResolution => {
    const attacker = board[from];
    const defender = board[to];

    if (!attacker || !defender) {
      return {
        board,
        winner: null,
        message: "No move executed.",
        revealMessage: null,
        capturedByPlayer: [],
        capturedByAI: [],
      };
    }

    const nextBoard = { ...board };
    delete nextBoard[from];
    delete nextBoard[to];

    const capturedByPlayer: string[] = [];
    const capturedByAI: string[] = [];

    attacker.side === "player"
      ? capturedByPlayer.push(attacker.pieceId)
      : capturedByAI.push(attacker.pieceId);

    defender.side === "player"
      ? capturedByPlayer.push(defender.pieceId)
      : capturedByAI.push(defender.pieceId);

    // Preserve flag-capture win condition
    let winner: Side | null = null;
    if (pieceById[attacker.pieceId]?.label === "Flag") winner = defender.side;
    if (pieceById[defender.pieceId]?.label === "Flag")
      winner = winner ?? attacker.side;

    // Identify which piece is the 3-Star (could be attacker OR defender)
    const attackerLabel = pieceById[attacker.pieceId]?.label ?? "";

    const threeStarPiece =
      attackerLabel === THREE_STAR_LABEL ? attacker : defender;
    const otherPiece = attackerLabel === THREE_STAR_LABEL ? defender : attacker;

    const isPlayerThreeStar = threeStarPiece.side === "player";
    const otherName =
      pieceById[otherPiece.pieceId]?.label.replace("\n", " ") ?? "Unknown";

    const message = isPlayerThreeStar
      ? `Last Stand! Your 3-Star General took the enemy ${otherName} down with it — both eliminated.`
      : `Last Stand! Enemy 3-Star General dragged your ${otherName} down with it — both eliminated.`;

    const revealMessage = isPlayerThreeStar
      ? `Your 3-Star General's passive triggered: mutual elimination with ${otherName}.`
      : `Enemy 3-Star General's passive triggered: mutual elimination with your ${otherName}.`;

    return {
      board: nextBoard,
      winner,
      message,
      revealMessage,
      capturedByPlayer,
      capturedByAI,
    };
  };

  /**
   * Queues the Last Stand notification event and pre-built resolution.
   * Correctly identifies the 3-Star regardless of whether it is the
   * attacker (from) or defender (to).
   */
  const queueThreeStarPassive = (
    board: Record<number, BoardPiece>,
    from: number,
    to: number,
    nextTurn: Side,
  ) => {
    const attacker = board[from];
    const defender = board[to];
    if (!attacker || !defender) return;

    const attackerLabel = pieceById[attacker.pieceId]?.label ?? "";

    // Identify which piece is the 3-Star and which is the other piece
    const threeStarSide =
      attackerLabel === THREE_STAR_LABEL ? attacker.side : defender.side;
    const otherPiece = attackerLabel === THREE_STAR_LABEL ? defender : attacker;

    const otherLabel =
      pieceById[otherPiece.pieceId]?.label.replace("\n", " ") ?? "Unknown";
    const otherShortLabel = pieceById[otherPiece.pieceId]?.shortLabel ?? "?";

    const event: ThreeStarPassiveEvent = {
      threeStarSide,
      attackerName: otherLabel,
      attackerShortLabel: otherShortLabel,
    };

    const resolution = buildLastStandResolution(board, from, to);
    setPendingThreeStarPassive({ event, resolution, nextTurn, from, to });
  };

  const resetThreeStarPassive = () => setPendingThreeStarPassive(null);

  return {
    pendingThreeStarPassive,
    shouldInterceptThreeStarPassive,
    queueThreeStarPassive,
    resetThreeStarPassive,
  };
}
