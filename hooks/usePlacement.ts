import { useMemo, useState } from "react";

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  DOUBLE_TAP_MS,
  FIRST_COLUMN_LABELS,
  SECOND_COLUMN_LABELS,
  SHORT_LABEL_BY_NAME,
  THIRD_COLUMN_LABELS,
} from "../constants/constants";
import { getPieceId, isPlayerSetupZoneTileIndex, shuffleArray } from "../scripts/gameLogic";
import type { Phase, PieceDefinition } from "../scripts/types";

export function usePlacement(phase: Phase) {
  // ── Piece catalogue ──────────────────────────────────────────────────────────
  const pieceDefinitions: PieceDefinition[] = useMemo(() => {
    const columns = [FIRST_COLUMN_LABELS, SECOND_COLUMN_LABELS, THIRD_COLUMN_LABELS];
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

  const boardTiles = useMemo(
    () => Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }, (_, i) => ({ index: i })),
    [],
  );

  const initialPieceCountById = useMemo(() => {
    const counts: Record<string, number> = {};
    pieceDefinitions.forEach((p) => { counts[p.id] = p.initialCount; });
    return counts;
  }, [pieceDefinitions]);

  // ── Formation state ──────────────────────────────────────────────────────────
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [placedByTileIndex, setPlacedByTileIndex] = useState<Record<number, string>>({});
  const [moveSourceTileIndex, setMoveSourceTileIndex] = useState<number | null>(null);
  const [lastTap, setLastTap] = useState<{ tileIndex: number; time: number } | null>(null);

  // ── Drag state ───────────────────────────────────────────────────────────────
  const [draggingPieceId, setDraggingPieceId] = useState<string | null>(null);
  const [draggingFromTile, setDraggingFromTile] = useState<number | null>(null);
  const [dragOverTileIndex, setDragOverTileIndex] = useState<number | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const pieceCountById = useMemo(() => {
    const remaining = { ...initialPieceCountById };
    Object.values(placedByTileIndex).forEach((id) => {
      if (remaining[id] !== undefined) remaining[id] = Math.max(0, remaining[id] - 1);
    });
    return remaining;
  }, [initialPieceCountById, placedByTileIndex]);

  const totalUnplacedCount = useMemo(
    () => Object.values(pieceCountById).reduce((s, c) => s + c, 0),
    [pieceCountById],
  );

  const selectedPiece = selectedPieceId ? pieceById[selectedPieceId] : null;

  const showSetupZoneHint =
    phase === "formation" &&
    (selectedPieceId !== null ||
      moveSourceTileIndex !== null ||
      draggingPieceId !== null ||
      draggingFromTile !== null);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const clearFormationSelection = () => {
    setMoveSourceTileIndex(null);
    setSelectedPieceId(null);
  };

  // ── Formation tap handlers ───────────────────────────────────────────────────
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
    if (!lastTap || lastTap.tileIndex !== tileIndex || now - lastTap.time >= DOUBLE_TAP_MS)
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
    if (!movingId) { setMoveSourceTileIndex(null); return true; }
    if (tileIndex === moveSourceTileIndex) { clearFormationSelection(); return true; }
    setPlacedByTileIndex((cur) => {
      const next = { ...cur };
      const targetId = next[tileIndex];
      next[tileIndex] = movingId;
      targetId ? (next[moveSourceTileIndex] = targetId) : delete next[moveSourceTileIndex];
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

    if (targetTileIndex === null || !isPlayerSetupZoneTileIndex(targetTileIndex)) return;

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

  // ── Reset for new match ──────────────────────────────────────────────────────
  const resetPlacement = () => {
    setPlacedByTileIndex({});
    setMoveSourceTileIndex(null);
    setSelectedPieceId(null);
    setLastTap(null);
    setDraggingPieceId(null);
    setDraggingFromTile(null);
    setDragOverTileIndex(null);
  };

  return {
    // catalogue
    pieceDefinitions,
    pieceById,
    boardTiles,
    pieceCountById,
    totalUnplacedCount,
    selectedPiece,
    showSetupZoneHint,
    // state
    selectedPieceId,
    placedByTileIndex,
    moveSourceTileIndex,
    draggingPieceId,
    draggingFromTile,
    dragOverTileIndex,
    // formation handlers
    handlePieceButtonPress,
    handleResetBoard,
    handleRandomizeSet,
    handleFormationTilePress,
    clearFormationSelection,
    // drag handlers
    handleDragStartFromReserve,
    handleDragStartFromBoard,
    handleDragEnterTile,
    handleDragEnd,
    // lifecycle
    resetPlacement,
  };
}
