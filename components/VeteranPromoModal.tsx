import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { appTheme } from "@/constants/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VeteranPromoEvent = {
  /** Short label shown on the piece tile (e.g. "GEN", "SPY") */
  pieceShortLabel: string;
  /** Full display name (e.g. "General") */
  pieceName: string;
};

type Props = {
  event: VeteranPromoEvent | null;
  insets: { top: number; bottom: number };
  width: number;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  onDismiss: () => void;
};

// ─── Star burst config ────────────────────────────────────────────────────────

const STAR_COUNT = 8;
const STAR_ANGLES = Array.from(
  { length: STAR_COUNT },
  (_, i) => (i * 360) / STAR_COUNT,
);

// ─── Component ────────────────────────────────────────────────────────────────

export function VeteranPromoModal({
  event,
  insets,
  width,
  rf,
  rs,
  rsv,
  onDismiss,
}: Props) {
  // ── Animations ───────────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;
  const slideInfo = useRef(new Animated.Value(30)).current;

  const starAnims = useRef(
    Array.from({ length: STAR_COUNT }, () => new Animated.Value(0)),
  ).current;
  const starOpacities = useRef(
    Array.from({ length: STAR_COUNT }, () => new Animated.Value(0)),
  ).current;

  const spinLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const stopLoops = useCallback(() => {
    spinLoopRef.current?.stop();
    glowLoopRef.current?.stop();
  }, []);

  // ── Run all animations together on mount/event change ────────────────────────
  useEffect(() => {
    if (!event) return;

    stopLoops();

    // Reset values
    fadeAnim.setValue(0);
    badgeScale.setValue(0);
    spinAnim.setValue(0);
    glowOpacity.setValue(0.3);
    slideInfo.setValue(30);
    starAnims.forEach((a) => a.setValue(0));
    starOpacities.forEach((a) => a.setValue(0));

    // Fade in + badge pop-in + info slide-up + burst stars
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(badgeScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideInfo, {
        toValue: 0,
        duration: 600,
        delay: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      ...starAnims.map((a, i) =>
        Animated.sequence([
          Animated.delay(i * 30),
          Animated.timing(a, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
      ...starOpacities.map((a, i) =>
        Animated.sequence([
          Animated.delay(i * 30),
          Animated.sequence([
            Animated.timing(a, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(a, {
              toValue: 0,
              duration: 400,
              delay: 200,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ),
    ]).start();

    // Continuous slow spin
    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spinLoopRef.current = spinLoop;
    spinLoop.start();

    // Pulsing glow
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    glowLoopRef.current = glowLoop;
    glowLoop.start();

    return stopLoops;
  }, [event]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!event) return null;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const overlayPadding = {
    paddingTop: Math.max(insets.top, 24),
    paddingBottom: Math.max(insets.bottom, 24),
  };
  const cardMaxWidth = Math.min(rs(340), width * 0.9);
  const badgeSize = rs(80);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal visible={!!event} transparent animationType="none">
      <View style={[styles.overlay, overlayPadding]}>
        <Animated.View
          style={[
            styles.card,
            { maxWidth: cardMaxWidth, padding: rs(28), opacity: fadeAnim },
          ]}
        >
          {/* Header */}
          <Text style={[styles.stageTag, { fontSize: rf(9) }]}>
            VETERAN STATUS EARNED
          </Text>

          {/* Badge + burst */}
          <View
            style={[
              styles.burstContainer,
              {
                width: badgeSize * 2.4,
                height: badgeSize * 2.4,
                marginTop: rsv(14),
              },
            ]}
          >
            {/* Radiating stars */}
            {STAR_ANGLES.map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const radius = badgeSize * 0.82;
              return (
                <Animated.Text
                  key={i}
                  style={[
                    styles.burstStar,
                    {
                      fontSize: rf(10),
                      opacity: starOpacities[i],
                      transform: [
                        {
                          translateX: starAnims[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, Math.cos(rad) * radius],
                          }),
                        },
                        {
                          translateY: starAnims[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, Math.sin(rad) * radius],
                          }),
                        },
                        {
                          scale: starAnims[i].interpolate({
                            inputRange: [0, 0.4, 1],
                            outputRange: [0.4, 1.3, 0.6],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  ★
                </Animated.Text>
              );
            })}

            {/* Pulsing glow halo */}
            <Animated.View
              style={[
                styles.glowHalo,
                {
                  width: badgeSize * 1.5,
                  height: badgeSize * 1.5,
                  borderRadius: badgeSize * 0.75,
                  opacity: glowOpacity,
                },
              ]}
            />

            {/* Spinning outer ring */}
            <Animated.View
              style={[
                styles.spinRing,
                {
                  width: badgeSize * 1.28,
                  height: badgeSize * 1.28,
                  borderRadius: badgeSize * 0.64,
                  transform: [{ rotate: spin }],
                },
              ]}
            />

            {/* Main badge */}
            <Animated.View
              style={[
                styles.badgeCircle,
                {
                  width: badgeSize,
                  height: badgeSize,
                  borderRadius: badgeSize / 2,
                  transform: [{ scale: badgeScale }],
                },
              ]}
            >
              <Text style={[styles.badgeStar, { fontSize: rf(34) }]}>★</Text>
            </Animated.View>
          </View>

          {/* Piece identity */}
          <View
            style={[
              styles.nameBanner,
              {
                marginTop: rsv(12),
                paddingHorizontal: rs(20),
                paddingVertical: rsv(8),
                borderRadius: rs(10),
              },
            ]}
          >
            <Text style={[styles.pieceLabel, { fontSize: rf(20) }]}>
              {event.pieceShortLabel}
            </Text>
            <Text
              style={[
                styles.pieceName,
                { fontSize: rf(10), marginTop: rsv(2) },
              ]}
            >
              {event.pieceName}
            </Text>
          </View>

          {/* Perk explanation */}
          <Animated.View
            style={[
              styles.perkCard,
              {
                marginTop: rsv(14),
                padding: rs(16),
                borderRadius: rs(12),
                transform: [{ translateY: slideInfo }],
              },
            ]}
          >
            <Text style={[styles.perkTitle, { fontSize: rf(11) }]}>
              SAME-RANK CLASH ADVANTAGE
            </Text>
            <Text
              style={[
                styles.perkBody,
                { fontSize: rf(10.5), marginTop: rsv(7) },
              ]}
            >
              When this piece challenges an equal rank, it{" "}
              <Text style={styles.perkHighlight}>survives and eliminates</Text>{" "}
              the opponent instead of both being removed.
            </Text>
            <View style={[styles.perkDivider, { marginVertical: rsv(9) }]} />
            <Text style={[styles.perkNote, { fontSize: rf(9.5) }]}>
              The badge is{" "}
              <Text style={styles.perkHighlightWarn}>consumed</Text> once used.
              Two veterans in the same clash cancel each other out.
            </Text>
          </Animated.View>

          <Text
            style={[styles.subNote, { fontSize: rf(10), marginTop: rsv(12) }]}
          >
            Look for the ★ on this piece's tile during battle.
          </Text>

          {/* Confirm button */}
          <TouchableOpacity
            style={[
              styles.ackBtn,
              {
                marginTop: rsv(20),
                paddingVertical: rsv(13),
                borderRadius: rs(14),
              },
            ]}
            onPress={onDismiss}
            activeOpacity={0.82}
          >
            <Text style={[styles.ackBtnText, { fontSize: rf(13) }]}>
              Confirmed
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const GOLD = "#F0C040";
const GOLD_DIM = "#B89040";
const GOLD_GLOW = "rgba(240, 192, 64, 0.38)";

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10,6,2,0.86)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    backgroundColor: appTheme.surfaces.hero.backgroundColor,
    borderRadius: appTheme.radius.lg,
    borderWidth: appTheme.borderWidth.thick,
    borderColor: GOLD,
    alignItems: "center",
    ...appTheme.shadow.hard,
  },
  stageTag: {
    color: GOLD,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1.4,
    textAlign: "center",
    fontWeight: "700",
  },

  burstContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  burstStar: {
    position: "absolute",
    color: GOLD,
    textAlign: "center",
  },

  spinRing: {
    position: "absolute",
    borderWidth: 2,
    borderColor: GOLD_DIM,
    borderStyle: "dashed",
    opacity: 0.7,
  },

  glowHalo: {
    position: "absolute",
    backgroundColor: GOLD_GLOW,
    borderWidth: 1.5,
    borderColor: GOLD,
  },

  badgeCircle: {
    backgroundColor: "#2B1C00",
    borderWidth: 2.5,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 8,
  },
  badgeStar: {
    color: GOLD,
    textAlign: "center",
  },

  nameBanner: {
    backgroundColor: "rgba(240, 192, 64, 0.10)",
    borderWidth: 1,
    borderColor: GOLD_DIM,
    alignItems: "center",
  },
  pieceLabel: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  pieceName: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
  },

  perkCard: {
    width: "100%",
    backgroundColor: "rgba(240, 192, 64, 0.08)",
    borderWidth: 1,
    borderColor: GOLD_DIM,
  },
  perkTitle: {
    color: GOLD,
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  perkBody: {
    color: appTheme.colors.parchment,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
    lineHeight: 18,
  },
  perkHighlight: {
    color: "#6DBF82",
    fontWeight: "700",
  },
  perkHighlightWarn: {
    color: "#CF5A52",
    fontWeight: "700",
  },
  perkDivider: {
    height: 1,
    backgroundColor: GOLD_DIM,
    opacity: 0.35,
  },
  perkNote: {
    color: appTheme.colors.inkSoft,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
    lineHeight: 16,
  },

  subNote: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
  },

  ackBtn: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2B1C00",
    borderWidth: 2,
    borderColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  ackBtnText: {
    color: GOLD,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontWeight: "700",
  },
});
