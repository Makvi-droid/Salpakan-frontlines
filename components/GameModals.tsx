import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { appTheme } from "@/constants/theme";
import type { Phase, Side } from "../scripts/types";

type Props = {
  phase: Phase;
  winner: Side | null;
  endedBySurrender: boolean;
  showQuitModal: boolean;
  showReadyModal: boolean;
  insets: { top: number; bottom: number };
  width: number;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  onCloseQuit: () => void;
  onConfirmQuit: () => void;
  onCloseReady: () => void;
  onConfirmReady: () => void;
  onRetryMatch: () => void;
  onReturnToMenu: () => void;
};

export function GameModals({
  phase,
  winner,
  endedBySurrender,
  showQuitModal,
  showReadyModal,
  insets,
  width,
  rf,
  rs,
  rsv,
  onCloseQuit,
  onConfirmQuit,
  onCloseReady,
  onConfirmReady,
  onRetryMatch,
  onReturnToMenu,
}: Props) {
  const resultLabel =
    winner === "player"
      ? "MISSION COMPLETE"
      : endedBySurrender
        ? "FORFEIT"
        : "MISSION LOST";

  const resultTitle = winner === "player" ? "Victory" : "Defeat";

  const resultBody =
    winner === "player"
      ? "You secured the field. Ready for another match?"
      : endedBySurrender
        ? "You forfeited the match. Want to set up another round?"
        : "Enemy command took the field. Want to try again?";

  const overlayPadding = {
    paddingTop: Math.max(insets.top, insets.bottom) + 24,
    paddingBottom: Math.max(insets.top, insets.bottom) + 24,
  };
  const cardStyle = {
    maxWidth: Math.min(rs(360), width * 0.9),
    padding: rs(20),
  };

  return (
    <>
      {/* Quit / Surrender modal */}
      <Modal
        visible={showQuitModal}
        transparent
        animationType="fade"
        onRequestClose={onCloseQuit}
      >
        <View style={[styles.overlay, overlayPadding]}>
          <View style={[styles.card, cardStyle]}>
            <Text style={[styles.modalLabel, { fontSize: rf(10) }]}>
              {phase === "formation" ? "EXIT COMMAND" : "SURRENDER"}
            </Text>
            <Text
              style={[
                styles.modalTitle,
                { fontSize: rf(24), lineHeight: rf(28), marginTop: rsv(8) },
              ]}
            >
              {phase === "formation"
                ? "Leave the formation screen?"
                : "Forfeit this match?"}
            </Text>
            <View style={[styles.btnRow, { marginTop: rsv(18), gap: rs(14) }]}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={onConfirmQuit}
              >
                <Text style={[styles.btnText, { fontSize: rf(14) }]}>
                  {phase === "formation" ? "Leave" : "Forfeit"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={onCloseQuit}
              >
                <Text
                  style={[
                    styles.btnText,
                    styles.btnTextSecondary,
                    { fontSize: rf(14) },
                  ]}
                >
                  {phase === "formation" ? "Stay" : "Keep Fighting"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ready check modal */}
      <Modal
        visible={showReadyModal}
        transparent
        animationType="fade"
        onRequestClose={onCloseReady}
      >
        <View style={[styles.overlay, overlayPadding]}>
          <View style={[styles.card, cardStyle]}>
            <Text style={[styles.modalLabel, { fontSize: rf(10) }]}>
              READY CHECK
            </Text>
            <Text
              style={[
                styles.modalTitle,
                { fontSize: rf(24), lineHeight: rf(28), marginTop: rsv(8) },
              ]}
            >
              All ranks are placed.{"\n"}Begin the clash?
            </Text>
            <View style={[styles.btnRow, { marginTop: rsv(18), gap: rs(14) }]}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={onConfirmReady}
              >
                <Text style={[styles.btnText, { fontSize: rf(14) }]}>
                  Confirm
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={onCloseReady}
              >
                <Text
                  style={[
                    styles.btnText,
                    styles.btnTextSecondary,
                    { fontSize: rf(14) },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Match ended modal */}
      <Modal
        visible={phase === "ended"}
        transparent
        animationType="fade"
        onRequestClose={onRetryMatch}
      >
        <View style={[styles.overlay, overlayPadding]}>
          <View style={[styles.card, cardStyle]}>
            <Text style={[styles.modalLabel, { fontSize: rf(10) }]}>
              {resultLabel}
            </Text>
            <Text
              style={[
                styles.modalTitle,
                { fontSize: rf(24), lineHeight: rf(28), marginTop: rsv(8) },
              ]}
            >
              {resultTitle}
            </Text>
            <Text
              style={[
                styles.modalBody,
                { fontSize: rf(12), lineHeight: rf(17), marginTop: rsv(10) },
              ]}
            >
              {resultBody}
            </Text>
            <View style={[styles.btnRow, { marginTop: rsv(18), gap: rs(14) }]}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={onRetryMatch}
              >
                <Text style={[styles.btnText, { fontSize: rf(14) }]}>
                  Retry
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={onReturnToMenu}
              >
                <Text
                  style={[
                    styles.btnText,
                    styles.btnTextSecondary,
                    { fontSize: rf(14) },
                  ]}
                >
                  Main Menu
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: appTheme.colors.scrim,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    backgroundColor: appTheme.surfaces.hero.backgroundColor,
    borderRadius: appTheme.radius.lg,
    borderWidth: appTheme.borderWidth.thick,
    borderColor: appTheme.surfaces.hero.borderColor,
    ...appTheme.shadow.hard,
  },
  modalLabel: {
    color: appTheme.colors.brassBright,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 1,
    textAlign: "center",
  },
  modalTitle: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.display,
    textAlign: "center",
    textTransform: "uppercase",
  },
  modalBody: {
    color: appTheme.colors.parchmentSoft,
    fontFamily: appTheme.fonts.body,
    textAlign: "center",
    maxWidth: 420,
  },
  btnRow: { flexDirection: "row", justifyContent: "space-between" },
  btn: {
    flex: 1,
    minHeight: 52,
    borderRadius: appTheme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
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
  btnText: {
    color: appTheme.colors.ink,
    fontFamily: appTheme.fonts.body,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  btnTextSecondary: { color: appTheme.colors.ink },
});
