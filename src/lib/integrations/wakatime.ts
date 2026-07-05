/**
 * WakaTime integration adapter.
 *
 * Fetches daily summaries from the public WakaTime API and normalizes them
 * into the shared ApiSnapshot shape.
 */

import { getIntegrationAccount } from "@/lib/diary-db";

const WAKATIME_API = "https://wakatime.com/api/v1";

interface WakaTimeSummary {
  grand_total: {
    total_seconds: number;
    digital: string;
    hours: number;
    minutes: number;
    text: string;
  };
  projects: Array<{
    name: string;
    total_seconds: number;
    digital: string;
    hours: number;
    minutes: number;
    text: string;
    percent: number;
  }>;
  languages: Array<{
    name: string;
    total_seconds: number;
    digital: string;
    hours: number;
    minutes: number;
    text: string;
    percent: number;
  }>;
  range: {
    start: string;
    end: string;
    date: string;
    text: string;
  };
}

export interface WakaTimeSnapshotPayload {
  totalSeconds: number;
  totalText: string;
  projects: Array<{ name: string; text: string; percent: number }>;
  languages: Array<{ name: string; text: string; percent: number }>;
  markdown: string;
}

function buildWakaTimeMarkdown(payload: WakaTimeSnapshotPayload): string {
  const lines: string[] = [];
  lines.push(`- **总编码时长**: ${payload.totalText}`);

  if (payload.projects.length > 0) {
    lines.push("");
    lines.push("**项目分布**");
    for (const p of payload.projects) {
      lines.push(`- ${p.name}: ${p.text} (${p.percent}%)`);
    }
  }

  if (payload.languages.length > 0) {
    lines.push("");
    lines.push("**语言分布**");
    for (const l of payload.languages) {
      lines.push(`- ${l.name}: ${l.text} (${l.percent}%)`);
    }
  }

  return lines.join("\n");
}

/**
 * Fetch WakaTime summaries for a given date from the authenticated API.
 * Returns null if not configured or if the API returns no data.
 */
export async function fetchWakaTimeSummary(
  date: string,
): Promise<WakaTimeSnapshotPayload | null> {
  const account = await getIntegrationAccount("wakatime");
  if (!account || !account.apiKey || !account.enabled) {
    return null;
  }

  try {
    const url = `${WAKATIME_API}/users/current/summaries?range=${encodeURIComponent(date)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${Buffer.from(account.apiKey).toString("base64")}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.warn(`WakaTime API returned ${response.status} for ${date}`);
      return null;
    }

    const body = (await response.json()) as {
      data: WakaTimeSummary[];
    };

    if (!body.data || body.data.length === 0) {
      return null;
    }

    const summary = body.data[0];
    const payload: WakaTimeSnapshotPayload = {
      totalSeconds: summary.grand_total.total_seconds,
      totalText: summary.grand_total.text,
      projects: summary.projects.map((p) => ({
        name: p.name,
        text: p.text,
        percent: p.percent,
      })),
      languages: summary.languages.map((l) => ({
        name: l.name,
        text: l.text,
        percent: l.percent,
      })),
      markdown: "",
    };

    payload.markdown = buildWakaTimeMarkdown(payload);
    return payload;
  } catch {
    return null;
  }
}
