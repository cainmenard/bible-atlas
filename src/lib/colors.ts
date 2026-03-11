import { Genre, LiturgicalSeason } from "./types";

export const GENRE_COLORS: Record<Genre, string> = {
  Torah: "#f59e0b",
  History: "#d97706",
  Wisdom: "#fde68a",
  "Major Prophets": "#f97316",
  "Minor Prophets": "#fb923c",
  Gospels: "#38bdf8",
  "NT History": "#7dd3fc",
  "Pauline Epistles": "#a78bfa",
  "General Epistles": "#34d399",
  Apocalyptic: "#f472b6",
};

export const LITURGICAL_COLORS: Record<LiturgicalSeason, string> = {
  advent: "#7c3aed",
  christmas: "#fbbf24",
  lent: "#7c3aed",
  easter: "#fbbf24",
  ordinary: "#22c55e",
  pentecost: "#ef4444",
};

export const ACCENT = "#f8c471";
export const BG_CENTER = "#0d1b3e";
export const BG_EDGE = "#020509";
