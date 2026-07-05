import { NextRequest, NextResponse } from "next/server";
import { getReviewRecord, saveReviewRecord } from "@/lib/diary-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") as "week" | "month" | null;
  const periodStart = request.nextUrl.searchParams.get("periodStart");

  if (!type || !periodStart || !["week", "month"].includes(type)) {
    return NextResponse.json({ error: "type and periodStart required" }, { status: 400 });
  }

  const record = await getReviewRecord(type, periodStart);
  return NextResponse.json(record);
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as {
    type: "week" | "month";
    periodStart: string;
    periodEnd: string;
    content: string;
  };

  if (!body.type || !body.periodStart || !body.periodEnd) {
    return NextResponse.json({ error: "type, periodStart, and periodEnd required" }, { status: 400 });
  }

  await saveReviewRecord({
    type: body.type,
    periodStart: body.periodStart,
    periodEnd: body.periodEnd,
    content: body.content || "",
  });

  return NextResponse.json({ saved: true });
}
