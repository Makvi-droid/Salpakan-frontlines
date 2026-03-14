import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export type ResponsiveTokens = {
  width: number;
  height: number;
  safeWidth: number;
  safeHeight: number;
  scale: number;
  verticalScale: number;
  textScale: number;
  maxContentWidth: number;
  isCompactHeight: boolean;
  isUltraCompactHeight: boolean;
  insets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  rs: (value: number) => number;
  rsv: (value: number) => number;
  rf: (value: number) => number;
};

export function useResponsiveTokens(): ResponsiveTokens {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const safeWidth = Math.max(width - insets.left - insets.right, 0);
    const safeHeight = Math.max(height - insets.top - insets.bottom, 0);
    // Scale against a phone-first baseline so the UI grows proportionally
    // without letting tablets or extra-short devices distort the layout.
    const rawScale = Math.min(safeWidth / BASE_WIDTH, safeHeight / BASE_HEIGHT);
    const scale = clamp(rawScale, 0.78, 1.12);
    const verticalScale = clamp(safeHeight / BASE_HEIGHT, 0.68, 1.04);
    const textScale = clamp((scale + verticalScale) / 2, 0.82, 1.08);

    const rs = (value: number) => Math.round(value * scale);
    const rsv = (value: number) => Math.round(value * verticalScale);
    const rf = (value: number) => Math.round(value * textScale);

    return {
      width,
      height,
      safeWidth,
      safeHeight,
      scale,
      verticalScale,
      textScale,
      maxContentWidth: Math.min(safeWidth * 0.96, rs(500)),
      // Shorter phones use denser spacing and smaller hero chrome instead of
      // falling back to page scrolling.
      isCompactHeight: safeHeight < 760,
      isUltraCompactHeight: safeHeight < 690,
      insets,
      rs,
      rsv,
      rf,
    };
  }, [height, insets, width]);
}

export { clamp };
