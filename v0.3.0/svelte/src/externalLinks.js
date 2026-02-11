export function canUseNeutralino() {
  return (
    typeof window !== "undefined" &&
    window.Neutralino &&
    window.Neutralino.os &&
    typeof window.Neutralino.os.open === "function"
  );
}

export function openExternalUrl(url) {
  if (!url) return false;
  if (canUseNeutralino()) {
    try {
      window.Neutralino.os.open(url);
      return true;
    } catch (error) {
      console.warn("[Blockscape] failed to open external url", url, error);
    }
  }
  window.open(url, "_blank", "noopener");
  return true;
}

export function isExternalHref(href) {
  if (!href || href.startsWith("#") || /^javascript:/i.test(href)) return false;
  try {
    const parsed = new URL(href, window.location.href);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.origin !== window.location.origin;
    }
    return true;
  } catch {
    return false;
  }
}

export function resolveHref(href) {
  try {
    return new URL(href, window.location.href).toString();
  } catch {
    return href;
  }
}
