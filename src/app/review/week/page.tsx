"use client";

import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CalendarDays,
  Code2,
  Download,
  Hash,
  Loader2,
  Save,
  Smile,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { shiftIsoDate, todayIsoDate } from "@/lib/date-utils";

interface ReviewData {
  range: { start: string; end: string };
  totalDays: number;
  daysWritten: number;
  moods: string[];
  avgEnergy: number | null;
  topTags: Array<{ tag: string; count: number }>;
  wakatime: { totalSeconds: number; totalHours: number; daysWithData: number };
  weread: { totalDurationMinutes: number; totalHighlights: number; totalNotes: number; daysWithData: number };
  entries: Array<{ date: string; mood: string; energy: number | null; hasContent: boolean; hasTomorrow: boolean }>;
}

function mondayOf(date: string): string {
  const d = new Date(date + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function generateDraft(data: ReviewData): string {
  const lines = [
    `# 周复盘 ${data.range.start} ~ ${data.range.end}`,
    "",
    `本周写了 ${data.daysWritten} / ${data.totalDays} 天。`,
  ];

  if (data.avgEnergy !== null) {
    lines.push(`平均能量: ${data.avgEnergy} / 10`);
  }
  if (data.moods.length > 0) {
    const moodCounts = new Map<string, number>();
    for (const m of data.moods) {
      moodCounts.set(m, (moodCounts.get(m) || 0) + 1);
    }
    lines.push(`心情: ${Array.from(moodCounts.entries()).map(([m, c]) => `${m}×${c}`).join(", ")}`);
  }
  if (data.topTags.length > 0) {
    lines.push(`标签: ${data.topTags.map((t) => `${t.tag}×${t.count}`).join(", ")}`);
  }
  if (data.wakatime.daysWithData > 0) {
    lines.push(`编码: ${data.wakatime.totalHours} 小时 (${data.wakatime.daysWithData} 天)`);
  }
  if (data.weread.daysWithData > 0) {
    lines.push(`阅读: ${data.weread.totalDurationMinutes} 分钟 (${data.weread.daysWithData} 天)`);
  }

  lines.push("", "## 反思", "", "（在此写下本周的复盘思考…）");

  return lines.join("\n");
}

export default function WeekReviewPage() {
  const today = todayIsoDate();
  const [weekStart, setWeekStart] = useState(() => mondayOf(today));
  const [data, setData] = useState<ReviewData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [draft, setDraft] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [userEdited, setUserEdited] = useState(false);

  const weekEnd = useMemo(() => shiftIsoDate(weekStart, 6), [weekStart]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(async () => {
      if (cancelled) return;
      setDraft("");
      setUserEdited(false);

      try {
        // Fetch both in parallel
        const [reviewRes, recordRes] = await Promise.all([
          fetch(`/api/review?start=${weekStart}&end=${weekEnd}`),
          fetch(`/api/review/record?type=week&periodStart=${weekStart}`),
        ]);

        if (cancelled) return;
        const reviewData: ReviewData = await reviewRes.json();
        setData(reviewData);
        setStatus("ready");

        // Check for saved record
        const record: { content?: string } | null = await recordRes.json().catch(() => null);
        if (record?.content && !cancelled) {
          setDraft(record.content);
          setUserEdited(true);
        } else if (!cancelled) {
          // Auto-generate from data
          setDraft(generateDraft(reviewData));
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    });

    return () => { cancelled = true; };
  }, [weekStart, weekEnd]);

  function saveReview() {
    setSaveStatus("saving");
    fetch("/api/review/record", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "week",
        periodStart: weekStart,
        periodEnd: weekEnd,
        content: draft,
      }),
    })
      .then(() => {
        setSaveStatus("saved");
        window.setTimeout(() => setSaveStatus("idle"), 1200);
      })
      .catch(() => setSaveStatus("error"));
  }

  function prevWeek() { setWeekStart((s) => shiftIsoDate(s, -7)); }
  function nextWeek() { setWeekStart((s) => shiftIsoDate(s, 7)); }

  function exportReview() {
    window.location.href = `/api/export/review?type=week&period=${weekStart}`;
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
            <h1>周复盘</h1>
          </div>
        </div>
        <div className="actions">
          <button type="button" className="icon-button secondary" onClick={exportReview}>
            <Download aria-hidden="true" />
            <span>导出</span>
          </button>
          <button type="button" className="icon-button primary" onClick={saveReview}>
            {saveStatus === "saving" ? <Loader2 aria-hidden="true" /> : <Save aria-hidden="true" />}
            <span>保存复盘</span>
          </button>
          <Link href="/review/month" className="icon-button secondary">
            <CalendarDays aria-hidden="true" />
            <span>月复盘</span>
          </Link>
        </div>
      </section>

      <div className="review-selector">
        <button type="button" className="icon-button secondary" onClick={prevWeek}>← 上一周</button>
        <span>{weekStart} ~ {weekEnd}</span>
        <button type="button" className="icon-button secondary" onClick={nextWeek}>下一周 →</button>
      </div>

      {status === "loading" && <p className="status-message"><Loader2 aria-hidden="true" /> 加载中…</p>}
      {status === "error" && <p className="status-message error">加载失败</p>}
      {status === "ready" && data && (
        <section className="review-summary">
          <div className="review-card">
            <h2><BarChart3 aria-hidden="true" />概览</h2>
            <div className="review-stat-row">
              <span className="review-stat-label">本周日记数</span>
              <span className="review-stat-value">{data.daysWritten} / {data.totalDays} 天</span>
            </div>
            {data.avgEnergy !== null && (
              <div className="review-stat-row">
                <span className="review-stat-label">平均能量</span>
                <span className="review-stat-value">{data.avgEnergy} / 10</span>
              </div>
            )}
            {data.moods.length > 0 && (
              <div className="review-stat-row">
                <span className="review-stat-label">心情记录</span>
                <span className="review-stat-value">{data.moods.join("、")}</span>
              </div>
            )}
          </div>

          {data.topTags.length > 0 && (
            <div className="review-card">
              <h2><Hash aria-hidden="true" />标签</h2>
              <div className="review-tag-list">
                {data.topTags.map((t) => (
                  <span key={t.tag} className="review-tag-chip">{t.tag} ×{t.count}</span>
                ))}
              </div>
            </div>
          )}

          {data.wakatime.daysWithData > 0 && (
            <div className="review-card">
              <h2><Code2 aria-hidden="true" />编码</h2>
              <div className="review-stat-row">
                <span className="review-stat-label">总编码时长</span>
                <span className="review-stat-value">{data.wakatime.totalHours} 小时</span>
              </div>
              <div className="review-stat-row">
                <span className="review-stat-label">有数据天数</span>
                <span className="review-stat-value">{data.wakatime.daysWithData} 天</span>
              </div>
            </div>
          )}

          {data.weread.daysWithData > 0 && (
            <div className="review-card">
              <h2><BookOpen aria-hidden="true" />阅读</h2>
              <div className="review-stat-row">
                <span className="review-stat-label">总阅读时长</span>
                <span className="review-stat-value">{data.weread.totalDurationMinutes} 分钟</span>
              </div>
            </div>
          )}

          {/* Draft editor */}
          <div className="review-card">
            <h2><Smile aria-hidden="true" />复盘草稿</h2>
            <p className="hint" style={{ marginTop: 0 }}>
              {userEdited ? "已保存" : "自动生成草稿，可自由编辑"}
            </p>
            <textarea
              className="diary-field review-editor"
              rows={16}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setUserEdited(true);
              }}
              aria-label="复盘草稿编辑"
              style={{ width: "100%", fontSize: "14px", lineHeight: 1.6 }}
            />
          </div>

          <div className="review-card">
            <h2><Smile aria-hidden="true" />每日摘要</h2>
            {data.entries.filter((e) => e.hasContent).length === 0 && (
              <p className="review-empty">本周暂无日记内容</p>
            )}
            {data.entries.filter((e) => e.hasContent).map((e) => (
              <div key={e.date} className="review-stat-row">
                <Link href={`/entry/${e.date}`} style={{ border: "none", padding: "4px 0", textDecoration: "none", color: "inherit" }}>
                  <span className="review-stat-label">{e.date.slice(5)}</span>
                </Link>
                <span className="review-stat-value">
                  {[e.mood, e.energy !== null ? `能量${e.energy}` : "", e.hasTomorrow ? "有计划" : ""]
                    .filter(Boolean).join(" · ") || "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
