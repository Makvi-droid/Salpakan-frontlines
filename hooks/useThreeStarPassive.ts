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
 * Labels that trigger the 3-Star General's Last Stand passive when they
 * attack it. Per design: 4-Star General, 5-Star General, and Spy.
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
   * passive. Conditions: defender is the 3-Star General AND attacker is one
   * of the qualifying higher pieces (4-Star, 5-Star, Spy).
   */
  const shouldInterceptThreeStarPassive = (
    attackerPieceId: string,
    defenderPieceId: string,
  ): boolean => {
    const defenderLabel = pieceById[defenderPieceId]?.label ?? "";
    const attackerLabel = pieceById[attackerPieceId]?.label ?? "";
    return (
      defenderLabel === THREE_STAR_LABEL &&
      LAST_STAND_TRIGGER_LABELS.has(attackerLabel)
    );
  };

  /**
   * Builds the mutual-elimination BattleResolution for a Last Stand intercept.
   * Both attacker (from) and the 3-Star General (to) are removed.
   * Flag-capture win condition is fully preserved.
   */
  const buildLastStandResolution = (
    board: Record<number, BoardPiece>,
    from: number,
    to: number,
  ): BattleResolution => {
    const attacker = board[from];
    const defender = board[to]; // the 3-Star General

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

    // Preserve flag-capture win condition — if either piece is the Flag,
    // the opposing side wins immediately.
    let winner: Side | null = null;
    if (pieceById[attacker.pieceId]?.label === "Flag") winner = defender.side;
    if (pieceById[defender.pieceId]?.label === "Flag")
      winner = winner ?? attacker.side;

    const isPlayerThreeStar = defender.side === "player";
    const attackerName =
      pieceById[attacker.pieceId]?.label.replace("\n", " ") ?? "Unknown";

    const message = isPlayerThreeStar
      ? `Last Stand! Your 3-Star General took the enemy ${attackerName} down with it — both eliminated.`
      : `Last Stand! Enemy 3-Star General dragged your ${attackerName} down with it — both eliminated.`;

    const revealMessage = isPlayerThreeStar
      ? `Your 3-Star General's passive triggered: mutual elimination with the attacking ${attackerName}.`
      : `Enemy 3-Star General's passive triggered: mutual elimination with your ${attackerName}.`;

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
   * Call this when shouldInterceptThreeStarPassive returns true.
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

    const threeStarSide = defender.side;
    const attackerLabel =
      pieceById[attacker.pieceId]?.label.replace("\n", " ") ?? "Unknown";
    const attackerShortLabel = pieceById[attacker.pieceId]?.shortLabel ?? "?";

    const event: ThreeStarPassiveEvent = {
      threeStarSide,
      attackerName: attackerLabel,
      attackerShortLabel,
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
