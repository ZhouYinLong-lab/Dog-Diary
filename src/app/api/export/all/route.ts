import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAllEntries, getSnapshots } from "@/lib/diary-db";
import { buildDiaryMarkdown } from "@/lib/markdown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await getAllEntries();
  if (entries.length === 0) {
    return NextResponse.json({ exported: 0, message: "No entries to export" });
  }

  const allMarkdown: string[] = [];
  const exportDir = path.join(process.cwd(), "exports", "all");

  try {
    fs.mkdirSync(exportDir, { recursive: true });
  } catch {
    return NextResponse.json({ error: "Failed to create export directory" }, { status: 500 });
  }

  for (const entry of entries) {
    const snapshots = await getSnapshots(entry.date);
    const md = buildDiaryMarkdown(entry, snapshots);
    allMarkdown.push(md);

    try {
      const [year, month] = entry.date.split("-");
      const dir = path.join(process.cwd(), "exports", year, month);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${entry.date}.md`), md, "utf-8");
    } catch {
      // Continue exporting remaining entries
    }
  }

  const combined = allMarkdown.join("\n\n---\n\n");

  // Write combined file
  try {
    fs.writeFileSync(path.join(exportDir, "all-entries.md"), combined, "utf-8");
  } catch {
    // Non-critical
  }

  return new NextResponse(combined, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="dog-diary-all.md"`,
    },
  });
}
