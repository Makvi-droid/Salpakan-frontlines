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

const BOARD_WIDTH = 9;
const BOARD_HEIGHT = 8;
const DOUBLE_TAP_MS = 300;

export default function GameScreen() {
  const router = useRouter();
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [placedByTileIndex, setPlacedByTileIndex] = useState<Record<number, string>>({});
  const [moveSourceTileIndex, setMoveSourceTileIndex] = useState<number | null>(null);
  const [lastTap, setLastTap] = useState<{ tileIndex: number; time: number } | null>(
    null
  );
  const boardTiles = Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }, (_, index) => ({
    index,
  }));
  const controlButtons = Array.from({ length: 15 }, (_, index) => index + 1);
  const firstColumnLabels = ["Flag", "Spy", "Private", "Sgt", "2nd Lt"];
  const secondColumnLabels = ["1st Lt", "Cpt", "Major", "Lt Col", "Col"];
  const thirdColumnLabels = [
    "1 Star\nGeneral",
    "2 Star\nGeneral",
    "3 Star\nGeneral",
    "4 Star\nGeneral",
    "5 Star\nGeneral",
  ];

  // Creates a stable identifier for each piece rank.
  // Used as the key for counts, selection, and board placement mapping.
  function getPieceId(column: number, row: number, label: string) {
    return `${column}-${row}-${label
      .replace(/\n/g, " ")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}`;
  }

  // Canonical setup metadata for all piece ranks.
  // Keeps rank label, id, initial count, and short board display label in one place.
  const pieceDefinitions = useMemo(() => {
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
      "1 Star\nGeneral": "1★",
      "2 Star\nGeneral": "2★",
      "3 Star\nGeneral": "3★",
      "4 Star\nGeneral": "4★",
      "5 Star\nGeneral": "5★",
    };

    return columns.flatMap((labels, column) =>
      labels.map((label, row) => {
        const id = getPieceId(column, row, label);
        const initialCount = label === "Spy" ? 2 : label === "Private" ? 6 : 1;

        return {
          id,
          initialCount,
          shortLabel: shortLabelByName[label] ?? label,
        };
      })
    );
  }, [firstColumnLabels, secondColumnLabels, thirdColumnLabels]);

  // Fast lookup map for piece metadata when rendering board tiles.
  const pieceById = useMemo(
    () => Object.fromEntries(pieceDefinitions.map((piece) => [piece.id, piece])),
    [pieceDefinitions]
  );

  // Initial piece inventory by rank id.
  const initialPieceCountById: Record<string, number> = useMemo(() => {
    const initialCounts: Record<string, number> = {};

    pieceDefinitions.forEach((piece) => {
      initialCounts[piece.id] = piece.initialCount;
    });

    return initialCounts;
  }, [pieceDefinitions]);

  // Live remaining inventory derived from current placements.
  const pieceCountById: Record<string, number> = useMemo(() => {
    const remaining = { ...initialPieceCountById };

    Object.values(placedByTileIndex).forEach((pieceId) => {
      if (remaining[pieceId] !== undefined) {
        remaining[pieceId] = Math.max(0, remaining[pieceId] - 1);
      }
    });

    return remaining;
  }, [initialPieceCountById, placedByTileIndex]);

  // Select/deselect a rank button.
  // Selecting a rank also exits tile-move mode.
  const handlePieceButtonPress = (pieceId: string) => {
    setMoveSourceTileIndex(null);
    setSelectedPieceId((current) => (current === pieceId ? null : pieceId));
  };

  // Setup phase restriction: only the bottom 3 rows can be edited.
  const isSetupZoneTileIndex = (tileIndex: number) => {
    const tileY = Math.floor(tileIndex / BOARD_WIDTH);
    return tileY >= BOARD_HEIGHT - 3;
  };

  const showSetupZoneHint = selectedPieceId !== null || moveSourceTileIndex !== null;
  const hasPlacedPieces = Object.keys(placedByTileIndex).length > 0;

  // Clears the setup board and resets setup interaction state.
  const handleResetBoard = () => {
    setPlacedByTileIndex({});
    setMoveSourceTileIndex(null);
    setSelectedPieceId(null);
    setLastTap(null);
  };

  // Clears current piece/tile selection state after a completed or canceled action.
  const clearSelectionState = () => {
    setMoveSourceTileIndex(null);
    setSelectedPieceId(null);
  };

  // Handles quick double-tap on the same tile to remove a placed piece.
  // Returns true when the action is consumed.
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

  // Handles moving from an already selected source tile.
  // Includes swap behavior when destination is occupied.
  // Returns true when the action is consumed.
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

  // If no rank is selected, tapping an occupied tile enters move mode for that piece.
  // Returns true when the action is consumed.
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

  // Places the currently selected rank onto the tapped tile (if inventory remains).
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

  // Main board interaction handler.
  // Supports: placement from selected rank, tile-to-tile move, swap on occupied target,
  // and double-tap removal.
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

  // Full setup reshuffle across allowed setup tiles.
  // Replaces all current placements using configured piece counts.
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
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.topMenuRow}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowQuitModal(true)}
            >
              <View style={styles.menuArrowIcon}>
                <View style={styles.menuArrowTip} />
                <View style={styles.menuArrowBody} />
              </View>
              <Text style={styles.menuButtonText}>Menu</Text>
            </TouchableOpacity>
            <Text style={styles.topRowTitle}>Salpakan</Text>
            <View style={styles.menuSpacer} />
          </View>

          <View style={styles.setupBox}>
            <View style={styles.turnIndicatorRow}>
              <View style={styles.turnIndicatorItem}>
                <View style={styles.turnDot} />
                <Text style={styles.turnIndicatorText}>Your turn</Text>
              </View>

              <View style={styles.turnIndicatorItem}>
                <View style={styles.turnDot} />
                <Text style={styles.turnIndicatorText}>Enemy turn</Text>
              </View>
            </View>
          </View>

          <Text style={styles.subtitle}>Set your pieces</Text>

          <TouchableOpacity
            style={styles.randomizeButton}
            onPress={handleRandomizeSet}
          >
            <Text style={styles.randomizeButtonText}>Random Set</Text>
          </TouchableOpacity>

          <View style={styles.boardOuterShell}>
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
                        <Text style={styles.tilePieceText}>{placedPiece.shortLabel}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {hasPlacedPieces ? (
              <TouchableOpacity
                style={styles.boardResetButton}
                onPress={handleResetBoard}
                activeOpacity={0.85}
              >
                <MaterialIcons name="close" size={20} color="#E81300" />
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.boardInstructionText}>
            Drag and drop your pieces on the{"\n"}board
          </Text>

          <View style={styles.controlButtonsContainer}>
            {controlButtons.map((buttonNumber, index) => {
              const row = Math.floor(index / 3);
              const column = index % 3;
              const label =
                column === 0
                  ? firstColumnLabels[row]
                  : column === 1
                    ? secondColumnLabels[row]
                    : thirdColumnLabels[row];
              const pieceId = getPieceId(column, row, label);

              return (
                <View key={buttonNumber} style={styles.controlButtonSlot}>
                  <TouchableOpacity
                    style={[
                      styles.controlButton,
                      selectedPieceId === pieceId && styles.controlButtonActive,
                      (pieceCountById[pieceId] ?? 0) <= 0 && styles.controlButtonDepleted,
                    ]}
                    onPress={() => handlePieceButtonPress(pieceId)}
                    disabled={(pieceCountById[pieceId] ?? 0) <= 0}
                  >
                    <Text
                      style={[
                        styles.controlButtonText,
                        selectedPieceId === pieceId && styles.controlButtonTextActive,
                        (pieceCountById[pieceId] ?? 0) <= 0 && styles.controlButtonTextDepleted,
                        column === 2 && styles.controlButtonTextThirdColumn,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.controlButtonCountBox}>
                    <Text style={styles.controlButtonCount}>
                      x{pieceCountById[pieceId] ?? 0}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showQuitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalMessage}>
              Are you sure you{"\n"}want to quit?
            </Text>

            <View style={styles.modalButtonsRow}>
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
                <Text style={styles.modalButtonText}>Yes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.noButton]}
                onPress={() => setShowQuitModal(false)}
              >
                <Text style={styles.modalButtonText}>No</Text>
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
    paddingVertical: 40,
  },
  container: {
    justifyContent: "center",
    alignItems: "center",
    width: "90%",
    maxWidth: 500,
  },
  topMenuRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  topRowTitle: {
    flex: 1,
    textAlign: "center",
    color: "#E2F200",
    fontFamily: "Bebas",
    fontSize: 32,
    letterSpacing: 1,
  },
  menuButton: {
    width: 110,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  menuSpacer: {
    width: 110,
  },
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
    fontSize: 18,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 34,
    color: "#00F915",
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 10,
  },
  setupBox: {
    width: "100%",
    height: 112,
    backgroundColor: "#0C1530",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  turnIndicatorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  turnIndicatorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  turnDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#9A9A9A",
    backgroundColor: "#9A9A9A",
  },
  turnIndicatorText: {
    color: "#E2F200",
    fontFamily: "K2D",
    fontSize: 20,
    fontWeight: "normal",
  },
  randomizeButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#000BD6",
    backgroundColor: "#2A365A",
    marginBottom: 12,
  },
  randomizeButtonText: {
    color: "#E2F200",
    fontFamily: "K2D",
    fontSize: 16,
    fontWeight: "bold",
  },
  boardOuterShell: {
    width: "100%",
    aspectRatio: 9 / 8,
    backgroundColor: "#0C1530",
    borderWidth: 3,
    borderColor: "#E81300",
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    position: "relative",
  },
  boardResetButton: {
    position: "absolute",
    top: -14,
    right: -14,
    width: 32,
    height: 32,
    borderRadius: 16,
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
    borderRadius: 0,
    overflow: "hidden",
    padding: 3,
  },
  boardInstructionText: {
    color: "#E2F200",
    fontFamily: "K2D",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 14,
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
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },
  controlButtonsContainer: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 20,
    columnGap: 10,
    rowGap: 10,
  },
  controlButtonSlot: {
    width: "30%",
    height: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  controlButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 0,
    backgroundColor: "#35FF3F",
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonActive: {
    borderWidth: 2,
    borderColor: "#081B0A",
    backgroundColor: "#15781B",
  },
  controlButtonDepleted: {
    backgroundColor: "#8FAF91",
    borderWidth: 0,
  },
  controlButtonTextActive: {
    color: "#E9FFE9",
  },
  controlButtonTextDepleted: {
    color: "#2B3A2C",
  },
  controlButtonText: {
    color: "#000000",
    fontFamily: "K2D",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  controlButtonTextThirdColumn: {
    fontSize: 12,
    lineHeight: 13,
  },
  controlButtonCountBox: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonCount: {
    color: "#FFFFFF",
    fontFamily: "K2D",
    fontSize: 18,
    fontWeight: "bold",
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
    padding: 20,
    justifyContent: "space-between",
  },
  modalMessage: {
    color: "#E81300",
    fontFamily: "K2D",
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 14,
    marginBottom: 36,
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
    marginBottom: 28,
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
    fontSize: 16,
  },
});