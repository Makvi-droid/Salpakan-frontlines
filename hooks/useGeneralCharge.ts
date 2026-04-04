import { useState } from "react";
import type { BoardPiece, PieceDefinition } from "../scripts/types";

/** 5-minute wall-clock cooldown in milliseconds — same as Flag Swap */
export const GENERAL_CHARGE_COOLDOWN_MS = 5 * 60 * 1000;

interface UseGeneralChargeOptions {
  pieceById: Record<string, PieceDefinition>;
}

export function useGeneralCharge({ pieceById }: UseGeneralChargeOptions) {
  // ── State ────────────────────────────────────────────────────────────────────
  /**
   * True while the player has pressed the Charge button and is picking a
   * destination tile from the highlighted 2-space move set.
   */
  const [generalChargeActive, setGeneralChargeActive] = useState(false);

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

  /** True if a board piece is the player's 5-Star General */
  const isPlayerFiveStarGeneral = (piece: BoardPiece): boolean =>
    piece.side === "player" &&
    pieceById[piece.pieceId]?.label === "5 Star\nGeneral";

  /** True if a board piece is the AI's 5-Star General */
  const isAIFiveStarGeneral = (piece: BoardPiece): boolean =>
    piece.side === "ai" &&
    pieceById[piece.pieceId]?.label === "5 Star\nGeneral";

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

  /** Only activates if the player is not on cooldown */
  const activateGeneralCharge = () => {
    if (isPlayerOnCooldown()) return;
    setGeneralChargeActive(true);
  };

  const cancelGeneralCharge = () => {
    setGeneralChargeActive(false);
  };

  // ── Start cooldown ────────────────────────────────────────────────────────────

  /** Call this immediately after the player's charge move resolves */
  const startPlayerCooldown = () => {
    setPlayerCooldownUntil(Date.now() + GENERAL_CHARGE_COOLDOWN_MS);
  };

  /** Call this immediately after the AI's charge move resolves */
  const startAICooldown = () => {
    setAICooldownUntil(Date.now() + GENERAL_CHARGE_COOLDOWN_MS);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const resetGeneralCharge = () => {
    setGeneralChargeActive(false);
    setPlayerCooldownUntil(null);
    setAICooldownUntil(null);
  };

  return {
    generalChargeActive,
    // cooldown state
    playerCooldownUntil,
    aiCooldownUntil,
    isPlayerOnCooldown,
    isAIOnCooldown,
    startPlayerCooldown,
    startAICooldown,
    // actions
    activateGeneralCharge,
    cancelGeneralCharge,
    resetGeneralCharge,
    // piece identification
    isPlayerFiveStarGeneral,
    isAIFiveStarGeneral,
  };
}
