import { NextRequest, NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Allowed translations — only these are forwarded to the upstream.   */
/* ------------------------------------------------------------------ */
const ALLOWED_TRANSLATIONS = new Set([
  "web",
  "kjv",
  "rsv-ce",
  "jb",
  "clementine",
  "almeida",
  "rpisp",
]);

/* ------------------------------------------------------------------ */
/*  Input validation helpers                                           */
/* ------------------------------------------------------------------ */

/** Biblical references contain only letters, digits, spaces, colons, periods,
 *  commas, semicolons, and hyphens. Anything else is suspicious. */
const VALID_REF_PATTERN = /^[A-Za-z0-9 .:,;\-]+$/;
const MAX_REF_LENGTH = 100;

function isValidRef(ref: string): boolean {
  return ref.length <= MAX_REF_LENGTH && VALID_REF_PATTERN.test(ref);
}

/* ------------------------------------------------------------------ */
/*  Simple sliding-window rate limiter (per IP, in-memory)             */
/* ------------------------------------------------------------------ */

const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT = 30; // max requests per window

const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(ip) ?? [];

  // Evict entries outside the window
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);

  if (recent.length >= RATE_LIMIT) {
    requestLog.set(ip, recent);
    return true;
  }

  recent.push(now);
  requestLog.set(ip, recent);
  return false;
}

// Periodically prune stale IPs to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of requestLog) {
    const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length === 0) {
      requestLog.delete(ip);
    } else {
      requestLog.set(ip, recent);
    }
  }
}, RATE_WINDOW_MS);

/* ------------------------------------------------------------------ */
/*  Response validation — only forward expected fields from upstream    */
/* ------------------------------------------------------------------ */

function sanitizeUpstreamResponse(data: unknown): Record<string, unknown> | null {
  if (typeof data !== "object" || data === null) return null;

  const d = data as Record<string, unknown>;
  const clean: Record<string, unknown> = {};

  if (typeof d.reference === "string") clean.reference = d.reference;
  if (typeof d.text === "string") clean.text = d.text;
  if (typeof d.translation_name === "string")
    clean.translation_name = d.translation_name;

  if (Array.isArray(d.verses)) {
    clean.verses = (d.verses as Record<string, unknown>[])
      .filter(
        (v) => typeof v.verse === "number" && typeof v.text === "string",
      )
      .map((v) => ({ verse: v.verse, text: v.text }));
  }

  // Must have at least text or verses to be useful
  if (!clean.text && !clean.verses) return null;

  return clean;
}

/* ------------------------------------------------------------------ */
/*  Route handler                                                      */
/* ------------------------------------------------------------------ */

/**
 * Proxy route for bible-api.com verse lookups.
 * Fetching from the server avoids CORS restrictions on the client.
 *
 * GET /api/verse?ref=Genesis+1:1&translation=rsv-ce
 */
export async function GET(req: NextRequest) {
  /* --- Rate limiting ------------------------------------------------ */
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": "60" },
      },
    );
  }

  /* --- Input validation --------------------------------------------- */
  const ref = req.nextUrl.searchParams.get("ref");
  const rawTranslation =
    req.nextUrl.searchParams.get("translation") || "web";

  if (!ref) {
    return NextResponse.json(
      { error: "Missing ref parameter" },
      { status: 400 },
    );
  }

  if (!isValidRef(ref)) {
    return NextResponse.json(
      { error: "Invalid ref parameter" },
      { status: 400 },
    );
  }

  const translation = ALLOWED_TRANSLATIONS.has(rawTranslation)
    ? rawTranslation
    : "web";

  /* --- Upstream fetch ------------------------------------------------ */
  const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${encodeURIComponent(translation)}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Upstream returned an error" },
        { status: 502 },
      );
    }

    const data = await res.json();
    const clean = sanitizeUpstreamResponse(data);

    if (!clean) {
      return NextResponse.json(
        { error: "Unexpected upstream response" },
        { status: 502 },
      );
    }

    return NextResponse.json(clean);
  } catch {
    return NextResponse.json(
      { error: "Upstream fetch failed" },
      { status: 502 },
    );
  }
}
