import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cwd = process.cwd();
  const checks: Array<{ item: string; ok: boolean; detail: string }> = [];

  // Check .gitignore
  const gitignorePath = path.join(cwd, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    const requiredPatterns = [".dog-diary/", "/exports/", "/backups/"];
    for (const pattern of requiredPatterns) {
      const found = content.includes(pattern);
      checks.push({
        item: `.gitignore contains ${pattern}`,
        ok: found,
        detail: found ? "present" : "missing",
      });
    }
  } else {
    checks.push({ item: ".gitignore exists", ok: false, detail: "file not found" });
  }

  // Check git tracked files for sensitive data
  try {
    const tracked = execSync("git ls-files", { cwd, encoding: "utf-8", timeout: 5000 });
    const trackedFiles = tracked.split("\n").filter(Boolean);

    for (const sensitive of ["dog-diary.sqlite", ".dog-diary/", "exports/", "backups/"]) {
      const hasMatch = trackedFiles.some((f) => f.includes(sensitive));
      checks.push({
        item: `No "${sensitive}" in git tracked files`,
        ok: !hasMatch,
        detail: hasMatch ? "FOUND in git — risk!" : "not tracked",
      });
    }

    // Check .env files
    const envTracked = trackedFiles.some((f) => f.startsWith(".env"));
    checks.push({
      item: "No .env files tracked by git",
      ok: !envTracked,
      detail: envTracked ? "FOUND — risk!" : "not tracked",
    });
  } catch {
    checks.push({ item: "Git check", ok: false, detail: "git command failed" });
  }

  // Check local paths exist
  const dbPath = path.join(cwd, ".dog-diary", "dog-diary.sqlite");
  checks.push({
    item: "Database file exists locally",
    ok: fs.existsSync(dbPath),
    detail: dbPath,
  });

  // Check remote
  let remote = "unknown";
  try {
    remote = execSync("git remote get-url origin", { cwd, encoding: "utf-8", timeout: 5000 }).trim();
  } catch { /* no remote */ }

  const warnings: string[] = [];
  if (remote.includes("github.com") && !remote.includes("private")) {
    warnings.push("代码仓库 remote 可能是公开仓库。请确认不要把私人日记推到公开仓库。");
  }

  return NextResponse.json({
    checks,
    remote,
    dbPath: `.dog-diary/dog-diary.sqlite`,
    exportsPath: `exports/`,
    backupsPath: `backups/`,
    warnings,
  });
}
