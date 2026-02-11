# Build Targets and Rendering Patterns

Blockscape uses a **single Svelte UI core** that is packaged in different shells for the web app, MkDocs, and Neutralino. Each target has its own build output directory and a thin layer of glue that decides what content gets rendered and which UI features are enabled.

## Shared core (Svelte bundle)

All targets reuse the same Svelte bundle:

- **UI core:** `svelte/src/Blockscape.svelte` + `svelte/src/App.svelte`
- **Default features:** `svelte/src/blockscape.js` enables local backend, file open/save, editor panels, header/sidebar/footer, and model metadata by default.
- **Embed shim:** `svelte/src/mount.js` instantiates Blockscape for every `.blockscape-root` element and overrides features for “embedded” contexts.

This keeps the UI logic in one place while allowing each shell to opt-in/opt-out of features.

## Svelte app (static site)

**Design pattern:** full application build (single-page app) that ships the entire UI and default feature set.

- **Build output:** `vite.config.mjs` writes the static site to `docs/`.
- **Included content:** the full app HTML + JS; all default features in `initBlockscape()` are on.
- **Excluded content:** none by default; the app’s own runtime decides what to show.

This target is the most complete UI surface and is used for the main web app and GitHub Pages output.

## MkDocs (embedded maps)

**Design pattern:** embed the Svelte bundle as a **library** inside a documentation site; only render maps where a fenced block is present.

- **Build output:** `vite.config.export.mjs` writes `blockscape.js`/`blockscape.css` to `documentation/docs/site_assets/blockscape/`.
- **Inclusion mechanism:** the MkDocs extension (`documentation/mkdocs_blockscape/extension.py`) replaces ```blockscape fences with a `.blockscape-root` + JSON seed script.
- **Runtime shim:** `mount.js` scans for `.blockscape-root` nodes and instantiates the UI per map.
- **Feature exclusions:** `mount.js` turns off local backend + file open/save, hides header/sidebar/footer and model metadata.

Net effect: docs content renders normally, and only explicitly fenced maps become Blockscape instances.

## Neutralino (desktop)

**Design pattern:** local desktop shell that wraps the Svelte bundle, adds native file IO, and hides the web chrome for a map-first UI.

- **Build output:** `vite.config.export.nj.mjs` writes `blockscape.js`/`blockscape.css` into `nj/resources/site_assets/blockscape/`.
- **Shell HTML:** `nj/resources/index.html` loads the Svelte bundle and provides a custom header + file controls.
- **Runtime shim:** `nj/resources/js/app.js` bridges Neutralino APIs to the web app (open/save, autosave, file tracking).
- **Paste/import behavior:** when content is pasted into the Neutralino app, prompt to create a new file instead of overwriting the current file.
- **CSS shim:** `nj/resources/index.html` includes overrides that hide header/sidebar/footer, JSON panel, context menus, and related UI.

Net effect: the core app runs locally, but the shell narrows the surface to a viewer/editor workflow with desktop file access.

## Example: expose “New” from Svelte to Neutralino

If you want the desktop shell to expose the same **New** workflow as the web app, follow this process:

1. **Find the “New” entry points in Svelte.** The button lives in `svelte/src/App.svelte` (id `newPanelButton`), and the panel markup is in `svelte/src/components/NewPanel.svelte` (id `newPanel`).
2. **Verify the wiring in the runtime controller.** `svelte/src/blockscape.js` binds click handlers for `newPanelButton` and `newBlankButton` and toggles the panel via `openNewPanel()`/`closeNewPanel()`. This is the logic you want visible in the shell.
3. **Check desktop shell overrides.** `nj/resources/index.html` includes CSS that hides `#newPanel` (and other UI) to keep a map-only layout. Remove or narrow that rule so the New panel can render while leaving the Svelte header hidden.
4. **Expose a trigger in the desktop layout.** Add a Neutralino-specific button in the desktop header (next to Open/Save) and wire it to click `#newPanelButton` in `nj/resources/js/app.js`. This keeps the desktop shell’s header while still using the Svelte New panel.
5. **Rebuild the Neutralino assets.** Run `npm run export:nj` so the updated UI/CSS lands in `nj/resources/site_assets/blockscape/`, then run `neu build` if you package the app.

This pattern keeps the UI logic in Svelte while the Neutralino shell decides what to surface.

## Summary pattern

Blockscape follows a **“core bundle + shell adapters”** pattern:

- **Core:** one Svelte bundle used everywhere.
- **Adapters:** build configs (`vite.config.mjs`, `vite.config.export*.mjs`) decide the output directory and asset shape.
- **Shims:** MkDocs extension + `mount.js` for embeds; Neutralino HTML/CSS/JS for native file workflows.

This keeps the UI consistent while letting each target include only the content and capabilities that make sense in that environment.
