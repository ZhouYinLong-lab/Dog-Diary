"use client";

import {
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle,
  Clock,
  Code2,
  Download,
  Eye,
  EyeOff,
  Key,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Tag,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDisplayDate, shiftIsoDate, todayIsoDate } from "@/lib/date-utils";
import { buildDiaryMarkdown } from "@/lib/markdown";
import type { ApiSnapshot, DailyPayload, DiaryEntry } from "@/lib/diary-types";
import { TodayReading } from "@/components/today-reading";

type Status = "idle" | "loading" | "saving" | "saved" | "error";

const blankEntry: DiaryEntry = {
  date: todayIsoDate(),
  happened: "",
  thoughts: "",
  ideas: "",
  bodyLife: "",
  yesterdayPlan: "",
  tomorrow: "",
  tags: [],
  mood: "",
  energy: null,
  createdAt: "",
  updatedAt: "",
};

function Field({
  id,
  label,
  value,
  rows = 5,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="diary-field" htmlFor={id}>
      <span>{label}</span>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function TodayWorkspace() {
  const searchParams = useSearchParams();

  const initialDate = useMemo(() => {
    const param = searchParams.get("date");
    if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) return param;
    return todayIsoDate();
  }, [searchParams]);

  const [date, setDate] = useState(initialDate);
  const [entry, setEntry] = useState<DiaryEntry>(blankEntry);
  const [payload, setPayload] = useState<DailyPayload | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [tagInput, setTagInput] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [recentDays, setRecentDays] = useState<DiaryEntry[]>([]);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false); // for logic access in callbacks
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tasks
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; status: string; source: string }>>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const fetchTasks = useCallback(() => {
    fetch(`/api/tasks?date=${date}&carry=true`)
      .then((r) => r.json())
      .then((data: { tasks: Array<{ id: string; title: string; status: string; source: string }>; carried: number }) => {
        setTasks(data.tasks);
      })
      .catch(() => {});
  }, [date]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  function addTask() {
    if (!newTaskTitle.trim()) return;
    fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, title: newTaskTitle.trim() }),
    })
      .then((r) => r.json())
      .then(() => {
        setNewTaskTitle("");
        fetchTasks();
      })
      .catch(() => {});
  }

  function toggleTask(id: string, currentStatus: string) {
    const next = currentStatus === "done" ? "planned" : "done";
    fetch("/api/tasks", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    })
      .then((r) => r.json())
      .then(() => fetchTasks())
      .catch(() => {});
  }

  function skipTask(id: string) {
    fetch("/api/tasks", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status: "skipped" }),
    })
      .then((r) => r.json())
      .then(() => fetchTasks())
      .catch(() => {});
  }

  function removeTask(id: string) {
    fetch(`/api/tasks?id=${id}`, { method: "DELETE" })
      .then(() => fetchTasks())
      .catch(() => {});
  }

  function convertPlanToTasks() {
    const planText = entry.yesterdayPlan;
    if (!planText.trim()) return;
    const lines = planText
      .split(/[\n,，、]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
    Promise.all(
      lines.map((title) =>
        fetch("/api/tasks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ date, title, source: "yesterday" }),
        }),
      ),
    ).then(() => fetchTasks());
  }
  const currentDateRef = useRef(date);

  const markDirty = useCallback((value: boolean) => {
    dirtyRef.current = value;
    setDirty(value);
  }, []);

  useEffect(() => {
    currentDateRef.current = date;
  }, [date]);

  /* ── Fetch entry ── */
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/diary?date=${date}`)
      .then((response) => response.json())
      .then((data: DailyPayload) => {
        if (!cancelled) {
          setPayload(data);
          setEntry(data.entry);
          setTagInput(data.entry.tags.join(", "));
          setStatus("idle");
          setShowPreview(false);
          markDirty(false);
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [date, markDirty]);

  /* ── Recent 7 days ── */
  useEffect(() => {
    const dates = Array.from({ length: 7 }, (_, i) => shiftIsoDate(date, -(i + 1)));
    fetch(
      `/api/entries/batch?dates=${dates.join(",")}`,
    )
      .then((r) => r.json())
      .then((data: DiaryEntry[]) => setRecentDays(data))
      .catch(() => { /* non-critical */ });
  }, [date]);

  /* ── Auto-save debounce ── */
  const doSave = useCallback(
    async (entryToSave: DiaryEntry) => {
      setStatus("saving");
      try {
        const response = await fetch("/api/diary", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(entryToSave),
        });
        const data = (await response.json()) as { entry: DiaryEntry };
        setEntry(data.entry);
        setStatus("saved");
        markDirty(false);
        window.setTimeout(() => {
          setStatus("idle");
        }, 1200);
      } catch {
        setStatus("error");
      }
    },
    [markDirty],
  );

  const scheduleSave = useCallback(
    (next: DiaryEntry) => {
      markDirty(true);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (currentDateRef.current === next.date) {
          doSave(next);
        }
      }, 2000);
    },
    [doSave, markDirty],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Ctrl/Cmd+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        doSave(entry);
      }
      // Ctrl/Cmd+E: Export
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        e.preventDefault();
        window.location.href = `/api/export?date=${date}`;
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [entry, doSave, date]);

  /* ── Unsaved changes protection ── */
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  /* ── Handlers ── */
  const readableDate = useMemo(() => formatDisplayDate(date), [date]);
  const apiSnapshots = useMemo(() => payload?.snapshots ?? [], [payload]);
  const hasWakaTime = apiSnapshots.some((snapshot) => snapshot.provider === "wakatime");
  const hasWeRead = apiSnapshots.some((snapshot) => snapshot.provider === "weread");
  const previewMd = useMemo(
    () => buildDiaryMarkdown(entry, apiSnapshots),
    [entry, apiSnapshots],
  );

  function patchEntry(next: Partial<DiaryEntry>) {
    setEntry((current) => {
      const updated = { ...current, ...next };
      scheduleSave(updated);
      return updated;
    });
  }

  function handleTagsChange(raw: string) {
    setTagInput(raw);
    const tags = raw
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    patchEntry({ tags });
  }

  function removeTag(index: number) {
    const next = entry.tags.filter((_, i) => i !== index);
    setTagInput(next.join(", "));
    patchEntry({ tags: next });
  }

  function exportMarkdown() {
    window.location.href = `/api/export?date=${date}`;
  }

  function changeDate(value: string) {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      if (dirtyRef.current) doSave(entry);
    }
    setStatus("loading");
    setDate(value);
  }

  function navigateDay(offset: number) {
    changeDate(shiftIsoDate(date, offset));
  }

  const isToday = date === todayIsoDate();

  return (
    <main className="app-shell">
      {/* ── Top Bar ── */}
      <section className="topbar" aria-label="日期与操作">
        <div className="date-block">
          <CalendarDays aria-hidden="true" />
          <div>
            <p>Dog-Diary</p>
            <h1>{readableDate}</h1>
          </div>
        </div>

        <div className="actions">
          <Link href="/timeline" className="icon-button secondary">
            <List aria-hidden="true" />
            <span>时间线</span>
          </Link>
          <Link href="/calendar" className="icon-button secondary">
            <CalendarDays aria-hidden="true" />
            <span>月历</span>
          </Link>
          <label htmlFor="entry-date" className="sr-only">日期</label>
          <input
            id="entry-date"
            type="date"
            value={date}
            onChange={(event) => changeDate(event.target.value)}
          />
          <button
            type="button"
            className="icon-button secondary"
            onClick={() => setShowPreview((p) => !p)}
          >
            {showPreview ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            <span>{showPreview ? "编辑" : "预览"}</span>
          </button>
          <button type="button" className="icon-button secondary" onClick={exportMarkdown}>
            <Download aria-hidden="true" />
            <span>导出</span>
          </button>
          <button
            type="button"
            className="icon-button primary"
            onClick={() => doSave(entry)}
            disabled={status === "saving"}
          >
            {status === "saving" ? <Loader2 aria-hidden="true" /> : <Save aria-hidden="true" />}
            <span>保存</span>
          </button>
        </div>
      </section>

      <section className="workspace">
        {/* ── Main Panel ── */}
        {showPreview ? (
          <article
            className="preview-panel"
            aria-label="Markdown 预览"
            dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(previewMd) }}
          />
        ) : (
          <article className="writing-panel" aria-label="今日日记">
            {/* Quick row: mood, energy, date nav */}
            <div className="quick-row">
              <label htmlFor="mood">
                <span>心情</span>
                <input
                  id="mood"
                  value={entry.mood}
                  onChange={(event) => patchEntry({ mood: event.target.value })}
                  placeholder="平静、充实、焦虑…"
                />
              </label>
              <label htmlFor="energy">
                <span>能量 (0-10)</span>
                <input
                  id="energy"
                  type="number"
                  min="0"
                  max="10"
                  value={entry.energy ?? ""}
                  onChange={(event) =>
                    patchEntry({
                      energy: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                />
              </label>
            </div>

            {/* Date navigation */}
            <div className="date-nav-row">
              <button type="button" className="icon-button secondary" onClick={() => navigateDay(-1)}>
                前一天
              </button>
              {!isToday && (
                <button type="button" className="icon-button secondary" onClick={() => changeDate(todayIsoDate())}>
                  回到今天
                </button>
              )}
              <button type="button" className="icon-button secondary" onClick={() => navigateDay(1)}>
                后一天
              </button>
            </div>

            <Field
              id="happened"
              label="记忆"
              value={entry.happened}
              onChange={(value) => patchEntry({ happened: value })}
            />
            <Field
              id="ideas"
              label="Ideas"
              value={entry.ideas}
              onChange={(value) => patchEntry({ ideas: value })}
            />

            {/* Tags */}
            <label className="diary-field" htmlFor="tags-input">
              <span>标签（逗号分隔）</span>
              <input
                id="tags-input"
                type="text"
                value={tagInput}
                onChange={(event) => handleTagsChange(event.target.value)}
                placeholder="工作, 阅读, 运动…"
                className="tag-text-input"
              />
              {entry.tags.length > 0 && (
                <div className="tag-chips">
                  {entry.tags.map((tag, i) => (
                    <span key={`${tag}-${i}`} className="tag-chip">
                      <Tag aria-hidden="true" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(i)}
                        aria-label={`移除标签 ${tag}`}
                      >
                        <X aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </label>

            <Field
              id="body-life"
              label="身体与生活"
              value={entry.bodyLife}
              onChange={(value) => patchEntry({ bodyLife: value })}
            />
            <label className="diary-field readonly" htmlFor="yesterday-plan">
              <span>昨天对今天的计划</span>
              <textarea id="yesterday-plan" rows={4} value={entry.yesterdayPlan} readOnly />
            </label>
            <Field
              id="tomorrow"
              label="明天"
              rows={4}
              value={entry.tomorrow}
              onChange={(value) => patchEntry({ tomorrow: value })}
            />

            {/* Project records from WakaTime */}
            {hasWakaTime && (
              <div className="project-record-section">
                <span className="project-record-label">项目记录</span>
                <div className="project-record-grid">
                  {(() => {
                    const waka = apiSnapshots.find((s) => s.provider === "wakatime");
                    if (!waka) return null;
                    const p = waka.payload as Record<string, unknown>;
                    const languages = Array.isArray(p.languages)
                      ? (p.languages as Array<{ name: string; text: string; percent: number }>)
                      : [];
                    const projects = Array.isArray(p.projects)
                      ? (p.projects as Array<{ name: string; text: string; percent: number }>)
                      : [];
                    return (
                      <>
                        <div className="project-record-group">
                          <span className="project-record-heading">语言</span>
                          {languages.length === 0 ? (
                            <span className="project-record-empty">—</span>
                          ) : (
                            languages.map((lang) => (
                              <span key={lang.name} className="project-record-item">
                                <span>{lang.name}</span>
                                <span>{lang.text}</span>
                              </span>
                            ))
                          )}
                        </div>
                        <div className="project-record-group">
                          <span className="project-record-heading">项目</span>
                          {projects.length === 0 ? (
                            <span className="project-record-empty">—</span>
                          ) : (
                            projects.map((proj) => (
                              <span key={proj.name} className="project-record-item">
                                <span>{proj.name}</span>
                                <span>{proj.text}</span>
                              </span>
                            ))
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </article>
        )}

        {/* ── Side Panel ── */}
        <aside className="side-panel" aria-label="自动素材">
          {/* Save state */}
          <div className={`save-state${status === "saved" ? " synced" : ""}`} role="status">
            {status === "loading" && <Loader2 aria-hidden="true" />}
            {status === "saving" && <Loader2 aria-hidden="true" />}
            {status === "saved" && <Check aria-hidden="true" />}
            {status === "error" && <span className="status-dot" />}
            <span>
              {status === "loading" && "读取中"}
              {status === "saving" && "自动保存中"}
              {status === "saved" && "已保存"}
              {status === "error" && "保存失败"}
              {status === "idle" && (
                <>
                  {dirty ? "未保存" : "已同步"}
                </>
              )}
            </span>
          </div>

          {/* Recent 7 days */}
          <section className="recent-days">
            <h2><Clock aria-hidden="true" />最近 7 天</h2>
            {recentDays.length === 0 && <p className="review-empty">暂无记录</p>}
            {recentDays.map((d) => {
              const hasContent = [d.happened, d.thoughts, d.ideas, d.bodyLife]
                .some((s) => s.trim().length > 0);
              return (
                <Link
                  key={d.date}
                  href={`/?date=${d.date}`}
                  className={`recent-day-link${d.date === date ? " active" : ""}`}
                >
                  <span className="recent-day-date">
                    {d.date.slice(5)} {d.mood || (hasContent ? "" : "—")}
                  </span>
                  <span className="recent-day-status">
                    {hasContent ? "有内容" : "空白"}
                  </span>
                </Link>
              );
            })}
          </section>

          {/* Today's Tasks */}
          <section className="task-panel" aria-label="今日任务">
            <h2><CheckCircle aria-hidden="true" />今日计划</h2>
            <div className="task-input-row">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                placeholder="新增任务…"
                aria-label="新增任务"
              />
              <button type="button" className="icon-button primary" onClick={addTask}>
                <Plus aria-hidden="true" />
              </button>
            </div>
            {entry.yesterdayPlan.trim() && (
              <button
                type="button"
                className="icon-button secondary"
                style={{ width: "100%", marginTop: 4, fontSize: "12px" }}
                onClick={convertPlanToTasks}
              >
                从昨天计划生成任务
              </button>
            )}
            {tasks.length === 0 && (
              <p className="review-empty">暂无任务</p>
            )}
            {tasks.map((task) => (
              <div key={task.id} className={`task-row status-${task.status}`}>
                <button
                  type="button"
                  className={`task-check${task.status === "done" ? " done" : ""}`}
                  onClick={() => toggleTask(task.id, task.status)}
                  aria-label={task.status === "done" ? "标记未完成" : "标记完成"}
                >
                  {task.status === "done" ? <Check aria-hidden="true" /> : null}
                </button>
                <span className="task-title">{task.title}</span>
                <div className="task-actions">
                  {task.source === "yesterday" && (
                    <span className="task-source-badge" title="从昨天继承">昨</span>
                  )}
                  {task.status !== "skipped" && (
                    <button
                      type="button"
                      className="task-skip-btn"
                      onClick={() => skipTask(task.id)}
                      aria-label="跳过任务"
                    >
                      <X aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="task-skip-btn"
                    onClick={() => removeTask(task.id)}
                    aria-label="删除任务"
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
            {tasks.filter((t) => t.status === "done").length > 0 && (
              <p className="task-progress">
                完成 {tasks.filter((t) => t.status === "done").length} / {tasks.length}
              </p>
            )}
          </section>

          {/* Today's Reading */}
          <TodayReading date={date} />

          {/* API modules */}
          <section className="module-list" aria-label="接口状态">
            <div className="module-row">
              <Code2 aria-hidden="true" />
              <div>
                <h2>WakaTime</h2>
                {hasWakaTime ? (
                  <>
                    <WakaTimeDetail snapshots={apiSnapshots} />
                    <button
                      type="button"
                      className="module-sync-btn"
                      onClick={() => {
                        fetch(`/api/wakatime?date=${date}`)
                          .then(() => window.location.reload())
                          .catch(() => {});
                      }}
                      aria-label="同步今日 WakaTime"
                    >
                      <RefreshCw aria-hidden="true" /> 同步今日
                    </button>
                  </>
                ) : (
                  <p>等待配置 API Key</p>
                )}
              </div>
            </div>
            <div className="module-row">
              <BookOpen aria-hidden="true" />
              <div>
                <h2>微信读书</h2>
                {hasWeRead ? (
                  <WeReadDetail snapshots={apiSnapshots} />
                ) : (
                  <p>等待配置 API Key</p>
                )}
              </div>
            </div>
          </section>

          <Link href="/settings" className="icon-button secondary" style={{ width: "100%" }}>
            <Key aria-hidden="true" />
            <span>设置</span>
          </Link>
        </aside>
      </section>
    </main>
  );
}

/* ── WakaTime detail sub-component ── */
function WakaTimeDetail({ snapshots }: { snapshots: ApiSnapshot[] }) {
  const waka = snapshots.find((s) => s.provider === "wakatime");
  if (!waka) return null;
  const p = waka.payload as Record<string, unknown>;
  const totalText = typeof p.totalText === "string" ? p.totalText : "";
  const projects = Array.isArray(p.projects) ? (p.projects as Array<{ name: string; text: string }>) : [];
  const languages = Array.isArray(p.languages) ? (p.languages as Array<{ name: string; text: string }>) : [];

  return (
    <div className="module-detail">
      {totalText && <span>总时长: {totalText}</span>}
      {projects.length > 0 && (
        <span>Top 项目: {projects.slice(0, 3).map((p) => p.name).join(", ")}</span>
      )}
      {languages.length > 0 && (
        <span>Top 语言: {languages.slice(0, 3).map((l) => l.name).join(", ")}</span>
      )}
    </div>
  );
}

/* ── WeRead detail sub-component ── */
function WeReadDetail({ snapshots }: { snapshots: ApiSnapshot[] }) {
  const weread = snapshots.find((s) => s.provider === "weread");
  if (!weread) return null;
  const p = weread.payload as Record<string, unknown>;
  const totalDuration = typeof p.totalDurationMinutes === "number" ? p.totalDurationMinutes : 0;
  const totalHighlights = typeof p.totalHighlights === "number" ? p.totalHighlights : 0;
  const totalNotes = typeof p.totalNotes === "number" ? p.totalNotes : 0;
  const books = Array.isArray(p.books) ? (p.books as Array<{ title: string; durationMinutes: number }>) : [];

  return (
    <div className="module-detail">
      {totalDuration > 0 && <span>阅读时长: {totalDuration} 分钟</span>}
      {totalHighlights > 0 && <span>划线: {totalHighlights} 条</span>}
      {totalNotes > 0 && <span>笔记: {totalNotes} 条</span>}
      {books.length > 0 && (
        <span>书目: {books.map((b) => b.title).join(", ")}</span>
      )}
    </div>
  );
}

/* ── Tiny markdown-to-html renderer for preview ── */
function renderMarkdownToHtml(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headings
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold / italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

  // Paragraphs: wrap remaining non-tag lines
  html = html
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("<h") || trimmed.startsWith("<ul") || trimmed.startsWith("<li") || trimmed.startsWith("</ul")) {
        return trimmed;
      }
      return `<p>${trimmed}</p>`;
    })
    .join("\n");

  return html;
}
