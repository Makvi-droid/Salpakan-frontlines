import { useCallback, useRef, useState } from "react";
import {
  getTileColumn,
  getTileRow,
  isInsideBoard,
  getTileIndex,
} from "../scripts/gameLogic";
import type { BoardPiece, PieceDefinition } from "../scripts/types";

/** 5-minute wall-clock cooldown in milliseconds — same as Spy / Flag ability */
export const COLONEL_REVEAL_COOLDOWN_MS = 5 * 60 * 1000;

/** How long the revealed piece stays lit up (ms) — same as Spy reveal */
export const COLONEL_REVEAL_DURATION_MS = 1500;

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * What the player sees during a Colonel diagonal reveal.
 *
 * - `tileIndex`  — which enemy tile is highlighted on the board
 * - `shortLabel` — the true rank label to display
 */
export interface ColonelRevealResult {
  tileIndex: number;
  shortLabel: string;
}

// ─── Diagonal direction vectors ───────────────────────────────────────────────

const DIAGONAL_DIRECTIONS = [
  { x: 1, y: 1 },   // down-right
  { x: -1, y: 1 },  // down-left
  { x: 1, y: -1 },  // up-right
  { x: -1, y: -1 }, // up-left
] as const;

interface UseColonelRevealOptions {
  pieceById: Record<string, PieceDefinition>;
}

export function useColonelReveal({ pieceById }: UseColonelRevealOptions) {
  // ── State ─────────────────────────────────────────────────────────────────────

  /**
   * The active reveal payload shown to the player.
   * null when no reveal is in progress.
   */
  const [colonelReveal, setColonelReveal] =
    useState<ColonelRevealResult | null>(null);

  /**
   * Whether the Colonel's "Field Scope" mode is active — i.e. the player has
   * pressed the ability button and is now waiting to tap a diagonal enemy tile.
   */
  const [colonelRevealActive, setColonelRevealActive] = useState(false);

  /** Wall-clock timestamp after which the player may use the ability again */
  const [playerCooldownUntil, setPlayerCooldownUntil] = useState<number | null>(
    null,
  );

  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Piece helpers ─────────────────────────────────────────────────────────────

  /**
   * Returns true when the given BoardPiece is the player's Colonel.
   */
  const isPlayerColonelPiece = useCallback(
    (piece: BoardPiece): boolean =>
      piece.side === "player" && pieceById[piece.pieceId]?.label === "Col",
    [pieceById],
  );

  // ── Diagonal target computation ───────────────────────────────────────────────

  /**
   * Returns the tile indices of all AI pieces that are diagonally adjacent
   * to the given Colonel tile. This list drives both the board highlight and
   * the selection tap handler.
   */
  const getDiagonalEnemyTiles = useCallback(
    (
      board: Record<number, BoardPiece>,
      colonelTileIndex: number,
    ): number[] => {
      const fromRow = getTileRow(colonelTileIndex);
      const fromCol = getTileColumn(colonelTileIndex);
      const targets: number[] = [];

      DIAGONAL_DIRECTIONS.forEach((dir) => {
        const r = fromRow + dir.y;
        const c = fromCol + dir.x;
        if (!isInsideBoard(r, c)) return;
        const ti = getTileIndex(r, c);
        const occupant = board[ti];
        if (occupant?.side === "ai") {
          targets.push(ti);
        }
      });

      return targets;
    },
    [],
  );

  // ── Cooldown queries ──────────────────────────────────────────────────────────

  const isPlayerOnCooldown = useCallback(
    (): boolean =>
      playerCooldownUntil !== null && Date.now() < playerCooldownUntil,
    [playerCooldownUntil],
  );

  // ── Cooldown starter ──────────────────────────────────────────────────────────

  const startPlayerCooldown = useCallback(() => {
    setPlayerCooldownUntil(Date.now() + COLONEL_REVEAL_COOLDOWN_MS);
  }, []);

  // ── Activate / cancel ─────────────────────────────────────────────────────────

  /**
   * Call when the player presses the Colonel ability button.
   * Puts the ability into "target selection" mode — the board will now
   * highlight diagonal enemies and wait for the player to tap one.
   */
  const activateColonelReveal = useCallback(() => {
    if (isPlayerOnCooldown()) return;
    setColonelRevealActive(true);
  }, [isPlayerOnCooldown]);

  /**
   * Call when the player taps elsewhere to cancel, or after a successful reveal.
   */
  const cancelColonelReveal = useCallback(() => {
    setColonelRevealActive(false);
  }, []);

  // ── Resolve: player taps a diagonal enemy tile ────────────────────────────────

  /**
   * Call when the player taps a tile that is in the `colonelDiagonalTiles` list.
   *
   * - Builds the reveal result from the tapped piece.
   * - Auto-clears the overlay after COLONEL_REVEAL_DURATION_MS.
   * - Starts the cooldown.
   * - Returns `true` so the caller knows to pass the turn to AI.
   */
  const applyColonelReveal = useCallback(
    (
      board: Record<number, BoardPiece>,
      tileIndex: number,
    ): boolean => {
      const piece = board[tileIndex];
      if (!piece || piece.side !== "ai") return false;

      const shortLabel = pieceById[piece.pieceId]?.shortLabel ?? "?";

      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);

      setColonelReveal({ tileIndex, shortLabel });
      setColonelRevealActive(false);
      startPlayerCooldown();

      revealTimerRef.current = setTimeout(() => {
        setColonelReveal(null);
        revealTimerRef.current = null;
      }, COLONEL_REVEAL_DURATION_MS);

      return true;
    },
    [pieceById, startPlayerCooldown],
  );

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const resetColonelReveal = useCallback(() => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    setColonelReveal(null);
    setColonelRevealActive(false);
    setPlayerCooldownUntil(null);
  }, []);

  return {
    // state
    colonelReveal,         // ColonelRevealResult | null — drives board overlay
    colonelRevealActive,   // bool — ability is armed, waiting for target tap
    playerCooldownUntil,   // number | null — feeds AbilityPanel button
    // queries
    isPlayerOnCooldown,
    isPlayerColonelPiece,
    // derived
    getDiagonalEnemyTiles,
    // actions
    activateColonelReveal,
    cancelColonelReveal,
    applyColonelReveal,
    resetColonelReveal,
    startPlayerCooldown,
  };
}
