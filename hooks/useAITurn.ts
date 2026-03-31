import { useEffect } from "react";

import { AI_THINKING_DELAY_MS } from "../constants/constants";
import { chooseMoveForProfile } from "../scripts/aiLogic";
import {
  prepareChallengeEvent,
  resolveBattleMove,
  resolveKamikazeMutualElimination,
} from "../scripts/gameLogic";
import type {
  AIProfile,
  BoardPiece,
  ChallengeEvent,
  KamikazeEvent,
  Phase,
  PieceDefinition,
  PieceUpgradeId,
  Side,
} from "../scripts/types";

interface UseAITurnOptions {
  phase: Phase;
  turn: Side;
  winner: Side | null;
  battleBoard: Record<number, BoardPiece>;
  aiProfile: AIProfile;
  pieceById: Record<string, PieceDefinition>;
  crateTiles: number[];
  // Blocking conditions — AI won't move while any of these are active
  pendingChallenge: ChallengeEvent | null;
  pendingUpgradeRoll: { upgrade: PieceUpgradeId } | null;
  pendingUpgradeActivation: {
    legalMove: any;
    playerUpgrade: PieceUpgradeId;
  } | null;
  pendingCrateChoice: object | null;
  pendingKamikaze: KamikazeEvent | null;
  pendingVeteranPromo: object | null;
  // Callbacks
  shouldInterceptKamikaze: (
    board: Record<number, BoardPiece>,
    move: any,
  ) => boolean;
  onApplyResolution: (
    res: any,
    nextTurn: Side,
    from?: number,
    to?: number,
  ) => void;
  onPendingChallenge: (event: ChallengeEvent | null) => void;
  onWinner: (winner: Side) => void;
  onPhaseEnd: () => void;
  onMessageChange: (msg: string) => void;
  onAIThinking: (thinking: boolean) => void;
  kamikazeChance: number;
}

export function useAITurn(opts: UseAITurnOptions) {
  const {
    phase,
    turn,
    winner,
    battleBoard,
    aiProfile,
    pieceById,
    crateTiles,
    pendingChallenge,
    pendingUpgradeRoll,
    pendingUpgradeActivation,
    pendingCrateChoice,
    pendingKamikaze,
    pendingVeteranPromo,
    shouldInterceptKamikaze,
    onApplyResolution,
    onPendingChallenge,
    onWinner,
    onPhaseEnd,
    onMessageChange,
    onAIThinking,
    kamikazeChance,
  } = opts;

  useEffect(() => {
    if (
      phase !== "battle" ||
      turn !== "ai" ||
      winner ||
      pendingChallenge ||
      pendingUpgradeRoll ||
      pendingUpgradeActivation ||
      pendingCrateChoice ||
      pendingKamikaze ||
      pendingVeteranPromo
    )
      return;

    onAIThinking(true);

    const timer = setTimeout(() => {
      const aiMove = chooseMoveForProfile(
        battleBoard,
        aiProfile,
        pieceById,
        crateTiles,
      );

      if (!aiMove) {
        onWinner("player");
        onPhaseEnd();
        onMessageChange(
          "Enemy command is out of legal moves. You hold the field.",
        );
        onAIThinking(false);
        return;
      }

      const target = battleBoard[aiMove.to];
      if (target?.side === "player") {
        // AI Kamikaze — only fires when an AI Private attacks a non-Private player piece
        if (shouldInterceptKamikaze(battleBoard, aiMove)) {
          if (Math.random() < kamikazeChance) {
            const kamikazeRes = resolveKamikazeMutualElimination(
              battleBoard,
              aiMove,
              pieceById,
            );
            onApplyResolution(kamikazeRes, "player", aiMove.from, aiMove.to);
            onAIThinking(false);
            return;
          }
          // AI declined Kamikaze — fall through to normal challenge
        }

        const event = prepareChallengeEvent(battleBoard, aiMove, pieceById);
        if (event) {
          onAIThinking(false);
          onPendingChallenge(event);
          return;
        }
      }

      const res = resolveBattleMove(battleBoard, aiMove, pieceById);
      onApplyResolution(res, "player", aiMove.from, aiMove.to);
      onAIThinking(false);
    }, AI_THINKING_DELAY_MS);

    return () => clearTimeout(timer);
  }, [
    phase,
    turn,
    winner,
    battleBoard,
    aiProfile,
    pieceById,
    crateTiles,
    pendingChallenge,
    pendingUpgradeRoll,
    pendingUpgradeActivation,
    pendingCrateChoice,
    pendingKamikaze,
    pendingVeteranPromo,
  ]);
}
