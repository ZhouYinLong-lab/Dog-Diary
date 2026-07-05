import { NextRequest, NextResponse } from "next/server";
import { parseLegacyMarkdown, mapLegacyToDiary, type LegacyEntry } from "@/lib/legacy-import";
import { getOrCreateEntry, updateEntry, upsertSnapshot } from "@/lib/diary-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ImportFile {
  filename: string;
  content: string;
}

export async function POST(request: NextRequest) {
  let body: { files: ImportFile[]; mode?: "preview" | "import"; skipExisting?: boolean } = { files: [] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.files || body.files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  // Parse all files
  const allEntries: Array<{ filename: string; entry: LegacyEntry }> = [];
  const parseErrors: string[] = [];

  for (const file of body.files) {
    const result = parseLegacyMarkdown(file.content, file.filename);
    for (const entry of result.entries) {
      allEntries.push({ filename: file.filename, entry });
    }
    parseErrors.push(...result.errors);
  }

  if (allEntries.length === 0) {
    return NextResponse.json({
      error: "No parseable entries found",
      parseErrors,
    }, { status: 400 });
  }

  // Preview mode
  if (body.mode === "preview") {
    const conflicts: string[] = [];
    const preview = allEntries.map(({ filename, entry }) => ({
      date: entry.date,
      type: entry.type,
      source: filename,
      hasSummary: !!entry.fields.summary,
      hasThoughts: !!entry.fields.thoughts,
      hasReading: !!entry.fields.reading,
      hasCheckIn: !!entry.fields.checkIn,
      hasEnergy: !!entry.fields.energy,
    }));

    // Check for existing entries (conflicts)
    const dates = new Set(preview.map((p) => p.date));
    for (const date of dates) {
      try {
        const existing = await getOrCreateEntry(date);
        const hasContent = [existing.happened, existing.thoughts, existing.ideas, existing.bodyLife]
          .some((s) => s.trim().length > 0);
        if (hasContent) conflicts.push(date);
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      preview: true,
      totalEntries: allEntries.length,
      conflicts,
      entries: preview,
      parseErrors,
    });
  }

  // Import mode
  const skipExisting = body.skipExisting !== false; // default true
  const results: Array<{ date: string; status: string; source: string }> = [];

  for (const { filename, entry } of allEntries) {
    try {
      const existing = await getOrCreateEntry(entry.date);
      const hasExistingContent = [existing.happened, existing.thoughts, existing.ideas, existing.bodyLife]
        .some((s) => s.trim().length > 0);

      if (hasExistingContent && skipExisting) {
        results.push({ date: entry.date, status: "skipped", source: filename });
        continue;
      }

      const mapped = mapLegacyToDiary(entry);

      await updateEntry({
        date: entry.date,
        happened: hasExistingContent && !mapped.happened ? existing.happened : (mapped.happened || existing.happened),
        thoughts: hasExistingContent && !mapped.thoughts ? existing.thoughts : (mapped.thoughts || existing.thoughts),
        ideas: existing.ideas || mapped.ideas,
        bodyLife: hasExistingContent && !mapped.bodyLife ? existing.bodyLife : (mapped.bodyLife || existing.bodyLife),
        tomorrow: existing.tomorrow,
        tags: [...new Set([...existing.tags, ...mapped.tags])],
        mood: mapped.mood || existing.mood,
        energy: mapped.energy ?? existing.energy,
      });

      // Import reading as WeRead snapshot if present
      if (entry.fields.reading) {
        await upsertSnapshot({
          id: `weread:${entry.date}`,
          date: entry.date,
          provider: "weread",
          status: "ready",
          payload: {
            books: [{ title: "Legacy Import", durationMinutes: 0, highlights: 0, notes: 0 }],
            totalDurationMinutes: 0,
            totalHighlights: 0,
            totalNotes: 0,
            markdown: entry.fields.reading,
          },
        });
      }

      results.push({
        date: entry.date,
        status: hasExistingContent ? "merged" : "created",
        source: filename,
      });
    } catch (e) {
      results.push({ date: entry.date, status: `error: ${String(e)}`, source: filename });
    }
  }

  return NextResponse.json({
    imported: results.filter((r) => r.status === "created" || r.status === "merged").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    results,
    parseErrors,
  });
}
