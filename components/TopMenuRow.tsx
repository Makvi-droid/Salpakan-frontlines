import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { appTheme } from "@/constants/theme";
import type { AIProfile, Phase } from "../scripts/types";

type Props = {
  phase: Phase;
  aiProfile: AIProfile;
  topMenuHeight: number;
  marginBottom: number;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  onLeftAction: () => void;
};

export function TopMenuRow({
  phase,
  aiProfile,
  topMenuHeight,
  marginBottom,
  rf,
  rs,
  rsv,
  onLeftAction,
}: Props) {
  const phaseLabel =
    phase === "formation"
      ? "FORMATION PHASE"
      : phase === "battle"
        ? "BATTLE PHASE"
        : "MATCH RESOLVED";

  const leftIcon =
    phase === "formation"
      ? "arrow-left"
      : phase === "battle"
        ? "flag-variant-outline"
        : "home-outline";

  const leftLabel =
    phase === "formation"
      ? "Menu"
      : phase === "battle"
        ? "Surrender"
        : "Main Menu";

  return (
    <View style={[styles.row, { minHeight: topMenuHeight, marginBottom }]}>
      <View style={[styles.sideSlot, styles.sideLeft]}>
        <TouchableOpacity
          style={[
            styles.menuButton,
            {
              paddingVertical: rsv(6),
              paddingHorizontal: rs(10),
              borderRadius: rs(12),
            },
          ]}
          onPress={onLeftAction}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name={leftIcon}
            size={rf(18)}
            color={appTheme.colors.brassBright}
          />
          <Text style={[styles.menuButtonText, { fontSize: rf(13) }]}> 
            {leftLabel}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.center}>
        <Text style={[styles.phaseLabel, { fontSize: rf(9) }]}>
          {phaseLabel}
        </Text>
        <Text style={[styles.title, { fontSize: rf(24) }]}>Salpakan</Text>
      </View>

      <View style={[styles.sideSlot, styles.sideRight]}>
        <View
          style={[
            styles.badge,
            {
              paddingHorizontal: rs(10),
              paddingVertical: rsv(6),
              borderRadius: rs(14),
            },
          ]}
        >
          <Text style={[styles.badgeText, { fontSize: rf(10) }]}> 
            {aiProfile.label}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sideSlot: {
    flex: 1,
  },
  sideLeft: {
    alignItems: "flex-start",
  },
  sideRight: {
    alignItems: "flex-end",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  phaseLabel: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1,
  },
  title: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    letterSpacing: 0.15,
    textTransform: "uppercase",
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: appTheme.surfaces.commandSecondary.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.commandSecondary.borderColor,
  },
  menuButtonText: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.body,
  },
  badge: {
    backgroundColor: appTheme.surfaces.badge.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.badge.borderColor,
  },
  badgeText: {
    color: appTheme.surfaces.badge.textColor,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
});
