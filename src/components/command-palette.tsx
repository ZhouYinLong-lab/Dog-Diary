"use client";

import {
  faArrowRotateRight,
  faArrowTrendUp,
  faCalendarDays,
  faFileLines,
  faHouse,
  faListUl,
  faMagnifyingGlass,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shiftIsoDate, todayIsoDate } from "@/lib/date-utils";
import { Icon } from "@/components/ui/icon";

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  keys?: string;
  action: () => void;
  group: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const today = todayIsoDate();

  const commands = useMemo<Command[]>(() => {
    const base: Command[] = [
      { id: "today", label: "今日", icon: <Icon faIcon={faHouse} size={18} decorative />, keys: "Ctrl+H", group: "页面", action: () => router.push("/") },
      { id: "timeline", label: "时间线", icon: <Icon faIcon={faListUl} size={18} decorative />, group: "页面", action: () => router.push("/timeline") },
      { id: "calendar", label: "月历", icon: <Icon faIcon={faCalendarDays} size={18} decorative />, group: "页面", action: () => router.push("/calendar") },
      { id: "search", label: "搜索", icon: <Icon faIcon={faMagnifyingGlass} size={18} decorative />, group: "页面", action: () => router.push("/search") },
      { id: "settings", label: "设置", icon: <Icon faIcon={faSliders} size={18} decorative />, group: "页面", action: () => router.push("/settings") },
      { id: "review-week", label: "周复盘", icon: <Icon faIcon={faArrowRotateRight} size={18} decorative />, group: "复盘", action: () => router.push("/review/week") },
      { id: "review-month", label: "月复盘", icon: <Icon faIcon={faArrowTrendUp} size={18} decorative />, group: "复盘", action: () => router.push("/review/month") },
    ];

    // Recent 7 days
    for (let i = 1; i <= 7; i++) {
      const d = shiftIsoDate(today, -i);
      base.push({
        id: `day-${d}`,
        label: `查看 ${d}`,
        icon: <Icon faIcon={faFileLines} size={18} decorative />,
        group: "最近日期",
        action: () => router.push(`/entry/${d}`),
      });
    }

    return base;
  }, [router, today]);

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return commands;

    // Date jump: if query looks like a date, add a jump option
    const dateMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (dateMatch) {
      const jumpDate = dateMatch[1];
      const dateCmd: Command = {
        id: `jump-${jumpDate}`,
        label: `跳转到 ${jumpDate}`,
        icon: <Icon faIcon={faFileLines} size={18} decorative />,
        group: "跳转",
        action: () => router.push(`/entry/${jumpDate}`),
      };
      return [dateCmd];
    }

    // Quick create task if query starts with "task" or "todo"
    if (trimmed.length >= 3) {
      const taskCmd: Command = {
        id: `task-${trimmed}`,
        label: `创建今日任务: ${trimmed}`,
        icon: <Icon faIcon={faFileLines} size={18} decorative />,
        group: "快速操作",
        action: () => router.push(`/`),
      };
      const q = trimmed.toLowerCase();
      const filteredCmds = commands.filter((c) => c.label.toLowerCase().includes(q));
      return [...filteredCmds, taskCmd];
    }

    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query, router]);

  // Reset selection when filter changes
  const filteredLen = filtered.length;
  useEffect(() => {
    if (selectedIdx >= filteredLen) {
      Promise.resolve().then(() => {
        setSelectedIdx(Math.max(0, filteredLen - 1));
      });
    }
  }, [filteredLen, selectedIdx]);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        // Don't prevent default here, let the dialog handle it
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setQuery("");
        setSelectedIdx(0);
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[selectedIdx];
        if (cmd) {
          cmd.action();
          setOpen(false);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    },
    [filtered, selectedIdx],
  );

  const groups = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of filtered) {
      const list = map.get(cmd.group) || [];
      list.push(cmd);
      map.set(cmd.group, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (!open) return null;

  return (
    <div
      className="command-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="命令面板"
    >
      <div className="command-panel">
        <input
          ref={inputRef}
          className="command-input"
          type="text"
          placeholder="输入命令…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="搜索命令"
        />
        <div className="command-list">
          {groups.map(([group, cmds]) => (
            <div key={group}>
              <div className="command-group-label">{group}</div>
              {cmds.map((cmd) => {
                const globalIdx = filtered.indexOf(cmd);
                return (
                  <div
                    key={cmd.id}
                    className={`command-item${globalIdx === selectedIdx ? " selected" : ""}`}
                    onClick={() => {
                      cmd.action();
                      setOpen(false);
                    }}
                    role="option"
                    aria-selected={globalIdx === selectedIdx}
                  >
                    {cmd.icon}
                    <span>{cmd.label}</span>
                    {cmd.keys && <span className="cmd-keys">{cmd.keys}</span>}
                  </div>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="command-item" style={{ color: "var(--color-muted)" }}>
              没有匹配的命令
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
