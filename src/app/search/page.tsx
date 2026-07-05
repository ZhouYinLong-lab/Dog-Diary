"use client";

import {
  ArrowLeft,
  Code2,
  Filter,
  Loader2,
  Search,
  Tag,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DiaryEntry } from "@/lib/diary-types";

interface SearchResultItem {
  entry: DiaryEntry;
  hasWakatime: boolean;
  hasWeread: boolean;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query || !text) return text || "—";
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  let idx = lowerText.indexOf(lowerQuery, lastIndex);
  while (idx !== -1) {
    if (idx > lastIndex) {
      parts.push(text.slice(lastIndex, idx));
    }
    parts.push(
      <mark key={idx} className="search-highlight">
        {text.slice(idx, idx + query.length)}
      </mark>,
    );
    lastIndex = idx + query.length;
    idx = lowerText.indexOf(lowerQuery, lastIndex);
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? <>{parts}</> : text;
}

function snippet(text: string, query: string, maxLen = 160): string {
  if (!text) return "";
  if (!query) return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
  const lowerText = text.toLowerCase();
  const idx = lowerText.indexOf(query.toLowerCase());
  if (idx === -1) return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 120);
  let result = text.slice(start, end);
  if (start > 0) result = `…${result}`;
  if (end < text.length) result = `${result}…`;
  return result;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterMood, setFilterMood] = useState("");
  const [filterMinEnergy, setFilterMinEnergy] = useState("");
  const [filterMaxEnergy, setFilterMaxEnergy] = useState("");
  const [filterWaka, setFilterWaka] = useState("");

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((tags: string[]) => setAllTags(tags))
      .catch(() => {});
  }, []);

  const doSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim() && !filterFrom && !filterTo && !filterTag && !filterMood && !filterMinEnergy && !filterMaxEnergy && !filterWaka) {
        setResults([]);
        setStatus("idle");
        return;
      }

      setStatus("loading");
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      if (filterTag) params.set("tag", filterTag);
      if (filterMood) params.set("mood", filterMood);
      if (filterMinEnergy) params.set("minEnergy", filterMinEnergy);
      if (filterMaxEnergy) params.set("maxEnergy", filterMaxEnergy);
      if (filterWaka) params.set("hasWakatime", filterWaka);

      fetch(`/api/search?${params.toString()}`)
        .then((r) => r.json())
        .then((data: SearchResultItem[]) => {
          setResults(data);
          setStatus("ready");
        })
        .catch(() => setStatus("error"));
    },
    [filterFrom, filterTo, filterTag, filterMood, filterMinEnergy, filterMaxEnergy, filterWaka],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      doSearch(query);
    },
    [query, doSearch],
  );

  const clearFilters = useCallback(() => {
    setFilterFrom("");
    setFilterTo("");
    setFilterTag("");
    setFilterMood("");
    setFilterMinEnergy("");
    setFilterMaxEnergy("");
    setFilterWaka("");
  }, []);

  const hasFilters = filterFrom || filterTo || filterTag || filterMood || filterMinEnergy || filterMaxEnergy || filterWaka;

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
            <h1>搜索</h1>
          </div>
        </div>
      </section>

      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-input-row">
          <Search aria-hidden="true" className="search-icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索日记内容、标签、心情…"
            className="search-input"
            aria-label="搜索关键词"
          />
          <button type="submit" className="icon-button primary">
            <Search aria-hidden="true" />
            <span>搜索</span>
          </button>
          <button
            type="button"
            className={`icon-button secondary${hasFilters ? " has-filters" : ""}`}
            onClick={() => setShowFilters((f) => !f)}
          >
            <Filter aria-hidden="true" />
            <span>筛选{hasFilters ? " •" : ""}</span>
          </button>
        </div>

        {showFilters && (
          <div className="search-filters">
            <div className="filter-row">
              <label htmlFor="filter-from">
                <span>从</span>
                <input
                  id="filter-from"
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                />
              </label>
              <label htmlFor="filter-to">
                <span>到</span>
                <input
                  id="filter-to"
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                />
              </label>
              <label htmlFor="filter-tag">
                <span>标签</span>
                <select
                  id="filter-tag"
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                >
                  <option value="">全部</option>
                  {allTags.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="filter-row">
              <label htmlFor="filter-mood">
                <span>心情</span>
                <input
                  id="filter-mood"
                  type="text"
                  value={filterMood}
                  onChange={(e) => setFilterMood(e.target.value)}
                  placeholder="平静、充实…"
                />
              </label>
              <label htmlFor="filter-min-energy">
                <span>能量 ≥</span>
                <input
                  id="filter-min-energy"
                  type="number"
                  min="0"
                  max="10"
                  value={filterMinEnergy}
                  onChange={(e) => setFilterMinEnergy(e.target.value)}
                />
              </label>
              <label htmlFor="filter-max-energy">
                <span>≤</span>
                <input
                  id="filter-max-energy"
                  type="number"
                  min="0"
                  max="10"
                  value={filterMaxEnergy}
                  onChange={(e) => setFilterMaxEnergy(e.target.value)}
                />
              </label>
              <label htmlFor="filter-waka">
                <span>WakaTime</span>
                <select
                  id="filter-waka"
                  value={filterWaka}
                  onChange={(e) => setFilterWaka(e.target.value)}
                >
                  <option value="">不限</option>
                  <option value="true">有数据</option>
                  <option value="false">无数据</option>
                </select>
              </label>
            </div>
            <div className="filter-actions">
              <button type="button" className="icon-button secondary" onClick={clearFilters}>
                <X aria-hidden="true" />
                <span>清除筛选</span>
              </button>
              <button
                type="button"
                className="icon-button primary"
                onClick={() => doSearch(query)}
              >
                <Search aria-hidden="true" />
                <span>应用</span>
              </button>
            </div>
          </div>
        )}
      </form>

      <section className="search-results">
        {status === "loading" && <p className="status-message"><Loader2 aria-hidden="true" /> 搜索中…</p>}
        {status === "error" && <p className="status-message error">搜索失败</p>}
        {status === "idle" && <p className="status-message">输入关键词开始搜索</p>}
        {status === "ready" && results.length === 0 && (
          <p className="status-message">没有找到匹配的日记</p>
        )}
        {status === "ready" &&
          results.map((r) => {
            const { entry } = r;
            const contentFields = [
              { label: "发生了什么", text: entry.happened },
              { label: "我在想什么", text: entry.thoughts },
              { label: "Ideas", text: entry.ideas },
              { label: "身体与生活", text: entry.bodyLife },
              { label: "明天", text: entry.tomorrow },
            ].filter((f) => f.text.trim());

            return (
              <Link
                key={entry.date}
                href={`/entry/${entry.date}`}
                className="search-result-card"
              >
                <div className="search-result-header">
                  <time dateTime={entry.date} className="search-result-date">
                    {entry.date}
                  </time>
                  <div className="search-result-badges">
                    {entry.mood && <span className="search-badge mood">{entry.mood}</span>}
                    {entry.energy !== null && (
                      <span className="search-badge energy">能量 {entry.energy}</span>
                    )}
                    {r.hasWakatime && (
                      <span className="search-badge waka"><Code2 aria-hidden="true" /> 编码</span>
                    )}
                    {r.hasWeread && (
                      <span className="search-badge read">阅读</span>
                    )}
                  </div>
                </div>

                {entry.tags.length > 0 && (
                  <div className="search-result-tags">
                    {entry.tags.map((t) => (
                      <span key={t} className="search-tag-chip"><Tag aria-hidden="true" />{t}</span>
                    ))}
                  </div>
                )}

                <div className="search-result-snippets">
                  {contentFields.map((f) => {
                    const snip = snippet(f.text, query);
                    if (!snip) return null;
                    return (
                      <div key={f.label} className="search-snippet">
                        <span className="search-snippet-label">{f.label}: </span>
                        <span>{highlightText(snip, query)}</span>
                      </div>
                    );
                  })}
                </div>
              </Link>
            );
          })}
      </section>
    </main>
  );
}
