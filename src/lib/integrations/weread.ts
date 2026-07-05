/**
 * WeRead (微信读书) integration adapter.
 *
 * Normalizes reading data into the shared ApiSnapshot shape.
 *
 * TODO: When a real WeRead API becomes available, implement the actual
 * fetch logic inside `fetchWeReadSnapshot`. The adapter contract is:
 *   - Input:  date (string "YYYY-MM-DD"), config from integration_accounts
 *   - Output: WeReadSnapshotPayload | null
 *
 * Candidates for real API access (unverified, do NOT hardcode):
 *   - Official WeRead API (if/when documented)
 *   - Cookie-based scraping of weread.qq.com (subject to ToS)
 *   - Mobile app proxy via local network (advanced)
 */

import { getIntegrationAccount } from "@/lib/diary-db";

export interface WeReadBook {
  bookId: string;
  title: string;
  author: string;
  coverUrl?: string;
}

export interface WeReadSnapshotPayload {
  books: Array<{
    title: string;
    author: string;
    durationMinutes: number;
    highlights: number;
    notes: number;
  }>;
  totalDurationMinutes: number;
  totalHighlights: number;
  totalNotes: number;
  markdown: string;
}

function buildWeReadMarkdown(payload: WeReadSnapshotPayload): string {
  const lines: string[] = [];
  lines.push(`- **总阅读时长**: ${payload.totalDurationMinutes} 分钟`);
  lines.push(`- **划线**: ${payload.totalHighlights} 条`);
  lines.push(`- **笔记**: ${payload.totalNotes} 条`);

  if (payload.books.length > 0) {
    lines.push("");
    lines.push("**阅读书目**");
    for (const book of payload.books) {
      lines.push(
        `- ${book.title} — ${book.author} (${book.durationMinutes}分钟, 划线${book.highlights}条, 笔记${book.notes}条)`,
      );
    }
  }

  return lines.join("\n");
}

/**
 * Fetch WeRead reading data for a given date.
 * Currently returns null — implement when a real API is available.
 */
export async function fetchWeReadSnapshot(
  /* date: string */ _unused: string,
): Promise<WeReadSnapshotPayload | null> {
  void _unused;
  const account = await getIntegrationAccount("weread");
  if (!account || !account.enabled) {
    return null;
  }

  // TODO: Implement actual WeRead data fetching.
  // The account.config may contain: cookie, token, vid, etc.
  // Return null until we have a verified API to call.
  //
  // Example placeholder for future implementation:
  //   const cookie = account.config?.cookie as string | undefined;
  //   if (!cookie) return null;
  //   const response = await fetch("https://weread.qq.com/...", {
  //     headers: { Cookie: cookie },
  //   });
  //   ...parse into WeReadSnapshotPayload...

  return null;
}

export { buildWeReadMarkdown };
