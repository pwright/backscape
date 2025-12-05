#!/usr/bin/env python3
"""
Fetch blockscape release tarballs, extract them, and refresh index.html with links to each release directory.

Intended to be run periodically (e.g. via GitHub Actions). The script:
  1) Reads tags from the GitHub API.
  2) Downloads any missing tarballs from https://github.com/pwright/blockscape.
  3) Extracts each tarball into ./<tag>/.
  4) Regenerates index.html with links to all release directories.
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import tarfile
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence

REPO = "pwright/blockscape"
API_TAGS_URL = f"https://api.github.com/repos/{REPO}/tags"
DOWNLOAD_URL_TEMPLATE = f"https://github.com/{REPO}/archive/refs/tags/{{tag}}.tar.gz"
USER_AGENT = "backscape-release-updater"
INDEX_PATH = Path("index.html")


def github_headers() -> Dict[str, str]:
    headers = {"User-Agent": USER_AGENT}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def parse_link_header(header: str) -> Dict[str, str]:
    """Parse GitHub-style Link header into a dict of rel->url."""
    rels: Dict[str, str] = {}
    for part in header.split(","):
        section = part.strip().split(";")
        if len(section) < 2:
            continue
        url_part = section[0].strip()
        rel_part = section[1].strip()
        if not (url_part.startswith("<") and url_part.endswith(">")):
            continue
        url = url_part[1:-1]
        if rel_part.startswith('rel="') and rel_part.endswith('"'):
            rel = rel_part[5:-1]
            rels[rel] = url
    return rels


def fetch_all_tags() -> List[str]:
    tags: List[str] = []
    url: Optional[str] = API_TAGS_URL + "?per_page=100"

    while url:
        req = urllib.request.Request(url, headers=github_headers())
        with urllib.request.urlopen(req) as resp:
            page = json.load(resp)
            tags.extend(item["name"] for item in page)
            link_header = resp.headers.get("Link")
            if link_header:
                links = parse_link_header(link_header)
                url = links.get("next")
            else:
                url = None
    return tags


def safe_extract_all(tar: tarfile.TarFile, dest: Path) -> None:
    dest_path = dest.resolve()
    for member in tar.getmembers():
        member_path = dest_path / member.name
        if not str(member_path.resolve()).startswith(str(dest_path)):
            raise RuntimeError(f"Unsafe path in archive: {member.name}")
    tar.extractall(dest, filter="data")


def download_tarball(tag: str) -> Path:
    url = DOWNLOAD_URL_TEMPLATE.format(tag=urllib.parse.quote(tag))
    req = urllib.request.Request(url, headers=github_headers())
    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".tar.gz")
    try:
        with urllib.request.urlopen(req) as resp, tmp_file:
            shutil.copyfileobj(resp, tmp_file)
    except Exception:
        Path(tmp_file.name).unlink(missing_ok=True)
        raise
    return Path(tmp_file.name)


def extract_release(tag: str, tarball_path: Path) -> Path:
    target_dir = Path(tag)
    with tarfile.open(tarball_path, "r:gz") as tar:
        tmp_dir = Path(tempfile.mkdtemp(prefix="blockscape-"))
        try:
            safe_extract_all(tar, tmp_dir)
            # Prefer top-level directory name from the first member
            root_names: Sequence[str] = sorted({Path(m.name).parts[0] for m in tar.getmembers() if m.name})
            if len(root_names) != 1:
                raise RuntimeError(f"Unexpected archive structure for {tag}: roots={root_names}")
            extracted_root = tmp_dir / root_names[0]
            if not extracted_root.exists():
                raise RuntimeError(f"Extraction root missing for {tag}: {extracted_root}")
            shutil.move(str(extracted_root), target_dir)
            print(f"[new] extracted {tag} -> {target_dir}")
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    return target_dir


def render_index(release_dirs: Iterable[Path]) -> str:
    items = []
    for path in sorted(release_dirs, key=lambda p: p.name, reverse=True):
        name = path.name
        items.append(f'    <li><a href="{name}/docs/">{name}</a></li>')

    body = "\n".join(items) or "    <li>No releases downloaded yet.</li>"
    return "\n".join(
        [
            "<!doctype html>",
            '<html lang="en">',
            "<head>",
            '  <meta charset="utf-8" />',
            "  <title>blockscape releases</title>",
            '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
            "  <style>",
            "    body { font-family: sans-serif; max-width: 720px; margin: 40px auto; padding: 0 16px; }",
            "    h1 { margin-bottom: 8px; }",
            "    ul { line-height: 1.6; }",
            "  </style>",
            "</head>",
            "<body>",
            "  <h1>blockscape releases</h1>",
            "  <ul>",
            body,
            "  </ul>",
            "</body>",
            "</html>",
        ]
    )


def write_index(paths: Iterable[Path]) -> None:
    html = render_index(paths)
    INDEX_PATH.write_text(html, encoding="utf-8")
    print(f"[ok] updated {INDEX_PATH}")


def ensure_releases(tags: Sequence[str]) -> List[Path]:
    downloaded: List[Path] = []
    for tag in tags:
        target_dir = Path(tag)
        if target_dir.exists():
            print(f"[skip] {tag} already present at {target_dir}")
            continue

        tarball = download_tarball(tag)
        try:
            downloaded.append(extract_release(tag, tarball))
        finally:
            Path(tarball).unlink(missing_ok=True)
    return downloaded


def main() -> int:
    try:
        tags = fetch_all_tags()
    except urllib.error.HTTPError as exc:
        print(f"Failed to fetch tags ({exc.code}): {exc.reason}", file=sys.stderr)
        return 1
    except Exception as exc:  # pylint: disable=broad-except
        print(f"Failed to fetch tags: {exc}", file=sys.stderr)
        return 1

    if not tags:
        print("No tags found; nothing to do.")
        return 0

    print(f"Found {len(tags)} tag(s).")
    downloaded_dirs = ensure_releases(tags)

    existing_releases = [p for p in Path(".").iterdir() if p.is_dir() and p.name in tags]
    all_releases = set(existing_releases) | set(downloaded_dirs)
    write_index(all_releases)
    return 0


if __name__ == "__main__":
    sys.exit(main())
