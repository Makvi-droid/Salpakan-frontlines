import { useCallback, useRef, useState } from "react";
import type { BoardPiece, PieceDefinition, Side } from "../scripts/types";

/**
 * useTwoStarGeneral
 *
 * Ability: "Hold the Line"
 *  - Player selects the 2-Star General, activates the ability, then taps
 *    ANY enemy (AI) piece on the board.
 *  - That piece cannot move BACKWARD for 2 full rounds (1 full round =
 *    1 player turn + 1 AI turn).
 *  - "Backward" means toward the restricted piece's own back rows:
 *      - For an AI piece   → moving to a tile with a HIGHER row index
 *      - For a player piece → moving to a tile with a LOWER  row index
 *  - The restriction carries over through challenges (win/draw/lose).
 *    If the piece is captured, the restriction is silently removed since
 *    the piece no longer exists on the board.
 *  - The AI can also use this ability (targets a random player piece).
 *  - Cooldown: 5 minutes (300 000 ms) per side after use.
 *  - Cancellable: pressing the button again (or tapping a non-enemy tile)
 *    cancels without consuming the cooldown.
 *
 * Restriction data structure:
 *   A Map<number, number> keyed by tile index → remaining half-turns.
 *   Each full round = 2 decrements (once after the player's move resolves,
 *   once after the AI's move resolves). Starting value = 4 half-turns
 *   (2 full rounds × 2 half-turns).
 *
 * We intentionally do NOT embed the restriction on BoardPiece to avoid
 * mutating game state just for a UI/logic side-effect — same pattern as
 * useLtColonelStun's stunnedTilesRef.
 */

const HOLD_COOLDOWN_MS = 5 * 60 * 1_000; // 5 minutes
/** 2 full rounds = 4 half-turns (player + AI = 1 round) */
const HOLD_INITIAL_HALF_TURNS = 4;

/** A single restriction entry: which tile is restricted and how many
 *  half-turns remain. */
export type HoldRestriction = {
  tileIndex: number;
  halfTurnsLeft: number;
};

export type TwoStarGeneralHook = ReturnType<typeof useTwoStarGeneral>;

export function useTwoStarGeneral({
  pieceById,
}: {
  pieceById: Record<string, PieceDefinition>;
}) {
  // ── Ability active flag ───────────────────────────────────────────────────
  const [twoStarActive, setTwoStarActive] = useState(false);

  // ── Cooldown timestamps ───────────────────────────────────────────────────
  const [playerCooldownUntil, setPlayerCooldownUntil] = useState<number | null>(
    null,
  );
  const [aiCooldownUntil, setAiCooldownUntil] = useState<number | null>(null);

  /**
   * Map of tileIndex → halfTurnsLeft.
   * Ref is the source of truth (no render cost on every AI tick).
   * State mirror drives re-renders for board highlights / move filtering.
   */
  const restrictionsRef = useRef<Map<number, number>>(new Map());
  const [restrictions, setRestrictions] = useState<Map<number, number>>(
    new Map(),
  );

  // ── Internal sync helper ──────────────────────────────────────────────────
  const syncState = useCallback(() => {
    setRestrictions(new Map(restrictionsRef.current));
  }, []);

  // ── Piece-type helpers ────────────────────────────────────────────────────

  /** True when the given piece is the player's 2-Star General. */
  const isPlayerTwoStarGeneral = useCallback(
    (piece: BoardPiece): boolean => {
      if (piece.side !== "player") return false;
      return pieceById[piece.pieceId]?.label === "2 Star\nGeneral";
    },
    [pieceById],
  );

  /** True when the given piece is the AI's 2-Star General. */
  const isAITwoStarGeneral = useCallback(
    (piece: BoardPiece): boolean => {
      if (piece.side !== "ai") return false;
      return pieceById[piece.pieceId]?.label === "2 Star\nGeneral";
    },
    [pieceById],
  );

  // ── Restriction queries ───────────────────────────────────────────────────

  /**
   * Returns true when the piece at `tileIndex` is currently restricted
   * from moving backward.
   */
  const isTileRestricted = useCallback((tileIndex: number): boolean => {
    return (restrictionsRef.current.get(tileIndex) ?? 0) > 0;
  }, []);

  /**
   * Returns all currently restricted tile indices (for board highlighting).
   */
  const getRestrictedTileIndices = useCallback((): number[] => {
    return Array.from(restrictionsRef.current.entries())
      .filter(([, v]) => v > 0)
      .map(([k]) => k);
  }, []);

  /**
   * Returns true when a move is illegal because of a "Hold the Line"
   * restriction.
   *
   * Rules:
   *  - AI piece   restricted → cannot move to a tile with HIGHER row index
   *    (higher row = further from player side = backward for AI).
   *  - Player piece restricted → cannot move to a tile with LOWER row index
   *    (lower row = further from AI side = backward for player).
   *
   * Board geometry: row = Math.floor(tileIndex / BOARD_WIDTH), BOARD_WIDTH = 9.
   */
  const isBackwardMoveBlocked = useCallback(
    (from: number, to: number, side: Side): boolean => {
      if (!isTileRestricted(from)) return false;
      const BOARD_WIDTH = 9;
      const fromRow = Math.floor(from / BOARD_WIDTH);
      const toRow = Math.floor(to / BOARD_WIDTH);
      if (side === "ai") {
        // AI's "backward" = increasing row index (moving away from player rows)
        return toRow > fromRow;
      } else {
        // Player's "backward" = decreasing row index (moving away from AI rows)
        return toRow < fromRow;
      }
    },
    [isTileRestricted],
  );

  // ── Ability lifecycle ─────────────────────────────────────────────────────

  const activateTwoStarAbility = useCallback(() => {
    setTwoStarActive(true);
  }, []);

  const cancelTwoStarAbility = useCallback(() => {
    setTwoStarActive(false);
  }, []);

  /**
   * Apply the restriction to the tapped enemy tile.
   * Called when the player taps a valid enemy tile while the ability is armed.
   */
  const applyHoldRestriction = useCallback(
    (targetTileIndex: number): void => {
      restrictionsRef.current.set(targetTileIndex, HOLD_INITIAL_HALF_TURNS);
      syncState();
      setTwoStarActive(false);
    },
    [syncState],
  );

  /**
   * Called by AI logic to apply the restriction to a random player tile.
   */
  const applyAIHoldRestriction = useCallback(
    (targetTileIndex: number): void => {
      restrictionsRef.current.set(targetTileIndex, HOLD_INITIAL_HALF_TURNS);
      syncState();
    },
    [syncState],
  );

  /**
   * Called after EACH half-turn resolves (once after player move, once after
   * AI move) to decrement all active restriction counters and prune expired
   * ones.
   *
   * Also handles piece movement: if a restricted piece moved to a new tile
   * (via a normal move OR a swap/push ability), we migrate the restriction to
   * the new tile. The caller passes the optional from→to movement so we can
   * do this automatically.
   */
  const decrementRestrictions = useCallback(
    (movedFrom?: number, movedTo?: number): void => {
      const next = new Map<number, number>();

      restrictionsRef.current.forEach((halfTurns, tileIndex) => {
        // Migrate if the restricted piece moved
        const effectiveTile =
          movedFrom !== undefined &&
          movedTo !== undefined &&
          tileIndex === movedFrom
            ? movedTo
            : tileIndex;

        const remaining = halfTurns - 1;
        if (remaining > 0) {
          next.set(effectiveTile, remaining);
        }
        // remaining <= 0 → restriction expired, drop it
      });

      restrictionsRef.current = next;
      syncState();
    },
    [syncState],
  );

  /**
   * Called when a restricted piece is captured (removed from board) so we
   * can clean up its entry.
   */
  const removeRestrictionForTile = useCallback(
    (tileIndex: number): void => {
      if (restrictionsRef.current.has(tileIndex)) {
        restrictionsRef.current.delete(tileIndex);
        syncState();
      }
    },
    [syncState],
  );

  // ── Cooldown helpers ──────────────────────────────────────────────────────

  const startPlayerCooldown = useCallback(() => {
    setPlayerCooldownUntil(Date.now() + HOLD_COOLDOWN_MS);
  }, []);

  const startAICooldown = useCallback(() => {
    setAiCooldownUntil(Date.now() + HOLD_COOLDOWN_MS);
  }, []);

  const isPlayerOnCooldown = useCallback((): boolean => {
    if (playerCooldownUntil === null) return false;
    return Date.now() < playerCooldownUntil;
  }, [playerCooldownUntil]);

  const isAIOnCooldown = useCallback((): boolean => {
    if (aiCooldownUntil === null) return false;
    return Date.now() < aiCooldownUntil;
  }, [aiCooldownUntil]);

  // ── Reset (called on retry / forfeit / new battle) ────────────────────────
  const resetTwoStarGeneral = useCallback(() => {
    setTwoStarActive(false);
    setPlayerCooldownUntil(null);
    setAiCooldownUntil(null);
    restrictionsRef.current = new Map();
    setRestrictions(new Map());
  }, []);

  return {
    // state
    twoStarActive,
    playerCooldownUntil,
    aiCooldownUntil,
    restrictions, // Map<tileIndex, halfTurnsLeft> — drives UI
    // piece helpers
    isPlayerTwoStarGeneral,
    isAITwoStarGeneral,
    // restriction queries
    isTileRestricted,
    getRestrictedTileIndices,
    isBackwardMoveBlocked,
    // ability lifecycle
    activateTwoStarAbility,
    cancelTwoStarAbility,
    applyHoldRestriction,
    applyAIHoldRestriction,
    decrementRestrictions,
    removeRestrictionForTile,
    // cooldown
    startPlayerCooldown,
    startAICooldown,
    isPlayerOnCooldown,
    isAIOnCooldown,
    resetTwoStarGeneral,
  };
}
