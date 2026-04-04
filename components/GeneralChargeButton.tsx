import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { appTheme } from "@/constants/theme";
import { GENERAL_CHARGE_COOLDOWN_MS } from "../hooks/useGeneralCharge";

type Props = {
  /** Show the button at all (only true when player's 5-Star General is selected) */
  visible: boolean;
  /** Wall-clock ms timestamp until cooldown expires; null = ready */
  cooldownUntil: number | null;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  onPress: () => void;
};

/**
 * Ability button for the 5-Star General's "Supreme Charge" —
 * lets the General move up to 2 squares in any direction for one turn.
 * Shows a countdown arc/text while the 5-minute cooldown is active.
 */
export function GeneralChargeButton({
  visible,
  cooldownUntil,
  rf,
  rs,
  rsv,
  onPress,
}: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Cooldown countdown display ─────────────────────────────────────────────
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!cooldownUntil) {
      setSecondsLeft(0);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, cooldownUntil - Date.now());
      setSecondsLeft(Math.ceil(remaining / 1000));
    };
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  // ── Fade in/out based on visibility ───────────────────────────────────────
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  if (!visible) return null;

  const isOnCooldown = cooldownUntil !== null && Date.now() < cooldownUntil;

  // Format mm:ss
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const countdownText = isOnCooldown
    ? `${minutes}:${String(seconds).padStart(2, "0")}`
    : null;

  // Cooldown progress 0→1
  const cooldownProgress =
    isOnCooldown && cooldownUntil
      ? Math.max(
          0,
          Math.min(
            1,
            (cooldownUntil - Date.now()) / GENERAL_CHARGE_COOLDOWN_MS,
          ),
        )
      : 0;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            paddingHorizontal: rs(14),
            paddingVertical: rsv(7),
            borderRadius: rs(8),
            opacity: isOnCooldown ? 0.48 : 1,
          },
        ]}
        onPress={onPress}
        disabled={isOnCooldown}
        activeOpacity={0.75}
      >
        {/* Star icon + label row */}
        <View style={styles.labelRow}>
          <Text style={[styles.icon, { fontSize: rf(13) }]}>⚡</Text>
          <Text style={[styles.label, { fontSize: rf(10) }]}>
            Supreme Charge
          </Text>
        </View>

        {/* Cooldown or READY badge */}
        {isOnCooldown ? (
          <View style={styles.cooldownRow}>
            {/* Progress bar */}
            <View
              style={[styles.progressTrack, { width: rs(90) }]}
            >
              <View
                style={[
                  styles.progressFill,
                  { width: `${cooldownProgress * 100}%` },
                ]}
              />
            </View>
            <Text style={[styles.countdown, { fontSize: rf(9) }]}>
              {countdownText}
            </Text>
          </View>
        ) : (
          <View style={styles.readyBadge}>
            <Text style={[styles.readyText, { fontSize: rf(8) }]}>READY</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={[styles.hint, { fontSize: rf(9), marginTop: rsv(4) }]}>
        {isOnCooldown
          ? "Supreme Charge recharging…"
          : "Tap to move up to 2 squares in any direction."}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    marginBottom: 0,
  },
  button: {
    backgroundColor: "#1A0E2E",
    borderWidth: 1.5,
    borderColor: "#C0A0FF",
    alignItems: "center",
    shadowColor: "#A070FF",
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
    gap: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  icon: {
    color: "#D4AAFF",
  },
  label: {
    color: "#E8D8FF",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  cooldownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(192, 160, 255, 0.22)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#C0A0FF",
    borderRadius: 2,
  },
  countdown: {
    color: "#C0A0FF",
    fontFamily: appTheme.fonts.body,
    fontWeight: "600",
    minWidth: 36,
    textAlign: "right",
  },
  readyBadge: {
    backgroundColor: "rgba(160, 100, 255, 0.22)",
    borderWidth: 1,
    borderColor: "#C0A0FF",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  readyText: {
    color: "#D4AAFF",
    fontFamily: appTheme.fonts.body,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  hint: {
    color: appTheme.surfaces.instruction.textColor,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
  },
});
