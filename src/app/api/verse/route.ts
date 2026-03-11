import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  const translation = request.nextUrl.searchParams.get("translation") || "web";

  if (!ref) {
    return NextResponse.json({ error: "Missing ref parameter" }, { status: 400 });
  }

  try {
    const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${translation}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      // Fallback to WEB translation
      if (translation !== "web") {
        const fallback = await fetch(
          `https://bible-api.com/${encodeURIComponent(ref)}?translation=web`,
          { next: { revalidate: 3600 } }
        );
        if (fallback.ok) {
          const data = await fallback.json();
          return NextResponse.json({
            reference: data.reference,
            text: data.text,
            translation: "web",
            fallback: true,
          });
        }
      }
      return NextResponse.json({ error: "Verse not found" }, { status: 404 });
    }

    const data = await res.json();
    return NextResponse.json({
      reference: data.reference,
      text: data.text,
      translation: data.translation_id,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch verse" }, { status: 500 });
  }
}
