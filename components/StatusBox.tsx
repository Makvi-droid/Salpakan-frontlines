import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { appTheme } from "@/constants/theme";
import type { Phase, PieceDefinition } from "../scripts/types";

type Props = {
  phase: Phase;
  selectedPiece: PieceDefinition | null;
  totalUnplacedCount: number;
  battleMessage: string;
  revealMessage: string | null;
  turnLabel: string;
  cardPadding: number;
  panelRadius: number;
  marginBottom: number;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  compactCardGap: number;
  isUltraCompactHeight: boolean;
  isCompactHeight: boolean;
};

export function StatusBox({
  phase,
  selectedPiece,
  totalUnplacedCount,
  battleMessage,
  revealMessage,
  turnLabel,
  cardPadding,
  panelRadius,
  marginBottom,
  rf,
  rs,
  rsv,
  compactCardGap,
  isUltraCompactHeight,
  isCompactHeight,
}: Props) {
  const instruction =
    phase === "formation"
      ? "Select a rank from the reserve, then place it inside the marked deployment rows."
      : battleMessage;

  const leftLabel = phase === "formation" ? "Selected" : "Turn";
  const leftValue =
    phase === "formation"
      ? selectedPiece
        ? selectedPiece.label.replace("\n", " ")
        : "None"
      : turnLabel;

  const rightLabel = phase === "formation" ? "Unplaced" : "Intel";
  const rightValue =
    phase === "formation"
      ? String(totalUnplacedCount)
      : (revealMessage ?? "Ranks stay hidden until the Flag is captured.");

  return (
    <View
      style={[
        styles.box,
        {
          marginBottom,
          paddingHorizontal: cardPadding,
          paddingTop: rsv(
            isUltraCompactHeight ? 10 : isCompactHeight ? 11 : 12,
          ),
          paddingBottom: rsv(
            isUltraCompactHeight ? 10 : isCompactHeight ? 11 : 12,
          ),
          borderRadius: panelRadius,
        },
      ]}
    >
      <Text
        style={[styles.instruction, { fontSize: rf(12), lineHeight: rf(17) }]}
      >
        {instruction}
      </Text>

      <View
        style={[
          styles.strip,
          {
            gap: compactCardGap,
            marginTop: rsv(isUltraCompactHeight ? 8 : 10),
          },
        ]}
      >
        <View style={styles.item}>
          <Text style={[styles.itemLabel, { fontSize: rf(10) }]}>
            {leftLabel}
          </Text>
          <Text
            style={[styles.itemValue, { fontSize: rf(13) }]}
            numberOfLines={1}
          >
            {leftValue}
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={[styles.itemLabel, { fontSize: rf(10) }]}>
            {rightLabel}
          </Text>
          <Text
            style={[styles.itemValue, { fontSize: rf(13) }]}
            numberOfLines={2}
          >
            {rightValue}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: "100%",
    backgroundColor: appTheme.surfaces.formationBriefing.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.formationBriefing.borderColor,
    alignItems: "center",
    ...appTheme.shadow.soft,
  },
  instruction: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
    maxWidth: 420,
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
