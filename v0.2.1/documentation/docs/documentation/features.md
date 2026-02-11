# Blockscape features (beginner-friendly)

Welcome to Blockscape! This page walks through what the project does and how to use it, starting from zero knowledge.

## What Blockscape is

- A web app for turning JSON models into interactive landscape maps (inspired by Wardley maps).
- Ships with ready-to-explore samples (`blockscape.bs`, `planets.bs`) that auto-load on startup so you can click around immediately.
- Lives in `svelte/` (Vite + Svelte) with a legacy `index.html` kept for reference; both render the same maps.

## Core map experience

- **Visual grid:** Categories run top-to-bottom (more visible value at the top); items flow left-to-right (left = novel/custom, right = commodity/standard).
- **Tile interactions:** Click to highlight dependencies; right-click shows a preview panel (used in Cypress tests); dashed border + ↗ indicates an external link; orange badge means the item is reused multiple times.
- **Keyboard + mouse:** Arrow keys walk the tiles; `Shift+←/→` reorders inside a category; `Shift+↑/↓` moves an item between categories; drag-and-drop works too. `Del` removes the selected item (undo with your browser’s undo).
- **Logos and links:** Add `logo` paths for inline icons and `external` URLs to launch docs, ADRs, repos, or APIs from the map.

## Data model and files

- Models are simple JSON objects (`id`, `title`, optional `abstract`, `categories[]`, and `items[]` with `deps`, `logo`, `external`). See `documentation/models.md` for the schema.
- A `.bs` file is just JSON: a single model or an array of models (a “series”). Multiple models let you compare versions or viewpoints.
- Built-in templates: “Blockscape”, “NFR”, and “Deployments” are available from the picker so you always have a starting point.

## Getting data into Blockscape

- **Add JSON files:** Use the UI button to load one or more `.json`/`.bs` files; new models are appended to your list.
- **Paste JSON:** Paste directly into the JSON editor (top of the page) and click **Append model(s)**.
- **Jump between models:** Use the model selector to flip between maps without reloading the page.
- **LLM generation:** Use [Generate maps with an LLM](llm-generation.md) for the ready-made prompt that drafts models from your domain notes.

## Editing tools

- **Map-side edits:** Click **Edit** to open the JSON editor (`editor.html`). All changes you make there immediately reflect in the map.
- **CRUD in the editor:** Add/remove categories and items, reorder them, and edit IDs/titles/names. A validate button checks the JSON before you save.
- **Reordering aids:** Drag categories, drag items, or use the move up/down buttons tested in `cypress/e2e/editor-workflow.cy.js`.

## Sharing and collaboration

- **Download/share files:** Because everything is JSON, you can version `.bs` files in git, send them over chat, or drop them in docs.
- **Share links:** See [Share Blockscape maps via encoded links](share-links.md) for wrapping `.bs` files into URLs and decoding them later.
- **External references:** Attach documentation, RFCs, or dashboards via the `external` field so each tile doubles as a launch point.

## Running the app

- **Fast local dev:** `npm install` then `npm run dev` (Vite on http://localhost:5173). The JSON editor lives at `/editor.html`.
- **Production build:** `npm run build` emits `docs/`; serve it with `npm run preview` or `npm run serve` (`http-server`).
- **Local backend (optional):** `npm run server` serves the built app and a file API rooted at `~/blockscape` (override with `BLOCKSCAPE_ROOT`). You can auto-load a local file via `http://127.0.0.1:4173/server/path/to/file.bs`.
- **Docker:** Pull `docker.io/pwrightrd/blockscape:latest` and run it to serve the static build plus the optional file API.
- **Apicurio (optional backend):** Use `documentation/apicurio.md` if you want to back maps with Apicurio Registry.
- **Docs/MkDocs:** Follow [MkDocs usage](mkdocs.md) to serve the bundled docs or embed Blockscape maps in other MkDocs sites.

## Quality and tests

- Cypress specs cover the preview flow (`model-preview.cy.js`) and full CRUD in the JSON editor (`editor-workflow.cy.js`).
- Token builds (`npm run build:tokens`) and docs builds (`npm run docs:build`) are part of the standard `npm run build` pipeline.

If you’re new: start the dev server, load a sample map, click tiles to see dependencies, then open **Edit** to tweak the JSON and watch the map update. That’s the whole loop.
