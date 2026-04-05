import { useEffect } from "react";
import { AI_THINKING_DELAY_MS } from "../constants/constants";
import { chooseMoveForProfile } from "../scripts/aiLogic";
import {
  getGeneralChargeMoves,
  getLegalMoves,
  isFiveStarGeneralPiece,
  prepareChallengeEvent,
  resolveBattleMove,
  resolveKamikazeMutualElimination,
} from "../scripts/gameLogic";
import type {
  AIProfile,
  BattleResolution,
  BoardPiece,
  ChallengeEvent,
  KamikazeEvent,
  Phase,
  PieceDefinition,
  PieceUpgradeId,
  Side,
} from "../scripts/types";
import type { OneStarBonusMoveEvent } from "./useOneStarGeneral";

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
  pendingThreeStarPassive: {
    resolution: BattleResolution;
    nextTurn: Side;
    from: number;
    to: number;
  } | null;
  pendingOneStarBonusMove: OneStarBonusMoveEvent | null;
  aiFlagSwapCooldownUntil: number | null;
  aiSpyCooldownUntil: number | null;
  aiGeneralChargeCooldownUntil: number | null;
  oneStarGeneralAICooldownUntil: number | null;
  // ── 2-Star General: Hold the Line ─────────────────────────────────────────
  /** Wall-clock timestamp until which the AI's Hold the Line is on cooldown. */
  aiTwoStarCooldownUntil: number | null;
  /** Returns true when the AI's Hold the Line ability is currently on cooldown. */
  isAITwoStarOnCooldown: () => boolean;
  /**
   * Apply the Hold restriction to a random player tile chosen by the AI.
   * Receives the target tile index.
   */
  onApplyAIHoldRestriction: (targetTileIndex: number) => void;
  /** Start the AI's Hold the Line cooldown. */
  onStartAITwoStarCooldown: () => void;
  /**
   * Returns true when the given move is blocked by a Hold the Line restriction.
   * Consumed by chooseMoveForProfile via the injected filter.
   */
  isBackwardMoveBlocked: (from: number, to: number, side: Side) => boolean;
  // ── Lt. Colonel stun ────────────────────────────────────────────────────────
  isTileStunned: (tileIndex: number) => boolean;
  onClearStuns: () => void;
  // Callbacks
  shouldInterceptKamikaze: (
    board: Record<number, BoardPiece>,
    move: any,
  ) => boolean;
  shouldInterceptThreeStarPassive: (
    attackerPieceId: string,
    defenderPieceId: string,
  ) => boolean;
  onQueueThreeStarPassive: (
    board: Record<number, BoardPiece>,
    from: number,
    to: number,
    nextTurn: Side,
  ) => void;
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
  onTryAISpyReveal: (board: Record<number, BoardPiece>) => boolean;
  onStartAIGeneralChargeCooldown: () => void;
  isAIGeneralChargeOnCooldown: () => boolean;
  onAIOneStarBonusMove: (
    board: Record<number, BoardPiece>,
    generalTileIndex: number,
  ) => void;
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
    pendingThreeStarPassive,
    pendingOneStarBonusMove,
    aiFlagSwapCooldownUntil,
    aiSpyCooldownUntil,
    aiGeneralChargeCooldownUntil,
    oneStarGeneralAICooldownUntil,
    aiTwoStarCooldownUntil,
    isAITwoStarOnCooldown,
    onApplyAIHoldRestriction,
    onStartAITwoStarCooldown,
    isBackwardMoveBlocked,
    isTileStunned,
    onClearStuns,
    shouldInterceptKamikaze,
    shouldInterceptThreeStarPassive,
    onQueueThreeStarPassive,
    onApplyResolution,
    onPendingChallenge,
    onWinner,
    onPhaseEnd,
    onMessageChange,
    onAIThinking,
    onStartAIFlagSwapCooldown,
    onTryAISpyReveal,
    onStartAIGeneralChargeCooldown,
    isAIGeneralChargeOnCooldown,
    onAIOneStarBonusMove,
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
      pendingVeteranPromo ||
      pendingThreeStarPassive ||
      pendingOneStarBonusMove
    )
      return;

    let cancelled = false;

    onAIThinking(true);

    const timer = setTimeout(() => {
      if (cancelled) return;

      // ── AI Spy reveal (Phantom Recon) ──────────────────────────────────────
      onTryAISpyReveal(battleBoard);

      // ── AI Flag-swap (Shadow March) logic ──────────────────────────────────
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
          onClearStuns();
          return;
        }
      }

      // ── AI 2-Star General: Hold the Line ───────────────────────────────────
      // The AI uses Hold the Line when its 2-Star General is on the board,
      // the ability is off cooldown, and there are player pieces to restrict.
      // It targets a random player piece.
      if (!isAITwoStarOnCooldown()) {
        const holdResult = tryAIHoldTheLine(battleBoard, pieceById);
        if (holdResult !== null) {
          onApplyAIHoldRestriction(holdResult);
          onStartAITwoStarCooldown();
          onAIThinking(false);
          onClearStuns();
          onApplyResolution(
            {
              board: battleBoard,
              winner: null,
              message:
                "Hold the Line! Enemy 2-Star General pinned one of your units — it cannot retreat for 2 rounds.",
              revealMessage:
                "Your restricted unit cannot move backward this round.",
              capturedByPlayer: [],
              capturedByAI: [],
            },
            "player",
          );
          return;
        }
      }

      // ── AI General Charge (Supreme Charge) logic ───────────────────────────
      const AI_CHARGE_USE_CHANCE =
        aiProfile.randomness > 0.6
          ? 0.3
          : aiProfile.randomness > 0.25
            ? 0.55
            : 0.8;

      if (!isAIGeneralChargeOnCooldown()) {
        const chargeResult = tryAIGeneralCharge(
          battleBoard,
          pieceById,
          AI_CHARGE_USE_CHANCE,
          isTileStunned,
        );
        if (chargeResult) {
          const { move: chargeMove, isCapture } = chargeResult;
          if (isCapture) {
            const target = battleBoard[chargeMove.to];

            if (
              target &&
              shouldInterceptThreeStarPassive(
                battleBoard[chargeMove.from]!.pieceId,
                target.pieceId,
              )
            ) {
              onStartAIGeneralChargeCooldown();
              onAIThinking(false);
              onQueueThreeStarPassive(
                battleBoard,
                chargeMove.from,
                chargeMove.to,
                "player",
              );
              onClearStuns();
              return;
            }

            const event = prepareChallengeEvent(
              battleBoard,
              chargeMove,
              pieceById,
            );
            if (event) {
              onStartAIGeneralChargeCooldown();
              onAIThinking(false);
              onPendingChallenge(event);
              onClearStuns();
              return;
            }
          } else {
            const res = resolveBattleMove(battleBoard, chargeMove, pieceById);
            onStartAIGeneralChargeCooldown();
            onApplyResolution(res, "player", chargeMove.from, chargeMove.to);
            onAIThinking(false);
            onClearStuns();
            return;
          }
        }
      }

      // ── Normal AI move ─────────────────────────────────────────────────────
      // Pass isBackwardMoveBlocked so chooseMoveForProfile can filter out
      // restricted backward moves for AI pieces.
      const aiMove = chooseMoveForProfile(
        battleBoard,
        aiProfile,
        pieceById,
        crateTiles,
        isTileStunned,
        isBackwardMoveBlocked,
      );

      if (!aiMove) {
        onWinner("player");
        onPhaseEnd();
        onMessageChange(
          "Enemy command is out of legal moves. You hold the field.",
        );
        onAIThinking(false);
        onClearStuns();
        return;
      }

      const target = battleBoard[aiMove.to];
      if (target?.side === "player") {
        // ── Kamikaze intercept ─────────────────────────────────────────────
        if (shouldInterceptKamikaze(battleBoard, aiMove)) {
          if (Math.random() < kamikazeChance) {
            const kamikazeRes = resolveKamikazeMutualElimination(
              battleBoard,
              aiMove,
              pieceById,
            );
            onApplyResolution(kamikazeRes, "player", aiMove.from, aiMove.to);
            onAIThinking(false);
            onClearStuns();
            return;
          }
        }

        // ── 3-Star General Last Stand intercept ────────────────────────────
        if (
          shouldInterceptThreeStarPassive(
            target.pieceId === undefined
              ? ""
              : battleBoard[aiMove.from]!.pieceId,
            target.pieceId,
          )
        ) {
          onAIThinking(false);
          onQueueThreeStarPassive(
            battleBoard,
            aiMove.from,
            aiMove.to,
            "player",
          );
          onClearStuns();
          return;
        }

        const event = prepareChallengeEvent(battleBoard, aiMove, pieceById);
        if (event) {
          onAIThinking(false);
          onPendingChallenge(event);
          onClearStuns();
          return;
        }
      }

      const res = resolveBattleMove(battleBoard, aiMove, pieceById);
      onApplyResolution(res, "player", aiMove.from, aiMove.to);
      onAIThinking(false);
      onClearStuns();
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
    pendingThreeStarPassive,
    pendingOneStarBonusMove,
    aiFlagSwapCooldownUntil,
    aiSpyCooldownUntil,
    aiGeneralChargeCooldownUntil,
    oneStarGeneralAICooldownUntil,
    aiTwoStarCooldownUntil,
  ]);
}

// ─── AI Flag-swap heuristic ───────────────────────────────────────────────────

function tryAIFlagSwap(
  board: Record<number, BoardPiece>,
  pieceById: Record<string, PieceDefinition>,
): { nextBoard: Record<number, BoardPiece> } | null {
  const flagEntry = Object.entries(board).find(
    ([, piece]) =>
      piece.side === "ai" && pieceById[piece.pieceId]?.label === "Flag",
  );
  if (!flagEntry) return null;
  const flagTileIndex = Number(flagEntry[0]);

  const legalPlayerMoves = getLegalMoves(board, "player", pieceById);
  const flagUnderThreat = legalPlayerMoves.some((m) => m.to === flagTileIndex);
  if (!flagUnderThreat) return null;

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

  const flagPiece = board[flagTileIndex];
  const allyPiece = board[safestAlly.tileIndex];
  const nextBoard = {
    ...board,
    [safestAlly.tileIndex]: { ...flagPiece },
    [flagTileIndex]: { ...allyPiece },
  };

  return { nextBoard };
}

// ─── AI Hold the Line heuristic ───────────────────────────────────────────────

/**
 * Returns the tile index of a random player piece to restrict, or null if
 * the AI's 2-Star General is not on the board or there are no player pieces.
 *
 * Conditions for use:
 *  1. The AI's 2-Star General is alive on the board.
 *  2. There is at least one player piece on the board to restrict.
 *  3. The AI randomly decides to use it (70% chance when conditions are met)
 *     so it doesn't always fire on the very first AI turn.
 */
function tryAIHoldTheLine(
  board: Record<number, BoardPiece>,
  pieceById: Record<string, PieceDefinition>,
): number | null {
  // Check AI 2-Star General is present
  const hasAITwoStarGeneral = Object.values(board).some(
    (piece) =>
      piece.side === "ai" &&
      pieceById[piece.pieceId]?.label === "2 Star\nGeneral",
  );
  if (!hasAITwoStarGeneral) return null;

  // Gather all player piece tile indices
  const playerTiles = Object.entries(board)
    .filter(([, piece]) => piece.side === "player")
    .map(([key]) => Number(key));

  if (playerTiles.length === 0) return null;

  // 70% chance to actually use it this turn (prevents deterministic use)
  if (Math.random() > 0.7) return null;

  // Pick a random player tile
  return playerTiles[Math.floor(Math.random() * playerTiles.length)];
}

// ─── AI General Charge heuristic ─────────────────────────────────────────────

function tryAIGeneralCharge(
  board: Record<number, BoardPiece>,
  pieceById: Record<string, PieceDefinition>,
  useChance: number,
  isTileStunned: (tileIndex: number) => boolean,
): { move: import("../scripts/types").BattleMove; isCapture: boolean } | null {
  const generalEntry = Object.entries(board).find(
    ([, piece]) =>
      piece.side === "ai" && isFiveStarGeneralPiece(piece.pieceId, pieceById),
  );
  if (!generalEntry) return null;

  const generalTileIndex = Number(generalEntry[0]);

  if (isTileStunned(generalTileIndex)) return null;

  const { allDestinations, challengeDestinations } = getGeneralChargeMoves(
    board,
    generalTileIndex,
    "ai",
  );
  if (allDestinations.length === 0) return null;

  const getTileRow = (ti: number) => Math.floor(ti / 9);
  const generalRow = getTileRow(generalTileIndex);

  const scoreDestination = (tileIndex: number): number => {
    const occupant = board[tileIndex];
    if (occupant && occupant.side === "player") {
      const strength = getStrengthByLabel(
        pieceById[occupant.pieceId]?.label ?? "",
      );
      return 10 + strength;
    }
    const destRow = getTileRow(tileIndex);
    const advancement = generalRow - destRow;
    return Math.max(0, advancement);
  };

  let bestChargeTile = -1;
  let bestChargeScore = -Infinity;
  allDestinations.forEach((ti) => {
    const score = scoreDestination(ti);
    if (score > bestChargeScore) {
      bestChargeScore = score;
      bestChargeTile = ti;
    }
  });

  if (bestChargeTile === -1) return null;

  const normalMoves = getLegalMoves(board, "ai", pieceById).filter(
    (m) => m.from === generalTileIndex,
  );
  let bestNormalScore = -Infinity;
  normalMoves.forEach((m) => {
    const score = scoreDestination(m.to);
    if (score > bestNormalScore) bestNormalScore = score;
  });

  if (bestChargeScore <= bestNormalScore) return null;
  if (Math.random() >= useChance) return null;

  const isCapture = challengeDestinations.includes(bestChargeTile);
  return {
    move: { side: "ai", from: generalTileIndex, to: bestChargeTile },
    isCapture,
  };
}

function getStrengthByLabel(label: string): number {
  const map: Record<string, number> = {
    Flag: 0,
    Spy: 1,
    Private: 2,
    Sgt: 3,
    "2nd Lt": 4,
    "1st Lt": 5,
    Cpt: 6,
    Major: 7,
    "Lt Col": 8,
    Col: 9,
    "1 Star\nGeneral": 10,
    "2 Star\nGeneral": 11,
    "3 Star\nGeneral": 12,
    "4 Star\nGeneral": 13,
    "5 Star\nGeneral": 14,
  };
  return map[label] ?? 0;
}
