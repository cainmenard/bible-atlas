import { NextResponse } from "next/server";

// Map common book names to our book IDs
const NAME_TO_ID: Record<string, string> = {
  genesis: "GEN", exodus: "EXO", leviticus: "LEV", numbers: "NUM",
  deuteronomy: "DEU", joshua: "JOS", judges: "JDG", ruth: "RUT",
  "1 samuel": "1SA", "2 samuel": "2SA", "1 kings": "1KI", "2 kings": "2KI",
  "1 chronicles": "1CH", "2 chronicles": "2CH", ezra: "EZR", nehemiah: "NEH",
  esther: "EST", job: "JOB", psalms: "PSA", psalm: "PSA", proverbs: "PRO",
  ecclesiastes: "ECC", "song of solomon": "SNG", "song of songs": "SNG",
  isaiah: "ISA", jeremiah: "JER", lamentations: "LAM", ezekiel: "EZK",
  daniel: "DAN", hosea: "HOS", joel: "JOL", amos: "AMO", obadiah: "OBA",
  jonah: "JON", micah: "MIC", nahum: "NAH", habakkuk: "HAB",
  zephaniah: "ZEP", haggai: "HAG", zechariah: "ZEC", malachi: "MAL",
  matthew: "MAT", mark: "MRK", luke: "LUK", john: "JHN",
  acts: "ACT", romans: "ROM", "1 corinthians": "1CO", "2 corinthians": "2CO",
  galatians: "GAL", ephesians: "EPH", philippians: "PHP", colossians: "COL",
  "1 thessalonians": "1TH", "2 thessalonians": "2TH",
  "1 timothy": "1TI", "2 timothy": "2TI", titus: "TIT", philemon: "PHM",
  hebrews: "HEB", james: "JAS", "1 peter": "1PE", "2 peter": "2PE",
  "1 john": "1JN", "2 john": "2JN", "3 john": "3JN", jude: "JUD",
  revelation: "REV", tobit: "TOB", judith: "JDT", wisdom: "WIS",
  sirach: "SIR", baruch: "BAR", "1 maccabees": "1MA", "2 maccabees": "2MA",
  // Short forms
  gn: "GEN", ex: "EXO", lv: "LEV", nm: "NUM", dt: "DEU",
  "is": "ISA", jer: "JER", ez: "EZK", dn: "DAN",
  mt: "MAT", mk: "MRK", lk: "LUK", jn: "JHN",
  rom: "ROM", cor: "1CO", gal: "GAL", eph: "EPH",
  phil: "PHP", col: "COL", heb: "HEB", jas: "JAS",
  rv: "REV", rev: "REV",
  ps: "PSA", prv: "PRO",
  "acts of the apostles": "ACT",
  sir: "SIR", wis: "WIS", bar: "BAR",
  tb: "TOB", jdt: "JDT",
};

function parseBookFromRef(ref: string): string | undefined {
  const cleaned = ref.toLowerCase().trim();
  // Try to match "1 John 3:16" -> "1 john"
  const match = cleaned.match(/^(\d?\s*[a-z]+(?:\s+[a-z]+)*)\s*\d/);
  if (match) {
    const bookName = match[1].trim();
    return NAME_TO_ID[bookName];
  }
  // Try full string as book name
  const full = cleaned.replace(/\s*\d.*$/, "").trim();
  return NAME_TO_ID[full];
}

// Fallback lectionary data for common days
function getFallbackReadings(date: Date) {
  const month = date.getMonth();
  const dayOfWeek = date.getDay();

  // Provide meaningful fallback based on liturgical context
  if (month >= 11 || month <= 0) {
    // Advent/Christmas season
    return {
      readings: [
        { type: "First Reading", reference: "Isaiah 7:10-14", bookId: "ISA" },
        { type: "Psalm", reference: "Psalm 24:1-6", bookId: "PSA" },
        { type: "Gospel", reference: "Luke 1:26-38", bookId: "LUK" },
      ],
    };
  }
  if (month >= 2 && month <= 3) {
    // Lent
    return {
      readings: [
        { type: "First Reading", reference: "Deuteronomy 4:1-9", bookId: "DEU" },
        { type: "Psalm", reference: "Psalm 147:12-20", bookId: "PSA" },
        { type: "Gospel", reference: "Matthew 5:17-19", bookId: "MAT" },
      ],
    };
  }
  // Ordinary Time
  if (dayOfWeek === 0) {
    // Sunday
    return {
      readings: [
        { type: "First Reading", reference: "Isaiah 55:1-3", bookId: "ISA" },
        { type: "Psalm", reference: "Psalm 145:8-9, 15-18", bookId: "PSA" },
        { type: "Second Reading", reference: "Romans 8:35-39", bookId: "ROM" },
        { type: "Gospel", reference: "Matthew 14:13-21", bookId: "MAT" },
      ],
    };
  }
  return {
    readings: [
      { type: "First Reading", reference: "Genesis 1:1-19", bookId: "GEN" },
      { type: "Psalm", reference: "Psalm 104:1-2, 5-6, 10, 12, 24, 35", bookId: "PSA" },
      { type: "Gospel", reference: "Mark 6:53-56", bookId: "MRK" },
    ],
  };
}

export async function GET() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const dateStr = `${mm}${dd}${yy}`;
  const displayDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  try {
    // Try USCCB
    const url = `https://bible.usccb.org/bible/readings/${dateStr}.cfm`;
    const res = await fetch(url, {
      headers: { "User-Agent": "BibleAtlas/1.0" },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const html = await res.text();

      // Parse reading references from the HTML
      const readings: { type: string; reference: string; bookId?: string }[] = [];

      // Look for reading headings and their scripture references
      const patterns = [
        { type: "First Reading", regex: /Reading\s*1[^<]*<[\s\S]*?<a[^>]*>([^<]+)<\/a>/i },
        { type: "Psalm", regex: /Responsorial\s*Psalm[^<]*<[\s\S]*?<a[^>]*>([^<]+)<\/a>/i },
        { type: "Second Reading", regex: /Reading\s*2[^<]*<[\s\S]*?<a[^>]*>([^<]+)<\/a>/i },
        { type: "Gospel", regex: /Gospel[^<]*<[\s\S]*?<a[^>]*>([^<]+)<\/a>/i },
      ];

      // Simpler approach: find all links that look like scripture references
      const linkRegex = /href="\/bible\/([^"]+)"[^>]*>([^<]+)</g;
      const refs: string[] = [];
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        const text = match[2].trim();
        if (text.match(/^(\d\s)?[A-Z]/)) {
          refs.push(text);
        }
      }

      // Typically: First Reading, Psalm, (optional Second Reading), Gospel
      const typeLabels = ["First Reading", "Psalm", "Second Reading", "Gospel"];
      const uniqueRefs = [...new Set(refs)].slice(0, 4);

      if (uniqueRefs.length >= 2) {
        // If we have 2-3 refs, map them
        if (uniqueRefs.length === 2) {
          readings.push({
            type: "First Reading",
            reference: uniqueRefs[0],
            bookId: parseBookFromRef(uniqueRefs[0]),
          });
          readings.push({
            type: "Gospel",
            reference: uniqueRefs[1],
            bookId: parseBookFromRef(uniqueRefs[1]),
          });
        } else {
          uniqueRefs.forEach((ref, i) => {
            readings.push({
              type: typeLabels[i] || `Reading ${i + 1}`,
              reference: ref,
              bookId: parseBookFromRef(ref),
            });
          });
        }

        return NextResponse.json({
          date: displayDate,
          readings,
          season: getLiturgicalSeasonSimple(now),
        });
      }
    }
  } catch {
    // Fall through to fallback
  }

  // Try Universalis as fallback
  try {
    const uniRes = await fetch("https://universalis.com/today/mass.htm", {
      headers: { "User-Agent": "BibleAtlas/1.0" },
      next: { revalidate: 3600 },
    });

    if (uniRes.ok) {
      const html = await uniRes.text();
      const readings: { type: string; reference: string; bookId?: string }[] = [];

      // Parse Universalis format - look for headings with scripture refs
      const h2Regex = /<h[23][^>]*>([^<]+)<\/h[23]>/g;
      const sections: string[] = [];
      let m;
      while ((m = h2Regex.exec(html)) !== null) {
        sections.push(m[1].trim());
      }

      const refPattern = /(\d?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(\d+[:\d\-,\s]*)/;
      sections.forEach((s) => {
        const refMatch = s.match(refPattern);
        if (refMatch) {
          const ref = refMatch[0];
          const types = readings.length === 0 ? "First Reading" :
            readings.length === 1 ? "Psalm" :
            readings.length === 2 ? "Gospel" : `Reading ${readings.length + 1}`;
          readings.push({
            type: types,
            reference: ref,
            bookId: parseBookFromRef(ref),
          });
        }
      });

      if (readings.length > 0) {
        return NextResponse.json({
          date: displayDate,
          readings,
          season: getLiturgicalSeasonSimple(now),
        });
      }
    }
  } catch {
    // Fall through to static fallback
  }

  // Static fallback
  const fallback = getFallbackReadings(now);
  return NextResponse.json({
    date: displayDate,
    readings: fallback.readings,
    season: getLiturgicalSeasonSimple(now),
  });
}

function getLiturgicalSeasonSimple(date: Date): string {
  const month = date.getMonth();
  const day = date.getDate();

  // Rough approximations
  if ((month === 11 && day >= 1) || (month === 0 && day <= 5)) {
    if (month === 11 && day < 25) return "advent";
    return "christmas";
  }
  // Lent: roughly Feb 14 - Apr 10
  if ((month === 1 && day >= 14) || month === 2 || (month === 3 && day <= 10)) {
    return "lent";
  }
  // Easter: roughly Apr 10 - Jun 5
  if ((month === 3 && day >= 10) || month === 4 || (month === 5 && day <= 5)) {
    return "easter";
  }
  return "ordinary";
}
