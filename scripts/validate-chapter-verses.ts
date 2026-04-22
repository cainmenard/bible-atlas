// Validator for src/data/chapter-verses.ts vs src/data/books.ts.
//
// Asserts, for every entry in CHAPTER_VERSES:
//   1. array.length === books.ts book.chapters
//   2. sum(array) === books.ts book.verses
//
// Run via `npm run validate-data` (invoked automatically as a prebuild step).
// Exits non-zero with a readable diff on any mismatch.
//
// Parses the two data files as text so it runs under plain Node with
// `--experimental-strip-types` — no path-alias loader or app-module
// evaluation required.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHAPTER_VERSES_PATH = resolve(ROOT, "src/data/chapter-verses.ts");
const BOOKS_PATH = resolve(ROOT, "src/data/books.ts");

type BookMeta = { id: string; chapters: number; verses: number };

function parseChapterVerses(source: string): Record<string, number[]> {
  const body = extractObjectLiteral(source, "CHAPTER_VERSES");
  const entryRe =
    /(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))\s*:\s*\[([^\]]*)\]/g;
  const result: Record<string, number[]> = {};
  let match: RegExpExecArray | null;
  while ((match = entryRe.exec(body)) !== null) {
    const key = match[1] ?? match[2];
    const nums = match[3]
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => {
        const n = Number(s);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
          throw new Error(
            `CHAPTER_VERSES[${key}] contains non-integer token "${s}"`,
          );
        }
        return n;
      });
    result[key] = nums;
  }
  if (Object.keys(result).length === 0) {
    throw new Error("Parsed zero entries from CHAPTER_VERSES");
  }
  return result;
}

function parseBooks(source: string): BookMeta[] {
  const body = extractArrayLiteral(source, "books");
  const books: BookMeta[] = [];
  // Match each brace-delimited object literal at top level of the array.
  const objects = splitTopLevelObjects(body);
  for (const obj of objects) {
    const id = /\bid:\s*"([^"]+)"/.exec(obj)?.[1];
    const chapters = /\bchapters:\s*(\d+)/.exec(obj)?.[1];
    const verses = /\bverses:\s*(\d+)/.exec(obj)?.[1];
    if (!id || !chapters || !verses) continue;
    books.push({
      id,
      chapters: Number(chapters),
      verses: Number(verses),
    });
  }
  if (books.length === 0) {
    throw new Error("Parsed zero entries from books");
  }
  return books;
}

function extractObjectLiteral(source: string, name: string): string {
  const anchor = new RegExp(`\\b${name}\\b[^=]*=\\s*\\{`).exec(source);
  if (!anchor) throw new Error(`Could not locate \`${name} = {\` in source`);
  return extractBalanced(source, anchor.index + anchor[0].length - 1, "{", "}");
}

function extractArrayLiteral(source: string, name: string): string {
  const anchor = new RegExp(`\\b${name}\\b[^=]*=\\s*\\[`).exec(source);
  if (!anchor) throw new Error(`Could not locate \`${name} = [\` in source`);
  return extractBalanced(source, anchor.index + anchor[0].length - 1, "[", "]");
}

function extractBalanced(
  source: string,
  openIdx: number,
  open: string,
  close: string,
): string {
  let depth = 0;
  let inString: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return source.slice(openIdx + 1, i);
    }
  }
  throw new Error(`Unbalanced ${open}${close} starting at ${openIdx}`);
}

function splitTopLevelObjects(body: string): string[] {
  const results: string[] = [];
  let depth = 0;
  let start = -1;
  let inString: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    const next = body[i + 1];
    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        results.push(body.slice(start + 1, i));
        start = -1;
      }
    }
  }
  return results;
}

function sum(ns: number[]): number {
  let total = 0;
  for (const n of ns) total += n;
  return total;
}

function main(): void {
  const chapterVersesSrc = readFileSync(CHAPTER_VERSES_PATH, "utf8");
  const booksSrc = readFileSync(BOOKS_PATH, "utf8");
  const chapterVerses = parseChapterVerses(chapterVersesSrc);
  const books = parseBooks(booksSrc);
  const bookById = new Map(books.map((b) => [b.id, b]));

  const errors: string[] = [];

  for (const [id, arr] of Object.entries(chapterVerses)) {
    const book = bookById.get(id);
    if (!book) {
      errors.push(
        `CHAPTER_VERSES[${id}] has no matching entry in books.ts`,
      );
      continue;
    }
    if (arr.length !== book.chapters) {
      errors.push(
        `${id}: CHAPTER_VERSES length = ${arr.length}, books.ts chapters = ${book.chapters} (diff ${arr.length - book.chapters})`,
      );
    }
    const actualSum = sum(arr);
    if (actualSum !== book.verses) {
      errors.push(
        `${id}: sum(CHAPTER_VERSES) = ${actualSum}, books.ts verses = ${book.verses} (diff ${actualSum - book.verses})`,
      );
    }
  }

  const totalBooks = Object.keys(chapterVerses).length;
  if (errors.length > 0) {
    console.error(
      `validate-chapter-verses: FAIL (${errors.length} mismatch${errors.length === 1 ? "" : "es"} across ${totalBooks} book${totalBooks === 1 ? "" : "s"})`,
    );
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log(
    `validate-chapter-verses: OK (${totalBooks} books checked — lengths and sums match books.ts)`,
  );
}

main();
