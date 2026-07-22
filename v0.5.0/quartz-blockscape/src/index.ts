import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { remarkBlockscape, type BlockscapeRenderer } from "./remarkBlockscape"

export { remarkBlockscape, validateBlockscapeMap, validateBlockscapePayload } from "./remarkBlockscape"

export interface BlockscapeOptions {
  includeClient?: boolean
  defaultRenderer?: BlockscapeRenderer
}

function readDistAsset(fileName: string): string {
  const current = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.join(current, fileName),
    path.join(current, "..", "dist", fileName),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf8")
  }
  return ""
}

export const Blockscape = (opts: BlockscapeOptions = {}) => {
  const includeClient = opts.includeClient !== false
  const defaultRenderer = opts.defaultRenderer === "full" ? "full" : "lite"

  return {
    name: "Blockscape",
    markdownPlugins() {
      return [[remarkBlockscape, { defaultRenderer }]]
    },
    externalResources() {
      if (!includeClient) return { js: [], css: [] }
      const config = `window.BlockscapeQuartz = Object.assign(window.BlockscapeQuartz || {}, { defaultRenderer: ${JSON.stringify(defaultRenderer)} });`
      const client = readDistAsset("client.global.js")
      const fullClient = readDistAsset("full.global.js")
      const css = readDistAsset("client.css")
      const fullCss = readDistAsset("full.css")
      return {
        js: [
          {
            script: config,
            loadTime: "beforeDOMReady",
            contentType: "inline",
          },
          ...(client
            ? [
                {
                  script: client,
                  loadTime: "afterDOMReady",
                  contentType: "inline",
                },
              ]
            : []),
          ...(fullClient
            ? [
                {
                  script: fullClient,
                  loadTime: "afterDOMReady",
                  contentType: "inline",
                },
              ]
            : []),
        ],
        css: [
          ...(css ? [{ content: css, inline: true }] : []),
          ...(fullCss ? [{ content: fullCss, inline: true }] : []),
        ],
      }
    },
  }
}

export default Blockscape
