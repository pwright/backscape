import { renderBlockscape } from "../../svelte/src/renderBlockscape.js"
import "./styles.css"

const ROOT_SELECTOR = ".blockscape-root"
const MOUNTED_ATTR = "data-blockscape-mounted"
type BlockscapeRenderer = "lite" | "full"

function getDefaultRenderer(): BlockscapeRenderer {
  const configured = (window as Window & { BlockscapeQuartz?: { defaultRenderer?: string } }).BlockscapeQuartz?.defaultRenderer
  return configured === "full" ? "full" : "lite"
}

function getRootRenderer(root: HTMLElement): BlockscapeRenderer {
  const configured = root.dataset.blockscapeRenderer
  if (configured === "full" || configured === "lite") return configured
  return getDefaultRenderer()
}

function resolveMapUrl(src: string): string {
  return new URL(src, window.location.href).toString()
}

async function mapFromInline(root: Element): Promise<unknown> {
  const script = root.querySelector('script[type="application/json"].blockscape-data, script[type="application/json"]')
  if (!script) throw new Error("inline Blockscape root is missing an application/json script")
  return JSON.parse(script.textContent || "")
}

async function mapFromSource(root: HTMLElement): Promise<unknown> {
  const src = root.dataset.src
  if (!src) throw new Error("source Blockscape root is missing data-src")
  const url = resolveMapUrl(src)
  console.debug("[Blockscape] fetching map", { src, url })
  const response = await fetch(url, { credentials: "same-origin" })
  if (!response.ok) throw new Error(`failed to fetch ${url}: ${response.status} ${response.statusText}`)
  return response.json()
}

async function mountRoot(root: HTMLElement): Promise<void> {
  const renderer = getRootRenderer(root)
  if (renderer !== "lite") {
    console.debug("[Blockscape] skipping non-lite root", { renderer, root })
    return
  }
  if (root.getAttribute(MOUNTED_ATTR) === "true") return
  root.setAttribute(MOUNTED_ATTR, "true")

  try {
    const mode = root.dataset.src ? "src" : "inline"
    console.debug("[Blockscape] mounting lite map", { mode, root })
    const map = mode === "src" ? await mapFromSource(root) : await mapFromInline(root)
    renderBlockscape(root, map, { readOnly: true, source: root.dataset.src || "inline" })
    console.debug("[Blockscape] mounted lite map", { mode, root })
  } catch (error) {
    root.removeAttribute(MOUNTED_ATTR)
    console.error("[Blockscape] failed to render map", error, root)
  }
}

export async function mountBlockscape(root: ParentNode = document): Promise<void> {
  const roots = Array.from(root.querySelectorAll<HTMLElement>(ROOT_SELECTOR))
  await Promise.all(roots.map((element) => mountRoot(element)))
}

function scheduleMount(): void {
  mountBlockscape().catch((error) => console.error("[Blockscape] mount failed", error))
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleMount, { once: true })
  } else {
    scheduleMount()
  }

  document.addEventListener("nav", scheduleMount)
  document.addEventListener("quartz:render", scheduleMount)
  window.addEventListener("popstate", () => window.setTimeout(scheduleMount, 0))
  const existing = (window as Window & { BlockscapeQuartz?: Record<string, unknown> }).BlockscapeQuartz || {}
  ;(window as Window & { BlockscapeQuartz?: Record<string, unknown> }).BlockscapeQuartz = {
    ...existing,
    mount: mountBlockscape,
  }
}
