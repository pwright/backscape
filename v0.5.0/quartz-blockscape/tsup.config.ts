import { defineConfig } from "tsup"

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: false,
    clean: false,
    splitting: false,
    external: ["node:fs", "node:path", "node:url"],
  },
  {
    entry: {
      client: "src/client.ts",
    },
    format: ["iife"],
    globalName: "BlockscapeQuartzClient",
    platform: "browser",
    sourcemap: false,
    clean: false,
    splitting: false,
    bundle: true,
    outExtension: ({ format }) => ({
      js: format === "iife" ? ".global.js" : ".js",
    }),
  },
])
