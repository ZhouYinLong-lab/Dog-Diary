"use client";

import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Code2,
  Download,
  Edit3,
  Loader2,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatDisplayDate, shiftIsoDate, todayIsoDate } from "@/lib/date-utils";
import { buildDiaryMarkdown } from "@/lib/markdown";
import type { DailyPayload } from "@/lib/diary-types";

function renderMarkdownToHtml(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");
  html = html
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("<h") || trimmed.startsWith("<ul") || trimmed.startsWith("<li") || trimmed.startsWith("</ul")) {
        return trimmed;
      }
      return `<p>${trimmed}</p>`;
    })
    .join("\n");
  return html;
}

export default function EntryDetailPage() {
  const params = useParams();
  const date = (params?.date as string) || todayIsoDate();
  const [payload, setPayload] = useState<DailyPayload | null>(null);
  const [prevDate, setPrevDate] = useState<string | null>(null);
  const [nextDate, setNextDate] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/diary?date=${date}`)
      .then((r) => r.json())
      .then((data: DailyPayload) => {
        if (!cancelled) {
          setPayload(data);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => { cancelled = true; };
  }, [date]);

  // Check prev/next entries
  useEffect(() => {
    let cancelled = false;

    async function check() {
      // Previous
      for (let i = 1; i <= 30; i++) {
        if (cancelled) return;
        const d = shiftIsoDate(date, -i);
        try {
          const res = await fetch(`/api/diary?date=${d}`);
          const data: DailyPayload = await res.json();
          const hasContent = [data.entry.happened, data.entry.thoughts, data.entry.ideas, data.entry.bodyLife, data.entry.tomorrow]
            .some((s) => s.trim().length > 0);
          if (hasContent && !cancelled) {
            setPrevDate(d);
            return;
          }
        } catch { /* continue */ }
      }
      if (!cancelled) setPrevDate(null);
    }

    async function checkNext() {
      for (let i = 1; i <= 30; i++) {
        if (cancelled) return;
        const d = shiftIsoDate(date, i);
        if (d > todayIsoDate()) break;
        try {
          const res = await fetch(`/api/diary?date=${d}`);
          const data: DailyPayload = await res.json();
          const hasContent = [data.entry.happened, data.entry.thoughts, data.entry.ideas, data.entry.bodyLife, data.entry.tomorrow]
            .some((s) => s.trim().length > 0);
          if (hasContent && !cancelled) {
            setNextDate(d);
            return;
          }
        } catch { /* continue */ }
      }
      if (!cancelled) setNextDate(null);
    }

    Promise.resolve().then(() => {
      if (!cancelled) {
        setPrevDate(null);
        setNextDate(null);
      }
      check();
      checkNext();
    });
    return () => { cancelled = true; };
  }, [date]);

  const entry = payload?.entry;
  const snapshots = payload?.snapshots ?? [];
  const waka = snapshots.find((s) => s.provider === "wakatime");
  const weread = snapshots.find((s) => s.provider === "weread");
  const previewHtml = entry ? renderMarkdownToHtml(buildDiaryMarkdown(entry, snapshots)) : "";
  const readableDate = useMemo(() => {
    if (!entry) return date;
    try { return formatDisplayDate(date); } catch { return date; }
  }, [date, entry]);

  const hasContent = entry && [
    entry.happened, entry.thoughts, entry.ideas, entry.bodyLife, entry.tomorrow,
  ].some((s) => s.trim().length > 0);

  if (status === "loading") {
    return (
      <main className="app-shell">
        <p className="status-message"><Loader2 aria-hidden="true" /> 加载中…</p>
      </main>
    );
  }

  if (status === "error" || !entry) {
    return (
      <main className="app-shell">
        <section className="topbar">
          <div className="date-block">
            <Link href="/" className="icon-button secondary">
              <ArrowLeft aria-hidden="true" />
              <span>返回</span>
            </Link>
            <div>
              <p>Dog-Diary</p>
              <h1>日记详情</h1>
            </div>
          </div>
        </section>
        <p className="status-message">无法加载 {date} 的日记。该日期可能还没有记录。</p>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href={`/?date=${date}`} className="icon-button primary">
            <Edit3 aria-hidden="true" />
            <span>创建日记</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div className="date-block">
          <Link href="/" className="icon-button secondary" aria-label="返回今日页">
            <ArrowLeft aria-hidden="true" />
            <span>返回</span>
          </Link>
          <div>
            <p>Dog-Diary</p>
            <h1>{readableDate}</h1>
          </div>
        </div>
        <div className="actions">
          <Link href={`/?date=${date}`} className="icon-button secondary">
            <Edit3 aria-hidden="true" />
            <span>编辑</span>
          </Link>
          <a href={`/api/export?date=${date}`} className="icon-button secondary">
            <Download aria-hidden="true" />
            <span>导出</span>
          </a>
        </div>
      </section>

      <article className="entry-detail">
        {/* Meta chips */}
        <div className="entry-meta">
          {entry.mood && <span className="entry-meta-chip">心情: {entry.mood}</span>}
          {entry.energy !== null && <span className="entry-meta-chip">能量: {entry.energy}/10</span>}
          {entry.tags.map((t) => (
            <span key={t} className="entry-meta-chip">
              <Tag aria-hidden="true" /> {t}
            </span>
          ))}
          {waka && (
            <span className="entry-meta-chip">
              <Code2 aria-hidden="true" /> 编码数据
            </span>
          )}
          {weread && (
            <span className="entry-meta-chip">
              <BookOpen aria-hidden="true" /> 阅读数据
            </span>
          )}
        </div>

        {/* Markdown preview */}
        {hasContent ? (
          <div
            className="preview-panel"
            style={{ width: "100%", maxWidth: "100%" }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <p className="status-message">这一天还没有写内容。</p>
        )}

        {/* Prev / Next */}
        <div className="entry-prev-next">
          {prevDate ? (
            <Link href={`/entry/${prevDate}`} className="icon-button secondary">
              <ChevronLeft aria-hidden="true" />
              <span>{prevDate}</span>
            </Link>
          ) : (
            <span />
          )}
          {nextDate ? (
            <Link href={`/entry/${nextDate}`} className="icon-button secondary">
              <span>{nextDate}</span>
              <ChevronRight aria-hidden="true" />
            </Link>
          ) : (
            <span />
          )}
        </div>
      </article>
    </main>
  );
}
