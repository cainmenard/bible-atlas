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

// Per-chapter verse counts for exact index computation
const CHAPTER_VERSES = {
  GEN:[31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,23,17,27,18,20,34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,53],
  EXO:[22,25,22,31,23,30,25,32,35,29,10,51,22,31,27,36,16,27,25,26,36,31,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38],
  LEV:[17,16,17,35,19,30,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34],
  NUM:[54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,13,32,22,29,35,41,30,25,18,65,23,31,40,16,54,42,56,29,34,13],
  DEU:[46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,68,29,20,30,52,29,12],
  JOS:[18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33],
  JDG:[36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25],
  RUT:[22,23,18,22],
  '1SA':[28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,42,15,23,29,22,44,25,12,25,11,31,13],
  '2SA':[27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,33,43,26,22,51,39,25],
  '1KI':[53,46,28,34,18,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,53],
  '2KI':[18,25,27,44,27,33,20,29,37,36,21,21,25,29,38,20,41,37,37,21,26,20,37,20,30],
  '1CH':[54,55,24,43,26,81,40,40,44,14,47,40,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30],
  '2CH':[17,18,17,22,14,42,22,18,31,19,23,16,22,15,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23],
  EZR:[11,70,13,24,17,22,28,36,15,44],
  NEH:[11,20,32,23,19,19,73,18,38,39,36,47,31],
  EST:[22,23,15,17,14,14,10,17,32,3],
  JOB:[22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,30,24,34,17],
  PSA:[6,12,8,8,12,10,17,9,20,18,7,8,6,7,5,11,15,50,14,9,13,31,6,10,22,12,14,9,11,12,24,11,22,22,28,12,40,22,13,17,13,11,5,26,17,11,9,14,20,23,19,9,6,7,23,13,11,11,17,12,8,12,11,10,13,20,7,35,36,5,24,20,28,23,10,12,20,72,13,19,16,8,18,12,13,17,7,18,52,17,16,15,5,23,11,13,12,9,9,5,8,28,22,35,45,48,43,13,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,13,10,7,12,15,21,10,20,14,9,6],
  PRO:[33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,27,33,31],
  ECC:[18,26,22,16,20,12,29,17,18,20,10,14],
  SNG:[17,17,11,16,16,13,13,14],
  ISA:[31,22,26,6,30,13,25,22,21,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,17,10,22,38,22,8,31,29,25,28,28,25,13,15,22,26,11,23,15,12,17,13,12,21,14,21,22,11,12,19,12,25,24],
  JER:[19,37,25,31,31,30,34,22,26,25,23,17,27,22,21,21,27,23,15,18,14,30,40,10,38,24,22,17,32,24,40,44,26,22,19,32,21,28,18,16,18,22,13,30,5,28,7,47,39,46,64,34],
  LAM:[22,22,66,22,22],
  EZK:[28,10,27,17,17,14,27,18,11,22,25,28,23,23,8,63,24,32,14,49,32,31,49,27,17,21,36,26,21,26,18,32,33,31,15,38,28,23,29,49,26,20,27,31,25,24,23,35],
  DAN:[21,49,30,37,31,28,28,27,27,21,45,13],
  HOS:[11,23,5,19,15,11,16,14,17,15,12,14,16,9],
  JOL:[20,32,21],
  AMO:[15,16,15,13,27,14,17,14,15],
  OBA:[21],
  JON:[17,10,10,11],
  MIC:[16,13,12,13,15,16,20],
  NAH:[15,13,19],
  HAB:[17,17,19,3],
  ZEP:[18,15,20],
  HAG:[15,23],
  ZEC:[21,13,10,14,11,15,14,23,17,12,17,14,9,21],
  MAL:[14,17,18,6],
  MAT:[25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20],
  MRK:[45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20],
  LUK:[80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53],
  JHN:[51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25],
  ACT:[26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,41,38,40,30,35,27,27,32,44,31],
  ROM:[32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,27],
  '1CO':[31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24],
  '2CO':[24,17,18,18,21,18,16,24,15,18,33,21,14],
  GAL:[24,21,29,31,26,18],
  EPH:[23,22,21,32,33,24],
  PHP:[30,30,21,23],
  COL:[29,23,25,18],
  '1TH':[10,20,13,18,28],
  '2TH':[12,17,18],
  '1TI':[20,15,16,16,25,21],
  '2TI':[18,26,17,22],
  TIT:[16,15,15],
  PHM:[25],
  HEB:[14,18,19,16,14,20,28,13,28,39,40,29,25],
  JAS:[27,26,18,17,20],
  '1PE':[25,25,22,19,14],
  '2PE':[21,22,18],
  '1JN':[10,29,24,21,21],
  '2JN':[13],
  '3JN':[15],
  JUD:[25],
  REV:[20,29,22,11,14,17,17,13,21,11,19,17,18,20,8,21,18,24,21,15,27,21],
};

// Pre-compute cumulative chapter offsets per book
const bookChapterOffsets = {};
for (const b of BOOK_ORDER) {
  const chapters = CHAPTER_VERSES[b];
  if (!chapters) continue;
  const offsets = [0];
  for (let i = 0; i < chapters.length; i++) {
    offsets.push(offsets[i] + chapters[i]);
  }
  bookChapterOffsets[b] = offsets;
}

function refToIndex(ref) {
  const parts = ref.split('.');
  const bookId = parts[0];
  if (!bookOffset.hasOwnProperty(bookId)) return -1;
  const chapter = parseInt(parts[1], 10) || 1;
  const verse = parseInt(parts[2], 10) || 1;
  const offsets = bookChapterOffsets[bookId];
  if (!offsets || chapter < 1 || chapter > offsets.length - 1) {
    // Fallback to approximate if chapter data missing
    const bookVerses = BOOK_VERSES[bookId];
    const approxIndex = Math.min(bookVerses - 1, Math.max(0, verse + (chapter - 1) * 25 - 1));
    return bookOffset[bookId] + approxIndex;
  }
  const chapterStart = offsets[chapter - 1];
  const localIdx = Math.min(chapterStart + verse - 1, BOOK_VERSES[bookId] - 1);
  return bookOffset[bookId] + Math.max(0, localIdx);
}

// Build arc data: [fromIndex, toIndex, genreIndex, votes]
const genreNames = genreList.map(g => g[0]);
const arcData = [];
for (const cr of crossrefs) {
  const fromIdx = refToIndex(cr.from);
  const toIdx = refToIndex(cr.to);
  if (fromIdx < 0 || toIdx < 0) continue;
  const srcBook = getBook(cr.from);
  const genreIdx = genreNames.indexOf(BOOK_GENRE[srcBook] || 'History');
  arcData.push([fromIdx, toIdx, genreIdx, cr.votes]);
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
