import Blockscape from "../../svelte/src/Blockscape.svelte";

const ROOT_SELECTOR = ".blockscape-root";
const MOUNTED_ATTR = "data-blockscape-full-mounted";

function getDefaultRenderer() {
  return window.BlockscapeQuartz?.defaultRenderer === "full" ? "full" : "lite";
}

function getRootRenderer(root) {
  const configured = root.dataset.blockscapeRenderer;
  if (configured === "full" || configured === "lite") return configured;
  return getDefaultRenderer();
}

function resolveMapUrl(src) {
  return new URL(src, window.location.href).toString();
}

async function mapFromInline(root) {
  const script = root.querySelector(
    'script[type="application/json"].blockscape-data, script[type="application/json"]'
  );
  if (!script) throw new Error("inline Blockscape root is missing an application/json script");
  return JSON.parse(script.textContent || "");
}

async function mapFromSource(root) {
  const src = root.dataset.src;
  if (!src) throw new Error("source Blockscape root is missing data-src");
  const url = resolveMapUrl(src);
  console.debug("[Blockscape] fetching full map", { src, url });
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`failed to fetch ${url}: ${response.status} ${response.statusText}`);
  return response.json();
}

function fullFeatures(root) {
  return {
    readOnly: true,
    localBackend: false,
    fileOpen: false,
    fileSave: false,
    autoLoadFromDir: false,
    showHeader: false,
    showSidebar: false,
    showFooter: false,
    showModelMeta: root.dataset.blockscapeShowMeta !== "false",
    seriesNavMinVersions: 2,
  };
}

async function mountRoot(root) {
  const renderer = getRootRenderer(root);
  if (renderer !== "full") return;
  if (root.getAttribute(MOUNTED_ATTR) === "true") return;
  root.setAttribute(MOUNTED_ATTR, "true");

  try {
    const mode = root.dataset.src ? "src" : "inline";
    console.debug("[Blockscape] mounting full map", { mode, root });
    const map = mode === "src" ? await mapFromSource(root) : await mapFromInline(root);
    root.innerHTML = "";
    root.classList.add("blockscape-root--full");
    const instance = new Blockscape({
      target: root,
      props: {
        seed: map,
        features: fullFeatures(root),
      },
    });
    root.__blockscapeFullInstance = instance;
    console.debug("[Blockscape] mounted full map", { mode, root });
  } catch (error) {
    root.removeAttribute(MOUNTED_ATTR);
    console.error("[Blockscape] failed to render full map", error, root);
  }
}

export async function mountFullBlockscape(root = document) {
  const roots = Array.from(root.querySelectorAll(ROOT_SELECTOR));
  await Promise.all(roots.map((element) => mountRoot(element)));
}

function scheduleMount() {
  mountFullBlockscape().catch((error) => console.error("[Blockscape] full mount failed", error));
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleMount, { once: true });
  } else {
    scheduleMount();
  }

  document.addEventListener("nav", scheduleMount);
  document.addEventListener("quartz:render", scheduleMount);
  window.addEventListener("popstate", () => window.setTimeout(scheduleMount, 0));

  window.BlockscapeQuartz = {
    ...(window.BlockscapeQuartz || {}),
    mountFull: mountFullBlockscape,
  };
}
