import React, { useRef } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";

import { appTheme } from "@/constants/theme";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../constants/constants";
import {
  getTileColumn,
  getTileRow,
  getVisibleLabel,
  isPlayerSetupZoneTileIndex,
} from "../scripts/gameLogic";
import type {
  BoardPiece,
  Phase,
  PieceDefinition,
  Side,
} from "../scripts/types";

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
  // flag swap
  flagSwapAllyTiles: number[];
  flagSwapActive: boolean;
  // drag props
  draggingPieceId: string | null;
  draggingFromTile: number | null;
  dragOverTileIndex: number | null;
  onDragStartFromBoard: (tileIndex: number) => void;
  onDragEnterTile: (tileIndex: number) => void;
  onDragEnd: (targetTileIndex: number | null) => void;
  onTilePress: (tileIndex: number) => void;
  onChallengePress: (tileIndex: number) => void;
  boardHint: string;
};

/**
 * DropZoneTile
 * Wraps each formation-phase tile with a PanGestureHandler that fires
 * onDragEnterTile when a finger passes over it and onDragEnd when released.
 * Long-pressing a placed piece starts a board-to-board drag via onDragStartFromBoard.
 */
function DropZoneTile({
  tileIndex,
  isSetupZone,
  isDragOver,
  isDraggingSource,
  isDragging,
  children,
  style,
  onPress,
  onDragStartFromBoard,
  onDragEnterTile,
  onDragEnd,
}: {
  tileIndex: number;
  isSetupZone: boolean;
  isDragOver: boolean;
  isDraggingSource: boolean;
  isDragging: boolean;
  children: React.ReactNode;
  style: any;
  onPress: () => void;
  onDragStartFromBoard: (tileIndex: number) => void;
  onDragEnterTile: (tileIndex: number) => void;
  onDragEnd: (tileIndex: number | null) => void;
}) {
  const entered = useRef(false);

  const handlePan = ({ nativeEvent }: any) => {
    if (!isDragging) return;

    if (
      nativeEvent.state === State.BEGAN ||
      nativeEvent.state === State.ACTIVE
    ) {
      if (!entered.current) {
        entered.current = true;
        onDragEnterTile(tileIndex);
      }
    }

    if (
      nativeEvent.state === State.END ||
      nativeEvent.state === State.CANCELLED ||
      nativeEvent.state === State.FAILED
    ) {
      entered.current = false;
      if (nativeEvent.state === State.END) {
        onDragEnd(tileIndex);
      }
    }
  };

  return (
    <PanGestureHandler
      onHandlerStateChange={handlePan}
      enabled={isDragging && isSetupZone}
      minDist={0}
    >
      <TouchableOpacity
        style={[
          style,
          isDragOver && styles.dropZoneHovered,
          isDraggingSource && styles.draggingSourceTile,
        ]}
        onPress={onPress}
        onLongPress={() => onDragStartFromBoard(tileIndex)}
        delayLongPress={220}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    </PanGestureHandler>
  );
}

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
  flagSwapAllyTiles,
  flagSwapActive,
  draggingPieceId,
  draggingFromTile,
  dragOverTileIndex,
  onDragStartFromBoard,
  onDragEnterTile,
  onDragEnd,
  onTilePress,
  onChallengePress,
  boardHint,
}: Props) {
  const isDragging = draggingPieceId !== null;

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

              // ── Flag swap: ally highlight ──────────────────────────────────
              const isFlagSwapAlly =
                phase !== "formation" && flagSwapAllyTiles.includes(tile.index);

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

              const isHiddenAI =
                battlePiece?.side === "ai" && !battlePiece.revealedToPlayer;

              const playerUpgradeTag =
                phase !== "formation" && battlePiece?.side === "player"
                  ? getUpgradeAbbrev(battlePiece.upgrade)
                  : "";

              // ── Veteran badge flag ──────────────────────────────────────
              const isPlayerVeteran =
                phase !== "formation" &&
                battlePiece?.side === "player" &&
                battlePiece.isVeteran === true;

              const isStunnedPiece =
                phase !== "formation" &&
                battlePiece?.stunnedTurnsLeft !== undefined &&
                battlePiece.stunnedTurnsLeft > 0;

              const showIronVeilIconOnBoard =
                phase !== "formation" &&
                battlePiece?.side === "ai" &&
                !battlePiece.revealedToPlayer &&
                battlePiece.upgrade === "iron-veil" &&
                battlePiece.ironVeilKnownToPlayer === true;

              // Drag-specific flags
              const isDragOver =
                isDragging && dragOverTileIndex === tile.index && isSetupZone;
              const isDraggingSource =
                isDragging && draggingFromTile === tile.index;

              const isStunnedEnemy =
                isStunnedPiece && battlePiece?.side === "ai";

              const tileStyle = [
                styles.tile,
                isDark ? styles.tileDark : styles.tileLight,
                isSetupZone && styles.setupZoneBase,
                showSetupZoneHint && isSetupZone && styles.setupZoneHint,
                showSetupZoneHint && !isSetupZone && styles.restrictedHint,
                formationPiece && styles.placedTile,
                battlePiece?.side === "player" && styles.playerTile,
                isHiddenAI && styles.aiTileHidden,
                battlePiece?.side === "ai" &&
                  battlePiece.revealedToPlayer &&
                  styles.aiTileRevealed,
                isCrateTile && styles.crateTile,
                isStunnedEnemy && styles.electricTile,
                isTrailFrom && styles.trailFrom,
                isTrailTo && styles.trailTo,
                (isMoveSource || isSelectedBattle) && styles.sourceSelected,
                isBattleTarget && styles.battleTarget,
                isChallengeTarget && styles.challengeTarget,
                isStunnedPiece && styles.stunTile,
                // Veteran tile gets a subtle gold border glow
                isPlayerVeteran && styles.veteranTile,
                // Flag swap ally — gold shimmer, applied last so it wins
                isFlagSwapAlly && styles.flagSwapAllyTarget,
              ];

              // ── Formation phase: DropZoneTile ────────────────────────────
              if (phase === "formation") {
                return (
                  <DropZoneTile
                    key={tile.index}
                    tileIndex={tile.index}
                    isSetupZone={isSetupZone}
                    isDragOver={isDragOver}
                    isDraggingSource={isDraggingSource}
                    isDragging={isDragging}
                    style={tileStyle}
                    onPress={() => onTilePress(tile.index)}
                    onDragStartFromBoard={onDragStartFromBoard}
                    onDragEnterTile={onDragEnterTile}
                    onDragEnd={onDragEnd}
                  >
                    {formationPiece ? (
                      <Text style={[styles.pieceText, { fontSize: rf(10) }]}>
                        {formationPiece.shortLabel}
                      </Text>
                    ) : null}

                    {/* Glowing drop target indicator on empty hovered tile */}
                    {isDragOver && !formationPiece ? (
                      <View style={styles.dropIndicator} />
                    ) : null}
                  </DropZoneTile>
                );
              }

              // ── Battle phase: plain TouchableOpacity ─────────────────────
              return (
                <TouchableOpacity
                  key={tile.index}
                  style={tileStyle}
                  onPress={() => onTilePress(tile.index)}
                  activeOpacity={0.8}
                >
                  {battlePiece ? (
                    showIronVeilIconOnBoard ? (
                      <Image
                        source={CLOSED_EYE_ICON}
                        style={[
                          { width: rf(16), height: rf(16), tintColor: "white" },
                        ]}
                        resizeMode="contain"
                      />
                    ) : isChallengeTarget ? null : (
                      <Text
                        style={[
                          styles.pieceText,
                          { fontSize: rf(10) },
                          isHiddenAI && styles.hiddenEnemyText,
                          !isHiddenAI &&
                            battlePiece.side === "ai" &&
                            styles.revealedEnemyText,
                          isChallengeTarget && styles.challengeTargetPieceText,
                        ]}
                      >
                        {visiblePiece}
                      </Text>
                    )
                  ) : null}

                  {/* Upgrade badge — top-right */}
                  {playerUpgradeTag ? (
                    <View style={styles.playerUpgradeBadge}>
                      <Text
                        style={[
                          styles.playerUpgradeText,
                          { fontSize: rf(6.5) },
                        ]}
                      >
                        {playerUpgradeTag}
                      </Text>
                    </View>
                  ) : null}

                  {/* Veteran badge — bottom-left, opposite the upgrade badge */}
                  {isPlayerVeteran ? (
                    <View style={styles.veteranBadge}>
                      <Text style={[styles.veteranStar, { fontSize: rf(7) }]}>
                        ★
                      </Text>
                    </View>
                  ) : null}

                  {/* Stun badge — top-left */}
                  {isStunnedPiece ? (
                    <View style={styles.stunBadge}>
                      <Text style={[styles.stunBadgeText, { fontSize: rf(6) }]}>
                        {battlePiece?.stunnedTurnsLeft}
                      </Text>
                    </View>
                  ) : null}

                  {/* Electro overlay for stunned enemies */}
                  {isStunnedEnemy ? (
                    <View style={styles.electricOverlay} pointerEvents="none">
                      <Text
                        style={[
                          styles.electricOverlayText,
                          { fontSize: rf(11) },
                        ]}
                      >
                        ⚡
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

                  {isChallengeTarget ? (
                    <TouchableOpacity
                      style={[styles.challengeBtn, { borderRadius: rf(2) }]}
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

                  {/* Flag swap ally indicator — small swap icon overlay */}
                  {isFlagSwapAlly ? (
                    <View style={styles.swapIndicator} pointerEvents="none">
                      <Text style={[styles.swapIcon, { fontSize: rf(8) }]}>
                        ⇄
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <Text style={[styles.hint, { fontSize: rf(10), marginTop: rsv(10) }]}>
        {isDragging
          ? "Drag over a deployment tile and release to place."
          : boardHint}
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
  // ── Veteran tile: subtle gold shimmer border (layered over playerTile) ──────
  veteranTile: {
    borderColor: "#F0C040",
    borderWidth: appTheme.borderWidth.thick,
    shadowColor: "#F0C040",
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  // ── Flag swap ally: brass-gold pulse border ──────────────────────────────────
  flagSwapAllyTarget: {
    borderColor: appTheme.colors.brassBright,
    borderWidth: appTheme.borderWidth.thick,
    backgroundColor: "rgba(199, 163, 84, 0.22)",
    shadowColor: appTheme.colors.brassBright,
    shadowOpacity: 0.42,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
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
  // ── Veteran badge: bottom-left gold star pill ────────────────────────────────
  veteranBadge: {
    position: "absolute",
    bottom: 2,
    left: 2,
    minWidth: 14,
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: "#2B1C00",
    borderWidth: 1,
    borderColor: "#F0C040",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F0C040",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 4,
    elevation: 4,
  },
  veteranStar: {
    color: "#F0C040",
    fontWeight: "700",
    lineHeight: 12,
  },
  stunTile: {
    borderColor: "#2A93E8",
    borderWidth: appTheme.borderWidth.thick,
    backgroundColor: "rgba(47, 117, 179, 0.2)",
  },
  electricTile: {
    borderColor: "#4ad0ff",
    borderWidth: appTheme.borderWidth.regular,
    backgroundColor: "rgba(70, 170, 255, 0.18)",
    shadowColor: "#8ef1ff",
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  stunBadge: {
    position: "absolute",
    top: 2,
    left: 2,
    minWidth: 14,
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: "#005AA3",
    borderWidth: 1,
    borderColor: "#94D2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  stunBadgeText: {
    color: "#FFFFFF",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    lineHeight: 12,
  },
  electricOverlay: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 14,
    backgroundColor: "rgba(70, 170, 255, 0.88)",
    alignItems: "center",
    justifyContent: "center",
  },
  electricOverlayText: {
    color: "#FFFFFF",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    lineHeight: 14,
  },
  // ── Swap indicator overlay (⇄ icon inside ally tile) ────────────────────────
  swapIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  swapIcon: {
    color: appTheme.colors.brassBright,
    fontWeight: "700",
    lineHeight: 12,
  },
  aiTileHidden: { backgroundColor: "#1A0008", borderColor: "#7A2A3A" },
  aiTileRevealed: { backgroundColor: "#750012", borderColor: "#E0B55D" },
  crateTile: {
    backgroundColor: "#2D2A20",
    borderColor: "#D5B46E",
    borderWidth: appTheme.borderWidth.regular,
  },
  crateImage: { width: "96%", height: "96%" },
  sourceSelected: {
    borderColor: appTheme.colors.brassBright,
    borderWidth: appTheme.borderWidth.thick,
  },
  trailFrom: {
    borderColor: "#eee600",
    borderStyle: "dashed",
    borderWidth: appTheme.borderWidth.regular,
  },
  trailTo: { borderColor: "#eee600", borderWidth: appTheme.borderWidth.thick },
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
  hiddenEnemyText: {
    color: "#FFFFFF",
    fontWeight: "700",
    textShadowColor: "rgba(255, 200, 200, 0.5)",
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 0 },
  },
  revealedEnemyText: { color: appTheme.colors.parchment },
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
  // ── Drag & drop ─────────────────────────────────────────────────────────────
  dropZoneHovered: {
    borderColor: appTheme.colors.brassBright,
    borderWidth: appTheme.borderWidth.thick,
    backgroundColor: "rgba(199, 163, 84, 0.28)",
  },
  draggingSourceTile: {
    opacity: 0.35,
  },
  dropIndicator: {
    width: "45%",
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: "rgba(199, 163, 84, 0.55)",
    borderWidth: 1,
    borderColor: appTheme.colors.brassBright,
  },
});
