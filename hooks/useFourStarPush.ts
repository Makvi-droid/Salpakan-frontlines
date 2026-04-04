import { useState } from "react";
import type { BoardPiece, PieceDefinition } from "../scripts/types";

/** 5-minute wall-clock cooldown in milliseconds — same as Flag Swap */
export const FOUR_STAR_PUSH_COOLDOWN_MS = 5 * 60 * 1000;

interface UseFourStarPushOptions {
  pieceById: Record<string, PieceDefinition>;
}

export function useFourStarPush({ pieceById }: UseFourStarPushOptions) {
  // ── State ────────────────────────────────────────────────────────────────────
  /**
   * True while the player has pressed the Push button and is picking an
   * adjacent enemy tile to push away.
   */
  const [fourStarPushActive, setFourStarPushActive] = useState(false);

  /**
   * The tile index of the 4-Star General when the ability was activated.
   * Latched at activation time so we don't lose track of the General's
   * position if selectedBattleTileIndex changes or clears mid-flow.
   */
  const [generalTileIndex, setGeneralTileIndex] = useState<number | null>(null);

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

  /** True if a board piece is the player's 4-Star General */
  const isPlayerFourStarGeneral = (piece: BoardPiece): boolean =>
    piece.side === "player" &&
    pieceById[piece.pieceId]?.label === "4 Star\nGeneral";

  /** True if a board piece is the AI's 4-Star General */
  const isAIFourStarGeneral = (piece: BoardPiece): boolean =>
    piece.side === "ai" &&
    pieceById[piece.pieceId]?.label === "4 Star\nGeneral";

  // ── Cooldown queries ──────────────────────────────────────────────────────────

  const isPlayerOnCooldown = (): boolean => {
    if (playerCooldownUntil === null) return false;
    return Date.now() < playerCooldownUntil;
  };

  const isAIOnCooldown = (): boolean => {
    if (aiCooldownUntil === null) return false;
    return Date.now() < aiCooldownUntil;
  };

  // ── Activate / deactivate ────────────────────────────────────────────────────

  /**
   * Activates the push ability and latches the General's current tile index
   * so the flow stays intact even if selectedBattleTileIndex changes.
   * Only activates if the player is not on cooldown.
   */
  const activateFourStarPush = (tileIndex: number) => {
    if (isPlayerOnCooldown()) return;
    setGeneralTileIndex(tileIndex);
    setFourStarPushActive(true);
  };

  const cancelFourStarPush = () => {
    setFourStarPushActive(false);
    setGeneralTileIndex(null);
  };

  // ── Start cooldown ────────────────────────────────────────────────────────────

  /** Call this immediately after the player's push resolves */
  const startPlayerCooldown = () => {
    setPlayerCooldownUntil(Date.now() + FOUR_STAR_PUSH_COOLDOWN_MS);
  };

  /** Call this immediately after the AI's push resolves */
  const startAICooldown = () => {
    setAICooldownUntil(Date.now() + FOUR_STAR_PUSH_COOLDOWN_MS);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const resetFourStarPush = () => {
    setFourStarPushActive(false);
    setGeneralTileIndex(null);
    setPlayerCooldownUntil(null);
    setAICooldownUntil(null);
  };

  return {
    fourStarPushActive,
    // latched general tile (set at activation, cleared on cancel/reset)
    generalTileIndex,
    // cooldown state
    playerCooldownUntil,
    aiCooldownUntil,
    isPlayerOnCooldown,
    isAIOnCooldown,
    startPlayerCooldown,
    startAICooldown,
    // actions
    activateFourStarPush,
    cancelFourStarPush,
    resetFourStarPush,
    // piece identification
    isPlayerFourStarGeneral,
    isAIFourStarGeneral,
  };
}
