import { useCallback, useState } from "react";
import {
  getTileColumn,
  getTileIndex,
  getTileRow,
  isInsideBoard,
} from "../scripts/gameLogic";
import type { BoardPiece, PieceDefinition, Side } from "../scripts/types";

/** 5-minute wall-clock cooldown — same cadence as other abilities */
export const ONE_STAR_BONUS_COOLDOWN_MS = 5 * 60 * 1000;

/** Orthogonal direction vectors — 1 square only */
const ORTHOGONAL_DIRECTIONS = [
  { x: 0, y: -1 }, // up
  { x: 0, y: 1 },  // down
  { x: -1, y: 0 }, // left
  { x: 1, y: 0 },  // right
] as const;

/**
 * The event object surfaced when the 1-Star General wins a challenge and the
 * bonus-move modal needs to be shown.
 */
export type OneStarBonusMoveEvent = {
  /** Tile the 1-Star General currently occupies (after winning the challenge) */
  generalTileIndex: number;
  /** Which side triggered the bonus move */
  side: Side;
};

interface UseOneStarGeneralOptions {
  pieceById: Record<string, PieceDefinition>;
}

export function useOneStarGeneral({ pieceById }: UseOneStarGeneralOptions) {
  // ── Pending bonus-move modal event ───────────────────────────────────────
  const [pendingBonusMove, setPendingBonusMove] =
    useState<OneStarBonusMoveEvent | null>(null);

  // ── Active flag — player is in tile-select mode ───────────────────────────
  const [bonusMoveActive, setBonusMoveActive] = useState(false);

  // ── Cooldown timestamps ───────────────────────────────────────────────────
  const [playerCooldownUntil, setPlayerCooldownUntil] = useState<number | null>(
    null,
  );
  const [aiCooldownUntil, setAiCooldownUntil] = useState<number | null>(null);

  // ── Piece helpers ─────────────────────────────────────────────────────────

  /** True when the given BoardPiece is the player's 1-Star General */
  const isPlayerOneStarGeneral = useCallback(
    (piece: BoardPiece): boolean =>
      piece.side === "player" &&
      pieceById[piece.pieceId]?.label === "1 Star\nGeneral",
    [pieceById],
  );

  /** True when the given BoardPiece is the AI's 1-Star General */
  const isAIOneStarGeneral = useCallback(
    (piece: BoardPiece): boolean =>
      piece.side === "ai" &&
      pieceById[piece.pieceId]?.label === "1 Star\nGeneral",
    [pieceById],
  );

  /** True when any piece on the board with the given pieceId is the 1-Star General */
  const isOneStarGeneralPiece = useCallback(
    (pieceId: string): boolean =>
      pieceById[pieceId]?.label === "1 Star\nGeneral",
    [pieceById],
  );

  // ── Valid bonus-move tile computation ─────────────────────────────────────

  /**
   * Returns tile indices that are exactly 1 orthogonal step from
   * `generalTileIndex` and NOT occupied by any piece (movement only —
   * no second challenge allowed).
   */
  const getBonusMoveTiles = useCallback(
    (
      board: Record<number, BoardPiece>,
      generalTileIndex: number,
    ): number[] => {
      const fromRow = getTileRow(generalTileIndex);
      const fromCol = getTileColumn(generalTileIndex);
      const targets: number[] = [];

      ORTHOGONAL_DIRECTIONS.forEach(({ x, y }) => {
        const r = fromRow + y;
        const c = fromCol + x;
        if (!isInsideBoard(r, c)) return;
        const ti = getTileIndex(r, c);
        // Only empty tiles — no captures allowed on bonus move
        if (!board[ti]) {
          targets.push(ti);
        }
      });

      return targets;
    },
    [],
  );

  // ── Cooldown queries ──────────────────────────────────────────────────────

  const isPlayerOnCooldown = useCallback(
    (): boolean =>
      playerCooldownUntil !== null && Date.now() < playerCooldownUntil,
    [playerCooldownUntil],
  );

  const isAIOnCooldown = useCallback(
    (): boolean =>
      aiCooldownUntil !== null && Date.now() < aiCooldownUntil,
    [aiCooldownUntil],
  );

  // ── Cooldown starters ─────────────────────────────────────────────────────

  const startPlayerCooldown = useCallback(() => {
    setPlayerCooldownUntil(Date.now() + ONE_STAR_BONUS_COOLDOWN_MS);
  }, []);

  const startAICooldown = useCallback(() => {
    setAiCooldownUntil(Date.now() + ONE_STAR_BONUS_COOLDOWN_MS);
  }, []);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Called by useBattleResolution / useAITurn after the 1-Star General wins
   * a challenge to queue the bonus-move modal.
   */
  const queueBonusMove = useCallback(
    (generalTileIndex: number, side: Side) => {
      setPendingBonusMove({ generalTileIndex, side });
    },
    [],
  );

  /**
   * Called when the player dismisses the modal and enters tile-select mode.
   * Clears the pending event and arms bonusMoveActive.
   */
  const confirmBonusMove = useCallback(() => {
    setPendingBonusMove(null);
    setBonusMoveActive(true);
  }, []);

  /**
   * Called when the player chooses to skip the bonus move from the modal.
   */
  const skipBonusMove = useCallback(() => {
    setPendingBonusMove(null);
    setBonusMoveActive(false);
    startPlayerCooldown();
  }, [startPlayerCooldown]);

  /**
   * Called when the player cancels tile-select mode (taps elsewhere).
   */
  const cancelBonusMove = useCallback(() => {
    setBonusMoveActive(false);
    startPlayerCooldown();
  }, [startPlayerCooldown]);

  /**
   * Called after the player successfully picks a tile — clears active state
   * and starts cooldown.
   */
  const completeBonusMove = useCallback(() => {
    setBonusMoveActive(false);
    startPlayerCooldown();
  }, [startPlayerCooldown]);

  /**
   * Applies the bonus move to the board snapshot.
   * Returns a new board — does NOT mutate the original.
   */
  const applyBonusMove = useCallback(
    (
      board: Record<number, BoardPiece>,
      fromTileIndex: number,
      toTileIndex: number,
    ): Record<number, BoardPiece> => {
      const piece = board[fromTileIndex];
      if (!piece) return board;
      const next = { ...board };
      next[toTileIndex] = { ...piece };
      delete next[fromTileIndex];
      return next;
    },
    [],
  );

  // ── Reset (called on retry / forfeit / new battle) ────────────────────────

  const resetOneStarGeneral = useCallback(() => {
    setPendingBonusMove(null);
    setBonusMoveActive(false);
    setPlayerCooldownUntil(null);
    setAiCooldownUntil(null);
  }, []);

  return {
    // state
    pendingBonusMove,
    bonusMoveActive,
    playerCooldownUntil,
    aiCooldownUntil,
    // piece identification
    isPlayerOneStarGeneral,
    isAIOneStarGeneral,
    isOneStarGeneralPiece,
    // tile computation
    getBonusMoveTiles,
    // cooldown queries
    isPlayerOnCooldown,
    isAIOnCooldown,
    // cooldown starters
    startPlayerCooldown,
    startAICooldown,
    // lifecycle
    queueBonusMove,
    confirmBonusMove,
    skipBonusMove,
    cancelBonusMove,
    completeBonusMove,
    applyBonusMove,
    resetOneStarGeneral,
  };
}
