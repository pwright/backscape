#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const WATCH_LOG_PATH = path.join(process.cwd(), 'watch.log');
const DEFAULT_DEBOUNCE_MS = 120;
const IGNORED_DIRS = new Set(['.git', 'node_modules']);

function usage() {
  console.log(`Usage: node scripts/watch-models.js --dir <path> [--out-dir <path>] [--bs-dir <path>] [--once]

Watches a directory for .bs and .md changes.
- .bs files: validate each model against the Blockscape schema.
- .md files: scan for JSON candidates, validate models, and write an output .bs file.
`);
}

function parseArgs(argv) {
  const args = { dir: null, outDir: null, bsDir: null, once: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dir') args.dir = argv[++i];
    else if (arg === '--out-dir') args.outDir = argv[++i];
    else if (arg === '--bs-dir') args.bsDir = argv[++i];
    else if (arg === '--once') args.once = true;
    else if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }
  }
  return args;
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  if (value == null) return '';
  return String(value).trim();
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (isObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',')}}`;
  }
  return JSON.stringify(value);
}

function validateModel(model, label) {
  const errors = [];
  const warnings = [];

  if (!isObject(model)) {
    errors.push('Model root must be an object.');
    return { ok: false, errors, warnings, label };
  }

  const id = normalizeString(model.id);
  if (!id) {
    errors.push('Model id is required.');
  } else if (!/^[a-z0-9._-]+$/i.test(id)) {
    errors.push('Model id may only contain letters, numbers, ".", "-", or "_".');
  }

  const title = normalizeString(model.title);
  if (!title) errors.push('Model title is required.');

  if (model.abstract != null && typeof model.abstract !== 'string') {
    errors.push('Model abstract must be a string when provided.');
  }

  if (!Array.isArray(model.categories)) {
    errors.push('Model categories must be an array.');
  }

  const categoryIds = new Set();
  const itemIds = new Set();

  if (Array.isArray(model.categories)) {
    for (const cat of model.categories) {
      if (!isObject(cat)) {
        errors.push('Category entries must be objects.');
        continue;
      }
      const catId = normalizeString(cat.id);
      if (!catId) errors.push('Category id is required.');
      else if (categoryIds.has(catId)) errors.push(`Duplicate category id: ${catId}`);
      categoryIds.add(catId);

      const catTitle = normalizeString(cat.title);
      if (!catTitle) errors.push(`Category "${catId || 'unknown'}" title is required.`);

      if (!Array.isArray(cat.items)) {
        errors.push(`Category "${catId || 'unknown'}" items must be an array.`);
        continue;
      }

      for (const item of cat.items) {
        if (!isObject(item)) {
          errors.push(`Category "${catId || 'unknown'}" item entries must be objects.`);
          continue;
        }
        const itemId = normalizeString(item.id);
        if (!itemId) errors.push(`Item id is required (category "${catId || 'unknown'}").`);
        else if (itemIds.has(itemId)) errors.push(`Duplicate item id: ${itemId}`);
        itemIds.add(itemId);

        const itemName = normalizeString(item.name);
        if (!itemName) errors.push(`Item "${itemId || 'unknown'}" name is required.`);

        if (item.deps != null && !Array.isArray(item.deps)) {
          errors.push(`Item "${itemId || 'unknown'}" deps must be an array when provided.`);
        }

        if (item.stage != null) {
          const stage = Number(item.stage);
          if (!Number.isInteger(stage) || stage < 1 || stage > 4) {
            errors.push(`Item "${itemId || 'unknown'}" stage must be an integer 1-4 when provided.`);
          }
        }

        if (item.logo != null && typeof item.logo !== 'string') {
          errors.push(`Item "${itemId || 'unknown'}" logo must be a string when provided.`);
        }

        if (item.external != null && typeof item.external !== 'string') {
          errors.push(`Item "${itemId || 'unknown'}" external must be a string when provided.`);
        }

        if (item.color != null && typeof item.color !== 'string') {
          warnings.push(`Item "${itemId || 'unknown'}" color is not a string.`);
        }
      }
    }
  }

  if (Array.isArray(model.categories)) {
    for (const cat of model.categories) {
      if (!isObject(cat) || !Array.isArray(cat.items)) continue;
      for (const item of cat.items) {
        if (!isObject(item) || !Array.isArray(item.deps)) continue;
        for (const dep of item.deps) {
          const depId = normalizeString(dep);
          if (!depId) continue;
          if (!itemIds.has(depId)) warnings.push(`Missing dep id "${depId}" referenced by item "${item.id}".`);
          if (depId === item.id) warnings.push(`Item "${item.id}" depends on itself.`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings, label };
}

function normalizeModelCandidate(candidate) {
  if (isObject(candidate) && Array.isArray(candidate.categories)) return [candidate];
  if (Array.isArray(candidate)) {
    const models = candidate.filter((entry) => isObject(entry) && Array.isArray(entry.categories));
    return models.length ? models : null;
  }
  return null;
}

function parseJsonCandidate(raw, label) {
  try {
    const cleaned = raw.replace(/^\s*(jsonc?|javascript|js|bs)\s*/i, '').trim();
    const parsed = JSON.parse(cleaned);
    const models = normalizeModelCandidate(parsed);
    if (!models) return null;
    return { models, label };
  } catch (err) {
    return { error: `Failed to parse JSON (${label}): ${err.message}` };
  }
}

function extractJsonBlocksFromMarkdown(text) {
  const candidates = [];
  const fenceRegex = /```(?:json|jsonc|js|javascript|bs)?\n([\s\S]*?)```/gi;
  let match;
  while ((match = fenceRegex.exec(text)) !== null) {
    const content = match[1].trim();
    if (content) candidates.push({ source: 'fence', raw: content });
  }
  return candidates;
}

function normalizeMarkdownEscapes(text) {
  return text.replace(/\\([\[\]{}])/g, '$1');
}

function extractJsonCandidatesFromText(text) {
  const candidates = [];
  const seen = new Set();

  function pushCandidate(raw) {
    if (raw.length > 1024 * 1024) return;
    const key = raw.slice(0, 5000);
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ source: 'inline', raw });
  }

  const stack = [];
  let inString = false;
  let escape = false;
  let start = -1;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{' || ch === '[') {
      if (start === -1) start = i;
      stack.push(ch);
      continue;
    }

    if (ch === '}' || ch === ']') {
      const last = stack[stack.length - 1];
      if ((ch === '}' && last === '{') || (ch === ']' && last === '[')) {
        stack.pop();
        if (stack.length === 0 && start !== -1) {
          const raw = text.slice(start, i + 1).trim();
          if (raw) pushCandidate(raw);
          start = -1;
        }
      }
    }
  }

  return candidates;
}

function validateModels(models, label) {
  const results = [];
  for (const model of models) {
    const result = validateModel(model, label);
    results.push(result);
  }
  return results;
}

function reportResults(results, label) {
  const errors = results.filter((r) => !r.ok);
  const warnings = results.flatMap((r) => r.warnings || []);
  if (errors.length === 0) {
    console.log(`[OK] ${label} (${results.length} model${results.length === 1 ? '' : 's'})`);
  } else {
    console.log(`[ERROR] ${label}`);
    for (const error of errors) {
      for (const msg of error.errors) console.log(`  - ${msg}`);
    }
  }
  if (warnings.length) {
    console.log(`[WARN] ${label}`);
    for (const msg of warnings) console.log(`  - ${msg}`);
  }
}

function processBsFile(filePath) {
  const label = path.relative(process.cwd(), filePath);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const models = normalizeModelCandidate(parsed);
    if (!models) {
      console.log(`[ERROR] ${label}`);
      console.log('  - JSON must be a model object or an array of model objects.');
      return;
    }
    const results = validateModels(models, label);
    reportResults(results, label);
  } catch (err) {
    console.log(`[ERROR] ${label}`);
    console.log(`  - Failed to parse JSON: ${err.message}`);
  }
}

function processMarkdownFile(filePath, outDir) {
  const label = path.relative(process.cwd(), filePath);
  let text = '';
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.log(`[ERROR] ${label}`);
    console.log(`  - Failed to read file: ${err.message}`);
    return;
  }

  const candidates = [];
  const normalizedText = normalizeMarkdownEscapes(text);
  for (const item of extractJsonBlocksFromMarkdown(normalizedText)) candidates.push(item);
  for (const item of extractJsonCandidatesFromText(normalizedText)) candidates.push(item);

  if (!candidates.length) {
    console.log(`[INFO] ${label} no JSON candidates found.`);
    return;
  }

  const models = [];
  const parseErrors = [];

  for (const candidate of candidates) {
    const result = parseJsonCandidate(candidate.raw, `${label} (${candidate.source})`);
    if (!result) continue;
    if (result.error) parseErrors.push(result.error);
    else models.push(...result.models);
  }

  if (!models.length) {
    console.log(`[ERROR] ${label}`);
    for (const err of parseErrors) console.log(`  - ${err}`);
    console.log('  - No valid model candidates found.');
    return;
  }

  const results = validateModels(models, label);
  reportResults(results, label);

  const validModels = [];
  const seenModelIds = new Set();
  const seenModelHashes = new Set();
  const idCounters = new Map();
  results.forEach((result, idx) => {
    if (!result.ok) return;
    const model = models[idx];
    const hash = stableStringify(model);
    if (seenModelHashes.has(hash)) {
      console.log(`[INFO] ${label} duplicate model content skipped.`);
      return;
    }
    seenModelHashes.add(hash);

    let modelId = normalizeString(model.id);
    if (!modelId) {
      modelId = `model-${validModels.length + 1}`;
      model.id = modelId;
    }
    if (seenModelIds.has(modelId)) {
      const count = (idCounters.get(modelId) || 1) + 1;
      idCounters.set(modelId, count);
      const nextId = `${modelId}-${count}`;
      model.id = nextId;
      console.log(`[INFO] ${label} duplicate model id renamed: ${modelId} -> ${nextId}`);
      modelId = nextId;
    }
    seenModelIds.add(modelId);
    validModels.push(model);
  });
  if (!validModels.length) return;

  const baseName = path.basename(filePath, path.extname(filePath));
  const outPath = path.join(outDir, `${baseName}.bs`);
  try {
    fs.writeFileSync(outPath, JSON.stringify(validModels, null, 2) + '\n', 'utf8');
    console.log(`[WRITE] ${path.relative(process.cwd(), outPath)} (${validModels.length} model${validModels.length === 1 ? '' : 's'})`);
    try {
      fs.appendFileSync(WATCH_LOG_PATH, `${path.resolve(outPath)}\n`, 'utf8');
    } catch (err) {
      console.log(`[WARN] Failed to write watch log: ${err.message}`);
    }
  } catch (err) {
    console.log(`[ERROR] ${label}`);
    console.log(`  - Failed to write output: ${err.message}`);
  }
}

function copyBsFile(filePath, bsDir) {
  const baseName = path.basename(filePath);
  const destPath = path.join(bsDir, baseName);
  try {
    fs.copyFileSync(filePath, destPath, fs.constants.COPYFILE_EXCL);
    console.log(`[COPY] ${path.relative(process.cwd(), destPath)}`);
  } catch (err) {
    if (err.code === 'EEXIST') {
      const message = `[WARN] ${destPath} exists; skipping copy.`;
      console.log(message);
      try {
        fs.appendFileSync(WATCH_LOG_PATH, `${message}\n`, 'utf8');
      } catch (logErr) {
        console.log(`[WARN] Failed to write watch log: ${logErr.message}`);
      }
      return;
    }
    console.log(`[ERROR] ${label}`);
    console.log(`  - Failed to copy .bs file: ${err.message}`);
  }
}

function shouldIgnoreDir(dirPath) {
  const name = path.basename(dirPath);
  return IGNORED_DIRS.has(name);
}

function walkFiles(dirPath, onFile) {
  if (shouldIgnoreDir(dirPath)) return;
  let entries = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, onFile);
    } else if (entry.isFile()) {
      onFile(full);
    }
  }
}

function watchDirectory(rootDir, onFileChange) {
  const watchers = new Map();

  function addWatcher(dirPath) {
    if (watchers.has(dirPath)) return;
    if (shouldIgnoreDir(dirPath)) return;
    let watcher;
    try {
      watcher = fs.watch(dirPath, { persistent: true }, (eventType, filename) => {
        if (!filename) return;
        const fullPath = path.join(dirPath, filename);
        onFileChange(fullPath);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) addWatcher(fullPath);
        } catch {
          // ignore missing paths
        }
      });
    } catch (err) {
      console.log(`[WARN] Failed to watch ${dirPath}: ${err.message}`);
      return;
    }
    watchers.set(dirPath, watcher);

    let entries = [];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) addWatcher(path.join(dirPath, entry.name));
    }
  }

  addWatcher(rootDir);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dir) {
    usage();
    process.exit(1);
  }

  const rootDir = path.resolve(args.dir);
  const outDir = path.resolve(args.outDir || rootDir);
  const bsDir = args.bsDir ? path.resolve(args.bsDir) : null;

  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    console.error(`Directory not found: ${rootDir}`);
    process.exit(1);
  }
  if (bsDir && (!fs.existsSync(bsDir) || !fs.statSync(bsDir).isDirectory())) {
    console.error(`BS output directory not found: ${bsDir}`);
    process.exit(1);
  }

  const pending = new Map();
  function schedule(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.bs' && ext !== '.md') return;
    if (pending.has(filePath)) clearTimeout(pending.get(filePath));
    pending.set(
      filePath,
      setTimeout(() => {
        pending.delete(filePath);
        if (!fs.existsSync(filePath)) return;
        if (ext === '.bs') {
          processBsFile(filePath);
          if (bsDir) copyBsFile(filePath, bsDir);
        }
        else processMarkdownFile(filePath, outDir);
      }, DEFAULT_DEBOUNCE_MS)
    );
  }

  if (args.once) {
    walkFiles(rootDir, (filePath) => schedule(filePath));
    return;
  }

  walkFiles(rootDir, (filePath) => schedule(filePath));
  watchDirectory(rootDir, schedule);
  console.log(`[WATCH] ${rootDir}`);
}

main();
