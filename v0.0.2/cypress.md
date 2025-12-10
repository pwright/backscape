# Cypress End-to-End Tests

This project ships with two Cypress specs that cover the main entry points:

- `index.html` (visual model browser) → `cypress/e2e/model-preview.cy.js`
- `editor.html` (JSON editor) → `cypress/e2e/editor-workflow.cy.js`

Both specs run against the built static files under `dist/`.

## 1. Install Dependencies

```bash
npm install
```

## 2. Serve the App

```bash
npm run build && npm run serve
```

This builds the Svelte app and serves the contents of `dist/` at `http://localhost:4173` (matching `baseUrl` in `cypress.config.js`). You can also use `npm run preview` for the same port if you prefer Vite’s preview server. Leave the server running while executing tests.

## 3. Run Cypress

Headless (CI-friendly):

```bash
npm run cypress:run
```

Interactive Test Runner:

```bash
npm run cypress:open
```

### Run a Single Spec

```bash
npx cypress run --spec cypress/e2e/model-preview.cy.js
npx cypress run --spec cypress/e2e/editor-workflow.cy.js
```

### Collect JSON Reports

```bash
unset ELECTRON_RUN_AS_NODE ELECTRON_NO_ATTACH_CONSOLE
npm run cypress:report
```

The command above writes `cypress/results/report.json`, which captures the run summary plus per-spec pass/fail metadata. Use the file as-is or convert it to another format during CI.

### Videos & Screenshots

- Videos for headless runs are saved in `cypress/videos/`
- Failure screenshots are saved in `cypress/screenshots/`

Both folders are created automatically when tests run.

## What Each Spec Covers

### `model-preview.cy.js` (index.html)

1. Opens the landing page (`/index.html`).
2. Switches between built-in models.
3. Right-clicks a tile to open the preview drawer.
4. Verifies tile metadata (title & embedded HTML) and closes the preview.

This guards the context-menu preview experience.

### `editor-workflow.cy.js` (editor.html)

1. Loads `editor.html` and imports `NFR.json` via the “Open” control.
2. Creates a new category, updates its title and id, and adds two items.
3. Renames the items, then uses the inline arrow buttons to reorder them.
4. Drags the new category to the top of the list.
5. Deletes an item and confirms JSON/status updates, finishing with a validation check.

This ensures CRUD + reordering behaviour stays intact in the editor UI.

## Troubleshooting

- **“Invalid or incompatible cached data (cachedDataRejected)”**: Clear the Cypress cache (`rm -rf ~/.cache/Cypress/<version>`) and rerun.
- **“bad option: --no-sandbox”**: Make sure `ELECTRON_RUN_AS_NODE`/`ELECTRON_NO_ATTACH_CONSOLE` are unset before launching Cypress (`unset ELECTRON_RUN_AS_NODE ELECTRON_NO_ATTACH_CONSOLE`).
- Ensure no other process occupies `http://localhost:4173`.
- If tests cannot find elements, confirm the server is running and the correct page is open in the spec (`/index.html` vs `/editor.html`).
