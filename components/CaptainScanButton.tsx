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
  /** Show/hide the button — only true when the player's Captain is selected */
  visible: boolean;
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

const ABILITY_NAME = "Threat Scan";
const ABILITY_DESC_IDLE =
  "Instantly reveal the true rank of all enemy pieces in the 4 adjacent squares (Up, Down, Left, Right) for 1.5 seconds.";
const ABILITY_DESC_COOLDOWN = "Recharging…";

/** Formats remaining milliseconds as "M:SS". */
function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Floats below the board grid when the player's Captain is selected during
 * battle. Unlike most abilities this fires immediately on button press — there
 * is no two-step target-selection mode. A 5-minute cooldown starts after use.
 */
export function CaptainScanButton({
  visible,
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

  // ── Idle pulse (only when ready) ─────────────────────────────────────────────
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && !onCooldown) {
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
  }, [visible, onCooldown, pulse]);

  // ── Derived display values ───────────────────────────────────────────────────
  const descriptionText = onCooldown
    ? `${ABILITY_DESC_COOLDOWN} available in ${formatCountdown(remainingMs)}`
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
            {/* 📡 — signals radar / scan theme */}
            <Text style={[styles.iconText, { fontSize: rf(11) }]}>📡</Text>
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

          {/* ── Status pill: READY or cooldown timer ──────────────────────── */}
          {onCooldown ? (
            <View style={[styles.cooldownPill, { borderRadius: rs(99) }]}>
              <Text style={[styles.cooldownPillText, { fontSize: rf(9) }]}>
                {formatCountdown(remainingMs)}
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

        {/* ── Description ────────────────────────────────────────────────────── */}
        <Text
          style={[
            styles.desc,
            { fontSize: rf(10.5), marginTop: rsv(5) },
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
  // ── Idle — steel-blue / radar theme, distinct from all existing abilities ─────
  button: {
    width: "100%",
    backgroundColor: "#080E18",
    borderWidth: 1.5,
    borderColor: "#1E4A6A",
    ...appTheme.shadow.soft,
  },
  buttonCooldown: {
    borderColor: "#162030",
    backgroundColor: "#060810",
    opacity: 0.65,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconPill: {
    backgroundColor: "#0C1A28",
    borderWidth: 1,
    borderColor: "#1E4A6A",
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillCooldown: {
    borderColor: "#102030",
    backgroundColor: "#080E18",
  },
  iconText: {},
  abilityName: {
    color: "#4A9ED0",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 0.5,
    flex: 1,
  },
  abilityNameCooldown: {
    color: "#1E3A50",
  },
  readyPill: {
    backgroundColor: "#4A9ED0",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  readyPillText: {
    color: "#04080E",
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
    color: "#1E4A6A",
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
  descCooldown: {
    color: "#1E3A50",
    opacity: 0.8,
  },
});
