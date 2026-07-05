import { NextRequest, NextResponse } from "next/server";
import { getEntriesForDates } from "@/lib/diary-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const datesParam = request.nextUrl.searchParams.get("dates");
  if (!datesParam) {
    return NextResponse.json([]);
  }
  const dates = datesParam.split(",").filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  return NextResponse.json(await getEntriesForDates(dates));
}
