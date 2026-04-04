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

export type ThreeStarPassiveEvent = {
  /** Side that owns the 3-Star General whose passive triggered */
  threeStarSide: "player" | "ai";
  /** Full display name of the attacker (e.g. "4 Star General") */
  attackerName: string;
  /** Short label of the attacker (e.g. "4*") */
  attackerShortLabel: string;
};

type Props = {
  event: ThreeStarPassiveEvent | null;
  insets: { top: number; bottom: number };
  width: number;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  onDismiss: () => void;
};

// ─── Pulse ring config ────────────────────────────────────────────────────────

const RING_COUNT = 3;

// ─── Component ────────────────────────────────────────────────────────────────

export function ThreeStarPassiveModal({
  event,
  insets,
  width,
  rf,
  rs,
  rsv,
  onDismiss,
}: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const slideInfo = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const ringAnims = useRef(
    Array.from({ length: RING_COUNT }, () => new Animated.Value(0)),
  ).current;
  const ringOpacities = useRef(
    Array.from({ length: RING_COUNT }, () => new Animated.Value(0.7)),
  ).current;

  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const stopLoops = useCallback(() => {
    glowLoopRef.current?.stop();
  }, []);

  useEffect(() => {
    if (!event) return;

    stopLoops();

    fadeAnim.setValue(0);
    badgeScale.setValue(0);
    slideInfo.setValue(30);
    glowOpacity.setValue(0.3);
    shakeAnim.setValue(0);
    ringAnims.forEach((a) => a.setValue(0));
    ringOpacities.forEach((a) => a.setValue(0.7));

    // Badge shake — sells the "dragged down with it" feel
    const shake = Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -3,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]);

    // Expanding pulse rings
    const rings = ringAnims.map((a, i) =>
      Animated.sequence([
        Animated.delay(i * 180),
        Animated.parallel([
          Animated.timing(a, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacities[i], {
            toValue: 0,
            duration: 700,
            delay: 180,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(badgeScale, {
        toValue: 1,
        friction: 4,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(slideInfo, {
        toValue: 0,
        duration: 600,
        delay: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([Animated.delay(300), shake]),
      ...rings,
    ]).start();

    // Pulsing red glow loop
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.9,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 800,
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

  const overlayPadding = {
    paddingTop: Math.max(insets.top, 24),
    paddingBottom: Math.max(insets.bottom, 24),
  };
  const cardMaxWidth = Math.min(rs(340), width * 0.9);
  const badgeSize = rs(80);
  const isPlayer = event.threeStarSide === "player";

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
            PASSIVE ABILITY TRIGGERED
          </Text>

          {/* Badge + pulse rings */}
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
            {ringAnims.map((a, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.pulseRing,
                  {
                    width: badgeSize * 1.1,
                    height: badgeSize * 1.1,
                    borderRadius: badgeSize * 0.55,
                    opacity: ringOpacities[i],
                    transform: [
                      {
                        scale: a.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 2.2],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}

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

            {/* Main badge — shakes after pop */}
            <Animated.View
              style={[
                styles.badgeCircle,
                {
                  width: badgeSize,
                  height: badgeSize,
                  borderRadius: badgeSize / 2,
                  transform: [{ scale: badgeScale }, { translateX: shakeAnim }],
                },
              ]}
            >
              <Text style={[styles.badgeIcon, { fontSize: rf(28) }]}>⚔️</Text>
            </Animated.View>
          </View>

          {/* Ability name banner */}
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
            <Text style={[styles.pieceLabel, { fontSize: rf(20) }]}>3*</Text>
            <Text
              style={[
                styles.pieceName,
                { fontSize: rf(10), marginTop: rsv(2) },
              ]}
            >
              3-Star General — Last Stand
            </Text>
          </View>

          {/* Description card */}
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
              LAST STAND — MUTUAL ELIMINATION
            </Text>
            <Text
              style={[
                styles.perkBody,
                { fontSize: rf(10.5), marginTop: rsv(7) },
              ]}
            >
              {isPlayer
                ? "Your 3-Star General was outranked by "
                : "The enemy 3-Star General was outranked by "}
              <Text style={styles.perkHighlightWarn}>{event.attackerName}</Text>
              {". Rather than fall alone, the 3-Star General "}
              <Text style={styles.perkHighlight}>
                dragged the attacker down with it
              </Text>
              {" — both pieces are eliminated."}
            </Text>
            <View style={[styles.perkDivider, { marginVertical: rsv(9) }]} />
            <Text style={[styles.perkNote, { fontSize: rf(9.5) }]}>
              This passive triggers{" "}
              <Text style={styles.perkHighlightWarn}>automatically</Text> when
              the 3-Star General is challenged by a{" "}
              <Text style={styles.perkHighlight}>
                4-Star General, 5-Star General, or Spy
              </Text>
              . It is always active and consumes no resource.
            </Text>
          </Animated.View>

          <Text
            style={[styles.subNote, { fontSize: rf(10), marginTop: rsv(12) }]}
          >
            The field shifts. Neither piece remains.
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

const RED = "#CF5A52";
const RED_DIM = "#8B2E28";
const RED_GLOW = "rgba(207, 90, 82, 0.38)";

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10,4,4,0.88)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    backgroundColor: appTheme.surfaces.hero.backgroundColor,
    borderRadius: appTheme.radius.lg,
    borderWidth: appTheme.borderWidth.thick,
    borderColor: RED,
    alignItems: "center",
    ...appTheme.shadow.hard,
  },
  stageTag: {
    color: RED,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1.4,
    textAlign: "center",
    fontWeight: "700",
  },
  burstContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    borderWidth: 2,
    borderColor: RED,
  },
  glowHalo: {
    position: "absolute",
    backgroundColor: RED_GLOW,
    borderWidth: 1.5,
    borderColor: RED,
  },
  badgeCircle: {
    backgroundColor: "#2B0A08",
    borderWidth: 2.5,
    borderColor: RED,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: RED,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 8,
  },
  badgeIcon: {
    textAlign: "center",
  },
  nameBanner: {
    backgroundColor: "rgba(207, 90, 82, 0.10)",
    borderWidth: 1,
    borderColor: RED_DIM,
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
    backgroundColor: "rgba(207, 90, 82, 0.08)",
    borderWidth: 1,
    borderColor: RED_DIM,
  },
  perkTitle: {
    color: RED,
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
    color: RED,
    fontWeight: "700",
  },
  perkDivider: {
    height: 1,
    backgroundColor: RED_DIM,
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
    backgroundColor: "#2B0A08",
    borderWidth: 2,
    borderColor: RED,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  ackBtnText: {
    color: RED,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontWeight: "700",
  },
});
