import { NextRequest, NextResponse } from "next/server";
import { getSnapshots } from "@/lib/diary-db";
import { shiftIsoDate } from "@/lib/date-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface TodayReadingBook {
  title: string;
  author: string;
  durationMinutes: number;
  highlights: number;
  notes: number;
}

export interface TodayReadingResponse {
  date: string;
  today: {
    hasData: boolean;
    books: TodayReadingBook[];
    totalDurationMinutes: number;
    totalHighlights: number;
    totalNotes: number;
  };
  yesterday: {
    hasData: boolean;
    date: string;
    books: TodayReadingBook[];
    totalDurationMinutes: number;
    totalHighlights: number;
    totalNotes: number;
  };
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "date is required (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const yesterdayDate = shiftIsoDate(date, -1);

  const [todaySnapshots, yesterdaySnapshots] = await Promise.all([
    getSnapshots(date),
    getSnapshots(yesterdayDate),
  ]);

  const todayWeread = todaySnapshots.find((s) => s.provider === "weread");
  const yesterdayWeread = yesterdaySnapshots.find((s) => s.provider === "weread");

  function extractBooks(snapshot: typeof todayWeread): {
    books: TodayReadingBook[];
    totalDurationMinutes: number;
    totalHighlights: number;
    totalNotes: number;
  } {
    if (!snapshot) {
      return { books: [], totalDurationMinutes: 0, totalHighlights: 0, totalNotes: 0 };
    }
    const p = snapshot.payload as Record<string, unknown>;
    const rawBooks = Array.isArray(p.books)
      ? (p.books as Array<{
          title: string;
          author?: string;
          durationMinutes: number;
          highlights?: number;
          notes?: number;
        }>)
      : [];
    const books: TodayReadingBook[] = rawBooks.map((b) => ({
      title: b.title || "Unknown",
      author: b.author || "",
      durationMinutes: typeof b.durationMinutes === "number" ? b.durationMinutes : 0,
      highlights: typeof b.highlights === "number" ? b.highlights : 0,
      notes: typeof b.notes === "number" ? b.notes : 0,
    }));
    return {
      books,
      totalDurationMinutes: books.reduce((s, b) => s + b.durationMinutes, 0),
      totalHighlights: books.reduce((s, b) => s + b.highlights, 0),
      totalNotes: books.reduce((s, b) => s + b.notes, 0),
    };
  }

  const todayData = extractBooks(todayWeread);
  const yesterdayData = extractBooks(yesterdayWeread);

  return NextResponse.json({
    date,
    today: {
      hasData: todayWeread !== undefined && todayData.books.length > 0,
      ...todayData,
    },
    yesterday: {
      hasData: yesterdayWeread !== undefined && yesterdayData.books.length > 0,
      date: yesterdayDate,
      ...yesterdayData,
    },
  } satisfies TodayReadingResponse);
}
