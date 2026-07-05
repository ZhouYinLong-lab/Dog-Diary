<!-- @source: dog-frontier/phase-1 + first-principles -->
<!-- @phase: discovery -->
<!-- @date: 2026-06-30 -->

# Dog-Diary Product Brief

## First Principles

### Assumptions Removed

| Assumption | Status | Decision |
| --- | --- | --- |
| A diary app must be a Markdown file editor | Not required | Markdown is an export format, not the runtime data model. |
| API data should be written into the diary body | False | API data is supporting context and must never crowd out hand-written notes. |
| Empty sections should remain visible for template consistency | False | Empty API-backed sections are omitted to keep the daily page quiet. |
| Sync services like Feishu or Memo are required | False | V1 is local-first and does not depend on third-party capture tools. |

### Fundamental Goal

Dog-Diary exists to make daily reflection easy enough to open every day, while preserving durable personal data that can be exported as Markdown.

### Hard Constraints

- The user's own writing must not be overwritten by automation.
- Local data must work without Feishu, Memo, or a hosted database.
- API integrations must be optional.
- Markdown export must be deterministic and readable.
- Yesterday's plan must flow into today's context without manual copy-paste.

## Requirement Card

| Field | Value |
| --- | --- |
| project_id | dog-diary |
| project_type | new |
| stack | react-tailwind |
| page_type | productivity-workspace |
| style_preference | quiet dense workbench |
| product_domain | personal knowledge / journaling |
| target_audience | individual developer |
| constraints | local-first, SQLite data model, optional WakaTime and WeRead modules, Markdown export |

## V1 Scope

- Today page with date metadata and daily writing sections.
- SQLite-backed local persistence.
- Automatic copy of yesterday's `tomorrow` field into today's `yesterdayPlan`.
- API module placeholders for WakaTime and WeRead.
- API-backed sections hidden from export when no snapshot content exists.
- Markdown export for the selected day.
