"use client";

import {
  ArrowLeft,
  CalendarDays,
  Filter,
  Tag,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DiaryEntry } from "@/lib/diary-types";

function contentPreview(entry: DiaryEntry): string {
  const parts = [entry.happened, entry.thoughts, entry.ideas, entry.bodyLife].filter(
    (s) => s.trim().length > 0,
  );
  if (parts.length === 0) return "—";
  const joined = parts.join(" ").replace(/\s+/g, " ");
  return joined.length > 120 ? `${joined.slice(0, 120)}…` : joined;
}

export default function TimelinePage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((tags: string[]) => setAllTags(tags))
      .catch(() => { /* non-critical */ });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const url = activeTag
      ? `/api/entries?tag=${encodeURIComponent(activeTag)}`
      : "/api/entries";
    fetch(url)
      .then((r) => r.json())
      .then((data: DiaryEntry[]) => {
        if (!cancelled) {
          setEntries(data);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => { cancelled = true; };
  }, [activeTag]);

  const moodLabel = useCallback((mood: string) => {
    if (!mood) return null;
    return mood;
  }, []);

  const energyBar = useCallback((energy: number | null) => {
    if (energy === null) return null;
    const pct = Math.min(100, Math.max(0, energy * 10));
    return (
      <span className="timeline-energy">
        <span className="timeline-energy-bar" style={{ width: `${pct}%` }} />
        <span>{energy}/10</span>
      </span>
    );
  }, []);

  const dayLink = useCallback((date: string) => `/entry/${date}`, []);

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
            <h1>时间线</h1>
          </div>
        </div>

        <div className="actions">
          {allTags.length > 0 && (
            <div className="tag-filter">
              <Filter aria-hidden="true" className="filter-icon" />
              <select
                value={activeTag}
                onChange={(e) => setActiveTag(e.target.value)}
                aria-label="按标签筛选"
              >
                <option value="">全部标签</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              {activeTag && (
                <button
                  type="button"
                  className="tag-clear"
                  onClick={() => setActiveTag("")}
                  aria-label="清除标签筛选"
                >
                  <X aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          <Link href="/calendar" className="icon-button secondary">
            <CalendarDays aria-hidden="true" />
            <span>月历</span>
          </Link>
        </div>
      </section>

      <section className="timeline-list">
        {status === "loading" && <p className="status-message">加载中…</p>}
        {status === "error" && <p className="status-message error">加载失败</p>}
        {status === "ready" && entries.length === 0 && (
          <p className="status-message">暂无日记，开始写今天的第一篇吧！</p>
        )}
        {status === "ready" &&
          entries.map((entry) => (
            <Link
              key={entry.date}
              href={dayLink(entry.date)}
              className="timeline-row"
            >
              <div className="timeline-row-header">
                <time dateTime={entry.date} className="timeline-date">
                  {entry.date}
                </time>
                {entry.mood && (
                  <span className="timeline-mood">{moodLabel(entry.mood)}</span>
                )}
                {energyBar(entry.energy)}
                {entry.tomorrow.trim() && (
                  <span className="timeline-tomorrow-badge" title="有明天计划">
                    计划
                  </span>
                )}
              </div>
              <p className="timeline-summary">{contentPreview(entry)}</p>
              {entry.tags.length > 0 && (
                <div className="timeline-tags">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="timeline-tag-chip">
                      <Tag aria-hidden="true" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
      </section>
    </main>
  );
}
