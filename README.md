# Dog-Diary — Daily Driver RC (0.1.0-rc.1)

Local-first diary workbench — write, track, reflect. All data in local SQLite.

## Features

### Writing & Journaling
- Today page with fixed sections: 发生了什么, 我在想什么, Ideas, 身体与生活, 昨天对今天的计划, 明天
- Yesterday's `明天` auto-copied to today's `昨天对今天的计划`
- Mood and energy (0-10) tracking
- Comma-separated tags with chip display
- Auto-save (2s debounce) + manual save
- Markdown preview toggle
- Keyboard shortcuts: `Ctrl+S` save, `Ctrl+E` export, `Ctrl+K` command palette

### Task Closed Loop
- Daily tasks with status: planned / done / skipped
- Carry-over from yesterday's uncompleted tasks
- One-click convert yesterday's plan text to tasks
- Task completion stats in week/month reviews

### Navigation & Discovery
- **Timeline** (`/timeline`): All entries, tag filter
- **Calendar** (`/calendar`): Monthly grid with content markers
- **Search** (`/search`): Full-text search with 7 filter dimensions
- **Entry Detail** (`/entry/[date]`): Markdown view, prev/next navigation
- **Insights** (`/insights`): 7/30/90 day trends (streak, mood, energy, tags, coding, reading)
- **Reading** (`/reading`): Book library aggregated from WeRead imports
- **Coding** (`/coding`): Project & language breakdown from WakaTime

### Reviews
- Week review (`/review/week`) and month review (`/review/month`)
- Auto-generated draft from aggregated data
- Saveable user-edited drafts with persistence
- Task completion rate, coding/reading stats included

### Integrations
- **WakaTime**: API key config, manual sync (single day + 7 days), error states, project/language drill-down
- **WeRead (微信读书)**: JSON import with validation, book aggregation, reading stats

### Import & Export
- Markdown export: single entry, batch all, review (week/month)
- Files written to `exports/YYYY/MM/YYYY-MM-DD.md`
- Markdown import: parse → preview → confirm, merges without overwriting
- SQLite backup: timestamped copies to `backups/`

### Safety & Privacy
- All data in local SQLite (`.dog-diary/dog-diary.sqlite`)
- `.dog-diary/`, `/exports/`, `/backups/` all in `.gitignore`
- API keys masked on settings page (shown as `••••`)
- Privacy check API verifies git safety
- **Never push private diary data to a public repository**

### Quality
- 88 automated verification tests
- `npm run lint` and `npm run build` — 0 errors
- Font Awesome + lucide unified `<Icon>` wrapper
- Offline detection with visual indicator
- Unsaved changes protection (beforeunload warning)
- All icon-only buttons have `aria-label`
- No emoji as functional icons
- Mobile-responsive (no horizontal scroll at 375px)

## Privacy

- **All diary data stays on your machine** — stored in local SQLite (`.dog-diary/`)
- `.dog-diary/`, `/exports/`, `/backups/` are in `.gitignore` — never committed
- **You can make this code repository public** — it contains only application code, not your diary data
- **Never push your diary data, exports, or backups to a public repository**
- If you want GitHub sync for private data, use a separate private repository
- WakaTime API key is stored locally and never exposed to frontend logs
- WeRead integration uses manual JSON import only (no unverified third-party API)
- Run `/api/privacy` check to verify your setup

## Data Model

See [docs/data-model.md](docs/data-model.md).

## Roadmap

See [docs/roadmap.md](docs/roadmap.md).

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verify

```bash
npx tsx scripts/verify.ts
```
