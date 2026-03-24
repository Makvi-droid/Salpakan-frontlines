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
  ChallengeEvent,
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
  return pieceById[pieceId] !== undefined;
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
  const isMartyrMarked =
    (viewer === "player" && piece.markedByPlayer) ||
    (viewer === "ai" && piece.markedByAI);
  if (isMartyrMarked) {
    if (piece.upgrade === "double-blind") {
      return viewer === "player"
        ? (piece.decoyShortLabelForPlayer ?? "?")
        : (piece.decoyShortLabelForAI ?? "?");
    }
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

function hasAdjacentOpponent(
  board: Record<number, BoardPiece>,
  tileIndex: number,
  side: Side,
) {
  const row = getTileRow(tileIndex);
  const column = getTileColumn(tileIndex);
  const opponent: Side = side === "player" ? "ai" : "player";

  return ORTHOGONAL_DIRECTIONS.some((dir) => {
    const nextRow = row + dir.y;
    const nextColumn = column + dir.x;
    if (!isInsideBoard(nextRow, nextColumn)) return false;
    const occupant = board[getTileIndex(nextRow, nextColumn)];
    return occupant?.side === opponent;
  });
}

function hasTwoSquareLeadFromEndzone(
  board: Record<number, BoardPiece>,
  flagSide: Side,
) {
  const opponent: Side = flagSide === "player" ? "ai" : "player";

  return Object.entries(board)
    .filter(([, piece]) => piece.side === opponent)
    .every(([tileKey]) => {
      const row = getTileRow(Number(tileKey));
      const distanceFromFlagEnd =
        flagSide === "player" ? row : BOARD_HEIGHT - 1 - row;
      return distanceFromFlagEnd >= 2;
    });
}

// ─── Combat ───────────────────────────────────────────────────────────────────

export function compareCombat(
  attackerId: string,
  defenderId: string,
  pieceById: Record<string, PieceDefinition>,
) {
  const attackerLabel = pieceById[attackerId]?.label;
  const defenderLabel = pieceById[defenderId]?.label;
  const attackerStrength = getPieceStrength(attackerId, pieceById);
  const defenderStrength = getPieceStrength(defenderId, pieceById);

  // Same rank always splits: both pieces are eliminated.
  if (attackerLabel === defenderLabel) return 0;

  // Spy beats every rank except Private. Private beats Spy.
  if (attackerLabel === "Spy" && defenderLabel !== "Private") return 1;
  if (defenderLabel === "Spy" && attackerLabel !== "Private") return -1;

  if (attackerStrength === defenderStrength) return 0;
  return attackerStrength > defenderStrength ? 1 : -1;
}

function getUpgradeCharges(piece: BoardPiece, upgrade: "iron-veil" | "double-blind") {
  if (piece.upgrade !== upgrade) return 0;
  const charges = piece.upgradeCharges;
  // Backward compatibility for already-running games before charges existed.
  return charges === undefined ? 2 : Math.max(0, charges);
}

function consumeChallengeUpgradeCharge(piece: BoardPiece) {
  if (piece.upgrade !== "iron-veil" && piece.upgrade !== "double-blind") {
    return piece;
  }
  const current = piece.upgradeCharges === undefined ? 2 : piece.upgradeCharges;
  return { ...piece, upgradeCharges: Math.max(0, current - 1) };
}

function removePieceUpgrade(piece: BoardPiece): BoardPiece {
  return {
    ...piece,
    upgrade: undefined,
    upgradeCharges: undefined,
    decoyShortLabelForPlayer: undefined,
    decoyShortLabelForAI: undefined,
  };
}

function formatUpgradeId(upgrade: BoardPiece["upgrade"]) {
  if (!upgrade) return "upgrade";
  return upgrade
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getDecoyShortLabelForDoubleBlind(
  pieceId: string,
  opponentPieceId: string,
  pieceById: Record<string, PieceDefinition>,
  outcomeForPiece: "win" | "lose" | "draw",
) {
  const pieceStrength = getPieceStrength(pieceId, pieceById);
  const opponentStrength = getPieceStrength(opponentPieceId, pieceById);

  const allCandidates = Object.entries(pieceById)
    .map(([id, def]) => ({
      id,
      shortLabel: def.shortLabel,
      strength: getPieceStrength(id, pieceById),
    }))
    .filter((entry) => entry.id !== pieceId);

  let filtered = allCandidates;
  if (outcomeForPiece === "win") {
    filtered = allCandidates.filter((entry) => entry.strength > opponentStrength);
  } else if (outcomeForPiece === "lose") {
    filtered = allCandidates.filter((entry) => entry.strength < opponentStrength);
  }

  if (filtered.length === 0) {
    filtered = allCandidates.filter((entry) => entry.strength !== pieceStrength);
  }
  if (filtered.length === 0) {
    filtered = allCandidates;
  }
  if (filtered.length === 0) {
    return pieceById[pieceId]?.shortLabel ?? "?";
  }

  return filtered[Math.floor(Math.random() * filtered.length)].shortLabel;
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
  const isPlayerMove = move.side === "player";

  if (!target) {
    delete nextBoard[move.from];
    nextBoard[move.to] = { ...attacker };

    const attackerLabel = pieceById[attacker.pieceId]?.label;
    const reachedOppositeEnd =
      attackerLabel === "Flag" &&
      ((move.side === "player" && getTileRow(move.to) === 0) ||
        (move.side === "ai" && getTileRow(move.to) === BOARD_HEIGHT - 1));

    if (reachedOppositeEnd) {
      const hasAdjacentThreat = hasAdjacentOpponent(nextBoard, move.to, move.side);
      const hasSafeLead = hasTwoSquareLeadFromEndzone(nextBoard, move.side);

      if (hasAdjacentThreat || !hasSafeLead) {
        return {
          board: nextBoard,
          winner: null,
          message: isPlayerMove
            ? "Your Flag reached the end but is still in danger. Hold a two-square lead to secure victory."
            : "Enemy Flag reached your end but is still exposed. Keep pressure on it.",
          revealMessage: null,
          capturedByPlayer: [],
          capturedByAI: [],
        };
      }

      return {
        board: nextBoard,
        winner: move.side,
        message: isPlayerMove
          ? "Your Flag reached the opposite end! You control the field."
          : "Enemy Flag reached your end. Your line is broken.",
        revealMessage: null,
        capturedByPlayer: [],
        capturedByAI: [],
      };
    }

    return {
      board: nextBoard,
      winner: null,
      // Only name the piece when the player moved it — never leak the AI's rank.
      message: isPlayerMove
        ? `You advanced ${formatPieceName(attacker.pieceId, pieceById)}.`
        : "Enemy advanced a rank.",
      revealMessage: null,
      capturedByPlayer: [],
      capturedByAI: [],
    };
  }

  const outcome = compareCombat(attacker.pieceId, target.pieceId, pieceById);
  const hasSameUpgradeClash =
    attacker.upgrade !== undefined && attacker.upgrade === target.upgrade;
  const nullifiedUpgradeMessage = hasSameUpgradeClash
    ? `${formatUpgradeId(attacker.upgrade)} clash: both upgrades were nullified before resolution.`
    : null;
  // Only compute names for messages where we're allowed to show them.
  const playerAttackerName = isPlayerMove
    ? formatPieceName(attacker.pieceId, pieceById)
    : null;
  const playerDefenderName = !isPlayerMove
    ? formatPieceName(target.pieceId, pieceById)
    : null;

  // Preserve each piece's original reveal flags — neither side learns the
  // rank of the surviving piece just because a challenge occurred.
  delete nextBoard[move.from];

  let winner: Side | null = null;
  let message: string;
  let revealMessage: string | null = null;
  const capturedByPlayer: string[] = [];
  const capturedByAI: string[] = [];

  if (outcome > 0) {
    // Attacker wins — place it at the target tile with its original visibility.
    const attackerAfterWin: BoardPiece = hasSameUpgradeClash
      ? removePieceUpgrade({ ...attacker })
      : consumeChallengeUpgradeCharge({ ...attacker });
    if (!hasSameUpgradeClash && target.upgrade === "martyrs-eye") {
      if (target.side === "player") attackerAfterWin.markedByPlayer = true;
      if (target.side === "ai") attackerAfterWin.markedByAI = true;
    }
    nextBoard[move.to] = attackerAfterWin;
    target.side === "player"
      ? capturedByPlayer.push(target.pieceId)
      : capturedByAI.push(target.pieceId);
    if (isPlayerMove) {
      message = `You won the clash. ${playerAttackerName} removed an enemy rank.`;
    } else {
      // AI won — only reveal that the player's defending piece was removed.
      message = `Enemy won the clash. Your ${formatPieceName(target.pieceId, pieceById)} was removed.`;
    }
    if (pieceById[target.pieceId]?.label === "Flag") winner = move.side;
  } else if (outcome < 0) {
    // Defender wins — it stays in place with its original visibility.
    const defenderAfterWin: BoardPiece = hasSameUpgradeClash
      ? removePieceUpgrade({ ...target })
      : consumeChallengeUpgradeCharge({ ...target });
    if (!hasSameUpgradeClash && attacker.upgrade === "martyrs-eye") {
      if (attacker.side === "player") defenderAfterWin.markedByPlayer = true;
      if (attacker.side === "ai") defenderAfterWin.markedByAI = true;
    }
    nextBoard[move.to] = defenderAfterWin;
    attacker.side === "player"
      ? capturedByPlayer.push(attacker.pieceId)
      : capturedByAI.push(attacker.pieceId);
    if (isPlayerMove) {
      message = `You lost the clash. Your ${playerAttackerName} was removed.`;
    } else {
      // AI lost — only reveal that the player's piece held.
      message = `Enemy lost the clash. Your ${formatPieceName(target.pieceId, pieceById)} held the line.`;
    }
    if (pieceById[attacker.pieceId]?.label === "Flag") winner = target.side;
  } else {
    // Draw — both pieces are removed.
    delete nextBoard[move.to];
    attacker.side === "player"
      ? capturedByPlayer.push(attacker.pieceId)
      : capturedByAI.push(attacker.pieceId);
    target.side === "player"
      ? capturedByPlayer.push(target.pieceId)
      : capturedByAI.push(target.pieceId);
    if (isPlayerMove) {
      message = `Both ranks eliminated. Your ${playerAttackerName} and an enemy rank were removed.`;
    } else {
      message = `Both ranks eliminated. Your ${formatPieceName(target.pieceId, pieceById)} and an enemy rank were removed.`;
    }
    if (pieceById[attacker.pieceId]?.label === "Flag") winner = target.side;
    if (pieceById[target.pieceId]?.label === "Flag")
      winner = winner ?? attacker.side;
  }

  if (nullifiedUpgradeMessage) {
    revealMessage = nullifiedUpgradeMessage;
  }

  return {
    board: nextBoard,
    winner,
    message,
    revealMessage,
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

/**
 * Builds a ChallengeEvent for a move that lands on an enemy piece.
 * Does NOT mutate the board — call resolveBattleMove separately (it is
 * already embedded in the returned resolution).
 */
export function prepareChallengeEvent(
  board: Record<number, BoardPiece>,
  move: BattleMove,
  pieceById: Record<string, PieceDefinition>,
): ChallengeEvent | null {
  const attacker = board[move.from];
  const defender = board[move.to];
  if (!attacker || !defender || attacker.side === defender.side) return null;

  const resolution = resolveBattleMove(board, move, pieceById);
  const outcome = compareCombat(attacker.pieceId, defender.pieceId, pieceById);

  const attackerOutcomeForDecoy: "win" | "lose" | "draw" =
    outcome > 0 ? "win" : outcome < 0 ? "lose" : "draw";
  const defenderOutcomeForDecoy: "win" | "lose" | "draw" =
    outcome < 0 ? "win" : outcome > 0 ? "lose" : "draw";

  const attackerDecoyShortLabelForPlayer =
    attacker.side === "ai" && getUpgradeCharges(attacker, "double-blind") > 0
      ? getDecoyShortLabelForDoubleBlind(
          attacker.pieceId,
          defender.pieceId,
          pieceById,
          attackerOutcomeForDecoy,
        )
      : undefined;

  const defenderDecoyShortLabelForPlayer =
    defender.side === "ai" && getUpgradeCharges(defender, "double-blind") > 0
      ? getDecoyShortLabelForDoubleBlind(
          defender.pieceId,
          attacker.pieceId,
          pieceById,
          defenderOutcomeForDecoy,
        )
      : undefined;

  return {
    from: move.from,
    to: move.to,
    attackerSide: attacker.side,
    attackerPieceId: attacker.pieceId,
    attackerName: formatPieceName(attacker.pieceId, pieceById),
    attackerShortLabel: pieceById[attacker.pieceId]?.shortLabel ?? "?",
    defenderSide: defender.side,
    defenderPieceId: defender.pieceId,
    defenderName: formatPieceName(defender.pieceId, pieceById),
    defenderShortLabel: pieceById[defender.pieceId]?.shortLabel ?? "?",
    attackerUpgrade: attacker.upgrade,
    defenderUpgrade: defender.upgrade,
    attackerDecoyShortLabelForPlayer,
    defenderDecoyShortLabelForPlayer,
    attackerHiddenFromPlayer:
      attacker.side === "ai" && getUpgradeCharges(attacker, "iron-veil") > 0,
    defenderHiddenFromPlayer:
      defender.side === "ai" && getUpgradeCharges(defender, "iron-veil") > 0,
    outcome,
    resolution,
  };
}
