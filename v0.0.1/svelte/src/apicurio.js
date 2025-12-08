const APICURIO_STORAGE_KEY = 'blockscape:apicurioConfig';
const DEFAULT_APICURIO_BASE = 'http://localhost:8080/apis/registry/v3';
const DEFAULT_APICURIO_GROUP = 'bs';
const SERIES_GROUP_SUFFIX = '-series';
const DEFAULT_APICURIO_ENABLED = false;
const DEFAULT_APICURIO_SEMVER_ENABLED = false;

export function createApicurioIntegration({
  models,
  getActiveIndex,
  setActive,
  ensureModelMetadata,
  ensureSeriesId,
  getModelId,
  getSeriesId,
  getModelTitle,
  computeJsonFingerprint,
  uid
}) {
  let pushApicurioButton = null;
  let apicurioListButton = null;
  let apicurioUrlInput = null;
  let apicurioGroupInput = null;
  let apicurioTokenInput = null;
  let apicurioToggleInput = null;
  let apicurioSemverInput = null;
  let apicurioStatusNode = null;
  let pushApicurioSeriesButton = null;
  let apicurioArtifactsContainer = null;
  const apicurioEnabledListeners = new Set();
  const apicurioConfig = {
    baseUrl: DEFAULT_APICURIO_BASE,
    groupId: DEFAULT_APICURIO_GROUP,
    authToken: '',
    enabled: DEFAULT_APICURIO_ENABLED,
    useSemver: DEFAULT_APICURIO_SEMVER_ENABLED
  };
  const apicurioArtifactsById = new Map();
  const apicurioArtifactVersions = new Map();

  function sanitizeApicurioBaseUrl(value) {
    const trimmed = (value || '').toString().trim();
    return trimmed.replace(/\/+$/, '');
  }

  function deriveSeriesGroupId(groupId) {
    const base = (groupId || '').toString().trim() || DEFAULT_APICURIO_GROUP;
    return `${base}${SERIES_GROUP_SUFFIX}`;
  }

  function hasApicurioDetails() {
    return Boolean(apicurioConfig.baseUrl && apicurioConfig.groupId);
  }

  function isApicurioEnabled() {
    return apicurioConfig.enabled !== false;
  }

  function notifyApicurioEnabledChange() {
    apicurioEnabledListeners.forEach((listener) => {
      try {
        listener(isApicurioEnabled());
      } catch (err) {
        console.warn('[Blockscape] failed to run Apicurio enabled listener', err);
      }
    });
  }

  function onApicurioEnabledChange(listener) {
    if (typeof listener === 'function') {
      apicurioEnabledListeners.add(listener);
    }
    return () => apicurioEnabledListeners.delete(listener);
  }

  function syncApicurioInputsFromConfig() {
    if (apicurioUrlInput) apicurioUrlInput.value = apicurioConfig.baseUrl || '';
    if (apicurioGroupInput) apicurioGroupInput.value = apicurioConfig.groupId || '';
    if (apicurioTokenInput) apicurioTokenInput.value = apicurioConfig.authToken || '';
    if (apicurioToggleInput) apicurioToggleInput.checked = isApicurioEnabled();
    if (apicurioSemverInput) apicurioSemverInput.checked = Boolean(apicurioConfig.useSemver);
  }

  function setApicurioStatus(message = '', tone = 'muted') {
    if (!apicurioStatusNode) return;
    apicurioStatusNode.textContent = message || '';
    apicurioStatusNode.classList.remove('is-error', 'is-success');
    if (tone === 'error') {
      apicurioStatusNode.classList.add('is-error');
    } else if (tone === 'success') {
      apicurioStatusNode.classList.add('is-success');
    }
  }

  function setApicurioArtifactsMessage(message) {
    if (!apicurioArtifactsContainer) return;
    apicurioArtifactsContainer.innerHTML = '';
    if (!message) return;
    const p = document.createElement('p');
    p.className = 'apicurio-hint';
    p.textContent = message;
    apicurioArtifactsContainer.appendChild(p);
  }

  function resetApicurioArtifactsPanel(message) {
    apicurioArtifactsById.clear();
    apicurioArtifactVersions.clear();
    setApicurioArtifactsMessage(message);
  }

  function updateApicurioAvailability() {
    const activeIndex = getActiveIndex();
    const enabled = isApicurioEnabled();
    const haveDetails = hasApicurioDetails();
    const activeModel = activeIndex >= 0 ? models[activeIndex] : null;
    const hasSeries = !!(activeModel?.apicurioVersions && activeModel.apicurioVersions.length > 1);
    if (pushApicurioButton) {
      const isBusy = pushApicurioButton.dataset.loading === 'true';
      const ready = enabled && haveDetails && activeIndex >= 0 && !!resolveArtifactId(models[activeIndex]);
      pushApicurioButton.disabled = !enabled || isBusy || !ready;
      if (!enabled) {
        pushApicurioButton.textContent = 'Enable Apicurio to push';
      } else if (!isBusy) {
        pushApicurioButton.textContent = 'Push to Apicurio';
      }
    }
    if (pushApicurioSeriesButton) {
      const isBusy = pushApicurioSeriesButton.dataset.loading === 'true';
      const ready = enabled && haveDetails && hasSeries && !!resolveArtifactId(activeModel);
      pushApicurioSeriesButton.disabled = !ready || isBusy;
      pushApicurioSeriesButton.hidden = !hasSeries;
      if (!enabled) {
        pushApicurioSeriesButton.textContent = 'Enable Apicurio to push series';
      } else if (!isBusy) {
        pushApicurioSeriesButton.textContent = 'Push series';
      }
    }
    if (apicurioListButton) {
      const listBusy = apicurioListButton.dataset.loading === 'true';
      const listReady = enabled && haveDetails;
      apicurioListButton.disabled = !listReady || listBusy;
      if (!listBusy) {
        if (!enabled) {
          apicurioListButton.textContent = 'Enable Apicurio to list';
        } else if (!haveDetails) {
          apicurioListButton.textContent = 'Enter details to list';
        } else {
          apicurioListButton.textContent = 'List artifacts';
        }
      }
    }
  }

  function refreshApicurioUiState() {
    syncApicurioInputsFromConfig();
    if (!isApicurioEnabled()) {
      setApicurioStatus('Apicurio integration is off. Enable it to allow pushes.', 'muted');
      resetApicurioArtifactsPanel('Apicurio integration is disabled.');
    } else if (!hasApicurioDetails()) {
      setApicurioStatus('Enter Apicurio connection details to enable push.', 'muted');
      resetApicurioArtifactsPanel('Enter registry details to browse artifacts.');
    } else {
      setApicurioStatus('Apicurio push is ready when a model is selected.', 'muted');
      if (!apicurioArtifactsById.size) {
        setApicurioArtifactsMessage('Click “List artifacts” to browse the current group.');
      }
    }
    updateApicurioAvailability();
  }

  function persistApicurioConfig() {
    if (!window?.localStorage) return;
    try {
      localStorage.setItem(APICURIO_STORAGE_KEY, JSON.stringify(apicurioConfig));
    } catch (err) {
      console.warn('[Blockscape] unable to persist Apicurio settings', err);
    }
  }

  function hydrateApicurioConfig() {
    let restored = {};
    if (window?.localStorage) {
      try {
        const raw = localStorage.getItem(APICURIO_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            restored = parsed;
          }
        }
      } catch (err) {
        console.warn('[Blockscape] failed to restore Apicurio settings', err);
      }
    }
    const restoredBase = sanitizeApicurioBaseUrl(restored.baseUrl ?? DEFAULT_APICURIO_BASE);
    const restoredGroup = (restored.groupId ?? DEFAULT_APICURIO_GROUP).toString().trim();
    let restoredEnabled = DEFAULT_APICURIO_ENABLED;
    let restoredSemver = DEFAULT_APICURIO_SEMVER_ENABLED;
    if (typeof restored.enabled === 'boolean') {
      restoredEnabled = restored.enabled;
    } else if (typeof restored.enabled === 'string') {
      restoredEnabled = restored.enabled === 'true';
    }
    if (typeof restored.useSemver === 'boolean') {
      restoredSemver = restored.useSemver;
    } else if (typeof restored.useSemver === 'string') {
      restoredSemver = restored.useSemver === 'true';
    }
    apicurioConfig.baseUrl = restoredBase || DEFAULT_APICURIO_BASE;
    apicurioConfig.groupId = restoredGroup || DEFAULT_APICURIO_GROUP;
    apicurioConfig.authToken = (restored.authToken ?? '').toString().trim();
    apicurioConfig.enabled = restoredEnabled;
    apicurioConfig.useSemver = restoredSemver;
    refreshApicurioUiState();
    notifyApicurioEnabledChange();
  }

  function buildApicurioHeaders() {
    const headers = { Accept: 'application/json' };
    const token = (apicurioConfig.authToken || '').trim();
    if (token) {
      headers['Authorization'] = /\s/.test(token) ? token : `Bearer ${token}`;
    }
    return headers;
  }

  function buildApicurioCreateBody(artifactId, contentText, { title, description, version } = {}) {
    const payload = {
      artifactId,
      artifactType: 'JSON',
      firstVersion: {
        content: {
          contentType: 'application/json',
          content: contentText
        },
        metadata: {
          properties: {}
        }
      }
    };
    if (version) payload.firstVersion.version = version;
    if (title) payload.name = title;
    if (description) payload.description = description;
    // Pass through seriesId if present in content for downstream discovery.
    try {
      const parsed = JSON.parse(contentText);
      const seriesId = parsed?.seriesId;
      if (seriesId && typeof seriesId === 'string') {
        payload.firstVersion.metadata.properties.seriesId = seriesId;
      }
    } catch {
      // ignore parse errors; still push content
    }
    return payload;
  }

  function buildApicurioUpdateBody(contentText, { version } = {}) {
    const body = {
      content: {
        contentType: 'application/json',
        content: contentText
      },
      metadata: {
        properties: {}
      }
    };
    try {
      const parsed = JSON.parse(contentText);
      const seriesId = parsed?.seriesId;
      if (seriesId && typeof seriesId === 'string') {
        body.metadata.properties.seriesId = seriesId;
      }
    } catch {
      // ignore parse errors
    }
    if (version) body.version = version;
    return body;
  }

  function parseApicurioSemver(value) {
    if (value == null) return null;
    const text = String(value).trim();
    if (!text) return null;
    const fullMatch = /^v?(\d+)\.(\d+)\.(\d+)(?:-.+)?$/.exec(text);
    if (fullMatch) {
      return {
        major: Number(fullMatch[1]),
        minor: Number(fullMatch[2]),
        patch: Number(fullMatch[3])
      };
    }
    const majorOnly = /^v?(\d+)$/.exec(text);
    if (majorOnly) {
      return {
        major: Number(majorOnly[1]),
        minor: 0,
        patch: 0
      };
    }
    return null;
  }

  function formatSemverParts(parts) {
    return `${parts.major}.${parts.minor}.${parts.patch}`;
  }

  function compareSemverParts(a, b) {
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    return a.patch - b.patch;
  }

  function computeNextSemverVersion(versions = []) {
    let latest = null;
    versions.forEach((entry) => {
      const parsed = parseApicurioSemver(entry?.version ?? entry);
      if (!parsed) return;
      if (!latest || compareSemverParts(parsed, latest) > 0) {
        latest = parsed;
      }
    });
    if (!latest) return '1.0.0';
    const bumped = { ...latest, patch: latest.patch + 1 };
    return formatSemverParts(bumped);
  }

  function resolveArtifactId(entry, { seriesName, fallbackTitle } = {}) {
    if (!entry) return null;
    const resolvedName = seriesName || entry.title || entry.apicurioArtifactName || getModelTitle(entry);
    const resolvedFallback = fallbackTitle || resolvedName;
    if (typeof ensureSeriesId === 'function' && (entry.isSeries || (entry.apicurioVersions?.length > 1))) {
      ensureSeriesId(entry, { seriesName: resolvedName, fallbackTitle: resolvedFallback });
    }
    if (typeof getSeriesId === 'function') {
      const seriesId = getSeriesId(entry, { seriesName: resolvedName, fallbackTitle: resolvedFallback });
      if (seriesId) return seriesId;
    }
    return getModelId(entry);
  }

  function normalizeApicurioArtifactsPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.artifacts)) return payload.artifacts;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  }

  function normalizeApicurioVersionsPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.versions)) return payload.versions;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  }

  function pickLatestVersionEntry(versions = []) {
    if (!Array.isArray(versions) || !versions.length) return null;
    const copy = [...versions].filter(Boolean);
    copy.sort((a, b) => {
      const aDate = a?.createdOn ? new Date(a.createdOn).getTime() : 0;
      const bDate = b?.createdOn ? new Date(b.createdOn).getTime() : 0;
      if (aDate !== bDate) return bDate - aDate;
      const aVersionNum = Number(a?.version);
      const bVersionNum = Number(b?.version);
      const aNumValid = Number.isFinite(aVersionNum);
      const bNumValid = Number.isFinite(bVersionNum);
      if (aNumValid && bNumValid && aVersionNum !== bVersionNum) {
        return bVersionNum - aVersionNum;
      }
      const aVer = String(a?.version ?? '');
      const bVer = String(b?.version ?? '');
      return bVer.localeCompare(aVer, undefined, { numeric: true });
    });
    return copy[0] || null;
  }

  function normalizeArtifactContentPayload(payload) {
    if (!payload) return payload;
    let data = payload;
    const topHasCategories = Array.isArray(payload?.categories);
    if (!topHasCategories) {
      const embedded = payload?.content;
      if (typeof embedded === 'string') {
        try {
          data = JSON.parse(embedded);
        } catch (err) {
          console.warn('[Blockscape] artifact payload contained string content that could not be parsed', err);
        }
      } else if (embedded && typeof embedded === 'object') {
        data = embedded;
      }
    }
    return data;
  }

  async function fetchApicurioArtifactMetadata(baseUrl, groupId, artifactId) {
    const encodedGroup = encodeURIComponent(groupId);
    const encodedId = encodeURIComponent(artifactId);
    const target = `${baseUrl}/groups/${encodedGroup}/artifacts/${encodedId}`;
    const headers = buildApicurioHeaders();
    headers['Accept'] = 'application/json';
    const resp = await fetch(target, { method: 'GET', headers });
    if (!resp.ok) {
      let detail = resp.statusText || 'Unknown error';
      try {
        const text = await resp.text();
        if (text) detail = text.slice(0, 400);
      } catch {
        // ignore
      }
      throw new Error(`Failed to fetch artifact metadata (${resp.status}): ${detail}`);
    }
    return resp.json();
  }

  async function fetchApicurioArtifactVersions(baseUrl, groupId, artifactId) {
    const encodedGroup = encodeURIComponent(groupId);
    const encodedId = encodeURIComponent(artifactId);
    const target = `${baseUrl}/groups/${encodedGroup}/artifacts/${encodedId}/versions?limit=50&order=desc`;
    const headers = buildApicurioHeaders();
    headers['Accept'] = 'application/json';
    const resp = await fetch(target, { method: 'GET', headers });
    if (!resp.ok) {
      let detail = resp.statusText || 'Unknown error';
      try {
        const text = await resp.text();
        if (text) detail = text.slice(0, 400);
      } catch {
        // ignore
      }
      throw new Error(`Failed to fetch artifact versions (${resp.status}): ${detail}`);
    }
    const payload = await resp.json();
    return normalizeApicurioVersionsPayload(payload).filter((v) => v && v.version != null);
  }

  async function fetchApicurioArtifactContent(baseUrl, groupId, artifactId, versionSegment = 'latest') {
    const encodedGroup = encodeURIComponent(groupId);
    const encodedId = encodeURIComponent(artifactId);
    const encodedVersion = encodeURIComponent(versionSegment || 'latest');
    const contentEndpoint = `${baseUrl}/groups/${encodedGroup}/artifacts/${encodedId}/versions/${encodedVersion}/content`;
    const headers = buildApicurioHeaders();
    headers['Accept'] = 'application/json, application/*+json, */*;q=0.8';
    const resp = await fetch(contentEndpoint, { method: 'GET', headers });
    if (!resp.ok) {
      let detail = resp.statusText || 'Unknown error';
      try {
        const text = await resp.text();
        if (text) detail = text.slice(0, 400);
      } catch {
        // ignore
      }
      throw new Error(`Failed to load artifact content (${resp.status}): ${detail}`);
    }
    const text = await resp.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Artifact content is not valid JSON.');
    }
    return normalizeArtifactContentPayload(data);
  }

  async function fetchApicurioArtifactFingerprint(baseUrl, groupId, artifactId, versionSegment = 'latest') {
    const data = await fetchApicurioArtifactContent(baseUrl, groupId, artifactId, versionSegment);
    return {
      data,
      fingerprint: computeJsonFingerprint(data)
    };
  }

  async function resolveApicurioCompareVersion(baseUrl, groupId, artifactId) {
    try {
      const versions = await fetchApicurioArtifactVersions(baseUrl, groupId, artifactId);
      if (versions?.length) {
        apicurioArtifactVersions.set(artifactId, versions);
        const newestEntry = pickLatestVersionEntry(versions);
        if (newestEntry?.version != null) return newestEntry.version;
      }
    } catch (err) {
      console.warn('[Blockscape] compare-version: unable to fetch versions list', err);
    }
    try {
      const meta = await fetchApicurioArtifactMetadata(baseUrl, groupId, artifactId);
      if (meta?.version != null) return meta.version;
    } catch (err) {
      console.warn('[Blockscape] compare-version: unable to fetch metadata', err);
    }
    const cached = apicurioArtifactVersions.get(artifactId);
    if (cached && cached.length) {
      const newestCached = pickLatestVersionEntry(cached);
      if (newestCached?.version != null) return newestCached.version;
    }
    return 'latest';
  }

  async function resolveApicurioSemverTarget(baseUrl, groupId, artifactId, exists) {
    if (!apicurioConfig.useSemver) return null;
    if (!exists) return '1.0.0';
    try {
      const versions = await fetchApicurioArtifactVersions(baseUrl, groupId, artifactId);
      return computeNextSemverVersion(versions);
    } catch (err) {
      throw new Error(`Unable to compute next semantic version: ${err.message}`);
    }
  }

  function bindApicurioElements(scope = document) {
    pushApicurioButton = scope.querySelector('#pushApicurio') || document.getElementById('pushApicurio');
    pushApicurioSeriesButton = scope.querySelector('#pushApicurioSeries') || document.getElementById('pushApicurioSeries');
    apicurioListButton = scope.querySelector('#listApicurioArtifacts') || document.getElementById('listApicurioArtifacts');
    apicurioUrlInput = scope.querySelector('#apicurioUrl') || document.getElementById('apicurioUrl');
    apicurioGroupInput = scope.querySelector('#apicurioGroup') || document.getElementById('apicurioGroup');
    apicurioTokenInput = scope.querySelector('#apicurioToken') || document.getElementById('apicurioToken');
    apicurioToggleInput = scope.querySelector('#apicurioToggle') || document.getElementById('apicurioToggle');
    apicurioSemverInput = scope.querySelector('#apicurioSemver') || document.getElementById('apicurioSemver');
    apicurioStatusNode = scope.querySelector('#apicurioStatus') || document.getElementById('apicurioStatus');
    apicurioArtifactsContainer = scope.querySelector('#apicurioArtifacts') || document.getElementById('apicurioArtifacts');
  }

  function handleApicurioInputChange() {
    apicurioConfig.baseUrl = sanitizeApicurioBaseUrl(apicurioUrlInput?.value ?? apicurioConfig.baseUrl);
    apicurioConfig.groupId = (apicurioGroupInput?.value ?? '').trim();
    apicurioConfig.authToken = (apicurioTokenInput?.value ?? '').trim();
    persistApicurioConfig();
    refreshApicurioUiState();
  }

  function setApicurioEnabled(nextValue) {
    apicurioConfig.enabled = nextValue !== false;
    persistApicurioConfig();
    refreshApicurioUiState();
    notifyApicurioEnabledChange();
  }

  function handleApicurioToggleChange() {
    setApicurioEnabled(apicurioToggleInput ? apicurioToggleInput.checked : DEFAULT_APICURIO_ENABLED);
  }

  function handleApicurioSemverToggleChange() {
    apicurioConfig.useSemver = apicurioSemverInput ? apicurioSemverInput.checked : DEFAULT_APICURIO_SEMVER_ENABLED;
    persistApicurioConfig();
    refreshApicurioUiState();
  }

  function attachApicurioEventHandlers() {
    [apicurioUrlInput, apicurioGroupInput, apicurioTokenInput].forEach((input) => {
      if (!input) return;
      input.addEventListener('input', handleApicurioInputChange);
    });
    if (pushApicurioButton) {
      pushApicurioButton.addEventListener('click', () => {
        pushActiveModelToApicurio();
      });
    }
    if (pushApicurioSeriesButton) {
      pushApicurioSeriesButton.addEventListener('click', () => {
        pushActiveSeriesToApicurio();
      });
    }
    if (apicurioToggleInput) {
      apicurioToggleInput.addEventListener('change', handleApicurioToggleChange);
    }
    if (apicurioSemverInput) {
      apicurioSemverInput.addEventListener('change', handleApicurioSemverToggleChange);
    }
    if (apicurioListButton) {
      apicurioListButton.addEventListener('click', listApicurioArtifacts);
    }
    if (apicurioArtifactsContainer) {
      apicurioArtifactsContainer.addEventListener('click', (event) => {
        const versionButton = event.target.closest('[data-artifact-version]');
        if (versionButton) {
          event.stopPropagation();
          const artifactId = versionButton.dataset.artifactId;
          const version = versionButton.dataset.artifactVersion;
          if (artifactId && version) {
            loadApicurioArtifact(artifactId, version);
          }
          return;
        }
        const loadAllButton = event.target.closest('[data-artifact-load-all]');
        if (loadAllButton) {
          event.stopPropagation();
          const artifactId = loadAllButton.dataset.artifactId;
          if (artifactId) {
            loadAllApicurioArtifactVersions(artifactId);
          }
          return;
        }
        const artifactTrigger = event.target.closest('[data-artifact-trigger]');
        if (artifactTrigger) {
          const artifactId = artifactTrigger.dataset.artifactId;
          if (!artifactId) return;
          toggleArtifactVersions(artifactId);
        }
      });
    }
  }

  function createApicurioPanelContent() {
    const wrapper = document.createElement('div');
    wrapper.className = 'blockscape-registry-panel';
    wrapper.innerHTML = `
      <div class="blockscape-registry-header">
        <h2>Apicurio registry</h2>
        <p>Configure the registry connection and push the active model.</p>
      </div>
      <div class="apicurio-controls">
        <label class="apicurio-toggle">
          <input id="apicurioToggle" type="checkbox" />
          <span>Enable Apicurio push</span>
        </label>
        <label class="apicurio-toggle">
          <input id="apicurioSemver" type="checkbox" />
          <span>Use semantic versioning</span>
        </label>
        <p class="apicurio-hint">When disabled, Blockscape never contacts your registry.</p>
        <p class="apicurio-hint apicurio-subnote">When on, Blockscape reads the latest version and auto-bumps the next semver on each push.</p>
        <button id="pushApicurio" class="pf-v5-c-button pf-m-secondary" type="button" disabled
          title="Enter Apicurio connection details to enable pushes">Push to Apicurio</button>
        <button id="pushApicurioSeries" class="pf-v5-c-button pf-m-secondary" type="button" disabled hidden
          title="Push all versions in this series as a JSON array">Push series</button>
        <button id="listApicurioArtifacts" class="pf-v5-c-button pf-m-secondary" type="button" disabled
          title="List artifacts in the configured group">List artifacts</button>
        <details id="apicurioSettings" class="apicurio-settings">
          <summary>Connection settings (optional)</summary>
          <div class="apicurio-fields">
            <label>
              Registry base URL
              <input id="apicurioUrl" type="url" placeholder="https://registry.example/apis/registry/v3" autocomplete="url" />
            </label>
            <label>
              Group ID
              <input id="apicurioGroup" type="text" placeholder="default" autocomplete="organization" />
            </label>
            <label>
              Auth token (optional)
              <input id="apicurioToken" type="password" placeholder="Bearer token" autocomplete="off" />
            </label>
          </div>
          <p class="apicurio-hint">Details stay in this browser only.</p>
        </details>
        <div id="apicurioStatus" class="apicurio-status" role="status" aria-live="polite"></div>
        <div id="apicurioArtifacts" class="apicurio-artifacts" aria-live="polite"></div>
      </div>
    `;
    return wrapper;
  }

  function mount(panelNode) {
    if (!panelNode) return;
    panelNode.innerHTML = '';
    const content = createApicurioPanelContent();
    panelNode.appendChild(content);
    bindApicurioElements(panelNode);
    attachApicurioEventHandlers();
    refreshApicurioUiState();
  }

  function renderApicurioArtifactsList(entries) {
    if (!apicurioArtifactsContainer) return;
    apicurioArtifactsContainer.innerHTML = '';
    if (!entries.length) {
      setApicurioArtifactsMessage('No artifacts found in this group.');
      return;
    }
    const makeSection = (label) => {
      const section = document.createElement('section');
      section.className = 'apicurio-artifact-section';
      const heading = document.createElement('h3');
      heading.textContent = label;
      section.appendChild(heading);
      const list = document.createElement('ul');
      list.className = 'apicurio-artifact-list';
      section.appendChild(list);
      return { section, list };
    };

    const seriesSection = makeSection('Series artifacts');
    const baseSection = makeSection('Artifacts');

    entries.forEach(entry => {
      if (!entry?.artifactId) return;
      const isSeriesGroup = entry._groupId && entry._groupId.endsWith(SERIES_GROUP_SUFFIX);
      const targetList = isSeriesGroup ? seriesSection.list : baseSection.list;
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'apicurio-artifact';
      button.dataset.artifactId = entry.artifactId;
      button.dataset.artifactTrigger = 'toggle';

      const title = document.createElement('span');
      title.className = 'apicurio-artifact-title';
      title.textContent = entry.artifactId;
      button.appendChild(title);

      const metaParts = [];
      if (entry.name) metaParts.push(entry.name);
      if (entry.version != null) metaParts.push(`v${entry.version}`);
      if (entry.type) metaParts.push(entry.type);
      if (entry._groupId) metaParts.push(entry._groupId);
      if (metaParts.length) {
        const meta = document.createElement('span');
        meta.className = 'apicurio-artifact-meta';
        meta.textContent = metaParts.join(' • ');
        button.appendChild(meta);
      }

      if (entry.description) {
        const desc = document.createElement('span');
        desc.className = 'apicurio-artifact-meta';
        desc.textContent = entry.description;
        button.appendChild(desc);
      }

      li.appendChild(button);
      const versionPanel = document.createElement('div');
      versionPanel.className = 'apicurio-version-list';
      versionPanel.dataset.versionPanel = entry.artifactId;
      versionPanel.hidden = true;
      const hint = document.createElement('p');
      hint.className = 'apicurio-hint';
      hint.textContent = 'Click to load the latest or open versions.';
      versionPanel.appendChild(hint);
      li.appendChild(versionPanel);
      targetList.appendChild(li);
    });

    if (seriesSection.list.children.length) apicurioArtifactsContainer.appendChild(seriesSection.section);
    if (baseSection.list.children.length) apicurioArtifactsContainer.appendChild(baseSection.section);
  }

  function getApicurioVersionPanel(artifactId) {
    if (!apicurioArtifactsContainer) return null;
    return apicurioArtifactsContainer.querySelector(`[data-version-panel=\"${artifactId}\"]`);
  }

  function setVersionPanelMessage(panel, message) {
    if (!panel) return;
    panel.innerHTML = '';
    if (!message) return;
    const p = document.createElement('p');
    p.className = 'apicurio-hint';
    p.textContent = message;
    panel.appendChild(p);
  }

  function renderApicurioVersionButtons(artifactId, versions) {
    const panel = getApicurioVersionPanel(artifactId);
    if (!panel) return;
    panel.innerHTML = '';
    if (!versions.length) {
      setVersionPanelMessage(panel, 'No versions found for this artifact.');
      return;
    }
    versions.forEach((ver) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'apicurio-version-button';
      btn.dataset.artifactId = artifactId;
      btn.dataset.artifactVersion = ver.version;
      const labelParts = [`Version ${ver.version}`];
      if (ver.createdOn) {
        const dt = new Date(ver.createdOn);
        if (!isNaN(dt)) {
          labelParts.push(dt.toISOString().slice(0, 10));
        }
      }
      btn.textContent = labelParts.join(' — ');
      panel.appendChild(btn);
    });
  }

  async function toggleArtifactVersions(artifactId) {
    const panel = getApicurioVersionPanel(artifactId);
    if (!panel) return;
    const isOpen = panel.dataset.open === 'true';
    if (isOpen) {
      panel.hidden = true;
      panel.dataset.open = 'false';
      return;
    }
    panel.hidden = false;
    panel.dataset.open = 'true';
    if (panel.dataset.loaded === 'true') return;
    if (!hasApicurioDetails()) {
      setVersionPanelMessage(panel, 'Enter registry details first.');
      return;
    }
    setVersionPanelMessage(panel, 'Loading versions…');
    try {
      const baseUrl = sanitizeApicurioBaseUrl(apicurioConfig.baseUrl);
      const metaEntry = apicurioArtifactsById.get(artifactId);
      const baseGroupId = apicurioConfig.groupId.trim();
      const groupId = metaEntry?._groupId || baseGroupId;
      const versions = await fetchApicurioArtifactVersions(baseUrl, groupId, artifactId);
      apicurioArtifactVersions.set(artifactId, versions);
      panel.dataset.loaded = 'true';
      renderApicurioVersionButtons(artifactId, versions);
    } catch (err) {
      console.error('[Blockscape] failed to load versions', err);
      setVersionPanelMessage(panel, `Unable to fetch versions: ${err.message}`);
    }
  }

  function upsertModelEntryForArtifact(artifactId, entry) {
    const existingIndex = models.findIndex(m => m.apicurioArtifactId === artifactId);
    if (existingIndex !== -1) {
      const preservedId = models[existingIndex].id;
      models[existingIndex] = { ...entry, id: preservedId || entry.id };
      if (models[existingIndex].apicurioVersions?.length > 1) {
        models[existingIndex].isSeries = true;
      }
      setActive(existingIndex);
    } else {
      models.push(entry);
      setActive(models.length - 1);
    }
  }

  async function apicurioArtifactExists(baseUrl, groupId, artifactId, headers) {
    const encodedGroup = encodeURIComponent(groupId);
    const encodedId = encodeURIComponent(artifactId);
    const target = `${baseUrl}/groups/${encodedGroup}/artifacts/${encodedId}`;
    try {
      const resp = await fetch(target, { method: 'GET', headers });
      if (resp.status === 404) return false;
      if (resp.ok) return true;
      if (resp.status === 401 || resp.status === 403) {
        throw new Error('Authentication failed while checking the registry.');
      }
      throw new Error(`Registry responded with status ${resp.status} while checking the artifact.`);
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error('Network error while contacting Apicurio registry.');
      }
      throw err;
    }
  }

  async function pushActiveModelToApicurio() {
    if (!pushApicurioButton || pushApicurioButton.dataset.loading === 'true') return;
    if (!isApicurioEnabled()) {
      setApicurioStatus('Apicurio integration is off. Enable it first.', 'error');
      return;
    }
    if (!hasApicurioDetails()) {
      setApicurioStatus('Enter the registry base URL and group ID before pushing.', 'error');
      return;
    }
    const activeIndex = getActiveIndex();
    if (activeIndex < 0 || !models[activeIndex]) {
      setApicurioStatus('No active model to push.', 'error');
      return;
    }
    const artifactId = resolveArtifactId(models[activeIndex], { fallbackTitle: getModelTitle(models[activeIndex]) });
    if (!artifactId) {
      setApicurioStatus('Active model needs an id before pushing.', 'error');
      return;
    }

    const baseUrl = sanitizeApicurioBaseUrl(apicurioConfig.baseUrl);
    const groupId = apicurioConfig.groupId.trim();
    const payload = JSON.stringify(models[activeIndex].data, null, 2);
    const headers = buildApicurioHeaders();

    pushApicurioButton.dataset.loading = 'true';
    pushApicurioButton.textContent = 'Pushing…';
    pushApicurioButton.disabled = true;
    setApicurioStatus('Pushing to Apicurio…', 'muted');

    try {
      const exists = await apicurioArtifactExists(baseUrl, groupId, artifactId, headers);
      const localFingerprint = computeJsonFingerprint(models[activeIndex].data);
      if (exists) {
        try {
          const compareVersion = await resolveApicurioCompareVersion(baseUrl, groupId, artifactId);
          const { data: registryData, fingerprint: registryFingerprint } = await fetchApicurioArtifactFingerprint(baseUrl, groupId, artifactId, compareVersion);
          console.group('[Blockscape] Apicurio push compare');
          console.log('compare version', compareVersion);
          console.log('local fingerprint', localFingerprint);
          console.log('registry fingerprint', registryFingerprint);
          console.log('local payload', models[activeIndex].data);
          console.log('registry payload', registryData);
          console.groupEnd();
          if (localFingerprint && registryFingerprint && localFingerprint === registryFingerprint) {
            const proceed = window.confirm('The current registry version is identical to this model. Push anyway?');
            if (!proceed) {
              setApicurioStatus('Push cancelled (content matches the latest registry version).', 'muted');
              return;
            }
            setApicurioStatus('Pushing identical content by user choice.', 'muted');
          } else if (!registryFingerprint) {
            setApicurioStatus('Unable to compare with registry content (skipping confirmation).', 'muted');
          } else {
            console.log('[Blockscape] Apicurio compare mismatch (proceeding with push)');
          }
        } catch (compareError) {
          console.warn('[Blockscape] unable to compare registry content before push', compareError);
          setApicurioStatus('Skipped comparison with registry (content fetch failed). Proceeding with push.', 'muted');
        }
      }
      const targetVersion = apicurioConfig.useSemver
        ? await resolveApicurioSemverTarget(baseUrl, groupId, artifactId, exists)
        : null;
      if (apicurioConfig.useSemver && !targetVersion) {
        throw new Error('Semantic versioning is enabled but no version could be computed.');
      }
      const encodedGroup = encodeURIComponent(groupId);
      const encodedId = encodeURIComponent(artifactId);
      const endpoint = exists
        ? `${baseUrl}/groups/${encodedGroup}/artifacts/${encodedId}/versions`
        : `${baseUrl}/groups/${encodedGroup}/artifacts`;

      const requestHeaders = {
        ...headers,
        'Content-Type': 'application/json'
      };
      if (targetVersion) {
        requestHeaders['X-Registry-Version'] = targetVersion;
        setApicurioStatus(`Pushing to Apicurio as version ${targetVersion}…`, 'muted');
      }

      const bodyObject = exists
        ? buildApicurioUpdateBody(payload, { version: targetVersion })
        : buildApicurioCreateBody(artifactId, payload, {
          title: getModelTitle(models[activeIndex]),
          description: models[activeIndex].data?.abstract,
          version: targetVersion
        });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(bodyObject)
      });

      if (!response.ok) {
        let detail = response.statusText || 'Unknown error';
        try {
          const text = await response.text();
          if (text) detail = text.slice(0, 400);
        } catch {
          // ignore
        }
        throw new Error(`Registry rejected the push (${response.status}): ${detail}`);
      }

      let info = null;
      try {
        info = await response.json();
      } catch {
        info = null;
      }
      const label = info?.version || info?.globalId || '';
      const prefix = exists ? 'Updated' : 'Created';
      const suffix = label ? ` (version ${label})` : '';
      setApicurioStatus(`${prefix} ${artifactId}${suffix}`, 'success');
    } catch (error) {
      console.error('[Blockscape] Apicurio push failed', error);
      setApicurioStatus(`Apicurio push failed: ${error.message}`, 'error');
    } finally {
      pushApicurioButton.dataset.loading = 'false';
      updateApicurioAvailability();
    }
  }

  async function pushActiveSeriesToApicurio() {
    if (!pushApicurioSeriesButton || pushApicurioSeriesButton.dataset.loading === 'true') return;
    if (!isApicurioEnabled()) {
      setApicurioStatus('Apicurio integration is off. Enable it first.', 'error');
      return;
    }
    if (!hasApicurioDetails()) {
      setApicurioStatus('Enter the registry base URL and group ID before pushing.', 'error');
      return;
    }
    const activeIndex = getActiveIndex();
    const activeEntry = activeIndex >= 0 ? models[activeIndex] : null;
    if (!activeEntry || !activeEntry.apicurioVersions || activeEntry.apicurioVersions.length < 2) {
      setApicurioStatus('Series push requires a model with multiple versions.', 'error');
      return;
    }
    const artifactId = resolveArtifactId(activeEntry, { seriesName: activeEntry.title || activeEntry.apicurioArtifactName || getModelTitle(activeEntry) });
    if (!artifactId) {
      setApicurioStatus('Active series needs an id before pushing.', 'error');
      return;
    }
    if (typeof ensureSeriesId === 'function') {
      ensureSeriesId(activeEntry, { seriesName: activeEntry.title || activeEntry.apicurioArtifactName || getModelTitle(activeEntry) });
    }
    const baseUrl = sanitizeApicurioBaseUrl(apicurioConfig.baseUrl);
    const baseGroupId = apicurioConfig.groupId.trim();
    const payloadArray = activeEntry.apicurioVersions.map(v => v.data);
    const payload = JSON.stringify(payloadArray, null, 2);
    const headers = buildApicurioHeaders();
    const seriesGroupId = deriveSeriesGroupId(baseGroupId);

    pushApicurioSeriesButton.dataset.loading = 'true';
    pushApicurioSeriesButton.textContent = 'Pushing…';
    pushApicurioSeriesButton.disabled = true;
    setApicurioStatus('Pushing series to Apicurio…', 'muted');

    try {
      const exists = await apicurioArtifactExists(baseUrl, seriesGroupId, artifactId, headers);
      const localFingerprint = computeJsonFingerprint(payloadArray);
      if (exists) {
        try {
          const compareVersion = await resolveApicurioCompareVersion(baseUrl, seriesGroupId, artifactId);
          const { data: registryData, fingerprint: registryFingerprint } = await fetchApicurioArtifactFingerprint(baseUrl, seriesGroupId, artifactId, compareVersion);
          console.group('[Blockscape] Apicurio series push compare');
          console.log('compare version', compareVersion);
          console.log('local fingerprint', localFingerprint);
          console.log('registry fingerprint', registryFingerprint);
          console.log('local payload (series)', payloadArray);
          console.log('registry payload', registryData);
          console.groupEnd();
          if (localFingerprint && registryFingerprint && localFingerprint === registryFingerprint) {
            const proceed = window.confirm('The current registry version matches this series. Push anyway?');
            if (!proceed) {
              setApicurioStatus('Series push cancelled (content matches latest).', 'muted');
              return;
            }
            setApicurioStatus('Pushing identical series by user choice.', 'muted');
          } else if (!registryFingerprint) {
            setApicurioStatus('Unable to compare with registry content (skipping confirmation).', 'muted');
          } else {
            console.log('[Blockscape] Apicurio compare mismatch (proceeding with series push)');
          }
        } catch (compareError) {
          console.warn('[Blockscape] unable to compare registry content before series push', compareError);
          setApicurioStatus('Skipped comparison with registry (content fetch failed). Proceeding with series push.', 'muted');
        }
      }

      const targetVersion = apicurioConfig.useSemver
        ? await resolveApicurioSemverTarget(baseUrl, seriesGroupId, artifactId, exists)
        : null;
      if (apicurioConfig.useSemver && !targetVersion) {
        throw new Error('Semantic versioning is enabled but no version could be computed.');
      }

      const encodedGroup = encodeURIComponent(seriesGroupId);
      const encodedId = encodeURIComponent(artifactId);
      const endpoint = exists
        ? `${baseUrl}/groups/${encodedGroup}/artifacts/${encodedId}/versions`
        : `${baseUrl}/groups/${encodedGroup}/artifacts`;

      const requestHeaders = {
        ...headers,
        'Content-Type': 'application/json'
      };
      if (targetVersion) {
        requestHeaders['X-Registry-Version'] = targetVersion;
        setApicurioStatus(`Pushing series to Apicurio as version ${targetVersion}…`, 'muted');
      }

      const bodyObject = exists
        ? buildApicurioUpdateBody(payload, { version: targetVersion })
        : buildApicurioCreateBody(artifactId, payload, {
          title: activeEntry.apicurioArtifactName || activeEntry.data?.title || artifactId,
          description: activeEntry.data?.abstract,
          version: targetVersion
        });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(bodyObject)
      });

      if (!response.ok) {
        let detail = response.statusText || 'Unknown error';
        try {
          const text = await response.text();
          if (text) detail = text.slice(0, 400);
        } catch {
          // ignore
        }
        throw new Error(`Registry rejected the series push (${response.status}): ${detail}`);
      }

      let info = null;
      try {
        info = await response.json();
      } catch {
        info = null;
      }
      const label = info?.version || info?.globalId || '';
      const prefix = exists ? 'Updated' : 'Created';
      const suffix = label ? ` (version ${label})` : '';
      setApicurioStatus(`${prefix} ${artifactId} series${suffix}`, 'success');
    } catch (error) {
      console.error('[Blockscape] Apicurio series push failed', error);
      setApicurioStatus(`Apicurio series push failed: ${error.message}`, 'error');
    } finally {
      pushApicurioSeriesButton.dataset.loading = 'false';
      updateApicurioAvailability();
    }
  }

  async function listApicurioArtifacts() {
    if (!apicurioListButton || apicurioListButton.dataset.loading === 'true') return;
    if (!isApicurioEnabled()) {
      setApicurioStatus('Enable Apicurio integration to list artifacts.', 'error');
      return;
    }
    if (!hasApicurioDetails()) {
      setApicurioStatus('Enter registry base URL and group ID before listing.', 'error');
      return;
    }
    const baseUrl = sanitizeApicurioBaseUrl(apicurioConfig.baseUrl);
    const baseGroupId = apicurioConfig.groupId.trim();
    const seriesGroupId = deriveSeriesGroupId(baseGroupId);
    const targets = [
      { groupId: baseGroupId, label: 'base' },
      { groupId: seriesGroupId, label: 'series' }
    ];
    apicurioListButton.dataset.loading = 'true';
    apicurioListButton.textContent = 'Listing…';
    apicurioListButton.disabled = true;
    setApicurioStatus('Listing artifacts…', 'muted');
    setApicurioArtifactsMessage('Contacting registry…');
    try {
      const headers = buildApicurioHeaders();
      headers['Accept'] = 'application/json';
      const allEntries = [];
      for (const target of targets) {
        const encodedGroup = encodeURIComponent(target.groupId);
        const endpoint = `${baseUrl}/groups/${encodedGroup}/artifacts?limit=50&offset=0`;
        const resp = await fetch(endpoint, { method: 'GET', headers });
        if (!resp.ok) {
          let detail = resp.statusText || 'Unknown error';
          try {
            const text = await resp.text();
            if (text) detail = text.slice(0, 400);
          } catch {
            // ignore
          }
          console.warn(`[Blockscape] failed to list artifacts for group ${target.groupId} (${resp.status}): ${detail}`);
          continue;
        }
        const payload = await resp.json();
        const entries = normalizeApicurioArtifactsPayload(payload).filter(item => item && item.artifactId);
        entries.forEach(item => {
          if (item) item._groupId = target.groupId;
        });
        allEntries.push(...entries);
      }
      apicurioArtifactsById.clear();
      apicurioArtifactVersions.clear();
      allEntries.forEach(item => {
        if (item?.artifactId) {
          apicurioArtifactsById.set(item.artifactId, item);
        }
      });
      renderApicurioArtifactsList(allEntries);
      const count = allEntries.length;
      setApicurioStatus(count ? `Found ${count} artifact${count === 1 ? '' : 's'} across base and series groups.` : 'No artifacts found in base/series groups.', count ? 'success' : 'muted');
    } catch (err) {
      console.error('[Blockscape] failed to list artifacts', err);
      resetApicurioArtifactsPanel('Unable to list artifacts.');
      setApicurioStatus(`Listing failed: ${err.message}`, 'error');
    } finally {
      apicurioListButton.dataset.loading = 'false';
      updateApicurioAvailability();
    }
  }

  async function loadApicurioArtifact(artifactId, explicitVersion = null) {
    if (!artifactId) return;
    if (!isApicurioEnabled()) {
      setApicurioStatus('Enable Apicurio integration to load artifacts.', 'error');
      return;
    }
    if (!hasApicurioDetails()) {
      setApicurioStatus('Enter registry connection details before loading artifacts.', 'error');
      return;
    }
    const baseUrl = sanitizeApicurioBaseUrl(apicurioConfig.baseUrl);
    const baseGroupId = apicurioConfig.groupId.trim();
    const groupId = artifactId && apicurioArtifactsById.get(artifactId)?._groupId
      || baseGroupId;
    let meta = apicurioArtifactsById.get(artifactId);
    const ensureMetadata = async () => {
      try {
        const fresh = await fetchApicurioArtifactMetadata(baseUrl, groupId, artifactId);
        if (fresh?.artifactId) {
          apicurioArtifactsById.set(artifactId, fresh);
        }
        return fresh;
      } catch (err) {
        console.error('[Blockscape] failed to fetch artifact metadata before loading', err);
        throw err;
      }
    };
    if (!meta) {
      try {
        meta = await ensureMetadata();
      } catch (err) {
        setApicurioStatus(`Failed to fetch artifact metadata: ${err.message}`, 'error');
        return;
      }
    }
    const knownVersions = apicurioArtifactVersions.get(artifactId) || [];
    let versionSegment = 'latest';
    let versionLabel = 'latest';
    if (explicitVersion) {
      versionSegment = explicitVersion;
      versionLabel = explicitVersion;
    } else {
      if (!meta || meta.version == null) {
        try {
          meta = await ensureMetadata();
        } catch (err) {
          setApicurioStatus(`Failed to fetch artifact metadata: ${err.message}`, 'error');
          return;
        }
      }
      versionSegment = meta?.version || 'latest';
      versionLabel = meta?.version || 'latest';
    }
    const matchedVersion = knownVersions.find((v) => String(v.version) === String(versionSegment));
    if (matchedVersion?.version != null) {
      versionLabel = matchedVersion.version;
    }
    setApicurioStatus(`Loading artifact ${artifactId}…`, 'muted');
    try {
      const data = await fetchApicurioArtifactContent(baseUrl, groupId, artifactId, versionSegment);
      const resolvedMeta = apicurioArtifactsById.get(artifactId) || meta || {};
      const isSeriesPayload = Array.isArray(data);
      let entry = null;
      if (isSeriesPayload) {
        const seriesVersions = data.map((item, idx) => {
          ensureModelMetadata(item, { titleHint: resolvedMeta.name || artifactId, idHint: artifactId });
          return {
            version: String(idx + 1),
            data: item,
            createdOn: matchedVersion?.createdOn || resolvedMeta.createdOn
          };
        });
        entry = {
          id: uid(),
          title: seriesVersions[0]?.data?.title || resolvedMeta.name || artifactId,
          data: seriesVersions[0]?.data,
          apicurioArtifactId: artifactId,
          apicurioArtifactName: resolvedMeta.name || '',
          apicurioVersions: seriesVersions,
          apicurioActiveVersionIndex: 0,
          isSeries: true
        };
        const seriesId = resolvedMeta?.properties?.seriesId || artifactId;
        if (typeof ensureSeriesId === 'function') {
          ensureSeriesId(entry, { seriesName: seriesId, fallbackTitle: seriesId });
        }
        setApicurioStatus(`Loaded series artifact ${artifactId}.`, 'success');
      } else {
        ensureModelMetadata(data, { titleHint: resolvedMeta.name || artifactId, idHint: artifactId });
        const versionEntry = {
          version: versionLabel,
          data,
          createdOn: matchedVersion?.createdOn || resolvedMeta.createdOn
        };
        entry = {
          id: uid(),
          title: data.title || resolvedMeta.name || artifactId,
          data,
          apicurioArtifactId: artifactId,
          apicurioArtifactName: resolvedMeta.name || '',
          apicurioVersions: [versionEntry],
          apicurioActiveVersionIndex: 0
        };
        const seriesId = resolvedMeta?.properties?.seriesId;
        if (seriesId && typeof ensureSeriesId === 'function') {
          ensureSeriesId(entry, { seriesName: seriesId, fallbackTitle: seriesId });
        }
        const suffix = versionLabel ? ` (version ${versionLabel})` : '';
        setApicurioStatus(`Loaded artifact ${artifactId}${suffix}.`, 'success');
      }
      upsertModelEntryForArtifact(artifactId, entry);
    } catch (err) {
      console.error('[Blockscape] failed to load artifact', err);
      setApicurioStatus(`Failed to load artifact: ${err.message}`, 'error');
    }
  }

  async function loadAllApicurioArtifactVersions(artifactId) {
    // Removed: loading every version for a series is not supported.
  }

  return {
    hydrateConfig: hydrateApicurioConfig,
    mount,
    updateAvailability: updateApicurioAvailability,
    isEnabled: isApicurioEnabled,
    setEnabled: setApicurioEnabled,
    onEnabledChange: onApicurioEnabledChange
  };
}
