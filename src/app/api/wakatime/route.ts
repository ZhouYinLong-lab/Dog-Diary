import { NextRequest, NextResponse } from "next/server";
import { fetchWakaTimeSummary } from "@/lib/integrations/wakatime";
import { upsertSnapshot } from "@/lib/diary-db";
import { todayIsoDate } from "@/lib/date-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") || todayIsoDate();

  const payload = await fetchWakaTimeSummary(date);
  if (!payload) {
    // Store empty snapshot so we know we checked
    await upsertSnapshot({
      id: `wakatime:${date}`,
      date,
      provider: "wakatime",
      status: "empty",
      payload: {},
    });
    return NextResponse.json({ status: "empty", date });
  }

  await upsertSnapshot({
    id: `wakatime:${date}`,
    date,
    provider: "wakatime",
    status: "ready",
    payload: payload as unknown as Record<string, unknown>,
  });

  return NextResponse.json({
    status: "ready",
    date,
    totalSeconds: payload.totalSeconds,
    totalText: payload.totalText,
    projects: payload.projects,
    languages: payload.languages,
  });
}
