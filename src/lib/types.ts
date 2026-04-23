export type Testament = "OT" | "NT" | "DC";

export type Genre =
  | "Torah"
  | "History"
  | "Wisdom"
  | "Major Prophets"
  | "Minor Prophets"
  | "Gospels"
  | "NT History"
  | "Pauline Epistles"
  | "General Epistles"
  | "Apocalyptic";

export type Canon = "catholic" | "protestant" | "orthodox" | "ethiopian";

export type ViewMode = "constellation" | "arcs";

export interface BibleBook {
  id: string;
  name: string;
  testament: Testament;
  genre: Genre;
  chapters: number;
  verses: number;
  date: string; // approximate composition date
  canons: Canon[];
}

export interface CrossRefEdge {
  source: string;
  target: string;
  weight: number; // 1-10
  count: number; // number of verse-level cross-references
}

export interface VerseCrossRef {
  from: string; // e.g. "GEN.1.1"
  to: string; // e.g. "ISA.45.18"
  votes: number;
}

export interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  book: BibleBook;
  radius: number;
}

export interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode | string;
  target: SimNode | string;
  weight: number;
}

export interface DailyReading {
  type: string; // "First Reading", "Responsorial Psalm", "Gospel", etc.
  reference: string;
  bookId?: string;
}

export interface DailyReadingsData {
  date: string;
  readings: DailyReading[];
  season: LiturgicalSeason;
  /** Set when the readings come from a placeholder rotation (e.g. the Lent
   * weekday array indexed by `dayOfWeek`) rather than a real lectionary. */
  placeholderNote?: string;
}

export type LiturgicalSeason =
  | "advent"
  | "christmas"
  | "lent"
  | "easter"
  | "ordinary"
  | "pentecost";

export interface NavigationEntry {
  bookId: string;
  chapter?: number;
  verse?: number;
  label: string; // e.g. "Genesis", "Genesis 3", "Genesis 3:15"
}

export interface ChapterCrossRefSummary {
  chapter: number;
  totalRefs: number;
  topTargetBooks: { bookId: string; count: number }[];
}

export type DrillDownLevel = "book" | "chapter" | "verse";

/**
 * A snapshot of the reader's current location, pushed onto the reading-history
 * stack before a "Jump to passage" cross-reference navigation so the jump is
 * reversible via the Back breadcrumb.
 */
export interface ReadingLocation {
  bookId: string;
  chapter: number;
  verse: number;
  translation: string;
  scrollY?: number;
}

import * as d3 from "d3";
