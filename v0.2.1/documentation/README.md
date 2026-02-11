# MkDocs Blockscape Extension (Example)

This folder contains a working MkDocs project that renders Blockscape maps from fenced code blocks.

To use the extension in another repo:

1) Copy `mkdocs_blockscape/` into your MkDocs project (any path is fine as long as Python can import it).
2) Copy the built assets from this repo’s `documentation/docs/site_assets/blockscape/` into your project’s `docs/site_assets/blockscape/` (or another folder you reference in `mkdocs.yml`).
3) Update your `mkdocs.yml`:
   - Add the extension: `markdown_extensions: [ ..., mkdocs_blockscape.extension ]`
   - Include the assets: 
     ```yaml
     extra_css:
       - site_assets/blockscape/blockscape.css
     extra_javascript:
       - site_assets/blockscape/blockscape.js
       - site_assets/blockscape/mount.js
     ```
4) Author maps with fenced code blocks using the `blockscape` language (see below), then `mkdocs serve`.

When you need updated assets, run `npm run export` in this repo and re-copy the three files.

## Prerequisites

- Node 18+ (for building the Svelte bundle)
- Python + `mkdocs` (install via `pip install -r documentation/requirements.txt`)

## Build the Svelte assets into MkDocs

From the repo root:

```sh
npm install        # first time only
npm run export     # writes docs/site_assets/blockscape/{blockscape.js,blockscape.css,mount.js}
```

The `export` script builds the Svelte bundle as a library (no HTML) and drops the three files directly into `documentation/docs/site_assets/blockscape/`. Keeping assets under `docs/` lets `mkdocs serve` and `mkdocs build` include them automatically.

## Run the example site locally

```sh
cd documentation
PYTHONPATH=documentation mkdocs serve
```

Open the served URL (usually http://127.0.0.1:8000/). The config in `mkdocs.yml` already wires in the CSS/JS from `site_assets/blockscape/`.

## Authoring a map in Markdown

Use a fenced block with the `blockscape` language:

```md
```blockscape
{ valid JSON }
```
```

The extension (`mkdocs_blockscape/extension.py`) transforms the fence into:

```html
<div class="blockscape-root">
  <script type="application/json" class="blockscape-seed">
    …your JSON…
  </script>
</div>
```

`blockscape.js` (the Svelte bundle) attaches to `window.Blockscape`, and `mount.js` scans for `.blockscape-root` elements to instantiate the UI for each seed it finds.

When mounted via MkDocs, the bootloader passes feature flags to disable local file loading/saving and directory auto-loads so only the series/map UI is shown. If you need the full editor, mount the bundle yourself with different flags.

## Design principles

- MkDocs owns content; Svelte owns rendering
- No HTML exported from Svelte—only JS/CSS + a tiny bootloader
- Multiple instances per page work automatically
