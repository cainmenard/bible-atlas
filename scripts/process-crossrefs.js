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
  if (isNaN(votes) || votes < 2) continue;

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

// Write master crossrefs.json
fs.writeFileSync(
  path.join(OUT_DIR, 'crossrefs.json'),
  JSON.stringify(crossrefs, null, 2)
);

// Write book-edges.json
fs.writeFileSync(
  path.join(OUT_DIR, 'book-edges.json'),
  JSON.stringify(pairs, null, 2)
);

// --- Write per-book crossref files to public/crossrefs/ ---
const CROSSREFS_DIR = path.join(__dirname, '..', 'public', 'crossrefs');
fs.mkdirSync(CROSSREFS_DIR, { recursive: true });

const byBook = {};
for (const cr of crossrefs) {
  const book = getBook(cr.from);
  if (!byBook[book]) byBook[book] = [];
  byBook[book].push(cr);
}

for (const [bookId, refs] of Object.entries(byBook)) {
  fs.writeFileSync(
    path.join(CROSSREFS_DIR, `${bookId}.json`),
    JSON.stringify(refs)
  );
}

// --- Build arc-diagram data ---
// Book order and verse counts for computing linear verse indices
const BOOK_ORDER = [
  'GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI',
  '1CH','2CH','EZR','NEH','EST','JOB','PSA','PRO','ECC','SNG',
  'ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO','OBA','JON','MIC','NAH',
  'HAB','ZEP','HAG','ZEC','MAL',
  'MAT','MRK','LUK','JHN','ACT',
  'ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB',
  'JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV'
];
const BOOK_VERSES = {
  GEN:1533,EXO:1213,LEV:859,NUM:1288,DEU:959,JOS:658,JDG:618,RUT:85,
  '1SA':810,'2SA':695,'1KI':816,'2KI':719,'1CH':942,'2CH':822,EZR:280,NEH:406,
  EST:167,JOB:1070,PSA:2461,PRO:915,ECC:222,SNG:117,
  ISA:1292,JER:1364,LAM:154,EZK:1273,DAN:357,HOS:197,JOL:73,AMO:146,OBA:21,JON:48,
  MIC:105,NAH:47,HAB:56,ZEP:53,HAG:38,ZEC:211,MAL:55,
  MAT:1071,MRK:678,LUK:1151,JHN:879,ACT:1007,
  ROM:433,'1CO':437,'2CO':257,GAL:149,EPH:155,PHP:104,COL:95,
  '1TH':89,'2TH':47,'1TI':113,'2TI':83,TIT:46,PHM:25,HEB:303,
  JAS:108,'1PE':105,'2PE':61,'1JN':105,'2JN':13,'3JN':15,JUD:25,REV:404
};

// Build cumulative offset for each book
const bookOffset = {};
let cumulative = 0;
for (const b of BOOK_ORDER) {
  bookOffset[b] = cumulative;
  cumulative += BOOK_VERSES[b];
}
const totalVerses = cumulative;

// Genre mapping for coloring
const BOOK_GENRE = {};
const genreList = [
  ['Torah', ['GEN','EXO','LEV','NUM','DEU']],
  ['History', ['JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','EZR','NEH','EST']],
  ['Wisdom', ['JOB','PSA','PRO','ECC','SNG']],
  ['Major Prophets', ['ISA','JER','LAM','EZK','DAN']],
  ['Minor Prophets', ['HOS','JOL','AMO','OBA','JON','MIC','NAH','HAB','ZEP','HAG','ZEC','MAL']],
  ['Gospels', ['MAT','MRK','LUK','JHN']],
  ['NT History', ['ACT']],
  ['Pauline Epistles', ['ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB']],
  ['General Epistles', ['JAS','1PE','2PE','1JN','2JN','3JN','JUD']],
  ['Apocalyptic', ['REV']],
];
for (const [genre, ids] of genreList) {
  for (const id of ids) BOOK_GENRE[id] = genre;
}

function refToIndex(ref) {
  const parts = ref.split('.');
  const bookId = parts[0];
  if (!bookOffset.hasOwnProperty(bookId)) return -1;
  // Use chapter and verse to estimate a position within the book
  const chapter = parseInt(parts[1], 10) || 1;
  const verse = parseInt(parts[2], 10) || 1;
  // Approximate: use verse number relative to total verses in book
  // Since we don't have per-chapter verse counts, estimate linearly
  const bookVerses = BOOK_VERSES[bookId];
  const approxIndex = Math.min(bookVerses - 1, Math.max(0, verse + (chapter - 1) * 25 - 1));
  return bookOffset[bookId] + Math.min(approxIndex, bookVerses - 1);
}

// Build arc data: [fromIndex, toIndex, genreIndex]
const genreNames = genreList.map(g => g[0]);
const arcData = [];
for (const cr of crossrefs) {
  const fromIdx = refToIndex(cr.from);
  const toIdx = refToIndex(cr.to);
  if (fromIdx < 0 || toIdx < 0) continue;
  const srcBook = getBook(cr.from);
  const genreIdx = genreNames.indexOf(BOOK_GENRE[srcBook] || 'History');
  arcData.push([fromIdx, toIdx, genreIdx]);
}

// Write arc data as compact JSON
const ARC_DIR = path.join(__dirname, '..', 'public');
const arcOutput = {
  totalVerses,
  genres: genreNames,
  books: BOOK_ORDER.map(b => ({ id: b, offset: bookOffset[b], verses: BOOK_VERSES[b], genre: genreNames.indexOf(BOOK_GENRE[b]) })),
  arcs: arcData
};
fs.writeFileSync(
  path.join(ARC_DIR, 'arc-crossrefs.json'),
  JSON.stringify(arcOutput)
);

console.log(`crossrefs.json: ${crossrefs.length} entries`);
console.log(`book-edges.json: ${pairs.length} edges`);
console.log(`Max book-pair count: ${maxCount}`);
console.log(`Per-book files: ${Object.keys(byBook).length} books`);
console.log(`arc-crossrefs.json: ${arcData.length} arcs across ${totalVerses} verse positions`);
console.log('\nFirst 5 crossrefs:');
crossrefs.slice(0, 5).forEach(c => console.log(`  ${c.from} → ${c.to} (${c.votes} votes)`));
console.log('\nFirst 5 book edges:');
pairs.slice(0, 5).forEach(p => console.log(`  ${p.source} → ${p.target}: count=${p.count}, weight=${p.weight}`));
