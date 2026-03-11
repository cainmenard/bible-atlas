#!/usr/bin/env node
// Process OpenBible cross-references into JSON files for the bible-atlas app.
// Run: node scripts/process-crossrefs.ts

const fs = require('fs');
const path = require('path');

const INPUT = '/tmp/cross-refs/cross_references.txt';
const OUT_DIR = path.join(__dirname, '..', 'src', 'data');

// OpenBible book name → App book ID
const BOOK_MAP = {
  Gen: 'GEN', Exod: 'EXO', Lev: 'LEV', Num: 'NUM', Deut: 'DEU',
  Josh: 'JOS', Judg: 'JDG', Ruth: 'RUT',
  '1Sam': '1SA', '2Sam': '2SA', '1Kgs': '1KI', '2Kgs': '2KI',
  '1Chr': '1CH', '2Chr': '2CH', Ezra: 'EZR', Neh: 'NEH',
  Esth: 'EST', Job: 'JOB', Ps: 'PSA', Prov: 'PRO', Eccl: 'ECC', Song: 'SNG',
  Isa: 'ISA', Jer: 'JER', Lam: 'LAM', Ezek: 'EZK', Dan: 'DAN',
  Hos: 'HOS', Joel: 'JOL', Amos: 'AMO', Obad: 'OBA', Jonah: 'JON',
  Mic: 'MIC', Nah: 'NAH', Hab: 'HAB', Zeph: 'ZEP', Hag: 'HAG', Zech: 'ZEC', Mal: 'MAL',
  Matt: 'MAT', Mark: 'MRK', Luke: 'LUK', John: 'JHN', Acts: 'ACT',
  Rom: 'ROM', '1Cor': '1CO', '2Cor': '2CO',
  Gal: 'GAL', Eph: 'EPH', Phil: 'PHP', Col: 'COL',
  '1Thess': '1TH', '2Thess': '2TH',
  '1Tim': '1TI', '2Tim': '2TI', Titus: 'TIT', Phlm: 'PHM',
  Heb: 'HEB', Jas: 'JAS', '1Pet': '1PE', '2Pet': '2PE',
  '1John': '1JN', '2John': '2JN', '3John': '3JN', Jude: 'JUD', Rev: 'REV',
};

/**
 * Convert an OpenBible reference to app format.
 * Simple: "Gen.1.1" → "GEN.1.1"
 * Range:  "Prov.8.22-Prov.8.30" → "PRO.8.22-30"
 * Returns null if book is not in the mapping.
 */
function convertRef(raw) {
  // Check for range (contains a hyphen that separates two full refs)
  const rangeParts = raw.split('-');
  if (rangeParts.length === 2 && rangeParts[1].includes('.')) {
    // Range like "Prov.8.22-Prov.8.30"
    const startParts = rangeParts[0].split('.');
    const endParts = rangeParts[1].split('.');
    if (startParts.length < 3 || endParts.length < 3) return null;

    const bookId = BOOK_MAP[startParts[0]];
    if (!bookId) return null;

    const endVerse = endParts[endParts.length - 1];
    return `${bookId}.${startParts[1]}.${startParts[2]}-${endVerse}`;
  }

  // Simple reference like "Gen.1.1"
  const parts = raw.split('.');
  if (parts.length < 3) return null;
  const bookId = BOOK_MAP[parts[0]];
  if (!bookId) return null;
  return `${bookId}.${parts.slice(1).join('.')}`;
}

function getBook(ref) {
  return ref.split('.')[0];
}

// --- Main ---
const content = fs.readFileSync(INPUT, 'utf-8');
const lines = content.split('\n');

const crossrefs = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const cols = line.split('\t');
  if (cols.length < 3) continue;

  const votes = parseInt(cols[2], 10);
  if (isNaN(votes) || votes < 10) continue;

  const from = convertRef(cols[0]);
  const to = convertRef(cols[1]);
  if (!from || !to) continue;

  crossrefs.push({ from, to, votes });
}

// Sort by votes descending
crossrefs.sort((a, b) => b.votes - a.votes);

// --- Build book edges ---
const pairCounts = {};
for (const cr of crossrefs) {
  const srcBook = getBook(cr.from);
  const tgtBook = getBook(cr.to);
  if (srcBook === tgtBook) continue; // skip self-references within same book

  const key = `${srcBook}|${tgtBook}`;
  pairCounts[key] = (pairCounts[key] || 0) + 1;
}

// Filter pairs with count >= 3
const pairs = Object.entries(pairCounts)
  .filter(([, count]) => count >= 3)
  .map(([key, count]) => {
    const [source, target] = key.split('|');
    return { source, target, weight: 0, count };
  });

// Compute weight on log scale 1-10
const maxCount = Math.max(...pairs.map(p => p.count));
for (const p of pairs) {
  const raw = Math.ceil(Math.log10(p.count) / Math.log10(maxCount) * 9) + 1;
  p.weight = Math.max(1, Math.min(10, raw));
}

// Sort by count descending
pairs.sort((a, b) => b.count - a.count);

// --- Write outputs ---
fs.mkdirSync(OUT_DIR, { recursive: true });

fs.writeFileSync(
  path.join(OUT_DIR, 'crossrefs.json'),
  JSON.stringify(crossrefs, null, 2)
);

fs.writeFileSync(
  path.join(OUT_DIR, 'book-edges.json'),
  JSON.stringify(pairs, null, 2)
);

console.log(`crossrefs.json: ${crossrefs.length} entries`);
console.log(`book-edges.json: ${pairs.length} edges`);
console.log(`Max book-pair count: ${maxCount}`);
console.log('\nFirst 5 crossrefs:');
crossrefs.slice(0, 5).forEach(c => console.log(`  ${c.from} → ${c.to} (${c.votes} votes)`));
console.log('\nFirst 5 book edges:');
pairs.slice(0, 5).forEach(p => console.log(`  ${p.source} → ${p.target}: count=${p.count}, weight=${p.weight}`));
