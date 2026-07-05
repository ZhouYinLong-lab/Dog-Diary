/**
 * Legacy My-Life-Log / Obsidian diary format parser.
 *
 * Handles two directory structures:
 *   日记/YYYY/M月/YYYY-MM-DD.md   → daily diary
 *   YYYY-第XX周总结.md            → weekly summary
 *   YYYY-M月总结.md               → monthly summary
 *
 * Old sections recognized:
 *   ## 总结, ## 随想, ## 阅读, ## 打卡, ## 精力
 */

export interface LegacyEntry {
  date: string;
  type: "daily" | "weekly" | "monthly";
  fields: {
    summary?: string;    // 总结 → happened
    thoughts?: string;   // 随想 → thoughts
    reading?: string;    // 阅读 → raw reading notes
    checkIn?: string;    // 打卡 → bodyLife + tags
    energy?: string;     // 精力 → energy/mood hints
    raw?: string;        // Full raw content as fallback
  };
}

export interface LegacyImportResult {
  source: string;
  entries: LegacyEntry[];
  errors: string[];
}

/**
 * Parse a single legacy markdown file content.
 * Detects format from filename pattern.
 */
export function parseLegacyMarkdown(content: string, filename: string): LegacyImportResult {
  const errors: string[] = [];
  const entries: LegacyEntry[] = [];
  const cleanName = filename.replace(/\.md$/, "").trim();

  // ── Daily diary: YYYY-MM-DD or 日记/YYYY/M月/YYYY-MM-DD ──
  const dateMatch = cleanName.match(/(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const date = dateMatch[0];
    entries.push({
      date,
      type: "daily",
      fields: parseSections(content),
    });
    return { source: filename, entries, errors };
  }

  // ── Weekly summary: YYYY-第XX周总结 ──
  const weekMatch = cleanName.match(/(\d{4})-第(\d{1,2})周总结/);
  if (weekMatch) {
    const year = weekMatch[1];
    const weekNum = parseInt(weekMatch[2], 10);
    // Approximate: week N roughly starts at Jan 1 + (N-1)*7 days
    const start = new Date(Date.UTC(parseInt(year), 0, 1 + (weekNum - 1) * 7));
    const date = start.toISOString().slice(0, 10);
    entries.push({
      date,
      type: "weekly",
      fields: parseSections(content),
    });
    return { source: filename, entries, errors };
  }

  // ── Monthly summary: YYYY-M月总结 ──
  const monthMatch = cleanName.match(/(\d{4})-(\d{1,2})月总结/);
  if (monthMatch) {
    const date = `${monthMatch[1]}-${monthMatch[2].padStart(2, "0")}-01`;
    entries.push({
      date,
      type: "monthly",
      fields: parseSections(content),
    });
    return { source: filename, entries, errors };
  }

  // ── Unknown format ──
  errors.push(`Unrecognized filename pattern: ${filename}`);
  return { source: filename, entries, errors };
}

function parseSections(content: string): LegacyEntry["fields"] {
  const fields: LegacyEntry["fields"] = {};
  const sections = splitSections(content);

  for (const { title, body } of sections) {
    const trimmed = body.trim();
    if (!trimmed) continue;

    switch (title) {
      case "总结":
        fields.summary = trimmed;
        break;
      case "随想":
        fields.thoughts = trimmed;
        break;
      case "阅读":
        fields.reading = trimmed;
        break;
      case "打卡":
        fields.checkIn = trimmed;
        break;
      case "精力":
        fields.energy = trimmed;
        break;
      default:
        // Unknown heading → store in raw
        if (!fields.raw) fields.raw = "";
        fields.raw += `## ${title}\n\n${trimmed}\n\n`;
        break;
    }
  }

  // If no sections matched, store everything as summary
  const hasFields = Object.values(fields).some((v) => v && v.length > 0);
  if (!hasFields && content.trim()) {
    fields.summary = content.trim();
  }

  return fields;
}

/** Split markdown into heading sections. */
function splitSections(content: string): Array<{ title: string; body: string }> {
  const result: Array<{ title: string; body: string }> = [];
  const lines = content.split("\n");
  let currentTitle = "";
  let currentBody: string[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/);
    if (h2Match) {
      if (currentTitle || currentBody.length > 0) {
        result.push({ title: currentTitle, body: currentBody.join("\n") });
      }
      currentTitle = h2Match[1].trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  if (currentTitle || currentBody.length > 0) {
    result.push({ title: currentTitle, body: currentBody.join("\n") });
  }

  return result;
}

/**
 * Map legacy entry fields to Dog-Diary DiaryUpdateInput shape.
 * Returns null if nothing mappable found.
 */
export function mapLegacyToDiary(entry: LegacyEntry): {
  happened: string;
  thoughts: string;
  ideas: string;
  bodyLife: string;
  tags: string[];
  mood: string;
  energy: number | null;
} {
  const { fields } = entry;

  let happened = fields.summary || "";
  const thoughts = fields.thoughts || "";
  let bodyLife = "";
  const readingMarkdown = fields.reading || "";
  const tags: string[] = [];
  let mood = "";
  let energy: number | null = null;

  // 打卡 → tags + bodyLife
  if (fields.checkIn) {
    bodyLife = fields.checkIn;
    // Extract hashtags from checkin
    const tagMatches = fields.checkIn.match(/#(\S+)/g);
    if (tagMatches) {
      for (const t of tagMatches) {
        tags.push(t.replace(/^#/, "").replace(/[,，、]/g, ""));
      }
    }
  }

  // 精力 → parse energy number
  if (fields.energy) {
    const energyMatch = fields.energy.match(/(\d+)\s*\/?\s*10/);
    if (energyMatch) {
      energy = Math.min(10, Math.max(0, parseInt(energyMatch[1], 10)));
    }
    // Mood from energy section keywords
    const moodKeywords = ["平静", "充实", "焦虑", "开心", "疲惫", "满足", "困惑", "兴奋"];
    for (const kw of moodKeywords) {
      if (fields.energy.includes(kw)) {
        mood = kw;
        break;
      }
    }
  }

  // Merge reading into bodyLife as well (for visibility)
  if (readingMarkdown && !bodyLife.includes(readingMarkdown)) {
    bodyLife = bodyLife
      ? `${bodyLife}\n\n## 阅读\n${readingMarkdown}`
      : `## 阅读\n${readingMarkdown}`;
  }

  // Fallback: if happened is empty but we have raw content
  if (!happened && fields.raw) {
    happened = fields.raw;
  }

  return {
    happened: happened.slice(0, 5000),
    thoughts: thoughts.slice(0, 5000),
    ideas: "",
    bodyLife: bodyLife.slice(0, 5000),
    tags,
    mood,
    energy,
  };
}
