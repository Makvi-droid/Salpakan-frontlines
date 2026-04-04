import { useEffect } from "react";
import { AI_THINKING_DELAY_MS } from "../constants/constants";
import { chooseMoveForProfile } from "../scripts/aiLogic";
import {
  getLegalMoves,
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
  /**
   * Wall-clock timestamp (ms) until which the AI Flag-swap ability is on
   * cooldown. null means it is available.
   */
  aiFlagSwapCooldownUntil: number | null;
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
  onStartAIFlagSwapCooldown: () => void;
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
    aiFlagSwapCooldownUntil,
    shouldInterceptKamikaze,
    onApplyResolution,
    onPendingChallenge,
    onWinner,
    onPhaseEnd,
    onMessageChange,
    onAIThinking,
    onStartAIFlagSwapCooldown,
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

    let cancelled = false;

    onAIThinking(true);

    const timer = setTimeout(() => {
      if (cancelled) return;

      // ── AI Flag-swap (Shadow March) logic ──────────────────────────────────
      // The AI will opportunistically use the Flag-swap when it can't otherwise
      // find a direct winning move, its Flag is under threat, and the cooldown
      // has expired.
      const aiFlagSwapAvailable =
        !aiFlagSwapCooldownUntil || Date.now() >= aiFlagSwapCooldownUntil;

      if (aiFlagSwapAvailable) {
        const swapResult = tryAIFlagSwap(battleBoard, pieceById);
        if (swapResult) {
          onApplyResolution(
            {
              board: swapResult.nextBoard,
              winner: null,
              message:
                "The enemy Flag slipped into the shadows, trading places with an ally.",
              revealMessage: null,
              capturedByPlayer: [],
              capturedByAI: [],
            },
            "player",
          );
          onStartAIFlagSwapCooldown();
          onAIThinking(false);
          return;
        }
      }

      // ── Normal AI move ─────────────────────────────────────────────────────
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

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
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
    aiFlagSwapCooldownUntil,
  ]);
}

// ─── AI Flag-swap heuristic ───────────────────────────────────────────────────

/**
 * Decides whether the AI should use Shadow March this turn and, if so,
 * returns the swapped board. Returns null when the ability should not fire.
 *
 * Trigger condition: the AI Flag is adjacent to at least one player piece
 * (i.e. under immediate threat) AND there is a non-Flag ally elsewhere on
 * the board to swap with. The AI picks the ally that is farthest from any
 * player piece — a simple "safety" heuristic that pulls the Flag away from
 * danger without requiring full look-ahead.
 */
function tryAIFlagSwap(
  board: Record<number, BoardPiece>,
  pieceById: Record<string, PieceDefinition>,
): { nextBoard: Record<number, BoardPiece> } | null {
  // 1. Find the AI Flag tile.
  const flagEntry = Object.entries(board).find(
    ([, piece]) =>
      piece.side === "ai" && pieceById[piece.pieceId]?.label === "Flag",
  );
  if (!flagEntry) return null;
  const flagTileIndex = Number(flagEntry[0]);

  // 2. Check if the Flag is under immediate threat (player piece adjacent).
  const legalPlayerMoves = getLegalMoves(board, "player", pieceById);
  const flagUnderThreat = legalPlayerMoves.some((m) => m.to === flagTileIndex);
  if (!flagUnderThreat) return null;

  // 3. Gather candidate allies: AI-owned, not the Flag, not Bombs (immovable).
  const playerTiles = Object.entries(board)
    .filter(([, p]) => p.side === "player")
    .map(([k]) => Number(k));

  const candidates = Object.entries(board).filter(([tileKey, piece]) => {
    if (Number(tileKey) === flagTileIndex) return false;
    if (piece.side !== "ai") return false;
    const label = pieceById[piece.pieceId]?.label;
    if (label === "Flag" || label === "Bomb") return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // 4. Score each candidate by minimum Manhattan distance to any player tile.
  //    Higher = safer.
  const safestAlly = candidates.reduce<{ tileIndex: number; score: number }>(
    (best, [tileKey]) => {
      const ti = Number(tileKey);
      const minDist = playerTiles.reduce((min, pt) => {
        const dr = Math.abs(Math.floor(ti / 10) - Math.floor(pt / 10));
        const dc = Math.abs((ti % 10) - (pt % 10));
        return Math.min(min, dr + dc);
      }, Infinity);
      return minDist > best.score ? { tileIndex: ti, score: minDist } : best;
    },
    { tileIndex: -1, score: -1 },
  );

  if (safestAlly.tileIndex === -1) return null;

  // 5. Build the swapped board.
  const flagPiece = board[flagTileIndex];
  const allyPiece = board[safestAlly.tileIndex];
  const nextBoard = {
    ...board,
    [safestAlly.tileIndex]: { ...flagPiece },
    [flagTileIndex]: { ...allyPiece },
  };

  return { nextBoard };
}
