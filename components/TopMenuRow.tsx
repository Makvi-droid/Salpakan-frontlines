import { appTheme } from "@/constants/theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  isMuted: boolean;
  onToggleMute: () => void;
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
  isMuted,
  onToggleMute,
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
      {/* ── Left slot: back / surrender / main menu ── */}
      <View style={[styles.sideSlot, styles.sideLeft]}>
        <TouchableOpacity
          onPress={onLeftAction}
          style={[
            styles.menuButton,
            {
              minHeight: topMenuHeight,
              paddingHorizontal: rs(10),
              paddingVertical: rsv(6),
            },
          ]}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name={leftIcon}
            size={rf(16)}
            color={appTheme.colors.ink}
          />
          <Text style={[styles.menuButtonText, { fontSize: rf(11) }]}>
            {leftLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Center: phase label + title ── */}
      <View style={styles.center}>
        <Text style={[styles.phaseLabel, { fontSize: rf(9) }]}>
          {phaseLabel}
        </Text>
        <Text style={[styles.title, { fontSize: rf(24) }]}>Salpakan</Text>
      </View>

      {/* ── Right slot: mute toggle ── */}
      <View style={[styles.sideSlot, styles.sideRight]}>
        <TouchableOpacity
          onPress={onToggleMute}
          style={[
            styles.menuButton,
            styles.muteButton,
            {
              minHeight: topMenuHeight,
              paddingHorizontal: rs(10),
              paddingVertical: rsv(6),
            },
          ]}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name={isMuted ? "volume-off" : "volume-high"}
            size={rf(16)}
            color={appTheme.colors.ink}
          />
          <Text style={[styles.menuButtonText, { fontSize: rf(11) }]}>
            {isMuted ? "Muted" : "Music"}
          </Text>
        </TouchableOpacity>
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
  muteButton: {
    justifyContent: "flex-end",
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
