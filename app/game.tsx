import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
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
  const shellTopPadding = rsv(isUltraCompactHeight ? 10 : 16);
  const shellBottomPadding = rsv(isUltraCompactHeight ? 12 : 18);
  const allowPageScroll = true;

  const boardTiles = Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }, (_, index) => ({ index }));

  function getPieceId(column: number, row: number, label: string) {
    return `${column}-${row}-${label.replace(/\n/g, " ").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
  }

  const pieceDefinitions: PieceDefinition[] = useMemo(() => {
    const columns = [FIRST_COLUMN_LABELS, SECOND_COLUMN_LABELS, THIRD_COLUMN_LABELS];
    const shortLabelByName: Record<string, string> = {
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
  const isReadyEnabled = totalUnplacedCount === 0;
  const selectedPiece = selectedPieceId ? pieceById[selectedPieceId] : null;

  const handlePieceButtonPress = (pieceId: string) => {
    setMoveSourceTileIndex(null);
    setSelectedPieceId((current) => (current === pieceId ? null : pieceId));
  };

  const isSetupZoneTileIndex = (tileIndex: number) => {
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
    if (isUltraCompactHeight) {
      setIsInventoryExpanded(false);
    }
  }, [isUltraCompactHeight]);

  return (
    <View style={styles.safeArea}>
      <View
        style={[
          styles.backgroundFog,
          {
            width: rs(240),
            height: rs(240),
            borderRadius: rs(120),
            top: -rsv(18),
            right: -rs(32),
          },
        ]}
      />
      <View
        style={[
          styles.backgroundEmber,
          {
            width: rs(300),
            height: rs(300),
            borderRadius: rs(150),
            bottom: -rsv(92),
            left: -rs(88),
          },
        ]}
      />

      <ScreenShell
        style={styles.pageFrame}
        maxWidth={contentWidth}
        horizontalPadding={contentPaddingX}
        topPadding={shellTopPadding}
        bottomPadding={shellBottomPadding}
        scrollable={allowPageScroll}
      >
        <View style={[styles.container, { maxWidth: contentWidth }]}>
          <View style={[styles.topMenuRow, { minHeight: topMenuHeight, marginBottom: sectionGap }]}>
            <TouchableOpacity
              style={[styles.menuButton, { paddingVertical: rsv(6), paddingHorizontal: rs(10), borderRadius: rs(12) }]}
              onPress={() => setShowQuitModal(true)}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="arrow-left" size={rf(18)} color={appTheme.colors.brassBright} />
              <Text style={[styles.menuButtonText, { fontSize: rf(13) }]}>Menu</Text>
            </TouchableOpacity>

            <View style={styles.topRowCenter}>
              <Text style={[styles.topRowLabel, { fontSize: rf(9) }]}>FORMATION PHASE</Text>
              <Text style={[styles.topRowTitle, { fontSize: rf(isCompactHeight ? 24 : 28) }]}>Salpakan</Text>
            </View>

            <View style={[styles.difficultyBadge, { paddingHorizontal: rs(10), paddingVertical: rsv(6), borderRadius: rs(14) }]}>
              <Text style={[styles.difficultyBadgeText, { fontSize: rf(10) }]}>{difficultyLabel}</Text>
            </View>
          </View>

          <View
            style={[
              styles.setupBox,
              {
                marginBottom: sectionGap,
                paddingHorizontal: cardPadding,
                paddingTop: rsv(12),
                paddingBottom: rsv(12),
                borderRadius: panelRadius,
              },
            ]}
          >
            <Text style={[styles.setupTitle, { fontSize: rf(isCompactHeight ? 20 : 24) }]}>Set your frontline</Text>
            <Text style={[styles.setupInstruction, { fontSize: rf(12), lineHeight: rf(17), marginTop: rsv(6) }]}>
              Select a rank from the reserve, then place it inside the marked deployment rows.
            </Text>

            <View style={[styles.statusStrip, { gap: cardGap, marginTop: rsv(10) }]}>
              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, { fontSize: rf(10) }]}>Selected</Text>
                <Text style={[styles.statusValue, { fontSize: rf(13) }]} numberOfLines={1}>
                  {selectedPiece ? selectedPiece.label.replace("\n", " ") : "None"}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, { fontSize: rf(10) }]}>Unplaced</Text>
                <Text style={[styles.statusValue, { fontSize: rf(13) }]}>{totalUnplacedCount}</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, { fontSize: rf(10) }]}>Zone</Text>
                <Text style={[styles.statusValue, { fontSize: rf(13) }]}>Last 3 rows</Text>
              </View>
            </View>
          </View>

          <View style={[styles.actionRow, { marginBottom: sectionGap, gap: cardGap }]}>
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

          <View style={[styles.boardWrap, { marginBottom: sectionGap }]}>
            <Text style={[styles.boardLabel, { fontSize: rf(10), marginBottom: rsv(8) }]}>DEPLOYMENT BOARD</Text>
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
                          isSetupZoneTile && styles.setupZoneTileBase,
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
                  style={[styles.boardResetButton, { width: rs(28), height: rs(28), borderRadius: rs(14), top: -rs(10), right: -rs(10) }]}
                  onPress={handleResetBoard}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="close" size={rs(16)} color={appTheme.colors.ink} />
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={[styles.boardInstructionText, { fontSize: rf(10), marginTop: rsv(10) }]}>
              Tip: tap a placed unit to move it, or double tap it to return it to reserve.
            </Text>
          </View>

          <View
            style={[
              styles.reservePanel,
              {
                borderRadius: panelRadius,
                paddingHorizontal: cardPadding,
                paddingTop: rsv(12),
                paddingBottom: rsv(isInventoryExpanded ? 14 : 12),
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
              <View style={[styles.inventoryRailContainer, { marginTop: sectionGap }]}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.inventoryRailContent, { columnGap: cardGap, paddingRight: rs(8) }]}
                >
                  {pieceDefinitions.map((piece) => {
                    const remaining = pieceCountById[piece.id] ?? 0;
                    const isSelected = selectedPieceId === piece.id;
                    const isDepleted = remaining <= 0;
                    return (
                      <TouchableOpacity
                        key={piece.id}
                        style={[
                          styles.inventoryChip,
                          {
                            minWidth: rs(100),
                            minHeight: rsv(isUltraCompactHeight ? 84 : 94),
                            paddingHorizontal: rs(10),
                            paddingVertical: rsv(8),
                            borderRadius: rs(12),
                          },
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
        </View>
      </ScreenShell>

      <Modal visible={showQuitModal} transparent animationType="fade" onRequestClose={() => setShowQuitModal(false)}>
        <View style={[styles.modalOverlay, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.modalCard, { maxWidth: Math.min(rs(360), width * 0.9), padding: rs(20) }]}>
            <Text style={[styles.modalLabel, { fontSize: rf(10) }]}>EXIT COMMAND</Text>
            <Text style={[styles.modalMessage, { fontSize: rf(24), lineHeight: rf(28), marginTop: rsv(8) }]}>Leave the formation screen?</Text>
            <View style={[styles.modalButtonsRow, { marginTop: rsv(18), gap: rs(14) }]}>
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
                <Text style={[styles.modalButtonText, { fontSize: rf(14) }]}>Leave</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalSecondaryButton]} onPress={() => setShowQuitModal(false)}>
                <Text style={[styles.modalButtonText, styles.modalSecondaryButtonText, { fontSize: rf(14) }]}>Stay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showReadyModal} transparent animationType="fade" onRequestClose={() => setShowReadyModal(false)}>
        <View style={[styles.modalOverlay, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.modalCard, { maxWidth: Math.min(rs(360), width * 0.9), padding: rs(20) }]}>
            <Text style={[styles.modalLabel, { fontSize: rf(10) }]}>READY CHECK</Text>
            <Text style={[styles.modalMessage, { fontSize: rf(24), lineHeight: rf(28), marginTop: rsv(8) }]}>All ranks are placed.{"\n"}Confirm the formation?</Text>
            <View style={[styles.modalButtonsRow, { marginTop: rsv(18), gap: rs(14) }]}>
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
  safeArea: {
    flex: 1,
    backgroundColor: appTheme.colors.background,
  },
  backgroundFog: {
    position: "absolute",
    backgroundColor: "rgba(199, 163, 84, 0.12)",
  },
  backgroundEmber: {
    position: "absolute",
    backgroundColor: "rgba(180, 67, 52, 0.18)",
  },
  pageFrame: {
    flex: 1,
    alignItems: "center",
  },
  container: {
    width: "100%",
    alignItems: "center",
  },
  topMenuRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  topRowCenter: {
    flex: 1,
    alignItems: "center",
  },
  topRowLabel: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1,
  },
  topRowTitle: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    letterSpacing: 0.15,
    textTransform: "uppercase",
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: appTheme.surfaces.commandSecondary.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.commandSecondary.borderColor,
  },
  menuButtonText: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.body,
  },
  difficultyBadge: {
    backgroundColor: appTheme.surfaces.badge.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.badge.borderColor,
  },
  difficultyBadgeText: {
    color: appTheme.surfaces.badge.textColor,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  setupBox: {
    width: "100%",
    backgroundColor: appTheme.surfaces.hero.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.hero.borderColor,
    ...appTheme.shadow.soft,
  },
  setupTitle: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    letterSpacing: 0.15,
    textTransform: "uppercase",
  },
  setupInstruction: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
  },
  statusStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  statusItem: {
    flex: 1,
    minWidth: 88,
    backgroundColor: appTheme.surfaces.inset.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.inset.borderColor,
    borderRadius: appTheme.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusLabel: {
    color: appTheme.colors.inkSoft,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  statusValue: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.body,
    marginTop: 2,
  },
  actionRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  commandButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: appTheme.borderWidth.regular,
  },
  commandButtonPrimary: {
    backgroundColor: appTheme.surfaces.commandPrimary.backgroundColor,
    borderColor: appTheme.surfaces.commandPrimary.borderColor,
  },
  commandButtonSecondary: {
    backgroundColor: appTheme.surfaces.commandSecondary.backgroundColor,
    borderColor: appTheme.surfaces.commandSecondary.borderColor,
  },
  commandButtonDisabled: {
    backgroundColor: appTheme.colors.mono.disabledBg,
    borderColor: appTheme.colors.mono.disabledBorder,
  },
  commandButtonText: {
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  commandButtonTextEnabled: {
    color: appTheme.colors.ink,
  },
  commandButtonTextDisabled: {
    color: appTheme.colors.mono.disabledText,
  },
  boardWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  boardLabel: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1.2,
  },
  boardOuterShell: {
    aspectRatio: 9 / 8,
    backgroundColor: appTheme.colors.board.shell,
    borderWidth: appTheme.borderWidth.thick,
    borderColor: appTheme.colors.board.shellBorder,
    borderRadius: appTheme.radius.lg,
    position: "relative",
    ...appTheme.shadow.hard,
  },
  boardResetButton: {
    position: "absolute",
    backgroundColor: appTheme.surfaces.commandPrimary.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.commandPrimary.borderColor,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    ...appTheme.shadow.soft,
  },
  boardFrame: {
    flex: 1,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.board.frameBorder,
    backgroundColor: appTheme.colors.board.frame,
    overflow: "hidden",
    padding: 3,
  },
  boardGrid: {
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
  tileWoodLight: {
    backgroundColor: appTheme.colors.board.tileLight,
  },
  tileWoodDark: {
    backgroundColor: appTheme.colors.board.tileDark,
  },
  setupZoneTileBase: {
    shadowColor: "#D3B56A",
  },
  setupZoneTileHint: {
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.board.setupHint,
  },
  restrictedTileHint: {
    opacity: 0.42,
    borderStyle: "dashed",
  },
  placedTile: {
    backgroundColor: appTheme.colors.board.piece,
    borderColor: appTheme.colors.board.pieceEdge,
  },
  moveSourceTile: {
    borderColor: appTheme.colors.brassBright,
    borderWidth: appTheme.borderWidth.thick,
  },
  tilePieceText: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
  },
  boardInstructionText: {
    color: appTheme.surfaces.instruction.textColor,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
  },
  reservePanel: {
    width: "100%",
    backgroundColor: appTheme.surfaces.section.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.section.borderColor,
    ...appTheme.shadow.soft,
  },
  reserveHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  reserveLabel: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1,
  },
  reserveTitle: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    textTransform: "uppercase",
  },
  inventoryToggleButton: {
    backgroundColor: appTheme.surfaces.commandSecondary.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.commandSecondary.borderColor,
  },
  inventoryToggleText: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  reserveInstruction: {
    color: appTheme.surfaces.instruction.textColor,
    fontFamily: appTheme.fonts.body,
  },
  inventoryRailContainer: {
    width: "100%",
  },
  inventoryRailContent: {
    alignItems: "stretch",
  },
  inventoryChip: {
    backgroundColor: appTheme.surfaces.inset.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.section.borderColor,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  inventoryChipSelected: {
    backgroundColor: appTheme.surfaces.commandPrimary.backgroundColor,
    borderColor: appTheme.surfaces.commandPrimary.borderColor,
  },
  inventoryChipDepleted: {
    backgroundColor: appTheme.colors.mono.disabledBg,
    borderColor: appTheme.colors.mono.disabledBorder,
  },
  inventoryChipTitle: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.body,
  },
  inventoryChipTitleSelected: {
    color: appTheme.colors.ink,
  },
  inventoryChipTitleDepleted: {
    color: appTheme.colors.mono.disabledText,
  },
  inventoryCountPill: {
    backgroundColor: appTheme.colors.brassBright,
  },
  inventoryCountPillSelected: {
    backgroundColor: appTheme.colors.parchment,
  },
  inventoryCountPillDepleted: {
    backgroundColor: appTheme.colors.mono.disabledBorder,
  },
  inventoryCountText: {
    color: appTheme.colors.backgroundDeep,
    fontFamily: appTheme.fonts.body,
  },
  inventoryCountTextSelected: {
    color: appTheme.colors.backgroundDeep,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: appTheme.colors.scrim,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: appTheme.surfaces.hero.backgroundColor,
    borderRadius: appTheme.radius.lg,
    borderWidth: appTheme.borderWidth.thick,
    borderColor: appTheme.surfaces.hero.borderColor,
    ...appTheme.shadow.hard,
  },
  modalLabel: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1,
    textAlign: "center",
  },
  modalMessage: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    textAlign: "center",
    textTransform: "uppercase",
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: appTheme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: appTheme.borderWidth.regular,
  },
  modalPrimaryButton: {
    backgroundColor: appTheme.surfaces.commandPrimary.backgroundColor,
    borderColor: appTheme.surfaces.commandPrimary.borderColor,
  },
  modalSecondaryButton: {
    backgroundColor: appTheme.surfaces.commandSecondary.backgroundColor,
    borderColor: appTheme.surfaces.commandSecondary.borderColor,
  },
  modalButtonText: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.body,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  modalSecondaryButtonText: {
    color: appTheme.colors.ink,
  },
});
