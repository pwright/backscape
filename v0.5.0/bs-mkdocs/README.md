# `bs-mkdocs`

Drop-in MkDocs support for Blockscape maps using the standalone `lite.js` renderer.

This package is intentionally self-contained:

- `mkdocs_blockscape/extension.py` transforms fenced `blockscape` code blocks into mount points.
- `site_assets/blockscape/lite.js` renders the map in the browser.
- `mkdocs.yml` and `docs/` provide a runnable local test site.
- No Svelte build, no extra CSS file, no `mount.js`.

## What You Copy

For the simplest MkDocs build, copy only these pieces into the consuming repo:

```text
mkdocs_blockscape/
  __init__.py
  extension.py
docs/
  site_assets/
    blockscape/
      lite.js
```

This keeps `mkdocs_blockscape/` on the default import path when you run `mkdocs build` or `mkdocs serve` from the repo root, so no `PYTHONPATH` is needed.

## Local Test Site

This directory now includes a tiny runnable MkDocs site for smoke-testing the package in place:

```text
bs-mkdocs/
  mkdocs.yml
  docs/
    index.md
    site_assets/blockscape/lite.js
```

Run it from inside `bs-mkdocs/`:

```sh
cd bs-mkdocs
mkdocs serve
```

or build it with:

```sh
cd bs-mkdocs
mkdocs build
```

The generated test site is written to `bs-mkdocs/site/`.

## MkDocs Setup

Assume you are copying into the root of your MkDocs repo.

### 1. Copy the Python package to repo root

Place `mkdocs_blockscape/` next to `mkdocs.yml`:

```text
your-docs-repo/
  mkdocs.yml
  mkdocs_blockscape/
    __init__.py
    extension.py
```

### 2. Make the JS asset visible to MkDocs

Copy `site_assets/blockscape/lite.js` into your docs tree:

```text
docs/site_assets/blockscape/lite.js
```

MkDocs will then publish it as `/site_assets/blockscape/lite.js`.

### 3. Update `mkdocs.yml`

Add the extension and the JS asset:

```yaml
markdown_extensions:
  - mkdocs_blockscape.extension

extra_javascript:
  - site_assets/blockscape/lite.js
```

That is all you need.

With that layout, the normal commands work:

```sh
mkdocs serve
mkdocs build
```

## Authoring

Write fenced `blockscape` blocks in Markdown:

````md
```blockscape
{
  "id": "example",
  "title": "Example Map",
  "abstract": "Simple example",
  "categories": [
    {
      "id": "outcomes",
      "title": "Outcomes",
      "items": [
        { "id": "visibility", "name": "Visibility", "deps": ["renderer"] }
      ]
    },
    {
      "id": "platform",
      "title": "Platform",
      "items": [
        { "id": "renderer", "name": "Renderer", "deps": [] }
      ]
    }
  ]
}
```
````

The extension turns that into:

```html
<div class="blockscape-root">
  <script type="application/json" class="blockscape-seed">
    ...
  </script>
</div>
```

`lite.js` auto-mounts on `.blockscape-root`.

## Behavior

`lite.js` supports:

- click a tile to highlight its direct dependencies
- click a tile to highlight reverse dependencies
- hover and keyboard focus states
- optional external link button when an item has `external`
- top-level JSON arrays as a minimal series viewer with previous/next buttons

It does not provide editing, drag/drop, search, local file integration, or series management.

## Optional: Remote Maps

You can also mount manually with a `data-src` attribute:

```html
<div class="blockscape-root" data-src="/maps/example.bs"></div>
```

`lite.js` will fetch the JSON and render it.

## Notes

- `abstract` is rendered as plain text.
- If the top-level JSON is an array, `lite.js` renders a minimal series viewer with previous/next buttons.
- Invalid JSON in a fenced block will fail the MkDocs build with a clear error.
