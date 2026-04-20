import { LiturgicalSeason } from "./types";

export type FeastDay =
  | "easter"
  | "christmas"
  | "pentecost"
  | "epiphany"
  | "all-saints"
  | "ascension"
  | "assumption";

// Detect a major General Roman Calendar feast for the given date. Returns
// null on non-feast days. Used for the first-load feast-day pulse animation.
export function getMajorFeast(date: Date = new Date()): FeastDay | null {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Fixed-date feasts
  if (month === 11 && day === 25) return "christmas";
  if (month === 0 && day === 6) return "epiphany";
  if (month === 10 && day === 1) return "all-saints";
  if (month === 7 && day === 15) return "assumption";

  const easter = computeEaster(year);
  if (sameYMD(date, easter)) return "easter";

  const ascension = addDays(easter, 39);
  if (sameYMD(date, ascension)) return "ascension";

  const pentecost = addDays(easter, 49);
  if (sameYMD(date, pentecost)) return "pentecost";

  return null;
}

function sameYMD(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

// Simplified liturgical season detection based on date ranges.
// For a production app you'd use a full liturgical calendar library.
export function getLiturgicalSeason(date: Date = new Date()): LiturgicalSeason {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate();

  // Easter calculation (Anonymous Gregorian algorithm)
  const easter = computeEaster(year);

  const dayOfYear = getDayOfYear(date);
  const easterDOY = getDayOfYear(easter);

  // Ash Wednesday = Easter - 46 days
  const ashWedDOY = easterDOY - 46;
  // Pentecost = Easter + 49 days
  const pentecostDOY = easterDOY + 49;
  // Advent starts ~4 Sundays before Dec 25
  const adventStart = getAdventStart(year);
  const adventDOY = getDayOfYear(adventStart);

  // Christmas season: Dec 25 through Baptism of the Lord (~Jan 10-12)
  if ((month === 11 && day >= 25) || (month === 0 && day <= 12)) {
    return "christmas";
  }

  // Advent: ~Nov 27-Dec 3 through Dec 24
  if (dayOfYear >= adventDOY && month === 11 && day < 25) {
    return "advent";
  }
  // Handle Advent in November
  if (month === 10 && dayOfYear >= adventDOY) {
    return "advent";
  }

  // Lent: Ash Wednesday through Holy Thursday (Easter - 3)
  if (dayOfYear >= ashWedDOY && dayOfYear < easterDOY - 2) {
    return "lent";
  }

  // Easter season: Easter through Pentecost
  if (dayOfYear >= easterDOY && dayOfYear <= pentecostDOY) {
    if (dayOfYear === pentecostDOY) return "pentecost";
    return "easter";
  }

  return "ordinary";
}

function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getAdventStart(year: number): Date {
  // Advent starts on the Sunday closest to Nov 30
  const nov30 = new Date(year, 10, 30);
  const dayOfWeek = nov30.getDay(); // 0=Sun
  // Find the Sunday on or before Nov 30, or the nearest Sunday
  const diff = dayOfWeek === 0 ? 0 : -dayOfWeek;
  const adventStart = new Date(year, 10, 30 + diff);
  // But if that's before Nov 27, move forward a week
  if (adventStart.getDate() < 27 && adventStart.getMonth() === 10) {
    // Actually, Advent is the 4th Sunday before Christmas (Dec 25)
    // So find the Sunday on or after Nov 27
    const dec25 = new Date(year, 11, 25);
    const dec25Day = dec25.getDay();
    const fourthSundayBefore = new Date(year, 11, 25 - dec25Day - 21);
    return fourthSundayBefore;
  }
  return adventStart;
}
