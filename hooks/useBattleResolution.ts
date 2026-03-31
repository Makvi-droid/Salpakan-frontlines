import { useState } from "react";

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CRATE_DROP_CHANCE,
  CRATE_DROP_MAX_COUNT,
  CRATE_DROP_MIN_COUNT,
  CRATE_UPGRADES,
  CRATE_UPGRADE_LABELS,
} from "../constants/constants";
import { getLegalMoves, resolveBattleMove, shuffleArray } from "../scripts/gameLogic";
import type {
  BoardPiece,
  BattleMove,
  PieceDefinition,
  PieceUpgradeId,
  Side,
} from "../scripts/types";
import { rollVeteranProc } from "./useVeteranPromo";

export function getInitialUpgradeCharges(upgrade: PieceUpgradeId) {
  if (upgrade === "iron-veil" || upgrade === "double-blind") return 2;
  return undefined;
}

interface UseBattleResolutionOptions {
  pieceById: Record<string, PieceDefinition>;
  decoyShortLabelPool: string[];
  getRandomDecoyShortLabel: (pieceId: string) => string;
  onBoardChange: (board: Record<number, BoardPiece>) => void;
  onWinner: (winner: Side) => void;
  onPhaseEnd: () => void;
  onTurnChange: (turn: Side) => void;
  onMessageChange: (msg: string) => void;
  onRevealMessage: (msg: string | null) => void;
  onCapturedByPlayer: (ids: string[]) => void;
  onCapturedByAI: (ids: string[]) => void;
  onLastMoveTrail: (trail: { from: number; to: number; side: Side } | null) => void;
  onSelectedBattleTileIndex: (index: number | null) => void;
  onPendingUpgradeRoll: (roll: { upgrade: PieceUpgradeId } | null) => void;
  checkAndQueueVeteranPromo: (
    boardBefore: Record<number, BoardPiece>,
    boardAfter: Record<number, BoardPiece>,
    movedToTileIndex: number | undefined,
  ) => void;
}

export function useBattleResolution(options: UseBattleResolutionOptions) {
  const {
    pieceById,
    getRandomDecoyShortLabel,
    onBoardChange,
    onWinner,
    onPhaseEnd,
    onTurnChange,
    onMessageChange,
    onRevealMessage,
    onCapturedByPlayer,
    onCapturedByAI,
    onLastMoveTrail,
    onSelectedBattleTileIndex,
    onPendingUpgradeRoll,
    checkAndQueueVeteranPromo,
  } = options;

  const [crateByTile, setCrateByTile] = useState<Record<number, PieceUpgradeId>>({});
  const [pendingCrateChoice, setPendingCrateChoice] = useState<{
    currentUpgrade: PieceUpgradeId;
    newUpgrade: PieceUpgradeId;
    movedTo: number;
    nextTurn: Side;
    baseMessage: string;
    boardAfterMove: Record<number, BoardPiece>;
    remainingCrates: Record<number, PieceUpgradeId>;
  } | null>(null);

  // ── Double-blind decoy application ───────────────────────────────────────────
  const applyDoubleBlindBoardDecoys = (
    board: Record<number, BoardPiece>,
  ): Record<number, BoardPiece> => {
    let didChange = false;
    const nextBoard: Record<number, BoardPiece> = { ...board };

    Object.entries(board).forEach(([tileKey, piece]) => {
      if (piece.upgrade !== "double-blind") {
        const hadPlayerDecoy = piece.decoyShortLabelForPlayer !== undefined;
        const hadAIDecoy = piece.decoyShortLabelForAI !== undefined;
        if (hadPlayerDecoy || hadAIDecoy) {
          nextBoard[Number(tileKey)] = {
            ...piece,
            decoyShortLabelForPlayer: undefined,
            decoyShortLabelForAI: undefined,
          };
          didChange = true;
        }
        return;
      }

      const updates: Partial<BoardPiece> = {};
      let needsUpdate = false;

      if (piece.markedByPlayer) {
        updates.decoyShortLabelForPlayer = getRandomDecoyShortLabel(piece.pieceId);
        needsUpdate = true;
      } else if (piece.decoyShortLabelForPlayer !== undefined) {
        updates.decoyShortLabelForPlayer = undefined;
        needsUpdate = true;
      }

      if (piece.markedByAI) {
        updates.decoyShortLabelForAI = getRandomDecoyShortLabel(piece.pieceId);
        needsUpdate = true;
      } else if (piece.decoyShortLabelForAI !== undefined) {
        updates.decoyShortLabelForAI = undefined;
        needsUpdate = true;
      }

      if (needsUpdate) {
        nextBoard[Number(tileKey)] = { ...piece, ...updates };
        didChange = true;
      }
    });

    return didChange ? nextBoard : board;
  };

  // ── Crate drop + message finalization ────────────────────────────────────────
  const finalizeTurnWithCrateState = (
    boardAfterMove: Record<number, BoardPiece>,
    nextTurn: Side,
    baseMessage: string,
    remainingCrates: Record<number, PieceUpgradeId>,
    options?: {
      claimedUpgrade?: PieceUpgradeId;
      destroyedCrate?: boolean;
      skipDropAttempt?: boolean;
    },
    actingSide?: Side,
  ) => {
    const moverSide: Side = actingSide ?? (nextTurn === "player" ? "ai" : "player");
    let nextCrates: Record<number, PieceUpgradeId> = { ...remainingCrates };
    let droppedCrates: Record<number, PieceUpgradeId> = {};

    if (
      !options?.skipDropAttempt &&
      Object.keys(nextCrates).length === 0 &&
      Math.random() < CRATE_DROP_CHANCE
    ) {
      const emptyTiles = Array.from(
        { length: BOARD_WIDTH * BOARD_HEIGHT },
        (_, tileIndex) => tileIndex,
      ).filter((tileIndex) => !boardAfterMove[tileIndex]);

      const dropUpperBound = Math.min(CRATE_DROP_MAX_COUNT, emptyTiles.length);
      const dropLowerBound = Math.min(CRATE_DROP_MIN_COUNT, dropUpperBound);

      if (dropLowerBound > 0) {
        const countRange = dropUpperBound - dropLowerBound + 1;
        const dropCount = dropLowerBound + Math.floor(Math.random() * countRange);
        const droppedTiles = shuffleArray(emptyTiles).slice(0, dropCount);
        droppedTiles.forEach((tile) => {
          const randomUpgrade = CRATE_UPGRADES[Math.floor(Math.random() * CRATE_UPGRADES.length)];
          droppedCrates[tile] = randomUpgrade;
        });
      }
    }

    if (Object.keys(droppedCrates).length > 0) nextCrates = droppedCrates;

    setCrateByTile(nextCrates);

    const messageAddons: string[] = [];
    if (options?.claimedUpgrade) {
      if (moverSide === "player") {
        onPendingUpgradeRoll({ upgrade: options.claimedUpgrade });
        messageAddons.push(
          `Supply crate claimed: ${CRATE_UPGRADE_LABELS[options.claimedUpgrade]} equipped.`,
        );
      } else {
        messageAddons.push("Enemy claimed a supply crate.");
      }
    }
    if (options?.destroyedCrate) {
      messageAddons.push(moverSide === "player" ? "Crate destroyed." : "Enemy destroyed a crate.");
    }
    const dropCount = Object.keys(droppedCrates).length;
    if (dropCount > 0) {
      const noun = dropCount === 1 ? "crate" : "crates";
      messageAddons.push(`Supply drop deployed: ${dropCount} ${noun}.`);
    }

    onMessageChange(
      messageAddons.length > 0 ? `${baseMessage} ${messageAddons.join(" ")}` : baseMessage,
    );
    onTurnChange(nextTurn);
  };

  // ── Core resolution ──────────────────────────────────────────────────────────
  const applyResolution = (
    res: ReturnType<typeof resolveBattleMove>,
    nextTurn: Side,
    currentCrateByTile: Record<number, PieceUpgradeId>,
    movedFromTileIndex?: number,
    movedToTileIndex?: number,
  ) => {
    // Veteran proc
    const boardWithVeteranProc = rollVeteranProc(
      res.board,
      movedToTileIndex,
      res.capturedByPlayer,
      res.capturedByAI,
    );

    checkAndQueueVeteranPromo(res.board, boardWithVeteranProc, movedToTileIndex);

    const nextBoard = applyDoubleBlindBoardDecoys(boardWithVeteranProc);

    onBoardChange(nextBoard);
    if (movedFromTileIndex !== undefined && movedToTileIndex !== undefined) {
      onLastMoveTrail({
        from: movedFromTileIndex,
        to: movedToTileIndex,
        side: nextTurn === "player" ? "ai" : "player",
      });
    }
    onCapturedByPlayer(res.capturedByPlayer);
    onCapturedByAI(res.capturedByAI);
    onRevealMessage(res.revealMessage);
    onSelectedBattleTileIndex(null);

    if (res.winner) {
      onWinner(res.winner);
      onPhaseEnd();
      setCrateByTile({});
      onMessageChange(res.message);
      return;
    }

    const opponentSide: Side = nextTurn === "player" ? "ai" : "player";
    if (getLegalMoves(nextBoard, opponentSide, pieceById).length === 0) {
      onWinner(nextTurn);
      onPhaseEnd();
      setCrateByTile({});
      onMessageChange(
        nextTurn === "player"
          ? "Enemy command has no legal reply. You control the field."
          : "Your line has no legal moves left. Enemy command takes the field.",
      );
      return;
    }

    const steppedCrateUpgrade =
      movedToTileIndex !== undefined ? currentCrateByTile[movedToTileIndex] : undefined;
    const movedPiece =
      movedToTileIndex !== undefined ? nextBoard[movedToTileIndex] : undefined;
    const actingSide: Side = nextTurn === "player" ? "ai" : "player";

    const remainingCrates: Record<number, PieceUpgradeId> = { ...currentCrateByTile };
    if (steppedCrateUpgrade !== undefined && movedToTileIndex !== undefined) {
      delete remainingCrates[movedToTileIndex];
    }

    // Piece already has an upgrade — prompt choice or let AI decide
    if (steppedCrateUpgrade && movedPiece?.upgrade) {
      setCrateByTile(remainingCrates);
      if (actingSide === "ai") {
        const aiTakesNewUpgrade = Math.random() < 0.5;
        if (aiTakesNewUpgrade) {
          const withUpgrade = {
            ...nextBoard,
            [movedToTileIndex!]: { ...movedPiece, upgrade: steppedCrateUpgrade },
          };
          const withUpgradeDecoys = applyDoubleBlindBoardDecoys(withUpgrade);
          onBoardChange(withUpgradeDecoys);
          finalizeTurnWithCrateState(withUpgradeDecoys, nextTurn, res.message, remainingCrates, {
            claimedUpgrade: steppedCrateUpgrade,
          }, "ai");
        } else {
          finalizeTurnWithCrateState(nextBoard, nextTurn, res.message, remainingCrates, {
            destroyedCrate: true,
            skipDropAttempt: true,
          }, "ai");
        }
        return;
      }
      setPendingCrateChoice({
        currentUpgrade: movedPiece.upgrade,
        newUpgrade: steppedCrateUpgrade,
        movedTo: movedToTileIndex!,
        nextTurn,
        baseMessage: res.message,
        boardAfterMove: nextBoard,
        remainingCrates,
      });
      onMessageChange(`${res.message} Crate found: choose to take it or destroy it.`);
      return;
    }

    // Auto-claim if piece has no upgrade
    let boardAfterAutoClaim = nextBoard;
    let claimedUpgrade: PieceUpgradeId | undefined;
    if (steppedCrateUpgrade && movedToTileIndex !== undefined) {
      const moved = boardAfterAutoClaim[movedToTileIndex];
      if (moved) {
        boardAfterAutoClaim = {
          ...boardAfterAutoClaim,
          [movedToTileIndex]: {
            ...moved,
            upgrade: steppedCrateUpgrade,
            upgradeCharges: getInitialUpgradeCharges(steppedCrateUpgrade),
          },
        };
        boardAfterAutoClaim = applyDoubleBlindBoardDecoys(boardAfterAutoClaim);
        onBoardChange(boardAfterAutoClaim);
        claimedUpgrade = steppedCrateUpgrade;
      }
    }

    finalizeTurnWithCrateState(
      boardAfterAutoClaim,
      nextTurn,
      res.message,
      remainingCrates,
      claimedUpgrade ? { claimedUpgrade } : undefined,
      actingSide,
    );
  };

  // ── Crate choice handlers ────────────────────────────────────────────────────
  const handleCrateChoiceTake = () => {
    if (!pendingCrateChoice) return;
    const { newUpgrade, movedTo, nextTurn, baseMessage, boardAfterMove, remainingCrates } =
      pendingCrateChoice;
    const movedPiece = boardAfterMove[movedTo];
    const withUpgrade = movedPiece
      ? {
          ...boardAfterMove,
          [movedTo]: {
            ...movedPiece,
            upgrade: newUpgrade,
            upgradeCharges: getInitialUpgradeCharges(newUpgrade),
          },
        }
      : boardAfterMove;
    const withUpgradeDecoys = applyDoubleBlindBoardDecoys(withUpgrade);
    onBoardChange(withUpgradeDecoys);
    setPendingCrateChoice(null);
    finalizeTurnWithCrateState(withUpgradeDecoys, nextTurn, baseMessage, remainingCrates, {
      claimedUpgrade: newUpgrade,
    }, "player");
  };

  const handleCrateChoiceDestroy = () => {
    if (!pendingCrateChoice) return;
    const { nextTurn, baseMessage, boardAfterMove, remainingCrates } = pendingCrateChoice;
    setPendingCrateChoice(null);
    finalizeTurnWithCrateState(boardAfterMove, nextTurn, baseMessage, remainingCrates, {
      destroyedCrate: true,
      skipDropAttempt: true,
    }, "player");
  };

  const resetCrates = () => setCrateByTile({});

  return {
    crateByTile,
    setCrateByTile,
    pendingCrateChoice,
    applyResolution,
    applyDoubleBlindBoardDecoys,
    handleCrateChoiceTake,
    handleCrateChoiceDestroy,
    resetCrates,
  };
}
