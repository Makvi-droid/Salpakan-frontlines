import { BOARD_WIDTH, ORTHOGONAL_DIRECTIONS } from "../constants/constants";
import {
  getLegalMoves,
  getPieceStrength,
  getTileColumn,
  getTileIndex,
  getTileRow,
  isInsideBoard,
  isMovablePiece,
  shuffleArray,
} from "./gameLogic";
import type {
  AIProfile,
  BattleMove,
  BoardPiece,
  PieceDefinition,
  Side,
} from "./types";

// ─── Threat / support estimation ─────────────────────────────────────────────

function getRemainingUnknownStrength(
  board: Record<number, BoardPiece>,
  opponent: Side,
  pieceById: Record<string, PieceDefinition>,
  viewer: Side,
) {
  const hiddenStrengths = Object.values(board)
    .filter(
      (p) =>
        p.side === opponent &&
        (viewer === "player" ? !p.revealedToPlayer : !p.revealedToAI),
    )
    .map((p) => getPieceStrength(p.pieceId, pieceById));
  if (hiddenStrengths.length === 0) return 4;
  return hiddenStrengths.reduce((s, v) => s + v, 0) / hiddenStrengths.length;
}

export function getAdjacentFriendlyCount(
  board: Record<number, BoardPiece>,
  tileIndex: number,
  side: Side,
) {
  const row = getTileRow(tileIndex);
  const col = getTileColumn(tileIndex);
  return ORTHOGONAL_DIRECTIONS.reduce((count, dir) => {
    const nr = row + dir.y;
    const nc = col + dir.x;
    if (!isInsideBoard(nr, nc)) return count;
    const piece = board[getTileIndex(nr, nc)];
    return piece?.side === side ? count + 1 : count;
  }, 0);
}

export function estimateThreatAtTile(
  board: Record<number, BoardPiece>,
  tileIndex: number,
  side: Side,
  pieceById: Record<string, PieceDefinition>,
  viewer: Side,
) {
  const opponent = side === "player" ? "ai" : "player";
  const avgUnknown = getRemainingUnknownStrength(
    board,
    opponent,
    pieceById,
    viewer,
  );
  const row = getTileRow(tileIndex);
  const col = getTileColumn(tileIndex);
  return ORTHOGONAL_DIRECTIONS.reduce((maxThreat, dir) => {
    const nr = row + dir.y;
    const nc = col + dir.x;
    if (!isInsideBoard(nr, nc)) return maxThreat;
    const enemy = board[getTileIndex(nr, nc)];
    if (
      !enemy ||
      enemy.side !== opponent ||
      !isMovablePiece(enemy.pieceId, pieceById)
    )
      return maxThreat;
    const knownStrength =
      viewer === "player"
        ? enemy.revealedToPlayer
          ? getPieceStrength(enemy.pieceId, pieceById)
          : avgUnknown
        : enemy.revealedToAI
          ? getPieceStrength(enemy.pieceId, pieceById)
          : avgUnknown;
    return Math.max(maxThreat, knownStrength);
  }, 0);
}

// ─── Move scoring ─────────────────────────────────────────────────────────────

export function scoreAIMove(
  board: Record<number, BoardPiece>,
  move: BattleMove,
  profile: AIProfile,
  pieceById: Record<string, PieceDefinition>,
  crateTileSet?: Set<number>,
) {
  const mover = board[move.from];
  if (!mover) return Number.NEGATIVE_INFINITY;

  const moverStrength = getPieceStrength(mover.pieceId, pieceById);
  const target = board[move.to];
  const targetRow = getTileRow(move.to);
  const centerDistance = Math.abs(getTileColumn(move.to) - 4);
  const advancement = targetRow - getTileRow(move.from);
  const support = getAdjacentFriendlyCount(board, move.to, "ai");
  const threat = estimateThreatAtTile(board, move.to, "ai", pieceById, "ai");
  const unknownPlayerStrength = getRemainingUnknownStrength(
    board,
    "player",
    pieceById,
    "ai",
  );

  let captureScore = 0;
  let revealScore = 0;
  let crateScore = 0;
  if (target?.side === "player") {
    const targetStrength = target.revealedToAI
      ? getPieceStrength(target.pieceId, pieceById)
      : unknownPlayerStrength;
    captureScore += targetStrength * profile.weights.capture;
    revealScore += target.revealedToAI ? 0 : profile.weights.reveal * 3;
    if (!target.revealedToAI && moverStrength <= 3) captureScore += 1.5;
  }

  // Crate pressure
  if (crateTileSet?.has(move.to)) {
    const hasUpgrade = mover.upgrade !== undefined;
    crateScore += hasUpgrade ? 4.5 : 8.5;
  }

  const vulnerabilityPenalty =
    Math.max(0, threat - moverStrength) * profile.weights.threat;
  const centerScore = (4 - centerDistance) * profile.weights.center;
  const advancementScore = advancement * profile.weights.advancement;
  const supportScore = support * profile.weights.support;

  return (
    captureScore +
    crateScore +
    revealScore +
    centerScore +
    advancementScore +
    supportScore -
    vulnerabilityPenalty
  );
}

/**
 * Choose the best legal move for the AI given its profile.
 *
 * RANDOMNESS OVERHAUL
 * -------------------
 * The old system scored all moves, sliced the top N%, then weighted by score
 * delta. This made hard AI feel very mechanical and medium AI quite predictable.
 *
 * New approach:
 *  1. Score all legal moves as before.
 *  2. Apply a per-move Gaussian-style jitter scaled by `profile.randomness`
 *     BEFORE ranking — this shuffles the apparent ranking without destroying
 *     the signal entirely. Hard AI gets tiny jitter; easy AI gets large jitter.
 *  3. Then do the usual topSlice / blunderFloor filter on the JITTERED scores.
 *  4. Final pick is a weighted sample from the shortlist, same as before.
 *
 * The key insight: injecting noise before ranking means every run produces a
 * genuinely different move priority order, not just a different sample from
 * the same fixed ranked list. This gives the AI organic variation while still
 * respecting difficulty.
 */
export function chooseMoveForProfile(
  board: Record<number, BoardPiece>,
  profile: AIProfile,
  pieceById: Record<string, PieceDefinition>,
  crateTiles: number[] = [],
  isTileStunned?: (tileIndex: number) => boolean,
  isBackwardMoveBlocked?: (from: number, to: number, side: Side) => boolean,
): BattleMove | null {
  const allLegalMoves = getLegalMoves(board, "ai", pieceById);

  // Filter stunned tiles
  let legalMoves = isTileStunned
    ? allLegalMoves.filter((m) => !isTileStunned(m.from))
    : allLegalMoves;

  // Filter Hold the Line backward restrictions
  if (isBackwardMoveBlocked) {
    legalMoves = legalMoves.filter(
      (m) => !isBackwardMoveBlocked(m.from, m.to, "ai"),
    );
  }

  if (legalMoves.length === 0) return null;
  const crateTileSet = new Set(crateTiles);

  // ── Step 1: Score all moves ─────────────────────────────────────────────
  const rawScored = legalMoves.map((move) => ({
    move,
    rawScore: scoreAIMove(board, move, profile, pieceById, crateTileSet),
  }));

  // ── Step 2: Add per-move jitter before ranking ──────────────────────────
  // Jitter magnitude = randomness * 8. At randomness=0.8 (easy) this is ±6.4,
  // at 0.38 (medium) it's ±3.0, at 0.12 (hard) it's ±1.0.
  // We use two random draws averaged (triangle distribution) so extreme values
  // are less likely — the AI doesn't fully throw games, it just varies.
  const jitterScale = profile.randomness * 8;
  const jittered = rawScored.map(({ move, rawScore }) => {
    const noise = (Math.random() + Math.random() - 1) * jitterScale;
    return { move, score: rawScore + noise };
  });

  // ── Step 3: Sort and slice ──────────────────────────────────────────────
  jittered.sort((a, b) => b.score - a.score);

  const bestScore = jittered[0]?.score ?? 0;
  const filtered = jittered.filter(
    (e) => e.score >= Math.max(profile.blunderFloor, bestScore - 6),
  );
  const sliceCount = Math.max(1, Math.ceil(filtered.length * profile.topSlice));
  const shortlist = filtered.slice(0, sliceCount);

  if (shortlist.length === 1) return shortlist[0].move;

  // ── Step 4: Weighted sample from shortlist ──────────────────────────────
  // Weight by score delta so the best candidates are still more likely, but
  // the jitter in step 2 already spread the field — so this step is just a
  // soft preference, not a hard gate.
  const last = shortlist[shortlist.length - 1].score;
  const weighted = shortlist.map((e) => ({
    ...e,
    weight: Math.max(0.2, (e.score - last + 1) * (1.15 - profile.randomness)),
  }));

  const total = weighted.reduce((s, e) => s + e.weight, 0);
  let pick = Math.random() * total;
  for (const entry of weighted) {
    pick -= entry.weight;
    if (pick <= 0) return entry.move;
  }
  return weighted[0].move;
}

// ─── Formation generation ─────────────────────────────────────────────────────

function getFormationPriority(
  pieceId: string,
  pieceById: Record<string, PieceDefinition>,
) {
  const label = pieceById[pieceId]?.label;
  if (label === "Flag") return 100;
  if (label === "Spy") return 80;
  return getPieceStrength(pieceId, pieceById) >= 10
    ? 90
    : getPieceStrength(pieceId, pieceById);
}

function scoreFormationTile(
  pieceId: string,
  tileIndex: number,
  difficulty: AIProfile["opening"],
  pieceById: Record<string, PieceDefinition>,
) {
  const row = getTileRow(tileIndex);
  const col = getTileColumn(tileIndex);
  const strength = getPieceStrength(pieceId, pieceById);
  const label = pieceById[pieceId]?.label;
  const centerDistance = Math.abs(col - 4);

  let score = 0;
  if (label === "Flag") {
    score += row === 0 ? 28 : 12;
    score += centerDistance <= 1 ? 14 : 4;
    return score;
  }
  if (label === "Spy") {
    score += row === 1 ? 14 : row === 2 ? 10 : 7;
    score += centerDistance <= 2 ? 6 : 2;
  } else if (strength >= 10) {
    score += row === 0 ? 18 : row === 1 ? 13 : 4;
    score += 8 - centerDistance;
  } else if (strength >= 6) {
    score += row === 1 ? 14 : row === 2 ? 12 : 8;
    score += 6 - centerDistance * 0.5;
  } else {
    score += row === 2 ? 16 : row === 1 ? 11 : 6;
    score += centerDistance >= 3 ? 4 : 2;
  }
  score +=
    difficulty === "easy"
      ? Math.random() * 12
      : difficulty === "medium"
        ? Math.random() * 6
        : Math.random() * 2.5;
  return score;
}

export function generateAIFormation(
  difficulty: AIProfile["opening"],
  pieceDefinitions: PieceDefinition[],
  pieceById: Record<string, PieceDefinition>,
): Record<number, string> {
  const setupTiles = Array.from({ length: BOARD_WIDTH * 3 }, (_, i) => i);
  const formation: Record<number, string> = {};

  if (difficulty === "easy") {
    const flag = pieceDefinitions.find((p) => p.label === "Flag");
    const others = shuffleArray(
      pieceDefinitions
        .flatMap((p) => Array.from({ length: p.initialCount }, () => p.id))
        .filter((id) => pieceById[id]?.label !== "Flag"),
    );
    const flagTile =
      shuffleArray([
        getTileIndex(0, 3),
        getTileIndex(0, 4),
        getTileIndex(0, 5),
      ])[0] ?? setupTiles[0];
    if (flag) formation[flagTile] = flag.id;
    const available = shuffleArray(setupTiles.filter((t) => t !== flagTile));
    others.forEach((id, i) => {
      if (available[i] !== undefined) formation[available[i]] = id;
    });
    return formation;
  }

  const pieceBag = pieceDefinitions
    .flatMap((p) => Array.from({ length: p.initialCount }, () => p.id))
    .sort(
      (a, b) =>
        getFormationPriority(b, pieceById) - getFormationPriority(a, pieceById),
    );
  let available = [...setupTiles];

  pieceBag.forEach((id) => {
    const ranked = available
      .map((ti) => ({
        ti,
        score: scoreFormationTile(id, ti, difficulty, pieceById),
      }))
      .sort((a, b) => b.score - a.score);
    const pool =
      difficulty === "hard" ? ranked.slice(0, 2) : ranked.slice(0, 4);
    const chosen =
      pool[Math.floor(Math.random() * pool.length)]?.ti ?? ranked[0]?.ti;
    if (chosen !== undefined) {
      formation[chosen] = id;
      available = available.filter((t) => t !== chosen);
    }
  });

  return formation;
}
