import React from "react";
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { appTheme } from "@/constants/theme";
import { CRATE_UPGRADE_LABELS } from "../constants/constants";
import type { PieceUpgradeId } from "../scripts/types";

type Props = {
  event: {
    currentUpgrade: PieceUpgradeId;
    newUpgrade: PieceUpgradeId;
  } | null;
  insets: { top: number; bottom: number };
  width: number;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  onTake: () => void;
  onDestroy: () => void;
};

function getUpgradeIcon(upgrade: PieceUpgradeId) {
  if (upgrade === "iron-veil") return require("../assets/images/iron-veil.png");
  if (upgrade === "double-blind")
    return require("../assets/images/double-blind.png");
  return require("../assets/images/martyr's-eye.png");
}

export function CrateChoiceModal({
  event,
  insets,
  width,
  rf,
  rs,
  rsv,
  onTake,
  onDestroy,
}: Props) {
  if (!event) return null;

  const overlayVerticalPadding = Math.max(insets.top, insets.bottom) + 12;

  return (
    <Modal transparent visible animationType="fade">
      <View
        style={[
          styles.overlay,
          {
            paddingTop: overlayVerticalPadding,
            paddingBottom: overlayVerticalPadding,
          },
        ]}
      >
        <View style={[styles.card, { width: Math.min(width * 0.9, rs(360)) }]}>
          <Text style={[styles.title, { fontSize: rf(11) }]}>CRATE DECISION</Text>
          <Text style={[styles.subTitle, { fontSize: rf(9), marginTop: rsv(6) }]}>
            This piece already has an upgrade.
          </Text>

          <View style={[styles.compareRow, { marginTop: rsv(14), gap: rs(10) }]}>
            <View style={[styles.upgradeCard, { borderRadius: rs(10), padding: rs(10) }]}>
              <Text style={[styles.cardLabel, { fontSize: rf(8) }]}>CURRENT</Text>
              <Image
                source={getUpgradeIcon(event.currentUpgrade)}
                style={{ width: rs(54), height: rs(54), marginTop: rsv(5) }}
                resizeMode="contain"
              />
              <Text style={[styles.cardName, { fontSize: rf(9), marginTop: rsv(6) }]}>
                {CRATE_UPGRADE_LABELS[event.currentUpgrade]}
              </Text>
            </View>

            <View style={[styles.upgradeCard, { borderRadius: rs(10), padding: rs(10) }]}>
              <Text style={[styles.cardLabel, { fontSize: rf(8) }]}>NEW CRATE</Text>
              <Image
                source={require("../assets/images/crate-box.png")}
                style={{ width: rs(54), height: rs(54), marginTop: rsv(5) }}
                resizeMode="contain"
              />
              <Text style={[styles.cardName, { fontSize: rf(9), marginTop: rsv(6) }]}>
                Unknown
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { borderRadius: rs(10), marginTop: rsv(14), paddingVertical: rsv(10) },
            ]}
            onPress={onTake}
            activeOpacity={0.9}
          >
            <Text style={[styles.btnText, { fontSize: rf(9) }]}>TAKE NEW UPGRADE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              { borderRadius: rs(10), marginTop: rsv(9), paddingVertical: rsv(10) },
            ]}
            onPress={onDestroy}
            activeOpacity={0.9}
          >
            <Text style={[styles.btnText, { fontSize: rf(9) }]}>DESTROY CRATE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4, 5, 4, 0.76)",
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: appTheme.surfaces.section.backgroundColor,
    borderColor: appTheme.surfaces.section.borderColor,
    borderWidth: appTheme.borderWidth.regular,
    padding: 16,
    ...appTheme.shadow.hard,
  },
  title: {
    color: appTheme.colors.parchment,
    fontFamily: appTheme.fonts.display,
    letterSpacing: 0.7,
    textAlign: "center",
  },
  subTitle: {
    color: appTheme.colors.inkMuted,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
  },
  compareRow: {
    flexDirection: "row",
  },
  upgradeCard: {
    flex: 1,
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.line,
    backgroundColor: appTheme.colors.fieldInset,
    alignItems: "center",
  },
  cardLabel: {
    color: appTheme.colors.brass,
    fontFamily: appTheme.fonts.body,
    fontWeight: "700",
  },
  cardName: {
    color: appTheme.colors.parchment,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
    fontWeight: "700",
  },
  primaryBtn: {
    backgroundColor: "#0F5A1A",
    borderWidth: appTheme.borderWidth.regular,
    borderColor: "#8DE09D",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtn: {
    backgroundColor: "#6A3F1A",
    borderWidth: appTheme.borderWidth.regular,
    borderColor: "#D3B56A",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    letterSpacing: 0.4,
  },
});
