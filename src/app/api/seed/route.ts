import { NextRequest, NextResponse } from "next/server";
import { updateEntry, upsertSnapshot } from "@/lib/diary-db";
import { shiftIsoDate, todayIsoDate } from "@/lib/date-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAMPLE_MOODS = ["平静", "充实", "焦虑", "开心", "疲惫", "满足", "困惑"];
const SAMPLE_TAGS = ["工作", "阅读", "运动", "学习", "社交", "创作", "思考"];
const SAMPLE_HAPPENED = [
  "今天完成了项目的核心模块重构，代码可读性提升不少。",
  "上午开了两个会，下午集中精力写代码，效率不错。",
  "下雨天，在家看书、煮咖啡，度过安静的一天。",
  "去健身房练了腿，回来路上买了水果。",
  "和朋友聊了很久，收获了一些新视角。",
  "整理了笔记系统，把散落的想法归了档。",
  "学了 Rust 的基础语法，还挺有意思的。",
];
const SAMPLE_THOUGHTS = [
  "最近在思考工作和生活的平衡。",
  "感觉需要给自己定一个更清晰的季度目标。",
  "关于那个 side project，也许应该先做 MVP 验证。",
  "阅读让我平静，这种习惯应该保持。",
  "健康的身体是一切的基础，不能忽视。",
];
const SAMPLE_IDEAS = [
  "做一个本地优先的日记应用",
  "用 AI 做读书笔记摘要",
  "开发一个命令行 TODO 工具",
  "设计一套个人知识管理系统",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sampleTags(): string[] {
  const count = Math.floor(Math.random() * 3) + 1;
  const shuffled = [...SAMPLE_TAGS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function GET(request: NextRequest) {
  const daysParam = request.nextUrl.searchParams.get("days");
  const days = Math.min(Number(daysParam) || 14, 60);
  const today = todayIsoDate();

  const created: string[] = [];

  for (let i = days; i >= 0; i--) {
    const date = shiftIsoDate(today, -i);
    const hasContent = Math.random() > 0.2; // 80% of days have content
    if (!hasContent) continue;

    const mood = pick(SAMPLE_MOODS);
    const energy = Math.floor(Math.random() * 8) + 2;
    const happened = pick(SAMPLE_HAPPENED);
    const thoughts = Math.random() > 0.3 ? pick(SAMPLE_THOUGHTS) : "";
    const ideas = Math.random() > 0.5 ? pick(SAMPLE_IDEAS) : "";
    const bodyLife = Math.random() > 0.6
      ? "今天走了 8000 步，睡眠 7 小时。"
      : "";
    const tomorrow = Math.random() > 0.4
      ? pick(["继续推进项目", "去健身房", "整理本周笔记", "读完那本书的第三章"])
      : "";
    const tags = sampleTags();

    await updateEntry({
      date,
      happened,
      thoughts,
      ideas,
      bodyLife,
      tomorrow,
      tags,
      mood,
      energy,
    });

    // Add fake WakaTime data to some days
    if (Math.random() > 0.5) {
      const totalSeconds = Math.floor(Math.random() * 14400) + 1800;
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const totalText = `${hours} hrs ${mins} mins`;

      const projects = [
        { name: "dog-diary", text: `${Math.floor(totalSeconds * 0.6 / 3600)} hrs ${Math.floor(totalSeconds * 0.6 % 3600 / 60)} mins`, percent: 60 },
        { name: "side-project", text: `${Math.floor(totalSeconds * 0.3 / 3600)} hrs ${Math.floor(totalSeconds * 0.3 % 3600 / 60)} mins`, percent: 30 },
        { name: "dotfiles", text: `${Math.floor(totalSeconds * 0.1 / 3600)} hrs ${Math.floor(totalSeconds * 0.1 % 3600 / 60)} mins`, percent: 10 },
      ];

      const languages = [
        { name: "TypeScript", text: `${Math.floor(totalSeconds * 0.7 / 3600)} hrs`, percent: 70 },
        { name: "Rust", text: `${Math.floor(totalSeconds * 0.2 / 3600)} hrs`, percent: 20 },
        { name: "Markdown", text: `${Math.floor(totalSeconds * 0.1 / 3600)} hrs`, percent: 10 },
      ];

      const markdownLines = [`- **总编码时长**: ${totalText}`, "", "**项目分布**"];
      for (const p of projects) {
        markdownLines.push(`- ${p.name}: ${p.text} (${p.percent}%)`);
      }
      markdownLines.push("", "**语言分布**");
      for (const l of languages) {
        markdownLines.push(`- ${l.name}: ${l.text} (${l.percent}%)`);
      }

      await upsertSnapshot({
        id: `wakatime:${date}`,
        date,
        provider: "wakatime",
        status: "ready",
        payload: {
          totalSeconds,
          totalText,
          projects,
          languages,
          markdown: markdownLines.join("\n"),
        },
      });
    }

    created.push(date);
  }

  return NextResponse.json({
    seeded: created.length,
    dates: created,
    message: `Created ${created.length} sample diary entries`,
  });
}
