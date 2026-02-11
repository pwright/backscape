# Local backend (`server.js`)

The optional Node server wraps the built app and exposes a small JSON-over-HTTP file API rooted at `~/blockscape` (override with `BLOCKSCAPE_ROOT`). Use it when you want to load/save `.bs` files locally instead of only working with in-browser state.

## Running
- Build first: `npm run build`
- Start backend + static serve: `npm run server` (listens on `http://127.0.0.1:4173`)
- Open the UI with backend enabled: `http://127.0.0.1:4173/server`

## API endpoints (REST-ish)
- `GET /api/health` → `{ ok, root }`; ensures the root dir exists.
- `GET /api/files` → `{ ok, files: [{ path, bytes, mtimeMs }] }` listing all `.bs` files under the root.
- `GET /api/file?path=relative.bs` → returns parsed JSON for that file; 404 if missing.
- `PUT /api/file?path=relative.bs` → writes JSON (pretty-printed); creates subdirectories; 400 on invalid JSON or payload >2MB.
- `DELETE /api/file?path=relative.bs` → deletes the file; 400 on bad path or other FS errors.
- `OPTIONS` on API routes returns CORS headers (`GET,PUT,DELETE,OPTIONS`).

## Path safety & limits
- Paths are validated by `safeRelativePath` to block `..` and absolute traversal (URL-encoded variants included).
- JSON body size limit: 2MB; empty/invalid JSON returns 400.
- Root defaults to `~/blockscape`; set `BLOCKSCAPE_ROOT=/somewhere` to change it.

## Static assets and routing
- Serves built assets from `docs/` (or `svelte/dist` if present).
- `/server/*` URLs resolve to built assets (so `http://127.0.0.1:4173/server/index.html` works).
- All other unmatched routes fall back to `index.html` (SPA).

## UI integration
- The map sidebar’s “Local files” panel uses this API to list/load/save/delete maps.
- You can auto-load a local file by visiting `http://127.0.0.1:4173/server/path/to/file.bs` (append `/model-id/item-id` to deep-link).
