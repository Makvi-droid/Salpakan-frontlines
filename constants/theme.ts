export const appTheme = {
  colors: {
    mono: {
      appBackground: "#0D0D0D",
      surface: "#161616",
      surfaceRaised: "#1E1E1E",
      surfaceMuted: "#2A2A2A",
      border: "#5B5B5B",
      borderStrong: "#F1F1F1",
      textPrimary: "#FAFAFA",
      textSecondary: "#B9B9B9",
      textMuted: "#8A8A8A",
      disabledBg: "#242424",
      disabledBorder: "#3D3D3D",
      disabledText: "#6F6F6F",
      danger: "#D9D9D9",
      overlay: "rgba(0,0,0,0.64)",
    },
    wood: {
      shell: "#5A3D28",
      shellBorder: "#382210",
      frame: "#7A5737",
      frameBorder: "#2E1A0C",
      grid: "#A37A51",
      tileLight: "#B78C60",
      tileDark: "#A97E53",
      line: "#4A2D15",
      placedPiece: "#202020",
    },
  },
  fonts: {
    display: "Bebas",
    body: "K2D",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
  },
  borderWidth: {
    thin: 1,
    regular: 2,
    thick: 3,
    emphasis: 4,
  },
} as const;

export const difficultyTones = {
  easy: {
    bg: "#1C1C1C",
    border: "#EDEDED",
    icon: "#F4F4F4",
    label: "#FFFFFF",
    subLabel: "#C9C9C9",
  },
  medium: {
    bg: "#141414",
    border: "#CFCFCF",
    icon: "#D8D8D8",
    label: "#F2F2F2",
    subLabel: "#B8B8B8",
  },
  hard: {
    bg: "#0F0F0F",
    border: "#A6A6A6",
    icon: "#BDBDBD",
    label: "#E3E3E3",
    subLabel: "#9D9D9D",
  },
} as const;