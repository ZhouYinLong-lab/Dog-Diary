# Dog-Diary Data Model

## Tables

### `diary_entries`

| Column | Type | Description |
| --- | --- | --- |
| `date` | text (PK) | ISO date YYYY-MM-DD |
| `happened` | text | 发生了什么 |
| `thoughts` | text | 我在想什么 |
| `ideas` | text | Ideas |
| `body_life` | text | 身体与生活 |
| `yesterday_plan` | text | 昨天对今天的计划 (auto-inherited) |
| `tomorrow` | text | 明天 (plan for tomorrow) |
| `tags_json` | text | JSON array of tag strings |
| `mood` | text | Free-form mood description |
| `energy` | integer | 0-10 energy level |
| `created_at` | text | ISO timestamp |
| `updated_at` | text | ISO timestamp |

### `daily_tasks`

| Column | Type | Description |
| --- | --- | --- |
| `id` | text (PK) | `task:{date}:{timestamp}` |
| `date` | text | ISO date YYYY-MM-DD |
| `title` | text | Task description |
| `status` | text | `planned` / `done` / `skipped` |
| `source` | text | `manual` / `yesterday` / `review` |
| `created_at` | text | ISO timestamp |
| `updated_at` | text | ISO timestamp |

### `api_snapshots`

| Column | Type | Description |
| --- | --- | --- |
| `id` | text (PK) | `{provider}:{date}` |
| `date` | text | ISO date |
| `provider` | text | `wakatime` / `weread` |
| `status` | text | `ready` / `empty` / `error` |
| `payload_json` | text | JSON blob with provider-specific data |
| `created_at` | text | ISO timestamp |
| `updated_at` | text | ISO timestamp |
| **UNIQUE** | (date, provider) | |

### `review_records`

| Column | Type | Description |
| --- | --- | --- |
| `id` | text (PK) | `{type}:{periodStart}` |
| `type` | text | `week` / `month` |
| `period_start` | text | Start date |
| `period_end` | text | End date |
| `content` | text | User-edited review markdown |
| `created_at` | text | ISO timestamp |
| `updated_at` | text | ISO timestamp |

### `integration_accounts`

| Column | Type | Description |
| --- | --- | --- |
| `provider` | text (PK) | `wakatime` / `weread` |
| `enabled` | integer | 0 or 1 |
| `api_key` | text | Encrypted/masked key |
| `config_json` | text | JSON blob for extra config |
| `updated_at` | text | ISO timestamp |

## Payload Schemas

### WakaTime Snapshot Payload

```json
{
  "totalSeconds": 5400,
  "totalText": "1 hr 30 mins",
  "projects": [{ "name": "dog-diary", "text": "1 hr", "percent": 67 }],
  "languages": [{ "name": "TypeScript", "text": "1 hr 30 mins", "percent": 100 }],
  "markdown": "- **总编码时长**: 1 hr 30 mins\n\n**项目分布**..."
}
```

### WeRead Snapshot Payload

```json
{
  "books": [{ "title": "三体", "author": "刘慈欣", "durationMinutes": 45, "highlights": 3, "notes": 1 }],
  "totalDurationMinutes": 45,
  "totalHighlights": 3,
  "totalNotes": 1,
  "markdown": "- **总阅读时长**: 45 分钟\n..."
}
```

## File System

| Path | Purpose | Git |
| --- | --- | --- |
| `.dog-diary/dog-diary.sqlite` | SQLite database | ignored |
| `exports/YYYY/MM/YYYY-MM-DD.md` | Markdown exports | ignored |
| `backups/dog-diary-YYYY-MM-DD-HHmm.sqlite` | Database backups | ignored |

## Invariants

1. Yesterday's `tomorrow` is auto-copied to today's `yesterday_plan` on day creation (never overwritten on subsequent saves)
2. Empty WakaTime/WeRead modules produce **no** heading in Markdown export (`## 创造 / 编程` and `## 阅读` only appear when corresponding snapshot data exists and has non-empty markdown)
3. API keys are stored in `integration_accounts` and never returned in full to the frontend (masked as `••••`)
4. Markdown import merges into existing entries without overwriting non-empty fields
