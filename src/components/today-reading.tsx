"use client";

import { BookOpen, Clock, Highlighter, PencilLine, History } from "lucide-react";
import { useEffect, useState } from "react";

interface TodayReadingBook {
  title: string;
  author: string;
  durationMinutes: number;
  highlights: number;
  notes: number;
}

interface ReadingDayData {
  hasData: boolean;
  books: TodayReadingBook[];
  totalDurationMinutes: number;
  totalHighlights: number;
  totalNotes: number;
}

interface TodayReadingResponse {
  date: string;
  today: ReadingDayData;
  yesterday: ReadingDayData & { date: string };
}

type Status = "loading" | "ready" | "error";

export function TodayReading({ date }: { date: string }) {
  const [data, setData] = useState<TodayReadingResponse | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch(`/api/reading/today?date=${date}`)
      .then((r) => r.json())
      .then((d: TodayReadingResponse) => {
        if (!cancelled) {
          setData(d);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  // Don't render anything while loading or if there's an error
  if (status === "loading" || status === "error") return null;

  // Don't render if neither today nor yesterday has data
  if (!data) return null;
  if (!data.today.hasData && !data.yesterday.hasData) return null;

  return (
    <section className="today-reading" aria-label="今日已读文章">
      {/* Today's reading */}
      {data.today.hasData ? (
        <div className="today-reading-block">
          <h2 className="today-reading-heading">
            <BookOpen aria-hidden="true" />
            今日已读
          </h2>
          <div className="today-reading-summary">
            <span className="today-reading-stat">
              <Clock aria-hidden="true" />
              {data.today.totalDurationMinutes} 分钟
            </span>
            {data.today.totalHighlights > 0 && (
              <span className="today-reading-stat">
                <Highlighter aria-hidden="true" />
                {data.today.totalHighlights} 划线
              </span>
            )}
            {data.today.totalNotes > 0 && (
              <span className="today-reading-stat">
                <PencilLine aria-hidden="true" />
                {data.today.totalNotes} 笔记
              </span>
            )}
          </div>
          <ul className="today-reading-book-list">
            {data.today.books.map((book) => (
              <li key={book.title} className="today-reading-book-item">
                <span className="today-reading-book-title">{book.title}</span>
                {book.author && (
                  <span className="today-reading-book-author">{book.author}</span>
                )}
                <span className="today-reading-book-meta">
                  {book.durationMinutes}分钟
                  {book.highlights > 0 && ` · ${book.highlights}划线`}
                  {book.notes > 0 && ` · ${book.notes}笔记`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="today-reading-block is-empty">
          <h2 className="today-reading-heading">
            <BookOpen aria-hidden="true" />
            今日已读
          </h2>
          <p className="today-reading-empty-text">今天还没有阅读记录</p>
        </div>
      )}

      {/* Yesterday's reading recap (verification) */}
      {data.yesterday.hasData && (
        <div className="today-reading-block yesterday-block">
          <h2 className="today-reading-heading yesterday-heading">
            <History aria-hidden="true" />
            昨日阅读回顾
          </h2>
          <div className="today-reading-summary">
            <span className="today-reading-stat">
              <Clock aria-hidden="true" />
              {data.yesterday.totalDurationMinutes} 分钟
            </span>
            {data.yesterday.totalHighlights > 0 && (
              <span className="today-reading-stat">
                <Highlighter aria-hidden="true" />
                {data.yesterday.totalHighlights} 划线
              </span>
            )}
            {data.yesterday.totalNotes > 0 && (
              <span className="today-reading-stat">
                <PencilLine aria-hidden="true" />
                {data.yesterday.totalNotes} 笔记
              </span>
            )}
          </div>
          <ul className="today-reading-book-list">
            {data.yesterday.books.map((book) => (
              <li key={book.title} className="today-reading-book-item">
                <span className="today-reading-book-title">{book.title}</span>
                {book.author && (
                  <span className="today-reading-book-author">{book.author}</span>
                )}
                <span className="today-reading-book-meta">
                  {book.durationMinutes}分钟
                  {book.highlights > 0 && ` · ${book.highlights}划线`}
                  {book.notes > 0 && ` · ${book.notes}笔记`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
