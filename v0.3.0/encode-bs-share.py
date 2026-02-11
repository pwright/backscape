#!/usr/bin/env python3
"""
encode_bs_share.py

Read a .bs file, wrap it in the Blockscape share payload, encode it as a
Base64 URL-safe token, build the share URL, print it, and open it in the
default browser.

Usage:
  ./encode_bs_share.py path/to/model.bs
  ./encode_bs_share.py path/to/model.bs --base-url https://pwright.github.io/blockscape/
  ./encode_bs_share.py path/to/model.bs --no-open
"""

import argparse
import base64
import json
import sys
import urllib.parse
import webbrowser
from pathlib import Path


DEFAULT_BASE_URL = "https://pwright.github.io/blockscape/"


def base64_url_encode(text: str) -> str:
    """Base64 URL-safe encode without padding."""
    raw = text.encode("utf-8")
    token = base64.urlsafe_b64encode(raw).decode("ascii")
    return token.rstrip("=")


def derive_title(data, fallback: str) -> str:
    """
    Derive a reasonable title from the payload:
      - For dicts: prefer its `title`
      - For lists: prefer the first element's `title`
      - Otherwise: fallback
    """
    if isinstance(data, dict):
        title = data.get("title")
        if isinstance(title, str) and title.strip():
            return title.strip()
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                title = item.get("title")
                if isinstance(title, str) and title.strip():
                    return title.strip()
            break
    return fallback


def build_payload(content, title_hint: str) -> dict:
    """
    Normalize file content into the shape expected by Blockscape share links:
      {
        "title": "...",
        "data": <object or array>
      }
    If the file already has that shape, reuse it.
    """
    if isinstance(content, dict) and "data" in content:
        data = content["data"]
        title = content.get("title") or title_hint
        return {"title": title, "data": data}

    title = derive_title(content, title_hint)
    return {"title": title, "data": content}


def build_share_url(base_url: str, token: str) -> str:
    """Attach the share token to the provided base URL as a fragment."""
    parsed = urllib.parse.urlparse(base_url)
    if not parsed.scheme:
        raise ValueError("Base URL must include a scheme (e.g., https://...)")

    # Remove any existing ?share=... query param to avoid ambiguity.
    query_pairs = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    filtered_pairs = [(k, v) for (k, v) in query_pairs if k != "share"]
    new_query = urllib.parse.urlencode(filtered_pairs)

    return urllib.parse.urlunparse(
        parsed._replace(query=new_query, fragment=f"share={token}")
    )


def load_bs_file(path: Path):
    """Load JSON from a .bs file with a helpful error message."""
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise SystemExit(f"[error] file not found: {path}") from exc
    except OSError as exc:
        raise SystemExit(f"[error] could not read file: {path} ({exc})") from exc

    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"[error] invalid JSON in {path}: {exc}") from exc


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Encode a Blockscape .bs file into a share URL and open it."
    )
    parser.add_argument(
        "bs_file",
        help="Path to the .bs file (JSON).",
    )
    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help=f"Base URL for Blockscape (default: {DEFAULT_BASE_URL})",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Do not launch the share URL in a browser; only print it.",
    )

    args = parser.parse_args()

    bs_path = Path(args.bs_file).expanduser()
    payload = build_payload(load_bs_file(bs_path), title_hint=bs_path.stem)

    payload_json = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
    token = base64_url_encode(payload_json)
    share_url = build_share_url(args.base_url, token)

    print(share_url)

    if args.no_open:
        return

    opened = webbrowser.open(share_url)
    if not opened:
        print("[warn] could not open browser automatically; URL printed above.", file=sys.stderr)


if __name__ == "__main__":
    main()
