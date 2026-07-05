import { NextRequest, NextResponse } from "next/server";
import { upsertSnapshot } from "@/lib/diary-db";
import { buildWeReadMarkdown } from "@/lib/integrations/weread";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WeReadImportItem {
  date: string;
  books?: Array<{
    title: string;
    author?: string;
    durationMinutes: number;
    highlights?: number;
    notes?: number;
  }>;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected JSON object or array" }, { status: 400 });
  }

  const items: WeReadImportItem[] = Array.isArray(body) ? body : [body as WeReadImportItem];

  const results: Array<{ date: string; status: "imported" | "error"; error?: string }> = [];

  for (const item of items) {
    if (!item.date || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      results.push({ date: item.date || "unknown", status: "error", error: "Invalid date format" });
      continue;
    }

    const books = (item.books || []).map((b) => ({
      title: b.title || "Unknown",
      author: b.author || "",
      durationMinutes: typeof b.durationMinutes === "number" ? b.durationMinutes : 0,
      highlights: typeof b.highlights === "number" ? b.highlights : 0,
      notes: typeof b.notes === "number" ? b.notes : 0,
    }));

    if (books.length === 0) {
      results.push({ date: item.date, status: "error", error: "No books" });
      continue;
    }

    const totalDurationMinutes = books.reduce((s, b) => s + b.durationMinutes, 0);
    const totalHighlights = books.reduce((s, b) => s + b.highlights, 0);
    const totalNotes = books.reduce((s, b) => s + b.notes, 0);

    const payload = {
      books,
      totalDurationMinutes,
      totalHighlights,
      totalNotes,
      markdown: buildWeReadMarkdown({
        books,
        totalDurationMinutes,
        totalHighlights,
        totalNotes,
        markdown: "", // will be set by buildWeReadMarkdown
      }),
    };

    // Rebuild with correct markdown
    payload.markdown = buildWeReadMarkdown(payload);

    await upsertSnapshot({
      id: `weread:${item.date}`,
      date: item.date,
      provider: "weread",
      status: "ready",
      payload: payload as unknown as Record<string, unknown>,
    });

    results.push({ date: item.date, status: "imported" });
  }

  return NextResponse.json({ results });
}
