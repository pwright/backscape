#!/usr/bin/env python3
"""
Apply configured word/phrase substitutions to every "name" field in a JSON (.bs)
map file. Substitutions live in a separate JSON file so they can be edited
without touching the script.

Usage:
  python apply_name_substitutions.py setu.bs name_substitutions.json \
    --min-length 32
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable, List, Tuple


def load_substitutions(path: Path) -> List[Tuple[str, str]]:
    """Load substitutions as ordered (from, to) pairs from a JSON list or object."""
    try:
        data = json.loads(path.read_text())
    except Exception as exc:  # noqa: BLE001 - want a simple message for users
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


def transform_names(
    node: Any, substitutions: Iterable[Tuple[str, str]], min_length: int, changes: list
) -> None:
    """Recursively walk the structure and apply substitutions to name fields."""
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "name" and isinstance(value, str):
                new_value = apply_substitutions(value, substitutions, min_length)
                if new_value != value:
                    changes.append((value, new_value))
                    node[key] = new_value
            else:
                transform_names(value, substitutions, min_length, changes)
    elif isinstance(node, list):
        for item in node:
            transform_names(item, substitutions, min_length, changes)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Shorten item names using substitutions")
    parser.add_argument("data_path", type=Path, help="Path to the JSON/.bs map file")
    parser.add_argument(
        "substitutions_path",
        type=Path,
        help="Path to JSON substitutions (list of {'from', 'to'} objects or mapping)",
    )
    parser.add_argument(
        "--min-length",
        type=int,
        default=32,
        help="Only apply substitutions when the original name length is >= this value (default: 32)",
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
    args = parser.parse_args(argv)

    if not args.data_path.exists():
        print(f"Data file not found: {args.data_path}", file=sys.stderr)
        return 1
    if not args.substitutions_path.exists():
        print(f"Substitutions file not found: {args.substitutions_path}", file=sys.stderr)
        return 1

    data = json.loads(args.data_path.read_text())
    substitutions = load_substitutions(args.substitutions_path)

    changes: list[tuple[str, str]] = []
    transform_names(data, substitutions, args.min_length, changes)

    if args.dry_run:
        print(f"{len(changes)} names would change:")
        for old, new in changes:
            print(f"- {old} -> {new}")
        return 0

    dest = args.output or args.data_path
    dest.write_text(json.dumps(data, indent=2) + "\n")
    print(f"Updated {dest} ({len(changes)} names changed)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
