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
  visible: boolean;
  active: boolean;
  cooldownUntil: number | null;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  onPress: () => void;
};

const ABILITY_NAME = "Suppression Fire";
const ABILITY_DESC_IDLE =
  "Select an adjacent enemy piece — that piece cannot move on its next turn.";
const ABILITY_DESC_ACTIVE =
  "Tap a highlighted adjacent enemy to suppress them, or tap elsewhere to cancel.";
const ABILITY_DESC_COOLDOWN = "Recharging…";

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function LtColonelStunButton({
  visible,
  active,
  cooldownUntil,
  rf,
  rs,
  rsv,
  onPress,
}: Props) {
  const [remainingMs, setRemainingMs] = useState<number>(0);

  useEffect(() => {
    if (!cooldownUntil) {
      setRemainingMs(0);
      return;
    }
    const tick = () => setRemainingMs(Math.max(0, cooldownUntil - Date.now()));
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const onCooldown = remainingMs > 0;

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
          active && !onCooldown && styles.buttonActive,
          onCooldown && styles.buttonCooldown,
          {
            borderRadius: rs(10),
            paddingVertical: rsv(12),
            paddingHorizontal: rs(14),
          },
        ]}
        onPress={onCooldown ? undefined : onPress}
        activeOpacity={onCooldown ? 1 : 0.8}
        disabled={onCooldown}
      >
        <View style={styles.nameRow}>
          <View
            style={[
              styles.iconPill,
              active && !onCooldown && styles.iconPillActive,
              onCooldown && styles.iconPillCooldown,
              { borderRadius: rs(6) },
            ]}
          >
            <Text style={[styles.iconText, { fontSize: rf(13) }]}>🎯</Text>
          </View>

          <Text
            style={[
              styles.abilityName,
              active && !onCooldown && styles.abilityNameActive,
              onCooldown && styles.abilityNameCooldown,
              { fontSize: rf(14) },
            ]}
          >
            {ABILITY_NAME}
          </Text>

          {onCooldown ? (
            <View style={[styles.cooldownPill, { borderRadius: rs(99) }]}>
              <Text style={[styles.cooldownPillText, { fontSize: rf(10) }]}>
                {formatCountdown(remainingMs)}
              </Text>
            </View>
          ) : active ? (
            <View style={[styles.activePill, { borderRadius: rs(99) }]}>
              <Text style={[styles.activePillText, { fontSize: rf(10) }]}>
                CANCEL
              </Text>
            </View>
          ) : (
            <View style={[styles.readyPill, { borderRadius: rs(99) }]}>
              <Text style={[styles.readyPillText, { fontSize: rf(10) }]}>
                READY
              </Text>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.desc,
            { fontSize: rf(12), marginTop: rsv(6) },
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
  wrapper: { width: "100%", marginBottom: 10 },
  button: {
    width: "100%",
    backgroundColor: "#071410",
    borderWidth: 1.5,
    borderColor: "#1E6A52",
    ...appTheme.shadow.soft,
  },
  buttonActive: {
    borderColor: "#3ECFB0",
    backgroundColor: "#0A2018",
    shadowColor: "#3ECFB0",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  buttonCooldown: {
    borderColor: "#1A2E28",
    backgroundColor: "#040C0A",
    opacity: 0.65,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconPill: {
    backgroundColor: "#0C2820",
    borderWidth: 1,
    borderColor: "#1E6A52",
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillActive: { borderColor: "#3ECFB0", backgroundColor: "#102818" },
  iconPillCooldown: { borderColor: "#1A2E28", backgroundColor: "#071410" },
  iconText: {},
  abilityName: {
    color: "#3ECFB0",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 0.5,
    flex: 1,
  },
  abilityNameActive: { color: "#6EEFD0" },
  abilityNameCooldown: { color: "#1A4A3A" },
  readyPill: {
    backgroundColor: "#1E6A52",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  readyPillText: {
    color: "#040C0A",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 1,
  },
  activePill: {
    backgroundColor: "#3ECFB0",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activePillText: {
    color: "#040C0A",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 1,
  },
  cooldownPill: {
    backgroundColor: "#071410",
    borderWidth: 1,
    borderColor: "#1A2E28",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cooldownPillText: {
    color: "#1E6A52",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 1,
  },
  desc: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
    lineHeight: 18,
    opacity: 0.85,
  },
  descActive: { color: "#6EEFD0", opacity: 1 },
  descCooldown: { color: "#1A4A3A", opacity: 0.8 },
});
