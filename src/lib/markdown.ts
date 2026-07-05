import type { ApiSnapshot, DiaryEntry } from "@/lib/diary-types";

function section(title: string, body: string) {
  return `## ${title}\n\n${body.trim()}\n`;
}

function renderSnapshot(snapshot: ApiSnapshot) {
  const markdown = snapshot.payload.markdown;
  if (typeof markdown === "string" && markdown.trim()) {
    return markdown.trim();
  }
  return "";
}

export function buildDiaryMarkdown(entry: DiaryEntry, snapshots: ApiSnapshot[]) {
  const weread = snapshots.find((snapshot) => snapshot.provider === "weread");
  const wakatime = snapshots.find((snapshot) => snapshot.provider === "wakatime");
  const blocks = [`# ${entry.date}\n`];

  blocks.push(section("记忆", entry.happened));
  blocks.push(section("我在想什么", entry.thoughts));
  blocks.push(section("Ideas", entry.ideas));

  if (weread) {
    const body = renderSnapshot(weread);
    if (body) {
      blocks.push(section("阅读", body));
    }
  }

  if (wakatime) {
    const body = renderSnapshot(wakatime);
    if (body) {
      blocks.push(section("项目记录", body));
    }
  }

  blocks.push(section("身体与生活", entry.bodyLife));
  blocks.push(section("昨天对今天的计划", entry.yesterdayPlan));
  blocks.push(section("明天", entry.tomorrow));

  return `${blocks.join("\n").trim()}\n`;
}
