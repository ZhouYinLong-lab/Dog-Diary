import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const src = path.join(process.cwd(), ".dog-diary", "dog-diary.sqlite");
  if (!fs.existsSync(src)) {
    return NextResponse.json({ error: "No database file found" }, { status: 404 });
  }

  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const backupDir = path.join(process.cwd(), "backups");
  const dest = path.join(backupDir, `dog-diary-${stamp}.sqlite`);

  try {
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(src, dest);
    return NextResponse.json({
      backedUp: true,
      path: `backups/dog-diary-${stamp}.sqlite`,
      size: fs.statSync(dest).size,
    });
  } catch (e) {
    return NextResponse.json({ error: "Backup failed", detail: String(e) }, { status: 500 });
  }
}
