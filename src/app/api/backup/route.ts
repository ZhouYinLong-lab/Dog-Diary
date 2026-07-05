import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKUP_DIR = path.join(process.cwd(), "backups");
const DB_SRC = path.join(process.cwd(), ".dog-diary", "dog-diary.sqlite");

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".sqlite"))
    .map((f) => {
      const filePath = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(filePath);
      return {
        name: f,
        path: `backups/${f}`,
        size: stat.size,
        createdAt: stat.birthtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// GET: list backups or download a specific one
export async function GET(request: NextRequest) {
  const download = request.nextUrl.searchParams.get("download");

  if (download) {
    const filePath = path.join(BACKUP_DIR, download);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }
    const content = fs.readFileSync(filePath);
    return new NextResponse(content, {
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition": `attachment; filename="${download}"`,
      },
    });
  }

  return NextResponse.json({ backups: listBackups() });
}

// PUT: restore a backup
export async function PUT(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = body.name;

  if (!name) {
    return NextResponse.json({ error: "Backup name required" }, { status: 400 });
  }

  const src = path.join(BACKUP_DIR, name);
  if (!fs.existsSync(src)) {
    return NextResponse.json({ error: "Backup file not found" }, { status: 404 });
  }

  // Pre-restore safety snapshot
  try {
    if (fs.existsSync(DB_SRC)) {
      const now = new Date();
      const safetyStamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
      const safetyPath = path.join(BACKUP_DIR, `pre-restore-safety-${safetyStamp}.sqlite`);
      fs.copyFileSync(DB_SRC, safetyPath);
    }
  } catch (e) {
    return NextResponse.json({
      error: "Safety snapshot failed — restore aborted",
      detail: String(e),
    }, { status: 500 });
  }

  // Restore
  try {
    fs.mkdirSync(path.dirname(DB_SRC), { recursive: true });
    fs.copyFileSync(src, DB_SRC);
    return NextResponse.json({
      restored: true,
      from: name,
      message: "Database restored. Please restart the app to reload data.",
    });
  } catch (e) {
    return NextResponse.json({
      error: "Restore failed — safety snapshot was created",
      detail: String(e),
    }, { status: 500 });
  }
}

// DELETE: remove a backup
export async function DELETE(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Backup name required" }, { status: 400 });
  }

  const filePath = path.join(BACKUP_DIR, name);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  }

  try {
    fs.unlinkSync(filePath);
    return NextResponse.json({ deleted: true, name });
  } catch (e) {
    return NextResponse.json({ error: "Delete failed", detail: String(e) }, { status: 500 });
  }
}
