"use client";

import { faArrowLeft, faChartSimple } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

interface InsightsData {
  range: { start: string; end: string };
  daysWritten: number; totalDays: number;
  streak: number; avgEnergy: number | null;
  topMoods: Array<{ mood: string; count: number }>;
  topTags: Array<{ tag: string; count: number }>;
  wakatimeTotalHours: number;
  wereadTotalMinutes: number;
  energyTrend: Array<{ date: string; energy: number }>;
}

export default function InsightsPage() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<InsightsData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/insights?days=${range}`)
      .then((r) => r.json())
      .then((d: InsightsData) => {
        if (!cancelled) { setData(d); setStatus("ready"); }
      })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [range]);

  return (
    <main className="app-shell">
      <section className="topbar">
        <div className="date-block">
          <Link href="/" className="icon-button secondary" aria-label="返回今日页">
            <Icon faIcon={faArrowLeft} size={18} decorative />
            <span>返回</span>
          </Link>
          <div>
            <p>Dog-Diary</p>
            <h1>洞察</h1>
          </div>
        </div>
        <div className="actions">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button"
              className={`icon-button ${range === d ? "primary" : "secondary"}`}
              onClick={() => setRange(d)}>
              {d} 天
            </button>
          ))}
        </div>
      </section>

      {status === "loading" && <p className="status-message">加载中…</p>}
      {status === "error" && <p className="status-message error">加载失败</p>}
      {status === "ready" && data && (
        <section className="review-summary">
          <div className="insights-grid">
            <div className="insight-card">
              <span className="insight-value">{data.daysWritten}</span>
              <span className="insight-label">写日记天数 / {data.totalDays}</span>
            </div>
            <div className="insight-card">
              <span className="insight-value">{data.streak}</span>
              <span className="insight-label">连续记录天数</span>
            </div>
            {data.avgEnergy !== null && (
              <div className="insight-card">
                <span className="insight-value">{data.avgEnergy}</span>
                <span className="insight-label">平均能量</span>
              </div>
            )}
            <div className="insight-card">
              <span className="insight-value">{data.wakatimeTotalHours}h</span>
              <span className="insight-label">总编码时长</span>
            </div>
            <div className="insight-card">
              <span className="insight-value">{data.wereadTotalMinutes}min</span>
              <span className="insight-label">总阅读时长</span>
            </div>
          </div>

          {data.topMoods.length > 0 && (
            <div className="review-card">
              <h2><Icon faIcon={faChartSimple} size={18} decorative />常见心情</h2>
              <div className="bar-list">
                {data.topMoods.map((m) => (
                  <div key={m.mood} className="bar-row">
                    <span className="bar-label">{m.mood}</span>
                    <span className="bar-track">
                      <span className="bar-fill" style={{ width: `${Math.min(100, (m.count / Math.max(...data.topMoods.map(x => x.count))) * 100)}%` }} />
                    </span>
                    <span className="bar-count">{m.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.topTags.length > 0 && (
            <div className="review-card">
              <h2>Top 标签</h2>
              <div className="review-tag-list">
                {data.topTags.map((t) => (
                  <span key={t.tag} className="review-tag-chip">{t.tag} ×{t.count}</span>
                ))}
              </div>
            </div>
          )}

          {data.energyTrend.length > 1 && (
            <div className="review-card">
              <h2>能量趋势</h2>
              <div className="bar-list">
                {data.energyTrend.map((e) => (
                  <div key={e.date} className="bar-row">
                    <span className="bar-label">{e.date.slice(5)}</span>
                    <span className="bar-track">
                      <span className="bar-fill energy" style={{ width: `${e.energy * 10}%` }} />
                    </span>
                    <span className="bar-count">{e.energy}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.daysWritten === 0 && (
            <p className="status-message">暂无数据。开始写日记后这里会出现你的趋势。</p>
          )}
        </section>
      )}
    </main>
  );
}
