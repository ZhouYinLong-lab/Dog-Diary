import { NextRequest, NextResponse } from "next/server";
import { getReviewRecord } from "@/lib/diary-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") as "week" | "month" | null;
  const period = request.nextUrl.searchParams.get("period");

  if (!type || !period || !["week", "month"].includes(type)) {
    return NextResponse.json({ error: "type and period required" }, { status: 400 });
  }

  const record = await getReviewRecord(type, period);
  if (!record || !record.content.trim()) {
    return NextResponse.json({ error: "No review content found" }, { status: 404 });
  }

  const filename = `review-${type}-${period}.md`;

  return new NextResponse(record.content, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
