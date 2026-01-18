import { createApicurioIntegration } from "./apicurio";
import {
  collectAllItemIds,
  createItemEditor,
  updateItemReferences,
} from "./itemEditor";
import { createTileContextMenu } from "./tileContextMenu";
import { ensureSeriesId, getSeriesId, makeSeriesId } from "./series";
import {
  applySettingsSnapshot,
  buildSettingsSnapshot,
  formatSettings,
  downloadJson,
  tokens,
} from "./settings";

const ASSET_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "";

export function initBlockscape(featureOverrides = {}) {
  console.log("[Blockscape] init");

  const features = {
    localBackend: true,
    fileOpen: true,
    fileSave: true,
    autoLoadFromDir: true,
    showHeader: true,
    showSidebar: true,
    showFooter: true,
    showModelMeta: true,
    seriesNavMinVersions: 1,
    initialSettings: null,
    initialSettingsUrl: null,
    ...featureOverrides,
  };

  const jsonBox = document.getElementById("jsonBox");
  const jsonPanel = document.querySelector(".blockscape-json-panel");
  const app = document.getElementById("app");
  const overlay = document.getElementById("overlay");
  const tabTooltip = document.getElementById("tabTooltip");
  const modelList = document.getElementById("modelList");
  const preview = document.getElementById("itemPreview");
  const urlForm = document.getElementById("urlForm");
  const urlInput = document.getElementById("urlInput");
  const loadUrlButton = document.getElementById("loadUrl");
  const previewTitle = preview.querySelector(".item-preview__title");
  const previewBody = preview.querySelector(".item-preview__body");
  const previewActions = preview.querySelector(".item-preview__actions");
  const previewClose = preview.querySelector(".item-preview__close");
  const downloadButton = document.getElementById("downloadJson");
  const shareButton = document.getElementById("shareModel");
  const createVersionButton = document.getElementById("createVersion");
  const editButton = document.getElementById("openInEditor");
  const copyJsonButton = document.getElementById("copyJson");
  const copySeriesButton = document.getElementById("copySeries");
  const pasteJsonButton = document.getElementById("pasteJson");
  const helpButton = document.getElementById("helpButton");
  const newPanelButton = document.getElementById("newPanelButton");
  const newBlankButton = document.getElementById("newBlankButton");
  const shortcutHelp = document.getElementById("shortcutHelp");
  const shortcutHelpList = document.getElementById("shortcutHelpList");
  const shortcutHelpClose = document.getElementById("shortcutHelpClose");
  const shortcutHelpBackdrop = document.getElementById("shortcutHelpBackdrop");
  const newPanel = document.getElementById("newPanel");
  const newPanelClose = document.getElementById("newPanelClose");
  const newPanelBackdrop = document.getElementById("newPanelBackdrop");
  const searchInput = document.getElementById("search");
  const searchResults = document.getElementById("searchResults");
  const localBackendPanel = document.getElementById("localBackendPanel");
  const localBackendStatus = document.getElementById("localBackendStatus");
  const localFileList = document.getElementById("localFileList");
  const localDirSelect = document.getElementById("localDirSelect");
  const refreshLocalFilesButton = document.getElementById("refreshLocalFiles");
  const loadLocalFileButton = document.getElementById("loadLocalFile");
  const deleteLocalFileButton = document.getElementById("deleteLocalFile");
  const toggleServerSidebarButton =
    document.getElementById("toggleServerSidebar");
  const saveLocalFileButton = document.getElementById("saveLocalFile");
  const saveLocalFileAsButton = document.getElementById("saveLocalFileAs");
  const localSavePathInput = document.getElementById("localSavePath");
  const EDITOR_TRANSFER_KEY = "blockscape:editorPayload";
  const EDITOR_TRANSFER_MESSAGE_TYPE = "blockscape:editorTransfer";
  const SERVER_SIDEBAR_WIDE_STORAGE_KEY = "blockscape:serverSidebarWide";
  const defaultDocumentTitle = document.title;

  // Ensure local backend panel starts hidden; it will only unhide after a successful health check.
  if (localBackendPanel) localBackendPanel.hidden = true;
  if (!features.localBackend && localBackendPanel) localBackendPanel.hidden = true;
  if (!features.fileOpen) {
    if (loadLocalFileButton) loadLocalFileButton.hidden = true;
    if (localDirSelect) localDirSelect.hidden = true;
    if (refreshLocalFilesButton) refreshLocalFilesButton.hidden = true;
    if (deleteLocalFileButton) deleteLocalFileButton.hidden = true;
    if (localFileList) localFileList.hidden = true;
  }
  if (!features.fileSave) {
    if (saveLocalFileButton) saveLocalFileButton.hidden = true;
    if (saveLocalFileAsButton) saveLocalFileAsButton.hidden = true;
    if (localSavePathInput) localSavePathInput.hidden = true;
  }

  // Show the seed in the editor initially.
  jsonBox.value = document.getElementById("seed").textContent.trim();

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
    uid,
  });

  let model = null; // parsed result of active model: { m, fwd, rev, reusedLocal, seen }
  let index = new Map(); // id -> {el, catId, rect}
  let categoryIndex = new Map(); // catId -> { el, headEl }
  let selection = null;
  let selectedCategoryId = null;
  let selectionRelations = null;
  let categoryEntryHint = null;
  let showSecondaryLinks = true;
  let activeViewIsCategory = false;
  let showReusedInMap = false;
  let lastActiveTabId = "map";
  let lastDeletedItem = null;
  let lastDeletedCategory = null;
  let shortcutHelpListBuilt = false;
  let lastShortcutTrigger = null;
  const NOTICE_TIMEOUT_MS = 2000;
  let pendingSeriesNavigation = null;
  let pendingSeriesNavigationTimer = null;
  let pendingModelNavigation = null;
  let pendingModelNavigationTimer = null;
  let noticeEl = null;
  let noticeTextEl = null;
  let noticeTimer = null;
  let infoTooltipAutoHideTimer = null;
  let infoTabButton = null;
  let activeInfoTooltipHtml = "";
  let pendingInfoPreview = false;
  let infoTabTwinkleTimer = null;
  const versionThumbScroll = new Map(); // key -> scrollLeft
  let apicurioSettingsToggle = null;
  let activeSeriesPreviewTarget = null;
  let versionThumbLabels = [];
  let thumbLabelMeasureTimer = null;
  const MAX_SEARCH_RESULTS = 30;
  const SERIES_INFO_PREVIEW_DELAY = 1000;
  const TILE_HOVER_SCALE_STORAGE_KEY = "blockscape:hoverScale";
  const DEFAULT_TILE_HOVER_SCALE = 1.5;
  const MIN_TILE_HOVER_SCALE = 1;
  const MAX_TILE_HOVER_SCALE = 2.5;
  const SELECTION_DIM_OPACITY_STORAGE_KEY =
    "blockscape:selectionDimOpacity";
  const SELECTION_DIM_ENABLED_STORAGE_KEY =
    "blockscape:selectionDimEnabled";
  const DEFAULT_SELECTION_DIM_OPACITY = 0.2;
  const MIN_SELECTION_DIM_OPACITY = 0.05;
  const MAX_SELECTION_DIM_OPACITY = 1;
  const TITLE_WRAP_STORAGE_KEY = "blockscape:titleWrap";
  const TITLE_HOVER_WIDTH_STORAGE_KEY = "blockscape:titleHoverWidth";
  const TITLE_HOVER_TEXT_PORTION_STORAGE_KEY =
    "blockscape:titleHoverTextPortion";
  const DEFAULT_TITLE_WRAP_MODE = "wrap";
  const DEFAULT_TITLE_HOVER_WIDTH_MULTIPLIER = 1.3;
  const MIN_TITLE_HOVER_WIDTH_MULTIPLIER = 1;
  const MAX_TITLE_HOVER_WIDTH_MULTIPLIER = 1.6;
  const DEFAULT_TITLE_HOVER_TEXT_PORTION = 0.25;
  const MIN_TITLE_HOVER_TEXT_PORTION = 0;
  const MAX_TITLE_HOVER_TEXT_PORTION = 0.6;
  const TILE_COMPACTNESS_STORAGE_KEY = "blockscape:tileCompactness";
  const DEFAULT_TILE_COMPACTNESS = 1;
  const MIN_TILE_COMPACTNESS = 0.75;
  const MAX_TILE_COMPACTNESS = 1.25;
  const OBSIDIAN_LINK_ENABLED_STORAGE_KEY = "blockscape:obsidianLinksEnabled";
  const OBSIDIAN_LINK_MODE_STORAGE_KEY = "blockscape:obsidianLinkMode";
  const OBSIDIAN_VAULT_STORAGE_KEY = "blockscape:obsidianVault";
  const OBSIDIAN_LINK_MODE_TITLE = "title";
  const OBSIDIAN_LINK_MODE_ID = "id";
  const DEFAULT_OBSIDIAN_LINK_MODE = OBSIDIAN_LINK_MODE_TITLE;
  const AUTO_RELOAD_ENABLED_STORAGE_KEY = "blockscape:autoReloadEnabled";
  const AUTO_RELOAD_INTERVAL_STORAGE_KEY = "blockscape:autoReloadIntervalMs";
  const DEFAULT_AUTO_RELOAD_INTERVAL_MS = 1000;
  const MIN_AUTO_RELOAD_INTERVAL_MS = 500;
  const MAX_AUTO_RELOAD_INTERVAL_MS = 10000;
  const AUTO_ID_FROM_NAME_STORAGE_KEY = "blockscape:autoIdFromName";
  const DEFAULT_AUTO_ID_FROM_NAME = true;
  const COLOR_PRESETS_STORAGE_KEY = "blockscape:colorPresets";
  const CENTER_ITEMS_STORAGE_KEY = "blockscape:centerItems";
  const THEME_STORAGE_KEY = "blockscape:theme";
  const STAGE_COLUMN_COUNT = 4;
  const STAGE_MIN = 1;
  const STAGE_MAX = 4;
  const STAGE_ITEM_GAP = "0.2rem";
  const THEME_LIGHT = "light";
  const THEME_DARK = "dark";
  const CATEGORY_VIEW_VERSION_PREFIX = "cat:";
  const DEFAULT_CENTER_ITEMS = false;
  const DEP_COLOR_STORAGE_KEY = "blockscape:depColor";
  const REVDEP_COLOR_STORAGE_KEY = "blockscape:revdepColor";
  const LINK_THICKNESS_STORAGE_KEY = "blockscape:linkThickness";
  const LINK_EDGE_INSET_PX = 6;
  const LINK_THICKNESS = {
    s: { primary: 1.5, secondary: 1 },
    m: { primary: 3, secondary: 2.25 },
    l: { primary: 6, secondary: 4.5 },
  };
  let tileHoverScale = DEFAULT_TILE_HOVER_SCALE;
  let selectionDimOpacity = DEFAULT_SELECTION_DIM_OPACITY;
  let selectionDimEnabled = true;
  let tileCompactness = DEFAULT_TILE_COMPACTNESS;
  let titleWrapMode = DEFAULT_TITLE_WRAP_MODE;
  let titleHoverWidthMultiplier = DEFAULT_TITLE_HOVER_WIDTH_MULTIPLIER;
  let titleHoverTextPortion = DEFAULT_TITLE_HOVER_TEXT_PORTION;
  let obsidianLinksEnabled = false;
  let obsidianLinkMode = DEFAULT_OBSIDIAN_LINK_MODE;
  let obsidianVaultName = "";
  let autoIdFromNameEnabled = DEFAULT_AUTO_ID_FROM_NAME;
  let theme = THEME_LIGHT;
  let colorPresets = [];
  let centerItems = DEFAULT_CENTER_ITEMS;
  let depColor = "";
  let revdepColor = "";
  let linkThickness = "m";
  let renderColorPresetsUI = null;
  let stageGuidesOverlay = null;
  const SERIES_NAV_DOUBLE_CLICK_STORAGE_KEY =
    "blockscape:seriesNavDoubleClickMs";
  const DEFAULT_SERIES_NAV_DOUBLE_CLICK_MS = 900;
  const MIN_SERIES_NAV_DOUBLE_CLICK_MS = 300;
  const MAX_SERIES_NAV_DOUBLE_CLICK_MS = 4000;
  let seriesNavDoubleClickWaitMs = DEFAULT_SERIES_NAV_DOUBLE_CLICK_MS;
  const settingsUi = {
    hoverScaleInput: null,
    hoverScaleValue: null,
    selectionDimToggle: null,
    selectionDimInput: null,
    selectionDimValue: null,
    tileCompactnessInput: null,
    tileCompactnessValue: null,
    titleWrapInput: null,
    titleWidthInput: null,
    titleWidthValue: null,
    titleZoomInput: null,
    titleZoomValue: null,
    seriesNavInput: null,
    seriesNavValue: null,
    obsidianToggle: null,
    obsidianModeInputs: [],
    obsidianVaultInput: null,
    autoIdToggle: null,
    autoReloadToggle: null,
    autoReloadInput: null,
    autoReloadValue: null,
    secondaryLinksToggle: null,
    reusedToggle: null,
    themeToggle: null,
    tabThemeToggle: null,
    tabSecondaryLinksToggle: null,
    tabCenterToggle: null,
    colorPresetList: null,
    depColorInput: null,
    revdepColorInput: null,
    linkThicknessInput: null,
  };
  const disabledLocalBackend = {
    detect: async () => false,
    refresh: async () => {},
    updateActiveSavePlaceholder() {},
    isAvailable: () => false,
    highlightSource() {},
    getAutoReloadConfig: () => ({
      enabled: false,
      intervalMs: DEFAULT_AUTO_RELOAD_INTERVAL_MS,
    }),
    setAutoReloadEnabled() {},
    setAutoReloadInterval() {},
    saveModelByIndex: async () => false,
  };
  const localBackend = features.localBackend
    ? createLocalBackend()
    : disabledLocalBackend;
  const initialBackendCheck = features.localBackend
    ? localBackend.detect()
    : Promise.resolve(false);
  apicurio.hydrateConfig();
  applyTheme(readStoredTheme());
  setColorPresets(loadColorPresets(), { silent: true });
  initializeDepColor();
  initializeRevdepColor();
  initializeLinkThickness();
  initializeTileHoverScale();
  initializeSelectionDimOpacity();
  initializeTileCompactness();
  initializeTitleWrapMode();
  initializeTitleHoverWidthMultiplier();
  initializeTitleHoverTextPortion();
  initializeSeriesNavDoubleClickWait();
  initializeObsidianLinksEnabled();
  initializeObsidianLinkMode();
  initializeObsidianVaultName();
  initializeSelectionDimEnabled();
  initializeAutoIdFromNameEnabled();
  initializeCenterItems();
  syncSelectionClass();

  // ===== Utilities =====
  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function base64Encode(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
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
    return base64Encode(text)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  function base64UrlDecode(token) {
    let base64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) base64 += "=".repeat(4 - pad);
    return base64Decode(base64);
  }

  const download = (filename, text) => downloadJson(filename, text);

  function normalizeSettingsPayload(candidate) {
    if (!candidate || typeof candidate !== "object") return null;
    if (candidate.settings && typeof candidate.settings === "object") {
      return candidate.settings;
    }
    return candidate;
  }

  async function fetchInitialSettingsSnapshot(url) {
    if (!url) return null;
    const urls = Array.isArray(url) ? url : [url];
    const candidates = [];
    urls.forEach((entry) => {
      if (typeof entry === "string" && entry.trim()) {
        candidates.push(entry.trim());
        try {
          const absolute = new URL(entry, window.location.origin).toString();
          if (absolute !== entry.trim()) {
            candidates.push(absolute);
          }
        } catch {
          // ignore URL parse errors; we'll try the raw entry
        }
      }
    });
    const attempted = new Set();
    for (const candidate of candidates) {
      if (attempted.has(candidate)) continue;
      attempted.add(candidate);
      try {
        const text = await fetchTextWithCacheBypass(candidate);
        const parsed = JSON.parse(text);
        const snapshot = normalizeSettingsPayload(parsed);
        if (snapshot) return snapshot;
      } catch (error) {
        console.warn(
          "[Blockscape] initial settings fetch failed",
          candidate,
          error
        );
      }
    }
    return null;
  }

  async function applyInitialSettings() {
    const refresh =
      typeof refreshObsidianLinks === "function" ? refreshObsidianLinks : null;
    const sources = [];
    if (features.initialSettings) {
      sources.push({ type: "inline", snapshot: features.initialSettings });
    }
    if (features.initialSettingsUrl) {
      sources.push({
        type: "url",
        url: features.initialSettingsUrl,
      });
    }
    let appliedCount = 0;
    for (const source of sources) {
      try {
        const snapshot =
          source.type === "inline"
            ? normalizeSettingsPayload(source.snapshot)
            : await fetchInitialSettingsSnapshot(source.url);
        if (!snapshot) continue;
        const result = applyImportedSettings(snapshot, {
          refreshObsidianLinks: refresh,
        });
        const applied = result?.applied || [];
        if (applied.length) {
          appliedCount += applied.length;
          console.log(
            `[Blockscape] applied ${applied.length} setting${
              applied.length === 1 ? "" : "s"
            } from ${source.type === "inline" ? "inline config" : source.url}.`
          );
        }
      } catch (error) {
        console.warn("[Blockscape] initial settings apply failed", error);
      }
    }
    return appliedCount;
  }

  function readStoredTheme() {
    if (typeof window === "undefined" || !window.localStorage)
      return THEME_LIGHT;
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      return stored === THEME_DARK ? THEME_DARK : THEME_LIGHT;
    } catch (err) {
      return THEME_LIGHT;
    }
  }

  function persistTheme(nextTheme) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (err) {
      console.warn("[Blockscape] theme persistence failed", err);
    }
  }

  function applyTheme(nextTheme) {
    const normalized = nextTheme === THEME_DARK ? THEME_DARK : THEME_LIGHT;
    theme = normalized;
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", normalized);
    }
    persistTheme(normalized);
    return theme;
  }

  function persistCenterItems(enabled) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        CENTER_ITEMS_STORAGE_KEY,
        enabled ? "true" : "false"
      );
    } catch (error) {
      console.warn("[Blockscape] failed to persist center items", error);
    }
  }

  function applyCenterItems(enabled) {
    centerItems = !!enabled;
    if (app) {
      app.classList.toggle("is-center-mode", centerItems);
      app.querySelectorAll(".grid").forEach((grid) => {
        grid.classList.toggle("is-centered", centerItems);
      });
      app.querySelectorAll(".tile-add").forEach((btn) => {
        btn.hidden = centerItems;
        btn.tabIndex = centerItems ? -1 : 0;
        btn.setAttribute("aria-hidden", centerItems ? "true" : "false");
      });
      app.querySelectorAll(".category-add").forEach((btn) => {
        btn.hidden = centerItems;
        btn.tabIndex = centerItems ? -1 : 0;
        btn.setAttribute("aria-hidden", centerItems ? "true" : "false");
      });
    }
    syncStageGuidesVisibility();
    applyStageLayout();
    if (model) {
      reflowRects();
      drawLinks();
    }
    return centerItems;
  }

  function initializeCenterItems() {
    if (typeof window === "undefined" || !window.localStorage) {
      return applyCenterItems(DEFAULT_CENTER_ITEMS);
    }
    try {
      const stored = window.localStorage.getItem(CENTER_ITEMS_STORAGE_KEY);
      if (stored == null) return applyCenterItems(DEFAULT_CENTER_ITEMS);
      return applyCenterItems(stored === "true" || stored === "1");
    } catch (error) {
      console.warn("[Blockscape] failed to read center items pref", error);
      return applyCenterItems(DEFAULT_CENTER_ITEMS);
    }
  }

  function normalizeStageValue(stage) {
    if (stage == null) return null;
    const num = Number(stage);
    if (!Number.isFinite(num)) return null;
    const rounded = Math.round(num);
    if (rounded < STAGE_MIN || rounded > STAGE_MAX) return null;
    return rounded;
  }

  function applyStageLayout() {
    if (!app) return;
    const template = `repeat(${STAGE_COLUMN_COUNT}, minmax(var(--blockscape-tile), 1fr))`;
    app.querySelectorAll(".grid").forEach((grid) => {
      const stagedTiles = Array.from(
        grid.querySelectorAll(".tile[data-stage]")
      ).map((tile, idx) => ({
        tile,
        stage: normalizeStageValue(tile.dataset.stage),
        order: idx,
      }));
      const hasStagedItems = stagedTiles.some((entry) => entry.stage);
      const enableStaging = centerItems && hasStagedItems;
      if (enableStaging) {
        grid.style.gridTemplateColumns = template;
        grid.style.gridAutoFlow = "row";
        grid.style.justifyContent = "space-between";
        grid.style.justifyItems = "start";
        grid.style.columnGap = STAGE_ITEM_GAP;
        grid.style.rowGap = STAGE_ITEM_GAP;
      } else {
        grid.style.removeProperty("grid-template-columns");
        grid.style.removeProperty("grid-auto-flow");
        grid.style.removeProperty("justify-content");
        grid.style.removeProperty("justify-items");
        grid.style.removeProperty("column-gap");
        grid.style.removeProperty("row-gap");
      }
      const resetTilePlacement = (tile) => {
        tile.style.removeProperty("grid-column");
        tile.style.removeProperty("grid-row");
      };
      grid.querySelectorAll(".tile").forEach(resetTilePlacement);
      if (!enableStaging) return;

      const staged = stagedTiles
        .filter((entry) => entry.stage)
        .sort((a, b) => {
          if (a.stage !== b.stage) return a.stage - b.stage;
          return a.order - b.order;
        });

      const takeColumn = (preferred, usedMap, stageValue) => {
        if (usedMap.has(preferred)) {
          const existingStage = usedMap.get(preferred);
          if (existingStage === stageValue) {
            return { col: preferred, needsNewRow: true };
          }
        }
        const maxDelta = STAGE_COLUMN_COUNT - 1;
        for (let delta = 0; delta <= maxDelta; delta += 1) {
          const candidates = [];
          if (preferred - delta >= STAGE_MIN) candidates.push(preferred - delta);
          if (delta !== 0 && preferred + delta <= STAGE_MAX)
            candidates.push(preferred + delta);
          for (const col of candidates) {
            if (!usedMap.has(col)) return { col, needsNewRow: false };
          }
        }
        return { col: null, needsNewRow: false };
      };

      let currentRow = 1;
      let usedColumns = new Map();
      staged.forEach(({ tile, stage }) => {
        let attempt = takeColumn(stage, usedColumns, stage);
        if (attempt.needsNewRow) {
          currentRow += 1;
          usedColumns = new Map();
          attempt = takeColumn(stage, usedColumns, stage);
        }
        if (attempt.col == null) return;
        usedColumns.set(attempt.col, stage);
        tile.style.gridColumn = String(attempt.col);
        tile.style.gridRow = String(currentRow);
      });
    });
    syncStageGuidesVisibility();
  }

  function syncStageGuidesVisibility() {
    if (!stageGuidesOverlay) return;
    stageGuidesOverlay.hidden = !centerItems;
  }

  function getCssVarValue(varName) {
    if (typeof window === "undefined") return "";
    const styles = getComputedStyle(document.documentElement);
    return styles.getPropertyValue(varName).trim();
  }

  function setCssVarValue(varName, value) {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty(varName, value);
  }

  function normalizeHexColor(value, fallback) {
    const raw = (value || "").toString().trim();
    const match = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) return fallback;
    if (raw.length === 4) {
      return (
        "#" +
        raw
          .slice(1)
          .split("")
          .map((ch) => ch + ch)
          .join("")
      );
    }
    return raw.toLowerCase();
  }

  function resolveColor(value, { fallbackVar, fallbackColor }) {
    const raw = (value || "").toString().trim();
    const varMatch = raw.match(/^var\((--[^)]+)\)$/);
    if (varMatch) {
      const resolved = getCssVarValue(varMatch[1]);
      if (resolved) return normalizeHexColor(resolved, fallbackColor);
      if (fallbackVar) {
        const fallbackResolved = getCssVarValue(fallbackVar);
        if (fallbackResolved)
          return normalizeHexColor(fallbackResolved, fallbackColor);
      }
    }
    return normalizeHexColor(raw, fallbackColor);
  }

  function readStoredColor(key) {
    if (typeof window === "undefined" || !window.localStorage) return "";
    try {
      return window.localStorage.getItem(key) || "";
    } catch (error) {
      console.warn("[Blockscape] failed to read stored color", key, error);
      return "";
    }
  }

  function persistDepColor(next) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(DEP_COLOR_STORAGE_KEY, next);
    } catch (error) {
      console.warn("[Blockscape] failed to persist dep color", error);
    }
  }

  function persistRevdepColor(next) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(REVDEP_COLOR_STORAGE_KEY, next);
    } catch (error) {
      console.warn("[Blockscape] failed to persist revdep color", error);
    }
  }

  function applyDepColor(next) {
    const applied = resolveColor(next, {
      fallbackVar: "--color-primary",
      fallbackColor: tokens.color.primary,
    });
    depColor = applied;
    setCssVarValue("--blockscape-dep", applied);
    if (overlay) drawLinks();
    return depColor;
  }

  function applyRevdepColor(next) {
    const applied = resolveColor(next, {
      fallbackVar: "--color-danger",
      fallbackColor: tokens.blockscape.revdep,
    });
    revdepColor = applied;
    setCssVarValue("--blockscape-revdep", applied);
    if (overlay) drawLinks();
    return revdepColor;
  }

  function initializeDepColor() {
    const stored = readStoredColor(DEP_COLOR_STORAGE_KEY);
    const applied = applyDepColor(
      stored || getCssVarValue("--blockscape-dep") || tokens.color.primary
    );
    persistDepColor(applied);
    return applied;
  }

  function initializeRevdepColor() {
    const stored = readStoredColor(REVDEP_COLOR_STORAGE_KEY);
    const applied = applyRevdepColor(
      stored || getCssVarValue("--blockscape-revdep") || tokens.blockscape.revdep
    );
    persistRevdepColor(applied);
    return applied;
  }

  function normalizeLinkThickness(value) {
    const next = (value || "").toString().toLowerCase();
    if (next === "s" || next === "l") return next;
    return "m";
  }

  function getLinkStrokeWidths() {
    return LINK_THICKNESS[linkThickness] || LINK_THICKNESS.m;
  }

  function applyLinkThickness(next) {
    linkThickness = normalizeLinkThickness(next);
    drawLinks();
    return linkThickness;
  }

  function persistLinkThickness(value) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(LINK_THICKNESS_STORAGE_KEY, value);
    } catch (error) {
      console.warn("[Blockscape] failed to persist link thickness", error);
    }
  }

  function initializeLinkThickness() {
    if (typeof window === "undefined" || !window.localStorage) {
      return applyLinkThickness("m");
    }
    try {
      const stored = window.localStorage.getItem(LINK_THICKNESS_STORAGE_KEY);
      const applied = applyLinkThickness(stored || "m");
      persistLinkThickness(applied);
      return applied;
    } catch (error) {
      console.warn("[Blockscape] failed to read link thickness", error);
      return applyLinkThickness("m");
    }
  }

  function normalizeColorPresets(list) {
    const isHex = (val) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val || "");
    if (!Array.isArray(list)) return defaultColorPresets();
    const cleaned = list
      .map((entry) => ({
        name: (entry?.name || "").toString().trim() || "Custom",
        value: (entry?.value || "").toString().trim(),
      }))
      .filter((entry) => isHex(entry.value));
    return cleaned.length ? cleaned : defaultColorPresets();
  }

  function defaultColorPresets() {
    return [
      { name: "Black", value: tokens.color.ink },
      { name: "White", value: tokens.color.white },
      { name: "Red", value: tokens.blockscape.revdep },
      { name: "Green", value: tokens.color.success },
    ];
  }

  function loadColorPresets() {
    if (typeof window === "undefined" || !window.localStorage) {
      return defaultColorPresets();
    }
    try {
      const raw = window.localStorage.getItem(COLOR_PRESETS_STORAGE_KEY);
      if (!raw) return defaultColorPresets();
      const parsed = JSON.parse(raw);
      return normalizeColorPresets(parsed);
    } catch (err) {
      console.warn("[Blockscape] failed to load color presets", err);
      return defaultColorPresets();
    }
  }

  function persistColorPresets(list) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        COLOR_PRESETS_STORAGE_KEY,
        JSON.stringify(list)
      );
    } catch (err) {
      console.warn("[Blockscape] failed to persist color presets", err);
    }
  }

  function setColorPresets(list, { silent = false } = {}) {
    colorPresets = normalizeColorPresets(list);
    persistColorPresets(colorPresets);
    if (!silent && typeof updateTileMenuColors === "function") {
      updateTileMenuColors(colorPresets);
    }
    renderColorPresetsUI?.();
    return colorPresets;
  }

  function isLocalBackendOptIn() {
    if (typeof window === "undefined" || !window.location) return false;
    const url = new URL(window.location.href);
    const normalizedPath = url.pathname.replace(/\/+$/, "");
    const segments = normalizedPath.split("/").filter(Boolean);
    const searchFlag = url.searchParams.get("server");
    const hasServerPrefix =
      segments[0] && segments[0].toLowerCase() === "server";
    return (
      hasServerPrefix ||
      (searchFlag &&
        ["1", "true", "yes", "on"].includes(searchFlag.toLowerCase()))
    );
  }

  function updateUrlForServerPath(relPath, { modelId, itemId } = {}) {
    if (typeof window === "undefined" || !window.location || !relPath) return;
    const normalized = normalizeLocalSavePath(relPath);
    if (!normalized) return;
    const activeModel = models[activeIndex];
    const normalizedSource = normalizeLocalSavePath(activeModel?.sourcePath);
    const resolvedModelId =
      modelId ??
      (normalizedSource && normalizedSource === normalized
        ? getModelId(activeModel)
        : null);
    const resolvedItemId =
      itemId ??
      (normalizedSource && normalizedSource === normalized ? selection : null);
    const encodedPathSegments = normalized
      .split("/")
      .filter(Boolean)
      .map((part) => encodeURIComponent(part));
    const encodedModel = resolvedModelId
      ? encodeURIComponent(resolvedModelId)
      : null;
    const encodedItem = resolvedItemId
      ? encodeURIComponent(resolvedItemId)
      : null;
    try {
      const url = new URL(window.location.href);
      const cleanedSearch = new URLSearchParams(url.search);
      cleanedSearch.delete("load");
      cleanedSearch.delete("share");
      const newPath = [
        "",
        "server",
        ...encodedPathSegments,
        ...(encodedModel ? [encodedModel] : []),
        ...(encodedItem ? [encodedItem] : []),
      ]
        .join("/")
        .replace(/\/+/g, "/");
      url.pathname = newPath;
      url.search = cleanedSearch.toString()
        ? `?${cleanedSearch.toString()}`
        : "";
      url.hash = "";
      window.history.replaceState({}, document.title, url.toString());
    } catch (err) {
      console.warn("[Blockscape] failed to update URL for server path", err);
    }
  }

  function extractServerFilePathFromUrl() {
    if (typeof window === "undefined" || !window.location) return null;
    const url = new URL(window.location.href);
    const normalizedPath = url.pathname.replace(/\/+$/, "");
    const segments = normalizedPath.split("/").filter(Boolean);
    const serverIndex = segments.findIndex(
      (segment) => segment.toLowerCase() === "server"
    );
    if (serverIndex === -1) return null;
    const remainder = segments.slice(serverIndex + 1);
    if (!remainder.length) return null;
    const bsIndex = remainder.findIndex((part) =>
      part.toLowerCase().endsWith(".bs")
    );
    if (bsIndex === -1) return null;
    const fileParts = remainder.slice(0, bsIndex + 1);
    const extraParts = remainder.slice(bsIndex + 1);
    const decodePart = (part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    };
    const decodedFile = fileParts.map(decodePart);
    const decodedExtras = extraParts.map(decodePart);
    const joined = decodedFile.join("/");
    const normalized = normalizeLocalSavePath(joined);
    if (!normalized) return null;
    const modelId = decodedExtras[0] ? decodedExtras[0].trim() : null;
    const itemId = decodedExtras[1] ? decodedExtras[1].trim() : null;
    return { path: normalized, modelId: modelId || null, itemId: itemId || null };
  }

  function updateServerUrlFromActive({ itemId } = {}) {
    const active = models[activeIndex];
    if (!active?.sourcePath) return;
    updateUrlForServerPath(active.sourcePath, {
      modelId: getModelId(active),
      itemId: itemId === undefined ? selection : itemId,
    });
  }

  function isGithubPagesHost() {
    if (typeof window === "undefined" || !window.location) return false;
    const host = (window.location.hostname || "").toLowerCase();
    return host.endsWith("github.io");
  }

  function readServerSidebarWide() {
    if (typeof window === "undefined" || !window.localStorage) return true;
    try {
      const raw = window.localStorage.getItem(SERVER_SIDEBAR_WIDE_STORAGE_KEY);
      if (raw == null) return true;
      return raw === "true";
    } catch (err) {
      return true;
    }
  }

  function persistServerSidebarWide(value) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        SERVER_SIDEBAR_WIDE_STORAGE_KEY,
        value ? "true" : "false"
      );
    } catch (err) {
      console.warn("[Blockscape] failed to persist sidebar width", err);
    }
  }

  function applyServerSidebarWide(value) {
    if (typeof document === "undefined") return;
    document.body?.classList.toggle(
      "blockscape-server-sidebar-wide",
      !!value
    );
    if (!toggleServerSidebarButton) return;
    toggleServerSidebarButton.setAttribute(
      "aria-pressed",
      value ? "true" : "false"
    );
    toggleServerSidebarButton.textContent = value ? "<" : ">";
    toggleServerSidebarButton.title = value
      ? "Switch to thin menu"
      : "Switch to wide menu";
  }

  function setupServerSidebarToggle(enabled) {
    if (!toggleServerSidebarButton) return;
    toggleServerSidebarButton.hidden = !enabled;
    if (!enabled) return;
    let isWide = readServerSidebarWide();
    applyServerSidebarWide(isWide);
    toggleServerSidebarButton.onclick = () => {
      isWide = !isWide;
      persistServerSidebarWide(isWide);
      applyServerSidebarWide(isWide);
    };
  }

  function createLocalBackend() {
    const debugContext = () => {
      if (typeof window === "undefined" || !window.location) return {};
      return {
        host: window.location.host,
        path: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      };
    };

    function debug(message, extra = {}) {
      console.log("[Blockscape][local-backend]", message, {
        ...debugContext(),
        ...extra,
      });
    }

    if (isGithubPagesHost()) {
      debug("Disabled on github.io host");
      if (localBackendPanel) localBackendPanel.hidden = true;
      return {
        detect: async () => false,
        refresh: async () => {},
        updateActiveSavePlaceholder() {},
        isAvailable: () => false,
      };
    }

    const optIn = isLocalBackendOptIn();
    if (optIn && typeof document !== "undefined") {
      document.body?.classList.add("blockscape-server-mode");
    }
    setupServerSidebarToggle(optIn);
    if (!optIn || !localBackendPanel || !localBackendStatus) {
      debug("Opt-in flag missing or panel unavailable");
      if (localBackendPanel) localBackendPanel.hidden = true;
      return {
        detect: async () => false,
        refresh: async () => {},
        updateActiveSavePlaceholder() {},
        isAvailable: () => false,
      };
    }

    if (!localBackendPanel || !localBackendStatus) {
      return {
        detect: async () => false,
        refresh: async () => {},
        updateActiveSavePlaceholder() {},
        isAvailable: () => false,
      };
    }

    let available = false;
    let lastKnownPath = "";
    let files = [];
    let dirs = [];
    let currentDir = "";
    let knownMtimes = new Map();
    let autoReloadEnabled = readAutoReloadEnabled();
    let autoReloadIntervalMs = readAutoReloadInterval();
    let autoReloadTimer = null;
    let autoReloadInFlight = false;
    const autoReloadPauseReasons = new Set();

    function isAutoReloadPaused() {
      return autoReloadPauseReasons.size > 0;
    }

    function readAutoReloadEnabled() {
      if (typeof window === "undefined" || !window.localStorage) return true;
      try {
        const raw = window.localStorage.getItem(
          AUTO_RELOAD_ENABLED_STORAGE_KEY
        );
        if (raw == null) return true;
        return raw === "true";
      } catch (err) {
        return true;
      }
    }

    function persistAutoReloadEnabled(value) {
      if (typeof window === "undefined" || !window.localStorage) return;
      try {
        window.localStorage.setItem(
          AUTO_RELOAD_ENABLED_STORAGE_KEY,
          value ? "true" : "false"
        );
      } catch (err) {
        console.warn("[Blockscape] auto-reload: failed to persist", err);
      }
    }

    function readAutoReloadInterval() {
      if (typeof window === "undefined" || !window.localStorage)
        return DEFAULT_AUTO_RELOAD_INTERVAL_MS;
      try {
        const raw = window.localStorage.getItem(
          AUTO_RELOAD_INTERVAL_STORAGE_KEY
        );
        if (!raw) return DEFAULT_AUTO_RELOAD_INTERVAL_MS;
        const parsed = parseInt(raw, 10);
        return clampAutoReloadInterval(parsed);
      } catch (err) {
        return DEFAULT_AUTO_RELOAD_INTERVAL_MS;
      }
    }

    function persistAutoReloadInterval(value) {
      if (typeof window === "undefined" || !window.localStorage) return;
      try {
        window.localStorage.setItem(
          AUTO_RELOAD_INTERVAL_STORAGE_KEY,
          String(value)
        );
      } catch (err) {
        console.warn("[Blockscape] auto-reload: failed to persist interval", err);
      }
    }

    function clampAutoReloadInterval(value) {
      if (!Number.isFinite(value)) return DEFAULT_AUTO_RELOAD_INTERVAL_MS;
      return Math.min(
        MAX_AUTO_RELOAD_INTERVAL_MS,
        Math.max(MIN_AUTO_RELOAD_INTERVAL_MS, value)
      );
    }

    function dirOfPath(p) {
      if (!p) return "";
      const parts = p.split("/").filter(Boolean);
      parts.pop();
      return parts.join("/");
    }

    function setStatus(text, { error = false } = {}) {
      localBackendStatus.textContent = text;
      localBackendStatus.style.color = error ? tokens.color.dangerStrong : "";
      debug("Status", { text, error });
    }

    function normalizeSavePath(raw) {
      return normalizeLocalSavePath(raw);
    }

    function resolvePayloadForSave(entry) {
      const seriesPayload = buildSeriesPayload(entry);
      if (seriesPayload) return { payload: seriesPayload, isSeries: true };
      return { payload: entry?.data, isSeries: false };
    }

    function defaultSaveName() {
      if (activeIndex >= 0 && models[activeIndex]?.sourcePath) {
        return models[activeIndex].sourcePath;
      }
      if (activeIndex < 0) return "blockscape.bs";
      const title = getModelTitle(models[activeIndex]) || "blockscape";
      return `${makeSeriesId(title, "blockscape")}.bs`;
    }

    function updateActiveSavePlaceholder() {
      if (!localSavePathInput) return;
      localSavePathInput.placeholder = defaultSaveName();
      if (models[activeIndex]?.sourcePath) {
        localSavePathInput.value = models[activeIndex].sourcePath;
      }
    }

    function renderDirFilter() {
      if (!localDirSelect) return;
      localDirSelect.innerHTML = "";
      const rootOption = document.createElement("option");
      rootOption.value = "";
      rootOption.textContent = "Root (~/blockscape)";
      localDirSelect.appendChild(rootOption);
      dirs.forEach((dir) => {
        const opt = document.createElement("option");
        opt.value = dir;
        opt.textContent = dir || "(root)";
        localDirSelect.appendChild(opt);
      });
      const desired = dirs.includes(currentDir) ? currentDir : "";
      localDirSelect.value = desired;
      currentDir = desired;
    }

    function renderFiles() {
      if (!localFileList) return;
      localFileList.innerHTML = "";
      const filtered = files.filter((f) => dirOfPath(f.path) === currentDir);
      if (!filtered.length) {
        const option = document.createElement("option");
        option.disabled = true;
        option.textContent = "No .bs files found yet";
        localFileList.appendChild(option);
        localFileList.disabled = true;
        return;
      }

      localFileList.disabled = false;
      filtered.forEach((file) => {
        const option = document.createElement("option");
        option.value = file.path;
        const mtime = file.mtimeMs
          ? new Date(file.mtimeMs).toLocaleString()
          : "";
        option.textContent = mtime ? `${file.path} · ${mtime}` : file.path;
        localFileList.appendChild(option);
      });
      if (lastKnownPath) {
        Array.from(localFileList.options).forEach((opt) => {
          if (opt.value === lastKnownPath) opt.selected = true;
        });
      }
      if (!localFileList.value && localFileList.options.length) {
        localFileList.options[0].selected = true;
      }
    }

    function highlightSourcePath(path) {
      if (!available || !localFileList || !path) return;
      const match = files.find((f) => f.path === path);
      if (!match) return;
      const dir = dirOfPath(path);
      if (dir !== currentDir) {
        currentDir = dir;
        renderDirFilter();
      }
      renderFiles();
      Array.from(localFileList.options).forEach((opt) => {
        opt.selected = opt.value === path;
      });
      const selected = Array.from(localFileList.options).find(
        (opt) => opt.value === path
      );
      if (selected?.scrollIntoView) {
        selected.scrollIntoView({ block: "nearest" });
      }
      if (localSavePathInput) {
        localSavePathInput.value = path;
      }
    }

    function stopAutoReloadTimer() {
      if (autoReloadTimer) {
        clearInterval(autoReloadTimer);
        autoReloadTimer = null;
      }
    }

    function syncAutoReloadTimer() {
      stopAutoReloadTimer();
      if (!available || !autoReloadEnabled || isAutoReloadPaused()) return;
      autoReloadTimer = setInterval(checkFileChanges, autoReloadIntervalMs);
    }

    function pauseAutoReload(reason) {
      if (!reason) return;
      const sizeBefore = autoReloadPauseReasons.size;
      autoReloadPauseReasons.add(reason);
      if (autoReloadPauseReasons.size !== sizeBefore) {
        debug("Auto-reload paused", { reason });
        syncAutoReloadTimer();
      }
    }

    function resumeAutoReload(reason) {
      if (!reason) return;
      const removed = autoReloadPauseReasons.delete(reason);
      if (removed) {
        debug("Auto-reload resumed", { reason });
        syncAutoReloadTimer();
      }
    }

    async function reloadModelFromSource(path) {
      const idx = models.findIndex((m) => m.sourcePath === path);
      if (idx === -1) return;
      try {
        const resp = await fetch(
          `/api/file?path=${encodeURIComponent(path)}`,
          { cache: "no-store" }
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const payload = await resp.json();
        const text = JSON.stringify(payload.data ?? payload, null, 2);
        const entries = normalizeToModelsFromText(text, path, {
          seriesTitleOverride: `${path} series`,
        });
        if (!entries.length) return;
        const next = entries[0];
        next.sourcePath = path;
        ensureModelMetadata(next, {
          titleHint: getModelTitle(models[idx]),
          idHint: getModelId(models[idx]),
        });
        if (next.isSeries) {
          const seriesTitle =
            next.title || getModelTitle(next) || getModelTitle(models[idx]);
          const forcedSlug = makeSeriesId(seriesTitle || "unknown");
          applySeriesSlug(next, forcedSlug);
          ensureSeriesId(next, {
            seriesName: seriesTitle || "unknown",
            fallbackTitle: "unknown",
          });
        }
        models[idx] = {
          ...models[idx],
          ...next,
          title: next.title || getModelTitle(next),
          data: next.data,
          sourcePath: path,
        };
        if (idx === activeIndex) {
          loadActiveIntoEditor();
          rebuildFromActive();
        } else {
          renderModelList();
        }
        console.log("[Blockscape] auto-reloaded model from", path);
      } catch (err) {
        console.warn("[Blockscape] auto-reload failed for", path, err);
      }
    }

    async function checkFileChanges() {
      if (
        !available ||
        !autoReloadEnabled ||
        isAutoReloadPaused() ||
        autoReloadInFlight
      )
        return;
      autoReloadInFlight = true;
      try {
        const response = await fetch("/api/files", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const list = (payload.files || []).slice().sort((a, b) => {
          const aTime = a?.mtimeMs || 0;
          const bTime = b?.mtimeMs || 0;
          if (aTime === bTime) return (a.path || "").localeCompare(b.path || "");
          return bTime - aTime;
        });
        const newMap = new Map();
        list.forEach((f) => newMap.set(f.path, f.mtimeMs || 0));
        const pathsToCheck = models
          .map((m, idx) => ({ path: m.sourcePath, idx }))
          .filter((m) => m.path);
        for (const entry of pathsToCheck) {
          const prev = knownMtimes.get(entry.path) || 0;
          const next = newMap.get(entry.path) || 0;
          if (next > prev) {
            await reloadModelFromSource(entry.path);
          }
        }
        files = list;
        const dirSet = new Set();
        files.forEach((f) => dirSet.add(dirOfPath(f.path)));
        dirs = Array.from(dirSet).filter((d) => d !== "").sort();
        knownMtimes = newMap;
        renderDirFilter();
        renderFiles();
      } catch (err) {
        console.warn("[Blockscape] auto-reload check failed", err);
      } finally {
        autoReloadInFlight = false;
      }
    }

    function startAutoReloadTimer() {
      syncAutoReloadTimer();
    }

    function setAutoReloadEnabled(enabled) {
      autoReloadEnabled = !!enabled;
      persistAutoReloadEnabled(autoReloadEnabled);
      syncAutoReloadTimer();
    }

    function setAutoReloadInterval(ms) {
      autoReloadIntervalMs = clampAutoReloadInterval(ms);
      persistAutoReloadInterval(autoReloadIntervalMs);
      syncAutoReloadTimer();
      return autoReloadIntervalMs;
    }

    function hidePanel(message) {
      available = false;
      files = [];
      knownMtimes = new Map();
      stopAutoReloadTimer();
      renderFiles();
      localBackendPanel.hidden = true;
      if (message) setStatus(message, { error: true });
      debug("Panel hidden", { message });
    }

    async function checkHealth({ silent = false } = {}) {
      try {
        debug("Health check start");
        const resp = await fetch("/api/health", { cache: "no-store" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const payload = await resp.json();
        available = !!payload?.ok;
        if (!available) throw new Error("Health check failed");
        localBackendPanel.hidden = false;
        if (!silent) {
          setStatus(
            payload.root
              ? `Local server ready (root: ${payload.root})`
              : "Local server ready"
          );
        }
        debug("Health check ok", { payload });
        return true;
      } catch (err) {
        if (!silent) {
          console.log("[Blockscape] local backend health failed", err);
        }
        hidePanel("Local server unavailable");
        return false;
      }
    }

    async function refresh() {
      if (!available) return;
      if (!localFileList) return;
      setStatus("Loading files…");
      try {
        const response = await fetch("/api/files", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        files = (payload.files || []).slice().sort((a, b) => {
          const aTime = a?.mtimeMs || 0;
          const bTime = b?.mtimeMs || 0;
          if (aTime === bTime) return (a.path || "").localeCompare(b.path || "");
          return bTime - aTime; // newest first
        });
        const dirSet = new Set();
        files.forEach((f) => {
          dirSet.add(dirOfPath(f.path));
        });
        dirs = Array.from(dirSet).filter((d) => d !== "").sort();
        if (currentDir && !dirSet.has(currentDir)) {
          currentDir = "";
        }
        if (!currentDir && lastKnownPath) {
          currentDir = dirOfPath(lastKnownPath);
        }
        knownMtimes = new Map(files.map((f) => [f.path, f.mtimeMs || 0]));
        renderDirFilter();
        renderFiles();
        const visibleCount = files.filter(
          (f) => dirOfPath(f.path) === currentDir
        ).length;
        const locationLabel = currentDir
          ? `~/blockscape/${currentDir}`
          : "~/blockscape";
        setStatus(
          visibleCount
            ? `Browsing ${visibleCount} file(s) in ${locationLabel}`
            : `No .bs files in ${locationLabel} yet`
        );
      } catch (err) {
        console.warn("[Blockscape] local backend refresh failed", err);
        hidePanel("Local server unavailable");
      }
    }

    async function detect() {
      available = false;
      hidePanel();
      setStatus("Checking for local server…");
      try {
        debug("Detect start");
        const healthy = await checkHealth();
        if (!healthy) {
          return false;
        }
        updateActiveSavePlaceholder();
        await refresh();
        syncAutoReloadTimer();
        return true;
      } catch (err) {
        available = false;
        console.log("[Blockscape] local backend not detected", err);
        debug("Detect failed", { err });
        return false;
      }
    }

    async function loadSelected() {
      if (!available || !localFileList) return;
      const selectedPaths = Array.from(localFileList.selectedOptions || [])
        .map((opt) => opt.value)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      if (!selectedPaths.length) {
        alert("Select one or more files to load from ~/blockscape.");
        return;
      }
      let firstIndex = null;
      for (const relPath of selectedPaths) {
        try {
          setStatus(`Loading ${relPath}…`);
          const result = await importLocalBackendFile(relPath);
          if (firstIndex == null) firstIndex = result?.firstIndex ?? null;
          lastKnownPath = relPath;
          updateUrlForServerPath(relPath);
        } catch (err) {
          console.error("[Blockscape] failed to load from local server", err);
          alert(`Local load failed for ${relPath}: ${err.message}`);
        }
      }
      if (firstIndex != null) setActive(firstIndex);
      setStatus(`Loaded ${selectedPaths.length} file(s)`);
      renderFiles();
    }

    async function deleteSelected() {
      if (!available || !localFileList) return;
      const selectedPaths = Array.from(localFileList.selectedOptions || [])
        .map((opt) => opt.value)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      if (!selectedPaths.length) {
        alert("Select one or more files to delete from ~/blockscape.");
        return;
      }
      const count = selectedPaths.length;
      const targetLabel =
        count === 1 ? selectedPaths[0] : `${count} file(s)`;
      const confirmText =
        count === 1
          ? `Delete "${targetLabel}" from ~/blockscape? This cannot be undone.`
          : `Delete ${targetLabel} from ~/blockscape? This cannot be undone.`;
      if (!window.confirm(confirmText)) return;
      const DELETE_REASON = "local-files-delete";
      pauseAutoReload(DELETE_REASON);
      const failures = [];
      try {
        setStatus(`Deleting ${targetLabel}…`);
        for (const relPath of selectedPaths) {
          try {
            const resp = await fetch(
              `/api/file?path=${encodeURIComponent(relPath)}`,
              { method: "DELETE" }
            );
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            if (relPath === lastKnownPath) lastKnownPath = "";
            if (localSavePathInput?.value === relPath) {
              localSavePathInput.value = "";
            }
          } catch (err) {
            failures.push(relPath);
            console.warn("[Blockscape] local delete failed", relPath, err);
          }
        }
        await refresh();
        if (failures.length) {
          setStatus(
            `Deleted ${count - failures.length} file(s), ${failures.length} failed`,
            { error: true }
          );
        } else {
          setStatus(`Deleted ${count} file(s)`);
        }
      } finally {
        resumeAutoReload(DELETE_REASON);
      }
    }

    async function saveActiveToPath(
      desiredPath,
      { statusPrefix = "Saved to", updateInput = true } = {}
    ) {
      if (!available) return;
      if (activeIndex < 0) {
        alert("No active model to save.");
        return;
      }
      const target = models[activeIndex];
      const { payload: savePayload, isSeries } = resolvePayloadForSave(target);
      if (!savePayload) {
        alert("No model data to save.");
        return;
      }
      const normalized = normalizeSavePath(desiredPath);
      if (!normalized) {
        alert("Enter a relative path (no ..) to save under ~/blockscape.");
        return;
      }
      try {
        const body = JSON.stringify(savePayload, null, 2);
        const savingLabel = isSeries ? "series" : "map";
        setStatus(`Saving ${savingLabel} to ${normalized}…`);
        const resp = await fetch(
          `/api/file?path=${encodeURIComponent(normalized)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body,
          }
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const payload = await resp.json();
        lastKnownPath = payload.path || normalized;
        target.sourcePath = payload.path || normalized;
        if (updateInput && localSavePathInput) {
          localSavePathInput.value = payload.path || normalized;
        }
        updateUrlForServerPath(payload.path || normalized);
        setStatus(`${statusPrefix} ${payload.path || normalized}`);
        await refresh();
      } catch (err) {
        console.error("[Blockscape] local save failed", err);
        alert(`Local save failed: ${err.message}`);
        hidePanel("Local server unavailable");
      }
    }

    async function saveActiveToFile() {
      const desiredPath =
        normalizeSavePath(localSavePathInput?.value) ||
        normalizeSavePath(models[activeIndex]?.sourcePath) ||
        defaultSaveName();
      if (!desiredPath) {
        alert("Enter a relative path (no ..) to save under ~/blockscape.");
        return;
      }
      await saveActiveToPath(desiredPath, { statusPrefix: "Saved to" });
    }

    async function saveActiveAs() {
      if (!available) return;
      if (activeIndex < 0) {
        alert("No active model to save.");
        return;
      }
      if (typeof window === "undefined" || typeof window.prompt !== "function")
        return;
      const defaultPath =
        normalizeSavePath(models[activeIndex]?.sourcePath) || defaultSaveName();
      const response = window.prompt(
        "Save active map as (under ~/blockscape):",
        defaultPath
      );
      if (response == null) return;
      const normalized = normalizeSavePath(response);
      if (!normalized) {
        alert("Enter a relative path (no ..) to save under ~/blockscape.");
        return;
      }
      await saveActiveToPath(normalized, { statusPrefix: "Saved to" });
    }

    async function saveModelByIndex(
      entryIndex,
      desiredPath,
      { refreshAfter = true, statusPrefix = "Saved to" } = {}
    ) {
      if (!available) return { ok: false, error: "Local server unavailable" };
      if (!Number.isInteger(entryIndex) || entryIndex < 0) {
        return { ok: false, error: "Invalid model index" };
      }
      const target = models[entryIndex];
      const { payload: savePayload, isSeries } = resolvePayloadForSave(target);
      if (!savePayload) return { ok: false, error: "Model has no data" };
      const normalized =
        normalizeSavePath(desiredPath) ||
        normalizeSavePath(target?.sourcePath) ||
        defaultSaveName();
      if (!normalized) {
        return {
          ok: false,
          error: "Enter a relative path (no ..) to save under ~/blockscape.",
        };
      }
      try {
        const body = JSON.stringify(savePayload, null, 2);
        const savingLabel = isSeries ? "series" : "map";
        setStatus(`Saving ${savingLabel} to ${normalized}…`);
        const resp = await fetch(
          `/api/file?path=${encodeURIComponent(normalized)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body,
          }
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const payload = await resp.json();
        lastKnownPath = payload.path || normalized;
        target.sourcePath = payload.path || normalized;
        if (entryIndex === activeIndex) {
          updateActiveSavePlaceholder();
        }
        setStatus(
          `${statusPrefix} ${payload.path || normalized}`
        );
        if (refreshAfter) await refresh();
        return { ok: true, path: payload.path || normalized };
      } catch (err) {
        console.error("[Blockscape] local save failed", err);
        hidePanel("Local server unavailable");
        return { ok: false, error: err.message };
      }
    }

    if (refreshLocalFilesButton) {
      refreshLocalFilesButton.onclick = () => refresh();
    }
    if (loadLocalFileButton) {
      loadLocalFileButton.onclick = () => loadSelected();
    }
    if (deleteLocalFileButton) {
      deleteLocalFileButton.onclick = () => deleteSelected();
    }
    if (saveLocalFileButton) {
      saveLocalFileButton.onclick = () => saveActiveToFile();
    }
    if (saveLocalFileAsButton) {
      saveLocalFileAsButton.onclick = () => saveActiveAs();
    }
    if (localFileList && localSavePathInput) {
      localFileList.addEventListener("change", () => {
        const first = Array.from(localFileList.selectedOptions || [])[0];
        if (first?.value) {
          localSavePathInput.value = first.value;
        }
      });
      localFileList.addEventListener("dblclick", () => {
        loadSelected();
      });
    }
    if (localDirSelect) {
      localDirSelect.addEventListener("change", () => {
        currentDir = localDirSelect.value || "";
        renderFiles();
      });
    }
    if (localBackendPanel) {
      const FOCUS_REASON = "local-files-panel-focus";
      const POINTER_REASON = "local-files-panel-pointer";
      let focusActive = false;
      let pointerActive = false;

      localBackendPanel.addEventListener("focusin", () => {
        if (focusActive) return;
        focusActive = true;
        pauseAutoReload(FOCUS_REASON);
      });

      localBackendPanel.addEventListener("focusout", (event) => {
        if (!focusActive) return;
        const nextTarget = event.relatedTarget;
        if (nextTarget && localBackendPanel.contains(nextTarget)) return;
        focusActive = false;
        resumeAutoReload(FOCUS_REASON);
      });

      localBackendPanel.addEventListener("pointerenter", () => {
        if (pointerActive) return;
        pointerActive = true;
        pauseAutoReload(POINTER_REASON);
      });

      localBackendPanel.addEventListener("pointerleave", () => {
        if (!pointerActive) return;
        pointerActive = false;
        resumeAutoReload(POINTER_REASON);
      });
    }

    return {
      detect,
      refresh,
      updateActiveSavePlaceholder,
      isAvailable: () => available,
      highlightSource: highlightSourcePath,
      saveModelByIndex,
      getAutoReloadConfig: () => ({
        enabled: autoReloadEnabled,
        intervalMs: autoReloadIntervalMs,
        available,
      }),
      setAutoReloadEnabled,
      setAutoReloadInterval,
    };
  }

  async function importLocalBackendFile(
    relPath,
    { labelBase = relPath, seriesTitleOverride } = {}
  ) {
    if (!relPath) throw new Error("Missing path");
    const resp = await fetch(`/api/file?path=${encodeURIComponent(relPath)}`, {
      cache: "no-store",
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const payload = await resp.json();
    const text = JSON.stringify(payload.data ?? payload, null, 2);
    const entries = normalizeToModelsFromText(text, relPath, {
      seriesTitleOverride: seriesTitleOverride || `${relPath} series`,
    });
    if (!entries.length) throw new Error("No models found in file");
    let firstIndex = null;
    entries.forEach((entry, idx) => {
      entry.sourcePath = relPath;
      if (entry.isSeries && !entry.title) {
        const leaf = relPath.split("/").filter(Boolean).pop() || relPath;
        const stem = leaf.replace(/\.bs$/i, "");
        entry.title = stem;
      }
      const idxResult = addModelEntry(entry, {
        versionLabel: entries.length > 1 ? `${labelBase} #${idx + 1}` : labelBase,
      });
      if (firstIndex == null) firstIndex = idxResult;
    });
    return { firstIndex, total: entries.length };
  }

  async function writeTextToClipboard(text) {
    if (!navigator.clipboard?.writeText) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("[Blockscape] clipboard write failed", err);
      return false;
    }
  }

  async function readTextFromClipboard() {
    if (!navigator.clipboard?.readText) {
      throw new Error("Clipboard read not supported");
    }
    return navigator.clipboard.readText();
  }

  function makeDownloadName(base) {
    return (
      (base || "blockscape")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "blockscape"
    );
  }

  function normalizeLocalSavePath(raw) {
    const cleaned = (raw || "")
      .trim()
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");
    if (!cleaned || cleaned.includes("..")) return null;
    return cleaned.toLowerCase().endsWith(".bs") ? cleaned : `${cleaned}.bs`;
  }

  function getBsStem(savePath) {
    const leaf = (savePath || "").split("/").filter(Boolean).pop() || "";
    return leaf.replace(/\.bs$/i, "").trim();
  }

  function withNumericSuffix(savePath, suffixNumber) {
    const normalized = normalizeLocalSavePath(savePath);
    if (!normalized) return null;
    const parts = normalized.split("/");
    const leaf = parts.pop() || normalized;
    const base = leaf.replace(/\.bs$/i, "");
    const nextLeaf = `${base}-${suffixNumber}.bs`;
    return [...parts, nextLeaf].filter(Boolean).join("/");
  }

  function makeTimestampSlug() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(
      d.getDate()
    )}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  async function isLocalBackendReady() {
    try {
      await initialBackendCheck;
    } catch (_) {}
    return typeof localBackend?.isAvailable === "function"
      ? localBackend.isAvailable()
      : false;
  }

  async function getExistingLocalBsPaths() {
    try {
      const resp = await fetch("/api/files", { cache: "no-store" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const payload = await resp.json();
      return new Set((payload.files || []).map((f) => f.path).filter(Boolean));
    } catch (err) {
      console.warn("[Blockscape] failed to list existing local files", err);
      return new Set();
    }
  }

  function pickUniqueLocalPath(desiredPath, takenPaths) {
    const normalized = normalizeLocalSavePath(desiredPath);
    if (!normalized) return null;
    if (!takenPaths?.has(normalized)) return normalized;
    const parts = normalized.split("/");
    const leaf = parts.pop() || normalized;
    const base = leaf.replace(/\.bs$/i, "");
    for (let i = 2; i < 1000; i++) {
      const candidateLeaf = `${base}-${i}.bs`;
      const candidate = [...parts, candidateLeaf].filter(Boolean).join("/");
      if (!takenPaths.has(candidate)) return candidate;
    }
    return null;
  }

  function suggestNewSavePathForEntry(entry, fallbackBase = "clipboard") {
    const baseLabel =
      getModelTitle(entry) ||
      entry?.title ||
      entry?.apicurioArtifactName ||
      fallbackBase ||
      "blockscape";
    const slug = makeDownloadName(baseLabel);
    const stamp = makeTimestampSlug();
    return `${slug || "blockscape"}-${stamp}.bs`;
  }

  function applySeriesTitleFromFilename(entry, savePath) {
    if (
      !entry?.isSeries ||
      !Array.isArray(entry?.apicurioVersions) ||
      entry.apicurioVersions.length <= 1
    )
      return false;
    const stem = getBsStem(savePath);
    if (!stem) return false;
    entry.title = stem;
    entry.apicurioArtifactName = stem;
    const forcedSlug = makeSeriesId(stem || "unknown");
    applySeriesSlug(entry, forcedSlug);
    ensureSeriesId(entry, { seriesName: stem, fallbackTitle: stem });
    return true;
  }

  function clampHoverScale(value) {
    if (!Number.isFinite(value)) return DEFAULT_TILE_HOVER_SCALE;
    return Math.min(
      MAX_TILE_HOVER_SCALE,
      Math.max(MIN_TILE_HOVER_SCALE, value)
    );
  }

  function syncSelectionClass() {
    if (!app) return;
    const hasSelection = !!selection || !!selectedCategoryId;
    app.classList.toggle("blockscape-has-selection", hasSelection);
    app.classList.toggle("blockscape-has-item-selection", !!selection);
  }

  function applyTileHoverScale(scale) {
    tileHoverScale = clampHoverScale(scale);
    document.documentElement.style.setProperty(
      "--blockscape-tile-hover-scale",
      tileHoverScale
    );
    return tileHoverScale;
  }

  function clampSelectionDimOpacity(value) {
    if (!Number.isFinite(value)) return DEFAULT_SELECTION_DIM_OPACITY;
    return Math.min(
      MAX_SELECTION_DIM_OPACITY,
      Math.max(MIN_SELECTION_DIM_OPACITY, value)
    );
  }

  function applySelectionDimOpacity(value) {
    selectionDimOpacity = clampSelectionDimOpacity(value);
    document.documentElement.style.setProperty(
      "--blockscape-selection-dim-opacity",
      selectionDimOpacity
    );
    const appliedOpacity = selectionDimEnabled ? selectionDimOpacity : 1;
    document.documentElement.style.setProperty(
      "--blockscape-selection-dim-applied-opacity",
      appliedOpacity
    );
    return selectionDimOpacity;
  }

  function clampTileCompactness(value) {
    if (!Number.isFinite(value)) return DEFAULT_TILE_COMPACTNESS;
    return Math.min(
      MAX_TILE_COMPACTNESS,
      Math.max(MIN_TILE_COMPACTNESS, value)
    );
  }

  function applyTileCompactness(value) {
    tileCompactness = clampTileCompactness(value);
    document.documentElement.style.setProperty(
      "--blockscape-tile-compactness",
      tileCompactness
    );
    return tileCompactness;
  }

  function clampTitleHoverWidthMultiplier(value) {
    if (!Number.isFinite(value))
      return DEFAULT_TITLE_HOVER_WIDTH_MULTIPLIER;
    return Math.min(
      MAX_TITLE_HOVER_WIDTH_MULTIPLIER,
      Math.max(MIN_TITLE_HOVER_WIDTH_MULTIPLIER, value)
    );
  }

  function applyTitleHoverWidthMultiplier(value) {
    titleHoverWidthMultiplier = clampTitleHoverWidthMultiplier(value);
    document.documentElement.style.setProperty(
      "--blockscape-title-hover-width-multiplier",
      titleHoverWidthMultiplier
    );
    return titleHoverWidthMultiplier;
  }

  function clampTitleHoverTextPortion(value) {
    if (!Number.isFinite(value)) return DEFAULT_TITLE_HOVER_TEXT_PORTION;
    return Math.min(
      MAX_TITLE_HOVER_TEXT_PORTION,
      Math.max(MIN_TITLE_HOVER_TEXT_PORTION, value)
    );
  }

  function applyTitleHoverTextPortion(value) {
    titleHoverTextPortion = clampTitleHoverTextPortion(value);
    document.documentElement.style.setProperty(
      "--blockscape-tile-hover-text-portion",
      titleHoverTextPortion
    );
    return titleHoverTextPortion;
  }

  function applyTitleWrapMode(mode) {
    const normalized = mode === "nowrap" ? "nowrap" : "wrap";
    titleWrapMode = normalized;
    const whiteSpace = normalized === "nowrap" ? "nowrap" : "normal";
    const textWrap = normalized === "nowrap" ? "nowrap" : "normal";
    document.documentElement.style.setProperty(
      "--blockscape-title-white-space",
      whiteSpace
    );
    document.documentElement.style.setProperty(
      "--blockscape-title-text-wrap",
      textWrap
    );
    return normalized;
  }

  function persistTileHoverScale(scale) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(TILE_HOVER_SCALE_STORAGE_KEY, String(scale));
    } catch (error) {
      console.warn("[Blockscape] failed to persist hover scale", error);
    }
  }

  function initializeTileHoverScale() {
    if (typeof window === "undefined" || !window.localStorage) {
      return applyTileHoverScale(DEFAULT_TILE_HOVER_SCALE);
    }
    try {
      const raw = window.localStorage.getItem(TILE_HOVER_SCALE_STORAGE_KEY);
      if (!raw) return applyTileHoverScale(DEFAULT_TILE_HOVER_SCALE);
      const parsed = parseFloat(raw);
      return applyTileHoverScale(parsed);
    } catch (error) {
      console.warn("[Blockscape] failed to read hover scale", error);
      return applyTileHoverScale(DEFAULT_TILE_HOVER_SCALE);
    }
  }

  function persistSelectionDimOpacity(value) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        SELECTION_DIM_OPACITY_STORAGE_KEY,
        String(value)
      );
    } catch (error) {
      console.warn("[Blockscape] failed to persist selection dimming", error);
    }
  }

  function initializeSelectionDimOpacity() {
    if (typeof window === "undefined" || !window.localStorage) {
      return applySelectionDimOpacity(DEFAULT_SELECTION_DIM_OPACITY);
    }
    try {
      const raw = window.localStorage.getItem(
        SELECTION_DIM_OPACITY_STORAGE_KEY
      );
      if (!raw) return applySelectionDimOpacity(DEFAULT_SELECTION_DIM_OPACITY);
      const parsed = parseFloat(raw);
      return applySelectionDimOpacity(parsed);
    } catch (error) {
      console.warn("[Blockscape] failed to read selection dimming", error);
      return applySelectionDimOpacity(DEFAULT_SELECTION_DIM_OPACITY);
    }
  }

  function applySelectionDimEnabled(enabled) {
    selectionDimEnabled = !!enabled;
    const appliedOpacity = selectionDimEnabled ? selectionDimOpacity : 1;
    document.documentElement.style.setProperty(
      "--blockscape-selection-dim-applied-opacity",
      appliedOpacity
    );
    if (app)
      app.classList.toggle("blockscape-dimming-disabled", !selectionDimEnabled);
    return selectionDimEnabled;
  }

  function persistSelectionDimEnabled(enabled) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        SELECTION_DIM_ENABLED_STORAGE_KEY,
        enabled ? "1" : "0"
      );
    } catch (error) {
      console.warn(
        "[Blockscape] failed to persist selection dim toggle",
        error
      );
    }
  }

  function initializeSelectionDimEnabled() {
    if (typeof window === "undefined" || !window.localStorage) {
      return applySelectionDimEnabled(true);
    }
    try {
      const raw = window.localStorage.getItem(
        SELECTION_DIM_ENABLED_STORAGE_KEY
      );
      if (raw == null) return applySelectionDimEnabled(true);
      return applySelectionDimEnabled(raw === "1");
    } catch (error) {
      console.warn("[Blockscape] failed to read selection dim toggle", error);
      return applySelectionDimEnabled(true);
    }
  }

  function applyAutoIdFromNameEnabled(enabled) {
    autoIdFromNameEnabled = !!enabled;
    return autoIdFromNameEnabled;
  }

  function persistAutoIdFromNameEnabled(enabled) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        AUTO_ID_FROM_NAME_STORAGE_KEY,
        enabled ? "1" : "0"
      );
    } catch (error) {
      console.warn(
        "[Blockscape] failed to persist auto-id toggle",
        error
      );
    }
  }

  function initializeAutoIdFromNameEnabled() {
    if (typeof window === "undefined" || !window.localStorage) {
      return applyAutoIdFromNameEnabled(DEFAULT_AUTO_ID_FROM_NAME);
    }
    try {
      const raw = window.localStorage.getItem(AUTO_ID_FROM_NAME_STORAGE_KEY);
      if (raw == null) {
        return applyAutoIdFromNameEnabled(DEFAULT_AUTO_ID_FROM_NAME);
      }
      return applyAutoIdFromNameEnabled(raw === "1");
    } catch (error) {
      console.warn("[Blockscape] failed to read auto-id toggle", error);
      return applyAutoIdFromNameEnabled(DEFAULT_AUTO_ID_FROM_NAME);
    }
  }

  function persistTileCompactness(value) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        TILE_COMPACTNESS_STORAGE_KEY,
        String(value)
      );
    } catch (error) {
      console.warn("[Blockscape] failed to persist tile compactness", error);
    }
  }

  function initializeTileCompactness() {
    if (typeof window === "undefined" || !window.localStorage) {
      return applyTileCompactness(DEFAULT_TILE_COMPACTNESS);
    }
    try {
      const raw = window.localStorage.getItem(TILE_COMPACTNESS_STORAGE_KEY);
      if (!raw) return applyTileCompactness(DEFAULT_TILE_COMPACTNESS);
      const parsed = parseFloat(raw);
      return applyTileCompactness(parsed);
    } catch (error) {
      console.warn("[Blockscape] failed to read tile compactness", error);
      return applyTileCompactness(DEFAULT_TILE_COMPACTNESS);
    }
  }

  function persistTitleHoverWidthMultiplier(value) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        TITLE_HOVER_WIDTH_STORAGE_KEY,
        String(value)
      );
    } catch (error) {
      console.warn("[Blockscape] failed to persist title hover width", error);
    }
  }

  function initializeTitleHoverWidthMultiplier() {
    if (typeof window === "undefined" || !window.localStorage) {
      return applyTitleHoverWidthMultiplier(
        DEFAULT_TITLE_HOVER_WIDTH_MULTIPLIER
      );
    }
    try {
      const raw = window.localStorage.getItem(TITLE_HOVER_WIDTH_STORAGE_KEY);
      if (!raw) {
        return applyTitleHoverWidthMultiplier(
          DEFAULT_TITLE_HOVER_WIDTH_MULTIPLIER
        );
      }
      const parsed = parseFloat(raw);
      return applyTitleHoverWidthMultiplier(parsed);
    } catch (error) {
      console.warn("[Blockscape] failed to read title hover width", error);
      return applyTitleHoverWidthMultiplier(
        DEFAULT_TITLE_HOVER_WIDTH_MULTIPLIER
      );
    }
  }

  function persistTitleHoverTextPortion(value) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        TITLE_HOVER_TEXT_PORTION_STORAGE_KEY,
        String(value)
      );
    } catch (error) {
      console.warn("[Blockscape] failed to persist title text zoom", error);
    }
  }

  function initializeTitleHoverTextPortion() {
    if (typeof window === "undefined" || !window.localStorage) {
      return applyTitleHoverTextPortion(DEFAULT_TITLE_HOVER_TEXT_PORTION);
    }
    try {
      const raw = window.localStorage.getItem(
        TITLE_HOVER_TEXT_PORTION_STORAGE_KEY
      );
      if (!raw)
        return applyTitleHoverTextPortion(DEFAULT_TITLE_HOVER_TEXT_PORTION);
      const parsed = parseFloat(raw);
      return applyTitleHoverTextPortion(parsed);
    } catch (error) {
      console.warn("[Blockscape] failed to read title text zoom", error);
      return applyTitleHoverTextPortion(DEFAULT_TITLE_HOVER_TEXT_PORTION);
    }
  }

  function persistTitleWrapMode(mode) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(TITLE_WRAP_STORAGE_KEY, mode);
    } catch (error) {
      console.warn("[Blockscape] failed to persist title wrap mode", error);
    }
  }

  function initializeTitleWrapMode() {
    if (typeof window === "undefined" || !window.localStorage) {
      return applyTitleWrapMode(DEFAULT_TITLE_WRAP_MODE);
    }
    try {
      const stored = window.localStorage.getItem(TITLE_WRAP_STORAGE_KEY);
      if (!stored) return applyTitleWrapMode(DEFAULT_TITLE_WRAP_MODE);
      return applyTitleWrapMode(stored);
    } catch (error) {
      console.warn("[Blockscape] failed to read title wrap mode", error);
      return applyTitleWrapMode(DEFAULT_TITLE_WRAP_MODE);
    }
  }

  function clampSeriesNavDoubleClickWait(value) {
    if (!Number.isFinite(value)) return DEFAULT_SERIES_NAV_DOUBLE_CLICK_MS;
    return Math.min(
      MAX_SERIES_NAV_DOUBLE_CLICK_MS,
      Math.max(MIN_SERIES_NAV_DOUBLE_CLICK_MS, value)
    );
  }

  function applySeriesNavDoubleClickWait(value) {
    seriesNavDoubleClickWaitMs = clampSeriesNavDoubleClickWait(value);
    return seriesNavDoubleClickWaitMs;
  }

  function setShowSecondaryLinks(next) {
    showSecondaryLinks = !!next;
  }

  function setShowReusedInMap(next) {
    showReusedInMap = !!next;
  }

  function getCurrentSettingsState() {
    return {
      hoverScale: tileHoverScale,
      selectionDimOpacity,
      selectionDimEnabled,
      tileCompactness,
      titleWrapMode,
      titleHoverWidthMultiplier,
      titleHoverTextPortion,
      obsidianLinksEnabled,
      obsidianLinkMode,
      obsidianVaultName,
      autoIdFromNameEnabled,
      seriesNavDoubleClickWaitMs,
      showSecondaryLinks,
      centerItems,
      showReusedInMap,
      theme,
      colorPresets,
      depColor,
      revdepColor,
      linkThickness,
    };
  }

  function applyImportedSettings(snapshot, { refreshObsidianLinks: obsidianRefresh } = {}) {
    return applySettingsSnapshot(snapshot, {
      applyTileHoverScale,
      persistTileHoverScale,
      applySelectionDimEnabled,
      persistSelectionDimEnabled,
      applySelectionDimOpacity,
      persistSelectionDimOpacity,
      applyTileCompactness,
      persistTileCompactness,
      applyTitleWrapMode,
      persistTitleWrapMode,
      applyTitleHoverWidthMultiplier,
      persistTitleHoverWidthMultiplier,
      applyTitleHoverTextPortion,
      persistTitleHoverTextPortion,
      applyObsidianLinksEnabled,
      persistObsidianLinksEnabled,
      applyObsidianLinkMode,
      persistObsidianLinkMode,
      applyObsidianVaultName,
      persistObsidianVaultName,
      applyAutoIdFromNameEnabled,
      persistAutoIdFromNameEnabled,
      applySeriesNavDoubleClickWait,
      persistSeriesNavDoubleClickWait,
      localBackend,
      ui: settingsUi,
      refreshObsidianLinks: obsidianRefresh,
      scheduleOverlaySync,
      selection,
      select,
      clearStyles,
      drawLinks,
      applyReusedHighlights,
      setShowSecondaryLinks,
      setShowReusedInMap,
      applyDepColor,
      persistDepColor,
      applyRevdepColor,
      persistRevdepColor,
      applyLinkThickness,
      persistLinkThickness,
      applyTheme,
      setColorPresets,
      applyCenterItems,
      persistCenterItems,
      current: getCurrentSettingsState(),
    });
  }

  function persistSeriesNavDoubleClickWait(value) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        SERIES_NAV_DOUBLE_CLICK_STORAGE_KEY,
        String(value)
      );
    } catch (error) {
      console.warn(
        "[Blockscape] failed to persist series double-click wait",
        error
      );
    }
  }

  function initializeSeriesNavDoubleClickWait() {
    if (typeof window === "undefined" || !window.localStorage) {
      return applySeriesNavDoubleClickWait(DEFAULT_SERIES_NAV_DOUBLE_CLICK_MS);
    }
    try {
      const raw = window.localStorage.getItem(
        SERIES_NAV_DOUBLE_CLICK_STORAGE_KEY
      );
      if (!raw)
        return applySeriesNavDoubleClickWait(
          DEFAULT_SERIES_NAV_DOUBLE_CLICK_MS
        );
      const parsed = parseInt(raw, 10);
      return applySeriesNavDoubleClickWait(parsed);
    } catch (error) {
      console.warn(
        "[Blockscape] failed to read series double-click wait",
        error
      );
      return applySeriesNavDoubleClickWait(DEFAULT_SERIES_NAV_DOUBLE_CLICK_MS);
    }
  }

  function normalizeObsidianLinkMode(mode) {
    return mode === OBSIDIAN_LINK_MODE_ID
      ? OBSIDIAN_LINK_MODE_ID
      : OBSIDIAN_LINK_MODE_TITLE;
  }

  function applyObsidianLinkMode(mode) {
    obsidianLinkMode = normalizeObsidianLinkMode(mode);
    return obsidianLinkMode;
  }

  function persistObsidianLinkMode(mode) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(OBSIDIAN_LINK_MODE_STORAGE_KEY, mode);
    } catch (error) {
      console.warn("[Blockscape] failed to persist Obsidian link mode", error);
    }
  }

  function initializeObsidianLinkMode() {
    if (typeof window === "undefined" || !window.localStorage) {
      return applyObsidianLinkMode(DEFAULT_OBSIDIAN_LINK_MODE);
    }
    try {
      const raw = window.localStorage.getItem(OBSIDIAN_LINK_MODE_STORAGE_KEY);
      if (!raw) return applyObsidianLinkMode(DEFAULT_OBSIDIAN_LINK_MODE);
      return applyObsidianLinkMode(raw);
    } catch (error) {
      console.warn("[Blockscape] failed to read Obsidian link mode", error);
      return applyObsidianLinkMode(DEFAULT_OBSIDIAN_LINK_MODE);
    }
  }

  function applyObsidianLinksEnabled(enabled) {
    obsidianLinksEnabled = !!enabled;
    return obsidianLinksEnabled;
  }

  function persistObsidianLinksEnabled(enabled) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        OBSIDIAN_LINK_ENABLED_STORAGE_KEY,
        enabled ? "1" : "0"
      );
    } catch (error) {
      console.warn("[Blockscape] failed to persist Obsidian toggle", error);
    }
  }

  function initializeObsidianLinksEnabled() {
    if (typeof window === "undefined" || !window.localStorage) {
      return applyObsidianLinksEnabled(false);
    }
    try {
      const raw = window.localStorage.getItem(
        OBSIDIAN_LINK_ENABLED_STORAGE_KEY
      );
      if (raw == null) return applyObsidianLinksEnabled(false);
      return applyObsidianLinksEnabled(raw === "1");
    } catch (error) {
      console.warn("[Blockscape] failed to read Obsidian toggle", error);
      return applyObsidianLinksEnabled(false);
    }
  }

  function applyObsidianVaultName(value) {
    const trimmed = (value ?? "").toString().trim();
    obsidianVaultName = trimmed;
    return obsidianVaultName;
  }

  function persistObsidianVaultName(value) {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(OBSIDIAN_VAULT_STORAGE_KEY, value);
    } catch (error) {
      console.warn("[Blockscape] failed to persist Obsidian vault", error);
    }
  }

  function initializeObsidianVaultName() {
    if (typeof window === "undefined" || !window.localStorage) {
      return applyObsidianVaultName("");
    }
    try {
      const raw = window.localStorage.getItem(OBSIDIAN_VAULT_STORAGE_KEY);
      if (!raw) return applyObsidianVaultName("");
      return applyObsidianVaultName(raw);
    } catch (error) {
      console.warn("[Blockscape] failed to read Obsidian vault", error);
      return applyObsidianVaultName("");
    }
  }


  function promptForSeriesTitle(defaultTitle) {
    if (typeof window === "undefined" || typeof window.prompt !== "function")
      return null;
    const response = window.prompt("Name this series", defaultTitle);
    const trimmed = (response || "").trim();
    return trimmed || null;
  }

  function deriveSeriesTitleFromArray(list, titleBase = "Pasted") {
    const array = Array.isArray(list) ? list : [];
    if (!array.length) return `${titleBase} series`;
    const firstObj =
      array.find((obj) => obj && typeof obj === "object") || array[0];
    const candidate = (firstObj?.title ?? "").toString().trim();
    return candidate || `${titleBase} series`;
  }

  function applySeriesSlug(entry, slug) {
    if (!slug || !entry || typeof entry !== "object") return;
    entry.seriesId = slug;
    entry.apicurioArtifactId = slug;
    entry.id = slug;
    if (entry.data && typeof entry.data === "object") {
      entry.data.seriesId = slug;
    }
    if (Array.isArray(entry.apicurioVersions)) {
      entry.apicurioVersions.forEach((ver) => {
        if (ver?.data && typeof ver.data === "object") {
          ver.data.seriesId = slug;
        }
      });
    }
  }

  function renameSeries(entry) {
    if (
      !entry ||
      typeof window === "undefined" ||
      typeof window.prompt !== "function"
    )
      return false;
    const currentName =
      (entry.title ?? entry.apicurioArtifactName ?? "").toString().trim() ||
      getModelDisplayTitle(entry, "Series");
    const nameResponse = window.prompt("Series name", currentName);
    if (nameResponse == null) return false;
    const nextName = nameResponse.trim();
    if (!nextName) return false;
    const existingId =
      getSeriesId(entry, { seriesName: nextName, fallbackTitle: nextName }) ||
      makeSeriesId(nextName, nextName);
    const idResponse = window.prompt(
      "Series ID (used for linking and downloads)",
      existingId
    );
    if (idResponse == null) return false;
    const nextId = makeSeriesId(
      idResponse.trim() || nextName,
      nextName || "series"
    );
    entry.title = nextName;
    entry.apicurioArtifactName = nextName;
    applySeriesSlug(entry, nextId);
    return true;
  }

  function stableStringify(value) {
    if (value === null || typeof value !== "object")
      return JSON.stringify(value);
    if (Array.isArray(value))
      return `[${value.map((v) => stableStringify(v)).join(",")}]`;
    const keys = Object.keys(value).sort();
    const parts = keys.map(
      (k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`
    );
    return `{${parts.join(",")}}`;
  }

  function canonicalizeJson(value) {
    try {
      return stableStringify(value);
    } catch {
      return "";
    }
  }

  function computeJsonFingerprint(input) {
    try {
      const value = typeof input === "string" ? JSON.parse(input) : input;
      const fp = canonicalizeJson(value);
      if (fp) return fp;
    } catch (err) {
      console.warn("[Blockscape] fingerprint parse failed (first pass)", err);
    }
    try {
      const clone = JSON.parse(JSON.stringify(input));
      const fp = canonicalizeJson(clone);
      if (fp) return fp;
    } catch (err) {
      console.warn("[Blockscape] fingerprint failed for value", err);
    }
    try {
      return JSON.stringify(input) || "";
    } catch {
      return "";
    }
  }

  const SHORTCUT_CONFIG = [

    // --- NAVIGATION ---
    {
      keys: [["Arrow Left"], ["Arrow Right"]],
      description:
        "Move selection to the previous or next item in the current category.",
    },
    {
      keys: [["Arrow Up"], ["Arrow Down"]],
      description:
        "Move up/down through items, pausing on category headers before entering the next category at the same relative position.",
    },
    {
      keys: [
        ["Cmd/Ctrl", "Arrow Up"],
        ["Cmd/Ctrl", "Arrow Down"],
      ],
      description:
        "Reorder the selected category (or the category that holds the selected item).",
    },

    // --- STRUCTURAL MANIPULATION (Moving Items) ---
    {
      keys: [
        ["Shift", "Arrow Left"],
        ["Shift", "Arrow Right"],
      ],
      description:
        "Reorder the selected item inside its category (cycles item.stage in Center view).",
    },
    {
      keys: [
        ["Shift", "Arrow Up"],
        ["Shift", "Arrow Down"],
      ],
      description: "Move the selected item to the previous or next category.",
    },

    // --- VIEW & UI CONTROL ---
    {
      keys: [
        ["Cmd/Ctrl", "Arrow Left"],
        ["Cmd/Ctrl", "Arrow Right"],
      ],
      description: "Switch to the previous or next map when viewing a series.",
    },

    // --- ESSENTIALS & GLOBAL ---
    {
      keys: [["Cmd/Ctrl", "Z"]],
      description: "Undo the last deleted tile or category.",
    },
    {
      keys: [["Cmd/Ctrl", "S"]],
      description:
        "Download the active model JSON (series if multiple versions are open).",
    },
    {
      keys: [["Cmd/Ctrl", "V"]],
      description:
        "Append JSON models from the clipboard when focus is outside inputs.",
    },

    // --- BASIC INTERACTION ---
    {
      keys: [["Enter"], ["Space"]],
      description: "Activate a focused tile, same as clicking it.",
    },
    {
      keys: [["F2"]],
      description:
        "Edit the selected item; when a category (not an item) is selected, open the category editor.",
    },
    {
      keys: [["Delete"]],
      description: "Delete the selected item or category (use Cmd/Ctrl+Z to undo).",
    },
    {
      keys: [["Insert"]],
      description: "Add a new category at the bottom of the map.",
    },

    { keys: [["Escape"]], description: "Unselect item or close the open preview popover." },
  ];
  function ensureModelMetadata(
    data,
    { titleHint = "Untitled Model", idHint } = {}
  ) {
    if (!data || typeof data !== "object") return data;
    const trimmedTitle = (data.title ?? "").toString().trim();
    data.title = trimmedTitle || titleHint || "Untitled Model";

    const trimmedId = (data.id ?? "").toString().trim();
    if (!trimmedId) {
      const base = idHint || data.title || titleHint || "model";
      const slug = makeDownloadName(base).replace(/\./g, "-");
      data.id = slug || `model-${uid()}`;
    } else {
      data.id = trimmedId;
    }

    if (typeof data.abstract !== "string") {
      data.abstract = data.abstract == null ? "" : String(data.abstract);
    }
    return data;
  }

  function deriveNextModelIdForVersion(entry) {
    const parseId = (value) => {
      const str = (value ?? "").toString().trim();
      if (!str) return { base: "", suffix: null };
      const match = str.match(/^(.*?)-(\d+)$/);
      return {
        base: match ? match[1] : str,
        suffix: match ? Number.parseInt(match[2], 10) : null,
      };
    };

    const versions = Array.isArray(entry?.apicurioVersions)
      ? entry.apicurioVersions
      : [];
    const activeId = (entry?.data?.id ?? "").toString().trim();

    let base = parseId(activeId).base;
    if (!base) {
      for (const ver of versions) {
        if (ver?.isCategoryView) continue;
        const parsed = parseId(ver?.data?.id ?? ver?.id ?? "");
        if (parsed.base) {
          base = parsed.base;
          break;
        }
      }
    }

    if (!base) {
      const fallback = makeDownloadName(
        getSeriesId(entry) ||
          getModelSourceLabel(entry) ||
          getModelTitle(entry, "model")
      );
      base = fallback;
    }

    let maxSuffix = 0;
    versions.forEach((ver) => {
      if (ver?.isCategoryView) return;
      const parsed = parseId(ver?.data?.id ?? ver?.id ?? "");
      if (parsed.base !== base) return;
      if (Number.isFinite(parsed.suffix) && parsed.suffix > maxSuffix) {
        maxSuffix = parsed.suffix;
      }
    });

    return `${base}-${String(maxSuffix + 1).padStart(2, "0")}`;
  }

  function cloneModelData(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function getModelTitle(entry, fallback = "Untitled Model") {
    if (!entry) return fallback;
    const candidate = (entry.data?.title ?? entry.title ?? "")
      .toString()
      .trim();
    return candidate || fallback;
  }

  function getModelDisplayTitle(entry, fallback = "Untitled Model") {
    const isSeries = entry?.apicurioVersions?.length > 1 || entry?.isSeries;
    if (isSeries) {
      const seriesTitle =
        (entry?.title ?? "").toString().trim() ||
        (entry?.apicurioArtifactName ?? "").toString().trim();
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

  function getModelSourceLabel(entry) {
    if (!entry?.sourcePath) return null;
    try {
      const parts = entry.sourcePath.split("/").filter(Boolean);
      const leaf = parts.length ? parts[parts.length - 1] : entry.sourcePath;
      return leaf.replace(/\.bs$/i, "");
    } catch (err) {
      return entry.sourcePath.replace(/\.bs$/i, "");
    }
  }

  function formatIdForDisplay(id) {
    if (!id) return null;
    return id.toString().replace(/-series$/i, "");
  }

  function findModelIndexByIdOrSource(id) {
    if (!id) return -1;
    const normalized = id.toString().trim().toLowerCase();
    if (!normalized) return -1;
    for (let i = 0; i < models.length; i++) {
      const modelId = (getModelId(models[i]) || "").toLowerCase();
      const sourceId = (getModelSourceLabel(models[i]) || "").toLowerCase();
      if (normalized === modelId || normalized === sourceId) {
        return i;
      }
    }
    return -1;
  }

  function persistActiveEdits(entryIndex) {
    if (entryIndex < 0 || entryIndex >= models.length) return true;
    if (!jsonBox) return true;
    const entry = models[entryIndex];
    const text = (jsonBox.value || "").trim();
    if (!text) return true;
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      alert("Current JSON is invalid. Fix it before switching versions.");
      return false;
    }
    ensureModelMetadata(parsed, {
      titleHint: getModelTitle(entry),
      idHint: getModelId(entry),
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
    (modelData?.categories || []).forEach((cat) =>
      (cat.items || []).forEach((it) => {
        if (it?.id) ids.add(it.id);
      })
    );
    return ids;
  }

  function findItemAndCategoryById(itemId) {
    if (activeIndex < 0 || !itemId) return null;
    const mobj = models[activeIndex].data;
    const categories = mobj?.categories || [];
    for (const cat of categories) {
      const items = cat.items || [];
      const found = items.find((it) => it.id === itemId);
      if (found) {
        return { category: cat, item: found, modelData: mobj };
      }
    }
    return null;
  }

  function setItemColor(itemId, color) {
    const match = findItemAndCategoryById(itemId);
    if (!match) return false;
    if (color) {
      match.item.color = color;
    } else {
      delete match.item.color;
    }
    loadActiveIntoEditor();
    rebuildFromActive();
    select(itemId);
    return true;
  }

  function clearCategoryStages(catId) {
    if (activeIndex < 0 || !catId) return false;
    const mobj = models[activeIndex].data;
    const categories = mobj?.categories || [];
    const category = categories.find((cat) => cat.id === catId);
    if (!category) return false;
    let changed = false;
    (category.items || []).forEach((item) => {
      if (normalizeStageValue(item.stage) != null) {
        delete item.stage;
        changed = true;
      }
    });
    if (!changed) return false;
    loadActiveIntoEditor();
    rebuildFromActive();
    if (selection) select(selection);
    return true;
  }

  function cycleItemStage(itemId, step) {
    if (!itemId || !step || activeIndex < 0) return false;
    const match = findItemAndCategoryById(itemId);
    if (!match) return false;
    const current = normalizeStageValue(match.item.stage);
    const base = current == null ? (step > 0 ? STAGE_MIN : STAGE_MAX) : current;
    const span = STAGE_MAX - STAGE_MIN + 1;
    const offset = ((base - STAGE_MIN + step) % span + span) % span;
    const next = STAGE_MIN + offset;
    match.item.stage = next;
    loadActiveIntoEditor();
    rebuildFromActive();
    select(itemId);
    return true;
  }

  function makeUniqueItemId(base, modelData) {
    const ids = collectAllItemIds(modelData);
    let candidate = makeDownloadName(base || "item") || `item-${uid()}`;
    if (!ids.has(candidate)) return candidate;
    const suffix = () => uid().slice(0, 4);
    while (ids.has(candidate)) {
      candidate = `${makeDownloadName(base || "item")}-${suffix()}`;
    }
    return candidate;
  }

  function makeUniqueCategoryId(base = "category", modelData) {
    const categories = modelData?.categories || [];
    const slug = makeDownloadName(base || "category");
    const exists = (id) => categories.some((cat) => cat.id === id);
    let candidate = slug || `category-${uid()}`;
    if (!exists(candidate)) return candidate;
    let counter = categories.length + 1;
    while (exists(`${slug}-${counter}`)) {
      counter += 1;
    }
    return `${slug}-${counter}`;
  }

  const itemEditor = createItemEditor({
    findItemAndCategoryById,
    collectAllItemIds,
    updateItemReferences,
    loadActiveIntoEditor,
    rebuildFromActive,
    select: (id) => select(id),
    onSelectionRenamed: (oldId, newId) => {
      if (selection === oldId) {
        selection = newId;
        syncSelectionClass();
      }
      if (lastDeletedItem?.item?.id === oldId) lastDeletedItem.item.id = newId;
    },
    makeSlug: makeDownloadName,
    isAutoIdFromNameEnabled: () => autoIdFromNameEnabled,
  });

  function createCategoryEditor({
    getActiveModelData,
    loadActiveIntoEditor,
    rebuildFromActive,
    selectCategory,
    onCategoryRenamed,
  }) {
    const state = {
      wrapper: null,
      fields: {},
      categoryId: null,
      modelData: null,
      idManuallyEdited: false,
      autoSyncEnabled: true,
    };

    const setError = (message) => {
      if (!state.fields.errorEl) return;
      if (!message) {
        state.fields.errorEl.hidden = true;
        state.fields.errorEl.textContent = "";
        return;
      }
      state.fields.errorEl.hidden = false;
      state.fields.errorEl.textContent = message;
    };

    const hide = () => {
      if (!state.wrapper) return;
      state.wrapper.hidden = true;
      state.wrapper.setAttribute("aria-hidden", "true");
      setError("");
      state.categoryId = null;
      state.modelData = null;
      document.body.classList.remove("category-editor-open");
    };

    const show = () => {
      if (!state.wrapper) return;
      state.wrapper.hidden = false;
      state.wrapper.setAttribute("aria-hidden", "false");
      document.body.classList.add("category-editor-open");
      requestAnimationFrame(() => {
        state.fields.titleInput?.focus();
        state.fields.titleInput?.select();
      });
    };

    const syncCategoryIdFromTitle = ({ force } = {}) => {
      if (!autoIdFromNameEnabled || !state.autoSyncEnabled) return;
      if (!state.fields?.idInput || !state.fields?.titleInput) return;
      if (!force && state.idManuallyEdited) return;
      const slug = makeDownloadName(
        state.fields.titleInput.value || state.categoryId || "category"
      );
      state.fields.idInput.value = slug;
    };

    const applyEdits = () => {
      if (!state.modelData || !state.categoryId) {
        throw new Error("No category loaded.");
      }
      const categories = state.modelData.categories || [];
      const category = categories.find((cat) => cat.id === state.categoryId);
      if (!category) throw new Error("Category not found.");
      const nextId = (state.fields.idInput.value || "").trim();
      if (!nextId) throw new Error("ID is required.");
      const nextTitle = (state.fields.titleInput.value || "").trim();
      const duplicate = categories.some(
        (cat) => cat.id === nextId && cat.id !== category.id
      );
      if (duplicate) throw new Error("Another category already uses that ID.");
      const oldId = category.id;
      category.id = nextId;
      category.title = nextTitle || category.id;
      if (oldId !== nextId && typeof onCategoryRenamed === "function") {
        onCategoryRenamed(oldId, nextId);
      }
      loadActiveIntoEditor();
      rebuildFromActive();
      selectCategory(nextId, { scrollIntoView: true });
      return true;
    };

    const save = () => {
      try {
        applyEdits();
        hide();
        return true;
      } catch (error) {
        console.warn("[CategoryEditor] save failed", error);
        setError(error?.message || "Unable to save category.");
        return false;
      }
    };

    const ensureModal = () => {
      if (state.wrapper) return state.wrapper;
      const wrapper = document.createElement("div");
      wrapper.className = "item-editor-modal category-editor-modal";
      wrapper.hidden = true;
      wrapper.setAttribute("role", "dialog");
      wrapper.setAttribute("aria-modal", "true");

      const backdrop = document.createElement("div");
      backdrop.className = "item-editor-modal__backdrop";
      wrapper.appendChild(backdrop);

      const dialog = document.createElement("div");
      dialog.className = "item-editor";
      wrapper.appendChild(dialog);

      const header = document.createElement("div");
      header.className = "item-editor__header";
      const title = document.createElement("h2");
      title.className = "item-editor__title";
      title.textContent = "Edit category";
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "item-editor__close";
      closeBtn.setAttribute("aria-label", "Close category editor");
      closeBtn.textContent = "×";
      header.appendChild(title);
      header.appendChild(closeBtn);
      dialog.appendChild(header);

      const form = document.createElement("form");
      form.className = "item-editor__form";
      dialog.appendChild(form);

      const meta = document.createElement("div");
      meta.className = "item-editor__meta";
      meta.innerHTML =
        '<div class="item-editor__meta-label">Category</div><div class="item-editor__meta-value"></div>';
      form.appendChild(meta);

      const errorEl = document.createElement("div");
      errorEl.className = "item-editor__error";
      errorEl.hidden = true;
      form.appendChild(errorEl);

      const makeField = (labelText, inputEl, hintText) => {
        const field = document.createElement("label");
        field.className = "item-editor__field";
        const label = document.createElement("span");
        label.className = "item-editor__label";
        label.textContent = labelText;
        field.appendChild(label);
        inputEl.classList.add("item-editor__control");
        field.appendChild(inputEl);
        if (hintText) {
          const hint = document.createElement("div");
          hint.className = "item-editor__hint";
          hint.textContent = hintText;
          field.appendChild(hint);
        }
        return field;
      };

      const titleInput = document.createElement("input");
      titleInput.type = "text";
      form.appendChild(
        makeField("Title", titleInput, "Display label shown in the map.")
      );

      const idInput = document.createElement("input");
      idInput.type = "text";
      idInput.required = true;
      form.appendChild(
        makeField(
          "ID",
          idInput,
          "Unique identifier for this category (used in URLs and references)."
        )
      );

      const syncToggle = document.createElement("div");
      syncToggle.className = "item-editor__checkbox";
      const syncRow = document.createElement("label");
      syncRow.className = "item-editor__checkbox-row";
      const syncCheckbox = document.createElement("input");
      syncCheckbox.type = "checkbox";
      const syncLabel = document.createElement("span");
      syncLabel.textContent = "Sync ID while editing title";
      const syncHint = document.createElement("div");
      syncHint.className = "item-editor__hint";
      syncHint.textContent =
        "Turn off to keep typing titles without changing the ID.";
      syncRow.append(syncCheckbox, syncLabel);
      syncToggle.append(syncRow, syncHint);
      form.appendChild(syncToggle);

      const actions = document.createElement("div");
      actions.className = "item-editor__actions";

      const saveBtn = document.createElement("button");
      saveBtn.type = "submit";
      saveBtn.className = "item-editor__action item-editor__action--primary";
      saveBtn.textContent = "Save";

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "item-editor__action";
      cancelBtn.textContent = "Cancel";

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      form.appendChild(actions);

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        save();
      });
      cancelBtn.addEventListener("click", hide);
      closeBtn.addEventListener("click", hide);
      backdrop.addEventListener("click", hide);
      idInput.addEventListener("input", () => {
        state.idManuallyEdited = true;
      });
      titleInput.addEventListener("input", () => syncCategoryIdFromTitle());
      syncCheckbox.addEventListener("change", () => {
        state.autoSyncEnabled = !!syncCheckbox.checked;
        if (state.autoSyncEnabled) {
          state.idManuallyEdited = false;
          syncCategoryIdFromTitle({ force: true });
        }
      });
      wrapper.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          hide();
        }
      });

      document.body.appendChild(wrapper);

      state.wrapper = wrapper;
      state.fields = {
        titleInput,
        idInput,
        errorEl,
        metaLabel: meta.querySelector(".item-editor__meta-value"),
        syncCheckbox,
      };
      return wrapper;
    };

    const open = (catId) => {
      if (!catId) return false;
      const modal = ensureModal();
      if (!modal) return false;
      const modelData = getActiveModelData();
      const categories = modelData?.categories || [];
      const category = categories.find((cat) => cat.id === catId);
      if (!category) return false;
      state.categoryId = category.id;
      state.modelData = modelData;
      state.idManuallyEdited = false;
      const autoSyncAllowed = !!autoIdFromNameEnabled;
      state.autoSyncEnabled = autoSyncAllowed;
      state.fields.metaLabel.textContent =
        category.title || category.id || "Category";
      state.fields.titleInput.value = category.title || category.id || "";
      state.fields.idInput.value = category.id || "";
      state.fields.syncCheckbox.checked = state.autoSyncEnabled;
      state.fields.syncCheckbox.disabled = !autoSyncAllowed;
      if (!state.fields.idInput.value && autoSyncAllowed) {
        syncCategoryIdFromTitle({ force: true });
      }
      setError("");
      show();
      return true;
    };

    return {
      open,
      hide,
      isOpen: () => !!state.wrapper && state.wrapper.hidden === false,
    };
  }

  const categoryEditor = createCategoryEditor({
    getActiveModelData: () => models[activeIndex]?.data,
    loadActiveIntoEditor,
    rebuildFromActive,
    selectCategory: (catId, opts = {}) => selectCategory(catId, opts),
    onCategoryRenamed: (oldId, newId) => {
      if (selectedCategoryId === oldId) {
        selectedCategoryId = newId;
        syncSelectionClass();
      }
    },
  });

  const {
    handleTileContextMenu,
    hidePreview,
    handleDocumentClick: handleTileMenuDocumentClick,
    handleWindowResize: handleTileMenuWindowResize,
    handleWindowScroll: handleTileMenuWindowScroll,
    updateColorPresets: updateTileMenuColors,
  } = createTileContextMenu({
    menuEl: document.getElementById("tileContextMenu"),
    previewEl: preview,
    previewTitleEl: previewTitle,
    previewBodyEl: previewBody,
    previewActionsEl: previewActions,
    previewCloseEl: previewClose,
    escapeHtml,
    onEditItem: (id) => itemEditor.open(id),
    onChangeColor: (id, color) => setItemColor(id, color),
    selectItem: (id) => select(id),
    colorPresets,
  });

  function ensureVersionContainer(
    entry,
    { versionLabel = "1", createdOn } = {}
  ) {
    if (!entry) return entry;
    if (
      Array.isArray(entry.apicurioVersions) &&
      entry.apicurioVersions.length
    ) {
      if (entry.apicurioActiveVersionIndex == null) {
        entry.apicurioActiveVersionIndex = 0;
      }
      if (
        !entry.data &&
        entry.apicurioVersions[entry.apicurioActiveVersionIndex]
      ) {
        entry.data =
          entry.apicurioVersions[entry.apicurioActiveVersionIndex].data;
      }
      return entry;
    }
    const initialVersion = {
      version: versionLabel,
      data: entry.data,
      createdOn: createdOn || new Date().toISOString(),
    };
    entry.apicurioVersions = [initialVersion];
    entry.apicurioActiveVersionIndex = 0;
    const seriesName = entry.title || getModelTitle(entry);
    ensureSeriesId(entry, { seriesName, fallbackTitle: seriesName });
    entry.isSeries = true;
    return entry;
  }

  function buildBlankMapPayload({
    seriesId = null,
    mapTitle = "Blank map",
  } = {}) {
    const baseId = makeDownloadName(
      `${seriesId || "blank"}-${makeTimestampSlug()}`
    );
    const payload = {
      id: baseId,
      title: mapTitle,
      categories: [],
      abstract: "",
    };
    if (seriesId) payload.seriesId = seriesId;
    ensureModelMetadata(payload, { titleHint: mapTitle, idHint: baseId });
    return payload;
  }

  function createBlankSeriesEntry() {
    const timestamp = makeTimestampSlug();
    const seriesTitle = `Blank series ${timestamp}`;
    const seriesId = makeSeriesId(seriesTitle, "blank-series");
    const blankMap = buildBlankMapPayload({
      seriesId,
      mapTitle: "Blank map",
    });
    const entry = {
      id: seriesId,
      title: seriesTitle,
      apicurioArtifactName: seriesTitle,
      data: blankMap,
      apicurioVersions: [
        {
          version: "1",
          data: blankMap,
          createdOn: new Date().toISOString(),
        },
      ],
      apicurioActiveVersionIndex: 0,
      isSeries: true,
    };
    applySeriesSlug(entry, seriesId);
    ensureSeriesId(entry, {
      seriesName: seriesTitle,
      fallbackTitle: seriesTitle,
    });
    return entry;
  }

  function createAndActivateBlankSeries() {
    const entry = createBlankSeriesEntry();
    const idx = addModelEntry(entry, { versionLabel: "blank" });
    setActive(idx);
    closeNewPanel();
    showNotice("Blank series created. Add categories and tiles to start.", 2600);
    return idx;
  }

  function addModelEntry(entry, { versionLabel, createdOn } = {}) {
    if (entry?.isSeries || entry?.apicurioVersions?.length > 1) {
      const name = entry.title || getModelTitle(entry);
      ensureSeriesId(entry, { seriesName: name, fallbackTitle: name });
      syncCategoryViewVersions(entry);
    }
    const modelId = getModelId(entry);
    if (!modelId) {
      ensureVersionContainer(entry, {
        versionLabel: versionLabel || "1",
        createdOn,
      });
      models.push(entry);
      return models.length - 1;
    }
    const existingIndex = models.findIndex((m) => getModelId(m) === modelId);
    if (existingIndex === -1) {
      ensureVersionContainer(entry, {
        versionLabel: versionLabel || "1",
        createdOn,
      });
      models.push(entry);
      return models.length - 1;
    }
    const target = models[existingIndex];
    if (
      !Array.isArray(target.apicurioVersions) ||
      !target.apicurioVersions.length
    ) {
      target.apicurioVersions = [
        {
          version: "1",
          data: target.data,
          createdOn: target.apicurioVersions?.[0]?.createdOn,
        },
      ];
      target.apicurioActiveVersionIndex = 0;
      const mergedName = target.title || getModelTitle(target);
      ensureSeriesId(target, {
        seriesName: mergedName,
        fallbackTitle: mergedName,
      });
    }
    const label = String(target.apicurioVersions.length + 1);
    target.apicurioVersions.push({
      version: label,
      data: entry.data,
      createdOn: createdOn || new Date().toISOString(),
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
      throw new Error("Load or select a model before creating a version.");
    }
    const target = models[activeIndex];
    ensureVersionContainer(target, { versionLabel: "1" });
    const nextId = deriveNextModelIdForVersion(target);
    let copy;
    try {
      copy = cloneModelData(target.data);
    } catch (error) {
      console.warn(
        "[Blockscape] failed to clone active model for versioning",
        error
      );
      throw new Error("Could not copy the current model.");
    }
    if (nextId) {
      copy.id = nextId;
    }
    ensureModelMetadata(copy, {
      titleHint: getModelTitle(target),
      idHint: getModelId(target) || getSeriesId(target),
    });
    const label =
      versionLabel || String((target.apicurioVersions?.length || 0) + 1);
    const newVersion = {
      version: label,
      data: copy,
      createdOn: new Date().toISOString(),
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
    const activeModel =
      activeIndex >= 0 && models[activeIndex] ? models[activeIndex] : null;
    const modelId = getModelId(activeModel);
    document.title = modelId ? `${modelId}-blockscape` : defaultDocumentTitle;
  }

  function buildSeriesPayload(entry) {
    if (!entry) return null;
    syncCategoryViewVersions(entry);
    const versions = entry.apicurioVersions;
    if (!Array.isArray(versions) || versions.length <= 1) return null;
    const seriesName =
      entry.title || entry.apicurioArtifactName || getModelTitle(entry);
    ensureSeriesId(entry, { seriesName, fallbackTitle: seriesName });
    const filtered = versions.filter((ver, idx) => {
      const versionId = (ver?.version ?? "").toString().trim();
      const dataId = (ver?.data?.id ?? ver?.id ?? "").toString().trim();
      if (ver?.isCategoryView || versionId.startsWith(CATEGORY_VIEW_VERSION_PREFIX)) {
        console.log(
          "[Blockscape] not saving computed map",
          { versionIndex: idx, versionId, dataId }
        );
        return false;
      }
      return true;
    });
    return filtered.map((ver) => {
      if (ver && typeof ver === "object" && "data" in ver) return ver.data;
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
      console.warn("[Blockscape] failed to stringify series", err);
      return null;
    }
  }

  function downloadCurrentJson(source = "shortcut", preferSeries = false) {
    const text = jsonBox.value || "";
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

    const seriesId = getSeriesId(active);
    const modelId = getModelId(active);
    const title = seriesId || modelId || getModelTitle(active, "blockscape");
    const suffix = isSeries ? "-series" : "";
    const filename = `${makeDownloadName(title)}${suffix}.bs`;
    download(filename, payloadText);
    console.log(`[Blockscape] saved JSON (${source}):`, filename);
    return true;
  }

  // --- NEW: letter → color mapping and helpers ---
  const LETTER_COLOR_MAP = tokens.palette.letter;
  const LETTER_COLOR_FALLBACK = tokens.palette.letterFallback;

  // Prefer explicit item.color (if present), else map by first letter.
  function getBadgeColor(text, explicit) {
    if (explicit && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(explicit))
      return explicit;
    const ch = (text || "?").charAt(0).toUpperCase();
    return LETTER_COLOR_MAP[ch] || LETTER_COLOR_FALLBACK; // fallback gray
  }

  // Compute readable letter color (black/white) against bg
  function idealTextColor(bgHex) {
    const hex = bgHex.replace("#", "");
    const expanded =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    const bigint = parseInt(expanded, 16);
    const r = (bigint >> 16) & 255,
      g = (bigint >> 8) & 255,
      b = bigint & 255;
    // luminance (sRGB)
    const L =
      0.2126 * Math.pow(r / 255, 2.2) +
      0.7152 * Math.pow(g / 255, 2.2) +
      0.0722 * Math.pow(b / 255, 2.2);
    return L > 0.35 ? tokens.color.ink : tokens.color.white;
  }

  function scrollPageToTop() {
    if (typeof window === "undefined" || typeof window.scrollTo !== "function")
      return;
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      window.scrollTo(0, 0);
    }
  }

  function ensureNoticeElements() {
    if (noticeEl) return;
    noticeEl = document.createElement("div");
    noticeEl.className = "series-nav-notice";
    const dot = document.createElement("span");
    dot.className = "series-nav-notice__dot";
    noticeTextEl = document.createElement("span");
    noticeTextEl.className = "series-nav-notice__text";
    noticeEl.appendChild(dot);
    noticeEl.appendChild(noticeTextEl);
    document.body.appendChild(noticeEl);
  }

  function clearNotice() {
    if (noticeTimer) {
      clearTimeout(noticeTimer);
      noticeTimer = null;
    }
    if (noticeEl) noticeEl.classList.remove("is-visible");
    if (noticeTextEl) noticeTextEl.textContent = "";
  }

  function clearSeriesNavNotice() {
    pendingSeriesNavigation = null;
    if (pendingSeriesNavigationTimer) {
      clearTimeout(pendingSeriesNavigationTimer);
      pendingSeriesNavigationTimer = null;
    }
    clearNotice();
  }

  function clearModelNavNotice() {
    pendingModelNavigation = null;
    if (pendingModelNavigationTimer) {
      clearTimeout(pendingModelNavigationTimer);
      pendingModelNavigationTimer = null;
    }
    clearNotice();
  }

  function describeSeriesVersion(entry, versionIndex) {
    if (!entry?.apicurioVersions?.[versionIndex])
      return `version ${versionIndex + 1}`;
    const label = entry.apicurioVersions[versionIndex].version;
    return label ? `version "${label}"` : `version ${versionIndex + 1}`;
  }

  function showSeriesNavNotice(id, targetVersionIndex, entry) {
    ensureNoticeElements();
    pendingSeriesNavigation = { id, targetVersionIndex };
    if (pendingSeriesNavigationTimer) {
      clearTimeout(pendingSeriesNavigationTimer);
    }
    pendingSeriesNavigationTimer = setTimeout(() => {
      pendingSeriesNavigationTimer = null;
      clearSeriesNavNotice();
    }, seriesNavDoubleClickWaitMs);
    const label = describeSeriesVersion(entry, targetVersionIndex);
    showNotice(
      `Click again to open ${label} in this series.`,
      seriesNavDoubleClickWaitMs
    );
  }

  function showModelNavNotice(id, targetIndex) {
    ensureNoticeElements();
    pendingModelNavigation = { id, targetIndex };
    if (pendingModelNavigationTimer) {
      clearTimeout(pendingModelNavigationTimer);
    }
    pendingModelNavigationTimer = setTimeout(() => {
      pendingModelNavigationTimer = null;
      clearModelNavNotice();
    }, seriesNavDoubleClickWaitMs);
    const label = getModelDisplayTitle(models[targetIndex]);
    showNotice(
      `Click again to open "${label}".`,
      seriesNavDoubleClickWaitMs
    );
  }

  function showNotice(message, timeout = NOTICE_TIMEOUT_MS, linkHref = null) {
    ensureNoticeElements();
    noticeTextEl.textContent = "";
    noticeTextEl.appendChild(document.createTextNode(message));
    if (linkHref) {
      const spacer = document.createTextNode(" ");
      const link = document.createElement("a");
      link.href = linkHref;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = linkHref;
      noticeTextEl.appendChild(spacer);
      noticeTextEl.appendChild(link);
    }
    noticeEl.classList.add("is-visible");
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => clearNotice(), timeout);
  }

  function renderShortcutHelpList() {
    if (!shortcutHelpList) return;
    shortcutHelpList.innerHTML = "";
    SHORTCUT_CONFIG.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "shortcut-help__row";

      const keys = document.createElement("div");
      keys.className = "shortcut-help__keys";
      entry.keys.forEach((combo, comboIdx) => {
        if (comboIdx > 0) {
          const or = document.createElement("span");
          or.className = "shortcut-help__or";
          or.textContent = "or";
          keys.appendChild(or);
        }
        const comboEl = document.createElement("div");
        comboEl.className = "shortcut-help__combo";
        combo.forEach((part, partIdx) => {
          if (partIdx > 0) {
            const sep = document.createElement("span");
            sep.className = "shortcut-help__sep";
            sep.textContent = "+";
            comboEl.appendChild(sep);
          }
          const chip = document.createElement("kbd");
          chip.className = "shortcut-help__key";
          chip.textContent = part;
          comboEl.appendChild(chip);
        });
        keys.appendChild(comboEl);
      });

      const desc = document.createElement("div");
      desc.className = "shortcut-help__desc";
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
    shortcutHelp.setAttribute("aria-hidden", "false");
    document.body.classList.add("shortcut-help-open");
    const panel = shortcutHelp.querySelector(".shortcut-help__panel");
    panel?.focus({ preventScroll: true });
  }

  function closeShortcutHelp() {
    if (!shortcutHelp || shortcutHelp.hidden) return;
    shortcutHelp.hidden = true;
    shortcutHelp.setAttribute("aria-hidden", "true");
    document.body.classList.remove("shortcut-help-open");
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
    newPanel.setAttribute("aria-hidden", "false");
    document.body.classList.add("shortcut-help-open");
    const panel = newPanel.querySelector(".shortcut-help__panel");
    panel?.focus({ preventScroll: true });
  }

  function closeNewPanel() {
    if (!newPanel || newPanel.hidden) return;
    newPanel.hidden = true;
    newPanel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("shortcut-help-open");
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
    return (query || "")
      .toString()
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  function applyActiveSearchFilter(query) {
    const terms = getSearchTerms(query);
    if (!terms.length) {
      app.querySelectorAll(".tile").forEach((t) => {
        t.style.opacity = "";
      });
      return;
    }
    app.querySelectorAll(".tile").forEach((t) => {
      const name = (t.querySelector(".name")?.textContent || "").toLowerCase();
      const id = (t.dataset.id || "").toLowerCase();
      const matches = terms.every(
        (term) => name.includes(term) || id.includes(term)
      );
      t.style.opacity = matches ? "1" : "0.2";
    });
  }

  function collectSearchMatches(query) {
    const terms = getSearchTerms(query);
    if (!terms.length) return [];
    const results = [];
    models.forEach((entry, modelIndex) => {
      const modelTitle = getModelDisplayTitle(entry);
      const modelId = getModelId(entry) || "";
      const modelHaystack = `${modelTitle} ${modelId}`.toLowerCase();
      if (terms.every((t) => modelHaystack.includes(t))) {
        results.push({
          type: "model",
          modelIndex,
          modelTitle,
          modelId,
        });
      }
      const categories = Array.isArray(entry.data?.categories)
        ? entry.data.categories
        : [];
      categories.forEach((cat) => {
        const catTitle = (cat.title || cat.id || "").toString();
        (cat.items || []).forEach((it) => {
          const name = (it.name || it.id || "").toString();
          const haystack = `${name} ${it.id || ""} ${catTitle}`.toLowerCase();
          if (terms.every((t) => haystack.includes(t))) {
            results.push({
              type: "item",
              modelIndex,
              modelTitle,
              modelId,
              itemId: it.id,
              itemName: name,
              categoryTitle: catTitle,
            });
          }
        });
      });
    });
    return results.slice(0, MAX_SEARCH_RESULTS);
  }

  function renderSearchResults(query) {
    if (!searchResults) return;
    searchResults.innerHTML = "";
    const trimmed = (query || "").toString();
    if (!trimmed.trim()) {
      searchResults.hidden = true;
      return;
    }
    if (!models.length) {
      const empty = document.createElement("div");
      empty.className = "search-results__empty";
      empty.textContent = "Load models to search";
      searchResults.appendChild(empty);
      searchResults.hidden = false;
      return;
    }
    const matches = collectSearchMatches(trimmed);
    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "search-results__empty";
      empty.textContent = "No matches yet";
      searchResults.appendChild(empty);
      searchResults.hidden = false;
      return;
    }
    matches.forEach((match) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-result";
      btn.dataset.modelIndex = String(match.modelIndex);
      if (match.itemId) btn.dataset.itemId = match.itemId;
      if (match.type) btn.dataset.type = match.type;
      if (
        match.modelIndex === activeIndex &&
        (!match.itemId || selection === match.itemId)
      ) {
        btn.classList.add("is-active");
      }

      const primary = document.createElement("div");
      primary.className = "search-result__primary";
      const title = document.createElement("span");
      title.textContent =
        match.type === "model"
          ? match.modelTitle
          : match.itemName || match.itemId || "Item";
      primary.appendChild(title);
      const badge = document.createElement("span");
      badge.className = "search-result__badge";
      badge.textContent =
        match.type === "item" ? match.categoryTitle || "Item" : "Model";
      primary.appendChild(badge);

      const meta = document.createElement("div");
      meta.className = "search-result__meta";
      const modelMeta = document.createElement("span");
      modelMeta.textContent = match.modelId
        ? `${match.modelTitle} · ${match.modelId}`
        : match.modelTitle;
      meta.appendChild(modelMeta);
      if (match.type === "item" && match.itemId) {
        const itemMeta = document.createElement("span");
        itemMeta.textContent = `Item ID: ${match.itemId}`;
        meta.appendChild(itemMeta);
      } else if (match.type === "model") {
        const scopeMeta = document.createElement("span");
        scopeMeta.textContent = "Matches model title";
        meta.appendChild(scopeMeta);
      }

      btn.appendChild(primary);
      btn.appendChild(meta);
      searchResults.appendChild(btn);
    });
    searchResults.hidden = false;
  }

  function handleSearchInput(value) {
    applyActiveSearchFilter(value || "");
    renderSearchResults(value || "");
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
      tile.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
      tile.focus({ preventScroll: true });
    });
  }

  function setActive(i) {
    hidePreview();
    clearSeriesNavNotice();
    lastDeletedItem = null;
    lastDeletedCategory = null;
    selectedCategoryId = null;
    categoryEntryHint = null;
    if (i < 0 || i >= models.length) {
      console.warn("[Blockscape] setActive called with out-of-range index:", i);
      return;
    }
    pendingInfoPreview = true;
    activeIndex = i;
    console.log(
      "[Blockscape] active model:",
      getModelTitle(models[i]),
      "(index",
      i + " )"
    );
    if (typeof localBackend?.highlightSource === "function") {
      const targetPath = models[i]?.sourcePath || null;
      localBackend.highlightSource(targetPath);
    }
    syncDocumentTitle();
    renderModelList();
    loadActiveIntoEditor();
    rebuildFromActive();
    if (searchInput) {
      handleSearchInput(searchInput.value || "");
    }
    localBackend.updateActiveSavePlaceholder();
    apicurio.updateAvailability();
    updateServerUrlFromActive();
  }

  function renderModelList() {
    modelList.innerHTML = "";
    if (!models.length) {
      const empty = document.createElement("li");
      empty.className = "model-nav-empty";
      empty.textContent = "No models loaded yet.";
      modelList.appendChild(empty);
      return;
    }

    models.forEach((m, i) => {
      const li = document.createElement("li");
      li.className = "model-nav-item";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "model-nav-button" + (i === activeIndex ? " is-active" : "");
      btn.dataset.index = String(i);
      btn.setAttribute("aria-current", i === activeIndex ? "true" : "false");

      const label = document.createElement("span");
      label.className = "model-nav-label";

      const titleSpan = document.createElement("span");
      titleSpan.className = "model-nav-title";
      titleSpan.textContent = getModelDisplayTitle(m);
      label.appendChild(titleSpan);

      const dataId = formatIdForDisplay(
        getModelSourceLabel(m) || getModelId(m)
      );
      if (dataId) {
        const idBadge = document.createElement("span");
        idBadge.className = "model-nav-id";
        idBadge.textContent = dataId;
        label.appendChild(idBadge);
      }

      const categories = Array.isArray(m.data?.categories)
        ? m.data.categories
        : [];
      const itemsCount = categories.reduce(
        (sum, cat) => sum + (cat.items || []).length,
        0
      );

      const meta = document.createElement("span");
      meta.className = "model-nav-meta";
      const versionsInfo =
        m.apicurioVersions && m.apicurioVersions.length > 1
          ? ` · ${m.apicurioVersions.length} maps`
          : "";
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

  function tryParseJson(txt) {
    try {
      return JSON.parse(txt);
    } catch {
      return null;
    }
  }

  function unwrapMarkdownCodeBlock(txt) {
    if (typeof txt !== "string") return txt;
    const match = txt.trim().match(/^```[a-zA-Z0-9_-]*\s*\r?\n([\s\S]*?)\r?\n```$/);
    return match ? match[1] : txt;
  }

  function buildCategoryViewVersions(entry) {
    const versions = (entry?.apicurioVersions || []).filter(
      (ver) => !ver?.isCategoryView
    );
    if (versions.length < 2) return [];

    const categoriesById = new Map();
    versions.forEach((ver, idx) => {
      const data = ver?.data;
      if (!data || !Array.isArray(data.categories)) return;
      const mapTitle = getModelTitle(data, `Map ${idx + 1}`);
      const mapId =
        (data.id ?? "").toString().trim() ||
        makeDownloadName(mapTitle || `map-${idx + 1}`);
      const mapSlug = makeDownloadName(mapId || mapTitle || `map-${idx + 1}`);
      data.categories.forEach((cat) => {
        const catId = (cat?.id ?? "").toString().trim();
        if (!catId) return;
        if (!categoriesById.has(catId)) {
          categoriesById.set(catId, {
            catTitle: cat.title || catId,
            sources: [],
          });
        }
        const record = categoriesById.get(catId);
        if (!record.catTitle && (cat.title || catId)) {
          record.catTitle = cat.title || catId;
        }
        record.sources.push({
          category: cat,
          mapId,
          mapTitle,
          mapSlug,
          versionIndex: idx,
        });
      });
    });

    const seriesId = getSeriesId(entry) || null;
    const seriesTitle =
      entry?.title ||
      entry?.apicurioArtifactName ||
      getModelTitle(entry, "Series");
    const derived = [];

    categoriesById.forEach((info, catId) => {
      if ((info.sources?.length || 0) < 2) return;
      const catTitle = info.catTitle || catId;
      const usedCategoryIds = new Set();

      const categories = info.sources.map((source) => {
        const baseCatId =
          source.mapSlug ||
          makeDownloadName(source.mapTitle || source.mapId) ||
          `map-${source.versionIndex + 1}`;
        let categoryId = baseCatId;
        if (usedCategoryIds.has(categoryId)) {
          categoryId = `${categoryId}-${source.versionIndex + 1}`;
        }
        usedCategoryIds.add(categoryId);

        const idMap = new Map();
        const items = (source.category?.items || []).map((item, itemIdx) => {
          const originalId =
            (item?.id ?? "").toString().trim() || `item-${itemIdx + 1}`;
          const nextId = `${categoryId}-${originalId}`;
          idMap.set(originalId, nextId);
          const clone = { ...item, id: nextId };
          clone.deps = Array.isArray(item?.deps) ? [...item.deps] : [];
          return clone;
        });

        items.forEach((clone) => {
          clone.deps = (clone.deps || [])
            .map((dep) => idMap.get(dep))
            .filter(Boolean);
        });

        return {
          id: categoryId,
          title:
            source.mapTitle ||
            source.mapId ||
            `Map ${source.versionIndex + 1}`,
          items,
        };
      });

      const viewData = {
        id: makeDownloadName(`${catId}-category-view`),
        title: catTitle,
        abstract: `Items from "${catTitle}" across ${
          info.sources.length
        } maps in this series${seriesTitle ? ` (${seriesTitle})` : ""}.`,
        categories,
      };
      if (seriesId) viewData.seriesId = seriesId;

      ensureModelMetadata(viewData, {
        titleHint: catTitle,
        idHint: `${seriesId || "series"}-${catId}`,
      });

      derived.push({
        version: `${CATEGORY_VIEW_VERSION_PREFIX}${catId}`,
        data: viewData,
        isCategoryView: true,
        categoryViewKey: catId,
      });
    });

    return derived;
  }

  function getVersionViewKey(version) {
    if (!version) return null;
    if (version.isCategoryView && version.categoryViewKey) {
      return `${CATEGORY_VIEW_VERSION_PREFIX}${version.categoryViewKey}`;
    }
    const dataId = (version.data?.id ?? version.id ?? "")
      .toString()
      .trim();
    if (dataId) return dataId;
    const label = (version.version ?? "").toString().trim();
    return label || null;
  }

  function syncCategoryViewVersions(entry) {
    if (!entry?.apicurioVersions?.length) return entry;
    const prevKey = getVersionViewKey(
      entry.apicurioVersions[entry.apicurioActiveVersionIndex]
    );
    const baseVersions = entry.apicurioVersions.filter(
      (ver) => !ver?.isCategoryView
    );
    if (!baseVersions.length) return entry;
    if (baseVersions.length < 2) {
      entry.apicurioVersions = baseVersions;
      entry.apicurioActiveVersionIndex = Math.max(
        0,
        Math.min(
          getActiveApicurioVersionIndex(entry),
          entry.apicurioVersions.length - 1
        )
      );
      const active =
        entry.apicurioVersions[entry.apicurioActiveVersionIndex];
      if (active?.data) entry.data = active.data;
      return entry;
    }
    const derived = buildCategoryViewVersions({
      ...entry,
      apicurioVersions: baseVersions,
    });
    entry.apicurioVersions = [...baseVersions, ...derived];
    let nextActiveIdx = entry.apicurioVersions.findIndex(
      (ver) => getVersionViewKey(ver) === prevKey
    );
    if (nextActiveIdx === -1) {
      nextActiveIdx = Math.min(
        entry.apicurioActiveVersionIndex || 0,
        entry.apicurioVersions.length - 1
      );
    }
    entry.apicurioActiveVersionIndex = Math.max(nextActiveIdx, 0);
    const active =
      entry.apicurioVersions[entry.apicurioActiveVersionIndex];
    if (active?.data) entry.data = active.data;
    return entry;
  }

  function buildSeriesEntry(list, titleBase = "Pasted", options = {}) {
    const array = Array.isArray(list) ? list : [];
    if (!array.length) return [];

    const normalized = array
      .map((obj, idx) => {
        if (!obj || typeof obj !== "object") return null;
        ensureModelMetadata(obj, { titleHint: `${titleBase} #${idx + 1}` });
        return { obj, idx };
      })
      .filter(Boolean);

    if (!normalized.length) return [];

    const first = normalized[0].obj;
    const { seriesTitleOverride } = options;
    let seriesTitle =
      seriesTitleOverride || first.title || `${titleBase} series`;
    if (seriesTitleOverride && !first.title) {
      first.title = seriesTitleOverride;
    }
    const entry = {
      id: uid(),
      title: seriesTitle,
      data: first,
      apicurioVersions: normalized.map(({ obj, idx }) => ({
        version: String(idx + 1),
        data: obj,
      })),
      apicurioActiveVersionIndex: 0,
      isSeries: true,
    };
    const seriesId = ensureSeriesId(entry, {
      seriesName: seriesTitle,
      fallbackTitle: seriesTitle,
    });
    if (seriesId) entry.id = seriesId;
    syncCategoryViewVersions(entry);
    return [entry];
  }

  function normalizeToModelsFromValue(
    value,
    titleBase = "Pasted",
    options = {}
  ) {
    if (Array.isArray(value)) {
      return buildSeriesEntry(value, titleBase, options);
    }
    if (!value || typeof value !== "object") return [];
    ensureModelMetadata(value, { titleHint: `${titleBase} #1` });
    return [
      {
        id: uid(),
        title: value.title || `${titleBase} #1`,
        data: value,
      },
    ];
  }

  // Accept 1) object, 2) array-of-objects, 3) '---' or '%%%' separated objects
  function normalizeToModelsFromText(txt, titleBase = "Pasted", options = {}) {
    const defenced = unwrapMarkdownCodeBlock(typeof txt === "string" ? txt : "");
    const trimmed = (defenced || "").trim();
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
          seriesTitleOverride: userTitle || defaultTitle,
        };
      }
      const normalized = normalizeToModelsFromValue(
        parsed,
        titleBase,
        normalizeOptions
      );
      if (normalized.length) return normalized;
    }
    const parts = trimmed
      .split(/^\s*(?:---|%%%)\s*$/m)
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.map((p, i) => {
      const obj = JSON.parse(p);
      ensureModelMetadata(obj, { titleHint: `${titleBase} #${i + 1}` });
      return {
        id: uid(),
        title: obj.title || `${titleBase} #${i + 1}`,
        data: obj,
      };
    });
  }

  function isEditableElement(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select";
  }

  function shouldHandleGlobalPaste() {
    const active = document.activeElement;
    if (
      !active ||
      active === document.body ||
      active === document.documentElement
    )
      return true;
    return !isEditableElement(active);
  }

  function looksLikeModelJson(text) {
    if (!text) return false;
    const defenced = unwrapMarkdownCodeBlock(text) || "";
    const start = defenced.trimStart();
    return /^\s*(\{|\[|---|%%%)/.test(start);
  }

  function consumeEditorPayload() {
    if (typeof window === "undefined" || !window.localStorage) return null;
    let raw;
    try {
      raw = localStorage.getItem(EDITOR_TRANSFER_KEY);
    } catch (err) {
      console.warn("[Blockscape] failed to access editor payload", err);
      return null;
    }
    if (!raw) return null;
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      console.warn("[Blockscape] invalid payload JSON", err);
      try {
        localStorage.removeItem(EDITOR_TRANSFER_KEY);
      } catch (_) {}
      return null;
    }
    if (payload?.source !== "editor") return null;
    try {
      localStorage.removeItem(EDITOR_TRANSFER_KEY);
    } catch (err) {
      console.warn("[Blockscape] failed to clear editor payload", err);
    }
    if (!payload.text || typeof payload.text !== "string") {
      console.warn("[Blockscape] payload missing text");
      return null;
    }
    let entries = [];
    try {
      entries = normalizeToModelsFromText(
        payload.text,
        payload.title || "Editor Export"
      );
    } catch (err) {
      console.warn("[Blockscape] could not parse payload text", err);
      return null;
    }
    if (!entries.length) return null;
    let firstIndex = null;
    entries.forEach((entry) => {
      const idx = addModelEntry(entry, { versionLabel: "editor" });
      if (firstIndex == null) firstIndex = idx;
    });
    console.log(`[Blockscape] imported ${entries.length} model(s) from editor`);
    return { index: firstIndex, count: entries.length };
  }

  function importEditorPayload(trigger = "storage") {
    const result = consumeEditorPayload();
    if (!result || typeof result.index !== "number") return false;
    setActive(result.index);
    console.log(
      `[Blockscape] imported ${result.count} model(s) from editor via ${trigger}.`
    );
    return true;
  }

  function updateShareHashForModel(model, fallbackTitle = "Shared Model") {
    if (!model || !model.data) {
      throw new Error("Select or load a model before sharing.");
    }
    let encoded;
    const payload = {
      title: getModelTitle(model, fallbackTitle),
      data: model.data,
    };
    try {
      encoded = base64UrlEncode(JSON.stringify(payload));
    } catch (err) {
      console.error("[Blockscape] share encode failed", err);
      throw new Error("Unable to encode this model for sharing.");
    }

    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.delete("share");
    shareUrl.hash = `share=${encoded}`;

    try {
      window.history.replaceState({}, document.title, shareUrl.toString());
    } catch (err) {
      console.warn("[Blockscape] failed to update URL for share", err);
      window.location.hash = shareUrl.hash;
    }
    return shareUrl;
  }

  function consumeShareLink() {
    const hash = window.location.hash || "";
    let token = null;
    let source = null;

    const hashMatch = hash.match(/share=([^&]+)/);
    if (hashMatch) {
      token = hashMatch[1];
      source = "hash";
    }

    if (!token) {
      const params = new URLSearchParams(window.location.search);
      if (params.has("share")) {
        token = params.get("share");
        source = "search";
      }
    }

    if (!token) return null;

    let payload;
    try {
      const text = base64UrlDecode(token);
      payload = JSON.parse(text);
    } catch (err) {
      console.warn("[Blockscape] failed to decode share token", err);
      return null;
    }

    if (!payload || typeof payload !== "object" || payload.data == null) {
      console.warn("[Blockscape] share payload missing data");
      return null;
    }

    const entries = normalizeToModelsFromValue(
      payload.data,
      payload.title || "Shared Model"
    );
    if (!entries.length) {
      console.warn("[Blockscape] share payload did not contain usable models");
      return null;
    }

    let firstIndex = null;
    entries.forEach((entry) => {
      const seriesName = entry.isSeries ? payload.title || entry.title : null;
      const idx = addModelEntry(
        {
          ...entry,
          apicurioArtifactName: seriesName || entry.apicurioArtifactName,
        },
        { versionLabel: "shared" }
      );
      if (firstIndex == null) firstIndex = idx;
    });

    return firstIndex;
  }

  async function consumeServerPathLoad() {
    const serverPath = extractServerFilePathFromUrl();
    if (!serverPath?.path) return null;
    const { path: relPath, modelId, itemId } = serverPath;
    try {
      const backendReady = await isLocalBackendReady();
      if (!backendReady) {
        console.log(
          "[Blockscape] local backend not ready; skipping server-path autoload"
        );
        return null;
      }
      const result = await importLocalBackendFile(relPath);
      if (typeof result?.firstIndex === "number") {
        if (typeof localBackend?.highlightSource === "function") {
          localBackend.highlightSource(relPath);
        }
        let modelIndex = result.firstIndex;
        if (modelId) {
          const found = findModelIndexByIdOrSource(modelId);
          if (found !== -1) {
            modelIndex = found;
          }
        }
        return { modelIndex, itemId: itemId || null, modelId: modelId || null };
      }
      return null;
    } catch (err) {
      console.warn("[Blockscape] server-path autoload failed", err);
      return null;
    }
  }

  async function consumeLoadParam() {
    const hash = window.location.hash || "";
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
      if (params.has("load")) {
        target = params.get("load");
      }
    }

    if (!target) return null;

    try {
      const idx = await loadFromUrl(target);
      return typeof idx === "number" ? idx : null;
    } catch (err) {
      console.warn("[Blockscape] load param failed", err);
      return null;
    }
  }

  function parse(mObj) {
    console.log(
      "[Blockscape] parsing model; categories=",
      (mObj?.categories || []).length
    );
    const fwd = new Map();
    const rev = new Map();
    const seen = new Set();

    (mObj.categories || []).forEach((c) =>
      (c.items || []).forEach((it) => {
        seen.add(it.id);
        const deps = new Set(it.deps || []);
        fwd.set(it.id, deps);
        deps.forEach((d) => {
          if (!rev.has(d)) rev.set(d, new Set());
          rev.get(d).add(it.id);
        });
      })
    );

    const reusedLocal = new Set();
    rev.forEach((dependents, node) => {
      if ((dependents?.size || 0) >= 2) reusedLocal.add(node);
    });
    return { m: mObj, fwd, rev, reusedLocal, seen };
  }

  // --- MODIFIED: color-aware letter image ---
  function generateLetterImage(text, explicitColor) {
    console.log("[Blockscape] generateLetterImage for:", text);
    const canvas = document.createElement("canvas");
    const size = 44;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    const letter = (text || "?").charAt(0).toUpperCase();
    const bg = getBadgeColor(text, explicitColor);
    const fg = idealTextColor(bg);

    // Circle
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
    ctx.fill();

    // Subtle ring
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Letter
    ctx.fillStyle = fg;
    ctx.font = `bold ${size * 0.5}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, size / 2, size / 2);

    return canvas.toDataURL("image/png");
  }

  function getActiveApicurioVersionIndex(entry) {
    if (!entry?.apicurioVersions?.length) return -1;
    const idx = Number.isInteger(entry.apicurioActiveVersionIndex)
      ? entry.apicurioActiveVersionIndex
      : 0;
    return Math.min(Math.max(idx, 0), entry.apicurioVersions.length - 1);
  }

  function getActiveApicurioVersionLabel(entry) {
    const idx = getActiveApicurioVersionIndex(entry);
    if (idx === -1) return null;
    const versionEntry = entry.apicurioVersions[idx];
    return versionEntry?.version ?? null;
  }

  function getThumbScrollKey(entry, fallback = "active") {
    return (
      getSeriesId(entry) ||
      getModelId(entry) ||
      entry?.apicurioArtifactId ||
      entry?.id ||
      fallback
    );
  }

  function buildModelIdToVersionIndex(entry) {
    const map = new Map();
    (entry?.apicurioVersions || []).forEach((ver, idx) => {
      const id = (ver?.data?.id ?? "").toString().trim();
      if (id) map.set(id, idx);
      const seriesId = (ver?.data?.seriesId ?? "").toString().trim();
      if (seriesId && !map.has(seriesId)) map.set(seriesId, idx);
    });
    return map;
  }

  function resolveVersionIndexFromCategory(cat, seriesIdLookup) {
    if (!cat || !seriesIdLookup) return null;
    const candidates = new Set();
    const addCandidate = (value) => {
      const trimmed = (value ?? "").toString().trim();
      if (!trimmed) return;
      candidates.add(trimmed);
      candidates.add(trimmed.toLowerCase());
      candidates.add(makeDownloadName(trimmed));
    };
    addCandidate(cat.id);
    addCandidate(cat.title);

    for (const cand of candidates) {
      if (seriesIdLookup.has(cand)) return seriesIdLookup.get(cand);
    }

    for (const cand of candidates) {
      const lower = cand.toLowerCase();
      for (const [key, idx] of seriesIdLookup.entries()) {
        if (key.toLowerCase() === lower) return idx;
      }
    }
    return null;
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
    const height = 160;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const canvasBg =
      getCssVarValue("--color-surface-ghost") || tokens.color.surfaceGhost;
    const canvasBorder =
      getCssVarValue("--color-border-muted") || tokens.color.borderMuted;
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = canvasBorder;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    const topPad = 8;
    const bottomPad = 8;
    const dotRadius = 4;
    const cats = Array.isArray(payload?.categories) ? payload.categories : [];
    const catCount = Math.max(cats.length, 1);
    const usableWidth = width - dotRadius * 2;
    const desiredColGap = dotRadius * 3; // diameter + extra radius for breathing room
    const colGap =
      catCount > 1
        ? Math.min(desiredColGap, usableWidth / (catCount - 1))
        : 0;
    const colStart =
      catCount > 1
        ? (width - colGap * (catCount - 1)) / 2
        : width / 2;

    cats.forEach((cat, cIdx) => {
      const xCenter = colStart + cIdx * colGap;
      const items = Array.isArray(cat.items) ? cat.items : [];
      const itemCount = Math.max(items.length, 1);
      const availableHeight = height - topPad - bottomPad - dotRadius * 2;
      const gap =
        itemCount > 1
          ? Math.min(dotRadius * 3, availableHeight / (itemCount - 1))
          : 0;
      items.forEach((it, iIdx) => {
        const y = height - bottomPad - dotRadius - iIdx * gap;
        ctx.beginPath();
        ctx.arc(xCenter, y, dotRadius, 0, Math.PI * 2);
        const fill = getBadgeColor(it.name || it.id || "", it.color);
        ctx.fillStyle = fill;
        ctx.strokeStyle = "rgba(15,23,42,0.25)";
        ctx.fill();
        ctx.stroke();
      });
    });

    const dataUrl = canvas.toDataURL("image/png");
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
    syncSelectionClass();
    loadActiveIntoEditor();
    rebuildFromActive();
    return true;
  }

  function stepApicurioVersion(step) {
    if (!step || activeIndex < 0) return false;
    const entry = models[activeIndex];
    if (!entry?.apicurioVersions?.length) return false;
    const current = getActiveApicurioVersionIndex(entry);
    if (current === -1) return false;
    return setActiveApicurioVersion(activeIndex, current + step);
  }

  function removeApicurioVersion(entryIndex, versionIndex) {
    clearSeriesNavNotice();
    if (entryIndex < 0 || entryIndex >= models.length) return false;
    const entry = models[entryIndex];
    if (
      !Array.isArray(entry?.apicurioVersions) ||
      entry.apicurioVersions.length <= 1
    ) {
      alert(
        "A series needs at least one map. Add another before removing this one."
      );
      return false;
    }
    if (!persistActiveEdits(entryIndex)) return false;
    const normalized = Math.min(
      Math.max(versionIndex, 0),
      entry.apicurioVersions.length - 1
    );
    const activeBefore = getActiveApicurioVersionIndex(entry);
    const [removed] = entry.apicurioVersions.splice(normalized, 1);
    if (!removed) return false;

    let nextActive = activeBefore;
    if (normalized === activeBefore) {
      nextActive = Math.min(normalized, entry.apicurioVersions.length - 1);
    } else if (normalized < activeBefore) {
      nextActive = Math.max(0, activeBefore - 1);
    }
    entry.apicurioActiveVersionIndex = Math.max(0, nextActive);
    const activeEntry =
      entry.apicurioVersions[entry.apicurioActiveVersionIndex];
    entry.data = activeEntry?.data || entry.data;
    entry.isSeries = entry.apicurioVersions.length > 1;
    setActive(entryIndex);
    return true;
  }

  function renderVersionNavigator(entry) {
    if (!entry?.apicurioVersions || !entry.apicurioVersions.length) return null;
    const minVersions = Math.max(1, features.seriesNavMinVersions || 1);
    if (entry.apicurioVersions.length < minVersions) return null;
    const nav = document.createElement("div");
    nav.className = "version-nav";

    const title = document.createElement("div");
    title.className = "version-nav__title";
    title.textContent =
      entry.apicurioArtifactName ||
      entry.apicurioArtifactId ||
      getModelId(entry) ||
      "Artifact";
    title.title = "Double-click to rename this series";
    title.setAttribute("role", "button");
    title.tabIndex = 0;
    title.addEventListener("dblclick", () => {
      const target = models[activeIndex];
      if (!target?.apicurioVersions?.length) return;
      const renamed = renameSeries(target);
      if (!renamed) return;
      renderModelList();
      loadActiveIntoEditor();
      rebuildFromActive();
    });
    nav.appendChild(title);

    const status = document.createElement("div");
    status.className = "version-nav__status";
    const activeIdx = getActiveApicurioVersionIndex(entry);
    const activeVersionLabel = getActiveApicurioVersionLabel(entry) || "latest";
    status.textContent = `No. in series ${activeVersionLabel} (${
      activeIdx + 1
    } of ${entry.apicurioVersions.length})`;
    nav.appendChild(status);

    const controls = document.createElement("div");
    controls.className = "version-nav__controls";
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "version-nav__button";
    prevBtn.textContent = "Previous";
    prevBtn.addEventListener("click", () => stepApicurioVersion(-1));

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "version-nav__button";
    nextBtn.textContent = "Next";
    nextBtn.addEventListener("click", () => stepApicurioVersion(1));

    controls.appendChild(prevBtn);
    controls.appendChild(nextBtn);
    nav.appendChild(controls);

    const thumbs = document.createElement("div");
    thumbs.className = "version-nav__thumbs";
    entry.apicurioVersions.forEach((ver, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "version-nav__thumb";
      if (ver?.isCategoryView) btn.classList.add("version-nav__thumb--category");
      if (idx === activeIdx) btn.classList.add("is-active");
      const thumbUrl = getSeriesThumbnail(entry, idx);
      if (thumbUrl) {
        const img = document.createElement("img");
        img.src = thumbUrl;
        img.alt = `Version ${idx + 1}`;
        btn.appendChild(img);
      }
      const lbl = document.createElement("div");
      lbl.className = "version-nav__thumb-label";
      const lblText = document.createElement("span");
      lblText.className = "version-nav__thumb-label-text";
      const fullId = (ver?.data?.id ?? ver?.id ?? "").toString().trim();
      let labelValue =
        fullId || (ver?.version ? `v${ver.version}` : `${idx + 1}`);
      let labelTitle = fullId || labelValue;
      if (ver?.isCategoryView) {
        const catLabel =
          ver.data?.title || ver.categoryViewKey || labelValue || "Category";
        labelValue = catLabel;
        labelTitle = `Category view: ${catLabel}`;
        btn.dataset.computed = "true";
      }
      lblText.textContent = labelValue;
      lbl.title = labelTitle;
      lbl.appendChild(lblText);
      btn.appendChild(lbl);
      registerThumbLabel(lbl, lblText);
      if (entry.apicurioVersions.length > 1 && !ver?.isCategoryView) {
        const removeBtn = document.createElement("span");
        removeBtn.className = "version-nav__thumb-remove";
        removeBtn.title = `Remove ${labelValue} from this series`;
        removeBtn.setAttribute(
          "aria-label",
          `Remove ${labelValue} from this series`
        );
        removeBtn.setAttribute("role", "button");
        removeBtn.tabIndex = -1;
        removeBtn.textContent = "×";
        removeBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          event.preventDefault();
          const confirmed = window.confirm(
            `Remove ${labelValue} from this series?`
          );
          if (!confirmed) return;
          removeApicurioVersion(activeIndex, idx);
        });
        btn.appendChild(removeBtn);
      }
      btn.addEventListener("click", () =>
        setActiveApicurioVersion(activeIndex, idx)
      );
      attachSeriesPreviewHover(btn, ver);
      thumbs.appendChild(btn);
    });

    const addThumb = document.createElement("button");
    addThumb.type = "button";
    addThumb.className = "version-nav__thumb version-nav__thumb--add";
    addThumb.title = "Create a new version from this map";
    addThumb.addEventListener("click", () => {
      try {
        const idx = createNewVersionFromActive({ versionLabel: "manual" });
        setActive(idx);
      } catch (err) {
        alert(err?.message || "Unable to create a new version right now.");
      }
    });
    const addIcon = document.createElement("span");
    addIcon.className = "version-nav__thumb-add-icon";
    addIcon.textContent = "+";
    addThumb.appendChild(addIcon);
    thumbs.appendChild(addThumb);

    nav.appendChild(thumbs);

    const scrollKey = getThumbScrollKey(entry, "active");
    const savedScroll = versionThumbScroll.get(scrollKey);
    if (typeof savedScroll === "number" && !Number.isNaN(savedScroll)) {
      requestAnimationFrame(() => {
        thumbs.scrollLeft = savedScroll;
      });
    }
    thumbs.addEventListener("scroll", () => {
      versionThumbScroll.set(scrollKey, thumbs.scrollLeft);
    });

    return nav;
  }

  // ===== Render =====
  function render() {
    if (!model) return;
    const activeModelEntry =
      activeIndex >= 0 && models[activeIndex] ? models[activeIndex] : null;
    const prevThumbs =
      app && app.querySelector
        ? app.querySelector(".version-nav__thumbs")
        : null;
    if (prevThumbs && activeModelEntry) {
      const key = getThumbScrollKey(activeModelEntry, activeIndex);
      versionThumbScroll.set(key, prevThumbs.scrollLeft);
    }
    hideTabTooltip();
    if (!Array.isArray(model.m.categories)) {
      model.m.categories = [];
    }
    console.log(
      "[Blockscape] rendering categories=",
      model.m.categories.length
    );
    console.log(
      "[Blockscape] model.m has abstract?",
      !!model.m.abstract,
      "- value:",
      model.m.abstract ? model.m.abstract.substring(0, 50) + "..." : "none"
    );
    app.innerHTML = "";
    index.clear();
    categoryIndex.clear();
    versionThumbLabels = [];

    ensureVersionContainer(models[activeIndex], { versionLabel: "1" });
    const versionNav = renderVersionNavigator(models[activeIndex]);
    if (versionNav) {
      app.appendChild(versionNav);
    }

    overlay.setAttribute("width", window.innerWidth);
    overlay.setAttribute("height", window.innerHeight);

    const buildModelMeta = () => {
      const meta = document.createElement("div");
      meta.className = "blockscape-model-meta";

      const titleEl = document.createElement("div");
      titleEl.className = "blockscape-model-title";
      titleEl.textContent =
        (model.m.title && model.m.title.trim()) ||
        getModelTitle(models[activeIndex]);
      meta.appendChild(titleEl);

      // Ensure series ID is present for display if this entry is a series.
      if (
        models[activeIndex]?.isSeries ||
        models[activeIndex]?.apicurioVersions?.length
      ) {
        ensureSeriesId(models[activeIndex], {
          seriesName:
            models[activeIndex].title ||
            model.m.title ||
            getModelTitle(models[activeIndex]),
        });
      }

      const activeVersionLabel = getActiveApicurioVersionLabel(
        models[activeIndex]
      );
      const seriesId = getSeriesId(models[activeIndex]);
      const modelId = (model.m.id ?? "").toString().trim();

      const detailsRow = document.createElement("div");
      detailsRow.className = "blockscape-model-meta__details";

      const addMetaDetail = (label, value) => {
        if (!value) return;
        const wrapper = document.createElement("div");
        wrapper.className = "blockscape-model-id";
        const labelSpan = document.createElement("span");
        labelSpan.className = "blockscape-model-id__label";
        labelSpan.textContent = label;
        const valueSpan = document.createElement("span");
        valueSpan.className = "blockscape-model-id__value";
        valueSpan.textContent = value;
        wrapper.append(labelSpan, valueSpan);
        detailsRow.appendChild(wrapper);
      };

      addMetaDetail("Series ID", seriesId);
      addMetaDetail("Model ID", modelId);
      addMetaDetail("No. in series", activeVersionLabel);

      if (detailsRow.childElementCount) {
        meta.appendChild(detailsRow);
      }

      return meta;
    };

    const modelMeta = buildModelMeta();
    const showModelMeta = features.showModelMeta !== false;
    if (showModelMeta) {
      app.appendChild(modelMeta.cloneNode(true));
    }
    const tabsWrapper = document.createElement("div");
    tabsWrapper.className = "blockscape-tabs";

    const tabHeader = document.createElement("div");
    tabHeader.className = "blockscape-tabrow";

    const tabList = document.createElement("div");
    tabList.className = "blockscape-tablist";
    tabList.setAttribute("role", "tablist");
    tabHeader.appendChild(tabList);

    const tabActions = document.createElement("div");
    tabActions.className = "blockscape-tabactions";
    tabHeader.appendChild(tabActions);

    tabsWrapper.appendChild(tabHeader);

    const panelsWrapper = document.createElement("div");
    panelsWrapper.className = "blockscape-tabpanels";
    tabsWrapper.appendChild(panelsWrapper);

    const mapPanel = document.createElement("div");
    const abstractPanel = document.createElement("div");
    const sourcePanel = document.createElement("div");
    const apicurioPanel = document.createElement("div");
    const createLegend = () => {
      const wrapper = document.createElement("div");
      wrapper.className = "blockscape-map-legend";
      const legend = document.createElement("div");
      legend.className = "blockscape-legend";
      legend.setAttribute("role", "presentation");
      legend.innerHTML = `
        <span class="legend-entry"><span class="legend-dot legend-dot--dep"></span> enables</span>
        <span class="legend-entry"><span class="legend-dot legend-dot--revdep"></span> dependents</span>
        <span class="legend-entry"><span class="legend-dot legend-dot--reused"></span> reused</span>
        <span class="legend-entry"><span class="legend-dot legend-dot--external"></span> external link</span>
      `;
      wrapper.appendChild(legend);
      return wrapper;
    };
    let infoTooltipHtml = "";
    const seriesIdLookup = buildModelIdToVersionIndex(models[activeIndex]);
    const activeSeriesIndex = getActiveApicurioVersionIndex(
      models[activeIndex]
    );
    const activeVersionEntry =
      models[activeIndex]?.apicurioVersions?.[activeSeriesIndex] || null;
    const activeIsCategoryView =
      (activeViewIsCategory = Boolean(
        activeVersionEntry?.isCategoryView ||
          (activeVersionEntry?.version || "").startsWith(
            CATEGORY_VIEW_VERSION_PREFIX
          )
      ));
    infoTabButton = null;
    activeInfoTooltipHtml = "";

    const appendTitleLine = (el, text) => {
      if (!el || !text) return;
      el.title = el.title ? `${el.title}\n${text}` : text;
    };

    const tabDefs = [
      { id: "map", label: "Map", panel: mapPanel },
      { id: "abstract", label: "Info", panel: abstractPanel },
      { id: "source", label: "Settings", panel: sourcePanel },
      { id: "apicurio", label: "Apicurio", panel: apicurioPanel },
    ];
    const apicurioInitiallyEnabled =
      typeof apicurio.isEnabled === "function" ? apicurio.isEnabled() : false;

    const handleTabVisibility = (tabId) => {
      if (!overlay) return;
      const showOverlay = tabId === "map";
      overlay.hidden = !showOverlay;
      if (showOverlay) {
        reflowRects();
        drawLinks();
      } else {
        overlay.innerHTML = "";
      }
    };

    tabDefs.forEach((tab, idx) => {
      const button = document.createElement("button");
      button.type = "button";
      button.id = `tab-${tab.id}`;
      button.className = "blockscape-tab" + (idx === 0 ? " is-active" : "");
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", `panel-${tab.id}`);
      button.setAttribute("aria-selected", idx === 0 ? "true" : "false");
      button.textContent = tab.label;
      if (tab.id === "apicurio" && !apicurioInitiallyEnabled) {
        button.hidden = true;
        button.tabIndex = -1;
        button.setAttribute("aria-hidden", "true");
        button.style.display = "none";
      }
      tab.button = button;
      tabList.appendChild(button);

      tab.panel.id = `panel-${tab.id}`;
      tab.panel.classList.add("blockscape-tabpanel");
      tab.panel.setAttribute("role", "tabpanel");
      tab.panel.setAttribute("aria-labelledby", button.id);
      tab.panel.hidden = idx === 0 ? false : true;
      if (idx === 0) tab.panel.classList.add("is-active");
      panelsWrapper.appendChild(tab.panel);
    });

    const activateTab = (targetId) => {
      lastActiveTabId = targetId;
      tabDefs.forEach((t) => {
        const isActive = t.id === targetId;
        t.button.classList.toggle("is-active", isActive);
        t.button.setAttribute("aria-selected", isActive ? "true" : "false");
        t.panel.classList.toggle("is-active", isActive);
        t.panel.hidden = !isActive;
      });
      handleTabVisibility(targetId);
    };

    const apicurioTab = tabDefs.find((t) => t.id === "apicurio");
    const syncApicurioTabVisibility = (enabled) => {
      if (!apicurioTab || !apicurioTab.button || !apicurioTab.panel) return;
      const show = !!enabled;
      apicurioTab.button.hidden = !show;
      apicurioTab.button.tabIndex = show ? 0 : -1;
      apicurioTab.button.setAttribute("aria-hidden", show ? "false" : "true");
      apicurioTab.button.style.display = show ? "" : "none";
      if (!show) {
        const wasActive = apicurioTab.panel.classList.contains("is-active");
        apicurioTab.button.classList.remove("is-active");
        apicurioTab.button.setAttribute("aria-selected", "false");
        apicurioTab.panel.classList.remove("is-active");
        apicurioTab.panel.hidden = true;
        if (wasActive) {
          const fallback = tabDefs.find((t) => t.id !== "apicurio");
          if (fallback) activateTab(fallback.id);
        }
      } else {
        const isActive = lastActiveTabId === "apicurio";
        apicurioTab.button.classList.toggle("is-active", isActive);
        apicurioTab.button.setAttribute(
          "aria-selected",
          isActive ? "true" : "false"
        );
        apicurioTab.panel.classList.toggle("is-active", isActive);
        apicurioTab.panel.hidden = !isActive;
      }
      if (apicurioSettingsToggle) {
        apicurioSettingsToggle.checked = show;
      }
    };

    tabDefs.forEach((t) => {
      t.button.addEventListener("click", () => {
        hideTabTooltip();
        activateTab(t.id);
      });
      if (t.id === "abstract") {
        infoTabButton = t.button;
        t.button.addEventListener("mouseenter", () =>
          showTabTooltip(t.button, infoTooltipHtml, { offset: 12 })
        );
        t.button.addEventListener("mouseleave", hideTabTooltip);
        t.button.addEventListener("focus", () =>
          showTabTooltip(t.button, infoTooltipHtml, { offset: 12 })
        );
        t.button.addEventListener("blur", hideTabTooltip);
      }
    });

    const resolveInitialTabId = (apicurioEnabled) => {
      const preferred = tabDefs.find((t) => t.id === lastActiveTabId);
      if (preferred && (preferred.id !== "apicurio" || apicurioEnabled))
        return preferred.id;
      const firstVisible = tabDefs.find(
        (t) => t.id !== "apicurio" || apicurioEnabled
      );
      return firstVisible?.id || tabDefs[0].id;
    };

    const initialTabId = resolveInitialTabId(apicurioInitiallyEnabled);
    activateTab(initialTabId);
    syncApicurioTabVisibility(apicurioInitiallyEnabled);
    if (typeof apicurio.onEnabledChange === "function") {
      apicurio.onEnabledChange(syncApicurioTabVisibility);
    }

    app.appendChild(tabsWrapper);

    mapPanel.appendChild(createLegend());
    const renderHost = document.createElement("div");
    renderHost.className = "blockscape-render";
    const stageGuides = document.createElement("div");
    stageGuides.className = "stage-guides";
    stageGuides.hidden = !centerItems;
    stageGuides.setAttribute("aria-hidden", "true");
    const stageLabels = document.createElement("div");
    stageLabels.className = "stage-guide-labels";
    [
      "Genesis / Inception",
      "Custom",
      "Product / Rental",
      "Service / Commodity",
    ].forEach((label) => {
      const span = document.createElement("span");
      span.className = "stage-guide-labels__item";
      span.textContent = label;
      stageLabels.appendChild(span);
    });
    stageGuides.appendChild(stageLabels);
    renderHost.appendChild(stageGuides);
    stageGuidesOverlay = stageGuides;
    mapPanel.appendChild(renderHost);

    const abstractWrapper = document.createElement("div");
    abstractWrapper.className = "blockscape-abstract-panel";
    abstractPanel.appendChild(modelMeta.cloneNode(true));
    if (model.m.abstract) {
      console.log("[Blockscape] Rendering abstract content");
      const abstractDiv = document.createElement("div");
      abstractDiv.className = "blockscape-abstract";
      abstractDiv.innerHTML = model.m.abstract;
      enhanceAbstractWithGistLinks(abstractDiv);
      abstractWrapper.appendChild(abstractDiv);
      infoTooltipHtml = abstractDiv.outerHTML;
    } else {
      console.log("[Blockscape] No abstract found in model.m");
      const placeholder = document.createElement("div");
      placeholder.className = "blockscape-abstract-placeholder";
      placeholder.textContent = "No abstract has been provided for this model.";
      abstractWrapper.appendChild(placeholder);
      infoTooltipHtml = placeholder.outerHTML;
    }
    activeInfoTooltipHtml = infoTooltipHtml;
    abstractPanel.appendChild(abstractWrapper);

    const sourceWrapper = document.createElement("div");
    sourceWrapper.className = "blockscape-source-panel";
    const settingsPanel = document.createElement("div");
    settingsPanel.className = "blockscape-settings-panel";

    const syncThemeSwitches = (isDark) => {
      if (settingsUi.themeToggle) settingsUi.themeToggle.checked = isDark;
      if (settingsUi.tabThemeToggle) settingsUi.tabThemeToggle.checked = isDark;
    };

    const setThemePreference = (isDark) => {
      syncThemeSwitches(isDark);
      applyTheme(isDark ? THEME_DARK : THEME_LIGHT);
    };

    const syncCenterSwitches = (checked) => {
      if (settingsUi.tabCenterToggle) {
        settingsUi.tabCenterToggle.checked = checked;
      }
    };

    const applyCenterPreference = (checked) => {
      const applied = applyCenterItems(checked);
      syncCenterSwitches(applied);
      persistCenterItems(applied);
    };

    const syncSecondaryLinkSwitches = (checked) => {
      if (settingsUi.secondaryLinksToggle)
        settingsUi.secondaryLinksToggle.checked = checked;
      if (settingsUi.tabSecondaryLinksToggle)
        settingsUi.tabSecondaryLinksToggle.checked = checked;
    };

    const applySecondaryLinkVisibility = (checked) => {
      const next = !!checked;
      syncSecondaryLinkSwitches(next);
      showSecondaryLinks = next;
      if (selection) {
        select(selection);
      } else {
        clearStyles();
        drawLinks();
      }
    };

    const createTabToggle = ({ id, label, checked, onChange }) => {
      const row = document.createElement("label");
      row.className = "blockscape-tab-toggle";
      row.setAttribute("for", id);
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = id;
      input.checked = checked;
      if (typeof onChange === "function") {
        input.addEventListener("change", () => onChange(input.checked));
      }
      const text = document.createElement("span");
      text.className = "blockscape-tab-toggle__label";
      text.textContent = label;
      row.append(input, text);
      return { row, input };
    };

    const settingsHeading = document.createElement("p");
    settingsHeading.className = "blockscape-settings-panel__title";
    settingsHeading.textContent = "Feature toggles";
    settingsPanel.appendChild(settingsHeading);
    const themeRow = document.createElement("label");
    themeRow.className = "settings-toggle";
    const themeInput = document.createElement("input");
    themeInput.type = "checkbox";
    themeInput.checked = theme === THEME_DARK;
    const themeText = document.createElement("span");
    themeText.className = "settings-toggle__text";
    const themeLabel = document.createElement("span");
    themeLabel.className = "settings-toggle__label";
    themeLabel.textContent = "Dark mode";
    const themeHint = document.createElement("span");
    themeHint.className = "settings-toggle__hint";
    themeHint.textContent = "Switch Blockscape UI to dark colors.";
    themeText.append(themeLabel, themeHint);
    themeRow.append(themeInput, themeText);
    themeInput.addEventListener("change", () => {
      setThemePreference(themeInput.checked);
    });
    settingsPanel.appendChild(themeRow);
    settingsUi.themeToggle = themeInput;

    const { row: tabThemeToggleRow, input: tabThemeToggleInput } = createTabToggle({
      id: "tabToggleTheme",
      label: "Dark mode",
      checked: theme === THEME_DARK,
      onChange: (checked) => setThemePreference(checked),
    });
    tabActions.appendChild(tabThemeToggleRow);
    settingsUi.tabThemeToggle = tabThemeToggleInput;

    const { row: tabSecondaryToggleRow, input: tabSecondaryToggleInput } = createTabToggle({
      id: "tabToggleSecondaryLinks",
      label: "Show indirect links",
      checked: showSecondaryLinks,
      onChange: (checked) => applySecondaryLinkVisibility(checked),
    });
    tabActions.appendChild(tabSecondaryToggleRow);
    settingsUi.tabSecondaryLinksToggle = tabSecondaryToggleInput;

    const { row: tabCenterToggleRow, input: tabCenterToggleInput } = createTabToggle({
      id: "tabToggleCenterItems",
      label: "Wardley",
      checked: centerItems,
      onChange: (checked) => applyCenterPreference(checked),
    });
    tabActions.appendChild(tabCenterToggleRow);
    settingsUi.tabCenterToggle = tabCenterToggleInput;

    const settingsActions = document.createElement("div");
    settingsActions.className = "settings-actions";
    const settingsFileInput = document.createElement("input");
    settingsFileInput.type = "file";
    settingsFileInput.accept = "application/json";
    settingsFileInput.hidden = true;
    const loadSettingsBtn = document.createElement("button");
    loadSettingsBtn.type = "button";
    loadSettingsBtn.className = "pf-v5-c-button pf-m-secondary";
    loadSettingsBtn.textContent = "Load settings";
    loadSettingsBtn.addEventListener("click", () => settingsFileInput.click());
    settingsFileInput.addEventListener("change", async () => {
      const file = settingsFileInput.files?.[0];
      if (!file) return;
      try {
        const raw = await file.text();
        const parsed = JSON.parse(raw);
        const snapshot = parsed?.settings || parsed;
        const result = applyImportedSettings(snapshot || {}, { refreshObsidianLinks });
        const appliedCount = result.applied?.length || 0;
        showNotice(
          appliedCount
            ? `Loaded ${appliedCount} setting${appliedCount === 1 ? "" : "s"} from ${file.name}.`
            : `No matching settings found in ${file.name}.`,
          2200
        );
      } catch (error) {
        console.warn("[Blockscape] failed to load settings.json", error);
        showNotice("Invalid settings file.", 2400);
      } finally {
        settingsFileInput.value = "";
      }
    });

    const saveSettingsBtn = document.createElement("button");
    saveSettingsBtn.type = "button";
    saveSettingsBtn.className = "pf-v5-c-button pf-m-tertiary";
    saveSettingsBtn.textContent = "Download settings";
    saveSettingsBtn.addEventListener("click", () => {
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: buildSettingsSnapshot(getCurrentSettingsState(), {
          localBackend,
        }),
      };
      download("settings.json", JSON.stringify(payload, null, 2));
      showNotice("Settings downloaded.", 2000);
    });

    settingsActions.append(loadSettingsBtn, saveSettingsBtn, settingsFileInput);
    settingsPanel.appendChild(settingsActions);
    const colorPresetSection = document.createElement("div");
    colorPresetSection.className = "color-presets";
    const colorPresetTitle = document.createElement("div");
    colorPresetTitle.className = "settings-text__label";
    colorPresetTitle.textContent = "Color presets";
    const colorPresetHint = document.createElement("div");
    colorPresetHint.className = "settings-text__hint";
    colorPresetHint.textContent =
      "Shown in tile context menu for quick coloring.";
    colorPresetSection.append(colorPresetTitle, colorPresetHint);
    const colorPresetList = document.createElement("div");
    colorPresetList.className = "color-presets__list";
    const addRow = document.createElement("div");
    addRow.className = "color-presets__add";
    const addName = document.createElement("input");
    addName.type = "text";
    addName.placeholder = "Name";
    addName.className = "settings-text__input";
    const addColor = document.createElement("input");
    addColor.type = "color";
    addColor.value = "#2563eb";
    addColor.className = "settings-color-input";
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "pf-v5-c-button pf-m-primary";
    addBtn.textContent = "Add preset";
    addBtn.addEventListener("click", () => {
      const name = addName.value.trim() || "Custom";
      const value = addColor.value;
      const next = [...colorPresets, { name, value }];
      setColorPresets(next);
      updateTileMenuColors(colorPresets);
      addName.value = "";
    });
    addRow.append(addName, addColor, addBtn);
    colorPresetSection.append(colorPresetList, addRow);
    settingsPanel.appendChild(colorPresetSection);
    settingsUi.colorPresetList = colorPresetList;
    renderColorPresetsUI = () => {
      colorPresetList.innerHTML = "";
      colorPresets.forEach((preset, idx) => {
        const row = document.createElement("div");
        row.className = "color-presets__row";
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.className = "settings-text__input";
        nameInput.value = preset.name || "";
        nameInput.placeholder = "Name";
        nameInput.addEventListener("input", () => {
          const next = [...colorPresets];
          next[idx] = { ...next[idx], name: nameInput.value };
          setColorPresets(next);
          updateTileMenuColors(colorPresets);
        });
        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.className = "settings-color-input";
        colorInput.value = preset.value;
        colorInput.addEventListener("input", () => {
          const next = [...colorPresets];
          next[idx] = { ...next[idx], value: colorInput.value };
          setColorPresets(next);
          updateTileMenuColors(colorPresets);
        });
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "pf-v5-c-button pf-m-plain";
        removeBtn.textContent = "✕";
        removeBtn.title = "Remove preset";
        removeBtn.addEventListener("click", () => {
          const next = colorPresets.filter((_, i) => i !== idx);
          setColorPresets(next);
          updateTileMenuColors(colorPresets);
          renderColorPresetsUI();
        });
        row.append(nameInput, colorInput, removeBtn);
        colorPresetList.appendChild(row);
      });
    };
    renderColorPresetsUI();
    const linkColorSection = document.createElement("div");
    linkColorSection.className = "settings-text";
    const linkColorTitle = document.createElement("div");
    linkColorTitle.className = "settings-text__label";
    linkColorTitle.textContent = "Link colors";
    const linkColorHint = document.createElement("div");
    linkColorHint.className = "settings-text__hint";
    linkColorHint.textContent =
      "Adjust the colors used when highlighting enables/dependents.";
    const linkColorRows = document.createElement("div");
    linkColorRows.className = "settings-color-rows";
    const createColorRow = ({ id, label, hint, value, onChange }) => {
      const row = document.createElement("label");
      row.className = "settings-color-row";
      row.setAttribute("for", id);
      const text = document.createElement("span");
      text.className = "settings-color-row__label";
      text.textContent = label;
      if (hint) {
        const hintEl = document.createElement("span");
        hintEl.className = "settings-color-row__hint";
        hintEl.textContent = hint;
        text.appendChild(hintEl);
      }
      const input = document.createElement("input");
      input.type = "color";
      input.id = id;
      input.className = "settings-color-input";
      input.value = value;
      if (typeof onChange === "function") {
        const handler = () => onChange(input.value);
        input.addEventListener("input", handler);
        input.addEventListener("change", handler);
      }
      row.append(text, input);
      linkColorRows.appendChild(row);
      return input;
    };
    settingsUi.depColorInput = createColorRow({
      id: "depColor",
      label: "Enables",
      hint: "Outgoing links from the selected item.",
      value: depColor,
      onChange: (val) => {
        const applied = applyDepColor(val);
        persistDepColor(applied);
      },
    });
    settingsUi.revdepColorInput = createColorRow({
      id: "revdepColor",
      label: "Dependents",
      hint: "Incoming links to the selected item.",
      value: revdepColor,
      onChange: (val) => {
        const applied = applyRevdepColor(val);
        persistRevdepColor(applied);
      },
    });
    linkColorSection.append(linkColorTitle, linkColorHint, linkColorRows);
    settingsPanel.appendChild(linkColorSection);
    const linkThicknessSection = document.createElement("div");
    linkThicknessSection.className = "settings-text";
    const linkThicknessText = document.createElement("div");
    linkThicknessText.className = "settings-text__text";
    const linkThicknessLabel = document.createElement("div");
    linkThicknessLabel.className = "settings-text__label";
    linkThicknessLabel.textContent = "Link thickness";
    const linkThicknessHint = document.createElement("div");
    linkThicknessHint.className = "settings-text__hint";
    linkThicknessHint.textContent =
      "Adjust stroke width for enables/dependents lines.";
    linkThicknessText.append(linkThicknessLabel, linkThicknessHint);
    const linkThicknessSelect = document.createElement("select");
    linkThicknessSelect.id = "linkThickness";
    linkThicknessSelect.className = "settings-text__input";
    [
      { value: "s", label: "Small" },
      { value: "m", label: "Medium" },
      { value: "l", label: "Large" },
    ].forEach(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      if (value === linkThickness) option.selected = true;
      linkThicknessSelect.appendChild(option);
    });
    linkThicknessSelect.addEventListener("change", () => {
      const applied = applyLinkThickness(linkThicknessSelect.value);
      persistLinkThickness(applied);
    });
    const linkThicknessWrapper = document.createElement("div");
    linkThicknessWrapper.className = "settings-text__row";
    linkThicknessWrapper.append(linkThicknessText, linkThicknessSelect);
    linkThicknessSection.appendChild(linkThicknessWrapper);
    settingsPanel.appendChild(linkThicknessSection);
    settingsUi.linkThicknessInput = linkThicknessSelect;
    const createSettingsToggle = ({
      id,
      label,
      hint,
      checked,
      className = "",
      onChange,
    }) => {
      const row = document.createElement("label");
      row.className = ["settings-toggle", className].filter(Boolean).join(" ");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = id;
      input.checked = checked;
      const text = document.createElement("span");
      text.className = "settings-toggle__text";
      const labelSpan = document.createElement("span");
      labelSpan.className = "settings-toggle__label";
      labelSpan.textContent = label;
      text.appendChild(labelSpan);
      if (hint) {
        const hintSpan = document.createElement("span");
        hintSpan.className = "settings-toggle__hint";
        hintSpan.textContent = hint;
        text.appendChild(hintSpan);
      }
      row.appendChild(input);
      row.appendChild(text);
      if (typeof onChange === "function") {
        input.addEventListener("change", () => onChange(input.checked));
      }
      return { row, input };
    };

    const refreshObsidianLinks = () => {
      app.querySelectorAll(".tile").forEach((tile) => {
        const id = tile.dataset.id;
        const match = findItemAndCategoryById(id);
        if (!match?.item) return;
        const itemExternalMeta = resolveExternalMeta(match.item.external);
        const obsidianUrl = getObsidianLink(match.item, {
          externalMeta: itemExternalMeta,
          seriesIdLookup,
        });
        applyObsidianLinkToTile(tile, obsidianUrl);
      });
    };

    const { row: secondaryToggleRow, input: secondaryToggleInput } =
      createSettingsToggle({
        id: "toggleSecondaryLinks",
        label: "Show indirect links",
        checked: showSecondaryLinks,
        className: "map-controls__toggle",
        onChange: (checked) => applySecondaryLinkVisibility(checked),
      });
    settingsPanel.appendChild(secondaryToggleRow);
    settingsUi.secondaryLinksToggle = secondaryToggleInput;

    const { row: reusedToggleRow, input: reusedToggleInput } = createSettingsToggle({
      id: "toggleReusedInMap",
      label: "Display reused in map view",
      hint: "Show markers for nodes used multiple times.",
      checked: showReusedInMap,
      className: "map-controls__toggle",
      onChange: (checked) => {
        showReusedInMap = checked;
        applyReusedHighlights();
      },
    });
    settingsPanel.appendChild(reusedToggleRow);
    settingsUi.reusedToggle = reusedToggleInput;

    const { row: autoIdToggleRow, input: autoIdToggleInput } = createSettingsToggle({
      id: "toggleAutoIdFromName",
      label: "Auto-fill IDs from titles",
      hint: "Keep ID in sync while editing name/title (can be overridden manually).",
      checked: autoIdFromNameEnabled,
      className: "map-controls__toggle",
      onChange: (checked) => {
        const applied = applyAutoIdFromNameEnabled(checked);
        persistAutoIdFromNameEnabled(applied);
      },
    });
    settingsPanel.appendChild(autoIdToggleRow);
    settingsUi.autoIdToggle = autoIdToggleInput;

    const obsidianModeInputs = [];
    const { row: obsidianToggleRow, input: obsidianToggleInput } = createSettingsToggle({
      id: "toggleObsidianLinks",
      label: "Obsidian",
      hint: "Make tiles open Obsidian when no external URL exists.",
      checked: obsidianLinksEnabled,
      className: "map-controls__toggle",
      onChange: (checked) => {
        const applied = applyObsidianLinksEnabled(checked);
        persistObsidianLinksEnabled(applied);
        obsidianModeInputs.forEach((input) => {
          input.disabled = !applied;
        });
        refreshObsidianLinks();
      },
    });
    settingsPanel.appendChild(obsidianToggleRow);
    settingsUi.obsidianToggle = obsidianToggleInput;

    const hasLocalBackend =
      typeof localBackend?.isAvailable === "function" &&
      localBackend.isAvailable() &&
      typeof localBackend?.getAutoReloadConfig === "function";
    if (hasLocalBackend) {
      const { enabled: autoEnabled, intervalMs: autoInterval } =
        localBackend.getAutoReloadConfig();
      let autoReloadSlider = null;
      const { row: autoReloadToggle, input: autoReloadInput } =
        createSettingsToggle({
          id: "toggleAutoReload",
          label: "Auto-reload local files",
          hint: "Poll the local backend for file changes and refresh matching models.",
          checked: autoEnabled,
          className: "map-controls__toggle",
          onChange: (checked) => {
            localBackend.setAutoReloadEnabled(checked);
            if (autoReloadSlider) autoReloadSlider.disabled = !checked;
        },
      });
      settingsPanel.appendChild(autoReloadToggle);
      settingsUi.autoReloadToggle = autoReloadInput;

      const formatAutoReloadInterval = (ms) =>
        `${(ms / 1000).toFixed(2)}s`;
      const autoReloadRow = document.createElement("label");
      autoReloadRow.className = "settings-slider";
      autoReloadRow.setAttribute("for", "autoReloadInterval");
      const autoReloadText = document.createElement("div");
      autoReloadText.className = "settings-slider__text";
      const autoReloadLabel = document.createElement("span");
      autoReloadLabel.className = "settings-slider__label";
      autoReloadLabel.textContent = "Auto-reload interval";
      const autoReloadHint = document.createElement("span");
      autoReloadHint.className = "settings-slider__hint";
      autoReloadHint.textContent = "Adjust how often to poll for file changes.";
      autoReloadText.append(autoReloadLabel, autoReloadHint);
      const autoReloadValue = document.createElement("span");
      autoReloadValue.className = "settings-slider__value";
      autoReloadValue.textContent = formatAutoReloadInterval(autoInterval);
      autoReloadSlider = document.createElement("input");
      autoReloadSlider.type = "range";
      autoReloadSlider.id = "autoReloadInterval";
      autoReloadSlider.className = "settings-slider__input";
      autoReloadSlider.min = String(MIN_AUTO_RELOAD_INTERVAL_MS);
      autoReloadSlider.max = String(MAX_AUTO_RELOAD_INTERVAL_MS);
      autoReloadSlider.step = "100";
      autoReloadSlider.value = String(autoInterval);
      autoReloadSlider.disabled = !autoEnabled;
      autoReloadSlider.setAttribute(
        "aria-label",
        "Set auto-reload polling interval"
      );
      autoReloadSlider.addEventListener("input", () => {
        const applied = localBackend.setAutoReloadInterval(
          parseInt(autoReloadSlider.value, 10)
        );
        autoReloadValue.textContent = formatAutoReloadInterval(applied);
      });
      autoReloadRow.append(autoReloadText, autoReloadValue, autoReloadSlider);
      settingsPanel.appendChild(autoReloadRow);
      settingsUi.autoReloadInput = autoReloadSlider;
      settingsUi.autoReloadValue = autoReloadValue;
    }

    const obsidianModeRow = document.createElement("div");
    obsidianModeRow.className = "settings-radio";
    const obsidianModeLabel = document.createElement("div");
    obsidianModeLabel.className = "settings-radio__label";
    obsidianModeLabel.textContent = "Obsidian link format";
    const obsidianModeHint = document.createElement("div");
    obsidianModeHint.className = "settings-radio__hint";
    obsidianModeHint.textContent =
      "Use the tile title or id when building Obsidian links.";
    const obsidianModeOptions = document.createElement("div");
    obsidianModeOptions.className = "settings-radio__options";

    const registerObsidianModeOption = (value, text) => {
      const option = document.createElement("label");
      option.className = "settings-radio__option";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "obsidianLinkMode";
      radio.value = value;
      radio.checked = obsidianLinkMode === value;
      radio.disabled = !obsidianLinksEnabled;
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        const applied = applyObsidianLinkMode(value);
        persistObsidianLinkMode(applied);
        refreshObsidianLinks();
      });
      const textNode = document.createElement("span");
      textNode.textContent = text;
      option.append(radio, textNode);
      obsidianModeInputs.push(radio);
      obsidianModeOptions.appendChild(option);
    };

    registerObsidianModeOption(OBSIDIAN_LINK_MODE_TITLE, "Use title");
    registerObsidianModeOption(OBSIDIAN_LINK_MODE_ID, "Use id");
    obsidianModeRow.append(
      obsidianModeLabel,
      obsidianModeOptions,
      obsidianModeHint
    );
    settingsPanel.appendChild(obsidianModeRow);
    settingsUi.obsidianModeInputs = obsidianModeInputs;

    const obsidianVaultRow = document.createElement("label");
    obsidianVaultRow.className = "settings-text";
    obsidianVaultRow.setAttribute("for", "obsidianVaultInput");
    const obsidianVaultText = document.createElement("div");
    obsidianVaultText.className = "settings-text__text";
    const obsidianVaultLabel = document.createElement("span");
    obsidianVaultLabel.className = "settings-text__label";
    obsidianVaultLabel.textContent = "Obsidian vault";
    const obsidianVaultHint = document.createElement("span");
    obsidianVaultHint.className = "settings-text__hint";
    obsidianVaultHint.textContent =
      "Optional. Set the vault name to avoid duplicates.";
    obsidianVaultText.append(obsidianVaultLabel, obsidianVaultHint);
    const obsidianVaultInput = document.createElement("input");
    obsidianVaultInput.type = "text";
    obsidianVaultInput.id = "obsidianVaultInput";
    obsidianVaultInput.className = "settings-text__input";
    obsidianVaultInput.placeholder = "Vault name";
    obsidianVaultInput.value = obsidianVaultName;
    obsidianVaultInput.addEventListener("input", () => {
      const applied = applyObsidianVaultName(obsidianVaultInput.value);
      persistObsidianVaultName(applied);
      refreshObsidianLinks();
    });
    obsidianVaultRow.append(obsidianVaultText, obsidianVaultInput);
    settingsPanel.appendChild(obsidianVaultRow);
    settingsUi.obsidianVaultInput = obsidianVaultInput;

    const obsidianPluginNote = document.createElement("p");
    obsidianPluginNote.className = "settings-note";
    obsidianPluginNote.innerHTML =
      'Requires the Obsidian <a href="https://vinzent03.github.io/obsidian-advanced-uri/" target="_blank" rel="noreferrer noopener">Advanced URI</a> plugin for create/open behavior.';
    settingsPanel.appendChild(obsidianPluginNote);

    const formatSeriesNavWait = (value) => `${(value / 1000).toFixed(1)}s`;
    const seriesNavWaitRow = document.createElement("label");
    seriesNavWaitRow.className = "settings-slider";
    seriesNavWaitRow.setAttribute("for", "seriesNavDoubleClickWait");

    const seriesNavWaitText = document.createElement("div");
    seriesNavWaitText.className = "settings-slider__text";
    const seriesNavWaitLabel = document.createElement("span");
    seriesNavWaitLabel.className = "settings-slider__label";
    seriesNavWaitLabel.textContent = "Series double-click wait";
    const seriesNavWaitHint = document.createElement("span");
    seriesNavWaitHint.className = "settings-slider__hint";
    seriesNavWaitHint.textContent =
      "Time window to double-click into another map version.";
    seriesNavWaitText.append(seriesNavWaitLabel, seriesNavWaitHint);

    const seriesNavWaitValue = document.createElement("span");
    seriesNavWaitValue.className = "settings-slider__value";
    seriesNavWaitValue.textContent = formatSeriesNavWait(
      seriesNavDoubleClickWaitMs
    );

    const seriesNavWaitInput = document.createElement("input");
    seriesNavWaitInput.type = "range";
    seriesNavWaitInput.id = "seriesNavDoubleClickWait";
    seriesNavWaitInput.className = "settings-slider__input";
    seriesNavWaitInput.min = String(MIN_SERIES_NAV_DOUBLE_CLICK_MS);
    seriesNavWaitInput.max = String(MAX_SERIES_NAV_DOUBLE_CLICK_MS);
    seriesNavWaitInput.step = "50";
    seriesNavWaitInput.value = String(seriesNavDoubleClickWaitMs);
    seriesNavWaitInput.setAttribute(
      "aria-label",
      "Adjust double-click wait for series navigation"
    );
    seriesNavWaitInput.addEventListener("input", () => {
      const applied = applySeriesNavDoubleClickWait(
        parseInt(seriesNavWaitInput.value, 10)
      );
      seriesNavWaitValue.textContent = formatSeriesNavWait(applied);
      persistSeriesNavDoubleClickWait(applied);
    });

    seriesNavWaitRow.append(
      seriesNavWaitText,
      seriesNavWaitValue,
      seriesNavWaitInput
    );
    settingsPanel.appendChild(seriesNavWaitRow);
    settingsUi.seriesNavInput = seriesNavWaitInput;
    settingsUi.seriesNavValue = seriesNavWaitValue;

    const formatHoverScale = (value) => `${Math.round((value - 1) * 100)}%`;
    const hoverScaleRow = document.createElement("label");
    hoverScaleRow.className = "settings-slider";
    hoverScaleRow.setAttribute("for", "hoverScaleSlider");

    const hoverScaleText = document.createElement("div");
    hoverScaleText.className = "settings-slider__text";
    const hoverScaleLabel = document.createElement("span");
    hoverScaleLabel.className = "settings-slider__label";
    hoverScaleLabel.textContent = "Hover zoom";
    const hoverScaleHint = document.createElement("span");
    hoverScaleHint.className = "settings-slider__hint";
    hoverScaleHint.textContent = "Expand tiles on hover to see more detail.";
    hoverScaleText.append(hoverScaleLabel, hoverScaleHint);

    const hoverScaleValue = document.createElement("span");
    hoverScaleValue.className = "settings-slider__value";
    hoverScaleValue.textContent = formatHoverScale(tileHoverScale);

    const hoverScaleInput = document.createElement("input");
    hoverScaleInput.type = "range";
    hoverScaleInput.id = "hoverScaleSlider";
    hoverScaleInput.className = "settings-slider__input";
    hoverScaleInput.min = String(MIN_TILE_HOVER_SCALE);
    hoverScaleInput.max = String(MAX_TILE_HOVER_SCALE);
    hoverScaleInput.step = "0.1";
    hoverScaleInput.value = String(tileHoverScale);
    hoverScaleInput.setAttribute("aria-label", "Adjust hover zoom");
    hoverScaleInput.addEventListener("input", () => {
      const applied = applyTileHoverScale(parseFloat(hoverScaleInput.value));
      hoverScaleValue.textContent = formatHoverScale(applied);
      persistTileHoverScale(applied);
      if (selection) scheduleOverlaySync();
    });

    hoverScaleRow.append(hoverScaleText, hoverScaleValue, hoverScaleInput);
    settingsPanel.appendChild(hoverScaleRow);
    settingsUi.hoverScaleInput = hoverScaleInput;
    settingsUi.hoverScaleValue = hoverScaleValue;

    let dimInput = null;
    let dimValue = null;
    const formatSelectionDimming = (opacity) => {
      const dimPercent = Math.round((1 - opacity) * 100);
      return dimPercent === 0 ? "Off" : `${dimPercent}% dim`;
    };
    const { row: dimToggleRow, input: dimToggleInput } = createSettingsToggle({
      id: "toggleSelectionDimming",
      label: "Dim unrelated tiles",
      hint: "When selecting a tile, fade everything except linked tiles.",
      checked: selectionDimEnabled,
      className: "map-controls__toggle",
      onChange: (checked) => {
        const applied = applySelectionDimEnabled(checked);
        persistSelectionDimEnabled(applied);
        if (dimInput) dimInput.disabled = !applied;
        if (dimValue) {
          dimValue.textContent = formatSelectionDimming(
            applied ? selectionDimOpacity : 1
          );
        }
      },
    });
    settingsPanel.appendChild(dimToggleRow);
    settingsUi.selectionDimToggle = dimToggleInput;
    const dimRow = document.createElement("label");
    dimRow.className = "settings-slider";
    dimRow.setAttribute("for", "selectionDimmingSlider");

    const dimText = document.createElement("div");
    dimText.className = "settings-slider__text";
    const dimLabel = document.createElement("span");
    dimLabel.className = "settings-slider__label";
    dimLabel.textContent = "Dimming strength";
    const dimHint = document.createElement("span");
    dimHint.className = "settings-slider__hint";
    dimHint.textContent =
      "Adjust how much unrelated tiles fade when dimming is on.";
    dimText.append(dimLabel, dimHint);

    dimValue = document.createElement("span");
    dimValue.className = "settings-slider__value";
    dimValue.textContent = formatSelectionDimming(
      selectionDimEnabled ? selectionDimOpacity : 1
    );

    dimInput = document.createElement("input");
    dimInput.type = "range";
    dimInput.id = "selectionDimmingSlider";
    dimInput.className = "settings-slider__input";
    dimInput.min = String(MIN_SELECTION_DIM_OPACITY);
    dimInput.max = String(MAX_SELECTION_DIM_OPACITY);
    dimInput.step = "0.05";
    dimInput.value = String(selectionDimOpacity);
    dimInput.disabled = !selectionDimEnabled;
    dimInput.setAttribute(
      "aria-label",
      "Adjust how much unrelated tiles dim on selection"
    );
    dimInput.addEventListener("input", () => {
      const applied = applySelectionDimOpacity(parseFloat(dimInput.value));
      dimValue.textContent = formatSelectionDimming(applied);
      persistSelectionDimOpacity(applied);
    });

    dimRow.append(dimText, dimValue, dimInput);
    settingsPanel.appendChild(dimRow);
    settingsUi.selectionDimInput = dimInput;
    settingsUi.selectionDimValue = dimValue;

    const formatCompactness = (value) =>
      value === 1 ? "Default" : `${Math.round(value * 100)}%`;
    const compactRow = document.createElement("label");
    compactRow.className = "settings-slider";
    compactRow.setAttribute("for", "tileCompactnessSlider");

    const compactText = document.createElement("div");
    compactText.className = "settings-slider__text";
    const compactLabel = document.createElement("span");
    compactLabel.className = "settings-slider__label";
    compactLabel.textContent = "Tile compactness";
    const compactHint = document.createElement("span");
    compactHint.className = "settings-slider__hint";
    compactHint.textContent =
      "Adjust padding, gap, and logo size for tiles.";
    compactText.append(compactLabel, compactHint);

    const compactValue = document.createElement("span");
    compactValue.className = "settings-slider__value";
    compactValue.textContent = formatCompactness(tileCompactness);

    const compactInput = document.createElement("input");
    compactInput.type = "range";
    compactInput.id = "tileCompactnessSlider";
    compactInput.className = "settings-slider__input";
    compactInput.min = String(MIN_TILE_COMPACTNESS);
    compactInput.max = String(MAX_TILE_COMPACTNESS);
    compactInput.step = "0.05";
    compactInput.value = String(tileCompactness);
    compactInput.setAttribute("aria-label", "Adjust tile compactness");
    compactInput.addEventListener("input", () => {
      const applied = applyTileCompactness(parseFloat(compactInput.value));
      compactValue.textContent = formatCompactness(applied);
      persistTileCompactness(applied);
      if (selection) scheduleOverlaySync();
    });

    compactRow.append(compactText, compactValue, compactInput);
    settingsPanel.appendChild(compactRow);
    settingsUi.tileCompactnessInput = compactInput;
    settingsUi.tileCompactnessValue = compactValue;

    const { row: titleWrapRow, input: titleWrapInput } = createSettingsToggle({
      id: "titleWrapToggle",
      label: "Wrap titles",
      hint: "Allow long titles to wrap instead of truncating.",
      checked: titleWrapMode !== "nowrap",
      className: "map-controls__toggle",
      onChange: (checked) => {
        const mode = checked ? "wrap" : "nowrap";
        applyTitleWrapMode(mode);
        persistTitleWrapMode(mode);
      },
    });
    settingsPanel.appendChild(titleWrapRow);
    settingsUi.titleWrapInput = titleWrapInput;

    const formatTitleWidth = (value) =>
      `${Math.round((value - 1) * 100)}% extra`;
    const titleWidthRow = document.createElement("label");
    titleWidthRow.className = "settings-slider";
    titleWidthRow.setAttribute("for", "titleHoverWidthSlider");

    const titleWidthText = document.createElement("div");
    titleWidthText.className = "settings-slider__text";
    const titleWidthLabel = document.createElement("span");
    titleWidthLabel.className = "settings-slider__label";
    titleWidthLabel.textContent = "Title width on hover";
    const titleWidthHint = document.createElement("span");
    titleWidthHint.className = "settings-slider__hint";
    titleWidthHint.textContent = "Give titles more room horizontally when zoomed.";
    titleWidthText.append(titleWidthLabel, titleWidthHint);

    const titleWidthValue = document.createElement("span");
    titleWidthValue.className = "settings-slider__value";
    titleWidthValue.textContent = formatTitleWidth(titleHoverWidthMultiplier);

    const titleWidthInput = document.createElement("input");
    titleWidthInput.type = "range";
    titleWidthInput.id = "titleHoverWidthSlider";
    titleWidthInput.className = "settings-slider__input";
    titleWidthInput.min = String(MIN_TITLE_HOVER_WIDTH_MULTIPLIER);
    titleWidthInput.max = String(MAX_TITLE_HOVER_WIDTH_MULTIPLIER);
    titleWidthInput.step = "0.05";
    titleWidthInput.value = String(titleHoverWidthMultiplier);
    titleWidthInput.setAttribute(
      "aria-label",
      "Adjust title width boost on hover"
    );
    titleWidthInput.addEventListener("input", () => {
      const applied = applyTitleHoverWidthMultiplier(
        parseFloat(titleWidthInput.value)
      );
      titleWidthValue.textContent = formatTitleWidth(applied);
      persistTitleHoverWidthMultiplier(applied);
    });

    titleWidthRow.append(titleWidthText, titleWidthValue, titleWidthInput);
    settingsPanel.appendChild(titleWidthRow);
    settingsUi.titleWidthInput = titleWidthInput;
    settingsUi.titleWidthValue = titleWidthValue;

    const formatTitleZoomPortion = (value) =>
      `${Math.round(value * 100)}% of hover zoom`;
    const titleZoomRow = document.createElement("label");
    titleZoomRow.className = "settings-slider";
    titleZoomRow.setAttribute("for", "titleZoomPortionSlider");

    const titleZoomText = document.createElement("div");
    titleZoomText.className = "settings-slider__text";
    const titleZoomLabel = document.createElement("span");
    titleZoomLabel.className = "settings-slider__label";
    titleZoomLabel.textContent = "Title zoom influence";
    const titleZoomHint = document.createElement("span");
    titleZoomHint.className = "settings-slider__hint";
    titleZoomHint.textContent =
      "How much the title scales relative to tile hover zoom.";
    titleZoomText.append(titleZoomLabel, titleZoomHint);

    const titleZoomValue = document.createElement("span");
    titleZoomValue.className = "settings-slider__value";
    titleZoomValue.textContent = formatTitleZoomPortion(titleHoverTextPortion);

    const titleZoomInput = document.createElement("input");
    titleZoomInput.type = "range";
    titleZoomInput.id = "titleZoomPortionSlider";
    titleZoomInput.className = "settings-slider__input";
    titleZoomInput.min = String(MIN_TITLE_HOVER_TEXT_PORTION);
    titleZoomInput.max = String(MAX_TITLE_HOVER_TEXT_PORTION);
    titleZoomInput.step = "0.05";
    titleZoomInput.value = String(titleHoverTextPortion);
    titleZoomInput.setAttribute(
      "aria-label",
      "Adjust how much titles scale on hover"
    );
    titleZoomInput.addEventListener("input", () => {
      const applied = applyTitleHoverTextPortion(
        parseFloat(titleZoomInput.value)
      );
      titleZoomValue.textContent = formatTitleZoomPortion(applied);
      persistTitleHoverTextPortion(applied);
    });

    titleZoomRow.append(titleZoomText, titleZoomValue, titleZoomInput);
    settingsPanel.appendChild(titleZoomRow);
    settingsUi.titleZoomInput = titleZoomInput;
    settingsUi.titleZoomValue = titleZoomValue;

    const apicurioEnabled =
      typeof apicurio.isEnabled === "function" ? apicurio.isEnabled() : false;
    const { row: apicurioToggleRow, input: apicurioToggleInput } =
      createSettingsToggle({
        id: "apicurioFeatureToggle",
        label: "Apicurio",
        hint: "Show the Apicurio registry tab when enabled.",
        checked: apicurioEnabled,
        className: "apicurio-toggle",
        onChange: (checked) => {
          if (typeof apicurio.setEnabled === "function") {
            apicurio.setEnabled(checked);
          }
        },
      });
    apicurioSettingsToggle = apicurioToggleInput;
    settingsPanel.appendChild(apicurioToggleRow);
    sourceWrapper.appendChild(settingsPanel);
    if (jsonPanel) {
      jsonPanel.hidden = false;
      jsonPanel.classList.remove("pf-v5-c-page__main-section");
      sourceWrapper.appendChild(jsonPanel);
    } else {
      const missing = document.createElement("p");
      missing.className = "muted";
      missing.textContent = "Source editor unavailable.";
      sourceWrapper.appendChild(missing);
    }
    sourcePanel.appendChild(sourceWrapper);
    apicurio.mount(apicurioPanel);

    let tileCounter = 0;
    model.m.categories.forEach((cat) => {
      const section = document.createElement("section");
      section.className = "category";
      section.dataset.cat = cat.id;
      const categorySeriesVersionIndex = activeIsCategoryView
        ? resolveVersionIndexFromCategory(cat, seriesIdLookup)
        : null;

      const hasStage = (cat.items || []).some((it) =>
        normalizeStageValue(it.stage)
      );
      const head = document.createElement("div");
      head.className = "cat-head";
      head.dataset.cat = cat.id;
      head.tabIndex = 0;
      if (
        activeIsCategoryView &&
        Number.isInteger(categorySeriesVersionIndex)
      ) {
        head.dataset.seriesVersionIndex = String(categorySeriesVersionIndex);
        head.title = "Open this category's map in the series";
        head.classList.add("cat-head--series-link");
      } else {
        head.title = "Select category";
      }
      head.innerHTML = `<div class="cat-title">${escapeHtml(
        cat.title || cat.id
      )}</div>
                          ${
                            hasStage
                              ? `<span class="cat-stage-indicator" title="Contains staged items">Stage</span>
                                 <button type="button" class="cat-stage-clear" title="Clear all stages in this category" aria-label="Clear all stages">×</button>`
                              : ""
                          }
                          <div class="muted cat-count">${
                            (cat.items || []).length
                          } items</div>`;
      head.addEventListener("click", () => {
        const targetSeriesIndex =
          head.dataset.seriesVersionIndex != null
            ? parseInt(head.dataset.seriesVersionIndex, 10)
            : null;
        const activeEntry = models[activeIndex];
        const currentSeriesIndex = activeEntry
          ? getActiveApicurioVersionIndex(activeEntry)
          : -1;
        const canNavigateToSeries =
          activeIsCategoryView &&
          activeEntry?.apicurioVersions?.length > 1 &&
          Number.isInteger(targetSeriesIndex) &&
          targetSeriesIndex !== currentSeriesIndex;
        if (canNavigateToSeries) {
          const changed = setActiveApicurioVersion(
            activeIndex,
            targetSeriesIndex
          );
          if (changed) return;
        }

        selectCategory(cat.id);
      });
      head.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          head.click();
        }
      });
      const clearStageBtn = head.querySelector(".cat-stage-clear");
      if (clearStageBtn) {
        clearStageBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const cleared = clearCategoryStages(cat.id);
          if (cleared) {
            showNotice("Cleared stages for this category.", 1400);
          }
        });
      }
      head.addEventListener("focus", () =>
        selectCategory(cat.id, { scrollIntoView: false })
      );
      section.appendChild(head);

      const grid = document.createElement("div");
      grid.className = "grid" + (centerItems ? " is-centered" : "");
      section.appendChild(grid);

      (cat.items || []).forEach((it) => {
        tileCounter += 1;
        const externalMeta = resolveExternalMeta(it.external);
        const obsidianUrl = getObsidianLink(it, {
          externalMeta,
          seriesIdLookup,
        });
        const tile = document.createElement("div");
        tile.className = externalMeta.isExternal ? "tile external" : "tile";
        tile.tabIndex = 0;
        tile.dataset.id = it.id;
        tile.dataset.globalIndex = String(tileCounter);
        if (externalMeta.url) {
          tile.dataset.externalUrl = externalMeta.url;
        }
        if (!activeIsCategoryView) {
          let targetSeriesIndex = null;
          if (seriesIdLookup.has(it.id)) {
            targetSeriesIndex = seriesIdLookup.get(it.id);
          }
          if (Number.isInteger(targetSeriesIndex)) {
            tile.dataset.seriesVersionIndex = String(targetSeriesIndex);
            tile.classList.add("tile--series-link");
            const label =
              targetSeriesIndex === activeSeriesIndex
                ? "Current map in this series"
                : `Open version ${targetSeriesIndex + 1} in this series`;
            appendTitleLine(tile, label);
          }
        }
        if (obsidianUrl) {
          tile.dataset.obsidianUrl = obsidianUrl;
        }

        const stage = normalizeStageValue(it.stage);
        if (stage) {
          tile.dataset.stage = String(stage);
          if (centerItems) {
            tile.style.gridColumn = String(stage);
          }
        }

        if (!activeIsCategoryView) {
          const navTargetIndex = findModelIndexByIdOrSource(it.id);
          if (navTargetIndex !== -1 && navTargetIndex !== activeIndex) {
            tile.classList.add("tile--series-link");
            tile.dataset.navTargetIndex = String(navTargetIndex);
          }
        }

        const img = document.createElement("img");
        img.className = "logo";
        if (it.logo) {
          img.src = it.logo;
          img.alt = it.name || it.id;
        } else {
          img.alt = "";
          img.style.opacity = 1; // colored letter icon is the intended visual
          img.src = generateLetterImage(it.name || it.id, it.color); // supports optional per-item color
        }

        const nm = document.createElement("div");
        nm.className = "name";
        nm.textContent = it.name || it.id;

        const idLine = document.createElement("div");
        idLine.className = "tile-id";
        idLine.textContent = it.id || "";

        let stageLabel = null;
        if (stage) {
          stageLabel = document.createElement("div");
          stageLabel.className = "tile-stage";
          stageLabel.textContent = String(stage);
        }

        const badge = document.createElement("div");
        badge.className = "badge";
        badge.textContent = "reused";

        let deleteBtn = null;
        if (!activeIsCategoryView) {
          deleteBtn = document.createElement("button");
          deleteBtn.type = "button";
          deleteBtn.className = "tile-delete";
          deleteBtn.setAttribute("aria-label", `Delete ${it.name || it.id}`);
          deleteBtn.textContent = "×";
          deleteBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            deleteItemById(it.id);
          });
        }

        if (externalMeta.url) {
          tile.appendChild(createExternalLinkButton(externalMeta.url));
        }
        applyObsidianLinkToTile(tile, obsidianUrl);
        if (deleteBtn) tile.appendChild(deleteBtn);
        tile.appendChild(img);
        tile.appendChild(nm);
        tile.appendChild(idLine);
        if (stageLabel) tile.appendChild(stageLabel);
        tile.appendChild(badge);
        grid.appendChild(tile);

        index.set(it.id, { el: tile, catId: cat.id, rect: null });
      });

      renderHost.appendChild(section);
      categoryIndex.set(cat.id, { el: section, headEl: head });

      if (!activeIsCategoryView) {
        const addTile = document.createElement("button");
        addTile.type = "button";
        addTile.className = "tile-add";
        addTile.innerHTML =
          '<span class="tile-add__icon" aria-hidden="true">+</span><span class="tile-add__label"></span>';
        addTile.hidden = centerItems;
        addTile.tabIndex = centerItems ? -1 : 0;
        addTile.setAttribute("aria-hidden", centerItems ? "true" : "false");
        addTile.addEventListener("click", () => addItemToCategory(cat.id));
        grid.appendChild(addTile);
      }
    });

    let addCategoryButton = null;
    if (!activeIsCategoryView) {
      addCategoryButton = document.createElement("button");
      addCategoryButton.type = "button";
      addCategoryButton.className = "category-add";
      addCategoryButton.innerHTML =
        '<span class="category-add__icon" aria-hidden="true">+</span><span class="category-add__label">Add category</span><span class="category-add__hint">(Insert)</span>';
      addCategoryButton.addEventListener("click", () => addCategoryAtEnd());
      renderHost.appendChild(addCategoryButton);
    }

    if (addCategoryButton && centerItems) {
      addCategoryButton.hidden = true;
      addCategoryButton.tabIndex = -1;
      addCategoryButton.setAttribute("aria-hidden", "true");
    }

    applyStageLayout();
    applyReusedHighlights();

    wireEvents();
    reflowRects();
    drawLinks();
    renderCategorySelection();
    maybeShowInfoTabPreview();
  }

  function wireEvents() {
    app.querySelectorAll(".tile").forEach((t) => {
      t.addEventListener("click", (event) => {
        if (typeof event.button === "number" && event.button !== 0) return;
        hidePreview();
        const id = t.dataset.id;
        const targetSeriesIndex =
          t.dataset.seriesVersionIndex != null
            ? parseInt(t.dataset.seriesVersionIndex, 10)
            : null;
        const globalIndex =
          t.dataset.globalIndex != null
            ? parseInt(t.dataset.globalIndex, 10)
            : null;
        const targetModelIndex =
          t.dataset.navTargetIndex != null
            ? parseInt(t.dataset.navTargetIndex, 10)
            : null;
        const activeEntry = models[activeIndex];
        const currentSeriesIndex = activeEntry
          ? getActiveApicurioVersionIndex(activeEntry)
          : -1;
        const canNavigateToSeries =
          activeEntry?.apicurioVersions?.length > 1 &&
          Number.isInteger(targetSeriesIndex) &&
          targetSeriesIndex !== currentSeriesIndex;
        const canNavigateToModel =
          Number.isInteger(targetModelIndex) &&
          targetModelIndex !== activeIndex &&
          targetModelIndex >= 0 &&
          targetModelIndex < models.length;
        const pendingMatch =
          pendingSeriesNavigation &&
          pendingSeriesNavigation.id === id &&
          pendingSeriesNavigation.targetVersionIndex === targetSeriesIndex;
        const pendingModelMatch =
          pendingModelNavigation &&
          pendingModelNavigation.id === id &&
          pendingModelNavigation.targetIndex === targetModelIndex;

        if (pendingSeriesNavigation && !pendingMatch) {
          clearSeriesNavNotice();
        }
        if (pendingModelNavigation && !pendingModelMatch) {
          clearModelNavNotice();
        }

        if (canNavigateToSeries) {
          if (pendingMatch) {
            clearSeriesNavNotice();
            const changed = setActiveApicurioVersion(
              activeIndex,
              targetSeriesIndex
            );
            if (changed) return;
          } else {
            showSeriesNavNotice(id, targetSeriesIndex, activeEntry);
          }
        } else if (canNavigateToModel) {
          if (pendingModelMatch) {
            clearModelNavNotice();
            setActive(targetModelIndex);
            return;
          }
          showModelNavNotice(id, targetModelIndex);
        } else if (
          Number.isInteger(globalIndex) &&
          globalIndex > 0 &&
          globalIndex % 5 === 0
        ) {
          showNotice(
            "Use arrow keys to move between blocks. Shift arrow to move block."
          );
        }
        console.log("[Blockscape] click", id);
        if (
          selection === id &&
          !(canNavigateToSeries && pendingMatch) &&
          !(canNavigateToModel && pendingModelMatch)
        ) {
          clearSelection();
          return;
        }
        select(id);
      });
      t.addEventListener("dblclick", (event) => {
        event.preventDefault();
        const id = t.dataset.id;
        const targetIndex =
          t.dataset.navTargetIndex != null
            ? parseInt(t.dataset.navTargetIndex, 10)
            : findModelIndexByIdOrSource(id);
        if (targetIndex !== -1 && targetIndex !== activeIndex) {
          setActive(targetIndex);
        }
      });
      t.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          t.click();
        }
      });
      const syncHoverOverlay = () => {
        if (selection) scheduleOverlaySync();
      };
      t.addEventListener("pointerenter", syncHoverOverlay);
      t.addEventListener("pointerleave", syncHoverOverlay);
      t.addEventListener("focus", syncHoverOverlay);
      t.addEventListener("blur", syncHoverOverlay);
    });

    if (!globalEventsBound) {
      globalEventsBound = true;
      window.addEventListener("resize", scheduleOverlaySync);
      window.addEventListener("scroll", scheduleOverlaySync, { passive: true });
      window.addEventListener("resize", scheduleThumbLabelMeasure);
      document.addEventListener("click", (event) => {
        if (!selection && !selectedCategoryId) return;
        if (typeof event.button === "number" && event.button !== 0) return;
        const target = event.target;
        const clickedTile = target?.closest?.(".tile");
        const clickedCategoryHead = target?.closest?.(".cat-head");
        const clickedTileMenu = target?.closest?.(".tile-context-menu");
        if (clickedTile || clickedCategoryHead || clickedTileMenu) return;
        clearSelection();
      });
    }
    document.getElementById("clear").onclick = () => clearSelection();
  }

  function reflowRects() {
    index.forEach((v) => {
      v.rect = v.el.getBoundingClientRect();
    });
  }

  function getSelectionRelations(
    id,
    { includeSecondary = showSecondaryLinks } = {}
  ) {
    if (!id || !model) {
      return {
        deps: new Set(),
        revs: new Set(),
        secondaryDeps: new Set(),
        secondaryRevs: new Set(),
        edges: [],
      };
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

    deps.forEach((dep) => addEdge(id, dep, "dep", 1));
    revs.forEach((dependent) => addEdge(id, dependent, "revdep", 1));

    if (includeSecondary) {
      const firstLevel = new Set([...deps, ...revs]);
      firstLevel.forEach((node) => {
        const nodeDeps = model.fwd.get(node) || new Set();
        nodeDeps.forEach((dep) => {
          const isLoopToSelection = dep === id;
          if (!isLoopToSelection) secondaryDeps.add(dep);
          if (!isLoopToSelection) addEdge(node, dep, "dep", 2);
        });

        const nodeDependents = model.rev.get(node) || new Set();
        nodeDependents.forEach((dependent) => {
          const isLoopToSelection = dependent === id;
          if (!isLoopToSelection) secondaryRevs.add(dependent);
          if (!isLoopToSelection) addEdge(node, dependent, "revdep", 2);
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
    if (!id) return;
    selectedCategoryId = null;
    selection = id;
    categoryEntryHint = null;
    selectionRelations = getSelectionRelations(id);
    syncSelectionClass();
    clearStyles();
    renderCategorySelection();
    const { deps, revs, secondaryDeps, secondaryRevs } = selectionRelations;
    console.log(
      "[Blockscape] selecting id=",
      id,
      "deps=",
      Array.from(deps),
      "revs=",
      Array.from(revs)
    );
    const sel = index.get(id);
    if (sel) sel.el.classList.add("selected");
    deps.forEach((d) => markTile(d, "dep"));
    revs.forEach((r) => markTile(r, "revdep"));
    secondaryDeps.forEach((d) => {
      if (!deps.has(d) && d !== id) markTile(d, "dep-indirect");
    });
    secondaryRevs.forEach((r) => {
      if (!revs.has(r) && !deps.has(r) && r !== id)
        markTile(r, "revdep-indirect");
    });
    drawLinks();
    const externalUrl = index.get(id)?.el?.dataset?.externalUrl;
    if (externalUrl) {
      showNotice("This item has link to", NOTICE_TIMEOUT_MS, externalUrl);
    }
    updateServerUrlFromActive();
  }

  function selectCategory(
    catId,
    { scrollIntoView = true, preserveEntryHint = false } = {}
  ) {
    if (!model?.m?.categories || !catId) return false;
    const categories = model.m.categories || [];
    const target = categories.find((cat) => cat.id === catId);
    if (!target) return false;
    hidePreview();
    clearItemSelection();
    if (!preserveEntryHint) categoryEntryHint = null;
    selectedCategoryId = target.id;
    syncSelectionClass();
    renderCategorySelection();
    const entry = categoryIndex.get(target.id);
    if (scrollIntoView && entry?.el) {
      entry.el.scrollIntoView({ behavior: "smooth", block: "center" });
      entry.headEl?.focus({ preventScroll: true });
    }
    return true;
  }

  function renderCategorySelection() {
    categoryIndex.forEach(({ el, headEl }) => {
      el.classList.remove("category--selected");
      if (headEl) headEl.removeAttribute("aria-current");
    });
    if (!selectedCategoryId) return;
    const hit = categoryIndex.get(selectedCategoryId);
    if (!hit?.el) {
      selectedCategoryId = null;
      categoryEntryHint = null;
      syncSelectionClass();
      return;
    }
    hit.el.classList.add("category--selected");
    if (hit.headEl) hit.headEl.setAttribute("aria-current", "true");
  }

  function getCurrentCategoryId() {
    if (selectedCategoryId) return selectedCategoryId;
    const selectedMeta = selection ? index.get(selection) : null;
    if (selectedMeta?.catId) return selectedMeta.catId;
    return null;
  }

  function selectCategoryByStep(step) {
    if (!model?.m?.categories?.length || !step) return false;
    const categories = model.m.categories;
    const currentCatId = getCurrentCategoryId();
    let currentIndex = categories.findIndex((cat) => cat.id === currentCatId);
    if (currentIndex === -1) {
      const fallback =
        categories.find((cat) => (cat.items || []).length)?.id ||
        categories[0]?.id;
      if (!fallback) return false;
      return selectCategory(fallback);
    }
    const targetIndex = currentIndex + step;
    if (targetIndex < 0 || targetIndex >= categories.length) return false;
    return selectCategory(categories[targetIndex].id);
  }

  function clearItemSelection() {
    selection = null;
    selectionRelations = null;
    clearStyles();
    drawLinks();
    updateServerUrlFromActive({ itemId: null });
  }

  function clearCategorySelection() {
    selectedCategoryId = null;
    categoryEntryHint = null;
    renderCategorySelection();
  }

  function clearSelection() {
    clearItemSelection();
    clearCategorySelection();
    categoryEntryHint = null;
    syncSelectionClass();
  }

  function clearStyles() {
    app
      .querySelectorAll(".tile")
      .forEach((t) =>
        t.classList.remove(
          "dep",
          "revdep",
          "dep-indirect",
          "revdep-indirect",
          "selected"
        )
      );
  }

  function applyReusedHighlights() {
    if (!model?.reusedLocal) return;
    model.reusedLocal.forEach((id) => {
      const hit = index.get(id);
      if (!hit) return;
      hit.el.classList.toggle("reused", showReusedInMap);
      const badge = hit.el.querySelector(".badge");
      if (badge)
        badge.style.display = showReusedInMap ? "inline-block" : "none";
    });
  }

  function drawLinks() {
    while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
    if (!selection || overlay.hidden) return;
    selectionRelations = getSelectionRelations(selection);
    const relations = selectionRelations;

    const { primary, secondary } = getLinkStrokeWidths();
    relations.edges.forEach((edge) => {
      const fromRect = index.get(edge.from)?.rect;
      const toRect = index.get(edge.to)?.rect;
      if (!fromRect || !toRect) return;
      const a = center(fromRect);
      const b = center(toRect);
      const start =
        insetPoint(clipToRect(fromRect, b) || a, fromRect, LINK_EDGE_INSET_PX) ||
        a;
      const end =
        insetPoint(clipToRect(toRect, a) || b, toRect, LINK_EDGE_INSET_PX) || b;
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      const c1x = (start.x + end.x) / 2,
        c1y = start.y;
      const c2x = (start.x + end.x) / 2,
        c2y = end.y;
      path.setAttribute(
        "d",
        `M ${start.x},${start.y} C ${c1x},${c1y} ${c2x},${c2y} ${end.x},${end.y}`
      );
      path.setAttribute("fill", "none");
      path.setAttribute(
        "stroke",
        edge.type === "dep"
          ? "var(--blockscape-dep)"
          : "var(--blockscape-revdep)"
      );
      path.setAttribute("stroke-opacity", edge.depth === 1 ? "0.45" : "0.22");
      path.setAttribute("stroke-width", edge.depth === 1 ? primary : secondary);
      if (edge.depth > 1) path.setAttribute("stroke-dasharray", "4 3");
      path.setAttribute("vector-effect", "non-scaling-stroke");
      overlay.appendChild(path);
    });
  }

  function center(r) {
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function clipToRect(rect, target) {
    if (!rect || !target) return null;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = target.x - cx;
    const dy = target.y - cy;
    if (dx === 0 && dy === 0) return { x: cx, y: cy };
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;
    const candidates = [];
    if (dx !== 0) {
      candidates.push((dx > 0 ? halfW : -halfW) / dx);
    }
    if (dy !== 0) {
      candidates.push((dy > 0 ? halfH : -halfH) / dy);
    }
    const t = Math.min(...candidates.filter((v) => v > 0));
    const mult = Number.isFinite(t) ? t : 0;
    return { x: cx + dx * mult, y: cy + dy * mult };
  }

  function insetPoint(point, rect, inset = 0) {
    if (!point || !rect || inset <= 0) return point;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = cx - point.x;
    const dy = cy - point.y;
    const len = Math.hypot(dx, dy);
    if (!len) return point;
    const step = Math.min(inset, len / 2) / len;
    return { x: point.x + dx * step, y: point.y + dy * step };
  }
  function escapeHtml(s) {
    return s.replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
      "'": "&#39;",
        }[m])
    );
  }

  function buildObsidianUrl(targetText) {
    const trimmed = (targetText ?? "").toString().trim();
    if (!trimmed) return "";
    const filepath = trimmed.endsWith(".md") ? trimmed : `${trimmed}.md`;
    const params = new URLSearchParams();
    params.set("filepath", filepath);
    params.set("data", " ");
    params.set("mode", "append");
    if (obsidianVaultName) {
      params.set("vault", obsidianVaultName);
    }
    return `obsidian://advanced-uri?${params.toString()}`;
  }

  function getObsidianTargetText(item) {
    if (!item) return "";
    if (obsidianLinkMode === OBSIDIAN_LINK_MODE_ID) {
      return item.id ?? item.name ?? "";
    }
    return item.name ?? item.id ?? "";
  }

  function getObsidianLink(item, { externalMeta, seriesIdLookup } = {}) {
    if (!obsidianLinksEnabled) return "";
    if (!item) return "";
    if (seriesIdLookup?.has?.(item.id)) return "";
    const targetText = getObsidianTargetText(item);
    return buildObsidianUrl(targetText);
  }

  function resolveExternalMeta(value) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return { isExternal: false, url: "" };
      try {
        const url = new URL(trimmed);
        if (!/^https?:/i.test(url.protocol))
          return { isExternal: false, url: "" };
        return { isExternal: true, url: url.toString() };
      } catch (error) {
        // Continue to relative resolution below.
      }
      if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
        // Treat bare/relative paths as external links, resolving against the current page when possible.
        try {
          const base =
            typeof window !== "undefined" && window.location?.href
              ? window.location.href
              : undefined;
          const resolved = base ? new URL(trimmed, base).toString() : trimmed;
          return { isExternal: true, url: resolved };
        } catch (error) {
          console.warn(
            "[Blockscape] invalid external url skipped",
            value,
            error
          );
          return { isExternal: false, url: "" };
        }
      }
      console.warn("[Blockscape] invalid external url skipped", value);
      return { isExternal: false, url: "" };
    }
    if (value === true) {
      return { isExternal: true, url: "" };
    }
    return { isExternal: false, url: "" };
  }

  function createObsidianLinkButton(url) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "external-link obsidian-link";
    button.setAttribute("aria-label", "Open in Obsidian");
    button.title = url;
    button.textContent = "O";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      window.open(url, "_blank", "noopener");
    });
    button.addEventListener("keydown", (event) => event.stopPropagation());
    return button;
  }

  function createExternalLinkButton(url) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "external-link";
    button.setAttribute("aria-label", "Open external reference in a new tab");
    button.title = url;
    button.textContent = "↗";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      window.open(url, "_blank", "noopener");
    });
    button.addEventListener("keydown", (event) => event.stopPropagation());
    return button;
  }

  function applyObsidianLinkToTile(tile, url) {
    if (!tile) return;
    const existing = tile.querySelector(".obsidian-link");
    if (!url) {
      if (existing) existing.remove();
      tile.removeAttribute("data-obsidian-url");
      return;
    }
    tile.dataset.obsidianUrl = url;
    if (existing) {
      existing.title = url;
      return;
    }
    tile.appendChild(createObsidianLinkButton(url));
  }

  function scheduleThumbLabelMeasure() {
    if (thumbLabelMeasureTimer) return;
    thumbLabelMeasureTimer = requestAnimationFrame(() => {
      thumbLabelMeasureTimer = null;
      versionThumbLabels = versionThumbLabels.filter(
        ({ labelEl, textEl }) => labelEl?.isConnected && textEl?.isConnected
      );
      versionThumbLabels.forEach(({ labelEl, textEl }) => {
        const overflow = Math.max(textEl.scrollWidth - labelEl.clientWidth, 0);
        if (overflow > 4) {
          const duration = Math.max(4, Math.min(14, 4 + overflow / 30));
          labelEl.classList.add("version-nav__thumb-label--scroll");
          textEl.style.setProperty("--marquee-distance", `${overflow}px`);
          textEl.style.setProperty("--marquee-duration", `${duration}s`);
        } else {
          labelEl.classList.remove("version-nav__thumb-label--scroll");
          textEl.style.removeProperty("--marquee-distance");
          textEl.style.removeProperty("--marquee-duration");
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
    const parts = [
      `<div class="version-nav__tooltip-title">${escapeHtml(titleText)}</div>`,
    ];
    const versionLabel = (
      versionEntry?.version ??
      versionEntry?.data?.version ??
      ""
    )
      .toString()
      .trim();
    if (versionLabel) {
      parts.push(
        `<div class="version-nav__tooltip-meta">Version ${escapeHtml(
          versionLabel
        )}</div>`
      );
    }
    const abstractHtml = (versionEntry?.data?.abstract ?? "").toString().trim();
    if (abstractHtml) {
      parts.push(
        `<div class="version-nav__tooltip-body">${abstractHtml}</div>`
      );
    } else {
      parts.push(
        '<div class="version-nav__tooltip-body muted">No info available for this version.</div>'
      );
    }
    return parts.join("");
  }

  function showTabTooltip(target, html, { offset = 8 } = {}) {
    if (!tabTooltip || !target || !html) return;
    tabTooltip.innerHTML = html;
    tabTooltip.hidden = false;
    tabTooltip.setAttribute("aria-hidden", "false");
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
      tabTooltip.classList.add("is-visible");
    });
  }

  function hideTabTooltip() {
    if (infoTooltipAutoHideTimer) {
      clearTimeout(infoTooltipAutoHideTimer);
      infoTooltipAutoHideTimer = null;
    }
    if (!tabTooltip) return;
    tabTooltip.classList.remove("is-visible");
    tabTooltip.setAttribute("aria-hidden", "true");
    tabTooltip.hidden = true;
  }

  function attachSeriesPreviewHover(thumbEl, versionEntry) {
    if (!thumbEl) return;
    const titleText = getModelTitle(
      versionEntry?.data || versionEntry,
      "Series version"
    );
    thumbEl.title = titleText;
    thumbEl.setAttribute("aria-label", titleText);
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
      showTabTooltip(
        thumbEl,
        `<div class="version-nav__tooltip-title">${escapeHtml(
          titleText
        )}</div>`,
        { offset: 10 }
      );
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

    thumbEl.addEventListener("mouseenter", handleEnter);
    thumbEl.addEventListener("focus", handleEnter);
    thumbEl.addEventListener("pointermove", handleMove);
    thumbEl.addEventListener("mouseleave", handleLeave);
    thumbEl.addEventListener("blur", handleLeave);
    thumbEl.addEventListener("click", handleLeave);
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
    infoTabButton.classList.add("blockscape-tab--twinkle");
    infoTabTwinkleTimer = setTimeout(() => {
      infoTabButton.classList.remove("blockscape-tab--twinkle");
      infoTabTwinkleTimer = null;
    }, 1400);
  }

  window.addEventListener("scroll", hideTabTooltip, true);
  window.addEventListener("resize", hideTabTooltip);

  if (helpButton) {
    helpButton.addEventListener("click", () => {
      openShortcutHelp();
    });
  }

  if (newPanelButton) {
    newPanelButton.addEventListener("click", () => {
      openNewPanel();
    });
  }

  if (newBlankButton) {
    newBlankButton.addEventListener("click", () => {
      try {
        scrollPageToTop();
        createAndActivateBlankSeries();
      } catch (error) {
        console.error("[Blockscape] failed to create blank series", error);
        alert(error?.message || "Unable to create a blank map right now.");
      }
    });
  }

  if (shortcutHelpClose) {
    shortcutHelpClose.addEventListener("click", closeShortcutHelp);
  }

  if (shortcutHelpBackdrop) {
    shortcutHelpBackdrop.addEventListener("click", closeShortcutHelp);
  }

  if (newPanelClose) {
    newPanelClose.addEventListener("click", closeNewPanel);
  }

  if (newPanelBackdrop) {
    newPanelBackdrop.addEventListener("click", closeNewPanel);
  }

  if (app) {
    app.addEventListener("contextmenu", (event) => {
      const tile = event.target.closest(".tile");
      if (activeViewIsCategory) return;
      if (!tile || !app.contains(tile)) return;
      handleTileContextMenu(event, tile);
    });
  }

  document.addEventListener("click", (event) => {
    if (typeof event.button === "number" && event.button !== 0) return;
    handleTileMenuDocumentClick(event);
  });

  if (downloadButton) {
    downloadButton.addEventListener("click", () => {
      downloadCurrentJson("button");
    });
  }

  if (createVersionButton) {
    createVersionButton.addEventListener("click", () => {
      if (activeIndex < 0) {
        alert("Load or select a model before creating a version.");
        return;
      }
      try {
        const idx = createNewVersionFromActive({ versionLabel: "map edit" });
        setActive(idx);
        console.log("[Blockscape] created new version from map view");
      } catch (error) {
        alert(error?.message || "Unable to create a new version right now.");
      }
    });
  }

  if (shareButton) {
    shareButton.addEventListener("click", async () => {
      if (activeIndex < 0 || !models[activeIndex]) {
        alert("Select or load a model before sharing.");
        return;
      }
      const payload = {
        title: getModelTitle(models[activeIndex], "Shared Model"),
        data: models[activeIndex].data,
      };
      let encoded;
      try {
        encoded = base64UrlEncode(JSON.stringify(payload));
      } catch (err) {
        console.error("[Blockscape] share encode failed", err);
        alert("Unable to encode this model for sharing.");
        return;
      }
      const shareUrl = new URL(window.location.href);
      shareUrl.searchParams.delete("share");
      shareUrl.hash = `share=${encoded}`;
      const fullUrl = shareUrl.toString();

      // Update the address bar so the current page URL matches the share URL
      try {
        window.history.replaceState({}, document.title, fullUrl);
      } catch (err) {
        console.warn("[Blockscape] failed to update URL for share", err);
        window.location.hash = shareUrl.hash;
      }

      let copied = false;
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(fullUrl);
          copied = true;
        } catch (err) {
          console.warn("[Blockscape] clipboard write failed", err);
        }
      }
      if (copied) {
        alert("Share URL copied to clipboard.");
      } else {
        window.prompt("Copy this share URL:", fullUrl);
      }
    });
  }

  if (editButton) {
    editButton.addEventListener("click", () => {
      const text = (jsonBox.value || "").trim();
      if (!text) {
        alert("Load or paste a model before opening the editor.");
        return;
      }
      try {
        JSON.parse(text);
      } catch (err) {
        alert("Current JSON is invalid. Fix it before opening the editor.");
        return;
      }
      try {
        const payload = {
          ts: Date.now(),
          text,
          source: "viewer",
        };
        if (selection) {
          payload.selectedItemId = selection;
        }
        localStorage.setItem(EDITOR_TRANSFER_KEY, JSON.stringify(payload));
      } catch (storageError) {
        console.error(
          "[Blockscape] failed to store editor payload",
          storageError
        );
        alert("Unable to stash JSON for the editor (storage disabled?).");
        return;
      }
      let editorUrl = "editor.html#viewer";
      if (selection) {
        const encoded = encodeURIComponent(selection);
        editorUrl = `editor.html?selected=${encoded}#viewer`;
      }
      window.open(editorUrl, "_blank");
    });
  }

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (!event) return;
      if (event.storageArea && event.storageArea !== window.localStorage)
        return;
      if (event.key !== EDITOR_TRANSFER_KEY) return;
      if (!event.newValue) return;
      let payload;
      try {
        payload = JSON.parse(event.newValue);
      } catch (err) {
        console.warn("[Blockscape] storage payload parse failed", err);
        return;
      }
      if (!payload || payload.source !== "editor") return;
      importEditorPayload("storage-event");
    });

    window.addEventListener("message", (event) => {
      if (!event || !event.data) return;
      const currentOrigin = window.location.origin;
      if (currentOrigin && currentOrigin !== "null") {
        if (event.origin !== currentOrigin) return;
      } else if (event.origin && event.origin !== "null") {
        return;
      }
      if (typeof event.data !== "object") return;
      if (event.data === null) return;
      if (event.data.type !== EDITOR_TRANSFER_MESSAGE_TYPE) return;
      importEditorPayload("message");
    });
  }

  document.addEventListener("keydown", (event) => {
    if (isShortcutHelpOpen()) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeShortcutHelp();
      }
      return;
    }

    if (!newPanel?.hidden && event.key === "Escape") {
      event.preventDefault();
      closeNewPanel();
      return;
    }

    const isEditingItem = itemEditor?.isOpen?.();
    if (isEditingItem) {
      return;
    }
    const isCategoryView = activeViewIsCategory;

    if ((event.ctrlKey || event.metaKey) && event.code === "KeyS") {
      event.preventDefault();
      const active = models[activeIndex];
      const preferSeries = !!(active?.apicurioVersions?.length > 1);
      downloadCurrentJson("shortcut", preferSeries);
      return;
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      !event.shiftKey &&
      event.key &&
      event.key.toLowerCase() === "z"
    ) {
      if (!shouldHandleGlobalPaste()) return;
      const undone = undoLastDeletion();
      if (undone) {
        event.preventDefault();
        return;
      }
    }

    if (event.key === "Escape") {
      let handled = false;
      if (preview && !preview.hidden) {
        hidePreview();
        handled = true;
      }
      if (selection || selectedCategoryId) {
        clearSelection();
        handled = true;
      }
      if (handled) {
        event.preventDefault();
      }
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      if (isCategoryView) return;
      if (!shouldHandleGlobalPaste()) return;
      const step = event.key === "ArrowLeft" ? -1 : 1;
      if (event.altKey) return;
      if (
        centerItems &&
        event.shiftKey &&
        selection &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        const cycled = cycleItemStage(selection, step);
        if (cycled) {
          event.preventDefault();
          return;
        }
      }
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
        const navigated = stepApicurioVersion(step);
        if (navigated) {
          event.preventDefault();
        }
        return;
      }
      if (event.ctrlKey || event.metaKey) return;
      if (selectedCategoryId && !event.shiftKey) {
        event.preventDefault();
        return;
      }
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

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      if (isCategoryView) return;
      if (!shouldHandleGlobalPaste()) return;
      const step = event.key === "ArrowUp" ? -1 : 1;
      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        const movedCategory = moveCategoryByStep(step);
        if (movedCategory) {
          event.preventDefault();
        }
        return;
      }
      if (event.altKey) return;
      if (selectedCategoryId && !selection && !event.shiftKey) {
        const entered = enterSelectedCategoryItems(step);
        if (entered) {
          event.preventDefault();
          return;
        }
        const movedCatSelection = selectCategoryByStep(step);
        if (movedCatSelection) {
          event.preventDefault();
          return;
        }
      }
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

    if (event.key === "Delete") {
      if (isCategoryView) return;
      if (!shouldHandleGlobalPaste()) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      const removedCategory = selectedCategoryId
        ? deleteSelectedCategory()
        : false;
      const removedItem = removedCategory ? true : deleteSelectedItem();
      if (removedCategory || removedItem) {
        event.preventDefault();
      }
    }

    if (event.key === "F2") {
      if (isCategoryView) return;
      if (!shouldHandleGlobalPaste()) return;
      const targetCategoryId =
        (selectedCategoryId && !selection && selectedCategoryId) ||
        (!selection &&
          event.target?.closest?.(".category")?.dataset?.cat) ||
        null;
      if (targetCategoryId && !selection) {
        const edited = openCategoryEditor(targetCategoryId);
        if (edited) {
          event.preventDefault();
          return;
        }
      }
      const targetId =
        selection || event.target?.closest?.(".tile")?.dataset?.id;
      if (targetId) {
        const opened = itemEditor.open(targetId);
        if (opened) event.preventDefault();
      }
    }

    if (event.key === "Insert") {
      if (isCategoryView) return;
      if (!shouldHandleGlobalPaste()) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      const added = addCategoryAtEnd();
      if (added) {
        event.preventDefault();
      }
    }
  });

  window.addEventListener("resize", () => {
    handleTileMenuWindowResize();
  });

  window.addEventListener("scroll", () => handleTileMenuWindowScroll(), true);

  function reorderItem(itemId, targetItemId, targetCategoryId) {
    if (activeIndex < 0) return;
    const mobj = models[activeIndex].data;
    const categories = mobj.categories || [];
    const sourceCategory = categories.find((cat) =>
      (cat.items || []).some((item) => item.id === itemId)
    );
    const targetCategory = categories.find(
      (cat) => cat.id === targetCategoryId
    );
    if (!sourceCategory || !targetCategory) return;

    sourceCategory.items = sourceCategory.items || [];
    targetCategory.items = targetCategory.items || [];

    const itemIndex = sourceCategory.items.findIndex(
      (item) => item.id === itemId
    );
    if (itemIndex === -1) return;

    const [movedItem] = sourceCategory.items.splice(itemIndex, 1);
    let insertIndex = targetCategory.items.length;
    if (targetItemId) {
      const targetIndex = targetCategory.items.findIndex(
        (item) => item.id === targetItemId
      );
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
    const category = categories.find((cat) => cat.id === categoryId);
    if (!category) return;

    category.items = category.items || [];
    const defaultName = `New item ${category.items.length + 1}`;
    const newId = makeUniqueItemId(
      `${categoryId}-${category.items.length + 1}`,
      mobj
    );
    const newItem = {
      id: newId,
      name: defaultName,
      deps: [],
    };
    category.items.push(newItem);

    loadActiveIntoEditor();
    rebuildFromActive();
    hidePreview();
    select(newItem.id);
    const created = index.get(newItem.id);
    if (created?.el) {
      created.el.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }
    console.log("[Blockscape] added item", newItem.id, "to", categoryId);
  }

  function addCategoryAtEnd() {
    if (activeIndex < 0) return false;
    const mobj = models[activeIndex].data;
    mobj.categories = mobj.categories || [];
    const defaultTitle = `New category ${mobj.categories.length + 1}`;
    const newId = makeUniqueCategoryId(defaultTitle, mobj);
    const newCategory = { id: newId, title: defaultTitle, items: [] };
    mobj.categories.push(newCategory);
    selectedCategoryId = newId;
    selection = null;
    selectionRelations = null;
    categoryEntryHint = null;
    loadActiveIntoEditor();
    rebuildFromActive();
    selectCategory(newId);
    console.log("[Blockscape] added category", newId);
    return true;
  }

  function openCategoryEditor(catId = getCurrentCategoryId()) {
    if (activeIndex < 0 || !catId) return false;
    const opened = categoryEditor.open(catId);
    if (opened) {
      selection = null;
      selectionRelations = null;
      syncSelectionClass();
    }
    return opened;
  }

  function moveSelectionWithinCategory(step) {
    if (!selection || activeIndex < 0 || !step) return false;
    const mobj = models[activeIndex].data;
    const categories = mobj.categories || [];
    const selectedMeta = index.get(selection);
    let category = null;
    if (selectedMeta?.catId) {
      category = categories.find((cat) => cat.id === selectedMeta.catId);
    }
    if (!category) {
      category = categories.find((cat) =>
        (cat.items || []).some((item) => item.id === selection)
      );
    }
    if (!category) return false;

    category.items = category.items || [];
    const currentIndex = category.items.findIndex(
      (item) => item.id === selection
    );
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
      const firstCategory = categories.find((cat) => (cat.items || []).length);
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
      category = categories.find((cat) => cat.id === selectedMeta.catId);
    }
    if (!category) {
      category = categories.find((cat) =>
        (cat.items || []).some((item) => item.id === selection)
      );
    }
    if (!category) {
      const starter = findFirstItem();
      if (!starter) return false;
      select(starter.item.id);
      return true;
    }

    const items = category.items || [];
    if (!items.length) return false;
    const currentIndex = items.findIndex((item) => item.id === selection);
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
    const currentCatId = getCurrentCategoryId();
    let currentIndex = categories.findIndex((cat) => cat.id === currentCatId);
    let targetIndex = currentIndex + step;
    if (currentIndex === -1) {
      targetIndex = step > 0 ? 0 : categories.length - 1;
    }
    if (targetIndex < 0 || targetIndex >= categories.length) return false;
    const targetCat = categories[targetIndex];
    if (selection) {
      const currentItems = categories[currentIndex].items || [];
      const currentItemPosition = currentItems.findIndex(
        (item) => item.id === selection
      );
      categoryEntryHint = {
        catId: targetCat.id,
        position: currentItemPosition === -1 ? 0 : currentItemPosition,
      };
    } else {
      categoryEntryHint = null;
    }
    return selectCategory(targetCat.id, { preserveEntryHint: true });
  }

  function enterSelectedCategoryItems(step) {
    if (!selectedCategoryId || !model?.m?.categories || !step) return false;
    const categories = model.m.categories || [];
    const targetCat = categories.find((cat) => cat.id === selectedCategoryId);
    if (!targetCat) return false;
    const items = targetCat.items || [];
    if (!items.length) return false;
    let targetIndex =
      step > 0 ? 0 : Math.max(0, items.length - 1);
    if (categoryEntryHint?.catId === targetCat.id) {
      const hinted = Math.min(
        items.length - 1,
        Math.max(0, categoryEntryHint.position || 0)
      );
      targetIndex = hinted;
    }
    categoryEntryHint = null;
    select(items[targetIndex].id);
    return true;
  }

  function moveSelectionAcrossCategories(step) {
    if (!selection || activeIndex < 0 || !step) return false;
    const mobj = models[activeIndex].data;
    const categories = mobj.categories || [];
    if (!categories.length) return false;

    const selectedMeta = index.get(selection);
    let sourceIndex = -1;
    if (selectedMeta?.catId) {
      sourceIndex = categories.findIndex(
        (cat) => cat.id === selectedMeta.catId
      );
    }
    if (sourceIndex === -1) {
      sourceIndex = categories.findIndex((cat) =>
        (cat.items || []).some((item) => item.id === selection)
      );
    }
    if (sourceIndex === -1) return false;

    const targetIndex = sourceIndex + step;
    if (targetIndex < 0 || targetIndex >= categories.length) return false;

    const sourceCategory = categories[sourceIndex];
    const targetCategory = categories[targetIndex];
    if (!targetCategory) return false;

    sourceCategory.items = sourceCategory.items || [];
    targetCategory.items = targetCategory.items || [];

    const currentIndex = sourceCategory.items.findIndex(
      (item) => item.id === selection
    );
    if (currentIndex === -1) return false;

    const insertPos = Math.min(
      targetCategory.items.length,
      Math.max(0, currentIndex)
    );
    const targetItemId =
      insertPos < targetCategory.items.length
        ? targetCategory.items[insertPos].id
        : null;

    reorderItem(selection, targetItemId, targetCategory.id);
    render();
    select(selection);
    return true;
  }

  function moveCategoryByStep(step) {
    if (activeIndex < 0 || !step) return false;
    const mobj = models[activeIndex].data;
    const categories = mobj.categories || [];
    if (!categories.length) return false;
    const currentCatId = getCurrentCategoryId();
    if (!currentCatId) return false;
    const currentIndex = categories.findIndex((cat) => cat.id === currentCatId);
    if (currentIndex === -1) return false;
    const targetIndex = currentIndex + step;
    if (targetIndex < 0 || targetIndex >= categories.length) return false;
    const [moved] = categories.splice(currentIndex, 1);
    categories.splice(targetIndex, 0, moved);
    selectedCategoryId = moved.id;
    clearItemSelection();
    categoryEntryHint = null;
    syncSelectionClass();
    loadActiveIntoEditor();
    rebuildFromActive();
    renderCategorySelection();
    console.log(
      "[Blockscape] moved category",
      moved.id,
      "from",
      currentIndex,
      "to",
      targetIndex
    );
    return true;
  }

  function undoLastDeletion() {
    if (activeIndex < 0) return false;
    const activeModel = models[activeIndex];
    const activeModelId =
      getModelId(activeModel) || (activeModel ? activeModel.id : null);
    const candidates = [];
    if (lastDeletedItem && activeModelId === lastDeletedItem.modelId) {
      candidates.push({ ...lastDeletedItem, type: "item" });
    }
    if (lastDeletedCategory && activeModelId === lastDeletedCategory.modelId) {
      candidates.push({ ...lastDeletedCategory, type: "category" });
    }
    if (!candidates.length) return false;
    const latest = candidates.reduce((acc, entry) => {
      if (!acc) return entry;
      return (entry.ts || 0) > (acc.ts || 0) ? entry : acc;
    }, null);
    if (!latest) return false;
    if (latest.type === "category") {
      const restored = restoreCategoryDeletion(latest);
      if (restored) return true;
    } else if (latest.type === "item") {
      const restored = restoreItemDeletion(latest);
      if (restored) return true;
    }
    return false;
  }

  function restoreItemDeletion(deleted) {
    const activeModel = models[activeIndex];
    const activeModelId =
      getModelId(activeModel) || (activeModel ? activeModel.id : null);
    if (!activeModel || activeModelId !== deleted.modelId) return false;
    const mobj = activeModel.data;
    const categories = mobj.categories || [];
    const category = categories.find((cat) => cat.id === deleted.categoryId);
    if (!category) return false;

    category.items = category.items || [];
    const insertIndex = Math.min(
      Math.max(deleted.index, 0),
      category.items.length
    );
    category.items.splice(insertIndex, 0, deleted.item);

    lastDeletedItem = null;
    hidePreview();
    selection = null;
    selectionRelations = null;
    syncSelectionClass();
    loadActiveIntoEditor();
    rebuildFromActive();
    render();
    select(deleted.item.id);
    console.log("[Blockscape] undo delete restored", deleted.item.id);
    return true;
  }

  function restoreCategoryDeletion(deleted) {
    const activeModel = models[activeIndex];
    const activeModelId =
      getModelId(activeModel) || (activeModel ? activeModel.id : null);
    if (!activeModel || activeModelId !== deleted.modelId) return false;
    const mobj = activeModel.data;
    mobj.categories = mobj.categories || [];
    const insertIndex = Math.min(
      Math.max(deleted.index, 0),
      mobj.categories.length
    );
    mobj.categories.splice(insertIndex, 0, deleted.category);
    lastDeletedCategory = null;
    selection = null;
    selectionRelations = null;
    selectedCategoryId = deleted.category.id;
    categoryEntryHint = null;
    syncSelectionClass();
    loadActiveIntoEditor();
    rebuildFromActive();
    renderCategorySelection();
    selectCategory(deleted.category.id);
    console.log("[Blockscape] undo delete restored category", deleted.category.id);
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
      category = categories.find((cat) => cat.id === selectedMeta.catId);
    }
    if (!category) {
      category = categories.find((cat) =>
        (cat.items || []).some((item) => item.id === selection)
      );
    }
    if (!category || !Array.isArray(category.items)) return false;

    const currentIndex = category.items.findIndex(
      (item) => item.id === selection
    );
    if (currentIndex === -1) return false;

    const removed = category.items.splice(currentIndex, 1)[0];
    if (!removed) return false;

    const activeModel = models[activeIndex];
    lastDeletedItem = {
      item: removed,
      categoryId: category.id,
      index: currentIndex,
      modelId:
        getModelId(activeModel) || (activeModel ? activeModel.id : null),
      ts: Date.now(),
    };

    const findNextSelection = () => {
      if (category.items.length) {
        const neighborIndex = Math.min(currentIndex, category.items.length - 1);
        return category.items[neighborIndex]?.id || null;
      }
      const catIndex = categories.findIndex((cat) => cat.id === category.id);
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
    categoryEntryHint = null;
    syncSelectionClass();
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

  function deleteSelectedCategory() {
    const catId = getCurrentCategoryId();
    if (!catId || activeIndex < 0) return false;
    const mobj = models[activeIndex].data;
    const categories = mobj.categories || [];
    if (!categories.length) return false;
    const currentIndex = categories.findIndex((cat) => cat.id === catId);
    if (currentIndex === -1) return false;
    const [removed] = categories.splice(currentIndex, 1);
    if (!removed) return false;
    const activeModel = models[activeIndex];
    lastDeletedCategory = {
      category: removed,
      index: currentIndex,
      modelId:
        getModelId(activeModel) || (activeModel ? activeModel.id : null),
      ts: Date.now(),
    };
    selectedCategoryId = null;
    selection = null;
    selectionRelations = null;
    categoryEntryHint = null;
    syncSelectionClass();
    loadActiveIntoEditor();
    rebuildFromActive();
    const nextId =
      categories[currentIndex]?.id ||
      categories[currentIndex - 1]?.id ||
      null;
    if (nextId) {
      selectCategory(nextId);
    } else {
      clearSelection();
    }
    console.log("[Blockscape] removed category", removed.id);
    return true;
  }

  function deleteItemById(id) {
    if (!id) return false;
    const previousSelection = selection;
    selection = id;
    const deleted = deleteSelectedItem();
    if (!deleted) {
      selection = previousSelection;
      syncSelectionClass();
    }
    return deleted;
  }

  // ===== Controls =====

  if (copyJsonButton) {
    copyJsonButton.addEventListener("click", async () => {
      const text = jsonBox.value || "";
      if (!text.trim()) {
        alert("JSON editor is empty.");
        return;
      }
      const copied = await writeTextToClipboard(text);
      if (copied) {
        alert("JSON copied to clipboard.");
      } else {
        window.prompt("Copy this JSON manually:", text);
      }
    });
  }

  if (copySeriesButton) {
    copySeriesButton.addEventListener("click", async () => {
      const seriesJson = getActiveSeriesJson();
      if (!seriesJson) {
        alert("No series available to copy. Create another version first.");
        return;
      }
      const copied = await writeTextToClipboard(seriesJson);
      if (copied) {
        alert("Series JSON copied to clipboard.");
      } else {
        window.prompt("Copy this series JSON manually:", seriesJson);
      }
    });
  }

  if (pasteJsonButton) {
    pasteJsonButton.addEventListener("click", async () => {
      try {
        const text = await readTextFromClipboard();
        if (!text) {
          alert("Clipboard is empty.");
          return;
        }
        jsonBox.value = text;
        jsonBox.focus();
      } catch (err) {
        console.warn("[Blockscape] clipboard read failed", err);
        alert(
          "Unable to read from the clipboard. Use Cmd/Ctrl+V inside the editor instead."
        );
      }
    });
  }

  // Append models from textarea
  document.getElementById("appendFromBox").onclick = async () => {
    try {
      const autoSave = await isLocalBackendReady();
      const appended = normalizeToModelsFromText(jsonBox.value, "Pasted", {
        promptForSeriesName: !autoSave,
      });
      if (!appended.length) {
        alert("No valid JSON found to append.");
        return;
      }
      console.log("[Blockscape] appending", appended.length, "model(s)");
      let firstIndex = null;
      const addedIndices = [];
      appended.forEach((entry, idx) => {
        const idxResult = addModelEntry(entry, {
          versionLabel: appended.length > 1 ? `paste #${idx + 1}` : "paste",
        });
        if (firstIndex == null) firstIndex = idxResult;
        addedIndices.push(idxResult);
      });
      if (activeIndex === -1 && firstIndex != null) setActive(firstIndex);
      else {
        renderModelList();
      }
      if (autoSave) {
        await autoSaveNewLocalFilesForModels(addedIndices, {
          origin: "append",
        });
      }
    } catch (e) {
      console.error("[Blockscape] append error:", e);
      alert("Append error (see console).");
    }
  };

  // Replace active model data with JSON from textarea
  document.getElementById("replaceActive").onclick = () => {
    if (activeIndex < 0) {
      alert("No active model selected.");
      return;
    }
    try {
      const obj = JSON.parse(jsonBox.value);
      ensureModelMetadata(obj, {
        titleHint: getModelTitle(models[activeIndex]),
        idHint:
          getModelId(models[activeIndex]) || getModelTitle(models[activeIndex]),
      });
      models[activeIndex].data = obj;
      models[activeIndex].title = obj.title || models[activeIndex].title;
      if (
        models[activeIndex].isSeries ||
        models[activeIndex].apicurioVersions?.length > 1
      ) {
        const seriesName =
          models[activeIndex].title || getModelTitle(models[activeIndex]);
        ensureSeriesId(models[activeIndex], {
          seriesName,
          fallbackTitle: seriesName,
        });
      }
      syncDocumentTitle();
      console.log(
        "[Blockscape] replaced active model:",
        getModelTitle(models[activeIndex])
      );
      rebuildFromActive();
      apicurio.updateAvailability();
    } catch (e) {
      console.error("[Blockscape] replace error:", e);
      alert("JSON parse error (see console).");
    }
  };

  // Load files: each text may be single object, array, or ---/%%% separated
  document.getElementById("file").onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      console.log("[Blockscape] reading", files.length, "file(s)");
      let firstIndex = null;
      for (const f of files) {
        const txt = await f.text();
        const baseName = f.name.replace(/\.[^.]+$/, "") || "File";
        const entries = normalizeToModelsFromText(txt, baseName, {
          seriesTitleOverride: `${baseName} series`,
        });
        if (!entries.length) {
          console.warn("[Blockscape] no models in file:", f.name);
          continue;
        }
        // Ensure file-derived entries prefer embedded title/id but fall back to filename
        entries.forEach((en, i) => {
          const dataTitle = (en.data?.title ?? "").toString().trim();
          const fallbackTitle =
            entries.length > 1 ? `${f.name} #${i + 1}` : f.name;
          const fileSeriesName = `${baseName} series`;
          const seriesName = en.isSeries ? fileSeriesName : null;
          let payload = { ...en };
          if (en.isSeries) {
            const seriesTitle =
              seriesName || dataTitle || en.title || fallbackTitle || "unknown";
            payload.title = seriesTitle;
            const forcedSlug = makeSeriesId(seriesTitle || "unknown");
            applySeriesSlug(payload, forcedSlug);
            ensureSeriesId(payload, {
              seriesName: seriesTitle,
              fallbackTitle: "unknown",
            });
            payload.apicurioArtifactName =
              payload.apicurioArtifactName || seriesTitle;
          } else {
            payload.title = dataTitle || fallbackTitle;
          }
          const idxResult = addModelEntry(
            {
              ...payload,
              apicurioArtifactName:
                payload.apicurioArtifactName ||
                seriesName ||
                payload.apicurioArtifactName,
            },
            { versionLabel: f.name }
          );
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
  document.addEventListener("paste", handleClipboardPaste);

  async function handleClipboardPaste(event) {
    if (!shouldHandleGlobalPaste()) return;
    const text =
      event.clipboardData?.getData("text/plain") ||
      (window.clipboardData && window.clipboardData.getData("Text")) ||
      "";
    if (!looksLikeModelJson(text)) return;
    let entries = [];
    try {
      const autoSave = await isLocalBackendReady();
      entries = normalizeToModelsFromText(text, "Clipboard", {
        promptForSeriesName: !autoSave,
      });
    } catch (err) {
      console.warn("[Blockscape] clipboard paste ignored (invalid JSON)", err);
      return;
    }
    if (!entries.length) return;
    event.preventDefault();
    let firstIndex = null;
    const addedIndices = [];
    entries.forEach((entry, idx) => {
      const idxResult = addModelEntry(entry, {
        versionLabel: entries.length > 1 ? `paste #${idx + 1}` : "paste",
      });
      if (firstIndex == null) firstIndex = idxResult;
      addedIndices.push(idxResult);
    });
    console.log(
      `[Blockscape] pasted ${entries.length} model(s) from clipboard`
    );
    if (firstIndex != null) setActive(firstIndex);
    if (await isLocalBackendReady()) {
      await autoSaveNewLocalFilesForModels(addedIndices, {
        origin: "clipboard",
      });
    }
  }

  async function autoSaveNewLocalFilesForModels(
    indices,
    { origin = "clipboard" } = {}
  ) {
    if (!(await isLocalBackendReady())) return;
    if (typeof localBackend?.saveModelByIndex !== "function") return;
    const allIndices = Array.isArray(indices) ? indices : [];
    const eligible = allIndices.filter((idx) => {
      const entry = models[idx];
      return entry && !entry.sourcePath;
    });
    if (!eligible.length) return;

    const modelsLabel = eligible.length === 1 ? "model" : "models";
    const firstEntry = models[eligible[0]];
    const defaultPath = suggestNewSavePathForEntry(
      firstEntry,
      origin === "append" ? "pasted" : "clipboard"
    );
    if (typeof window === "undefined" || typeof window.prompt !== "function")
      return;
    const response = window.prompt(
      `Save pasted ${modelsLabel} as a new .bs file (under ~/blockscape):`,
      defaultPath
    );
    if (response == null) return;
    const basePath = normalizeLocalSavePath(response);
    if (!basePath) {
      alert("Enter a relative filename (no ..) to save under ~/blockscape.");
      return;
    }

    const existing = await getExistingLocalBsPaths();
    const targets = [];
    for (let i = 0; i < eligible.length; i++) {
      const desired =
        eligible.length === 1
          ? basePath
          : withNumericSuffix(basePath, i + 1);
      const unique = pickUniqueLocalPath(desired, existing);
      if (!unique) {
        alert("Could not find a unique filename to save.");
        return;
      }
      existing.add(unique);
      targets.push(unique);
    }

    let firstSavedPath = null;
    for (let i = 0; i < eligible.length; i++) {
      const idx = eligible[i];
      const targetPath = targets[i];
      const entry = models[idx];
      if (!entry) continue;
      if (eligible.length === 1) {
        applySeriesTitleFromFilename(entry, targetPath);
      }
      const saved = await localBackend.saveModelByIndex(idx, targetPath, {
        refreshAfter: false,
        statusPrefix: "Auto-saved to",
      });
      if (!saved?.ok) {
        alert(`Local auto-save failed: ${saved?.error || "unknown error"}`);
        return;
      }
      if (firstSavedPath == null) firstSavedPath = targetPath;
    }

    if (firstSavedPath) {
      updateUrlForServerPath(firstSavedPath);
    }

    await localBackend.refresh();
    renderModelList();
    showNotice(`Saved ${eligible.length} ${modelsLabel}.`, 2500);
  }

  // Switch active model from sidebar
  modelList.addEventListener("click", (e) => {
    const button = e.target.closest("button[data-index]");
    if (!button) return;
    const i = parseInt(button.dataset.index, 10);
    if (!Number.isInteger(i)) return;
    setActive(i);
  });

  // Remove selected model
  document.getElementById("removeModel").onclick = () => {
    if (activeIndex < 0) return;
    const title = getModelTitle(models[activeIndex]);
    const ok = window.confirm(`Remove "${title}" from this session?`);
    if (!ok) return;
    console.log(
      "[Blockscape] removing model:",
      getModelTitle(models[activeIndex])
    );
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
    searchInput.addEventListener("input", (e) => {
      handleSearchInput(e.target.value || "");
    });
    searchInput.addEventListener("focus", () => {
      if (searchInput.value && searchInput.value.trim()) {
        renderSearchResults(searchInput.value);
      }
    });
  }

  if (searchResults) {
    searchResults.addEventListener("click", (event) => {
      const button = event.target.closest(".search-result");
      if (!button) return;
      const modelIndex = parseInt(button.dataset.modelIndex || "-1", 10);
      const itemId = button.dataset.itemId;
      activateSearchResult({ modelIndex, itemId });
    });
  }

  document.addEventListener("click", (event) => {
    if (!searchResults || searchResults.hidden) return;
    const target = event.target;
    if (searchResults.contains(target)) return;
    if (searchInput && (target === searchInput || searchInput.contains(target)))
      return;
    searchResults.hidden = true;
  });

  // Load from URL
  if (urlForm && urlInput && loadUrlButton) {
    urlForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const url = urlInput.value.trim();
      if (!url) {
        alert("Please enter a URL");
        urlInput.focus();
        return;
      }
      const idx = await loadFromUrl(url);
      if (typeof idx === "number") {
        setActive(idx);
        urlInput.value = "";
        const hint = document.getElementById("urlHint");
        if (hint) hint.textContent = "";
      }
    });
  }

  // Show last 12 characters after user pauses typing
  (function attachUrlHint() {
    const hint = document.getElementById("urlHint");
    if (!urlInput || !hint) return;
    let timer = null;
    urlInput.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const value = urlInput.value;
        const tail = value.slice(-12);
        hint.textContent = tail ? `…${tail}` : "";
      }, 300);
    });
  })();

  // Helpers
  function rebuildFromActive() {
    if (activeIndex < 0) return;
    try {
      syncCategoryViewVersions(models[activeIndex]);
      const parsed = parse(models[activeIndex].data);
      model = parsed;
      render();
    } catch (e) {
      console.error(
        "[Blockscape] rebuild error (active model likely malformed):",
        e
      );
      alert("Active model parse/render error (see console).");
    }
  }

  // Load JSON files from same directory (for static hosting)
  async function loadJsonFiles() {
    const jsonFiles = ["comms.bs", "planets.bs", "styleguide.bs", "blockscape-features.bs"];
    const joinPath = (name) => {
      if (!ASSET_BASE) return name;
      return ASSET_BASE.endsWith("/")
        ? `${ASSET_BASE}${name}`
        : `${ASSET_BASE}/${name}`;
    };

    for (const filename of jsonFiles) {
      try {
        const response = await fetch(joinPath(filename), { cache: "no-store" });
        if (!response.ok) {
          console.warn(
            `[Blockscape] ${filename} not fetched (${response.status}); skipping`
          );
          continue;
        }

        const text = await response.text();
        const baseName = filename.replace(/\.[^.]+$/, "") || "Model";
        const entries = normalizeToModelsFromText(text, baseName, {
          seriesTitleOverride: `${baseName} series`,
        });
        if (!entries.length) {
          console.warn("[Blockscape] no models found in", filename);
          continue;
        }

        entries.forEach((entry) => {
          let payload = { ...entry };
          if (entry.isSeries) {
            const seriesTitle = `${baseName} series`;
            payload = {
              ...entry,
              title: seriesTitle,
              apicurioArtifactName: seriesTitle,
            };
            const forcedSlug = makeSeriesId(seriesTitle || "unknown");
            applySeriesSlug(payload, forcedSlug);
            ensureSeriesId(payload, {
              seriesName: seriesTitle,
              fallbackTitle: "unknown",
            });
          }
          addModelEntry(payload, { versionLabel: filename });
        });
        console.log(
          `[Blockscape] loaded ${entries.length} model(s) from ${filename}`
        );
      } catch (error) {
        console.log(
          "[Blockscape] could not load",
          filename,
          "- this is normal for file:// protocol",
          error
        );
      }
    }

    renderModelList();
  }

  async function fetchTextWithCacheBypass(url) {
    const attempts = [{ cache: "no-store" }, { cache: "reload" }, {}];
    let lastError = null;
    for (const opts of attempts) {
      try {
        console.log(
          `[Blockscape] fetching ${url} with cache="${opts.cache ?? "default"}"`
        );
        const response = await fetch(url, opts);
        if (response.status === 304) {
          console.warn(
            "[Blockscape] fetch returned 304 (Not Modified), retrying without cache"
          );
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
    throw lastError || new Error("Unable to fetch URL");
  }

  function enhanceAbstractWithGistLinks(container) {
    if (!container) return;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach((node) => convertTextNodeLinks(node));

    container.querySelectorAll("a[href]").forEach((anchor) => {
      const href = anchor.getAttribute("href");
      if (isGistUrl(href)) {
        attachGistLinkBehavior(anchor, href);
      }
    });
  }

  function convertTextNodeLinks(node) {
    if (!node || !node.nodeValue || !node.nodeValue.includes("http")) return;
    if (node.parentNode?.closest?.("a")) {
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
        fragment.appendChild(
          document.createTextNode(text.slice(cursor, index))
        );
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
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.textContent = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    if (isGistUrl(url)) {
      attachGistLinkBehavior(anchor, url);
    }
    return anchor;
  }

  function attachGistLinkBehavior(anchor, url) {
    if (!anchor || anchor.dataset.gistLinkBound === "true") return;
    anchor.dataset.gistLinkBound = "true";
    anchor.classList.add("blockscape-gist-link");
    anchor.title = "Load this Gist into Blockscape";
    anchor.addEventListener("click", (event) =>
      handleGistLinkClick(event, url, anchor)
    );
  }

  async function handleGistLinkClick(event, url, anchor) {
    event.preventDefault();
    event.stopPropagation();
    if (!url || anchor.dataset.loading === "true") return;
    anchor.dataset.loading = "true";
    anchor.classList.add("is-loading");
    try {
      await loadFromUrl(url);
    } finally {
      anchor.dataset.loading = "false";
      anchor.classList.remove("is-loading");
    }
  }

  function isGistUrl(candidate) {
    if (typeof candidate !== "string") return false;
    try {
      const parsed = new URL(candidate, window.location.href);
      const host = parsed.hostname.toLowerCase();
      return (
        host === "gist.githubusercontent.com" ||
        (host.startsWith("gist.") && host.endsWith("githubusercontent.com"))
      );
    } catch {
      return false;
    }
  }

  // Load JSON from custom URL
  async function loadFromUrl(url) {
    try {
      console.log("[Blockscape] loading from URL:", url);
      const text = await fetchTextWithCacheBypass(url);
      const rawName = url.split("/").pop() || "";
      const baseName = rawName.replace(/\.[^.]+$/, "") || "URL Model";
      let entries;
      try {
        entries = normalizeToModelsFromText(text, baseName);
      } catch (parseError) {
        throw new Error(`Invalid JSON payload: ${parseError.message}`);
      }
      if (!entries.length) {
        throw new Error("No JSON objects found in response.");
      }
      let firstIndex = null;
      entries.forEach((entry, idx) => {
        const dataTitle = (entry.data?.title ?? "").toString().trim();
        const fallbackTitle =
          entries.length > 1 ? `${baseName} #${idx + 1}` : baseName;
        const seriesName = entry.isSeries ? `${baseName} series` : null;
        let payload = { ...entry };
        if (entry.isSeries) {
          const seriesTitle =
            seriesName || dataTitle || payload.title || fallbackTitle;
          payload = {
            ...entry,
            title: seriesTitle,
            apicurioArtifactName: seriesTitle || entry.apicurioArtifactName,
          };
          const forcedSlug = makeSeriesId(seriesTitle || "unknown");
          applySeriesSlug(payload, forcedSlug);
          ensureSeriesId(payload, {
            seriesName: seriesTitle || seriesName || "unknown",
            fallbackTitle: "unknown",
          });
          console.log("[Blockscape] loadFromUrl: series slug applied", {
            seriesSlug: forcedSlug,
            url,
            baseName,
            seriesTitle,
          });
        }
        const idxResult = addModelEntry(
          {
            ...payload,
            title: dataTitle || payload.title || fallbackTitle,
            apicurioArtifactName:
              payload.apicurioArtifactName ||
              seriesName ||
              entry.apicurioArtifactName,
          },
          { versionLabel: baseName }
        );
        if (firstIndex == null) firstIndex = idxResult;
      });
      console.log(
        `[Blockscape] loaded ${entries.length} model(s) from URL:`,
        baseName
      );
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
    const seedEl = document.getElementById("seed");
    if (!seedEl) {
      throw new Error("Seed template not found in document.");
    }
    const seedRaw = (seedEl.textContent || seedEl.innerHTML || "").trim();
    if (!seedRaw) {
      throw new Error("Seed template is empty.");
    }
    const seedEntries = normalizeToModelsFromText(seedRaw, "Blockscape");
    if (!seedEntries.length) {
      throw new Error("Seed template could not be parsed.");
    }

    let firstSeedIndex = null;
    seedEntries.forEach((entry) => {
      const idx = addModelEntry(entry, { versionLabel: "seed" });
      if (firstSeedIndex == null) firstSeedIndex = idx;
    });

    await applyInitialSettings();

    const hasLocalBackend = await initialBackendCheck;

    // Try to load JSON files from same directory only when no local backend
    if (!hasLocalBackend && features.autoLoadFromDir) {
      await loadJsonFiles();
    }

    // Load explicit model from URL hash/search (?load= or #load=)
    const serverPathResult = await consumeServerPathLoad();
    const serverPathIndex =
      typeof serverPathResult?.modelIndex === "number"
        ? serverPathResult.modelIndex
        : null;
    const loadIndex = await consumeLoadParam();
    const editorResult = consumeEditorPayload();
    const editorIndex = editorResult?.index;
    const shareIndex = consumeShareLink();
    const initialIndex =
      typeof serverPathIndex === "number"
        ? serverPathIndex
        : typeof loadIndex === "number"
        ? loadIndex
        : typeof shareIndex === "number"
        ? shareIndex
        : typeof editorIndex === "number"
        ? editorIndex
        : firstSeedIndex ?? 0;
    setActive(initialIndex);
    if (
      serverPathResult?.itemId &&
      typeof serverPathResult.modelIndex === "number" &&
      serverPathResult.modelIndex === initialIndex
    ) {
      requestAnimationFrame(() => {
        if (activeIndex !== serverPathResult.modelIndex) return;
        const tile = index.get(serverPathResult.itemId)?.el;
        if (!tile) return;
        select(serverPathResult.itemId);
        tile.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
        tile.focus({ preventScroll: true });
      });
    }
  })();
}
