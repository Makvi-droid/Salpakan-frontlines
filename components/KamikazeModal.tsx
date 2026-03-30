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

import { appTheme } from "@/constants/theme";
import type { KamikazeEvent } from "../scripts/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KamikazeModalProps {
  event: KamikazeEvent | null;
  insets: EdgeInsets;
  width: number;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  onConfirm: () => void;
  onDecline: () => void;
}

// ─── Explosion particle component ─────────────────────────────────────────────

interface ParticleProps {
  angle: number;
  distance: number;
  delay: number;
  size: number;
  color: string;
  trigger: boolean;
}

const Particle: React.FC<ParticleProps> = ({
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
      duration: 900,
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
    inputRange: [0, 0.3, 1],
    outputRange: [0, 1, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 1.4, 0.4],
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
};

// ─── Pulse ring ───────────────────────────────────────────────────────────────

const PulseRing: React.FC<{ trigger: boolean; rs: (n: number) => number }> = ({
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
          toValue: 2.2,
          duration: 1100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.55,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 920,
            useNativeDriver: true,
          }),
        ]),
      ]),
      { iterations: 3 },
    ).start();
  }, [trigger]);

  const ringSize = rs(64);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: ringSize,
        height: ringSize,
        borderRadius: ringSize / 2,
        borderWidth: 2,
        borderColor: appTheme.colors.alert,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
};

// ─── Explosion cluster ────────────────────────────────────────────────────────

const PARTICLE_CONFIGS = [
  { angle: 0, distance: 52, delay: 0, size: 7, color: appTheme.colors.brass },
  { angle: 45, distance: 44, delay: 40, size: 5, color: appTheme.colors.alert },
  {
    angle: 90,
    distance: 58,
    delay: 20,
    size: 8,
    color: appTheme.colors.alertBright,
  },
  {
    angle: 135,
    distance: 48,
    delay: 60,
    size: 5,
    color: appTheme.colors.brassBright,
  },
  {
    angle: 180,
    distance: 54,
    delay: 10,
    size: 7,
    color: appTheme.colors.alert,
  },
  {
    angle: 225,
    distance: 42,
    delay: 50,
    size: 6,
    color: appTheme.colors.brass,
  },
  {
    angle: 270,
    distance: 56,
    delay: 30,
    size: 8,
    color: appTheme.colors.alertBright,
  },
  {
    angle: 315,
    distance: 46,
    delay: 70,
    size: 5,
    color: appTheme.colors.brassBright,
  },
  {
    angle: 22,
    distance: 38,
    delay: 80,
    size: 4,
    color: appTheme.colors.parchmentSoft,
  },
  {
    angle: 157,
    distance: 36,
    delay: 90,
    size: 4,
    color: appTheme.colors.parchmentSoft,
  },
  {
    angle: 202,
    distance: 40,
    delay: 25,
    size: 4,
    color: appTheme.colors.alertBright,
  },
  {
    angle: 337,
    distance: 34,
    delay: 55,
    size: 4,
    color: appTheme.colors.alert,
  },
];

const ExplosionCluster: React.FC<{
  trigger: boolean;
  rs: (n: number) => number;
}> = ({ trigger, rs }) => {
  return (
    <View style={styles.explosionCluster}>
      <PulseRing trigger={trigger} rs={rs} />
      {PARTICLE_CONFIGS.map((cfg, i) => (
        <Particle key={i} {...cfg} trigger={trigger} />
      ))}
    </View>
  );
};

// ─── Main modal ───────────────────────────────────────────────────────────────

export const KamikazeModal: React.FC<KamikazeModalProps> = ({
  event,
  insets,
  width,
  rf,
  rs,
  rsv,
  onConfirm,
  onDecline,
}) => {
  const visible = event !== null;

  // ── Entry animation ──────────────────────────────────────────────────────
  const slideY = useRef(new Animated.Value(60)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const iconShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      slideY.setValue(60);
      fadeIn.setValue(0);
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
      Animated.sequence([
        Animated.timing(iconShake, {
          toValue: 6,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(iconShake, {
          toValue: -6,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(iconShake, {
          toValue: 4,
          duration: 55,
          useNativeDriver: true,
        }),
        Animated.timing(iconShake, {
          toValue: -4,
          duration: 55,
          useNativeDriver: true,
        }),
        Animated.timing(iconShake, {
          toValue: 0,
          duration: 45,
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
          {/* ── Explosion graphic ─────────────────────────────────────────── */}
          <View style={[styles.iconArea, { height: rsv(100) }]}>
            <ExplosionCluster trigger={visible} rs={rs} />
            <Animated.Text
              style={[
                styles.iconEmoji,
                {
                  fontSize: rf(42),
                  transform: [{ translateX: iconShake }],
                },
              ]}
            >
              💥
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
            Kamikaze
          </Text>

          {/* ── Matchup display ───────────────────────────────────────────── */}
          <View style={[styles.matchupRow, { marginTop: rsv(12), gap: rs(8) }]}>
            {/* Player's Private — rank shown */}
            <View
              style={[
                styles.pieceChip,
                styles.pieceChipPlayer,
                {
                  borderRadius: rs(8),
                  paddingHorizontal: rs(10),
                  paddingVertical: rsv(6),
                },
              ]}
            >
              <Text style={[styles.chipLabel, { fontSize: rf(9) }]}>
                YOUR PRIVATE
              </Text>
              <Text style={[styles.chipRank, { fontSize: rf(17) }]}>
                {event?.attackerShortLabel ?? "Pvt"}
              </Text>
            </View>

            <Text style={[styles.vsText, { fontSize: rf(13) }]}>VS</Text>

            {/* Enemy piece — rank intentionally hidden, no reveal */}
            <View
              style={[
                styles.pieceChip,
                styles.pieceChipEnemy,
                {
                  borderRadius: rs(8),
                  paddingHorizontal: rs(10),
                  paddingVertical: rsv(6),
                },
              ]}
            >
              <Text style={[styles.chipLabel, { fontSize: rf(9) }]}>ENEMY</Text>
              <Text style={[styles.chipRankHidden, { fontSize: rf(17) }]}>
                ???
              </Text>
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
            Your Private can detonate on an{" "}
            <Text style={styles.highlight}>enemy piece</Text>. Both units will
            be <Text style={styles.danger}>eliminated</Text> — regardless of
            rank.
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
            Decline to fight normally instead.
          </Text>

          {/* ── Buttons ───────────────────────────────────────────────────── */}
          <View style={[styles.buttonRow, { marginTop: rsv(18), gap: rs(10) }]}>
            <Pressable
              style={({ pressed }) => [
                styles.btnDecline,
                {
                  borderRadius: rs(10),
                  paddingVertical: rsv(11),
                  flex: 1,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={onDecline}
            >
              <Text style={[styles.btnDeclineText, { fontSize: rf(13) }]}>
                Decline
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
                💥 Kamikaze!
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
    borderColor: appTheme.colors.alertBright,
    shadowColor: appTheme.colors.alert,
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
  explosionCluster: {
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
  matchupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  pieceChip: {
    alignItems: "center",
    minWidth: 72,
  },
  pieceChipPlayer: {
    backgroundColor: "rgba(199, 163, 84, 0.14)", // brass tint
    borderWidth: 1.5,
    borderColor: appTheme.colors.mono.border,
  },
  pieceChipEnemy: {
    backgroundColor: "rgba(139, 46, 36, 0.22)", // alert tint
    borderWidth: 1.5,
    borderColor: appTheme.colors.alertBright,
  },
  chipLabel: {
    color: appTheme.colors.mono.textMuted,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  chipRank: {
    color: appTheme.colors.mono.textPrimary,
    fontWeight: "800",
    marginTop: 2,
  },
  // Enemy rank hidden — shown as "???" in muted style
  chipRankHidden: {
    color: appTheme.colors.mono.textMuted,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: 3,
  },
  vsText: {
    color: appTheme.colors.mono.textSecondary,
    fontWeight: "700",
    letterSpacing: 1,
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
  danger: {
    color: appTheme.colors.alertBright,
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
  btnDecline: {
    backgroundColor: appTheme.surfaces.commandSecondary.backgroundColor,
    borderWidth: 1,
    borderColor: appTheme.colors.mono.border,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDeclineText: {
    color: appTheme.colors.mono.textSecondary,
    fontWeight: "600",
  },
  btnConfirm: {
    backgroundColor: appTheme.colors.alert,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: appTheme.colors.alertBright,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  btnConfirmText: {
    color: appTheme.colors.ink,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
