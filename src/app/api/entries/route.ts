import { NextRequest, NextResponse } from "next/server";
import { getAllEntries } from "@/lib/diary-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const tag = request.nextUrl.searchParams.get("tag") || undefined;
  return NextResponse.json(await getAllEntries(tag));
}
