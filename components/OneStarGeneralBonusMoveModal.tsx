import { appTheme } from "@/constants/theme";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import type { OneStarBonusMoveEvent } from "../hooks/useOneStarGeneral";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OneStarGeneralBonusMoveModalProps {
  event: OneStarBonusMoveEvent | null;
  insets: EdgeInsets;
  width: number;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  /** Player chose to take the bonus move — enter tile-select mode */
  onConfirm: () => void;
  /** Player chose to skip — pass turn to AI as normal */
  onSkip: () => void;
}

// ─── Star burst particles ─────────────────────────────────────────────────────

interface StarParticleProps {
  angle: number;
  distance: number;
  delay: number;
  size: number;
  color: string;
  trigger: boolean;
}

const StarParticle: React.FC<StarParticleProps> = ({
  angle,
  distance,
  delay,
  size,
  color,
  trigger,
}) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trigger) {
      progress.setValue(0);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 950,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [trigger]);

  const rad = (angle * Math.PI) / 180;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.cos(rad) * distance],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sin(rad) * distance],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 1, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 1.5, 0.3],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    />
  );
};

// ─── Glow ring ────────────────────────────────────────────────────────────────

const GlowRing: React.FC<{ trigger: boolean; rs: (n: number) => number }> = ({
  trigger,
  rs,
}) => {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trigger) {
      scale.setValue(0.4);
      opacity.setValue(0);
      return;
    }
    Animated.loop(
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 2.4,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.5,
            duration: 160,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1040,
            useNativeDriver: true,
          }),
        ]),
      ]),
      { iterations: 3 },
    ).start();
  }, [trigger]);

  const ringSize = rs(60);
  return (
    <Animated.View
      style={{
        position: "absolute",
        width: ringSize,
        height: ringSize,
        borderRadius: ringSize / 2,
        borderWidth: 2,
        borderColor: "#C8A84B", // gold
        opacity,
        transform: [{ scale }],
      }}
    />
  );
};

// ─── Star burst cluster ───────────────────────────────────────────────────────

const STAR_PARTICLES = [
  { angle: 0,   distance: 50, delay: 0,  size: 7, color: "#C8A84B" },
  { angle: 40,  distance: 42, delay: 30, size: 5, color: "#E8C96A" },
  { angle: 80,  distance: 55, delay: 15, size: 8, color: "#F5E090" },
  { angle: 120, distance: 46, delay: 50, size: 5, color: "#C8A84B" },
  { angle: 160, distance: 52, delay: 5,  size: 7, color: "#E8C96A" },
  { angle: 200, distance: 40, delay: 45, size: 6, color: "#C8A84B" },
  { angle: 240, distance: 54, delay: 25, size: 8, color: "#F5E090" },
  { angle: 280, distance: 44, delay: 60, size: 5, color: "#E8C96A" },
  { angle: 320, distance: 48, delay: 35, size: 6, color: "#C8A84B" },
  { angle: 20,  distance: 36, delay: 70, size: 4, color: "#F5E090" },
  { angle: 100, distance: 34, delay: 80, size: 4, color: "#E8C96A" },
  { angle: 260, distance: 38, delay: 20, size: 4, color: "#C8A84B" },
];

const StarBurstCluster: React.FC<{
  trigger: boolean;
  rs: (n: number) => number;
}> = ({ trigger, rs }) => (
  <View style={styles.burstCluster}>
    <GlowRing trigger={trigger} rs={rs} />
    {STAR_PARTICLES.map((cfg, i) => (
      <StarParticle key={i} {...cfg} trigger={trigger} />
    ))}
  </View>
);

// ─── Main modal ───────────────────────────────────────────────────────────────

export const OneStarGeneralBonusMoveModal: React.FC<
  OneStarGeneralBonusMoveModalProps
> = ({ event, insets, width, rf, rs, rsv, onConfirm, onSkip }) => {
  const visible = event !== null;

  // ── Entry animation ──────────────────────────────────────────────────────
  const slideY = useRef(new Animated.Value(60)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const iconBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      slideY.setValue(60);
      fadeIn.setValue(0);
      iconBounce.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Bounce the star icon after slide-in
      Animated.sequence([
        Animated.timing(iconBounce, {
          toValue: -10,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(iconBounce, {
          toValue: 4,
          duration: 120,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(iconBounce, {
          toValue: -5,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(iconBounce, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [visible]);

  const modalWidth = Math.min(width - rs(32), rs(340));
  const bottomPad = Math.max(insets.bottom, rsv(16));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      {/* ── Backdrop ───────────────────────────────────────────────────────── */}
      <Animated.View style={[styles.backdrop, { opacity: fadeIn }]}>
        <Animated.View
          style={[
            styles.card,
            {
              width: modalWidth,
              paddingBottom: bottomPad,
              borderRadius: rs(18),
              opacity: fadeIn,
              transform: [{ translateY: slideY }],
            },
          ]}
        >
          {/* ── Star burst graphic ────────────────────────────────────────── */}
          <View style={[styles.iconArea, { height: rsv(100) }]}>
            <StarBurstCluster trigger={visible} rs={rs} />
            <Animated.Text
              style={[
                styles.iconEmoji,
                {
                  fontSize: rf(42),
                  transform: [{ translateY: iconBounce }],
                },
              ]}
            >
              ⭐
            </Animated.Text>
          </View>

          {/* ── Ability badge ─────────────────────────────────────────────── */}
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                {
                  paddingHorizontal: rs(10),
                  paddingVertical: rsv(3),
                  borderRadius: rs(20),
                },
              ]}
            >
              <Text style={[styles.badgeText, { fontSize: rf(10) }]}>
                INNATE ABILITY
              </Text>
            </View>
          </View>

          {/* ── Title ─────────────────────────────────────────────────────── */}
          <Text style={[styles.title, { fontSize: rf(22), marginTop: rsv(6) }]}>
            Press the Advantage
          </Text>

          {/* ── Rank chip ─────────────────────────────────────────────────── */}
          <View style={[styles.rankRow, { marginTop: rsv(12) }]}>
            <View
              style={[
                styles.rankChip,
                {
                  borderRadius: rs(8),
                  paddingHorizontal: rs(14),
                  paddingVertical: rsv(6),
                },
              ]}
            >
              <Text style={[styles.chipLabel, { fontSize: rf(9) }]}>
                1-STAR GENERAL
              </Text>
              <Text style={[styles.chipRank, { fontSize: rf(20) }]}>1★</Text>
            </View>
          </View>

          {/* ── Description ───────────────────────────────────────────────── */}
          <Text
            style={[
              styles.description,
              {
                fontSize: rf(13),
                marginTop: rsv(14),
                paddingHorizontal: rs(8),
              },
            ]}
          >
            Your{" "}
            <Text style={styles.highlight}>1-Star General</Text> won the
            challenge! You may immediately move{" "}
            <Text style={styles.gold}>1 additional square</Text>.
          </Text>

          <Text
            style={[
              styles.subDescription,
              {
                fontSize: rf(11.5),
                marginTop: rsv(6),
                paddingHorizontal: rs(8),
              },
            ]}
          >
            Movement only — no second challenge allowed. Skip to pass turn.
          </Text>

          {/* ── Buttons ───────────────────────────────────────────────────── */}
          <View style={[styles.buttonRow, { marginTop: rsv(18), gap: rs(10) }]}>
            <Pressable
              style={({ pressed }) => [
                styles.btnSkip,
                {
                  borderRadius: rs(10),
                  paddingVertical: rsv(11),
                  flex: 1,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={onSkip}
            >
              <Text style={[styles.btnSkipText, { fontSize: rf(13) }]}>
                Skip
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnConfirm,
                {
                  borderRadius: rs(10),
                  paddingVertical: rsv(11),
                  flex: 1,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
              onPress={onConfirm}
            >
              <Text style={[styles.btnConfirmText, { fontSize: rf(13) }]}>
                ⭐ Move Now!
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: appTheme.colors.scrim,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: appTheme.colors.mono.surface,
    alignItems: "center",
    paddingTop: 24,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: "#C8A84B",
    shadowColor: "#C8A84B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 14,
  },
  iconArea: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  burstCluster: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: {
    textAlign: "center",
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
  },
  badge: {
    backgroundColor: appTheme.surfaces.badge.backgroundColor,
    borderWidth: 1,
    borderColor: appTheme.surfaces.badge.borderColor,
  },
  badgeText: {
    color: appTheme.surfaces.badge.textColor,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  title: {
    color: appTheme.colors.mono.textPrimary,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  rankRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  rankChip: {
    alignItems: "center",
    backgroundColor: "rgba(200, 168, 75, 0.14)",
    borderWidth: 1.5,
    borderColor: "#C8A84B",
    minWidth: 90,
  },
  chipLabel: {
    color: appTheme.colors.mono.textMuted,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  chipRank: {
    color: "#E8C96A",
    fontWeight: "800",
    marginTop: 2,
  },
  description: {
    color: appTheme.colors.mono.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  highlight: {
    color: appTheme.colors.mono.textPrimary,
    fontWeight: "600",
  },
  gold: {
    color: "#E8C96A",
    fontWeight: "700",
  },
  subDescription: {
    color: appTheme.colors.mono.textMuted,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
  },
  btnSkip: {
    backgroundColor: appTheme.surfaces.commandSecondary.backgroundColor,
    borderWidth: 1,
    borderColor: appTheme.colors.mono.border,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSkipText: {
    color: appTheme.colors.mono.textSecondary,
    fontWeight: "600",
  },
  btnConfirm: {
    backgroundColor: "#8B6914",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C8A84B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  btnConfirmText: {
    color: "#F5E090",
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
