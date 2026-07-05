import { NextRequest, NextResponse } from "next/server";
import { getDailyPayload, updateEntry } from "@/lib/diary-db";
import { todayIsoDate } from "@/lib/date-utils";
import type { DiaryUpdateInput } from "@/lib/diary-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") || todayIsoDate();
  return NextResponse.json(await getDailyPayload(date));
}

export async function PUT(request: NextRequest) {
  const input = (await request.json()) as DiaryUpdateInput;
  if (!input.date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const entry = await updateEntry({
    date: input.date,
    happened: input.happened ?? "",
    thoughts: input.thoughts ?? "",
    ideas: input.ideas ?? "",
    bodyLife: input.bodyLife ?? "",
    tomorrow: input.tomorrow ?? "",
    tags: Array.isArray(input.tags) ? input.tags : [],
    mood: input.mood ?? "",
    energy: typeof input.energy === "number" ? input.energy : null,
  });

  return NextResponse.json({ entry });
}
