import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { NextResponse } from "next/server";
import { getMigrationStatus } from "@/lib/diary-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cwd = process.cwd();
  const checks: Array<{ check: string; status: "ok" | "warn" | "error"; detail: string }> = [];

  // DB file check
  const dbPath = path.join(cwd, ".dog-diary", "dog-diary.sqlite");
  const dbExists = fs.existsSync(dbPath);
  checks.push({
    check: "Database file exists",
    status: dbExists ? "ok" : "warn",
    detail: dbExists ? dbPath : "No database file yet (will be created on first write)",
  });

  if (dbExists) {
    const stat = fs.statSync(dbPath);
    checks.push({
      check: "Database readable",
      status: "ok",
      detail: `${(stat.size / 1024).toFixed(1)} KB, modified ${stat.mtime.toISOString()}`,
    });
  }

  // Migrations
  try {
    const migrationStatus = await getMigrationStatus();
    checks.push({
      check: "Schema migrations",
      status: "ok",
      detail: `${migrationStatus.applied.length}/${migrationStatus.migrations.length} applied: ${migrationStatus.applied.map((m) => m.id).join(", ") || "none"}`,
    });
  } catch (e) {
    checks.push({
      check: "Schema migrations",
      status: "error",
      detail: `Failed to query: ${String(e)}`,
    });
  }

  // Gitignore safety
  const gitignorePath = path.join(cwd, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    const patterns = [".dog-diary/", "/exports/", "/backups/"];
    const missing = patterns.filter((p) => !content.includes(p));
    checks.push({
      check: ".gitignore data safety",
      status: missing.length === 0 ? "ok" : "error",
      detail: missing.length === 0 ? "All patterns present" : `Missing: ${missing.join(", ")}`,
    });
  }

  // Git tracked check
  try {
    const tracked = execSync("git ls-files", { cwd, encoding: "utf-8", timeout: 5000 });
    const sensitive = [".dog-diary", "dog-diary.sqlite", "exports/", "backups/"];
    const found = sensitive.filter((s) => tracked.includes(s));
    checks.push({
      check: "No sensitive files in git",
      status: found.length === 0 ? "ok" : "error",
      detail: found.length === 0 ? "Clean" : `FOUND: ${found.join(", ")} — remove from git immediately`,
    });
  } catch {
    checks.push({ check: "Git tracked check", status: "warn", detail: "Could not run git ls-files" });
  }

  // Exports/backups dirs
  const exportsExist = fs.existsSync(path.join(cwd, "exports"));
  const backupsExist = fs.existsSync(path.join(cwd, "backups"));
  checks.push({
    check: "Export/backup directories",
    status: "ok",
    detail: `exports: ${exportsExist ? "exists" : "not yet created"}, backups: ${backupsExist ? "exists" : "not yet created"}`,
  });

  const allOk = checks.every((c) => c.status !== "error");

  return NextResponse.json({
    healthy: allOk,
    timestamp: new Date().toISOString(),
    checks,
  });
}
