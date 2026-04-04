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
  // ── 3-Star General Last Stand ──────────────────────────────────────────────
  pendingThreeStarPassive: {
    resolution: BattleResolution;
    nextTurn: Side;
    from: number;
    to: number;
  } | null;
  /**
   * Wall-clock timestamp (ms) until which the AI Flag-swap ability is on
   * cooldown. null means it is available.
   */
  aiFlagSwapCooldownUntil: number | null;
  /**
   * Wall-clock timestamp (ms) until which the AI Spy reveal is on cooldown.
   * null means the ability is available.
   */
  aiSpyCooldownUntil: number | null;
  /**
   * Wall-clock timestamp (ms) until which the AI General Charge ability is on
   * cooldown. null means it is available.
   */
  aiGeneralChargeCooldownUntil: number | null;
  // Callbacks
  shouldInterceptKamikaze: (
    board: Record<number, BoardPiece>,
    move: any,
  ) => boolean;
  /**
   * Returns true when the proposed challenge should be intercepted by the
   * 3-Star General's Last Stand passive.
   */
  shouldInterceptThreeStarPassive: (
    attackerPieceId: string,
    defenderPieceId: string,
  ) => boolean;
  /**
   * Queues the Last Stand modal + pre-built resolution.
   */
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
  /**
   * Attempts the AI Spy reveal. Returns true if the ability fired this turn.
   */
  onTryAISpyReveal: (board: Record<number, BoardPiece>) => boolean;
  /** Starts the AI General Charge cooldown after the ability is used */
  onStartAIGeneralChargeCooldown: () => void;
  /** Returns true when the AI General Charge is still cooling down */
  isAIGeneralChargeOnCooldown: () => boolean;
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
    aiFlagSwapCooldownUntil,
    aiSpyCooldownUntil,
    aiGeneralChargeCooldownUntil,
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
      pendingThreeStarPassive // ← block AI while Last Stand modal is open
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
        );
        if (chargeResult) {
          const { move: chargeMove, isCapture } = chargeResult;
          if (isCapture) {
            const target = battleBoard[chargeMove.to];

            // ── 3-Star General Last Stand check inside General Charge ────────
            // If the AI's General Charge lands on the player's 3-Star General
            // and the AI's piece qualifies as a trigger (5-Star General here),
            // intercept with Last Stand before opening the normal challenge modal.
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
              return;
            }
          } else {
            const res = resolveBattleMove(battleBoard, chargeMove, pieceById);
            onStartAIGeneralChargeCooldown();
            onApplyResolution(res, "player", chargeMove.from, chargeMove.to);
            onAIThinking(false);
            return;
          }
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
        // ── Kamikaze intercept (existing) ──────────────────────────────────
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

        // ── 3-Star General Last Stand intercept ────────────────────────────
        // When the AI attacks the player's 3-Star General with a qualifying
        // piece, show the Last Stand modal instead of the normal challenge.
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
          return;
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
    pendingThreeStarPassive,
    aiFlagSwapCooldownUntil,
    aiSpyCooldownUntil,
    aiGeneralChargeCooldownUntil,
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

// ─── AI General Charge heuristic ─────────────────────────────────────────────

function tryAIGeneralCharge(
  board: Record<number, BoardPiece>,
  pieceById: Record<string, PieceDefinition>,
  useChance: number,
): { move: import("../scripts/types").BattleMove; isCapture: boolean } | null {
  const generalEntry = Object.entries(board).find(
    ([, piece]) =>
      piece.side === "ai" && isFiveStarGeneralPiece(piece.pieceId, pieceById),
  );
  if (!generalEntry) return null;

  const generalTileIndex = Number(generalEntry[0]);

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
