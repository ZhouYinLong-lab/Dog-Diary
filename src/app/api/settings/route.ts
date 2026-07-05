import { NextRequest, NextResponse } from "next/server";
import { getIntegrationAccount, saveIntegrationAccount } from "@/lib/diary-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const wakatime = await getIntegrationAccount("wakatime");
  const weread = await getIntegrationAccount("weread");

  return NextResponse.json({
    wakatime: wakatime
      ? { enabled: wakatime.enabled, apiKey: wakatime.apiKey ? "••••" : "", config: wakatime.config }
      : { enabled: false, apiKey: "", config: {} },
    weread: weread
      ? { enabled: weread.enabled, apiKey: weread.apiKey ? "••••" : "", config: weread.config }
      : { enabled: false, apiKey: "", config: {} },
  });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as {
    provider: string;
    enabled?: boolean;
    apiKey?: string;
    config?: Record<string, unknown>;
  };

  if (!body.provider || !["wakatime", "weread"].includes(body.provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  await saveIntegrationAccount(body.provider, {
    enabled: body.enabled,
    apiKey: body.apiKey,
    config: body.config,
  });

  return NextResponse.json({ saved: true });
}
