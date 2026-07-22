const ensureTrailingSlash = (value) =>
  typeof value === "string" && value.endsWith("/") ? value : `${value || "/"}/`;

function deriveBaseFromLocation() {
  if (typeof window === "undefined" || !window.location) return "/";
  const parts = (window.location.pathname || "/").split("/").filter(Boolean);
  if (!parts.length) return "/";
  if (parts[0].toLowerCase() === "server") return "/";
  return `/${parts[0]}/`;
}

export function resolveAppBase(rawBase) {
  const base = rawBase ?? import.meta.env?.BASE_URL ?? "/";
  if (base && base !== "./") return ensureTrailingSlash(base);
  return ensureTrailingSlash(deriveBaseFromLocation());
}

export const APP_BASE = resolveAppBase();
export const SERVER_BASE = `${APP_BASE}server/`;
export const DOCS_BASE = `${APP_BASE}documentation/`;
