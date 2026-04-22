#!/usr/bin/env -S node --no-warnings
// One-shot validator for src/data/chapter-verses.ts against src/data/books.ts.
// Run: npm run validate-data
//
// For every book that has an entry in CHAPTER_VERSES, asserts:
//   1. CHAPTER_VERSES[id].length === books[id].chapters
//   2. sum(CHAPTER_VERSES[id])  === books[id].verses
//
// Prints a readable diff and exits non-zero on any mismatch.

import { books } from "@/data/books";
import { CHAPTER_VERSES } from "@/data/chapter-verses";

type Failure = {
  id: string;
  name: string;
  kind: "length" | "sum" | "missing-book";
  expected: number;
  actual: number;
  detail?: string;
};

const failures: Failure[] = [];
const bookById = new Map(books.map((b) => [b.id, b]));

for (const [id, counts] of Object.entries(CHAPTER_VERSES)) {
  const book = bookById.get(id);
  if (!book) {
    failures.push({
      id,
      name: id,
      kind: "missing-book",
      expected: 0,
      actual: counts.length,
      detail: `CHAPTER_VERSES has id "${id}" but books.ts does not`,
    });
    continue;
  }

  if (counts.length !== book.chapters) {
    failures.push({
      id,
      name: book.name,
      kind: "length",
      expected: book.chapters,
      actual: counts.length,
    });
  }

  const sum = counts.reduce((a, n) => a + n, 0);
  if (sum !== book.verses) {
    failures.push({
      id,
      name: book.name,
      kind: "sum",
      expected: book.verses,
      actual: sum,
    });
  }
}

if (failures.length === 0) {
  const checked = Object.keys(CHAPTER_VERSES).length;
  console.log(`validate-chapter-verses: OK (${checked} books)`);
  process.exit(0);
}

console.error(`validate-chapter-verses: FAIL — ${failures.length} mismatch(es)`);
for (const f of failures) {
  if (f.kind === "length") {
    console.error(
      `  ${f.id} (${f.name}): chapter count — expected ${f.expected}, got ${f.actual} (diff ${f.actual - f.expected})`,
    );
  } else if (f.kind === "sum") {
    console.error(
      `  ${f.id} (${f.name}): verse total — expected ${f.expected}, got ${f.actual} (diff ${f.actual - f.expected})`,
    );
  } else {
    console.error(`  ${f.id}: ${f.detail}`);
  }
}
process.exit(1);
