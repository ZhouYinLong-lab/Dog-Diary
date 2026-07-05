import { NextRequest, NextResponse } from "next/server";
import { getEntriesInRange, getSnapshotsInRange, getTaskStats } from "@/lib/diary-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end are required (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const entries = await getEntriesInRange(start, end);
  const wakatimeSnapshots = await getSnapshotsInRange(start, end, "wakatime");
  const wereadSnapshots = await getSnapshotsInRange(start, end, "weread");

  // Aggregate
  const daysWritten = entries.filter((e) => {
    const content = [e.happened, e.thoughts, e.ideas, e.bodyLife, e.tomorrow]
      .map((s) => s.trim())
      .join("");
    return content.length > 0;
  }).length;

  const moods = entries
    .map((e) => e.mood)
    .filter(Boolean) as string[];

  const energies = entries
    .map((e) => e.energy)
    .filter((v): v is number => v !== null);

  const avgEnergy =
    energies.length > 0
      ? Math.round((energies.reduce((a, b) => a + b, 0) / energies.length) * 10) / 10
      : null;

  const tagCounts: Record<string, number> = {};
  for (const entry of entries) {
    for (const tag of entry.tags) {
      if (tag.trim()) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  const wakaTotalSeconds = wakatimeSnapshots.reduce((sum, s) => {
    const p = s.payload as Record<string, unknown>;
    return sum + (typeof p.totalSeconds === "number" ? p.totalSeconds : 0);
  }, 0);

  const wereadTotalMinutes = wereadSnapshots.reduce((sum, s) => {
    const p = s.payload as Record<string, unknown>;
    return sum + (typeof p.totalDurationMinutes === "number" ? p.totalDurationMinutes : 0);
  }, 0);

  const wereadTotalHighlights = wereadSnapshots.reduce((sum, s) => {
    const p = s.payload as Record<string, unknown>;
    return sum + (typeof p.totalHighlights === "number" ? p.totalHighlights : 0);
  }, 0);

  const wereadTotalNotes = wereadSnapshots.reduce((sum, s) => {
    const p = s.payload as Record<string, unknown>;
    return sum + (typeof p.totalNotes === "number" ? p.totalNotes : 0);
  }, 0);

  const wakaHours = Math.round((wakaTotalSeconds / 3600) * 10) / 10;

  const taskStats = await getTaskStats(start, end);

  return NextResponse.json({
    range: { start, end },
    totalDays: entries.length,
    daysWritten,
    moods,
    avgEnergy,
    energyValues: energies,
    topTags,
    wakatime: {
      totalSeconds: wakaTotalSeconds,
      totalHours: wakaHours,
      daysWithData: wakatimeSnapshots.length,
    },
    weread: {
      totalDurationMinutes: wereadTotalMinutes,
      totalHighlights: wereadTotalHighlights,
      totalNotes: wereadTotalNotes,
      daysWithData: wereadSnapshots.length,
    },
    tasks: taskStats,
    entries: entries.map((e) => ({
      date: e.date,
      mood: e.mood,
      energy: e.energy,
      tags: e.tags,
      hasContent: [e.happened, e.thoughts, e.ideas, e.bodyLife]
        .some((s) => s.trim().length > 0),
      hasTomorrow: e.tomorrow.trim().length > 0,
    })),
  });
}
