#!/usr/bin/env python3
"""
Tidy a Blockscape .bs JSON file by applying multiple cleanup steps in one pass:
  - Strip parenthetical text from every `name` value.
  - Apply configurable substitutions to long names.
  - Trim overlong names to a character limit (non-space chars).
  - Lightly validate structure (ids, titles, name/deps types).

Usage:
  python tidy_bs.py path/to/file.bs \
    --substitutions name_substitutions.json \
    --min-sub-length 32 \
    --trim-limit 20 \
    [--dry-run] [--output out.bs] [--no-strip-parens] [--no-substitutions] \
    [--no-trim] [--no-validate]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable, List, Tuple

PARENS_PATTERN = re.compile(r"\s*\([^)]*\)")
LINK_PATTERN = re.compile(r"\[[^\]]+\]\(([^)]+)\)")


def load_substitutions(path: Path) -> List[Tuple[str, str]]:
    """Load substitutions as ordered (from, to) pairs from a JSON list or object."""
    try:
        data = json.loads(path.read_text())
    except Exception as exc:  # noqa: BLE001
        raise SystemExit(f"Failed to read substitutions from {path}: {exc}")

    if isinstance(data, list):
        pairs = []
        for entry in data:
            if not isinstance(entry, dict) or "from" not in entry or "to" not in entry:
                raise SystemExit(
                    "Substitutions list entries must be objects with 'from' and 'to' keys"
                )
            pairs.append((str(entry["from"]), str(entry["to"])))
        return pairs

    if isinstance(data, dict):
        return [(str(src), str(dst)) for src, dst in data.items()]

    raise SystemExit("Substitutions file must be a JSON list or object")


def apply_substitutions(
    name: str, substitutions: Iterable[Tuple[str, str]], min_length: int
) -> str:
    """
    Apply substitutions to a name when its original length is >= min_length.
    Replacements happen on word boundaries to avoid partial matches.
    """
    if len(name) < min_length:
        return name

    updated = name
    for src, dst in substitutions:
        if not src:
            continue
        pattern = rf"\b{re.escape(src)}\b"
        updated = re.sub(pattern, dst, updated)
        updated = " ".join(updated.split())

    updated = updated.strip()
    return updated or name


def shorten(name: str, limit: int) -> str:
    """Return name shortened to < limit non-space chars, cutting at nearest space."""
    non_space_len = sum(1 for c in name if c != " ")
    if non_space_len < limit:
        return name

    count = 0
    last_space_before_limit = None
    for idx, ch in enumerate(name):
        if ch == " ":
            if count < limit:
                last_space_before_limit = idx
        else:
            count += 1
        if count >= limit:
            break

    if last_space_before_limit is not None:
        return name[:last_space_before_limit].rstrip()

    # No spaces before hitting the limit; fall back to hard cut at limit-1 chars.
    result = []
    count = 0
    for ch in name:
        if ch == " ":
            result.append(ch)
        else:
            if count >= limit - 1:
                break
            result.append(ch)
            count += 1
    return "".join(result).rstrip()


def tidy_name(
    name: str,
    *,
    strip_parens: bool,
    substitutions: Iterable[Tuple[str, str]],
    min_sub_length: int,
    trim_limit: int | None,
) -> str:
    """Apply tidy steps to a single name value."""
    updated = name
    if strip_parens:
        updated = PARENS_PATTERN.sub("", updated).strip()
    if substitutions:
        updated = apply_substitutions(updated, substitutions, min_sub_length)
    if trim_limit:
        updated = shorten(updated, trim_limit)
    return updated


def normalize_markdown_links(text: str) -> tuple[str, int]:
    """Replace Markdown inline links inside ``text`` with their bare URL target."""

    def _replacement(match: re.Match[str]) -> str:  # pragma: no cover - trivial helper
        inner = match.group(1).strip()
        if not inner:
            return ""
        if inner.startswith("<") and inner.endswith(">"):
            inner = inner[1:-1].strip()
        return inner.split()[0]

    transformed, count = LINK_PATTERN.subn(_replacement, text)
    return transformed, count


def normalize_string_literals(node: Any, *, changes: List[Tuple[str, str, int]]) -> None:
    """Recursively rewrite Markdown links inside every string literal in ``node``."""

    if isinstance(node, dict):
        for key, value in node.items():
            if isinstance(value, str):
                normalized, replacements = normalize_markdown_links(value)
                if replacements:
                    changes.append((value, normalized, replacements))
                    node[key] = normalized
            else:
                normalize_string_literals(value, changes=changes)
    elif isinstance(node, list):
        for idx, value in enumerate(node):
            if isinstance(value, str):
                normalized, replacements = normalize_markdown_links(value)
                if replacements:
                    changes.append((value, normalized, replacements))
                    node[idx] = normalized
            else:
                normalize_string_literals(value, changes=changes)


def transform_names(
    node: Any,
    *,
    strip_parens: bool,
    substitutions: Iterable[Tuple[str, str]],
    min_sub_length: int,
    trim_limit: int | None,
    changes: list,
) -> None:
    """Recursively walk the structure and apply tidy_name to name fields."""
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "name" and isinstance(value, str):
                new_value = tidy_name(
                    value,
                    strip_parens=strip_parens,
                    substitutions=substitutions,
                    min_sub_length=min_sub_length,
                    trim_limit=trim_limit,
                )
                if new_value != value:
                    changes.append((value, new_value))
                    node[key] = new_value
            else:
                transform_names(
                    value,
                    strip_parens=strip_parens,
                    substitutions=substitutions,
                    min_sub_length=min_sub_length,
                    trim_limit=trim_limit,
                    changes=changes,
                )
    elif isinstance(node, list):
        for item in node:
            transform_names(
                item,
                strip_parens=strip_parens,
                substitutions=substitutions,
                min_sub_length=min_sub_length,
                trim_limit=trim_limit,
                changes=changes,
            )


def validate_item(item: object) -> Tuple[bool, str]:
    if not isinstance(item, dict):
        return False, "item is not an object"
    if not isinstance(item.get("id"), str):
        return False, "item.id missing or not a string"
    if not isinstance(item.get("name"), str):
        return False, "item.name missing or not a string"
    deps = item.get("deps")
    if deps is not None:
        if not isinstance(deps, list) or not all(isinstance(d, str) for d in deps):
            return False, "item.deps is not a list of strings"
    return True, ""


def validate_category(category: object) -> Tuple[bool, str]:
    if not isinstance(category, dict):
        return False, "category is not an object"
    if not isinstance(category.get("id"), str):
        return False, "category.id missing or not a string"
    if not isinstance(category.get("title"), str):
        return False, "category.title missing or not a string"
    items = category.get("items")
    if not isinstance(items, list):
        return False, "category.items missing or not a list"
    for idx, item in enumerate(items):
        ok, reason = validate_item(item)
        if not ok:
            return False, f"items[{idx}]: {reason}"
    return True, ""


def validate_document(data: object) -> Tuple[bool, str]:
    """Validate either a single map document or a list of map documents."""

    def validate_map(doc: dict, prefix: str) -> Tuple[bool, str]:
        if not isinstance(doc.get("id"), str):
            return False, f"{prefix}id missing or not a string"
        if not isinstance(doc.get("title"), str):
            return False, f"{prefix}title missing or not a string"
        if "abstract" in doc and not isinstance(doc["abstract"], str):
            return False, f"{prefix}abstract is not a string"
        categories = doc.get("categories")
        if not isinstance(categories, list):
            return False, f"{prefix}categories missing or not a list"
        for idx, category in enumerate(categories):
            ok, reason = validate_category(category)
            if not ok:
                return False, f"{prefix}categories[{idx}]: {reason}"
        return True, ""

    if isinstance(data, dict):
        return validate_map(data, prefix="")

    if isinstance(data, list):
        if data and all(isinstance(doc, dict) and "categories" in doc for doc in data):
            for idx, doc in enumerate(data):
                ok, reason = validate_map(doc, prefix=f"maps[{idx}].")
                if not ok:
                    return False, reason
            return True, ""
        # Interpret as list of categories when not a list of maps.
        for idx, category in enumerate(data):
            ok, reason = validate_category(category)
            if not ok:
                return False, f"categories[{idx}]: {reason}"
        return True, ""

    return False, "root is neither object nor list"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Tidy a Blockscape .bs map file.")
    parser.add_argument("data_path", type=Path, help="Path to the JSON/.bs map file")
    parser.add_argument(
        "--substitutions",
        type=Path,
        default=Path("name_substitutions.json"),
        help="Path to JSON substitutions (list of {'from','to'} objects or mapping)",
    )
    parser.add_argument(
        "--min-sub-length",
        type=int,
        default=14,
        help="Only apply substitutions when the original name length is >= this value (default: 14)",
    )
    parser.add_argument(
        "--trim-limit",
        type=int,
        default=20,
        help="Trim names to under this many non-space characters (default: 20). Set to 0 to skip.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show changes without writing the file",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Optional output path; defaults to overwriting the input file",
    )
    parser.add_argument(
        "--no-strip-parens",
        action="store_true",
        help="Disable stripping parenthetical text from names",
    )
    parser.add_argument(
        "--no-substitutions",
        action="store_true",
        help="Disable applying substitutions",
    )
    parser.add_argument(
        "--no-trim",
        action="store_true",
        help="Disable trimming names to a length limit",
    )
    parser.add_argument(
        "--no-validate",
        action="store_true",
        help="Skip structural validation after tidying",
    )
    parser.add_argument(
        "--strip-md-links",
        action="store_true",
        help="Rewrite inline Markdown links (e.g. `[url](url)`) inside every string literal.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    if not args.data_path.exists():
        print(f"Data file not found: {args.data_path}", file=sys.stderr)
        return 1

    try:
        data = json.loads(args.data_path.read_text())
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to read JSON from {args.data_path}: {exc}", file=sys.stderr)
        return 1

    substitutions: list[tuple[str, str]] = []
    if not args.no_substitutions:
        if not args.substitutions.exists():
            print(f"Substitutions file not found: {args.substitutions}", file=sys.stderr)
            return 1
        substitutions = load_substitutions(args.substitutions)

    changes: list[tuple[str, str]] = []
    transform_names(
        data,
        strip_parens=not args.no_strip_parens,
        substitutions=substitutions,
        min_sub_length=args.min_sub_length,
        trim_limit=None if args.no_trim or args.trim_limit == 0 else args.trim_limit,
        changes=changes,
    )

    link_changes: list[tuple[str, str, int]] = []
    if args.strip_md_links:
        normalize_string_literals(data, changes=link_changes)

    if not args.no_validate:
        ok, reason = validate_document(data)
        if not ok:
            print(f"Validation failed: {reason}", file=sys.stderr)
            return 1

    if args.dry_run:
        print(f"{len(changes)} names would change:")
        for old, new in changes:
            print(f"- {old} -> {new}")
        if args.strip_md_links:
            total_link_rewrites = sum(count for _, _, count in link_changes)
            print(
                f"{len(link_changes)} string literal{'s' if len(link_changes) != 1 else ''} would"
                f" rewrite {total_link_rewrites} Markdown link{'s' if total_link_rewrites != 1 else ''}:"
            )
            for old, new, count in link_changes:
                print(f"- {old} -> {new} ({count} link{'s' if count != 1 else ''})")
        return 0

    dest = args.output or args.data_path
    dest.write_text(json.dumps(data, indent=2) + "\n")
    summary_parts = [f"{len(changes)} name{'s' if len(changes) != 1 else ''} changed"]
    if args.strip_md_links:
        total_link_rewrites = sum(count for _, _, count in link_changes)
        summary_parts.append(
            f"{total_link_rewrites} Markdown link{'s' if total_link_rewrites != 1 else ''} normalized"
        )
    print(f"Updated {dest} ({'; '.join(summary_parts)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
