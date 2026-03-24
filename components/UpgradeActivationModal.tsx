import React from "react";
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { appTheme } from "@/constants/theme";
import { CRATE_UPGRADE_LABELS } from "../constants/constants";
import type { PieceUpgradeId } from "../scripts/types";

type Props = {
  event: { playerUpgrade: PieceUpgradeId } | null;
  insets: { top: number; bottom: number };
  width: number;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  onConfirm: (useUpgrade: boolean) => void;
};

function getUpgradeIcon(upgrade: PieceUpgradeId) {
  if (upgrade === "iron-veil") return require("../assets/images/iron-veil.png");
  if (upgrade === "double-blind")
    return require("../assets/images/double-blind.png");
  return require("../assets/images/martyr's-eye.png");
}

function getUpgradeDescription(upgrade: PieceUpgradeId): string {
  if (upgrade === "iron-veil")
    return "Conceal your rank from the enemy during this clash.";
  if (upgrade === "double-blind")
    return "Show a false rank to the enemy during this clash.";
  // martyr's-eye
  return "Survive defeat once — at the cost of your rank being revealed.";
}

export function UpgradeActivationModal({
  event,
  insets,
  width,
  rf,
  rs,
  rsv,
  onConfirm,
}: Props) {
  if (!event) return null;

  const overlayPadding = Math.max(insets.top, insets.bottom) + 16;

  return (
    <Modal transparent visible animationType="fade">
      <View
        style={[
          styles.overlay,
          { paddingTop: overlayPadding, paddingBottom: overlayPadding },
        ]}
      >
        <View style={[styles.card, { width: Math.min(width * 0.9, rs(360)) }]}>
          {/* Header */}
          <Text style={[styles.eyebrow, { fontSize: rf(8) }]}>
            UPGRADE READY
          </Text>

          {/* Upgrade icon */}
          <View style={[styles.iconWrap, { marginTop: rsv(14) }]}>
            <Image
              source={getUpgradeIcon(event.playerUpgrade)}
              style={{ width: rs(58), height: rs(58) }}
              resizeMode="contain"
            />
          </View>

          {/* Upgrade name */}
          <Text
            style={[styles.upgradeName, { fontSize: rf(13), marginTop: rsv(10) }]}
          >
            {CRATE_UPGRADE_LABELS[event.playerUpgrade]}
          </Text>

          {/* Description */}
          <Text
            style={[styles.description, { fontSize: rf(9), marginTop: rsv(6) }]}
          >
            {getUpgradeDescription(event.playerUpgrade)}
          </Text>

          {/* Divider */}
          <View style={[styles.divider, { marginTop: rsv(16) }]} />

          {/* Question */}
          <Text
            style={[styles.question, { fontSize: rf(9.5), marginTop: rsv(14) }]}
          >
            Activate this upgrade for the upcoming clash?
          </Text>

          {/* Activate button */}
          <TouchableOpacity
            style={[
              styles.activateBtn,
              {
                borderRadius: rs(10),
                marginTop: rsv(14),
                paddingVertical: rsv(12),
              },
            ]}
            onPress={() => onConfirm(true)}
            activeOpacity={0.88}
          >
            <Text style={[styles.activateBtnText, { fontSize: rf(10) }]}>
              ACTIVATE
            </Text>
          </TouchableOpacity>

          {/* Skip button */}
          <TouchableOpacity
            style={[
              styles.skipBtn,
              {
                borderRadius: rs(10),
                marginTop: rsv(9),
                paddingVertical: rsv(12),
              },
            ]}
            onPress={() => onConfirm(false)}
            activeOpacity={0.88}
          >
            <Text style={[styles.skipBtnText, { fontSize: rf(10) }]}>
              SKIP — CHALLENGE WITHOUT IT
            </Text>
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
    backgroundColor: "rgba(4,5,4,0.84)",
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: appTheme.surfaces.hero.backgroundColor,
    borderColor: appTheme.surfaces.hero.borderColor,
    borderWidth: appTheme.borderWidth.thick,
    borderRadius: appTheme.radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: "center",
    ...appTheme.shadow.hard,
  },
  eyebrow: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1.4,
    textAlign: "center",
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeName: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  description: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
    lineHeight: 16,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: appTheme.colors.line,
    opacity: 0.5,
  },
  question: {
    color: appTheme.colors.parchment,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
    fontWeight: "600",
  },
  activateBtn: {
    width: "100%",
    backgroundColor: "#0F5A1A",
    borderWidth: appTheme.borderWidth.regular,
    borderColor: "#8DE09D",
    alignItems: "center",
    justifyContent: "center",
  },
  activateBtnText: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    letterSpacing: 0.5,
  },
  skipBtn: {
    width: "100%",
    backgroundColor: "#2B1C14",
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.brassBright,
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtnText: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.display,
    letterSpacing: 0.4,
  },
});
