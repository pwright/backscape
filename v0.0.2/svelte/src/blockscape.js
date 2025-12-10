import { createApicurioIntegration } from './apicurio';
import { collectAllItemIds, createItemEditor, updateItemReferences } from './itemEditor';
import { ensureSeriesId, getSeriesId, makeSeriesId } from './series';

const ASSET_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '';

export function initBlockscape() {
    console.log("[Blockscape] init");

    const jsonBox = document.getElementById('jsonBox');
    const jsonPanel = document.querySelector('.blockscape-json-panel');
    const app = document.getElementById('app');
    const overlay = document.getElementById('overlay');
    const tabTooltip = document.getElementById('tabTooltip');
    const modelList = document.getElementById('modelList');
    const preview = document.getElementById('itemPreview');
    const urlForm = document.getElementById('urlForm');
    const urlInput = document.getElementById('urlInput');
    const loadUrlButton = document.getElementById('loadUrl');
    const previewTitle = preview.querySelector('.item-preview__title');
    const previewBody = preview.querySelector('.item-preview__body');
    const previewActions = preview.querySelector('.item-preview__actions');
    const previewClose = preview.querySelector('.item-preview__close');
    const downloadButton = document.getElementById('downloadJson');
    const shareButton = document.getElementById('shareModel');
    const createVersionButton = document.getElementById('createVersion');
    const editButton = document.getElementById('openInEditor');
    const copyJsonButton = document.getElementById('copyJson');
    const copySeriesButton = document.getElementById('copySeries');
    const pasteJsonButton = document.getElementById('pasteJson');
    const helpButton = document.getElementById('helpButton');
    const newPanelButton = document.getElementById('newPanelButton');
    const shortcutHelp = document.getElementById('shortcutHelp');
    const shortcutHelpList = document.getElementById('shortcutHelpList');
    const shortcutHelpClose = document.getElementById('shortcutHelpClose');
    const shortcutHelpBackdrop = document.getElementById('shortcutHelpBackdrop');
    const newPanel = document.getElementById('newPanel');
    const newPanelClose = document.getElementById('newPanelClose');
    const newPanelBackdrop = document.getElementById('newPanelBackdrop');
    const searchInput = document.getElementById('search');
    const searchResults = document.getElementById('searchResults');
    const EDITOR_TRANSFER_KEY = 'blockscape:editorPayload';
    const EDITOR_TRANSFER_MESSAGE_TYPE = 'blockscape:editorTransfer';
    const defaultDocumentTitle = document.title;

    // Show the seed in the editor initially.
    jsonBox.value = document.getElementById('seed').textContent.trim();

    // ===== State =====
    /** @type {{id:string,title:string,data:any}[]} */
    let models = [];
    let activeIndex = -1;
    const apicurio = createApicurioIntegration({
      models,
      getActiveIndex: () => activeIndex,
      setActive,
      ensureModelMetadata,
      getModelId,
      getSeriesId,
      ensureSeriesId,
      getModelTitle,
      computeJsonFingerprint,
      uid
    });

    let model = null;           // parsed result of active model: { m, fwd, rev, reusedLocal, seen }
    let index = new Map();      // id -> {el, catId, rect}
    let selection = null;
    let selectionRelations = null;
    let showSecondaryLinks = true;
    let showReusedInMap = false;
    let previewRequestId = 0;
    let previewAnchor = { x: 0, y: 0 };
    let lastActiveTabId = 'map';
    let lastDeletedItem = null;
    let shortcutHelpListBuilt = false;
    let lastShortcutTrigger = null;
    const NOTICE_TIMEOUT_MS = 2000;
    let pendingSeriesNavigation = null;
    let noticeEl = null;
    let noticeTextEl = null;
    let noticeTimer = null;
    let infoTooltipAutoHideTimer = null;
    let infoTabButton = null;
    let activeInfoTooltipHtml = '';
    let pendingInfoPreview = false;
    let infoTabTwinkleTimer = null;
    let apicurioSettingsToggle = null;
    let activeSeriesPreviewTarget = null;
    let versionThumbLabels = [];
    let thumbLabelMeasureTimer = null;
    const MAX_SEARCH_RESULTS = 30;
    const SERIES_INFO_PREVIEW_DELAY = 1000;
    apicurio.hydrateConfig();

    // ===== Utilities =====
    function uid() { return Math.random().toString(36).slice(2, 10); }

    function base64Encode(text) {
      const bytes = new TextEncoder().encode(text);
      let binary = '';
      bytes.forEach(b => { binary += String.fromCharCode(b); });
      return btoa(binary);
    }

    function base64Decode(base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    }

    function base64UrlEncode(text) {
      return base64Encode(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }

    function base64UrlDecode(token) {
      let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.length % 4;
      if (pad) base64 += '='.repeat(4 - pad);
      return base64Decode(base64);
    }

    function download(filename, text) {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    async function writeTextToClipboard(text) {
      if (!navigator.clipboard?.writeText) return false;
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('[Blockscape] clipboard write failed', err);
        return false;
      }
    }

    async function readTextFromClipboard() {
      if (!navigator.clipboard?.readText) {
        throw new Error('Clipboard read not supported');
      }
      return navigator.clipboard.readText();
    }

    function makeDownloadName(base) {
      return (base || 'blockscape')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'blockscape';
    }


    function promptForSeriesTitle(defaultTitle) {
      if (typeof window === 'undefined' || typeof window.prompt !== 'function') return null;
      const response = window.prompt('Name this series', defaultTitle);
      const trimmed = (response || '').trim();
      return trimmed || null;
    }

    function deriveSeriesTitleFromArray(list, titleBase = 'Pasted') {
      const array = Array.isArray(list) ? list : [];
      if (!array.length) return `${titleBase} series`;
      const firstObj = array.find(obj => obj && typeof obj === 'object') || array[0];
      const candidate = (firstObj?.title ?? '').toString().trim();
      return candidate || `${titleBase} series`;
    }

    function applySeriesSlug(entry, slug) {
      if (!slug || !entry || typeof entry !== 'object') return;
      entry.seriesId = slug;
      entry.apicurioArtifactId = slug;
      entry.id = slug;
    }

    function stableStringify(value) {
      if (value === null || typeof value !== 'object') return JSON.stringify(value);
      if (Array.isArray(value)) return `[${value.map(v => stableStringify(v)).join(',')}]`;
      const keys = Object.keys(value).sort();
      const parts = keys.map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`);
      return `{${parts.join(',')}}`;
    }

    function canonicalizeJson(value) {
      try {
        return stableStringify(value);
      } catch {
        return '';
      }
    }

    function computeJsonFingerprint(input) {
      try {
        const value = typeof input === 'string' ? JSON.parse(input) : input;
        const fp = canonicalizeJson(value);
        if (fp) return fp;
      } catch (err) {
        console.warn('[Blockscape] fingerprint parse failed (first pass)', err);
      }
      try {
        const clone = JSON.parse(JSON.stringify(input));
        const fp = canonicalizeJson(clone);
        if (fp) return fp;
      } catch (err) {
        console.warn('[Blockscape] fingerprint failed for value', err);
      }
      try {
        return JSON.stringify(input) || '';
      } catch {
        return '';
      }
    }

    const SHORTCUT_CONFIG = [
      { keys: [['Cmd/Ctrl', 'S']], description: 'Download the active model JSON (series if multiple versions are open).' },
      { keys: [['Cmd/Ctrl', 'Z']], description: 'Undo the last deleted tile.' },
      { keys: [['Arrow Left'], ['Arrow Right']], description: 'Move selection to the previous or next item in the current category.' },
      { keys: [['Shift', 'Arrow Left'], ['Shift', 'Arrow Right']], description: 'Reorder the selected item inside its category.' },
      { keys: [['Arrow Up'], ['Arrow Down']], description: 'Jump to the previous or next category while keeping position where possible.' },
      { keys: [['Shift', 'Arrow Up'], ['Shift', 'Arrow Down']], description: 'Move the selected item to the previous or next category.' },
      { keys: [['Delete']], description: 'Delete the selected item (use Cmd/Ctrl+Z to undo).' },
      { keys: [['F2']], description: 'Open the item editor for the selected tile.' },
      { keys: [['Escape']], description: 'Close the open preview popover.' },
      { keys: [['Enter'], ['Space']], description: 'Activate a focused tile, same as clicking it.' },
      { keys: [['Cmd/Ctrl', 'V']], description: 'Append JSON models from the clipboard when focus is outside inputs.' }
    ];

    function ensureModelMetadata(data, { titleHint = 'Untitled Model', idHint } = {}) {
      if (!data || typeof data !== 'object') return data;
      const trimmedTitle = (data.title ?? '').toString().trim();
      data.title = trimmedTitle || titleHint || 'Untitled Model';

      const trimmedId = (data.id ?? '').toString().trim();
      if (!trimmedId) {
        const base = idHint || data.title || titleHint || 'model';
        const slug = makeDownloadName(base).replace(/\./g, '-');
        data.id = slug || `model-${uid()}`;
      } else {
        data.id = trimmedId;
      }

      if (typeof data.abstract !== 'string') {
        data.abstract = data.abstract == null ? '' : String(data.abstract);
      }
      return data;
    }

    function cloneModelData(data) {
      return JSON.parse(JSON.stringify(data));
    }

    function getModelTitle(entry, fallback = 'Untitled Model') {
      if (!entry) return fallback;
      const candidate = (entry.data?.title ?? entry.title ?? '').toString().trim();
      return candidate || fallback;
    }

    function getModelDisplayTitle(entry, fallback = 'Untitled Model') {
      const isSeries = entry?.apicurioVersions?.length > 1 || entry?.isSeries;
      if (isSeries) {
        const seriesTitle = (entry?.title ?? '').toString().trim()
          || (entry?.apicurioArtifactName ?? '').toString().trim();
        if (seriesTitle) return seriesTitle;
        const modelId = getModelId(entry);
        if (modelId) return `${modelId} series`;
        return fallback;
      }
      return getModelTitle(entry, fallback);
    }

    function getModelId(entry) {
      const seriesId = getSeriesId(entry);
      if (seriesId) return seriesId;
      const candidate = entry?.data?.id;
      if (!candidate) return null;
      const trimmed = candidate.toString().trim();
      return trimmed || null;
    }

    function persistActiveEdits(entryIndex) {
      if (entryIndex < 0 || entryIndex >= models.length) return true;
      if (!jsonBox) return true;
      const entry = models[entryIndex];
      const text = (jsonBox.value || '').trim();
      if (!text) return true;
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        alert('Current JSON is invalid. Fix it before switching versions.');
        return false;
      }
      ensureModelMetadata(parsed, {
        titleHint: getModelTitle(entry),
        idHint: getModelId(entry)
      });
      const currentFp = computeJsonFingerprint(entry.data);
      const editedFp = computeJsonFingerprint(parsed);
      if (currentFp === editedFp) return true;
      entry.data = parsed;
      const activeVerIdx = getActiveApicurioVersionIndex(entry);
      if (activeVerIdx >= 0 && entry.apicurioVersions?.[activeVerIdx]) {
        entry.apicurioVersions[activeVerIdx].data = parsed;
      }
      return true;
    }

    function collectAllItemIds(modelData) {
      const ids = new Set();
      (modelData?.categories || []).forEach(cat => (cat.items || []).forEach(it => {
        if (it?.id) ids.add(it.id);
      }));
      return ids;
    }

    function findItemAndCategoryById(itemId) {
      if (activeIndex < 0 || !itemId) return null;
      const mobj = models[activeIndex].data;
      const categories = mobj?.categories || [];
      for (const cat of categories) {
        const items = cat.items || [];
        const found = items.find(it => it.id === itemId);
        if (found) {
          return { category: cat, item: found, modelData: mobj };
        }
      }
      return null;
    }

    function makeUniqueItemId(base, modelData) {
      const ids = collectAllItemIds(modelData);
      let candidate = makeDownloadName(base || 'item') || `item-${uid()}`;
      if (!ids.has(candidate)) return candidate;
      const suffix = () => uid().slice(0, 4);
      while (ids.has(candidate)) {
        candidate = `${makeDownloadName(base || 'item')}-${suffix()}`;
      }
      return candidate;
    }

    const itemEditor = createItemEditor({
      findItemAndCategoryById,
      collectAllItemIds,
      updateItemReferences,
      loadActiveIntoEditor,
      rebuildFromActive,
      select: (id) => select(id),
      onSelectionRenamed: (oldId, newId) => {
        if (selection === oldId) selection = newId;
        if (lastDeletedItem?.item?.id === oldId) lastDeletedItem.item.id = newId;
      }
    });

    function ensureVersionContainer(entry, { versionLabel = '1', createdOn } = {}) {
      if (!entry) return entry;
      if (Array.isArray(entry.apicurioVersions) && entry.apicurioVersions.length) {
        if (entry.apicurioActiveVersionIndex == null) {
          entry.apicurioActiveVersionIndex = 0;
        }
        if (!entry.data && entry.apicurioVersions[entry.apicurioActiveVersionIndex]) {
          entry.data = entry.apicurioVersions[entry.apicurioActiveVersionIndex].data;
        }
        return entry;
      }
      const initialVersion = {
        version: versionLabel,
        data: entry.data,
        createdOn: createdOn || new Date().toISOString()
      };
      entry.apicurioVersions = [initialVersion];
      entry.apicurioActiveVersionIndex = 0;
      const seriesName = entry.title || getModelTitle(entry);
      ensureSeriesId(entry, { seriesName, fallbackTitle: seriesName });
      entry.isSeries = true;
      return entry;
    }

    function addModelEntry(entry, { versionLabel, createdOn } = {}) {
      if (entry?.isSeries || (entry?.apicurioVersions?.length > 1)) {
        const name = entry.title || getModelTitle(entry);
        ensureSeriesId(entry, { seriesName: name, fallbackTitle: name });
      }
      const modelId = getModelId(entry);
      if (!modelId) {
        ensureVersionContainer(entry, { versionLabel: versionLabel || '1', createdOn });
        models.push(entry);
        return models.length - 1;
      }
      const existingIndex = models.findIndex((m) => getModelId(m) === modelId);
      if (existingIndex === -1) {
        ensureVersionContainer(entry, { versionLabel: versionLabel || '1', createdOn });
        models.push(entry);
        return models.length - 1;
      }
      const target = models[existingIndex];
      if (!Array.isArray(target.apicurioVersions) || !target.apicurioVersions.length) {
        target.apicurioVersions = [{
          version: '1',
          data: target.data,
          createdOn: target.apicurioVersions?.[0]?.createdOn
        }];
        target.apicurioActiveVersionIndex = 0;
        const mergedName = target.title || getModelTitle(target);
        ensureSeriesId(target, { seriesName: mergedName, fallbackTitle: mergedName });
      }
      const label = String(target.apicurioVersions.length + 1);
      target.apicurioVersions.push({
        version: label,
        data: entry.data,
        createdOn: createdOn || new Date().toISOString()
      });
      target.apicurioActiveVersionIndex = target.apicurioVersions.length - 1;
      target.data = entry.data;
      target.title = getModelTitle(entry) || target.title;
      target.isSeries = true;
      const seriesName = target.title || getModelTitle(target);
      ensureSeriesId(target, { seriesName, fallbackTitle: seriesName });
      return existingIndex;
    }

    function createNewVersionFromActive({ versionLabel } = {}) {
      if (activeIndex < 0 || !models[activeIndex]) {
        throw new Error('Load or select a model before creating a version.');
      }
      const target = models[activeIndex];
      ensureVersionContainer(target, { versionLabel: '1' });
      let copy;
      try {
        copy = cloneModelData(target.data);
      } catch (error) {
        console.warn('[Blockscape] failed to clone active model for versioning', error);
        throw new Error('Could not copy the current model.');
      }
      ensureModelMetadata(copy, {
        titleHint: getModelTitle(target),
        idHint: getModelId(target) || getSeriesId(target)
      });
      const label = versionLabel || String((target.apicurioVersions?.length || 0) + 1);
      const newVersion = {
        version: label,
        data: copy,
        createdOn: new Date().toISOString()
      };
      target.apicurioVersions.push(newVersion);
      target.apicurioActiveVersionIndex = target.apicurioVersions.length - 1;
      target.data = copy;
      target.isSeries = true;
      const seriesName = target.title || getModelTitle(target);
      ensureSeriesId(target, { seriesName, fallbackTitle: seriesName });
      return activeIndex;
    }

    function syncDocumentTitle() {
      const activeModel = (activeIndex >= 0 && models[activeIndex]) ? models[activeIndex] : null;
      const modelId = getModelId(activeModel);
      document.title = modelId ? `${modelId}-blockscape` : defaultDocumentTitle;
    }

    function buildSeriesPayload(entry) {
      if (!entry) return null;
      const versions = entry.apicurioVersions;
      if (!Array.isArray(versions) || versions.length <= 1) return null;
      const seriesName = entry.title || entry.apicurioArtifactName || getModelTitle(entry);
      ensureSeriesId(entry, { seriesName, fallbackTitle: seriesName });
      return versions.map((ver) => {
        if (ver && typeof ver === 'object' && 'data' in ver) return ver.data;
        return ver;
      });
    }

    function getActiveSeriesJson() {
      const active = models[activeIndex];
      const payload = buildSeriesPayload(active);
      if (!payload) return null;
      try {
        return JSON.stringify(payload, null, 2);
      } catch (err) {
        console.warn('[Blockscape] failed to stringify series', err);
        return null;
      }
    }

    function downloadCurrentJson(source = 'shortcut', preferSeries = false) {
      const text = jsonBox.value || '';
      if (!text.trim()) {
        console.warn("[Blockscape] download ignored: JSON box is empty.");
        return false;
      }
      const active = models[activeIndex];
      const seriesPayload = preferSeries ? buildSeriesPayload(active) : null;
      const isSeries = Boolean(seriesPayload);

      const payloadText = isSeries
        ? JSON.stringify(seriesPayload, null, 2)
        : text;

      const title = isSeries
        ? (getSeriesId(active) || getModelTitle(active, 'blockscape'))
        : getModelTitle(active, 'blockscape');
      const suffix = isSeries ? '-series' : '';
      const filename = `${makeDownloadName(title)}${suffix}.json`;
      download(filename, payloadText);
      console.log(`[Blockscape] saved JSON (${source}):`, filename);
      return true;
    }

    // --- NEW: letter → color mapping and helpers ---
    // Letter → color mapping (tailwind-ish palette). G => green.
    const LETTER_COLOR_MAP = {
      A: '#0284c7', B: '#3b82f6', C: '#06b6d4', D: '#a855f7',
      E: '#f59e0b', F: '#f97316', G: '#22c55e', H: '#84cc16',
      I: '#10b981', J: '#14b8a6', K: '#0ea5e9', L: '#60a5fa',
      M: '#8b5cf6', N: '#d946ef', O: '#e879f9', P: '#67e8f9',
      Q: '#4ade80', R: '#facc15', S: '#eab308', T: '#a3e635',
      U: '#22d3ee', V: '#38bdf8', W: '#818cf8', X: '#a78bfa',
      Y: '#f472b6', Z: '#fb7185'
    };

    // Prefer explicit item.color (if present), else map by first letter.
    function getBadgeColor(text, explicit) {
      if (explicit && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(explicit)) return explicit;
      const ch = (text || '?').charAt(0).toUpperCase();
      return LETTER_COLOR_MAP[ch] || '#9ca3af'; // fallback gray
    }

    // Compute readable letter color (black/white) against bg
    function idealTextColor(bgHex) {
      const hex = bgHex.replace('#', '');
      const expanded = hex.length === 3 ? hex.split('').map(c=>c+c).join('') : hex;
      const bigint = parseInt(expanded, 16);
      const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
      // luminance (sRGB)
      const L = 0.2126*Math.pow(r/255,2.2) + 0.7152*Math.pow(g/255,2.2) + 0.0722*Math.pow(b/255,2.2);
      return L > 0.35 ? '#111111' : '#ffffff';
    }

    function scrollPageToTop() {
      if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') return;
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        window.scrollTo(0, 0);
      }
    }

    function ensureNoticeElements() {
      if (noticeEl) return;
      noticeEl = document.createElement('div');
      noticeEl.className = 'series-nav-notice';
      const dot = document.createElement('span');
      dot.className = 'series-nav-notice__dot';
      noticeTextEl = document.createElement('span');
      noticeTextEl.className = 'series-nav-notice__text';
      noticeEl.appendChild(dot);
      noticeEl.appendChild(noticeTextEl);
      document.body.appendChild(noticeEl);
    }

    function clearNotice() {
      if (noticeTimer) {
        clearTimeout(noticeTimer);
        noticeTimer = null;
      }
      if (noticeEl) noticeEl.classList.remove('is-visible');
      if (noticeTextEl) noticeTextEl.textContent = '';
    }

    function clearSeriesNavNotice() {
      pendingSeriesNavigation = null;
      clearNotice();
    }

    function describeSeriesVersion(entry, versionIndex) {
      if (!entry?.apicurioVersions?.[versionIndex]) return `version ${versionIndex + 1}`;
      const label = entry.apicurioVersions[versionIndex].version;
      return label ? `version "${label}"` : `version ${versionIndex + 1}`;
    }

    function showSeriesNavNotice(id, targetVersionIndex, entry) {
      ensureNoticeElements();
      pendingSeriesNavigation = { id, targetVersionIndex };
      const label = describeSeriesVersion(entry, targetVersionIndex);
      showNotice(`Click again to open ${label} in this series.`);
    }

    function showNotice(message, timeout = NOTICE_TIMEOUT_MS, linkHref = null) {
      ensureNoticeElements();
      noticeTextEl.textContent = '';
      noticeTextEl.appendChild(document.createTextNode(message));
      if (linkHref) {
        const spacer = document.createTextNode(' ');
        const link = document.createElement('a');
        link.href = linkHref;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = linkHref;
        noticeTextEl.appendChild(spacer);
        noticeTextEl.appendChild(link);
      }
      noticeEl.classList.add('is-visible');
      if (noticeTimer) clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => clearNotice(), timeout);
    }

    function renderShortcutHelpList() {
      if (!shortcutHelpList) return;
      shortcutHelpList.innerHTML = '';
      SHORTCUT_CONFIG.forEach((entry) => {
        const row = document.createElement('div');
        row.className = 'shortcut-help__row';

        const keys = document.createElement('div');
        keys.className = 'shortcut-help__keys';
        entry.keys.forEach((combo, comboIdx) => {
          if (comboIdx > 0) {
            const or = document.createElement('span');
            or.className = 'shortcut-help__or';
            or.textContent = 'or';
            keys.appendChild(or);
          }
          const comboEl = document.createElement('div');
          comboEl.className = 'shortcut-help__combo';
          combo.forEach((part, partIdx) => {
            if (partIdx > 0) {
              const sep = document.createElement('span');
              sep.className = 'shortcut-help__sep';
              sep.textContent = '+';
              comboEl.appendChild(sep);
            }
            const chip = document.createElement('kbd');
            chip.className = 'shortcut-help__key';
            chip.textContent = part;
            comboEl.appendChild(chip);
          });
          keys.appendChild(comboEl);
        });

        const desc = document.createElement('div');
        desc.className = 'shortcut-help__desc';
        desc.textContent = entry.description;

        row.appendChild(keys);
        row.appendChild(desc);
        shortcutHelpList.appendChild(row);
      });
      shortcutHelpListBuilt = true;
    }

    function isShortcutHelpOpen() {
      return !!shortcutHelp && shortcutHelp.hidden === false;
    }

    function openShortcutHelp() {
      if (!shortcutHelp) return;
      if (!shortcutHelpListBuilt) renderShortcutHelpList();
      lastShortcutTrigger = document.activeElement;
      shortcutHelp.hidden = false;
      shortcutHelp.setAttribute('aria-hidden', 'false');
      document.body.classList.add('shortcut-help-open');
      const panel = shortcutHelp.querySelector('.shortcut-help__panel');
      panel?.focus({ preventScroll: true });
    }

    function closeShortcutHelp() {
      if (!shortcutHelp || shortcutHelp.hidden) return;
      shortcutHelp.hidden = true;
      shortcutHelp.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('shortcut-help-open');
      const target = lastShortcutTrigger;
      if (target?.focus) {
        target.focus({ preventScroll: true });
      } else if (helpButton?.focus) {
        helpButton.focus({ preventScroll: true });
      }
    }

    function openNewPanel() {
      if (!newPanel) return;
      newPanel.hidden = false;
      newPanel.setAttribute('aria-hidden', 'false');
      document.body.classList.add('shortcut-help-open');
      const panel = newPanel.querySelector('.shortcut-help__panel');
      panel?.focus({ preventScroll: true });
    }

    function closeNewPanel() {
      if (!newPanel || newPanel.hidden) return;
      newPanel.hidden = true;
      newPanel.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('shortcut-help-open');
      if (newPanelButton?.focus) {
        newPanelButton.focus({ preventScroll: true });
      }
    }

    let overlaySyncPending = false;
    function scheduleOverlaySync() {
      if (overlaySyncPending) return;
      overlaySyncPending = true;
      requestAnimationFrame(() => {
        overlaySyncPending = false;
        reflowRects();
        drawLinks();
      });
    }

    let globalEventsBound = false;

    function getSearchTerms(query) {
      return (query || '')
        .toString()
        .toLowerCase()
        .split(/\s+/)
        .map(t => t.trim())
        .filter(Boolean);
    }

    function applyActiveSearchFilter(query) {
      const terms = getSearchTerms(query);
      if (!terms.length) {
        app.querySelectorAll('.tile').forEach(t => { t.style.opacity = ''; });
        return;
      }
      app.querySelectorAll('.tile').forEach(t => {
        const name = (t.querySelector('.name')?.textContent || '').toLowerCase();
        const id = (t.dataset.id || '').toLowerCase();
        const matches = terms.every(term => name.includes(term) || id.includes(term));
        t.style.opacity = matches ? '1' : '0.2';
      });
    }

    function collectSearchMatches(query) {
      const terms = getSearchTerms(query);
      if (!terms.length) return [];
      const results = [];
      models.forEach((entry, modelIndex) => {
        const modelTitle = getModelDisplayTitle(entry);
        const modelId = getModelId(entry) || '';
        const modelHaystack = `${modelTitle} ${modelId}`.toLowerCase();
        if (terms.every(t => modelHaystack.includes(t))) {
          results.push({
            type: 'model',
            modelIndex,
            modelTitle,
            modelId
          });
        }
        const categories = Array.isArray(entry.data?.categories) ? entry.data.categories : [];
        categories.forEach((cat) => {
          const catTitle = (cat.title || cat.id || '').toString();
          (cat.items || []).forEach((it) => {
            const name = (it.name || it.id || '').toString();
            const haystack = `${name} ${it.id || ''} ${catTitle}`.toLowerCase();
            if (terms.every(t => haystack.includes(t))) {
              results.push({
                type: 'item',
                modelIndex,
                modelTitle,
                modelId,
                itemId: it.id,
                itemName: name,
                categoryTitle: catTitle
              });
            }
          });
        });
      });
      return results.slice(0, MAX_SEARCH_RESULTS);
    }

    function renderSearchResults(query) {
      if (!searchResults) return;
      searchResults.innerHTML = '';
      const trimmed = (query || '').toString();
      if (!trimmed.trim()) {
        searchResults.hidden = true;
        return;
      }
      if (!models.length) {
        const empty = document.createElement('div');
        empty.className = 'search-results__empty';
        empty.textContent = 'Load models to search';
        searchResults.appendChild(empty);
        searchResults.hidden = false;
        return;
      }
      const matches = collectSearchMatches(trimmed);
      if (!matches.length) {
        const empty = document.createElement('div');
        empty.className = 'search-results__empty';
        empty.textContent = 'No matches yet';
        searchResults.appendChild(empty);
        searchResults.hidden = false;
        return;
      }
      matches.forEach((match) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'search-result';
        btn.dataset.modelIndex = String(match.modelIndex);
        if (match.itemId) btn.dataset.itemId = match.itemId;
        if (match.type) btn.dataset.type = match.type;
        if (match.modelIndex === activeIndex && (!match.itemId || selection === match.itemId)) {
          btn.classList.add('is-active');
        }

        const primary = document.createElement('div');
        primary.className = 'search-result__primary';
        const title = document.createElement('span');
        title.textContent = match.type === 'model' ? match.modelTitle : (match.itemName || match.itemId || 'Item');
        primary.appendChild(title);
        const badge = document.createElement('span');
        badge.className = 'search-result__badge';
        badge.textContent = match.type === 'item' ? (match.categoryTitle || 'Item') : 'Model';
        primary.appendChild(badge);

        const meta = document.createElement('div');
        meta.className = 'search-result__meta';
        const modelMeta = document.createElement('span');
        modelMeta.textContent = match.modelId
          ? `${match.modelTitle} · ${match.modelId}`
          : match.modelTitle;
        meta.appendChild(modelMeta);
        if (match.type === 'item' && match.itemId) {
          const itemMeta = document.createElement('span');
          itemMeta.textContent = `Item ID: ${match.itemId}`;
          meta.appendChild(itemMeta);
        } else if (match.type === 'model') {
          const scopeMeta = document.createElement('span');
          scopeMeta.textContent = 'Matches model title';
          meta.appendChild(scopeMeta);
        }

        btn.appendChild(primary);
        btn.appendChild(meta);
        searchResults.appendChild(btn);
      });
      searchResults.hidden = false;
    }

    function handleSearchInput(value) {
      applyActiveSearchFilter(value || '');
      renderSearchResults(value || '');
    }

    function activateSearchResult(match) {
      if (!match || !Number.isInteger(match.modelIndex)) return;
      setActive(match.modelIndex);
      if (!match.itemId) return;
      requestAnimationFrame(() => {
        if (activeIndex !== match.modelIndex) return;
        const tile = index.get(match.itemId)?.el;
        if (!tile) return;
        select(match.itemId);
        tile.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        tile.focus({ preventScroll: true });
      });
    }

    function setActive(i) {
      hidePreview();
      clearSeriesNavNotice();
      lastDeletedItem = null;
      if (i < 0 || i >= models.length) {
        console.warn("[Blockscape] setActive called with out-of-range index:", i);
        return;
      }
      pendingInfoPreview = true;
      activeIndex = i;
      console.log("[Blockscape] active model:", getModelTitle(models[i]), "(index", i + " )");
      syncDocumentTitle();
      renderModelList();
      loadActiveIntoEditor();
      rebuildFromActive();
      if (searchInput) {
        handleSearchInput(searchInput.value || '');
      }
      apicurio.updateAvailability();
    }

    function renderModelList() {
      modelList.innerHTML = "";
      if (!models.length) {
        const empty = document.createElement('li');
        empty.className = 'model-nav-empty';
        empty.textContent = 'No models loaded yet.';
        modelList.appendChild(empty);
        return;
      }

      models.forEach((m, i) => {
        const li = document.createElement('li');
        li.className = 'model-nav-item';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'model-nav-button' + (i === activeIndex ? ' is-active' : '');
        btn.dataset.index = String(i);
        btn.setAttribute('aria-current', i === activeIndex ? 'true' : 'false');

        const label = document.createElement('span');
        label.className = 'model-nav-label';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'model-nav-title';
        titleSpan.textContent = getModelDisplayTitle(m);
        label.appendChild(titleSpan);

        const dataId = getModelId(m);
        if (dataId) {
          const idBadge = document.createElement('span');
          idBadge.className = 'model-nav-id';
          idBadge.textContent = dataId;
          label.appendChild(idBadge);
        }

        const categories = Array.isArray(m.data?.categories) ? m.data.categories : [];
        const itemsCount = categories.reduce((sum, cat) => sum + ((cat.items || []).length), 0);

        const meta = document.createElement('span');
        meta.className = 'model-nav-meta';
        const versionsInfo = (m.apicurioVersions && m.apicurioVersions.length > 1)
          ? ` · ${m.apicurioVersions.length} versions`
          : '';
        meta.textContent = `${categories.length} cat · ${itemsCount} items${versionsInfo}`;

        btn.appendChild(label);
        btn.appendChild(meta);
        li.appendChild(btn);
        modelList.appendChild(li);
      });

      apicurio.updateAvailability();
    }

    function loadActiveIntoEditor() {
      if (activeIndex < 0) {
        jsonBox.value = "";
        if (copySeriesButton) copySeriesButton.disabled = true;
        return;
      }
      const active = models[activeIndex];
      jsonBox.value = JSON.stringify(active.data, null, 2);
      if (copySeriesButton) {
        copySeriesButton.disabled = !buildSeriesPayload(active);
      }
    }

    function tryParseJson(txt) { try { return JSON.parse(txt); } catch { return null; } }

    function buildSeriesEntry(list, titleBase = "Pasted", options = {}) {
      const array = Array.isArray(list) ? list : [];
      if (!array.length) return [];

      const normalized = array
        .map((obj, idx) => {
          if (!obj || typeof obj !== 'object') return null;
          ensureModelMetadata(obj, { titleHint: `${titleBase} #${idx + 1}` });
          return { obj, idx };
        })
        .filter(Boolean);

      if (!normalized.length) return [];

      const first = normalized[0].obj;
      const { seriesTitleOverride } = options;
      let seriesTitle = seriesTitleOverride || first.title || `${titleBase} series`;
      if (seriesTitleOverride && !first.title) {
        first.title = seriesTitleOverride;
      }
      const entry = {
        id: uid(),
        title: seriesTitle,
        data: first,
        apicurioVersions: normalized.map(({ obj, idx }) => ({
          version: String(idx + 1),
          data: obj
        })),
        apicurioActiveVersionIndex: 0,
        isSeries: true
      };
      const seriesId = ensureSeriesId(entry, { seriesName: seriesTitle, fallbackTitle: seriesTitle });
      if (seriesId) entry.id = seriesId;
      return [entry];
    }

    function normalizeToModelsFromValue(value, titleBase = "Pasted", options = {}) {
      if (Array.isArray(value)) {
        return buildSeriesEntry(value, titleBase, options);
      }
      if (!value || typeof value !== 'object') return [];
      ensureModelMetadata(value, { titleHint: `${titleBase} #1` });
      return [{
        id: uid(),
        title: value.title || `${titleBase} #1`,
        data: value
      }];
    }

    // Accept 1) object, 2) array-of-objects, 3) '---' or '%%%' separated objects
    function normalizeToModelsFromText(txt, titleBase = "Pasted", options = {}) {
      const trimmed = (txt || "").trim();
      if (!trimmed) return [];
      const parsed = tryParseJson(trimmed);
      if (parsed) {
        let normalizeOptions = options;
        if (Array.isArray(parsed) && options.promptForSeriesName) {
          const defaultTitle = deriveSeriesTitleFromArray(parsed, titleBase);
          const userTitle = promptForSeriesTitle(defaultTitle);
          normalizeOptions = {
            ...options,
            promptForSeriesName: false,
            seriesTitleOverride: userTitle || defaultTitle
          };
        }
        const normalized = normalizeToModelsFromValue(parsed, titleBase, normalizeOptions);
        if (normalized.length) return normalized;
      }
      const parts = trimmed.split(/^\s*(?:---|%%%)\s*$/m).map(s => s.trim()).filter(Boolean);
      return parts.map((p, i) => {
        const obj = JSON.parse(p);
        ensureModelMetadata(obj, { titleHint: `${titleBase} #${i + 1}` });
        return {
          id: uid(),
          title: obj.title || `${titleBase} #${i + 1}`,
          data: obj
        };
      });
    }

    function isEditableElement(el) {
      if (!el) return false;
      if (el.isContentEditable) return true;
      const tag = (el.tagName || '').toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select';
    }

    function shouldHandleGlobalPaste() {
      const active = document.activeElement;
      if (!active || active === document.body || active === document.documentElement) return true;
      return !isEditableElement(active);
    }

    function looksLikeModelJson(text) {
      if (!text) return false;
      const start = text.trimStart();
      return /^\s*(\{|\[|---|%%%)/.test(start);
    }

    function consumeEditorPayload() {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      let raw;
      try {
        raw = localStorage.getItem(EDITOR_TRANSFER_KEY);
      } catch (err) {
        console.warn('[Blockscape] failed to access editor payload', err);
        return null;
      }
      if (!raw) return null;
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch (err) {
        console.warn('[Blockscape] invalid payload JSON', err);
        try { localStorage.removeItem(EDITOR_TRANSFER_KEY); } catch (_) {}
        return null;
      }
      if (payload?.source !== 'editor') return null;
      try {
        localStorage.removeItem(EDITOR_TRANSFER_KEY);
      } catch (err) {
        console.warn('[Blockscape] failed to clear editor payload', err);
      }
      if (!payload.text || typeof payload.text !== 'string') {
        console.warn('[Blockscape] payload missing text');
        return null;
      }
      let entries = [];
      try {
        entries = normalizeToModelsFromText(payload.text, payload.title || 'Editor Export');
      } catch (err) {
        console.warn('[Blockscape] could not parse payload text', err);
        return null;
      }
      if (!entries.length) return null;
      let firstIndex = null;
      entries.forEach(entry => {
        const idx = addModelEntry(entry, { versionLabel: 'editor' });
        if (firstIndex == null) firstIndex = idx;
      });
      console.log(`[Blockscape] imported ${entries.length} model(s) from editor`);
      return { index: firstIndex, count: entries.length };
    }

    function importEditorPayload(trigger = 'storage') {
      const result = consumeEditorPayload();
      if (!result || typeof result.index !== 'number') return false;
      setActive(result.index);
      console.log(`[Blockscape] imported ${result.count} model(s) from editor via ${trigger}.`);
      return true;
    }

    function updateShareHashForModel(model, fallbackTitle = 'Shared Model') {
      if (!model || !model.data) {
        throw new Error('Select or load a model before sharing.');
      }
      let encoded;
      const payload = {
        title: getModelTitle(model, fallbackTitle),
        data: model.data
      };
      try {
        encoded = base64UrlEncode(JSON.stringify(payload));
      } catch (err) {
        console.error('[Blockscape] share encode failed', err);
        throw new Error('Unable to encode this model for sharing.');
      }

      const shareUrl = new URL(window.location.href);
      shareUrl.searchParams.delete('share');
      shareUrl.hash = `share=${encoded}`;

      try {
        window.history.replaceState({}, document.title, shareUrl.toString());
      } catch (err) {
        console.warn('[Blockscape] failed to update URL for share', err);
        window.location.hash = shareUrl.hash;
      }
      return shareUrl;
    }

    function consumeShareLink() {
      const hash = window.location.hash || '';
      let token = null;
      let source = null;

      const hashMatch = hash.match(/share=([^&]+)/);
      if (hashMatch) {
        token = hashMatch[1];
        source = 'hash';
      }

      if (!token) {
        const params = new URLSearchParams(window.location.search);
        if (params.has('share')) {
          token = params.get('share');
          source = 'search';
        }
      }

      if (!token) return null;

      let payload;
      try {
        const text = base64UrlDecode(token);
        payload = JSON.parse(text);
      } catch (err) {
        console.warn('[Blockscape] failed to decode share token', err);
        return null;
      }

      if (!payload || typeof payload !== 'object' || payload.data == null) {
        console.warn('[Blockscape] share payload missing data');
        return null;
      }

      const entries = normalizeToModelsFromValue(payload.data, payload.title || 'Shared Model');
      if (!entries.length) {
        console.warn('[Blockscape] share payload did not contain usable models');
        return null;
      }

      let firstIndex = null;
      entries.forEach((entry) => {
        const seriesName = entry.isSeries ? (payload.title || entry.title) : null;
        const idx = addModelEntry({
          ...entry,
          apicurioArtifactName: seriesName || entry.apicurioArtifactName
        }, { versionLabel: 'shared' });
        if (firstIndex == null) firstIndex = idx;
      });

      return firstIndex;
    }

    async function consumeLoadParam() {
      const hash = window.location.hash || '';
      let target = null;

      const hashMatch = hash.match(/load=([^&]+)/);
      if (hashMatch) {
        try {
          target = decodeURIComponent(hashMatch[1]);
        } catch {
          target = hashMatch[1];
        }
      }

      if (!target) {
        const params = new URLSearchParams(window.location.search);
        if (params.has('load')) {
          target = params.get('load');
        }
      }

      if (!target) return null;

      try {
        const idx = await loadFromUrl(target);
        return typeof idx === 'number' ? idx : null;
      } catch (err) {
        console.warn('[Blockscape] load param failed', err);
        return null;
      }
    }

    function parse(mObj) {
      console.log("[Blockscape] parsing model; categories=", (mObj?.categories || []).length);
      const fwd = new Map();
      const rev = new Map();
      const seen = new Set();

      (mObj.categories || []).forEach(c => (c.items || []).forEach(it => {
        seen.add(it.id);
        const deps = new Set(it.deps || []);
        (mObj.links || []).forEach(l => { if (l.from === it.id) deps.add(l.to); });
        fwd.set(it.id, deps);
        deps.forEach(d => {
          if (!rev.has(d)) rev.set(d, new Set());
          rev.get(d).add(it.id);
        });
      }));

      const reusedLocal = new Set();
      rev.forEach((dependents, node) => { if ((dependents?.size || 0) >= 2) reusedLocal.add(node); });
      return { m: mObj, fwd, rev, reusedLocal, seen };
    }

    // --- MODIFIED: color-aware letter image ---
    function generateLetterImage(text, explicitColor) {
      console.log("[Blockscape] generateLetterImage for:", text);
      const canvas = document.createElement('canvas');
      const size = 44;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');

      const letter = (text || '?').charAt(0).toUpperCase();
      const bg = getBadgeColor(text, explicitColor);
      const fg = idealTextColor(bg);

      // Circle
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(size/2, size/2, size/2 - 2, 0, 2*Math.PI);
      ctx.fill();

      // Subtle ring
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Letter
      ctx.fillStyle = fg;
      ctx.font = `bold ${size * 0.5}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(letter, size/2, size/2);

      return canvas.toDataURL('image/png');
    }

    function getActiveApicurioVersionIndex(entry) {
      if (!entry?.apicurioVersions?.length) return -1;
      const idx = Number.isInteger(entry.apicurioActiveVersionIndex) ? entry.apicurioActiveVersionIndex : 0;
      return Math.min(Math.max(idx, 0), entry.apicurioVersions.length - 1);
    }

    function getActiveApicurioVersionLabel(entry) {
      const idx = getActiveApicurioVersionIndex(entry);
      if (idx === -1) return null;
      const versionEntry = entry.apicurioVersions[idx];
      return versionEntry?.version ?? null;
    }

    function buildModelIdToVersionIndex(entry) {
      const map = new Map();
      (entry?.apicurioVersions || []).forEach((ver, idx) => {
        const id = (ver?.data?.id ?? '').toString().trim();
        if (id) map.set(id, idx);
        const seriesId = (ver?.data?.seriesId ?? '').toString().trim();
        if (seriesId && !map.has(seriesId)) map.set(seriesId, idx);
      });
      return map;
    }

    const thumbnailCache = new WeakMap();
    function getSeriesThumbnail(entry, versionIdx) {
      if (!entry?.apicurioVersions?.[versionIdx]) return null;
      const version = entry.apicurioVersions[versionIdx];
      const payload = version.data;
      const fp = computeJsonFingerprint(payload);
      const cached = thumbnailCache.get(version);
      if (cached && cached.fingerprint === fp) return cached.dataUrl;

      const width = 160;
      const height = 90;
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#e5e7eb';
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

      const cats = Array.isArray(payload?.categories) ? payload.categories : [];
      const catCount = Math.max(cats.length, 1);
      const colWidth = width / catCount;
      const topPad = 8;
      const bottomPad = 8;
      const dotRadius = 4;

      cats.forEach((cat, cIdx) => {
        const xCenter = cIdx * colWidth + colWidth / 2;
        const items = Array.isArray(cat.items) ? cat.items : [];
        const itemCount = Math.max(items.length, 1);
        items.forEach((it, iIdx) => {
          const y = topPad + (iIdx + 0.5) * ((height - topPad - bottomPad) / itemCount);
          ctx.beginPath();
          ctx.arc(xCenter, y, dotRadius, 0, Math.PI * 2);
          const fill = getBadgeColor(it.name || it.id || '', it.color);
          ctx.fillStyle = fill;
          ctx.strokeStyle = 'rgba(15,23,42,0.25)';
          ctx.fill();
          ctx.stroke();
        });
      });

      const dataUrl = canvas.toDataURL('image/png');
      thumbnailCache.set(version, { fingerprint: fp, dataUrl });
      return dataUrl;
    }

    function setActiveApicurioVersion(entryIndex, versionIndex) {
      clearSeriesNavNotice();
      if (entryIndex < 0 || entryIndex >= models.length) return false;
      const entry = models[entryIndex];
      if (!entry?.apicurioVersions?.length) return false;
      const persisted = persistActiveEdits(entryIndex);
      if (!persisted) return false;
      const count = entry.apicurioVersions.length;
      const normalized = ((versionIndex % count) + count) % count;
      const target = entry.apicurioVersions[normalized];
      if (!target?.data) return false;
      entry.apicurioActiveVersionIndex = normalized;
      entry.data = target.data;
      pendingInfoPreview = true;
      selection = null;
      selectionRelations = null;
      loadActiveIntoEditor();
      rebuildFromActive();
      return true;
    }

    function stepApicurioVersion(step) {
      if (!step || activeIndex < 0) return;
      const entry = models[activeIndex];
      if (!entry?.apicurioVersions?.length) return;
      const current = getActiveApicurioVersionIndex(entry);
      if (current === -1) return;
      setActiveApicurioVersion(activeIndex, current + step);
    }

    function renderVersionNavigator(entry) {
      if (!entry?.apicurioVersions || !entry.apicurioVersions.length) return null;
      const nav = document.createElement('div');
      nav.className = 'version-nav';

      const title = document.createElement('div');
      title.className = 'version-nav__title';
      title.textContent = entry.apicurioArtifactName || entry.apicurioArtifactId || getModelId(entry) || 'Artifact';
      nav.appendChild(title);

      const status = document.createElement('div');
      status.className = 'version-nav__status';
      const activeIdx = getActiveApicurioVersionIndex(entry);
      const activeVersionLabel = getActiveApicurioVersionLabel(entry) || 'latest';
      status.textContent = `No. in series ${activeVersionLabel} (${activeIdx + 1} of ${entry.apicurioVersions.length})`;
      nav.appendChild(status);

      const controls = document.createElement('div');
      controls.className = 'version-nav__controls';
      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'version-nav__button';
      prevBtn.textContent = 'Previous';
      prevBtn.addEventListener('click', () => stepApicurioVersion(-1));

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'version-nav__button';
      nextBtn.textContent = 'Next';
      nextBtn.addEventListener('click', () => stepApicurioVersion(1));

      controls.appendChild(prevBtn);
      controls.appendChild(nextBtn);
      nav.appendChild(controls);

      const thumbs = document.createElement('div');
      thumbs.className = 'version-nav__thumbs';
      entry.apicurioVersions.forEach((ver, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'version-nav__thumb';
        if (idx === activeIdx) btn.classList.add('is-active');
        const thumbUrl = getSeriesThumbnail(entry, idx);
        if (thumbUrl) {
          const img = document.createElement('img');
          img.src = thumbUrl;
          img.alt = `Version ${idx + 1}`;
          btn.appendChild(img);
        }
        const lbl = document.createElement('div');
        lbl.className = 'version-nav__thumb-label';
        const lblText = document.createElement('span');
        lblText.className = 'version-nav__thumb-label-text';
        const fullId = (ver?.data?.id ?? ver?.id ?? '').toString().trim();
        const labelValue = fullId || (ver?.version ? `v${ver.version}` : `${idx + 1}`);
        lblText.textContent = labelValue;
        lbl.title = fullId || labelValue;
        lbl.appendChild(lblText);
        btn.appendChild(lbl);
        registerThumbLabel(lbl, lblText);
        btn.addEventListener('click', () => setActiveApicurioVersion(activeIndex, idx));
        attachSeriesPreviewHover(btn, ver);
        thumbs.appendChild(btn);
      });

      const addThumb = document.createElement('button');
      addThumb.type = 'button';
      addThumb.className = 'version-nav__thumb version-nav__thumb--add';
      addThumb.title = 'Create a new version from this map';
      addThumb.addEventListener('click', () => {
        try {
          const idx = createNewVersionFromActive({ versionLabel: 'manual' });
          setActive(idx);
        } catch (err) {
          alert(err?.message || 'Unable to create a new version right now.');
        }
      });
      const addIcon = document.createElement('span');
      addIcon.className = 'version-nav__thumb-add-icon';
      addIcon.textContent = '+';
      addThumb.appendChild(addIcon);
      thumbs.appendChild(addThumb);

      nav.appendChild(thumbs);

      return nav;
    }

    // ===== Render =====
    function render() {
      if (!model) return;
      hideTabTooltip();
      if (!Array.isArray(model.m.categories)) {
        model.m.categories = [];
      }
      console.log("[Blockscape] rendering categories=", model.m.categories.length);
      console.log("[Blockscape] model.m has abstract?", !!model.m.abstract, "- value:", model.m.abstract ? model.m.abstract.substring(0, 50) + "..." : "none");
      app.innerHTML = "";
      index.clear();
      versionThumbLabels = [];

      ensureVersionContainer(models[activeIndex], { versionLabel: '1' });
      const versionNav = renderVersionNavigator(models[activeIndex]);
      if (versionNav) {
        app.appendChild(versionNav);
      }

      overlay.setAttribute("width", window.innerWidth);
      overlay.setAttribute("height", window.innerHeight);

      const meta = document.createElement('div');
      meta.className = 'blockscape-model-meta';

      const titleEl = document.createElement('div');
      titleEl.className = 'blockscape-model-title';
      titleEl.textContent = (model.m.title && model.m.title.trim()) || getModelTitle(models[activeIndex]);
      meta.appendChild(titleEl);

      // Ensure series ID is present for display if this entry is a series.
      if (models[activeIndex]?.isSeries || (models[activeIndex]?.apicurioVersions?.length)) {
        ensureSeriesId(models[activeIndex], { seriesName: models[activeIndex].title || model.m.title || getModelTitle(models[activeIndex]) });
      }

      const activeVersionLabel = getActiveApicurioVersionLabel(models[activeIndex]);
      const seriesId = getSeriesId(models[activeIndex]);
      const modelId = (model.m.id ?? '').toString().trim();

      const detailsRow = document.createElement('div');
      detailsRow.className = 'blockscape-model-meta__details';

      const addMetaDetail = (label, value) => {
        if (!value) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'blockscape-model-id';
        const labelSpan = document.createElement('span');
        labelSpan.className = 'blockscape-model-id__label';
        labelSpan.textContent = label;
        const valueSpan = document.createElement('span');
        valueSpan.className = 'blockscape-model-id__value';
        valueSpan.textContent = value;
        wrapper.append(labelSpan, valueSpan);
        detailsRow.appendChild(wrapper);
      };

      addMetaDetail('Series ID', seriesId);
      addMetaDetail('Model ID', modelId);
      addMetaDetail('No. in series', activeVersionLabel);

      if (detailsRow.childElementCount) {
        meta.appendChild(detailsRow);
      }

      app.appendChild(meta);
      const tabsWrapper = document.createElement('div');
      tabsWrapper.className = 'blockscape-tabs';

      const tabList = document.createElement('div');
      tabList.className = 'blockscape-tablist';
      tabList.setAttribute('role', 'tablist');
      tabsWrapper.appendChild(tabList);

      const panelsWrapper = document.createElement('div');
      panelsWrapper.className = 'blockscape-tabpanels';
      tabsWrapper.appendChild(panelsWrapper);

      const mapPanel = document.createElement('div');
      const abstractPanel = document.createElement('div');
      const sourcePanel = document.createElement('div');
      const apicurioPanel = document.createElement('div');
      let infoTooltipHtml = '';
      const seriesIdLookup = buildModelIdToVersionIndex(models[activeIndex]);
      const activeSeriesIndex = getActiveApicurioVersionIndex(models[activeIndex]);
      infoTabButton = null;
      activeInfoTooltipHtml = '';

      const tabDefs = [
        { id: 'map', label: 'Map', panel: mapPanel },
        { id: 'abstract', label: 'Info', panel: abstractPanel },
        { id: 'source', label: 'Settings', panel: sourcePanel },
        { id: 'apicurio', label: 'Apicurio', panel: apicurioPanel }
      ];
      const apicurioInitiallyEnabled = typeof apicurio.isEnabled === 'function' ? apicurio.isEnabled() : false;

      const handleTabVisibility = (tabId) => {
        if (!overlay) return;
        const showOverlay = tabId === 'map';
        overlay.hidden = !showOverlay;
        if (showOverlay) {
          reflowRects();
          drawLinks();
        } else {
          overlay.innerHTML = '';
        }
      };

      tabDefs.forEach((tab, idx) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.id = `tab-${tab.id}`;
        button.className = 'blockscape-tab' + (idx === 0 ? ' is-active' : '');
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', `panel-${tab.id}`);
        button.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
        button.textContent = tab.label;
        if (tab.id === 'apicurio' && !apicurioInitiallyEnabled) {
          button.hidden = true;
          button.tabIndex = -1;
          button.setAttribute('aria-hidden', 'true');
          button.style.display = 'none';
        }
        tab.button = button;
        tabList.appendChild(button);

        tab.panel.id = `panel-${tab.id}`;
        tab.panel.classList.add('blockscape-tabpanel');
        tab.panel.setAttribute('role', 'tabpanel');
        tab.panel.setAttribute('aria-labelledby', button.id);
        tab.panel.hidden = idx === 0 ? false : true;
        if (idx === 0) tab.panel.classList.add('is-active');
        panelsWrapper.appendChild(tab.panel);
      });

      const activateTab = (targetId) => {
        lastActiveTabId = targetId;
        tabDefs.forEach(t => {
          const isActive = t.id === targetId;
          t.button.classList.toggle('is-active', isActive);
          t.button.setAttribute('aria-selected', isActive ? 'true' : 'false');
          t.panel.classList.toggle('is-active', isActive);
          t.panel.hidden = !isActive;
        });
        handleTabVisibility(targetId);
      };

      const apicurioTab = tabDefs.find(t => t.id === 'apicurio');
      const syncApicurioTabVisibility = (enabled) => {
        if (!apicurioTab || !apicurioTab.button || !apicurioTab.panel) return;
        const show = !!enabled;
        apicurioTab.button.hidden = !show;
        apicurioTab.button.tabIndex = show ? 0 : -1;
        apicurioTab.button.setAttribute('aria-hidden', show ? 'false' : 'true');
        apicurioTab.button.style.display = show ? '' : 'none';
        if (!show) {
          const wasActive = apicurioTab.panel.classList.contains('is-active');
          apicurioTab.button.classList.remove('is-active');
          apicurioTab.button.setAttribute('aria-selected', 'false');
          apicurioTab.panel.classList.remove('is-active');
          apicurioTab.panel.hidden = true;
          if (wasActive) {
            const fallback = tabDefs.find(t => t.id !== 'apicurio');
            if (fallback) activateTab(fallback.id);
          }
        } else {
          const isActive = lastActiveTabId === 'apicurio';
          apicurioTab.button.classList.toggle('is-active', isActive);
          apicurioTab.button.setAttribute('aria-selected', isActive ? 'true' : 'false');
          apicurioTab.panel.classList.toggle('is-active', isActive);
          apicurioTab.panel.hidden = !isActive;
        }
        if (apicurioSettingsToggle) {
          apicurioSettingsToggle.checked = show;
        }
      };

      tabDefs.forEach(t => {
        t.button.addEventListener('click', () => {
          hideTabTooltip();
          activateTab(t.id);
        });
        if (t.id === 'abstract') {
          infoTabButton = t.button;
          t.button.addEventListener('mouseenter', () => showTabTooltip(t.button, infoTooltipHtml, { offset: 12 }));
          t.button.addEventListener('mouseleave', hideTabTooltip);
          t.button.addEventListener('focus', () => showTabTooltip(t.button, infoTooltipHtml, { offset: 12 }));
          t.button.addEventListener('blur', hideTabTooltip);
        }
      });

      const resolveInitialTabId = (apicurioEnabled) => {
        const preferred = tabDefs.find(t => t.id === lastActiveTabId);
        if (preferred && (preferred.id !== 'apicurio' || apicurioEnabled)) return preferred.id;
        const firstVisible = tabDefs.find(t => t.id !== 'apicurio' || apicurioEnabled);
        return firstVisible?.id || tabDefs[0].id;
      };

      const initialTabId = resolveInitialTabId(apicurioInitiallyEnabled);
      activateTab(initialTabId);
      syncApicurioTabVisibility(apicurioInitiallyEnabled);
      if (typeof apicurio.onEnabledChange === 'function') {
        apicurio.onEnabledChange(syncApicurioTabVisibility);
      }

      app.appendChild(tabsWrapper);

      const renderHost = document.createElement('div');
      renderHost.className = 'blockscape-render';
      mapPanel.appendChild(renderHost);

      const abstractWrapper = document.createElement('div');
      abstractWrapper.className = 'blockscape-abstract-panel';
      if (model.m.abstract) {
        console.log("[Blockscape] Rendering abstract content");
        const abstractDiv = document.createElement('div');
        abstractDiv.className = 'blockscape-abstract';
        abstractDiv.innerHTML = model.m.abstract;
        enhanceAbstractWithGistLinks(abstractDiv);
        abstractWrapper.appendChild(abstractDiv);
        infoTooltipHtml = abstractDiv.outerHTML;
      } else {
        console.log("[Blockscape] No abstract found in model.m");
        const placeholder = document.createElement('div');
        placeholder.className = 'blockscape-abstract-placeholder';
        placeholder.textContent = 'No abstract has been provided for this model.';
        abstractWrapper.appendChild(placeholder);
        infoTooltipHtml = placeholder.outerHTML;
      }
      activeInfoTooltipHtml = infoTooltipHtml;
      abstractPanel.appendChild(abstractWrapper);

      const sourceWrapper = document.createElement('div');
      sourceWrapper.className = 'blockscape-source-panel';
      const settingsPanel = document.createElement('div');
      settingsPanel.className = 'blockscape-settings-panel';
      const settingsHeading = document.createElement('p');
      settingsHeading.className = 'blockscape-settings-panel__title';
      settingsHeading.textContent = 'Feature toggles';
      settingsPanel.appendChild(settingsHeading);
      const createSettingsToggle = ({ id, label, hint, checked, className = '', onChange }) => {
        const row = document.createElement('label');
        row.className = ['settings-toggle', className].filter(Boolean).join(' ');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = id;
        input.checked = checked;
        const text = document.createElement('span');
        text.className = 'settings-toggle__text';
        const labelSpan = document.createElement('span');
        labelSpan.className = 'settings-toggle__label';
        labelSpan.textContent = label;
        text.appendChild(labelSpan);
        if (hint) {
          const hintSpan = document.createElement('span');
          hintSpan.className = 'settings-toggle__hint';
          hintSpan.textContent = hint;
          text.appendChild(hintSpan);
        }
        row.appendChild(input);
        row.appendChild(text);
        if (typeof onChange === 'function') {
          input.addEventListener('change', () => onChange(input.checked));
        }
        return { row, input };
      };

      const { row: secondaryToggleRow, input: secondaryToggleInput } = createSettingsToggle({
        id: 'toggleSecondaryLinks',
        label: 'Show indirect links',
        checked: showSecondaryLinks,
        className: 'map-controls__toggle',
        onChange: (checked) => {
          showSecondaryLinks = checked;
          if (selection) {
            select(selection);
          } else {
            clearStyles();
            drawLinks();
          }
        }
      });
      settingsPanel.appendChild(secondaryToggleRow);

      const { row: reusedToggleRow } = createSettingsToggle({
        id: 'toggleReusedInMap',
        label: 'Display reused in map view',
        hint: 'Show markers for nodes used multiple times.',
        checked: showReusedInMap,
        className: 'map-controls__toggle',
        onChange: (checked) => {
          showReusedInMap = checked;
          applyReusedHighlights();
        }
      });
      settingsPanel.appendChild(reusedToggleRow);

      const apicurioEnabled = typeof apicurio.isEnabled === 'function' ? apicurio.isEnabled() : false;
      const { row: apicurioToggleRow, input: apicurioToggleInput } = createSettingsToggle({
        id: 'apicurioFeatureToggle',
        label: 'Apicurio',
        hint: 'Show the Apicurio registry tab when enabled.',
        checked: apicurioEnabled,
        className: 'apicurio-toggle',
        onChange: (checked) => {
          if (typeof apicurio.setEnabled === 'function') {
            apicurio.setEnabled(checked);
          }
        }
      });
      apicurioSettingsToggle = apicurioToggleInput;
      settingsPanel.appendChild(apicurioToggleRow);
      sourceWrapper.appendChild(settingsPanel);
      if (jsonPanel) {
        jsonPanel.hidden = false;
        jsonPanel.classList.remove('pf-v5-c-page__main-section');
        sourceWrapper.appendChild(jsonPanel);
      } else {
        const missing = document.createElement('p');
        missing.className = 'muted';
        missing.textContent = 'Source editor unavailable.';
        sourceWrapper.appendChild(missing);
      }
      sourcePanel.appendChild(sourceWrapper);
      apicurio.mount(apicurioPanel);

      let tileCounter = 0;
      model.m.categories.forEach(cat => {
        const section = document.createElement('section');
        section.className = 'category';
        section.dataset.cat = cat.id;

        const head = document.createElement('div');
        head.className = 'cat-head';
        head.innerHTML = `<div class="cat-title">${escapeHtml(cat.title || cat.id)}</div>
                          <div class="muted cat-count">${(cat.items || []).length} items</div>`;
        section.appendChild(head);

        const grid = document.createElement('div');
        grid.className = 'grid';
        section.appendChild(grid);

        (cat.items || []).forEach(it => {
          tileCounter += 1;
          const externalMeta = resolveExternalMeta(it.external);
          const tile = document.createElement('div');
          tile.className = externalMeta.isExternal ? 'tile external' : 'tile';
          tile.tabIndex = 0;
          tile.dataset.id = it.id;
          tile.dataset.globalIndex = String(tileCounter);
          if (externalMeta.url) { tile.dataset.externalUrl = externalMeta.url; }
          if (seriesIdLookup.has(it.id)) {
            const targetIdx = seriesIdLookup.get(it.id);
            tile.dataset.seriesVersionIndex = String(targetIdx);
            tile.classList.add('tile--series-link');
            const label = targetIdx === activeSeriesIndex
              ? 'Current map in this series'
              : `Open version ${targetIdx + 1} in this series`;
            tile.title = label;
          }

          const img = document.createElement('img');
          img.className = 'logo';
          if (it.logo) {
            img.src = it.logo; img.alt = it.name || it.id;
          } else {
            img.alt = "";
            img.style.opacity = 1; // colored letter icon is the intended visual
            img.src = generateLetterImage(it.name || it.id, it.color); // supports optional per-item color
          }

          const nm = document.createElement('div');
          nm.className = 'name';
          nm.textContent = it.name || it.id;

          const badge = document.createElement('div');
          badge.className = 'badge';
          badge.textContent = 'reused';

          if (externalMeta.url) {
            tile.appendChild(createExternalLinkButton(externalMeta.url));
          }
          tile.appendChild(img);
          tile.appendChild(nm);
          tile.appendChild(badge);
          grid.appendChild(tile);

          index.set(it.id, { el: tile, catId: cat.id, rect: null });
        });

        renderHost.appendChild(section);

        const addTile = document.createElement('button');
        addTile.type = 'button';
        addTile.className = 'tile-add';
        addTile.innerHTML = '<span class="tile-add__icon" aria-hidden="true">+</span><span class="tile-add__label"></span>';
        addTile.addEventListener('click', () => addItemToCategory(cat.id));
        grid.appendChild(addTile);
      });

      applyReusedHighlights();

      wireEvents();
      reflowRects();
      drawLinks();
      maybeShowInfoTabPreview();
    }

    function wireEvents() {
      app.querySelectorAll('.tile').forEach(t => {
        t.addEventListener('click', (event) => {
          if (typeof event.button === 'number' && event.button !== 0) return;
          hidePreview();
          const id = t.dataset.id;
          const targetSeriesIndex = t.dataset.seriesVersionIndex != null
            ? parseInt(t.dataset.seriesVersionIndex, 10)
            : null;
          const globalIndex = t.dataset.globalIndex != null ? parseInt(t.dataset.globalIndex, 10) : null;
          const activeEntry = models[activeIndex];
          const currentSeriesIndex = activeEntry ? getActiveApicurioVersionIndex(activeEntry) : -1;
          const canNavigateToSeries = activeEntry?.apicurioVersions?.length > 1
            && Number.isInteger(targetSeriesIndex)
            && targetSeriesIndex !== currentSeriesIndex;
          const pendingMatch = pendingSeriesNavigation
            && pendingSeriesNavigation.id === id
            && pendingSeriesNavigation.targetVersionIndex === targetSeriesIndex;

          if (pendingSeriesNavigation && !pendingMatch) {
            clearSeriesNavNotice();
          }

          if (canNavigateToSeries) {
            if (pendingMatch) {
              clearSeriesNavNotice();
              const changed = setActiveApicurioVersion(activeIndex, targetSeriesIndex);
              if (changed) return;
            } else {
              showSeriesNavNotice(id, targetSeriesIndex, activeEntry);
            }
          } else if (Number.isInteger(globalIndex) && globalIndex > 0 && globalIndex % 5 === 0) {
            showNotice('Use arrow keys to move between blocks. Shift arrow to move block.');
          }
          console.log("[Blockscape] click", id);
          if (selection === id && !(canNavigateToSeries && pendingMatch)) { clearSelection(); return; }
          select(id);
        });
        t.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t.click(); }
        });
        t.draggable = true;
        t.addEventListener('dragstart', handleDragStart);
        t.addEventListener('dragend', handleDragEnd);
      });

      app.querySelectorAll('.grid').forEach(grid => {
        grid.addEventListener('dragover', handleDragOver);
        grid.addEventListener('drop', handleDrop);
        grid.addEventListener('dragenter', handleDragEnter);
        grid.addEventListener('dragleave', handleDragLeave);
      });

      if (!globalEventsBound) {
        globalEventsBound = true;
        window.addEventListener('resize', scheduleOverlaySync);
        window.addEventListener('scroll', scheduleOverlaySync, { passive: true });
        window.addEventListener('resize', scheduleThumbLabelMeasure);
      }
      document.getElementById('clear').onclick = () => clearSelection();
    }

    function reflowRects() { index.forEach((v) => { v.rect = v.el.getBoundingClientRect(); }); }

    function getSelectionRelations(id, { includeSecondary = showSecondaryLinks } = {}) {
      if (!id || !model) {
        return { deps: new Set(), revs: new Set(), secondaryDeps: new Set(), secondaryRevs: new Set(), edges: [] };
      }

      const deps = new Set(model.fwd.get(id) || []);
      const revs = new Set(model.rev.get(id) || []);
      const secondaryDeps = new Set();
      const secondaryRevs = new Set();
      const edges = [];
      const edgeKeys = new Set();
      const addEdge = (from, to, type, depth) => {
        if (!from || !to) return;
        const key = `${from}->${to}:${type}:${depth}`;
        if (edgeKeys.has(key)) return;
        edgeKeys.add(key);
        edges.push({ from, to, type, depth });
      };

      deps.forEach(dep => addEdge(id, dep, 'dep', 1));
      revs.forEach(dependent => addEdge(id, dependent, 'revdep', 1));

      if (includeSecondary) {
        const firstLevel = new Set([...deps, ...revs]);
        firstLevel.forEach(node => {
          const nodeDeps = model.fwd.get(node) || new Set();
          nodeDeps.forEach(dep => {
            const isLoopToSelection = dep === id;
            if (!isLoopToSelection) secondaryDeps.add(dep);
            if (!isLoopToSelection) addEdge(node, dep, 'dep', 2);
          });

          const nodeDependents = model.rev.get(node) || new Set();
          nodeDependents.forEach(dependent => {
            const isLoopToSelection = dependent === id;
            if (!isLoopToSelection) secondaryRevs.add(dependent);
            if (!isLoopToSelection) addEdge(node, dependent, 'revdep', 2);
          });
        });
      }

      return { deps, revs, secondaryDeps, secondaryRevs, edges };
    }

    function markTile(id, className) {
      const hit = index.get(id);
      if (hit) hit.el.classList.add(className);
    }

    function select(id) {
      selection = id;
      selectionRelations = getSelectionRelations(id);
      clearStyles();
      const { deps, revs, secondaryDeps, secondaryRevs } = selectionRelations;
      console.log("[Blockscape] selecting id=", id, "deps=", Array.from(deps), "revs=", Array.from(revs));
      const sel = index.get(id); if (sel) sel.el.classList.add('selected');
      deps.forEach(d => markTile(d, 'dep'));
      revs.forEach(r => markTile(r, 'revdep'));
      secondaryDeps.forEach(d => { if (!deps.has(d) && d !== id) markTile(d, 'dep-indirect'); });
      secondaryRevs.forEach(r => { if (!revs.has(r) && !deps.has(r) && r !== id) markTile(r, 'revdep-indirect'); });
      drawLinks();
      const externalUrl = index.get(id)?.el?.dataset?.externalUrl;
      if (externalUrl) {
        showNotice('This item has link to', NOTICE_TIMEOUT_MS, externalUrl);
      }
    }

    function clearSelection() { selection = null; selectionRelations = null; clearStyles(); drawLinks(); }
    function clearStyles() { app.querySelectorAll('.tile').forEach(t => t.classList.remove('dep', 'revdep', 'dep-indirect', 'revdep-indirect', 'selected')); }

    function applyReusedHighlights() {
      if (!model?.reusedLocal) return;
      model.reusedLocal.forEach(id => {
        const hit = index.get(id);
        if (!hit) return;
        hit.el.classList.toggle('reused', showReusedInMap);
        const badge = hit.el.querySelector('.badge');
        if (badge) badge.style.display = showReusedInMap ? 'inline-block' : 'none';
      });
    }

    function drawLinks() {
      while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
      if (!selection || overlay.hidden) return;
      selectionRelations = getSelectionRelations(selection);
      const relations = selectionRelations;

      relations.edges.forEach(edge => {
        const fromRect = index.get(edge.from)?.rect;
        const toRect = index.get(edge.to)?.rect;
        if (!fromRect || !toRect) return;
        const a = center(fromRect);
        const b = center(toRect);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const c1x = (a.x + b.x) / 2, c1y = a.y;
        const c2x = (a.x + b.x) / 2, c2y = b.y;
        path.setAttribute("d", `M ${a.x},${a.y} C ${c1x},${c1y} ${c2x},${c2y} ${b.x},${b.y}`);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", edge.type === 'dep' ? "var(--blockscape-dep)" : "var(--blockscape-revdep)");
        path.setAttribute("stroke-opacity", edge.depth === 1 ? "0.45" : "0.22");
        path.setAttribute("stroke-width", edge.depth === 1 ? "2" : "1.5");
        if (edge.depth > 1) path.setAttribute("stroke-dasharray", "4 3");
        path.setAttribute("vector-effect", "non-scaling-stroke");
        overlay.appendChild(path);
      });
    }

    function center(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    function escapeHtml(s) { return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[m])); }

    function resolveExternalMeta(value) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return { isExternal: false, url: '' };
        try {
          const url = new URL(trimmed);
          if (!/^https?:/i.test(url.protocol)) return { isExternal: false, url: '' };
          return { isExternal: true, url: url.toString() };
        } catch (error) {
          console.warn('[Blockscape] invalid external url skipped', value, error);
          return { isExternal: false, url: '' };
        }
      }
      if (value === true) {
        return { isExternal: true, url: '' };
      }
      return { isExternal: false, url: '' };
    }

    function createExternalLinkButton(url) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'external-link';
      button.setAttribute('aria-label', 'Open external reference in a new tab');
      button.title = url;
      button.textContent = '↗';
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        window.open(url, '_blank', 'noopener');
      });
      button.addEventListener('keydown', (event) => event.stopPropagation());
      return button;
    }

    function scheduleThumbLabelMeasure() {
      if (thumbLabelMeasureTimer) return;
      thumbLabelMeasureTimer = requestAnimationFrame(() => {
        thumbLabelMeasureTimer = null;
        versionThumbLabels = versionThumbLabels.filter(({ labelEl, textEl }) => labelEl?.isConnected && textEl?.isConnected);
        versionThumbLabels.forEach(({ labelEl, textEl }) => {
          const overflow = Math.max(textEl.scrollWidth - labelEl.clientWidth, 0);
          if (overflow > 4) {
            const duration = Math.max(4, Math.min(14, 4 + overflow / 30));
            labelEl.classList.add('version-nav__thumb-label--scroll');
            textEl.style.setProperty('--marquee-distance', `${overflow}px`);
            textEl.style.setProperty('--marquee-duration', `${duration}s`);
          } else {
            labelEl.classList.remove('version-nav__thumb-label--scroll');
            textEl.style.removeProperty('--marquee-distance');
            textEl.style.removeProperty('--marquee-duration');
          }
        });
      });
    }

    function registerThumbLabel(labelEl, textEl) {
      if (!labelEl || !textEl) return;
      versionThumbLabels.push({ labelEl, textEl });
      scheduleThumbLabelMeasure();
    }

    function buildSeriesInfoTooltipHtml(versionEntry, titleText) {
      const parts = [`<div class="version-nav__tooltip-title">${escapeHtml(titleText)}</div>`];
      const versionLabel = (versionEntry?.version ?? versionEntry?.data?.version ?? '').toString().trim();
      if (versionLabel) {
        parts.push(`<div class="version-nav__tooltip-meta">Version ${escapeHtml(versionLabel)}</div>`);
      }
      const abstractHtml = (versionEntry?.data?.abstract ?? '').toString().trim();
      if (abstractHtml) {
        parts.push(`<div class="version-nav__tooltip-body">${abstractHtml}</div>`);
      } else {
        parts.push('<div class="version-nav__tooltip-body muted">No info available for this version.</div>');
      }
      return parts.join('');
    }

    function showTabTooltip(target, html, { offset = 8 } = {}) {
      if (!tabTooltip || !target || !html) return;
      tabTooltip.innerHTML = html;
      tabTooltip.hidden = false;
      tabTooltip.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const tooltipRect = tabTooltip.getBoundingClientRect();
        const scrollX = window.scrollX || document.documentElement.scrollLeft;
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        let left = rect.left + rect.width / 2 - tooltipRect.width / 2 + scrollX;
        let top = rect.top - tooltipRect.height - offset + scrollY;
        if (left < scrollX + offset) left = scrollX + offset;
        const maxLeft = scrollX + window.innerWidth - tooltipRect.width - offset;
        if (left > maxLeft) left = maxLeft;
        if (top < scrollY + offset) top = rect.bottom + offset + scrollY;
        tabTooltip.style.left = `${left}px`;
        tabTooltip.style.top = `${top}px`;
        tabTooltip.classList.add('is-visible');
      });
    }

    function hideTabTooltip() {
      if (infoTooltipAutoHideTimer) {
        clearTimeout(infoTooltipAutoHideTimer);
        infoTooltipAutoHideTimer = null;
      }
      if (!tabTooltip) return;
      tabTooltip.classList.remove('is-visible');
      tabTooltip.setAttribute('aria-hidden', 'true');
      tabTooltip.hidden = true;
    }

    function attachSeriesPreviewHover(thumbEl, versionEntry) {
      if (!thumbEl) return;
      const titleText = getModelTitle(versionEntry?.data || versionEntry, 'Series version');
      thumbEl.title = titleText;
      thumbEl.setAttribute('aria-label', titleText);
      const infoHtml = buildSeriesInfoTooltipHtml(versionEntry, titleText);
      let hoverTimer = null;

      const clearHoverTimer = () => {
        if (hoverTimer) {
          clearTimeout(hoverTimer);
          hoverTimer = null;
        }
      };

      const showTitleTooltip = () => {
        activeSeriesPreviewTarget = thumbEl;
        showTabTooltip(thumbEl, `<div class="version-nav__tooltip-title">${escapeHtml(titleText)}</div>`, { offset: 10 });
      };

      const scheduleInfoTooltip = () => {
        clearHoverTimer();
        hoverTimer = setTimeout(() => {
          if (activeSeriesPreviewTarget !== thumbEl) return;
          showTabTooltip(thumbEl, infoHtml, { offset: 10 });
        }, SERIES_INFO_PREVIEW_DELAY);
      };

      const handleEnter = () => {
        showTitleTooltip();
        scheduleInfoTooltip();
      };

      const handleMove = () => {
        if (activeSeriesPreviewTarget !== thumbEl) {
          showTitleTooltip();
        }
        scheduleInfoTooltip();
      };

      const handleLeave = () => {
        clearHoverTimer();
        if (activeSeriesPreviewTarget === thumbEl) {
          activeSeriesPreviewTarget = null;
          hideTabTooltip();
        }
      };

      thumbEl.addEventListener('mouseenter', handleEnter);
      thumbEl.addEventListener('focus', handleEnter);
      thumbEl.addEventListener('pointermove', handleMove);
      thumbEl.addEventListener('mouseleave', handleLeave);
      thumbEl.addEventListener('blur', handleLeave);
      thumbEl.addEventListener('click', handleLeave);
    }

    function maybeShowInfoTabPreview() {
      if (!pendingInfoPreview) return;
      pendingInfoPreview = false;
      if (!infoTabButton || !activeInfoTooltipHtml) return;
      hideTabTooltip();
      showTabTooltip(infoTabButton, activeInfoTooltipHtml, { offset: 12 });
      infoTooltipAutoHideTimer = setTimeout(() => {
        hideTabTooltip();
        startInfoTabTwinkle();
      }, 1000);
    }

    function startInfoTabTwinkle() {
      if (!infoTabButton) return;
      if (infoTabTwinkleTimer) {
        clearTimeout(infoTabTwinkleTimer);
        infoTabTwinkleTimer = null;
      }
      infoTabButton.classList.add('blockscape-tab--twinkle');
      infoTabTwinkleTimer = setTimeout(() => {
        infoTabButton.classList.remove('blockscape-tab--twinkle');
        infoTabTwinkleTimer = null;
      }, 1400);
    }

    window.addEventListener('scroll', hideTabTooltip, true);
    window.addEventListener('resize', hideTabTooltip);

    function hidePreview() {
      if (!preview) return;
      preview.classList.remove('is-visible', 'item-preview--has-frame', 'item-preview--expanded');
      preview.setAttribute('aria-hidden', 'true');
      preview.hidden = true;
      setPreviewActions([]);
    }

    function showPreviewAt(x, y) {
      if (!preview) return;
      previewAnchor = { x, y };
      preview.hidden = false;
      preview.setAttribute('aria-hidden', 'false');
      preview.classList.add('is-visible');
      positionPreview(x, y);
    }

    function positionPreview(x, y) {
      if (!preview) return;
      const margin = 12;
      preview.style.left = `${x + margin}px`;
      preview.style.top = `${y + margin}px`;
      const rect = preview.getBoundingClientRect();
      let left = rect.left;
      let top = rect.top;
      if (rect.right > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - rect.width - margin);
      }
      if (rect.bottom > window.innerHeight - margin) {
        top = Math.max(margin, window.innerHeight - rect.height - margin);
      }
      preview.style.left = `${left}px`;
      preview.style.top = `${top}px`;
    }

    function setPreviewActions(actions = []) {
      if (!previewActions) return;
      previewActions.innerHTML = '';
      actions.forEach((actionDef) => {
        const action = document.createElement('button');
        action.type = 'button';
        action.className = 'item-preview__action';
        action.textContent = actionDef.label || 'Action';
        if (actionDef.title) action.title = actionDef.title;
        action.addEventListener('click', (event) => {
          event.stopPropagation();
          if (typeof actionDef.onClick === 'function') {
            actionDef.onClick(event);
          }
        });
        previewActions.appendChild(action);
      });
      previewActions.hidden = actions.length === 0;
    }

    async function handleTileContextMenu(event, tile) {
      if (!preview) return;
      event.stopPropagation();
      event.preventDefault();
      const id = tile.dataset.id;
      const displayName = tile.querySelector('.name')?.textContent || id || 'Preview';
      const filename = id ? `${id}.html` : '';
      const filepath = filename ? `items/${filename}` : '';
      const requestId = ++previewRequestId;
      const externalUrl = tile.dataset.externalUrl || '';
      const actionList = [{
        label: 'Edit',
        title: 'Edit this item',
        onClick: () => {
          hidePreview();
          itemEditor.open(id);
        }
      }];
      if (externalUrl) {
        actionList.push({
          label: 'Open link ↗',
          title: externalUrl,
          onClick: () => window.open(externalUrl, '_blank', 'noopener')
        });
      }
      setPreviewActions(actionList);
      if (id) select(id);

      previewTitle.textContent = displayName;
      previewBody.innerHTML = '<div class="item-preview__status">Loading…</div>';
      preview.classList.remove('item-preview--has-frame');
      preview.classList.add('item-preview--expanded');
      showPreviewAt(event.clientX, event.clientY);

      if (!filepath) {
        previewBody.innerHTML = '<div class="item-preview__status">Preview unavailable for this item.</div>';
        positionPreview(previewAnchor.x, previewAnchor.y);
        return;
      }

      try {
        const response = await fetch(filepath, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        if (requestId !== previewRequestId) return;
        const trimmed = html.trim();
        if (!trimmed) {
          previewBody.innerHTML = `<div class="item-preview__status">No content in <code>${escapeHtml(filename)}</code>.</div>`;
          positionPreview(previewAnchor.x, previewAnchor.y);
          return;
        }
        const frame = document.createElement('iframe');
        frame.className = 'item-preview__frame';
        frame.title = `${displayName} details`;
        frame.srcdoc = html;
        previewBody.innerHTML = '';
        previewBody.appendChild(frame);
        preview.classList.add('item-preview--has-frame');
        positionPreview(previewAnchor.x, previewAnchor.y);
      } catch (error) {
        if (requestId !== previewRequestId) return;
        previewBody.innerHTML = `<div class="item-preview__status">No preview available for <strong>${escapeHtml(displayName)}</strong>.</div>`;
        console.warn(`[Blockscape] preview unavailable for ${filepath}`, error);
        positionPreview(previewAnchor.x, previewAnchor.y);
      }
    }

    if (previewClose) {
      previewClose.addEventListener('click', hidePreview);
    }

    if (helpButton) {
      helpButton.addEventListener('click', () => {
        openShortcutHelp();
      });
    }

    if (newPanelButton) {
      newPanelButton.addEventListener('click', () => {
        openNewPanel();
      });
    }

    if (shortcutHelpClose) {
      shortcutHelpClose.addEventListener('click', closeShortcutHelp);
    }

    if (shortcutHelpBackdrop) {
      shortcutHelpBackdrop.addEventListener('click', closeShortcutHelp);
    }

    if (newPanelClose) {
      newPanelClose.addEventListener('click', closeNewPanel);
    }

    if (newPanelBackdrop) {
      newPanelBackdrop.addEventListener('click', closeNewPanel);
    }

    if (app) {
      app.addEventListener('contextmenu', (event) => {
        const tile = event.target.closest('.tile');
        if (!tile || !app.contains(tile)) return;
        handleTileContextMenu(event, tile);
      });
    }

    document.addEventListener('click', (event) => {
      if (typeof event.button === 'number' && event.button !== 0) return;
      if (!preview || preview.hidden) return;
      if (preview.contains(event.target)) return;
      hidePreview();
    });

    if (downloadButton) {
      downloadButton.addEventListener('click', () => {
        downloadCurrentJson('button');
      });
    }

    if (createVersionButton) {
      createVersionButton.addEventListener('click', () => {
        if (activeIndex < 0) {
          alert('Load or select a model before creating a version.');
          return;
        }
        try {
          const idx = createNewVersionFromActive({ versionLabel: 'map edit' });
          setActive(idx);
          console.log('[Blockscape] created new version from map view');
        } catch (error) {
          alert(error?.message || 'Unable to create a new version right now.');
        }
      });
    }

    if (shareButton) {
      shareButton.addEventListener('click', async () => {
        if (activeIndex < 0 || !models[activeIndex]) {
          alert('Select or load a model before sharing.');
          return;
        }
        const payload = {
          title: getModelTitle(models[activeIndex], 'Shared Model'),
          data: models[activeIndex].data
        };
        let encoded;
        try {
          encoded = base64UrlEncode(JSON.stringify(payload));
        } catch (err) {
          console.error('[Blockscape] share encode failed', err);
          alert('Unable to encode this model for sharing.');
          return;
        }
        const shareUrl = new URL(window.location.href);
        shareUrl.searchParams.delete('share');
        shareUrl.hash = `share=${encoded}`;
        const fullUrl = shareUrl.toString();

        // Update the address bar so the current page URL matches the share URL
        try {
          window.history.replaceState({}, document.title, fullUrl);
        } catch (err) {
          console.warn('[Blockscape] failed to update URL for share', err);
          window.location.hash = shareUrl.hash;
        }

        let copied = false;
        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(fullUrl);
            copied = true;
          } catch (err) {
            console.warn('[Blockscape] clipboard write failed', err);
          }
        }
        if (copied) {
          alert('Share URL copied to clipboard.');
        } else {
          window.prompt('Copy this share URL:', fullUrl);
        }
      });
    }

    if (editButton) {
      editButton.addEventListener('click', () => {
        const text = (jsonBox.value || '').trim();
        if (!text) {
          alert('Load or paste a model before opening the editor.');
          return;
        }
        try {
          JSON.parse(text);
        } catch (err) {
          alert('Current JSON is invalid. Fix it before opening the editor.');
          return;
        }
        try {
          const payload = {
            ts: Date.now(),
            text,
            source: 'viewer'
          };
          if (selection) {
            payload.selectedItemId = selection;
          }
          localStorage.setItem(EDITOR_TRANSFER_KEY, JSON.stringify(payload));
        } catch (storageError) {
          console.error('[Blockscape] failed to store editor payload', storageError);
          alert('Unable to stash JSON for the editor (storage disabled?).');
          return;
        }
        let editorUrl = 'editor.html#viewer';
        if (selection) {
          const encoded = encodeURIComponent(selection);
          editorUrl = `editor.html?selected=${encoded}#viewer`;
        }
        window.open(editorUrl, '_blank');
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (!event) return;
        if (event.storageArea && event.storageArea !== window.localStorage) return;
        if (event.key !== EDITOR_TRANSFER_KEY) return;
        if (!event.newValue) return;
        let payload;
        try {
          payload = JSON.parse(event.newValue);
        } catch (err) {
          console.warn('[Blockscape] storage payload parse failed', err);
          return;
        }
        if (!payload || payload.source !== 'editor') return;
        importEditorPayload('storage-event');
      });

      window.addEventListener('message', (event) => {
        if (!event || !event.data) return;
        const currentOrigin = window.location.origin;
        if (currentOrigin && currentOrigin !== 'null') {
          if (event.origin !== currentOrigin) return;
        } else if (event.origin && event.origin !== 'null') {
          return;
        }
        if (typeof event.data !== 'object') return;
        if (event.data === null) return;
        if (event.data.type !== EDITOR_TRANSFER_MESSAGE_TYPE) return;
        importEditorPayload('message');
      });
    }

    document.addEventListener('keydown', (event) => {
      if (isShortcutHelpOpen()) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeShortcutHelp();
        }
        return;
      }

      if (!newPanel?.hidden && event.key === 'Escape') {
        event.preventDefault();
        closeNewPanel();
        return;
      }

      const isEditingItem = itemEditor?.isOpen?.();
      if (isEditingItem) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') {
        event.preventDefault();
        const active = models[activeIndex];
        const preferSeries = !!(active?.apicurioVersions?.length > 1);
        downloadCurrentJson('shortcut', preferSeries);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key && event.key.toLowerCase() === 'z') {
        if (!shouldHandleGlobalPaste()) return;
        const undone = undoLastDeletion();
        if (undone) {
          event.preventDefault();
          return;
        }
      }

      if (event.key === 'Escape' && preview && !preview.hidden) {
        hidePreview();
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        if (!shouldHandleGlobalPaste()) return;
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const step = event.key === 'ArrowLeft' ? -1 : 1;
        if (event.shiftKey) {
          const moved = moveSelectionWithinCategory(step);
          if (moved) {
            event.preventDefault();
          }
        } else {
          const changed = selectAdjacentItem(step);
          if (changed) {
            event.preventDefault();
          }
        }
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        if (!shouldHandleGlobalPaste()) return;
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const step = event.key === 'ArrowUp' ? -1 : 1;
        if (event.shiftKey) {
          const moved = moveSelectionAcrossCategories(step);
          if (moved) {
            event.preventDefault();
          }
        } else {
          const moved = selectAdjacentCategory(step);
          if (moved) {
            event.preventDefault();
          }
        }
      }

      if (event.key === 'Delete') {
        if (!shouldHandleGlobalPaste()) return;
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        const removed = deleteSelectedItem();
        if (removed) {
          event.preventDefault();
        }
      }

      if (event.key === 'F2') {
        if (!shouldHandleGlobalPaste()) return;
        const targetId = selection || event.target?.closest?.('.tile')?.dataset?.id;
        if (targetId) {
          const opened = itemEditor.open(targetId);
          if (opened) event.preventDefault();
        }
      }
    });

    window.addEventListener('resize', () => {
      if (!preview || preview.hidden) return;
      positionPreview(previewAnchor.x, previewAnchor.y);
    });

    window.addEventListener('scroll', () => {
      if (!preview || preview.hidden) return;
      hidePreview();
    }, true);

    // ===== Drag and drop reorder (per model) =====
    let draggedItemId = null;
    let draggedCategoryId = null;

    function handleDragStart(e) {
      hidePreview();
      draggedItemId = e.target.dataset.id;
      draggedCategoryId = e.target.closest('.category').dataset.cat;

      e.target.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify({
        itemId: draggedItemId,
        categoryId: draggedCategoryId
      }));

      const category = e.target.closest('.category');
      const grid = category.querySelector('.grid');
      grid.classList.add('drag-active');

      console.log("[Blockscape] drag start", draggedItemId, "from", draggedCategoryId);
    }

    function handleDragEnd(e) {
      e.target.classList.remove('dragging');
      app.querySelectorAll('.grid').forEach(grid => grid.classList.remove('drag-active'));
      app.querySelectorAll('.tile').forEach(tile => tile.classList.remove('drag-over'));
      draggedItemId = null;
      draggedCategoryId = null;
    }

    function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    function handleDragEnter(e) {
      e.preventDefault();
      const grid = e.target.closest('.grid');
      if (grid) grid.classList.add('drag-active');
    }
    function handleDragLeave(e) {
      const grid = e.target.closest('.grid');
      if (grid && !grid.contains(e.relatedTarget)) grid.classList.remove('drag-active');
    }

    function handleDrop(e) {
      e.preventDefault();
      const targetGrid = e.target.closest('.grid');
      if (!targetGrid) return;
      const targetCategory = targetGrid.closest('.category');
      if (!targetCategory) return;
      const targetCategoryId = targetCategory.dataset.cat;

      if (!draggedItemId || !targetCategoryId) return;

      const tiles = Array.from(targetGrid.querySelectorAll('.tile')).filter(tile => tile.dataset.id !== draggedItemId);
      const targetTile = tiles.find(tile => {
        const rect = tile.getBoundingClientRect();
        return e.clientY < rect.top + rect.height / 2;
      });

      reorderItem(draggedItemId, targetTile ? targetTile.dataset.id : null, targetCategoryId);
      render();
      console.log("[Blockscape] drop completed", draggedItemId, "from", draggedCategoryId, "to", targetCategoryId);
    }

    function reorderItem(itemId, targetItemId, targetCategoryId) {
      if (activeIndex < 0) return;
      const mobj = models[activeIndex].data;
      const categories = mobj.categories || [];
      const sourceCategory = categories.find(cat => (cat.items || []).some(item => item.id === itemId));
      const targetCategory = categories.find(cat => cat.id === targetCategoryId);
      if (!sourceCategory || !targetCategory) return;

      sourceCategory.items = sourceCategory.items || [];
      targetCategory.items = targetCategory.items || [];

      const itemIndex = sourceCategory.items.findIndex(item => item.id === itemId);
      if (itemIndex === -1) return;

      const [movedItem] = sourceCategory.items.splice(itemIndex, 1);
      let insertIndex = targetCategory.items.length;
      if (targetItemId) {
        const targetIndex = targetCategory.items.findIndex(item => item.id === targetItemId);
        if (targetIndex !== -1) insertIndex = targetIndex;
      }
      targetCategory.items.splice(insertIndex, 0, movedItem);

      // keep editor in sync
      loadActiveIntoEditor();
      rebuildFromActive();
    }

    function addItemToCategory(categoryId) {
      if (activeIndex < 0 || !categoryId) return;
      const mobj = models[activeIndex].data;
      const categories = mobj.categories || [];
      const category = categories.find(cat => cat.id === categoryId);
      if (!category) return;

      category.items = category.items || [];
      const defaultName = `New item ${category.items.length + 1}`;
      const newId = makeUniqueItemId(`${categoryId}-${category.items.length + 1}`, mobj);
      const newItem = {
        id: newId,
        name: defaultName,
        deps: []
      };
      category.items.push(newItem);

      loadActiveIntoEditor();
      rebuildFromActive();
      hidePreview();
      select(newItem.id);
      const created = index.get(newItem.id);
      if (created?.el) {
        created.el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
      console.log("[Blockscape] added item", newItem.id, "to", categoryId);
    }

    function moveSelectionWithinCategory(step) {
      if (!selection || activeIndex < 0 || !step) return false;
      const mobj = models[activeIndex].data;
      const categories = mobj.categories || [];
      const selectedMeta = index.get(selection);
      let category = null;
      if (selectedMeta?.catId) {
        category = categories.find(cat => cat.id === selectedMeta.catId);
      }
      if (!category) {
        category = categories.find(cat => (cat.items || []).some(item => item.id === selection));
      }
      if (!category) return false;

      category.items = category.items || [];
      const currentIndex = category.items.findIndex(item => item.id === selection);
      if (currentIndex === -1) return false;

      const targetIndex = currentIndex + step;
      if (targetIndex < 0 || targetIndex >= category.items.length) return false;

      const [movedItem] = category.items.splice(currentIndex, 1);
      category.items.splice(targetIndex, 0, movedItem);

      loadActiveIntoEditor();
      rebuildFromActive();
      render();
      select(selection);
      return true;
    }

    function selectAdjacentItem(step) {
      if (!model || !model.m || !step) return false;
      const categories = model.m.categories || [];
      if (!categories.length) return false;

      const findFirstItem = () => {
        const firstCategory = categories.find(cat => (cat.items || []).length);
        if (!firstCategory) return null;
        return { category: firstCategory, item: firstCategory.items[0] };
      };

      if (!selection) {
        const starter = findFirstItem();
        if (!starter) return false;
        select(starter.item.id);
        return true;
      }

      const selectedMeta = index.get(selection);
      let category = null;
      if (selectedMeta?.catId) {
        category = categories.find(cat => cat.id === selectedMeta.catId);
      }
      if (!category) {
        category = categories.find(cat => (cat.items || []).some(item => item.id === selection));
      }
      if (!category) {
        const starter = findFirstItem();
        if (!starter) return false;
        select(starter.item.id);
        return true;
      }

      const items = category.items || [];
      if (!items.length) return false;
      const currentIndex = items.findIndex(item => item.id === selection);
      if (currentIndex === -1) return false;

      const targetIndex = currentIndex + step;
      if (targetIndex < 0 || targetIndex >= items.length) return false;

      select(items[targetIndex].id);
      return true;
    }

    function selectAdjacentCategory(step) {
      if (!model || !model.m || !step) return false;
      const categories = model.m.categories || [];
      if (!categories.length) return false;

      const getFirstSelectable = () => {
        for (const cat of categories) {
          if (cat.items && cat.items.length) {
            return cat.items[0].id;
          }
        }
        return null;
      };

      const resolveCategoryIndexForSelection = () => {
        if (!selection) return -1;
        const selectedMeta = index.get(selection);
        if (selectedMeta?.catId) {
          const idx = categories.findIndex(cat => cat.id === selectedMeta.catId);
          if (idx !== -1) return idx;
        }
        return categories.findIndex(cat => (cat.items || []).some(item => item.id === selection));
      };

      let currentCategoryIndex = resolveCategoryIndexForSelection();
      if (currentCategoryIndex === -1) {
        const first = getFirstSelectable();
        if (!first) return false;
        select(first);
        return true;
      }

      const currentItems = categories[currentCategoryIndex].items || [];
      let currentItemPosition = currentItems.findIndex(item => item.id === selection);
      if (currentItemPosition === -1) currentItemPosition = 0;

      let targetIndex = currentCategoryIndex + step;
      while (targetIndex >= 0 && targetIndex < categories.length) {
        const targetCat = categories[targetIndex];
        const items = targetCat.items || [];
        if (items.length) {
          const pos = Math.min(items.length - 1, Math.max(0, currentItemPosition));
          select(items[pos].id);
          return true;
        }
        targetIndex += step > 0 ? 1 : -1;
      }

      return false;
    }

    function moveSelectionAcrossCategories(step) {
      if (!selection || activeIndex < 0 || !step) return false;
      const mobj = models[activeIndex].data;
      const categories = mobj.categories || [];
      if (!categories.length) return false;

      const selectedMeta = index.get(selection);
      let sourceIndex = -1;
      if (selectedMeta?.catId) {
        sourceIndex = categories.findIndex(cat => cat.id === selectedMeta.catId);
      }
      if (sourceIndex === -1) {
        sourceIndex = categories.findIndex(cat => (cat.items || []).some(item => item.id === selection));
      }
      if (sourceIndex === -1) return false;

      const targetIndex = sourceIndex + step;
      if (targetIndex < 0 || targetIndex >= categories.length) return false;

      const sourceCategory = categories[sourceIndex];
      const targetCategory = categories[targetIndex];
      if (!targetCategory) return false;

      sourceCategory.items = sourceCategory.items || [];
      targetCategory.items = targetCategory.items || [];

      const currentIndex = sourceCategory.items.findIndex(item => item.id === selection);
      if (currentIndex === -1) return false;

      const insertPos = Math.min(targetCategory.items.length, Math.max(0, currentIndex));
      const targetItemId = insertPos < targetCategory.items.length ? targetCategory.items[insertPos].id : null;

      reorderItem(selection, targetItemId, targetCategory.id);
      render();
      select(selection);
      return true;
    }

    function undoLastDeletion() {
      if (!lastDeletedItem || activeIndex < 0) return false;
      const activeModel = models[activeIndex];
      if (!activeModel || activeModel.id !== lastDeletedItem.modelId) return false;

      const deleted = lastDeletedItem;
      const mobj = activeModel.data;
      const categories = mobj.categories || [];
      const category = categories.find(cat => cat.id === deleted.categoryId);
      if (!category) return false;

      category.items = category.items || [];
      const insertIndex = Math.min(Math.max(deleted.index, 0), category.items.length);
      category.items.splice(insertIndex, 0, deleted.item);

      lastDeletedItem = null;
      hidePreview();
      selection = null;
      selectionRelations = null;
      loadActiveIntoEditor();
      rebuildFromActive();
      render();
      select(deleted.item.id);
      console.log("[Blockscape] undo delete restored", deleted.item.id);
      return true;
    }

    function deleteSelectedItem() {
      if (!selection || activeIndex < 0) return false;
      const mobj = models[activeIndex].data;
      const categories = mobj.categories || [];
      if (!categories.length) return false;

      const selectedMeta = index.get(selection);
      let category = null;
      if (selectedMeta?.catId) {
        category = categories.find(cat => cat.id === selectedMeta.catId);
      }
      if (!category) {
        category = categories.find(cat => (cat.items || []).some(item => item.id === selection));
      }
      if (!category || !Array.isArray(category.items)) return false;

      const currentIndex = category.items.findIndex(item => item.id === selection);
      if (currentIndex === -1) return false;

      const removed = category.items.splice(currentIndex, 1)[0];
      if (!removed) return false;

      const activeModel = models[activeIndex];
      lastDeletedItem = {
        item: removed,
        categoryId: category.id,
        index: currentIndex,
        modelId: activeModel ? activeModel.id : null
      };

      const findNextSelection = () => {
        if (category.items.length) {
          const neighborIndex = Math.min(currentIndex, category.items.length - 1);
          return category.items[neighborIndex]?.id || null;
        }
        const catIndex = categories.findIndex(cat => cat.id === category.id);
        if (catIndex === -1) return null;
        for (let i = catIndex + 1; i < categories.length; i++) {
          const items = categories[i].items || [];
          if (items.length) return items[0].id;
        }
        for (let i = catIndex - 1; i >= 0; i--) {
          const items = categories[i].items || [];
          if (items.length) return items[0].id;
        }
        return null;
      };

      const nextSelectionId = findNextSelection();
      hidePreview();
      selection = null;
      selectionRelations = null;
      loadActiveIntoEditor();
      rebuildFromActive();
      render();
      if (nextSelectionId) {
        select(nextSelectionId);
      } else {
        clearSelection();
      }
      console.log("[Blockscape] removed item", removed.id);
      return true;
    }

    // ===== Controls =====

    if (copyJsonButton) {
      copyJsonButton.addEventListener('click', async () => {
        const text = jsonBox.value || '';
        if (!text.trim()) {
          alert('JSON editor is empty.');
          return;
        }
        const copied = await writeTextToClipboard(text);
        if (copied) {
          alert('JSON copied to clipboard.');
        } else {
          window.prompt('Copy this JSON manually:', text);
        }
      });
    }

    if (copySeriesButton) {
      copySeriesButton.addEventListener('click', async () => {
        const seriesJson = getActiveSeriesJson();
        if (!seriesJson) {
          alert('No series available to copy. Create another version first.');
          return;
        }
        const copied = await writeTextToClipboard(seriesJson);
        if (copied) {
          alert('Series JSON copied to clipboard.');
        } else {
          window.prompt('Copy this series JSON manually:', seriesJson);
        }
      });
    }

    if (pasteJsonButton) {
      pasteJsonButton.addEventListener('click', async () => {
        try {
          const text = await readTextFromClipboard();
          if (!text) {
            alert('Clipboard is empty.');
            return;
          }
          jsonBox.value = text;
          jsonBox.focus();
        } catch (err) {
          console.warn('[Blockscape] clipboard read failed', err);
          alert('Unable to read from the clipboard. Use Cmd/Ctrl+V inside the editor instead.');
        }
      });
    }

    // Append models from textarea
    document.getElementById('appendFromBox').onclick = () => {
      try {
        const appended = normalizeToModelsFromText(jsonBox.value, "Pasted", { promptForSeriesName: true });
        if (!appended.length) { alert("No valid JSON found to append."); return; }
        console.log("[Blockscape] appending", appended.length, "model(s)");
        let firstIndex = null;
        appended.forEach((entry, idx) => {
          const idxResult = addModelEntry(entry, { versionLabel: appended.length > 1 ? `paste #${idx + 1}` : 'paste' });
          if (firstIndex == null) firstIndex = idxResult;
        });
        if (activeIndex === -1 && firstIndex != null) setActive(firstIndex); else { renderModelList(); }
      } catch (e) {
        console.error("[Blockscape] append error:", e);
        alert("Append error (see console).");
      }
    };

    // Replace active model data with JSON from textarea
    document.getElementById('replaceActive').onclick = () => {
      if (activeIndex < 0) { alert("No active model selected."); return; }
      try {
        const obj = JSON.parse(jsonBox.value);
        ensureModelMetadata(obj, { 
          titleHint: getModelTitle(models[activeIndex]), 
          idHint: getModelId(models[activeIndex]) || getModelTitle(models[activeIndex]) 
        });
        models[activeIndex].data = obj;
        models[activeIndex].title = obj.title || models[activeIndex].title;
        if (models[activeIndex].isSeries || (models[activeIndex].apicurioVersions?.length > 1)) {
          const seriesName = models[activeIndex].title || getModelTitle(models[activeIndex]);
          ensureSeriesId(models[activeIndex], { seriesName, fallbackTitle: seriesName });
        }
        syncDocumentTitle();
        console.log("[Blockscape] replaced active model:", getModelTitle(models[activeIndex]));
        rebuildFromActive();
        apicurio.updateAvailability();
      } catch (e) {
        console.error("[Blockscape] replace error:", e);
        alert("JSON parse error (see console).");
      }
    };

    // Load files: each text may be single object, array, or ---/%%% separated
    document.getElementById('file').onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      try {
        console.log("[Blockscape] reading", files.length, "file(s)");
        let firstIndex = null;
      for (const f of files) {
        const txt = await f.text();
        const baseName = f.name.replace(/\.[^.]+$/, '') || "File";
        const entries = normalizeToModelsFromText(txt, baseName, { seriesTitleOverride: `${baseName} series` });
        if (!entries.length) {
          console.warn("[Blockscape] no models in file:", f.name);
          continue;
        }
        // Ensure file-derived entries prefer embedded title/id but fall back to filename
        entries.forEach((en, i) => {
          const dataTitle = (en.data?.title ?? '').toString().trim();
          const fallbackTitle = entries.length > 1 ? `${f.name} #${i + 1}` : f.name;
          const fileSeriesName = `${baseName} series`;
          const seriesName = en.isSeries ? fileSeriesName : null;
          let payload = { ...en };
          if (en.isSeries) {
            const seriesTitle = seriesName || dataTitle || en.title || fallbackTitle || 'unknown';
            payload.title = seriesTitle;
            const forcedSlug = makeSeriesId(seriesTitle || 'unknown');
            applySeriesSlug(payload, forcedSlug);
            ensureSeriesId(payload, { seriesName: seriesTitle, fallbackTitle: 'unknown' });
            payload.apicurioArtifactName = payload.apicurioArtifactName || seriesTitle;
          } else {
            payload.title = dataTitle || fallbackTitle;
          }
          const idxResult = addModelEntry({
            ...payload,
            apicurioArtifactName: payload.apicurioArtifactName || seriesName || payload.apicurioArtifactName
          }, { versionLabel: f.name });
            if (firstIndex == null) firstIndex = idxResult;
          });
        }
        if (activeIndex === -1 && firstIndex != null) setActive(firstIndex);
        else renderModelList();
      } catch (err) {
        console.error("[Blockscape] file load error:", err);
        alert("File load error (see console).");
      } finally {
        e.target.value = ""; // allow re-selecting the same files
      }
    };

    // Paste JSON anywhere to append new models
    document.addEventListener('paste', handleClipboardPaste);

    function handleClipboardPaste(event) {
      if (!shouldHandleGlobalPaste()) return;
      const text = event.clipboardData?.getData('text/plain')
        || (window.clipboardData && window.clipboardData.getData('Text'))
        || '';
      if (!looksLikeModelJson(text)) return;
      let entries = [];
      try {
        entries = normalizeToModelsFromText(text, 'Clipboard', { promptForSeriesName: true });
      } catch (err) {
        console.warn('[Blockscape] clipboard paste ignored (invalid JSON)', err);
        return;
      }
      if (!entries.length) return;
      event.preventDefault();
      let firstIndex = null;
      entries.forEach((entry, idx) => {
        const idxResult = addModelEntry(entry, { versionLabel: entries.length > 1 ? `paste #${idx + 1}` : 'paste' });
        if (firstIndex == null) firstIndex = idxResult;
      });
      console.log(`[Blockscape] pasted ${entries.length} model(s) from clipboard`);
      if (firstIndex != null) setActive(firstIndex);
    }

    // Switch active model from sidebar
    modelList.addEventListener('click', (e) => {
      const button = e.target.closest('button[data-index]');
      if (!button) return;
      const i = parseInt(button.dataset.index, 10);
      if (!Number.isInteger(i)) return;
      scrollPageToTop();
      setActive(i);
    });

    // Remove selected model
    document.getElementById('removeModel').onclick = () => {
      if (activeIndex < 0) return;
      const title = getModelTitle(models[activeIndex]);
      const ok = window.confirm(`Remove "${title}" from this session?`);
      if (!ok) return;
      console.log("[Blockscape] removing model:", getModelTitle(models[activeIndex]));
      models.splice(activeIndex, 1);
      if (!models.length) {
        activeIndex = -1;
        model = null;
        app.innerHTML = "";
        overlay.innerHTML = "";
        jsonBox.value = "";
        renderModelList();
        syncDocumentTitle();
        return;
      }
      const next = Math.min(activeIndex, models.length - 1);
      setActive(next);
    };

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        handleSearchInput(e.target.value || '');
      });
      searchInput.addEventListener('focus', () => {
        if (searchInput.value && searchInput.value.trim()) {
          renderSearchResults(searchInput.value);
        }
      });
    }

    if (searchResults) {
      searchResults.addEventListener('click', (event) => {
        const button = event.target.closest('.search-result');
        if (!button) return;
        const modelIndex = parseInt(button.dataset.modelIndex || '-1', 10);
        const itemId = button.dataset.itemId;
        activateSearchResult({ modelIndex, itemId });
      });
    }

    document.addEventListener('click', (event) => {
      if (!searchResults || searchResults.hidden) return;
      const target = event.target;
      if (searchResults.contains(target)) return;
      if (searchInput && (target === searchInput || searchInput.contains(target))) return;
      searchResults.hidden = true;
    });

    // Load from URL
    if (urlForm && urlInput && loadUrlButton) {
      urlForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = urlInput.value.trim();
        if (!url) {
          alert("Please enter a URL");
          urlInput.focus();
          return;
        }
        const idx = await loadFromUrl(url);
        if (typeof idx === 'number') {
          setActive(idx);
          urlInput.value = '';
          const hint = document.getElementById('urlHint');
          if (hint) hint.textContent = '';
        }
      });
    }

    // Show last 12 characters after user pauses typing
    (function attachUrlHint() {
      const hint = document.getElementById('urlHint');
      if (!urlInput || !hint) return;
      let timer = null;
      urlInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const value = urlInput.value;
          const tail = value.slice(-12);
          hint.textContent = tail ? `…${tail}` : '';
        }, 300);
      });
    })();

    // Helpers
    function rebuildFromActive() {
      if (activeIndex < 0) return;
      try {
        const parsed = parse(models[activeIndex].data);
        model = parsed;
        render();
      } catch (e) {
        console.error("[Blockscape] rebuild error (active model likely malformed):", e);
        alert("Active model parse/render error (see console).");
      }
    }

    // Load JSON files from same directory (for static hosting)
    async function loadJsonFiles() {
      const jsonFiles = ['comms.bs', 'planets.bs', 'styleguide.bs'];
      const joinPath = (name) => {
        if (!ASSET_BASE) return name;
        return ASSET_BASE.endsWith('/') ? `${ASSET_BASE}${name}` : `${ASSET_BASE}/${name}`;
      };
      
      for (const filename of jsonFiles) {
        try {
          const response = await fetch(joinPath(filename), { cache: 'no-store' });
          if (!response.ok) {
            console.warn(`[Blockscape] ${filename} not fetched (${response.status}); skipping`);
            continue;
          }

          const text = await response.text();
        const baseName = filename.replace(/\.[^.]+$/, '') || 'Model';
        const entries = normalizeToModelsFromText(text, baseName, { seriesTitleOverride: `${baseName} series` });
        if (!entries.length) {
          console.warn("[Blockscape] no models found in", filename);
          continue;
        }

        entries.forEach((entry) => {
            let payload = { ...entry };
            if (entry.isSeries) {
              const seriesTitle = `${baseName} series`;
              payload = { ...entry, title: seriesTitle, apicurioArtifactName: seriesTitle };
              const forcedSlug = makeSeriesId(seriesTitle || 'unknown');
              applySeriesSlug(payload, forcedSlug);
              ensureSeriesId(payload, { seriesName: seriesTitle, fallbackTitle: 'unknown' });
            }
            addModelEntry(payload, { versionLabel: filename });
        });
        console.log(`[Blockscape] loaded ${entries.length} model(s) from ${filename}`);
      } catch (error) {
        console.log("[Blockscape] could not load", filename, "- this is normal for file:// protocol", error);
      }
      }

      renderModelList();
    }

    async function fetchTextWithCacheBypass(url) {
      const attempts = [
        { cache: 'no-store' },
        { cache: 'reload' },
        {}
      ];
      let lastError = null;
      for (const opts of attempts) {
        try {
          console.log(`[Blockscape] fetching ${url} with cache="${opts.cache ?? 'default'}"`);
          const response = await fetch(url, opts);
          if (response.status === 304) {
            console.warn("[Blockscape] fetch returned 304 (Not Modified), retrying without cache");
            continue;
          }
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return await response.text();
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError || new Error('Unable to fetch URL');
    }

    function enhanceAbstractWithGistLinks(container) {
      if (!container) return;

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }

      textNodes.forEach(node => convertTextNodeLinks(node));

      container.querySelectorAll('a[href]').forEach(anchor => {
        const href = anchor.getAttribute('href');
        if (isGistUrl(href)) {
          attachGistLinkBehavior(anchor, href);
        }
      });
    }

    function convertTextNodeLinks(node) {
      if (!node || !node.nodeValue || !node.nodeValue.includes('http')) return;
      if (node.parentNode?.closest?.('a')) {
        return; // Skip text already wrapped in a link to avoid nesting anchors
      }
      const text = node.nodeValue;
      const regex = /(https?:\/\/[^\s<]+)/gi;
      const matches = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({ url: match[0], index: match.index });
      }
      if (!matches.length) return;

      const fragment = document.createDocumentFragment();
      let cursor = 0;
      matches.forEach(({ url, index }) => {
        if (index > cursor) {
          fragment.appendChild(document.createTextNode(text.slice(cursor, index)));
        }
        fragment.appendChild(createAutoLinkAnchor(url));
        cursor = index + url.length;
      });
      if (cursor < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(cursor)));
      }
      node.parentNode.replaceChild(fragment, node);
    }

    function createAutoLinkAnchor(url) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.textContent = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      if (isGistUrl(url)) {
        attachGistLinkBehavior(anchor, url);
      }
      return anchor;
    }

    function attachGistLinkBehavior(anchor, url) {
      if (!anchor || anchor.dataset.gistLinkBound === 'true') return;
      anchor.dataset.gistLinkBound = 'true';
      anchor.classList.add('blockscape-gist-link');
      anchor.title = 'Load this Gist into Blockscape';
      anchor.addEventListener('click', (event) => handleGistLinkClick(event, url, anchor));
    }

    async function handleGistLinkClick(event, url, anchor) {
      event.preventDefault();
      event.stopPropagation();
      if (!url || anchor.dataset.loading === 'true') return;
      anchor.dataset.loading = 'true';
      anchor.classList.add('is-loading');
      try {
        await loadFromUrl(url);
      } finally {
        anchor.dataset.loading = 'false';
        anchor.classList.remove('is-loading');
      }
    }

    function isGistUrl(candidate) {
      if (typeof candidate !== 'string') return false;
      try {
        const parsed = new URL(candidate, window.location.href);
        const host = parsed.hostname.toLowerCase();
        return host === 'gist.githubusercontent.com'
          || (host.startsWith('gist.') && host.endsWith('githubusercontent.com'));
      } catch {
        return false;
      }
    }

    // Load JSON from custom URL
    async function loadFromUrl(url) {
      try {
        console.log("[Blockscape] loading from URL:", url);
        const text = await fetchTextWithCacheBypass(url);
        const rawName = url.split('/').pop() || '';
        const baseName = rawName.replace(/\.[^.]+$/, '') || 'URL Model';
        let entries;
        try {
          entries = normalizeToModelsFromText(text, baseName);
        } catch (parseError) {
          throw new Error(`Invalid JSON payload: ${parseError.message}`);
        }
        if (!entries.length) {
          throw new Error('No JSON objects found in response.');
        }
        let firstIndex = null;
        entries.forEach((entry, idx) => {
          const dataTitle = (entry.data?.title ?? '').toString().trim();
          const fallbackTitle = entries.length > 1 ? `${baseName} #${idx + 1}` : baseName;
          const seriesName = entry.isSeries ? `${baseName} series` : null;
          let payload = { ...entry };
          if (entry.isSeries) {
            const seriesTitle = seriesName || dataTitle || payload.title || fallbackTitle;
            payload = {
              ...entry,
              title: seriesTitle,
              apicurioArtifactName: seriesTitle || entry.apicurioArtifactName,
            };
            const forcedSlug = makeSeriesId(seriesTitle || 'unknown');
            applySeriesSlug(payload, forcedSlug);
            ensureSeriesId(payload, { seriesName: seriesTitle || seriesName || 'unknown', fallbackTitle: 'unknown' });
            console.log('[Blockscape] loadFromUrl: series slug applied', { seriesSlug: forcedSlug, url, baseName, seriesTitle });
          }
          const idxResult = addModelEntry({
            ...payload,
            title: dataTitle || payload.title || fallbackTitle,
            apicurioArtifactName: payload.apicurioArtifactName || seriesName || entry.apicurioArtifactName
          }, { versionLabel: baseName });
          if (firstIndex == null) firstIndex = idxResult;
        });
        console.log(`[Blockscape] loaded ${entries.length} model(s) from URL:`, baseName);
        if (activeIndex === -1 && firstIndex != null) {
          setActive(firstIndex);
        } else {
          renderModelList();
        }
        return firstIndex;
      } catch (error) {
        console.error("[Blockscape] URL load error:", error);
        alert(`Failed to load JSON from URL: ${error.message}`);
        return null;
      }
    }

    // Bootstrap with Blockscape
    (async function bootstrap() {
      const seedEl = document.getElementById('seed');
      if (!seedEl) {
        throw new Error('Seed template not found in document.');
      }
      const seedRaw = (seedEl.textContent || seedEl.innerHTML || '').trim();
      if (!seedRaw) {
        throw new Error('Seed template is empty.');
      }
      const seedEntries = normalizeToModelsFromText(seedRaw, 'Blockscape');
      if (!seedEntries.length) {
        throw new Error('Seed template could not be parsed.');
      }

      let firstSeedIndex = null;
      seedEntries.forEach((entry) => {
        const idx = addModelEntry(entry, { versionLabel: 'seed' });
        if (firstSeedIndex == null) firstSeedIndex = idx;
      });
      
      // Try to load JSON files from same directory
      await loadJsonFiles();
      
      // Load explicit model from URL hash/search (?load= or #load=)
      const loadIndex = await consumeLoadParam();
      const editorResult = consumeEditorPayload();
      const editorIndex = editorResult?.index;
      const shareIndex = consumeShareLink();
      const initialIndex = typeof loadIndex === 'number'
        ? loadIndex
        : (typeof shareIndex === 'number'
          ? shareIndex
          : (typeof editorIndex === 'number' ? editorIndex : (firstSeedIndex ?? 0)));
      setActive(initialIndex);
    })();
}
