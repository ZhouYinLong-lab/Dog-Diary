import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import { shiftIsoDate } from "@/lib/date-utils";
import type { ApiSnapshot, DiaryEntry, DiaryUpdateInput } from "@/lib/diary-types";

type SqlValue = string | number | Uint8Array | null;

const dataDir = path.join(process.cwd(), ".dog-diary");
const dbPath = path.join(dataDir, "dog-diary.sqlite");

let dbPromise: Promise<Database> | null = null;

async function loadSql(): Promise<SqlJsStatic> {
  return initSqlJs({
    locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
  });
}

async function openDatabase() {
  if (!dbPromise) {
    dbPromise = loadSql().then((SQL) => {
      fs.mkdirSync(dataDir, { recursive: true });
      const db = fs.existsSync(dbPath)
        ? new SQL.Database(fs.readFileSync(dbPath))
        : new SQL.Database();
      migrate(db);
      persist(db);
      return db;
    });
  }
  return dbPromise;
}

/** Versioned migrations. Each returns true if it was newly applied. */
const MIGRATIONS: Array<{ id: string; sql: string }> = [
  {
    id: "001_initial",
    sql: `
      create table if not exists diary_entries (
        date text primary key,
        happened text not null default '',
        thoughts text not null default '',
        ideas text not null default '',
        body_life text not null default '',
        yesterday_plan text not null default '',
        tomorrow text not null default '',
        tags_json text not null default '[]',
        mood text not null default '',
        energy integer,
        created_at text not null,
        updated_at text not null
      );

      create table if not exists api_snapshots (
        id text primary key,
        date text not null,
        provider text not null,
        status text not null,
        payload_json text not null default '{}',
        created_at text not null,
        updated_at text not null,
        unique(date, provider)
      );

      create table if not exists integration_accounts (
        provider text primary key,
        enabled integer not null default 0,
        api_key text not null default '',
        config_json text not null default '{}',
        updated_at text not null
      );
    `,
  },
  {
    id: "002_reviews",
    sql: `
      create table if not exists review_records (
        id text primary key,
        type text not null,
        period_start text not null,
        period_end text not null,
        content text not null default '',
        created_at text not null,
        updated_at text not null
      );
    `,
  },
  {
    id: "003_tasks",
    sql: `
      create table if not exists daily_tasks (
        id text primary key,
        date text not null,
        title text not null,
        status text not null default 'planned',
        source text not null default 'manual',
        created_at text not null,
        updated_at text not null
      );
    `,
  },
];

function migrate(db: Database) {
  // Ensure schema_migrations table exists first
  db.run(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at text not null
    );
  `);

  const applied = new Set(
    allRows<{ id: string }>(db, "select id from schema_migrations").map((r) => r.id),
  );

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    db.run(migration.sql);
    db.run("insert into schema_migrations (id, applied_at) values (?, ?)", [
      migration.id,
      nowIso(),
    ]);
  }
}

/** Get applied migrations for health check. */
export async function getMigrationStatus() {
  const db = await openDatabase();
  return {
    migrations: MIGRATIONS.map((m) => m.id),
    applied: allRows<{ id: string; applied_at: string }>(
      db,
      "select id, applied_at from schema_migrations order by applied_at asc",
    ),
  };
}

function persist(db: Database) {
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

function nowIso() {
  return new Date().toISOString();
}

function firstRow<T>(db: Database, sql: string, params: SqlValue[] = []): T | null {
  const stmt = db.prepare(sql, params);
  try {
    return stmt.step() ? (stmt.getAsObject() as T) : null;
  } finally {
    stmt.free();
  }
}

function allRows<T>(db: Database, sql: string, params: SqlValue[] = []): T[] {
  const stmt = db.prepare(sql, params);
  const rows: T[] = [];
  try {
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    return rows;
  } finally {
    stmt.free();
  }
}

type EntryRow = {
  date: string;
  happened: string;
  thoughts: string;
  ideas: string;
  body_life: string;
  yesterday_plan: string;
  tomorrow: string;
  tags_json: string;
  mood: string;
  energy: number | null;
  created_at: string;
  updated_at: string;
};

type SnapshotRow = {
  id: string;
  date: string;
  provider: "wakatime" | "weread";
  status: "empty" | "ready" | "error";
  payload_json: string;
  created_at: string;
  updated_at: string;
};

function mapEntry(row: EntryRow): DiaryEntry {
  return {
    date: row.date,
    happened: row.happened,
    thoughts: row.thoughts,
    ideas: row.ideas,
    bodyLife: row.body_life,
    yesterdayPlan: row.yesterday_plan,
    tomorrow: row.tomorrow,
    tags: JSON.parse(row.tags_json || "[]"),
    mood: row.mood,
    energy: row.energy,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSnapshot(row: SnapshotRow): ApiSnapshot {
  return {
    id: row.id,
    date: row.date,
    provider: row.provider,
    status: row.status,
    payload: JSON.parse(row.payload_json || "{}"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getOrCreateEntry(date: string) {
  const db = await openDatabase();
  const existing = firstRow<EntryRow>(db, "select * from diary_entries where date = ?", [date]);

  if (existing) {
    return mapEntry(existing);
  }

  const yesterday = firstRow<{ tomorrow: string }>(
    db,
    "select tomorrow from diary_entries where date = ?",
    [shiftIsoDate(date, -1)],
  );
  const timestamp = nowIso();

  db.run(
    `insert into diary_entries (
      date, yesterday_plan, created_at, updated_at
    ) values (?, ?, ?, ?)`,
    [date, yesterday?.tomorrow ?? "", timestamp, timestamp],
  );
  persist(db);

  return mapEntry(
    firstRow<EntryRow>(db, "select * from diary_entries where date = ?", [date]) as EntryRow,
  );
}

export async function updateEntry(input: DiaryUpdateInput) {
  const db = await openDatabase();
  await getOrCreateEntry(input.date);
  const timestamp = nowIso();

  db.run(
    `update diary_entries
     set happened = ?,
         thoughts = ?,
         ideas = ?,
         body_life = ?,
         tomorrow = ?,
         tags_json = ?,
         mood = ?,
         energy = ?,
         updated_at = ?
     where date = ?`,
    [
      input.happened,
      input.thoughts,
      input.ideas,
      input.bodyLife,
      input.tomorrow,
      JSON.stringify(input.tags),
      input.mood,
      input.energy,
      timestamp,
      input.date,
    ],
  );
  persist(db);

  return mapEntry(
    firstRow<EntryRow>(db, "select * from diary_entries where date = ?", [input.date]) as EntryRow,
  );
}

export async function getSnapshots(date: string) {
  const db = await openDatabase();
  return allRows<SnapshotRow>(
    db,
    "select * from api_snapshots where date = ? and status = 'ready' order by provider",
    [date],
  ).map(mapSnapshot);
}

export async function getDailyPayload(date: string) {
  const entry = await getOrCreateEntry(date);
  const snapshots = await getSnapshots(date);
  return { entry, snapshots };
}

/** List all diary entries ordered by date descending, with optional tag filter. */
export async function getAllEntries(filterTag?: string) {
  const db = await openDatabase();
  if (filterTag) {
    const rows = allRows<EntryRow>(
      db,
      "select * from diary_entries order by date desc",
    );
    return rows
      .map(mapEntry)
      .filter((entry) => entry.tags.includes(filterTag));
  }
  return allRows<EntryRow>(db, "select * from diary_entries order by date desc").map(mapEntry);
}

/** Return a set of date strings that have diary content (at least one non-empty field besides defaults). */
export async function getActiveDatesForMonth(year: number, month: number) {
  const db = await openDatabase();
  const prefix = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
  const rows = allRows<EntryRow>(
    db,
    "select date, happened, thoughts, ideas, body_life, tomorrow from diary_entries where date like ?",
    [`${prefix}%`],
  );
  return rows
    .filter((row) => {
      const content = [row.happened, row.thoughts, row.ideas, row.body_life, row.tomorrow]
        .map((s) => s.trim())
        .join("");
      return content.length > 0;
    })
    .map((row) => row.date);
}

/** Bulk fetch entries for a list of dates. */
export async function getEntriesForDates(dates: string[]) {
  if (dates.length === 0) return [];
  const db = await openDatabase();
  const placeholders = dates.map(() => "?").join(", ");
  return allRows<EntryRow>(
    db,
    `select * from diary_entries where date in (${placeholders}) order by date desc`,
    dates,
  ).map(mapEntry);
}

/** Upsert an API snapshot. */
export async function upsertSnapshot(snapshot: {
  id: string;
  date: string;
  provider: "wakatime" | "weread";
  status: "empty" | "ready" | "error";
  payload: Record<string, unknown>;
}) {
  const db = await openDatabase();
  const timestamp = nowIso();
  db.run(
    `insert into api_snapshots (id, date, provider, status, payload_json, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?)
     on conflict(date, provider) do update set
       status = excluded.status,
       payload_json = excluded.payload_json,
       updated_at = excluded.updated_at`,
    [
      snapshot.id,
      snapshot.date,
      snapshot.provider,
      snapshot.status,
      JSON.stringify(snapshot.payload),
      timestamp,
      timestamp,
    ],
  );
  persist(db);
}

/** Get integration account config. */
export async function getIntegrationAccount(provider: string) {
  const db = await openDatabase();
  type AccountRow = {
    provider: string;
    enabled: number;
    api_key: string;
    config_json: string;
    updated_at: string;
  };
  const row = firstRow<AccountRow>(
    db,
    "select * from integration_accounts where provider = ?",
    [provider],
  );
  if (!row) return null;
  return {
    provider: row.provider,
    enabled: row.enabled === 1,
    apiKey: row.api_key,
    config: JSON.parse(row.config_json || "{}"),
    updatedAt: row.updated_at,
  };
}

/** Save integration account config. */
export async function saveIntegrationAccount(provider: string, data: {
  enabled?: boolean;
  apiKey?: string;
  config?: Record<string, unknown>;
}) {
  const db = await openDatabase();
  const timestamp = nowIso();
  db.run(
    `insert into integration_accounts (provider, enabled, api_key, config_json, updated_at)
     values (?, ?, ?, ?, ?)
     on conflict(provider) do update set
       enabled = coalesce(excluded.enabled, enabled),
       api_key = coalesce(excluded.api_key, api_key),
       config_json = coalesce(excluded.config_json, config_json),
       updated_at = excluded.updated_at`,
    [
      provider,
      data.enabled ? 1 : 0,
      data.apiKey ?? "",
      JSON.stringify(data.config ?? {}),
      timestamp,
    ],
  );
  persist(db);
}

/** Get entries for a date range (inclusive). */
export async function getEntriesInRange(startDate: string, endDate: string) {
  const db = await openDatabase();
  return allRows<EntryRow>(
    db,
    "select * from diary_entries where date >= ? and date <= ? order by date asc",
    [startDate, endDate],
  ).map(mapEntry);
}

/** Get snapshots for a date range (ready status only). */
export async function getSnapshotsInRange(
  startDate: string,
  endDate: string,
  provider?: "wakatime" | "weread",
) {
  const db = await openDatabase();
  let sql = "select * from api_snapshots where date >= ? and date <= ? and status = 'ready'";
  const params: SqlValue[] = [startDate, endDate];
  if (provider) {
    sql += " and provider = ?";
    params.push(provider);
  }
  sql += " order by date asc";
  return allRows<SnapshotRow>(db, sql, params).map(mapSnapshot);
}

/* ── Review Records ── */

export interface ReviewRecord {
  id: string;
  type: "week" | "month";
  periodStart: string;
  periodEnd: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

type ReviewRow = {
  id: string;
  type: "week" | "month";
  period_start: string;
  period_end: string;
  content: string;
  created_at: string;
  updated_at: string;
};

function mapReview(row: ReviewRow): ReviewRecord {
  return {
    id: row.id,
    type: row.type,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getReviewRecord(
  type: "week" | "month",
  periodStart: string,
): Promise<ReviewRecord | null> {
  const db = await openDatabase();
  const id = `${type}:${periodStart}`;
  const row = firstRow<ReviewRow>(
    db,
    "select * from review_records where id = ?",
    [id],
  );
  return row ? mapReview(row) : null;
}

export async function saveReviewRecord(record: {
  type: "week" | "month";
  periodStart: string;
  periodEnd: string;
  content: string;
}) {
  const db = await openDatabase();
  const id = `${record.type}:${record.periodStart}`;
  const timestamp = nowIso();
  const existing = firstRow<ReviewRow>(db, "select * from review_records where id = ?", [id]);

  if (existing) {
    db.run(
      "update review_records set content = ?, updated_at = ? where id = ?",
      [record.content, timestamp, id],
    );
  } else {
    db.run(
      `insert into review_records (id, type, period_start, period_end, content, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?)`,
      [id, record.type, record.periodStart, record.periodEnd, record.content, timestamp, timestamp],
    );
  }
  persist(db);
}

/* ── Daily Tasks ── */

export interface DailyTask {
  id: string;
  date: string;
  title: string;
  status: "planned" | "done" | "skipped";
  source: "manual" | "yesterday" | "review";
  createdAt: string;
  updatedAt: string;
}

type TaskRow = {
  id: string;
  date: string;
  title: string;
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
};

function mapTask(row: TaskRow): DailyTask {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    status: row.status as DailyTask["status"],
    source: row.source as DailyTask["source"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTasks(date: string): Promise<DailyTask[]> {
  const db = await openDatabase();
  return allRows<TaskRow>(
    db,
    "select * from daily_tasks where date = ? order by created_at asc",
    [date],
  ).map(mapTask);
}

export async function createTask(task: {
  date: string;
  title: string;
  source?: "manual" | "yesterday" | "review";
}): Promise<DailyTask> {
  const db = await openDatabase();
  const id = `task:${task.date}:${Date.now()}`;
  const timestamp = nowIso();
  const source = task.source || "manual";
  db.run(
    "insert into daily_tasks (id, date, title, status, source, created_at, updated_at) values (?, ?, ?, 'planned', ?, ?, ?)",
    [id, task.date, task.title, source, timestamp, timestamp],
  );
  persist(db);
  const row = firstRow<TaskRow>(db, "select * from daily_tasks where id = ?", [id]);
  if (!row) throw new Error("Failed to create task");
  return mapTask(row);
}

export async function updateTaskStatus(
  id: string,
  status: "planned" | "done" | "skipped",
) {
  const db = await openDatabase();
  const timestamp = nowIso();
  db.run("update daily_tasks set status = ?, updated_at = ? where id = ?", [
    status,
    timestamp,
    id,
  ]);
  persist(db);
}

export async function deleteTask(id: string) {
  const db = await openDatabase();
  db.run("delete from daily_tasks where id = ?", [id]);
  persist(db);
}

/** Get yesterday's uncompleted tasks and carry them forward. */
export async function carryOverTasks(date: string): Promise<DailyTask[]> {
  const yesterday = shiftIsoDate(date, -1);
  const yesterdayTasks = await getTasks(yesterday);
  const uncompleted = yesterdayTasks.filter((t) => t.status === "planned");
  const carried: DailyTask[] = [];
  for (const task of uncompleted) {
    const created = await createTask({
      date,
      title: task.title,
      source: "yesterday",
    });
    carried.push(created);
  }
  return carried;
}

/** Get task stats for a date range. */
export async function getTaskStats(startDate: string, endDate: string) {
  const db = await openDatabase();
  const rows = allRows<TaskRow>(
    db,
    "select * from daily_tasks where date >= ? and date <= ?",
    [startDate, endDate],
  ).map(mapTask);

  const total = rows.length;
  const done = rows.filter((t) => t.status === "done").length;
  const skipped = rows.filter((t) => t.status === "skipped").length;
  const planned = rows.filter((t) => t.status === "planned").length;

  // Frequent skipped keywords
  const skippedTitles = rows
    .filter((t) => t.status === "skipped")
    .map((t) => t.title.toLowerCase());
  const wordCounts: Record<string, number> = {};
  for (const title of skippedTitles) {
    const words = title.split(/\s+/).filter((w) => w.length > 1);
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }
  const topSkippedWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  return {
    total,
    done,
    skipped,
    planned,
    completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    topSkippedWords,
  };
}

/** Get all snapshots of a given provider with ready status. */
export async function getAllSnapshots(provider?: "wakatime" | "weread") {
  const db = await openDatabase();
  let sql = "select * from api_snapshots where status = 'ready'";
  const params: SqlValue[] = [];
  if (provider) {
    sql += " and provider = ?";
    params.push(provider);
  }
  sql += " order by date desc";
  return allRows<SnapshotRow>(db, sql, params).map(mapSnapshot);
}

/** Get streak information: consecutive days with diary content ending at (or before) endDate. */
export async function getStreak(endDate: string) {
  const db = await openDatabase();
  const rows = allRows<{ date: string }>(
    db,
    "select date from diary_entries where date <= ? order by date desc limit 366",
    [endDate],
  );
  const datesWithContent = new Set<string>();
  for (const row of rows) {
    const content = firstRow<{ total: number }>(
      db,
      "select length(happened) + length(thoughts) + length(ideas) + length(body_life) + length(tomorrow) as total from diary_entries where date = ?",
      [row.date],
    );
    if (content && content.total > 0) {
      datesWithContent.add(row.date);
    }
  }

  let streak = 0;
  let current = endDate;
  while (datesWithContent.has(current)) {
    streak++;
    current = shiftIsoDate(current, -1);
  }
  return streak;
}

/** Get all unique tags from all entries. */
export async function getAllTags() {
  const db = await openDatabase();
  const rows = allRows<{ tags_json: string }>(
    db,
    "select tags_json from diary_entries",
  );
  const tagSet = new Set<string>();
  for (const row of rows) {
    try {
      const tags = JSON.parse(row.tags_json || "[]") as string[];
      for (const tag of tags) {
        if (tag.trim()) tagSet.add(tag.trim());
      }
    } catch { /* skip malformed */ }
  }
  return Array.from(tagSet).sort();
}

export interface SearchParams {
  q?: string;
  from?: string;
  to?: string;
  tag?: string;
  mood?: string;
  minEnergy?: number;
  maxEnergy?: number;
  hasWakatime?: boolean;
}

export interface SearchResult {
  entry: DiaryEntry;
  hasWakatime: boolean;
  hasWeread: boolean;
}

/** Full-text search across diary fields with optional filters. */
export async function searchEntries(params: SearchParams): Promise<SearchResult[]> {
  const db = await openDatabase();
  // Fetch all entries (we'll filter in JS since sql.js has limited FTS)
  let rows = allRows<EntryRow>(db, "select * from diary_entries order by date desc").map(mapEntry);

  // Date range filter
  if (params.from) {
    rows = rows.filter((e) => e.date >= params.from!);
  }
  if (params.to) {
    rows = rows.filter((e) => e.date <= params.to!);
  }

  // Tag filter
  if (params.tag) {
    rows = rows.filter((e) => e.tags.includes(params.tag!));
  }

  // Mood filter
  if (params.mood) {
    rows = rows.filter((e) => e.mood === params.mood);
  }

  // Energy range
  if (params.minEnergy !== undefined) {
    rows = rows.filter((e) => e.energy !== null && e.energy >= params.minEnergy!);
  }
  if (params.maxEnergy !== undefined) {
    rows = rows.filter((e) => e.energy !== null && e.energy <= params.maxEnergy!);
  }

  // Full-text search
  if (params.q) {
    const q = params.q.toLowerCase();
    rows = rows.filter((e) => {
      const searchable = [
        e.happened, e.thoughts, e.ideas, e.bodyLife, e.tomorrow,
        e.mood, ...e.tags,
      ].join(" ").toLowerCase();
      return searchable.includes(q);
    });
  }

  // WakaTime presence
  if (params.hasWakatime !== undefined) {
    const wakaDates = new Set(
      allRows<{ date: string }>(
        db,
        "select date from api_snapshots where provider = 'wakatime' and status = 'ready'",
      ).map((r) => r.date),
    );
    if (params.hasWakatime) {
      rows = rows.filter((e) => wakaDates.has(e.date));
    } else {
      rows = rows.filter((e) => !wakaDates.has(e.date));
    }
  }

  // Attach snapshot presence flags
  const snapshotDates = new Set(
    allRows<{ date: string; provider: string }>(
      db,
      "select date, provider from api_snapshots where status = 'ready'",
    ).map((r) => `${r.date}:${r.provider}`),
  );

  return rows.map((entry) => ({
    entry,
    hasWakatime: snapshotDates.has(`${entry.date}:wakatime`),
    hasWeread: snapshotDates.has(`${entry.date}:weread`),
  }));
}
