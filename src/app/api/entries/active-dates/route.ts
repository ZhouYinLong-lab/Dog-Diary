import { NextRequest, NextResponse } from "next/server";
import { getActiveDatesForMonth } from "@/lib/diary-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const year = Number(request.nextUrl.searchParams.get("year"));
  const month = Number(request.nextUrl.searchParams.get("month"));
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "year and month are required" },
      { status: 400 },
    );
  }
  return NextResponse.json(await getActiveDatesForMonth(year, month));
}
