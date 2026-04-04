import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { appTheme } from "@/constants/theme";

type Props = {
  /**
   * When true the banner slides in; when false it slides back out.
   * The parent controls visibility via the hook's aiSpyRevealNotifVisible state.
   */
  visible: boolean;
  rf: (size: number) => number;
  rs: (size: number) => number;
  rsv: (size: number) => number;
};

/**
 * A slim banner that slides down from above whenever the AI uses a special
 * ability. It deliberately reveals NOTHING about which ability was used —
 * just that the enemy command did something.
 *
 * Mount it once in GameScreen alongside the other modals; it self-manages its
 * own animation and is purely display-only.
 */
export function AIAbilityNotification({ visible, rf, rs, rsv }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: visible ? 0 : -16,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { opacity, transform: [{ translateY }] },
        {
          borderRadius: rs(8),
          paddingVertical: rsv(8),
          paddingHorizontal: rs(14),
        },
      ]}
      pointerEvents="none" // never blocks interaction
    >
      <View style={styles.row}>
        {/* Pulsing red dot — enemy activity indicator */}
        <View style={[styles.dot, { width: rs(7), height: rs(7), borderRadius: rs(4) }]} />
        <Text style={[styles.label, { fontSize: rf(11) }]}>
          Enemy command activated a special ability.
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // Positioned by the parent — render it just above the board or below
    // TopMenuRow. It uses absolute positioning in GameScreen.
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    backgroundColor: "#1A0808",
    borderWidth: 1,
    borderColor: "#8B1A1A",
    zIndex: 50,
    alignSelf: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    backgroundColor: "#D94040",
    // Simple static dot — the Animated opacity of the wrapper provides the
    // "appear/disappear" animation so we don't need a nested loop here.
  },
  label: {
    color: "#E8A0A0",
    fontFamily: appTheme.fonts.body,
    fontWeight: "600",
    letterSpacing: 0.3,
    flex: 1,
  },
});
