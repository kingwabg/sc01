# Codex Working Rules

This repository is a long-running Seochang operations project. Before making changes, read `PROJECT_MEMORY.md` first, then open any referenced task-specific docs.

On a fresh thread, run the bootstrap check before substantial work:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\desktop-app\scripts\bootstrap-check.ps1
```

## Critical Memory

- The project includes Google Sheets, Google Apps Script, Telegram bot work, and a Tauri + React + SQLite desktop/web app.
- Root `.js` and `.html` files are the Apps Script source that can be edited directly and pushed with clasp when needed.
- Spreadsheet ID: `1iy5O6Qen4EKW30EqYvTbzZNkmA5SL-ZdZgUh5mu5Wx4`.
- Apps Script project ID: `1dqZp9bn1j8egPyYD-9w91OBWXdgZPL6bYtjwvqo-YW2Ze3kY73K4M1kQ`.
- Clasp account used by the owner: `seochang23.1@gmail.com`.
- Desktop app lives in `desktop-app` and uses Tauri + React + SQLite.
- RHWP editor source lives under `desktop-app/vendor/rhwp/rhwp-studio`; built public files live under `desktop-app/public/rhwp-studio`.
- RHWP table work is expensive and must not be forgotten. Update `desktop-app/docs/rhwp-table-feature-check.md` whenever RHWP table behavior changes.
- Push completed work to `https://github.com/kingwabg/sc01.git` after each finished task when possible.

## Thread Transition Rule

If the conversation becomes long, context feels fuzzy, the same bug has been revisited several times, or a major commit has just landed, produce a short handoff summary and recommend a new thread. The summary must include:

- Latest goal
- Completed work
- Current blockers
- Files changed
- Commands/builds/tests run
- Latest commit hash
- Next recommended action

Keep the project memory durable in files, not only in chat.

## Semble Search

This repository now has an optional Semble workflow for semantic code search.

- Install locally with `desktop-app/scripts/install-semble.ps1`
- Run through `desktop-app/scripts/semble.ps1`
- Use Semble first for broad behavioral or architectural questions across large files
- Keep using `rg` for exact literal matches or exhaustive symbol confirmation

Reference notes live in `desktop-app/docs/semble-integration.md`.
