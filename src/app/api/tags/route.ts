import { NextResponse } from "next/server";
import { getAllTags } from "@/lib/diary-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getAllTags());
}
