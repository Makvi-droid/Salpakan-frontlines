import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { chooseMoveForProfile, generateAIFormation } from "../app/aiLogic";
import {
  buildBattleBoard,
  getLegalMoves,
  getPieceId,
  isPlayerSetupZoneTileIndex,
  resolveBattleMove,
  shuffleArray,
} from "../app/gameLogic";
import type {
  BoardPiece,
  Difficulty,
  Phase,
  PieceDefinition,
  Side,
} from "../app/types";
import {
  AI_THINKING_DELAY_MS,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  DIFFICULTY_PROFILES,
  DOUBLE_TAP_MS,
  FIRST_COLUMN_LABELS,
  SECOND_COLUMN_LABELS,
  SHORT_LABEL_BY_NAME,
  THIRD_COLUMN_LABELS,
} from "../constants/constants";

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
  const [endedBySurrender, setEndedBySurrender] = useState(false);

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
    (selectedPieceId !== null || moveSourceTileIndex !== null);

  const selectedBattleMoves = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) return [];
    return getLegalMoves(battleBoard, "player", pieceById)
      .filter((m) => m.from === selectedBattleTileIndex)
      .map((m) => m.to);
  }, [battleBoard, phase, pieceById, selectedBattleTileIndex]);

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

  // ── AI turn effect ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "battle" || turn !== "ai" || winner) return;
    setAIThinking(true);
    const timer = setTimeout(() => {
      const aiMove = chooseMoveForProfile(battleBoard, aiProfile, pieceById);
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
      const res = resolveBattleMove(battleBoard, aiMove, pieceById);
      setBattleBoard(res.board);
      setCapturedByPlayer((c) => [...c, ...res.capturedByPlayer]);
      setCapturedByAI((c) => [...c, ...res.capturedByAI]);
      setBattleMessage(res.message);
      setRevealMessage(res.revealMessage);
      if (res.winner) {
        setWinner(res.winner);
        setPhase("ended");
        setEndedBySurrender(false);
      } else if (getLegalMoves(res.board, "player", pieceById).length === 0) {
        setWinner("ai");
        setPhase("ended");
        setEndedBySurrender(false);
        setBattleMessage(
          "Your line has no legal moves left. Enemy command takes the field.",
        );
      } else {
        setTurn("player");
      }
      setSelectedBattleTileIndex(null);
      setAIThinking(false);
    }, AI_THINKING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [aiProfile, battleBoard, phase, pieceById, turn, winner]);

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

  // ── Formation handlers ──────────────────────────────────────────────────────
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

  // ── Battle handlers ─────────────────────────────────────────────────────────
  const handleBattleTilePress = (tileIndex: number) => {
    if (phase !== "battle" || turn !== "player" || winner || aiThinking) return;
    const tappedPiece = battleBoard[tileIndex];

    if (selectedBattleTileIndex === null) {
      if (tappedPiece?.side === "player") setSelectedBattleTileIndex(tileIndex);
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

    const res = resolveBattleMove(battleBoard, legalMove, pieceById);
    setBattleBoard(res.board);
    setCapturedByPlayer((c) => [...c, ...res.capturedByPlayer]);
    setCapturedByAI((c) => [...c, ...res.capturedByAI]);
    setBattleMessage(res.message);
    setRevealMessage(res.revealMessage);
    setSelectedBattleTileIndex(null);

    if (res.winner) {
      setWinner(res.winner);
      setPhase("ended");
      setEndedBySurrender(false);
      return;
    }
    if (getLegalMoves(res.board, "ai", pieceById).length === 0) {
      setWinner("player");
      setPhase("ended");
      setEndedBySurrender(false);
      setBattleMessage(
        "Enemy command has no legal reply. You control the field.",
      );
      return;
    }
    setTurn("ai");
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
    setBattleMessage(
      `Enemy ${aiProfile.label} formation is in position. Your move.`,
    );
    setRevealMessage(null);
    setCapturedByPlayer([]);
    setCapturedByAI([]);
    setEndedBySurrender(false);
    setShowReadyModal(false);
    clearFormationSelection();
    setIsInventoryExpanded(false);
  };

  const handleForfeitMatch = () => {
    setShowQuitModal(false);
    setAIThinking(false);
    setEndedBySurrender(true);
    setWinner("ai");
    setPhase("ended");
    setTurn("ai");
    setSelectedBattleTileIndex(null);
    setBattleMessage("You forfeited the match. Enemy command takes the field.");
    setRevealMessage("The battle ended by surrender.");
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
    setBattleMessage("Build your line, then confirm to begin the clash.");
    setRevealMessage(null);
    setAIThinking(false);
    setWinner(null);
    setCapturedByPlayer([]);
    setCapturedByAI([]);
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
    // battle
    turn,
    battleBoard,
    selectedBattleTileIndex,
    selectedBattleMoves,
    battleMessage,
    revealMessage,
    aiThinking,
    winner,
    endedBySurrender,
    capturedPlayerNames,
    capturedAINames,
    // UI
    isInventoryExpanded,
    setIsInventoryExpanded,
    showQuitModal,
    setShowQuitModal,
    showReadyModal,
    setShowReadyModal,
    // handlers
    handleTilePress,
    handlePieceButtonPress,
    handleResetBoard,
    handleRandomizeSet,
    startBattle,
    handleForfeitMatch,
    handleRetryMatch,
    returnToMainMenu,
  };
}
