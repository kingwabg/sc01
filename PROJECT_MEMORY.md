# Project Memory

Last updated: 2026-05-21 21:30:02 +09:00

This file is the durable memory for the Seochang operations project. It exists so a new AI thread can continue without losing the hard-won context from earlier work.

## Why This Exists

Long conversations can make the assistant lose precision. When a thread gets long, the correct move is not to trust chat memory. The correct move is to read this file, the latest commit, and the task-specific docs, then continue from a fresh context.

## Project Shape

- Google Sheets is still important for the existing workflow, import/export, review, and shared data.
- Google Apps Script is still active and can be edited directly through the source files in this repository.
- The new app direction is Tauri + React + SQLite, with optional web mode and later API sync.
- Apps Script and Google Sheets remain as a bridge while the desktop/web app becomes the primary operating system.

## Google / Apps Script

- Spreadsheet URL: `https://docs.google.com/spreadsheets/d/1iy5O6Qen4EKW30EqYvTbzZNkmA5SL-ZdZgUh5mu5Wx4/edit`
- Spreadsheet ID: `1iy5O6Qen4EKW30EqYvTbzZNkmA5SL-ZdZgUh5mu5Wx4`
- Apps Script project ID: `1dqZp9bn1j8egPyYD-9w91OBWXdgZPL6bYtjwvqo-YW2Ze3kY73K4M1kQ`
- Clasp login account: `seochang23.1@gmail.com`
- `appsscript.json` currently has Execution API access set to `MYSELF`.
- Root source files such as `Code.js`, `attendance-dialog.js`, `staff-roster-dialog.js`, `staff-roster-view.html`, `editable-preview.js`, `telegram-bot.js`, and related files are Apps Script code.
- If Apps Script behavior changes, check whether the change needs a clasp push and whether the spreadsheet menu must be refreshed.

## Desktop / Web App

- App root: `desktop-app`
- Stack: Tauri + React + SQLite.
- Development URL: `http://127.0.0.1:1420`
- Data direction:
  - SQLite should be the fast local source for the desktop app.
  - Google Sheets should be treated as import/export, backup, and shared review storage.
  - Apps Script Web App can be used as a sync channel.
- Important files:
  - `desktop-app/src/App.tsx`
  - `desktop-app/src/styles.css`
  - `desktop-app/src/data/localDatabase.ts`
  - `desktop-app/src/data/sheetSync.ts`
  - `desktop-app/src/data/journalTemplates.ts`
  - `desktop-app/src/data/hwpxExport.ts`
- Semble semantic code search is prepared for this repo:
  - install script: `desktop-app/scripts/install-semble.ps1`
  - Codex MCP install script: `desktop-app/scripts/install-semble-codex-mcp.ps1`
  - wrapper: `desktop-app/scripts/semble.ps1`
  - notes: `desktop-app/docs/semble-integration.md`
  - use it for broad semantic search across large files; keep `rg` for exact string checks

## RHWP Table Work: Do Not Lose This

RHWP table work took a lot of effort. Always preserve this context.

- Main tracking file: `desktop-app/docs/rhwp-table-feature-check.md`
- RHWP source path: `desktop-app/vendor/rhwp/rhwp-studio`
- RHWP upstream source: `https://github.com/edwardkim/rhwp.git`
- `desktop-app/vendor/rhwp/` is intentionally ignored by Git as a large local reference checkout. If it is missing, clone upstream with LFS smudge disabled when LFS budget blocks large PDFs: `GIT_LFS_SKIP_SMUDGE=1 git clone https://github.com/edwardkim/rhwp.git desktop-app/vendor/rhwp`.
- Public built path: `desktop-app/public/rhwp-studio`
- When RHWP source changes:
  - Build RHWP studio.
  - Copy the new build into `desktop-app/public/rhwp-studio`.
  - Update `desktop-app/docs/rhwp-table-feature-check.md` with timestamped results.
  - Verify in browser when possible.

Known RHWP table milestone:

- Commit `8dddf99` added `table:cell-select-range`.
- Toolbar button: `셀 선택`.
- Cell range selection now starts from the toolbar and extends by clicking another cell.
- Ctrl/Meta click toggles cells.
- Cell merge/split and row/column actions were verified after the range selection fix.

## Git / Push Rule

- Remote repository: `https://github.com/kingwabg/sc01.git`
- Push finished work after each completed task when practical.
- Before committing, stage only relevant files.
- Existing untracked public RHWP assets may be stale build leftovers. Do not delete or stage unrelated generated files unless the task requires it.

## Thread Transition Triggers

Recommend a new thread when any of these happen:

- The conversation has grown long enough that the model starts repeating itself.
- A task has had several failed attempts or multiple design pivots.
- RHWP table work, Apps Script sync, or data migration logic has changed.
- A commit has been pushed and the next task is a new phase.
- The user asks "다음은?" after a large task.

## Fresh Thread Startup

When a new thread starts, read `AGENTS.md` and this file first. Then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\desktop-app\scripts\bootstrap-check.ps1
```

For a full build check, run the same script with `-Build`.

Current note:

- Fast bootstrap check is expected to complete even when warnings exist.
- If `-Build` fails at the RHWP guard, inspect `desktop-app/scripts/check-rhwp-boundary-guard.mjs` and the active bundle referenced by `desktop-app/public/rhwp-studio/index.html`.
- As of this update, the active RHWP bundle has `table:cell-select-range`, but the table boundary clamp markers are not present in that active bundle.

## Handoff Template

Use this when recommending a new thread:

```markdown
## 새 스레드 인수인계

현재 목표:

완료한 작업:

중요한 결정:

수정한 파일:

검증한 내용:

최근 커밋:

남은 문제:

다음 작업:
```
