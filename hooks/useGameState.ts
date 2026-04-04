import { useRouter } from "expo-router";
import { useMemo, useState } from "react";

import {
  DIAGONAL_DIRECTIONS,
  DIFFICULTY_PROFILES,
} from "../constants/constants";
import { generateAIFormation } from "../scripts/aiLogic";
import {
  buildBattleBoard,
  formatCooldownTime,
  formatPieceName,
  getAbilityCooldownRemaining,
  getLegalMoves,
  getTileColumn,
  getTileIndex,
  getTileRow,
  isAbilityOnCooldown,
  isInsideBoard,
  prepareChallengeEvent,
  setAbilityCooldown,
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
import { useFlagSwap } from "./useFlagSwap";
import { useKamikaze } from "./useKamikaze";
import { usePlacement } from "./usePlacement";
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
  const [proximityPingActive, setProximityPingActive] = useState(false);
  const [proximityPingSourceTile, setProximityPingSourceTile] = useState<
    number | null
  >(null);
  const [ghostInsightActive, setGhostInsightActive] = useState(false);
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
  });

  // Wrap applyResolution to close over the current crateByTile
  const applyResolution = (
    res: any,
    nextTurn: Side,
    from?: number,
    to?: number,
  ) => {
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
  });

  // ── Derived values ───────────────────────────────────────────────────────────
  const selectedBattleMoves = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return [];

    const baseMoves = getLegalMoves(battleBoard, "player", pieceById)
      .filter((m) => m.from === selectedBattleTileIndex)
      .map((m) => m.to);

    const selectedPiece = battleBoard[selectedBattleTileIndex];
    const selectedLabel = selectedPiece
      ? pieceById[selectedPiece.pieceId]?.label
      : undefined;
    const isSelectedLt =
      selectedLabel === "1st Lt" || selectedLabel === "2nd Lt";

    if (!proximityPingActive || !isSelectedLt) {
      return baseMoves;
    }

    const row = getTileRow(selectedBattleTileIndex);
    const column = getTileColumn(selectedBattleTileIndex);
    const diagonalTargets: number[] = [];

    DIAGONAL_DIRECTIONS.forEach((dir) => {
      const nextRow = row + dir.y;
      const nextColumn = column + dir.x;
      if (!isInsideBoard(nextRow, nextColumn)) return;
      const diagonalIndex = getTileIndex(nextRow, nextColumn);
      const diagonalPiece = battleBoard[diagonalIndex];
      if (diagonalPiece?.side === "ai") {
        diagonalTargets.push(diagonalIndex);
      }
    });

    return Array.from(new Set([...baseMoves, ...diagonalTargets]));
  }, [
    battleBoard,
    phase,
    pieceById,
    selectedBattleTileIndex,
    proximityPingActive,
  ]);

  const challengeTargetTiles = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return [];
    return selectedBattleMoves.filter((to) => battleBoard[to]?.side === "ai");
  }, [battleBoard, phase, selectedBattleTileIndex, selectedBattleMoves]);

  const selectedPieceIsLt = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return false;
    const piece = battleBoard[selectedBattleTileIndex];
    const label = piece ? pieceById[piece.pieceId]?.label : undefined;
    return label === "1st Lt" || label === "2nd Lt";
  }, [battleBoard, phase, selectedBattleTileIndex, pieceById]);

  const selectedLtLabel = useMemo(() => {
    if (!selectedPieceIsLt || selectedBattleTileIndex === null) return null;
    const piece = battleBoard[selectedBattleTileIndex];
    return piece ? pieceById[piece.pieceId]?.label : null;
  }, [battleBoard, selectedBattleTileIndex, selectedPieceIsLt, pieceById]);

  const selectedLtIcon = useMemo(() => {
    if (selectedLtLabel === "2nd Lt") return "📡";
    if (selectedLtLabel === "1st Lt") return "🛰️";
    return "";
  }, [selectedLtLabel]);

  const toggleProximityPing = () => {
    if (!selectedPieceIsLt || selectedBattleTileIndex === null) {
      setBattleMessage(
        "Select a Lieutenant in battle to activate Proximity Ping.",
      );
      return;
    }

    const selectedPiece = battleBoard[selectedBattleTileIndex];
    if (!selectedPiece) return;

    if (isAbilityOnCooldown(selectedPiece)) {
      const remaining = getAbilityCooldownRemaining(selectedPiece);
      setBattleMessage(
        `Proximity Ping is on cooldown for ${formatCooldownTime(remaining)}.`,
      );
      return;
    }

    // Check if there are diagonal enemies
    const row = getTileRow(selectedBattleTileIndex);
    const column = getTileColumn(selectedBattleTileIndex);
    const hasDiagonalEnemies = DIAGONAL_DIRECTIONS.some((dir) => {
      const nextRow = row + dir.y;
      const nextColumn = column + dir.x;
      if (!isInsideBoard(nextRow, nextColumn)) return false;
      const diagonalIndex = getTileIndex(nextRow, nextColumn);
      const diagonalPiece = battleBoard[diagonalIndex];
      return diagonalPiece?.side === "ai";
    });

    if (!hasDiagonalEnemies) {
      setBattleMessage(
        "Proximity Ping requires at least one enemy on a diagonal.",
      );
      return;
    }

    if (proximityPingActive) {
      setProximityPingActive(false);
      setProximityPingSourceTile(null);
      setBattleMessage("Proximity Ping canceled.");
    } else {
      // Apply cooldown and advance turn
      const updatedPiece = setAbilityCooldown(selectedPiece);
      setBattleBoard((prev) => ({
        ...prev,
        [selectedBattleTileIndex]: updatedPiece,
      }));

      setProximityPingActive(true);
      setProximityPingSourceTile(selectedBattleTileIndex);
      setBattleMessage(
        `${selectedLtLabel} Proximity Ping activated: diagonal challenge enabled for this unit.`,
      );

      // Advance turn to AI
      setTurn("ai");
    }
  };

  const selectedPieceIsSpy = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return false;
    const piece = battleBoard[selectedBattleTileIndex];
    const label = piece ? pieceById[piece.pieceId]?.label : undefined;
    return label === "Spy";
  }, [battleBoard, phase, selectedBattleTileIndex, pieceById]);

  const toggleGhostInsight = () => {
    if (!selectedPieceIsSpy || selectedBattleTileIndex === null) {
      setBattleMessage("Select a Spy in battle to activate Ghost Insight.");
      return;
    }

    const selectedPiece = battleBoard[selectedBattleTileIndex];
    if (!selectedPiece) return;

    if (isAbilityOnCooldown(selectedPiece)) {
      const remaining = getAbilityCooldownRemaining(selectedPiece);
      setBattleMessage(
        `Ghost Insight is on cooldown for ${formatCooldownTime(remaining)}.`,
      );
      return;
    }

    if (ghostInsightActive) {
      setGhostInsightActive(false);
      setBattleMessage("Ghost Insight canceled.");
    } else {
      // Find hidden enemy pieces
      const enemyPieces = Object.entries(battleBoard).filter(
        ([, piece]) => piece.side === "ai" && !piece.revealedToPlayer,
      );

      if (enemyPieces.length === 0) {
        setBattleMessage("No hidden enemy ranks to reveal.");
        return;
      }

      // Reveal a random enemy rank for 2 seconds
      const randomIndex = Math.floor(Math.random() * enemyPieces.length);
      const [targetKey, targetPiece] = enemyPieces[randomIndex];
      const targetTile = Number(targetKey);
      const wasPreviouslyRevealed = targetPiece.revealedToPlayer;

      // Temporarily reveal the piece
      setBattleBoard((prev) => ({
        ...prev,
        [targetTile]: {
          ...targetPiece,
          revealedToPlayer: true,
        },
      }));

      // Apply cooldown to the Spy
      const updatedSpy = setAbilityCooldown(selectedPiece);
      setBattleBoard((prev) => ({
        ...prev,
        [selectedBattleTileIndex]: updatedSpy,
      }));

      setGhostInsightActive(true);
      setBattleMessage(
        `Ghost Insight: ${formatPieceName(
          targetPiece.pieceId,
          pieceById,
        )} revealed for 2s.`,
      );

      // Hide the revealed piece after 2 seconds
      setTimeout(() => {
        setBattleBoard((currentBoard) => {
          const currentPiece = currentBoard[targetTile];
          if (!currentPiece) return currentBoard;
          if (wasPreviouslyRevealed || currentPiece.revealedToPlayer === false)
            return currentBoard;
          return {
            ...currentBoard,
            [targetTile]: {
              ...currentPiece,
              revealedToPlayer: false,
            },
          };
        });
        setGhostInsightActive(false);
      }, 2000);

      // Advance turn to AI
      setTurn("ai");
    }
  };

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

  /** True when the currently selected battle tile is the player's Flag */
  const selectedPieceIsFlag = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return false;
    const piece = battleBoard[selectedBattleTileIndex];
    if (!piece) return false;
    return flagSwap.isFlagPiece(piece);
  }, [phase, selectedBattleTileIndex, battleBoard, flagSwap.isFlagPiece]);

  /** Ally tiles lit up in gold when swap mode is active */
  const flagSwapAllyTiles = useMemo(() => {
    if (!flagSwap.flagSwapActive) return [];
    return flagSwap.getAllySwapTiles(battleBoard, selectedBattleTileIndex);
  }, [
    flagSwap.flagSwapActive,
    flagSwap.getAllySwapTiles,
    battleBoard,
    selectedBattleTileIndex,
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

    // ── Spy ghost insight ────────────────────────────────────────────────
    let ghostInsightMessage: string | null = null;
    const attackerBoardPiece = nextResolution.board[pendingChallenge.from];
    const attackerPiece = pieceById[pendingChallenge.attackerPieceId];
    if (
      attackerSide === "player" &&
      attackerPiece?.label === "Spy" &&
      attackerBoardPiece
    ) {
      if (isAbilityOnCooldown(attackerBoardPiece)) {
        const cooldownRemaining =
          getAbilityCooldownRemaining(attackerBoardPiece);
        ghostInsightMessage = `Ghost Insight on cooldown for ${formatCooldownTime(cooldownRemaining)}.`;
      }
    }

    if (ghostInsightMessage) {
      nextResolution.revealMessage = ghostInsightMessage;
    }

    const nextTurn: Side = attackerSide === "player" ? "ai" : "player";
    applyResolution(nextResolution, nextTurn, from, to);
  };

  const handleUpgradeRollDismiss = () => setPendingUpgradeRoll(null);

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
    !!veteran.pendingVeteranPromo;

  const handleBattleTilePress = (tileIndex: number) => {
    // ── Flag swap mode: resolve or cancel ──────────────────────────────────
    if (flagSwap.flagSwapActive) {
      // Tapping a highlighted ally completes the swap
      if (
        flagSwapAllyTiles.includes(tileIndex) &&
        selectedBattleTileIndex !== null
      ) {
        const flagPiece = battleBoard[selectedBattleTileIndex];

        if (flagPiece && isAbilityOnCooldown(flagPiece)) {
          const cooldownRemaining = getAbilityCooldownRemaining(flagPiece);
          setBattleMessage(
            `Shadow March on cooldown for ${formatCooldownTime(cooldownRemaining)}.`,
          );
          flagSwap.cancelFlagSwap();
          return;
        }

        let nextBoard = flagSwap.applyFlagSwap(
          battleBoard,
          selectedBattleTileIndex,
          tileIndex,
        );

        // Apply cooldown to the flag
        if (flagPiece) {
          nextBoard = {
            ...nextBoard,
            [selectedBattleTileIndex]: setAbilityCooldown(
              nextBoard[selectedBattleTileIndex]!,
            ),
          };
        }

        flagSwap.cancelFlagSwap();
        setSelectedBattleTileIndex(null);
        setLastMoveTrail(null);

        // Reuse applyResolution so board update + turn flip + message all work
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
      } else {
        // Tap anywhere else → cancel swap mode
        flagSwap.cancelFlagSwap();
      }
      return;
    }

    if (isPlayerInputBlocked()) return;
    const tappedPiece = battleBoard[tileIndex];

    if (selectedBattleTileIndex === null) {
      if (tappedPiece?.side === "player") {
        if (tappedPiece.stunnedTurnsLeft && tappedPiece.stunnedTurnsLeft > 0) {
          setBattleMessage(
            `${pieceById[tappedPiece.pieceId]?.label ?? "Unit"} is stunned and cannot act.`,
          );
          return;
        }
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
      if (tappedPiece.stunnedTurnsLeft && tappedPiece.stunnedTurnsLeft > 0) {
        setBattleMessage(
          `${pieceById[tappedPiece.pieceId]?.label ?? "Unit"} is stunned and cannot act.`,
        );
        return;
      }
      setSelectedBattleTileIndex(tileIndex);
      return;
    }

    const baseLegalMove = getLegalMoves(battleBoard, "player", pieceById).find(
      (m) => m.from === selectedBattleTileIndex && m.to === tileIndex,
    );

    let legalMove = baseLegalMove;
    const selectedPiece = battleBoard[selectedBattleTileIndex];
    const selectedLabel = selectedPiece
      ? pieceById[selectedPiece.pieceId]?.label
      : undefined;
    const isSelectedLt =
      selectedLabel === "1st Lt" || selectedLabel === "2nd Lt";
    const isDiagonalPing =
      proximityPingActive &&
      proximityPingSourceTile === selectedBattleTileIndex &&
      isSelectedLt;

    if (!legalMove && isDiagonalPing && tappedPiece?.side === "ai") {
      const fromRow = getTileRow(selectedBattleTileIndex);
      const fromColumn = getTileColumn(selectedBattleTileIndex);
      const direction = {
        x: getTileColumn(tileIndex) - fromColumn,
        y: getTileRow(tileIndex) - fromRow,
      };
      const normalizedX = Math.sign(direction.x);
      const normalizedY = Math.sign(direction.y);

      const isDiagonalTarget =
        Math.abs(direction.x) === 1 &&
        Math.abs(direction.y) === 1 &&
        DIAGONAL_DIRECTIONS.some(
          (d) => d.x === normalizedX && d.y === normalizedY,
        );

      if (isDiagonalTarget) {
        legalMove = {
          side: "player",
          from: selectedBattleTileIndex,
          to: tileIndex,
        };
      }
    }

    if (!legalMove) {
      setSelectedBattleTileIndex(null);
      return;
    }

    if (tappedPiece?.side === "ai") {
      if (isDiagonalPing) {
        setProximityPingActive(false);
        setProximityPingSourceTile(null);
      }
      fireChallenge(legalMove);
      return;
    }

    const res = resolveBattleMove(battleBoard, legalMove);
    applyResolution(res, "ai", legalMove.from, legalMove.to);
  };

  const handleChallengePress = (targetTileIndex: number) => {
    if (isPlayerInputBlocked()) return;
    if (selectedBattleTileIndex === null) return;
    const legalMove = getLegalMoves(battleBoard, "player", pieceById).find(
      (m) => m.from === selectedBattleTileIndex && m.to === targetTileIndex,
    );
    if (!legalMove) return;
    fireChallenge(legalMove);
  };

  const handleTilePress = (tileIndex: number) =>
    phase === "formation"
      ? placement.handleFormationTilePress(tileIndex)
      : handleBattleTilePress(tileIndex);

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
    placement.resetPlacement();
  };

  const returnToMainMenu = () => {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  // ── Re-import resolveBattleMove with correct arity ───────────────────────────
  function resolveBattleMove(
    board: Record<number, BoardPiece>,
    move: BattleMove,
  ) {
    const { resolveBattleMove: _resolve } = require("../scripts/gameLogic");
    return _resolve(board, move, pieceById);
  }

  // ── Custom flag swap activation with cooldown and turn advancement ───
  const activateFlagSwapWithCooldown = () => {
    if (!selectedPieceIsFlag || selectedBattleTileIndex === null) {
      setBattleMessage("Select your Flag in battle to activate Shadow March.");
      return;
    }

    const selectedPiece = battleBoard[selectedBattleTileIndex];
    if (!selectedPiece) return;

    if (isAbilityOnCooldown(selectedPiece)) {
      const remaining = getAbilityCooldownRemaining(selectedPiece);
      setBattleMessage(
        `Shadow March is on cooldown for ${formatCooldownTime(remaining)}.`,
      );
      return;
    }

    // Apply cooldown to the Flag
    const updatedFlag = setAbilityCooldown(selectedPiece);
    setBattleBoard((prev) => ({
      ...prev,
      [selectedBattleTileIndex]: updatedFlag,
    }));

    // Activate flag swap
    flagSwap.activateFlagSwap();
    setBattleMessage(
      "Shadow March activated: select an ally to swap positions with.",
    );

    // Advance turn to AI
    setTurn("ai");
  };

  const cancelFlagSwapWithMessage = () => {
    flagSwap.cancelFlagSwap();
    setBattleMessage("Shadow March canceled.");
  };

  // ── Public surface ───────────────────────────────────────────────────────────
  return {
    // data
    aiProfile,
    pieceDefinitions,
    pieceById,
    boardTiles,
    // formation
    phase,
    selectedPieceId: placement.selectedPieceId,
    selectedPiece: placement.selectedPiece,
    placedByTileIndex,
    moveSourceTileIndex: placement.moveSourceTileIndex,
    totalUnplacedCount: placement.totalUnplacedCount,
    isReadyEnabled: placement.totalUnplacedCount === 0,
    showSetupZoneHint: placement.showSetupZoneHint,
    pieceCountById: placement.pieceCountById,
    // drag
    draggingPieceId: placement.draggingPieceId,
    draggingFromTile: placement.draggingFromTile,
    dragOverTileIndex: placement.dragOverTileIndex,
    handleDragStartFromReserve: placement.handleDragStartFromReserve,
    handleDragStartFromBoard: placement.handleDragStartFromBoard,
    handleDragEnterTile: placement.handleDragEnterTile,
    handleDragEnd: placement.handleDragEnd,
    // battle
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
    // challenge
    pendingChallenge,
    handleChallengeDismiss,
    pendingUpgradeRoll,
    handleUpgradeRollDismiss,
    pendingUpgradeActivation,
    handleUpgradeActivationConfirm,
    pendingCrateChoice: resolution.pendingCrateChoice,
    handleCrateChoiceTake: resolution.handleCrateChoiceTake,
    handleCrateChoiceDestroy: resolution.handleCrateChoiceDestroy,
    // kamikaze
    pendingKamikaze: kamikaze.pendingKamikaze,
    handleKamikazeConfirm: kamikaze.handleKamikazeConfirm,
    handleKamikazeDecline: () => kamikaze.handleKamikazeDecline(battleBoard),
    // veteran promo
    pendingVeteranPromo: veteran.pendingVeteranPromo,
    handleVeteranPromoDismiss: veteran.handleVeteranPromoDismiss,
    // flag swap (Shadow March ability)
    selectedPieceIsFlag,
    flagSwapActive: flagSwap.flagSwapActive,
    flagSwapAllyTiles,
    activateFlagSwap: activateFlagSwapWithCooldown,
    cancelFlagSwap: cancelFlagSwapWithMessage,
    // lieutenant ping (Proximity Ping ability)
    selectedPieceIsLt,
    selectedLtLabel,
    selectedLtIcon,
    proximityPingActive,
    toggleProximityPing,
    // spy ghost insight
    selectedPieceIsSpy,
    ghostInsightActive,
    toggleGhostInsight,
    // UI
    isInventoryExpanded,
    setIsInventoryExpanded,
    showQuitModal,
    setShowQuitModal,
    showReadyModal,
    setShowReadyModal,
    // handlers
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
