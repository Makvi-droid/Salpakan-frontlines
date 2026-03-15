import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ScreenShell from "@/components/ScreenShell";
import { appTheme } from "@/constants/theme";
import { clamp, useResponsiveTokens } from "@/hooks/useResponsiveTokens";

const BOARD_WIDTH = 9;
const BOARD_HEIGHT = 8;
const DOUBLE_TAP_MS = 300;
const AI_THINKING_DELAY_MS = 800;
const FIRST_COLUMN_LABELS = ["Flag", "Spy", "Private", "Sgt", "2nd Lt"] as const;
const SECOND_COLUMN_LABELS = ["1st Lt", "Cpt", "Major", "Lt Col", "Col"] as const;
const THIRD_COLUMN_LABELS = ["1 Star\nGeneral", "2 Star\nGeneral", "3 Star\nGeneral", "4 Star\nGeneral", "5 Star\nGeneral"] as const;
// These are the only directions pieces can move in.
// We reuse them in a few places so movement rules stay consistent.
const ORTHOGONAL_DIRECTIONS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
] as const;

type Difficulty = "easy" | "medium" | "hard";
type Side = "player" | "ai";
type Phase = "formation" | "battle" | "ended";

type PieceDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  initialCount: number;
};

type BoardPiece = {
  side: Side;
  pieceId: string;
  revealedToPlayer: boolean;
  revealedToAI: boolean;
};

type BattleMove = {
  side: Side;
  from: number;
  to: number;
};

type MoveScoreWeights = {
  capture: number;
  advancement: number;
  center: number;
  support: number;
  threat: number;
  reveal: number;
};

type AIProfile = {
  label: string;
  flavor: string;
  opening: "easy" | "medium" | "hard";
  randomness: number;
  topSlice: number;
  blunderFloor: number;
  weights: MoveScoreWeights;
};

type BattleResolution = {
  board: Record<number, BoardPiece>;
  winner: Side | null;
  message: string;
  revealMessage: string | null;
  capturedByPlayer: string[];
  capturedByAI: string[];
};

const SHORT_LABEL_BY_NAME: Record<string, string> = {
  Flag: "F",
  Spy: "Sp",
  Private: "Pvt",
  Sgt: "Sgt",
  "2nd Lt": "2Lt",
  "1st Lt": "1Lt",
  Cpt: "Cpt",
  Major: "Maj",
  "Lt Col": "LtC",
  Col: "Col",
  "1 Star\nGeneral": "1*",
  "2 Star\nGeneral": "2*",
  "3 Star\nGeneral": "3*",
  "4 Star\nGeneral": "4*",
  "5 Star\nGeneral": "5*",
};

const PIECE_STRENGTH_BY_LABEL: Record<string, number> = {
  Flag: 0,
  Spy: 1,
  Private: 2,
  Sgt: 3,
  "2nd Lt": 4,
  "1st Lt": 5,
  Cpt: 6,
  Major: 7,
  "Lt Col": 8,
  Col: 9,
  "1 Star\nGeneral": 10,
  "2 Star\nGeneral": 11,
  "3 Star\nGeneral": 12,
  "4 Star\nGeneral": 13,
  "5 Star\nGeneral": 14,
};

// This is where each difficulty level gets its personality.
// The match rules stay the same, but these values change how the enemy sets up and chooses moves.
const DIFFICULTY_PROFILES: Record<Difficulty, AIProfile> = {
  easy: {
    label: "Recruit",
    flavor: "Cautious but shaky. It will miss sharper lines and sometimes drift into loose positions.",
    opening: "easy",
    randomness: 0.8,
    topSlice: 0.8,
    blunderFloor: -11,
    weights: { capture: 0.9, advancement: 0.8, center: 0.4, support: 0.3, threat: 0.7, reveal: 0.15 },
  },
  medium: {
    label: "Vanguard",
    flavor: "Stable and practical. It protects its shape and usually finds useful pressure.",
    opening: "medium",
    randomness: 0.38,
    topSlice: 0.45,
    blunderFloor: -5,
    weights: { capture: 1.2, advancement: 1, center: 0.7, support: 0.75, threat: 1.05, reveal: 0.25 },
  },
  hard: {
    label: "Warlord",
    flavor: "Disciplined and forceful. It keeps strong layers, punishes soft moves, and converts pressure cleanly.",
    opening: "hard",
    randomness: 0.12,
    topSlice: 0.2,
    blunderFloor: -1,
    weights: { capture: 1.45, advancement: 1.1, center: 0.9, support: 0.95, threat: 1.25, reveal: 0.35 },
  },
};

function getPieceId(column: number, row: number, label: string) {
  return `${column}-${row}-${label.replace(/\n/g, " ").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

function getTileRow(tileIndex: number) {
  return Math.floor(tileIndex / BOARD_WIDTH);
}

function getTileColumn(tileIndex: number) {
  return tileIndex % BOARD_WIDTH;
}

function getTileIndex(row: number, column: number) {
  return row * BOARD_WIDTH + column;
}

function isInsideBoard(row: number, column: number) {
  return row >= 0 && row < BOARD_HEIGHT && column >= 0 && column < BOARD_WIDTH;
}

function isPlayerSetupZoneTileIndex(tileIndex: number) {
  return getTileRow(tileIndex) >= BOARD_HEIGHT - 3;
}

function shuffleArray<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[randomIndex];
    copy[randomIndex] = current;
  }
  return copy;
}

function getPieceStrength(pieceId: string, pieceById: Record<string, PieceDefinition>) {
  return PIECE_STRENGTH_BY_LABEL[pieceById[pieceId]?.label ?? "Flag"] ?? 0;
}

function isGeneralPiece(pieceId: string, pieceById: Record<string, PieceDefinition>) {
  return getPieceStrength(pieceId, pieceById) >= 10;
}

function isMovablePiece(pieceId: string, pieceById: Record<string, PieceDefinition>) {
  return pieceById[pieceId]?.label !== "Flag";
}

function formatPieceName(pieceId: string, pieceById: Record<string, PieceDefinition>) {
  return pieceById[pieceId]?.label.replace("\n", " ") ?? "Unknown";
}

function getVisibleLabel(piece: BoardPiece, pieceById: Record<string, PieceDefinition>, viewer: Side) {
  if (piece.side === viewer) {
    return pieceById[piece.pieceId]?.shortLabel ?? "?";
  }
  const isRevealed = viewer === "player" ? piece.revealedToPlayer : piece.revealedToAI;
  return isRevealed ? pieceById[piece.pieceId]?.shortLabel ?? "?" : "?";
}

function getLegalMoves(board: Record<number, BoardPiece>, side: Side, pieceById: Record<string, PieceDefinition>) {
  const moves: BattleMove[] = [];
  Object.entries(board).forEach(([key, piece]) => {
    if (piece.side !== side || !isMovablePiece(piece.pieceId, pieceById)) {
      return;
    }
    const from = Number(key);
    const row = getTileRow(from);
    const column = getTileColumn(from);
    ORTHOGONAL_DIRECTIONS.forEach((direction) => {
      const nextRow = row + direction.y;
      const nextColumn = column + direction.x;
      if (!isInsideBoard(nextRow, nextColumn)) {
        return;
      }
      const to = getTileIndex(nextRow, nextColumn);
      const target = board[to];
      if (target && target.side === side) {
        return;
      }
      moves.push({ side, from, to });
    });
  });
  return moves;
}

// When a piece is still hidden, we estimate its strength from the hidden ranks that are left.
// This gives the AI a fair guess without letting it "see" unrevealed pieces.
function getRemainingUnknownStrength(board: Record<number, BoardPiece>, opponent: Side, pieceById: Record<string, PieceDefinition>, viewer: Side) {
  const hiddenStrengths = Object.values(board)
    .filter((piece) => piece.side === opponent && (viewer === "player" ? !piece.revealedToPlayer : !piece.revealedToAI))
    .map((piece) => getPieceStrength(piece.pieceId, pieceById));

  if (hiddenStrengths.length === 0) {
    return 4;
  }

  return hiddenStrengths.reduce((sum, value) => sum + value, 0) / hiddenStrengths.length;
}

function compareCombat(attackerId: string, defenderId: string, pieceById: Record<string, PieceDefinition>) {
  const attackerStrength = getPieceStrength(attackerId, pieceById);
  const defenderStrength = getPieceStrength(defenderId, pieceById);
  if (pieceById[attackerId]?.label === "Spy" && isGeneralPiece(defenderId, pieceById)) {
    return 1;
  }
  if (pieceById[defenderId]?.label === "Spy" && isGeneralPiece(attackerId, pieceById)) {
    return -1;
  }
  if (attackerStrength === defenderStrength) {
    return 0;
  }
  return attackerStrength > defenderStrength ? 1 : -1;
}

// This is the main battle result function.
// Both the player and the enemy use this, so captures, reveals, and win checks all stay in one place.
function resolveBattleMove(
  board: Record<number, BoardPiece>,
  move: BattleMove,
  pieceById: Record<string, PieceDefinition>
): BattleResolution {
  const attacker = board[move.from];
  if (!attacker || attacker.side !== move.side) {
    return { board, winner: null, message: "No move executed.", revealMessage: null, capturedByPlayer: [], capturedByAI: [] };
  }

  const nextBoard = { ...board };
  const target = nextBoard[move.to];
  const actorLabel = move.side === "player" ? "You" : "Enemy";

  if (!target) {
    delete nextBoard[move.from];
    nextBoard[move.to] = { ...attacker };
    return {
      board: nextBoard,
      winner: null,
      message: `${actorLabel} advanced ${formatPieceName(attacker.pieceId, pieceById)}.`,
      revealMessage: null,
      capturedByPlayer: [],
      capturedByAI: [],
    };
  }

  const outcome = compareCombat(attacker.pieceId, target.pieceId, pieceById);
  const attackerName = formatPieceName(attacker.pieceId, pieceById);
  const defenderName = formatPieceName(target.pieceId, pieceById);
  const revealedAttacker: BoardPiece = { ...attacker, revealedToAI: true, revealedToPlayer: true };
  const revealedDefender: BoardPiece = { ...target, revealedToAI: true, revealedToPlayer: true };
  delete nextBoard[move.from];

  let winner: Side | null = null;
  let message = `${actorLabel} engaged ${defenderName}.`;
  const capturedByPlayer: string[] = [];
  const capturedByAI: string[] = [];

  if (outcome > 0) {
    nextBoard[move.to] = revealedAttacker;
    if (target.side === "player") {
      capturedByPlayer.push(target.pieceId);
    } else {
      capturedByAI.push(target.pieceId);
    }
    message = `${actorLabel} won the clash. ${attackerName} removed ${defenderName}.`;
    if (pieceById[target.pieceId]?.label === "Flag") {
      winner = move.side;
    }
  } else if (outcome < 0) {
    nextBoard[move.to] = revealedDefender;
    if (attacker.side === "player") {
      capturedByPlayer.push(attacker.pieceId);
    } else {
      capturedByAI.push(attacker.pieceId);
    }
    message = `${actorLabel} lost the clash. ${defenderName} held the line.`;
    if (pieceById[attacker.pieceId]?.label === "Flag") {
      winner = target.side;
    }
  } else {
    delete nextBoard[move.to];
    if (attacker.side === "player") {
      capturedByPlayer.push(attacker.pieceId);
    } else {
      capturedByAI.push(attacker.pieceId);
    }
    if (target.side === "player") {
      capturedByPlayer.push(target.pieceId);
    } else {
      capturedByAI.push(target.pieceId);
    }
    message = "Both ranks were eliminated in the clash.";
    if (pieceById[attacker.pieceId]?.label === "Flag") {
      winner = target.side;
    }
    if (pieceById[target.pieceId]?.label === "Flag") {
      winner = winner ?? attacker.side;
    }
  }

  return {
    board: nextBoard,
    winner,
    message,
    revealMessage: `${attackerName} met ${defenderName}. Both ranks are now known.`,
    capturedByPlayer,
    capturedByAI,
  };
}

function getAdjacentFriendlyCount(board: Record<number, BoardPiece>, tileIndex: number, side: Side) {
  const row = getTileRow(tileIndex);
  const column = getTileColumn(tileIndex);
  return ORTHOGONAL_DIRECTIONS.reduce((count, direction) => {
    const nextRow = row + direction.y;
    const nextColumn = column + direction.x;
    if (!isInsideBoard(nextRow, nextColumn)) {
      return count;
    }
    const piece = board[getTileIndex(nextRow, nextColumn)];
    return piece?.side === side ? count + 1 : count;
  }, 0);
}

// Here we check how dangerous a tile looks based on nearby enemy pieces.
// It helps the enemy avoid stepping into obviously bad positions.
function estimateThreatAtTile(
  board: Record<number, BoardPiece>,
  tileIndex: number,
  side: Side,
  pieceById: Record<string, PieceDefinition>,
  viewer: Side
) {
  const opponent = side === "player" ? "ai" : "player";
  const averageUnknown = getRemainingUnknownStrength(board, opponent, pieceById, viewer);
  const row = getTileRow(tileIndex);
  const column = getTileColumn(tileIndex);

  return ORTHOGONAL_DIRECTIONS.reduce((maxThreat, direction) => {
    const nextRow = row + direction.y;
    const nextColumn = column + direction.x;
    if (!isInsideBoard(nextRow, nextColumn)) {
      return maxThreat;
    }
    const enemy = board[getTileIndex(nextRow, nextColumn)];
    if (!enemy || enemy.side !== opponent || !isMovablePiece(enemy.pieceId, pieceById)) {
      return maxThreat;
    }
    const knownStrength =
      viewer === "player"
        ? enemy.revealedToPlayer
          ? getPieceStrength(enemy.pieceId, pieceById)
          : averageUnknown
        : enemy.revealedToAI
          ? getPieceStrength(enemy.pieceId, pieceById)
          : averageUnknown;
    return Math.max(maxThreat, knownStrength);
  }, 0);
}

// This scores each enemy move before one is picked.
// It mixes short-term value like captures with simple board-position ideas.
function scoreAIMove(board: Record<number, BoardPiece>, move: BattleMove, profile: AIProfile, pieceById: Record<string, PieceDefinition>) {
  const mover = board[move.from];
  if (!mover) {
    return Number.NEGATIVE_INFINITY;
  }

  const moverStrength = getPieceStrength(mover.pieceId, pieceById);
  const target = board[move.to];
  const targetRow = getTileRow(move.to);
  const centerDistance = Math.abs(getTileColumn(move.to) - 4);
  const advancement = targetRow - getTileRow(move.from);
  const support = getAdjacentFriendlyCount(board, move.to, "ai");
  const threat = estimateThreatAtTile(board, move.to, "ai", pieceById, "ai");
  const unknownPlayerStrength = getRemainingUnknownStrength(board, "player", pieceById, "ai");

  let captureScore = 0;
  let revealScore = 0;
  if (target?.side === "player") {
    const targetStrength = target.revealedToAI ? getPieceStrength(target.pieceId, pieceById) : unknownPlayerStrength;
    captureScore += targetStrength * profile.weights.capture;
    revealScore += target.revealedToAI ? 0 : profile.weights.reveal * 3;
    if (!target.revealedToAI && moverStrength <= 3) {
      captureScore += 1.5;
    }
  }

  const vulnerabilityPenalty = Math.max(0, threat - moverStrength) * profile.weights.threat;
  const centerScore = (4 - centerDistance) * profile.weights.center;
  const advancementScore = advancement * profile.weights.advancement;
  const supportScore = support * profile.weights.support;
  return captureScore + revealScore + centerScore + advancementScore + supportScore - vulnerabilityPenalty;
}

// The enemy does not always take the single top-scoring move.
// Instead, it picks from a small shortlist so easier levels feel less exact and harder levels feel more disciplined.
function chooseMoveForProfile(board: Record<number, BoardPiece>, profile: AIProfile, pieceById: Record<string, PieceDefinition>) {
  const legalMoves = getLegalMoves(board, "ai", pieceById);
  if (legalMoves.length === 0) {
    return null;
  }

  const scoredMoves = legalMoves
    .map((move) => ({ move, score: scoreAIMove(board, move, profile, pieceById) }))
    .sort((left, right) => right.score - left.score);

  const bestScore = scoredMoves[0]?.score ?? 0;
  const filteredMoves = scoredMoves.filter((entry) => entry.score >= Math.max(profile.blunderFloor, bestScore - 6));
  const sliceCount = Math.max(1, Math.ceil(filteredMoves.length * profile.topSlice));
  const shortlist = filteredMoves.slice(0, sliceCount);
  if (shortlist.length === 1) {
    return shortlist[0].move;
  }

  const weightedShortlist = shortlist.map((entry) => {
    const normalized = entry.score - shortlist[shortlist.length - 1].score + 1;
    return { ...entry, weight: Math.max(0.2, normalized * (1.15 - profile.randomness)) };
  });

  const totalWeight = weightedShortlist.reduce((sum, entry) => sum + entry.weight, 0);
  let selectionPoint = Math.random() * totalWeight;
  for (const entry of weightedShortlist) {
    selectionPoint -= entry.weight;
    if (selectionPoint <= 0) {
      return entry.move;
    }
  }
  return weightedShortlist[0].move;
}

// Important ranks are placed first during enemy setup.
// This gives them first pick of the better starting spots.
function getFormationPriority(pieceId: string, pieceById: Record<string, PieceDefinition>) {
  const label = pieceById[pieceId]?.label;
  if (label === "Flag") {
    return 100;
  }
  if (label === "Spy") {
    return 80;
  }
  return getPieceStrength(pieceId, pieceById) >= 10 ? 90 : getPieceStrength(pieceId, pieceById);
}

// This scores where a piece should start before the battle begins.
// Opening setup cares more about formation shape than immediate attacks.
function scoreFormationTile(pieceId: string, tileIndex: number, difficulty: AIProfile["opening"], pieceById: Record<string, PieceDefinition>) {
  const row = getTileRow(tileIndex);
  const column = getTileColumn(tileIndex);
  const strength = getPieceStrength(pieceId, pieceById);
  const label = pieceById[pieceId]?.label;
  const centerDistance = Math.abs(column - 4);

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

  score += difficulty === "easy" ? Math.random() * 12 : difficulty === "medium" ? Math.random() * 6 : Math.random() * 2.5;
  return score;
}

// This builds the enemy's starting formation.
// Easy is looser and more random, while medium and hard try to build a stronger opening shape.
function generateAIFormation(difficulty: AIProfile["opening"], pieceDefinitions: PieceDefinition[], pieceById: Record<string, PieceDefinition>) {
  const setupTiles = Array.from({ length: BOARD_WIDTH * 3 }, (_, index) => index);
  const formation: Record<number, string> = {};

  if (difficulty === "easy") {
    const flag = pieceDefinitions.find((piece) => piece.label === "Flag");
    const otherPieces = shuffleArray(pieceDefinitions.flatMap((piece) => Array.from({ length: piece.initialCount }, () => piece.id))).filter(
      (pieceId) => pieceById[pieceId]?.label !== "Flag"
    );
    const preferredFlagTiles = shuffleArray([getTileIndex(0, 3), getTileIndex(0, 4), getTileIndex(0, 5)]);
    const flagTile = preferredFlagTiles[0] ?? setupTiles[0];
    if (flag) {
      formation[flagTile] = flag.id;
    }
    const availableTiles = shuffleArray(setupTiles.filter((tile) => tile !== flagTile));
    otherPieces.forEach((pieceId, index) => {
      const tile = availableTiles[index];
      if (tile !== undefined) {
        formation[tile] = pieceId;
      }
    });
    return formation;
  }

  const pieceBag = pieceDefinitions
    .flatMap((piece) => Array.from({ length: piece.initialCount }, () => piece.id))
    .sort((left, right) => getFormationPriority(right, pieceById) - getFormationPriority(left, pieceById));
  let availableTiles = [...setupTiles];

  pieceBag.forEach((pieceId) => {
    const rankedTiles = availableTiles
      .map((tileIndex) => ({ tileIndex, score: scoreFormationTile(pieceId, tileIndex, difficulty, pieceById) }))
      .sort((left, right) => right.score - left.score);

    const selectionPool = difficulty === "hard" ? rankedTiles.slice(0, 2) : rankedTiles.slice(0, 4);
    const chosenTile = selectionPool[Math.floor(Math.random() * selectionPool.length)]?.tileIndex ?? rankedTiles[0]?.tileIndex;
    if (chosenTile !== undefined) {
      formation[chosenTile] = pieceId;
      availableTiles = availableTiles.filter((tile) => tile !== chosenTile);
    }
  });

  return formation;
}

// Once both sides are ready, we turn the saved formations into the live battle board.
// Keeping setup and battle state separate makes the screen easier to manage.
function buildBattleBoard(playerFormation: Record<number, string>, aiFormation: Record<number, string>) {
  const board: Record<number, BoardPiece> = {};
  Object.entries(playerFormation).forEach(([tileIndex, pieceId]) => {
    board[Number(tileIndex)] = { side: "player", pieceId, revealedToPlayer: true, revealedToAI: false };
  });
  Object.entries(aiFormation).forEach(([tileIndex, pieceId]) => {
    board[Number(tileIndex)] = { side: "ai", pieceId, revealedToPlayer: false, revealedToAI: true };
  });
  return board;
}

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ level?: string }>();
  const difficulty: Difficulty = params.level === "easy" || params.level === "medium" || params.level === "hard" ? params.level : "medium";

  const [isInventoryExpanded, setIsInventoryExpanded] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showReadyModal, setShowReadyModal] = useState(false);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [placedByTileIndex, setPlacedByTileIndex] = useState<Record<number, string>>({});
  const [moveSourceTileIndex, setMoveSourceTileIndex] = useState<number | null>(null);
  const [lastTap, setLastTap] = useState<{ tileIndex: number; time: number } | null>(null);
  const [phase, setPhase] = useState<Phase>("formation");
  const [turn, setTurn] = useState<Side>("player");
  const [battleBoard, setBattleBoard] = useState<Record<number, BoardPiece>>({});
  const [selectedBattleTileIndex, setSelectedBattleTileIndex] = useState<number | null>(null);
  const [battleMessage, setBattleMessage] = useState("Build your line, then confirm to begin the clash.");
  const [revealMessage, setRevealMessage] = useState<string | null>(null);
  const [aiThinking, setAIThinking] = useState(false);
  const [winner, setWinner] = useState<Side | null>(null);
  const [capturedByPlayer, setCapturedByPlayer] = useState<string[]>([]);
  const [capturedByAI, setCapturedByAI] = useState<string[]>([]);

  const {
    width,
    safeWidth,
    rs,
    rsv,
    rf,
    layoutWidth,
    contentPaddingX,
    sectionGap,
    cardGap,
    cardPadding,
    panelRadius,
    isCompactHeight,
    isUltraCompactHeight,
    insets,
  } = useResponsiveTokens();
  const contentWidth = Math.min(layoutWidth, rs(560));
  const boardWidth = clamp(
    Math.min(contentWidth, safeWidth * (safeWidth > 720 ? 0.78 : 0.96)),
    rs(286),
    rs(safeWidth > 720 ? 460 : 420)
  );
  const topMenuHeight = rsv(isUltraCompactHeight ? 36 : isCompactHeight ? 40 : 44);
  const shellTopPadding = rsv(isUltraCompactHeight ? 6 : isCompactHeight ? 10 : 16);
  const shellBottomPadding = rsv(isUltraCompactHeight ? 8 : isCompactHeight ? 12 : 18);
  const verticalSectionGap = rsv(isUltraCompactHeight ? 8 : isCompactHeight ? 10 : sectionGap);
  const compactCardGap = rsv(isUltraCompactHeight ? 6 : isCompactHeight ? 8 : cardGap);
  const allowPageScroll = isUltraCompactHeight;

  const boardTiles = useMemo(() => Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }, (_, index) => ({ index })), []);
  const aiProfile = DIFFICULTY_PROFILES[difficulty];
  // We build the full list of ranks once here so the UI, battle rules, and enemy logic all use the same piece data.
  const pieceDefinitions: PieceDefinition[] = useMemo(() => {
    const columns = [FIRST_COLUMN_LABELS, SECOND_COLUMN_LABELS, THIRD_COLUMN_LABELS];
    return columns.flatMap((labels, column) =>
      labels.map((label, row) => {
        const id = getPieceId(column, row, label);
        const initialCount = label === "Spy" ? 2 : label === "Private" ? 6 : 1;
        return { id, label, initialCount, shortLabel: SHORT_LABEL_BY_NAME[label] ?? label };
      })
    );
  }, []);
  const pieceById = useMemo(() => Object.fromEntries(pieceDefinitions.map((piece) => [piece.id, piece])), [pieceDefinitions]);
  // Reserve counts are based on what has already been placed on the board.
  // That way we do not have to manually keep a second piece counter in sync.
  const initialPieceCountById = useMemo(() => {
    const counts: Record<string, number> = {};
    pieceDefinitions.forEach((piece) => {
      counts[piece.id] = piece.initialCount;
    });
    return counts;
  }, [pieceDefinitions]);
  const pieceCountById = useMemo(() => {
    const remaining = { ...initialPieceCountById };
    Object.values(placedByTileIndex).forEach((pieceId) => {
      if (remaining[pieceId] !== undefined) {
        remaining[pieceId] = Math.max(0, remaining[pieceId] - 1);
      }
    });
    return remaining;
  }, [initialPieceCountById, placedByTileIndex]);
  const totalUnplacedCount = useMemo(() => Object.values(pieceCountById).reduce((sum, count) => sum + count, 0), [pieceCountById]);
  const isReadyEnabled = totalUnplacedCount === 0;
  const selectedPiece = selectedPieceId ? pieceById[selectedPieceId] : null;
  const showSetupZoneHint = phase === "formation" && (selectedPieceId !== null || moveSourceTileIndex !== null);
  // When the player selects a piece during battle, we precompute its legal targets.
  // This keeps the board render simpler because each tile can just check this list.
  const selectedBattleMoves = useMemo(() => {
    if (phase !== "battle" || selectedBattleTileIndex === null) {
      return [];
    }
    return getLegalMoves(battleBoard, "player", pieceById).filter((move) => move.from === selectedBattleTileIndex).map((move) => move.to);
  }, [battleBoard, phase, pieceById, selectedBattleTileIndex]);
  const capturedPlayerNames = useMemo(() => capturedByPlayer.map((pieceId) => pieceById[pieceId]?.shortLabel ?? "?").join("  "), [capturedByPlayer, pieceById]);
  const capturedAINames = useMemo(() => capturedByAI.map((pieceId) => pieceById[pieceId]?.shortLabel ?? "?").join("  "), [capturedByAI, pieceById]);

  // This effect handles the enemy turn after the player finishes a move.
  // Keeping it here makes the turn handoff easier to follow during handoffs.
  useEffect(() => {
    if (phase !== "battle" || turn !== "ai" || winner) {
      return;
    }
    setAIThinking(true);
    const timer = setTimeout(() => {
      const aiMove = chooseMoveForProfile(battleBoard, aiProfile, pieceById);
      if (!aiMove) {
        setWinner("player");
        setPhase("ended");
        setBattleMessage("Enemy command is out of legal moves. You hold the field.");
        setAIThinking(false);
        return;
      }
      const resolution = resolveBattleMove(battleBoard, aiMove, pieceById);
      setBattleBoard(resolution.board);
      setCapturedByPlayer((current) => [...current, ...resolution.capturedByPlayer]);
      setCapturedByAI((current) => [...current, ...resolution.capturedByAI]);
      setBattleMessage(resolution.message);
      setRevealMessage(resolution.revealMessage);
      if (resolution.winner) {
        setWinner(resolution.winner);
        setPhase("ended");
      } else if (getLegalMoves(resolution.board, "player", pieceById).length === 0) {
        setWinner("ai");
        setPhase("ended");
        setBattleMessage("Your line has no legal moves left. Enemy command takes the field.");
      } else {
        setTurn("player");
      }
      setSelectedBattleTileIndex(null);
      setAIThinking(false);
    }, AI_THINKING_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [aiProfile, battleBoard, phase, pieceById, turn, winner]);

  const clearFormationSelectionState = () => {
    setMoveSourceTileIndex(null);
    setSelectedPieceId(null);
  };

  const returnToMainMenu = () => {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const handlePieceButtonPress = (pieceId: string) => {
    if (phase !== "formation") {
      return;
    }
    setMoveSourceTileIndex(null);
    setSelectedPieceId((current) => (current === pieceId ? null : pieceId));
  };

  const handleResetBoard = () => {
    setPlacedByTileIndex({});
    setMoveSourceTileIndex(null);
    setSelectedPieceId(null);
    setLastTap(null);
  };

  // Double-tap sends a placed rank back to the reserve.
  // The timing check helps avoid removing a piece by accident during normal setup taps.
  const tryHandleDoubleTapRemove = (tileIndex: number, now: number) => {
    if (!lastTap || lastTap.tileIndex !== tileIndex || now - lastTap.time >= DOUBLE_TAP_MS) {
      return false;
    }
    setLastTap(null);
    setPlacedByTileIndex((current) => {
      if (!current[tileIndex]) {
        return current;
      }
      const next = { ...current };
      delete next[tileIndex];
      return next;
    });
    clearFormationSelectionState();
    return true;
  };

  // If the player is already moving a placed rank, the next tap finishes that move.
  // It can either swap with another placed rank or move into an empty setup tile.
  const tryHandleMoveFromSource = (tileIndex: number) => {
    if (moveSourceTileIndex === null) {
      return false;
    }
    const movingPieceId = placedByTileIndex[moveSourceTileIndex];
    if (!movingPieceId) {
      setMoveSourceTileIndex(null);
      return true;
    }
    if (tileIndex === moveSourceTileIndex) {
      clearFormationSelectionState();
      return true;
    }
    setPlacedByTileIndex((current) => {
      const next = { ...current };
      const targetPieceId = next[tileIndex];
      next[tileIndex] = movingPieceId;
      if (targetPieceId) {
        next[moveSourceTileIndex] = targetPieceId;
      } else {
        delete next[moveSourceTileIndex];
      }
      return next;
    });
    clearFormationSelectionState();
    return true;
  };

  // If nothing from the reserve is selected, tapping a placed tile means
  // "pick this up and move it" instead of placing a new piece.
  const tryBeginMoveFromTile = (tileIndex: number) => {
    if (selectedPieceId) {
      return false;
    }
    const pieceIdOnTile = placedByTileIndex[tileIndex];
    if (!pieceIdOnTile) {
      return true;
    }
    setMoveSourceTileIndex(tileIndex);
    setSelectedPieceId(pieceIdOnTile);
    return true;
  };

  const handlePlaceSelectedPiece = (tileIndex: number) => {
    if (!selectedPieceId || (pieceCountById[selectedPieceId] ?? 0) <= 0) {
      return;
    }
    setPlacedByTileIndex((current) => ({ ...current, [tileIndex]: selectedPieceId }));
    clearFormationSelectionState();
  };

  // Formation taps follow one path in this order:
  // remove on double-tap, finish a move if one is in progress, start moving an existing rank, or place a reserve rank.
  const handleFormationTilePress = (tileIndex: number) => {
    if (!isPlayerSetupZoneTileIndex(tileIndex)) {
      return;
    }
    const now = Date.now();
    if (tryHandleDoubleTapRemove(tileIndex, now)) {
      return;
    }
    setLastTap({ tileIndex, time: now });
    if (tryHandleMoveFromSource(tileIndex)) {
      return;
    }
    if (tryBeginMoveFromTile(tileIndex)) {
      return;
    }
    handlePlaceSelectedPiece(tileIndex);
  };

  const handleRandomizeSet = () => {
    const setupTileIndexes = boardTiles.filter((tile) => isPlayerSetupZoneTileIndex(tile.index)).map((tile) => tile.index);
    const pieceBag = pieceDefinitions.flatMap((piece) => Array.from({ length: piece.initialCount }, () => piece.id));
    const shuffledTiles = shuffleArray(setupTileIndexes);
    const shuffledPieces = shuffleArray(pieceBag);
    const randomizedPlacement: Record<number, string> = {};
    shuffledPieces.forEach((pieceId, index) => {
      const tileIndex = shuffledTiles[index];
      if (tileIndex !== undefined) {
        randomizedPlacement[tileIndex] = pieceId;
      }
    });
    setPlacedByTileIndex(randomizedPlacement);
    setMoveSourceTileIndex(null);
    setSelectedPieceId(null);
    setLastTap(null);
  };

  const startBattle = () => {
    const aiFormation = generateAIFormation(aiProfile.opening, pieceDefinitions, pieceById);
    const board = buildBattleBoard(placedByTileIndex, aiFormation);
    setBattleBoard(board);
    setPhase("battle");
    setTurn("player");
    setWinner(null);
    setSelectedBattleTileIndex(null);
    setBattleMessage(`Enemy ${aiProfile.label} formation is in position. Your move.`);
    setRevealMessage(null);
    setCapturedByPlayer([]);
    setCapturedByAI([]);
    setShowReadyModal(false);
    clearFormationSelectionState();
    setIsInventoryExpanded(false);
  };

  const handleForfeitMatch = () => {
    setShowQuitModal(false);
    setAIThinking(false);
    setWinner("ai");
    setPhase("ended");
    setTurn("ai");
    setSelectedBattleTileIndex(null);
    setBattleMessage("You forfeited the match. Enemy command takes the field.");
    setRevealMessage("The battle ended by surrender.");
  };

  // Battle taps are simpler than setup:
  // first select one of your pieces, then tap a legal tile to move or attack. After that, the turn either ends the match or passes to the enemy.
  const handleBattleTilePress = (tileIndex: number) => {
    if (phase !== "battle" || turn !== "player" || winner || aiThinking) {
      return;
    }
    const tappedPiece = battleBoard[tileIndex];
    if (selectedBattleTileIndex === null) {
      if (tappedPiece?.side === "player") {
        setSelectedBattleTileIndex(tileIndex);
      }
      return;
    }
    if (selectedBattleTileIndex === tileIndex) {
      setSelectedBattleTileIndex(null);
      return;
    }
    if (tappedPiece?.side === "player") {
      setSelectedBattleTileIndex(tileIndex);
      return;
    }
    const legalMove = getLegalMoves(battleBoard, "player", pieceById).find((move) => move.from === selectedBattleTileIndex && move.to === tileIndex);
    if (!legalMove) {
      setSelectedBattleTileIndex(null);
      return;
    }
    const resolution = resolveBattleMove(battleBoard, legalMove, pieceById);
    setBattleBoard(resolution.board);
    setCapturedByPlayer((current) => [...current, ...resolution.capturedByPlayer]);
    setCapturedByAI((current) => [...current, ...resolution.capturedByAI]);
    setBattleMessage(resolution.message);
    setRevealMessage(resolution.revealMessage);
    setSelectedBattleTileIndex(null);
    if (resolution.winner) {
      setWinner(resolution.winner);
      setPhase("ended");
      return;
    }
    if (getLegalMoves(resolution.board, "ai", pieceById).length === 0) {
      setWinner("player");
      setPhase("ended");
      setBattleMessage("Enemy command has no legal reply. You control the field.");
      return;
    }
    setTurn("ai");
  };

  const handleTilePress = (tileIndex: number) => {
    if (phase === "formation") {
      handleFormationTilePress(tileIndex);
      return;
    }
    handleBattleTilePress(tileIndex);
  };

  // These labels are derived from the current game state.
  // Keeping them here makes the text easier to trace when someone updates the screen copy later.
  const phaseLabel = phase === "formation" ? "FORMATION PHASE" : phase === "battle" ? "BATTLE PHASE" : "MATCH RESOLVED";
  const turnLabel = winner ? (winner === "player" ? "Victory" : "Defeat") : turn === "player" ? "Your turn" : "Enemy turn";
  const topLeftActionLabel = phase === "formation" ? "Menu" : phase === "battle" ? "Surrender" : "Main Menu";
  const topLeftActionIcon = phase === "formation" ? "arrow-left" : phase === "battle" ? "flag-variant-outline" : "home-outline";
  const boardHint =
    phase === "formation"
      ? "Tip: tap a placed unit to move it, or double tap it to return it to reserve."
      : aiThinking
        ? `${aiProfile.label} is reading the field...`
        : turn === "player"
          ? "Tap your piece, then tap an adjacent tile to move or attack."
          : "Hold position while the enemy acts.";

  return (
    <View style={styles.safeArea}>
      <View style={[styles.backgroundFog, { width: rs(240), height: rs(240), borderRadius: rs(120), top: -rsv(18), right: -rs(32) }]} />
      <View style={[styles.backgroundEmber, { width: rs(300), height: rs(300), borderRadius: rs(150), bottom: -rsv(92), left: -rs(88) }]} />

      <ScreenShell
        style={styles.pageFrame}
        maxWidth={contentWidth}
        horizontalPadding={contentPaddingX}
        topPadding={shellTopPadding}
        bottomPadding={shellBottomPadding}
        scrollable={allowPageScroll}
      >
        <View style={[styles.container, { maxWidth: contentWidth, justifyContent: allowPageScroll ? "flex-start" : "center" }]}>
          <View style={[styles.topMenuRow, { minHeight: topMenuHeight, marginBottom: verticalSectionGap }]}>
            <TouchableOpacity
              style={[styles.menuButton, { paddingVertical: rsv(6), paddingHorizontal: rs(10), borderRadius: rs(12) }]}
              onPress={() => {
                if (phase === "ended") {
                  returnToMainMenu();
                  return;
                }
                setShowQuitModal(true);
              }}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name={topLeftActionIcon} size={rf(18)} color={appTheme.colors.brassBright} />
              <Text style={[styles.menuButtonText, { fontSize: rf(13) }]}>{topLeftActionLabel}</Text>
            </TouchableOpacity>

            <View style={styles.topRowCenter}>
              <Text style={[styles.topRowLabel, { fontSize: rf(9) }]}>{phaseLabel}</Text>
              <Text style={[styles.topRowTitle, { fontSize: rf(isCompactHeight ? 24 : 28) }]}>Salpakan</Text>
            </View>

            <View style={[styles.difficultyBadge, { paddingHorizontal: rs(10), paddingVertical: rsv(6), borderRadius: rs(14) }]}>
              <Text style={[styles.difficultyBadgeText, { fontSize: rf(10) }]}>{aiProfile.label}</Text>
            </View>
          </View>

          <View
            style={[
              styles.setupBox,
              {
                marginBottom: verticalSectionGap,
                paddingHorizontal: cardPadding,
                paddingTop: rsv(isUltraCompactHeight ? 10 : isCompactHeight ? 11 : 12),
                paddingBottom: rsv(isUltraCompactHeight ? 10 : isCompactHeight ? 11 : 12),
                borderRadius: panelRadius,
              },
            ]}
          >
            <Text style={[styles.setupInstruction, { fontSize: rf(12), lineHeight: rf(17) }]}>
              {phase === "formation" ? "Select a rank from the reserve, then place it inside the marked deployment rows." : battleMessage}
            </Text>

            <View style={[styles.statusStrip, { gap: compactCardGap, marginTop: rsv(isUltraCompactHeight ? 8 : 10) }]}>
              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, { fontSize: rf(10) }]}>{phase === "formation" ? "Selected" : "Turn"}</Text>
                <Text style={[styles.statusValue, { fontSize: rf(13) }]} numberOfLines={1}>
                  {phase === "formation" ? (selectedPiece ? selectedPiece.label.replace("\n", " ") : "None") : turnLabel}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, { fontSize: rf(10) }]}>{phase === "formation" ? "Unplaced" : "Intel"}</Text>
                <Text style={[styles.statusValue, { fontSize: rf(13) }]} numberOfLines={2}>
                  {phase === "formation" ? totalUnplacedCount : revealMessage ?? "Enemy ranks stay hidden until contact."}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.boardWrap, { marginBottom: verticalSectionGap }]}>
            <View style={[styles.boardOuterShell, { width: boardWidth, padding: rs(8) }]}>
              <View style={styles.boardFrame}>
                <View style={styles.boardGrid}>
                  {boardTiles.map((tile) => {
                    const tileColumn = getTileColumn(tile.index);
                    const tileRow = getTileRow(tile.index);
                    const isDarkWoodTile = (tileColumn + tileRow) % 2 === 1;
                    const formationPieceId = phase === "formation" ? placedByTileIndex[tile.index] : null;
                    const formationPiece = formationPieceId ? pieceById[formationPieceId] : null;
                    const battlePiece = phase !== "formation" ? battleBoard[tile.index] : undefined;
                    const isMoveSource = phase === "formation" && moveSourceTileIndex === tile.index;
                    const isSetupZoneTile = phase === "formation" && isPlayerSetupZoneTileIndex(tile.index);
                    const isSelectedBattleTile = phase !== "formation" && selectedBattleTileIndex === tile.index;
                    const isBattleTarget = phase !== "formation" && selectedBattleMoves.includes(tile.index);
                    const visiblePiece = battlePiece ? getVisibleLabel(battlePiece, pieceById, "player") : null;

                    return (
                      <TouchableOpacity
                        key={tile.index}
                        style={[
                          styles.tile,
                          isDarkWoodTile ? styles.tileWoodDark : styles.tileWoodLight,
                          isSetupZoneTile && styles.setupZoneTileBase,
                          showSetupZoneHint && isSetupZoneTile && styles.setupZoneTileHint,
                          showSetupZoneHint && !isSetupZoneTile && styles.restrictedTileHint,
                          formationPiece && styles.placedTile,
                          battlePiece?.side === "player" && styles.playerBattleTile,
                          battlePiece?.side === "ai" && styles.aiBattleTile,
                          isMoveSource && styles.moveSourceTile,
                          isSelectedBattleTile && styles.moveSourceTile,
                          isBattleTarget && styles.battleTargetTile,
                        ]}
                        onPress={() => handleTilePress(tile.index)}
                        activeOpacity={0.8}
                      >
                        {formationPiece ? <Text style={[styles.tilePieceText, { fontSize: rf(9) }]}>{formationPiece.shortLabel}</Text> : null}
                        {battlePiece ? (
                          <Text
                            style={[
                              styles.tilePieceText,
                              { fontSize: rf(9) },
                              battlePiece.side === "ai" && !battlePiece.revealedToPlayer ? styles.hiddenEnemyText : null,
                            ]}
                          >
                            {visiblePiece}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
            <Text style={[styles.boardInstructionText, { fontSize: rf(10), marginTop: rsv(10) }]}>{boardHint}</Text>
          </View>

          {phase === "formation" ? (
            <>
              <View style={[styles.actionRow, { marginBottom: verticalSectionGap, gap: compactCardGap }]}>
                <TouchableOpacity
                  style={[styles.commandButton, styles.commandButtonSecondary, { borderRadius: rs(14), paddingVertical: rsv(9), paddingHorizontal: rs(14) }]}
                  onPress={handleResetBoard}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="restart" size={rf(16)} color={appTheme.colors.ink} />
                  <Text style={[styles.commandButtonText, styles.commandButtonTextEnabled, { fontSize: rf(12) }]}>Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.commandButton, styles.commandButtonSecondary, { borderRadius: rs(14), paddingVertical: rsv(9), paddingHorizontal: rs(14) }]}
                  onPress={handleRandomizeSet}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="shuffle-variant" size={rf(16)} color={appTheme.colors.ink} />
                  <Text style={[styles.commandButtonText, styles.commandButtonTextEnabled, { fontSize: rf(12) }]}>Random</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.commandButton,
                    isReadyEnabled ? styles.commandButtonPrimary : styles.commandButtonDisabled,
                    { borderRadius: rs(14), paddingVertical: rsv(9), paddingHorizontal: rs(14) },
                  ]}
                  disabled={!isReadyEnabled}
                  onPress={() => setShowReadyModal(true)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={rf(16)}
                    color={isReadyEnabled ? appTheme.colors.ink : appTheme.colors.mono.disabledText}
                  />
                  <Text style={[styles.commandButtonText, { fontSize: rf(12) }, isReadyEnabled ? styles.commandButtonTextEnabled : styles.commandButtonTextDisabled]}>
                    Ready
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.reservePanel,
                  {
                    borderRadius: panelRadius,
                    paddingHorizontal: cardPadding,
                    paddingTop: rsv(isUltraCompactHeight ? 10 : isCompactHeight ? 11 : 12),
                    paddingBottom: rsv(isInventoryExpanded ? (isUltraCompactHeight ? 10 : isCompactHeight ? 12 : 14) : isUltraCompactHeight ? 10 : 12),
                  },
                ]}
              >
                <View style={styles.reserveHeader}>
                  <View>
                    <Text style={[styles.reserveLabel, { fontSize: rf(10) }]}>RESERVE</Text>
                    <Text style={[styles.reserveTitle, { fontSize: rf(isCompactHeight ? 18 : 20) }]}>Choose a rank</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.inventoryToggleButton, { paddingHorizontal: rs(10), paddingVertical: rsv(6), borderRadius: rs(12) }]}
                    onPress={() => setIsInventoryExpanded((current) => !current)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.inventoryToggleText, { fontSize: rf(11) }]}>{isInventoryExpanded ? "Hide Reserve" : "Open Reserve"}</Text>
                  </TouchableOpacity>
                </View>

                {isInventoryExpanded ? (
                  <View style={[styles.inventoryRailContainer, { marginTop: verticalSectionGap }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.inventoryRailContent, { columnGap: compactCardGap, paddingRight: rs(8) }]}>
                      {pieceDefinitions.map((piece) => {
                        const remaining = pieceCountById[piece.id] ?? 0;
                        const isSelected = selectedPieceId === piece.id;
                        const isDepleted = remaining <= 0;
                        return (
                          <TouchableOpacity
                            key={piece.id}
                            style={[
                              styles.inventoryChip,
                              { minWidth: rs(100), minHeight: rsv(isUltraCompactHeight ? 84 : 94), paddingHorizontal: rs(10), paddingVertical: rsv(8), borderRadius: rs(12) },
                              isSelected && styles.inventoryChipSelected,
                              isDepleted && styles.inventoryChipDepleted,
                            ]}
                            onPress={() => handlePieceButtonPress(piece.id)}
                            disabled={isDepleted}
                            activeOpacity={0.85}
                          >
                            <Text
                              style={[
                                styles.inventoryChipTitle,
                                { fontSize: piece.label.includes("\n") ? rf(10) : rf(12), lineHeight: piece.label.includes("\n") ? rf(11) : rf(14) },
                                isSelected && styles.inventoryChipTitleSelected,
                                isDepleted && styles.inventoryChipTitleDepleted,
                              ]}
                            >
                              {piece.label}
                            </Text>
                            <View
                              style={[
                                styles.inventoryCountPill,
                                { marginTop: rsv(6), borderRadius: rs(10), paddingHorizontal: rs(8), paddingVertical: rsv(3) },
                                isSelected && styles.inventoryCountPillSelected,
                                isDepleted && styles.inventoryCountPillDepleted,
                              ]}
                            >
                              <Text style={[styles.inventoryCountText, { fontSize: rf(11) }, isSelected && styles.inventoryCountTextSelected]}>x{remaining}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : (
                  <Text style={[styles.reserveInstruction, { fontSize: rf(11), lineHeight: rf(15), marginTop: rsv(8) }]}>
                    Open the reserve to select ranks, then place them on the highlighted deployment rows.
                  </Text>
                )}
              </View>
            </>
          ) : (
            <View
              style={[
                styles.reservePanel,
                { borderRadius: panelRadius, paddingHorizontal: cardPadding, paddingTop: rsv(isUltraCompactHeight ? 10 : isCompactHeight ? 11 : 12), paddingBottom: rsv(isUltraCompactHeight ? 10 : 12) },
              ]}
            >
              <View style={styles.reserveHeader}>
                <View>
                  <Text style={[styles.reserveLabel, { fontSize: rf(10) }]}>BATTLEFIELD INTEL</Text>
                  <Text style={[styles.reserveTitle, { fontSize: rf(isCompactHeight ? 18 : 20) }]}>
                    {winner ? (winner === "player" ? "Field secured" : "Line broken") : "Clash in progress"}
                  </Text>
                </View>
                <View style={[styles.thinkingPill, { borderRadius: rs(12), paddingHorizontal: rs(10), paddingVertical: rsv(6) }]}>
                  <Text style={[styles.inventoryToggleText, { fontSize: rf(11) }]}>{aiThinking ? "Enemy thinking" : turnLabel}</Text>
                </View>
              </View>

              <View style={[styles.statusStrip, { gap: compactCardGap, marginTop: verticalSectionGap }]}>
                <View style={styles.statusItem}>
                  <Text style={[styles.statusLabel, { fontSize: rf(10) }]}>Your losses</Text>
                  <Text style={[styles.statusValue, { fontSize: rf(13) }]} numberOfLines={2}>
                    {capturedPlayerNames || "None"}
                  </Text>
                </View>
                <View style={styles.statusItem}>
                  <Text style={[styles.statusLabel, { fontSize: rf(10) }]}>Enemy losses</Text>
                  <Text style={[styles.statusValue, { fontSize: rf(13) }]} numberOfLines={2}>
                    {capturedAINames || "None"}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScreenShell>

      <Modal visible={showQuitModal} transparent animationType="fade" onRequestClose={() => setShowQuitModal(false)}>
        <View style={[styles.modalOverlay, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.modalCard, { maxWidth: Math.min(rs(360), width * 0.9), padding: rs(20) }]}>
            <Text style={[styles.modalLabel, { fontSize: rf(10) }]}>{phase === "formation" ? "EXIT COMMAND" : "SURRENDER"}</Text>
            <Text style={[styles.modalMessage, { fontSize: rf(24), lineHeight: rf(28), marginTop: rsv(8) }]}>
              {phase === "formation" ? "Leave the formation screen?" : "Forfeit this match?"}
            </Text>
            <View style={[styles.modalButtonsRow, { marginTop: rsv(18), gap: rs(14) }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalPrimaryButton]}
                onPress={phase === "formation" ? () => {
                  setShowQuitModal(false);
                  returnToMainMenu();
                } : handleForfeitMatch}
              >
                <Text style={[styles.modalButtonText, { fontSize: rf(14) }]}>{phase === "formation" ? "Leave" : "Forfeit"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalSecondaryButton]} onPress={() => setShowQuitModal(false)}>
                <Text style={[styles.modalButtonText, styles.modalSecondaryButtonText, { fontSize: rf(14) }]}>{phase === "formation" ? "Stay" : "Keep Fighting"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showReadyModal} transparent animationType="fade" onRequestClose={() => setShowReadyModal(false)}>
        <View style={[styles.modalOverlay, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.modalCard, { maxWidth: Math.min(rs(360), width * 0.9), padding: rs(20) }]}>
            <Text style={[styles.modalLabel, { fontSize: rf(10) }]}>READY CHECK</Text>
            <Text style={[styles.modalMessage, { fontSize: rf(24), lineHeight: rf(28), marginTop: rsv(8) }]}>All ranks are placed.{"\n"}Begin the clash?</Text>
            <View style={[styles.modalButtonsRow, { marginTop: rsv(18), gap: rs(14) }]}>
              <TouchableOpacity style={[styles.modalButton, styles.modalPrimaryButton]} onPress={startBattle}>
                <Text style={[styles.modalButtonText, { fontSize: rf(14) }]}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalSecondaryButton]} onPress={() => setShowReadyModal(false)}>
                <Text style={[styles.modalButtonText, styles.modalSecondaryButtonText, { fontSize: rf(14) }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: appTheme.colors.background },
  backgroundFog: { position: "absolute", backgroundColor: "rgba(199, 163, 84, 0.12)" },
  backgroundEmber: { position: "absolute", backgroundColor: "rgba(180, 67, 52, 0.18)" },
  pageFrame: { flex: 1, alignItems: "center" },
  container: { width: "100%", alignItems: "center", flex: 1 },
  topMenuRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  topRowCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  topRowLabel: { color: appTheme.colors.brassBright, fontFamily: appTheme.fonts.body, letterSpacing: 1 },
  topRowTitle: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.display, letterSpacing: 0.15, textTransform: "uppercase" },
  menuButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: appTheme.surfaces.commandSecondary.backgroundColor, borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.surfaces.commandSecondary.borderColor },
  menuButtonText: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.body },
  difficultyBadge: { backgroundColor: appTheme.surfaces.badge.backgroundColor, borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.surfaces.badge.borderColor },
  difficultyBadgeText: { color: appTheme.surfaces.badge.textColor, fontFamily: appTheme.fonts.body, letterSpacing: 0.7, textTransform: "uppercase" },
  setupBox: { width: "100%", backgroundColor: appTheme.surfaces.formationBriefing.backgroundColor, borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.surfaces.formationBriefing.borderColor, alignItems: "center", ...appTheme.shadow.soft },
  setupInstruction: { color: appTheme.colors.parchmentSoft, fontFamily: appTheme.fonts.body, textAlign: "center", maxWidth: 420 },
  statusStrip: { width: "100%", flexDirection: "row", flexWrap: "wrap" },
  statusItem: { flex: 1, minWidth: 120, backgroundColor: appTheme.surfaces.inset.backgroundColor, borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.surfaces.inset.borderColor, borderRadius: appTheme.radius.md, paddingHorizontal: 10, paddingVertical: 8 },
  statusLabel: { color: appTheme.colors.inkSoft, fontFamily: appTheme.fonts.body, letterSpacing: 0.8, textTransform: "uppercase" },
  statusValue: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.body, marginTop: 2 },
  actionRow: { width: "100%", flexDirection: "row", justifyContent: "center", alignItems: "center", flexWrap: "wrap" },
  commandButton: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: appTheme.borderWidth.regular },
  commandButtonPrimary: { backgroundColor: appTheme.surfaces.commandPrimary.backgroundColor, borderColor: appTheme.surfaces.commandPrimary.borderColor },
  commandButtonSecondary: { backgroundColor: appTheme.surfaces.commandSecondary.backgroundColor, borderColor: appTheme.surfaces.commandSecondary.borderColor },
  commandButtonDisabled: { backgroundColor: appTheme.colors.mono.disabledBg, borderColor: appTheme.colors.mono.disabledBorder },
  commandButtonText: { fontFamily: appTheme.fonts.body, letterSpacing: 0.4, textTransform: "uppercase" },
  commandButtonTextEnabled: { color: appTheme.colors.ink },
  commandButtonTextDisabled: { color: appTheme.colors.mono.disabledText },
  boardWrap: { width: "100%", alignItems: "center", justifyContent: "center" },
  boardOuterShell: { aspectRatio: 9 / 8, backgroundColor: appTheme.colors.board.shell, borderWidth: appTheme.borderWidth.thick, borderColor: appTheme.colors.board.shellBorder, borderRadius: appTheme.radius.lg, position: "relative", ...appTheme.shadow.hard },
  boardFrame: { flex: 1, borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.colors.board.frameBorder, backgroundColor: appTheme.colors.board.frame, overflow: "hidden", padding: 3 },
  boardGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap", backgroundColor: appTheme.colors.board.grid },
  tile: { width: `${100 / BOARD_WIDTH}%`, height: `${100 / BOARD_HEIGHT}%`, borderWidth: appTheme.borderWidth.thin, borderColor: appTheme.colors.board.line, alignItems: "center", justifyContent: "center" },
  tileWoodLight: { backgroundColor: appTheme.colors.board.tileLight },
  tileWoodDark: { backgroundColor: appTheme.colors.board.tileDark },
  setupZoneTileBase: { shadowColor: "#D3B56A" },
  setupZoneTileHint: { borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.colors.board.setupHint },
  restrictedTileHint: { opacity: 0.42, borderStyle: "dashed" },
  placedTile: { backgroundColor: appTheme.colors.board.piece, borderColor: appTheme.colors.board.pieceEdge },
  playerBattleTile: { backgroundColor: "#2B1C14", borderColor: appTheme.colors.brassBright },
  aiBattleTile: { backgroundColor: "#4A1F19", borderColor: "#E0B55D" },
  battleTargetTile: { borderColor: appTheme.colors.brassBright, borderWidth: appTheme.borderWidth.thick },
  moveSourceTile: { borderColor: appTheme.colors.brassBright, borderWidth: appTheme.borderWidth.thick },
  tilePieceText: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.body, textAlign: "center" },
  hiddenEnemyText: { color: appTheme.colors.parchment },
  boardInstructionText: { color: appTheme.surfaces.instruction.textColor, fontFamily: appTheme.fonts.body, textAlign: "center" },
  reservePanel: { width: "100%", backgroundColor: appTheme.surfaces.section.backgroundColor, borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.surfaces.section.borderColor, ...appTheme.shadow.soft },
  reserveHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  reserveLabel: { color: appTheme.colors.brassBright, fontFamily: appTheme.fonts.body, letterSpacing: 1 },
  reserveTitle: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.display, textTransform: "uppercase" },
  inventoryToggleButton: { backgroundColor: appTheme.surfaces.commandSecondary.backgroundColor, borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.surfaces.commandSecondary.borderColor },
  thinkingPill: { backgroundColor: appTheme.surfaces.commandSecondary.backgroundColor, borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.surfaces.commandSecondary.borderColor },
  inventoryToggleText: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.body, letterSpacing: 0.4, textTransform: "uppercase" },
  reserveInstruction: { color: appTheme.surfaces.instruction.textColor, fontFamily: appTheme.fonts.body, textAlign: "center" },
  inventoryRailContainer: { width: "100%" },
  inventoryRailContent: { alignItems: "stretch" },
  inventoryChip: { backgroundColor: appTheme.surfaces.inset.backgroundColor, borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.surfaces.section.borderColor, justifyContent: "space-between", alignItems: "flex-start" },
  inventoryChipSelected: { backgroundColor: appTheme.surfaces.commandPrimary.backgroundColor, borderColor: appTheme.surfaces.commandPrimary.borderColor },
  inventoryChipDepleted: { backgroundColor: appTheme.colors.mono.disabledBg, borderColor: appTheme.colors.mono.disabledBorder },
  inventoryChipTitle: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.body },
  inventoryChipTitleSelected: { color: appTheme.colors.ink },
  inventoryChipTitleDepleted: { color: appTheme.colors.mono.disabledText },
  inventoryCountPill: { backgroundColor: appTheme.colors.brassBright },
  inventoryCountPillSelected: { backgroundColor: appTheme.colors.parchment },
  inventoryCountPillDepleted: { backgroundColor: appTheme.colors.mono.disabledBorder },
  inventoryCountText: { color: appTheme.colors.backgroundDeep, fontFamily: appTheme.fonts.body },
  inventoryCountTextSelected: { color: appTheme.colors.backgroundDeep },
  modalOverlay: { flex: 1, backgroundColor: appTheme.colors.scrim, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  modalCard: { width: "100%", backgroundColor: appTheme.surfaces.hero.backgroundColor, borderRadius: appTheme.radius.lg, borderWidth: appTheme.borderWidth.thick, borderColor: appTheme.surfaces.hero.borderColor, ...appTheme.shadow.hard },
  modalLabel: { color: appTheme.colors.brassBright, fontFamily: appTheme.fonts.body, letterSpacing: 1, textAlign: "center" },
  modalMessage: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.display, textAlign: "center", textTransform: "uppercase" },
  modalButtonsRow: { flexDirection: "row", justifyContent: "space-between" },
  modalButton: { flex: 1, minHeight: 52, borderRadius: appTheme.radius.sm, alignItems: "center", justifyContent: "center", borderWidth: appTheme.borderWidth.regular },
  modalPrimaryButton: { backgroundColor: appTheme.surfaces.commandPrimary.backgroundColor, borderColor: appTheme.surfaces.commandPrimary.borderColor },
  modalSecondaryButton: { backgroundColor: appTheme.surfaces.commandSecondary.backgroundColor, borderColor: appTheme.surfaces.commandSecondary.borderColor },
  modalButtonText: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.body, textTransform: "uppercase", letterSpacing: 0.4 },
  modalSecondaryButtonText: { color: appTheme.colors.ink },
});
