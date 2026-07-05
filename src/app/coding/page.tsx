"use client";

import { faArrowLeft, faCode } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

interface CodingData {
  grandTotalHours: number; snapshotsCount: number; lastSync: string | null;
  projects: Array<{ name: string; totalHours: number; daysActive: number; percent: number }>;
  languages: Array<{ name: string; totalHours: number; percent: number }>;
}

export default function CodingPage() {
  const [data, setData] = useState<CodingData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/coding")
      .then((r) => r.json())
      .then((d: CodingData) => { if (!cancelled) { setData(d); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, []);

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
            <h1>编码</h1>
          </div>
        </div>
      </section>

      {status === "loading" && <p className="status-message">加载中…</p>}
      {status === "error" && <p className="status-message error">加载失败</p>}
      {status === "ready" && data && (
        <>
          <div className="reading-stats-bar">
            <span>{data.grandTotalHours} 小时总编码</span>
            <span>{data.snapshotsCount} 天有数据</span>
            {data.lastSync && <span>最近: {data.lastSync}</span>}
          </div>

          {data.snapshotsCount === 0 && (
            <p className="status-message">还没有 WakaTime 数据。去设置页配置 API Key。</p>
          )}

          {data.projects.length > 0 && (
            <div className="review-card">
              <h2><Icon faIcon={faCode} size={18} decorative />项目</h2>
              <div className="bar-list">
                {data.projects.map((p) => (
                  <div key={p.name} className="bar-row">
                    <span className="bar-label">{p.name}</span>
                    <span className="bar-track">
                      <span className="bar-fill code" style={{ width: `${Math.min(100, p.percent)}%` }} />
                    </span>
                    <span className="bar-count">{p.totalHours}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.languages.length > 0 && (
            <div className="review-card">
              <h2>语言</h2>
              <div className="bar-list">
                {data.languages.map((l) => (
                  <div key={l.name} className="bar-row">
                    <span className="bar-label">{l.name}</span>
                    <span className="bar-track">
                      <span className="bar-fill lang" style={{ width: `${Math.min(100, l.percent)}%` }} />
                    </span>
                    <span className="bar-count">{l.totalHours}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
