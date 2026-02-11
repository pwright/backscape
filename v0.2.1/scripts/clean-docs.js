const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const docsDir = path.join(root, "docs");

try {
  fs.rmSync(docsDir, { recursive: true, force: true });
  console.log("[clean-docs] removed docs/");
} catch (err) {
  console.warn("[clean-docs] failed to remove docs/", err);
}
