import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ScreenShell from "@/components/ScreenShell";
import { appTheme } from "@/constants/theme";
import { clamp, useResponsiveTokens } from "@/hooks/useResponsiveTokens";

const BOARD_WIDTH = 9;
const BOARD_HEIGHT = 8;
const DOUBLE_TAP_MS = 300;
const FIRST_COLUMN_LABELS = ["Flag", "Spy", "Private", "Sgt", "2nd Lt"] as const;
const SECOND_COLUMN_LABELS = ["1st Lt", "Cpt", "Major", "Lt Col", "Col"] as const;
const THIRD_COLUMN_LABELS = ["1 Star\nGeneral", "2 Star\nGeneral", "3 Star\nGeneral", "4 Star\nGeneral", "5 Star\nGeneral"] as const;

type PieceDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  initialCount: number;
};

export default function GameScreen() {
  const router = useRouter();
  const { level } = useLocalSearchParams<{ level?: string }>();
  const [isInventoryExpanded, setIsInventoryExpanded] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showReadyModal, setShowReadyModal] = useState(false);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [placedByTileIndex, setPlacedByTileIndex] = useState<Record<number, string>>({});
  const [moveSourceTileIndex, setMoveSourceTileIndex] = useState<number | null>(null);
  const [lastTap, setLastTap] = useState<{ tileIndex: number; time: number } | null>(null);

  const { width, safeHeight, rs, rsv, rf, maxContentWidth, isCompactHeight, isUltraCompactHeight, insets } = useResponsiveTokens();
  const contentWidth = Math.min(maxContentWidth, rs(520));
  const shellTopPadding = rsv(isUltraCompactHeight ? 4 : isCompactHeight ? 6 : 8);
  const shellBottomPadding = rsv(isUltraCompactHeight ? 4 : isCompactHeight ? 6 : 8);
  const verticalGap = rsv(isUltraCompactHeight ? 4 : 6);
  const topMenuHeight = rsv(isUltraCompactHeight ? 34 : isCompactHeight ? 38 : 42);
  const setupHeaderHeight = rsv(isUltraCompactHeight ? 74 : isCompactHeight ? 84 : 98);
  const actionRowHeight = rsv(isUltraCompactHeight ? 38 : isCompactHeight ? 42 : 48);
  const inventoryHeaderHeight = rsv(isUltraCompactHeight ? 42 : 48);
  const inventoryExpandedHeight = rsv(isUltraCompactHeight ? 72 : isCompactHeight ? 84 : 98);
  const instructionHeight = isUltraCompactHeight ? 0 : rsv(18);
  const fixedSectionHeight =
    topMenuHeight +
    setupHeaderHeight +
    actionRowHeight +
    inventoryHeaderHeight +
    instructionHeight +
    verticalGap * 5 +
    (isInventoryExpanded ? inventoryExpandedHeight + verticalGap : 0);
  const contentHeightBudget = safeHeight - shellTopPadding - shellBottomPadding;
  const boardAreaBudget = contentHeightBudget - fixedSectionHeight;
  const boardHeightBudget = clamp(boardAreaBudget, rsv(232), rsv(isCompactHeight ? 340 : 392));
  const boardWidth = clamp(boardHeightBudget * (9 / 8), rs(288), Math.min(contentWidth, width * 0.94));

  const boardTiles = Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }, (_, index) => ({ index }));

  function getPieceId(column: number, row: number, label: string) {
    return `${column}-${row}-${label.replace(/\n/g, " ").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
  }

  const pieceDefinitions: PieceDefinition[] = useMemo(() => {
    // The inventory is generated from rank labels so setup rules stay in one place
    // and teammates can adjust counts without chasing hard-coded board state.
    const columns = [FIRST_COLUMN_LABELS, SECOND_COLUMN_LABELS, THIRD_COLUMN_LABELS];
    const shortLabelByName: Record<string, string> = {
      Flag: "F", Spy: "Sp", Private: "Pvt", Sgt: "Sgt", "2nd Lt": "2Lt", "1st Lt": "1Lt",
      Cpt: "Cpt", Major: "Maj", "Lt Col": "LtC", Col: "Col", "1 Star\nGeneral": "1*",
      "2 Star\nGeneral": "2*", "3 Star\nGeneral": "3*", "4 Star\nGeneral": "4*", "5 Star\nGeneral": "5*",
    };
    return columns.flatMap((labels, column) =>
      labels.map((label, row) => {
        const id = getPieceId(column, row, label);
        const initialCount = label === "Spy" ? 2 : label === "Private" ? 6 : 1;
        return { id, label, initialCount, shortLabel: shortLabelByName[label] ?? label };
      })
    );
  }, []);

  const pieceById = useMemo(() => Object.fromEntries(pieceDefinitions.map((piece) => [piece.id, piece])), [pieceDefinitions]);

  const initialPieceCountById: Record<string, number> = useMemo(() => {
    const initialCounts: Record<string, number> = {};
    pieceDefinitions.forEach((piece) => {
      initialCounts[piece.id] = piece.initialCount;
    });
    return initialCounts;
  }, [pieceDefinitions]);

  const pieceCountById: Record<string, number> = useMemo(() => {
    // Remaining counts are derived from placements instead of tracked separately,
    // which keeps the inventory UI and board state from drifting out of sync.
    const remaining = { ...initialPieceCountById };
    Object.values(placedByTileIndex).forEach((pieceId) => {
      if (remaining[pieceId] !== undefined) {
        remaining[pieceId] = Math.max(0, remaining[pieceId] - 1);
      }
    });
    return remaining;
  }, [initialPieceCountById, placedByTileIndex]);

  const showSetupZoneHint = selectedPieceId !== null || moveSourceTileIndex !== null;
  const hasPlacedPieces = Object.keys(placedByTileIndex).length > 0;
  const totalUnplacedCount = useMemo(() => Object.values(pieceCountById).reduce((sum, count) => sum + count, 0), [pieceCountById]);
  // "Ready" only unlocks once the opening formation is fully committed.
  const isReadyEnabled = totalUnplacedCount === 0;
  const selectedPiece = selectedPieceId ? pieceById[selectedPieceId] : null;

  const handlePieceButtonPress = (pieceId: string) => {
    setMoveSourceTileIndex(null);
    setSelectedPieceId((current) => (current === pieceId ? null : pieceId));
  };

  const isSetupZoneTileIndex = (tileIndex: number) => {
    // Players can only place or rearrange pieces inside their starting formation rows.
    const tileY = Math.floor(tileIndex / BOARD_WIDTH);
    return tileY >= BOARD_HEIGHT - 3;
  };

  const handleResetBoard = () => {
    setPlacedByTileIndex({});
    setMoveSourceTileIndex(null);
    setSelectedPieceId(null);
    setLastTap(null);
  };

  const clearSelectionState = () => {
    setMoveSourceTileIndex(null);
    setSelectedPieceId(null);
  };

  const tryHandleDoubleTapRemove = (tileIndex: number, now: number) => {
    // Double tap is the "remove from board" shortcut so players do not need a
    // separate delete mode while they are still composing a formation.
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
    clearSelectionState();
    return true;
  };

  const tryHandleMoveFromSource = (tileIndex: number) => {
    if (moveSourceTileIndex === null) {
      return false;
    }
    // When a source tile is active, the next valid tap either cancels, moves,
    // or swaps positions with another piece in the setup zone.
    const movingPieceId = placedByTileIndex[moveSourceTileIndex];
    if (!movingPieceId) {
      setMoveSourceTileIndex(null);
      return true;
    }
    if (tileIndex === moveSourceTileIndex) {
      clearSelectionState();
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
    clearSelectionState();
    return true;
  };

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
    clearSelectionState();
  };

  const handleTilePress = (tileIndex: number) => {
    if (!isSetupZoneTileIndex(tileIndex)) {
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
    // Random setup preserves the exact piece counts but shuffles both the
    // available setup tiles and the piece bag to create a legal opening fast.
    const setupTileIndexes = boardTiles.filter((tile) => isSetupZoneTileIndex(tile.index)).map((tile) => tile.index);
    const pieceBag = pieceDefinitions.flatMap((piece) => Array.from({ length: piece.initialCount }, () => piece.id));
    const shuffledTiles = [...setupTileIndexes];
    for (let index = shuffledTiles.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const currentValue = shuffledTiles[index];
      shuffledTiles[index] = shuffledTiles[randomIndex];
      shuffledTiles[randomIndex] = currentValue;
    }
    const shuffledPieces = [...pieceBag];
    for (let index = shuffledPieces.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const currentValue = shuffledPieces[index];
      shuffledPieces[index] = shuffledPieces[randomIndex];
      shuffledPieces[randomIndex] = currentValue;
    }
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

  const difficultyLabel = level === "easy" ? "Recruit" : level === "medium" ? "Vanguard" : level === "hard" ? "Warlord" : "Command";

  useEffect(() => {
    if (isCompactHeight) {
      setIsInventoryExpanded(false);
    }
  }, [isCompactHeight]);

  return (
    <View style={styles.safeArea}>
      <ScreenShell
        style={styles.pageFrame}
        maxWidth={contentWidth}
        horizontalPadding={rs(10)}
        topPadding={shellTopPadding}
        bottomPadding={shellBottomPadding}
      >
        <View style={[styles.container, { maxWidth: contentWidth }]}>
          <View style={[styles.topMenuRow, { minHeight: topMenuHeight, marginBottom: verticalGap }]}>
            <TouchableOpacity style={[styles.menuButton, { width: rs(86), paddingVertical: rsv(4) }]} onPress={() => setShowQuitModal(true)}>
              <View style={styles.menuArrowIcon}>
                <View style={styles.menuArrowTip} />
                <View style={styles.menuArrowBody} />
              </View>
              <Text style={[styles.menuButtonText, { fontSize: rf(14) }]}>Menu</Text>
            </TouchableOpacity>
            <Text style={[styles.topRowTitle, { fontSize: rf(isCompactHeight ? 26 : 30) }]}>Salpakan</Text>
            <View style={[styles.menuSpacer, { width: rs(86) }]} />
          </View>

          <View style={[styles.setupBox, { minHeight: setupHeaderHeight, marginBottom: verticalGap, paddingTop: rsv(8), paddingBottom: rsv(8) }]}>
            <View style={[styles.setupHeaderRow, { marginBottom: rsv(isUltraCompactHeight ? 4 : 6) }]}>
              <View>
                <Text style={[styles.setupLabel, { fontSize: rf(10) }]}>FORMATION PHASE</Text>
                <Text style={[styles.setupTitle, { fontSize: rf(isCompactHeight ? 20 : 24) }]}>Prepare the board</Text>
              </View>
              <View style={[styles.difficultyBadge, { paddingHorizontal: rs(10), paddingVertical: rsv(5), borderRadius: rs(14) }]}>
                <Text style={[styles.difficultyBadgeText, { fontSize: rf(10) }]}>{difficultyLabel}</Text>
              </View>
            </View>
            <View style={[styles.turnIndicatorRow, isUltraCompactHeight && styles.turnIndicatorRowCompact]}>
              <View style={styles.turnIndicatorItem}>
                <View style={[styles.turnDot, { width: rs(12), height: rs(12), borderRadius: rs(6) }]} />
                <Text style={[styles.turnIndicatorText, { fontSize: rf(13) }]}>Your turn</Text>
              </View>
              <View style={styles.turnIndicatorItem}>
                <View style={[styles.turnDot, { width: rs(12), height: rs(12), borderRadius: rs(6) }]} />
                <Text style={[styles.turnIndicatorText, { fontSize: rf(13) }]}>Enemy turn</Text>
              </View>
            </View>
          </View>

          <View style={[styles.actionRow, { minHeight: actionRowHeight, marginBottom: verticalGap }]}>
            <Text style={[styles.subtitle, { fontSize: rf(isCompactHeight ? 18 : 21) }]}>Set your formation</Text>
            <View style={[styles.actionButtons, { gap: rs(8) }]}>
              <TouchableOpacity style={[styles.actionButton, { paddingVertical: rsv(5), paddingHorizontal: rs(12), borderRadius: rs(10) }]} onPress={handleRandomizeSet}>
                <Text style={[styles.actionButtonText, { fontSize: rf(12) }]}>Random</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { paddingVertical: rsv(5), paddingHorizontal: rs(12), borderRadius: rs(10) },
                  isReadyEnabled ? styles.readyButtonEnabled : styles.readyButtonDisabled,
                ]}
                disabled={!isReadyEnabled}
                onPress={() => setShowReadyModal(true)}
              >
                <Text style={[styles.actionButtonText, { fontSize: rf(12) }, isReadyEnabled ? styles.readyButtonTextEnabled : styles.readyButtonTextDisabled]}>
                  Ready
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.boardWrap, { marginBottom: verticalGap }]}>
            <View style={[styles.boardOuterShell, { width: boardWidth, padding: rs(8) }]}>
              <View style={styles.boardFrame}>
                <View style={styles.boardGrid}>
                  {boardTiles.map((tile) => {
                    const placedPieceId = placedByTileIndex[tile.index];
                    const placedPiece = placedPieceId ? pieceById[placedPieceId] : null;
                    const isMoveSource = moveSourceTileIndex === tile.index;
                    const isSetupZoneTile = isSetupZoneTileIndex(tile.index);
                    const tileColumn = tile.index % BOARD_WIDTH;
                    const tileRow = Math.floor(tile.index / BOARD_WIDTH);
                    const isDarkWoodTile = (tileColumn + tileRow) % 2 === 1;
                    return (
                      <TouchableOpacity
                        key={tile.index}
                        style={[
                          styles.tile,
                          isDarkWoodTile ? styles.tileWoodDark : styles.tileWoodLight,
                          showSetupZoneHint && isSetupZoneTile && styles.setupZoneTileHint,
                          showSetupZoneHint && !isSetupZoneTile && styles.restrictedTileHint,
                          placedPiece && styles.placedTile,
                          isMoveSource && styles.moveSourceTile,
                        ]}
                        onPress={() => handleTilePress(tile.index)}
                        activeOpacity={0.8}
                      >
                        {placedPiece ? <Text style={[styles.tilePieceText, { fontSize: rf(9) }]}>{placedPiece.shortLabel}</Text> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              {hasPlacedPieces ? (
                <TouchableOpacity
                  style={[styles.boardResetButton, { width: rs(24), height: rs(24), borderRadius: rs(12), top: -rs(8), right: -rs(8) }]}
                  onPress={handleResetBoard}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="close" size={rs(14)} color={appTheme.colors.ink} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={[styles.inventoryHeader, { minHeight: inventoryHeaderHeight, marginBottom: isInventoryExpanded ? verticalGap : 0 }]}>
            <View style={styles.inventoryInfoBlock}>
              <Text style={[styles.inventoryInfoLabel, { fontSize: rf(11) }]}>{isUltraCompactHeight ? "Pick" : "Selected"}</Text>
              <Text style={[styles.inventoryInfoValue, { fontSize: rf(13) }]} numberOfLines={1}>
                {selectedPiece ? selectedPiece.label.replace("\n", " ") : "None"}
              </Text>
            </View>
            <View style={styles.inventoryInfoBlock}>
              <Text style={[styles.inventoryInfoLabel, { fontSize: rf(11) }]}>{isUltraCompactHeight ? "Left" : "Unplaced"}</Text>
              <Text style={[styles.inventoryInfoValue, { fontSize: rf(13) }]}>{totalUnplacedCount}</Text>
            </View>
            <TouchableOpacity style={[styles.inventoryToggleButton, { paddingHorizontal: rs(10), paddingVertical: rsv(5) }]} onPress={() => setIsInventoryExpanded((current) => !current)} activeOpacity={0.85}>
              <Text style={[styles.inventoryToggleText, { fontSize: rf(11) }]}>{isInventoryExpanded ? "Hide" : "Reserve"}</Text>
            </TouchableOpacity>
          </View>

          {isInventoryExpanded ? (
            <View style={[styles.inventoryRailContainer, { marginBottom: verticalGap, maxHeight: inventoryExpandedHeight }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.inventoryRailContent, { columnGap: rs(8), paddingRight: rs(8) }]}>
                {pieceDefinitions.map((piece) => {
                  const remaining = pieceCountById[piece.id] ?? 0;
                  const isSelected = selectedPieceId === piece.id;
                  const isDepleted = remaining <= 0;
                  return (
                    <TouchableOpacity
                      key={piece.id}
                      style={[
                        styles.inventoryChip,
                        { minWidth: rs(90), minHeight: rsv(70), paddingHorizontal: rs(8), paddingVertical: rsv(6), borderRadius: rs(10) },
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
                          { fontSize: piece.label.includes("\n") ? rf(10) : rf(12), lineHeight: piece.label.includes("\n") ? rf(11) : rf(13) },
                          isSelected && styles.inventoryChipTitleSelected,
                          isDepleted && styles.inventoryChipTitleDepleted,
                        ]}
                      >
                        {piece.label}
                      </Text>
                      <View style={[styles.inventoryCountPill, { marginTop: rsv(5), borderRadius: rs(9), paddingHorizontal: rs(8), paddingVertical: rsv(2) }, isSelected && styles.inventoryCountPillSelected]}>
                        <Text style={[styles.inventoryCountText, { fontSize: rf(11) }, isSelected && styles.inventoryCountTextSelected]}>x{remaining}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {!isUltraCompactHeight ? (
            <Text style={[styles.boardInstructionText, { minHeight: instructionHeight, fontSize: rf(10) }]}>
              Expand the reserve to assign ranks, then place them in the red frontline zone.
            </Text>
          ) : null}
        </View>
      </ScreenShell>

      <Modal visible={showQuitModal} transparent animationType="fade" onRequestClose={() => setShowQuitModal(false)}>
        <View style={[styles.modalOverlay, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.modalCard, { maxWidth: Math.min(rs(330), width * 0.9), padding: rs(16) }]}>
            <Text style={[styles.modalMessage, { fontSize: rf(28), lineHeight: rf(32), marginBottom: rsv(20) }]}>Leave the frontline?</Text>
            <View style={[styles.modalButtonsRow, { marginBottom: rsv(14), gap: rs(16) }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalPrimaryButton]}
                onPress={() => {
                  setShowQuitModal(false);
                  if (typeof router.canGoBack === "function" && router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace("/");
                  }
                }}
              >
                <Text style={[styles.modalButtonText, { fontSize: rf(14) }]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalSecondaryButton]} onPress={() => setShowQuitModal(false)}>
                <Text style={[styles.modalButtonText, styles.modalSecondaryButtonText, { fontSize: rf(14) }]}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showReadyModal} transparent animationType="fade" onRequestClose={() => setShowReadyModal(false)}>
        <View style={[styles.modalOverlay, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.modalCard, { maxWidth: Math.min(rs(330), width * 0.9), padding: rs(16) }]}>
            <Text style={[styles.modalMessage, { fontSize: rf(24), lineHeight: rf(28), marginBottom: rsv(20) }]}>All ranks are in place.{"\n"}Confirm ready?</Text>
            <View style={[styles.modalButtonsRow, { marginBottom: rsv(14), gap: rs(16) }]}>
              <TouchableOpacity style={[styles.modalButton, styles.modalPrimaryButton]} onPress={() => setShowReadyModal(false)}>
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
  pageFrame: { flex: 1, alignItems: "center" },
  container: { width: "100%", flex: 1, minHeight: 0, alignItems: "center" },
  topMenuRow: { width: "100%", flexDirection: "row", alignItems: "center" },
  topRowTitle: { flex: 1, textAlign: "center", color: appTheme.colors.ink, fontFamily: appTheme.fonts.display, letterSpacing: 0.15, textTransform: "uppercase" },
  menuButton: { flexDirection: "row", alignItems: "center", justifyContent: "flex-start" },
  menuSpacer: {},
  menuArrowIcon: { flexDirection: "row", alignItems: "center", marginRight: 8 },
  menuArrowTip: { width: 0, height: 0, borderTopWidth: 7, borderBottomWidth: 7, borderRightWidth: 12, borderTopColor: "transparent", borderBottomColor: "transparent", borderRightColor: appTheme.colors.brassBright },
  menuArrowBody: { width: 14, height: 3, backgroundColor: appTheme.colors.brassBright, marginLeft: -1, borderRadius: 2 },
  menuButtonText: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.body },
  setupBox: { width: "100%", backgroundColor: appTheme.colors.field, borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.colors.lineStrong, borderRadius: appTheme.radius.lg, paddingHorizontal: 12, ...appTheme.shadow.soft },
  setupHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  setupLabel: { color: appTheme.colors.brassBright, fontFamily: appTheme.fonts.body, letterSpacing: 0.9 },
  setupTitle: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.display, letterSpacing: 0.15, textTransform: "uppercase" },
  difficultyBadge: { backgroundColor: appTheme.colors.alert, borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.colors.brassBright },
  difficultyBadgeText: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.body, letterSpacing: 0.7, textTransform: "uppercase" },
  turnIndicatorRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  turnIndicatorRowCompact: { gap: 8 },
  turnIndicatorItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  turnDot: { borderWidth: appTheme.borderWidth.thin, borderColor: appTheme.colors.brassBright, backgroundColor: appTheme.colors.alertBright },
  turnIndicatorText: { color: appTheme.colors.parchment, fontFamily: appTheme.fonts.body },
  actionRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actionButtons: { flexDirection: "row", alignItems: "center" },
  subtitle: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.display, letterSpacing: 0.12, textTransform: "uppercase" },
  actionButton: { borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.colors.lineStrong, backgroundColor: appTheme.colors.fieldRaised },
  actionButtonText: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.body, letterSpacing: 0.2 },
  readyButtonEnabled: { borderColor: appTheme.colors.brassBright, backgroundColor: appTheme.colors.alert },
  readyButtonDisabled: { borderColor: appTheme.colors.mono.disabledBorder, backgroundColor: appTheme.colors.mono.disabledBg },
  readyButtonTextEnabled: { color: appTheme.colors.ink },
  readyButtonTextDisabled: { color: appTheme.colors.mono.disabledText },
  boardWrap: { width: "100%", flex: 1, minHeight: 0, alignItems: "center", justifyContent: "center" },
  boardOuterShell: { aspectRatio: 9 / 8, backgroundColor: appTheme.colors.board.shell, borderWidth: appTheme.borderWidth.thick, borderColor: appTheme.colors.board.shellBorder, borderRadius: appTheme.radius.lg, position: "relative", ...appTheme.shadow.hard },
  boardResetButton: { position: "absolute", backgroundColor: appTheme.colors.field, borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.colors.brassBright, alignItems: "center", justifyContent: "center", zIndex: 10, ...appTheme.shadow.soft },
  boardFrame: { flex: 1, borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.colors.board.frameBorder, backgroundColor: appTheme.colors.board.frame, overflow: "hidden", padding: 3 },
  boardGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap", backgroundColor: appTheme.colors.board.grid },
  tile: { width: `${100 / BOARD_WIDTH}%`, height: `${100 / BOARD_HEIGHT}%`, borderWidth: appTheme.borderWidth.thin, borderColor: appTheme.colors.board.line, alignItems: "center", justifyContent: "center" },
  tileWoodLight: { backgroundColor: appTheme.colors.board.tileLight },
  tileWoodDark: { backgroundColor: appTheme.colors.board.tileDark },
  setupZoneTileHint: { borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.colors.board.setupHint },
  restrictedTileHint: { opacity: 0.48, borderStyle: "dashed" },
  placedTile: { backgroundColor: appTheme.colors.board.piece, borderColor: appTheme.colors.board.pieceEdge },
  moveSourceTile: { borderColor: appTheme.colors.brassBright, borderWidth: appTheme.borderWidth.thick },
  tilePieceText: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.body, textAlign: "center" },
  inventoryHeader: { width: "100%", borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.colors.line, borderRadius: appTheme.radius.md, backgroundColor: appTheme.colors.fieldRaised, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 },
  inventoryInfoBlock: { flex: 1 },
  inventoryInfoLabel: { color: appTheme.colors.inkSoft, fontFamily: appTheme.fonts.body },
  inventoryInfoValue: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.body },
  inventoryToggleButton: { backgroundColor: appTheme.colors.fieldInset, borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.colors.lineStrong, borderRadius: appTheme.radius.sm },
  inventoryToggleText: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.body },
  inventoryRailContainer: { width: "100%" },
  inventoryRailContent: { alignItems: "stretch" },
  inventoryChip: { backgroundColor: appTheme.colors.fieldRaised, borderWidth: appTheme.borderWidth.regular, borderColor: appTheme.colors.line, justifyContent: "space-between", alignItems: "flex-start" },
  inventoryChipSelected: { backgroundColor: appTheme.colors.alert, borderColor: appTheme.colors.brassBright },
  inventoryChipDepleted: { backgroundColor: appTheme.colors.mono.disabledBg, borderColor: appTheme.colors.mono.disabledBorder },
  inventoryChipTitle: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.body },
  inventoryChipTitleSelected: { color: appTheme.colors.ink },
  inventoryChipTitleDepleted: { color: appTheme.colors.mono.disabledText },
  inventoryCountPill: { backgroundColor: appTheme.colors.brassBright },
  inventoryCountPillSelected: { backgroundColor: appTheme.colors.parchment },
  inventoryCountText: { color: appTheme.colors.backgroundDeep, fontFamily: appTheme.fonts.body },
  inventoryCountTextSelected: { color: appTheme.colors.backgroundDeep },
  boardInstructionText: { color: appTheme.colors.inkMuted, fontFamily: appTheme.fonts.body, textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: appTheme.colors.scrim, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  modalCard: { width: "100%", aspectRatio: 1, backgroundColor: appTheme.colors.field, borderRadius: appTheme.radius.lg, borderWidth: appTheme.borderWidth.thick, borderColor: appTheme.colors.lineStrong, justifyContent: "space-between" },
  modalMessage: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.body, textAlign: "center", marginTop: 14 },
  modalButtonsRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8 },
  modalButton: { width: "40%", aspectRatio: 11 / 6, borderRadius: appTheme.radius.sm, alignItems: "center", justifyContent: "center", borderWidth: appTheme.borderWidth.regular },
  modalPrimaryButton: { backgroundColor: appTheme.colors.alert, borderColor: appTheme.colors.brassBright },
  modalSecondaryButton: { backgroundColor: appTheme.colors.fieldRaised, borderColor: appTheme.colors.line },
  modalButtonText: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.body },
  modalSecondaryButtonText: { color: appTheme.colors.ink },
});
