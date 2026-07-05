import { NextRequest, NextResponse } from "next/server";
import { getAllSnapshots } from "@/lib/diary-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  void _request;
  const snapshots = await getAllSnapshots("weread");

  // Aggregate books across all snapshots
  const bookMap = new Map<string, {
    title: string;
    author: string;
    totalMinutes: number;
    totalHighlights: number;
    totalNotes: number;
    dates: string[];
    latestDate: string;
  }>();

  for (const snap of snapshots) {
    const p = snap.payload as Record<string, unknown>;
    const books = Array.isArray(p.books) ? p.books as Array<{
      title: string;
      author?: string;
      durationMinutes: number;
      highlights?: number;
      notes?: number;
    }> : [];
    for (const book of books) {
      const key = book.title;
      const existing = bookMap.get(key);
      if (existing) {
        existing.totalMinutes += book.durationMinutes || 0;
        existing.totalHighlights += book.highlights || 0;
        existing.totalNotes += book.notes || 0;
        existing.dates.push(snap.date);
        if (snap.date > existing.latestDate) existing.latestDate = snap.date;
      } else {
        bookMap.set(key, {
          title: book.title,
          author: book.author || "",
          totalMinutes: book.durationMinutes || 0,
          totalHighlights: book.highlights || 0,
          totalNotes: book.notes || 0,
          dates: [snap.date],
          latestDate: snap.date,
        });
      }
    }
  }

  const books = Array.from(bookMap.values())
    .sort((a, b) => b.latestDate.localeCompare(a.latestDate));

  return NextResponse.json({
    books,
    totalBooks: books.length,
    totalSnapshots: snapshots.length,
    totalReadingMinutes: books.reduce((s, b) => s + b.totalMinutes, 0),
    totalHighlights: books.reduce((s, b) => s + b.totalHighlights, 0),
    totalNotes: books.reduce((s, b) => s + b.totalNotes, 0),
  });
}
