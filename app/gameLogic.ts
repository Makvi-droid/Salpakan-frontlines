import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  ORTHOGONAL_DIRECTIONS,
  PIECE_STRENGTH_BY_LABEL,
} from "../constants/constants";
import type {
  BattleMove,
  BattleResolution,
  BoardPiece,
  PieceDefinition,
  Side,
} from "./types";

// ─── Board geometry ───────────────────────────────────────────────────────────

export function getTileRow(tileIndex: number) {
  return Math.floor(tileIndex / BOARD_WIDTH);
}

export function getTileColumn(tileIndex: number) {
  return tileIndex % BOARD_WIDTH;
}

export function getTileIndex(row: number, column: number) {
  return row * BOARD_WIDTH + column;
}

export function isInsideBoard(row: number, column: number) {
  return row >= 0 && row < BOARD_HEIGHT && column >= 0 && column < BOARD_WIDTH;
}

export function isPlayerSetupZoneTileIndex(tileIndex: number) {
  return getTileRow(tileIndex) >= BOARD_HEIGHT - 3;
}

// ─── Piece helpers ─────────────────────────────────────────────────────────────

export function getPieceStrength(
  pieceId: string,
  pieceById: Record<string, PieceDefinition>,
) {
  return PIECE_STRENGTH_BY_LABEL[pieceById[pieceId]?.label ?? "Flag"] ?? 0;
}

export function isGeneralPiece(
  pieceId: string,
  pieceById: Record<string, PieceDefinition>,
) {
  return getPieceStrength(pieceId, pieceById) >= 10;
}

export function isMovablePiece(
  pieceId: string,
  pieceById: Record<string, PieceDefinition>,
) {
  return pieceById[pieceId]?.label !== "Flag";
}

export function formatPieceName(
  pieceId: string,
  pieceById: Record<string, PieceDefinition>,
) {
  return pieceById[pieceId]?.label.replace("\n", " ") ?? "Unknown";
}

export function getVisibleLabel(
  piece: BoardPiece,
  pieceById: Record<string, PieceDefinition>,
  viewer: Side,
) {
  if (piece.side === viewer) {
    return pieceById[piece.pieceId]?.shortLabel ?? "?";
  }
  const isRevealed =
    viewer === "player" ? piece.revealedToPlayer : piece.revealedToAI;
  return isRevealed ? (pieceById[piece.pieceId]?.shortLabel ?? "?") : "?";
}

// ─── Movement ─────────────────────────────────────────────────────────────────

export function getLegalMoves(
  board: Record<number, BoardPiece>,
  side: Side,
  pieceById: Record<string, PieceDefinition>,
): BattleMove[] {
  const moves: BattleMove[] = [];
  Object.entries(board).forEach(([key, piece]) => {
    if (piece.side !== side || !isMovablePiece(piece.pieceId, pieceById))
      return;
    const from = Number(key);
    const row = getTileRow(from);
    const column = getTileColumn(from);
    ORTHOGONAL_DIRECTIONS.forEach((dir) => {
      const nextRow = row + dir.y;
      const nextColumn = column + dir.x;
      if (!isInsideBoard(nextRow, nextColumn)) return;
      const to = getTileIndex(nextRow, nextColumn);
      const target = board[to];
      if (target && target.side === side) return;
      moves.push({ side, from, to });
    });
  });
  return moves;
}

// ─── Combat ───────────────────────────────────────────────────────────────────

export function compareCombat(
  attackerId: string,
  defenderId: string,
  pieceById: Record<string, PieceDefinition>,
) {
  const attackerStrength = getPieceStrength(attackerId, pieceById);
  const defenderStrength = getPieceStrength(defenderId, pieceById);
  if (
    pieceById[attackerId]?.label === "Spy" &&
    isGeneralPiece(defenderId, pieceById)
  ) {
    return 1;
  }
  if (
    pieceById[defenderId]?.label === "Spy" &&
    isGeneralPiece(attackerId, pieceById)
  ) {
    return -1;
  }
  if (attackerStrength === defenderStrength) return 0;
  return attackerStrength > defenderStrength ? 1 : -1;
}

export function resolveBattleMove(
  board: Record<number, BoardPiece>,
  move: BattleMove,
  pieceById: Record<string, PieceDefinition>,
): BattleResolution {
  const attacker = board[move.from];
  if (!attacker || attacker.side !== move.side) {
    return {
      board,
      winner: null,
      message: "No move executed.",
      revealMessage: null,
      capturedByPlayer: [],
      capturedByAI: [],
    };
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
  const revealedAttacker: BoardPiece = {
    ...attacker,
    revealedToAI: true,
    revealedToPlayer: true,
  };
  const revealedDefender: BoardPiece = {
    ...target,
    revealedToAI: true,
    revealedToPlayer: true,
  };
  delete nextBoard[move.from];

  let winner: Side | null = null;
  let message = `${actorLabel} engaged ${defenderName}.`;
  const capturedByPlayer: string[] = [];
  const capturedByAI: string[] = [];

  if (outcome > 0) {
    nextBoard[move.to] = revealedAttacker;
    target.side === "player"
      ? capturedByPlayer.push(target.pieceId)
      : capturedByAI.push(target.pieceId);
    message = `${actorLabel} won the clash. ${attackerName} removed ${defenderName}.`;
    if (pieceById[target.pieceId]?.label === "Flag") winner = move.side;
  } else if (outcome < 0) {
    nextBoard[move.to] = revealedDefender;
    attacker.side === "player"
      ? capturedByPlayer.push(attacker.pieceId)
      : capturedByAI.push(attacker.pieceId);
    message = `${actorLabel} lost the clash. ${defenderName} held the line.`;
    if (pieceById[attacker.pieceId]?.label === "Flag") winner = target.side;
  } else {
    delete nextBoard[move.to];
    attacker.side === "player"
      ? capturedByPlayer.push(attacker.pieceId)
      : capturedByAI.push(attacker.pieceId);
    target.side === "player"
      ? capturedByPlayer.push(target.pieceId)
      : capturedByAI.push(target.pieceId);
    message = "Both ranks were eliminated in the clash.";
    if (pieceById[attacker.pieceId]?.label === "Flag") winner = target.side;
    if (pieceById[target.pieceId]?.label === "Flag")
      winner = winner ?? attacker.side;
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

// ─── Board builder ────────────────────────────────────────────────────────────

export function buildBattleBoard(
  playerFormation: Record<number, string>,
  aiFormation: Record<number, string>,
): Record<number, BoardPiece> {
  const board: Record<number, BoardPiece> = {};
  Object.entries(playerFormation).forEach(([tileIndex, pieceId]) => {
    board[Number(tileIndex)] = {
      side: "player",
      pieceId,
      revealedToPlayer: true,
      revealedToAI: false,
    };
  });
  Object.entries(aiFormation).forEach(([tileIndex, pieceId]) => {
    board[Number(tileIndex)] = {
      side: "ai",
      pieceId,
      revealedToPlayer: false,
      revealedToAI: true,
    };
  });
  return board;
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getPieceId(column: number, row: number, label: string) {
  return `${column}-${row}-${label
    .replace(/\n/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}
