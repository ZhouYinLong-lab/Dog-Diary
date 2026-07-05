import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getDailyPayload } from "@/lib/diary-db";
import { todayIsoDate } from "@/lib/date-utils";
import { buildDiaryMarkdown } from "@/lib/markdown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") || todayIsoDate();
  const { entry, snapshots } = await getDailyPayload(date);
  const markdown = buildDiaryMarkdown(entry, snapshots);

  // Also write to local exports directory
  try {
    const [year, month] = date.split("-");
    const dir = path.join(process.cwd(), "exports", year, month);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${date}.md`), markdown, "utf-8");
  } catch {
    // Non-critical — still return the download
  }

  return new NextResponse(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${date}.md"`,
    },
  });
}
