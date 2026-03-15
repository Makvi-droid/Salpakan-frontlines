import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { appTheme } from "@/constants/theme";
import type { PieceDefinition } from "../app/types";

type Props = {
  isReadyEnabled: boolean;
  isInventoryExpanded: boolean;
  selectedPieceId: string | null;
  pieceDefinitions: PieceDefinition[];
  pieceCountById: Record<string, number>;
  panelRadius: number;
  cardPadding: number;
  verticalSectionGap: number;
  compactCardGap: number;
  marginBottom: number;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  isUltraCompactHeight: boolean;
  isCompactHeight: boolean;
  onReset: () => void;
  onRandomize: () => void;
  onReady: () => void;
  onToggleInventory: () => void;
  onPieceSelect: (pieceId: string) => void;
};

export function FormationControls({
  isReadyEnabled,
  isInventoryExpanded,
  selectedPieceId,
  pieceDefinitions,
  pieceCountById,
  panelRadius,
  cardPadding,
  verticalSectionGap,
  compactCardGap,
  marginBottom,
  rf,
  rs,
  rsv,
  isUltraCompactHeight,
  isCompactHeight,
  onReset,
  onRandomize,
  onReady,
  onToggleInventory,
  onPieceSelect,
}: Props) {
  return (
    <>
      {/* Action row */}
      <View
        style={[
          styles.actionRow,
          { marginBottom: verticalSectionGap, gap: compactCardGap },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnSecondary,
            {
              borderRadius: rs(14),
              paddingVertical: rsv(9),
              paddingHorizontal: rs(14),
            },
          ]}
          onPress={onReset}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name="restart"
            size={rf(16)}
            color={appTheme.colors.ink}
          />
          <Text
            style={[
              styles.btnText,
              styles.btnTextEnabled,
              { fontSize: rf(12) },
            ]}
          >
            Reset
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnSecondary,
            {
              borderRadius: rs(14),
              paddingVertical: rsv(9),
              paddingHorizontal: rs(14),
            },
          ]}
          onPress={onRandomize}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name="shuffle-variant"
            size={rf(16)}
            color={appTheme.colors.ink}
          />
          <Text
            style={[
              styles.btnText,
              styles.btnTextEnabled,
              { fontSize: rf(12) },
            ]}
          >
            Random
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btn,
            isReadyEnabled ? styles.btnPrimary : styles.btnDisabled,
            {
              borderRadius: rs(14),
              paddingVertical: rsv(9),
              paddingHorizontal: rs(14),
            },
          ]}
          disabled={!isReadyEnabled}
          onPress={onReady}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name="check-decagram"
            size={rf(16)}
            color={
              isReadyEnabled
                ? appTheme.colors.ink
                : appTheme.colors.mono.disabledText
            }
          />
          <Text
            style={[
              styles.btnText,
              { fontSize: rf(12) },
              isReadyEnabled ? styles.btnTextEnabled : styles.btnTextDisabled,
            ]}
          >
            Ready
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reserve panel */}
      <View
        style={[
          styles.reservePanel,
          {
            borderRadius: panelRadius,
            paddingHorizontal: cardPadding,
            paddingTop: rsv(
              isUltraCompactHeight ? 10 : isCompactHeight ? 11 : 12,
            ),
            paddingBottom: rsv(
              isInventoryExpanded
                ? isUltraCompactHeight
                  ? 10
                  : isCompactHeight
                    ? 12
                    : 14
                : isUltraCompactHeight
                  ? 10
                  : 12,
            ),
            marginBottom,
          },
        ]}
      >
        <View style={styles.reserveHeader}>
          <View>
            <Text style={[styles.reserveLabel, { fontSize: rf(10) }]}>
              RESERVE
            </Text>
            <Text
              style={[
                styles.reserveTitle,
                { fontSize: rf(isCompactHeight ? 18 : 20) },
              ]}
            >
              Choose a rank
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              {
                paddingHorizontal: rs(10),
                paddingVertical: rsv(6),
                borderRadius: rs(12),
              },
            ]}
            onPress={onToggleInventory}
            activeOpacity={0.85}
          >
            <Text style={[styles.toggleBtnText, { fontSize: rf(11) }]}>
              {isInventoryExpanded ? "Hide Reserve" : "Open Reserve"}
            </Text>
          </TouchableOpacity>
        </View>

        {isInventoryExpanded ? (
          <View
            style={[styles.railContainer, { marginTop: verticalSectionGap }]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.railContent,
                { columnGap: compactCardGap, paddingRight: rs(8) },
              ]}
            >
              {pieceDefinitions.map((piece) => {
                const remaining = pieceCountById[piece.id] ?? 0;
                const isSelected = selectedPieceId === piece.id;
                const isDepleted = remaining <= 0;
                return (
                  <TouchableOpacity
                    key={piece.id}
                    style={[
                      styles.chip,
                      {
                        minWidth: rs(100),
                        minHeight: rsv(isUltraCompactHeight ? 84 : 94),
                        paddingHorizontal: rs(10),
                        paddingVertical: rsv(8),
                        borderRadius: rs(12),
                      },
                      isSelected && styles.chipSelected,
                      isDepleted && styles.chipDepleted,
                    ]}
                    onPress={() => onPieceSelect(piece.id)}
                    disabled={isDepleted}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.chipTitle,
                        {
                          fontSize: piece.label.includes("\n")
                            ? rf(10)
                            : rf(12),
                          lineHeight: piece.label.includes("\n")
                            ? rf(11)
                            : rf(14),
                        },
                        isSelected && styles.chipTitleSelected,
                        isDepleted && styles.chipTitleDepleted,
                      ]}
                    >
                      {piece.label}
                    </Text>
                    <View
                      style={[
                        styles.countPill,
                        {
                          marginTop: rsv(6),
                          borderRadius: rs(10),
                          paddingHorizontal: rs(8),
                          paddingVertical: rsv(3),
                        },
                        isSelected && styles.countPillSelected,
                        isDepleted && styles.countPillDepleted,
                      ]}
                    >
                      <Text
                        style={[
                          styles.countText,
                          { fontSize: rf(11) },
                          isSelected && styles.countTextSelected,
                        ]}
                      >
                        x{remaining}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <Text
            style={[
              styles.reserveInstruction,
              { fontSize: rf(11), lineHeight: rf(15), marginTop: rsv(8) },
            ]}
          >
            Open the reserve to select ranks, then place them on the highlighted
            deployment rows.
          </Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: appTheme.borderWidth.regular,
  },
  btnPrimary: {
    backgroundColor: appTheme.surfaces.commandPrimary.backgroundColor,
    borderColor: appTheme.surfaces.commandPrimary.borderColor,
  },
  btnSecondary: {
    backgroundColor: appTheme.surfaces.commandSecondary.backgroundColor,
    borderColor: appTheme.surfaces.commandSecondary.borderColor,
  },
  btnDisabled: {
    backgroundColor: appTheme.colors.mono.disabledBg,
    borderColor: appTheme.colors.mono.disabledBorder,
  },
  btnText: {
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  btnTextEnabled: { color: appTheme.colors.ink },
  btnTextDisabled: { color: appTheme.colors.mono.disabledText },
  reservePanel: {
    width: "100%",
    backgroundColor: appTheme.surfaces.section.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.section.borderColor,
    ...appTheme.shadow.soft,
  },
  reserveHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  reserveLabel: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1,
  },
  reserveTitle: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    textTransform: "uppercase",
  },
  toggleBtn: {
    backgroundColor: appTheme.surfaces.commandSecondary.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.commandSecondary.borderColor,
  },
  toggleBtnText: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  reserveInstruction: {
    color: appTheme.surfaces.instruction.textColor,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
  },
  railContainer: { width: "100%" },
  railContent: { alignItems: "stretch" },
  chip: {
    backgroundColor: appTheme.surfaces.inset.backgroundColor,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.surfaces.section.borderColor,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  chipSelected: {
    backgroundColor: appTheme.surfaces.commandPrimary.backgroundColor,
    borderColor: appTheme.surfaces.commandPrimary.borderColor,
  },
  chipDepleted: {
    backgroundColor: appTheme.colors.mono.disabledBg,
    borderColor: appTheme.colors.mono.disabledBorder,
  },
  chipTitle: { color: appTheme.colors.ink, fontFamily: appTheme.fonts.body },
  chipTitleSelected: { color: appTheme.colors.ink },
  chipTitleDepleted: { color: appTheme.colors.mono.disabledText },
  countPill: { backgroundColor: appTheme.colors.brassBright },
  countPillSelected: { backgroundColor: appTheme.colors.parchment },
  countPillDepleted: { backgroundColor: appTheme.colors.mono.disabledBorder },
  countText: {
    color: appTheme.colors.backgroundDeep,
    fontFamily: appTheme.fonts.body,
  },
  countTextSelected: { color: appTheme.colors.backgroundDeep },
});
