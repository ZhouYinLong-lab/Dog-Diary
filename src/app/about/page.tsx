"use client";

import { faArrowLeft, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

export default function AboutPage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});
  }, []);

  return (
    <main className="app-shell">
      <section className="topbar">
        <div className="date-block">
          <Link href="/" className="icon-button secondary" aria-label="返回今日页">
            <Icon faIcon={faArrowLeft} size={18} decorative />
            <span>返回</span>
          </Link>
          <div>
            <p>Dog-Diary</p>
            <h1>关于</h1>
          </div>
        </div>
      </section>

      <div className="review-summary">
        <div className="review-card">
          <h2>Dog-Diary Daily Driver RC</h2>
          <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>
            Local-first diary workbench — write, track, reflect.
            所有数据存储在本地 SQLite，不依赖云端服务。
          </p>

          <div className="review-stat-row">
            <span className="review-stat-label">版本</span>
            <span className="review-stat-value">0.1.0-rc.1</span>
          </div>
          <div className="review-stat-row">
            <span className="review-stat-label">数据路径</span>
            <span className="review-stat-value" style={{ fontSize: "12px", fontFamily: "var(--font-geist-mono)" }}>
              .dog-diary/dog-diary.sqlite
            </span>
          </div>
          <div className="review-stat-row">
            <span className="review-stat-label">导出路径</span>
            <span className="review-stat-value">exports/</span>
          </div>
          <div className="review-stat-row">
            <span className="review-stat-label">备份路径</span>
            <span className="review-stat-value">backups/</span>
          </div>
        </div>

        <div className="review-card">
          <h2><Icon faIcon={faShieldHalved} size={18} decorative /> 隐私边界</h2>
          <ul style={{ fontSize: "14px", color: "var(--color-muted)", lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
            <li>所有日记数据存储在本地，不会自动上传到任何服务器</li>
            <li>代码仓库可以公开，但 <strong>.dog-diary/</strong>、<strong>exports/</strong>、<strong>backups/</strong> 已加入 .gitignore</li>
            <li>WakaTime API Key 存储在本地数据库，不会暴露到前端日志</li>
            <li>如需 GitHub 同步私人数据，必须使用私有仓库</li>
            <li>微信读书目前仅支持 JSON 导入，不依赖不可验证的第三方 API</li>
          </ul>
        </div>

        {health && (
          <div className="review-card">
            <h2>系统状态</h2>
            <div className="review-stat-row">
              <span className="review-stat-label">健康状态</span>
              <span className="review-stat-value" style={{ color: health.healthy ? "var(--color-accent)" : "var(--color-error)" }}>
                {(health.healthy as boolean) ? "正常" : "异常"}
              </span>
            </div>
            {Array.isArray(health.checks) && (health.checks as Array<{ check: string; status: string; detail: string }>).map((c) => (
              <div key={c.check} className="review-stat-row">
                <span className="review-stat-label">{c.check}</span>
                <span className="review-stat-value" style={{ fontSize: "12px" }}>
                  {c.status === "ok" ? "✓" : c.status === "warn" ? "⚠" : "✗"} {c.detail}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
