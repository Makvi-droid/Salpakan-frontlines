import { useCallback, useRef, useState } from "react";
import type { BoardPiece, PieceDefinition } from "../scripts/types";

/** 5-minute wall-clock cooldown in milliseconds — same as Flag ability */
export const SPY_REVEAL_COOLDOWN_MS = 5 * 60 * 1000;

/** How long the revealed piece stays lit up (ms) */
export const SPY_REVEAL_DURATION_MS = 1500;

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * What the player actually sees during a Spy reveal.
 *
 * - `tileIndex`   — which enemy tile is highlighted on the board
 * - `shortLabel`  — label to display (true rank OR a double-blind fake)
 * - `isFaked`     — true when double-blind substituted a decoy label.
 *                   BoardGrid can use this for a subtle shimmer/style without
 *                   explicitly telling the player it's fake (that ruins it).
 */
export interface SpyRevealResult {
  tileIndex: number;
  shortLabel: string;
  isFaked: boolean;
}

interface UseSpyRevealOptions {
  pieceById: Record<string, PieceDefinition>;
}

export function useSpyReveal({ pieceById }: UseSpyRevealOptions) {
  // ── State ────────────────────────────────────────────────────────────────────

  /**
   * The active reveal payload shown to the player.
   * null when no reveal is in progress.
   */
  const [spyReveal, setSpyReveal] = useState<SpyRevealResult | null>(null);

  /**
   * Set to true for ~2.5 s when the AI uses its Spy ability.
   * The visible notification says only "Enemy command activated a special
   * ability" — nothing about which ability or which piece was peeked.
   */
  const [aiSpyRevealNotifVisible, setAiSpyRevealNotifVisible] =
    useState(false);

  /** Wall-clock timestamp after which the PLAYER may use the ability again */
  const [playerCooldownUntil, setPlayerCooldownUntil] = useState<number | null>(
    null,
  );

  /** Wall-clock timestamp after which the AI may use the ability again */
  const [aiCooldownUntil, setAICooldownUntil] = useState<number | null>(null);

  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiNotifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Piece helpers ─────────────────────────────────────────────────────────────

  const isPlayerSpyPiece = useCallback(
    (piece: BoardPiece): boolean =>
      piece.side === "player" && pieceById[piece.pieceId]?.label === "Spy",
    [pieceById],
  );

  const isAISpyPiece = useCallback(
    (piece: BoardPiece): boolean =>
      piece.side === "ai" && pieceById[piece.pieceId]?.label === "Spy",
    [pieceById],
  );

  // ── Cooldown queries ──────────────────────────────────────────────────────────

  const isPlayerOnCooldown = useCallback(
    (): boolean =>
      playerCooldownUntil !== null && Date.now() < playerCooldownUntil,
    [playerCooldownUntil],
  );

  const isAIOnCooldown = useCallback(
    (): boolean => aiCooldownUntil !== null && Date.now() < aiCooldownUntil,
    [aiCooldownUntil],
  );

  // ── Cooldown starters ─────────────────────────────────────────────────────────

  const startPlayerCooldown = useCallback(() => {
    setPlayerCooldownUntil(Date.now() + SPY_REVEAL_COOLDOWN_MS);
  }, []);

  const startAICooldown = useCallback(() => {
    setAICooldownUntil(Date.now() + SPY_REVEAL_COOLDOWN_MS);
  }, []);

  // ── Double-blind fake label ───────────────────────────────────────────────────

  /**
   * Returns a random shortLabel that is NOT the piece's real label.
   * Mirrors the existing getRandomDecoyShortLabel logic in useGameState but
   * kept self-contained so this hook has no external dependencies.
   */
  const getFakeLabel = useCallback(
    (realPieceId: string): string => {
      const realLabel = pieceById[realPieceId]?.shortLabel;
      const pool = Object.values(pieceById)
        .map((def) => def.shortLabel)
        .filter((label) => label !== realLabel);

      if (pool.length === 0) return realLabel ?? "?";
      return pool[Math.floor(Math.random() * pool.length)];
    },
    [pieceById],
  );

  // ── Core: pick a random enemy tile and build the reveal payload ───────────────

  /**
   * Picks a random enemy tile and returns the SpyRevealResult the player sees.
   *
   * Double-blind rule (per game design decision):
   *   If the chosen enemy piece has the double-blind upgrade with charges
   *   remaining, the displayed shortLabel is a random FAKE — not the true rank.
   *   `isFaked` is set so BoardGrid can apply an optional subtle visual cue
   *   (e.g. slight shimmer) without explicitly warning the player it's a decoy.
   *
   * All enemy tiles are eligible — no tile is skipped or blacklisted.
   */
  const buildRevealResult = useCallback(
    (
      board: Record<number, BoardPiece>,
      revealerSide: "player" | "ai",
    ): SpyRevealResult | null => {
      const enemySide = revealerSide === "player" ? "ai" : "player";

      const enemyTiles = Object.entries(board)
        .filter(([, p]) => p.side === enemySide)
        .map(([k]) => Number(k));

      if (enemyTiles.length === 0) return null;

      const tileIndex =
        enemyTiles[Math.floor(Math.random() * enemyTiles.length)];
      const piece = board[tileIndex];

      // Double-blind: does this piece have active charges?
      const hasDoubleBlind =
        piece.upgrade === "double-blind" &&
        // backward-compat: upgradeCharges undefined = treat as charged
        (piece.upgradeCharges === undefined
          ? true
          : piece.upgradeCharges > 0);

      if (hasDoubleBlind) {
        return {
          tileIndex,
          shortLabel: getFakeLabel(piece.pieceId),
          isFaked: true,   // BoardGrid can add a shimmer; don't tell the player
        };
      }

      return {
        tileIndex,
        shortLabel: pieceById[piece.pieceId]?.shortLabel ?? "?",
        isFaked: false,
      };
    },
    [pieceById, getFakeLabel],
  );

  // ── Player uses the ability ───────────────────────────────────────────────────

  /**
   * Call this when the player presses the Spy ability button.
   * Immediately resolves to a reveal payload, auto-clears after
   * SPY_REVEAL_DURATION_MS, and starts the 5-min cooldown.
   */
  const activateSpyReveal = useCallback(
    (board: Record<number, BoardPiece>) => {
      if (isPlayerOnCooldown()) return;

      const result = buildRevealResult(board, "player");
      if (!result) return;

      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);

      setSpyReveal(result);
      startPlayerCooldown();

      revealTimerRef.current = setTimeout(() => {
        setSpyReveal(null);
        revealTimerRef.current = null;
      }, SPY_REVEAL_DURATION_MS);
    },
    [isPlayerOnCooldown, buildRevealResult, startPlayerCooldown],
  );

  // ── AI uses the ability ───────────────────────────────────────────────────────

  /**
   * Called by useAITurn before each AI move.
   * Returns true when the ability fired this turn.
   *
   * The AI still makes its normal move on the same turn — the reveal is
   * purely informational for the AI's future decision-making (the existing
   * revealedToAI flag system handles that; this hook just fires the notif).
   *
   * Trigger condition: AI Spy is alive AND cooldown has expired.
   */
  const tryAISpyReveal = useCallback(
    (board: Record<number, BoardPiece>): boolean => {
      if (isAIOnCooldown()) return false;

      const aiSpyAlive = Object.values(board).some(isAISpyPiece);
      if (!aiSpyAlive) return false;

      const hasPlayerPieces = Object.values(board).some(
        (p) => p.side === "player",
      );
      if (!hasPlayerPieces) return false;

      startAICooldown();

      // Show the vague "enemy used an ability" banner for 2.5 s
      if (aiNotifTimerRef.current) clearTimeout(aiNotifTimerRef.current);
      setAiSpyRevealNotifVisible(true);
      aiNotifTimerRef.current = setTimeout(() => {
        setAiSpyRevealNotifVisible(false);
        aiNotifTimerRef.current = null;
      }, 2500);

      return true;
    },
    [isAIOnCooldown, isAISpyPiece, startAICooldown],
  );

  // ── Reset ────────────────────────────────────────────────────────────────────

  const resetSpyReveal = useCallback(() => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    if (aiNotifTimerRef.current) {
      clearTimeout(aiNotifTimerRef.current);
      aiNotifTimerRef.current = null;
    }
    setSpyReveal(null);
    setAiSpyRevealNotifVisible(false);
    setPlayerCooldownUntil(null);
    setAICooldownUntil(null);
  }, []);

  return {
    // state
    spyReveal,               // SpyRevealResult | null  ← replaces old spyRevealedTile
    aiSpyRevealNotifVisible,
    playerCooldownUntil,
    aiCooldownUntil,
    // queries
    isPlayerOnCooldown,
    isAIOnCooldown,
    isPlayerSpyPiece,
    isAISpyPiece,
    // actions
    activateSpyReveal,
    tryAISpyReveal,
    startPlayerCooldown,
    startAICooldown,
    resetSpyReveal,
  };
}
