# Blockscape Developer Guide

Project entry point lives in `svelte/` (Vite + Svelte). `npm run build` renders the static site to `docs/` (published output). Source data examples and static assets live in `svelte/public/`; the legacy root `index.html` is kept only for reference. Development expects **Node 20**.

## Repository Layout
- `.beans/` — beans issue tracker state; keep updated when working on tasks.
- `.devin/` — dev environment config scaffold.  See https://deepwiki.com/pwright/blockscape
- `cypress/` — E2E tests; see `cypress.md` for runner notes.
- `docs/` — generated static site (overwritten by `npm run build`; do not hand-edit).
- `documentation/` — additional reference material and guides. Mkdocs site is here.
- `logos/` — branding assets.
- `nj/` — Neutralino build artifacts/config. This is where apps live
- `scripts/` — helper utilities; includes `encode/ decode-bs-share.py` for share payloads.
- `svelte/` — app source (see below). `svelte/public/` holds sample `.bs` data and assets; `svelte/src/` contains code including `blockscape.js`.


## Most common build commands

```
npm run build;npm run postbuild;npm run server
npm --prefix blockscape-obsidian run package
npm run export:nj
cd nj && neu build -- --load-dir-res && cd ..
```



## Blockscape Runtime (blockscape.js)
`svelte/src/blockscape.js` is the orchestration layer for the viewer/editor UI. It wires data ingestion, state persistence, layout, and integrations. Key roles:

### Core data + transforms
- Normalizes inbound JSON/text into models and series: `normalizeToModelsFromText`, `normalizeToModelsFromValue`, and `buildSeriesEntry` handle single objects, arrays, and `---/%%%` delimited blobs; `ensureModelMetadata` and `ensureSeriesId` stamp ids/titles; `computeJsonFingerprint` detects duplicate versions; ID/slug helpers (`uid`, `makeSeriesId`, `getModelId`, `getSeriesId`) keep references stable.
- Versioned series support: wraps Apicurio exports into `apicurioVersions` and aligns `apicurioActiveVersionIndex`.

### Settings + persistence
- LocalStorage-backed keys for theme (`blockscape:theme`), colors (`blockscape:depColor`, `blockscape:revdepColor`, `blockscape:colorPresets`), layout (`blockscape:titleWrap`, `blockscape:hoverScale`, `blockscape:tileCompactness`, center mode, link thickness), and behaviors (selection dimming, auto-ID/strip-parentheses, series double-click wait, stage guides).
- Server sidebar width persisted per user.
- Applies snapshots via `applyImportedSettings` and supports initial settings injection through `featureOverrides` or URLs.

### Storage / backends
- Local filesystem panel gated by the `server` URL prefix: lists `.bs` files, saves with inferred names, and auto-reloads on mtime changes with configurable interval.
- Clipboard and editor hand-off: consumes `blockscape:editorPayload` from localStorage and global paste to import JSON.
- Share flows: encodes the active model into a URL hash (`share=`) and preserves server-path aware deep links (model + item) for `/server/...` routes.

### Rendering + layout
- Builds the map/list UI and redraws dependency links on selection, stage layout changes, resize, or center mode. Link thickness, colors, and secondary link visibility come from settings.
- Version navigator and model list rendering keep `activeIndex` in sync with previews; search UI caps results and highlights matches.
- Inline notices/tooltips (e.g., tab hints, info tooltips) manage their own timers and aria attributes; stage guides overlay appears in center mode.

### Controllers + events
- Keyboard shortcuts for navigation, stage/view toggles, copy/share, help overlay, and search focus; ignores shortcuts while editing inputs.
- Selection and navigation plumbing: tracks `selection`, `selectedCategoryId`, and pending navigation timers for series/model double-click detection.
- Panel toggles: sidebar/footer/header visibility, server sidebar width, stage guides, info tab twinkle, and settings modal interactions.

### Integrations / adapters
- **Apicurio**: `createApicurioIntegration` (from `apicurio.js`) handles registry config persistence, push/list flows, and series artifact grouping.
- **External links**: `isExternalHref`, `resolveHref`, `openExternalUrl` guard window vs Neutralino environments.
- External links: inline builder generates `https://` links per tile; links surface in tiles, context menus, and the item preview.

## Build & Run
- Install deps: `npm install`
- Dev server: `npm run dev` (from `svelte/`)
- Static export: `npm run build` → outputs to `docs/`
- Static preview: `npm run server` (serves `docs/`)

## Handholds for Contributors
- Use the feature flags in `initBlockscape` to disable local backends or file operations when embedding elsewhere.
- Settings UI is generated in `blockscape.js`; when adding a preference, wire (1) localStorage key + defaults, (2) apply/persist helpers, and (3) a row in `createSettingsPanel`.
- `.bs` files in `svelte/public/` are good fixtures for manual QA; keep them in sync with schema changes.
- Avoid editing `docs/` directly; rebuild after changes. If you touch the legacy root `index.html`, keep `developer.md` notes updated.

## Svelte + legacy `index.html`

The primary experience now ships from `svelte/` (Vite + Svelte). The notes below remain relevant only if you keep maintaining the legacy root `index.html` fallback; the Svelte entry point avoids many of these concerns by splitting logic into modules and handling lifecycle through the framework.

### Architecture & Maintainability
- All styling and client logic live inline in the HTML via the `<style>` and `<script>` blocks (`index.html:9`, `index.html:1281`). That makes the page a single ~3k line asset that cannot be linted, type-checked, or tree-shaken independently, so even small UI tweaks require editing this monolith and redeploying the whole file. Breaking the UI into modules (CSS files, ES modules, or a build step) would make reuse, testing, and code review dramatically simpler.

### Interaction Logic & Performance
- `render()` replaces the entire app markup and then calls `wireEvents()`, which re-attaches global listeners—including a new `window.resize` handler—every time the model is re-rendered (`index.html:1926`, `index.html:1951`). Frequent operations such as reordering tiles call `render()`, so resize events accumulate and trigger duplicate `reflowRects()` / `drawLinks()` executions. Track these handlers once (or clean them up) to avoid leaks and increasingly expensive redraws.
- Relationship connectors are drawn on a fixed overlay that is absolutely positioned to the viewport (`index.html:814`) and sized only to `window.innerWidth/Height` when `render()` runs (`index.html:1716`). Because `reflowRects()` is only invoked on render and resize (`index.html:1951`), scrolling changes tile positions without recomputing line coordinates, so the SVG paths visibly drift as soon as the user scrolls. Tie `reflowRects()` / `drawLinks()` to scroll events or compute coordinates relative to the scrolling container instead.

### Data Handling
- `normalizeToModelsFromText` splits `---` sections and calls `JSON.parse` on each chunk without a try/catch (`index.html:1510`, `index.html:1527`). A single malformed section throws synchronously, which bubbles up as a generic “Append error” even if most payloads are valid. Wrap per-section parsing (and surface which block failed) so that users can salvage good models instead of losing the entire import.
- Right-click previews build the fetch URL directly from the item `id` (e.g., `items/${id}.html`) with no sanitization (`index.html:2127`, `index.html:2147`). Because model JSON can be user-provided, an attacker can embed path traversal sequences (`../../foo`) and force the app to request arbitrary files under the current origin. Validate IDs (e.g., whitelist `[a-z0-9-_]`) before constructing URLs.

### Accessibility & UX
- Tiles are plain `<div>` elements with `tabIndex=0` but no role or pressed state (`index.html:1874`). Screen readers treat them as generic groups rather than buttons, and assistive tech has no cue that selecting a tile toggles dependency styling. Add `role="button"`/`aria-pressed` (or render real `<button>` elements) and expose the dependency counts via ARIA descriptions.
- The detailed item preview is only exposed via a `contextmenu` handler on the tiles (`index.html:2178`). There is no keyboard shortcut, enter/space activation, or visible affordance, so keyboard and touch users cannot reach the preview at all. Provide an explicit button within each tile or a toolbar action that triggers `handleTileContextMenu` so that all input modalities can access the same information.
