import { NextRequest, NextResponse } from "next/server";
import { getOrCreateEntry, updateEntry } from "@/lib/diary-db";
import type { DiaryUpdateInput } from "@/lib/diary-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseMarkdown(md: string): Array<{ date: string; fields: Record<string, string> }> {
  const results: Array<{ date: string; fields: Record<string, string> }> = [];
  const entries = md.split(/\n(?=# \d{4}-\d{2}-\d{2})/);

  for (const block of entries) {
    const dateMatch = block.match(/^# (\d{4}-\d{2}-\d{2})/m);
    if (!dateMatch) continue;
    const date = dateMatch[1];

    const fields: Record<string, string> = {};
    const sectionPattern = /^## (.+)$\n+([\s\S]*?)(?=\n## |\n*$)/gm;
    let sectionMatch;
    while ((sectionMatch = sectionPattern.exec(block)) !== null) {
      const title = sectionMatch[1].trim();
      const content = sectionMatch[2].trim();
      fields[title] = content;
    }

    results.push({ date, fields });
  }

  return results;
}

export async function POST(request: NextRequest) {
  let body: { markdown: string; mode?: "preview" | "import" } = { markdown: "" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.markdown?.trim()) {
    return NextResponse.json({ error: "No markdown content" }, { status: 400 });
  }

  const parsed = parseMarkdown(body.markdown);
  if (parsed.length === 0) {
    return NextResponse.json({ error: "No valid diary entries found in markdown" }, { status: 400 });
  }

  if (body.mode === "preview") {
    return NextResponse.json({ preview: true, entries: parsed.map((p) => ({ date: p.date, fields: Object.keys(p.fields) })) });
  }

  // Import mode
  const results: Array<{ date: string; status: "created" | "merged" | "skipped" | "error"; detail?: string }> = [];

  for (const { date, fields } of parsed) {
    try {
      const existing = await getOrCreateEntry(date);
      const hasExistingContent = [
        existing.happened, existing.thoughts, existing.ideas, existing.bodyLife, existing.tomorrow,
      ].some((s) => s.trim().length > 0);

      // Build update
      const update: DiaryUpdateInput = {
        date,
        happened: fields["发生了什么"] ?? (hasExistingContent ? existing.happened : ""),
        thoughts: fields["我在想什么"] ?? (hasExistingContent ? existing.thoughts : ""),
        ideas: fields["Ideas"] ?? (hasExistingContent ? existing.ideas : ""),
        bodyLife: fields["身体与生活"] ?? (hasExistingContent ? existing.bodyLife : ""),
        tomorrow: fields["明天"] ?? (hasExistingContent ? existing.tomorrow : ""),
        tags: existing.tags,
        mood: existing.mood,
        energy: existing.energy,
      };

      await updateEntry(update);
      results.push({
        date,
        status: hasExistingContent ? "merged" : "created",
      });
    } catch (e) {
      results.push({ date, status: "error", detail: String(e) });
    }
  }

  return NextResponse.json({
    imported: results.filter((r) => r.status === "created" || r.status === "merged").length,
    results,
  });
}
