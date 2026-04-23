import { DailyReadingsData, DailyReading, LiturgicalSeason } from "./types";
import { getLiturgicalSeason } from "./liturgical";

// Lectionary data: a simplified daily readings dataset.
// This provides fallback readings for each day based on the liturgical calendar.
// In a production app, this would be a complete 3-year lectionary cycle.

interface LectionaryEntry {
  readings: DailyReading[];
  placeholderNote?: string;
}

const LENT_PLACEHOLDER_NOTE =
  "Sample readings (lectionary placeholder) — a full Lenten weekday lectionary is not yet wired up.";

function getLectionaryReadings(date: Date): LectionaryEntry {
  const dayOfWeek = date.getDay();
  const season = getLiturgicalSeason(date);

  // Lent weekday readings (approximate — indexed by dayOfWeek so every
  // Monday of Lent returns the same reading until a proper week×weekday
  // lectionary is wired up; the UI surfaces `placeholderNote` to flag this).
  if (season === "lent") {
    const lentWeekday: LectionaryEntry[] = [
      { readings: [
        { type: "First Reading", reference: "Deuteronomy 4:1-9", bookId: "DEU" },
        { type: "Psalm", reference: "Psalm 147:12-20", bookId: "PSA" },
        { type: "Gospel", reference: "Matthew 5:17-19", bookId: "MAT" },
      ]},
      { readings: [
        { type: "First Reading", reference: "Jeremiah 7:23-28", bookId: "JER" },
        { type: "Psalm", reference: "Psalm 95:1-9", bookId: "PSA" },
        { type: "Gospel", reference: "Luke 11:14-23", bookId: "LUK" },
      ]},
      { readings: [
        { type: "First Reading", reference: "Isaiah 49:8-15", bookId: "ISA" },
        { type: "Psalm", reference: "Psalm 145:8-18", bookId: "PSA" },
        { type: "Gospel", reference: "John 5:17-30", bookId: "JHN" },
      ]},
      { readings: [
        { type: "First Reading", reference: "Exodus 32:7-14", bookId: "EXO" },
        { type: "Psalm", reference: "Psalm 106:19-23", bookId: "PSA" },
        { type: "Gospel", reference: "John 5:31-47", bookId: "JHN" },
      ]},
      { readings: [
        // Swapped from Wisdom 2:1-22 (DC, not available via bible-api.com).
        { type: "First Reading", reference: "Proverbs 1:10-19", bookId: "PRO" },
        { type: "Psalm", reference: "Psalm 34:17-23", bookId: "PSA" },
        { type: "Gospel", reference: "John 7:1-30", bookId: "JHN" },
      ]},
      { readings: [
        { type: "First Reading", reference: "Daniel 3:14-28", bookId: "DAN" },
        { type: "Psalm", reference: "Psalm 23:1-6", bookId: "PSA" },
        { type: "Gospel", reference: "John 8:31-42", bookId: "JHN" },
      ]},
      { readings: [
        { type: "First Reading", reference: "Genesis 17:3-9", bookId: "GEN" },
        { type: "Psalm", reference: "Psalm 105:4-9", bookId: "PSA" },
        { type: "Gospel", reference: "John 8:51-59", bookId: "JHN" },
      ]},
    ];
    const entry = lentWeekday[dayOfWeek] || lentWeekday[0];
    return { ...entry, placeholderNote: LENT_PLACEHOLDER_NOTE };
  }

  // Advent readings
  if (season === "advent") {
    return { readings: [
      { type: "First Reading", reference: "Isaiah 11:1-10", bookId: "ISA" },
      { type: "Psalm", reference: "Psalm 72:1-7, 18-19", bookId: "PSA" },
      { type: "Gospel", reference: "Luke 10:21-24", bookId: "LUK" },
    ]};
  }

  // Christmas readings
  if (season === "christmas") {
    return { readings: [
      { type: "First Reading", reference: "Isaiah 52:7-10", bookId: "ISA" },
      { type: "Psalm", reference: "Psalm 98:1-6", bookId: "PSA" },
      { type: "Second Reading", reference: "Hebrews 1:1-6", bookId: "HEB" },
      { type: "Gospel", reference: "John 1:1-18", bookId: "JHN" },
    ]};
  }

  // Easter readings
  if (season === "easter") {
    return { readings: [
      { type: "First Reading", reference: "Acts 2:14-33", bookId: "ACT" },
      { type: "Psalm", reference: "Psalm 16:1-11", bookId: "PSA" },
      { type: "Second Reading", reference: "1 Peter 1:17-21", bookId: "1PE" },
      { type: "Gospel", reference: "Luke 24:13-35", bookId: "LUK" },
    ]};
  }

  // Pentecost Sunday — Mass of the Day readings (Lectionary Year A/B/C share this set).
  if (season === "pentecost") {
    return { readings: [
      { type: "First Reading", reference: "Acts 2:1-11", bookId: "ACT" },
      { type: "Psalm", reference: "Psalm 104:1, 24, 29-30, 31, 34", bookId: "PSA" },
      { type: "Second Reading", reference: "1 Corinthians 12:3-7, 12-13", bookId: "1CO" },
      { type: "Gospel", reference: "John 20:19-23", bookId: "JHN" },
    ]};
  }

  // Ordinary Time — rotate based on day of year
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const ordinaryReadings: LectionaryEntry[] = [
    { readings: [
      { type: "First Reading", reference: "Genesis 1:1-19", bookId: "GEN" },
      { type: "Psalm", reference: "Psalm 104:1-2, 5-6, 10, 12, 24, 35", bookId: "PSA" },
      { type: "Gospel", reference: "Mark 6:53-56", bookId: "MRK" },
    ]},
    { readings: [
      { type: "First Reading", reference: "Isaiah 55:1-3", bookId: "ISA" },
      { type: "Psalm", reference: "Psalm 145:8-9, 15-18", bookId: "PSA" },
      { type: "Second Reading", reference: "Romans 8:35-39", bookId: "ROM" },
      { type: "Gospel", reference: "Matthew 14:13-21", bookId: "MAT" },
    ]},
    { readings: [
      { type: "First Reading", reference: "1 Kings 19:9-13", bookId: "1KI" },
      { type: "Psalm", reference: "Psalm 85:9-14", bookId: "PSA" },
      { type: "Gospel", reference: "Matthew 14:22-33", bookId: "MAT" },
    ]},
    { readings: [
      { type: "First Reading", reference: "Jeremiah 31:31-34", bookId: "JER" },
      { type: "Psalm", reference: "Psalm 51:3-4, 12-15", bookId: "PSA" },
      { type: "Gospel", reference: "Mark 14:12-26", bookId: "MRK" },
    ]},
    { readings: [
      { type: "First Reading", reference: "Ezekiel 37:1-14", bookId: "EZK" },
      { type: "Psalm", reference: "Psalm 107:2-9", bookId: "PSA" },
      { type: "Gospel", reference: "John 11:1-45", bookId: "JHN" },
    ]},
    { readings: [
      // Swapped from Sirach 27:4-7 (DC, not available via bible-api.com).
      // Proverbs 12:15-22 matches the theme: speech and the heart revealed.
      { type: "First Reading", reference: "Proverbs 12:15-22", bookId: "PRO" },
      { type: "Psalm", reference: "Psalm 92:2-3, 13-16", bookId: "PSA" },
      { type: "Second Reading", reference: "1 Corinthians 15:54-58", bookId: "1CO" },
      { type: "Gospel", reference: "Luke 6:39-45", bookId: "LUK" },
    ]},
    { readings: [
      { type: "First Reading", reference: "Proverbs 31:10-31", bookId: "PRO" },
      { type: "Psalm", reference: "Psalm 128:1-5", bookId: "PSA" },
      { type: "Second Reading", reference: "1 Thessalonians 5:1-6", bookId: "1TH" },
      { type: "Gospel", reference: "Matthew 25:14-30", bookId: "MAT" },
    ]},
  ];

  return ordinaryReadings[dayOfYear % ordinaryReadings.length];
}

export function getDailyReadings(): DailyReadingsData {
  const now = new Date();
  const displayDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const season = getLiturgicalSeason(now);
  const lectionary = getLectionaryReadings(now);

  return {
    date: displayDate,
    readings: lectionary.readings,
    season,
    placeholderNote: lectionary.placeholderNote,
  };
}
