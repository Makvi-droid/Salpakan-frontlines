import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { appTheme } from "@/constants/theme";
import { CRATE_UPGRADE_LABELS } from "../constants/constants";
import type { ChallengeEvent, PieceUpgradeId } from "../scripts/types";

// How long each stage lingers before the next auto-advances.
// Stage 3 (result) never auto-advances — the player must tap Continue.
const STAGE_DURATION_MS = 1100;

type Stage = 1 | 2 | 3;

type Props = {
  event: ChallengeEvent | null;
  insets: { top: number; bottom: number };
  width: number;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  onDismiss: () => void;
};

function getUpgradeIcon(upgrade: PieceUpgradeId) {
  if (upgrade === "iron-veil") {
    return require("../assets/images/iron-veil.png");
  }
  if (upgrade === "double-blind") {
    return require("../assets/images/double-blind.png");
  }
  return require("../assets/images/martyr's-eye.png");
}

const CLOSED_EYE_ICON = require("../assets/images/closed-eye.png");

export function ChallengeModal({
  event,
  insets,
  width,
  rf,
  rs,
  rsv,
  onDismiss,
}: Props) {
  const [stage, setStage] = useState<Stage>(1);

  // Fade-in for each stage swap
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Slide-up for the two piece cards
  const slideAttacker = useRef(new Animated.Value(30)).current;
  const slideDefender = useRef(new Animated.Value(30)).current;
  // Scale pop for the result badge
  const scaleBadge = useRef(new Animated.Value(0.4)).current;

  const fadeIn = useCallback(
    (duration = 320) =>
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
    [fadeAnim],
  );

  const slideIn = useCallback(
    (anim: Animated.Value, delay = 0) =>
      Animated.timing(anim, {
        toValue: 0,
        duration: 380,
        delay,
        useNativeDriver: true,
      }),
    [],
  );

  const popIn = useCallback(
    (anim: Animated.Value) =>
      Animated.spring(anim, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
    [],
  );

  // Reset and replay animations whenever the stage changes or modal opens.
  useEffect(() => {
    if (!event) return;

    fadeAnim.setValue(0);

    if (stage === 1) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }

    if (stage === 2) {
      slideAttacker.setValue(30);
      slideDefender.setValue(30);
      Animated.parallel([
        fadeIn(220),
        slideIn(slideAttacker, 0),
        slideIn(slideDefender, 140),
      ]).start();
    }

    if (stage === 3) {
      scaleBadge.setValue(0.4);
      Animated.parallel([fadeIn(220), popIn(scaleBadge)]).start();
    }
  }, [
    stage,
    event,
    fadeAnim,
    fadeIn,
    popIn,
    scaleBadge,
    slideAttacker,
    slideDefender,
    slideIn,
  ]);

  // Auto-advance stages 1 → 2 → 3
  useEffect(() => {
    if (!event || stage === 3) return;
    const timer = setTimeout(
      () => setStage((s) => (s < 3 ? ((s + 1) as Stage) : s)),
      STAGE_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, [stage, event]);

  // Reset stage when a new event arrives
  useEffect(() => {
    if (event) setStage(1);
  }, [event]);

  if (!event) return null;

  const attackerIsPlayer = event.attackerSide === "player";
  const playerPiece = attackerIsPlayer
    ? {
        name: event.attackerName,
        label: event.attackerShortLabel,
        hidden: event.attackerHiddenFromPlayer,
        upgrade: event.attackerUpgrade,
      }
    : {
        name: event.defenderName,
        label: event.defenderShortLabel,
        hidden: event.defenderHiddenFromPlayer,
        upgrade: event.defenderUpgrade,
      };
  const enemyPiece = attackerIsPlayer
    ? {
        name: event.defenderName,
        label: event.defenderShortLabel,
        hidden: event.defenderHiddenFromPlayer,
        upgrade: event.defenderUpgrade,
        decoyLabel: event.defenderDecoyShortLabelForPlayer,
      }
    : {
        name: event.attackerName,
        label: event.attackerShortLabel,
        hidden: event.attackerHiddenFromPlayer,
        upgrade: event.attackerUpgrade,
        decoyLabel: event.attackerDecoyShortLabelForPlayer,
      };

  const enemyDisplayLabel = enemyPiece.hidden
    ? "?"
    : (enemyPiece.decoyLabel ?? enemyPiece.label);
  const enemyDisplayName =
    enemyPiece.hidden || enemyPiece.decoyLabel ? "Unknown" : enemyPiece.name;
  const enemyResolvedName =
    enemyPiece.hidden || enemyPiece.decoyLabel
      ? "an enemy rank"
      : enemyPiece.name;
  const showIronVeilConcealIcon =
    enemyPiece.hidden && enemyPiece.upgrade === "iron-veil";

  // Outcome from the player's perspective
  // outcome > 0 means attacker won; < 0 defender won; 0 draw
  const playerWon =
    (attackerIsPlayer && event.outcome > 0) ||
    (!attackerIsPlayer && event.outcome < 0);
  const isDraw = event.outcome === 0;

  const resultLabel = isDraw
    ? "BOTH ELIMINATED"
    : playerWon
      ? "YOU WON"
      : "YOU LOST";
  const resultColor = isDraw
    ? appTheme.colors.brassBright
    : playerWon
      ? "#6DBF82"
      : "#CF5A52";
  const continueBtnBackground = isDraw
    ? "#B89245"
    : playerWon
      ? "#2F8F4E"
      : "#B53E38";
  const continueBtnBorder = isDraw
    ? "#E6C67E"
    : playerWon
      ? "#7FD39A"
      : "#E08B85";

  const enemyDefeated = playerWon || isDraw;
  const showEnemyUpgradeBadge =
    !!enemyPiece.upgrade &&
    (enemyPiece.upgrade === "iron-veil" ||
      (enemyPiece.upgrade === "double-blind"
        ? enemyDefeated
        : !enemyPiece.hidden));

  const overlayPadding = {
    paddingTop: Math.max(insets.top, insets.bottom) + 16,
    paddingBottom: Math.max(insets.top, insets.bottom) + 16,
  };
  const cardMaxWidth = Math.min(rs(340), width * 0.9);

  return (
    <Modal visible={!!event} transparent animationType="none">
      <View style={[styles.overlay, overlayPadding]}>
        {/* ── Stage 1: Challenge Commenced ──────────────────────────────── */}
        {stage === 1 && (
          <Animated.View
            style={[
              styles.card,
              { maxWidth: cardMaxWidth, padding: rs(28), opacity: fadeAnim },
            ]}
          >
            <Text style={[styles.stageTag, { fontSize: rf(9) }]}>
              CHALLENGE COMMENCED
            </Text>
            <View style={[styles.vsRow, { marginTop: rsv(18), gap: rs(12) }]}>
              <View
                style={[
                  styles.pieceCard,
                  styles.playerPieceCard,
                  { padding: rs(14), borderRadius: rs(12) },
                ]}
              >
                {playerPiece.upgrade ? (
                  <View style={styles.upgradeBadge}>
                    <Image
                      source={getUpgradeIcon(playerPiece.upgrade)}
                      style={{ width: rf(10), height: rf(10) }}
                      resizeMode="contain"
                    />
                    <Text
                      style={[styles.upgradeBadgeText, { fontSize: rf(7) }]}
                    >
                      {CRATE_UPGRADE_LABELS[playerPiece.upgrade]}
                    </Text>
                  </View>
                ) : null}
                <Text style={[styles.pieceCardSide, { fontSize: rf(9) }]}>
                  YOUR RANK
                </Text>
                <Text
                  style={[
                    styles.pieceCardLabel,
                    { fontSize: rf(28), marginTop: rsv(4) },
                  ]}
                >
                  {playerPiece.label}
                </Text>
                <Text
                  style={[
                    styles.pieceCardName,
                    { fontSize: rf(10), marginTop: rsv(4) },
                  ]}
                >
                  {playerPiece.name}
                </Text>
              </View>

              <Text style={[styles.vsText, { fontSize: rf(20) }]}>VS</Text>

              <View
                style={[
                  styles.pieceCard,
                  styles.enemyPieceCard,
                  { padding: rs(14), borderRadius: rs(12) },
                ]}
              >
                <Text style={[styles.pieceCardSide, { fontSize: rf(9) }]}>
                  ENEMY RANK
                </Text>
                <Text
                  style={[
                    styles.pieceCardLabel,
                    { fontSize: rf(28), marginTop: rsv(4) },
                  ]}
                >
                  ?
                </Text>
                <Text
                  style={[
                    styles.pieceCardName,
                    { fontSize: rf(10), marginTop: rsv(4) },
                  ]}
                >
                  Unknown
                </Text>
              </View>
            </View>
            <Text
              style={[styles.subNote, { fontSize: rf(10), marginTop: rsv(16) }]}
            >
              Ranks advance to contact…
            </Text>
          </Animated.View>
        )}

        {/* ── Stage 2: Pieces revealed side by side ─────────────────────── */}
        {stage === 2 && (
          <Animated.View
            style={[
              styles.card,
              { maxWidth: cardMaxWidth, padding: rs(28), opacity: fadeAnim },
            ]}
          >
            <Text style={[styles.stageTag, { fontSize: rf(9) }]}>
              RANKS REVEALED
            </Text>
            <View style={[styles.vsRow, { marginTop: rsv(18), gap: rs(12) }]}>
              <Animated.View
                style={[
                  styles.pieceCard,
                  styles.playerPieceCard,
                  {
                    padding: rs(14),
                    borderRadius: rs(12),
                    transform: [{ translateY: slideAttacker }],
                  },
                ]}
              >
                {playerPiece.upgrade ? (
                  <View style={styles.upgradeBadge}>
                    <Image
                      source={getUpgradeIcon(playerPiece.upgrade)}
                      style={{ width: rf(10), height: rf(10) }}
                      resizeMode="contain"
                    />
                    <Text
                      style={[styles.upgradeBadgeText, { fontSize: rf(7) }]}
                    >
                      {CRATE_UPGRADE_LABELS[playerPiece.upgrade]}
                    </Text>
                  </View>
                ) : null}
                <Text style={[styles.pieceCardSide, { fontSize: rf(9) }]}>
                  YOUR RANK
                </Text>
                <Text
                  style={[
                    styles.pieceCardLabel,
                    { fontSize: rf(28), marginTop: rsv(4) },
                  ]}
                >
                  {playerPiece.label}
                </Text>
                <Text
                  style={[
                    styles.pieceCardName,
                    { fontSize: rf(10), marginTop: rsv(4) },
                  ]}
                >
                  {playerPiece.name}
                </Text>
              </Animated.View>

              <Text style={[styles.vsText, { fontSize: rf(20) }]}>VS</Text>

              <Animated.View
                style={[
                  styles.pieceCard,
                  styles.enemyPieceCard,
                  {
                    padding: rs(14),
                    borderRadius: rs(12),
                    transform: [{ translateY: slideDefender }],
                  },
                ]}
              >
                {showEnemyUpgradeBadge && enemyPiece.upgrade ? (
                  <View style={styles.upgradeBadge}>
                    <Image
                      source={getUpgradeIcon(enemyPiece.upgrade)}
                      style={{ width: rf(10), height: rf(10) }}
                      resizeMode="contain"
                    />
                    <Text
                      style={[styles.upgradeBadgeText, { fontSize: rf(7) }]}
                    >
                      {CRATE_UPGRADE_LABELS[enemyPiece.upgrade]}
                    </Text>
                  </View>
                ) : null}
                <Text style={[styles.pieceCardSide, { fontSize: rf(9) }]}>
                  ENEMY RANK
                </Text>
                <Text
                  style={[
                    styles.pieceCardLabel,
                    { fontSize: rf(28), marginTop: rsv(4) },
                  ]}
                >
                  {showIronVeilConcealIcon ? "" : enemyDisplayLabel}
                </Text>
                {showIronVeilConcealIcon ? (
                  <Image
                    source={CLOSED_EYE_ICON}
                    style={{
                      width: rf(30),
                      height: rf(30),
                      marginTop: rsv(4),
                      tintColor: "white",
                    }}
                    resizeMode="contain"
                  />
                ) : null}
                <Text
                  style={[
                    styles.pieceCardName,
                    { fontSize: rf(10), marginTop: rsv(4) },
                  ]}
                >
                  {enemyDisplayName}
                </Text>
              </Animated.View>
            </View>
            <Text
              style={[styles.subNote, { fontSize: rf(10), marginTop: rsv(16) }]}
            >
              {enemyPiece.hidden
                ? "Enemy rank remains concealed."
                : enemyPiece.decoyLabel
                  ? "Enemy rank appears distorted."
                  : "Deciding the outcome…"}
            </Text>
          </Animated.View>
        )}

        {/* ── Stage 3: Result ───────────────────────────────────────────── */}
        {stage === 3 && (
          <Animated.View
            style={[
              styles.card,
              { maxWidth: cardMaxWidth, padding: rs(28), opacity: fadeAnim },
            ]}
          >
            <Text style={[styles.stageTag, { fontSize: rf(9) }]}>
              CLASH RESULT
            </Text>
            <View style={[styles.vsRow, { marginTop: rsv(14), gap: rs(12) }]}>
              <View
                style={[
                  styles.pieceCard,
                  styles.playerPieceCard,
                  { padding: rs(14), borderRadius: rs(12) },
                  !playerWon && !isDraw && styles.defeatedCard,
                ]}
              >
                <Text style={[styles.pieceCardSide, { fontSize: rf(9) }]}>
                  YOUR RANK
                </Text>
                <Text
                  style={[
                    styles.pieceCardLabel,
                    { fontSize: rf(28), marginTop: rsv(4) },
                  ]}
                >
                  {playerPiece.label}
                </Text>
                <Text
                  style={[
                    styles.pieceCardName,
                    { fontSize: rf(10), marginTop: rsv(4) },
                  ]}
                >
                  {playerPiece.name}
                </Text>
              </View>

              <Text style={[styles.vsText, { fontSize: rf(20) }]}>VS</Text>

              <View
                style={[
                  styles.pieceCard,
                  styles.enemyPieceCard,
                  { padding: rs(14), borderRadius: rs(12) },
                  (playerWon || isDraw) && styles.defeatedCard,
                ]}
              >
                <Text style={[styles.pieceCardSide, { fontSize: rf(9) }]}>
                  ENEMY RANK
                </Text>
                <Text
                  style={[
                    styles.pieceCardLabel,
                    { fontSize: rf(28), marginTop: rsv(4) },
                  ]}
                >
                  {showIronVeilConcealIcon ? "" : enemyDisplayLabel}
                </Text>
                {showIronVeilConcealIcon ? (
                  <Image
                    source={CLOSED_EYE_ICON}
                    style={{
                      width: rf(30),
                      height: rf(30),
                      marginTop: rsv(4),
                      tintColor: "white",
                    }}
                    resizeMode="contain"
                  />
                ) : null}
                <Text
                  style={[
                    styles.pieceCardName,
                    { fontSize: rf(10), marginTop: rsv(4) },
                  ]}
                >
                  {enemyDisplayName}
                </Text>
              </View>
            </View>

            {/* Result badge */}
            <Animated.View
              style={[
                styles.resultBadge,
                {
                  backgroundColor: resultColor,
                  marginTop: rsv(18),
                  paddingHorizontal: rs(22),
                  paddingVertical: rsv(10),
                  borderRadius: rs(24),
                  transform: [{ scale: scaleBadge }],
                },
              ]}
            >
              <Text style={[styles.resultBadgeText, { fontSize: rf(15) }]}>
                {resultLabel}
              </Text>
            </Animated.View>

            <Text
              style={[styles.subNote, { fontSize: rf(10), marginTop: rsv(10) }]}
            >
              {isDraw
                ? "Both ranks are removed from the field."
                : playerWon
                  ? `${playerPiece.name} removes ${enemyResolvedName}.`
                  : `${enemyResolvedName} holds the line.`}
            </Text>

            <TouchableOpacity
              style={[
                styles.continueBtn,
                {
                  backgroundColor: continueBtnBackground,
                  borderColor: continueBtnBorder,
                  marginTop: rsv(20),
                  paddingVertical: rsv(12),
                  borderRadius: rs(14),
                },
              ]}
              onPress={onDismiss}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.continueBtnText,
                  { fontSize: rf(13), color: "#FFF8EE" },
                ]}
              >
                Continue
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10,6,2,0.82)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  upgradeBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.24)",
    borderWidth: 1,
    borderColor: appTheme.colors.brassBright,
    marginBottom: 6,
  },
  upgradeBadgeText: {
    color: appTheme.colors.parchment,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.2,
    fontWeight: "700",
  },
  card: {
    width: "100%",
    backgroundColor: appTheme.surfaces.hero.backgroundColor,
    borderRadius: appTheme.radius.lg,
    borderWidth: appTheme.borderWidth.thick,
    borderColor: appTheme.surfaces.hero.borderColor,
    alignItems: "center",
    ...appTheme.shadow.hard,
  },
  stageTag: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1.2,
    textAlign: "center",
  },
  vsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  vsText: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.display,
    letterSpacing: 1,
  },
  pieceCard: {
    flex: 1,
    alignItems: "center",
    borderWidth: appTheme.borderWidth.regular,
    minHeight: 110,
    justifyContent: "center",
  },
  playerPieceCard: {
    backgroundColor: "#2B1C14",
    borderColor: appTheme.colors.brassBright,
  },
  enemyPieceCard: {
    backgroundColor: "#4A1F19",
    borderColor: "#E0B55D",
  },
  defeatedCard: {
    opacity: 0.38,
  },
  pieceCardSide: {
    color: appTheme.colors.inkSoft,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  pieceCardLabel: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    textAlign: "center",
  },
  pieceCardName: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
  },
  subNote: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
  },
  resultBadge: {
    alignItems: "center",
    justifyContent: "center",
  },
  resultBadgeText: {
    color: "#1A1008",
    fontFamily: appTheme.fonts.display,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  continueBtn: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: appTheme.surfaces.commandPrimary.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.commandPrimary.borderColor,
  },
  continueBtnText: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
