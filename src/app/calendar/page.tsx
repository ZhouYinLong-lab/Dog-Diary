"use client";

import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { todayIsoDate } from "@/lib/date-utils";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export default function CalendarPage() {
  const today = todayIsoDate();
  const [viewYear, setViewYear] = useState(() => Number(today.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(today.slice(5, 7)));
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const calendar = useMemo(() => {
    const firstDay = new Date(Date.UTC(viewYear, viewMonth - 1, 1));
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
    // Day of week: 0=Sun, we want Mon=0
    const startDow = (firstDay.getUTCDay() + 6) % 7;

    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) {
      currentWeek.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }
    return weeks;
  }, [viewYear, viewMonth]);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/entries/active-dates?year=${viewYear}&month=${viewMonth}`,
    )
      .then((r) => r.json())
      .then((dates: string[]) => {
        if (!cancelled) {
          setActiveDates(new Set(dates));
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => { cancelled = true; };
  }, [viewYear, viewMonth]);

  const prevMonth = useCallback(() => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  const monthLabel = `${viewYear}年${viewMonth}月`;
  const activeCount = activeDates.size;

  function dateIso(day: number) {
    return `${String(viewYear).padStart(4, "0")}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const isToday = (day: number) => dateIso(day) === today;

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
            <h1>月历</h1>
          </div>
        </div>

        <div className="actions">
          <Link href="/timeline" className="icon-button secondary">
            <CalendarDays aria-hidden="true" />
            <span>时间线</span>
          </Link>
        </div>
      </section>

      <section className="calendar-nav">
        <button type="button" className="icon-button secondary" onClick={prevMonth} aria-label="上一月">
          <ChevronLeft aria-hidden="true" />
        </button>
        <h2 className="calendar-month-label">{monthLabel}</h2>
        <button type="button" className="icon-button secondary" onClick={nextMonth} aria-label="下一月">
          <ChevronRight aria-hidden="true" />
        </button>
        <p className="calendar-count">
          {status === "loading" ? "加载中…" : `${activeCount} 天有记录`}
        </p>
      </section>

      <section className="calendar-grid" aria-label={`${viewYear}年${viewMonth}月 日历`}>
        <div className="calendar-header-row">
          {WEEKDAYS.map((d) => (
            <div key={d} className="calendar-header-cell">
              {d}
            </div>
          ))}
        </div>
        {calendar.map((week, wi) => (
          <div key={wi} className="calendar-week-row">
            {week.map((day, di) => {
              if (day === null) {
                return <div key={`e-${di}`} className="calendar-cell empty" />;
              }
              const date = dateIso(day);
              const hasContent = activeDates.has(date);
              const todayClass = isToday(day) ? " today" : "";
              return (
                <Link
                  key={date}
                  href={`/entry/${date}`}
                  className={`calendar-cell${hasContent ? " has-content" : ""}${todayClass}`}
                  aria-label={`${date}${hasContent ? " 有日记" : ""}${isToday(day) ? " 今天" : ""}`}
                >
                  <span className="calendar-day-num">{day}</span>
                  {hasContent && <span className="calendar-dot" aria-hidden="true" />}
                </Link>
              );
            })}
          </div>
        ))}
      </section>
    </main>
  );
}
