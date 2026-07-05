import { NextRequest, NextResponse } from "next/server";
import { searchEntries } from "@/lib/diary-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const minEnergy = sp.get("minEnergy");
  const maxEnergy = sp.get("maxEnergy");

  const results = await searchEntries({
    q: sp.get("q") || undefined,
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
    tag: sp.get("tag") || undefined,
    mood: sp.get("mood") || undefined,
    minEnergy: minEnergy ? Number(minEnergy) : undefined,
    maxEnergy: maxEnergy ? Number(maxEnergy) : undefined,
    hasWakatime: sp.has("hasWakatime")
      ? sp.get("hasWakatime") === "true"
      : undefined,
  });

  return NextResponse.json(results);
}
