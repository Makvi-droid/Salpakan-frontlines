import { useState } from "react";
import type {
  BoardPiece,
  FlagSwapEvent,
  PieceDefinition,
} from "../scripts/types";

/** 5-minute wall-clock cooldown in milliseconds */
export const FLAG_SWAP_COOLDOWN_MS = 5 * 60 * 1000;

interface UseFlagSwapOptions {
  pieceById: Record<string, PieceDefinition>;
}

export function useFlagSwap({ pieceById }: UseFlagSwapOptions) {
  // ── State ────────────────────────────────────────────────────────────────────
  /** True while the player is in ally-picking mode after pressing the button */
  const [flagSwapActive, setFlagSwapActive] = useState(false);

  /** Kept for potential future modal use (currently unused — swap is instant) */
  const [pendingFlagSwap, setPendingFlagSwap] = useState<FlagSwapEvent | null>(
    null,
  );

  /**
   * Wall-clock timestamp (ms) after which the PLAYER may use the ability again.
   * null means no cooldown is active.
   */
  const [playerCooldownUntil, setPlayerCooldownUntil] = useState<number | null>(
    null,
  );

  /**
   * Wall-clock timestamp (ms) after which the AI may use the ability again.
   * null means no cooldown is active.
   */
  const [aiCooldownUntil, setAICooldownUntil] = useState<number | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  /** True if a board piece is the player's Flag */
  const isFlagPiece = (piece: BoardPiece): boolean =>
    piece.side === "player" && pieceById[piece.pieceId]?.label === "Flag";

  /**
   * Returns all tile indices that are valid swap targets for the Flag.
   * Valid = player-owned, not the Flag itself.
   */
  const getAllySwapTiles = (
    board: Record<number, BoardPiece>,
    flagTileIndex: number | null,
  ): number[] => {
    if (flagTileIndex === null) return [];
    const flagPiece = board[flagTileIndex];
    if (!flagPiece || !isFlagPiece(flagPiece)) return [];
    return Object.entries(board)
      .filter(([tileKey, piece]) => {
        if (Number(tileKey) === flagTileIndex) return false;
        return piece.side === "player";
      })
      .map(([tileKey]) => Number(tileKey));
  };

  // ── Cooldown queries ──────────────────────────────────────────────────────────
  /** True when the player ability is still cooling down */
  const isPlayerOnCooldown = (): boolean => {
    if (playerCooldownUntil === null) return false;
    return Date.now() < playerCooldownUntil;
  };

  /** True when the AI ability is still cooling down */
  const isAIOnCooldown = (): boolean => {
    if (aiCooldownUntil === null) return false;
    return Date.now() < aiCooldownUntil;
  };

  // ── Activate / deactivate ────────────────────────────────────────────────────
  /** Only activates if the player is not on cooldown */
  const activateFlagSwap = () => {
    if (isPlayerOnCooldown()) return;
    setFlagSwapActive(true);
  };

  const cancelFlagSwap = () => {
    setFlagSwapActive(false);
    setPendingFlagSwap(null);
  };

  // ── Start cooldown ────────────────────────────────────────────────────────────
  /** Call this immediately after the player's swap resolves */
  const startPlayerCooldown = () => {
    setPlayerCooldownUntil(Date.now() + FLAG_SWAP_COOLDOWN_MS);
  };

  /** Call this immediately after the AI's swap resolves */
  const startAICooldown = () => {
    setAICooldownUntil(Date.now() + FLAG_SWAP_COOLDOWN_MS);
  };

  // ── Apply swap ───────────────────────────────────────────────────────────────
  /**
   * Swaps the Flag and the chosen ally in the board snapshot.
   * Returns a new board — does NOT mutate the original.
   */
  const applyFlagSwap = (
    board: Record<number, BoardPiece>,
    flagTileIndex: number,
    allyTileIndex: number,
  ): Record<number, BoardPiece> => {
    const flagPiece = board[flagTileIndex];
    const allyPiece = board[allyTileIndex];
    if (!flagPiece || !allyPiece) return board;
    return {
      ...board,
      [allyTileIndex]: { ...flagPiece },
      [flagTileIndex]: { ...allyPiece },
    };
  };

  const resetFlagSwap = () => {
    setFlagSwapActive(false);
    setPendingFlagSwap(null);
    setPlayerCooldownUntil(null);
    setAICooldownUntil(null);
  };

  return {
    flagSwapActive,
    pendingFlagSwap,
    setPendingFlagSwap,
    // cooldown state
    playerCooldownUntil,
    aiCooldownUntil,
    isPlayerOnCooldown,
    isAIOnCooldown,
    startPlayerCooldown,
    startAICooldown,
    // actions
    activateFlagSwap,
    cancelFlagSwap,
    applyFlagSwap,
    getAllySwapTiles,
    isFlagPiece,
    resetFlagSwap,
  };
}
