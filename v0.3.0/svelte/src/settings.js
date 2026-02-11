import { tokens } from "./generated/tokens";

export const STORAGE_KEYS = {
  hoverScale: "blockscape:hoverScale",
  selectionDimOpacity: "blockscape:selectionDimOpacity",
  selectionDimEnabled: "blockscape:selectionDimEnabled",
  titleWrap: "blockscape:titleWrap",
  titleHoverWidth: "blockscape:titleHoverWidth",
  titleHoverTextPortion: "blockscape:titleHoverTextPortion",
  tileCompactness: "blockscape:tileCompactness",
  obsidianLinksEnabled: "blockscape:obsidianLinksEnabled",
  obsidianLinkMode: "blockscape:obsidianLinkMode",
  obsidianVault: "blockscape:obsidianVault",
  autoReloadEnabled: "blockscape:autoReloadEnabled",
  autoReloadIntervalMs: "blockscape:autoReloadIntervalMs",
  autoIdFromName: "blockscape:autoIdFromName",
  seriesNavDoubleClickMs: "blockscape:seriesNavDoubleClickMs",
  centerItems: "blockscape:centerItems",
  linkThickness: "blockscape:linkThickness",
};

export const DEFAULTS = {
  hoverScale: 1.5,
  hoverScaleMin: 1,
  hoverScaleMax: 2.5,
  selectionDimOpacity: 0.2,
  selectionDimOpacityMin: 0.05,
  selectionDimOpacityMax: 1,
  selectionDimEnabled: true,
  titleWrapMode: "wrap",
  titleHoverWidthMultiplier: 1.3,
  titleHoverWidthMin: 1,
  titleHoverWidthMax: 1.6,
  titleHoverTextPortion: 0.25,
  titleHoverTextPortionMin: 0,
  titleHoverTextPortionMax: 0.6,
  tileCompactness: 1,
  tileCompactnessMin: 0.75,
  tileCompactnessMax: 1.25,
  obsidianLinksEnabled: false,
  obsidianLinkMode: "title",
  obsidianVaultName: "",
  autoReloadEnabled: true,
  autoReloadIntervalMs: 1000,
  autoReloadIntervalMin: 500,
  autoReloadIntervalMax: 10000,
  autoIdFromName: true,
  seriesNavDoubleClickMs: 900,
  seriesNavDoubleClickMin: 300,
  seriesNavDoubleClickMax: 4000,
  centerItems: false,
  linkThickness: "m",
};

export const formatSettings = {
  seriesNavWait: (value) => `${(value / 1000).toFixed(1)}s`,
  hoverScale: (value) => `${Math.round((value - 1) * 100)}%`,
  selectionDimming: (opacity, enabled = true) => {
    const dimPercent = Math.round((1 - opacity) * 100);
    if (!enabled) return "Off";
    return dimPercent === 0 ? "Off" : `${dimPercent}% dim`;
  },
  compactness: (value) =>
    value === 1 ? "Default" : `${Math.round(value * 100)}%`,
  titleWidth: (value) => `${Math.round((value - 1) * 100)}% extra`,
  titleZoomPortion: (value) => `${Math.round(value * 100)}% of hover zoom`,
  autoReloadInterval: (value) => `${(value / 1000).toFixed(2)}s`,
};

export function asBool(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function clamp(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function readLocalStorage(key) {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    return null;
  }
}

export function writeLocalStorage(key, value) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, value);
  } catch (err) {
    console.warn("[Settings] persist failed", key, err);
  }
}

export function buildSettingsSnapshot(current, { localBackend } = {}) {
  const autoReloadConfig =
    localBackend &&
    typeof localBackend.getAutoReloadConfig === "function" &&
    localBackend.getAutoReloadConfig();
  const snapshot = {
    theme: current.theme,
    hoverScale: current.hoverScale,
    selectionDimOpacity: current.selectionDimOpacity,
    selectionDimEnabled: current.selectionDimEnabled,
    tileCompactness: current.tileCompactness,
    titleWrapMode: current.titleWrapMode,
    titleHoverWidthMultiplier: current.titleHoverWidthMultiplier,
    titleHoverTextPortion: current.titleHoverTextPortion,
    obsidianLinksEnabled: current.obsidianLinksEnabled,
    obsidianLinkMode: current.obsidianLinkMode,
    obsidianVault: current.obsidianVaultName,
    autoIdFromName: current.autoIdFromNameEnabled,
    seriesNavDoubleClickMs: current.seriesNavDoubleClickWaitMs,
    showSecondaryLinks: current.showSecondaryLinks,
    centerItems: current.centerItems,
    showReusedInMap: current.showReusedInMap,
    colorPresets: current.colorPresets,
    depColor: current.depColor,
    revdepColor: current.revdepColor,
    linkThickness: current.linkThickness,
  };
  if (autoReloadConfig) {
    snapshot.autoReloadEnabled = !!autoReloadConfig.enabled;
    snapshot.autoReloadIntervalMs = autoReloadConfig.intervalMs;
  }
  return snapshot;
}

export function applySettingsSnapshot(snapshot = {}, ctx) {
  if (!snapshot || typeof snapshot !== "object") return { applied: [] };
  const appliedKeys = [];
  const {
    applyTheme,
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
    applyLinkThickness,
    persistLinkThickness,
    applyDepColor,
    persistDepColor,
    applyRevdepColor,
    persistRevdepColor,
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
    applyCenterItems,
    persistCenterItems,
    localBackend,
    ui,
    refreshObsidianLinks,
    scheduleOverlaySync,
    selection,
    select,
    clearStyles,
    drawLinks,
    applyReusedHighlights,
    current,
  } = ctx;

  if (snapshot.theme) {
    const appliedTheme = applyTheme?.(snapshot.theme);
    const isDark = (appliedTheme || snapshot.theme) === "dark";
    if (ctx.ui?.themeToggle) {
      ctx.ui.themeToggle.checked = isDark;
    }
    if (ctx.ui?.tabThemeToggle) {
      ctx.ui.tabThemeToggle.checked = isDark;
    }
    appliedKeys.push("theme");
  }

  if (snapshot.hoverScale != null) {
    const applied = applyTileHoverScale(parseFloat(snapshot.hoverScale));
    persistTileHoverScale(applied);
    ui?.hoverScaleInput && (ui.hoverScaleInput.value = String(applied));
    ui?.hoverScaleValue &&
      (ui.hoverScaleValue.textContent = formatSettings.hoverScale(applied));
    if (selection) scheduleOverlaySync();
    appliedKeys.push("hoverScale");
  }

  if (snapshot.selectionDimEnabled != null) {
    const applied = applySelectionDimEnabled(asBool(snapshot.selectionDimEnabled));
    persistSelectionDimEnabled(applied);
    if (ui?.selectionDimToggle) ui.selectionDimToggle.checked = applied;
    if (ui?.selectionDimInput) ui.selectionDimInput.disabled = !applied;
    if (ui?.selectionDimValue) {
      ui.selectionDimValue.textContent = formatSettings.selectionDimming(
        current.selectionDimOpacity ?? DEFAULTS.selectionDimOpacity,
        applied
      );
    }
    appliedKeys.push("selectionDimEnabled");
  }

  if (snapshot.selectionDimOpacity != null) {
    const applied = applySelectionDimOpacity(
      parseFloat(snapshot.selectionDimOpacity)
    );
    persistSelectionDimOpacity(applied);
    ui?.selectionDimInput && (ui.selectionDimInput.value = String(applied));
    ui?.selectionDimValue &&
      (ui.selectionDimValue.textContent = formatSettings.selectionDimming(
        applied,
        current.selectionDimEnabled ?? DEFAULTS.selectionDimEnabled
      ));
    appliedKeys.push("selectionDimOpacity");
  }

  if (snapshot.tileCompactness != null) {
    const applied = applyTileCompactness(parseFloat(snapshot.tileCompactness));
    persistTileCompactness(applied);
    ui?.tileCompactnessInput &&
      (ui.tileCompactnessInput.value = String(applied));
    ui?.tileCompactnessValue &&
      (ui.tileCompactnessValue.textContent = formatSettings.compactness(applied));
    if (selection) scheduleOverlaySync();
    appliedKeys.push("tileCompactness");
  }

  if (snapshot.titleWrapMode) {
    const applied = applyTitleWrapMode(snapshot.titleWrapMode);
    persistTitleWrapMode(applied);
    if (ui?.titleWrapInput) ui.titleWrapInput.checked = applied !== "nowrap";
    appliedKeys.push("titleWrapMode");
  }

  if (snapshot.titleHoverWidthMultiplier != null) {
    const applied = applyTitleHoverWidthMultiplier(
      parseFloat(snapshot.titleHoverWidthMultiplier)
    );
    persistTitleHoverWidthMultiplier(applied);
    ui?.titleWidthInput && (ui.titleWidthInput.value = String(applied));
    ui?.titleWidthValue &&
      (ui.titleWidthValue.textContent = formatSettings.titleWidth(applied));
    appliedKeys.push("titleHoverWidthMultiplier");
  }

  if (snapshot.titleHoverTextPortion != null) {
    const applied = applyTitleHoverTextPortion(
      parseFloat(snapshot.titleHoverTextPortion)
    );
    persistTitleHoverTextPortion(applied);
    ui?.titleZoomInput && (ui.titleZoomInput.value = String(applied));
    ui?.titleZoomValue &&
      (ui.titleZoomValue.textContent = formatSettings.titleZoomPortion(applied));
    appliedKeys.push("titleHoverTextPortion");
  }

  if (snapshot.obsidianLinksEnabled != null) {
    const applied = applyObsidianLinksEnabled(
      asBool(snapshot.obsidianLinksEnabled)
    );
    persistObsidianLinksEnabled(applied);
    if (ui?.obsidianToggle) ui.obsidianToggle.checked = applied;
    ui?.obsidianModeInputs?.forEach((input) => {
      input.disabled = !applied;
    });
    if (ui?.obsidianVaultInput) ui.obsidianVaultInput.disabled = !applied;
    refreshObsidianLinks?.();
    appliedKeys.push("obsidianLinksEnabled");
  }

  if (snapshot.obsidianLinkMode) {
    const applied = applyObsidianLinkMode(snapshot.obsidianLinkMode);
    persistObsidianLinkMode(applied);
    ui?.obsidianModeInputs?.forEach((input) => {
      input.checked = input.value === applied;
    });
    refreshObsidianLinks?.();
    appliedKeys.push("obsidianLinkMode");
  }

  if (snapshot.obsidianVault != null) {
    const applied = applyObsidianVaultName(snapshot.obsidianVault);
    persistObsidianVaultName(applied);
    if (ui?.obsidianVaultInput) ui.obsidianVaultInput.value = applied;
    refreshObsidianLinks?.();
    appliedKeys.push("obsidianVault");
  }

  if (snapshot.colorPresets) {
    if (typeof ctx.setColorPresets === "function") {
      ctx.setColorPresets(snapshot.colorPresets);
    }
    appliedKeys.push("colorPresets");
  }

  if (snapshot.linkThickness) {
    const applied = applyLinkThickness?.(snapshot.linkThickness);
    if (applied) {
      persistLinkThickness?.(applied);
      if (ui?.linkThicknessInput) ui.linkThicknessInput.value = applied;
      appliedKeys.push("linkThickness");
    }
  }

  if (snapshot.depColor) {
    const applied = applyDepColor?.(snapshot.depColor);
    if (applied) {
      persistDepColor?.(applied);
      if (ui?.depColorInput) ui.depColorInput.value = applied;
      appliedKeys.push("depColor");
    }
  }

  if (snapshot.revdepColor) {
    const applied = applyRevdepColor?.(snapshot.revdepColor);
    if (applied) {
      persistRevdepColor?.(applied);
      if (ui?.revdepColorInput) ui.revdepColorInput.value = applied;
      appliedKeys.push("revdepColor");
    }
  }

  if (snapshot.autoIdFromName != null) {
    const applied = applyAutoIdFromNameEnabled(asBool(snapshot.autoIdFromName));
    persistAutoIdFromNameEnabled(applied);
    if (ui?.autoIdToggle) ui.autoIdToggle.checked = applied;
    appliedKeys.push("autoIdFromName");
  }

  if (snapshot.seriesNavDoubleClickMs != null) {
    const applied = applySeriesNavDoubleClickWait(
      parseInt(snapshot.seriesNavDoubleClickMs, 10)
    );
    persistSeriesNavDoubleClickWait(applied);
    ui?.seriesNavInput && (ui.seriesNavInput.value = String(applied));
    ui?.seriesNavValue &&
      (ui.seriesNavValue.textContent = formatSettings.seriesNavWait(applied));
    appliedKeys.push("seriesNavDoubleClickMs");
  }

  if (
    snapshot.autoReloadEnabled != null &&
    localBackend &&
    typeof localBackend.setAutoReloadEnabled === "function"
  ) {
    const enabled = asBool(snapshot.autoReloadEnabled);
    localBackend.setAutoReloadEnabled(enabled);
    if (ui?.autoReloadToggle) ui.autoReloadToggle.checked = enabled;
    if (ui?.autoReloadInput) ui.autoReloadInput.disabled = !enabled;
    appliedKeys.push("autoReloadEnabled");
  }

  if (
    snapshot.autoReloadIntervalMs != null &&
    localBackend &&
    typeof localBackend.setAutoReloadInterval === "function"
  ) {
    const applied = localBackend.setAutoReloadInterval(
      parseInt(snapshot.autoReloadIntervalMs, 10)
    );
    ui?.autoReloadInput && (ui.autoReloadInput.value = String(applied));
    ui?.autoReloadValue &&
      (ui.autoReloadValue.textContent = formatSettings.autoReloadInterval(applied));
    appliedKeys.push("autoReloadIntervalMs");
  }

  if (snapshot.centerItems != null) {
    const applied = applyCenterItems?.(asBool(snapshot.centerItems));
    persistCenterItems?.(applied);
    if (ui?.tabCenterToggle) ui.tabCenterToggle.checked = applied;
    appliedKeys.push("centerItems");
  }

  if (snapshot.showSecondaryLinks != null) {
    const next = asBool(snapshot.showSecondaryLinks);
    if (typeof ctx.setShowSecondaryLinks === "function") {
      ctx.setShowSecondaryLinks(next);
    } else {
      ctx.showSecondaryLinks = next;
    }
    if (ui?.secondaryLinksToggle) ui.secondaryLinksToggle.checked = next;
    if (ui?.tabSecondaryLinksToggle) ui.tabSecondaryLinksToggle.checked = next;
    if (selection) {
      select(selection);
    } else {
      clearStyles();
      drawLinks();
    }
    appliedKeys.push("showSecondaryLinks");
  }

  if (snapshot.showReusedInMap != null) {
    const next = asBool(snapshot.showReusedInMap);
    if (typeof ctx.setShowReusedInMap === "function") {
      ctx.setShowReusedInMap(next);
    } else {
      ctx.showReusedInMap = next;
    }
    if (ui?.reusedToggle) ui.reusedToggle.checked = next;
    applyReusedHighlights?.();
    appliedKeys.push("showReusedInMap");
  }

  return { applied: appliedKeys };
}

export function downloadJson(filename, data) {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export { tokens };
