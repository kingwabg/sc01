# Semble Integration

Last verified: 2026-05-25

## What Semble Helps With

Semble is a local code-search tool for agents. It reduces the amount of code an agent needs to read by returning only the most relevant chunks instead of whole files.

For this project, that is especially useful because several files are already large:

- `desktop-app/src/styles.css`
- `desktop-app/src/data/localDatabase.ts`
- `desktop-app/src/features/children-roster/ChildrenRosterPage.tsx`
- `desktop-app/src/data/hwpxExport.ts`

Important: this helps with **agent context token usage**, not application runtime tokens.

## Why It Fits This Repo

This repository mixes:

- React / TSX screens
- large TypeScript data files
- legacy Apps Script files in the repo root
- PowerShell / Python helper scripts
- RHWP-related assets and generated files that should usually be ignored

Semble's chunked search is a good match for cross-cutting questions like:

- "Where is year-scoped child detail saved?"
- "How does journal preview connect to the editor?"
- "What paths write to local SQLite and what paths only read?"

## Verified Findings On This Repo

Semble was tested locally against this repository using a workspace-local install.

Observed repo stats from the local wrapper:

- indexed files: `93`
- total chunks: `7420`
- language breakdown is heavily concentrated in repo-root Apps Script JavaScript, then TypeScript / TSX / CSS in `desktop-app`

Observed search quality:

- Query: `year-scoped child detail save`
  - returned `ChildrenRosterPage.tsx`
  - returned `localDatabase.ts`
  - returned `dataProvider.ts`
- Query: `saveChildYearRecord`
  - top result returned the concrete implementation in `desktop-app/src/data/localDatabase.ts`
  - next result returned the provider surface in `desktop-app/src/data/dataProvider.ts`

This is the exact kind of result pattern we want in this codebase: implementation plus call surface, without reading entire large files.

## Caveats Found During Verification

- First search downloads the embedding model from Hugging Face, so the very first run is slower.
- On Windows without Developer Mode, Hugging Face cache may warn about symlink limitations.
- In the installed `0.2.0` Python API, `SembleIndex.search()` supports:
  - `query`
  - `top_k`
  - `alpha`
  - `filter_languages`
  - `filter_paths`
  - `rerank`
- In the same installed version, `SembleIndex.from_path()` supports:
  - `path`
  - `model`
  - `extensions`
  - `include_text_files`
- The published docs mention a `mode` parameter, but the installed API in this environment did not expose it.
- The local wrapper in this repo therefore exposes a stable subset:
  - `search`
  - `find-related`
  - `stats`
  - `--include-text-files`
- While indexing this repo, a warning appeared: `Recursion depth exceeded in chunk.`
  - Searches still returned usable results.
  - If this becomes noisy later, inspect whether a specific oversized source file is triggering it.

## Local Workspace Setup

This repo now includes a small local wrapper so Semble can be used without a global install.

Install Semble into the workspace:

```powershell
& .\desktop-app\scripts\install-semble.ps1
```

Search the repo:

```powershell
& .\desktop-app\scripts\semble.ps1 search "year-scoped child detail save" .
```

Find related code:

```powershell
& .\desktop-app\scripts\semble.ps1 find-related desktop-app/src/data/localDatabase.ts 1253 .
```

Show index stats:

```powershell
& .\desktop-app\scripts\semble.ps1 stats .
```

Include docs / config-like text files in the index:

```powershell
& .\desktop-app\scripts\semble.ps1 search "spreadsheet sync" . --include-text-files
```

## Recommended Usage Rules

Use Semble first when:

- the question is architectural or behavioral
- the likely answer spans multiple files
- the target file is large and expensive to read in full
- the symbol name is only partly known

Use `rg` first when:

- you need exhaustive literal matches
- you already know the exact symbol or string
- you are confirming whether a very specific text exists

## Codex MCP Option

If you want Semble to appear as a native MCP tool in Codex, add a Semble server entry to your Codex config.

The upstream docs recommend:

```toml
[mcp_servers.semble]
command = "uvx"
args = ["--from", "semble[mcp]", "semble"]
```

Source:

- [Semble MCP Server docs](https://minish.ai/packages/semble/mcp-server/)
- [Semble GitHub repository](https://github.com/MinishLab/semble)

For this repo specifically, the local wrapper at `desktop-app/scripts/semble_runner.py` can also be used as the command target if you prefer a workspace-local install instead of `uvx`.
