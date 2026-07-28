import { NextRequest, NextResponse } from "next/server";

// Best-effort scrape of a MakerWorld (or any) link's Open Graph image, so
// staff don't have to manually go find and paste a photo URL. There's no
// MakerWorld API for this (PRD 5.1: manual link entry, no API integration
// for MVP) -- this just reads the same <meta og:image> tag that makes link
// previews work on sites like iMessage/Slack/Twitter.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid URL." }, { status: 400 });
  }
  if (!/^https?:$/.test(target.protocol)) {
    return NextResponse.json({ error: "URL must be http(s)." }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(target.toString(), {
      headers: {
        // Some sites only include OG tags for "browser-like" requests.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `That page returned an error (${res.status}).` },
        { status: 200 },
      );
    }

    const html = await res.text();
    const imageUrl = extractImage(html, target);

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Couldn't find a preview image on that page. Paste one manually instead." },
        { status: 200 },
      );
    }

    return NextResponse.json({ imageUrl });
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach that link. Paste an image URL manually instead." },
      { status: 200 },
    );
  }
}

function extractImage(html: string, base: URL): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      try {
        return new URL(match[1], base).toString();
      } catch {
        continue;
      }
    }
  }
  return null;
}
