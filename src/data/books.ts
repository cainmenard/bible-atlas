import { BibleBook, Canon } from "@/lib/types";

const all: Canon[] = ["catholic", "protestant", "orthodox", "ethiopian"];
const catholic: Canon[] = ["catholic", "orthodox", "ethiopian"];
const orthodox: Canon[] = ["orthodox", "ethiopian"];
const ethiopian: Canon[] = ["ethiopian"];

export const books: BibleBook[] = [
  // ─── TORAH ───────────────────────────────────────────
  { id: "GEN", name: "Genesis", testament: "OT", genre: "Torah", chapters: 50, verses: 1533, date: "~1400 BC", canons: all },
  { id: "EXO", name: "Exodus", testament: "OT", genre: "Torah", chapters: 40, verses: 1213, date: "~1400 BC", canons: all },
  { id: "LEV", name: "Leviticus", testament: "OT", genre: "Torah", chapters: 27, verses: 859, date: "~1400 BC", canons: all },
  { id: "NUM", name: "Numbers", testament: "OT", genre: "Torah", chapters: 36, verses: 1288, date: "~1400 BC", canons: all },
  { id: "DEU", name: "Deuteronomy", testament: "OT", genre: "Torah", chapters: 34, verses: 959, date: "~1400 BC", canons: all },

  // ─── OT HISTORY ──────────────────────────────────────
  { id: "JOS", name: "Joshua", testament: "OT", genre: "History", chapters: 24, verses: 658, date: "~1350 BC", canons: all },
  { id: "JDG", name: "Judges", testament: "OT", genre: "History", chapters: 21, verses: 618, date: "~1050 BC", canons: all },
  { id: "RUT", name: "Ruth", testament: "OT", genre: "History", chapters: 4, verses: 85, date: "~1010 BC", canons: all },
  { id: "1SA", name: "1 Samuel", testament: "OT", genre: "History", chapters: 31, verses: 810, date: "~930 BC", canons: all },
  { id: "2SA", name: "2 Samuel", testament: "OT", genre: "History", chapters: 24, verses: 695, date: "~930 BC", canons: all },
  { id: "1KI", name: "1 Kings", testament: "OT", genre: "History", chapters: 22, verses: 816, date: "~560 BC", canons: all },
  { id: "2KI", name: "2 Kings", testament: "OT", genre: "History", chapters: 25, verses: 719, date: "~560 BC", canons: all },
  { id: "1CH", name: "1 Chronicles", testament: "OT", genre: "History", chapters: 29, verses: 942, date: "~450 BC", canons: all },
  { id: "2CH", name: "2 Chronicles", testament: "OT", genre: "History", chapters: 36, verses: 822, date: "~450 BC", canons: all },
  { id: "EZR", name: "Ezra", testament: "OT", genre: "History", chapters: 10, verses: 280, date: "~440 BC", canons: all },
  { id: "NEH", name: "Nehemiah", testament: "OT", genre: "History", chapters: 13, verses: 406, date: "~430 BC", canons: all },
  { id: "EST", name: "Esther", testament: "OT", genre: "History", chapters: 10, verses: 167, date: "~470 BC", canons: all },

  // ─── WISDOM ──────────────────────────────────────────
  { id: "JOB", name: "Job", testament: "OT", genre: "Wisdom", chapters: 42, verses: 1070, date: "~600 BC", canons: all },
  { id: "PSA", name: "Psalms", testament: "OT", genre: "Wisdom", chapters: 150, verses: 2461, date: "~500 BC", canons: all },
  { id: "PRO", name: "Proverbs", testament: "OT", genre: "Wisdom", chapters: 31, verses: 915, date: "~700 BC", canons: all },
  { id: "ECC", name: "Ecclesiastes", testament: "OT", genre: "Wisdom", chapters: 12, verses: 222, date: "~450 BC", canons: all },
  { id: "SNG", name: "Song of Solomon", testament: "OT", genre: "Wisdom", chapters: 8, verses: 117, date: "~950 BC", canons: all },

  // ─── MAJOR PROPHETS ──────────────────────────────────
  { id: "ISA", name: "Isaiah", testament: "OT", genre: "Major Prophets", chapters: 66, verses: 1292, date: "~700 BC", canons: all },
  { id: "JER", name: "Jeremiah", testament: "OT", genre: "Major Prophets", chapters: 52, verses: 1364, date: "~600 BC", canons: all },
  { id: "LAM", name: "Lamentations", testament: "OT", genre: "Major Prophets", chapters: 5, verses: 154, date: "~586 BC", canons: all },
  { id: "EZK", name: "Ezekiel", testament: "OT", genre: "Major Prophets", chapters: 48, verses: 1273, date: "~570 BC", canons: all },
  { id: "DAN", name: "Daniel", testament: "OT", genre: "Major Prophets", chapters: 12, verses: 357, date: "~530 BC", canons: all },

  // ─── MINOR PROPHETS ──────────────────────────────────
  { id: "HOS", name: "Hosea", testament: "OT", genre: "Minor Prophets", chapters: 14, verses: 197, date: "~740 BC", canons: all },
  { id: "JOL", name: "Joel", testament: "OT", genre: "Minor Prophets", chapters: 3, verses: 73, date: "~835 BC", canons: all },
  { id: "AMO", name: "Amos", testament: "OT", genre: "Minor Prophets", chapters: 9, verses: 146, date: "~760 BC", canons: all },
  { id: "OBA", name: "Obadiah", testament: "OT", genre: "Minor Prophets", chapters: 1, verses: 21, date: "~585 BC", canons: all },
  { id: "JON", name: "Jonah", testament: "OT", genre: "Minor Prophets", chapters: 4, verses: 48, date: "~760 BC", canons: all },
  { id: "MIC", name: "Micah", testament: "OT", genre: "Minor Prophets", chapters: 7, verses: 105, date: "~700 BC", canons: all },
  { id: "NAH", name: "Nahum", testament: "OT", genre: "Minor Prophets", chapters: 3, verses: 47, date: "~660 BC", canons: all },
  { id: "HAB", name: "Habakkuk", testament: "OT", genre: "Minor Prophets", chapters: 3, verses: 56, date: "~610 BC", canons: all },
  { id: "ZEP", name: "Zephaniah", testament: "OT", genre: "Minor Prophets", chapters: 3, verses: 53, date: "~630 BC", canons: all },
  { id: "HAG", name: "Haggai", testament: "OT", genre: "Minor Prophets", chapters: 2, verses: 38, date: "~520 BC", canons: all },
  { id: "ZEC", name: "Zechariah", testament: "OT", genre: "Minor Prophets", chapters: 14, verses: 211, date: "~520 BC", canons: all },
  { id: "MAL", name: "Malachi", testament: "OT", genre: "Minor Prophets", chapters: 4, verses: 55, date: "~430 BC", canons: all },

  // ─── DEUTEROCANONICAL ────────────────────────────────
  { id: "TOB", name: "Tobit", testament: "DC", genre: "History", chapters: 14, verses: 244, date: "~200 BC", canons: catholic },
  { id: "JDT", name: "Judith", testament: "DC", genre: "History", chapters: 16, verses: 340, date: "~150 BC", canons: catholic },
  { id: "WIS", name: "Wisdom", testament: "DC", genre: "Wisdom", chapters: 19, verses: 435, date: "~50 BC", canons: catholic },
  { id: "SIR", name: "Sirach", testament: "DC", genre: "Wisdom", chapters: 51, verses: 1388, date: "~180 BC", canons: catholic },
  { id: "BAR", name: "Baruch", testament: "DC", genre: "Major Prophets", chapters: 6, verses: 213, date: "~200 BC", canons: catholic },
  { id: "1MA", name: "1 Maccabees", testament: "DC", genre: "History", chapters: 16, verses: 924, date: "~100 BC", canons: catholic },
  { id: "2MA", name: "2 Maccabees", testament: "DC", genre: "History", chapters: 15, verses: 555, date: "~100 BC", canons: catholic },

  // ─── EASTERN ORTHODOX ADDITIONS ──────────────────────
  { id: "1ES", name: "1 Esdras", testament: "DC", genre: "History", chapters: 9, verses: 440, date: "~150 BC", canons: orthodox },
  { id: "PMA", name: "Prayer of Manasseh", testament: "DC", genre: "Wisdom", chapters: 1, verses: 15, date: "~200 BC", canons: orthodox },
  { id: "P151", name: "Psalm 151", testament: "DC", genre: "Wisdom", chapters: 1, verses: 7, date: "~300 BC", canons: orthodox },
  { id: "3MA", name: "3 Maccabees", testament: "DC", genre: "History", chapters: 7, verses: 226, date: "~50 BC", canons: orthodox },

  // ─── ETHIOPIAN ORTHODOX ADDITIONS ────────────────────
  { id: "1EN", name: "1 Enoch", testament: "DC", genre: "Apocalyptic", chapters: 108, verses: 1062, date: "~300 BC", canons: ethiopian },
  { id: "JUB", name: "Jubilees", testament: "DC", genre: "History", chapters: 50, verses: 1310, date: "~150 BC", canons: ethiopian },
  { id: "4BA", name: "4 Baruch", testament: "DC", genre: "Major Prophets", chapters: 9, verses: 133, date: "~100 AD", canons: ethiopian },

  // ─── GOSPELS ─────────────────────────────────────────
  { id: "MAT", name: "Matthew", testament: "NT", genre: "Gospels", chapters: 28, verses: 1071, date: "~60 AD", canons: all },
  { id: "MRK", name: "Mark", testament: "NT", genre: "Gospels", chapters: 16, verses: 678, date: "~55 AD", canons: all },
  { id: "LUK", name: "Luke", testament: "NT", genre: "Gospels", chapters: 24, verses: 1151, date: "~60 AD", canons: all },
  { id: "JHN", name: "John", testament: "NT", genre: "Gospels", chapters: 21, verses: 879, date: "~90 AD", canons: all },

  // ─── NT HISTORY ──────────────────────────────────────
  { id: "ACT", name: "Acts", testament: "NT", genre: "NT History", chapters: 28, verses: 1007, date: "~62 AD", canons: all },

  // ─── PAULINE EPISTLES ────────────────────────────────
  { id: "ROM", name: "Romans", testament: "NT", genre: "Pauline Epistles", chapters: 16, verses: 433, date: "~57 AD", canons: all },
  { id: "1CO", name: "1 Corinthians", testament: "NT", genre: "Pauline Epistles", chapters: 16, verses: 437, date: "~55 AD", canons: all },
  { id: "2CO", name: "2 Corinthians", testament: "NT", genre: "Pauline Epistles", chapters: 13, verses: 257, date: "~56 AD", canons: all },
  { id: "GAL", name: "Galatians", testament: "NT", genre: "Pauline Epistles", chapters: 6, verses: 149, date: "~49 AD", canons: all },
  { id: "EPH", name: "Ephesians", testament: "NT", genre: "Pauline Epistles", chapters: 6, verses: 155, date: "~61 AD", canons: all },
  { id: "PHP", name: "Philippians", testament: "NT", genre: "Pauline Epistles", chapters: 4, verses: 104, date: "~61 AD", canons: all },
  { id: "COL", name: "Colossians", testament: "NT", genre: "Pauline Epistles", chapters: 4, verses: 95, date: "~61 AD", canons: all },
  { id: "1TH", name: "1 Thessalonians", testament: "NT", genre: "Pauline Epistles", chapters: 5, verses: 89, date: "~51 AD", canons: all },
  { id: "2TH", name: "2 Thessalonians", testament: "NT", genre: "Pauline Epistles", chapters: 3, verses: 47, date: "~51 AD", canons: all },
  { id: "1TI", name: "1 Timothy", testament: "NT", genre: "Pauline Epistles", chapters: 6, verses: 113, date: "~64 AD", canons: all },
  { id: "2TI", name: "2 Timothy", testament: "NT", genre: "Pauline Epistles", chapters: 4, verses: 83, date: "~67 AD", canons: all },
  { id: "TIT", name: "Titus", testament: "NT", genre: "Pauline Epistles", chapters: 3, verses: 46, date: "~65 AD", canons: all },
  { id: "PHM", name: "Philemon", testament: "NT", genre: "Pauline Epistles", chapters: 1, verses: 25, date: "~61 AD", canons: all },
  { id: "HEB", name: "Hebrews", testament: "NT", genre: "Pauline Epistles", chapters: 13, verses: 303, date: "~68 AD", canons: all },

  // ─── GENERAL EPISTLES ────────────────────────────────
  { id: "JAS", name: "James", testament: "NT", genre: "General Epistles", chapters: 5, verses: 108, date: "~48 AD", canons: all },
  { id: "1PE", name: "1 Peter", testament: "NT", genre: "General Epistles", chapters: 5, verses: 105, date: "~63 AD", canons: all },
  { id: "2PE", name: "2 Peter", testament: "NT", genre: "General Epistles", chapters: 3, verses: 61, date: "~66 AD", canons: all },
  { id: "1JN", name: "1 John", testament: "NT", genre: "General Epistles", chapters: 5, verses: 105, date: "~90 AD", canons: all },
  { id: "2JN", name: "2 John", testament: "NT", genre: "General Epistles", chapters: 1, verses: 13, date: "~90 AD", canons: all },
  { id: "3JN", name: "3 John", testament: "NT", genre: "General Epistles", chapters: 1, verses: 15, date: "~90 AD", canons: all },
  { id: "JUD", name: "Jude", testament: "NT", genre: "General Epistles", chapters: 1, verses: 25, date: "~68 AD", canons: all },

  // ─── APOCALYPTIC ─────────────────────────────────────
  { id: "REV", name: "Revelation", testament: "NT", genre: "Apocalyptic", chapters: 22, verses: 404, date: "~95 AD", canons: all },
];

export const bookMap = new Map(books.map((b) => [b.id, b]));
