"use client";

import {
  ArrowLeft,
  BookOpen,
  Check,
  Code2,
  Download,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type IntegrationConfig = {
  enabled: boolean;
  apiKey: string;
  config: Record<string, unknown>;
};

type SettingsData = {
  wakatime: IntegrationConfig;
  weread: IntegrationConfig;
  wakatimeKeySource: "env" | "db" | "none";
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Form state
  const [wakaEnabled, setWakaEnabled] = useState(false);
  const [wakaKey, setWakaKey] = useState("");
  const [wakaKeySource, setWakaKeySource] = useState<"env" | "db" | "none">("none");
  const [wereadEnabled, setWereadEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: SettingsData) => {
        setSettings(data);
        setWakaEnabled(data.wakatime.enabled);
        setWakaKey(data.wakatime.apiKey);
        setWakaKeySource(data.wakatimeKeySource);
        setWereadEnabled(data.weread.enabled);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  const saveSettings = useCallback(
    async (provider: string, enabled: boolean, apiKey?: string) => {
      setSaveStatus("saving");
      try {
        const body: Record<string, unknown> = { provider, enabled };
        if (apiKey !== undefined && apiKey !== "••••") {
          body.apiKey = apiKey;
        }
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        setSaveStatus("saved");
        window.setTimeout(() => setSaveStatus("idle"), 1200);
      } catch {
        setSaveStatus("error");
      }
    },
    [],
  );

  const handleSaveAll = useCallback(() => {
    Promise.all([
      saveSettings("wakatime", wakaEnabled, wakaKey),
      saveSettings("weread", wereadEnabled),
    ]);
  }, [saveSettings, wakaEnabled, wakaKey, wereadEnabled]);

  if (status === "loading") {
    return (
      <main className="app-shell">
        <p className="status-message">加载中…</p>
      </main>
    );
  }

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
            <h1>设置</h1>
          </div>
        </div>
        <div className="actions">
          <button type="button" className="icon-button primary" onClick={handleSaveAll}>
            {saveStatus === "saving" ? <Loader2 aria-hidden="true" /> : <Save aria-hidden="true" />}
            <span>保存</span>
          </button>
        </div>
      </section>

      <section className="settings-form">
        {/* WakaTime */}
        <div className="settings-group">
          <h2><Code2 aria-hidden="true" /> WakaTime</h2>
          <p className="hint">连接 WakaTime 账号，自动获取每日编码数据。</p>
          {wakaKeySource === "env" && (
            <div className="env-banner">
              <Check aria-hidden="true" />
              <span>已通过环境变量 <code>WAKATIME_API_KEY</code>（.env）配置 — 下方设置将被忽略</span>
            </div>
          )}
          <div className="settings-field">
            <label htmlFor="waka-key">
              API Key
              {wakaKeySource === "env" && <span className="key-source-tag">ENV</span>}
              {wakaKeySource === "db" && <span className="key-source-tag db">DB</span>}
            </label>
            <input
              id="waka-key"
              type="password"
              value={wakaKey}
              onChange={(e) => {
                setWakaKey(e.target.value);
                if (e.target.value) setWakaEnabled(true);
              }}
              placeholder={wakaKeySource === "env" ? "已在 .env 中配置" : "粘贴 WakaTime API Key…"}
              disabled={wakaKeySource === "env"}
            />
          </div>
          <label className="settings-checkbox" style={{ marginTop: 12 }}>
            <input
              type="checkbox"
              checked={wakaEnabled}
              onChange={(e) => setWakaEnabled(e.target.checked)}
            />
            <span>启用 WakaTime 同步</span>
          </label>
          <div className="settings-save-status" style={{ marginTop: 8 }}>
            {saveStatus === "saving" && <Loader2 aria-hidden="true" />}
            {saveStatus === "saved" && <Check aria-hidden="true" />}
            {saveStatus === "error" && <span className="status-dot" />}
            <span>
              {saveStatus === "saving" && "保存中"}
              {saveStatus === "saved" && "已保存"}
              {saveStatus === "error" && "保存失败"}
            </span>
          </div>
        </div>

        {/* WeRead */}
        <div className="settings-group">
          <h2><BookOpen aria-hidden="true" /> 微信读书</h2>
          <p className="hint">
            微信读书集成目前为适配器模式。你可以通过 JSON 导入阅读数据。
          </p>
          <div className="settings-field">
            <label htmlFor="weread-cookie">Cookie / Token（预留）</label>
            <input
              id="weread-cookie"
              type="password"
              value={settings?.weread.config?.cookie as string || ""}
              onChange={(e) => {
                setSettings((prev) =>
                  prev
                    ? {
                        ...prev,
                        weread: {
                          ...prev.weread,
                          config: { ...prev.weread.config, cookie: e.target.value },
                        },
                      }
                    : prev,
                );
              }}
              placeholder="暂未接入真实 API…"
            />
          </div>
          <label className="settings-checkbox" style={{ marginTop: 12 }}>
            <input
              type="checkbox"
              checked={wereadEnabled}
              onChange={(e) => setWereadEnabled(e.target.checked)}
            />
            <span>启用微信读书</span>
          </label>

          {/* JSON Import */}
          <div style={{ marginTop: 16, borderTop: "1px solid var(--color-border)", paddingTop: 14 }}>
            <h3 style={{ fontSize: "14px", fontWeight: 650, margin: "0 0 6px" }}>JSON 导入阅读数据</h3>
            <p className="hint" style={{ marginTop: 0 }}>
              粘贴 JSON 数据导入阅读记录。支持单条或数组。
            </p>
            <details style={{ marginBottom: 8 }}>
              <summary style={{ fontSize: "12px", color: "var(--color-muted)", cursor: "pointer" }}>
                查看 JSON 格式
              </summary>
              <pre style={{
                fontSize: "11px",
                background: "var(--color-panel-subtle)",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                overflow: "auto",
                maxHeight: 160,
                margin: "4px 0 0",
              }}>
{`{
  "date": "2026-06-30",
  "books": [
    {
      "title": "三体",
      "author": "刘慈欣",
      "durationMinutes": 45,
      "highlights": 3,
      "notes": 1
    }
  ]
}`}
              </pre>
            </details>
            <textarea
              id="weread-json"
              rows={8}
              placeholder='粘贴 JSON…'
              style={{
                width: "100%",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                padding: "10px",
                fontSize: "13px",
                fontFamily: "var(--font-geist-mono), monospace",
                resize: "vertical",
              }}
              defaultValue=""
              ref={(el) => {
                if (el) (el as HTMLTextAreaElement).dataset.wereadJson = "true";
              }}
            />
            <button
              type="button"
              className="icon-button primary"
              style={{ marginTop: 8 }}
              onClick={async () => {
                const ta = document.querySelector('textarea[data-weread-json="true"]') as HTMLTextAreaElement;
                if (!ta?.value.trim()) { alert("请粘贴 JSON 数据"); return; }
                try {
                  const parsed = JSON.parse(ta.value);
                  const res = await fetch("/api/weread", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(parsed),
                  });
                  const data = await res.json();
                  if (data.error) {
                    alert(`导入失败: ${data.error}`);
                  } else {
                    alert(`导入完成: ${data.results.map((r: { date: string; status: string }) => `${r.date} ${r.status}`).join(", ")}`);
                    ta.value = "";
                    window.location.href = "/";
                  }
                } catch (e) {
                  alert(`JSON 解析失败: ${e}`);
                }
              }}
            >
              <BookOpen aria-hidden="true" />
              <span>导入数据</span>
            </button>
          </div>
        </div>

        {/* Sync */}
        <div className="settings-group">
          <h2><RefreshCw aria-hidden="true" /> 手动同步</h2>
          <p className="hint">手动触发数据同步。</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="icon-button secondary"
              onClick={() => {
                fetch("/api/wakatime")
                  .then((r) => r.json())
                  .then((d) => alert(d.status === "ready" ? "同步成功" : d.status === "empty" ? "今日无编码数据" : "同步完成"))
                  .catch(() => alert("同步失败"));
              }}
            >
              <RefreshCw aria-hidden="true" />
              <span>同步今日</span>
            </button>
            <button
              type="button"
              className="icon-button secondary"
              onClick={async () => {
                const results: string[] = [];
                for (let i = 0; i < 7; i++) {
                  const d = new Date();
                  d.setDate(d.getDate() - i);
                  const date = d.toISOString().slice(0, 10);
                  try {
                    const r = await fetch(`/api/wakatime?date=${date}`);
                    const j = await r.json();
                    results.push(`${date}: ${j.status}`);
                  } catch {
                    results.push(`${date}: error`);
                  }
                }
                alert(`同步完成:\n${results.join("\n")}`);
              }}
            >
              <RefreshCw aria-hidden="true" />
              <span>同步最近 7 天</span>
            </button>
          </div>
        </div>

        {/* Backup */}
        <div className="settings-group">
          <h2><Download aria-hidden="true" /> 备份与导出</h2>
          <p className="hint">
            数据库路径: <code>.dog-diary/dog-diary.sqlite</code><br />
            导出路径: <code>exports/</code><br />
            备份路径: <code>backups/</code>
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="icon-button secondary"
              onClick={() => window.location.href = "/api/export/all"}
            >
              <Download aria-hidden="true" />
              <span>导出全部 Markdown</span>
            </button>
            <button
              type="button"
              className="icon-button secondary"
              onClick={async () => {
                try {
                  const res = await fetch("/api/backup/sqlite");
                  const data = await res.json();
                  if (data.backedUp) {
                    alert(`备份成功: ${data.path}\n大小: ${(data.size / 1024).toFixed(1)} KB`);
                  } else {
                    alert(`备份失败: ${data.error}`);
                  }
                } catch {
                  alert("备份请求失败");
                }
              }}
            >
              <Download aria-hidden="true" />
              <span>导出 SQLite 备份副本</span>
            </button>
            <button
              type="button"
              className="icon-button secondary"
              id="btn-list-backups"
              onClick={async () => {
                const res = await fetch("/api/backup");
                const data = await res.json();
                if (data.backups?.length > 0) {
                  const list = data.backups.map((b: { name: string; size: number; createdAt: string }) =>
                    `${b.name} (${(b.size / 1024).toFixed(1)} KB, ${b.createdAt.slice(0, 10)})`
                  ).join("\n");
                  alert(`备份列表 (${data.backups.length} 个):\n\n${list}`);
                } else {
                  alert("暂无备份文件");
                }
              }}
            >
              <Download aria-hidden="true" />
              <span>查看备份列表</span>
            </button>
          </div>
          {typeof window !== "undefined" && (
            <div style={{ marginTop: 12, borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
              <p className="hint" style={{ marginTop: 0 }}>
                恢复或删除备份。恢复前会自动创建当前数据库的安全快照。
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="备份文件名 (如 dog-diary-2026-06-30-1430.sqlite)"
                  style={{
                    flex: "1 1 260px", minHeight: "40px", border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)", padding: "0 10px", fontSize: "13px",
                  }}
                  id="restore-filename"
                />
                <button type="button" className="icon-button secondary" onClick={async () => {
                  const name = (document.getElementById("restore-filename") as HTMLInputElement)?.value?.trim();
                  if (!name) { alert("请输入备份文件名"); return; }
                  if (!confirm(`确定恢复 ${name}？当前数据库将先备份再恢复。`)) return;
                  const res = await fetch("/api/backup", {
                    method: "PUT",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ name }),
                  });
                  const data = await res.json();
                  alert(data.restored ? `恢复成功: ${data.message}` : `恢复失败: ${data.error || data.detail}`);
                }}>
                  <Download aria-hidden="true" />
                  <span>恢复</span>
                </button>
                <button type="button" className="icon-button secondary" onClick={async () => {
                  const name = (document.getElementById("restore-filename") as HTMLInputElement)?.value?.trim();
                  if (!name) { alert("请输入备份文件名"); return; }
                  if (!confirm(`确定删除 ${name}？此操作不可撤销。`)) return;
                  const res = await fetch(`/api/backup?name=${encodeURIComponent(name)}`, { method: "DELETE" });
                  const data = await res.json();
                  alert(data.deleted ? "已删除" : `删除失败: ${data.error}`);
                }}>
                  <Download aria-hidden="true" />
                  <span>删除</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* GitHub placeholder */}
        <div className="settings-group">
          <h2><Code2 aria-hidden="true" /> GitHub 同步（设计预留）</h2>
          <p className="hint">
            ⚠️ 请勿将私人日记推送到公开仓库。此功能预留用于私有数据仓库同步。
          </p>
          <div className="settings-field">
            <label htmlFor="gh-repo">私有数据仓库（预留）</label>
            <input id="gh-repo" type="text" placeholder="username/private-diary-data" disabled />
          </div>
          <div className="settings-field" style={{ marginTop: 8 }}>
            <label htmlFor="gh-token">Token（预留）</label>
            <input id="gh-token" type="password" placeholder="ghp_..." disabled />
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            应用代码与私人数据严格分离。当前仅支持本地备份。
          </p>
        </div>

        {/* Markdown Import */}
        <div className="settings-group">
          <h2><Download aria-hidden="true" /> Markdown 导入</h2>
          <p className="hint">粘贴 Dog-Diary 导出的 Markdown，导入已有的日记。</p>
          <textarea
            id="import-md"
            rows={10}
            placeholder="粘贴 Markdown 内容…"
            style={{
              width: "100%", border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)", padding: "10px",
              fontSize: "13px", fontFamily: "var(--font-geist-mono), monospace", resize: "vertical",
            }}
            defaultValue=""
            ref={(el) => { if (el) (el as HTMLTextAreaElement).dataset.importMd = "true"; }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button type="button" className="icon-button secondary" onClick={async () => {
              const ta = document.querySelector('textarea[data-import-md="true"]') as HTMLTextAreaElement;
              if (!ta?.value.trim()) { alert("请粘贴 Markdown"); return; }
              const res = await fetch("/api/import", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ markdown: ta.value, mode: "preview" }),
              });
              const data = await res.json();
              if (data.error) { alert(data.error); return; }
              alert(`预览: ${data.entries.map((e: { date: string }) => e.date).join(", ")}`);
            }}>
              <Download aria-hidden="true" />
              <span>预览</span>
            </button>
            <button type="button" className="icon-button primary" onClick={async () => {
              const ta = document.querySelector('textarea[data-import-md="true"]') as HTMLTextAreaElement;
              if (!ta?.value.trim()) { alert("请粘贴 Markdown"); return; }
              if (!confirm("导入将合并到已有日记，不会覆盖已有内容。确认？")) return;
              const res = await fetch("/api/import", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ markdown: ta.value, mode: "import" }),
              });
              const data = await res.json();
              alert(`导入完成: ${data.imported} 条`);
              ta.value = "";
            }}>
              <Download aria-hidden="true" />
              <span>确认导入</span>
            </button>
          </div>
        </div>

        {/* Legacy Import */}
        <div className="settings-group">
          <h2><Download aria-hidden="true" /> 旧日记导入 (My-Life-Log)</h2>
          <p className="hint">
            支持导入旧 Obsidian / My-Life-Log 格式的日记。<br />
            格式: 日记/YYYY/M月/YYYY-MM-DD.md，支持 总结/随想/阅读/打卡/精力 章节。<br />
            选择文件进行导入预览，确认后再导入。
          </p>
          <input
            type="file"
            id="legacy-files"
            multiple
            accept=".md"
            style={{ marginBottom: 8, fontSize: "13px" }}
            ref={(el) => { if (el) (el as HTMLInputElement).dataset.legacyInput = "true"; }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="icon-button secondary" onClick={async () => {
              const input = document.querySelector('input[data-legacy-input="true"]') as HTMLInputElement;
              const files = input?.files;
              if (!files || files.length === 0) { alert("请选择 .md 文件"); return; }
              const fileData: Array<{ filename: string; content: string }> = [];
              for (let i = 0; i < files.length; i++) {
                const content = await files[i].text();
                fileData.push({ filename: files[i].name, content });
              }
              const res = await fetch("/api/legacy-import", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ files: fileData, mode: "preview" }),
              });
              const data = await res.json();
              if (data.error) { alert(`解析错误: ${data.error}`); return; }
              const conflicts = data.conflicts?.length > 0 ? `\n冲突日期 (已有内容，将跳过): ${data.conflicts.join(", ")}` : "";
              alert(`预览: ${data.totalEntries} 条可导入 (${data.entries.map((e: { date: string }) => e.date).join(", ")})${conflicts}`);
            }}>
              <Download aria-hidden="true" />
              <span>预览</span>
            </button>
            <button type="button" className="icon-button primary" onClick={async () => {
              const input = document.querySelector('input[data-legacy-input="true"]') as HTMLInputElement;
              const files = input?.files;
              if (!files || files.length === 0) { alert("请选择 .md 文件"); return; }
              if (!confirm("导入将合并到已有日记（默认跳过已有内容）。确认？")) return;
              const fileData: Array<{ filename: string; content: string }> = [];
              for (let i = 0; i < files.length; i++) {
                const content = await files[i].text();
                fileData.push({ filename: files[i].name, content });
              }
              const res = await fetch("/api/legacy-import", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ files: fileData, mode: "import" }),
              });
              const data = await res.json();
              alert(`导入完成: ${data.imported} 条, 跳过 ${data.skipped} 条`);
              input.value = "";
            }}>
              <Download aria-hidden="true" />
              <span>确认导入</span>
            </button>
          </div>
        </div>

        {/* Privacy Check */}
        <div className="settings-group">
          <h2><Code2 aria-hidden="true" /> 隐私检查</h2>
          <p className="hint">检查敏感数据是否被正确排除在 Git 之外。</p>
          <button type="button" className="icon-button secondary" onClick={async () => {
            const res = await fetch("/api/privacy");
            const data = await res.json();
            const lines = data.checks.map((c: { item: string; ok: boolean; detail: string }) =>
              `${c.ok ? "✓" : "✗"} ${c.item}: ${c.detail}`
            ).join("\n");
            alert(`隐私检查:\nRemote: ${data.remote}\n\n${lines}\n\n${data.warnings.join("\n")}`);
          }}>
            <Download aria-hidden="true" />
            <span>运行隐私检查</span>
          </button>
        </div>
      </section>
    </main>
  );
}
