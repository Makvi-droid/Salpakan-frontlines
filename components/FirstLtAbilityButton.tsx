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
  /** Show/hide — only true when the player's 1st Lieutenant is selected */
  visible: boolean;
  /**
   * Whether the ability is currently armed (target-selection mode active).
   * Shows a "CANCEL" state when true.
   */
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

const ABILITY_NAME = "Intel Report";
const ABILITY_DESC_IDLE =
  "Tap any visible enemy piece to learn if it is a High Rank (General) or Low Rank (Colonel and below). Does not consume your turn.";
const ABILITY_DESC_ACTIVE =
  "Tap any enemy piece on the board to assess its rank tier, or tap elsewhere to cancel.";
const ABILITY_DESC_COOLDOWN = "Recharging…";

/** Formats remaining milliseconds as "M:SS". */
function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function FirstLtAbilityButton({
  visible,
  active,
  cooldownUntil,
  rf,
  rs,
  rsv,
  onPress,
}: Props) {
  // ── Live countdown ticker ─────────────────────────────────────────────────
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

  // ── Slide-in / slide-out ──────────────────────────────────────────────────
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

  // ── Idle pulse (only when ready and not active) ───────────────────────────
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && !onCooldown && !active) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.02,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
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
  }, [visible, onCooldown, active, pulse]);

  // ── Derived display values ────────────────────────────────────────────────
  const descriptionText = onCooldown
    ? `${ABILITY_DESC_COOLDOWN} available in ${formatCountdown(remainingMs)}`
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
          active && styles.buttonActive,
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
        {/* ── Name row ─────────────────────────────────────────────────────── */}
        <View style={styles.nameRow}>
          <View
            style={[
              styles.iconPill,
              active && styles.iconPillActive,
              onCooldown && styles.iconPillCooldown,
              { borderRadius: rs(6) },
            ]}
          >
            {/* 📡 — signals intelligence / signals corps theme */}
            <Text style={[styles.iconText, { fontSize: rf(11) }]}>📡</Text>
          </View>

          <Text
            style={[
              styles.abilityName,
              active && styles.abilityNameActive,
              onCooldown && styles.abilityNameCooldown,
              { fontSize: rf(12) },
            ]}
          >
            {ABILITY_NAME}
          </Text>

          {/* ── Status pill ────────────────────────────────────────────────── */}
          {onCooldown ? (
            <View style={[styles.cooldownPill, { borderRadius: rs(99) }]}>
              <Text style={[styles.cooldownPillText, { fontSize: rf(9) }]}>
                {formatCountdown(remainingMs)}
              </Text>
            </View>
          ) : active ? (
            <View style={[styles.activePill, { borderRadius: rs(99) }]}>
              <Text style={[styles.activePillText, { fontSize: rf(9) }]}>
                CANCEL
              </Text>
            </View>
          ) : (
            <View style={[styles.readyPill, { borderRadius: rs(99) }]}>
              <Text style={[styles.readyPillText, { fontSize: rf(9) }]}>
                READY
              </Text>
            </View>
          )}
        </View>

        {/* ── Description ──────────────────────────────────────────────────── */}
        <Text
          style={[
            styles.desc,
            { fontSize: rf(10.5), marginTop: rsv(5) },
            active && styles.descActive,
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
  // ── Idle — steel-blue signals theme, distinct from every other ability ────
  button: {
    width: "100%",
    backgroundColor: "#080E18",
    borderWidth: 1.5,
    borderColor: "#2A5080",
    ...appTheme.shadow.soft,
  },
  buttonActive: {
    backgroundColor: "#0A1828",
    borderColor: "#5090C0",
    borderWidth: 2,
  },
  buttonCooldown: {
    borderColor: "#162030",
    backgroundColor: "#050810",
    opacity: 0.65,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconPill: {
    backgroundColor: "#0C1620",
    borderWidth: 1,
    borderColor: "#2A5080",
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillActive: {
    borderColor: "#5090C0",
    backgroundColor: "#102030",
  },
  iconPillCooldown: {
    borderColor: "#162030",
    backgroundColor: "#080E18",
  },
  iconText: {},
  abilityName: {
    color: "#5090C0",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 0.5,
    flex: 1,
  },
  abilityNameActive: {
    color: "#80C0F0",
  },
  abilityNameCooldown: {
    color: "#1E3850",
  },
  // ── Status pills ──────────────────────────────────────────────────────────
  readyPill: {
    backgroundColor: "#5090C0",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  readyPillText: {
    color: "#040810",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 1,
  },
  activePill: {
    backgroundColor: "#80C0F0",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activePillText: {
    color: "#040810",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 1,
  },
  cooldownPill: {
    backgroundColor: "#080E18",
    borderWidth: 1,
    borderColor: "#162030",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cooldownPillText: {
    color: "#2A5080",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 1,
  },
  // ── Description text ──────────────────────────────────────────────────────
  desc: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
    lineHeight: 15,
    opacity: 0.85,
  },
  descActive: {
    color: "#80C0F0",
    opacity: 0.9,
  },
  descCooldown: {
    color: "#1E3850",
    opacity: 0.8,
  },
});
