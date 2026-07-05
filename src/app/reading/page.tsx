"use client";

import { faArrowLeft, faBookOpen, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";

interface BookData {
  title: string; author: string;
  totalMinutes: number; totalHighlights: number; totalNotes: number;
  dates: string[]; latestDate: string;
}

interface ReadingData { books: BookData[]; totalReadingMinutes: number; totalHighlights: number; totalNotes: number; }

export default function ReadingPage() {
  const [data, setData] = useState<ReadingData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reading")
      .then((r) => r.json())
      .then((d: ReadingData) => { if (!cancelled) { setData(d); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!query.trim()) return data.books;
    const q = query.toLowerCase();
    return data.books.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
  }, [data, query]);

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
            <h1>阅读库</h1>
          </div>
        </div>
      </section>

      {status === "loading" && <p className="status-message">加载中…</p>}
      {status === "error" && <p className="status-message error">加载失败</p>}
      {status === "ready" && data && (
        <>
          {data.books.length > 0 && (
            <div className="search-form" style={{ marginBottom: 16 }}>
              <div className="search-input-row">
                <Icon faIcon={faMagnifyingGlass} size={18} decorative />
                <input type="text" className="search-input" placeholder="搜索书名或作者…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="搜索书籍" />
              </div>
            </div>
          )}

          <div className="reading-stats-bar">
            <span>共 {data.books.length} 本书</span>
            <span>{data.totalReadingMinutes} 分钟阅读</span>
            {data.totalHighlights > 0 && <span>{data.totalHighlights} 条划线</span>}
            {data.totalNotes > 0 && <span>{data.totalNotes} 条笔记</span>}
          </div>

          {filtered.length === 0 && (
            <p className="status-message">
              {data.books.length === 0 ? "还没有导入阅读数据。去设置页导入微信读书 JSON。" : "没有匹配的书籍"}
            </p>
          )}

          <div className="reading-book-list">
            {filtered.map((book) => (
              <div key={book.title} className="reading-book-card">
                <div className="reading-book-header">
                  <Icon faIcon={faBookOpen} size={18} decorative />
                  <h3>{book.title}</h3>
                  {book.author && <span className="reading-book-author">{book.author}</span>}
                  <span className="reading-book-date">最近: {book.latestDate}</span>
                </div>
                <div className="reading-book-stats">
                  <span>{book.totalMinutes} 分钟</span>
                  {book.totalHighlights > 0 && <span>{book.totalHighlights} 划线</span>}
                  {book.totalNotes > 0 && <span>{book.totalNotes} 笔记</span>}
                  <span>阅读 {book.dates.length} 天</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
