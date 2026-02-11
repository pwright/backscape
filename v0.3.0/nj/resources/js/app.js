(() => {
  const NL = window.Neutralino;
  if (!NL || typeof NL.init !== "function") return;

  const STORAGE_KEYS = {
    autosave: "blockscape-nj:autosave",
    lastPath: "blockscape-nj:lastPath",
  };
  const ZOOM_STEP = 0.1;
  const ZOOM_MIN = 0.2;
  const ZOOM_MAX = 2.5;
  const DEFAULT_AUTOSAVE = true;
  const AUTOSAVE_INTERVAL_MS = 2000;
  const SETTINGS_DIR = ".blockscape";
  const SETTINGS_FILENAME = "settings.json";
  const SETTINGS_PERSIST_INTERVAL_MS = 2000;
  const RECENT_FILES_LIMIT = 10;

  let currentPath =
    window.localStorage.getItem(STORAGE_KEYS.lastPath) || "";
  let autosaveEnabled = (() => {
    const raw = window.localStorage.getItem(STORAGE_KEYS.autosave);
    if (raw == null) return DEFAULT_AUTOSAVE;
    return raw === "true";
  })();
  let lastSavedText = "";
  let autosaveInFlight = false;
  let autosavePendingDialog = false;
  let autosaveTimer = null;
  let settingsPersistTimer = null;
  let homePathPromise = null;
  let settingsPathPromise = null;
  let lastSettingsPayload = "";
  let settingsLoaded = false;
  let recentFiles = [];
  let zoom = 1.0;

  const getJsonBox = () => document.getElementById("jsonBox");
  const getJsonText = () => (getJsonBox()?.value || "").trim();
  const setJsonText = (text) => {
    const box = getJsonBox();
    if (box) box.value = text;
  };
  const EDITOR_TRANSFER_KEY = "blockscape:editorPayload";
  const EDITOR_TRANSFER_MESSAGE_TYPE = "blockscape:editorTransfer";
  const normalizeText = (text) =>
    (typeof text === "string" ? text : String(text || ""))
      .replace(/^\uFEFF/, "")
      .replace(/\u0000/g, "");
  const importViaEditorTransfer = (text, { title = "", source = "" } = {}) => {
    try {
      const payload = {
        ts: Date.now(),
        text,
        source: "editor",
      };
      if (title) payload.title = title;
      window.localStorage.setItem(EDITOR_TRANSFER_KEY, JSON.stringify(payload));
      window.postMessage({ type: EDITOR_TRANSFER_MESSAGE_TYPE }, "*");
      console.log("[Neutralino] dispatched editor transfer", { source, title });
      return true;
    } catch (err) {
      console.warn("[Neutralino] editor transfer failed", { source, err });
      return false;
    }
  };
  const tryParseJsonText = (text) => {
    const cleaned = normalizeText(text).trim();
    if (!cleaned) return null;
    try {
      JSON.parse(cleaned);
      return cleaned;
    } catch {
      return null;
    }
  };
  const decodeBinary = (buffer) => {
    const bytes =
      buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer || []);
    if (bytes.length >= 2) {
      if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        return new TextDecoder("utf-16le").decode(bytes.subarray(2));
      }
      if (bytes[0] === 0xfe && bytes[1] === 0xff) {
        return new TextDecoder("utf-16be").decode(bytes.subarray(2));
      }
    }
    if (
      bytes.length >= 3 &&
      bytes[0] === 0xef &&
      bytes[1] === 0xbb &&
      bytes[2] === 0xbf
    ) {
      return new TextDecoder("utf-8").decode(bytes.subarray(3));
    }
    return new TextDecoder("utf-8").decode(bytes);
  };
  const readFileText = async (path) => {
    let text = "";
    try {
      text = await NL.filesystem.readFile(path, { encoding: "utf8" });
    } catch {
      text = await NL.filesystem.readFile(path);
    }
    if (text && typeof text !== "string") {
      if (text.data && typeof text.data === "string") {
        text = text.data;
      } else if (text instanceof ArrayBuffer) {
        text = new TextDecoder("utf-8").decode(text);
      } else if (ArrayBuffer.isView(text)) {
        text = new TextDecoder("utf-8").decode(text);
      } else {
        text = String(text);
      }
    }
    text = normalizeText(text);
    const parsed = tryParseJsonText(text);
    if (parsed) return { text: parsed, parsed: true };

    try {
      const binary = await NL.filesystem.readBinaryFile(path);
      const buffer = binary?.data ?? binary;
      const decoded = normalizeText(decodeBinary(buffer));
      return { text: decoded, parsed: !!tryParseJsonText(decoded) };
    } catch {
      return { text, parsed: false };
    }
  };
  const click = (id) => document.getElementById(id)?.click();
  const byId = (id) => document.getElementById(id);
  const filePathEl = byId("filePath");
  const newMapBtn = byId("newMapBtn");
  const recentFilesListEl = byId("recentFilesList");
  const recentFilesEmptyEl = byId("recentFilesEmpty");
  const zoomResetBtn = byId("zoomResetBtn");

  const clampZoom = (value) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
  const updateZoomLabel = () => {
    if (zoomResetBtn) {
      zoomResetBtn.textContent = `${Math.round(zoom * 100)}%`;
    }
  };
  const applyZoom = () => {
    document.body.style.zoom = String(zoom);
    updateZoomLabel();
  };
  const setZoom = (value) => {
    zoom = clampZoom(value);
    applyZoom();
  };
  const zoomIn = () => setZoom(zoom + ZOOM_STEP);
  const zoomOut = () => setZoom(zoom - ZOOM_STEP);
  const resetZoom = () => setZoom(1.0);

  const getHomePath = async () => {
    if (homePathPromise) return homePathPromise;
    homePathPromise = NL.os
      .getPath("home")
      .catch((err) => {
        console.warn("[Neutralino] failed to resolve home path", err);
        return "";
      })
      .then(async (value) => {
        if (value) {
          console.log("[Neutralino] resolved home path via getPath", value);
          return value;
        }
        try {
          const homeEnv = await NL.os.getEnv("HOME");
          if (homeEnv) {
            console.log("[Neutralino] resolved home path via HOME", homeEnv);
            return homeEnv;
          }
        } catch (err) {
          console.warn("[Neutralino] failed to resolve HOME env", err);
        }
        try {
          const userProfile = await NL.os.getEnv("USERPROFILE");
          if (userProfile) {
            console.log(
              "[Neutralino] resolved home path via USERPROFILE",
              userProfile
            );
            return userProfile;
          }
        } catch (err) {
          console.warn("[Neutralino] failed to resolve USERPROFILE env", err);
        }
        console.warn("[Neutralino] unable to resolve home path");
        return "";
      });
    return homePathPromise;
  };

  const joinPath = (base, next) => {
    if (!base) return next || "";
    if (!next) return base;
    return `${base.replace(/\/+$/, "")}/${next.replace(/^\/+/, "")}`;
  };

  const resolveSettingsDir = async () => {
    const home = await getHomePath();
    if (!home) return "";
    return joinPath(home, SETTINGS_DIR);
  };

  const resolveSettingsPath = async () => {
    if (settingsPathPromise) return settingsPathPromise;
    settingsPathPromise = resolveSettingsDir().then((dir) =>
      dir ? joinPath(dir, SETTINGS_FILENAME) : ""
    );
    return settingsPathPromise;
  };

  const ensureSettingsDir = async () => {
    const dir = await resolveSettingsDir();
    if (!dir) return "";
    try {
      await NL.filesystem.createDirectory(dir);
    } catch (err) {
      // Ignore errors (directory may already exist or be unavailable).
    }
    return dir;
  };

  const resolveNeutralinoSavePath = async (relPath) => {
    if (!relPath) return relPath;
    const home = await getHomePath();
    if (!home) return relPath;
    return joinPath(joinPath(home, "blockscape"), relPath);
  };

  const waitForSettingsBridge = async (timeoutMs = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const bridge = window.__blockscapeSettingsBridge;
      if (bridge?.applyPayload && bridge?.exportPayload) return bridge;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return null;
  };

  const readSettingsFile = async () => {
    const path = await resolveSettingsPath();
    if (!path) return null;
    try {
      const raw = await NL.filesystem.readFile(path, { encoding: "utf8" });
      const text =
        typeof raw === "string" ? raw : raw?.data ?? String(raw || "");
      const trimmed = text.trim();
      if (!trimmed) return null;
      return JSON.parse(trimmed);
    } catch (err) {
      return null;
    }
  };

  const settingsFileExists = async () => {
    const path = await resolveSettingsPath();
    if (!path) return false;
    try {
      await NL.filesystem.getStats(path);
      return true;
    } catch (err) {
      return false;
    }
  };

  const writeSettingsFile = async (payload) => {
    if (!payload) return;
    const dir = await ensureSettingsDir();
    const path = await resolveSettingsPath();
    if (!dir || !path) {
      throw new Error("Settings path unavailable");
    }
    const text = JSON.stringify(payload, null, 2);
    await NL.filesystem.writeFile(path, text);
  };

  window.__blockscapeSettingsSaveToFile = async (payload) => {
    try {
      const mergedPayload = {
        ...payload,
        recentFiles: [...recentFiles],
      };
      await writeSettingsFile(mergedPayload);
      return true;
    } catch (err) {
      console.warn("[Neutralino] settings save failed", err);
      return false;
    }
  };

  const normalizeRecentFiles = (entries) => {
    if (!Array.isArray(entries)) return [];
    return entries
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);
  };

  const renderRecentFiles = () => {
    if (!recentFilesListEl) return;
    recentFilesListEl.innerHTML = "";
    if (!recentFiles || recentFiles.length === 0) {
      if (recentFilesEmptyEl) recentFilesEmptyEl.hidden = false;
      return;
    }
    if (recentFilesEmptyEl) recentFilesEmptyEl.hidden = true;
    recentFiles.forEach((entry) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "recent-item";
      const name = entry.split("/").pop() || entry;
      btn.textContent = name;
      const pathSpan = document.createElement("span");
      pathSpan.className = "recent-item__path";
      pathSpan.textContent = entry;
      btn.appendChild(pathSpan);
      btn.addEventListener("click", () =>
        openFileAtPath(entry, { recordRecent: true })
      );
      li.appendChild(btn);
      recentFilesListEl.appendChild(li);
    });
  };

  const addRecentFile = (path) => {
    if (!path) return;
    const trimmed = String(path).trim();
    if (!trimmed) return;
    recentFiles = [trimmed, ...recentFiles.filter((entry) => entry !== trimmed)]
      .slice(0, RECENT_FILES_LIMIT);
    renderRecentFiles();
  };

  const buildSettingsPayload = (bridge) => {
    const basePayload =
      bridge && typeof bridge.exportPayload === "function"
        ? bridge.exportPayload()
        : { version: 1, exportedAt: new Date().toISOString(), settings: {} };
    return {
      ...basePayload,
      recentFiles: [...recentFiles],
    };
  };

  const persistState = () => {
    window.localStorage.setItem(
      STORAGE_KEYS.autosave,
      String(autosaveEnabled)
    );
    if (currentPath) {
      window.localStorage.setItem(STORAGE_KEYS.lastPath, currentPath);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.lastPath);
    }
  };

  const updateFilePathDisplay = () => {
    if (!filePathEl) return;
    filePathEl.textContent = currentPath
      ? `File: ${currentPath}`
      : "No file loaded";
  };

  const triggerNewPanel = () => {
    const button = document.getElementById("newPanelButton");
    if (!button) return;
    button.click();
  };

  window.addEventListener("blockscape:local-save-path", async (event) => {
    const relPath = event?.detail?.path;
    if (!relPath) return;
    currentPath = await resolveNeutralinoSavePath(relPath);
    lastSavedText = getJsonText();
    autosavePendingDialog = false;
    persistState();
    updateFilePathDisplay();
  });

  window.addEventListener("blockscape:local-save-clear", () => {
    currentPath = "";
    lastSavedText = getJsonText();
    autosavePendingDialog = false;
    persistState();
    updateFilePathDisplay();
  });

  const hasUnsavedChanges = () => {
    const text = getJsonText();
    if (!text) return false;
    return text !== lastSavedText;
  };

  const confirmSaveBeforeNew = async () => {
    if (autosaveEnabled || !hasUnsavedChanges()) return true;
    const shouldSave = window.confirm(
      "Autosave is disabled. Save the current file before creating a new map?"
    );
    if (!shouldSave) return false;
    const text = getJsonText();
    await saveFile();
    return text === lastSavedText;
  };


  const buildMenu = async () => {
    const menu = [
      {
        id: "file",
        text: "File",
        menuItems: [
          { id: "file-open", text: "Open…", shortcut: "Ctrl+O" },
          { id: "file-save", text: "Save", shortcut: "Ctrl+S" },
          { id: "file-save-as", text: "Save As…" },
          { text: "-" },
          {
            id: "file-autosave",
            text: "Autosave",
            isChecked: autosaveEnabled,
          },
        ],
      },
    ];
    await NL.window.setMainMenu(menu);
  };

  const applyTextToViewer = (text, { source = "" } = {}) => {
    const trimmed = normalizeText(text).trim();
    if (!trimmed) {
      console.warn("[Neutralino] empty text after normalize", { source });
      return;
    }
    setJsonText(trimmed);
    const jsonBox = getJsonBox();
    console.log("[Neutralino] jsonBox status", {
      source,
      exists: !!jsonBox,
      length: jsonBox?.value?.length || 0,
    });
    let parsed = null;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      parsed = null;
    }
    if (!parsed) {
      console.warn("[Neutralino] JSON parse failed for text", {
        source,
        length: trimmed.length,
      });
    }
    const canReplaceActive =
      parsed && !Array.isArray(parsed) && typeof parsed === "object";
    const modelItemsBefore = document.querySelectorAll(".model-nav-item").length;
    const titleHint = source.replace(/^open:/, "").split("/").pop() || "";
    if (!jsonBox) {
      importViaEditorTransfer(trimmed, { title: titleHint, source });
    } else if (canReplaceActive && document.querySelector(".model-nav-item")) {
      click("replaceActive");
    } else {
      const appendBtn = document.getElementById("appendFromBox");
      console.log("[Neutralino] append button status", {
        source,
        exists: !!appendBtn,
        hasOnClick: typeof appendBtn?.onclick === "function",
      });
      if (!appendBtn) {
        console.warn("[Neutralino] append button not found", { source });
        importViaEditorTransfer(trimmed, { title: titleHint, source });
      } else {
        appendBtn.click();
      }
    }
    setTimeout(() => {
      const modelItemsAfter =
        document.querySelectorAll(".model-nav-item").length;
      console.log("[Neutralino] applyTextToViewer result", {
        source,
        modelItemsBefore,
        modelItemsAfter,
      });
    }, 0);
  };

  const clearAllModels = () => {
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    try {
      let guard = 0;
      while (document.querySelector(".model-nav-button") && guard < 200) {
        const button = document.querySelector(".model-nav-button");
        button?.click();
        click("removeModel");
        guard += 1;
      }
    } finally {
      window.confirm = originalConfirm;
    }
  };

  const openFileAtPath = async (path, { recordRecent = false } = {}) => {
    if (!path) return;
    try {
      console.log("[Neutralino] open file selected", path);
      const { text, parsed } = await readFileText(path);
      console.log("[Neutralino] open file decoded", {
        path,
        length: text?.length || 0,
        parsed,
      });
      if (!parsed) {
        console.warn(
          "[Neutralino] file did not parse as JSON; attempting to import anyway",
          path
        );
      }
      if (!text || !text.trim()) {
        alert("Opened file is empty or could not be decoded.");
        return;
      }
      clearAllModels();
      applyTextToViewer(text, { source: `open:${path}` });
      currentPath = path;
      lastSavedText = text;
      autosavePendingDialog = false;
      persistState();
      updateFilePathDisplay();
      if (recordRecent) addRecentFile(path);
    } catch (err) {
      console.warn("[Neutralino] failed to open file", err);
      alert("Unable to open that file.");
    }
  };

  const openFile = async () => {
    const entries = await NL.os.showOpenDialog("Open Blockscape file", {
      filters: [
        { name: "Blockscape", extensions: ["bs", "json"] },
        { name: "All files", extensions: ["*"] },
      ],
    });
    if (!entries || !entries.length) return;
    const path = entries[0];
    await openFileAtPath(path, { recordRecent: true });
  };

  const saveToPath = async (path) => {
    const text = getJsonText();
    if (!text) return;
    await NL.filesystem.writeFile(path, text);
    currentPath = path;
    lastSavedText = text;
    autosavePendingDialog = false;
    persistState();
    updateFilePathDisplay();
    addRecentFile(path);
  };

  const saveFileAs = async () => {
    const defaultName = currentPath || "blockscape.bs";
    const path = await NL.os.showSaveDialog("Save Blockscape file", {
      defaultPath: defaultName,
      filters: [
        { name: "Blockscape", extensions: ["bs", "json"] },
        { name: "All files", extensions: ["*"] },
      ],
    });
    if (!path) return;
    await saveToPath(path);
  };

  const saveFile = async () => {
    if (!currentPath) {
      await saveFileAs();
      return;
    }
    await saveToPath(currentPath);
  };

  const startAutosave = () => {
    if (autosaveTimer) clearInterval(autosaveTimer);
    lastSavedText = getJsonText();
    autosaveTimer = setInterval(async () => {
      if (!autosaveEnabled || autosaveInFlight) return;
      const text = getJsonText();
      if (!text || text === lastSavedText) return;
      if (!currentPath) {
        if (!autosavePendingDialog) {
          autosavePendingDialog = true;
          await saveFileAs();
        }
        return;
      }
      autosaveInFlight = true;
      try {
        await NL.filesystem.writeFile(currentPath, text);
        lastSavedText = text;
      } catch (err) {
        console.warn("[Neutralino] autosave failed", err);
      } finally {
        autosaveInFlight = false;
      }
    }, AUTOSAVE_INTERVAL_MS);
  };

  const loadSettingsFromFile = async () => {
    const bridge = await waitForSettingsBridge();
    if (!bridge) return false;
    const payload = await readSettingsFile();
    if (!payload) return false;
    try {
      const nextRecent = normalizeRecentFiles(payload?.recentFiles);
      recentFiles = nextRecent.slice(0, RECENT_FILES_LIMIT);
      renderRecentFiles();
      bridge.applyPayload(payload);
      if (bridge.exportPayload) {
        lastSettingsPayload = JSON.stringify(bridge.exportPayload());
      }
      settingsLoaded = true;
      console.log("[Neutralino] settings loaded from ~/.blockscape/settings.json");
      return true;
    } catch (err) {
      console.warn("[Neutralino] settings apply failed", err);
      return false;
    }
  };

  const startSettingsPersist = () => {
    if (settingsPersistTimer) clearInterval(settingsPersistTimer);
    settingsPersistTimer = setInterval(async () => {
      const bridge = window.__blockscapeSettingsBridge;
      if (!bridge?.exportPayload) return;
      try {
        const payload = buildSettingsPayload(bridge);
        const nextPayload = JSON.stringify(payload);
        if (nextPayload === lastSettingsPayload) return;
        lastSettingsPayload = nextPayload;
        await writeSettingsFile(payload);
      } catch (err) {
        console.warn("[Neutralino] settings persist failed", err);
      }
    }, SETTINGS_PERSIST_INTERVAL_MS);
  };

  const persistSettingsOnce = async () => {
    if (await settingsFileExists()) return;
    const bridge = await waitForSettingsBridge();
    if (!bridge?.exportPayload) return;
    try {
      const payload = buildSettingsPayload(bridge);
      lastSettingsPayload = JSON.stringify(payload);
      await writeSettingsFile(payload);
      console.log("[Neutralino] created ~/.blockscape/settings.json");
    } catch (err) {
      console.warn("[Neutralino] initial settings persist failed", err);
    }
  };

  NL.init();
  NL.events.on("mainMenuItemClicked", async (evt) => {
    const id = evt?.detail?.id;
    if (!id) return;
    try {
      if (id === "file-open") await openFile();
      if (id === "file-save") await saveFile();
      if (id === "file-save-as") await saveFileAs();
      if (id === "file-autosave") {
        autosaveEnabled = !autosaveEnabled;
        persistState();
        await buildMenu();
      }
    } catch (err) {
      console.warn("[Neutralino] menu action failed", err);
    }
  });

  NL.events.on("ready", async () => {
    await buildMenu();
    startAutosave();
    updateFilePathDisplay();
    renderRecentFiles();
    settingsLoaded = await loadSettingsFromFile();
    await persistSettingsOnce();
    startSettingsPersist();

    const autosaveToggle = byId("fileAutosaveToggle");
    if (autosaveToggle) {
      autosaveToggle.checked = autosaveEnabled;
      autosaveToggle.addEventListener("change", async () => {
        autosaveEnabled = autosaveToggle.checked;
        persistState();
        await buildMenu();
      });
    }

    byId("fileOpenBtn")?.addEventListener("click", () => openFile());
    byId("fileSaveBtn")?.addEventListener("click", () => saveFile());
    byId("fileSaveAsBtn")?.addEventListener("click", () => saveFileAs());
    byId("zoomInBtn")?.addEventListener("click", () => zoomIn());
    byId("zoomOutBtn")?.addEventListener("click", () => zoomOut());
    zoomResetBtn?.addEventListener("click", () => resetZoom());
    newMapBtn?.addEventListener("click", async () => {
      if (!(await confirmSaveBeforeNew())) return;
      triggerNewPanel();
    });

    applyZoom();
  });
})();
