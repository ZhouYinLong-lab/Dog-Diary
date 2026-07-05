# Changelog

## 0.1.0-rc.1 — Daily Driver RC (2026-06-30)

### Added
- Legacy My-Life-Log / Obsidian markdown import (`/api/legacy-import`)
- Backup list, restore, and delete APIs with safety snapshot
- Schema versioning with `schema_migrations` table
- Health check API (`/api/health`)
- PWA manifest and installable metadata
- Calendar heatmap data in insights API
- Task completion trend in insights
- Date jump in command palette (type `YYYY-MM-DD`)
- Release checklist (`docs/release-checklist.md`)
- CHANGELOG.md
- `/about` page

### Changed
- `diary-db.ts` migrate() refactored to versioned migrations (001_initial, 002_reviews, 003_tasks)
- Settings page: backup list + restore UI, legacy import section
- Insights API: added heatmap + task trend

## 0.1.0-alpha — Personal OS Alpha (2026-06-30)

### Added
- Font Awesome icon system with unified `<Icon>` component
- Daily tasks (planned/done/skipped) with carry-over
- `/insights` dashboard (7/30/90 day trends)
- `/reading` library (WeRead book aggregation)
- `/coding` library (WakaTime project/language aggregation)
- Markdown import API (`/api/import`)
- Privacy check API (`/api/privacy`)
- Task stats in review API
- Design system iconography docs

## 0.0.2-beta — Beta 2 (2026-06-30)

### Added
- `/search` with full-text search and 7 filter dimensions
- `/entry/[date]` detail page with prev/next navigation
- Review record persistence (save/load drafts)
- Review Markdown export
- SQLite backup API
- WeRead JSON import
- Command palette (Ctrl+K) with keyboard shortcuts
- Global navigation bar
- 43 verification tests

## 0.0.1-mvp — MVP (2026-06-30)

### Added
- Today page with writing sections
- Yesterday's `明天` → today's `昨天对今天的计划` inheritance
- Timeline page with tag filter
- Calendar month view
- Auto-save with debounce
- Tags input
- Markdown single/batch export
- WakaTime integration placeholder
- WeRead adapter placeholder
- SQLite local storage
- 16 verification tests
