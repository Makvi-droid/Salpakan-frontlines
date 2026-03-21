import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { appTheme } from "@/constants/theme";
import type { Side } from "../scripts/types";

type Props = {
  winner: Side | null;
  turn: Side;
  aiThinking: boolean;
  aiLabel: string;
  capturedPlayerNames: string;
  capturedAINames: string;
  panelRadius: number;
  cardPadding: number;
  verticalSectionGap: number;
  compactCardGap: number;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  isUltraCompactHeight: boolean;
  isCompactHeight: boolean;
};

export function BattleInfoPanel({
  winner,
  turn,
  aiThinking,
  aiLabel,
  capturedPlayerNames,
  capturedAINames,
  panelRadius,
  cardPadding,
  verticalSectionGap,
  compactCardGap,
  rf,
  rs,
  rsv,
  isUltraCompactHeight,
  isCompactHeight,
}: Props) {
  const turnLabel = winner
    ? winner === "player"
      ? "Victory"
      : "Defeat"
    : turn === "player"
      ? "Your turn"
      : "Enemy turn";

  const panelTitle = winner
    ? winner === "player"
      ? "Field secured"
      : "Line broken"
    : "Clash in progress";

  return (
    <View
      style={[
        styles.panel,
        {
          borderRadius: panelRadius,
          paddingHorizontal: cardPadding,
          paddingTop: rsv(
            isUltraCompactHeight ? 10 : isCompactHeight ? 11 : 12,
          ),
          paddingBottom: rsv(isUltraCompactHeight ? 10 : 12),
        },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.label, { fontSize: rf(10) }]}>
            BATTLEFIELD INTEL
          </Text>
          <Text
            style={[styles.title, { fontSize: rf(isCompactHeight ? 18 : 20) }]}
          >
            {panelTitle}
          </Text>
        </View>
        <View
          style={[
            styles.pill,
            {
              borderRadius: rs(12),
              paddingHorizontal: rs(10),
              paddingVertical: rsv(6),
            },
          ]}
        >
          <Text style={[styles.pillText, { fontSize: rf(11) }]}>
            {aiThinking ? `${aiLabel} thinking` : turnLabel}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.strip,
          { gap: compactCardGap, marginTop: verticalSectionGap },
        ]}
      >
        <View style={styles.item}>
          <Text style={[styles.itemLabel, { fontSize: rf(10) }]}>
            Your losses
          </Text>
          <Text style={[styles.itemValue, { fontSize: rf(13) }]}>
            {capturedPlayerNames || "None"}
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={[styles.itemLabel, { fontSize: rf(10) }]}>
            Enemy losses
          </Text>
          <Text style={[styles.itemValue, { fontSize: rf(13) }]}>
            {capturedAINames || "None"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: "100%",
    backgroundColor: appTheme.surfaces.section.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.section.borderColor,
    ...appTheme.shadow.soft,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1,
  },
  title: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    textTransform: "uppercase",
  },
  pill: {
    backgroundColor: appTheme.surfaces.commandSecondary.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.commandSecondary.borderColor,
  },
  pillText: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  strip: { width: "100%", flexDirection: "row", flexWrap: "wrap" },
  item: {
    flex: 1,
    minWidth: 120,
    backgroundColor: appTheme.surfaces.inset.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.inset.borderColor,
    borderRadius: appTheme.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  itemLabel: {
    color: appTheme.colors.inkSoft,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  itemValue: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.body,
    marginTop: 2,
  },
});
