#!/usr/bin/env node
/**
 * Optional local backend for Blockscape.
 * Serves the built Svelte app and exposes a small file API rooted at ~/blockscape.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const http = require("http");
const { URL } = require("url");

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4173;
const HOST = process.env.HOST || "127.0.0.1";
const DIST_DIR = resolveDistDir();
const INDEX_FILE = path.join(DIST_DIR, "index.html");
const ROOT_DIR = resolveRootDir();
const JSON_LIMIT_BYTES = 2 * 1024 * 1024;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendText(res, status, text, contentType = "text/plain; charset=utf-8") {
  const body = text ?? "";
  res.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function safeRelativePath(rawPath) {
  const decoded = decodeURIComponent(rawPath || "").replace(/^[\\/]+/, "");
  const normalized = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const target = path.join(ROOT_DIR, normalized);
  if (!target.startsWith(ROOT_DIR)) {
    throw new Error("Invalid path");
  }
  return { relative: normalized, absolute: target };
}

async function listBsFiles(dir = ROOT_DIR, prefix = "") {
  let entries = [];
  const items = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const rel = path.join(prefix, item.name);
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      entries = entries.concat(await listBsFiles(full, rel));
    } else if (item.isFile() && full.toLowerCase().endsWith(".bs")) {
      const stats = await fs.promises.stat(full);
      entries.push({
        path: rel.replace(/\\/g, "/"),
        bytes: stats.size,
        mtimeMs: stats.mtimeMs,
      });
    }
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > JSON_LIMIT_BYTES) {
      throw new Error("Payload too large");
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) {
    throw new Error("Empty body");
  }
  return JSON.parse(raw);
}

async function ensureRootDir() {
  await fs.promises.mkdir(ROOT_DIR, { recursive: true });
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": url.origin,
      "Access-Control-Allow-Methods": "GET,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return true;
  }

  if (url.pathname === "/api/health") {
    await ensureRootDir();
    sendJson(res, 200, { ok: true, root: ROOT_DIR });
    return true;
  }

  if (url.pathname === "/api/files") {
    await ensureRootDir();
    const files = await listBsFiles();
    sendJson(res, 200, { ok: true, files });
    return true;
  }

  if (url.pathname === "/api/file" && req.method === "GET") {
    const targetPath = url.searchParams.get("path");
    if (!targetPath) {
      sendJson(res, 400, { ok: false, error: "Missing path" });
      return true;
    }
    try {
      await ensureRootDir();
      const { absolute, relative } = safeRelativePath(targetPath);
      const content = await fs.promises.readFile(absolute, "utf8");
      const data = JSON.parse(content);
      sendJson(res, 200, { ok: true, path: relative, data });
    } catch (err) {
      if (err.code === "ENOENT") {
        sendJson(res, 404, { ok: false, error: "File not found" });
      } else {
        console.error("[api] read error:", err);
        sendJson(res, 400, { ok: false, error: err.message });
      }
    }
    return true;
  }

  if (url.pathname === "/api/file" && req.method === "PUT") {
    const targetPath = url.searchParams.get("path");
    if (!targetPath) {
      sendJson(res, 400, { ok: false, error: "Missing path" });
      return true;
    }
    try {
      await ensureRootDir();
      const { absolute, relative } = safeRelativePath(targetPath);
      const parsed = await readJsonBody(req);
      const pretty = JSON.stringify(parsed, null, 2) + "\n";
      await fs.promises.mkdir(path.dirname(absolute), { recursive: true });
      await fs.promises.writeFile(absolute, pretty, "utf8");
      sendJson(res, 200, {
        ok: true,
        path: relative,
        bytes: Buffer.byteLength(pretty),
      });
    } catch (err) {
      console.error("[api] write error:", err);
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return true;
  }

  if (url.pathname === "/api/file" && req.method === "DELETE") {
    const targetPath = url.searchParams.get("path");
    if (!targetPath) {
      sendJson(res, 400, { ok: false, error: "Missing path" });
      return true;
    }
    try {
      await ensureRootDir();
      const { absolute, relative } = safeRelativePath(targetPath);
      await fs.promises.unlink(absolute);
      sendJson(res, 200, { ok: true, path: relative });
    } catch (err) {
      console.error("[api] delete error:", err);
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return true;
  }

  return false;
}

function serveStatic(res, filePath) {
  fs.promises
    .readFile(filePath)
    .then((content) => {
      const ext = path.extname(filePath).toLowerCase();
      const type = mimeTypes[ext] || "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": type,
        "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=3600",
      });
      res.end(content);
    })
    .catch((err) => {
      console.error("[static] error serving", filePath, err);
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    });
}

function resolveServerScopedStatic(requestedPath) {
  if (typeof requestedPath !== "string") return null;
  if (!requestedPath.startsWith("/server/")) return null;
  const normalized = path
    .normalize(requestedPath)
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (!parts.length || parts[0].toLowerCase() !== "server") return null;
  const tailParts = parts.slice(1);
  for (let i = 0; i < tailParts.length; i++) {
    const candidatePath = `/${tailParts.slice(i).join("/")}`;
    const full = path.join(DIST_DIR, candidatePath);
    if (
      full.startsWith(DIST_DIR) &&
      fs.existsSync(full) &&
      fs.statSync(full).isFile()
    ) {
      return full;
    }
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    if (await handleApi(req, res, requestUrl)) {
      return;
    }

    // Static assets
    let requestedPath = requestUrl.pathname;
    if (requestedPath.endsWith("/")) {
      requestedPath = path.join(requestedPath, "index.html");
    }
    const candidate = path.join(DIST_DIR, path.normalize(requestedPath));

    if (candidate.startsWith(DIST_DIR) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      serveStatic(res, candidate);
      return;
    }

    const serverScopedCandidate = resolveServerScopedStatic(requestedPath);
    if (serverScopedCandidate) {
      serveStatic(res, serverScopedCandidate);
      return;
    }

    // SPA fallback
    serveStatic(res, INDEX_FILE);
  } catch (err) {
    console.error("[server] unexpected error", err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Blockscape server listening at http://${HOST}:${PORT}`);
  console.log(`Open the app with local backend: http://${HOST}:${PORT}/server`);
  console.log(
    `Auto-load a local file (optionally with /model-id/item-id): http://${HOST}:${PORT}/server/path/to/file.bs`
  );
  console.log(`Serving dist from: ${DIST_DIR}`);
  console.log(`File API root: ${ROOT_DIR}`);
});

function resolveDistDir() {
  const candidates = [
    path.join(__dirname, "docs"), // vite build from svelte emits here
    path.join(__dirname, "svelte", "dist"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) {
      return dir;
    }
  }
  // Last fallback to first candidate
  return candidates[0];
}

function resolveRootDir() {
  const raw = process.env.BLOCKSCAPE_ROOT;
  if (raw) {
    const expanded =
      raw.startsWith("~") && process.env.HOME
        ? path.join(process.env.HOME, raw.slice(1))
        : raw;
    return path.resolve(expanded);
  }
  return path.join(os.homedir(), "blockscape");
}
