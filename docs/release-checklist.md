# Dog-Diary Release Checklist

Run before each release.

## Code Quality

- [ ] `npm run lint` — 0 errors, 0 warnings
- [ ] `npm run build` — all routes compile
- [ ] `npx tsx scripts/verify.ts` — all tests pass
- [ ] No TypeScript errors in editor

## Data Safety

- [ ] `.dog-dairy/` in `.gitignore`
- [ ] `/exports/` in `.gitignore`
- [ ] `/backups/` in `.gitignore`
- [ ] `git ls-files` confirms no `.sqlite` or export files tracked
- [ ] API keys not exposed in frontend source or console.log
- [ ] Settings page shows masked keys (`••••`)
- [ ] `/api/privacy` returns all-ok
- [ ] `/api/health` returns healthy

## Functional Checks

- [ ] Today page: write → auto-save → reload → content persists
- [ ] Yesterday's `明天` appears as today's `昨天对今天的计划`
- [ ] Timeline loads, tag filter works
- [ ] Calendar shows correct active dates
- [ ] Search returns results for Chinese text
- [ ] Entry detail `/entry/YYYY-MM-DD` renders Markdown preview
- [ ] Command palette opens with Ctrl+K, Esc closes
- [ ] Ctrl+S saves, Ctrl+E exports
- [ ] WakaTime: no key → no request; errored state handled
- [ ] WeRead JSON import → data appears in `/reading`
- [ ] Markdown export: empty modules produce no heading
- [ ] Markdown import: parse → preview → confirm → data in DB
- [ ] Backup create → list → restore → delete
- [ ] Review drafts save and reload across page switches
- [ ] Tasks: create, complete, skip, delete, carry-over

## Mobile

- [ ] 375px: no horizontal scroll
- [ ] All inputs have visible labels
- [ ] Icon-only buttons have aria-labels
- [ ] Navigation works at narrow widths

## Docs

- [ ] README reflects current features
- [ ] `qa-report.md` updated
- [ ] `docs/roadmap.md` updated
- [ ] `docs/data-model.md` matches schema
- [ ] `CHANGELOG.md` updated
