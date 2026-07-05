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
import { todayIsoDate } from "@/lib/date-utils";

interface ReviewData {
  range: { start: string; end: string };
  totalDays: number;
  daysWritten: number;
  moods: string[];
  avgEnergy: number | null;
  energyValues: number[];
  topTags: Array<{ tag: string; count: number }>;
  wakatime: { totalSeconds: number; totalHours: number; daysWithData: number };
  weread: { totalDurationMinutes: number; totalHighlights: number; totalNotes: number; daysWithData: number };
  entries: Array<{ date: string; mood: string; energy: number | null; hasContent: boolean; hasTomorrow: boolean }>;
}

function generateDraft(data: ReviewData, year: number, month: number): string {
  const lines = [
    `# 月复盘 ${year}年${month}月`,
    "",
    `本月写了 ${data.daysWritten} / ${data.totalDays} 天。`,
  ];

  if (data.avgEnergy !== null) {
    lines.push(`平均能量: ${data.avgEnergy} / 10`);
    if (data.energyValues.length > 1) {
      lines.push(`能量趋势: ${data.energyValues.join(" → ")}`);
    }
  }
  if (data.moods.length > 0) {
    const moodSet = new Set(data.moods);
    lines.push(`心情: ${Array.from(moodSet).join("、")}`);
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

  lines.push("", "## 反思", "", "（在此写下本月的复盘思考…）");

  return lines.join("\n");
}

export default function MonthReviewPage() {
  const today = todayIsoDate();
  const [viewYear, setViewYear] = useState(() => Number(today.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(today.slice(5, 7)));
  const [data, setData] = useState<ReviewData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [draft, setDraft] = useState("");
  const [userEdited, setUserEdited] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const monthStart = useMemo(
    () => `${String(viewYear).padStart(4, "0")}-${String(viewMonth).padStart(2, "0")}-01`,
    [viewYear, viewMonth],
  );
  const monthEnd = useMemo(() => {
    const lastDay = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
    return `${String(viewYear).padStart(4, "0")}-${String(viewMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  }, [viewYear, viewMonth]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(async () => {
      if (cancelled) return;
      setDraft("");
      setUserEdited(false);

      try {
        const [reviewRes, recordRes] = await Promise.all([
          fetch(`/api/review?start=${monthStart}&end=${monthEnd}`),
          fetch(`/api/review/record?type=month&periodStart=${monthStart}`),
        ]);

        if (cancelled) return;
        const reviewData: ReviewData = await reviewRes.json();
        setData(reviewData);
        setStatus("ready");

        const record: { content?: string } | null = await recordRes.json().catch(() => null);
        if (record?.content && !cancelled) {
          setDraft(record.content);
          setUserEdited(true);
        } else if (!cancelled) {
          setDraft(generateDraft(reviewData, viewYear, viewMonth));
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    });

    return () => { cancelled = true; };
  }, [monthStart, monthEnd, viewYear, viewMonth]);

  function saveReview() {
    setSaveStatus("saving");
    fetch("/api/review/record", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "month",
        periodStart: monthStart,
        periodEnd: monthEnd,
        content: draft,
      }),
    })
      .then(() => {
        setSaveStatus("saved");
        window.setTimeout(() => setSaveStatus("idle"), 1200);
      })
      .catch(() => setSaveStatus("error"));
  }

  function prevMonth() {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); }
    else { setViewMonth((m) => m - 1); }
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); }
    else { setViewMonth((m) => m + 1); }
  }

  function exportReview() {
    window.location.href = `/api/export/review?type=month&period=${monthStart}`;
  }

  const monthLabel = `${viewYear}年${viewMonth}月`;

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
            <h1>月复盘</h1>
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
          <Link href="/review/week" className="icon-button secondary">
            <CalendarDays aria-hidden="true" />
            <span>周复盘</span>
          </Link>
        </div>
      </section>

      <div className="review-selector">
        <button type="button" className="icon-button secondary" onClick={prevMonth}>← 上一月</button>
        <span>{monthLabel}</span>
        <button type="button" className="icon-button secondary" onClick={nextMonth}>下一月 →</button>
      </div>

      {status === "loading" && <p className="status-message"><Loader2 aria-hidden="true" /> 加载中…</p>}
      {status === "error" && <p className="status-message error">加载失败</p>}
      {status === "ready" && data && (
        <section className="review-summary">
          <div className="review-card">
            <h2><BarChart3 aria-hidden="true" />概览</h2>
            <div className="review-stat-row">
              <span className="review-stat-label">本月日记数</span>
              <span className="review-stat-value">{data.daysWritten} / {data.totalDays} 天</span>
            </div>
            {data.avgEnergy !== null && (
              <>
                <div className="review-stat-row">
                  <span className="review-stat-label">平均能量</span>
                  <span className="review-stat-value">{data.avgEnergy} / 10</span>
                </div>
                <div className="review-stat-row">
                  <span className="review-stat-label">能量趋势</span>
                  <span className="review-stat-value">{data.energyValues.join(" → ")}</span>
                </div>
              </>
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
              {userEdited ? "已加载保存的版本" : "自动生成草稿，可自由编辑"}
            </p>
            <textarea
              rows={16}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setUserEdited(true);
              }}
              aria-label="复盘草稿编辑"
              style={{
                width: "100%",
                fontSize: "14px",
                lineHeight: 1.6,
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                padding: "12px",
                background: "var(--color-panel)",
                color: "var(--color-text)",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>
        </section>
      )}
    </main>
  );
}
