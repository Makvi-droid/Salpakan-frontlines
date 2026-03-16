import type { AIProfile, Difficulty } from "../scripts/types";

export const BOARD_WIDTH = 9;
export const BOARD_HEIGHT = 8;
export const DOUBLE_TAP_MS = 300;
export const AI_THINKING_DELAY_MS = 800;

export const FIRST_COLUMN_LABELS = [
  "Flag",
  "Spy",
  "Private",
  "Sgt",
  "2nd Lt",
] as const;
export const SECOND_COLUMN_LABELS = [
  "1st Lt",
  "Cpt",
  "Major",
  "Lt Col",
  "Col",
] as const;
export const THIRD_COLUMN_LABELS = [
  "1 Star\nGeneral",
  "2 Star\nGeneral",
  "3 Star\nGeneral",
  "4 Star\nGeneral",
  "5 Star\nGeneral",
] as const;

export const ORTHOGONAL_DIRECTIONS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
] as const;

export const SHORT_LABEL_BY_NAME: Record<string, string> = {
  Flag: "F",
  Spy: "Sp",
  Private: "Pvt",
  Sgt: "Sgt",
  "2nd Lt": "2Lt",
  "1st Lt": "1Lt",
  Cpt: "Cpt",
  Major: "Maj",
  "Lt Col": "LtC",
  Col: "Col",
  "1 Star\nGeneral": "1*",
  "2 Star\nGeneral": "2*",
  "3 Star\nGeneral": "3*",
  "4 Star\nGeneral": "4*",
  "5 Star\nGeneral": "5*",
};

export const PIECE_STRENGTH_BY_LABEL: Record<string, number> = {
  Flag: 0,
  Spy: 1,
  Private: 2,
  Sgt: 3,
  "2nd Lt": 4,
  "1st Lt": 5,
  Cpt: 6,
  Major: 7,
  "Lt Col": 8,
  Col: 9,
  "1 Star\nGeneral": 10,
  "2 Star\nGeneral": 11,
  "3 Star\nGeneral": 12,
  "4 Star\nGeneral": 13,
  "5 Star\nGeneral": 14,
};

export const DIFFICULTY_PROFILES: Record<Difficulty, AIProfile> = {
  easy: {
    label: "Recruit",
    flavor:
      "Cautious but shaky. It will miss sharper lines and sometimes drift into loose positions.",
    opening: "easy",
    randomness: 0.8,
    topSlice: 0.8,
    blunderFloor: -11,
    weights: {
      capture: 0.9,
      advancement: 0.8,
      center: 0.4,
      support: 0.3,
      threat: 0.7,
      reveal: 0.15,
    },
  },
  medium: {
    label: "Officer",
    flavor:
      "Stable and practical. It protects its shape and usually finds useful pressure.",
    opening: "medium",
    randomness: 0.38,
    topSlice: 0.45,
    blunderFloor: -5,
    weights: {
      capture: 1.2,
      advancement: 1,
      center: 0.7,
      support: 0.75,
      threat: 1.05,
      reveal: 0.25,
    },
  },
  hard: {
    label: "General",
    flavor:
      "Disciplined and forceful. It keeps strong layers, punishes soft moves, and converts pressure cleanly.",
    opening: "hard",
    randomness: 0.12,
    topSlice: 0.2,
    blunderFloor: -1,
    weights: {
      capture: 1.45,
      advancement: 1.1,
      center: 0.9,
      support: 0.95,
      threat: 1.25,
      reveal: 0.35,
    },
  },
};
