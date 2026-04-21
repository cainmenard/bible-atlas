export interface McheyneDay {
  family: string;   // e.g., "Genesis 1"
  secret: string;   // e.g., "Matthew 1"
  church1: string;  // e.g., "Ezra 1"
  church2: string;  // e.g., "Acts 1"
}

// Maps M'Cheyne reference book names to internal book IDs.
export const MCHEYNE_BOOK_NAME_TO_ID: Record<string, string> = {
  'Genesis': 'GEN', 'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM',
  'Deuteronomy': 'DEU', 'Joshua': 'JOS', 'Judges': 'JDG', 'Ruth': 'RUT',
  '1 Samuel': '1SA', '2 Samuel': '2SA', '1 Kings': '1KI', '2 Kings': '2KI',
  '1 Chronicles': '1CH', '2 Chronicles': '2CH', 'Ezra': 'EZR', 'Nehemiah': 'NEH',
  'Esther': 'EST', 'Job': 'JOB', 'Psalms': 'PSA', 'Proverbs': 'PRO',
  'Ecclesiastes': 'ECC', 'Song of Songs': 'SNG', 'Isaiah': 'ISA', 'Jeremiah': 'JER',
  'Lamentations': 'LAM', 'Ezekiel': 'EZK', 'Daniel': 'DAN', 'Hosea': 'HOS',
  'Joel': 'JOL', 'Amos': 'AMO', 'Obadiah': 'OBA', 'Jonah': 'JON', 'Micah': 'MIC',
  'Nahum': 'NAH', 'Habakkuk': 'HAB', 'Zephaniah': 'ZEP', 'Haggai': 'HAG',
  'Zechariah': 'ZEC', 'Malachi': 'MAL',
  'Matthew': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN', 'Acts': 'ACT',
  'Romans': 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO', 'Galatians': 'GAL',
  'Ephesians': 'EPH', 'Philippians': 'PHP', 'Colossians': 'COL',
  '1 Thessalonians': '1TH', '2 Thessalonians': '2TH', '1 Timothy': '1TI',
  '2 Timothy': '2TI', 'Titus': 'TIT', 'Philemon': 'PHM', 'Hebrews': 'HEB',
  'James': 'JAS', '1 Peter': '1PE', '2 Peter': '2PE', '1 John': '1JN',
  '2 John': '2JN', '3 John': '3JN', 'Jude': 'JUD', 'Revelation': 'REV',
};

export function parseMcheyneRef(ref: string): { bookId: string; chapter: number } | null {
  const match = ref.match(/^(.+?)\s+(\d+)$/);
  if (!match) return null;
  const bookId = MCHEYNE_BOOK_NAME_TO_ID[match[1]];
  if (!bookId) return null;
  return { bookId, chapter: parseInt(match[2], 10) };
}

// ── Book lists for each of the four M'Cheyne streams ──────────────────────

type BookEntry = [string, number]; // [displayName, chapterCount]

// Stream 1 – family: OT from Genesis
const FAMILY_BOOKS: BookEntry[] = [
  ['Genesis', 50], ['Exodus', 40], ['Leviticus', 27], ['Numbers', 36],
  ['Deuteronomy', 34], ['Joshua', 24], ['Judges', 21], ['Ruth', 4],
  ['1 Samuel', 31], ['2 Samuel', 24], ['1 Kings', 22], ['2 Kings', 25],
  ['1 Chronicles', 29], ['2 Chronicles', 36], ['Ezra', 10], ['Nehemiah', 13],
  ['Esther', 10], ['Job', 42], ['Psalms', 150], ['Proverbs', 31],
  ['Ecclesiastes', 12], ['Song of Songs', 8], ['Isaiah', 66], ['Jeremiah', 52],
  ['Lamentations', 5], ['Ezekiel', 48], ['Daniel', 12], ['Hosea', 14],
  ['Joel', 3], ['Amos', 9], ['Obadiah', 1], ['Jonah', 4], ['Micah', 7],
  ['Nahum', 3], ['Habakkuk', 3], ['Zephaniah', 3], ['Haggai', 2],
  ['Zechariah', 14], ['Malachi', 4],
];

// Stream 2 – secret: NT from Matthew
const SECRET_BOOKS: BookEntry[] = [
  ['Matthew', 28], ['Mark', 16], ['Luke', 24], ['John', 21], ['Acts', 28],
  ['Romans', 16], ['1 Corinthians', 16], ['2 Corinthians', 13], ['Galatians', 6],
  ['Ephesians', 6], ['Philippians', 4], ['Colossians', 4], ['1 Thessalonians', 5],
  ['2 Thessalonians', 3], ['1 Timothy', 6], ['2 Timothy', 4], ['Titus', 3],
  ['Philemon', 1], ['Hebrews', 13], ['James', 5], ['1 Peter', 5], ['2 Peter', 3],
  ['1 John', 5], ['2 John', 1], ['3 John', 1], ['Jude', 1], ['Revelation', 22],
];

// Stream 3 – church1: OT from Ezra (wraps back to Genesis when exhausted)
const CHURCH1_BOOKS: BookEntry[] = [
  ['Ezra', 10], ['Nehemiah', 13], ['Esther', 10], ['Job', 42], ['Psalms', 150],
  ['Proverbs', 31], ['Ecclesiastes', 12], ['Song of Songs', 8], ['Isaiah', 66],
  ['Jeremiah', 52], ['Lamentations', 5], ['Ezekiel', 48], ['Daniel', 12],
  ['Hosea', 14], ['Joel', 3], ['Amos', 9], ['Obadiah', 1], ['Jonah', 4],
  ['Micah', 7], ['Nahum', 3], ['Habakkuk', 3], ['Zephaniah', 3], ['Haggai', 2],
  ['Zechariah', 14], ['Malachi', 4],
  // wrap: continue from Genesis
  ['Genesis', 50], ['Exodus', 40], ['Leviticus', 27], ['Numbers', 36],
  ['Deuteronomy', 34], ['Joshua', 24], ['Judges', 21], ['Ruth', 4],
  ['1 Samuel', 31], ['2 Samuel', 24], ['1 Kings', 22], ['2 Kings', 25],
  ['1 Chronicles', 29], ['2 Chronicles', 36],
];

// Stream 4 – church2: NT from Acts (wraps back to Matthew when exhausted)
const CHURCH2_BOOKS: BookEntry[] = [
  ['Acts', 28], ['Romans', 16], ['1 Corinthians', 16], ['2 Corinthians', 13],
  ['Galatians', 6], ['Ephesians', 6], ['Philippians', 4], ['Colossians', 4],
  ['1 Thessalonians', 5], ['2 Thessalonians', 3], ['1 Timothy', 6], ['2 Timothy', 4],
  ['Titus', 3], ['Philemon', 1], ['Hebrews', 13], ['James', 5], ['1 Peter', 5],
  ['2 Peter', 3], ['1 John', 5], ['2 John', 1], ['3 John', 1], ['Jude', 1],
  ['Revelation', 22],
  // wrap: continue from Matthew
  ['Matthew', 28], ['Mark', 16], ['Luke', 24], ['John', 21], ['Acts', 28],
  ['Romans', 16], ['1 Corinthians', 16], ['2 Corinthians', 13], ['Galatians', 6],
  ['Ephesians', 6], ['Philippians', 4], ['Colossians', 4], ['1 Thessalonians', 5],
  ['2 Thessalonians', 3], ['1 Timothy', 6], ['2 Timothy', 4], ['Titus', 3],
  ['Philemon', 1], ['Hebrews', 13], ['James', 5], ['1 Peter', 5], ['2 Peter', 3],
  ['1 John', 5], ['2 John', 1], ['3 John', 1], ['Jude', 1], ['Revelation', 22],
];

function chapterRef(books: BookEntry[], absoluteIdx: number): string {
  const total = books.reduce((s, [, c]) => s + c, 0);
  let rem = ((absoluteIdx % total) + total) % total;
  for (const [name, chapters] of books) {
    if (rem < chapters) return `${name} ${rem + 1}`;
    rem -= chapters;
  }
  return `${books[0][0]} 1`;
}

// ── January (days 0–30): accurate to the original 1842 M'Cheyne plan ───────
const JANUARY: McheyneDay[] = [
  { family: 'Genesis 1',  secret: 'Matthew 1',  church1: 'Ezra 1',     church2: 'Acts 1'    },
  { family: 'Genesis 2',  secret: 'Matthew 2',  church1: 'Ezra 2',     church2: 'Acts 2'    },
  { family: 'Genesis 3',  secret: 'Matthew 3',  church1: 'Ezra 3',     church2: 'Acts 3'    },
  { family: 'Genesis 4',  secret: 'Matthew 4',  church1: 'Ezra 4',     church2: 'Acts 4'    },
  { family: 'Genesis 5',  secret: 'Matthew 5',  church1: 'Ezra 5',     church2: 'Acts 5'    },
  { family: 'Genesis 6',  secret: 'Matthew 6',  church1: 'Ezra 6',     church2: 'Acts 6'    },
  { family: 'Genesis 7',  secret: 'Matthew 7',  church1: 'Ezra 7',     church2: 'Acts 7'    },
  { family: 'Genesis 8',  secret: 'Matthew 8',  church1: 'Ezra 8',     church2: 'Acts 8'    },
  { family: 'Genesis 9',  secret: 'Matthew 9',  church1: 'Ezra 9',     church2: 'Acts 9'    },
  { family: 'Genesis 10', secret: 'Matthew 10', church1: 'Ezra 10',    church2: 'Acts 10'   },
  { family: 'Genesis 11', secret: 'Matthew 11', church1: 'Nehemiah 1', church2: 'Acts 11'   },
  { family: 'Genesis 12', secret: 'Matthew 12', church1: 'Nehemiah 2', church2: 'Acts 12'   },
  { family: 'Genesis 13', secret: 'Matthew 13', church1: 'Nehemiah 3', church2: 'Acts 13'   },
  { family: 'Genesis 14', secret: 'Matthew 14', church1: 'Nehemiah 4', church2: 'Acts 14'   },
  { family: 'Genesis 15', secret: 'Matthew 15', church1: 'Nehemiah 5', church2: 'Acts 15'   },
  { family: 'Genesis 16', secret: 'Matthew 16', church1: 'Nehemiah 6', church2: 'Acts 16'   },
  { family: 'Genesis 17', secret: 'Matthew 17', church1: 'Nehemiah 7', church2: 'Acts 17'   },
  { family: 'Genesis 18', secret: 'Matthew 18', church1: 'Nehemiah 8', church2: 'Acts 18'   },
  { family: 'Genesis 19', secret: 'Matthew 19', church1: 'Nehemiah 9', church2: 'Acts 19'   },
  { family: 'Genesis 20', secret: 'Matthew 20', church1: 'Nehemiah 10',church2: 'Acts 20'   },
  { family: 'Genesis 21', secret: 'Matthew 21', church1: 'Nehemiah 11',church2: 'Acts 21'   },
  { family: 'Genesis 22', secret: 'Matthew 22', church1: 'Nehemiah 12',church2: 'Acts 22'   },
  { family: 'Genesis 23', secret: 'Matthew 23', church1: 'Nehemiah 13',church2: 'Acts 23'   },
  { family: 'Genesis 24', secret: 'Matthew 24', church1: 'Esther 1',   church2: 'Acts 24'   },
  { family: 'Genesis 25', secret: 'Matthew 25', church1: 'Esther 2',   church2: 'Acts 25'   },
  { family: 'Genesis 26', secret: 'Matthew 26', church1: 'Esther 3',   church2: 'Acts 26'   },
  { family: 'Genesis 27', secret: 'Matthew 27', church1: 'Esther 4',   church2: 'Acts 27'   },
  { family: 'Genesis 28', secret: 'Matthew 28', church1: 'Esther 5',   church2: 'Acts 28'   },
  { family: 'Genesis 29', secret: 'Mark 1',     church1: 'Esther 6',   church2: 'Romans 1'  },
  { family: 'Genesis 30', secret: 'Mark 2',     church1: 'Esther 7',   church2: 'Romans 2'  },
  { family: 'Genesis 31', secret: 'Mark 3',     church1: 'Esther 8',   church2: 'Romans 3'  },
];

// ── February–December (days 31–364): generated placeholder progression ──────
// TODO: Replace this generated data with the verified M'Cheyne schedule for
// February through December. The original 1842 calendar is public domain and
// available at https://www.mcheyne.info/calendar.pdf
//
// The generator continues each stream from where January left off:
//   family  → Genesis 32 onward through OT
//   secret  → Mark 4 onward through NT (cycles)
//   church1 → Esther 9 onward through Ezra-start OT (cycles)
//   church2 → Romans 4 onward through Acts-start NT (cycles)
const REST: McheyneDay[] = Array.from({ length: 334 }, (_, i) => ({
  family:  chapterRef(FAMILY_BOOKS,  31 + i),
  secret:  chapterRef(SECRET_BOOKS,  31 + i),
  church1: chapterRef(CHURCH1_BOOKS, 31 + i),
  church2: chapterRef(CHURCH2_BOOKS, 31 + i),
}));

export const mcheyneReadingPlan: McheyneDay[] = [...JANUARY, ...REST];

export function getMcheyneForDate(date: Date): McheyneDay {
  const start = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return mcheyneReadingPlan[Math.min(Math.max(dayOfYear, 0), 364)];
}
