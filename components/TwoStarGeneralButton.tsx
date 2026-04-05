import { appTheme } from "@/constants/theme";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type Props = {
  visible: boolean;
  /** True while the player is in target-select mode (waiting to tap an enemy). */
  active: boolean;
  /** Timestamp (Date.now() + ms) after which the ability is off cooldown. */
  cooldownUntil: number | null;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  onPress: () => void;
};

/**
 * TwoStarGeneralButton
 *
 * Ability: "Hold the Line"
 *  - Tap to enter target-select mode, then tap ANY enemy piece on the board.
 *  - That piece cannot move backward for 2 full rounds.
 *  - 5-minute cooldown after use.
 *
 * Colour accent: deep amber / burnt-orange — distinct from all existing
 * ability buttons (teal, olive-green, blue, purple, orange).
 */
export function TwoStarGeneralButton({
  visible,
  active,
  cooldownUntil,
  rf,
  rs,
  rsv,
  onPress,
}: Props) {
  const [, forceUpdate] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Refresh every second so the countdown label stays live.
  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  // Pulse animation while active (target-select armed).
  useEffect(() => {
    if (active) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 520,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 520,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => pulseLoop.current?.stop();
  }, [active, pulseAnim]);

  if (!visible) return null;

  const now = Date.now();
  const isOnCooldown = cooldownUntil !== null && now < cooldownUntil;
  const disabled = isOnCooldown;

  // Format remaining cooldown as M:SS.
  let cooldownLabel = "";
  if (isOnCooldown && cooldownUntil !== null) {
    const remainMs = Math.max(0, cooldownUntil - now);
    const totalSec = Math.ceil(remainMs / 1_000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    cooldownLabel = `${mins}:${String(secs).padStart(2, "0")}`;
  }

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity
        style={[
          styles.btn,
          {
            paddingVertical: rsv(8),
            paddingHorizontal: rs(14),
            borderRadius: rs(10),
            opacity: disabled ? 0.45 : 1,
            borderColor: active
              ? appTheme.colors.brassBright // gold when armed
              : isOnCooldown
                ? "#555"
                : "#D47C2A", // burnt-orange when ready
            borderWidth: active ? 2 : 1.5,
            backgroundColor: active
              ? "rgba(212, 124, 42, 0.22)"
              : isOnCooldown
                ? "rgba(60, 60, 60, 0.55)"
                : "rgba(60, 30, 5, 0.85)",
          },
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.75}
      >
        <View style={styles.row}>
          {/* Icon — shield with a lock conveys "restrict / pin down" */}
          <Text style={[styles.icon, { fontSize: rf(13) }]}>🛡️</Text>

          <View style={styles.textCol}>
            <Text
              style={[
                styles.label,
                { fontSize: rf(9.5) },
                active && styles.labelActive,
                isOnCooldown && styles.labelCooldown,
              ]}
            >
              {active ? "Cancel Hold the Line" : "Hold the Line"}
            </Text>

            <Text
              style={[
                styles.subLabel,
                { fontSize: rf(8) },
                isOnCooldown && styles.subLabelCooldown,
              ]}
            >
              {isOnCooldown
                ? `Cooldown  ${cooldownLabel}`
                : active
                  ? "Tap any enemy piece to restrict"
                  : "Block an enemy from retreating for 2 rounds"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderStyle: "solid",
    alignSelf: "stretch",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textCol: {
    flex: 1,
  },
  icon: {
    lineHeight: 22,
  },
  label: {
    color: "#D47C2A",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  labelActive: {
    color: appTheme.colors.brassBright,
  },
  labelCooldown: {
    color: "#888",
  },
  subLabel: {
    color: "rgba(220, 170, 100, 0.75)",
    fontFamily: appTheme.fonts.body,
    marginTop: 1,
  },
  subLabelCooldown: {
    color: "#666",
  },
});
