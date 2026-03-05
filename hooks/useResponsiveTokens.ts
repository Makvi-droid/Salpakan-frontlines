import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export type ResponsiveTokens = {
  width: number;
  height: number;
  scale: number;
  verticalScale: number;
  textScale: number;
  maxContentWidth: number;
  shouldUseScrollFallback: boolean;
  rs: (value: number) => number;
  rsv: (value: number) => number;
  rf: (value: number) => number;
};

export function useResponsiveTokens(fallbackHeight = 680): ResponsiveTokens {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const rawScale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    const scale = clamp(rawScale, 0.78, 1.2);
    const verticalScale = clamp(height / BASE_HEIGHT, 0.72, 1.15);
    const textScale = clamp((scale + verticalScale) / 2, 0.82, 1.15);

    const rs = (value: number) => Math.round(value * scale);
    const rsv = (value: number) => Math.round(value * verticalScale);
    const rf = (value: number) => Math.round(value * textScale);

    return {
      width,
      height,
      scale,
      verticalScale,
      textScale,
      maxContentWidth: Math.min(width * 0.94, rs(500)),
      shouldUseScrollFallback: height < fallbackHeight,
      rs,
      rsv,
      rf,
    };
  }, [width, height, fallbackHeight]);
}

export { clamp };

