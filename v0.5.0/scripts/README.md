# scripts directory

Utility scripts that support the Blockscape Svelte site and companion Obsidian viewer. Run them from the repo root with Node 20 (`.nvmrc` is not present; use your local Node 20). Most are also wired into npm scripts so you rarely need to call them directly.

## Common commands
- Build design tokens: `npm run build:tokens` (calls `node scripts/build-tokens.js`).
- Clean and rebuild the static site: `npm run build` (includes `clean-docs`, `export`, `docs:build`).

## Script reference

### build-tokens.js
- Purpose: flatten `svelte/src/tokens.json` into CSS custom properties and a JS helper module in `svelte/src/generated/`.
- Usage: `node scripts/build-tokens.js` (run automatically by `npm run build:tokens`, `npm run dev`, `npm run build`, and export commands).
- Output: `tokens.css` and `tokens.js`; theme-specific CSS is emitted when `tokens.json` defines `themes`.

### clean-docs.js
- Purpose: remove the generated `docs/` directory so a subsequent build recreates it from fresh assets.
- Usage: `node scripts/clean-docs.js` or `npm run clean-docs` (invoked inside `npm run build`).
- Notes: Safe to run; the next `npm run build` or `npm run docs:build` regenerates `docs/` instead of manually deleting HTML.

### watch-models.js
- Purpose: watch a directory of `.bs` or `.md` files, validate Blockscape models, and emit normalized `.bs` outputs.
- Usage: `node scripts/watch-models.js --dir <path> [--out-dir <path>] [--bs-dir <path>] [--once]`
  - `--dir` (required): directory to scan/watch.
  - `--out-dir` (default: same as `--dir`): where generated `.bs` files are written when parsing Markdown.
  - `--bs-dir`: optional destination to copy validated `.bs` files (skips if the file already exists).
  - `--once`: process current files and exit instead of watching.
- Behavior: ignores `.git` and `node_modules`, debounces changes (120ms), logs writes/copies, writes a `watch.log` alongside executions, and surfaces validation errors/warnings for malformed models or Markdown-embedded JSON.

### tidy_bs.py
- Purpose: one-pass tidier for Blockscape `.bs` JSON maps; strips parentheses from `name` fields, applies configurable substitutions to long names, trims overlong names, optionally normalizes inline Markdown links, and validates structure.
- Usage: `python3 scripts/tidy_bs.py path/to/file.bs [options]`
  - `--dry-run` preview changes without writing.
  - `--output out.bs` write to a new file; default overwrites input.
  - `--substitutions name_substitutions.json` JSON list or map of `{from,to}` pairs (default file at repo root); use with `--min-sub-length` (default 14 chars).
  - `--trim-limit 20` shorten names to under the limit (set to `0` or `--no-trim` to skip).
  - `--no-strip-parens`, `--no-substitutions`, `--no-validate` to disable individual steps.
  - `--strip-md-links` rewrite inline Markdown links inside every string literal to their bare URLs.
- Tips: default run `python3 scripts/tidy_bs.py path/to/file.bs` performs strip + substitutions + trim + validation; combine flags to target a single step (e.g., `--no-strip-parens --no-trim` to apply substitutions only).

eg

```
python tidy_bs.py --strip-md-links ../svelte/public/make-vs-just.bs 

#Updated ../svelte/public/make-vs-just.bs (19 names changed; 26 Markdown links normalized)

```
