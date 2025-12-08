#!/usr/bin/env python3
"""
decode_bs_share.py

Read Blockscape share URLs or share tokens and emit decoded JSON to stdout.

Usage examples:

  # Single URL as argument
  ./decode_bs_share.py 'https://pwright.github.io/blockscape/#share=...'

  # URL from stdin
  echo 'https://pwright.github.io/blockscape/#share=...' | ./decode_bs_share.py

  # Token directly (no URL), e.g. from your clipboard
  ./decode_bs_share.py --raw-token 'eyJ0aXRsZSI6I...'

  # Compact JSON for downstream tools
  ./decode_bs_share.py --compact 'https://...'
"""

import sys
import argparse
import base64
import json
import urllib.parse


def add_b64_padding(token: str) -> str:
    """Ensure Base64 string length is a multiple of 4 by adding '=' padding."""
    pad_len = (-len(token)) % 4
    if pad_len:
        # Debug log to stderr
        print(f"[debug] adding {pad_len} padding character(s) to token", file=sys.stderr)
    return token + ("=" * pad_len)


def extract_share_token(s: str) -> str | None:
    """
    Extract the `share` value from:
      - full URL with query (?share=...)
      - full URL with fragment (#share=...)
      - plain token (fallback, returned as-is)
    """
    s = s.strip()
    if not s:
        return None

    # Try parsing as URL
    parsed = urllib.parse.urlparse(s)

    # If it looks like a URL (scheme or netloc present), try query + fragment
    if parsed.scheme or parsed.netloc:
        # Query params
        query_params = urllib.parse.parse_qs(parsed.query)
        if "share" in query_params and query_params["share"]:
            return query_params["share"][0]

        # Blockscape uses `#share=...` in fragment; treat fragment as a query string if it has '='
        if parsed.fragment:
            frag = parsed.fragment
            if "=" in frag:
                frag_params = urllib.parse.parse_qs(frag)
                if "share" in frag_params and frag_params["share"]:
                    return frag_params["share"][0]

        return None

    # Fallback: treat as bare token
    return s


def decode_share_token(token: str) -> str:
    """
    URL-decode, Base64-decode, and return the decoded text (expected to be JSON).
    Raises ValueError on failure.
    """
    # First URL-decode (handles %xx and +)
    url_decoded = urllib.parse.unquote_plus(token)

    # Then Base64 URL-safe decode (add padding if needed)
    padded = add_b64_padding(url_decoded)
    try:
        raw = base64.urlsafe_b64decode(padded.encode("ascii"))
    except Exception as e:
        raise ValueError(f"Base64 decode failed: {e}") from e

    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError as e:
        raise ValueError(f"UTF-8 decode failed: {e}") from e


def process_input(line: str, raw_token_mode: bool, compact: bool) -> None:
    """
    Process a single line (URL or token), print decoded JSON to stdout.
    All non-fatal issues are logged to stderr.
    """
    line = line.strip()
    if not line:
        return

    print(f"[debug] processing input: {line}", file=sys.stderr)

    if raw_token_mode:
        token = line
    else:
        token = extract_share_token(line)
        if token is None:
            print(f"[error] could not find 'share' parameter in input: {line}", file=sys.stderr)
            return

    try:
        decoded_text = decode_share_token(token)
    except ValueError as e:
        print(f"[error] decode failed for input: {line}\n        {e}", file=sys.stderr)
        return

    # Try to parse as JSON; if that fails, just emit the raw text
    try:
        obj = json.loads(decoded_text)
        if compact:
            out = json.dumps(obj, separators=(",", ":"))
        else:
            out = json.dumps(obj, indent=2)
    except json.JSONDecodeError as e:
        print(f"[warn] decoded text is not valid JSON; emitting raw text. ({e})", file=sys.stderr)
        out = decoded_text

    # IMPORTANT: only the decoded JSON/text goes to stdout
    print(out)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Decode Blockscape share URLs/tokens to JSON."
    )
    parser.add_argument(
        "inputs",
        nargs="*",
        help="URLs or tokens. If empty, read from stdin (one per line).",
    )
    parser.add_argument(
        "--raw-token",
        action="store_true",
        help="Treat input as a raw share token instead of a URL.",
    )
    parser.add_argument(
        "--compact",
        action="store_true",
        help="Emit compact JSON (no indentation).",
    )

    args = parser.parse_args()

    # If no positional args, read from stdin line-by-line (stream friendly)
    if not args.inputs:
        print("[debug] reading inputs from stdin", file=sys.stderr)
        for line in sys.stdin:
            process_input(line, args.raw_token, args.compact)
    else:
        for item in args.inputs:
            process_input(item, args.raw_token, args.compact)


if __name__ == "__main__":
    main()
