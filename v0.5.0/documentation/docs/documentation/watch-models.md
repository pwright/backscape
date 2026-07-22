# Watch Models Spec

The watcher processes `.bs` and `.md` files in a target directory, validates Blockscape models, and writes `.bs` outputs per source file.

## Purpose

- Validate `.bs` model files on change.
- Extract JSON models from `.md` files (code blocks or inline) and emit one `.bs` file per source markdown file.

## Usage

```bash
node scripts/watch-models.js --dir <path> --out-dir <path> --bs-dir <path>

# eg
# node scripts/watch-models.js --dir ~/Downloads/ --out-dir /tmp --bs-dir ~/private-maps
```

Options:

- `--dir` (required): root directory to scan and watch.
- `--out-dir`: output directory for generated `.bs` files. Defaults to `--dir`.
- `--bs-dir`: directory to copy incoming `.bs` files into (no overwrite).
- `--once`: do a single scan without watching.

## Inputs

### `.bs`

- JSON file containing either:
  - a single model object, or
  - an array of model objects (series).

### `.md`

- Markdown containing JSON models in:
  - fenced code blocks (```json, ```jsonc, ```js, ```javascript, ```bs), or
  - inline JSON blocks (balanced `{}` or `[]`) outside of code fences.
- Escaped markdown brackets/braces (for example `\[` or `\{`) are normalized before scanning.

## Outputs

- For each `.md` file: write `<source-name>.bs` in `--out-dir`.
- Output is a JSON array (series) containing all valid models found in the markdown file.
- For each `.bs` file: validate and optionally copy to `--bs-dir` (skips if the file already exists).

## Validation Rules

- Model must be an object with `id`, `title`, `categories[]`.
- Category must be an object with `id`, `title`, `items[]`.
- Item must be an object with `id`, `name`.
- `deps` must be an array when present.
- `stage` (if present) must be an integer 1-4.
- `logo`, `external` (if present) must be strings.
- Missing dependency references are reported as warnings (not errors).
- Self-dependencies are reported as warnings (not errors).

## Dedupe and ID Handling

- Models are only considered duplicates if their full JSON content is identical.
- If content differs but IDs collide, IDs are renamed by appending a counter:
  - `example`, `example-2`, `example-3`, etc.
- Models without an `id` get a generated one: `model-<n>`.

## Notes

- Watcher ignores `.git` and `node_modules`.
- The watcher validates `.bs` files but does not rewrite them.
