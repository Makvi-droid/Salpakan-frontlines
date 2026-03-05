import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { clamp, useResponsiveTokens } from "@/hooks/useResponsiveTokens";

const BOARD_WIDTH = 9;
const BOARD_HEIGHT = 8;
const DOUBLE_TAP_MS = 300;

type PieceDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  initialCount: number;
};

export default function GameScreen() {
  const router = useRouter();
  const [isInventoryExpanded, setIsInventoryExpanded] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [placedByTileIndex, setPlacedByTileIndex] = useState<Record<number, string>>({});
  const [moveSourceTileIndex, setMoveSourceTileIndex] = useState<number | null>(null);
  const [lastTap, setLastTap] = useState<{ tileIndex: number; time: number } | null>(null);

  const tokens = useResponsiveTokens(700);
  const { width, height, rs, rsv, rf, maxContentWidth, shouldUseScrollFallback } = tokens;

  const contentWidth = Math.min(maxContentWidth, rs(520));
  const setupBoxHeight = rsv(74);
  const inventoryHeaderHeight = rsv(42);
  const inventoryExpandedHeight = rsv(96);
  const estimatedChromeHeight =
    rsv(188) +
    setupBoxHeight +
    inventoryHeaderHeight +
    (isInventoryExpanded ? inventoryExpandedHeight : 0);
  const boardHeightBudget = Math.max(rsv(220), height - estimatedChromeHeight);
  const boardWidth = clamp(boardHeightBudget * (9 / 8), rs(280), Math.min(contentWidth, width * 0.94));

  const boardTiles = Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }, (_, index) => ({
    index,
  }));

  const firstColumnLabels = ["Flag", "Spy", "Private", "Sgt", "2nd Lt"];
  const secondColumnLabels = ["1st Lt", "Cpt", "Major", "Lt Col", "Col"];
  const thirdColumnLabels = [
    "1 Star\nGeneral",
    "2 Star\nGeneral",
    "3 Star\nGeneral",
    "4 Star\nGeneral",
    "5 Star\nGeneral",
  ];

  function getPieceId(column: number, row: number, label: string) {
    return `${column}-${row}-${label
      .replace(/\n/g, " ")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}`;
  }

  const pieceDefinitions: PieceDefinition[] = useMemo(() => {
    const columns = [firstColumnLabels, secondColumnLabels, thirdColumnLabels];
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

        return {
          id,
          label,
          initialCount,
          shortLabel: shortLabelByName[label] ?? label,
        };
      })
    );
  }, [firstColumnLabels, secondColumnLabels, thirdColumnLabels]);

  const pieceById = useMemo(
    () => Object.fromEntries(pieceDefinitions.map((piece) => [piece.id, piece])),
    [pieceDefinitions]
  );

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
  const totalUnplacedCount = useMemo(
    () => Object.values(pieceCountById).reduce((sum, count) => sum + count, 0),
    [pieceCountById]
  );
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
    if (!selectedPieceId) {
      return;
    }

    if ((pieceCountById[selectedPieceId] ?? 0) <= 0) {
      return;
    }

    setPlacedByTileIndex((current) => ({
      ...current,
      [tileIndex]: selectedPieceId,
    }));
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
    const setupTileIndexes = boardTiles
      .filter((tile) => isSetupZoneTileIndex(tile.index))
      .map((tile) => tile.index);

    const pieceBag = pieceDefinitions.flatMap((piece) =>
      Array.from({ length: piece.initialCount }, () => piece.id)
    );

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        scrollEnabled={shouldUseScrollFallback}
        showsVerticalScrollIndicator={shouldUseScrollFallback}
        contentContainerStyle={[
          styles.scrollContainer,
          {
            flexGrow: 1,
            justifyContent: shouldUseScrollFallback ? "flex-start" : "center",
            paddingVertical: rsv(shouldUseScrollFallback ? 12 : 6),
            paddingHorizontal: rs(8),
          },
        ]}
      >
        <View style={[styles.container, { maxWidth: contentWidth }]}> 
          <View style={[styles.topMenuRow, { marginBottom: rsv(8) }]}> 
            <TouchableOpacity
              style={[styles.menuButton, { width: rs(90), paddingVertical: rsv(4) }]}
              onPress={() => setShowQuitModal(true)}
            >
              <View style={styles.menuArrowIcon}>
                <View style={styles.menuArrowTip} />
                <View style={styles.menuArrowBody} />
              </View>
              <Text style={[styles.menuButtonText, { fontSize: rf(15) }]}>Menu</Text>
            </TouchableOpacity>
            <Text style={[styles.topRowTitle, { fontSize: rf(28) }]}>Salpakan</Text>
            <View style={[styles.menuSpacer, { width: rs(90) }]} />
          </View>

          <View style={[styles.setupBox, { height: setupBoxHeight, marginBottom: rsv(8), paddingTop: rsv(6) }]}> 
            <View style={styles.turnIndicatorRow}>
              <View style={styles.turnIndicatorItem}>
                <View style={[styles.turnDot, { width: rs(14), height: rs(14), borderRadius: rs(7) }]} />
                <Text style={[styles.turnIndicatorText, { fontSize: rf(15) }]}>Your turn</Text>
              </View>

              <View style={styles.turnIndicatorItem}>
                <View style={[styles.turnDot, { width: rs(14), height: rs(14), borderRadius: rs(7) }]} />
                <Text style={[styles.turnIndicatorText, { fontSize: rf(15) }]}>Enemy turn</Text>
              </View>
            </View>
          </View>

          <View style={[styles.actionRow, { marginBottom: rsv(6) }]}> 
            <Text style={[styles.subtitle, { fontSize: rf(22) }]}>Set your pieces</Text>
            <TouchableOpacity
              style={[
                styles.randomizeButton,
                {
                  paddingVertical: rsv(6),
                  paddingHorizontal: rs(12),
                  borderRadius: rs(10),
                },
              ]}
              onPress={handleRandomizeSet}
            >
              <Text style={[styles.randomizeButtonText, { fontSize: rf(13) }]}>Random Set</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.boardOuterShell, { width: boardWidth, padding: rs(10), marginBottom: rsv(6) }]}> 
            <View style={styles.boardFrame}>
              <View style={styles.boardGrid}>
                {boardTiles.map((tile) => {
                  const placedPieceId = placedByTileIndex[tile.index];
                  const placedPiece = placedPieceId ? pieceById[placedPieceId] : null;
                  const isMoveSource = moveSourceTileIndex === tile.index;
                  const isSetupZoneTile = isSetupZoneTileIndex(tile.index);

                  return (
                    <TouchableOpacity
                      key={tile.index}
                      style={[
                        styles.tile,
                        showSetupZoneHint && isSetupZoneTile && styles.setupZoneTileHint,
                        showSetupZoneHint && !isSetupZoneTile && styles.restrictedTileHint,
                        placedPiece && styles.placedTile,
                        isMoveSource && styles.moveSourceTile,
                      ]}
                      onPress={() => handleTilePress(tile.index)}
                      activeOpacity={0.8}
                    >
                      {placedPiece ? (
                        <Text style={[styles.tilePieceText, { fontSize: rf(10) }]}>{placedPiece.shortLabel}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {hasPlacedPieces ? (
              <TouchableOpacity
                style={[
                  styles.boardResetButton,
                  {
                    width: rs(26),
                    height: rs(26),
                    borderRadius: rs(13),
                    top: -rs(10),
                    right: -rs(10),
                  },
                ]}
                onPress={handleResetBoard}
                activeOpacity={0.85}
              >
                <MaterialIcons name="close" size={rs(15)} color="#E81300" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={[styles.inventoryHeader, { height: inventoryHeaderHeight, marginBottom: rsv(4) }]}> 
            <View style={styles.inventoryInfoBlock}>
              <Text style={[styles.inventoryInfoLabel, { fontSize: rf(12) }]}>Selected</Text>
              <Text style={[styles.inventoryInfoValue, { fontSize: rf(14) }]} numberOfLines={1}>
                {selectedPiece ? selectedPiece.label.replace("\n", " ") : "None"}
              </Text>
            </View>

            <View style={styles.inventoryInfoBlock}>
              <Text style={[styles.inventoryInfoLabel, { fontSize: rf(12) }]}>Unplaced</Text>
              <Text style={[styles.inventoryInfoValue, { fontSize: rf(14) }]}>{totalUnplacedCount}</Text>
            </View>

            <TouchableOpacity
              style={[styles.inventoryToggleButton, { paddingHorizontal: rs(10), paddingVertical: rsv(6) }]}
              onPress={() => setIsInventoryExpanded((current) => !current)}
              activeOpacity={0.85}
            >
              <Text style={[styles.inventoryToggleText, { fontSize: rf(12) }]}>
                {isInventoryExpanded ? "Collapse" : "Expand"}
              </Text>
            </TouchableOpacity>
          </View>

          {isInventoryExpanded ? (
            <View style={[styles.inventoryRailContainer, { marginBottom: rsv(6), maxHeight: inventoryExpandedHeight }]}> 
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.inventoryRailContent, { columnGap: rs(8), paddingRight: rs(10) }]}
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
                          minWidth: rs(96),
                          minHeight: rsv(76),
                          paddingHorizontal: rs(8),
                          paddingVertical: rsv(6),
                          borderRadius: rs(10),
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
                          {
                            fontSize: piece.label.includes("\n") ? rf(11) : rf(13),
                            lineHeight: piece.label.includes("\n") ? rf(12) : rf(14),
                          },
                          isSelected && styles.inventoryChipTitleSelected,
                          isDepleted && styles.inventoryChipTitleDepleted,
                        ]}
                      >
                        {piece.label}
                      </Text>

                      <View
                        style={[
                          styles.inventoryCountPill,
                          { marginTop: rsv(6), borderRadius: rs(9), paddingHorizontal: rs(8), paddingVertical: rsv(2) },
                          isSelected && styles.inventoryCountPillSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.inventoryCountText,
                            { fontSize: rf(12) },
                            isSelected && styles.inventoryCountTextSelected,
                          ]}
                        >
                          x{remaining}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <Text style={[styles.boardInstructionText, { fontSize: rf(12), marginBottom: rsv(2) }]}> 
            Tip: Expand inventory to pick ranks, then place them on your setup zone.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showQuitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: Math.min(rs(340), width * 0.9), padding: rs(16) }]}> 
            <Text style={[styles.modalMessage, { fontSize: rf(34), lineHeight: rf(38), marginBottom: rsv(28) }]}>
              Are you sure you{"\n"}want to quit?
            </Text>

            <View style={[styles.modalButtonsRow, { marginBottom: rsv(20), gap: rs(16) }]}> 
              <TouchableOpacity
                style={[styles.modalButton, styles.yesButton]}
                onPress={() => {
                  setShowQuitModal(false);
                  if (typeof router.canGoBack === "function" && router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace("/");
                  }
                }}
              >
                <Text style={[styles.modalButtonText, { fontSize: rf(15) }]}>Yes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.noButton]}
                onPress={() => setShowQuitModal(false)}
              >
                <Text style={[styles.modalButtonText, { fontSize: rf(15) }]}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#060D1F",
  },
  scrollContainer: {
    alignItems: "center",
  },
  container: {
    justifyContent: "center",
    alignItems: "center",
    width: "92%",
    maxWidth: 520,
  },
  topMenuRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  topRowTitle: {
    flex: 1,
    textAlign: "center",
    color: "#E2F200",
    fontFamily: "Bebas",
    letterSpacing: 1,
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  menuSpacer: {},
  menuArrowIcon: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  menuArrowTip: {
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderRightWidth: 12,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: "#F29500",
  },
  menuArrowBody: {
    width: 14,
    height: 3,
    backgroundColor: "#F29500",
    marginLeft: -1,
    borderRadius: 2,
  },
  menuButtonText: {
    color: "#F29500",
    fontFamily: "K2D",
    fontWeight: "bold",
  },
  actionRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subtitle: {
    color: "#00F915",
    fontWeight: "bold",
  },
  setupBox: {
    width: "100%",
    backgroundColor: "#0C1530",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 10,
  },
  turnIndicatorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  turnIndicatorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  turnDot: {
    borderWidth: 1.5,
    borderColor: "#9A9A9A",
    backgroundColor: "#9A9A9A",
  },
  turnIndicatorText: {
    color: "#E2F200",
    fontFamily: "K2D",
    fontWeight: "normal",
  },
  randomizeButton: {
    borderWidth: 1,
    borderColor: "#000BD6",
    backgroundColor: "#2A365A",
  },
  randomizeButtonText: {
    color: "#E2F200",
    fontFamily: "K2D",
    fontWeight: "bold",
  },
  boardOuterShell: {
    aspectRatio: 9 / 8,
    backgroundColor: "#0C1530",
    borderWidth: 3,
    borderColor: "#E81300",
    borderRadius: 16,
    position: "relative",
  },
  boardResetButton: {
    position: "absolute",
    backgroundColor: "#111B32",
    borderWidth: 2,
    borderColor: "#E81300",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  boardFrame: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#E2F200",
    overflow: "hidden",
    padding: 3,
  },
  boardGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#13213F",
  },
  tile: {
    width: `${100 / BOARD_WIDTH}%`,
    height: `${100 / BOARD_HEIGHT}%`,
    borderWidth: 3,
    borderColor: "#2F2F2F",
    backgroundColor: "#D9D9D9",
    alignItems: "center",
    justifyContent: "center",
  },
  setupZoneTileHint: {
    backgroundColor: "#BFEAC3",
  },
  restrictedTileHint: {
    backgroundColor: "#EABFBF",
  },
  placedTile: {
    backgroundColor: "#209300",
  },
  moveSourceTile: {
    borderColor: "#FFFFFF",
    borderWidth: 3,
  },
  tilePieceText: {
    color: "#FFFFFF",
    fontFamily: "K2D",
    fontWeight: "bold",
    textAlign: "center",
  },
  inventoryHeader: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#253A67",
    borderRadius: 12,
    backgroundColor: "#0E1A35",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  inventoryInfoBlock: {
    flex: 1,
  },
  inventoryInfoLabel: {
    color: "#9CB3DD",
    fontFamily: "K2D",
  },
  inventoryInfoValue: {
    color: "#E2F200",
    fontFamily: "K2D",
    fontWeight: "bold",
  },
  inventoryToggleButton: {
    backgroundColor: "#1C2B4D",
    borderWidth: 1,
    borderColor: "#3A4F7E",
    borderRadius: 8,
  },
  inventoryToggleText: {
    color: "#E2F200",
    fontFamily: "K2D",
    fontWeight: "bold",
  },
  inventoryRailContainer: {
    width: "100%",
  },
  inventoryRailContent: {
    alignItems: "stretch",
  },
  inventoryChip: {
    backgroundColor: "#35FF3F",
    borderWidth: 1,
    borderColor: "#1A5B1F",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  inventoryChipSelected: {
    backgroundColor: "#15781B",
    borderColor: "#081B0A",
  },
  inventoryChipDepleted: {
    backgroundColor: "#8FAF91",
    borderColor: "#4C5E4D",
  },
  inventoryChipTitle: {
    color: "#000000",
    fontFamily: "K2D",
    fontWeight: "bold",
  },
  inventoryChipTitleSelected: {
    color: "#E9FFE9",
  },
  inventoryChipTitleDepleted: {
    color: "#2B3A2C",
  },
  inventoryCountPill: {
    backgroundColor: "#FFFFFF",
  },
  inventoryCountPillSelected: {
    backgroundColor: "#DFF9DF",
  },
  inventoryCountText: {
    color: "#111111",
    fontFamily: "K2D",
    fontWeight: "bold",
  },
  inventoryCountTextSelected: {
    color: "#0C240E",
  },
  boardInstructionText: {
    color: "#B9CFFF",
    fontFamily: "K2D",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    aspectRatio: 1,
    backgroundColor: "#111B32",
    borderRadius: 14,
    borderWidth: 3,
    borderColor: "#E81300",
    justifyContent: "space-between",
  },
  modalMessage: {
    color: "#E81300",
    fontFamily: "K2D",
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 14,
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  modalButton: {
    width: "40%",
    aspectRatio: 11 / 6,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  yesButton: {
    backgroundColor: "#9A9A9A",
  },
  noButton: {
    backgroundColor: "#9A9A9A",
  },
  modalButtonText: {
    color: "black",
    fontFamily: "K2D",
    fontWeight: "bold",
  },
});
