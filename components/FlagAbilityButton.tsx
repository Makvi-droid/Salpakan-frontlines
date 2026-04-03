import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { appTheme } from "@/constants/theme";
import {
  formatCooldownTime,
  getAbilityCooldownRemaining,
  isAbilityOnCooldown,
} from "@/scripts/gameLogic";
import type { BoardPiece } from "@/scripts/types";

type Props = {
  /** Show/hide the entire button — only true when the Flag is selected in battle */
  visible: boolean;
  /** True while the player is in ally-picking mode */
  active: boolean;
  /** The Flag piece; used to check cooldown status */
  flagPiece?: BoardPiece;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  onPress: () => void;
};

const ABILITY_NAME = "Shadow March";
const ABILITY_DESC_IDLE = "Swap the Flag with any allied piece on the board.";
const ABILITY_DESC_ACTIVE = "Select an ally to swap positions with the Flag.";

/**
 * Floats below the board grid when the player's Flag is selected during battle.
 * Tapping it activates swap-target mode (allies glow on the board).
 * Tapping it again while active cancels the ability.
 */
export function FlagAbilityButton({
  visible,
  active,
  flagPiece,
  rf,
  rs,
  rsv,
  onPress,
}: Props) {
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

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

  // ── Cooldown update ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!flagPiece || !isAbilityOnCooldown(flagPiece)) {
      setCooldownRemaining(0);
      return;
    }

    const updateCooldown = () => {
      const remaining = getAbilityCooldownRemaining(flagPiece);
      setCooldownRemaining(remaining);
      if (remaining > 0) {
        setTimeout(updateCooldown, 500);
      }
    };

    updateCooldown();
  }, [flagPiece]);

  // ── Pulse when active ────────────────────────────────────────────────────────
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active && flagPiece && !isAbilityOnCooldown(flagPiece)) {
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
  }, [active, flagPiece, pulse]);

  const isOnCooldown = flagPiece && isAbilityOnCooldown(flagPiece);
  const descText = isOnCooldown
    ? `On cooldown for ${formatCooldownTime(cooldownRemaining)}.`
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
          active && !isOnCooldown && styles.buttonActive,
          isOnCooldown && styles.buttonCooldown,
          {
            borderRadius: rs(10),
            paddingVertical: rsv(10),
            paddingHorizontal: rs(14),
          },
        ]}
        onPress={onPress}
        activeOpacity={isOnCooldown ? 1 : 0.8}
        disabled={isOnCooldown}
      >
        {/* ── Name row ───────────────────────────────────────────────────────── */}
        <View style={styles.nameRow}>
          <View style={[styles.iconPill, { borderRadius: rs(6) }]}>
            <Text style={[styles.iconText, { fontSize: rf(11) }]}>🏳</Text>
          </View>

          <Text style={[styles.abilityName, { fontSize: rf(12) }]}>
            {ABILITY_NAME}
          </Text>

          {active && !isOnCooldown && (
            <View style={[styles.activePill, { borderRadius: rs(99) }]}>
              <Text style={[styles.activePillText, { fontSize: rf(9) }]}>
                ACTIVE
              </Text>
            </View>
          )}

          {isOnCooldown && (
            <View style={[styles.cooldownPill, { borderRadius: rs(99) }]}>
              <Text style={[styles.cooldownPillText, { fontSize: rf(8) }]}>
                {formatCooldownTime(cooldownRemaining)}
              </Text>
            </View>
          )}
        </View>

        {/* ── Description ────────────────────────────────────────────────────── */}
        <Text
          style={[
            styles.desc,
            { fontSize: rf(10.5), marginTop: rsv(5) },
            (active || isOnCooldown) && styles.descActive,
          ]}
        >
          {descText}
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
    // Gold glow — elevation fallback for Android
    shadowColor: appTheme.colors.brassBright,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  buttonCooldown: {
    borderColor: "#808080",
    backgroundColor: "#1A1817",
    opacity: 0.7,
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
    backgroundColor: "#808080",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cooldownPillText: {
    color: "#E0E0E0",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 0.5,
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
});
