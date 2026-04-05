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
  /** True while the player is in tile-select mode (waiting to tap a bonus move tile). */
  active: boolean;
  /** Timestamp (Date.now() + ms) after which the ability is off cooldown. */
  cooldownUntil: number | null;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  onPress: () => void;
};

/**
 * OneStarGeneralButton
 *
 * Ability: "Press the Advantage" — after winning a challenge, the 1-Star
 * General may immediately move 1 additional square (no second challenge).
 * 5-minute cooldown.
 *
 * Accent colour: gold (#C8A84B) — distinct from all other ability buttons.
 */
export function OneStarGeneralButton({
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

  // Refresh every second so the countdown label stays live
  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  // Pulse animation while active (tile-select mode armed)
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

  // Format remaining cooldown as M:SS
  let cooldownLabel = "";
  if (isOnCooldown && cooldownUntil !== null) {
    const remainMs = Math.max(0, cooldownUntil - now);
    const totalSec = Math.ceil(remainMs / 1_000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    cooldownLabel = `${mins}:${String(secs).padStart(2, "0")}`;
  }

  const GOLD = "#C8A84B";
  const GOLD_BRIGHT = "#E8C96A";

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
              ? appTheme.colors.brassBright // bright gold when armed
              : isOnCooldown
                ? "#555"
                : GOLD,
            borderWidth: active ? 2 : 1.5,
            backgroundColor: active
              ? "rgba(200, 168, 75, 0.20)"
              : isOnCooldown
                ? "rgba(60, 60, 60, 0.55)"
                : "rgba(60, 45, 10, 0.82)",
          },
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.75}
      >
        <View style={styles.row}>
          {/* Icon */}
          <Text style={[styles.icon, { fontSize: rf(13) }]}>⭐</Text>

          <View style={styles.textCol}>
            <Text
              style={[
                styles.label,
                { fontSize: rf(9.5), color: active ? appTheme.colors.brassBright : isOnCooldown ? "#888" : GOLD_BRIGHT },
                isOnCooldown && styles.labelCooldown,
              ]}
            >
              {active ? "Cancel Bonus Move" : "Press the Advantage"}
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
                  ? "Tap an empty adjacent tile"
                  : "Move 1 extra square after winning"}
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
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  labelCooldown: {
    color: "#888",
  },
  subLabel: {
    color: "rgba(220, 190, 110, 0.75)",
    fontFamily: appTheme.fonts.body,
    marginTop: 1,
  },
  subLabelCooldown: {
    color: "#666",
  },
});
