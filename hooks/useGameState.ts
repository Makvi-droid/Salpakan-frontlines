import { useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { DIFFICULTY_PROFILES } from "../constants/constants";
import { generateAIFormation } from "../scripts/aiLogic";
import {
  buildBattleBoard,
  getGeneralChargeMoves,
  getLegalMoves,
  prepareChallengeEvent,
} from "../scripts/gameLogic";
import type {
  BattleMove,
  BoardPiece,
  ChallengeEvent,
  Difficulty,
  Phase,
  PieceUpgradeId,
  Side,
} from "../scripts/types";

import { useAITurn } from "./useAITurn";
import { useBattleResolution } from "./useBattleResolution";
import { useCaptainScan } from "./useCaptainScan";
import { useColonelReveal } from "./useColonelReveal";
import { useFirstLtReveal } from "./useFirstLtReveal";
import { useFlagSwap } from "./useFlagSwap";
import { useFourStarPush } from "./useFourStarPush";
import { useGeneralCharge } from "./useGeneralCharge";
import { useKamikaze } from "./useKamikaze";
import { useLtColonelStun } from "./useLtColonelStun";
import { useMajorSwap } from "./useMajorSwap";
import { useOneStarGeneral } from "./useOneStarGeneral";
import { usePlacement } from "./usePlacement";
import { useSecondLtReveal } from "./useSecondLtReveal";
import { useSpyReveal } from "./useSpyReveal";
import { useThreeStarPassive } from "./useThreeStarPassive";
import { useTwoStarGeneral } from "./useTwoStarGeneral";
import { useVeteranPromo } from "./useVeteranPromo";

/** Hook that owns all game state and exposes handlers to the screen. */
export function useGameState(difficulty: Difficulty) {
  const router = useRouter();
  const aiProfile = DIFFICULTY_PROFILES[difficulty];

  // ── Phase / turn / battle core ───────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("formation");
  const [turn, setTurn] = useState<Side>("player");
  const [battleBoard, setBattleBoard] = useState<Record<number, BoardPiece>>(
    {},
  );
  const [selectedBattleTileIndex, setSelectedBattleTileIndex] = useState<
    number | null
  >(null);
  const [battleMessage, setBattleMessage] = useState(
    "Build your line, then confirm to begin the clash.",
  );
  const [revealMessage, setRevealMessage] = useState<string | null>(null);
  const [aiThinking, setAIThinking] = useState(false);
  const [winner, setWinner] = useState<Side | null>(null);
  const [capturedByPlayer, setCapturedByPlayer] = useState<string[]>([]);
  const [capturedByAI, setCapturedByAI] = useState<string[]>([]);
  const [lastMoveTrail, setLastMoveTrail] = useState<{
    from: number;
    to: number;
    side: Side;
  } | null>(null);
  const [endedBySurrender, setEndedBySurrender] = useState(false);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [isInventoryExpanded, setIsInventoryExpanded] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showReadyModal, setShowReadyModal] = useState(false);

  // ── Challenge state ──────────────────────────────────────────────────────────
  const [pendingChallenge, setPendingChallenge] =
    useState<ChallengeEvent | null>(null);
  const [pendingUpgradeRoll, setPendingUpgradeRoll] = useState<{
    upgrade: PieceUpgradeId;
  } | null>(null);
  const [pendingUpgradeActivation, setPendingUpgradeActivation] = useState<{
    legalMove: BattleMove;
    playerUpgrade: PieceUpgradeId;
  } | null>(null);

  // ── Placement sub-hook ───────────────────────────────────────────────────────
  const placement = usePlacement(phase);
  const { pieceDefinitions, pieceById, boardTiles, placedByTileIndex } =
    placement;

  // ── Veteran promo sub-hook ───────────────────────────────────────────────────
  const veteran = useVeteranPromo(pieceById);

  // ── Decoy helpers (needed by battle resolution) ──────────────────────────────
  const decoyShortLabelPool = useMemo(
    () => Array.from(new Set(pieceDefinitions.map((p) => p.shortLabel))),
    [pieceDefinitions],
  );

  const getRandomDecoyShortLabel = (pieceId: string) => {
    const trueShortLabel = pieceById[pieceId]?.shortLabel;
    const candidates = decoyShortLabelPool.filter(
      (label) => label !== trueShortLabel,
    );
    const pool = candidates.length > 0 ? candidates : decoyShortLabelPool;
    if (pool.length === 0) return "?";
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // ── 1-Star General sub-hook ──────────────────────────────────────────────────
  const oneStarGeneral = useOneStarGeneral({ pieceById });

  // ── 2-Star General sub-hook ──────────────────────────────────────────────────
  const twoStarGeneral = useTwoStarGeneral({ pieceById });

  // ── Battle resolution sub-hook ───────────────────────────────────────────────
  const resolution = useBattleResolution({
    pieceById,
    decoyShortLabelPool,
    getRandomDecoyShortLabel,
    onBoardChange: setBattleBoard,
    onWinner: (w) => {
      setWinner(w);
    },
    onPhaseEnd: () => {
      setPhase("ended");
      setEndedBySurrender(false);
    },
    onTurnChange: setTurn,
    onMessageChange: setBattleMessage,
    onRevealMessage: setRevealMessage,
    onCapturedByPlayer: (ids) => setCapturedByPlayer((c) => [...c, ...ids]),
    onCapturedByAI: (ids) => setCapturedByAI((c) => [...c, ...ids]),
    onLastMoveTrail: setLastMoveTrail,
    onSelectedBattleTileIndex: setSelectedBattleTileIndex,
    onPendingUpgradeRoll: setPendingUpgradeRoll,
    checkAndQueueVeteranPromo: veteran.checkAndQueueVeteranPromo,
    onOneStarGeneralWin: (generalTileIndex, winningSide) => {
      if (winningSide === "player" && oneStarGeneral.isPlayerOnCooldown()) {
        setTurn(winningSide === "player" ? "ai" : "player");
        return;
      }
      if (winningSide === "ai" && oneStarGeneral.isAIOnCooldown()) {
        setTurn("player");
        return;
      }
      oneStarGeneral.queueBonusMove(generalTileIndex, winningSide);
    },
  });

  // Wrap applyResolution to close over the current crateByTile AND to
  // decrement the Hold the Line restriction counters after every half-turn.
  const applyResolution = (
    res: any,
    nextTurn: Side,
    from?: number,
    to?: number,
  ) => {
    if (from !== undefined && to !== undefined) {
      twoStarGeneral.decrementRestrictions(from, to);
    } else {
      twoStarGeneral.decrementRestrictions();
    }

    const nextBoard: Record<number, BoardPiece> = res.board ?? {};
    if (from !== undefined && !nextBoard[from]) {
      twoStarGeneral.removeRestrictionForTile(from);
    }
    if (to !== undefined && !nextBoard[to]) {
      twoStarGeneral.removeRestrictionForTile(to);
    }

    resolution.applyResolution(res, nextTurn, resolution.crateByTile, from, to);
  };

  // ── Kamikaze sub-hook ────────────────────────────────────────────────────────
  const kamikaze = useKamikaze({
    pieceById,
    onApplyResolution: applyResolution,
    onPendingChallenge: setPendingChallenge,
    onPendingUpgradeActivation: setPendingUpgradeActivation,
  });

  // ── Flag swap sub-hook ───────────────────────────────────────────────────────
  const flagSwap = useFlagSwap({ pieceById });

  // ── Spy reveal sub-hook ──────────────────────────────────────────────────────
  const spyReveal = useSpyReveal({ pieceById });

  // ── Colonel reveal sub-hook ──────────────────────────────────────────────────
  const colonelReveal = useColonelReveal({ pieceById });

  // ── 1st Lieutenant Intel Report sub-hook ────────────────────────────────────
  const firstLtReveal = useFirstLtReveal({ pieceById });

  // ── 2nd Lieutenant Field Assessment sub-hook ─────────────────────────────────
  const secondLtReveal = useSecondLtReveal({ pieceById });

  // ── General Charge sub-hook ──────────────────────────────────────────────────
  const generalCharge = useGeneralCharge({ pieceById });

  // ── 4-Star General: Diagonal March sub-hook ──────────────────────────────────
  const fourStarPush = useFourStarPush({ pieceById });

  // ── 3-Star General Last Stand sub-hook ──────────────────────────────────────
  const threeStarPassive = useThreeStarPassive({ pieceById });

  // ── Lt. Colonel Stun sub-hook ────────────────────────────────────────────────
  const ltColonelStun = useLtColonelStun({ pieceById });

  // ── Major Swap sub-hook ──────────────────────────────────────────────────────
  const majorSwap = useMajorSwap({ pieceById });

  // ── Captain Scan sub-hook ────────────────────────────────────────────────────
  const captainScan = useCaptainScan({ pieceById });

  // ── AI turn sub-hook ─────────────────────────────────────────────────────────
  useAITurn({
    phase,
    turn,
    winner,
    battleBoard,
    aiProfile,
    pieceById,
    crateTiles: useMemo(
      () => Object.keys(resolution.crateByTile).map(Number),
      [resolution.crateByTile],
    ),
    pendingChallenge,
    pendingUpgradeRoll,
    pendingUpgradeActivation,
    pendingCrateChoice: resolution.pendingCrateChoice,
    pendingKamikaze: kamikaze.pendingKamikaze,
    pendingVeteranPromo: veteran.pendingVeteranPromo,
    pendingThreeStarPassive: threeStarPassive.pendingThreeStarPassive,
    pendingOneStarBonusMove: oneStarGeneral.pendingBonusMove,
    aiFlagSwapCooldownUntil: flagSwap.aiCooldownUntil,
    onStartAIFlagSwapCooldown: flagSwap.startAICooldown,
    aiSpyCooldownUntil: spyReveal.aiCooldownUntil,
    onTryAISpyReveal: spyReveal.tryAISpyReveal,
    aiGeneralChargeCooldownUntil: generalCharge.aiCooldownUntil,
    onStartAIGeneralChargeCooldown: generalCharge.startAICooldown,
    isAIGeneralChargeOnCooldown: generalCharge.isAIOnCooldown,
    shouldInterceptThreeStarPassive:
      threeStarPassive.shouldInterceptThreeStarPassive,
    onQueueThreeStarPassive: threeStarPassive.queueThreeStarPassive,
    isTileStunned: ltColonelStun.isTileStunned,
    onClearStuns: ltColonelStun.clearStuns,
    aiTwoStarCooldownUntil: twoStarGeneral.aiCooldownUntil,
    isAITwoStarOnCooldown: twoStarGeneral.isAIOnCooldown,
    onApplyAIHoldRestriction: twoStarGeneral.applyAIHoldRestriction,
    onStartAITwoStarCooldown: twoStarGeneral.startAICooldown,
    isBackwardMoveBlocked: twoStarGeneral.isBackwardMoveBlocked,
    oneStarGeneralAICooldownUntil: oneStarGeneral.aiCooldownUntil,
    onAIOneStarBonusMove: (board, generalTileIndex) => {
      if (oneStarGeneral.isAIOnCooldown()) return;
      const bonusTiles = oneStarGeneral.getBonusMoveTiles(
        board,
        generalTileIndex,
      );
      if (bonusTiles.length === 0) {
        oneStarGeneral.startAICooldown();
        return;
      }
      const bestTile = bonusTiles.reduce((best, ti) => (ti < best ? ti : best));
      const nextBoard = oneStarGeneral.applyBonusMove(
        board,
        generalTileIndex,
        bestTile,
      );
      setBattleBoard(nextBoard);
      setBattleMessage(
        "Press the Advantage! The enemy 1-Star General made a bonus move.",
      );
      oneStarGeneral.startAICooldown();
      setTurn("player");
    },
    shouldInterceptKamikaze: kamikaze.shouldInterceptKamikaze,
    onApplyResolution: applyResolution,
    onPendingChallenge: setPendingChallenge,
    onWinner: setWinner,
    onPhaseEnd: () => {
      setPhase("ended");
      setEndedBySurrender(false);
    },
    onMessageChange: setBattleMessage,
    onAIThinking: setAIThinking,
    kamikazeChance: aiProfile.kamikazeChance,
    // ── 4-Star General: Diagonal March ──────────────────────────────────────
    aiFourStarDiagonalCooldownUntil: fourStarPush.aiCooldownUntil,
    isAIFourStarDiagonalOnCooldown: fourStarPush.isAIOnCooldown,
    onStartAIFourStarDiagonalCooldown: fourStarPush.startAICooldown,
    getAIDiagonalMarchTiles: fourStarPush.getDiagonalMarchTiles,
    isAIFourStarGeneral: fourStarPush.isAIFourStarGeneral,
  });

  // ── Derived values ───────────────────────────────────────────────────────────
  const selectedBattleMoves = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return [];
    if (generalCharge.generalChargeActive) {
      const piece = battleBoard[selectedBattleTileIndex];
      if (piece && generalCharge.isPlayerFiveStarGeneral(piece)) {
        const { allDestinations } = getGeneralChargeMoves(
          battleBoard,
          selectedBattleTileIndex,
          "player",
        );
        return allDestinations;
      }
    }
    return getLegalMoves(battleBoard, "player", pieceById)
      .filter((m) => m.from === selectedBattleTileIndex)
      .filter(
        (m) => !twoStarGeneral.isBackwardMoveBlocked(m.from, m.to, "player"),
      )
      .map((m) => m.to);
  }, [
    battleBoard,
    phase,
    pieceById,
    selectedBattleTileIndex,
    generalCharge.generalChargeActive,
    generalCharge.isPlayerFiveStarGeneral,
    twoStarGeneral.isBackwardMoveBlocked,
    twoStarGeneral.restrictions,
  ]);

  const challengeTargetTiles = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return [];
    if (generalCharge.generalChargeActive) {
      const piece = battleBoard[selectedBattleTileIndex];
      if (piece && generalCharge.isPlayerFiveStarGeneral(piece)) {
        const { challengeDestinations } = getGeneralChargeMoves(
          battleBoard,
          selectedBattleTileIndex,
          "player",
        );
        return challengeDestinations;
      }
    }
    return selectedBattleMoves.filter((to) => battleBoard[to]?.side === "ai");
  }, [
    battleBoard,
    phase,
    selectedBattleTileIndex,
    selectedBattleMoves,
    generalCharge.generalChargeActive,
    generalCharge.isPlayerFiveStarGeneral,
  ]);

  const capturedPlayerNames = useMemo(
    () =>
      capturedByPlayer.map((id) => pieceById[id]?.shortLabel ?? "?").join("  "),
    [capturedByPlayer, pieceById],
  );
  const capturedAINames = useMemo(
    () => capturedByAI.map((id) => pieceById[id]?.shortLabel ?? "?").join("  "),
    [capturedByAI, pieceById],
  );

  const crateTiles = useMemo(
    () => Object.keys(resolution.crateByTile).map(Number),
    [resolution.crateByTile],
  );

  // ── Flag swap derived values ─────────────────────────────────────────────────
  const selectedPieceIsFlag = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return false;
    const piece = battleBoard[selectedBattleTileIndex];
    if (!piece) return false;
    return flagSwap.isFlagPiece(piece);
  }, [phase, selectedBattleTileIndex, battleBoard, flagSwap.isFlagPiece]);

  const flagSwapAllyTiles = useMemo(() => {
    if (!flagSwap.flagSwapActive) return [];
    return flagSwap.getAllySwapTiles(battleBoard, selectedBattleTileIndex);
  }, [
    flagSwap.flagSwapActive,
    flagSwap.getAllySwapTiles,
    battleBoard,
    selectedBattleTileIndex,
  ]);

  // ── Spy reveal derived values ─────────────────────────────────────────────────
  const selectedPieceIsSpy = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return false;
    const piece = battleBoard[selectedBattleTileIndex];
    if (!piece) return false;
    return spyReveal.isPlayerSpyPiece(piece);
  }, [phase, selectedBattleTileIndex, battleBoard, spyReveal.isPlayerSpyPiece]);

  // ── Colonel reveal derived values ─────────────────────────────────────────────
  const selectedPieceIsColonel = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return false;
    if (turn !== "player" || !!winner) return false;
    const piece = battleBoard[selectedBattleTileIndex];
    if (!piece) return false;
    return colonelReveal.isPlayerColonelPiece(piece);
  }, [
    phase,
    turn,
    winner,
    selectedBattleTileIndex,
    battleBoard,
    colonelReveal.isPlayerColonelPiece,
  ]);

  const colonelDiagonalTiles = useMemo(() => {
    if (!colonelReveal.colonelRevealActive) return [];
    if (selectedBattleTileIndex === null) return [];
    return colonelReveal.getDiagonalEnemyTiles(
      battleBoard,
      selectedBattleTileIndex,
    );
  }, [
    colonelReveal.colonelRevealActive,
    colonelReveal.getDiagonalEnemyTiles,
    battleBoard,
    selectedBattleTileIndex,
  ]);

  // ── 1st Lieutenant Intel Report derived values ───────────────────────────────
  const selectedPieceIsFirstLt = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return false;
    if (turn !== "player" || !!winner) return false;
    const piece = battleBoard[selectedBattleTileIndex];
    if (!piece) return false;
    return firstLtReveal.isPlayerFirstLtPiece(piece);
  }, [
    phase,
    turn,
    winner,
    selectedBattleTileIndex,
    battleBoard,
    firstLtReveal.isPlayerFirstLtPiece,
  ]);

  // ── 2nd Lieutenant Field Assessment derived values ───────────────────────────
  const selectedPieceIsSecondLt = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return false;
    if (turn !== "player" || !!winner) return false;
    const piece = battleBoard[selectedBattleTileIndex];
    if (!piece) return false;
    return secondLtReveal.isPlayerSecondLtPiece(piece);
  }, [
    phase,
    turn,
    winner,
    selectedBattleTileIndex,
    battleBoard,
    secondLtReveal.isPlayerSecondLtPiece,
  ]);

  // ── Lt. Colonel stun derived values ─────────────────────────────────────────
  const selectedPieceIsLtColonel = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return false;
    if (turn !== "player" || !!winner) return false;
    const piece = battleBoard[selectedBattleTileIndex];
    if (!piece) return false;
    return ltColonelStun.isPlayerLtColonelPiece(piece);
  }, [
    phase,
    turn,
    winner,
    selectedBattleTileIndex,
    battleBoard,
    ltColonelStun.isPlayerLtColonelPiece,
  ]);

  const ltColonelDiagonalTiles = useMemo(() => {
    if (!ltColonelStun.ltColonelStunActive) return [];
    if (selectedBattleTileIndex === null) return [];
    return ltColonelStun.getDiagonalEnemyTiles(
      battleBoard,
      selectedBattleTileIndex,
    );
  }, [
    ltColonelStun.ltColonelStunActive,
    ltColonelStun.getDiagonalEnemyTiles,
    battleBoard,
    selectedBattleTileIndex,
  ]);

  // ── Major swap derived values ────────────────────────────────────────────────
  const selectedPieceIsMajor = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return false;
    if (turn !== "player" || !!winner) return false;
    const piece = battleBoard[selectedBattleTileIndex];
    if (!piece) return false;
    return majorSwap.isPlayerMajorPiece(piece);
  }, [
    phase,
    turn,
    winner,
    selectedBattleTileIndex,
    battleBoard,
    majorSwap.isPlayerMajorPiece,
  ]);

  const majorSwapAllyTiles = useMemo(() => {
    if (!majorSwap.majorSwapActive) return [];
    if (selectedBattleTileIndex === null) return [];
    return majorSwap.getOrthogonalAllyTiles(
      battleBoard,
      selectedBattleTileIndex,
    );
  }, [
    majorSwap.majorSwapActive,
    majorSwap.getOrthogonalAllyTiles,
    battleBoard,
    selectedBattleTileIndex,
  ]);

  // ── General Charge derived values ────────────────────────────────────────────
  const selectedPieceIsGeneralFiveStar = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return false;
    if (turn !== "player" || !!winner) return false;
    const piece = battleBoard[selectedBattleTileIndex];
    if (!piece) return false;
    return generalCharge.isPlayerFiveStarGeneral(piece);
  }, [
    phase,
    turn,
    winner,
    selectedBattleTileIndex,
    battleBoard,
    generalCharge.isPlayerFiveStarGeneral,
  ]);

  // ── 4-Star General: Diagonal March derived values ────────────────────────────
  const selectedPieceIsGeneralFourStar = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return false;
    if (turn !== "player" || !!winner) return false;
    const piece = battleBoard[selectedBattleTileIndex];
    if (!piece) return false;
    return fourStarPush.isPlayerFourStarGeneral(piece);
  }, [
    phase,
    turn,
    winner,
    selectedBattleTileIndex,
    battleBoard,
    fourStarPush.isPlayerFourStarGeneral,
  ]);

  /**
   * All diagonal tiles (move + challenge) for the 4-Star General.
   * Computed from the latched generalTileIndex when the ability is active.
   * Used by BoardGrid to highlight valid destinations.
   */
  const fourStarDiagonalAllTiles = useMemo(() => {
    if (!fourStarPush.fourStarPushActive) return [];
    const tileIndex = fourStarPush.generalTileIndex;
    if (tileIndex === null) return [];
    return fourStarPush.getDiagonalMarchTiles(battleBoard, tileIndex, "player")
      .allTiles;
  }, [
    fourStarPush.fourStarPushActive,
    fourStarPush.generalTileIndex,
    fourStarPush.getDiagonalMarchTiles,
    battleBoard,
  ]);

  /**
   * Subset of diagonal tiles that are occupied by enemies (challenge targets).
   */
  const fourStarDiagonalChallengeTiles = useMemo(() => {
    if (!fourStarPush.fourStarPushActive) return [];
    const tileIndex = fourStarPush.generalTileIndex;
    if (tileIndex === null) return [];
    return fourStarPush.getDiagonalMarchTiles(battleBoard, tileIndex, "player")
      .challengeTiles;
  }, [
    fourStarPush.fourStarPushActive,
    fourStarPush.generalTileIndex,
    fourStarPush.getDiagonalMarchTiles,
    battleBoard,
  ]);

  // ── Captain scan derived values ──────────────────────────────────────────────
  const selectedPieceIsCaptain = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return false;
    if (turn !== "player" || !!winner) return false;
    const piece = battleBoard[selectedBattleTileIndex];
    if (!piece) return false;
    return captainScan.isPlayerCaptainPiece(piece);
  }, [
    phase,
    turn,
    winner,
    selectedBattleTileIndex,
    battleBoard,
    captainScan.isPlayerCaptainPiece,
  ]);

  // ── 1-Star General derived values ────────────────────────────────────────────
  const selectedPieceIsOneStarGeneral = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return false;
    if (turn !== "player" || !!winner) return false;
    const piece = battleBoard[selectedBattleTileIndex];
    if (!piece) return false;
    return oneStarGeneral.isPlayerOneStarGeneral(piece);
  }, [
    phase,
    turn,
    winner,
    selectedBattleTileIndex,
    battleBoard,
    oneStarGeneral.isPlayerOneStarGeneral,
  ]);

  // ── 2-Star General derived values ────────────────────────────────────────────
  const selectedPieceIsTwoStarGeneral = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return false;
    if (turn !== "player" || !!winner) return false;
    const piece = battleBoard[selectedBattleTileIndex];
    if (!piece) return false;
    return twoStarGeneral.isPlayerTwoStarGeneral(piece);
  }, [
    phase,
    turn,
    winner,
    selectedBattleTileIndex,
    battleBoard,
    twoStarGeneral.isPlayerTwoStarGeneral,
  ]);

  const holdRestrictedTiles = useMemo(
    () => twoStarGeneral.getRestrictedTileIndices(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [twoStarGeneral.restrictions],
  );

  const [oneStarGeneralActiveTile, setOneStarGeneralActiveTile] = useState<
    number | null
  >(null);

  const oneStarBonusMoveTilesComputed = useMemo(() => {
    if (!oneStarGeneral.bonusMoveActive || oneStarGeneralActiveTile === null)
      return [];
    return oneStarGeneral.getBonusMoveTiles(
      battleBoard,
      oneStarGeneralActiveTile,
    );
  }, [
    oneStarGeneral.bonusMoveActive,
    oneStarGeneralActiveTile,
    battleBoard,
    oneStarGeneral.getBonusMoveTiles,
  ]);

  // ── Shared: fire challenge ───────────────────────────────────────────────────
  const fireChallenge = (legalMove: BattleMove) => {
    if (kamikaze.shouldInterceptKamikaze(battleBoard, legalMove)) {
      const attackerSide = battleBoard[legalMove.from]?.side;
      if (attackerSide === "player") {
        kamikaze.setPendingKamikaze(
          kamikaze.buildKamikazeEvent(battleBoard, legalMove),
        );
        return;
      }
    }

    const attackerPiece = battleBoard[legalMove.from];
    const defenderPiece = battleBoard[legalMove.to];
    if (
      attackerPiece &&
      defenderPiece &&
      threeStarPassive.shouldInterceptThreeStarPassive(
        attackerPiece.pieceId,
        defenderPiece.pieceId,
      )
    ) {
      const nextTurn: Side = legalMove.side === "player" ? "ai" : "player";
      threeStarPassive.queueThreeStarPassive(
        battleBoard,
        legalMove.from,
        legalMove.to,
        nextTurn,
      );
      return;
    }

    const attackingPiece = battleBoard[legalMove.from];
    if (attackingPiece?.side === "player" && attackingPiece.upgrade) {
      setPendingUpgradeActivation({
        legalMove,
        playerUpgrade: attackingPiece.upgrade,
      });
      return;
    }

    const event = prepareChallengeEvent(battleBoard, legalMove, pieceById);
    if (event) setPendingChallenge(event);
  };

  // ── Upgrade activation ───────────────────────────────────────────────────────
  const handleUpgradeActivationConfirm = (useUpgrade: boolean) => {
    if (!pendingUpgradeActivation) return;
    const { legalMove } = pendingUpgradeActivation;
    setPendingUpgradeActivation(null);

    let boardForEvent = battleBoard;
    if (!useUpgrade) {
      const piece = battleBoard[legalMove.from];
      if (piece) {
        const { upgrade, upgradeCharges, ...pieceWithoutUpgrade } = piece;
        boardForEvent = {
          ...battleBoard,
          [legalMove.from]: pieceWithoutUpgrade as BoardPiece,
        };
      }
    }
    const event = prepareChallengeEvent(boardForEvent, legalMove, pieceById);
    if (event) setPendingChallenge(event);
  };

  // ── Challenge modal dismiss ──────────────────────────────────────────────────
  const handleChallengeDismiss = () => {
    if (!pendingChallenge) return;
    const {
      resolution: res,
      attackerSide,
      attackerUpgrade,
      defenderUpgrade,
      outcome,
      from,
      to,
    } = pendingChallenge;
    setPendingChallenge(null);

    const nextResolution = { ...res, board: { ...res.board } };
    const enemyIsAttacker = attackerSide === "ai";
    const enemyUpgrade = enemyIsAttacker ? attackerUpgrade : defenderUpgrade;
    const enemySurvived =
      (enemyIsAttacker && outcome > 0) || (!enemyIsAttacker && outcome < 0);

    if (enemyUpgrade === "iron-veil" && enemySurvived) {
      const survivingPiece = nextResolution.board[to];
      if (
        survivingPiece?.side === "ai" &&
        survivingPiece.upgrade === "iron-veil"
      ) {
        nextResolution.board[to] = {
          ...survivingPiece,
          ironVeilKnownToPlayer: true,
        };
      }
    }

    const nextTurn: Side = attackerSide === "player" ? "ai" : "player";
    applyResolution(nextResolution, nextTurn, from, to);
  };

  // ── 3-Star General Last Stand modal dismiss ──────────────────────────────────
  const handleThreeStarPassiveDismiss = () => {
    if (!threeStarPassive.pendingThreeStarPassive) return;
    const {
      resolution: res,
      nextTurn,
      from,
      to,
    } = threeStarPassive.pendingThreeStarPassive;
    threeStarPassive.resetThreeStarPassive();
    applyResolution(res, nextTurn, from, to);
  };

  const handleUpgradeRollDismiss = () => setPendingUpgradeRoll(null);

  // ── 1-Star General bonus move modal handlers ─────────────────────────────────
  const handleOneStarBonusMoveConfirm = () => {
    const event = oneStarGeneral.pendingBonusMove;
    if (!event) return;
    setOneStarGeneralActiveTile(event.generalTileIndex);
    oneStarGeneral.confirmBonusMove();
    setBattleMessage(
      "Press the Advantage! Tap an empty adjacent tile to move, or tap elsewhere to cancel.",
    );
  };

  const handleOneStarBonusMoveSkip = () => {
    oneStarGeneral.skipBonusMove();
    setOneStarGeneralActiveTile(null);
    setTurn("ai");
  };

  // ── 2nd Lieutenant Field Assessment modal dismiss ────────────────────────────
  const handleSecondLtRevealDismiss = () => {
    secondLtReveal.dismissSecondLtReveal();
    setTurn("ai");
    setSelectedBattleTileIndex(null);
  };

  // ── 1st Lieutenant Intel Report modal dismiss ────────────────────────────────
  const handleFirstLtRevealDismiss = () => {
    firstLtReveal.dismissFirstLtReveal();
    setTurn("ai");
    setSelectedBattleTileIndex(null);
  };

  // ── Battle tile press ────────────────────────────────────────────────────────
  const isPlayerInputBlocked = () =>
    phase !== "battle" ||
    turn !== "player" ||
    !!winner ||
    aiThinking ||
    !!pendingChallenge ||
    !!pendingUpgradeRoll ||
    !!pendingUpgradeActivation ||
    !!resolution.pendingCrateChoice ||
    !!kamikaze.pendingKamikaze ||
    !!veteran.pendingVeteranPromo ||
    !!threeStarPassive.pendingThreeStarPassive ||
    !!oneStarGeneral.pendingBonusMove ||
    !!firstLtReveal.pendingFirstLtReveal ||
    !!secondLtReveal.pendingSecondLtReveal;

  const handleBattleTilePress = (tileIndex: number) => {
    // ── 1-Star General bonus move tile-select mode ─────────────────────────
    if (oneStarGeneral.bonusMoveActive && oneStarGeneralActiveTile !== null) {
      if (oneStarBonusMoveTilesComputed.includes(tileIndex)) {
        const nextBoard = oneStarGeneral.applyBonusMove(
          battleBoard,
          oneStarGeneralActiveTile,
          tileIndex,
        );
        setBattleBoard(nextBoard);
        setBattleMessage(
          "Press the Advantage! Your 1-Star General advanced an extra square.",
        );
        setLastMoveTrail({
          from: oneStarGeneralActiveTile,
          to: tileIndex,
          side: "player",
        });
        setSelectedBattleTileIndex(null);
        setOneStarGeneralActiveTile(null);
        oneStarGeneral.completeBonusMove();
        setTurn("ai");
      } else {
        oneStarGeneral.cancelBonusMove();
        setOneStarGeneralActiveTile(null);
        setSelectedBattleTileIndex(null);
        setTurn("ai");
      }
      return;
    }

    // ── 2-Star General: Hold the Line target-select mode ──────────────────
    if (twoStarGeneral.twoStarActive) {
      const tappedPiece = battleBoard[tileIndex];
      if (tappedPiece?.side === "ai") {
        twoStarGeneral.applyHoldRestriction(tileIndex);
        twoStarGeneral.startPlayerCooldown();
        setSelectedBattleTileIndex(null);
        setLastMoveTrail(null);
        setBattleMessage(
          "Hold the Line! That enemy unit is pinned and cannot retreat for 2 rounds.",
        );
        setRevealMessage("Enemy movement restricted: no backward moves.");
      } else {
        twoStarGeneral.cancelTwoStarAbility();
      }
      return;
    }

    // ── Flag swap mode ─────────────────────────────────────────────────────
    if (flagSwap.flagSwapActive) {
      if (
        flagSwapAllyTiles.includes(tileIndex) &&
        selectedBattleTileIndex !== null
      ) {
        const nextBoard = flagSwap.applyFlagSwap(
          battleBoard,
          selectedBattleTileIndex,
          tileIndex,
        );
        flagSwap.cancelFlagSwap();
        setSelectedBattleTileIndex(null);
        setLastMoveTrail(null);
        applyResolution(
          {
            board: nextBoard,
            winner: null,
            message:
              "Your Flag slipped into the shadows, trading places with an ally.",
            revealMessage: null,
            capturedByPlayer: [],
            capturedByAI: [],
          },
          "ai",
        );
        flagSwap.startPlayerCooldown();
      } else {
        flagSwap.cancelFlagSwap();
      }
      return;
    }

    // ── Major swap (Tactical Shift) mode ───────────────────────────────────
    if (majorSwap.majorSwapActive) {
      if (
        majorSwapAllyTiles.includes(tileIndex) &&
        selectedBattleTileIndex !== null
      ) {
        const nextBoard = majorSwap.applyMajorSwap(
          battleBoard,
          selectedBattleTileIndex,
          tileIndex,
        );
        majorSwap.cancelMajorSwap();
        setSelectedBattleTileIndex(null);
        setLastMoveTrail(null);
        applyResolution(
          {
            board: nextBoard,
            winner: null,
            message:
              "Tactical Shift! The Major repositioned with an adjacent ally.",
            revealMessage: null,
            capturedByPlayer: [],
            capturedByAI: [],
          },
          "ai",
        );
        majorSwap.startPlayerCooldown();
      } else {
        majorSwap.cancelMajorSwap();
      }
      return;
    }

    // ── 4-Star General: Diagonal March mode ───────────────────────────────
    if (fourStarPush.fourStarPushActive) {
      const generalTile = fourStarPush.generalTileIndex;

      if (
        fourStarDiagonalAllTiles.includes(tileIndex) &&
        generalTile !== null
      ) {
        const isChallenge = fourStarDiagonalChallengeTiles.includes(tileIndex);

        const legalMove: BattleMove = {
          side: "player",
          from: generalTile,
          to: tileIndex,
        };

        fourStarPush.cancelFourStarPush();
        fourStarPush.startPlayerCooldown();
        setSelectedBattleTileIndex(null);
        setLastMoveTrail(null);

        if (isChallenge) {
          // Route through the normal challenge pipeline (kamikaze, 3-star
          // passive, upgrade activation, then challenge modal).
          fireChallenge(legalMove);
        } else {
          // Plain diagonal move — resolve immediately.
          const res = resolveBattleMove(battleBoard, legalMove);
          applyResolution(res, "ai", legalMove.from, legalMove.to);
        }
      } else {
        // Tapped outside highlighted tiles — cancel, no cooldown consumed.
        fourStarPush.cancelFourStarPush();
      }
      return;
    }

    // ── Colonel reveal mode ────────────────────────────────────────────────
    if (colonelReveal.colonelRevealActive) {
      if (colonelDiagonalTiles.includes(tileIndex)) {
        colonelReveal.applyColonelReveal(battleBoard, tileIndex);
        setSelectedBattleTileIndex(null);
        setLastMoveTrail(null);
        applyResolution(
          {
            board: battleBoard,
            winner: null,
            message: "Field Scope! You revealed a diagonal enemy rank.",
            revealMessage: null,
            capturedByPlayer: [],
            capturedByAI: [],
          },
          "ai",
        );
      } else {
        colonelReveal.cancelColonelReveal();
      }
      return;
    }

    // ── 1st Lieutenant: Intel Report target-select mode ────────────────────
    if (firstLtReveal.firstLtRevealActive) {
      const tappedPiece = battleBoard[tileIndex];
      if (tappedPiece?.side === "ai") {
        firstLtReveal.applyFirstLtReveal(battleBoard, tileIndex);
        setSelectedBattleTileIndex(null);
        setLastMoveTrail(null);
      } else {
        firstLtReveal.cancelFirstLtReveal();
      }
      return;
    }

    // ── 2nd Lieutenant: Field Assessment target-select mode ────────────────
    if (secondLtReveal.secondLtRevealActive) {
      const tappedPiece = battleBoard[tileIndex];
      if (tappedPiece?.side === "ai") {
        secondLtReveal.applySecondLtReveal(battleBoard, tileIndex);
        setSelectedBattleTileIndex(null);
        setLastMoveTrail(null);
        setBattleMessage(
          "Field Assessment complete. Awaiting your confirmation…",
        );
      } else {
        secondLtReveal.cancelSecondLtReveal();
      }
      return;
    }

    // ── General Charge mode ────────────────────────────────────────────────
    if (generalCharge.generalChargeActive) {
      if (
        selectedBattleTileIndex !== null &&
        selectedBattleTileIndex !== tileIndex
      ) {
        const piece = battleBoard[selectedBattleTileIndex];
        if (piece && generalCharge.isPlayerFiveStarGeneral(piece)) {
          const { allDestinations, challengeDestinations } =
            getGeneralChargeMoves(
              battleBoard,
              selectedBattleTileIndex,
              "player",
            );

          if (allDestinations.includes(tileIndex)) {
            if (challengeDestinations.includes(tileIndex)) {
              const legalMove: BattleMove = {
                side: "player",
                from: selectedBattleTileIndex,
                to: tileIndex,
              };
              generalCharge.cancelGeneralCharge();
              generalCharge.startPlayerCooldown();
              setSelectedBattleTileIndex(null);
              fireChallenge(legalMove);
            } else {
              const legalMove: BattleMove = {
                side: "player",
                from: selectedBattleTileIndex,
                to: tileIndex,
              };
              const res = resolveBattleMove(battleBoard, legalMove);
              generalCharge.cancelGeneralCharge();
              generalCharge.startPlayerCooldown();
              setSelectedBattleTileIndex(null);
              applyResolution(res, "ai", legalMove.from, legalMove.to);
            }
            return;
          }
        }
      }
      generalCharge.cancelGeneralCharge();
      return;
    }

    // ── Lt. Colonel Suppression Fire mode ─────────────────────────────────
    if (ltColonelStun.ltColonelStunActive) {
      if (ltColonelDiagonalTiles.includes(tileIndex)) {
        ltColonelStun.applyLtColonelStun(tileIndex);
        ltColonelStun.startPlayerCooldown();
        setSelectedBattleTileIndex(null);
        setLastMoveTrail(null);
        setBattleMessage(
          "Suppression Fire! That enemy unit is stunned for 1 turn.",
        );
        setRevealMessage("Stunned enemy cannot move this AI turn.");
        setTurn("ai");
      } else {
        ltColonelStun.cancelLtColonelStun();
      }
      return;
    }

    if (isPlayerInputBlocked()) return;
    const tappedPiece = battleBoard[tileIndex];

    if (selectedBattleTileIndex === null) {
      if (tappedPiece?.side === "player") {
        setLastMoveTrail(null);
        setSelectedBattleTileIndex(tileIndex);
      }
      return;
    }
    if (selectedBattleTileIndex === tileIndex) {
      setSelectedBattleTileIndex(null);
      return;
    }
    if (tappedPiece?.side === "player") {
      setSelectedBattleTileIndex(tileIndex);
      return;
    }

    const legalMove = getLegalMoves(battleBoard, "player", pieceById)
      .filter(
        (m) => !twoStarGeneral.isBackwardMoveBlocked(m.from, m.to, "player"),
      )
      .find((m) => m.from === selectedBattleTileIndex && m.to === tileIndex);

    if (!legalMove) {
      setSelectedBattleTileIndex(null);
      return;
    }

    if (tappedPiece?.side === "ai") {
      fireChallenge(legalMove);
      return;
    }

    const res = resolveBattleMove(battleBoard, legalMove);
    applyResolution(res, "ai", legalMove.from, legalMove.to);
  };

  const handleChallengePress = (targetTileIndex: number) => {
    if (isPlayerInputBlocked()) return;
    if (selectedBattleTileIndex === null) return;

    if (generalCharge.generalChargeActive) {
      const piece = battleBoard[selectedBattleTileIndex];
      if (piece && generalCharge.isPlayerFiveStarGeneral(piece)) {
        const { challengeDestinations } = getGeneralChargeMoves(
          battleBoard,
          selectedBattleTileIndex,
          "player",
        );
        if (challengeDestinations.includes(targetTileIndex)) {
          const legalMove: BattleMove = {
            side: "player",
            from: selectedBattleTileIndex,
            to: targetTileIndex,
          };
          generalCharge.cancelGeneralCharge();
          generalCharge.startPlayerCooldown();
          setSelectedBattleTileIndex(null);
          fireChallenge(legalMove);
          return;
        }
      }
      generalCharge.cancelGeneralCharge();
      return;
    }

    // ── 4-Star General diagonal challenge via challenge button ─────────────
    if (fourStarPush.fourStarPushActive) {
      const generalTile = fourStarPush.generalTileIndex;
      if (
        generalTile !== null &&
        fourStarDiagonalChallengeTiles.includes(targetTileIndex)
      ) {
        const legalMove: BattleMove = {
          side: "player",
          from: generalTile,
          to: targetTileIndex,
        };
        fourStarPush.cancelFourStarPush();
        fourStarPush.startPlayerCooldown();
        setSelectedBattleTileIndex(null);
        fireChallenge(legalMove);
      } else {
        fourStarPush.cancelFourStarPush();
      }
      return;
    }

    const legalMove = getLegalMoves(battleBoard, "player", pieceById)
      .filter(
        (m) => !twoStarGeneral.isBackwardMoveBlocked(m.from, m.to, "player"),
      )
      .find(
        (m) => m.from === selectedBattleTileIndex && m.to === targetTileIndex,
      );
    if (!legalMove) return;
    fireChallenge(legalMove);
  };

  const handleTilePress = (tileIndex: number) =>
    phase === "formation"
      ? placement.handleFormationTilePress(tileIndex)
      : handleBattleTilePress(tileIndex);

  // ── Captain Scan handler ─────────────────────────────────────────────────────
  const handleCaptainScanPress = () => {
    if (captainScan.isPlayerOnCooldown()) return;
    if (selectedBattleTileIndex === null) return;
    const entries = captainScan.applyCaptainScan(
      battleBoard,
      selectedBattleTileIndex,
    );
    const count = entries.length;
    setSelectedBattleTileIndex(null);
    setLastMoveTrail(null);
    applyResolution(
      {
        board: battleBoard,
        winner: null,
        message:
          count > 0
            ? `Threat Scan! ${count} adjacent enem${count === 1 ? "y" : "ies"} revealed for 1.5 s.`
            : "Threat Scan! No adjacent enemies detected.",
        revealMessage: null,
        capturedByPlayer: [],
        capturedByAI: [],
      },
      "ai",
    );
  };

  // ── Game lifecycle ───────────────────────────────────────────────────────────
  const startBattle = () => {
    const aiFormation = generateAIFormation(
      aiProfile.opening,
      pieceDefinitions,
      pieceById,
    );
    const board = buildBattleBoard(placedByTileIndex, aiFormation);
    setBattleBoard(board);
    setPhase("battle");
    setTurn("player");
    setWinner(null);
    setSelectedBattleTileIndex(null);
    setLastMoveTrail(null);
    setBattleMessage(
      `Enemy ${aiProfile.label} formation is in position. Your move.`,
    );
    setRevealMessage(null);
    resolution.resetCrates();
    setCapturedByPlayer([]);
    setCapturedByAI([]);
    setEndedBySurrender(false);
    setPendingChallenge(null);
    setPendingUpgradeRoll(null);
    setPendingUpgradeActivation(null);
    kamikaze.resetKamikaze();
    veteran.resetVeteranPromo();
    flagSwap.resetFlagSwap();
    spyReveal.resetSpyReveal();
    colonelReveal.resetColonelReveal();
    firstLtReveal.resetFirstLtReveal();
    secondLtReveal.resetSecondLtReveal();
    generalCharge.resetGeneralCharge();
    fourStarPush.resetFourStarPush();
    threeStarPassive.resetThreeStarPassive();
    ltColonelStun.resetLtColonelStun();
    majorSwap.resetMajorSwap();
    captainScan.resetCaptainScan();
    oneStarGeneral.resetOneStarGeneral();
    twoStarGeneral.resetTwoStarGeneral();
    setOneStarGeneralActiveTile(null);
    setShowReadyModal(false);
    placement.clearFormationSelection();
    setIsInventoryExpanded(false);
    placement.resetPlacement();
  };

  const handleForfeitMatch = () => {
    setShowQuitModal(false);
    setAIThinking(false);
    setEndedBySurrender(true);
    setWinner("ai");
    setPhase("ended");
    setTurn("ai");
    setSelectedBattleTileIndex(null);
    setLastMoveTrail(null);
    setPendingChallenge(null);
    setPendingUpgradeRoll(null);
    setPendingUpgradeActivation(null);
    kamikaze.resetKamikaze();
    veteran.resetVeteranPromo();
    flagSwap.resetFlagSwap();
    spyReveal.resetSpyReveal();
    colonelReveal.resetColonelReveal();
    firstLtReveal.resetFirstLtReveal();
    secondLtReveal.resetSecondLtReveal();
    generalCharge.resetGeneralCharge();
    fourStarPush.resetFourStarPush();
    threeStarPassive.resetThreeStarPassive();
    ltColonelStun.resetLtColonelStun();
    majorSwap.resetMajorSwap();
    captainScan.resetCaptainScan();
    oneStarGeneral.resetOneStarGeneral();
    twoStarGeneral.resetTwoStarGeneral();
    setOneStarGeneralActiveTile(null);
    setBattleMessage("You forfeited the match. Enemy command takes the field.");
    setRevealMessage("The battle ended by surrender.");
    resolution.resetCrates();
  };

  const handleRetryMatch = () => {
    setShowQuitModal(false);
    setShowReadyModal(false);
    setEndedBySurrender(false);
    setIsInventoryExpanded(false);
    setPhase("formation");
    setTurn("player");
    setBattleBoard({});
    setSelectedBattleTileIndex(null);
    setLastMoveTrail(null);
    setBattleMessage("Build your line, then confirm to begin the clash.");
    setRevealMessage(null);
    setAIThinking(false);
    setWinner(null);
    resolution.resetCrates();
    setCapturedByPlayer([]);
    setCapturedByAI([]);
    setPendingChallenge(null);
    setPendingUpgradeRoll(null);
    setPendingUpgradeActivation(null);
    kamikaze.resetKamikaze();
    veteran.resetVeteranPromo();
    flagSwap.resetFlagSwap();
    spyReveal.resetSpyReveal();
    colonelReveal.resetColonelReveal();
    firstLtReveal.resetFirstLtReveal();
    secondLtReveal.resetSecondLtReveal();
    generalCharge.resetGeneralCharge();
    fourStarPush.resetFourStarPush();
    threeStarPassive.resetThreeStarPassive();
    ltColonelStun.resetLtColonelStun();
    majorSwap.resetMajorSwap();
    captainScan.resetCaptainScan();
    oneStarGeneral.resetOneStarGeneral();
    twoStarGeneral.resetTwoStarGeneral();
    setOneStarGeneralActiveTile(null);
    placement.resetPlacement();
  };

  const returnToMainMenu = () => {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  function resolveBattleMove(
    board: Record<number, BoardPiece>,
    move: BattleMove,
  ) {
    const { resolveBattleMove: _resolve } = require("../scripts/gameLogic");
    return _resolve(board, move, pieceById);
  }

  // ── Public surface ───────────────────────────────────────────────────────────
  return {
    aiProfile,
    pieceDefinitions,
    pieceById,
    boardTiles,
    phase,
    selectedPieceId: placement.selectedPieceId,
    selectedPiece: placement.selectedPiece,
    placedByTileIndex,
    moveSourceTileIndex: placement.moveSourceTileIndex,
    totalUnplacedCount: placement.totalUnplacedCount,
    isReadyEnabled: placement.totalUnplacedCount === 0,
    showSetupZoneHint: placement.showSetupZoneHint,
    pieceCountById: placement.pieceCountById,
    draggingPieceId: placement.draggingPieceId,
    draggingFromTile: placement.draggingFromTile,
    dragOverTileIndex: placement.dragOverTileIndex,
    handleDragStartFromReserve: placement.handleDragStartFromReserve,
    handleDragStartFromBoard: placement.handleDragStartFromBoard,
    handleDragEnterTile: placement.handleDragEnterTile,
    handleDragEnd: placement.handleDragEnd,
    turn,
    battleBoard,
    selectedBattleTileIndex,
    selectedBattleMoves,
    lastMoveTrail,
    challengeTargetTiles,
    battleMessage,
    revealMessage,
    aiThinking,
    winner,
    crateTiles,
    endedBySurrender,
    capturedPlayerNames,
    capturedAINames,
    pendingChallenge,
    handleChallengeDismiss,
    pendingUpgradeRoll,
    handleUpgradeRollDismiss,
    pendingUpgradeActivation,
    handleUpgradeActivationConfirm,
    pendingCrateChoice: resolution.pendingCrateChoice,
    handleCrateChoiceTake: resolution.handleCrateChoiceTake,
    handleCrateChoiceDestroy: resolution.handleCrateChoiceDestroy,
    pendingKamikaze: kamikaze.pendingKamikaze,
    handleKamikazeConfirm: kamikaze.handleKamikazeConfirm,
    handleKamikazeDecline: () => kamikaze.handleKamikazeDecline(battleBoard),
    pendingVeteranPromo: veteran.pendingVeteranPromo,
    handleVeteranPromoDismiss: veteran.handleVeteranPromoDismiss,
    // flag swap (Shadow March)
    selectedPieceIsFlag,
    flagSwapActive: flagSwap.flagSwapActive,
    flagSwapAllyTiles,
    flagSwapCooldownUntil: flagSwap.playerCooldownUntil,
    activateFlagSwap: flagSwap.activateFlagSwap,
    cancelFlagSwap: flagSwap.cancelFlagSwap,
    // spy reveal (Phantom Recon)
    selectedPieceIsSpy,
    spyReveal: spyReveal.spyReveal,
    aiSpyRevealNotifVisible: spyReveal.aiSpyRevealNotifVisible,
    spyRevealCooldownUntil: spyReveal.playerCooldownUntil,
    activateSpyReveal: () => spyReveal.activateSpyReveal(battleBoard),
    // colonel reveal (Field Scope)
    selectedPieceIsColonel,
    colonelRevealActive: colonelReveal.colonelRevealActive,
    colonelDiagonalTiles,
    colonelRevealResult: colonelReveal.colonelReveal,
    colonelRevealCooldownUntil: colonelReveal.playerCooldownUntil,
    activateColonelReveal: colonelReveal.activateColonelReveal,
    cancelColonelReveal: colonelReveal.cancelColonelReveal,
    // 1st lieutenant (Intel Report)
    selectedPieceIsFirstLt,
    firstLtRevealActive: firstLtReveal.firstLtRevealActive,
    firstLtRevealCooldownUntil: firstLtReveal.playerCooldownUntil,
    pendingFirstLtReveal: firstLtReveal.pendingFirstLtReveal,
    activateFirstLtReveal: firstLtReveal.activateFirstLtReveal,
    cancelFirstLtReveal: firstLtReveal.cancelFirstLtReveal,
    handleFirstLtRevealDismiss,
    // 2nd lieutenant (Field Assessment)
    selectedPieceIsSecondLt,
    secondLtRevealActive: secondLtReveal.secondLtRevealActive,
    secondLtRevealCooldownUntil: secondLtReveal.playerCooldownUntil,
    pendingSecondLtReveal: secondLtReveal.pendingSecondLtReveal,
    activateSecondLtReveal: secondLtReveal.activateSecondLtReveal,
    cancelSecondLtReveal: secondLtReveal.cancelSecondLtReveal,
    handleSecondLtRevealDismiss,
    // general charge (Supreme Charge)
    selectedPieceIsGeneralFiveStar,
    generalChargeActive: generalCharge.generalChargeActive,
    generalChargeCooldownUntil: generalCharge.playerCooldownUntil,
    activateGeneralCharge: generalCharge.activateGeneralCharge,
    cancelGeneralCharge: generalCharge.cancelGeneralCharge,
    // 4-star general (Diagonal March)
    selectedPieceIsGeneralFourStar,
    fourStarPushActive: fourStarPush.fourStarPushActive,
    // allTiles drives the orange highlight (reusing the same prop name for BoardGrid)
    fourStarPushTargetTiles: fourStarDiagonalAllTiles,
    // challenge tiles needed by BoardGrid for the challenge button overlay
    fourStarDiagonalChallengeTiles,
    fourStarPushCooldownUntil: fourStarPush.playerCooldownUntil,
    activateFourStarPush: () => {
      if (selectedBattleTileIndex === null) return;
      fourStarPush.activateFourStarPush(selectedBattleTileIndex);
    },
    cancelFourStarPush: fourStarPush.cancelFourStarPush,
    // 3-star general passive (Last Stand)
    pendingThreeStarPassive: threeStarPassive.pendingThreeStarPassive,
    handleThreeStarPassiveDismiss,
    // lt. colonel stun (Suppression Fire)
    selectedPieceIsLtColonel,
    ltColonelStunActive: ltColonelStun.ltColonelStunActive,
    ltColonelDiagonalTiles,
    ltColonelStunCooldownUntil: ltColonelStun.playerCooldownUntil,
    stunnedTileIndices: ltColonelStun.stunnedTileIndices,
    activateLtColonelStun: ltColonelStun.activateLtColonelStun,
    cancelLtColonelStun: ltColonelStun.cancelLtColonelStun,
    // major swap (Tactical Shift)
    selectedPieceIsMajor,
    majorSwapActive: majorSwap.majorSwapActive,
    majorSwapAllyTiles,
    majorSwapCooldownUntil: majorSwap.playerCooldownUntil,
    activateMajorSwap: majorSwap.activateMajorSwap,
    cancelMajorSwap: majorSwap.cancelMajorSwap,
    // captain scan (Threat Scan)
    selectedPieceIsCaptain,
    captainScanResult: captainScan.captainScan,
    captainScanCooldownUntil: captainScan.playerCooldownUntil,
    handleCaptainScanPress,
    // 1-star general (Press the Advantage)
    selectedPieceIsOneStarGeneral,
    oneStarBonusMoveActive: oneStarGeneral.bonusMoveActive,
    oneStarBonusMoveTiles: oneStarBonusMoveTilesComputed,
    oneStarBonusMoveCooldownUntil: oneStarGeneral.playerCooldownUntil,
    pendingOneStarBonusMove: oneStarGeneral.pendingBonusMove,
    handleOneStarBonusMoveConfirm,
    handleOneStarBonusMoveSkip,
    // 2-star general (Hold the Line)
    selectedPieceIsTwoStarGeneral,
    twoStarActive: twoStarGeneral.twoStarActive,
    holdRestrictedTiles,
    twoStarCooldownUntil: twoStarGeneral.playerCooldownUntil,
    activateTwoStarAbility: twoStarGeneral.activateTwoStarAbility,
    cancelTwoStarAbility: twoStarGeneral.cancelTwoStarAbility,
    // UI
    isInventoryExpanded,
    setIsInventoryExpanded,
    showQuitModal,
    setShowQuitModal,
    showReadyModal,
    setShowReadyModal,
    handleTilePress,
    handleChallengePress,
    handlePieceButtonPress: placement.handlePieceButtonPress,
    handleResetBoard: placement.handleResetBoard,
    handleRandomizeSet: placement.handleRandomizeSet,
    startBattle,
    handleForfeitMatch,
    handleRetryMatch,
    returnToMainMenu,
  };
}
