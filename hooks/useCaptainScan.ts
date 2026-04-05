import { useCallback, useRef, useState } from "react";
import {
  getTileColumn,
  getTileRow,
  isInsideBoard,
  getTileIndex,
} from "../scripts/gameLogic";
import type { BoardPiece, PieceDefinition } from "../scripts/types";

/** 5-minute wall-clock cooldown in milliseconds — same as all other abilities */
export const CAPTAIN_SCAN_COOLDOWN_MS = 5 * 60 * 1000;

/** How long the revealed pieces stay lit up (ms) — same as Spy / Colonel */
export const CAPTAIN_SCAN_DURATION_MS = 1500;

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * One entry in the Captain scan result — one revealed enemy tile.
 *
 * - `tileIndex`  — which enemy tile is highlighted on the board
 * - `shortLabel` — the true rank label to display in the overlay
 */
export interface CaptainScanEntry {
  tileIndex: number;
  shortLabel: string;
}

/**
 * Full result returned while the scan overlay is live.
 * An array because the Captain can reveal up to 4 tiles simultaneously.
 */
export type CaptainScanResult = CaptainScanEntry[] | null;

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseCaptainScanOptions {
  pieceById: Record<string, PieceDefinition>;
}

export function useCaptainScan({ pieceById }: UseCaptainScanOptions) {
  // ── State ─────────────────────────────────────────────────────────────────────

  /**
   * The active scan payload shown to the player.
   * null when no scan is in progress.
   */
  const [captainScan, setCaptainScan] = useState<CaptainScanResult>(null);

  /** Wall-clock timestamp after which the player may use the ability again */
  const [playerCooldownUntil, setPlayerCooldownUntil] = useState<number | null>(
    null,
  );

  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Piece helpers ─────────────────────────────────────────────────────────────

  /**
   * Returns true when the given BoardPiece is the player's Captain.
   * The label used in constants is "Cpt".
   */
  const isPlayerCaptainPiece = useCallback(
    (piece: BoardPiece): boolean =>
      piece.side === "player" && pieceById[piece.pieceId]?.label === "Cpt",
    [pieceById],
  );

  // ── Cooldown queries ──────────────────────────────────────────────────────────

  const isPlayerOnCooldown = useCallback(
    (): boolean =>
      playerCooldownUntil !== null && Date.now() < playerCooldownUntil,
    [playerCooldownUntil],
  );

  // ── Cooldown starter ──────────────────────────────────────────────────────────

  const startPlayerCooldown = useCallback(() => {
    setPlayerCooldownUntil(Date.now() + CAPTAIN_SCAN_COOLDOWN_MS);
  }, []);

  // ── Apply scan — called immediately when the player presses the button ────────

  /**
   * Immediately scans the 4 orthogonally adjacent tiles of the Captain's
   * current position, reveals any enemy pieces found, and starts the
   * auto-clear timer and the cooldown.
   *
   * Unlike the Colonel ability this is NOT a two-step mode — pressing the
   * button fires the scan right away with no tile-selection step required.
   *
   * Returns the list of revealed entries (may be empty if no adjacent enemies).
   */
  const applyCaptainScan = useCallback(
    (
      board: Record<number, BoardPiece>,
      captainTileIndex: number,
    ): CaptainScanEntry[] => {
      const fromRow = getTileRow(captainTileIndex);
      const fromCol = getTileColumn(captainTileIndex);

      const ORTHOGONAL = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ] as const;

      const entries: CaptainScanEntry[] = [];

      ORTHOGONAL.forEach((dir) => {
        const r = fromRow + dir.y;
        const c = fromCol + dir.x;
        if (!isInsideBoard(r, c)) return;
        const ti = getTileIndex(r, c);
        const occupant = board[ti];
        if (occupant?.side === "ai") {
          const shortLabel = pieceById[occupant.pieceId]?.shortLabel ?? "?";
          entries.push({ tileIndex: ti, shortLabel });
        }
      });

      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);

      // Show overlay (even if empty — caller can decide what to display)
      setCaptainScan(entries.length > 0 ? entries : []);
      startPlayerCooldown();

      scanTimerRef.current = setTimeout(() => {
        setCaptainScan(null);
        scanTimerRef.current = null;
      }, CAPTAIN_SCAN_DURATION_MS);

      return entries;
    },
    [pieceById, startPlayerCooldown],
  );

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const resetCaptainScan = useCallback(() => {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    setCaptainScan(null);
    setPlayerCooldownUntil(null);
  }, []);

  return {
    // state
    captainScan,          // CaptainScanResult — drives board overlays
    playerCooldownUntil,  // number | null — feeds AbilityPanel button
    // queries
    isPlayerOnCooldown,
    isPlayerCaptainPiece,
    // actions
    applyCaptainScan,
    resetCaptainScan,
    startPlayerCooldown,
  };
}
