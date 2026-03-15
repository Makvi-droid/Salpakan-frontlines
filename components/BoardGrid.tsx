import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { appTheme } from "@/constants/theme";
import {
  getTileColumn,
  getTileRow,
  getVisibleLabel,
  isPlayerSetupZoneTileIndex,
} from "../app/gameLogic";
import type { BoardPiece, Phase, PieceDefinition } from "../app/types";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../constants/constants";

type Props = {
  phase: Phase;
  boardTiles: { index: number }[];
  placedByTileIndex: Record<number, string>;
  battleBoard: Record<number, BoardPiece>;
  moveSourceTileIndex: number | null;
  selectedBattleTileIndex: number | null;
  selectedBattleMoves: number[];
  showSetupZoneHint: boolean;
  boardWidth: number;
  pieceById: Record<string, PieceDefinition>;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  marginBottom: number;
  onTilePress: (tileIndex: number) => void;
  boardHint: string;
};

export function BoardGrid({
  phase,
  boardTiles,
  placedByTileIndex,
  battleBoard,
  moveSourceTileIndex,
  selectedBattleTileIndex,
  selectedBattleMoves,
  showSetupZoneHint,
  boardWidth,
  pieceById,
  rf,
  rs,
  rsv,
  marginBottom,
  onTilePress,
  boardHint,
}: Props) {
  return (
    <View style={[styles.wrap, { marginBottom }]}>
      <View style={[styles.outerShell, { width: boardWidth, padding: rs(8) }]}>
        <View style={styles.frame}>
          <View style={styles.grid}>
            {boardTiles.map((tile) => {
              const col = getTileColumn(tile.index);
              const row = getTileRow(tile.index);
              const isDark = (col + row) % 2 === 1;

              const formationPieceId =
                phase === "formation" ? placedByTileIndex[tile.index] : null;
              const formationPiece = formationPieceId
                ? pieceById[formationPieceId]
                : null;
              const battlePiece =
                phase !== "formation" ? battleBoard[tile.index] : undefined;

              const isMoveSource =
                phase === "formation" && moveSourceTileIndex === tile.index;
              const isSetupZone =
                phase === "formation" && isPlayerSetupZoneTileIndex(tile.index);
              const isSelectedBattle =
                phase !== "formation" && selectedBattleTileIndex === tile.index;
              const isBattleTarget =
                phase !== "formation" &&
                selectedBattleMoves.includes(tile.index);

              const visiblePiece = battlePiece
                ? getVisibleLabel(battlePiece, pieceById, "player")
                : null;

              return (
                <TouchableOpacity
                  key={tile.index}
                  style={[
                    styles.tile,
                    isDark ? styles.tileDark : styles.tileLight,
                    isSetupZone && styles.setupZoneBase,
                    showSetupZoneHint && isSetupZone && styles.setupZoneHint,
                    showSetupZoneHint && !isSetupZone && styles.restrictedHint,
                    formationPiece && styles.placedTile,
                    battlePiece?.side === "player" && styles.playerTile,
                    battlePiece?.side === "ai" && styles.aiTile,
                    (isMoveSource || isSelectedBattle) && styles.sourceSelected,
                    isBattleTarget && styles.battleTarget,
                  ]}
                  onPress={() => onTilePress(tile.index)}
                  activeOpacity={0.8}
                >
                  {formationPiece ? (
                    <Text style={[styles.pieceText, { fontSize: rf(9) }]}>
                      {formationPiece.shortLabel}
                    </Text>
                  ) : null}
                  {battlePiece ? (
                    <Text
                      style={[
                        styles.pieceText,
                        { fontSize: rf(9) },
                        battlePiece.side === "ai" &&
                          !battlePiece.revealedToPlayer &&
                          styles.hiddenEnemyText,
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
      <Text style={[styles.hint, { fontSize: rf(10), marginTop: rsv(10) }]}>
        {boardHint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignItems: "center", justifyContent: "center" },
  outerShell: {
    aspectRatio: 9 / 8,
    backgroundColor: appTheme.colors.board.shell,
    borderWidth: appTheme.borderWidth.thick,
    borderColor: appTheme.colors.board.shellBorder,
    borderRadius: appTheme.radius.lg,
    ...appTheme.shadow.hard,
  },
  frame: {
    flex: 1,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.board.frameBorder,
    backgroundColor: appTheme.colors.board.frame,
    overflow: "hidden",
    padding: 3,
  },
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: appTheme.colors.board.grid,
  },
  tile: {
    width: `${100 / BOARD_WIDTH}%`,
    height: `${100 / BOARD_HEIGHT}%`,
    borderWidth: appTheme.borderWidth.thin,
    borderColor: appTheme.colors.board.line,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLight: { backgroundColor: appTheme.colors.board.tileLight },
  tileDark: { backgroundColor: appTheme.colors.board.tileDark },
  setupZoneBase: { shadowColor: "#D3B56A" },
  setupZoneHint: {
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.board.setupHint,
  },
  restrictedHint: { opacity: 0.42, borderStyle: "dashed" },
  placedTile: {
    backgroundColor: appTheme.colors.board.piece,
    borderColor: appTheme.colors.board.pieceEdge,
  },
  playerTile: {
    backgroundColor: "#2B1C14",
    borderColor: appTheme.colors.brassBright,
  },
  aiTile: { backgroundColor: "#4A1F19", borderColor: "#E0B55D" },
  sourceSelected: {
    borderColor: appTheme.colors.brassBright,
    borderWidth: appTheme.borderWidth.thick,
  },
  battleTarget: {
    borderColor: appTheme.colors.brassBright,
    borderWidth: appTheme.borderWidth.thick,
  },
  pieceText: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
  },
  hiddenEnemyText: { color: appTheme.colors.parchment },
  hint: {
    color: appTheme.surfaces.instruction.textColor,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
  },
});
