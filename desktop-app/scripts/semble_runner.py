from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Iterable


REPO_ROOT = Path(__file__).resolve().parents[2]
INSTALL_PATH = REPO_ROOT / ".tools" / "semble"
def ensure_install() -> None:
    if not INSTALL_PATH.exists():
        raise SystemExit(
            "Semble is not installed for this workspace. "
            "Run 'desktop-app/scripts/install-semble.ps1' first."
        )
    sys.path.insert(0, str(INSTALL_PATH))


ensure_install()

from semble import SembleIndex  # noqa: E402


def build_index(repo: str, include_text_files: bool) -> tuple[SembleIndex, Path | None]:
    if repo.startswith("http://") or repo.startswith("https://"):
        return SembleIndex.from_git(repo), None

    repo_path = Path(repo)
    if not repo_path.is_absolute():
        repo_path = (Path.cwd() / repo_path).resolve()
    return (
        SembleIndex.from_path(
            str(repo_path),
            include_text_files=include_text_files,
        ),
        repo_path,
    )


def emit_results(results: Iterable, *, title: str) -> int:
    results = list(results)
    if not results:
        print(f"{title}: no results")
        return 0

    print(f"{title}: {len(results)}")
    for index, result in enumerate(results, start=1):
        print(
            f"[{index}] {result.chunk.file_path}:{result.chunk.start_line}-{result.chunk.end_line} "
            f"score={result.score:.4f}"
        )
        print(result.chunk.content.rstrip())
        print("---")
    return 0


def command_search(args: argparse.Namespace) -> int:
    index, _ = build_index(args.repo, args.include_text_files)
    results = index.search(
        args.query,
        top_k=args.top_k,
        filter_languages=args.filter_language or None,
        filter_paths=args.filter_path or None,
        rerank=not args.no_rerank,
    )
    return emit_results(results, title="search results")


def resolve_seed_chunk(index: SembleIndex, repo_path: Path | None, file_path: str, line: int):
    raw_path = Path(file_path)
    candidate_strings = {file_path, file_path.replace("/", "\\"), file_path.replace("\\", "/")}

    if repo_path is not None:
        if raw_path.is_absolute():
            absolute_path = raw_path.resolve()
        else:
            absolute_path = (repo_path / raw_path).resolve()
        try:
            relative = absolute_path.relative_to(repo_path)
            candidate_strings.add(str(relative))
            candidate_strings.add(str(relative).replace("/", "\\"))
            candidate_strings.add(str(relative).replace("\\", "/"))
        except ValueError:
            candidate_strings.add(str(absolute_path))
            candidate_strings.add(str(absolute_path).replace("/", "\\"))
            candidate_strings.add(str(absolute_path).replace("\\", "/"))

    nearest = None
    nearest_distance = None

    for chunk in index.chunks:
        if chunk.file_path not in candidate_strings:
            continue
        if chunk.start_line <= line <= chunk.end_line:
            return chunk
        distance = min(abs(chunk.start_line - line), abs(chunk.end_line - line))
        if nearest_distance is None or distance < nearest_distance:
            nearest = chunk
            nearest_distance = distance

    if nearest is not None:
        return nearest

    raise SystemExit(f"No indexed chunk found for {file_path}:{line}")


def command_find_related(args: argparse.Namespace) -> int:
    index, repo_path = build_index(args.repo, args.include_text_files)
    seed = resolve_seed_chunk(index, repo_path, args.file_path, args.line)
    related = index.find_related(seed, top_k=args.top_k)

    print(f"seed: {seed.file_path}:{seed.start_line}-{seed.end_line}")
    print(seed.content.rstrip())
    print("===")
    return emit_results(related, title="related results")


def command_stats(args: argparse.Namespace) -> int:
    index, repo_path = build_index(args.repo, args.include_text_files)
    print(f"repo: {repo_path if repo_path is not None else args.repo}")
    print(f"indexed_files: {index.stats.indexed_files}")
    print(f"total_chunks: {index.stats.total_chunks}")
    print("languages:")
    for language, count in sorted(index.stats.languages.items(), key=lambda item: (-item[1], item[0])):
        print(f"  - {language}: {count}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Workspace-local Semble wrapper")
    subparsers = parser.add_subparsers(dest="command", required=True)

    search = subparsers.add_parser("search", help="Search a repo with a natural-language or symbol query")
    search.add_argument("query")
    search.add_argument("repo", nargs="?", default=".")
    search.add_argument("--top-k", type=int, default=5)
    search.add_argument("--filter-language", action="append")
    search.add_argument("--filter-path", action="append")
    search.add_argument("--include-text-files", action="store_true")
    search.add_argument("--no-rerank", action="store_true")
    search.set_defaults(handler=command_search)

    find_related = subparsers.add_parser("find-related", help="Find code related to a known file and line")
    find_related.add_argument("file_path")
    find_related.add_argument("line", type=int)
    find_related.add_argument("repo", nargs="?", default=".")
    find_related.add_argument("--top-k", type=int, default=5)
    find_related.add_argument("--include-text-files", action="store_true")
    find_related.set_defaults(handler=command_find_related)

    stats = subparsers.add_parser("stats", help="Show index stats for the repo")
    stats.add_argument("repo", nargs="?", default=".")
    stats.add_argument("--include-text-files", action="store_true")
    stats.set_defaults(handler=command_stats)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return int(args.handler(args) or 0)


if __name__ == "__main__":
    raise SystemExit(main())
