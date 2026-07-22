import type { Root, Code, Html } from "mdast"
import type { Plugin } from "unified"
import type { VFile } from "vfile"

const BLOCKSCAPE_LANGUAGES = new Set(["blockscape", "bs"])
const RENDERERS = new Set(["lite", "full"])

export type BlockscapeRenderer = "lite" | "full"

export interface RemarkBlockscapeOptions {
  defaultRenderer?: BlockscapeRenderer
}

export function validateBlockscapeMap(value: unknown, filePath = "unknown markdown file", pathPrefix = "root"): void {
  const fail = (message: string): never => {
    throw new Error(`Invalid Blockscape JSON in ${filePath}: ${message}`)
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${pathPrefix} must be an object`)
  }

  const map = value as Record<string, unknown>
  if (typeof map.id !== "string" || map.id.trim() === "") fail(`${pathPrefix}.id is required`)
  if (typeof map.title !== "string" || map.title.trim() === "") fail(`${pathPrefix}.title is required`)
  if (!Array.isArray(map.categories)) fail(`${pathPrefix}.categories must be an array`)
  const categories = map.categories as unknown[]

  categories.forEach((category: unknown, categoryIndex: number) => {
    if (!category || typeof category !== "object" || Array.isArray(category)) {
      fail(`${pathPrefix}.categories[${categoryIndex}] must be an object`)
    }
    const cat = category as Record<string, unknown>
    if (typeof cat.id !== "string" || cat.id.trim() === "") fail(`${pathPrefix}.categories[${categoryIndex}].id is required`)
    if (typeof cat.title !== "string" || cat.title.trim() === "") fail(`${pathPrefix}.categories[${categoryIndex}].title is required`)
    if (!Array.isArray(cat.items)) fail(`${pathPrefix}.categories[${categoryIndex}].items must be an array`)
    const items = cat.items as unknown[]

    items.forEach((item: unknown, itemIndex: number) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        fail(`${pathPrefix}.categories[${categoryIndex}].items[${itemIndex}] must be an object`)
      }
      const current = item as Record<string, unknown>
      if (typeof current.id !== "string" || current.id.trim() === "") {
        fail(`${pathPrefix}.categories[${categoryIndex}].items[${itemIndex}].id is required`)
      }
      if (typeof current.name !== "string" || current.name.trim() === "") {
        fail(`${pathPrefix}.categories[${categoryIndex}].items[${itemIndex}].name is required`)
      }
    })
  })
}

export function validateBlockscapePayload(value: unknown, filePath = "unknown markdown file"): void {
  if (Array.isArray(value)) {
    if (!value.length) {
      throw new Error(`Invalid Blockscape JSON in ${filePath}: series array must contain at least one map`)
    }
    value.forEach((map, index) => validateBlockscapeMap(map, filePath, `series[${index}]`))
    return
  }
  validateBlockscapeMap(value, filePath)
}

function normalizeRenderer(value: unknown, fallback: BlockscapeRenderer): BlockscapeRenderer {
  const candidate = String(value || "").toLowerCase()
  return RENDERERS.has(candidate) ? (candidate as BlockscapeRenderer) : fallback
}

function rendererFromMeta(meta: string | null | undefined, fallback: BlockscapeRenderer): BlockscapeRenderer {
  const parts = String(meta || "").split(/\s+/).filter(Boolean)
  const explicit = parts.find((part) => RENDERERS.has(part.toLowerCase()))
  return normalizeRenderer(explicit, fallback)
}

function htmlForBlockscape(rawJson: string, renderer: BlockscapeRenderer): string {
  return `<div class="blockscape-root" data-blockscape-mode="inline" data-blockscape-renderer="${renderer}">
  <script type="application/json" class="blockscape-data">
${rawJson.trim()}
  </script>
</div>`
}

export const remarkBlockscape: Plugin<[RemarkBlockscapeOptions?], Root> = (options = {}) => {
  const defaultRenderer = normalizeRenderer(options.defaultRenderer, "lite")

  return (tree: Root, file: VFile) => {
    const filePath = file.path || file.history?.[0] || "unknown markdown file"

    for (let index = 0; index < tree.children.length; index += 1) {
      const node = tree.children[index]
      if (node.type !== "code") continue

      const code = node as Code
      const language = String(code.lang || "").toLowerCase()
      if (!BLOCKSCAPE_LANGUAGES.has(language)) continue

      let parsed: unknown
      try {
        parsed = JSON.parse(code.value)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`Invalid Blockscape JSON in ${filePath}: ${message}`)
      }

      validateBlockscapePayload(parsed, filePath)
      const renderer = rendererFromMeta(code.meta, defaultRenderer)

      tree.children[index] = {
        type: "html",
        value: htmlForBlockscape(code.value, renderer),
      } as Html
    }
  }
}

export default remarkBlockscape
