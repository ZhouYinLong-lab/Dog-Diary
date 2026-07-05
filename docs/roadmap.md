# Dog-Diary Roadmap

## Done (Daily Driver RC — 0.1.0-rc.1)

- [x] Today page with all diary fields
- [x] Timeline with tag filtering
- [x] Calendar month view with content markers
- [x] Entry detail page with prev/next navigation
- [x] Full-text search with advanced filters and highlighting
- [x] Tags input per entry
- [x] Auto-save with debounce + beforeunload protection
- [x] Markdown preview toggle
- [x] Daily tasks (planned/done/skipped) with carry-over
- [x] Insights dashboard (7/30/90 day trends + heatmap + task trend)
- [x] Reading asset library (book aggregation, search)
- [x] Coding project & language library (WakaTime aggregation)
- [x] Week/month reviews with saveable drafts
- [x] Markdown single/batch/review export
- [x] Markdown import with parse/preview/confirm
- [x] Legacy My-Life-Log / Obsidian markdown import
- [x] WakaTime API integration with manual sync + error states
- [x] WeRead JSON import with validation
- [x] SQLite backup + restore (list/restore/delete with safety snapshot)
- [x] Schema versioning with idempotent migrations
- [x] Health check API (/api/health)
- [x] Privacy check API (/api/privacy)
- [x] Command palette (Ctrl+K) with date jump + quick task
- [x] Keyboard shortcuts (Ctrl+S, Ctrl+E)
- [x] Font Awesome + lucide unified icon system
- [x] PWA manifest + installable metadata
- [x] Offline detection with visual indicator
- [x] Global navigation bar
- [x] /about page with version, health, and privacy info
- [x] Release checklist (docs/release-checklist.md)
- [x] CHANGELOG.md (all versions)
- [x] 88 automated verification tests
- [x] `.dog-diary/`, `/exports/`, `/backups/` in .gitignore

## In Progress

- [ ] Real WeRead (微信读书) API — pending official/verified API
- [ ] Playwright browser tests

## Planned

- [ ] Desktop app (Electron/Tauri)
- [ ] GitHub private data repository sync (needs user-owned private repo)
- [ ] AI-powered daily/weekly summary generation
- [ ] Image/file attachments in diary entries
- [ ] Multi-language support (i18n)
- [ ] Obsidian vault interop (bidirectional .md sync)
- [ ] Mobile PWA with full offline support
- [ ] Export package with zip compression
