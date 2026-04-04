import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { appTheme } from "@/constants/theme";

type Props = {
  /** Show/hide the entire button — only true when the 4-Star General is selected in battle */
  visible: boolean;
  /** True while the player is in push-target-picking mode */
  active: boolean;
  /**
   * Wall-clock timestamp (ms) until which the ability is on cooldown.
   * null or a past timestamp = not on cooldown.
   */
  cooldownUntil: number | null;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  onPress: () => void;
};

const ABILITY_NAME = "Iron Shove";
const ABILITY_DESC_IDLE =
  "Push an adjacent enemy piece 1 square away from the General. " +
  "Only available when the target square behind the enemy is empty.";
const ABILITY_DESC_ACTIVE =
  "Select a highlighted adjacent enemy to push it back 1 square.";

/** Formats remaining milliseconds as "M:SS". */
function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Floats below the board grid when the player's 4-Star General is selected
 * during battle. Tapping it activates push-target mode (pushable adjacent
 * enemies glow on the board). Tapping it again while active cancels.
 * Shows a live countdown when the 5-minute cooldown is active.
 */
export function FourStarPushButton({
  visible,
  active,
  cooldownUntil,
  rf,
  rs,
  rsv,
  onPress,
}: Props) {
  // ── Live countdown ticker ────────────────────────────────────────────────────
  const [remainingMs, setRemainingMs] = useState<number>(0);

  useEffect(() => {
    if (!cooldownUntil) {
      setRemainingMs(0);
      return;
    }

    const tick = () => {
      const diff = cooldownUntil - Date.now();
      setRemainingMs(Math.max(0, diff));
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const onCooldown = remainingMs > 0;

  // ── Slide-in / slide-out ─────────────────────────────────────────────────────
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: visible ? 0 : 10,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, opacity, translateY]);

  // ── Pulse when active (suppressed during cooldown) ───────────────────────────
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active && !onCooldown) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.025,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      Animated.timing(pulse, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [active, onCooldown, pulse]);

  // ── Derived display values ───────────────────────────────────────────────────
  const descriptionText = onCooldown
    ? `Ability recharging — available in ${formatCountdown(remainingMs)}`
    : active
      ? ABILITY_DESC_ACTIVE
      : ABILITY_DESC_IDLE;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { opacity, transform: [{ translateY }, { scale: pulse }] },
      ]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <TouchableOpacity
        style={[
          styles.button,
          active && !onCooldown && styles.buttonActive,
          onCooldown && styles.buttonCooldown,
          {
            borderRadius: rs(10),
            paddingVertical: rsv(10),
            paddingHorizontal: rs(14),
          },
        ]}
        onPress={onCooldown ? undefined : onPress}
        activeOpacity={onCooldown ? 1 : 0.8}
        disabled={onCooldown}
      >
        {/* ── Name row ───────────────────────────────────────────────────────── */}
        <View style={styles.nameRow}>
          <View
            style={[
              styles.iconPill,
              onCooldown && styles.iconPillCooldown,
              { borderRadius: rs(6) },
            ]}
          >
            <Text style={[styles.iconText, { fontSize: rf(11) }]}>💢</Text>
          </View>

          <Text
            style={[
              styles.abilityName,
              onCooldown && styles.abilityNameCooldown,
              { fontSize: rf(12) },
            ]}
          >
            {ABILITY_NAME}
          </Text>

          {/* ── Status pill: ACTIVE or cooldown timer ──────────────────────── */}
          {onCooldown ? (
            <View style={[styles.cooldownPill, { borderRadius: rs(99) }]}>
              <Text style={[styles.cooldownPillText, { fontSize: rf(9) }]}>
                {formatCountdown(remainingMs)}
              </Text>
            </View>
          ) : (
            active && (
              <View style={[styles.activePill, { borderRadius: rs(99) }]}>
                <Text style={[styles.activePillText, { fontSize: rf(9) }]}>
                  ACTIVE
                </Text>
              </View>
            )
          )}
        </View>

        {/* ── Description ────────────────────────────────────────────────────── */}
        <Text
          style={[
            styles.desc,
            { fontSize: rf(10.5), marginTop: rsv(5) },
            active && !onCooldown && styles.descActive,
            onCooldown && styles.descCooldown,
          ]}
        >
          {descriptionText}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    marginBottom: 10,
  },
  button: {
    width: "100%",
    backgroundColor: "#191107",
    borderWidth: 1.5,
    borderColor: "#6B5010",
    ...appTheme.shadow.soft,
  },
  buttonActive: {
    borderColor: appTheme.colors.brassBright,
    backgroundColor: "#221A05",
    shadowColor: appTheme.colors.brassBright,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  buttonCooldown: {
    borderColor: "#3A3020",
    backgroundColor: "#110E06",
    opacity: 0.65,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconPill: {
    backgroundColor: "#2D2108",
    borderWidth: 1,
    borderColor: "#6B5010",
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillCooldown: {
    borderColor: "#3A3020",
    backgroundColor: "#1A150A",
  },
  iconText: {
    // emoji sizing handled via fontSize prop above
  },
  abilityName: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 0.5,
    flex: 1,
  },
  abilityNameCooldown: {
    color: "#5A4A20",
  },
  activePill: {
    backgroundColor: appTheme.colors.brassBright,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activePillText: {
    color: "#1A1108",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 1,
  },
  cooldownPill: {
    backgroundColor: "#2A2010",
    borderWidth: 1,
    borderColor: "#4A3A18",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cooldownPillText: {
    color: "#7A6030",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 1,
  },
  desc: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
    lineHeight: 15,
    opacity: 0.85,
  },
  descActive: {
    color: appTheme.colors.brassBright,
    opacity: 1,
  },
  descCooldown: {
    color: "#5A4A20",
    opacity: 0.8,
  },
});
