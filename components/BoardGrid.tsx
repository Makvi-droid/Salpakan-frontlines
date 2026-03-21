import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { appTheme } from "@/constants/theme";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../constants/constants";
import {
    getTileColumn,
    getTileRow,
    getVisibleLabel,
    isPlayerSetupZoneTileIndex,
} from "../scripts/gameLogic";
import type { BoardPiece, Phase, PieceDefinition, Side } from "../scripts/types";

const CLOSED_EYE_ICON = require("../assets/images/closed-eye.png");
const CHALLENGE_ICON = require("../assets/images/challenge.png");

function getUpgradeAbbrev(upgrade?: BoardPiece["upgrade"]) {
  if (upgrade === "iron-veil") return "IV";
  if (upgrade === "double-blind") return "DB";
  if (upgrade === "martyrs-eye") return "ME";
  return "";
}

type Props = {
  phase: Phase;
  boardTiles: { index: number }[];
  placedByTileIndex: Record<number, string>;
  battleBoard: Record<number, BoardPiece>;
  moveSourceTileIndex: number | null;
  selectedBattleTileIndex: number | null;
  selectedBattleMoves: number[];
  lastMoveTrail: { from: number; to: number; side: Side } | null;
  challengeTargetTiles: number[];
  crateTiles: number[];
  showSetupZoneHint: boolean;
  boardWidth: number;
  pieceById: Record<string, PieceDefinition>;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  marginBottom: number;
  onTilePress: (tileIndex: number) => void;
  onChallengePress: (tileIndex: number) => void;
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
  lastMoveTrail,
  challengeTargetTiles,
  crateTiles,
  showSetupZoneHint,
  boardWidth,
  pieceById,
  rf,
  rs,
  rsv,
  marginBottom,
  onTilePress,
  onChallengePress,
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
              const isChallengeTarget =
                phase !== "formation" &&
                challengeTargetTiles.includes(tile.index);
              const showLastMoveTrail =
                phase !== "formation" && selectedBattleTileIndex === null;
              const isTrailFrom =
                showLastMoveTrail && lastMoveTrail?.from === tile.index;
              const isTrailTo =
                showLastMoveTrail && lastMoveTrail?.to === tile.index;
              const isCrateTile =
                phase !== "formation" &&
                !battlePiece &&
                crateTiles.includes(tile.index);

              const visiblePiece = battlePiece
                ? getVisibleLabel(battlePiece, pieceById, "player")
                : null;
              const playerUpgradeTag =
                phase !== "formation" && battlePiece?.side === "player"
                  ? getUpgradeAbbrev(battlePiece.upgrade)
                  : "";
              const showIronVeilIconOnBoard =
                phase !== "formation" &&
                battlePiece?.side === "ai" &&
                !battlePiece.revealedToPlayer &&
                battlePiece.upgrade === "iron-veil" &&
                battlePiece.ironVeilKnownToPlayer === true;

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
                    isCrateTile && styles.crateTile,
                    isTrailFrom && styles.trailFrom,
                    isTrailTo && styles.trailTo,
                    (isMoveSource || isSelectedBattle) && styles.sourceSelected,
                    isBattleTarget && styles.battleTarget,
                    isChallengeTarget && styles.challengeTarget,
                  ]}
                  onPress={() => onTilePress(tile.index)}
                  activeOpacity={0.8}
                >
                  {formationPiece ? (
                    <Text style={[styles.pieceText, { fontSize: rf(10) }]}> 
                      {formationPiece.shortLabel}
                    </Text>
                  ) : null}
                  {battlePiece ? (
                    showIronVeilIconOnBoard ? (
                      <Image
                        source={CLOSED_EYE_ICON}
                        style={[{ width: rf(16), height: rf(16), tintColor: "white" }]}
                        resizeMode="contain"
                      />
                    ) : isChallengeTarget ? null : (
                      <Text
                        style={[
                          styles.pieceText,
                          { fontSize: rf(10) },
                          battlePiece.side === "ai" &&
                            !battlePiece.revealedToPlayer &&
                            styles.hiddenEnemyText,
                          isChallengeTarget && styles.challengeTargetPieceText,
                        ]}
                      >
                        {visiblePiece}
                      </Text>
                    )
                  ) : null}
                  {playerUpgradeTag ? (
                    <View style={styles.playerUpgradeBadge}>
                      <Text style={[styles.playerUpgradeText, { fontSize: rf(6.5) }]}>
                        {playerUpgradeTag}
                      </Text>
                    </View>
                  ) : null}
                  {isCrateTile ? (
                    <Image
                      source={require("../assets/images/crate-box.png")}
                      style={styles.crateImage}
                      resizeMode="contain"
                    />
                  ) : null}

                  {/* Challenge button — floats above the enemy tile */}
                  {isChallengeTarget ? (
                    <TouchableOpacity
                      style={[
                        styles.challengeBtn,
                        {
                          borderRadius: rf(2),
                        },
                      ]}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        onChallengePress(tile.index);
                      }}
                      activeOpacity={0.85}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Image
                        source={CHALLENGE_ICON}
                        style={{ width: "84%", height: "84%", opacity: 0.98 }}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
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
    borderColor: "#008000",
    backgroundColor: "rgba(0, 128, 0, 0.16)",
  },
  restrictedHint: {
    borderWidth: appTheme.borderWidth.regular,
    borderColor: "#B00000",
    backgroundColor: "rgba(176, 0, 0, 0.16)",
    borderStyle: "dashed",
    opacity: 1,
  },
  placedTile: {
    backgroundColor: appTheme.colors.board.piece,
    borderColor: appTheme.colors.board.pieceEdge,
  },
  playerTile: {
    backgroundColor: "#2B1C14",
    borderColor: appTheme.colors.brassBright,
  },
  playerUpgradeBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 14,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: "#0F5A1A",
    borderWidth: 1,
    borderColor: "#8DE09D",
    alignItems: "center",
    justifyContent: "center",
  },
  playerUpgradeText: {
    color: "#F2FFF3",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  aiTile: { backgroundColor: "#ffebee", borderColor: "#E0B55D" },
  crateTile: {
    backgroundColor: "#2D2A20",
    borderColor: "#D5B46E",
    borderWidth: appTheme.borderWidth.regular,
  },
  crateImage: {
    width: "96%",
    height: "96%",
  },
  sourceSelected: {
    borderColor: appTheme.colors.brassBright,
    borderWidth: appTheme.borderWidth.thick,
  },
  trailFrom: {
    borderColor: "#eee600",
    borderStyle: "dashed",
    borderWidth: appTheme.borderWidth.regular,
  },
  trailTo: {
    borderColor: "#eee600",
    borderWidth: appTheme.borderWidth.thick,
  },
  battleTarget: {
    borderColor: "#008000",
    borderWidth: appTheme.borderWidth.thick,
    backgroundColor: "rgba(89, 199, 115, 0.16)",
  },
  challengeTarget: {
    borderColor: "#FFA500",
    borderWidth: appTheme.borderWidth.thick,
    backgroundColor: "rgba(207, 90, 82, 0.22)",
    shadowColor: "#FFA500",
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  challengeBtn: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(122, 30, 26, 0.32)",
    borderWidth: 1,
    borderColor: "#FFE082",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  pieceText: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
  },
  hiddenEnemyText: { color: appTheme.colors.parchment },
  challengeTargetPieceText: {
    color: "#FFF4DA",
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  hint: {
    color: appTheme.surfaces.instruction.textColor,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
  },
});
