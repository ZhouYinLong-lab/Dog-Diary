import { NextRequest, NextResponse } from "next/server";
import { getAllSnapshots } from "@/lib/diary-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const snapshots = await getAllSnapshots("wakatime");
  const projectParam = request.nextUrl.searchParams.get("project");

  // Aggregate data
  const projectMap = new Map<string, { totalSeconds: number; dates: Set<string> }>();
  const languageMap = new Map<string, { totalSeconds: number }>();
  let grandTotal = 0;

  for (const snap of snapshots) {
    const p = snap.payload as Record<string, unknown>;
    const totalSeconds = typeof p.totalSeconds === "number" ? p.totalSeconds : 0;
    grandTotal += totalSeconds;

    const projects = Array.isArray(p.projects) ? p.projects as Array<{
      name: string; total_seconds?: number; text: string; percent: number;
    }> : [];

    for (const proj of projects) {
      const existing = projectMap.get(proj.name);
      const sec = typeof proj.total_seconds === "number" ? proj.total_seconds : 0;
      if (existing) {
        existing.totalSeconds += sec;
        existing.dates.add(snap.date);
      } else {
        projectMap.set(proj.name, { totalSeconds: sec, dates: new Set([snap.date]) });
      }
    }

    const languages = Array.isArray(p.languages) ? p.languages as Array<{
      name: string; total_seconds?: number; text: string; percent: number;
    }> : [];
    for (const lang of languages) {
      const existing = languageMap.get(lang.name);
      const sec = typeof lang.total_seconds === "number" ? lang.total_seconds : 0;
      if (existing) {
        existing.totalSeconds += sec;
      } else {
        languageMap.set(lang.name, { totalSeconds: sec });
      }
    }
  }

  const projects = Array.from(projectMap.entries())
    .map(([name, data]) => ({
      name,
      totalSeconds: data.totalSeconds,
      totalHours: Math.round((data.totalSeconds / 3600) * 10) / 10,
      daysActive: data.dates.size,
      percent: grandTotal > 0 ? Math.round((data.totalSeconds / grandTotal) * 100) : 0,
    }))
    .filter((p) => !projectParam || p.name.toLowerCase().includes(projectParam.toLowerCase()))
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  const languages = Array.from(languageMap.entries())
    .map(([name, data]) => ({
      name,
      totalSeconds: data.totalSeconds,
      totalHours: Math.round((data.totalSeconds / 3600) * 10) / 10,
      percent: grandTotal > 0 ? Math.round((data.totalSeconds / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  return NextResponse.json({
    grandTotalSeconds: grandTotal,
    grandTotalHours: Math.round((grandTotal / 3600) * 10) / 10,
    snapshotsCount: snapshots.length,
    lastSync: snapshots.length > 0 ? snapshots[0].date : null,
    projects,
    languages,
  });
}
