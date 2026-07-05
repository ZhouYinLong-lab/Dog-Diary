/**
 * WakaTime integration adapter.
 *
 * Fetches daily summaries from the public WakaTime API and normalizes them
 * into the shared ApiSnapshot shape.
 *
 * API key resolution order:
 *   1. Environment variable WAKATIME_API_KEY (`.env` file)
 *   2. Database-stored key (Settings page)
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

/** Resolve API key: env var first, then DB. */
async function resolveApiKey(): Promise<string | null> {
  // Priority 1: environment variable
  const envKey = process.env.WAKATIME_API_KEY;
  if (envKey && envKey.trim()) {
    return envKey.trim();
  }

  // Priority 2: database-stored key
  const account = await getIntegrationAccount("wakatime");
  if (account && account.apiKey && account.enabled) {
    return account.apiKey;
  }

  return null;
}

/**
 * Check whether WakaTime is configured (env var or DB).
 */
export async function isWakaTimeConfigured(): Promise<{
  configured: boolean;
  source: "env" | "db" | "none";
}> {
  const envKey = process.env.WAKATIME_API_KEY;
  if (envKey && envKey.trim()) {
    return { configured: true, source: "env" };
  }

  const account = await getIntegrationAccount("wakatime");
  if (account && account.apiKey && account.enabled) {
    return { configured: true, source: "db" };
  }

  return { configured: false, source: "none" };
}

/**
 * Fetch WakaTime summaries for a given date from the authenticated API.
 * Returns null if not configured or if the API returns no data.
 *
 * Uses `start` + `end` parameters for specific dates (not `range` which only
 * accepts named values like "Today" / "Last 7 Days").
 */
export async function fetchWakaTimeSummary(
  date: string,
): Promise<WakaTimeSnapshotPayload | null> {
  const apiKey = await resolveApiKey();
  if (!apiKey) {
    console.warn("WakaTime: not configured (set WAKATIME_API_KEY in .env or via Settings)");
    return null;
  }

  try {
    // WakaTime uses Basic auth: base64("<api_key>")
    const encoded = Buffer.from(apiKey).toString("base64");

    // Use start + end for a specific date; range only supports named values
    const url = `${WAKATIME_API}/users/current/summaries?start=${encodeURIComponent(date)}&end=${encodeURIComponent(date)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${encoded}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn(
        `WakaTime API returned ${response.status} for ${date}${text ? `: ${text.slice(0, 200)}` : ""}`,
      );
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
  } catch (err) {
    console.warn(`WakaTime fetch failed for ${date}:`, err);
    return null;
  }
}
