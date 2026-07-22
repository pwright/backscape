// src/index.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// src/remarkBlockscape.ts
var BLOCKSCAPE_LANGUAGES = /* @__PURE__ */ new Set(["blockscape", "bs"]);
var RENDERERS = /* @__PURE__ */ new Set(["lite", "full"]);
function validateBlockscapeMap(value, filePath = "unknown markdown file", pathPrefix = "root") {
  const fail = (message) => {
    throw new Error(`Invalid Blockscape JSON in ${filePath}: ${message}`);
  };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${pathPrefix} must be an object`);
  }
  const map = value;
  if (typeof map.id !== "string" || map.id.trim() === "") fail(`${pathPrefix}.id is required`);
  if (typeof map.title !== "string" || map.title.trim() === "") fail(`${pathPrefix}.title is required`);
  if (!Array.isArray(map.categories)) fail(`${pathPrefix}.categories must be an array`);
  const categories = map.categories;
  categories.forEach((category, categoryIndex) => {
    if (!category || typeof category !== "object" || Array.isArray(category)) {
      fail(`${pathPrefix}.categories[${categoryIndex}] must be an object`);
    }
    const cat = category;
    if (typeof cat.id !== "string" || cat.id.trim() === "") fail(`${pathPrefix}.categories[${categoryIndex}].id is required`);
    if (typeof cat.title !== "string" || cat.title.trim() === "") fail(`${pathPrefix}.categories[${categoryIndex}].title is required`);
    if (!Array.isArray(cat.items)) fail(`${pathPrefix}.categories[${categoryIndex}].items must be an array`);
    const items = cat.items;
    items.forEach((item, itemIndex) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        fail(`${pathPrefix}.categories[${categoryIndex}].items[${itemIndex}] must be an object`);
      }
      const current = item;
      if (typeof current.id !== "string" || current.id.trim() === "") {
        fail(`${pathPrefix}.categories[${categoryIndex}].items[${itemIndex}].id is required`);
      }
      if (typeof current.name !== "string" || current.name.trim() === "") {
        fail(`${pathPrefix}.categories[${categoryIndex}].items[${itemIndex}].name is required`);
      }
    });
  });
}
function validateBlockscapePayload(value, filePath = "unknown markdown file") {
  if (Array.isArray(value)) {
    if (!value.length) {
      throw new Error(`Invalid Blockscape JSON in ${filePath}: series array must contain at least one map`);
    }
    value.forEach((map, index) => validateBlockscapeMap(map, filePath, `series[${index}]`));
    return;
  }
  validateBlockscapeMap(value, filePath);
}
function normalizeRenderer(value, fallback) {
  const candidate = String(value || "").toLowerCase();
  return RENDERERS.has(candidate) ? candidate : fallback;
}
function rendererFromMeta(meta, fallback) {
  const parts = String(meta || "").split(/\s+/).filter(Boolean);
  const explicit = parts.find((part) => RENDERERS.has(part.toLowerCase()));
  return normalizeRenderer(explicit, fallback);
}
function htmlForBlockscape(rawJson, renderer) {
  return `<div class="blockscape-root" data-blockscape-mode="inline" data-blockscape-renderer="${renderer}">
  <script type="application/json" class="blockscape-data">
${rawJson.trim()}
  </script>
</div>`;
}
var remarkBlockscape = (options = {}) => {
  const defaultRenderer = normalizeRenderer(options.defaultRenderer, "lite");
  return (tree, file) => {
    const filePath = file.path || file.history?.[0] || "unknown markdown file";
    for (let index = 0; index < tree.children.length; index += 1) {
      const node = tree.children[index];
      if (node.type !== "code") continue;
      const code = node;
      const language = String(code.lang || "").toLowerCase();
      if (!BLOCKSCAPE_LANGUAGES.has(language)) continue;
      let parsed;
      try {
        parsed = JSON.parse(code.value);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid Blockscape JSON in ${filePath}: ${message}`);
      }
      validateBlockscapePayload(parsed, filePath);
      const renderer = rendererFromMeta(code.meta, defaultRenderer);
      tree.children[index] = {
        type: "html",
        value: htmlForBlockscape(code.value, renderer)
      };
    }
  };
};

// src/index.ts
function readDistAsset(fileName) {
  const current = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(current, fileName),
    path.join(current, "..", "dist", fileName)
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf8");
  }
  return "";
}
var Blockscape = (opts = {}) => {
  const includeClient = opts.includeClient !== false;
  const defaultRenderer = opts.defaultRenderer === "full" ? "full" : "lite";
  return {
    name: "Blockscape",
    markdownPlugins() {
      return [[remarkBlockscape, { defaultRenderer }]];
    },
    externalResources() {
      if (!includeClient) return { js: [], css: [] };
      const config = `window.BlockscapeQuartz = Object.assign(window.BlockscapeQuartz || {}, { defaultRenderer: ${JSON.stringify(defaultRenderer)} });`;
      const client = readDistAsset("client.global.js");
      const fullClient = readDistAsset("full.global.js");
      const css = readDistAsset("client.css");
      const fullCss = readDistAsset("full.css");
      return {
        js: [
          {
            script: config,
            loadTime: "beforeDOMReady",
            contentType: "inline"
          },
          ...client ? [
            {
              script: client,
              loadTime: "afterDOMReady",
              contentType: "inline"
            }
          ] : [],
          ...fullClient ? [
            {
              script: fullClient,
              loadTime: "afterDOMReady",
              contentType: "inline"
            }
          ] : []
        ],
        css: [
          ...css ? [{ content: css, inline: true }] : [],
          ...fullCss ? [{ content: fullCss, inline: true }] : []
        ]
      };
    }
  };
};
var index_default = Blockscape;
export {
  Blockscape,
  index_default as default,
  remarkBlockscape,
  validateBlockscapeMap,
  validateBlockscapePayload
};
