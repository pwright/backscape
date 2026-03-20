# Neutralino Blockscape Viewer

This folder contains a Neutralino app that hosts a **map-only** Blockscape UI.
It is intentionally separate from the main Svelte app and uses the exported
Blockscape bundle.

## Quick start

1) Build the Neutralino-facing assets:

```sh
npm install
npm run export:nj
```

2) Install Neutralino binaries and run:

```sh
cd nj
neu update
neu run
```

## Notes

- `npm run export:nj` writes the Blockscape bundle to `nj/resources/site_assets/blockscape/`.
- The Neutralino window loads `nj/resources/index.html`.
- `nj/resources/settings.json` is served from the app root for the viewer.
np