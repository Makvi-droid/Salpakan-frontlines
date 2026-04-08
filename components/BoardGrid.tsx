import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useRef } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";

import { appTheme } from "@/constants/theme";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../constants/constants";
import type { CaptainScanResult } from "../hooks/useCaptainScan";
import type { ColonelRevealResult } from "../hooks/useColonelReveal";
import type { SpyRevealResult } from "../hooks/useSpyReveal";
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

// ── Rank icon map (MaterialCommunityIcons names, all verified to exist) ──────
// These map the shortLabel of a piece to an MCI icon name.
const RANK_ICON: Record<string, string> = {
  F: "flag",
  Sp: "eye-off-outline",
  Pvt: "shield-outline",
  Sgt: "sword",
  "2Lt": "medal-outline",
  "1Lt": "medal",
  Cpt: "shield-half-full",
  Maj: "clipboard-text-outline",
  LtC: "bullseye-arrow",
  Col: "eagle",
  "1*": "star-outline",
  "2*": "star-half-full",
  "3*": "star",
  "4*": "star-circle-outline",
  "5*": "crown",
};

// ── Rank subtitle map — full readable name shown below icon ──────────────────
const RANK_SUBTITLE: Record<string, string> = {
  F: "Flag",
  Sp: "Spy",
  Pvt: "Private",
  Sgt: "Sergeant",
  "2Lt": "2nd Lt",
  "1Lt": "1st Lt",
  Cpt: "Captain",
  Maj: "Major",
  LtC: "Lt Colonel",
  Col: "Colonel",
  "1*": "1\u2605 General",
  "2*": "2\u2605 General",
  "3*": "3\u2605 General",
  "4*": "4\u2605 General",
  "5*": "5\u2605 General",
};

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
  // spy reveal
  spyReveal?: SpyRevealResult | null;
  // colonel reveal
  colonelReveal?: ColonelRevealResult | null;
  colonelRevealActive: boolean;
  colonelDiagonalTiles: number[];
  // general charge
  generalChargeActive: boolean;
  // 4-star diagonal march
  fourStarPushActive: boolean;
  fourStarPushTargetTiles: number[];
  fourStarDiagonalChallengeTiles: number[];
  // Lt. Colonel stun (Suppression Fire)
  ltColonelStunActive: boolean;
  ltColonelDiagonalTiles: number[];
  stunnedTileIndices: Set<number>;
  // Major swap (Tactical Shift)
  majorSwapActive: boolean;
  majorSwapAllyTiles: number[];
  // Captain scan (Threat Scan)
  captainScanResult?: CaptainScanResult;
  // 2-Star General (Hold the Line)
  holdRestrictedTiles: number[];
  twoStarActive: boolean;
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

// ── RankPieceContent ─────────────────────────────────────────────────────────
// Renders icon + short label + subtitle for player pieces and revealed AI pieces.
// Falls back to plain text for hidden AI pieces.
function RankPieceContent({
  visiblePiece,
  isPlayer,
  isRevealedAI,
  rf,
  textStyle,
}: {
  visiblePiece: string;
  isPlayer: boolean;
  isRevealedAI: boolean;
  rf: (n: number) => number;
  textStyle: any[];
}) {
  const iconName = RANK_ICON[visiblePiece];
  const subtitle = RANK_SUBTITLE[visiblePiece];

  // Only show the enhanced layout for player pieces and revealed AI pieces
  if ((isPlayer || isRevealedAI) && iconName && subtitle) {
    const iconColor = isRevealedAI ? "#E9D8AF" : "#E2C67C";
    return (
      <View style={styles.rankContent} pointerEvents="none">
        <MaterialCommunityIcons
          name={iconName as any}
          size={rf(11)}
          color={iconColor}
        />
        <Text style={[textStyle, { fontSize: rf(8.5) }]}>{visiblePiece}</Text>
        <Text
          style={[
            styles.rankSubtitle,
            { fontSize: rf(6) },
            isRevealedAI && styles.rankSubtitleRevealedAI,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {subtitle}
        </Text>
      </View>
    );
  }

  // Hidden AI or unknown — plain short label as before
  return <Text style={[textStyle, { fontSize: rf(10) }]}>{visiblePiece}</Text>;
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
  spyReveal,
  colonelReveal,
  colonelRevealActive,
  colonelDiagonalTiles,
  generalChargeActive,
  fourStarPushActive,
  fourStarPushTargetTiles,
  fourStarDiagonalChallengeTiles,
  ltColonelStunActive,
  ltColonelDiagonalTiles,
  stunnedTileIndices,
  majorSwapActive,
  majorSwapAllyTiles,
  captainScanResult,
  holdRestrictedTiles,
  twoStarActive,
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
                selectedBattleMoves.includes(tile.index) &&
                !challengeTargetTiles.includes(tile.index);
              const isChallengeTarget =
                phase !== "formation" &&
                challengeTargetTiles.includes(tile.index);

              const isFlagSwapAlly =
                phase !== "formation" && flagSwapAllyTiles.includes(tile.index);
              const isMajorSwapAlly =
                phase !== "formation" &&
                majorSwapActive &&
                majorSwapAllyTiles.includes(tile.index);
              const isGeneralChargeTarget =
                phase !== "formation" &&
                generalChargeActive &&
                selectedBattleMoves.includes(tile.index) &&
                !challengeTargetTiles.includes(tile.index);
              const isGeneralChargeChallengeTarget =
                phase !== "formation" &&
                generalChargeActive &&
                challengeTargetTiles.includes(tile.index);
              const isFourStarDiagonalTarget =
                phase !== "formation" &&
                fourStarPushActive &&
                fourStarPushTargetTiles.includes(tile.index) &&
                !fourStarDiagonalChallengeTiles.includes(tile.index);
              const isFourStarDiagonalChallenge =
                phase !== "formation" &&
                fourStarPushActive &&
                fourStarDiagonalChallengeTiles.includes(tile.index);

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

              const isPlayer = battlePiece?.side === "player";
              const isRevealedAI =
                battlePiece?.side === "ai" && !!battlePiece.revealedToPlayer;

              const playerUpgradeTag =
                phase !== "formation" && battlePiece?.side === "player"
                  ? getUpgradeAbbrev(battlePiece.upgrade)
                  : "";

              const isPlayerVeteran =
                phase !== "formation" &&
                battlePiece?.side === "player" &&
                battlePiece.isVeteran === true;

              const showIronVeilIconOnBoard =
                phase !== "formation" &&
                battlePiece?.side === "ai" &&
                !battlePiece.revealedToPlayer &&
                battlePiece.upgrade === "iron-veil" &&
                battlePiece.ironVeilKnownToPlayer === true;

              const isSpyRevealed =
                phase !== "formation" &&
                spyReveal != null &&
                spyReveal.tileIndex === tile.index &&
                battlePiece?.side === "ai";

              const isColonelDiagonalTarget =
                phase !== "formation" &&
                colonelRevealActive &&
                colonelDiagonalTiles.includes(tile.index);

              const isColonelRevealed =
                phase !== "formation" &&
                colonelReveal != null &&
                colonelReveal.tileIndex === tile.index &&
                battlePiece?.side === "ai";

              const isLtColonelDiagonalTarget =
                phase !== "formation" &&
                ltColonelStunActive &&
                ltColonelDiagonalTiles.includes(tile.index);

              const isStunnedTile =
                phase !== "formation" && stunnedTileIndices.has(tile.index);

              const captainScanEntry =
                phase !== "formation" && captainScanResult != null
                  ? captainScanResult.find((e) => e.tileIndex === tile.index)
                  : undefined;
              const isCaptainScanned =
                captainScanEntry != null && battlePiece?.side === "ai";

              const isHoldRestricted =
                phase !== "formation" &&
                holdRestrictedTiles.includes(tile.index) &&
                !!battlePiece;

              const isTwoStarTarget =
                phase !== "formation" &&
                twoStarActive &&
                battlePiece?.side === "ai";

              const isDragOver =
                isDragging && dragOverTileIndex === tile.index && isSetupZone;
              const isDraggingSource =
                isDragging && draggingFromTile === tile.index;

              const showChallengeBtn =
                isChallengeTarget ||
                isGeneralChargeChallengeTarget ||
                isFourStarDiagonalChallenge;

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
                isTrailFrom && styles.trailFrom,
                isTrailTo && styles.trailTo,
                (isMoveSource || isSelectedBattle) && styles.sourceSelected,
                !generalChargeActive && isBattleTarget && styles.battleTarget,
                !generalChargeActive &&
                  isChallengeTarget &&
                  styles.challengeTarget,
                isGeneralChargeTarget && styles.generalChargeTarget,
                isGeneralChargeChallengeTarget &&
                  styles.generalChargeChallengeTarget,
                isPlayerVeteran && styles.veteranTile,
                isFlagSwapAlly && styles.flagSwapAllyTarget,
                isMajorSwapAlly && styles.majorSwapAllyTarget,
                isSpyRevealed && styles.spyRevealTile,
                isColonelDiagonalTarget && styles.colonelDiagonalTarget,
                isColonelRevealed && styles.colonelRevealTile,
                isFourStarDiagonalTarget && styles.fourStarDiagonalTarget,
                isFourStarDiagonalChallenge && styles.fourStarDiagonalChallenge,
                isLtColonelDiagonalTarget && styles.ltColonelDiagonalTarget,
                isStunnedTile && styles.stunnedTile,
                isCaptainScanned && styles.captainScanTile,
                isHoldRestricted && styles.holdRestrictedTile,
                isTwoStarTarget && styles.twoStarTargetTile,
              ];

              // ── Shared piece text styles (for hidden AI fallback + overlays) ──
              const pieceTextStyle = [
                styles.pieceText,
                isHiddenAI && styles.hiddenEnemyText,
                !isHiddenAI &&
                  battlePiece?.side === "ai" &&
                  styles.revealedEnemyText,
                (isChallengeTarget || isGeneralChargeChallengeTarget) &&
                  styles.challengeTargetPieceText,
                isFourStarDiagonalChallenge &&
                  styles.fourStarDiagonalChallengePieceText,
                isColonelDiagonalTarget && styles.colonelTargetPieceText,
                isLtColonelDiagonalTarget && styles.ltColonelTargetPieceText,
                isMajorSwapAlly && styles.majorSwapAllyPieceText,
                isStunnedTile && styles.stunnedPieceText,
                isCaptainScanned && styles.captainScanPieceText,
                isHoldRestricted && styles.holdRestrictedPieceText,
                isTwoStarTarget && styles.twoStarTargetPieceText,
              ];

              // ── Formation phase ──────────────────────────────────────────
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
                    {isDragOver && !formationPiece ? (
                      <View style={styles.dropIndicator} />
                    ) : null}
                  </DropZoneTile>
                );
              }

              // ── Battle phase ─────────────────────────────────────────────
              return (
                <TouchableOpacity
                  key={tile.index}
                  style={tileStyle}
                  onPress={() => onTilePress(tile.index)}
                  activeOpacity={0.8}
                >
                  {battlePiece ? (
                    showIronVeilIconOnBoard ? (
                      // Hidden AI with known Iron Veil — show closed-eye icon
                      <Image
                        source={CLOSED_EYE_ICON}
                        style={{
                          width: rf(16),
                          height: rf(16),
                          tintColor: "white",
                        }}
                        resizeMode="contain"
                      />
                    ) : showChallengeBtn ? null : (
                      // ── Main piece display ───────────────────────────────
                      <RankPieceContent
                        visiblePiece={visiblePiece ?? ""}
                        isPlayer={isPlayer}
                        isRevealedAI={isRevealedAI}
                        rf={rf}
                        textStyle={pieceTextStyle}
                      />
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

                  {/* Veteran badge — bottom-left */}
                  {isPlayerVeteran ? (
                    <View style={styles.veteranBadge}>
                      <Text style={[styles.veteranStar, { fontSize: rf(7) }]}>
                        ★
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

                  {/* Standard challenge button */}
                  {isChallengeTarget && !generalChargeActive ? (
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

                  {/* General Charge challenge button — purple tint */}
                  {isGeneralChargeChallengeTarget ? (
                    <TouchableOpacity
                      style={[
                        styles.challengeBtn,
                        styles.chargeChallengeBtnOverride,
                        { borderRadius: rf(2) },
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
                        style={{
                          width: "84%",
                          height: "84%",
                          opacity: 0.98,
                          tintColor: "#D4AAFF",
                        }}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  ) : null}

                  {/* 4-Star Diagonal March challenge button — amber/orange tint */}
                  {isFourStarDiagonalChallenge &&
                  !isGeneralChargeChallengeTarget ? (
                    <TouchableOpacity
                      style={[
                        styles.challengeBtn,
                        styles.diagonalChallengeBtnOverride,
                        { borderRadius: rf(2) },
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
                        style={{
                          width: "84%",
                          height: "84%",
                          opacity: 0.98,
                          tintColor: "#FFD080",
                        }}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  ) : null}

                  {/* Flag swap ally indicator */}
                  {isFlagSwapAlly ? (
                    <View style={styles.swapIndicator} pointerEvents="none">
                      <Text style={[styles.swapIcon, { fontSize: rf(8) }]}>
                        ⇄
                      </Text>
                    </View>
                  ) : null}

                  {/* Major swap ally indicator */}
                  {isMajorSwapAlly ? (
                    <View style={styles.swapIndicator} pointerEvents="none">
                      <Text style={[styles.majorSwapIcon, { fontSize: rf(8) }]}>
                        ↕
                      </Text>
                    </View>
                  ) : null}

                  {/* General Charge move indicator */}
                  {isGeneralChargeTarget && !battlePiece ? (
                    <View style={styles.chargeIndicator} pointerEvents="none">
                      <Text style={[styles.chargeIcon, { fontSize: rf(9) }]}>
                        ⚡
                      </Text>
                    </View>
                  ) : null}

                  {/* 4-Star Diagonal March move indicator (empty tile) */}
                  {isFourStarDiagonalTarget && !battlePiece ? (
                    <View style={styles.diagonalIndicator} pointerEvents="none">
                      <Text style={[styles.diagonalIcon, { fontSize: rf(9) }]}>
                        ↗
                      </Text>
                    </View>
                  ) : null}

                  {/* Colonel diagonal target indicator */}
                  {isColonelDiagonalTarget && battlePiece ? (
                    <View
                      style={styles.colonelTargetIndicator}
                      pointerEvents="none"
                    >
                      <Text
                        style={[styles.colonelTargetIcon, { fontSize: rf(8) }]}
                      >
                        🔭
                      </Text>
                    </View>
                  ) : null}

                  {/* Lt. Colonel stun target indicator */}
                  {isLtColonelDiagonalTarget && battlePiece ? (
                    <View
                      style={styles.ltColonelTargetIndicator}
                      pointerEvents="none"
                    >
                      <Text
                        style={[
                          styles.ltColonelTargetIcon,
                          { fontSize: rf(8) },
                        ]}
                      >
                        🎯
                      </Text>
                    </View>
                  ) : null}

                  {/* Stunned tile indicator */}
                  {isStunnedTile && battlePiece ? (
                    <View style={styles.stunnedOverlay} pointerEvents="none">
                      <Text style={[styles.stunnedIcon, { fontSize: rf(9) }]}>
                        💤
                      </Text>
                    </View>
                  ) : null}

                  {/* Hold the Line restricted tile indicator */}
                  {isHoldRestricted ? (
                    <View
                      style={styles.holdRestrictedOverlay}
                      pointerEvents="none"
                    >
                      <Text
                        style={[styles.holdRestrictedIcon, { fontSize: rf(8) }]}
                      >
                        ⛓️
                      </Text>
                    </View>
                  ) : null}

                  {/* Hold the Line target-select indicator */}
                  {isTwoStarTarget && !isHoldRestricted ? (
                    <View
                      style={styles.twoStarTargetIndicator}
                      pointerEvents="none"
                    >
                      <Text
                        style={[styles.twoStarTargetIcon, { fontSize: rf(8) }]}
                      >
                        🛡️
                      </Text>
                    </View>
                  ) : null}

                  {/* ── Spy reveal overlay ─────────────────────────────────── */}
                  {isSpyRevealed && spyReveal ? (
                    <View
                      style={[
                        styles.spyRevealOverlay,
                        spyReveal.isFaked && styles.spyRevealOverlayFaked,
                      ]}
                      pointerEvents="none"
                    >
                      <Text
                        style={[
                          styles.spyRevealLabel,
                          { fontSize: rf(10) },
                          spyReveal.isFaked && styles.spyRevealLabelFaked,
                        ]}
                      >
                        {spyReveal.shortLabel}
                      </Text>
                    </View>
                  ) : null}

                  {/* ── Colonel reveal overlay ─────────────────────────────── */}
                  {isColonelRevealed && colonelReveal ? (
                    <View
                      style={styles.colonelRevealOverlay}
                      pointerEvents="none"
                    >
                      <Text
                        style={[
                          styles.colonelRevealLabel,
                          { fontSize: rf(10) },
                        ]}
                      >
                        {colonelReveal.shortLabel}
                      </Text>
                    </View>
                  ) : null}

                  {/* ── Captain scan reveal overlay ────────────────────────── */}
                  {isCaptainScanned && captainScanEntry ? (
                    <View
                      style={styles.captainScanOverlay}
                      pointerEvents="none"
                    >
                      <Text
                        style={[styles.captainScanLabel, { fontSize: rf(10) }]}
                      >
                        {captainScanEntry.shortLabel}
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
  veteranTile: {
    borderColor: "#F0C040",
    borderWidth: appTheme.borderWidth.thick,
    shadowColor: "#F0C040",
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
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
  majorSwapAllyTarget: {
    borderColor: "#5B9BD5",
    borderWidth: appTheme.borderWidth.thick,
    backgroundColor: "rgba(91, 155, 213, 0.22)",
    shadowColor: "#5B9BD5",
    shadowOpacity: 0.42,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  spyRevealTile: {
    borderColor: "#4EC9A8",
    borderWidth: appTheme.borderWidth.thick,
    shadowColor: "#4EC9A8",
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  generalChargeTarget: {
    borderColor: "#A070FF",
    borderWidth: appTheme.borderWidth.thick,
    backgroundColor: "rgba(140, 80, 255, 0.16)",
    shadowColor: "#A070FF",
    shadowOpacity: 0.38,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  generalChargeChallengeTarget: {
    borderColor: "#C0A0FF",
    borderWidth: appTheme.borderWidth.thick,
    backgroundColor: "rgba(100, 40, 200, 0.28)",
    shadowColor: "#C0A0FF",
    shadowOpacity: 0.52,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  fourStarDiagonalTarget: {
    borderColor: "#FF9020",
    borderWidth: appTheme.borderWidth.thick,
    backgroundColor: "rgba(255, 144, 32, 0.18)",
    shadowColor: "#FF9020",
    shadowOpacity: 0.45,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  fourStarDiagonalChallenge: {
    borderColor: "#FFB040",
    borderWidth: appTheme.borderWidth.thick,
    backgroundColor: "rgba(220, 120, 20, 0.28)",
    shadowColor: "#FFB040",
    shadowOpacity: 0.55,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  colonelDiagonalTarget: {
    borderColor: "#A0B840",
    borderWidth: appTheme.borderWidth.thick,
    backgroundColor: "rgba(160, 184, 64, 0.20)",
    shadowColor: "#A0B840",
    shadowOpacity: 0.45,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  colonelRevealTile: {
    borderColor: "#C8E050",
    borderWidth: appTheme.borderWidth.thick,
    shadowColor: "#C8E050",
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  ltColonelDiagonalTarget: {
    borderColor: "#3ECFB0",
    borderWidth: appTheme.borderWidth.thick,
    backgroundColor: "rgba(62, 207, 176, 0.20)",
    shadowColor: "#3ECFB0",
    shadowOpacity: 0.45,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  stunnedTile: {
    borderColor: "#9080B0",
    borderWidth: appTheme.borderWidth.thick,
    backgroundColor: "rgba(80, 60, 120, 0.25)",
    shadowColor: "#9080B0",
    shadowOpacity: 0.35,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  captainScanTile: {
    borderColor: "#4A9ED0",
    borderWidth: appTheme.borderWidth.thick,
    shadowColor: "#4A9ED0",
    shadowOpacity: 0.6,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  holdRestrictedTile: {
    borderColor: "#D47C2A",
    borderWidth: appTheme.borderWidth.thick,
    backgroundColor: "rgba(212, 124, 42, 0.18)",
    shadowColor: "#D47C2A",
    shadowOpacity: 0.5,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  twoStarTargetTile: {
    borderColor: "#F0A050",
    borderWidth: appTheme.borderWidth.thick,
    backgroundColor: "rgba(240, 160, 80, 0.16)",
    shadowColor: "#F0A050",
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
  majorSwapIcon: {
    color: "#5B9BD5",
    fontWeight: "700",
    lineHeight: 12,
  },
  chargeIndicator: {
    position: "absolute",
    bottom: 1,
    right: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  chargeIcon: {
    color: "#C0A0FF",
    fontWeight: "700",
    lineHeight: 12,
  },
  diagonalIndicator: {
    position: "absolute",
    bottom: 1,
    right: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  diagonalIcon: {
    color: "#FF9020",
    fontWeight: "700",
    lineHeight: 12,
  },
  colonelTargetIndicator: {
    position: "absolute",
    bottom: 1,
    right: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  colonelTargetIcon: {
    lineHeight: 12,
  },
  ltColonelTargetIndicator: {
    position: "absolute",
    bottom: 1,
    right: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  ltColonelTargetIcon: {
    lineHeight: 12,
  },
  stunnedOverlay: {
    position: "absolute",
    top: 1,
    left: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stunnedIcon: {
    lineHeight: 12,
  },
  holdRestrictedOverlay: {
    position: "absolute",
    top: 1,
    left: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  holdRestrictedIcon: {
    lineHeight: 12,
  },
  twoStarTargetIndicator: {
    position: "absolute",
    bottom: 1,
    right: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  twoStarTargetIcon: {
    lineHeight: 12,
  },
  spyRevealOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 60, 45, 0.88)",
    borderWidth: 2,
    borderColor: "#4EC9A8",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  spyRevealOverlayFaked: {
    backgroundColor: "rgba(40, 50, 20, 0.88)",
    borderColor: "#A8C94E",
  },
  spyRevealLabel: {
    color: "#4EC9A8",
    fontFamily: appTheme.fonts.body,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  spyRevealLabelFaked: {
    color: "#A8C94E",
  },
  colonelRevealOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 30, 5, 0.88)",
    borderWidth: 2,
    borderColor: "#A0B840",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  colonelRevealLabel: {
    color: "#C8E050",
    fontFamily: appTheme.fonts.body,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  captainScanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 20, 40, 0.88)",
    borderWidth: 2,
    borderColor: "#4A9ED0",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  captainScanLabel: {
    color: "#7BC8F0",
    fontFamily: appTheme.fonts.body,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  captainScanPieceText: {
    color: "#B0D8F0",
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
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
  chargeChallengeBtnOverride: {
    backgroundColor: "rgba(80, 20, 140, 0.45)",
    borderColor: "#C0A0FF",
  },
  diagonalChallengeBtnOverride: {
    backgroundColor: "rgba(140, 70, 10, 0.45)",
    borderColor: "#FFD080",
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
  fourStarDiagonalChallengePieceText: {
    color: "#FFE0B0",
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  colonelTargetPieceText: {
    color: "#E8F0B0",
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  majorSwapAllyPieceText: {
    color: "#D0E8FF",
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  ltColonelTargetPieceText: {
    color: "#C0F0E8",
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  stunnedPieceText: {
    color: "#C0B0D8",
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  holdRestrictedPieceText: {
    color: "#F0C080",
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  twoStarTargetPieceText: {
    color: "#FFD090",
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  hint: {
    color: appTheme.surfaces.instruction.textColor,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
  },
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
  // ── Rank content layout (icon + short label + subtitle) ───────────────────
  rankContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  rankSubtitle: {
    color: "#C9B98D",
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
    letterSpacing: 0.1,
    lineHeight: 7,
  },
  rankSubtitleRevealedAI: {
    color: "#B8A070",
  },
});
