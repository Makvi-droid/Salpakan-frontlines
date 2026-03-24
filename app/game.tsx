import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import ScreenShell from "@/components/ScreenShell";
import { UpgradeRollModal } from "@/components/UpgradeRollModal";
import { appTheme } from "@/constants/theme";
import { clamp, useResponsiveTokens } from "@/hooks/useResponsiveTokens";
import { BattleInfoPanel } from "../components/BattleInfoPanel";
import { BoardGrid } from "../components/BoardGrid";
import { ChallengeModal } from "../components/ChallengeModal";
import { CrateChoiceModal } from "../components/CrateChoiceModal";
import { FormationControls } from "../components/FormationControls";
import { GameModals } from "../components/GameModals";
import { StatusBox } from "../components/StatusBox";
import { TopMenuRow } from "../components/TopMenuRow";
import { UpgradeActivationModal } from "../components/UpgradeActivationModal";
import { useGameState } from "../hooks/useGameState";
import type { Difficulty } from "../scripts/types";

export default function GameScreen() {
  const params = useLocalSearchParams<{ level?: string }>();
  const difficulty: Difficulty =
    params.level === "easy" ||
    params.level === "medium" ||
    params.level === "hard"
      ? params.level
      : "medium";

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

  // ── Layout metrics ──────────────────────────────────────────────────────────
  const contentWidth = Math.min(layoutWidth, rs(560));
  const boardWidth = clamp(
    Math.min(contentWidth, safeWidth * (safeWidth > 720 ? 0.78 : 0.96)),
    rs(286),
    rs(safeWidth > 720 ? 460 : 420),
  );
  const topMenuHeight = rsv(
    isUltraCompactHeight ? 36 : isCompactHeight ? 40 : 44,
  );
  const shellTopPadding = rsv(
    isUltraCompactHeight ? 6 : isCompactHeight ? 10 : 16,
  );
  const shellBottomPadding = rsv(
    isUltraCompactHeight ? 8 : isCompactHeight ? 12 : 18,
  );
  const verticalSectionGap = rsv(
    isUltraCompactHeight ? 8 : isCompactHeight ? 10 : sectionGap,
  );
  const compactCardGap = rsv(
    isUltraCompactHeight ? 6 : isCompactHeight ? 8 : cardGap,
  );
  const allowPageScroll = isUltraCompactHeight;
  const responsiveTokens = {
    rf,
    rs,
    rsv,
    isCompactHeight,
    isUltraCompactHeight,
  };

  // ── Game state ──────────────────────────────────────────────────────────────
  const game = useGameState(difficulty);

  // ── Derived display values ──────────────────────────────────────────────────
  const turnLabel = game.winner
    ? game.winner === "player"
      ? "Victory"
      : "Defeat"
    : game.turn === "player"
      ? "Your turn"
      : "Enemy turn";

  const boardHint =
    game.phase === "formation"
      ? "Tip: tap a placed unit to move it, or double tap it to return it to reserve."
      : game.aiThinking
        ? `${game.aiProfile.label} is reading the field...`
        : game.turn === "player"
          ? "Tap your piece, then tap an adjacent tile to move or attack."
          : "Hold position while the enemy acts.";

  const handleLeftAction = () => {
    if (game.phase === "ended") {
      game.returnToMainMenu();
      return;
    }
    game.setShowQuitModal(true);
  };

  const handleConfirmQuit = () => {
    if (game.phase === "formation") {
      game.setShowQuitModal(false);
      game.returnToMainMenu();
    } else {
      game.handleForfeitMatch();
    }
  };

  return (
    // GestureHandlerRootView is required by react-native-gesture-handler.
    // It must wrap the entire screen for gesture recognition to work correctly.
    <GestureHandlerRootView style={styles.gestureRoot}>
      <View style={styles.safeArea}>
        <View
          style={[
            styles.bgFog,
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
            styles.bgEmber,
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
          <View
            style={[
              styles.container,
              {
                maxWidth: contentWidth,
                justifyContent: allowPageScroll ? "flex-start" : "center",
              },
            ]}
          >
            <TopMenuRow
              phase={game.phase}
              aiProfile={game.aiProfile}
              topMenuHeight={topMenuHeight}
              marginBottom={verticalSectionGap}
              rf={rf}
              rs={rs}
              rsv={rsv}
              onLeftAction={handleLeftAction}
            />

            <StatusBox
              phase={game.phase}
              selectedPiece={game.selectedPiece}
              totalUnplacedCount={game.totalUnplacedCount}
              battleMessage={game.battleMessage}
              revealMessage={game.revealMessage}
              turnLabel={turnLabel}
              cardPadding={cardPadding}
              panelRadius={panelRadius}
              marginBottom={verticalSectionGap}
              compactCardGap={compactCardGap}
              {...responsiveTokens}
            />

            <BoardGrid
              phase={game.phase}
              boardTiles={game.boardTiles}
              placedByTileIndex={game.placedByTileIndex}
              battleBoard={game.battleBoard}
              moveSourceTileIndex={game.moveSourceTileIndex}
              selectedBattleTileIndex={game.selectedBattleTileIndex}
              selectedBattleMoves={game.selectedBattleMoves}
              lastMoveTrail={game.lastMoveTrail}
              challengeTargetTiles={game.challengeTargetTiles}
              crateTiles={game.crateTiles}
              showSetupZoneHint={game.showSetupZoneHint}
              boardWidth={boardWidth}
              pieceById={game.pieceById}
              marginBottom={verticalSectionGap}
              onTilePress={game.handleTilePress}
              onChallengePress={game.handleChallengePress}
              boardHint={boardHint}
              rf={rf}
              rs={rs}
              rsv={rsv}
              // ── drag props ──────────────────────────────────────────────
              draggingPieceId={game.draggingPieceId}
              draggingFromTile={game.draggingFromTile}
              dragOverTileIndex={game.dragOverTileIndex}
              onDragStartFromBoard={game.handleDragStartFromBoard}
              onDragEnterTile={game.handleDragEnterTile}
              onDragEnd={game.handleDragEnd}
            />

            {game.phase === "formation" ? (
              <FormationControls
                isReadyEnabled={game.isReadyEnabled}
                isInventoryExpanded={game.isInventoryExpanded}
                selectedPieceId={game.selectedPieceId}
                pieceDefinitions={game.pieceDefinitions}
                pieceCountById={game.pieceCountById}
                panelRadius={panelRadius}
                cardPadding={cardPadding}
                verticalSectionGap={verticalSectionGap}
                compactCardGap={compactCardGap}
                marginBottom={0}
                rf={rf}
                rs={rs}
                rsv={rsv}
                isUltraCompactHeight={isUltraCompactHeight}
                isCompactHeight={isCompactHeight}
                draggingPieceId={game.draggingPieceId}
                onReset={game.handleResetBoard}
                onRandomize={game.handleRandomizeSet}
                onReady={() => game.setShowReadyModal(true)}
                onToggleInventory={() => game.setIsInventoryExpanded((v) => !v)}
                onPieceSelect={game.handlePieceButtonPress}
                onDragStart={game.handleDragStartFromReserve}
              />
            ) : (
              <BattleInfoPanel
                winner={game.winner}
                turn={game.turn}
                aiThinking={game.aiThinking}
                aiLabel={game.aiProfile.label}
                capturedPlayerNames={game.capturedPlayerNames}
                capturedAINames={game.capturedAINames}
                panelRadius={panelRadius}
                cardPadding={cardPadding}
                verticalSectionGap={verticalSectionGap}
                compactCardGap={compactCardGap}
                rf={rf}
                rs={rs}
                rsv={rsv}
                isUltraCompactHeight={isUltraCompactHeight}
                isCompactHeight={isCompactHeight}
              />
            )}
          </View>
        </ScreenShell>

        <GameModals
          phase={game.phase}
          winner={game.winner}
          endedBySurrender={game.endedBySurrender}
          showQuitModal={game.showQuitModal}
          showReadyModal={game.showReadyModal}
          insets={insets}
          width={width}
          rf={rf}
          rs={rs}
          rsv={rsv}
          onCloseQuit={() => game.setShowQuitModal(false)}
          onConfirmQuit={handleConfirmQuit}
          onCloseReady={() => game.setShowReadyModal(false)}
          onConfirmReady={game.startBattle}
          onRetryMatch={game.handleRetryMatch}
          onReturnToMenu={game.returnToMainMenu}
        />

        <UpgradeActivationModal
          event={game.pendingUpgradeActivation}
          insets={insets}
          width={width}
          rf={rf}
          rs={rs}
          rsv={rsv}
          onConfirm={game.handleUpgradeActivationConfirm}
        />

        <ChallengeModal
          event={game.pendingChallenge}
          insets={insets}
          width={width}
          rf={rf}
          rs={rs}
          rsv={rsv}
          onDismiss={game.handleChallengeDismiss}
        />

        <UpgradeRollModal
          event={game.pendingUpgradeRoll}
          insets={insets}
          width={width}
          rf={rf}
          rs={rs}
          rsv={rsv}
          onDismiss={game.handleUpgradeRollDismiss}
        />

        <CrateChoiceModal
          event={
            game.pendingCrateChoice
              ? {
                  currentUpgrade: game.pendingCrateChoice.currentUpgrade,
                  newUpgrade: game.pendingCrateChoice.newUpgrade,
                }
              : null
          }
          insets={insets}
          width={width}
          rf={rf}
          rs={rs}
          rsv={rsv}
          onTake={game.handleCrateChoiceTake}
          onDestroy={game.handleCrateChoiceDestroy}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  // GestureHandlerRootView must be flex: 1 to fill the screen
  gestureRoot: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: appTheme.colors.background },
  bgFog: { position: "absolute", backgroundColor: "rgba(199, 163, 84, 0.12)" },
  bgEmber: {
    position: "absolute",
    backgroundColor: "rgba(180, 67, 52, 0.18)",
  },
  pageFrame: { flex: 1, alignItems: "center" },
  container: { width: "100%", alignItems: "center", flex: 1 },
});
