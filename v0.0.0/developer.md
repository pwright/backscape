# Developer Notes (Svelte + legacy `index.html`)

The primary experience now ships from `svelte/` (Vite + Svelte). The notes below remain relevant only if you keep maintaining the legacy root `index.html` fallback; the Svelte entry point avoids many of these concerns by splitting logic into modules and handling lifecycle through the framework.

## Architecture & Maintainability
- All styling and client logic live inline in the HTML via the `<style>` and `<script>` blocks (`index.html:9`, `index.html:1281`). That makes the page a single ~3k line asset that cannot be linted, type-checked, or tree-shaken independently, so even small UI tweaks require editing this monolith and redeploying the whole file. Breaking the UI into modules (CSS files, ES modules, or a build step) would make reuse, testing, and code review dramatically simpler.

## Interaction Logic & Performance
- `render()` replaces the entire app markup and then calls `wireEvents()`, which re-attaches global listeners—including a new `window.resize` handler—every time the model is re-rendered (`index.html:1926`, `index.html:1951`). Frequent operations such as reordering tiles call `render()`, so resize events accumulate and trigger duplicate `reflowRects()` / `drawLinks()` executions. Track these handlers once (or clean them up) to avoid leaks and increasingly expensive redraws.
- Relationship connectors are drawn on a fixed overlay that is absolutely positioned to the viewport (`index.html:814`) and sized only to `window.innerWidth/Height` when `render()` runs (`index.html:1716`). Because `reflowRects()` is only invoked on render and resize (`index.html:1951`), scrolling changes tile positions without recomputing line coordinates, so the SVG paths visibly drift as soon as the user scrolls. Tie `reflowRects()` / `drawLinks()` to scroll events or compute coordinates relative to the scrolling container instead.

## Data Handling
- `normalizeToModelsFromText` splits `---` sections and calls `JSON.parse` on each chunk without a try/catch (`index.html:1510`, `index.html:1527`). A single malformed section throws synchronously, which bubbles up as a generic “Append error” even if most payloads are valid. Wrap per-section parsing (and surface which block failed) so that users can salvage good models instead of losing the entire import.
- Right-click previews build the fetch URL directly from the item `id` (e.g., `items/${id}.html`) with no sanitization (`index.html:2127`, `index.html:2147`). Because model JSON can be user-provided, an attacker can embed path traversal sequences (`../../foo`) and force the app to request arbitrary files under the current origin. Validate IDs (e.g., whitelist `[a-z0-9-_]`) before constructing URLs.

## Accessibility & UX
- Tiles are plain `<div>` elements with `tabIndex=0` but no role or pressed state (`index.html:1874`). Screen readers treat them as generic groups rather than buttons, and assistive tech has no cue that selecting a tile toggles dependency styling. Add `role="button"`/`aria-pressed` (or render real `<button>` elements) and expose the dependency counts via ARIA descriptions.
- The detailed item preview is only exposed via a `contextmenu` handler on the tiles (`index.html:2178`). There is no keyboard shortcut, enter/space activation, or visible affordance, so keyboard and touch users cannot reach the preview at all. Provide an explicit button within each tile or a toolbar action that triggers `handleTileContextMenu` so that all input modalities can access the same information.
