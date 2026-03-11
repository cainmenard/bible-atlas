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
}

export type LiturgicalSeason =
  | "advent"
  | "christmas"
  | "lent"
  | "easter"
  | "ordinary"
  | "pentecost";

import * as d3 from "d3";
