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
import type { FirstLtRevealResult } from "../hooks/useFirstLtReveal";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  event: FirstLtRevealResult | null;
  insets: { top: number; bottom: number };
  width: number;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  onDismiss: () => void;
};

// ─── Tier display config ──────────────────────────────────────────────────────

const TIER_CONFIG = {
  high: {
    label: "HIGH RANK",
    sublabel: "General-class officer",
    description:
      "This unit holds a General rank (1-Star through 5-Star). Proceed with extreme caution — engaging directly is high risk.",
    icon: "⭐",
    accentColor: "#E8A030",
    accentDim: "#A06820",
    accentGlow: "rgba(232, 160, 48, 0.30)",
    bgColor: "#130D00",
    borderColor: "#E8A030",
    pillBg: "#E8A030",
    pillText: "#130D00",
  },
  low: {
    label: "LOW RANK",
    sublabel: "Field or enlisted unit",
    description:
      "This unit holds a Colonel rank or below (Colonel down to Flag/Spy/Private). Likely within your ability to challenge.",
    icon: "🪖",
    accentColor: "#5090C0",
    accentDim: "#2A5880",
    accentGlow: "rgba(80, 144, 192, 0.28)",
    bgColor: "#00080E",
    borderColor: "#5090C0",
    pillBg: "#5090C0",
    pillText: "#00080E",
  },
} as const;

// ─── Pulse dot config ─────────────────────────────────────────────────────────

const PULSE_COUNT = 6;
const PULSE_ANGLES = Array.from(
  { length: PULSE_COUNT },
  (_, i) => (i * 360) / PULSE_COUNT,
);

// ─── Component ────────────────────────────────────────────────────────────────

export function FirstLtRevealModal({
  event,
  insets,
  width,
  rf,
  rs,
  rsv,
  onDismiss,
}: Props) {
  const cfg = event ? TIER_CONFIG[event.tier] : TIER_CONFIG.low;

  // ── Animations ────────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const labelSlide = useRef(new Animated.Value(20)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;
  const glowOpacity = useRef(new Animated.Value(0.2)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  const dotAnims = useRef(
    Array.from({ length: PULSE_COUNT }, () => new Animated.Value(0)),
  ).current;
  const dotOpacities = useRef(
    Array.from({ length: PULSE_COUNT }, () => new Animated.Value(0)),
  ).current;

  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const spinLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const stopLoops = useCallback(() => {
    glowLoopRef.current?.stop();
    spinLoopRef.current?.stop();
  }, []);

  useEffect(() => {
    if (!event) return;

    stopLoops();

    // Reset
    fadeAnim.setValue(0);
    iconScale.setValue(0);
    labelSlide.setValue(20);
    cardSlide.setValue(30);
    glowOpacity.setValue(0.2);
    spinAnim.setValue(0);
    dotAnims.forEach((a) => a.setValue(0));
    dotOpacities.forEach((a) => a.setValue(0));

    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 4,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(labelSlide, {
        toValue: 0,
        duration: 500,
        delay: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(cardSlide, {
        toValue: 0,
        duration: 550,
        delay: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      // Burst dots
      ...dotAnims.map((a, i) =>
        Animated.sequence([
          Animated.delay(i * 40),
          Animated.timing(a, {
            toValue: 1,
            duration: 550,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
      ...dotOpacities.map((a, i) =>
        Animated.sequence([
          Animated.delay(i * 40),
          Animated.sequence([
            Animated.timing(a, {
              toValue: 1,
              duration: 180,
              useNativeDriver: true,
            }),
            Animated.timing(a, {
              toValue: 0,
              duration: 370,
              delay: 180,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ),
    ]).start();

    // Continuous loops
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.85,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    glowLoopRef.current = glowLoop;
    glowLoop.start();

    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spinLoopRef.current = spinLoop;
    spinLoop.start();

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
  const iconSize = rs(76);

  return (
    <Modal visible={!!event} transparent animationType="none">
      <View style={[styles.overlay, overlayPadding]}>
        <Animated.View
          style={[
            styles.card,
            {
              maxWidth: cardMaxWidth,
              padding: rs(26),
              opacity: fadeAnim,
              borderColor: cfg.borderColor,
              backgroundColor: cfg.bgColor,
            },
          ]}
        >
          {/* ── Header tag ─────────────────────────────────────────────────── */}
          <Text
            style={[
              styles.stageTag,
              { fontSize: rf(9), color: cfg.accentColor },
            ]}
          >
            INTEL REPORT — RANK ASSESSMENT
          </Text>

          {/* ── Icon burst area ───────────────────────────────────────────── */}
          <View
            style={[
              styles.burstContainer,
              {
                width: iconSize * 2.6,
                height: iconSize * 2.6,
                marginTop: rsv(12),
              },
            ]}
          >
            {/* Burst dots */}
            {PULSE_ANGLES.map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const radius = iconSize * 0.78;
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.burstDot,
                    {
                      width: rs(6),
                      height: rs(6),
                      borderRadius: rs(3),
                      backgroundColor: cfg.accentColor,
                      opacity: dotOpacities[i],
                      transform: [
                        {
                          translateX: dotAnims[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, Math.cos(rad) * radius],
                          }),
                        },
                        {
                          translateY: dotAnims[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, Math.sin(rad) * radius],
                          }),
                        },
                        {
                          scale: dotAnims[i].interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.4, 1.4, 0.5],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              );
            })}

            {/* Glow halo */}
            <Animated.View
              style={[
                styles.glowHalo,
                {
                  width: iconSize * 1.6,
                  height: iconSize * 1.6,
                  borderRadius: iconSize * 0.8,
                  backgroundColor: cfg.accentGlow,
                  borderColor: cfg.accentDim,
                  opacity: glowOpacity,
                },
              ]}
            />

            {/* Spinning dashed ring */}
            <Animated.View
              style={[
                styles.spinRing,
                {
                  width: iconSize * 1.3,
                  height: iconSize * 1.3,
                  borderRadius: iconSize * 0.65,
                  borderColor: cfg.accentDim,
                  transform: [{ rotate: spin }],
                },
              ]}
            />

            {/* Icon circle */}
            <Animated.View
              style={[
                styles.iconCircle,
                {
                  width: iconSize,
                  height: iconSize,
                  borderRadius: iconSize / 2,
                  borderColor: cfg.borderColor,
                  backgroundColor: cfg.bgColor,
                  transform: [{ scale: iconScale }],
                  shadowColor: cfg.accentColor,
                },
              ]}
            >
              <Text style={{ fontSize: rf(32) }}>{cfg.icon}</Text>
            </Animated.View>
          </View>

          {/* ── Tier label ────────────────────────────────────────────────── */}
          <Animated.View
            style={[
              styles.tierBanner,
              {
                marginTop: rsv(10),
                paddingHorizontal: rs(22),
                paddingVertical: rsv(8),
                borderRadius: rs(10),
                borderColor: cfg.accentDim,
                backgroundColor: cfg.accentGlow,
                transform: [{ translateY: labelSlide }],
              },
            ]}
          >
            <Text
              style={[
                styles.tierLabel,
                { fontSize: rf(22), color: cfg.accentColor },
              ]}
            >
              {cfg.label}
            </Text>
            <Text
              style={[
                styles.tierSublabel,
                { fontSize: rf(10), marginTop: rsv(2) },
              ]}
            >
              {cfg.sublabel}
            </Text>
          </Animated.View>

          {/* ── Intel card ────────────────────────────────────────────────── */}
          <Animated.View
            style={[
              styles.intelCard,
              {
                marginTop: rsv(14),
                padding: rs(16),
                borderRadius: rs(12),
                borderColor: cfg.accentDim,
                backgroundColor: "rgba(255,255,255,0.03)",
                transform: [{ translateY: cardSlide }],
              },
            ]}
          >
            <Text
              style={[
                styles.intelTitle,
                { fontSize: rf(10), color: cfg.accentColor },
              ]}
            >
              FIELD ASSESSMENT
            </Text>
            <Text
              style={[
                styles.intelBody,
                { fontSize: rf(10.5), marginTop: rsv(7) },
              ]}
            >
              {cfg.description}
            </Text>
            <View style={[styles.divider, { marginVertical: rsv(9) }]} />
            <Text style={[styles.intelNote, { fontSize: rf(9.5) }]}>
              The true identity of this piece remains{" "}
              <Text style={[styles.noteHighlight, { color: cfg.accentColor }]}>
                concealed
              </Text>
              . Only the rank tier was assessed.
            </Text>
          </Animated.View>

          <Text
            style={[styles.subNote, { fontSize: rf(10), marginTop: rsv(10) }]}
          >
            Your turn continues — now make your move.
          </Text>

          {/* ── Dismiss button ────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[
              styles.dismissBtn,
              {
                marginTop: rsv(18),
                paddingVertical: rsv(13),
                borderRadius: rs(14),
                borderColor: cfg.borderColor,
                backgroundColor: cfg.bgColor,
                shadowColor: cfg.accentColor,
              },
            ]}
            onPress={onDismiss}
            activeOpacity={0.82}
          >
            <Text
              style={[
                styles.dismissBtnText,
                { fontSize: rf(13), color: cfg.accentColor },
              ]}
            >
              Understood
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(4, 8, 20, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    borderRadius: appTheme.radius.lg,
    borderWidth: appTheme.borderWidth.thick,
    alignItems: "center",
    ...appTheme.shadow.hard,
  },
  stageTag: {
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1.4,
    textAlign: "center",
    fontWeight: "700",
  },
  burstContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  burstDot: {
    position: "absolute",
  },
  glowHalo: {
    position: "absolute",
    borderWidth: 1.5,
  },
  spinRing: {
    position: "absolute",
    borderWidth: 2,
    borderStyle: "dashed",
    opacity: 0.65,
  },
  iconCircle: {
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 12,
    elevation: 8,
  },
  tierBanner: {
    borderWidth: 1,
    alignItems: "center",
  },
  tierLabel: {
    fontFamily: appTheme.fonts.display,
    textAlign: "center",
    letterSpacing: 1,
    fontWeight: "800",
  },
  tierSublabel: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
  },
  intelCard: {
    width: "100%",
    borderWidth: 1,
  },
  intelTitle: {
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  intelBody: {
    color: appTheme.colors.parchment,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: "#ffffff",
    opacity: 0.1,
  },
  intelNote: {
    color: appTheme.colors.inkSoft,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
    lineHeight: 16,
  },
  noteHighlight: {
    fontWeight: "700",
  },
  subNote: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
  },
  dismissBtn: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  dismissBtnText: {
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontWeight: "700",
  },
});
