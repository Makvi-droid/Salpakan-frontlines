import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import {
  AI_THINKING_DELAY_MS,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CRATE_DROP_CHANCE,
  CRATE_DROP_MAX_COUNT,
  CRATE_DROP_MIN_COUNT,
  CRATE_UPGRADES,
  CRATE_UPGRADE_LABELS,
  DIFFICULTY_PROFILES,
  DOUBLE_TAP_MS,
  FIRST_COLUMN_LABELS,
  SECOND_COLUMN_LABELS,
  SHORT_LABEL_BY_NAME,
  THIRD_COLUMN_LABELS,
} from "../constants/constants";
import { chooseMoveForProfile, generateAIFormation } from "../scripts/aiLogic";
import {
  buildBattleBoard,
  getLegalMoves,
  getPieceId,
  isPlayerSetupZoneTileIndex,
  isPrivatePiece,
  prepareChallengeEvent,
  resolveBattleMove,
  resolveKamikazeMutualElimination,
  shuffleArray,
} from "../scripts/gameLogic";
import type {
  BattleMove,
  BoardPiece,
  ChallengeEvent,
  Difficulty,
  KamikazeEvent,
  Phase,
  PieceDefinition,
  PieceUpgradeId,
  Side,
} from "../scripts/types";

// ─── Veteran System ───────────────────────────────────────────────────────────

/** Chance that a piece earns Veteran status after a successful kill. */
const VETERAN_PROC_CHANCE = 0.25;

/**
 * Given a resolution and the side that just moved, rolls veteran procs for
 * any pieces that survived by winning their challenge. Returns an updated
 * board with `isVeteran: true` set where the proc fires.
 *
 * Only the *winning* piece (the one that ended up on the destination tile)
 * is eligible — pieces that moved to an empty tile are not.
 */
function rollVeteranProc(
  boardAfterMove: Record<number, BoardPiece>,
  movedToTileIndex: number | undefined,
  capturedByPlayer: string[],
  capturedByAI: string[],
): Record<number, BoardPiece> {
  if (movedToTileIndex === undefined) return boardAfterMove;

  const winner = boardAfterMove[movedToTileIndex];
  if (!winner) return boardAfterMove;

  // A winner is confirmed only when the opposing side had a piece captured.
  const opponentLostPiece =
    winner.side === "player"
      ? capturedByAI.length > 0
      : capturedByPlayer.length > 0;

  if (!opponentLostPiece) return boardAfterMove;

  // Already a veteran — no double proc.
  if (winner.isVeteran) return boardAfterMove;

  if (Math.random() >= VETERAN_PROC_CHANCE) return boardAfterMove;

  return {
    ...boardAfterMove,
    [movedToTileIndex]: { ...winner, isVeteran: true },
  };
}

function getInitialUpgradeCharges(upgrade: PieceUpgradeId) {
  if (upgrade === "iron-veil" || upgrade === "double-blind") return 2;
  return undefined;
}

/** Hook that owns all game state and exposes handlers to the screen. */
export function useGameState(difficulty: Difficulty) {
  const router = useRouter();
  const aiProfile = DIFFICULTY_PROFILES[difficulty];

  // ── Piece catalogue ─────────────────────────────────────────────────────────
  const pieceDefinitions: PieceDefinition[] = useMemo(() => {
    const columns = [
      FIRST_COLUMN_LABELS,
      SECOND_COLUMN_LABELS,
      THIRD_COLUMN_LABELS,
    ];
    return columns.flatMap((labels, column) =>
      labels.map((label, row) => {
        const id = getPieceId(column, row, label);
        const initialCount = label === "Spy" ? 2 : label === "Private" ? 6 : 1;
        return {
          id,
          label,
          initialCount,
          shortLabel: SHORT_LABEL_BY_NAME[label] ?? label,
        };
      }),
    );
  }, []);

  const pieceById = useMemo(
    () => Object.fromEntries(pieceDefinitions.map((p) => [p.id, p])),
    [pieceDefinitions],
  );

  // ── UI state ────────────────────────────────────────────────────────────────
  const [isInventoryExpanded, setIsInventoryExpanded] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showReadyModal, setShowReadyModal] = useState(false);

  // ── Formation state ─────────────────────────────────────────────────────────
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [placedByTileIndex, setPlacedByTileIndex] = useState<
    Record<number, string>
  >({});
  const [moveSourceTileIndex, setMoveSourceTileIndex] = useState<number | null>(
    null,
  );
  const [lastTap, setLastTap] = useState<{
    tileIndex: number;
    time: number;
  } | null>(null);

  // ── Drag state ──────────────────────────────────────────────────────────────
  const [draggingPieceId, setDraggingPieceId] = useState<string | null>(null);
  const [draggingFromTile, setDraggingFromTile] = useState<number | null>(null);
  const [dragOverTileIndex, setDragOverTileIndex] = useState<number | null>(
    null,
  );

  // ── Battle state ────────────────────────────────────────────────────────────
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
  const [crateByTile, setCrateByTile] = useState<
    Record<number, PieceUpgradeId>
  >({});
  const [endedBySurrender, setEndedBySurrender] = useState(false);

  // ── Challenge state ─────────────────────────────────────────────────────────
  const [pendingChallenge, setPendingChallenge] =
    useState<ChallengeEvent | null>(null);
  const [pendingUpgradeRoll, setPendingUpgradeRoll] = useState<{
    upgrade: PieceUpgradeId;
  } | null>(null);

  const [pendingUpgradeActivation, setPendingUpgradeActivation] = useState<{
    legalMove: BattleMove;
    playerUpgrade: PieceUpgradeId;
  } | null>(null);

  const [pendingCrateChoice, setPendingCrateChoice] = useState<{
    currentUpgrade: PieceUpgradeId;
    newUpgrade: PieceUpgradeId;
    movedTo: number;
    nextTurn: Side;
    baseMessage: string;
    boardAfterMove: Record<number, BoardPiece>;
    remainingCrates: Record<number, PieceUpgradeId>;
  } | null>(null);

  // ── Kamikaze state ──────────────────────────────────────────────────────────
  /**
   * Set when a Private attacks an enemy piece and the Kamikaze intercept fires.
   * Cleared when the player confirms or declines, or when the AI resolves it.
   */
  const [pendingKamikaze, setPendingKamikaze] = useState<KamikazeEvent | null>(
    null,
  );

  // ── Veteran promo state ─────────────────────────────────────────────────────
  const [pendingVeteranPromo, setPendingVeteranPromo] = useState<{
    pieceShortLabel: string;
    pieceName: string;
  } | null>(null);

  const handleVeteranPromoDismiss = () => setPendingVeteranPromo(null);

  // ── Derived values ──────────────────────────────────────────────────────────
  const initialPieceCountById = useMemo(() => {
    const counts: Record<string, number> = {};
    pieceDefinitions.forEach((p) => {
      counts[p.id] = p.initialCount;
    });
    return counts;
  }, [pieceDefinitions]);

  const pieceCountById = useMemo(() => {
    const remaining = { ...initialPieceCountById };
    Object.values(placedByTileIndex).forEach((id) => {
      if (remaining[id] !== undefined)
        remaining[id] = Math.max(0, remaining[id] - 1);
    });
    return remaining;
  }, [initialPieceCountById, placedByTileIndex]);

  const totalUnplacedCount = useMemo(
    () => Object.values(pieceCountById).reduce((s, c) => s + c, 0),
    [pieceCountById],
  );

  const isReadyEnabled = totalUnplacedCount === 0;
  const selectedPiece = selectedPieceId ? pieceById[selectedPieceId] : null;
  const showSetupZoneHint =
    phase === "formation" &&
    (selectedPieceId !== null ||
      moveSourceTileIndex !== null ||
      draggingPieceId !== null ||
      draggingFromTile !== null);

  const selectedBattleMoves = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return [];
    return getLegalMoves(battleBoard, "player", pieceById)
      .filter((m) => m.from === selectedBattleTileIndex)
      .map((m) => m.to);
  }, [battleBoard, phase, pieceById, selectedBattleTileIndex]);

  const challengeTargetTiles = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return [];
    return selectedBattleMoves.filter((to) => battleBoard[to]?.side === "ai");
  }, [battleBoard, phase, selectedBattleTileIndex, selectedBattleMoves]);

  const capturedPlayerNames = useMemo(
    () =>
      capturedByPlayer.map((id) => pieceById[id]?.shortLabel ?? "?").join("  "),
    [capturedByPlayer, pieceById],
  );
  const capturedAINames = useMemo(
    () => capturedByAI.map((id) => pieceById[id]?.shortLabel ?? "?").join("  "),
    [capturedByAI, pieceById],
  );

  const boardTiles = useMemo(
    () =>
      Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }, (_, i) => ({
        index: i,
      })),
    [],
  );

  const crateTiles = useMemo(
    () => Object.keys(crateByTile).map((tile) => Number(tile)),
    [crateByTile],
  );

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

  const applyDoubleBlindBoardDecoys = (
    board: Record<number, BoardPiece>,
  ): Record<number, BoardPiece> => {
    let didChange = false;
    const nextBoard: Record<number, BoardPiece> = { ...board };

    Object.entries(board).forEach(([tileKey, piece]) => {
      if (piece.upgrade !== "double-blind") {
        const hadPlayerDecoy = piece.decoyShortLabelForPlayer !== undefined;
        const hadAIDecoy = piece.decoyShortLabelForAI !== undefined;
        if (hadPlayerDecoy || hadAIDecoy) {
          nextBoard[Number(tileKey)] = {
            ...piece,
            decoyShortLabelForPlayer: undefined,
            decoyShortLabelForAI: undefined,
          };
          didChange = true;
        }
        return;
      }

      const updates: Partial<BoardPiece> = {};
      let needsUpdate = false;

      if (piece.markedByPlayer) {
        updates.decoyShortLabelForPlayer = getRandomDecoyShortLabel(
          piece.pieceId,
        );
        needsUpdate = true;
      } else if (piece.decoyShortLabelForPlayer !== undefined) {
        updates.decoyShortLabelForPlayer = undefined;
        needsUpdate = true;
      }

      if (piece.markedByAI) {
        updates.decoyShortLabelForAI = getRandomDecoyShortLabel(piece.pieceId);
        needsUpdate = true;
      } else if (piece.decoyShortLabelForAI !== undefined) {
        updates.decoyShortLabelForAI = undefined;
        needsUpdate = true;
      }

      if (needsUpdate) {
        nextBoard[Number(tileKey)] = { ...piece, ...updates };
        didChange = true;
      }
    });

    return didChange ? nextBoard : board;
  };

  // ── Shared post-resolution logic ─────────────────────────────────────────────
  const finalizeTurnWithCrateState = (
    boardAfterMove: Record<number, BoardPiece>,
    nextTurn: Side,
    baseMessage: string,
    remainingCrates: Record<number, PieceUpgradeId>,
    options?: {
      claimedUpgrade?: PieceUpgradeId;
      destroyedCrate?: boolean;
      skipDropAttempt?: boolean;
    },
    actingSide?: Side,
  ) => {
    const moverSide: Side =
      actingSide ?? (nextTurn === "player" ? "ai" : "player");
    let nextCrates: Record<number, PieceUpgradeId> = { ...remainingCrates };
    let droppedCrates: Record<number, PieceUpgradeId> = {};

    if (
      !options?.skipDropAttempt &&
      Object.keys(nextCrates).length === 0 &&
      Math.random() < CRATE_DROP_CHANCE
    ) {
      const emptyTiles = Array.from(
        { length: BOARD_WIDTH * BOARD_HEIGHT },
        (_, tileIndex) => tileIndex,
      ).filter((tileIndex) => !boardAfterMove[tileIndex]);

      const dropUpperBound = Math.min(CRATE_DROP_MAX_COUNT, emptyTiles.length);
      const dropLowerBound = Math.min(CRATE_DROP_MIN_COUNT, dropUpperBound);

      if (dropLowerBound > 0) {
        const countRange = dropUpperBound - dropLowerBound + 1;
        const dropCount =
          dropLowerBound + Math.floor(Math.random() * countRange);
        const droppedTiles = shuffleArray(emptyTiles).slice(0, dropCount);
        droppedTiles.forEach((tile) => {
          const randomUpgrade =
            CRATE_UPGRADES[Math.floor(Math.random() * CRATE_UPGRADES.length)];
          droppedCrates[tile] = randomUpgrade;
        });
      }
    }

    if (Object.keys(droppedCrates).length > 0) {
      nextCrates = droppedCrates;
    }

    setCrateByTile(nextCrates);

    const messageAddons: string[] = [];
    if (options?.claimedUpgrade) {
      if (moverSide === "player") {
        setPendingUpgradeRoll({ upgrade: options.claimedUpgrade });
        messageAddons.push(
          `Supply crate claimed: ${CRATE_UPGRADE_LABELS[options.claimedUpgrade]} equipped.`,
        );
      } else {
        messageAddons.push("Enemy claimed a supply crate.");
      }
    }
    if (options?.destroyedCrate) {
      messageAddons.push(
        moverSide === "player"
          ? "Crate destroyed."
          : "Enemy destroyed a crate.",
      );
    }
    const dropCount = Object.keys(droppedCrates).length;
    if (dropCount > 0) {
      const noun = dropCount === 1 ? "crate" : "crates";
      messageAddons.push(`Supply drop deployed: ${dropCount} ${noun}.`);
    }

    setBattleMessage(
      messageAddons.length > 0
        ? `${baseMessage} ${messageAddons.join(" ")}`
        : baseMessage,
    );
    setTurn(nextTurn);
  };

  const applyResolution = (
    res: ReturnType<typeof resolveBattleMove>,
    nextTurn: Side,
    movedFromTileIndex?: number,
    movedToTileIndex?: number,
  ) => {
    // ── Veteran proc: roll after any combat resolution ──────────────────────
    const boardWithVeteranProc = rollVeteranProc(
      res.board,
      movedToTileIndex,
      res.capturedByPlayer,
      res.capturedByAI,
    );

    // ── Detect a freshly promoted PLAYER veteran and queue the modal ────────
    if (movedToTileIndex !== undefined) {
      const before = res.board[movedToTileIndex];
      const after = boardWithVeteranProc[movedToTileIndex];
      if (after?.isVeteran && !before?.isVeteran && after.side === "player") {
        const def = pieceById[after.pieceId];
        if (def) {
          setPendingVeteranPromo({
            pieceShortLabel: def.shortLabel,
            pieceName: def.label,
          });
        }
      }
    }

    const nextBoard = applyDoubleBlindBoardDecoys(boardWithVeteranProc);

    setBattleBoard(nextBoard);
    if (movedFromTileIndex !== undefined && movedToTileIndex !== undefined) {
      setLastMoveTrail({
        from: movedFromTileIndex,
        to: movedToTileIndex,
        side: nextTurn === "player" ? "ai" : "player",
      });
    }
    setCapturedByPlayer((c) => [...c, ...res.capturedByPlayer]);
    setCapturedByAI((c) => [...c, ...res.capturedByAI]);
    setRevealMessage(res.revealMessage);
    setSelectedBattleTileIndex(null);

    if (res.winner) {
      setWinner(res.winner);
      setPhase("ended");
      setEndedBySurrender(false);
      setCrateByTile({});
      setBattleMessage(res.message);
      return;
    }
    const opponentSide: Side = nextTurn === "player" ? "ai" : "player";
    if (getLegalMoves(nextBoard, opponentSide, pieceById).length === 0) {
      setWinner(nextTurn);
      setPhase("ended");
      setEndedBySurrender(false);
      setCrateByTile({});
      setBattleMessage(
        nextTurn === "player"
          ? "Enemy command has no legal reply. You control the field."
          : "Your line has no legal moves left. Enemy command takes the field.",
      );
      return;
    }

    const steppedCrateUpgrade =
      movedToTileIndex !== undefined
        ? crateByTile[movedToTileIndex]
        : undefined;
    const movedPiece =
      movedToTileIndex !== undefined ? nextBoard[movedToTileIndex] : undefined;
    const actingSide: Side = nextTurn === "player" ? "ai" : "player";

    const remainingCrates: Record<number, PieceUpgradeId> = { ...crateByTile };
    if (steppedCrateUpgrade !== undefined && movedToTileIndex !== undefined) {
      delete remainingCrates[movedToTileIndex];
    }

    if (steppedCrateUpgrade && movedPiece?.upgrade) {
      setCrateByTile(remainingCrates);
      if (actingSide === "ai") {
        const aiTakesNewUpgrade = Math.random() < 0.5;
        if (aiTakesNewUpgrade) {
          const withUpgrade = {
            ...nextBoard,
            [movedToTileIndex!]: {
              ...movedPiece,
              upgrade: steppedCrateUpgrade,
            },
          };
          const withUpgradeDecoys = applyDoubleBlindBoardDecoys(withUpgrade);
          setBattleBoard(withUpgradeDecoys);
          finalizeTurnWithCrateState(
            withUpgradeDecoys,
            nextTurn,
            res.message,
            remainingCrates,
            { claimedUpgrade: steppedCrateUpgrade },
            "ai",
          );
        } else {
          finalizeTurnWithCrateState(
            nextBoard,
            nextTurn,
            res.message,
            remainingCrates,
            { destroyedCrate: true, skipDropAttempt: true },
            "ai",
          );
        }
        return;
      }
      setPendingCrateChoice({
        currentUpgrade: movedPiece.upgrade,
        newUpgrade: steppedCrateUpgrade,
        movedTo: movedToTileIndex!,
        nextTurn,
        baseMessage: res.message,
        boardAfterMove: nextBoard,
        remainingCrates,
      });
      setBattleMessage(
        `${res.message} Crate found: choose to take it or destroy it.`,
      );
      return;
    }

    let boardAfterAutoClaim = nextBoard;
    let claimedUpgrade: PieceUpgradeId | undefined;
    if (steppedCrateUpgrade && movedToTileIndex !== undefined) {
      const moved = boardAfterAutoClaim[movedToTileIndex];
      if (moved) {
        boardAfterAutoClaim = {
          ...boardAfterAutoClaim,
          [movedToTileIndex]: {
            ...moved,
            upgrade: steppedCrateUpgrade,
            upgradeCharges: getInitialUpgradeCharges(steppedCrateUpgrade),
          },
        };
        boardAfterAutoClaim = applyDoubleBlindBoardDecoys(boardAfterAutoClaim);
        setBattleBoard(boardAfterAutoClaim);
        claimedUpgrade = steppedCrateUpgrade;
      }
    }

    finalizeTurnWithCrateState(
      boardAfterAutoClaim,
      nextTurn,
      res.message,
      remainingCrates,
      claimedUpgrade ? { claimedUpgrade } : undefined,
      actingSide,
    );
  };

  const handleCrateChoiceTake = () => {
    if (!pendingCrateChoice) return;
    const {
      newUpgrade,
      movedTo,
      nextTurn,
      baseMessage,
      boardAfterMove,
      remainingCrates,
    } = pendingCrateChoice;
    const movedPiece = boardAfterMove[movedTo];
    const withUpgrade = movedPiece
      ? {
          ...boardAfterMove,
          [movedTo]: {
            ...movedPiece,
            upgrade: newUpgrade,
            upgradeCharges: getInitialUpgradeCharges(newUpgrade),
          },
        }
      : boardAfterMove;
    const withUpgradeDecoys = applyDoubleBlindBoardDecoys(withUpgrade);
    setBattleBoard(withUpgradeDecoys);
    setPendingCrateChoice(null);
    finalizeTurnWithCrateState(
      withUpgradeDecoys,
      nextTurn,
      baseMessage,
      remainingCrates,
      { claimedUpgrade: newUpgrade },
      "player",
    );
  };

  const handleCrateChoiceDestroy = () => {
    if (!pendingCrateChoice) return;
    const { nextTurn, baseMessage, boardAfterMove, remainingCrates } =
      pendingCrateChoice;
    setPendingCrateChoice(null);
    finalizeTurnWithCrateState(
      boardAfterMove,
      nextTurn,
      baseMessage,
      remainingCrates,
      {
        destroyedCrate: true,
        skipDropAttempt: true,
      },
      "player",
    );
  };

  // ── Kamikaze helpers ─────────────────────────────────────────────────────────

  /**
   * Returns true when a Kamikaze intercept should fire for this move.
   * Conditions:
   *  1. The attacker is a Private.
   *  2. There is an enemy piece on the target tile (it is a challenge).
   *  3. The target is NOT another Private (same-rank is already mutual
   *     elimination — Kamikaze would add nothing).
   */
  const shouldInterceptKamikaze = (legalMove: BattleMove): boolean => {
    const attacker = battleBoard[legalMove.from];
    const defender = battleBoard[legalMove.to];
    if (!attacker || !defender) return false;
    if (attacker.side === defender.side) return false;
    if (!isPrivatePiece(attacker.pieceId, pieceById)) return false;
    if (isPrivatePiece(defender.pieceId, pieceById)) return false;
    return true;
  };

  /**
   * Builds a KamikazeEvent for the given move. Call only after
   * shouldInterceptKamikaze() returns true.
   */
  const buildKamikazeEvent = (legalMove: BattleMove): KamikazeEvent => {
    const attacker = battleBoard[legalMove.from];
    const defender = battleBoard[legalMove.to];
    const kamikazeResolution = resolveKamikazeMutualElimination(
      battleBoard,
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

  // ── Kamikaze: player confirm / decline ───────────────────────────────────────

  /**
   * Player chose to USE Kamikaze — apply mutual elimination and continue.
   */
  const handleKamikazeConfirm = () => {
    if (!pendingKamikaze) return;
    const { kamikazeResolution, legalMove } = pendingKamikaze;
    setPendingKamikaze(null);
    applyResolution(kamikazeResolution, "ai", legalMove.from, legalMove.to);
  };

  /**
   * Player chose to DECLINE Kamikaze — fall through to normal combat
   * (which will then show the ChallengeModal as usual).
   */
  const handleKamikazeDecline = () => {
    if (!pendingKamikaze) return;
    const { legalMove } = pendingKamikaze;
    setPendingKamikaze(null);

    // Check upgrade activation first, then fire the normal challenge flow
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

  // ── Shared: fire challenge ───────────────────────────────────────────────────
  /**
   * Entry point for any move that results in a challenge (player OR AI).
   * Kamikaze intercept runs first when the attacker is a Private attacking
   * a non-Private enemy.
   */
  const fireChallenge = (legalMove: BattleMove) => {
    // ── Kamikaze intercept (player turn only) ───────────────────────────────
    if (shouldInterceptKamikaze(legalMove)) {
      const attackerSide = battleBoard[legalMove.from]?.side;
      if (attackerSide === "player") {
        const event = buildKamikazeEvent(legalMove);
        setPendingKamikaze(event);
        return;
      }
    }

    // ── Normal challenge flow ───────────────────────────────────────────────
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

  // ── Upgrade activation handlers ─────────────────────────────────────────────
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

  // ── AI turn effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      phase !== "battle" ||
      turn !== "ai" ||
      winner ||
      pendingChallenge ||
      pendingUpgradeRoll ||
      pendingUpgradeActivation ||
      pendingCrateChoice ||
      pendingKamikaze || // ← block AI turn while Kamikaze modal is open
      pendingVeteranPromo
    )
      return;
    setAIThinking(true);
    const timer = setTimeout(() => {
      const aiMove = chooseMoveForProfile(
        battleBoard,
        aiProfile,
        pieceById,
        crateTiles,
      );
      if (!aiMove) {
        setWinner("player");
        setPhase("ended");
        setEndedBySurrender(false);
        setBattleMessage(
          "Enemy command is out of legal moves. You hold the field.",
        );
        setAIThinking(false);
        return;
      }

      const target = battleBoard[aiMove.to];
      if (target?.side === "player") {
        // ── AI Kamikaze logic ─────────────────────────────────────────────
        // Only fires when an AI Private attacks a non-Private player piece.
        if (shouldInterceptKamikaze(aiMove)) {
          const roll = Math.random();
          if (roll < aiProfile.kamikazeChance) {
            // AI decides to Kamikaze — resolve immediately, no modal needed.
            const kamikazeRes = resolveKamikazeMutualElimination(
              battleBoard,
              aiMove,
              pieceById,
            );
            applyResolution(kamikazeRes, "player", aiMove.from, aiMove.to);
            setAIThinking(false);
            return;
          }
          // AI declined Kamikaze — fall through to normal challenge.
        }

        const event = prepareChallengeEvent(battleBoard, aiMove, pieceById);
        if (event) {
          setAIThinking(false);
          setPendingChallenge(event);
          return;
        }
      }

      const res = resolveBattleMove(battleBoard, aiMove, pieceById);
      applyResolution(res, "player", aiMove.from, aiMove.to);
      setAIThinking(false);
    }, AI_THINKING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [
    aiProfile,
    battleBoard,
    phase,
    pieceById,
    turn,
    winner,
    pendingChallenge,
    pendingUpgradeRoll,
    pendingUpgradeActivation,
    pendingCrateChoice,
    pendingKamikaze,
    pendingVeteranPromo,
    crateTiles,
  ]);

  // ── Challenge modal dismiss ──────────────────────────────────────────────────
  const handleChallengeDismiss = () => {
    if (!pendingChallenge) return;
    const {
      resolution,
      attackerSide,
      attackerUpgrade,
      defenderUpgrade,
      outcome,
      from,
      to,
    } = pendingChallenge;
    setPendingChallenge(null);

    const nextResolution = {
      ...resolution,
      board: { ...resolution.board },
    };
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

  const handleUpgradeRollDismiss = () => {
    setPendingUpgradeRoll(null);
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const clearFormationSelection = () => {
    setMoveSourceTileIndex(null);
    setSelectedPieceId(null);
  };

  const returnToMainMenu = () => {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  // ── Formation tap handlers ──────────────────────────────────────────────────
  const handlePieceButtonPress = (pieceId: string) => {
    if (phase !== "formation") return;
    setMoveSourceTileIndex(null);
    setSelectedPieceId((cur) => (cur === pieceId ? null : pieceId));
  };

  const handleResetBoard = () => {
    setPlacedByTileIndex({});
    setMoveSourceTileIndex(null);
    setSelectedPieceId(null);
    setLastTap(null);
    setDraggingPieceId(null);
    setDraggingFromTile(null);
    setDragOverTileIndex(null);
  };

  const handleRandomizeSet = () => {
    const setupTiles = boardTiles
      .filter((t) => isPlayerSetupZoneTileIndex(t.index))
      .map((t) => t.index);
    const pieceBag = pieceDefinitions.flatMap((p) =>
      Array.from({ length: p.initialCount }, () => p.id),
    );
    const shuffledTiles = shuffleArray(setupTiles);
    const shuffledPieces = shuffleArray(pieceBag);
    const placement: Record<number, string> = {};
    shuffledPieces.forEach((id, i) => {
      if (shuffledTiles[i] !== undefined) placement[shuffledTiles[i]] = id;
    });
    setPlacedByTileIndex(placement);
    setMoveSourceTileIndex(null);
    setSelectedPieceId(null);
    setLastTap(null);
    setDraggingPieceId(null);
    setDraggingFromTile(null);
    setDragOverTileIndex(null);
  };

  const tryHandleDoubleTapRemove = (tileIndex: number, now: number) => {
    if (
      !lastTap ||
      lastTap.tileIndex !== tileIndex ||
      now - lastTap.time >= DOUBLE_TAP_MS
    )
      return false;
    setLastTap(null);
    setPlacedByTileIndex((cur) => {
      if (!cur[tileIndex]) return cur;
      const next = { ...cur };
      delete next[tileIndex];
      return next;
    });
    clearFormationSelection();
    return true;
  };

  const tryHandleMoveFromSource = (tileIndex: number) => {
    if (moveSourceTileIndex === null) return false;
    const movingId = placedByTileIndex[moveSourceTileIndex];
    if (!movingId) {
      setMoveSourceTileIndex(null);
      return true;
    }
    if (tileIndex === moveSourceTileIndex) {
      clearFormationSelection();
      return true;
    }
    setPlacedByTileIndex((cur) => {
      const next = { ...cur };
      const targetId = next[tileIndex];
      next[tileIndex] = movingId;
      targetId
        ? (next[moveSourceTileIndex] = targetId)
        : delete next[moveSourceTileIndex];
      return next;
    });
    clearFormationSelection();
    return true;
  };

  const tryBeginMoveFromTile = (tileIndex: number) => {
    if (selectedPieceId) return false;
    const id = placedByTileIndex[tileIndex];
    if (!id) return true;
    setMoveSourceTileIndex(tileIndex);
    setSelectedPieceId(id);
    return true;
  };

  const handlePlaceSelectedPiece = (tileIndex: number) => {
    if (!selectedPieceId || (pieceCountById[selectedPieceId] ?? 0) <= 0) return;
    setPlacedByTileIndex((cur) => ({ ...cur, [tileIndex]: selectedPieceId }));
    clearFormationSelection();
  };

  const handleFormationTilePress = (tileIndex: number) => {
    if (!isPlayerSetupZoneTileIndex(tileIndex)) return;
    const now = Date.now();
    if (tryHandleDoubleTapRemove(tileIndex, now)) return;
    setLastTap({ tileIndex, time: now });
    if (tryHandleMoveFromSource(tileIndex)) return;
    if (tryBeginMoveFromTile(tileIndex)) return;
    handlePlaceSelectedPiece(tileIndex);
  };

  // ── Drag handlers ────────────────────────────────────────────────────────────
  const handleDragStartFromReserve = (pieceId: string) => {
    if (phase !== "formation") return;
    if ((pieceCountById[pieceId] ?? 0) <= 0) return;
    setDraggingPieceId(pieceId);
    setDraggingFromTile(null);
    setSelectedPieceId(null);
    setMoveSourceTileIndex(null);
  };

  const handleDragStartFromBoard = (tileIndex: number) => {
    if (phase !== "formation") return;
    const pieceId = placedByTileIndex[tileIndex];
    if (!pieceId) return;
    setDraggingFromTile(tileIndex);
    setDraggingPieceId(pieceId);
    setSelectedPieceId(null);
    setMoveSourceTileIndex(null);
  };

  const handleDragEnterTile = (tileIndex: number) => {
    if (draggingPieceId === null) return;
    setDragOverTileIndex(tileIndex);
  };

  const handleDragEnd = (targetTileIndex: number | null) => {
    if (draggingPieceId === null) {
      setDraggingFromTile(null);
      setDragOverTileIndex(null);
      return;
    }

    const pieceId = draggingPieceId;
    const fromTile = draggingFromTile;

    setDraggingPieceId(null);
    setDraggingFromTile(null);
    setDragOverTileIndex(null);

    if (
      targetTileIndex === null ||
      !isPlayerSetupZoneTileIndex(targetTileIndex)
    ) {
      return;
    }

    if (fromTile !== null) {
      if (targetTileIndex === fromTile) return;
      setPlacedByTileIndex((cur) => {
        const next = { ...cur };
        const displaced = next[targetTileIndex];
        next[targetTileIndex] = pieceId;
        displaced ? (next[fromTile] = displaced) : delete next[fromTile];
        return next;
      });
    } else {
      if ((pieceCountById[pieceId] ?? 0) <= 0) return;
      setPlacedByTileIndex((cur) => ({ ...cur, [targetTileIndex]: pieceId }));
    }
  };

  // ── Battle handlers ─────────────────────────────────────────────────────────
  const handleBattleTilePress = (tileIndex: number) => {
    if (
      phase !== "battle" ||
      turn !== "player" ||
      winner ||
      aiThinking ||
      pendingChallenge ||
      pendingUpgradeRoll ||
      pendingUpgradeActivation ||
      pendingCrateChoice ||
      pendingKamikaze || // ← block tile interaction while Kamikaze modal is open
      pendingVeteranPromo
    )
      return;
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

    const legalMove = getLegalMoves(battleBoard, "player", pieceById).find(
      (m) => m.from === selectedBattleTileIndex && m.to === tileIndex,
    );
    if (!legalMove) {
      setSelectedBattleTileIndex(null);
      return;
    }

    if (tappedPiece?.side === "ai") {
      fireChallenge(legalMove);
      return;
    }

    const res = resolveBattleMove(battleBoard, legalMove, pieceById);
    applyResolution(res, "ai", legalMove.from, legalMove.to);
  };

  const handleChallengePress = (targetTileIndex: number) => {
    if (
      phase !== "battle" ||
      turn !== "player" ||
      winner ||
      aiThinking ||
      pendingChallenge ||
      pendingUpgradeRoll ||
      pendingUpgradeActivation ||
      pendingCrateChoice ||
      pendingKamikaze || // ← block challenge press while Kamikaze modal is open
      pendingVeteranPromo
    )
      return;
    if (selectedBattleTileIndex === null) return;
    const legalMove = getLegalMoves(battleBoard, "player", pieceById).find(
      (m) => m.from === selectedBattleTileIndex && m.to === targetTileIndex,
    );
    if (!legalMove) return;
    fireChallenge(legalMove);
  };

  const handleTilePress = (tileIndex: number) =>
    phase === "formation"
      ? handleFormationTilePress(tileIndex)
      : handleBattleTilePress(tileIndex);

  // ── Game lifecycle ──────────────────────────────────────────────────────────
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
    setCrateByTile({});
    setCapturedByPlayer([]);
    setCapturedByAI([]);
    setEndedBySurrender(false);
    setPendingChallenge(null);
    setPendingUpgradeRoll(null);
    setPendingUpgradeActivation(null);
    setPendingCrateChoice(null);
    setPendingKamikaze(null);
    setPendingVeteranPromo(null);
    setShowReadyModal(false);
    clearFormationSelection();
    setIsInventoryExpanded(false);
    setDraggingPieceId(null);
    setDraggingFromTile(null);
    setDragOverTileIndex(null);
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
    setPendingCrateChoice(null);
    setPendingKamikaze(null);
    setPendingVeteranPromo(null);
    setBattleMessage("You forfeited the match. Enemy command takes the field.");
    setRevealMessage("The battle ended by surrender.");
    setCrateByTile({});
  };

  const handleRetryMatch = () => {
    setShowQuitModal(false);
    setShowReadyModal(false);
    setEndedBySurrender(false);
    setIsInventoryExpanded(false);
    setPlacedByTileIndex({});
    setMoveSourceTileIndex(null);
    setSelectedPieceId(null);
    setLastTap(null);
    setPhase("formation");
    setTurn("player");
    setBattleBoard({});
    setSelectedBattleTileIndex(null);
    setLastMoveTrail(null);
    setBattleMessage("Build your line, then confirm to begin the clash.");
    setRevealMessage(null);
    setAIThinking(false);
    setWinner(null);
    setCrateByTile({});
    setCapturedByPlayer([]);
    setCapturedByAI([]);
    setPendingChallenge(null);
    setPendingUpgradeRoll(null);
    setPendingUpgradeActivation(null);
    setPendingCrateChoice(null);
    setPendingKamikaze(null);
    setPendingVeteranPromo(null);
    setDraggingPieceId(null);
    setDraggingFromTile(null);
    setDragOverTileIndex(null);
  };

  return {
    // data
    aiProfile,
    pieceDefinitions,
    pieceById,
    pieceCountById,
    boardTiles,
    // formation
    phase,
    selectedPieceId,
    selectedPiece,
    placedByTileIndex,
    moveSourceTileIndex,
    totalUnplacedCount,
    isReadyEnabled,
    showSetupZoneHint,
    // drag
    draggingPieceId,
    draggingFromTile,
    dragOverTileIndex,
    handleDragStartFromReserve,
    handleDragStartFromBoard,
    handleDragEnterTile,
    handleDragEnd,
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
    pendingCrateChoice,
    handleCrateChoiceTake,
    handleCrateChoiceDestroy,
    // kamikaze
    pendingKamikaze,
    handleKamikazeConfirm,
    handleKamikazeDecline,
    // veteran promo
    pendingVeteranPromo,
    handleVeteranPromoDismiss,
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
    handlePieceButtonPress,
    handleResetBoard,
    handleRandomizeSet,
    startBattle,
    handleForfeitMatch,
    handleRetryMatch,
    returnToMainMenu,
  };
}
