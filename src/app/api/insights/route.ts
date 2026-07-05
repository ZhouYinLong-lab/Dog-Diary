import { NextRequest, NextResponse } from "next/server";
import { getEntriesInRange, getSnapshotsInRange, getStreak, getTaskStats } from "@/lib/diary-db";
import { todayIsoDate, shiftIsoDate } from "@/lib/date-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const days = Number(request.nextUrl.searchParams.get("days") || 30);
  const endDate = todayIsoDate();
  const startDate = shiftIsoDate(endDate, -(days - 1));

  const entries = await getEntriesInRange(startDate, endDate);
  const waka = await getSnapshotsInRange(startDate, endDate, "wakatime");
  const weread = await getSnapshotsInRange(startDate, endDate, "weread");

  const daysWritten = entries.filter((e) => {
    const content = [e.happened, e.thoughts, e.ideas, e.bodyLife, e.tomorrow]
      .map((s) => s.trim()).join("");
    return content.length > 0;
  }).length;

  const moods = entries.map((e) => e.mood).filter(Boolean) as string[];
  const moodCounts = new Map<string, number>();
  for (const m of moods) { moodCounts.set(m, (moodCounts.get(m) || 0) + 1); }
  const topMoods = Array.from(moodCounts.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([mood, count]) => ({ mood, count }));

  const energies = entries.map((e) => e.energy).filter((v): v is number => v !== null);
  const avgEnergy = energies.length > 0
    ? Math.round((energies.reduce((a, b) => a + b, 0) / energies.length) * 10) / 10
    : null;

  const tagCounts = new Map<string, number>();
  for (const e of entries) {
    for (const t of e.tags) { tagCounts.set(t, (tagCounts.get(t) || 0) + 1); }
  }
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  const wakaTotal = waka.reduce((s, snap) => {
    const p = snap.payload as Record<string, unknown>;
    return s + (typeof p.totalSeconds === "number" ? p.totalSeconds : 0);
  }, 0);

  const wereadTotal = weread.reduce((s, snap) => {
    const p = snap.payload as Record<string, unknown>;
    return s + (typeof p.totalDurationMinutes === "number" ? p.totalDurationMinutes : 0);
  }, 0);

  const streak = await getStreak(endDate);

  // Calendar heatmap: last 365 days with content
  const heatStart = shiftIsoDate(endDate, -365);
  const allYearEntries = await getEntriesInRange(heatStart, endDate);
  const heatmap = allYearEntries
    .filter((e) => {
      const content = [e.happened, e.thoughts, e.ideas, e.bodyLife, e.tomorrow]
        .map((s) => s.trim()).join("");
      return content.length > 0;
    })
    .map((e) => e.date);

  // Task completion trend
  const taskStats = await getTaskStats(startDate, endDate);

  // Energy trend (daily)
  const energyTrend = entries
    .filter((e) => e.energy !== null)
    .map((e) => ({ date: e.date, energy: e.energy as number }));

  return NextResponse.json({
    range: { start: startDate, end: endDate },
    daysWritten,
    totalDays: days,
    streak,
    avgEnergy,
    topMoods,
    topTags,
    wakatimeTotalSeconds: wakaTotal,
    wakatimeTotalHours: Math.round((wakaTotal / 3600) * 10) / 10,
    wereadTotalMinutes: wereadTotal,
    energyTrend,
    heatmap,
    tasks: taskStats,
  });
}
