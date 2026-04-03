import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { appTheme } from "@/constants/theme";
import {
    formatCooldownTime,
    getAbilityCooldownRemaining,
    isAbilityOnCooldown,
} from "@/scripts/gameLogic";
import type { BoardPiece } from "@/scripts/types";

interface AbilityButton {
  id: string;
  label: string;
  icon: string;
  isActive: boolean;
  isDisabled: boolean;
  onPress: () => void;
  piece?: BoardPiece;
}

type Props = {
  abilities: AbilityButton[];
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
};

/**
 * Unified panel displaying all active piece abilities.
 * Shows icon buttons with cooldown countdowns.
 */
export function AbilitiesPanel({ abilities, rf, rs, rsv }: Props) {
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  // Update cooldown timers every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      const updated: Record<string, number> = {};
      abilities.forEach((ability) => {
        if (ability.piece && isAbilityOnCooldown(ability.piece)) {
          updated[ability.id] = getAbilityCooldownRemaining(ability.piece);
        } else {
          updated[ability.id] = 0;
        }
      });
      setCooldowns(updated);
    }, 500);

    return () => clearInterval(interval);
  }, [abilities]);

  if (abilities.length === 0) {
    return (
      <View
        style={[
          styles.container,
          { paddingHorizontal: rs(12), marginVertical: rsv(8) },
        ]}
      >
        <View style={[styles.placeholderBox, { minHeight: rsv(80) }]}>
          <Text style={[styles.placeholderText, { fontSize: rf(11) }]}>
            Select a Spy, Lieutenant, or Flag to use their special abilities.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingHorizontal: rs(12), marginVertical: rsv(8) },
      ]}
    >
      <View style={styles.abilitiesGrid}>
        {abilities.map((ability) => {
          const onCooldown = cooldowns[ability.id] > 0;

          return (
            <TouchableOpacity
              key={ability.id}
              style={[
                styles.abilityButton,
                ability.isActive && styles.abilityButtonActive,
                onCooldown && styles.abilityButtonCooldown,
                ability.isDisabled && styles.abilityButtonDisabled,
                {
                  width: `${100 / Math.min(abilities.length, 3)}%`,
                },
              ]}
              onPress={ability.onPress}
              disabled={ability.isDisabled || onCooldown}
              activeOpacity={0.7}
            >
              {/* Icon */}
              <Text style={[styles.abilityIcon, { fontSize: rf(28) }]}>
                {ability.icon}
              </Text>

              {/* Label */}
              <Text
                style={[
                  styles.abilityLabel,
                  { fontSize: rf(10) },
                  (ability.isActive || onCooldown) &&
                    styles.abilityLabelHighlight,
                ]}
                numberOfLines={1}
              >
                {ability.label}
              </Text>

              {/* Status/Cooldown */}
              {onCooldown && (
                <Text style={[styles.cooldownTime, { fontSize: rf(9) }]}>
                  {formatCooldownTime(cooldowns[ability.id])}
                </Text>
              )}
              {ability.isActive && !onCooldown && (
                <Text style={[styles.activeStatus, { fontSize: rf(9) }]}>
                  ACTIVE
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  abilitiesGrid: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  abilityButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F2B24",
    borderWidth: 1.5,
    borderColor: "#6B5010",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    minWidth: 90,
    ...appTheme.shadow.soft,
  },
  abilityButtonActive: {
    borderColor: appTheme.colors.brassBright,
    backgroundColor: "#38322A",
    shadowColor: appTheme.colors.brassBright,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  abilityButtonCooldown: {
    borderColor: "#808080",
    backgroundColor: "#1A1817",
    opacity: 0.6,
  },
  abilityButtonDisabled: {
    opacity: 0.4,
  },
  abilityIcon: {
    marginBottom: 4,
  },
  abilityLabel: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
    fontWeight: "600",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  abilityLabelHighlight: {
    color: appTheme.colors.brassBright,
  },
  activeStatus: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  cooldownTime: {
    color: "#E0E0E0",
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 2,
  },
  placeholderBox: {
    borderWidth: 1.5,
    borderColor: "#6B5010",
    borderRadius: 12,
    backgroundColor: "#2F2B24",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    ...appTheme.shadow.soft,
  },
  placeholderText: {
    color: appTheme.colors.brassMuted,
    fontFamily: appTheme.fonts.body,
    fontWeight: "600",
    letterSpacing: 0.3,
    textAlign: "center",
    lineHeight: 16,
  },
});
