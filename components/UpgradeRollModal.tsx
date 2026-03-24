import React, { useEffect, useMemo, useState } from "react";
import {
    Animated,
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

const SLOT_TICK_MS = 90;
const SLOT_SPIN_MS = 1100;

const UPGRADE_ORDER: PieceUpgradeId[] = [
  "iron-veil",
  "double-blind",
  "martyrs-eye",
];

type Props = {
  event: { upgrade: PieceUpgradeId } | null;
  insets: { top: number; bottom: number };
  width: number;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
  onDismiss: () => void;
};

function getUpgradeIcon(upgrade: PieceUpgradeId) {
  if (upgrade === "iron-veil") {
    return require("../assets/images/iron-veil.png");
  }
  if (upgrade === "double-blind") {
    return require("../assets/images/double-blind.png");
  }
  return require("../assets/images/martyr's-eye.png");
}

export function UpgradeRollModal({
  event,
  insets,
  width,
  rf,
  rs,
  rsv,
  onDismiss,
}: Props) {
  const [displayIndex, setDisplayIndex] = useState(0);
  const [isResolved, setIsResolved] = useState(false);

  const pulse = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    if (!event) return;

    setIsResolved(false);
    setDisplayIndex(Math.floor(Math.random() * UPGRADE_ORDER.length));

    const ticker = setInterval(() => {
      setDisplayIndex((cur) => (cur + 1) % UPGRADE_ORDER.length);
    }, SLOT_TICK_MS);

    const stopper = setTimeout(() => {
      clearInterval(ticker);
      setDisplayIndex(UPGRADE_ORDER.indexOf(event.upgrade));
      setIsResolved(true);
    }, SLOT_SPIN_MS);

    return () => {
      clearInterval(ticker);
      clearTimeout(stopper);
    };
  }, [event]);

  useEffect(() => {
    if (!event || isResolved) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.07,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.95,
          duration: 140,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => {
      loop.stop();
      pulse.setValue(1);
    };
  }, [event, isResolved, pulse]);

  if (!event) return null;

  const currentUpgrade = UPGRADE_ORDER[displayIndex] ?? event.upgrade;
  const currentLabel = CRATE_UPGRADE_LABELS[currentUpgrade];
  const overlayVerticalPadding = Math.max(insets.top, insets.bottom) + 14;

  return (
    <Modal transparent visible={!!event} animationType="fade">
      <View
        style={[
          styles.overlay,
          {
            paddingTop: overlayVerticalPadding,
            paddingBottom: overlayVerticalPadding,
          },
        ]}
      >
        <View style={[styles.card, { width: Math.min(width * 0.86, rs(330)) }]}>
          <Text style={[styles.title, { fontSize: rf(12) }]}>CRATE UPGRADE</Text>
          <Text style={[styles.subTitle, { fontSize: rf(9), marginTop: rsv(8) }]}>
            Rolling enhancement...
          </Text>

          <View
            style={[
              styles.slotFrame,
              {
                marginTop: rsv(16),
                borderRadius: rs(14),
                padding: rs(12),
              },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <Image
                source={getUpgradeIcon(currentUpgrade)}
                style={{ width: rs(88), height: rs(88) }}
                resizeMode="contain"
              />
            </Animated.View>
          </View>

          <Text style={[styles.upgradeName, { fontSize: rf(13), marginTop: rsv(12) }]}>
            {currentLabel}
          </Text>

          <TouchableOpacity
            style={[
              styles.btn,
              {
                marginTop: rsv(16),
                borderRadius: rs(12),
                paddingVertical: rsv(10),
                opacity: isResolved ? 1 : 0.55,
              },
            ]}
            onPress={onDismiss}
            disabled={!isResolved}
            activeOpacity={0.9}
          >
            <Text style={[styles.btnText, { fontSize: rf(10) }]}>CONTINUE</Text>
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
    backgroundColor: "rgba(13, 8, 6, 0.72)",
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: appTheme.surfaces.section.backgroundColor,
    borderColor: appTheme.surfaces.section.borderColor,
    borderWidth: appTheme.borderWidth.regular,
    alignItems: "center",
    padding: 16,
    ...appTheme.shadow.hard,
  },
  title: {
    color: appTheme.colors.parchment,
    fontFamily: appTheme.fonts.display,
    letterSpacing: 0.8,
  },
  subTitle: {
    color: appTheme.colors.brass,
    fontFamily: appTheme.fonts.body,
    letterSpacing: 0.3,
  },
  slotFrame: {
    borderWidth: appTheme.borderWidth.regular,
    borderColor: appTheme.colors.brassBright,
    backgroundColor: "#2B1C14",
  },
  upgradeName: {
    color: "#F4DCA3",
    fontFamily: appTheme.fonts.display,
    textAlign: "center",
    letterSpacing: 0.6,
  },
  btn: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#008000",
    borderWidth: appTheme.borderWidth.regular,
    borderColor: "#68D568",
  },
  btnText: {
    color: "#F7FFF2",
    fontFamily: appTheme.fonts.display,
    letterSpacing: 0.4,
  },
});
