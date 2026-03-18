import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy route for bible-api.com verse lookups.
 * Fetching from the server avoids CORS restrictions on the client.
 *
 * GET /api/verse?ref=Genesis+1:1&translation=rsv-ce
 */
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref");
  const translation = req.nextUrl.searchParams.get("translation") || "web";

  if (!ref) {
    return NextResponse.json({ error: "Missing ref parameter" }, { status: 400 });
  }

  const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${translation}`;

  try {
    const res = await fetch(url, {
      // Revalidate cached responses every 60 seconds on the server
      next: { revalidate: 60 },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }
}
