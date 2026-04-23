import { books } from "@/data/books";
import { fetchVerseText } from "@/lib/bible-api";
import type { BibleBook, Canon } from "@/lib/types";

export interface BookAlias {
  canonical: string;
  aliases: string[];
}

export interface BookMatch {
  book: BibleBook;
  /** Lower score = better rank. */
  score: number;
}

/**
 * Structured result of parsing a palette query. One ParsedQuery is emitted
 * per candidate book — an ambiguous query (`john`, `1 4`) yields several.
 */
export interface ParsedQuery {
  /** Canonical book name, e.g. "1 John" or "Psalms". */
  book: string;
  chapter?: number;
  verse?: number;
}

/**
 * Alias entries for every supported canonical book. Aliases are lowercase
 * abbreviations, alternate names, and numberless variants. Keep in sync with
 * src/data/books.ts.
 */
export const bookAliases: BookAlias[] = [
  // ─── Torah ───
  { canonical: "Genesis", aliases: ["gen", "ge", "gn"] },
  { canonical: "Exodus", aliases: ["ex", "exo", "exod"] },
  { canonical: "Leviticus", aliases: ["lev", "le", "lv"] },
  { canonical: "Numbers", aliases: ["num", "nu", "nm", "nb"] },
  { canonical: "Deuteronomy", aliases: ["deut", "dt", "de"] },

  // ─── OT History ───
  { canonical: "Joshua", aliases: ["josh", "jos", "jsh"] },
  { canonical: "Judges", aliases: ["judg", "jdg", "jg", "jdgs"] },
  { canonical: "Ruth", aliases: ["rut", "rth", "ru"] },
  { canonical: "1 Samuel", aliases: ["1 sam", "1sam", "1 sa", "1sa", "i samuel", "first samuel", "1samuel"] },
  { canonical: "2 Samuel", aliases: ["2 sam", "2sam", "2 sa", "2sa", "ii samuel", "second samuel", "2samuel"] },
  { canonical: "1 Kings", aliases: ["1 kgs", "1kgs", "1 ki", "1ki", "i kings", "first kings", "1kings"] },
  { canonical: "2 Kings", aliases: ["2 kgs", "2kgs", "2 ki", "2ki", "ii kings", "second kings", "2kings"] },
  { canonical: "1 Chronicles", aliases: ["1 chr", "1chr", "1 ch", "1ch", "i chronicles", "first chronicles", "1chronicles"] },
  { canonical: "2 Chronicles", aliases: ["2 chr", "2chr", "2 ch", "2ch", "ii chronicles", "second chronicles", "2chronicles"] },
  { canonical: "Ezra", aliases: ["ezr", "ez"] },
  { canonical: "Nehemiah", aliases: ["neh", "ne"] },
  { canonical: "Esther", aliases: ["est", "esth", "es"] },

  // ─── Wisdom ───
  { canonical: "Job", aliases: ["jb"] },
  { canonical: "Psalms", aliases: ["ps", "psa", "psalm", "pss", "pslm"] },
  { canonical: "Proverbs", aliases: ["prov", "pro", "prv", "pr"] },
  { canonical: "Ecclesiastes", aliases: ["eccl", "ecc", "ec", "qoh", "qoheleth"] },
  { canonical: "Song of Solomon", aliases: ["song", "sos", "so", "song of songs", "canticles", "cant"] },

  // ─── Major Prophets ───
  { canonical: "Isaiah", aliases: ["isa", "is"] },
  { canonical: "Jeremiah", aliases: ["jer", "je", "jr"] },
  { canonical: "Lamentations", aliases: ["lam", "la"] },
  { canonical: "Ezekiel", aliases: ["ezek", "eze", "ezk"] },
  { canonical: "Daniel", aliases: ["dan", "da", "dn"] },

  // ─── Minor Prophets ───
  { canonical: "Hosea", aliases: ["hos", "ho"] },
  { canonical: "Joel", aliases: ["joe", "jl"] },
  { canonical: "Amos", aliases: ["am"] },
  { canonical: "Obadiah", aliases: ["obad", "oba", "ob"] },
  { canonical: "Jonah", aliases: ["jon", "jnh"] },
  { canonical: "Micah", aliases: ["mic", "mc"] },
  { canonical: "Nahum", aliases: ["nah", "na"] },
  { canonical: "Habakkuk", aliases: ["hab", "hb"] },
  { canonical: "Zephaniah", aliases: ["zeph", "zep", "zp"] },
  { canonical: "Haggai", aliases: ["hag", "hg"] },
  { canonical: "Zechariah", aliases: ["zech", "zec", "zc"] },
  { canonical: "Malachi", aliases: ["mal", "ml"] },

  // ─── Deuterocanonical ───
  { canonical: "Tobit", aliases: ["tob", "tb"] },
  { canonical: "Judith", aliases: ["jdt", "jth"] },
  { canonical: "Wisdom", aliases: ["wis", "ws", "wisdom of solomon"] },
  { canonical: "Sirach", aliases: ["sir", "ecclus", "ecclesiasticus"] },
  { canonical: "Baruch", aliases: ["bar"] },
  { canonical: "1 Maccabees", aliases: ["1 macc", "1macc", "1 ma", "1ma", "i maccabees", "first maccabees", "1maccabees"] },
  { canonical: "2 Maccabees", aliases: ["2 macc", "2macc", "2 ma", "2ma", "ii maccabees", "second maccabees", "2maccabees"] },

  // ─── Eastern Orthodox additions ───
  { canonical: "1 Esdras", aliases: ["1 esd", "1esd", "1 es", "1es", "i esdras", "first esdras", "1esdras"] },
  { canonical: "Prayer of Manasseh", aliases: ["pr man", "pman", "pma", "manasseh"] },
  { canonical: "Psalm 151", aliases: ["ps 151", "ps151", "psalm151", "151"] },
  { canonical: "3 Maccabees", aliases: ["3 macc", "3macc", "3 ma", "3ma", "iii maccabees", "third maccabees", "3maccabees"] },

  // ─── Ethiopian Orthodox additions ───
  { canonical: "1 Enoch", aliases: ["1 en", "1en", "enoch", "i enoch", "first enoch", "1enoch"] },
  { canonical: "Jubilees", aliases: ["jub"] },
  { canonical: "4 Baruch", aliases: ["4 bar", "4bar", "4 ba", "4ba", "iv baruch", "fourth baruch", "4baruch", "paraleipomena"] },

  // ─── Gospels ───
  { canonical: "Matthew", aliases: ["matt", "mat", "mt"] },
  { canonical: "Mark", aliases: ["mrk", "mk", "mar"] },
  { canonical: "Luke", aliases: ["luk", "lk"] },
  { canonical: "John", aliases: ["jhn", "jn", "joh"] },

  // ─── NT History ───
  { canonical: "Acts", aliases: ["act", "ac", "acts of the apostles"] },

  // ─── Pauline Epistles ───
  { canonical: "Romans", aliases: ["rom", "ro", "rm"] },
  { canonical: "1 Corinthians", aliases: ["1 cor", "1cor", "1 co", "1co", "i corinthians", "first corinthians", "1corinthians"] },
  { canonical: "2 Corinthians", aliases: ["2 cor", "2cor", "2 co", "2co", "ii corinthians", "second corinthians", "2corinthians"] },
  { canonical: "Galatians", aliases: ["gal", "ga"] },
  { canonical: "Ephesians", aliases: ["eph", "ephes"] },
  { canonical: "Philippians", aliases: ["phil", "php", "pp"] },
  { canonical: "Colossians", aliases: ["col", "co"] },
  { canonical: "1 Thessalonians", aliases: ["1 thess", "1thess", "1 th", "1th", "i thessalonians", "first thessalonians", "1thessalonians"] },
  { canonical: "2 Thessalonians", aliases: ["2 thess", "2thess", "2 th", "2th", "ii thessalonians", "second thessalonians", "2thessalonians"] },
  { canonical: "1 Timothy", aliases: ["1 tim", "1tim", "1 ti", "1ti", "i timothy", "first timothy", "1timothy"] },
  { canonical: "2 Timothy", aliases: ["2 tim", "2tim", "2 ti", "2ti", "ii timothy", "second timothy", "2timothy"] },
  { canonical: "Titus", aliases: ["tit", "ti"] },
  { canonical: "Philemon", aliases: ["philem", "phm", "pm"] },
  { canonical: "Hebrews", aliases: ["heb"] },

  // ─── General Epistles ───
  { canonical: "James", aliases: ["jas", "jm"] },
  { canonical: "1 Peter", aliases: ["1 pet", "1pet", "1 pe", "1pe", "i peter", "first peter", "1peter"] },
  { canonical: "2 Peter", aliases: ["2 pet", "2pet", "2 pe", "2pe", "ii peter", "second peter", "2peter"] },
  { canonical: "1 John", aliases: ["1 jn", "1jn", "1 jhn", "1jhn", "i john", "first john", "1john"] },
  { canonical: "2 John", aliases: ["2 jn", "2jn", "2 jhn", "2jhn", "ii john", "second john", "2john"] },
  { canonical: "3 John", aliases: ["3 jn", "3jn", "3 jhn", "3jhn", "iii john", "third john", "3john"] },
  { canonical: "Jude", aliases: ["jud", "jd"] },

  // ─── Apocalyptic ───
  { canonical: "Revelation", aliases: ["rev", "re", "rv", "apocalypse", "revelations"] },
];

/**
 * Pre-computed index built once at module load. Each entry caches the
 * canonical name, its lowercased form, the full set of aliases (lowercased),
 * and the matching BibleBook from `books.ts`.
 */
interface IndexEntry {
  book: BibleBook;
  canonical: string;
  canonicalLower: string;
  aliases: string[];
}

const aliasByCanonical = new Map(bookAliases.map((b) => [b.canonical, b.aliases]));

const searchIndex: IndexEntry[] = books.map((book) => {
  const aliases = aliasByCanonical.get(book.name) ?? [];
  return {
    book,
    canonical: book.name,
    canonicalLower: book.name.toLowerCase(),
    aliases: aliases.map((a) => a.toLowerCase()),
  };
});

/** Canonical-name → BibleBook lookup. Name strings are exactly `book.name`. */
export const bookByCanonicalName = new Map<string, BibleBook>(
  books.map((b) => [b.name, b]),
);

// Score tiers — lower is better; gaps leave room for within-tier tie-breakers.
const TIER_EXACT_ALIAS = 0;
const TIER_PREFIX_CANONICAL = 100;
const TIER_PREFIX_ALIAS = 200;
const TIER_CONTAINS_CANONICAL = 300;
const TIER_CONTAINS_ALIAS = 400;
const TIER_FUZZY = 500;

const MAX_RESULTS = 8;

/**
 * Levenshtein edit distance with an early-exit cap. Returns Infinity when the
 * distance exceeds the cap so callers can skip distant candidates cheaply.
 */
function editDistance(a: string, b: string, cap: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return Infinity;

  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > cap) return Infinity;
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  return prev[n];
}

/**
 * Search book index by query string. Results are ranked (best first) by the
 * priorities documented below and capped at MAX_RESULTS.
 *
 * Ranking:
 *   1. Exact alias match (`mk` → Mark)
 *   2. Canonical name starts with query (`mat` → Matthew before Mark)
 *   3. Canonical name contains query (`saiah` → Isaiah)
 *   4. Fuzzy match at edit distance ≤ 2 (`mattew` → Matthew). Single-character
 *      queries never fuzzy-match.
 *
 * Numbered disambiguation: a query like `john` must resolve to "John" (the
 * Gospel) before "1 John", "2 John", "3 John" — handled via the canonical
 * prefix tier beating any alias containing "john".
 */
export function searchBooks(query: string): BookMatch[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const results: BookMatch[] = [];

  for (const entry of searchIndex) {
    let best = Infinity;

    // Exact alias match.
    if (entry.aliases.includes(q) || entry.canonicalLower === q) {
      best = TIER_EXACT_ALIAS;
    } else if (entry.canonicalLower.startsWith(q)) {
      // Prefix match on canonical name. Shorter canonicals outrank longer
      // ones with the same prefix (so `john` → "John" ranks above "1 John").
      best = TIER_PREFIX_CANONICAL + entry.canonicalLower.length;
    } else {
      // Prefix match on any alias.
      let aliasPrefix = Infinity;
      for (const a of entry.aliases) {
        if (a.startsWith(q)) {
          aliasPrefix = Math.min(aliasPrefix, TIER_PREFIX_ALIAS + a.length);
        }
      }
      if (aliasPrefix < best) best = aliasPrefix;

      if (best === Infinity && entry.canonicalLower.includes(q)) {
        best = TIER_CONTAINS_CANONICAL + entry.canonicalLower.length;
      }

      if (best === Infinity) {
        for (const a of entry.aliases) {
          if (a.includes(q)) {
            best = Math.min(best, TIER_CONTAINS_ALIAS + a.length);
          }
        }
      }

      // Fuzzy match — skip single-character queries to avoid false positives.
      if (best === Infinity && q.length >= 2) {
        const d = editDistance(q, entry.canonicalLower, 2);
        if (d !== Infinity && d <= 2) {
          best = TIER_FUZZY + d * 10 + entry.canonicalLower.length;
        }
      }
    }

    if (best !== Infinity) {
      results.push({ book: entry.book, score: best });
    }
  }

  results.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.book.name.localeCompare(b.book.name);
  });

  return results.slice(0, MAX_RESULTS);
}

// ────────────────────────────────────────────────────────────
// Query parsing — book + optional chapter:verse reference
// ────────────────────────────────────────────────────────────

/** Pure translation codes never resolve to a passage. */
const TRANSLATION_CODES = new Set(["rsv", "kjv", "jb", "ce", "web", "rsv-ce"]);

interface ReferenceParts {
  bookText: string;
  chapter?: number;
  verse?: number;
}

/**
 * Separate the numeric chapter[:verse] portion from the book text portion of
 * a raw (already lowercased, whitespace-normalized) query. Recognizes these
 * shapes, in order:
 *   1. `book chapter[:verse[-end]]`       ("mark 4", "mark 4:1", "1 john 3:16")
 *   2. `chapter[:verse[-end]] book`       ("4 mark", "4:1 mark")
 *   3. `alphaAbbr+chapter[:verse[-end]]`  ("mk4", "mk4:1")
 *   4. `digit+alpha+chapter[:verse]`      ("1jn4", "1jn4:16")
 *
 * Returns null only if the input is empty. Otherwise the whole input is
 * treated as book text (patterns fell through).
 */
function parseReferenceParts(raw: string): ReferenceParts | null {
  const q = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return null;

  // 1. book then chapter[:verse[-end]] — non-greedy book text to allow
  //    multi-word names ("1 john 3:16", "song of solomon 2:4").
  let m = q.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-\d+)?)?$/);
  if (m) {
    return {
      bookText: m[1],
      chapter: parseInt(m[2], 10),
      verse: m[3] ? parseInt(m[3], 10) : undefined,
    };
  }

  // 2. chapter[:verse[-end]] then book — reversed order.
  m = q.match(/^(\d+)(?::(\d+)(?:-\d+)?)?\s+([a-z].*)$/);
  if (m) {
    return {
      bookText: m[3],
      chapter: parseInt(m[1], 10),
      verse: m[2] ? parseInt(m[2], 10) : undefined,
    };
  }

  // 3. alpha abbr glued to chapter ("mk4", "mk4:1-9").
  m = q.match(/^([a-z]+)(\d+)(?::(\d+)(?:-\d+)?)?$/);
  if (m) {
    return {
      bookText: m[1],
      chapter: parseInt(m[2], 10),
      verse: m[3] ? parseInt(m[3], 10) : undefined,
    };
  }

  // 4. digit + alpha glued ("1jn4", "1jn4:16"). Numbered-book abbreviation
  //    with the chapter appended directly. The book text is normalized back
  //    to "<digit> <alpha>" so searchBooks can match the canonical alias.
  m = q.match(/^(\d)([a-z]+)(\d+)(?::(\d+)(?:-\d+)?)?$/);
  if (m) {
    return {
      bookText: `${m[1]} ${m[2]}`,
      chapter: parseInt(m[3], 10),
      verse: m[4] ? parseInt(m[4], 10) : undefined,
    };
  }

  // No chapter present — the whole query is book text.
  return { bookText: q };
}

/**
 * Parse a palette query into one or more structured references. A plain book
 * query yields book-only results (matching 7A); a query with a chapter yields
 * Type B results; chapter+verse yields Type C results.
 *
 * Ambiguous text like `john` produces multiple entries (John, 1 John, 2 John,
 * 3 John) in the same ranking order as searchBooks. Translation codes on
 * their own (`rsv`, `kjv`, …) never produce results — translations aren't
 * passages.
 */
export function parseQuery(query: string, canon?: Canon): ParsedQuery[] {
  const raw = query.trim().toLowerCase();
  if (raw.length === 0) return [];
  if (TRANSLATION_CODES.has(raw)) return [];

  const parts = parseReferenceParts(raw);
  if (!parts) return [];

  const matches = searchBooks(parts.bookText);
  if (matches.length === 0) return [];

  // Filter out books that aren't in the active canon. DC books without any
  // derived data (verse counts, cross-refs, bible-api names) would otherwise
  // route into a dead reader pipeline.
  const filtered = canon
    ? matches.filter((m) => m.book.canons.includes(canon))
    : matches;

  return filtered.map((m) => ({
    book: m.book.name,
    chapter: parts.chapter,
    verse: parts.verse,
  }));
}

// ────────────────────────────────────────────────────────────
// Verse text preview cache (for Type C results in the palette)
// ────────────────────────────────────────────────────────────

type VerseCacheEntry = string | null;

const verseTextCache = new Map<string, VerseCacheEntry>();
const verseTextPending = new Map<string, Promise<VerseCacheEntry>>();

function verseCacheKey(
  translation: string,
  book: string,
  chapter: number,
  verse: number,
): string {
  return `${translation}-${book}-${chapter}-${verse}`;
}

/** Synchronous cache lookup; undefined if not yet fetched, string on hit,
 *  null on settled fetch failure. */
export function getCachedVerseText(
  translation: string,
  book: string,
  chapter: number,
  verse: number,
): VerseCacheEntry | undefined {
  return verseTextCache.get(verseCacheKey(translation, book, chapter, verse));
}

/**
 * Fetch the preview text for a single verse, deduplicating concurrent
 * fetches for the same key. Results are cached in-memory for the session.
 * Returns null when the fetch fails or yields no text.
 */
export function fetchVersePreview(
  translation: string,
  book: string,
  chapter: number,
  verse: number,
): Promise<VerseCacheEntry> {
  const key = verseCacheKey(translation, book, chapter, verse);

  if (verseTextCache.has(key)) {
    return Promise.resolve(verseTextCache.get(key) ?? null);
  }
  const pending = verseTextPending.get(key);
  if (pending) return pending;

  const bookEntry = bookByCanonicalName.get(book);
  if (!bookEntry) {
    verseTextCache.set(key, null);
    return Promise.resolve(null);
  }

  const promise = fetchVerseText(bookEntry.id, chapter, verse, translation)
    .then((result) => {
      const text = result?.text ?? null;
      verseTextCache.set(key, text);
      verseTextPending.delete(key);
      return text;
    })
    .catch(() => {
      verseTextCache.set(key, null);
      verseTextPending.delete(key);
      return null;
    });

  verseTextPending.set(key, promise);
  return promise;
}

/** Drop all cached verse previews. Call when the active translation changes. */
export function clearVerseTextCache(): void {
  verseTextCache.clear();
  verseTextPending.clear();
}

// ────────────────────────────────────────────────────────────
// Genre search
// ────────────────────────────────────────────────────────────

export interface GenreMatch {
  /** Display label, e.g. "Gospels" or "Major Prophets". */
  genre: string;
  books: BookMatch[];
}

interface GenreQueryGroup {
  label: string;
  genres: string[];
  extraBookNames?: string[];
}

interface GenreQueryEntry {
  aliases: string[];
  groups: GenreQueryGroup[];
}

const GENRE_QUERIES: GenreQueryEntry[] = [
  { aliases: ['gospels', 'gospel'], groups: [{ label: 'Gospels', genres: ['Gospels'] }] },
  {
    aliases: ['prophets', 'prophet'],
    groups: [
      { label: 'Major Prophets', genres: ['Major Prophets'] },
      { label: 'Minor Prophets', genres: ['Minor Prophets'] },
    ],
  },
  { aliases: ['wisdom'], groups: [{ label: 'Wisdom', genres: ['Wisdom'] }] },
  {
    aliases: ['epistles', 'letters'],
    groups: [
      { label: 'Pauline Epistles', genres: ['Pauline Epistles'] },
      { label: 'General Epistles', genres: ['General Epistles'] },
    ],
  },
  { aliases: ['torah', 'pentateuch'], groups: [{ label: 'Torah', genres: ['Torah'] }] },
  { aliases: ['history', 'historical'], groups: [{ label: 'History', genres: ['History'] }] },
  {
    aliases: ['apocalyptic'],
    groups: [{ label: 'Apocalyptic', genres: ['Apocalyptic'], extraBookNames: ['Daniel'] }],
  },
];

/**
 * Return genre groups matching an exact genre alias (e.g. "gospels" → [{genre:"Gospels", books:[...]}]).
 * Only exact-alias matches are supported — this is not a fuzzy search.
 * Returns an empty array if the query does not match any known genre alias.
 */
export function searchGenres(query: string, canon?: Canon): GenreMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const result: GenreMatch[] = [];
  for (const entry of GENRE_QUERIES) {
    if (!entry.aliases.includes(q)) continue;
    for (const group of entry.groups) {
      const genreSet = new Set(group.genres);
      const extraSet = new Set(group.extraBookNames ?? []);
      const matchingBooks: BookMatch[] = [];
      for (const b of books) {
        if (canon && !b.canons.includes(canon)) continue;
        if (genreSet.has(b.genre) || extraSet.has(b.name)) {
          matchingBooks.push({ book: b, score: 0 });
        }
      }
      if (matchingBooks.length > 0) {
        result.push({ genre: group.label, books: matchingBooks });
      }
    }
  }
  return result;
}
