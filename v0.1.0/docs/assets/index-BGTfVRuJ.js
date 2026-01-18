var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
function noop() {
}
function run(fn) {
  return fn();
}
function blank_object() {
  return /* @__PURE__ */ Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function is_function(thing) {
  return typeof thing === "function";
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || a && typeof a === "object" || typeof a === "function";
}
function is_empty(obj) {
  return Object.keys(obj).length === 0;
}
const globals = typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : (
  // @ts-ignore Node typings have this
  global
);
function append(target2, node) {
  target2.appendChild(node);
}
function insert(target2, node, anchor) {
  target2.insertBefore(node, anchor || null);
}
function detach(node) {
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
}
function element(name) {
  return document.createElement(name);
}
function svg_element(name) {
  return document.createElementNS("http://www.w3.org/2000/svg", name);
}
function text(data) {
  return document.createTextNode(data);
}
function space() {
  return text(" ");
}
function listen(node, event, handler, options) {
  node.addEventListener(event, handler, options);
  return () => node.removeEventListener(event, handler, options);
}
function prevent_default(fn) {
  return function(event) {
    event.preventDefault();
    return fn.call(this, event);
  };
}
function attr(node, attribute, value) {
  if (value == null) node.removeAttribute(attribute);
  else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
}
function init_binding_group(group) {
  let _inputs;
  return {
    /* push */
    p(...inputs) {
      _inputs = inputs;
      _inputs.forEach((input) => group.push(input));
    },
    /* remove */
    r() {
      _inputs.forEach((input) => group.splice(group.indexOf(input), 1));
    }
  };
}
function children(element2) {
  return Array.from(element2.childNodes);
}
function set_data(text2, data) {
  data = "" + data;
  if (text2.data === data) return;
  text2.data = /** @type {string} */
  data;
}
function set_input_value(input, value) {
  input.value = value == null ? "" : value;
}
class HtmlTag {
  constructor(is_svg = false) {
    /**
     * @private
     * @default false
     */
    __publicField(this, "is_svg", false);
    /** parent for creating node */
    __publicField(this, "e");
    /** html tag nodes */
    __publicField(this, "n");
    /** target */
    __publicField(this, "t");
    /** anchor */
    __publicField(this, "a");
    this.is_svg = is_svg;
    this.e = this.n = null;
  }
  /**
   * @param {string} html
   * @returns {void}
   */
  c(html) {
    this.h(html);
  }
  /**
   * @param {string} html
   * @param {HTMLElement | SVGElement} target
   * @param {HTMLElement | SVGElement} anchor
   * @returns {void}
   */
  m(html, target2, anchor = null) {
    if (!this.e) {
      if (this.is_svg)
        this.e = svg_element(
          /** @type {keyof SVGElementTagNameMap} */
          target2.nodeName
        );
      else
        this.e = element(
          /** @type {keyof HTMLElementTagNameMap} */
          target2.nodeType === 11 ? "TEMPLATE" : target2.nodeName
        );
      this.t = target2.tagName !== "TEMPLATE" ? target2 : (
        /** @type {HTMLTemplateElement} */
        target2.content
      );
      this.c(html);
    }
    this.i(anchor);
  }
  /**
   * @param {string} html
   * @returns {void}
   */
  h(html) {
    this.e.innerHTML = html;
    this.n = Array.from(
      this.e.nodeName === "TEMPLATE" ? this.e.content.childNodes : this.e.childNodes
    );
  }
  /**
   * @returns {void} */
  i(anchor) {
    for (let i = 0; i < this.n.length; i += 1) {
      insert(this.t, this.n[i], anchor);
    }
  }
  /**
   * @param {string} html
   * @returns {void}
   */
  p(html) {
    this.d();
    this.h(html);
    this.i(this.a);
  }
  /**
   * @returns {void} */
  d() {
    this.n.forEach(detach);
  }
}
let current_component;
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component) throw new Error("Function called outside component initialization");
  return current_component;
}
function onMount(fn) {
  get_current_component().$$.on_mount.push(fn);
}
const dirty_components = [];
const binding_callbacks = [];
let render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = /* @__PURE__ */ Promise.resolve();
let update_scheduled = false;
function schedule_update() {
  if (!update_scheduled) {
    update_scheduled = true;
    resolved_promise.then(flush);
  }
}
function add_render_callback(fn) {
  render_callbacks.push(fn);
}
const seen_callbacks = /* @__PURE__ */ new Set();
let flushidx = 0;
function flush() {
  if (flushidx !== 0) {
    return;
  }
  const saved_component = current_component;
  do {
    try {
      while (flushidx < dirty_components.length) {
        const component = dirty_components[flushidx];
        flushidx++;
        set_current_component(component);
        update(component.$$);
      }
    } catch (e) {
      dirty_components.length = 0;
      flushidx = 0;
      throw e;
    }
    set_current_component(null);
    dirty_components.length = 0;
    flushidx = 0;
    while (binding_callbacks.length) binding_callbacks.pop()();
    for (let i = 0; i < render_callbacks.length; i += 1) {
      const callback = render_callbacks[i];
      if (!seen_callbacks.has(callback)) {
        seen_callbacks.add(callback);
        callback();
      }
    }
    render_callbacks.length = 0;
  } while (dirty_components.length);
  while (flush_callbacks.length) {
    flush_callbacks.pop()();
  }
  update_scheduled = false;
  seen_callbacks.clear();
  set_current_component(saved_component);
}
function update($$) {
  if ($$.fragment !== null) {
    $$.update();
    run_all($$.before_update);
    const dirty = $$.dirty;
    $$.dirty = [-1];
    $$.fragment && $$.fragment.p($$.ctx, dirty);
    $$.after_update.forEach(add_render_callback);
  }
}
function flush_render_callbacks(fns) {
  const filtered = [];
  const targets = [];
  render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
  targets.forEach((c) => c());
  render_callbacks = filtered;
}
const outroing = /* @__PURE__ */ new Set();
let outros;
function transition_in(block, local) {
  if (block && block.i) {
    outroing.delete(block);
    block.i(local);
  }
}
function transition_out(block, local, detach2, callback) {
  if (block && block.o) {
    if (outroing.has(block)) return;
    outroing.add(block);
    outros.c.push(() => {
      outroing.delete(block);
    });
    block.o(local);
  }
}
function create_component(block) {
  block && block.c();
}
function mount_component(component, target2, anchor) {
  const { fragment, after_update } = component.$$;
  fragment && fragment.m(target2, anchor);
  add_render_callback(() => {
    const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
    if (component.$$.on_destroy) {
      component.$$.on_destroy.push(...new_on_destroy);
    } else {
      run_all(new_on_destroy);
    }
    component.$$.on_mount = [];
  });
  after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
  const $$ = component.$$;
  if ($$.fragment !== null) {
    flush_render_callbacks($$.after_update);
    run_all($$.on_destroy);
    $$.fragment && $$.fragment.d(detaching);
    $$.on_destroy = $$.fragment = null;
    $$.ctx = [];
  }
}
function make_dirty(component, i) {
  if (component.$$.dirty[0] === -1) {
    dirty_components.push(component);
    schedule_update();
    component.$$.dirty.fill(0);
  }
  component.$$.dirty[i / 31 | 0] |= 1 << i % 31;
}
function init(component, options, instance2, create_fragment2, not_equal, props, append_styles = null, dirty = [-1]) {
  const parent_component = current_component;
  set_current_component(component);
  const $$ = component.$$ = {
    fragment: null,
    ctx: [],
    // state
    props,
    update: noop,
    not_equal,
    bound: blank_object(),
    // lifecycle
    on_mount: [],
    on_destroy: [],
    on_disconnect: [],
    before_update: [],
    after_update: [],
    context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
    // everything else
    callbacks: blank_object(),
    dirty,
    skip_bound: false,
    root: options.target || parent_component.$$.root
  };
  append_styles && append_styles($$.root);
  let ready = false;
  $$.ctx = instance2 ? instance2(component, options.props || {}, (i, ret, ...rest) => {
    const value = rest.length ? rest[0] : ret;
    if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
      if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
      if (ready) make_dirty(component, i);
    }
    return ret;
  }) : [];
  $$.update();
  ready = true;
  run_all($$.before_update);
  $$.fragment = create_fragment2 ? create_fragment2($$.ctx) : false;
  if (options.target) {
    if (options.hydrate) {
      const nodes = children(options.target);
      $$.fragment && $$.fragment.l(nodes);
      nodes.forEach(detach);
    } else {
      $$.fragment && $$.fragment.c();
    }
    if (options.intro) transition_in(component.$$.fragment);
    mount_component(component, options.target, options.anchor);
    flush();
  }
  set_current_component(parent_component);
}
class SvelteComponent {
  constructor() {
    /**
     * ### PRIVATE API
     *
     * Do not use, may change at any time
     *
     * @type {any}
     */
    __publicField(this, "$$");
    /**
     * ### PRIVATE API
     *
     * Do not use, may change at any time
     *
     * @type {any}
     */
    __publicField(this, "$$set");
  }
  /** @returns {void} */
  $destroy() {
    destroy_component(this, 1);
    this.$destroy = noop;
  }
  /**
   * @template {Extract<keyof Events, string>} K
   * @param {K} type
   * @param {((e: Events[K]) => void) | null | undefined} callback
   * @returns {() => void}
   */
  $on(type, callback) {
    if (!is_function(callback)) {
      return noop;
    }
    const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
    callbacks.push(callback);
    return () => {
      const index = callbacks.indexOf(callback);
      if (index !== -1) callbacks.splice(index, 1);
    };
  }
  /**
   * @param {Partial<Props>} props
   * @returns {void}
   */
  $set(props) {
    if (this.$$set && !is_empty(props)) {
      this.$$.skip_bound = true;
      this.$$set(props);
      this.$$.skip_bound = false;
    }
  }
}
const PUBLIC_VERSION = "4";
if (typeof window !== "undefined")
  (window.__svelte || (window.__svelte = { v: /* @__PURE__ */ new Set() })).v.add(PUBLIC_VERSION);
const APICURIO_STORAGE_KEY = "blockscape:apicurioConfig";
const DEFAULT_APICURIO_BASE = "http://localhost:8080/apis/registry/v3";
const DEFAULT_APICURIO_GROUP = "bs";
const SERIES_GROUP_SUFFIX = "-series";
const DEFAULT_APICURIO_ENABLED = false;
const DEFAULT_APICURIO_SEMVER_ENABLED = false;
function createApicurioIntegration({
  models,
  getActiveIndex,
  setActive,
  ensureModelMetadata,
  ensureSeriesId: ensureSeriesId2,
  getModelId,
  getSeriesId: getSeriesId2,
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
  const apicurioEnabledListeners = /* @__PURE__ */ new Set();
  const apicurioConfig = {
    baseUrl: DEFAULT_APICURIO_BASE,
    groupId: DEFAULT_APICURIO_GROUP,
    authToken: "",
    enabled: DEFAULT_APICURIO_ENABLED,
    useSemver: DEFAULT_APICURIO_SEMVER_ENABLED
  };
  const apicurioArtifactsById = /* @__PURE__ */ new Map();
  const apicurioArtifactVersions = /* @__PURE__ */ new Map();
  function sanitizeApicurioBaseUrl(value) {
    const trimmed = (value || "").toString().trim();
    return trimmed.replace(/\/+$/, "");
  }
  function deriveSeriesGroupId(groupId) {
    const base = (groupId || "").toString().trim() || DEFAULT_APICURIO_GROUP;
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
        console.warn("[Blockscape] failed to run Apicurio enabled listener", err);
      }
    });
  }
  function onApicurioEnabledChange(listener) {
    if (typeof listener === "function") {
      apicurioEnabledListeners.add(listener);
    }
    return () => apicurioEnabledListeners.delete(listener);
  }
  function syncApicurioInputsFromConfig() {
    if (apicurioUrlInput) apicurioUrlInput.value = apicurioConfig.baseUrl || "";
    if (apicurioGroupInput) apicurioGroupInput.value = apicurioConfig.groupId || "";
    if (apicurioTokenInput) apicurioTokenInput.value = apicurioConfig.authToken || "";
    if (apicurioToggleInput) apicurioToggleInput.checked = isApicurioEnabled();
    if (apicurioSemverInput) apicurioSemverInput.checked = Boolean(apicurioConfig.useSemver);
  }
  function setApicurioStatus(message = "", tone = "muted") {
    if (!apicurioStatusNode) return;
    apicurioStatusNode.textContent = message || "";
    apicurioStatusNode.classList.remove("is-error", "is-success");
    if (tone === "error") {
      apicurioStatusNode.classList.add("is-error");
    } else if (tone === "success") {
      apicurioStatusNode.classList.add("is-success");
    }
  }
  function setApicurioArtifactsMessage(message) {
    if (!apicurioArtifactsContainer) return;
    apicurioArtifactsContainer.innerHTML = "";
    if (!message) return;
    const p = document.createElement("p");
    p.className = "apicurio-hint";
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
    const hasSeries = !!((activeModel == null ? void 0 : activeModel.apicurioVersions) && activeModel.apicurioVersions.length > 1);
    if (pushApicurioButton) {
      const isBusy = pushApicurioButton.dataset.loading === "true";
      const ready = enabled && haveDetails && activeIndex >= 0 && !!resolveArtifactId(models[activeIndex]);
      pushApicurioButton.disabled = !enabled || isBusy || !ready;
      if (!enabled) {
        pushApicurioButton.textContent = "Enable Apicurio to push";
      } else if (!isBusy) {
        pushApicurioButton.textContent = "Push to Apicurio";
      }
    }
    if (pushApicurioSeriesButton) {
      const isBusy = pushApicurioSeriesButton.dataset.loading === "true";
      const ready = enabled && haveDetails && hasSeries && !!resolveArtifactId(activeModel);
      pushApicurioSeriesButton.disabled = !ready || isBusy;
      pushApicurioSeriesButton.hidden = !hasSeries;
      if (!enabled) {
        pushApicurioSeriesButton.textContent = "Enable Apicurio to push series";
      } else if (!isBusy) {
        pushApicurioSeriesButton.textContent = "Push series";
      }
    }
    if (apicurioListButton) {
      const listBusy = apicurioListButton.dataset.loading === "true";
      const listReady = enabled && haveDetails;
      apicurioListButton.disabled = !listReady || listBusy;
      if (!listBusy) {
        if (!enabled) {
          apicurioListButton.textContent = "Enable Apicurio to list";
        } else if (!haveDetails) {
          apicurioListButton.textContent = "Enter details to list";
        } else {
          apicurioListButton.textContent = "List artifacts";
        }
      }
    }
  }
  function refreshApicurioUiState() {
    syncApicurioInputsFromConfig();
    if (!isApicurioEnabled()) {
      setApicurioStatus("Apicurio integration is off. Enable it to allow pushes.", "muted");
      resetApicurioArtifactsPanel("Apicurio integration is disabled.");
    } else if (!hasApicurioDetails()) {
      setApicurioStatus("Enter Apicurio connection details to enable push.", "muted");
      resetApicurioArtifactsPanel("Enter registry details to browse artifacts.");
    } else {
      setApicurioStatus("Apicurio push is ready when a model is selected.", "muted");
      if (!apicurioArtifactsById.size) {
        setApicurioArtifactsMessage("Click “List artifacts” to browse the current group.");
      }
    }
    updateApicurioAvailability();
  }
  function persistApicurioConfig() {
    if (!(window == null ? void 0 : window.localStorage)) return;
    try {
      localStorage.setItem(APICURIO_STORAGE_KEY, JSON.stringify(apicurioConfig));
    } catch (err) {
      console.warn("[Blockscape] unable to persist Apicurio settings", err);
    }
  }
  function hydrateApicurioConfig() {
    let restored = {};
    if (window == null ? void 0 : window.localStorage) {
      try {
        const raw = localStorage.getItem(APICURIO_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            restored = parsed;
          }
        }
      } catch (err) {
        console.warn("[Blockscape] failed to restore Apicurio settings", err);
      }
    }
    const restoredBase = sanitizeApicurioBaseUrl(restored.baseUrl ?? DEFAULT_APICURIO_BASE);
    const restoredGroup = (restored.groupId ?? DEFAULT_APICURIO_GROUP).toString().trim();
    let restoredEnabled = DEFAULT_APICURIO_ENABLED;
    let restoredSemver = DEFAULT_APICURIO_SEMVER_ENABLED;
    if (typeof restored.enabled === "boolean") {
      restoredEnabled = restored.enabled;
    } else if (typeof restored.enabled === "string") {
      restoredEnabled = restored.enabled === "true";
    }
    if (typeof restored.useSemver === "boolean") {
      restoredSemver = restored.useSemver;
    } else if (typeof restored.useSemver === "string") {
      restoredSemver = restored.useSemver === "true";
    }
    apicurioConfig.baseUrl = restoredBase || DEFAULT_APICURIO_BASE;
    apicurioConfig.groupId = restoredGroup || DEFAULT_APICURIO_GROUP;
    apicurioConfig.authToken = (restored.authToken ?? "").toString().trim();
    apicurioConfig.enabled = restoredEnabled;
    apicurioConfig.useSemver = restoredSemver;
    refreshApicurioUiState();
    notifyApicurioEnabledChange();
  }
  function buildApicurioHeaders() {
    const headers = { Accept: "application/json" };
    const token = (apicurioConfig.authToken || "").trim();
    if (token) {
      headers["Authorization"] = /\s/.test(token) ? token : `Bearer ${token}`;
    }
    return headers;
  }
  function buildApicurioCreateBody(artifactId, contentText, { title, description, version } = {}) {
    const payload = {
      artifactId,
      artifactType: "JSON",
      firstVersion: {
        content: {
          contentType: "application/json",
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
    try {
      const parsed = JSON.parse(contentText);
      const seriesId = parsed == null ? void 0 : parsed.seriesId;
      if (seriesId && typeof seriesId === "string") {
        payload.firstVersion.metadata.properties.seriesId = seriesId;
      }
    } catch {
    }
    return payload;
  }
  function buildApicurioUpdateBody(contentText, { version } = {}) {
    const body = {
      content: {
        contentType: "application/json",
        content: contentText
      },
      metadata: {
        properties: {}
      }
    };
    try {
      const parsed = JSON.parse(contentText);
      const seriesId = parsed == null ? void 0 : parsed.seriesId;
      if (seriesId && typeof seriesId === "string") {
        body.metadata.properties.seriesId = seriesId;
      }
    } catch {
    }
    if (version) body.version = version;
    return body;
  }
  function parseApicurioSemver(value) {
    if (value == null) return null;
    const text2 = String(value).trim();
    if (!text2) return null;
    const fullMatch = /^v?(\d+)\.(\d+)\.(\d+)(?:-.+)?$/.exec(text2);
    if (fullMatch) {
      return {
        major: Number(fullMatch[1]),
        minor: Number(fullMatch[2]),
        patch: Number(fullMatch[3])
      };
    }
    const majorOnly = /^v?(\d+)$/.exec(text2);
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
      const parsed = parseApicurioSemver((entry == null ? void 0 : entry.version) ?? entry);
      if (!parsed) return;
      if (!latest || compareSemverParts(parsed, latest) > 0) {
        latest = parsed;
      }
    });
    if (!latest) return "1.0.0";
    const bumped = { ...latest, patch: latest.patch + 1 };
    return formatSemverParts(bumped);
  }
  function resolveArtifactId(entry, { seriesName, fallbackTitle } = {}) {
    var _a;
    if (!entry) return null;
    const resolvedName = seriesName || entry.title || entry.apicurioArtifactName || getModelTitle(entry);
    const resolvedFallback = fallbackTitle || resolvedName;
    if (typeof ensureSeriesId2 === "function" && (entry.isSeries || ((_a = entry.apicurioVersions) == null ? void 0 : _a.length) > 1)) {
      ensureSeriesId2(entry, { seriesName: resolvedName, fallbackTitle: resolvedFallback });
    }
    if (typeof getSeriesId2 === "function") {
      const seriesId = getSeriesId2(entry, { seriesName: resolvedName, fallbackTitle: resolvedFallback });
      if (seriesId) return seriesId;
    }
    return getModelId(entry);
  }
  function normalizeApicurioArtifactsPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload == null ? void 0 : payload.artifacts)) return payload.artifacts;
    if (Array.isArray(payload == null ? void 0 : payload.items)) return payload.items;
    if (Array.isArray(payload == null ? void 0 : payload.results)) return payload.results;
    return [];
  }
  function normalizeApicurioVersionsPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload == null ? void 0 : payload.versions)) return payload.versions;
    if (Array.isArray(payload == null ? void 0 : payload.items)) return payload.items;
    return [];
  }
  function pickLatestVersionEntry(versions = []) {
    if (!Array.isArray(versions) || !versions.length) return null;
    const copy = [...versions].filter(Boolean);
    copy.sort((a, b) => {
      const aDate = (a == null ? void 0 : a.createdOn) ? new Date(a.createdOn).getTime() : 0;
      const bDate = (b == null ? void 0 : b.createdOn) ? new Date(b.createdOn).getTime() : 0;
      if (aDate !== bDate) return bDate - aDate;
      const aVersionNum = Number(a == null ? void 0 : a.version);
      const bVersionNum = Number(b == null ? void 0 : b.version);
      const aNumValid = Number.isFinite(aVersionNum);
      const bNumValid = Number.isFinite(bVersionNum);
      if (aNumValid && bNumValid && aVersionNum !== bVersionNum) {
        return bVersionNum - aVersionNum;
      }
      const aVer = String((a == null ? void 0 : a.version) ?? "");
      const bVer = String((b == null ? void 0 : b.version) ?? "");
      return bVer.localeCompare(aVer, void 0, { numeric: true });
    });
    return copy[0] || null;
  }
  function normalizeArtifactContentPayload(payload) {
    if (!payload) return payload;
    let data = payload;
    const topHasCategories = Array.isArray(payload == null ? void 0 : payload.categories);
    if (!topHasCategories) {
      const embedded = payload == null ? void 0 : payload.content;
      if (typeof embedded === "string") {
        try {
          data = JSON.parse(embedded);
        } catch (err) {
          console.warn("[Blockscape] artifact payload contained string content that could not be parsed", err);
        }
      } else if (embedded && typeof embedded === "object") {
        data = embedded;
      }
    }
    return data;
  }
  async function fetchApicurioArtifactMetadata(baseUrl, groupId, artifactId) {
    const encodedGroup = encodeURIComponent(groupId);
    const encodedId = encodeURIComponent(artifactId);
    const target2 = `${baseUrl}/groups/${encodedGroup}/artifacts/${encodedId}`;
    const headers = buildApicurioHeaders();
    headers["Accept"] = "application/json";
    const resp = await fetch(target2, { method: "GET", headers });
    if (!resp.ok) {
      let detail = resp.statusText || "Unknown error";
      try {
        const text2 = await resp.text();
        if (text2) detail = text2.slice(0, 400);
      } catch {
      }
      throw new Error(`Failed to fetch artifact metadata (${resp.status}): ${detail}`);
    }
    return resp.json();
  }
  async function fetchApicurioArtifactVersions(baseUrl, groupId, artifactId) {
    const encodedGroup = encodeURIComponent(groupId);
    const encodedId = encodeURIComponent(artifactId);
    const target2 = `${baseUrl}/groups/${encodedGroup}/artifacts/${encodedId}/versions?limit=50&order=desc`;
    const headers = buildApicurioHeaders();
    headers["Accept"] = "application/json";
    const resp = await fetch(target2, { method: "GET", headers });
    if (!resp.ok) {
      let detail = resp.statusText || "Unknown error";
      try {
        const text2 = await resp.text();
        if (text2) detail = text2.slice(0, 400);
      } catch {
      }
      throw new Error(`Failed to fetch artifact versions (${resp.status}): ${detail}`);
    }
    const payload = await resp.json();
    return normalizeApicurioVersionsPayload(payload).filter((v) => v && v.version != null);
  }
  async function fetchApicurioArtifactContent(baseUrl, groupId, artifactId, versionSegment = "latest") {
    const encodedGroup = encodeURIComponent(groupId);
    const encodedId = encodeURIComponent(artifactId);
    const encodedVersion = encodeURIComponent(versionSegment || "latest");
    const contentEndpoint = `${baseUrl}/groups/${encodedGroup}/artifacts/${encodedId}/versions/${encodedVersion}/content`;
    const headers = buildApicurioHeaders();
    headers["Accept"] = "application/json, application/*+json, */*;q=0.8";
    const resp = await fetch(contentEndpoint, { method: "GET", headers });
    if (!resp.ok) {
      let detail = resp.statusText || "Unknown error";
      try {
        const text3 = await resp.text();
        if (text3) detail = text3.slice(0, 400);
      } catch {
      }
      throw new Error(`Failed to load artifact content (${resp.status}): ${detail}`);
    }
    const text2 = await resp.text();
    let data = null;
    try {
      data = JSON.parse(text2);
    } catch {
      throw new Error("Artifact content is not valid JSON.");
    }
    return normalizeArtifactContentPayload(data);
  }
  async function fetchApicurioArtifactFingerprint(baseUrl, groupId, artifactId, versionSegment = "latest") {
    const data = await fetchApicurioArtifactContent(baseUrl, groupId, artifactId, versionSegment);
    return {
      data,
      fingerprint: computeJsonFingerprint(data)
    };
  }
  async function resolveApicurioCompareVersion(baseUrl, groupId, artifactId) {
    try {
      const versions = await fetchApicurioArtifactVersions(baseUrl, groupId, artifactId);
      if (versions == null ? void 0 : versions.length) {
        apicurioArtifactVersions.set(artifactId, versions);
        const newestEntry = pickLatestVersionEntry(versions);
        if ((newestEntry == null ? void 0 : newestEntry.version) != null) return newestEntry.version;
      }
    } catch (err) {
      console.warn("[Blockscape] compare-version: unable to fetch versions list", err);
    }
    try {
      const meta = await fetchApicurioArtifactMetadata(baseUrl, groupId, artifactId);
      if ((meta == null ? void 0 : meta.version) != null) return meta.version;
    } catch (err) {
      console.warn("[Blockscape] compare-version: unable to fetch metadata", err);
    }
    const cached = apicurioArtifactVersions.get(artifactId);
    if (cached && cached.length) {
      const newestCached = pickLatestVersionEntry(cached);
      if ((newestCached == null ? void 0 : newestCached.version) != null) return newestCached.version;
    }
    return "latest";
  }
  async function resolveApicurioSemverTarget(baseUrl, groupId, artifactId, exists) {
    if (!apicurioConfig.useSemver) return null;
    if (!exists) return "1.0.0";
    try {
      const versions = await fetchApicurioArtifactVersions(baseUrl, groupId, artifactId);
      return computeNextSemverVersion(versions);
    } catch (err) {
      throw new Error(`Unable to compute next semantic version: ${err.message}`);
    }
  }
  function bindApicurioElements(scope = document) {
    pushApicurioButton = scope.querySelector("#pushApicurio") || document.getElementById("pushApicurio");
    pushApicurioSeriesButton = scope.querySelector("#pushApicurioSeries") || document.getElementById("pushApicurioSeries");
    apicurioListButton = scope.querySelector("#listApicurioArtifacts") || document.getElementById("listApicurioArtifacts");
    apicurioUrlInput = scope.querySelector("#apicurioUrl") || document.getElementById("apicurioUrl");
    apicurioGroupInput = scope.querySelector("#apicurioGroup") || document.getElementById("apicurioGroup");
    apicurioTokenInput = scope.querySelector("#apicurioToken") || document.getElementById("apicurioToken");
    apicurioToggleInput = scope.querySelector("#apicurioToggle") || document.getElementById("apicurioToggle");
    apicurioSemverInput = scope.querySelector("#apicurioSemver") || document.getElementById("apicurioSemver");
    apicurioStatusNode = scope.querySelector("#apicurioStatus") || document.getElementById("apicurioStatus");
    apicurioArtifactsContainer = scope.querySelector("#apicurioArtifacts") || document.getElementById("apicurioArtifacts");
  }
  function handleApicurioInputChange() {
    apicurioConfig.baseUrl = sanitizeApicurioBaseUrl((apicurioUrlInput == null ? void 0 : apicurioUrlInput.value) ?? apicurioConfig.baseUrl);
    apicurioConfig.groupId = ((apicurioGroupInput == null ? void 0 : apicurioGroupInput.value) ?? "").trim();
    apicurioConfig.authToken = ((apicurioTokenInput == null ? void 0 : apicurioTokenInput.value) ?? "").trim();
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
      input.addEventListener("input", handleApicurioInputChange);
    });
    if (pushApicurioButton) {
      pushApicurioButton.addEventListener("click", () => {
        pushActiveModelToApicurio();
      });
    }
    if (pushApicurioSeriesButton) {
      pushApicurioSeriesButton.addEventListener("click", () => {
        pushActiveSeriesToApicurio();
      });
    }
    if (apicurioToggleInput) {
      apicurioToggleInput.addEventListener("change", handleApicurioToggleChange);
    }
    if (apicurioSemverInput) {
      apicurioSemverInput.addEventListener("change", handleApicurioSemverToggleChange);
    }
    if (apicurioListButton) {
      apicurioListButton.addEventListener("click", listApicurioArtifacts);
    }
    if (apicurioArtifactsContainer) {
      apicurioArtifactsContainer.addEventListener("click", (event) => {
        const versionButton = event.target.closest("[data-artifact-version]");
        if (versionButton) {
          event.stopPropagation();
          const artifactId = versionButton.dataset.artifactId;
          const version = versionButton.dataset.artifactVersion;
          if (artifactId && version) {
            loadApicurioArtifact(artifactId, version);
          }
          return;
        }
        const loadAllButton = event.target.closest("[data-artifact-load-all]");
        if (loadAllButton) {
          event.stopPropagation();
          const artifactId = loadAllButton.dataset.artifactId;
          if (artifactId) {
            loadAllApicurioArtifactVersions();
          }
          return;
        }
        const artifactTrigger = event.target.closest("[data-artifact-trigger]");
        if (artifactTrigger) {
          const artifactId = artifactTrigger.dataset.artifactId;
          if (!artifactId) return;
          toggleArtifactVersions(artifactId);
        }
      });
    }
  }
  function createApicurioPanelContent() {
    const wrapper = document.createElement("div");
    wrapper.className = "blockscape-registry-panel";
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
    panelNode.innerHTML = "";
    const content = createApicurioPanelContent();
    panelNode.appendChild(content);
    bindApicurioElements(panelNode);
    attachApicurioEventHandlers();
    refreshApicurioUiState();
  }
  function renderApicurioArtifactsList(entries) {
    if (!apicurioArtifactsContainer) return;
    apicurioArtifactsContainer.innerHTML = "";
    if (!entries.length) {
      setApicurioArtifactsMessage("No artifacts found in this group.");
      return;
    }
    const makeSection = (label) => {
      const section = document.createElement("section");
      section.className = "apicurio-artifact-section";
      const heading = document.createElement("h3");
      heading.textContent = label;
      section.appendChild(heading);
      const list = document.createElement("ul");
      list.className = "apicurio-artifact-list";
      section.appendChild(list);
      return { section, list };
    };
    const seriesSection = makeSection("Series artifacts");
    const baseSection = makeSection("Artifacts");
    entries.forEach((entry) => {
      if (!(entry == null ? void 0 : entry.artifactId)) return;
      const isSeriesGroup = entry._groupId && entry._groupId.endsWith(SERIES_GROUP_SUFFIX);
      const targetList = isSeriesGroup ? seriesSection.list : baseSection.list;
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "apicurio-artifact";
      button.dataset.artifactId = entry.artifactId;
      button.dataset.artifactTrigger = "toggle";
      const title = document.createElement("span");
      title.className = "apicurio-artifact-title";
      title.textContent = entry.artifactId;
      button.appendChild(title);
      const metaParts = [];
      if (entry.name) metaParts.push(entry.name);
      if (entry.version != null) metaParts.push(`v${entry.version}`);
      if (entry.type) metaParts.push(entry.type);
      if (entry._groupId) metaParts.push(entry._groupId);
      if (metaParts.length) {
        const meta = document.createElement("span");
        meta.className = "apicurio-artifact-meta";
        meta.textContent = metaParts.join(" • ");
        button.appendChild(meta);
      }
      if (entry.description) {
        const desc = document.createElement("span");
        desc.className = "apicurio-artifact-meta";
        desc.textContent = entry.description;
        button.appendChild(desc);
      }
      li.appendChild(button);
      const versionPanel = document.createElement("div");
      versionPanel.className = "apicurio-version-list";
      versionPanel.dataset.versionPanel = entry.artifactId;
      versionPanel.hidden = true;
      const hint = document.createElement("p");
      hint.className = "apicurio-hint";
      hint.textContent = "Click to load the latest or open versions.";
      versionPanel.appendChild(hint);
      li.appendChild(versionPanel);
      targetList.appendChild(li);
    });
    if (seriesSection.list.children.length) apicurioArtifactsContainer.appendChild(seriesSection.section);
    if (baseSection.list.children.length) apicurioArtifactsContainer.appendChild(baseSection.section);
  }
  function getApicurioVersionPanel(artifactId) {
    if (!apicurioArtifactsContainer) return null;
    return apicurioArtifactsContainer.querySelector(`[data-version-panel="${artifactId}"]`);
  }
  function setVersionPanelMessage(panel, message) {
    if (!panel) return;
    panel.innerHTML = "";
    if (!message) return;
    const p = document.createElement("p");
    p.className = "apicurio-hint";
    p.textContent = message;
    panel.appendChild(p);
  }
  function renderApicurioVersionButtons(artifactId, versions) {
    const panel = getApicurioVersionPanel(artifactId);
    if (!panel) return;
    panel.innerHTML = "";
    if (!versions.length) {
      setVersionPanelMessage(panel, "No versions found for this artifact.");
      return;
    }
    versions.forEach((ver) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "apicurio-version-button";
      btn.dataset.artifactId = artifactId;
      btn.dataset.artifactVersion = ver.version;
      const labelParts = [`Version ${ver.version}`];
      if (ver.createdOn) {
        const dt = new Date(ver.createdOn);
        if (!isNaN(dt)) {
          labelParts.push(dt.toISOString().slice(0, 10));
        }
      }
      btn.textContent = labelParts.join(" — ");
      panel.appendChild(btn);
    });
  }
  async function toggleArtifactVersions(artifactId) {
    const panel = getApicurioVersionPanel(artifactId);
    if (!panel) return;
    const isOpen = panel.dataset.open === "true";
    if (isOpen) {
      panel.hidden = true;
      panel.dataset.open = "false";
      return;
    }
    panel.hidden = false;
    panel.dataset.open = "true";
    if (panel.dataset.loaded === "true") return;
    if (!hasApicurioDetails()) {
      setVersionPanelMessage(panel, "Enter registry details first.");
      return;
    }
    setVersionPanelMessage(panel, "Loading versions…");
    try {
      const baseUrl = sanitizeApicurioBaseUrl(apicurioConfig.baseUrl);
      const metaEntry = apicurioArtifactsById.get(artifactId);
      const baseGroupId = apicurioConfig.groupId.trim();
      const groupId = (metaEntry == null ? void 0 : metaEntry._groupId) || baseGroupId;
      const versions = await fetchApicurioArtifactVersions(baseUrl, groupId, artifactId);
      apicurioArtifactVersions.set(artifactId, versions);
      panel.dataset.loaded = "true";
      renderApicurioVersionButtons(artifactId, versions);
    } catch (err) {
      console.error("[Blockscape] failed to load versions", err);
      setVersionPanelMessage(panel, `Unable to fetch versions: ${err.message}`);
    }
  }
  function upsertModelEntryForArtifact(artifactId, entry) {
    var _a;
    const existingIndex = models.findIndex((m) => m.apicurioArtifactId === artifactId);
    if (existingIndex !== -1) {
      const preservedId = models[existingIndex].id;
      models[existingIndex] = { ...entry, id: preservedId || entry.id };
      if (((_a = models[existingIndex].apicurioVersions) == null ? void 0 : _a.length) > 1) {
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
    const target2 = `${baseUrl}/groups/${encodedGroup}/artifacts/${encodedId}`;
    try {
      const resp = await fetch(target2, { method: "GET", headers });
      if (resp.status === 404) return false;
      if (resp.ok) return true;
      if (resp.status === 401 || resp.status === 403) {
        throw new Error("Authentication failed while checking the registry.");
      }
      throw new Error(`Registry responded with status ${resp.status} while checking the artifact.`);
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error("Network error while contacting Apicurio registry.");
      }
      throw err;
    }
  }
  async function pushActiveModelToApicurio() {
    var _a;
    if (!pushApicurioButton || pushApicurioButton.dataset.loading === "true") return;
    if (!isApicurioEnabled()) {
      setApicurioStatus("Apicurio integration is off. Enable it first.", "error");
      return;
    }
    if (!hasApicurioDetails()) {
      setApicurioStatus("Enter the registry base URL and group ID before pushing.", "error");
      return;
    }
    const activeIndex = getActiveIndex();
    if (activeIndex < 0 || !models[activeIndex]) {
      setApicurioStatus("No active model to push.", "error");
      return;
    }
    const artifactId = resolveArtifactId(models[activeIndex], { fallbackTitle: getModelTitle(models[activeIndex]) });
    if (!artifactId) {
      setApicurioStatus("Active model needs an id before pushing.", "error");
      return;
    }
    const baseUrl = sanitizeApicurioBaseUrl(apicurioConfig.baseUrl);
    const groupId = apicurioConfig.groupId.trim();
    const payload = JSON.stringify(models[activeIndex].data, null, 2);
    const headers = buildApicurioHeaders();
    pushApicurioButton.dataset.loading = "true";
    pushApicurioButton.textContent = "Pushing…";
    pushApicurioButton.disabled = true;
    setApicurioStatus("Pushing to Apicurio…", "muted");
    try {
      const exists = await apicurioArtifactExists(baseUrl, groupId, artifactId, headers);
      const localFingerprint = computeJsonFingerprint(models[activeIndex].data);
      if (exists) {
        try {
          const compareVersion = await resolveApicurioCompareVersion(baseUrl, groupId, artifactId);
          const { data: registryData, fingerprint: registryFingerprint } = await fetchApicurioArtifactFingerprint(baseUrl, groupId, artifactId, compareVersion);
          console.group("[Blockscape] Apicurio push compare");
          console.log("compare version", compareVersion);
          console.log("local fingerprint", localFingerprint);
          console.log("registry fingerprint", registryFingerprint);
          console.log("local payload", models[activeIndex].data);
          console.log("registry payload", registryData);
          console.groupEnd();
          if (localFingerprint && registryFingerprint && localFingerprint === registryFingerprint) {
            const proceed = window.confirm("The current registry version is identical to this model. Push anyway?");
            if (!proceed) {
              setApicurioStatus("Push cancelled (content matches the latest registry version).", "muted");
              return;
            }
            setApicurioStatus("Pushing identical content by user choice.", "muted");
          } else if (!registryFingerprint) {
            setApicurioStatus("Unable to compare with registry content (skipping confirmation).", "muted");
          } else {
            console.log("[Blockscape] Apicurio compare mismatch (proceeding with push)");
          }
        } catch (compareError) {
          console.warn("[Blockscape] unable to compare registry content before push", compareError);
          setApicurioStatus("Skipped comparison with registry (content fetch failed). Proceeding with push.", "muted");
        }
      }
      const targetVersion = apicurioConfig.useSemver ? await resolveApicurioSemverTarget(baseUrl, groupId, artifactId, exists) : null;
      if (apicurioConfig.useSemver && !targetVersion) {
        throw new Error("Semantic versioning is enabled but no version could be computed.");
      }
      const encodedGroup = encodeURIComponent(groupId);
      const encodedId = encodeURIComponent(artifactId);
      const endpoint = exists ? `${baseUrl}/groups/${encodedGroup}/artifacts/${encodedId}/versions` : `${baseUrl}/groups/${encodedGroup}/artifacts`;
      const requestHeaders = {
        ...headers,
        "Content-Type": "application/json"
      };
      if (targetVersion) {
        requestHeaders["X-Registry-Version"] = targetVersion;
        setApicurioStatus(`Pushing to Apicurio as version ${targetVersion}…`, "muted");
      }
      const bodyObject = exists ? buildApicurioUpdateBody(payload, { version: targetVersion }) : buildApicurioCreateBody(artifactId, payload, {
        title: getModelTitle(models[activeIndex]),
        description: (_a = models[activeIndex].data) == null ? void 0 : _a.abstract,
        version: targetVersion
      });
      const response = await fetch(endpoint, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(bodyObject)
      });
      if (!response.ok) {
        let detail = response.statusText || "Unknown error";
        try {
          const text2 = await response.text();
          if (text2) detail = text2.slice(0, 400);
        } catch {
        }
        throw new Error(`Registry rejected the push (${response.status}): ${detail}`);
      }
      let info = null;
      try {
        info = await response.json();
      } catch {
        info = null;
      }
      const label = (info == null ? void 0 : info.version) || (info == null ? void 0 : info.globalId) || "";
      const prefix = exists ? "Updated" : "Created";
      const suffix = label ? ` (version ${label})` : "";
      setApicurioStatus(`${prefix} ${artifactId}${suffix}`, "success");
    } catch (error) {
      console.error("[Blockscape] Apicurio push failed", error);
      setApicurioStatus(`Apicurio push failed: ${error.message}`, "error");
    } finally {
      pushApicurioButton.dataset.loading = "false";
      updateApicurioAvailability();
    }
  }
  async function pushActiveSeriesToApicurio() {
    var _a, _b;
    if (!pushApicurioSeriesButton || pushApicurioSeriesButton.dataset.loading === "true") return;
    if (!isApicurioEnabled()) {
      setApicurioStatus("Apicurio integration is off. Enable it first.", "error");
      return;
    }
    if (!hasApicurioDetails()) {
      setApicurioStatus("Enter the registry base URL and group ID before pushing.", "error");
      return;
    }
    const activeIndex = getActiveIndex();
    const activeEntry = activeIndex >= 0 ? models[activeIndex] : null;
    if (!activeEntry || !activeEntry.apicurioVersions || activeEntry.apicurioVersions.length < 2) {
      setApicurioStatus("Series push requires a model with multiple versions.", "error");
      return;
    }
    const artifactId = resolveArtifactId(activeEntry, { seriesName: activeEntry.title || activeEntry.apicurioArtifactName || getModelTitle(activeEntry) });
    if (!artifactId) {
      setApicurioStatus("Active series needs an id before pushing.", "error");
      return;
    }
    if (typeof ensureSeriesId2 === "function") {
      ensureSeriesId2(activeEntry, { seriesName: activeEntry.title || activeEntry.apicurioArtifactName || getModelTitle(activeEntry) });
    }
    const baseUrl = sanitizeApicurioBaseUrl(apicurioConfig.baseUrl);
    const baseGroupId = apicurioConfig.groupId.trim();
    const payloadArray = activeEntry.apicurioVersions.map((v) => v.data);
    const payload = JSON.stringify(payloadArray, null, 2);
    const headers = buildApicurioHeaders();
    const seriesGroupId = deriveSeriesGroupId(baseGroupId);
    pushApicurioSeriesButton.dataset.loading = "true";
    pushApicurioSeriesButton.textContent = "Pushing…";
    pushApicurioSeriesButton.disabled = true;
    setApicurioStatus("Pushing series to Apicurio…", "muted");
    try {
      const exists = await apicurioArtifactExists(baseUrl, seriesGroupId, artifactId, headers);
      const localFingerprint = computeJsonFingerprint(payloadArray);
      if (exists) {
        try {
          const compareVersion = await resolveApicurioCompareVersion(baseUrl, seriesGroupId, artifactId);
          const { data: registryData, fingerprint: registryFingerprint } = await fetchApicurioArtifactFingerprint(baseUrl, seriesGroupId, artifactId, compareVersion);
          console.group("[Blockscape] Apicurio series push compare");
          console.log("compare version", compareVersion);
          console.log("local fingerprint", localFingerprint);
          console.log("registry fingerprint", registryFingerprint);
          console.log("local payload (series)", payloadArray);
          console.log("registry payload", registryData);
          console.groupEnd();
          if (localFingerprint && registryFingerprint && localFingerprint === registryFingerprint) {
            const proceed = window.confirm("The current registry version matches this series. Push anyway?");
            if (!proceed) {
              setApicurioStatus("Series push cancelled (content matches latest).", "muted");
              return;
            }
            setApicurioStatus("Pushing identical series by user choice.", "muted");
          } else if (!registryFingerprint) {
            setApicurioStatus("Unable to compare with registry content (skipping confirmation).", "muted");
          } else {
            console.log("[Blockscape] Apicurio compare mismatch (proceeding with series push)");
          }
        } catch (compareError) {
          console.warn("[Blockscape] unable to compare registry content before series push", compareError);
          setApicurioStatus("Skipped comparison with registry (content fetch failed). Proceeding with series push.", "muted");
        }
      }
      const targetVersion = apicurioConfig.useSemver ? await resolveApicurioSemverTarget(baseUrl, seriesGroupId, artifactId, exists) : null;
      if (apicurioConfig.useSemver && !targetVersion) {
        throw new Error("Semantic versioning is enabled but no version could be computed.");
      }
      const encodedGroup = encodeURIComponent(seriesGroupId);
      const encodedId = encodeURIComponent(artifactId);
      const endpoint = exists ? `${baseUrl}/groups/${encodedGroup}/artifacts/${encodedId}/versions` : `${baseUrl}/groups/${encodedGroup}/artifacts`;
      const requestHeaders = {
        ...headers,
        "Content-Type": "application/json"
      };
      if (targetVersion) {
        requestHeaders["X-Registry-Version"] = targetVersion;
        setApicurioStatus(`Pushing series to Apicurio as version ${targetVersion}…`, "muted");
      }
      const bodyObject = exists ? buildApicurioUpdateBody(payload, { version: targetVersion }) : buildApicurioCreateBody(artifactId, payload, {
        title: activeEntry.apicurioArtifactName || ((_a = activeEntry.data) == null ? void 0 : _a.title) || artifactId,
        description: (_b = activeEntry.data) == null ? void 0 : _b.abstract,
        version: targetVersion
      });
      const response = await fetch(endpoint, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(bodyObject)
      });
      if (!response.ok) {
        let detail = response.statusText || "Unknown error";
        try {
          const text2 = await response.text();
          if (text2) detail = text2.slice(0, 400);
        } catch {
        }
        throw new Error(`Registry rejected the series push (${response.status}): ${detail}`);
      }
      let info = null;
      try {
        info = await response.json();
      } catch {
        info = null;
      }
      const label = (info == null ? void 0 : info.version) || (info == null ? void 0 : info.globalId) || "";
      const prefix = exists ? "Updated" : "Created";
      const suffix = label ? ` (version ${label})` : "";
      setApicurioStatus(`${prefix} ${artifactId} series${suffix}`, "success");
    } catch (error) {
      console.error("[Blockscape] Apicurio series push failed", error);
      setApicurioStatus(`Apicurio series push failed: ${error.message}`, "error");
    } finally {
      pushApicurioSeriesButton.dataset.loading = "false";
      updateApicurioAvailability();
    }
  }
  async function listApicurioArtifacts() {
    if (!apicurioListButton || apicurioListButton.dataset.loading === "true") return;
    if (!isApicurioEnabled()) {
      setApicurioStatus("Enable Apicurio integration to list artifacts.", "error");
      return;
    }
    if (!hasApicurioDetails()) {
      setApicurioStatus("Enter registry base URL and group ID before listing.", "error");
      return;
    }
    const baseUrl = sanitizeApicurioBaseUrl(apicurioConfig.baseUrl);
    const baseGroupId = apicurioConfig.groupId.trim();
    const seriesGroupId = deriveSeriesGroupId(baseGroupId);
    const targets = [
      { groupId: baseGroupId, label: "base" },
      { groupId: seriesGroupId, label: "series" }
    ];
    apicurioListButton.dataset.loading = "true";
    apicurioListButton.textContent = "Listing…";
    apicurioListButton.disabled = true;
    setApicurioStatus("Listing artifacts…", "muted");
    setApicurioArtifactsMessage("Contacting registry…");
    try {
      const headers = buildApicurioHeaders();
      headers["Accept"] = "application/json";
      const allEntries = [];
      for (const target2 of targets) {
        const encodedGroup = encodeURIComponent(target2.groupId);
        const endpoint = `${baseUrl}/groups/${encodedGroup}/artifacts?limit=50&offset=0`;
        const resp = await fetch(endpoint, { method: "GET", headers });
        if (!resp.ok) {
          let detail = resp.statusText || "Unknown error";
          try {
            const text2 = await resp.text();
            if (text2) detail = text2.slice(0, 400);
          } catch {
          }
          console.warn(`[Blockscape] failed to list artifacts for group ${target2.groupId} (${resp.status}): ${detail}`);
          continue;
        }
        const payload = await resp.json();
        const entries = normalizeApicurioArtifactsPayload(payload).filter((item) => item && item.artifactId);
        entries.forEach((item) => {
          if (item) item._groupId = target2.groupId;
        });
        allEntries.push(...entries);
      }
      apicurioArtifactsById.clear();
      apicurioArtifactVersions.clear();
      allEntries.forEach((item) => {
        if (item == null ? void 0 : item.artifactId) {
          apicurioArtifactsById.set(item.artifactId, item);
        }
      });
      renderApicurioArtifactsList(allEntries);
      const count = allEntries.length;
      setApicurioStatus(count ? `Found ${count} artifact${count === 1 ? "" : "s"} across base and series groups.` : "No artifacts found in base/series groups.", count ? "success" : "muted");
    } catch (err) {
      console.error("[Blockscape] failed to list artifacts", err);
      resetApicurioArtifactsPanel("Unable to list artifacts.");
      setApicurioStatus(`Listing failed: ${err.message}`, "error");
    } finally {
      apicurioListButton.dataset.loading = "false";
      updateApicurioAvailability();
    }
  }
  async function loadApicurioArtifact(artifactId, explicitVersion = null) {
    var _a, _b, _c, _d, _e, _f;
    if (!artifactId) return;
    if (!isApicurioEnabled()) {
      setApicurioStatus("Enable Apicurio integration to load artifacts.", "error");
      return;
    }
    if (!hasApicurioDetails()) {
      setApicurioStatus("Enter registry connection details before loading artifacts.", "error");
      return;
    }
    const baseUrl = sanitizeApicurioBaseUrl(apicurioConfig.baseUrl);
    const baseGroupId = apicurioConfig.groupId.trim();
    const groupId = artifactId && ((_a = apicurioArtifactsById.get(artifactId)) == null ? void 0 : _a._groupId) || baseGroupId;
    let meta = apicurioArtifactsById.get(artifactId);
    const ensureMetadata = async () => {
      try {
        const fresh = await fetchApicurioArtifactMetadata(baseUrl, groupId, artifactId);
        if (fresh == null ? void 0 : fresh.artifactId) {
          apicurioArtifactsById.set(artifactId, fresh);
        }
        return fresh;
      } catch (err) {
        console.error("[Blockscape] failed to fetch artifact metadata before loading", err);
        throw err;
      }
    };
    if (!meta) {
      try {
        meta = await ensureMetadata();
      } catch (err) {
        setApicurioStatus(`Failed to fetch artifact metadata: ${err.message}`, "error");
        return;
      }
    }
    const knownVersions = apicurioArtifactVersions.get(artifactId) || [];
    let versionSegment = "latest";
    let versionLabel = "latest";
    if (explicitVersion) {
      versionSegment = explicitVersion;
      versionLabel = explicitVersion;
    } else {
      if (!meta || meta.version == null) {
        try {
          meta = await ensureMetadata();
        } catch (err) {
          setApicurioStatus(`Failed to fetch artifact metadata: ${err.message}`, "error");
          return;
        }
      }
      versionSegment = (meta == null ? void 0 : meta.version) || "latest";
      versionLabel = (meta == null ? void 0 : meta.version) || "latest";
    }
    const matchedVersion = knownVersions.find((v) => String(v.version) === String(versionSegment));
    if ((matchedVersion == null ? void 0 : matchedVersion.version) != null) {
      versionLabel = matchedVersion.version;
    }
    setApicurioStatus(`Loading artifact ${artifactId}…`, "muted");
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
            createdOn: (matchedVersion == null ? void 0 : matchedVersion.createdOn) || resolvedMeta.createdOn
          };
        });
        entry = {
          id: uid(),
          title: ((_c = (_b = seriesVersions[0]) == null ? void 0 : _b.data) == null ? void 0 : _c.title) || resolvedMeta.name || artifactId,
          data: (_d = seriesVersions[0]) == null ? void 0 : _d.data,
          apicurioArtifactId: artifactId,
          apicurioArtifactName: resolvedMeta.name || "",
          apicurioVersions: seriesVersions,
          apicurioActiveVersionIndex: 0,
          isSeries: true
        };
        const seriesId = ((_e = resolvedMeta == null ? void 0 : resolvedMeta.properties) == null ? void 0 : _e.seriesId) || artifactId;
        if (typeof ensureSeriesId2 === "function") {
          ensureSeriesId2(entry, { seriesName: seriesId, fallbackTitle: seriesId });
        }
        setApicurioStatus(`Loaded series artifact ${artifactId}.`, "success");
      } else {
        ensureModelMetadata(data, { titleHint: resolvedMeta.name || artifactId, idHint: artifactId });
        const versionEntry = {
          version: versionLabel,
          data,
          createdOn: (matchedVersion == null ? void 0 : matchedVersion.createdOn) || resolvedMeta.createdOn
        };
        entry = {
          id: uid(),
          title: data.title || resolvedMeta.name || artifactId,
          data,
          apicurioArtifactId: artifactId,
          apicurioArtifactName: resolvedMeta.name || "",
          apicurioVersions: [versionEntry],
          apicurioActiveVersionIndex: 0
        };
        const seriesId = (_f = resolvedMeta == null ? void 0 : resolvedMeta.properties) == null ? void 0 : _f.seriesId;
        if (seriesId && typeof ensureSeriesId2 === "function") {
          ensureSeriesId2(entry, { seriesName: seriesId, fallbackTitle: seriesId });
        }
        const suffix = versionLabel ? ` (version ${versionLabel})` : "";
        setApicurioStatus(`Loaded artifact ${artifactId}${suffix}.`, "success");
      }
      upsertModelEntryForArtifact(artifactId, entry);
    } catch (err) {
      console.error("[Blockscape] failed to load artifact", err);
      setApicurioStatus(`Failed to load artifact: ${err.message}`, "error");
    }
  }
  async function loadAllApicurioArtifactVersions(artifactId) {
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
const tokens = {
  "color": {
    "borderMuted": "#e5e7eb",
    "surfaceGhost": "#f8fafc",
    "primary": "#2563eb",
    "dangerStrong": "#b42318",
    "success": "#22c55e",
    "ink": "#111111",
    "white": "#ffffff"
  },
  "blockscape": {
    "revdep": "#ef4444"
  },
  "palette": {
    "letter": {
      "A": "#0284c7",
      "B": "#3b82f6",
      "C": "#06b6d4",
      "D": "#a855f7",
      "E": "#f59e0b",
      "F": "#f97316",
      "G": "#22c55e",
      "H": "#84cc16",
      "I": "#10b981",
      "J": "#14b8a6",
      "K": "#0ea5e9",
      "L": "#60a5fa",
      "M": "#8b5cf6",
      "N": "#d946ef",
      "O": "#e879f9",
      "P": "#67e8f9",
      "Q": "#4ade80",
      "R": "#facc15",
      "S": "#eab308",
      "T": "#a3e635",
      "U": "#22d3ee",
      "V": "#38bdf8",
      "W": "#818cf8",
      "X": "#a78bfa",
      "Y": "#f472b6",
      "Z": "#fb7185"
    },
    "letterFallback": "#9ca3af"
  }
};
function assertFn(fn, name) {
  if (typeof fn !== "function") {
    throw new Error(`[itemEditor] expected ${name} to be a function`);
  }
}
function defaultMakeSlug(base) {
  return (base || "item").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "item";
}
function normalizeDepsInput(value, { excludeId } = {}) {
  if (!value) return [];
  const parts = value.split(/[\s,]+/).map((v) => v.trim()).filter(Boolean);
  const unique = [];
  parts.forEach((dep) => {
    if (excludeId && dep === excludeId) return;
    if (!unique.includes(dep)) unique.push(dep);
  });
  return unique;
}
function updateItemReferences(modelData, oldId, newId) {
  if (!oldId || !newId || oldId === newId) return;
  const categories = (modelData == null ? void 0 : modelData.categories) || [];
  categories.forEach((cat) => {
    (cat.items || []).forEach((it) => {
      if (Array.isArray(it.deps)) {
        it.deps = it.deps.map((dep) => dep === oldId ? newId : dep);
      }
    });
  });
}
function createItemEditor({
  findItemAndCategoryById,
  collectAllItemIds,
  updateItemReferences: updateItemReferences2,
  loadActiveIntoEditor,
  rebuildFromActive,
  select,
  onSelectionRenamed,
  makeSlug = defaultMakeSlug,
  isAutoIdFromNameEnabled = () => true
} = {}) {
  assertFn(findItemAndCategoryById, "findItemAndCategoryById");
  assertFn(collectAllItemIds, "collectAllItemIds");
  assertFn(updateItemReferences2, "updateItemReferences");
  assertFn(loadActiveIntoEditor, "loadActiveIntoEditor");
  assertFn(rebuildFromActive, "rebuildFromActive");
  assertFn(select, "select");
  assertFn(makeSlug, "makeSlug");
  assertFn(isAutoIdFromNameEnabled, "isAutoIdFromNameEnabled");
  const state = {
    wrapper: null,
    fields: {},
    categoryId: null,
    itemId: null,
    modelData: null,
    autoIdManuallyEdited: false,
    autoSyncEnabled: true
  };
  function setError(message) {
    if (!state.fields.errorEl) return;
    if (!message) {
      state.fields.errorEl.hidden = true;
      state.fields.errorEl.textContent = "";
      return;
    }
    state.fields.errorEl.hidden = false;
    state.fields.errorEl.textContent = message;
  }
  function hide() {
    if (!state.wrapper) return;
    state.wrapper.hidden = true;
    state.wrapper.setAttribute("aria-hidden", "true");
    setError("");
    state.categoryId = null;
    state.itemId = null;
    state.modelData = null;
    document.body.classList.remove("item-editor-open");
  }
  function show() {
    if (!state.wrapper) return;
    state.wrapper.hidden = false;
    state.wrapper.setAttribute("aria-hidden", "false");
    document.body.classList.add("item-editor-open");
    requestAnimationFrame(() => {
      var _a, _b;
      (_a = state.fields.nameInput) == null ? void 0 : _a.focus();
      (_b = state.fields.nameInput) == null ? void 0 : _b.select();
    });
  }
  function syncIdFromName({ force } = {}) {
    var _a, _b;
    if (!((_a = state.fields) == null ? void 0 : _a.idInput) || !((_b = state.fields) == null ? void 0 : _b.nameInput)) return;
    if (!state.autoSyncEnabled || !isAutoIdFromNameEnabled()) return;
    if (!force && state.autoIdManuallyEdited) return;
    const slug = makeSlug(state.fields.nameInput.value || state.itemId || "item");
    state.fields.idInput.value = slug;
  }
  function applyItemEdits(payload) {
    var _a;
    if (!state.modelData || !state.categoryId || !state.itemId) {
      throw new Error("No item loaded.");
    }
    const categories = ((_a = state.modelData) == null ? void 0 : _a.categories) || [];
    const category = categories.find((cat) => cat.id === state.categoryId);
    if (!category) throw new Error("Category not found.");
    category.items = category.items || [];
    const item = category.items.find((it) => it.id === state.itemId);
    if (!item) throw new Error("Item not found.");
    const normalizedId = (payload.id || "").trim();
    if (!normalizedId) throw new Error("ID is required.");
    const allIds = collectAllItemIds(state.modelData);
    if (normalizedId !== item.id && allIds.has(normalizedId)) {
      throw new Error("Another item already uses that ID.");
    }
    item.id = normalizedId;
    const trimmedName = (payload.name || "").trim();
    item.name = trimmedName || item.id;
    const logo = (payload.logo || "").trim();
    if (logo) item.logo = logo;
    else delete item.logo;
    if (payload.externalFlag && !payload.external) {
      item.external = true;
    } else {
      const external = (payload.external ?? "").toString().trim();
      if (external) item.external = external;
      else delete item.external;
    }
    const color = (payload.color || "").trim();
    if (color) item.color = color;
    else delete item.color;
    item.deps = Array.isArray(payload.deps) ? payload.deps : [];
    if (item.id !== payload.originalId && typeof onSelectionRenamed === "function") {
      onSelectionRenamed(payload.originalId, item.id);
    }
    updateItemReferences2(state.modelData, payload.originalId, item.id);
    loadActiveIntoEditor();
    rebuildFromActive();
    select(item.id);
    return item.id;
  }
  function saveItemEdits() {
    if (!state.fields || !state.fields.idInput) return false;
    const idVal = (state.fields.idInput.value || "").trim();
    const payload = {
      originalId: state.itemId,
      id: idVal,
      name: state.fields.nameInput.value || "",
      logo: state.fields.logoInput.value || "",
      external: state.fields.externalInput.value || "",
      externalFlag: state.fields.externalFlagInput.checked,
      color: state.fields.colorInput.value || "",
      deps: normalizeDepsInput(state.fields.depsInput.value, { excludeId: idVal })
    };
    try {
      applyItemEdits(payload);
      hide();
      return true;
    } catch (error) {
      console.warn("[itemEditor] item edit failed", error);
      setError((error == null ? void 0 : error.message) || "Unable to save item.");
      return false;
    }
  }
  function ensureItemEditorModal() {
    if (state.wrapper) return state.wrapper;
    const wrapper = document.createElement("div");
    wrapper.className = "item-editor-modal";
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
    title.textContent = "Edit item";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "item-editor__close";
    closeBtn.setAttribute("aria-label", "Close item editor");
    closeBtn.textContent = "×";
    header.appendChild(title);
    header.appendChild(closeBtn);
    dialog.appendChild(header);
    const form = document.createElement("form");
    form.className = "item-editor__form";
    dialog.appendChild(form);
    const meta = document.createElement("div");
    meta.className = "item-editor__meta";
    meta.innerHTML = '<div class="item-editor__meta-label">Category</div><div class="item-editor__meta-value"></div>';
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
    const idInput = document.createElement("input");
    idInput.type = "text";
    idInput.required = true;
    form.appendChild(makeField("ID", idInput, "Unique identifier used for dependencies."));
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    form.appendChild(makeField("Name", nameInput, "Visible label shown on the tile."));
    const logoInput = document.createElement("input");
    logoInput.type = "url";
    logoInput.inputMode = "url";
    logoInput.placeholder = "https://…";
    form.appendChild(makeField("Logo URL", logoInput, "Optional image URL."));
    const externalInput = document.createElement("input");
    externalInput.type = "url";
    externalInput.inputMode = "url";
    externalInput.placeholder = "https://…";
    form.appendChild(makeField("External link", externalInput, "Shown with ↗ icon and in preview."));
    const externalToggle = document.createElement("div");
    externalToggle.className = "item-editor__checkbox";
    const externalToggleRow = document.createElement("label");
    externalToggleRow.className = "item-editor__checkbox-row";
    const externalFlagInput = document.createElement("input");
    externalFlagInput.type = "checkbox";
    const externalFlagLabel = document.createElement("span");
    externalFlagLabel.textContent = "Mark as external without link";
    const externalFlagHint = document.createElement("div");
    externalFlagHint.className = "item-editor__hint";
    externalFlagHint.textContent = "Keeps dashed border even without a URL.";
    externalToggleRow.appendChild(externalFlagInput);
    externalToggleRow.appendChild(externalFlagLabel);
    externalToggle.appendChild(externalToggleRow);
    externalToggle.appendChild(externalFlagHint);
    form.appendChild(externalToggle);
    const colorInput = document.createElement("input");
    colorInput.type = "text";
    colorInput.placeholder = tokens.color.primary;
    form.appendChild(makeField("Color", colorInput, "Optional badge color (hex or CSS color)."));
    const depsInput = document.createElement("textarea");
    depsInput.rows = 2;
    depsInput.placeholder = "Comma or space separated ids";
    form.appendChild(makeField("Dependencies", depsInput, "Use item IDs, separated by commas or spaces."));
    const syncToggle = document.createElement("div");
    syncToggle.className = "item-editor__checkbox";
    const syncRow = document.createElement("label");
    syncRow.className = "item-editor__checkbox-row";
    const syncCheckbox = document.createElement("input");
    syncCheckbox.type = "checkbox";
    const syncLabel = document.createElement("span");
    syncLabel.textContent = "Sync ID while editing name";
    const syncHint = document.createElement("div");
    syncHint.className = "item-editor__hint";
    syncHint.textContent = "Turn off to keep typing names without changing the ID.";
    syncRow.appendChild(syncCheckbox);
    syncRow.appendChild(syncLabel);
    syncToggle.appendChild(syncRow);
    syncToggle.appendChild(syncHint);
    form.appendChild(syncToggle);
    const actions = document.createElement("div");
    actions.className = "item-editor__actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "pf-v5-c-button pf-m-tertiary";
    cancelBtn.textContent = "Cancel";
    const saveBtn = document.createElement("button");
    saveBtn.type = "submit";
    saveBtn.className = "pf-v5-c-button pf-m-primary";
    saveBtn.textContent = "Save";
    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    form.appendChild(actions);
    state.wrapper = wrapper;
    state.fields = {
      idInput,
      nameInput,
      logoInput,
      externalInput,
      externalFlagInput,
      colorInput,
      depsInput,
      syncCheckbox,
      categoryValue: meta.querySelector(".item-editor__meta-value"),
      errorEl
    };
    cancelBtn.addEventListener("click", hide);
    closeBtn.addEventListener("click", hide);
    backdrop.addEventListener("click", hide);
    idInput.addEventListener("input", () => {
      state.autoIdManuallyEdited = true;
    });
    nameInput.addEventListener("input", syncIdFromName);
    syncCheckbox.addEventListener("change", () => {
      state.autoSyncEnabled = !!syncCheckbox.checked;
      if (state.autoSyncEnabled) {
        state.autoIdManuallyEdited = false;
        syncIdFromName({ force: true });
      }
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      saveItemEdits();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !wrapper.hidden) {
        event.preventDefault();
        event.stopPropagation();
        hide();
      }
    });
    document.body.appendChild(wrapper);
    return wrapper;
  }
  function open(itemId) {
    const hit = findItemAndCategoryById(itemId);
    if (!hit) return false;
    ensureItemEditorModal();
    state.categoryId = hit.category.id;
    state.itemId = hit.item.id;
    state.modelData = hit.modelData;
    state.autoIdManuallyEdited = false;
    const autoSyncAllowed = !!isAutoIdFromNameEnabled();
    state.autoSyncEnabled = autoSyncAllowed;
    state.fields.categoryValue.textContent = hit.category.title || hit.category.id;
    state.fields.idInput.value = hit.item.id || "";
    state.fields.nameInput.value = hit.item.name || "";
    state.fields.logoInput.value = hit.item.logo || "";
    state.fields.externalInput.value = typeof hit.item.external === "string" ? hit.item.external : "";
    state.fields.externalFlagInput.checked = hit.item.external === true;
    state.fields.colorInput.value = hit.item.color || "";
    state.fields.depsInput.value = Array.isArray(hit.item.deps) ? hit.item.deps.join(", ") : "";
    state.fields.syncCheckbox.checked = state.autoSyncEnabled;
    state.fields.syncCheckbox.disabled = !autoSyncAllowed;
    if (!state.fields.idInput.value && autoSyncAllowed) {
      syncIdFromName({ force: true });
    }
    setError("");
    select(hit.item.id);
    show();
    return true;
  }
  return {
    open,
    hide,
    isOpen: () => !!state.wrapper && !state.wrapper.hidden
  };
}
function createTileContextMenu({
  menuEl,
  previewEl,
  previewTitleEl,
  previewBodyEl,
  previewActionsEl,
  previewCloseEl,
  escapeHtml,
  onEditItem,
  onChangeColor,
  selectItem,
  colorPresets = []
} = {}) {
  const menu = menuEl || (() => {
    const el = document.createElement("div");
    el.className = "tile-context-menu";
    el.hidden = true;
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    return el;
  })();
  let previewAnchor = { x: 0, y: 0 };
  let previewRequestId = 0;
  let presetColors = Array.isArray(colorPresets) ? colorPresets : [];
  function hideMenu() {
    if (!menu) return;
    menu.classList.remove("is-open");
    menu.hidden = true;
    menu.setAttribute("aria-hidden", "true");
    menu.innerHTML = "";
  }
  function setPreviewActions(actions = []) {
    if (!previewActionsEl) return;
    previewActionsEl.innerHTML = "";
    actions.forEach((actionDef) => {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "item-preview__action";
      action.textContent = actionDef.label || "Action";
      if (actionDef.title) action.title = actionDef.title;
      action.addEventListener("click", (event) => {
        event.stopPropagation();
        if (typeof actionDef.onClick === "function") {
          actionDef.onClick(event);
        }
      });
      previewActionsEl.appendChild(action);
    });
    previewActionsEl.hidden = actions.length === 0;
  }
  function hidePreview() {
    hideMenu();
    if (!previewEl) return;
    previewEl.classList.remove(
      "is-visible",
      "item-preview--has-frame",
      "item-preview--expanded"
    );
    previewEl.setAttribute("aria-hidden", "true");
    previewEl.hidden = true;
    setPreviewActions([]);
  }
  function showPreviewAt(x, y) {
    if (!previewEl) return;
    previewAnchor = { x, y };
    previewEl.hidden = false;
    previewEl.setAttribute("aria-hidden", "false");
    previewEl.classList.add("is-visible");
    positionPreview(x, y);
  }
  function positionPreview(x, y) {
    if (!previewEl) return;
    const margin = 12;
    previewEl.style.left = `${x + margin}px`;
    previewEl.style.top = `${y + margin}px`;
    const rect = previewEl.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top;
    if (rect.right > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - rect.width - margin);
    }
    if (rect.bottom > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - rect.height - margin);
    }
    previewEl.style.left = `${left}px`;
    previewEl.style.top = `${top}px`;
  }
  function buildTileMeta(tile, event) {
    var _a;
    if (!tile) return null;
    const id = tile.dataset.id;
    const displayName = ((_a = tile.querySelector(".name")) == null ? void 0 : _a.textContent) || id || "Preview";
    const filename = id ? `${id}.html` : "";
    const filepath = filename ? `items/${filename}` : "";
    return {
      id,
      displayName,
      filename,
      filepath,
      externalUrl: tile.dataset.externalUrl || "",
      obsidianUrl: tile.dataset.obsidianUrl || "",
      anchorX: (event == null ? void 0 : event.clientX) ?? 0,
      anchorY: (event == null ? void 0 : event.clientY) ?? 0
    };
  }
  function makeMenuButton(label, handler) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile-context-menu__item";
    btn.textContent = label;
    btn.addEventListener("click", () => {
      hideMenu();
      if (typeof handler === "function") handler();
    });
    return btn;
  }
  function renderMenu(meta) {
    if (!menu) return;
    menu.innerHTML = "";
    const list = document.createElement("div");
    list.className = "tile-context-menu__list";
    list.appendChild(
      makeMenuButton("File view", () => openFileView(meta))
    );
    if (typeof onEditItem === "function") {
      list.appendChild(
        makeMenuButton("Edit", () => onEditItem(meta.id))
      );
    }
    if (typeof onChangeColor === "function" && meta.id) {
      presetColors.forEach((preset) => {
        if (!(preset == null ? void 0 : preset.value)) return;
        const label = preset.name || preset.value;
        list.appendChild(
          makeMenuButton(
            `Set color: ${label}`,
            () => onChangeColor(meta.id, preset.value)
          )
        );
      });
    }
    menu.appendChild(list);
  }
  function showMenuAt(x, y) {
    if (!menu) return;
    const margin = 4;
    menu.style.left = `${x + margin}px`;
    menu.style.top = `${y + margin}px`;
    menu.hidden = false;
    menu.setAttribute("aria-hidden", "false");
    menu.classList.add("is-open");
    const rect = menu.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top;
    if (rect.right > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - rect.width - margin);
    }
    if (rect.bottom > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - rect.height - margin);
    }
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }
  async function openFileView(meta) {
    if (!previewEl || !previewTitleEl || !previewBodyEl || !meta) return;
    const requestId = ++previewRequestId;
    const actions = [];
    if (typeof onEditItem === "function" && meta.id) {
      actions.push({
        label: "Edit",
        title: "Edit this item",
        onClick: () => {
          hidePreview();
          onEditItem(meta.id);
        }
      });
    }
    if (meta.externalUrl) {
      actions.push({
        label: "Open link ↗",
        title: meta.externalUrl,
        onClick: () => window.open(meta.externalUrl, "_blank", "noopener")
      });
    }
    if (meta.obsidianUrl) {
      actions.push({
        label: "Open in Obsidian",
        title: meta.obsidianUrl,
        onClick: () => window.open(meta.obsidianUrl, "_blank", "noopener")
      });
    }
    setPreviewActions(actions);
    if (meta.id && typeof selectItem === "function") {
      selectItem(meta.id);
    }
    previewTitleEl.textContent = meta.displayName;
    previewBodyEl.innerHTML = '<div class="item-preview__status">Loading…</div>';
    previewEl.classList.remove("item-preview--has-frame");
    previewEl.classList.add("item-preview--expanded");
    showPreviewAt(meta.anchorX, meta.anchorY);
    if (!meta.filepath) {
      previewBodyEl.innerHTML = '<div class="item-preview__status">Preview unavailable for this item.</div>';
      positionPreview(previewAnchor.x, previewAnchor.y);
      return;
    }
    try {
      const response = await fetch(meta.filepath, { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      if (requestId !== previewRequestId) return;
      const trimmed = html.trim();
      if (!trimmed) {
        const safeName = escapeHtml ? escapeHtml(meta.filename) : meta.filename;
        previewBodyEl.innerHTML = `<div class="item-preview__status">No content in <code>${safeName}</code>.</div>`;
        positionPreview(previewAnchor.x, previewAnchor.y);
        return;
      }
      const frame = document.createElement("iframe");
      frame.className = "item-preview__frame";
      frame.title = `${meta.displayName} details`;
      frame.srcdoc = html;
      previewBodyEl.innerHTML = "";
      previewBodyEl.appendChild(frame);
      previewEl.classList.add("item-preview--has-frame");
      positionPreview(previewAnchor.x, previewAnchor.y);
    } catch (error) {
      if (requestId !== previewRequestId) return;
      const safeName = escapeHtml ? escapeHtml(meta.displayName) : meta.displayName;
      previewBodyEl.innerHTML = `<div class="item-preview__status">No preview available for <strong>${safeName}</strong>.</div>`;
      console.warn(
        `[Blockscape] preview unavailable for ${meta.filepath}`,
        error
      );
      positionPreview(previewAnchor.x, previewAnchor.y);
    }
  }
  function handleTileContextMenu(event, tile) {
    if (!tile) return;
    event.preventDefault();
    event.stopPropagation();
    const meta = buildTileMeta(tile, event);
    if (!meta || !meta.id) return;
    if (typeof selectItem === "function") {
      selectItem(meta.id);
    }
    renderMenu(meta);
    showMenuAt(event.clientX, event.clientY);
  }
  function handleDocumentClick(event) {
    const target2 = event == null ? void 0 : event.target;
    const clickedInsideMenu = menu && !menu.hidden && menu.contains(target2);
    const clickedInsidePreview = previewEl && !previewEl.hidden && previewEl.contains(target2);
    if (!clickedInsideMenu && !clickedInsidePreview) {
      hidePreview();
    }
  }
  function handleWindowResize() {
    if (!previewEl || previewEl.hidden) return;
    positionPreview(previewAnchor.x, previewAnchor.y);
  }
  function handleWindowScroll() {
    hidePreview();
  }
  if (previewCloseEl) {
    previewCloseEl.addEventListener("click", hidePreview);
  }
  return {
    handleTileContextMenu,
    hidePreview,
    hideMenu,
    handleDocumentClick,
    handleWindowResize,
    handleWindowScroll,
    updateColorPresets: (next) => {
      presetColors = Array.isArray(next) ? next : [];
    }
  };
}
function slugify(base, fallback = "series") {
  return (base || fallback).trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || fallback;
}
function makeSeriesId(seriesName, fallback = "series") {
  const rawSlug = slugify(seriesName, fallback).replace(/\./g, "-");
  const withoutSuffix = rawSlug.replace(/-series$/i, "").replace(/-+$/, "");
  const cleaned = withoutSuffix || rawSlug;
  return cleaned || slugify(fallback, "series");
}
function deriveSeriesId(entry, { seriesName, fallbackTitle = "unknown" } = {}) {
  var _a, _b;
  const candidates = [
    entry == null ? void 0 : entry.seriesId,
    (_a = entry == null ? void 0 : entry.data) == null ? void 0 : _a.seriesId,
    entry == null ? void 0 : entry.apicurioArtifactId,
    seriesName,
    entry == null ? void 0 : entry.title,
    entry == null ? void 0 : entry.apicurioArtifactName,
    (_b = entry == null ? void 0 : entry.data) == null ? void 0 : _b.title,
    fallbackTitle
  ];
  const trimmed = candidates.map((c) => (c ?? "").toString().trim());
  const foundIndex = trimmed.findIndex(Boolean);
  const base = foundIndex !== -1 ? trimmed[foundIndex] : "";
  if (!base) {
    console.log("[Series] deriveSeriesId: no base found; fallback", { fallbackTitle });
    return null;
  }
  console.log("[Series] deriveSeriesId: picked base", {
    base,
    sourceIndex: foundIndex,
    candidates: trimmed
  });
  return makeSeriesId(base, fallbackTitle);
}
function ensureSeriesId(entry, { seriesName, fallbackTitle = "unknown" } = {}) {
  if (!entry || typeof entry !== "object") return null;
  const seriesId = deriveSeriesId(entry, { seriesName, fallbackTitle });
  if (!seriesId) return null;
  entry.seriesId = seriesId;
  if (!entry.apicurioArtifactId) entry.apicurioArtifactId = seriesId;
  return seriesId;
}
function getSeriesId(entry, options = {}) {
  var _a, _b;
  if (!entry) return null;
  const hasSeriesSignal = entry.isSeries || ((_a = entry.apicurioVersions) == null ? void 0 : _a.length) > 1 || entry.seriesId || ((_b = entry.data) == null ? void 0 : _b.seriesId) || entry.apicurioArtifactId;
  if (!hasSeriesSignal && !options.force) return null;
  const seriesId = deriveSeriesId(entry, options);
  if (seriesId) return seriesId;
  if (hasSeriesSignal) {
    return makeSeriesId(options.fallbackTitle || "unknown");
  }
  return null;
}
const DEFAULTS = {
  selectionDimOpacity: 0.2,
  selectionDimEnabled: true
};
const formatSettings = {
  seriesNavWait: (value) => `${(value / 1e3).toFixed(1)}s`,
  hoverScale: (value) => `${Math.round((value - 1) * 100)}%`,
  selectionDimming: (opacity, enabled = true) => {
    const dimPercent = Math.round((1 - opacity) * 100);
    if (!enabled) return "Off";
    return dimPercent === 0 ? "Off" : `${dimPercent}% dim`;
  },
  compactness: (value) => value === 1 ? "Default" : `${Math.round(value * 100)}%`,
  titleWidth: (value) => `${Math.round((value - 1) * 100)}% extra`,
  titleZoomPortion: (value) => `${Math.round(value * 100)}% of hover zoom`,
  autoReloadInterval: (value) => `${(value / 1e3).toFixed(2)}s`
};
function asBool(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}
function buildSettingsSnapshot(current, { localBackend } = {}) {
  const autoReloadConfig = localBackend && typeof localBackend.getAutoReloadConfig === "function" && localBackend.getAutoReloadConfig();
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
    colorPresets: current.colorPresets
  };
  if (autoReloadConfig) {
    snapshot.autoReloadEnabled = !!autoReloadConfig.enabled;
    snapshot.autoReloadIntervalMs = autoReloadConfig.intervalMs;
  }
  return snapshot;
}
function applySettingsSnapshot(snapshot = {}, ctx) {
  var _a, _b, _c, _d;
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
    refreshObsidianLinks: refreshObsidianLinks2,
    scheduleOverlaySync,
    selection,
    select,
    clearStyles,
    drawLinks,
    applyReusedHighlights,
    current
  } = ctx;
  if (snapshot.theme) {
    const appliedTheme = applyTheme == null ? void 0 : applyTheme(snapshot.theme);
    const isDark = (appliedTheme || snapshot.theme) === "dark";
    if ((_a = ctx.ui) == null ? void 0 : _a.themeToggle) {
      ctx.ui.themeToggle.checked = isDark;
    }
    if ((_b = ctx.ui) == null ? void 0 : _b.tabThemeToggle) {
      ctx.ui.tabThemeToggle.checked = isDark;
    }
    appliedKeys.push("theme");
  }
  if (snapshot.hoverScale != null) {
    const applied = applyTileHoverScale(parseFloat(snapshot.hoverScale));
    persistTileHoverScale(applied);
    (ui == null ? void 0 : ui.hoverScaleInput) && (ui.hoverScaleInput.value = String(applied));
    (ui == null ? void 0 : ui.hoverScaleValue) && (ui.hoverScaleValue.textContent = formatSettings.hoverScale(applied));
    if (selection) scheduleOverlaySync();
    appliedKeys.push("hoverScale");
  }
  if (snapshot.selectionDimEnabled != null) {
    const applied = applySelectionDimEnabled(asBool(snapshot.selectionDimEnabled));
    persistSelectionDimEnabled(applied);
    if (ui == null ? void 0 : ui.selectionDimToggle) ui.selectionDimToggle.checked = applied;
    if (ui == null ? void 0 : ui.selectionDimInput) ui.selectionDimInput.disabled = !applied;
    if (ui == null ? void 0 : ui.selectionDimValue) {
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
    (ui == null ? void 0 : ui.selectionDimInput) && (ui.selectionDimInput.value = String(applied));
    (ui == null ? void 0 : ui.selectionDimValue) && (ui.selectionDimValue.textContent = formatSettings.selectionDimming(
      applied,
      current.selectionDimEnabled ?? DEFAULTS.selectionDimEnabled
    ));
    appliedKeys.push("selectionDimOpacity");
  }
  if (snapshot.tileCompactness != null) {
    const applied = applyTileCompactness(parseFloat(snapshot.tileCompactness));
    persistTileCompactness(applied);
    (ui == null ? void 0 : ui.tileCompactnessInput) && (ui.tileCompactnessInput.value = String(applied));
    (ui == null ? void 0 : ui.tileCompactnessValue) && (ui.tileCompactnessValue.textContent = formatSettings.compactness(applied));
    if (selection) scheduleOverlaySync();
    appliedKeys.push("tileCompactness");
  }
  if (snapshot.titleWrapMode) {
    const applied = applyTitleWrapMode(snapshot.titleWrapMode);
    persistTitleWrapMode(applied);
    if (ui == null ? void 0 : ui.titleWrapInput) ui.titleWrapInput.checked = applied !== "nowrap";
    appliedKeys.push("titleWrapMode");
  }
  if (snapshot.titleHoverWidthMultiplier != null) {
    const applied = applyTitleHoverWidthMultiplier(
      parseFloat(snapshot.titleHoverWidthMultiplier)
    );
    persistTitleHoverWidthMultiplier(applied);
    (ui == null ? void 0 : ui.titleWidthInput) && (ui.titleWidthInput.value = String(applied));
    (ui == null ? void 0 : ui.titleWidthValue) && (ui.titleWidthValue.textContent = formatSettings.titleWidth(applied));
    appliedKeys.push("titleHoverWidthMultiplier");
  }
  if (snapshot.titleHoverTextPortion != null) {
    const applied = applyTitleHoverTextPortion(
      parseFloat(snapshot.titleHoverTextPortion)
    );
    persistTitleHoverTextPortion(applied);
    (ui == null ? void 0 : ui.titleZoomInput) && (ui.titleZoomInput.value = String(applied));
    (ui == null ? void 0 : ui.titleZoomValue) && (ui.titleZoomValue.textContent = formatSettings.titleZoomPortion(applied));
    appliedKeys.push("titleHoverTextPortion");
  }
  if (snapshot.obsidianLinksEnabled != null) {
    const applied = applyObsidianLinksEnabled(
      asBool(snapshot.obsidianLinksEnabled)
    );
    persistObsidianLinksEnabled(applied);
    if (ui == null ? void 0 : ui.obsidianToggle) ui.obsidianToggle.checked = applied;
    (_c = ui == null ? void 0 : ui.obsidianModeInputs) == null ? void 0 : _c.forEach((input) => {
      input.disabled = !applied;
    });
    if (ui == null ? void 0 : ui.obsidianVaultInput) ui.obsidianVaultInput.disabled = !applied;
    refreshObsidianLinks2 == null ? void 0 : refreshObsidianLinks2();
    appliedKeys.push("obsidianLinksEnabled");
  }
  if (snapshot.obsidianLinkMode) {
    const applied = applyObsidianLinkMode(snapshot.obsidianLinkMode);
    persistObsidianLinkMode(applied);
    (_d = ui == null ? void 0 : ui.obsidianModeInputs) == null ? void 0 : _d.forEach((input) => {
      input.checked = input.value === applied;
    });
    refreshObsidianLinks2 == null ? void 0 : refreshObsidianLinks2();
    appliedKeys.push("obsidianLinkMode");
  }
  if (snapshot.obsidianVault != null) {
    const applied = applyObsidianVaultName(snapshot.obsidianVault);
    persistObsidianVaultName(applied);
    if (ui == null ? void 0 : ui.obsidianVaultInput) ui.obsidianVaultInput.value = applied;
    refreshObsidianLinks2 == null ? void 0 : refreshObsidianLinks2();
    appliedKeys.push("obsidianVault");
  }
  if (snapshot.colorPresets) {
    if (typeof ctx.setColorPresets === "function") {
      ctx.setColorPresets(snapshot.colorPresets);
    }
    appliedKeys.push("colorPresets");
  }
  if (snapshot.autoIdFromName != null) {
    const applied = applyAutoIdFromNameEnabled(asBool(snapshot.autoIdFromName));
    persistAutoIdFromNameEnabled(applied);
    if (ui == null ? void 0 : ui.autoIdToggle) ui.autoIdToggle.checked = applied;
    appliedKeys.push("autoIdFromName");
  }
  if (snapshot.seriesNavDoubleClickMs != null) {
    const applied = applySeriesNavDoubleClickWait(
      parseInt(snapshot.seriesNavDoubleClickMs, 10)
    );
    persistSeriesNavDoubleClickWait(applied);
    (ui == null ? void 0 : ui.seriesNavInput) && (ui.seriesNavInput.value = String(applied));
    (ui == null ? void 0 : ui.seriesNavValue) && (ui.seriesNavValue.textContent = formatSettings.seriesNavWait(applied));
    appliedKeys.push("seriesNavDoubleClickMs");
  }
  if (snapshot.autoReloadEnabled != null && localBackend && typeof localBackend.setAutoReloadEnabled === "function") {
    const enabled = asBool(snapshot.autoReloadEnabled);
    localBackend.setAutoReloadEnabled(enabled);
    if (ui == null ? void 0 : ui.autoReloadToggle) ui.autoReloadToggle.checked = enabled;
    if (ui == null ? void 0 : ui.autoReloadInput) ui.autoReloadInput.disabled = !enabled;
    appliedKeys.push("autoReloadEnabled");
  }
  if (snapshot.autoReloadIntervalMs != null && localBackend && typeof localBackend.setAutoReloadInterval === "function") {
    const applied = localBackend.setAutoReloadInterval(
      parseInt(snapshot.autoReloadIntervalMs, 10)
    );
    (ui == null ? void 0 : ui.autoReloadInput) && (ui.autoReloadInput.value = String(applied));
    (ui == null ? void 0 : ui.autoReloadValue) && (ui.autoReloadValue.textContent = formatSettings.autoReloadInterval(applied));
    appliedKeys.push("autoReloadIntervalMs");
  }
  if (snapshot.centerItems != null) {
    const applied = applyCenterItems == null ? void 0 : applyCenterItems(asBool(snapshot.centerItems));
    persistCenterItems == null ? void 0 : persistCenterItems(applied);
    if (ui == null ? void 0 : ui.tabCenterToggle) ui.tabCenterToggle.checked = applied;
    appliedKeys.push("centerItems");
  }
  if (snapshot.showSecondaryLinks != null) {
    const next = asBool(snapshot.showSecondaryLinks);
    if (typeof ctx.setShowSecondaryLinks === "function") {
      ctx.setShowSecondaryLinks(next);
    } else {
      ctx.showSecondaryLinks = next;
    }
    if (ui == null ? void 0 : ui.secondaryLinksToggle) ui.secondaryLinksToggle.checked = next;
    if (ui == null ? void 0 : ui.tabSecondaryLinksToggle) ui.tabSecondaryLinksToggle.checked = next;
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
    if (ui == null ? void 0 : ui.reusedToggle) ui.reusedToggle.checked = next;
    applyReusedHighlights == null ? void 0 : applyReusedHighlights();
    appliedKeys.push("showReusedInMap");
  }
  return { applied: appliedKeys };
}
function downloadJson(filename, data) {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
const ASSET_BASE = typeof import.meta !== "undefined" && "./" || "";
function initBlockscape(featureOverrides = {}) {
  console.log("[Blockscape] init");
  const features = {
    localBackend: true,
    fileOpen: true,
    fileSave: true,
    autoLoadFromDir: true,
    showModelMeta: true,
    seriesNavMinVersions: 1,
    initialSettings: null,
    initialSettingsUrl: null,
    ...featureOverrides
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
  const saveLocalFileButton = document.getElementById("saveLocalFile");
  const saveLocalFileAsButton = document.getElementById("saveLocalFileAs");
  const localSavePathInput = document.getElementById("localSavePath");
  const EDITOR_TRANSFER_KEY = "blockscape:editorPayload";
  const EDITOR_TRANSFER_MESSAGE_TYPE = "blockscape:editorTransfer";
  const defaultDocumentTitle = document.title;
  if (localBackendPanel) localBackendPanel.hidden = true;
  if (!features.localBackend && localBackendPanel) localBackendPanel.hidden = true;
  if (!features.fileOpen) {
    if (loadLocalFileButton) loadLocalFileButton.hidden = true;
    if (localDirSelect) localDirSelect.hidden = true;
    if (refreshLocalFilesButton) refreshLocalFilesButton.hidden = true;
    if (localFileList) localFileList.hidden = true;
  }
  if (!features.fileSave) {
    if (saveLocalFileButton) saveLocalFileButton.hidden = true;
    if (saveLocalFileAsButton) saveLocalFileAsButton.hidden = true;
    if (localSavePathInput) localSavePathInput.hidden = true;
  }
  jsonBox.value = document.getElementById("seed").textContent.trim();
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
  let model = null;
  let index = /* @__PURE__ */ new Map();
  let categoryIndex = /* @__PURE__ */ new Map();
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
  const NOTICE_TIMEOUT_MS = 2e3;
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
  const versionThumbScroll = /* @__PURE__ */ new Map();
  let apicurioSettingsToggle = null;
  let activeSeriesPreviewTarget = null;
  let versionThumbLabels = [];
  let thumbLabelMeasureTimer = null;
  const MAX_SEARCH_RESULTS = 30;
  const SERIES_INFO_PREVIEW_DELAY = 1e3;
  const TILE_HOVER_SCALE_STORAGE_KEY = "blockscape:hoverScale";
  const DEFAULT_TILE_HOVER_SCALE = 1.5;
  const MIN_TILE_HOVER_SCALE = 1;
  const MAX_TILE_HOVER_SCALE = 2.5;
  const SELECTION_DIM_OPACITY_STORAGE_KEY = "blockscape:selectionDimOpacity";
  const SELECTION_DIM_ENABLED_STORAGE_KEY = "blockscape:selectionDimEnabled";
  const DEFAULT_SELECTION_DIM_OPACITY = 0.2;
  const MIN_SELECTION_DIM_OPACITY = 0.05;
  const MAX_SELECTION_DIM_OPACITY = 1;
  const TITLE_WRAP_STORAGE_KEY = "blockscape:titleWrap";
  const TITLE_HOVER_WIDTH_STORAGE_KEY = "blockscape:titleHoverWidth";
  const TITLE_HOVER_TEXT_PORTION_STORAGE_KEY = "blockscape:titleHoverTextPortion";
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
  const DEFAULT_AUTO_RELOAD_INTERVAL_MS = 1e3;
  const MIN_AUTO_RELOAD_INTERVAL_MS = 500;
  const MAX_AUTO_RELOAD_INTERVAL_MS = 1e4;
  const AUTO_ID_FROM_NAME_STORAGE_KEY = "blockscape:autoIdFromName";
  const DEFAULT_AUTO_ID_FROM_NAME = true;
  const COLOR_PRESETS_STORAGE_KEY = "blockscape:colorPresets";
  const CENTER_ITEMS_STORAGE_KEY = "blockscape:centerItems";
  const THEME_STORAGE_KEY = "blockscape:theme";
  const THEME_LIGHT = "light";
  const THEME_DARK = "dark";
  const CATEGORY_VIEW_VERSION_PREFIX = "cat:";
  const DEFAULT_CENTER_ITEMS = false;
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
  let renderColorPresetsUI = null;
  const SERIES_NAV_DOUBLE_CLICK_STORAGE_KEY = "blockscape:seriesNavDoubleClickMs";
  const DEFAULT_SERIES_NAV_DOUBLE_CLICK_MS = 900;
  const MIN_SERIES_NAV_DOUBLE_CLICK_MS = 300;
  const MAX_SERIES_NAV_DOUBLE_CLICK_MS = 4e3;
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
    colorPresetList: null
  };
  const disabledLocalBackend = {
    detect: async () => false,
    refresh: async () => {
    },
    updateActiveSavePlaceholder() {
    },
    isAvailable: () => false,
    highlightSource() {
    },
    getAutoReloadConfig: () => ({
      enabled: false,
      intervalMs: DEFAULT_AUTO_RELOAD_INTERVAL_MS
    }),
    setAutoReloadEnabled() {
    },
    setAutoReloadInterval() {
    },
    saveModelByIndex: async () => false
  };
  const localBackend = features.localBackend ? createLocalBackend() : disabledLocalBackend;
  const initialBackendCheck = features.localBackend ? localBackend.detect() : Promise.resolve(false);
  apicurio.hydrateConfig();
  applyTheme(readStoredTheme());
  setColorPresets(loadColorPresets(), { silent: true });
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
  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }
  function base64Encode(text2) {
    const bytes = new TextEncoder().encode(text2);
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
  function base64UrlEncode(text2) {
    return base64Encode(text2).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  function base64UrlDecode(token) {
    let base64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) base64 += "=".repeat(4 - pad);
    return base64Decode(base64);
  }
  const download = (filename, text2) => downloadJson(filename, text2);
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
        }
      }
    });
    const attempted = /* @__PURE__ */ new Set();
    for (const candidate of candidates) {
      if (attempted.has(candidate)) continue;
      attempted.add(candidate);
      try {
        const text2 = await fetchTextWithCacheBypass(candidate);
        const parsed = JSON.parse(text2);
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
    const refresh = typeof refreshObsidianLinks === "function" ? refreshObsidianLinks : null;
    const sources = [];
    if (features.initialSettings) {
      sources.push({ type: "inline", snapshot: features.initialSettings });
    }
    if (features.initialSettingsUrl) {
      sources.push({
        type: "url",
        url: features.initialSettingsUrl
      });
    }
    let appliedCount = 0;
    for (const source of sources) {
      try {
        const snapshot = source.type === "inline" ? normalizeSettingsPayload(source.snapshot) : await fetchInitialSettingsSnapshot(source.url);
        if (!snapshot) continue;
        const result = applyImportedSettings(snapshot, {
          refreshObsidianLinks: refresh
        });
        const applied = (result == null ? void 0 : result.applied) || [];
        if (applied.length) {
          appliedCount += applied.length;
          console.log(
            `[Blockscape] applied ${applied.length} setting${applied.length === 1 ? "" : "s"} from ${source.type === "inline" ? "inline config" : source.url}.`
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
    }
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
  function getCssVarValue(varName) {
    if (typeof window === "undefined") return "";
    const styles = getComputedStyle(document.documentElement);
    return styles.getPropertyValue(varName).trim();
  }
  function normalizeColorPresets(list) {
    const isHex = (val) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val || "");
    if (!Array.isArray(list)) return defaultColorPresets();
    const cleaned = list.map((entry) => ({
      name: ((entry == null ? void 0 : entry.name) || "").toString().trim() || "Custom",
      value: ((entry == null ? void 0 : entry.value) || "").toString().trim()
    })).filter((entry) => isHex(entry.value));
    return cleaned.length ? cleaned : defaultColorPresets();
  }
  function defaultColorPresets() {
    return [
      { name: "Black", value: tokens.color.ink },
      { name: "White", value: tokens.color.white },
      { name: "Red", value: tokens.blockscape.revdep },
      { name: "Green", value: tokens.color.success }
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
    renderColorPresetsUI == null ? void 0 : renderColorPresetsUI();
    return colorPresets;
  }
  function isLocalBackendOptIn() {
    if (typeof window === "undefined" || !window.location) return false;
    const url = new URL(window.location.href);
    const normalizedPath = url.pathname.replace(/\/+$/, "");
    const segments = normalizedPath.split("/").filter(Boolean);
    const searchFlag = url.searchParams.get("server");
    const hasServerPrefix = segments[0] && segments[0].toLowerCase() === "server";
    return hasServerPrefix || searchFlag && ["1", "true", "yes", "on"].includes(searchFlag.toLowerCase());
  }
  function updateUrlForServerPath(relPath, { modelId, itemId } = {}) {
    if (typeof window === "undefined" || !window.location || !relPath) return;
    const normalized = normalizeLocalSavePath(relPath);
    if (!normalized) return;
    const activeModel = models[activeIndex];
    const normalizedSource = normalizeLocalSavePath(activeModel == null ? void 0 : activeModel.sourcePath);
    const resolvedModelId = modelId ?? (normalizedSource && normalizedSource === normalized ? getModelId(activeModel) : null);
    const resolvedItemId = itemId ?? (normalizedSource && normalizedSource === normalized ? selection : null);
    const encodedPathSegments = normalized.split("/").filter(Boolean).map((part) => encodeURIComponent(part));
    const encodedModel = resolvedModelId ? encodeURIComponent(resolvedModelId) : null;
    const encodedItem = resolvedItemId ? encodeURIComponent(resolvedItemId) : null;
    try {
      const url = new URL(window.location.href);
      const cleanedSearch = new URLSearchParams(url.search);
      cleanedSearch.delete("load");
      cleanedSearch.delete("share");
      const newPath = [
        "",
        "server",
        ...encodedPathSegments,
        ...encodedModel ? [encodedModel] : [],
        ...encodedItem ? [encodedItem] : []
      ].join("/").replace(/\/+/g, "/");
      url.pathname = newPath;
      url.search = cleanedSearch.toString() ? `?${cleanedSearch.toString()}` : "";
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
    const bsIndex = remainder.findIndex(
      (part) => part.toLowerCase().endsWith(".bs")
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
    if (!(active == null ? void 0 : active.sourcePath)) return;
    updateUrlForServerPath(active.sourcePath, {
      modelId: getModelId(active),
      itemId: itemId === void 0 ? selection : itemId
    });
  }
  function isGithubPagesHost() {
    if (typeof window === "undefined" || !window.location) return false;
    const host = (window.location.hostname || "").toLowerCase();
    return host.endsWith("github.io");
  }
  function createLocalBackend() {
    const debugContext = () => {
      if (typeof window === "undefined" || !window.location) return {};
      return {
        host: window.location.host,
        path: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash
      };
    };
    function debug(message, extra = {}) {
      console.log("[Blockscape][local-backend]", message, {
        ...debugContext(),
        ...extra
      });
    }
    if (isGithubPagesHost()) {
      debug("Disabled on github.io host");
      if (localBackendPanel) localBackendPanel.hidden = true;
      return {
        detect: async () => false,
        refresh: async () => {
        },
        updateActiveSavePlaceholder() {
        },
        isAvailable: () => false
      };
    }
    const optIn = isLocalBackendOptIn();
    if (!optIn || !localBackendPanel || !localBackendStatus) {
      debug("Opt-in flag missing or panel unavailable");
      if (localBackendPanel) localBackendPanel.hidden = true;
      return {
        detect: async () => false,
        refresh: async () => {
        },
        updateActiveSavePlaceholder() {
        },
        isAvailable: () => false
      };
    }
    if (!localBackendPanel || !localBackendStatus) {
      return {
        detect: async () => false,
        refresh: async () => {
        },
        updateActiveSavePlaceholder() {
        },
        isAvailable: () => false
      };
    }
    let available = false;
    let lastKnownPath = "";
    let files = [];
    let dirs = [];
    let currentDir = "";
    let knownMtimes = /* @__PURE__ */ new Map();
    let autoReloadEnabled = readAutoReloadEnabled();
    let autoReloadIntervalMs = readAutoReloadInterval();
    let autoReloadTimer = null;
    let autoReloadInFlight = false;
    const autoReloadPauseReasons = /* @__PURE__ */ new Set();
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
    function setStatus(text2, { error = false } = {}) {
      localBackendStatus.textContent = text2;
      localBackendStatus.style.color = error ? tokens.color.dangerStrong : "";
      debug("Status", { text: text2, error });
    }
    function normalizeSavePath(raw) {
      return normalizeLocalSavePath(raw);
    }
    function resolvePayloadForSave(entry) {
      const seriesPayload = buildSeriesPayload(entry);
      if (seriesPayload) return { payload: seriesPayload, isSeries: true };
      return { payload: entry == null ? void 0 : entry.data, isSeries: false };
    }
    function defaultSaveName() {
      var _a;
      if (activeIndex >= 0 && ((_a = models[activeIndex]) == null ? void 0 : _a.sourcePath)) {
        return models[activeIndex].sourcePath;
      }
      if (activeIndex < 0) return "blockscape.bs";
      const title = getModelTitle(models[activeIndex]) || "blockscape";
      return `${makeSeriesId(title, "blockscape")}.bs`;
    }
    function updateActiveSavePlaceholder() {
      var _a;
      if (!localSavePathInput) return;
      localSavePathInput.placeholder = defaultSaveName();
      if ((_a = models[activeIndex]) == null ? void 0 : _a.sourcePath) {
        localSavePathInput.value = models[activeIndex].sourcePath;
      }
    }
    function renderDirFilter() {
      if (!localDirSelect) return;
      localDirSelect.innerHTML = "";
      const rootOption = document.createElement("option");
      rootOption.value = "";
      rootOption.textContent = "All (~/blockscape)";
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
      const filtered = currentDir ? files.filter((f) => f.path.startsWith(`${currentDir}/`)) : files;
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
        const mtime = file.mtimeMs ? new Date(file.mtimeMs).toLocaleString() : "";
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
      if (selected == null ? void 0 : selected.scrollIntoView) {
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
        const text2 = JSON.stringify(payload.data ?? payload, null, 2);
        const entries = normalizeToModelsFromText(text2, path, {
          seriesTitleOverride: `${path} series`
        });
        if (!entries.length) return;
        const next = entries[0];
        next.sourcePath = path;
        ensureModelMetadata(next, {
          titleHint: getModelTitle(models[idx]),
          idHint: getModelId(models[idx])
        });
        if (next.isSeries) {
          const seriesTitle = next.title || getModelTitle(next) || getModelTitle(models[idx]);
          const forcedSlug = makeSeriesId(seriesTitle || "unknown");
          applySeriesSlug(next, forcedSlug);
          ensureSeriesId(next, {
            seriesName: seriesTitle || "unknown",
            fallbackTitle: "unknown"
          });
        }
        models[idx] = {
          ...models[idx],
          ...next,
          title: next.title || getModelTitle(next),
          data: next.data,
          sourcePath: path
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
      if (!available || !autoReloadEnabled || isAutoReloadPaused() || autoReloadInFlight)
        return;
      autoReloadInFlight = true;
      try {
        const response = await fetch("/api/files", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const list = (payload.files || []).slice().sort((a, b) => {
          const aTime = (a == null ? void 0 : a.mtimeMs) || 0;
          const bTime = (b == null ? void 0 : b.mtimeMs) || 0;
          if (aTime === bTime) return (a.path || "").localeCompare(b.path || "");
          return bTime - aTime;
        });
        const newMap = /* @__PURE__ */ new Map();
        list.forEach((f) => newMap.set(f.path, f.mtimeMs || 0));
        const pathsToCheck = models.map((m, idx) => ({ path: m.sourcePath, idx })).filter((m) => m.path);
        for (const entry of pathsToCheck) {
          const prev = knownMtimes.get(entry.path) || 0;
          const next = newMap.get(entry.path) || 0;
          if (next > prev) {
            await reloadModelFromSource(entry.path);
          }
        }
        files = list;
        const dirSet = /* @__PURE__ */ new Set();
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
      knownMtimes = /* @__PURE__ */ new Map();
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
        available = !!(payload == null ? void 0 : payload.ok);
        if (!available) throw new Error("Health check failed");
        localBackendPanel.hidden = false;
        if (!silent) {
          setStatus(
            payload.root ? `Local server ready (root: ${payload.root})` : "Local server ready"
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
          const aTime = (a == null ? void 0 : a.mtimeMs) || 0;
          const bTime = (b == null ? void 0 : b.mtimeMs) || 0;
          if (aTime === bTime) return (a.path || "").localeCompare(b.path || "");
          return bTime - aTime;
        });
        const dirSet = /* @__PURE__ */ new Set();
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
        setStatus(
          files.length ? `Browsing ${files.length} file(s) in ~/blockscape` : "No .bs files in ~/blockscape yet"
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
      const selectedPaths = Array.from(localFileList.selectedOptions || []).map((opt) => opt.value).filter(Boolean).sort((a, b) => a.localeCompare(b));
      if (!selectedPaths.length) {
        alert("Select one or more files to load from ~/blockscape.");
        return;
      }
      let firstIndex = null;
      for (const relPath of selectedPaths) {
        try {
          setStatus(`Loading ${relPath}…`);
          const result = await importLocalBackendFile(relPath);
          if (firstIndex == null) firstIndex = (result == null ? void 0 : result.firstIndex) ?? null;
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
    async function saveActiveToPath(desiredPath, { statusPrefix = "Saved to", updateInput = true } = {}) {
      if (!available) return;
      if (activeIndex < 0) {
        alert("No active model to save.");
        return;
      }
      const target2 = models[activeIndex];
      const { payload: savePayload, isSeries } = resolvePayloadForSave(target2);
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
            body
          }
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const payload = await resp.json();
        lastKnownPath = payload.path || normalized;
        target2.sourcePath = payload.path || normalized;
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
      var _a;
      const desiredPath = normalizeSavePath(localSavePathInput == null ? void 0 : localSavePathInput.value) || normalizeSavePath((_a = models[activeIndex]) == null ? void 0 : _a.sourcePath) || defaultSaveName();
      if (!desiredPath) {
        alert("Enter a relative path (no ..) to save under ~/blockscape.");
        return;
      }
      await saveActiveToPath(desiredPath, { statusPrefix: "Saved to" });
    }
    async function saveActiveAs() {
      var _a;
      if (!available) return;
      if (activeIndex < 0) {
        alert("No active model to save.");
        return;
      }
      if (typeof window === "undefined" || typeof window.prompt !== "function")
        return;
      const defaultPath = normalizeSavePath((_a = models[activeIndex]) == null ? void 0 : _a.sourcePath) || defaultSaveName();
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
    async function saveModelByIndex(entryIndex, desiredPath, { refreshAfter = true, statusPrefix = "Saved to" } = {}) {
      if (!available) return { ok: false, error: "Local server unavailable" };
      if (!Number.isInteger(entryIndex) || entryIndex < 0) {
        return { ok: false, error: "Invalid model index" };
      }
      const target2 = models[entryIndex];
      const { payload: savePayload, isSeries } = resolvePayloadForSave(target2);
      if (!savePayload) return { ok: false, error: "Model has no data" };
      const normalized = normalizeSavePath(desiredPath) || normalizeSavePath(target2 == null ? void 0 : target2.sourcePath) || defaultSaveName();
      if (!normalized) {
        return {
          ok: false,
          error: "Enter a relative path (no ..) to save under ~/blockscape."
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
            body
          }
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const payload = await resp.json();
        lastKnownPath = payload.path || normalized;
        target2.sourcePath = payload.path || normalized;
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
    if (saveLocalFileButton) {
      saveLocalFileButton.onclick = () => saveActiveToFile();
    }
    if (saveLocalFileAsButton) {
      saveLocalFileAsButton.onclick = () => saveActiveAs();
    }
    if (localFileList && localSavePathInput) {
      localFileList.addEventListener("change", () => {
        const first = Array.from(localFileList.selectedOptions || [])[0];
        if (first == null ? void 0 : first.value) {
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
        available
      }),
      setAutoReloadEnabled,
      setAutoReloadInterval
    };
  }
  async function importLocalBackendFile(relPath, { labelBase = relPath, seriesTitleOverride } = {}) {
    if (!relPath) throw new Error("Missing path");
    const resp = await fetch(`/api/file?path=${encodeURIComponent(relPath)}`, {
      cache: "no-store"
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const payload = await resp.json();
    const text2 = JSON.stringify(payload.data ?? payload, null, 2);
    const entries = normalizeToModelsFromText(text2, relPath, {
      seriesTitleOverride: seriesTitleOverride || `${relPath} series`
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
        versionLabel: entries.length > 1 ? `${labelBase} #${idx + 1}` : labelBase
      });
      if (firstIndex == null) firstIndex = idxResult;
    });
    return { firstIndex, total: entries.length };
  }
  async function writeTextToClipboard(text2) {
    var _a;
    if (!((_a = navigator.clipboard) == null ? void 0 : _a.writeText)) return false;
    try {
      await navigator.clipboard.writeText(text2);
      return true;
    } catch (err) {
      console.warn("[Blockscape] clipboard write failed", err);
      return false;
    }
  }
  async function readTextFromClipboard() {
    var _a;
    if (!((_a = navigator.clipboard) == null ? void 0 : _a.readText)) {
      throw new Error("Clipboard read not supported");
    }
    return navigator.clipboard.readText();
  }
  function makeDownloadName(base) {
    return (base || "blockscape").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "blockscape";
  }
  function normalizeLocalSavePath(raw) {
    const cleaned = (raw || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
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
    const d = /* @__PURE__ */ new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(
      d.getDate()
    )}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }
  async function isLocalBackendReady() {
    try {
      await initialBackendCheck;
    } catch (_) {
    }
    return typeof (localBackend == null ? void 0 : localBackend.isAvailable) === "function" ? localBackend.isAvailable() : false;
  }
  async function getExistingLocalBsPaths() {
    try {
      const resp = await fetch("/api/files", { cache: "no-store" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const payload = await resp.json();
      return new Set((payload.files || []).map((f) => f.path).filter(Boolean));
    } catch (err) {
      console.warn("[Blockscape] failed to list existing local files", err);
      return /* @__PURE__ */ new Set();
    }
  }
  function pickUniqueLocalPath(desiredPath, takenPaths) {
    const normalized = normalizeLocalSavePath(desiredPath);
    if (!normalized) return null;
    if (!(takenPaths == null ? void 0 : takenPaths.has(normalized))) return normalized;
    const parts = normalized.split("/");
    const leaf = parts.pop() || normalized;
    const base = leaf.replace(/\.bs$/i, "");
    for (let i = 2; i < 1e3; i++) {
      const candidateLeaf = `${base}-${i}.bs`;
      const candidate = [...parts, candidateLeaf].filter(Boolean).join("/");
      if (!takenPaths.has(candidate)) return candidate;
    }
    return null;
  }
  function suggestNewSavePathForEntry(entry, fallbackBase = "clipboard") {
    const baseLabel = getModelTitle(entry) || (entry == null ? void 0 : entry.title) || (entry == null ? void 0 : entry.apicurioArtifactName) || fallbackBase || "blockscape";
    const slug = makeDownloadName(baseLabel);
    const stamp = makeTimestampSlug();
    return `${slug}-${stamp}.bs`;
  }
  function applySeriesTitleFromFilename(entry, savePath) {
    if (!(entry == null ? void 0 : entry.isSeries) || !Array.isArray(entry == null ? void 0 : entry.apicurioVersions) || entry.apicurioVersions.length <= 1)
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
      colorPresets
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
      applyTheme,
      setColorPresets,
      applyCenterItems,
      persistCenterItems,
      current: getCurrentSettingsState()
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
    return mode === OBSIDIAN_LINK_MODE_ID ? OBSIDIAN_LINK_MODE_ID : OBSIDIAN_LINK_MODE_TITLE;
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
    const firstObj = array.find((obj) => obj && typeof obj === "object") || array[0];
    const candidate = ((firstObj == null ? void 0 : firstObj.title) ?? "").toString().trim();
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
        if ((ver == null ? void 0 : ver.data) && typeof ver.data === "object") {
          ver.data.seriesId = slug;
        }
      });
    }
  }
  function renameSeries(entry) {
    if (!entry || typeof window === "undefined" || typeof window.prompt !== "function")
      return false;
    const currentName = (entry.title ?? entry.apicurioArtifactName ?? "").toString().trim() || getModelDisplayTitle(entry, "Series");
    const nameResponse = window.prompt("Series name", currentName);
    if (nameResponse == null) return false;
    const nextName = nameResponse.trim();
    if (!nextName) return false;
    const existingId = getSeriesId(entry, { seriesName: nextName, fallbackTitle: nextName }) || makeSeriesId(nextName, nextName);
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
      description: "Move selection to the previous or next item in the current category."
    },
    {
      keys: [["Arrow Up"], ["Arrow Down"]],
      description: "Move up/down through items, pausing on category headers before entering the next category at the same relative position."
    },
    {
      keys: [
        ["Cmd/Ctrl", "Arrow Up"],
        ["Cmd/Ctrl", "Arrow Down"]
      ],
      description: "Reorder the selected category (or the category that holds the selected item)."
    },
    // --- STRUCTURAL MANIPULATION (Moving Items) ---
    {
      keys: [
        ["Shift", "Arrow Left"],
        ["Shift", "Arrow Right"]
      ],
      description: "Reorder the selected item inside its category."
    },
    {
      keys: [
        ["Shift", "Arrow Up"],
        ["Shift", "Arrow Down"]
      ],
      description: "Move the selected item to the previous or next category."
    },
    // --- VIEW & UI CONTROL ---
    {
      keys: [
        ["Cmd/Ctrl", "Arrow Left"],
        ["Cmd/Ctrl", "Arrow Right"]
      ],
      description: "Switch to the previous or next map when viewing a series."
    },
    // --- ESSENTIALS & GLOBAL ---
    {
      keys: [["Cmd/Ctrl", "Z"]],
      description: "Undo the last deleted tile or category."
    },
    {
      keys: [["Cmd/Ctrl", "S"]],
      description: "Download the active model JSON (series if multiple versions are open)."
    },
    {
      keys: [["Cmd/Ctrl", "V"]],
      description: "Append JSON models from the clipboard when focus is outside inputs."
    },
    // --- BASIC INTERACTION ---
    {
      keys: [["Enter"], ["Space"]],
      description: "Activate a focused tile, same as clicking it."
    },
    {
      keys: [["F2"]],
      description: "Edit the selected item; when a category (not an item) is selected, open the category editor."
    },
    {
      keys: [["Delete"]],
      description: "Delete the selected item or category (use Cmd/Ctrl+Z to undo)."
    },
    {
      keys: [["Insert"]],
      description: "Add a new category at the bottom of the map."
    },
    { keys: [["Escape"]], description: "Unselect item or close the open preview popover." }
  ];
  function ensureModelMetadata(data, { titleHint = "Untitled Model", idHint } = {}) {
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
    var _a, _b;
    const parseId = (value) => {
      const str = (value ?? "").toString().trim();
      if (!str) return { base: "", suffix: null };
      const match = str.match(/^(.*?)-(\d+)$/);
      return {
        base: match ? match[1] : str,
        suffix: match ? Number.parseInt(match[2], 10) : null
      };
    };
    const versions = Array.isArray(entry == null ? void 0 : entry.apicurioVersions) ? entry.apicurioVersions : [];
    const activeId = (((_a = entry == null ? void 0 : entry.data) == null ? void 0 : _a.id) ?? "").toString().trim();
    let base = parseId(activeId).base;
    if (!base) {
      for (const ver of versions) {
        if (ver == null ? void 0 : ver.isCategoryView) continue;
        const parsed = parseId(((_b = ver == null ? void 0 : ver.data) == null ? void 0 : _b.id) ?? (ver == null ? void 0 : ver.id) ?? "");
        if (parsed.base) {
          base = parsed.base;
          break;
        }
      }
    }
    if (!base) {
      const fallback = makeDownloadName(
        getSeriesId(entry) || getModelSourceLabel(entry) || getModelTitle(entry, "model")
      );
      base = fallback;
    }
    let maxSuffix = 0;
    versions.forEach((ver) => {
      var _a2;
      if (ver == null ? void 0 : ver.isCategoryView) return;
      const parsed = parseId(((_a2 = ver == null ? void 0 : ver.data) == null ? void 0 : _a2.id) ?? (ver == null ? void 0 : ver.id) ?? "");
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
    var _a;
    if (!entry) return fallback;
    const candidate = (((_a = entry.data) == null ? void 0 : _a.title) ?? entry.title ?? "").toString().trim();
    return candidate || fallback;
  }
  function getModelDisplayTitle(entry, fallback = "Untitled Model") {
    var _a;
    const isSeries = ((_a = entry == null ? void 0 : entry.apicurioVersions) == null ? void 0 : _a.length) > 1 || (entry == null ? void 0 : entry.isSeries);
    if (isSeries) {
      const seriesTitle = ((entry == null ? void 0 : entry.title) ?? "").toString().trim() || ((entry == null ? void 0 : entry.apicurioArtifactName) ?? "").toString().trim();
      if (seriesTitle) return seriesTitle;
      const modelId = getModelId(entry);
      if (modelId) return `${modelId} series`;
      return fallback;
    }
    return getModelTitle(entry, fallback);
  }
  function getModelId(entry) {
    var _a;
    const seriesId = getSeriesId(entry);
    if (seriesId) return seriesId;
    const candidate = (_a = entry == null ? void 0 : entry.data) == null ? void 0 : _a.id;
    if (!candidate) return null;
    const trimmed = candidate.toString().trim();
    return trimmed || null;
  }
  function getModelSourceLabel(entry) {
    if (!(entry == null ? void 0 : entry.sourcePath)) return null;
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
    var _a;
    if (entryIndex < 0 || entryIndex >= models.length) return true;
    if (!jsonBox) return true;
    const entry = models[entryIndex];
    const text2 = (jsonBox.value || "").trim();
    if (!text2) return true;
    let parsed;
    try {
      parsed = JSON.parse(text2);
    } catch (err) {
      alert("Current JSON is invalid. Fix it before switching versions.");
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
    if (activeVerIdx >= 0 && ((_a = entry.apicurioVersions) == null ? void 0 : _a[activeVerIdx])) {
      entry.apicurioVersions[activeVerIdx].data = parsed;
    }
    return true;
  }
  function collectAllItemIds2(modelData) {
    const ids = /* @__PURE__ */ new Set();
    ((modelData == null ? void 0 : modelData.categories) || []).forEach(
      (cat) => (cat.items || []).forEach((it) => {
        if (it == null ? void 0 : it.id) ids.add(it.id);
      })
    );
    return ids;
  }
  function findItemAndCategoryById(itemId) {
    if (activeIndex < 0 || !itemId) return null;
    const mobj = models[activeIndex].data;
    const categories = (mobj == null ? void 0 : mobj.categories) || [];
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
  function makeUniqueItemId(base, modelData) {
    const ids = collectAllItemIds2(modelData);
    let candidate = makeDownloadName(base || "item");
    if (!ids.has(candidate)) return candidate;
    const suffix = () => uid().slice(0, 4);
    while (ids.has(candidate)) {
      candidate = `${makeDownloadName(base || "item")}-${suffix()}`;
    }
    return candidate;
  }
  function makeUniqueCategoryId(base = "category", modelData) {
    const categories = (modelData == null ? void 0 : modelData.categories) || [];
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
    collectAllItemIds: collectAllItemIds2,
    updateItemReferences,
    loadActiveIntoEditor,
    rebuildFromActive,
    select: (id) => select(id),
    onSelectionRenamed: (oldId, newId) => {
      var _a;
      if (selection === oldId) {
        selection = newId;
        syncSelectionClass();
      }
      if (((_a = lastDeletedItem == null ? void 0 : lastDeletedItem.item) == null ? void 0 : _a.id) === oldId) lastDeletedItem.item.id = newId;
    },
    makeSlug: makeDownloadName,
    isAutoIdFromNameEnabled: () => autoIdFromNameEnabled
  });
  function createCategoryEditor({
    getActiveModelData,
    loadActiveIntoEditor: loadActiveIntoEditor2,
    rebuildFromActive: rebuildFromActive2,
    selectCategory: selectCategory2,
    onCategoryRenamed
  }) {
    const state = {
      wrapper: null,
      fields: {},
      categoryId: null,
      modelData: null,
      idManuallyEdited: false,
      autoSyncEnabled: true
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
        var _a, _b;
        (_a = state.fields.titleInput) == null ? void 0 : _a.focus();
        (_b = state.fields.titleInput) == null ? void 0 : _b.select();
      });
    };
    const syncCategoryIdFromTitle = ({ force } = {}) => {
      var _a, _b;
      if (!autoIdFromNameEnabled || !state.autoSyncEnabled) return;
      if (!((_a = state.fields) == null ? void 0 : _a.idInput) || !((_b = state.fields) == null ? void 0 : _b.titleInput)) return;
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
      loadActiveIntoEditor2();
      rebuildFromActive2();
      selectCategory2(nextId, { scrollIntoView: true });
      return true;
    };
    const save = () => {
      try {
        applyEdits();
        hide();
        return true;
      } catch (error) {
        console.warn("[CategoryEditor] save failed", error);
        setError((error == null ? void 0 : error.message) || "Unable to save category.");
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
      meta.innerHTML = '<div class="item-editor__meta-label">Category</div><div class="item-editor__meta-value"></div>';
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
      syncHint.textContent = "Turn off to keep typing titles without changing the ID.";
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
        syncCheckbox
      };
      return wrapper;
    };
    const open = (catId) => {
      if (!catId) return false;
      const modal = ensureModal();
      if (!modal) return false;
      const modelData = getActiveModelData();
      const categories = (modelData == null ? void 0 : modelData.categories) || [];
      const category = categories.find((cat) => cat.id === catId);
      if (!category) return false;
      state.categoryId = category.id;
      state.modelData = modelData;
      state.idManuallyEdited = false;
      const autoSyncAllowed = !!autoIdFromNameEnabled;
      state.autoSyncEnabled = autoSyncAllowed;
      state.fields.metaLabel.textContent = category.title || category.id || "Category";
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
      isOpen: () => !!state.wrapper && state.wrapper.hidden === false
    };
  }
  const categoryEditor = createCategoryEditor({
    getActiveModelData: () => {
      var _a;
      return (_a = models[activeIndex]) == null ? void 0 : _a.data;
    },
    loadActiveIntoEditor,
    rebuildFromActive,
    selectCategory: (catId, opts = {}) => selectCategory(catId, opts),
    onCategoryRenamed: (oldId, newId) => {
      if (selectedCategoryId === oldId) {
        selectedCategoryId = newId;
        syncSelectionClass();
      }
    }
  });
  const {
    handleTileContextMenu,
    hidePreview,
    handleDocumentClick: handleTileMenuDocumentClick,
    handleWindowResize: handleTileMenuWindowResize,
    handleWindowScroll: handleTileMenuWindowScroll,
    updateColorPresets: updateTileMenuColors
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
    colorPresets
  });
  function ensureVersionContainer(entry, { versionLabel = "1", createdOn } = {}) {
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
      createdOn: createdOn || (/* @__PURE__ */ new Date()).toISOString()
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
    mapTitle = "Blank map"
  } = {}) {
    const baseId = makeDownloadName(
      `${seriesId || "blank"}-${makeTimestampSlug()}`
    );
    const payload = {
      id: baseId,
      title: mapTitle,
      categories: [],
      abstract: ""
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
      mapTitle: "Blank map"
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
          createdOn: (/* @__PURE__ */ new Date()).toISOString()
        }
      ],
      apicurioActiveVersionIndex: 0,
      isSeries: true
    };
    applySeriesSlug(entry, seriesId);
    ensureSeriesId(entry, {
      seriesName: seriesTitle,
      fallbackTitle: seriesTitle
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
    var _a, _b, _c;
    if ((entry == null ? void 0 : entry.isSeries) || ((_a = entry == null ? void 0 : entry.apicurioVersions) == null ? void 0 : _a.length) > 1) {
      const name = entry.title || getModelTitle(entry);
      ensureSeriesId(entry, { seriesName: name, fallbackTitle: name });
      syncCategoryViewVersions(entry);
    }
    const modelId = getModelId(entry);
    if (!modelId) {
      ensureVersionContainer(entry, {
        versionLabel: versionLabel || "1",
        createdOn
      });
      models.push(entry);
      return models.length - 1;
    }
    const existingIndex = models.findIndex((m) => getModelId(m) === modelId);
    if (existingIndex === -1) {
      ensureVersionContainer(entry, {
        versionLabel: versionLabel || "1",
        createdOn
      });
      models.push(entry);
      return models.length - 1;
    }
    const target2 = models[existingIndex];
    if (!Array.isArray(target2.apicurioVersions) || !target2.apicurioVersions.length) {
      target2.apicurioVersions = [
        {
          version: "1",
          data: target2.data,
          createdOn: (_c = (_b = target2.apicurioVersions) == null ? void 0 : _b[0]) == null ? void 0 : _c.createdOn
        }
      ];
      target2.apicurioActiveVersionIndex = 0;
      const mergedName = target2.title || getModelTitle(target2);
      ensureSeriesId(target2, {
        seriesName: mergedName,
        fallbackTitle: mergedName
      });
    }
    const label = String(target2.apicurioVersions.length + 1);
    target2.apicurioVersions.push({
      version: label,
      data: entry.data,
      createdOn: createdOn || (/* @__PURE__ */ new Date()).toISOString()
    });
    target2.apicurioActiveVersionIndex = target2.apicurioVersions.length - 1;
    target2.data = entry.data;
    target2.title = getModelTitle(entry) || target2.title;
    target2.isSeries = true;
    const seriesName = target2.title || getModelTitle(target2);
    ensureSeriesId(target2, { seriesName, fallbackTitle: seriesName });
    return existingIndex;
  }
  function createNewVersionFromActive({ versionLabel } = {}) {
    var _a;
    if (activeIndex < 0 || !models[activeIndex]) {
      throw new Error("Load or select a model before creating a version.");
    }
    const target2 = models[activeIndex];
    ensureVersionContainer(target2, { versionLabel: "1" });
    const nextId = deriveNextModelIdForVersion(target2);
    let copy;
    try {
      copy = cloneModelData(target2.data);
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
      titleHint: getModelTitle(target2),
      idHint: getModelId(target2) || getSeriesId(target2)
    });
    const label = versionLabel || String((((_a = target2.apicurioVersions) == null ? void 0 : _a.length) || 0) + 1);
    const newVersion = {
      version: label,
      data: copy,
      createdOn: (/* @__PURE__ */ new Date()).toISOString()
    };
    target2.apicurioVersions.push(newVersion);
    target2.apicurioActiveVersionIndex = target2.apicurioVersions.length - 1;
    target2.data = copy;
    target2.isSeries = true;
    const seriesName = target2.title || getModelTitle(target2);
    ensureSeriesId(target2, { seriesName, fallbackTitle: seriesName });
    return activeIndex;
  }
  function syncDocumentTitle() {
    const activeModel = activeIndex >= 0 && models[activeIndex] ? models[activeIndex] : null;
    const modelId = getModelId(activeModel);
    document.title = modelId ? `${modelId}-blockscape` : defaultDocumentTitle;
  }
  function buildSeriesPayload(entry) {
    if (!entry) return null;
    syncCategoryViewVersions(entry);
    const versions = entry.apicurioVersions;
    if (!Array.isArray(versions) || versions.length <= 1) return null;
    const seriesName = entry.title || entry.apicurioArtifactName || getModelTitle(entry);
    ensureSeriesId(entry, { seriesName, fallbackTitle: seriesName });
    const filtered = versions.filter((ver, idx) => {
      var _a;
      const versionId = ((ver == null ? void 0 : ver.version) ?? "").toString().trim();
      const dataId = (((_a = ver == null ? void 0 : ver.data) == null ? void 0 : _a.id) ?? (ver == null ? void 0 : ver.id) ?? "").toString().trim();
      if ((ver == null ? void 0 : ver.isCategoryView) || versionId.startsWith(CATEGORY_VIEW_VERSION_PREFIX)) {
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
    const text2 = jsonBox.value || "";
    if (!text2.trim()) {
      console.warn("[Blockscape] download ignored: JSON box is empty.");
      return false;
    }
    const active = models[activeIndex];
    const seriesPayload = preferSeries ? buildSeriesPayload(active) : null;
    const isSeries = Boolean(seriesPayload);
    const payloadText = isSeries ? JSON.stringify(seriesPayload, null, 2) : text2;
    const seriesId = getSeriesId(active);
    const modelId = getModelId(active);
    const title = seriesId || modelId || getModelTitle(active, "blockscape");
    const suffix = isSeries ? "-series" : "";
    const filename = `${makeDownloadName(title)}${suffix}.bs`;
    download(filename, payloadText);
    console.log(`[Blockscape] saved JSON (${source}):`, filename);
    return true;
  }
  const LETTER_COLOR_MAP = tokens.palette.letter;
  const LETTER_COLOR_FALLBACK = tokens.palette.letterFallback;
  function getBadgeColor(text2, explicit) {
    if (explicit && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(explicit))
      return explicit;
    const ch = (text2 || "?").charAt(0).toUpperCase();
    return LETTER_COLOR_MAP[ch] || LETTER_COLOR_FALLBACK;
  }
  function idealTextColor(bgHex) {
    const hex = bgHex.replace("#", "");
    const expanded = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    const bigint = parseInt(expanded, 16);
    const r = bigint >> 16 & 255, g = bigint >> 8 & 255, b = bigint & 255;
    const L = 0.2126 * Math.pow(r / 255, 2.2) + 0.7152 * Math.pow(g / 255, 2.2) + 0.0722 * Math.pow(b / 255, 2.2);
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
    var _a;
    if (!((_a = entry == null ? void 0 : entry.apicurioVersions) == null ? void 0 : _a[versionIndex]))
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
    panel == null ? void 0 : panel.focus({ preventScroll: true });
  }
  function closeShortcutHelp() {
    if (!shortcutHelp || shortcutHelp.hidden) return;
    shortcutHelp.hidden = true;
    shortcutHelp.setAttribute("aria-hidden", "true");
    document.body.classList.remove("shortcut-help-open");
    const target2 = lastShortcutTrigger;
    if (target2 == null ? void 0 : target2.focus) {
      target2.focus({ preventScroll: true });
    } else if (helpButton == null ? void 0 : helpButton.focus) {
      helpButton.focus({ preventScroll: true });
    }
  }
  function openNewPanel() {
    if (!newPanel) return;
    newPanel.hidden = false;
    newPanel.setAttribute("aria-hidden", "false");
    document.body.classList.add("shortcut-help-open");
    const panel = newPanel.querySelector(".shortcut-help__panel");
    panel == null ? void 0 : panel.focus({ preventScroll: true });
  }
  function closeNewPanel() {
    if (!newPanel || newPanel.hidden) return;
    newPanel.hidden = true;
    newPanel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("shortcut-help-open");
    if (newPanelButton == null ? void 0 : newPanelButton.focus) {
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
    return (query || "").toString().toLowerCase().split(/\s+/).map((t) => t.trim()).filter(Boolean);
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
      var _a;
      const name = (((_a = t.querySelector(".name")) == null ? void 0 : _a.textContent) || "").toLowerCase();
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
      var _a;
      const modelTitle = getModelDisplayTitle(entry);
      const modelId = getModelId(entry) || "";
      const modelHaystack = `${modelTitle} ${modelId}`.toLowerCase();
      if (terms.every((t) => modelHaystack.includes(t))) {
        results.push({
          type: "model",
          modelIndex,
          modelTitle,
          modelId
        });
      }
      const categories = Array.isArray((_a = entry.data) == null ? void 0 : _a.categories) ? entry.data.categories : [];
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
      if (match.modelIndex === activeIndex && (!match.itemId || selection === match.itemId)) {
        btn.classList.add("is-active");
      }
      const primary = document.createElement("div");
      primary.className = "search-result__primary";
      const title = document.createElement("span");
      title.textContent = match.type === "model" ? match.modelTitle : match.itemName || match.itemId || "Item";
      primary.appendChild(title);
      const badge = document.createElement("span");
      badge.className = "search-result__badge";
      badge.textContent = match.type === "item" ? match.categoryTitle || "Item" : "Model";
      primary.appendChild(badge);
      const meta = document.createElement("div");
      meta.className = "search-result__meta";
      const modelMeta = document.createElement("span");
      modelMeta.textContent = match.modelId ? `${match.modelTitle} · ${match.modelId}` : match.modelTitle;
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
      var _a;
      if (activeIndex !== match.modelIndex) return;
      const tile = (_a = index.get(match.itemId)) == null ? void 0 : _a.el;
      if (!tile) return;
      select(match.itemId);
      tile.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center"
      });
      tile.focus({ preventScroll: true });
    });
  }
  function setActive(i) {
    var _a;
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
    if (typeof (localBackend == null ? void 0 : localBackend.highlightSource) === "function") {
      const targetPath = ((_a = models[i]) == null ? void 0 : _a.sourcePath) || null;
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
      var _a;
      const li = document.createElement("li");
      li.className = "model-nav-item";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "model-nav-button" + (i === activeIndex ? " is-active" : "");
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
      const categories = Array.isArray((_a = m.data) == null ? void 0 : _a.categories) ? m.data.categories : [];
      const itemsCount = categories.reduce(
        (sum, cat) => sum + (cat.items || []).length,
        0
      );
      const meta = document.createElement("span");
      meta.className = "model-nav-meta";
      const versionsInfo = m.apicurioVersions && m.apicurioVersions.length > 1 ? ` · ${m.apicurioVersions.length} maps` : "";
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
    const versions = ((entry == null ? void 0 : entry.apicurioVersions) || []).filter(
      (ver) => !(ver == null ? void 0 : ver.isCategoryView)
    );
    if (versions.length < 2) return [];
    const categoriesById = /* @__PURE__ */ new Map();
    versions.forEach((ver, idx) => {
      const data = ver == null ? void 0 : ver.data;
      if (!data || !Array.isArray(data.categories)) return;
      const mapTitle = getModelTitle(data, `Map ${idx + 1}`);
      const mapId = (data.id ?? "").toString().trim() || makeDownloadName(mapTitle || `map-${idx + 1}`);
      const mapSlug = makeDownloadName(mapId || mapTitle || `map-${idx + 1}`);
      data.categories.forEach((cat) => {
        const catId = ((cat == null ? void 0 : cat.id) ?? "").toString().trim();
        if (!catId) return;
        if (!categoriesById.has(catId)) {
          categoriesById.set(catId, {
            catTitle: cat.title || catId,
            sources: []
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
          versionIndex: idx
        });
      });
    });
    const seriesId = getSeriesId(entry) || null;
    const seriesTitle = (entry == null ? void 0 : entry.title) || (entry == null ? void 0 : entry.apicurioArtifactName) || getModelTitle(entry, "Series");
    const derived = [];
    categoriesById.forEach((info, catId) => {
      var _a;
      if ((((_a = info.sources) == null ? void 0 : _a.length) || 0) < 2) return;
      const catTitle = info.catTitle || catId;
      const usedCategoryIds = /* @__PURE__ */ new Set();
      const categories = info.sources.map((source) => {
        var _a2;
        const baseCatId = source.mapSlug || makeDownloadName(source.mapTitle || source.mapId) || `map-${source.versionIndex + 1}`;
        let categoryId = baseCatId;
        if (usedCategoryIds.has(categoryId)) {
          categoryId = `${categoryId}-${source.versionIndex + 1}`;
        }
        usedCategoryIds.add(categoryId);
        const idMap = /* @__PURE__ */ new Map();
        const items = (((_a2 = source.category) == null ? void 0 : _a2.items) || []).map((item, itemIdx) => {
          const originalId = ((item == null ? void 0 : item.id) ?? "").toString().trim() || `item-${itemIdx + 1}`;
          const nextId = `${categoryId}-${originalId}`;
          idMap.set(originalId, nextId);
          const clone = { ...item, id: nextId };
          clone.deps = Array.isArray(item == null ? void 0 : item.deps) ? [...item.deps] : [];
          return clone;
        });
        items.forEach((clone) => {
          clone.deps = (clone.deps || []).map((dep) => idMap.get(dep)).filter(Boolean);
        });
        return {
          id: categoryId,
          title: source.mapTitle || source.mapId || `Map ${source.versionIndex + 1}`,
          items
        };
      });
      const viewData = {
        id: makeDownloadName(`${catId}-category-view`),
        title: catTitle,
        abstract: `Items from "${catTitle}" across ${info.sources.length} maps in this series${seriesTitle ? ` (${seriesTitle})` : ""}.`,
        categories
      };
      if (seriesId) viewData.seriesId = seriesId;
      ensureModelMetadata(viewData, {
        titleHint: catTitle,
        idHint: `${seriesId || "series"}-${catId}`
      });
      derived.push({
        version: `${CATEGORY_VIEW_VERSION_PREFIX}${catId}`,
        data: viewData,
        isCategoryView: true,
        categoryViewKey: catId
      });
    });
    return derived;
  }
  function getVersionViewKey(version) {
    var _a;
    if (!version) return null;
    if (version.isCategoryView && version.categoryViewKey) {
      return `${CATEGORY_VIEW_VERSION_PREFIX}${version.categoryViewKey}`;
    }
    const dataId = (((_a = version.data) == null ? void 0 : _a.id) ?? version.id ?? "").toString().trim();
    if (dataId) return dataId;
    const label = (version.version ?? "").toString().trim();
    return label || null;
  }
  function syncCategoryViewVersions(entry) {
    var _a;
    if (!((_a = entry == null ? void 0 : entry.apicurioVersions) == null ? void 0 : _a.length)) return entry;
    const prevKey = getVersionViewKey(
      entry.apicurioVersions[entry.apicurioActiveVersionIndex]
    );
    const baseVersions = entry.apicurioVersions.filter(
      (ver) => !(ver == null ? void 0 : ver.isCategoryView)
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
      const active2 = entry.apicurioVersions[entry.apicurioActiveVersionIndex];
      if (active2 == null ? void 0 : active2.data) entry.data = active2.data;
      return entry;
    }
    const derived = buildCategoryViewVersions({
      ...entry,
      apicurioVersions: baseVersions
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
    const active = entry.apicurioVersions[entry.apicurioActiveVersionIndex];
    if (active == null ? void 0 : active.data) entry.data = active.data;
    return entry;
  }
  function buildSeriesEntry(list, titleBase = "Pasted", options = {}) {
    const array = Array.isArray(list) ? list : [];
    if (!array.length) return [];
    const normalized = array.map((obj, idx) => {
      if (!obj || typeof obj !== "object") return null;
      ensureModelMetadata(obj, { titleHint: `${titleBase} #${idx + 1}` });
      return { obj, idx };
    }).filter(Boolean);
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
    const seriesId = ensureSeriesId(entry, {
      seriesName: seriesTitle,
      fallbackTitle: seriesTitle
    });
    if (seriesId) entry.id = seriesId;
    syncCategoryViewVersions(entry);
    return [entry];
  }
  function normalizeToModelsFromValue(value, titleBase = "Pasted", options = {}) {
    if (Array.isArray(value)) {
      return buildSeriesEntry(value, titleBase, options);
    }
    if (!value || typeof value !== "object") return [];
    ensureModelMetadata(value, { titleHint: `${titleBase} #1` });
    return [
      {
        id: uid(),
        title: value.title || `${titleBase} #1`,
        data: value
      }
    ];
  }
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
          seriesTitleOverride: userTitle || defaultTitle
        };
      }
      const normalized = normalizeToModelsFromValue(
        parsed,
        titleBase,
        normalizeOptions
      );
      if (normalized.length) return normalized;
    }
    const parts = trimmed.split(/^\s*(?:---|%%%)\s*$/m).map((s) => s.trim()).filter(Boolean);
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
    const tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select";
  }
  function shouldHandleGlobalPaste() {
    const active = document.activeElement;
    if (!active || active === document.body || active === document.documentElement)
      return true;
    return !isEditableElement(active);
  }
  function looksLikeModelJson(text2) {
    if (!text2) return false;
    const defenced = unwrapMarkdownCodeBlock(text2) || "";
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
      } catch (_) {
      }
      return null;
    }
    if ((payload == null ? void 0 : payload.source) !== "editor") return null;
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
  function consumeShareLink() {
    const hash = window.location.hash || "";
    let token = null;
    const hashMatch = hash.match(/share=([^&]+)/);
    if (hashMatch) {
      token = hashMatch[1];
    }
    if (!token) {
      const params = new URLSearchParams(window.location.search);
      if (params.has("share")) {
        token = params.get("share");
      }
    }
    if (!token) return null;
    let payload;
    try {
      const text2 = base64UrlDecode(token);
      payload = JSON.parse(text2);
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
          apicurioArtifactName: seriesName || entry.apicurioArtifactName
        },
        { versionLabel: "shared" }
      );
      if (firstIndex == null) firstIndex = idx;
    });
    return firstIndex;
  }
  async function consumeServerPathLoad() {
    const serverPath = extractServerFilePathFromUrl();
    if (!(serverPath == null ? void 0 : serverPath.path)) return null;
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
      if (typeof (result == null ? void 0 : result.firstIndex) === "number") {
        if (typeof (localBackend == null ? void 0 : localBackend.highlightSource) === "function") {
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
    let target2 = null;
    const hashMatch = hash.match(/load=([^&]+)/);
    if (hashMatch) {
      try {
        target2 = decodeURIComponent(hashMatch[1]);
      } catch {
        target2 = hashMatch[1];
      }
    }
    if (!target2) {
      const params = new URLSearchParams(window.location.search);
      if (params.has("load")) {
        target2 = params.get("load");
      }
    }
    if (!target2) return null;
    try {
      const idx = await loadFromUrl(target2);
      return typeof idx === "number" ? idx : null;
    } catch (err) {
      console.warn("[Blockscape] load param failed", err);
      return null;
    }
  }
  function parse(mObj) {
    console.log(
      "[Blockscape] parsing model; categories=",
      ((mObj == null ? void 0 : mObj.categories) || []).length
    );
    const fwd = /* @__PURE__ */ new Map();
    const rev = /* @__PURE__ */ new Map();
    const seen = /* @__PURE__ */ new Set();
    (mObj.categories || []).forEach(
      (c) => (c.items || []).forEach((it) => {
        seen.add(it.id);
        const deps = new Set(it.deps || []);
        fwd.set(it.id, deps);
        deps.forEach((d) => {
          if (!rev.has(d)) rev.set(d, /* @__PURE__ */ new Set());
          rev.get(d).add(it.id);
        });
      })
    );
    const reusedLocal = /* @__PURE__ */ new Set();
    rev.forEach((dependents, node) => {
      if (((dependents == null ? void 0 : dependents.size) || 0) >= 2) reusedLocal.add(node);
    });
    return { m: mObj, fwd, rev, reusedLocal, seen };
  }
  function generateLetterImage(text2, explicitColor) {
    console.log("[Blockscape] generateLetterImage for:", text2);
    const canvas = document.createElement("canvas");
    const size = 44;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const letter = (text2 || "?").charAt(0).toUpperCase();
    const bg = getBadgeColor(text2, explicitColor);
    const fg = idealTextColor(bg);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.font = `bold ${size * 0.5}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, size / 2, size / 2);
    return canvas.toDataURL("image/png");
  }
  function getActiveApicurioVersionIndex(entry) {
    var _a;
    if (!((_a = entry == null ? void 0 : entry.apicurioVersions) == null ? void 0 : _a.length)) return -1;
    const idx = Number.isInteger(entry.apicurioActiveVersionIndex) ? entry.apicurioActiveVersionIndex : 0;
    return Math.min(Math.max(idx, 0), entry.apicurioVersions.length - 1);
  }
  function getActiveApicurioVersionLabel(entry) {
    const idx = getActiveApicurioVersionIndex(entry);
    if (idx === -1) return null;
    const versionEntry = entry.apicurioVersions[idx];
    return (versionEntry == null ? void 0 : versionEntry.version) ?? null;
  }
  function getThumbScrollKey(entry, fallback = "active") {
    return getSeriesId(entry) || getModelId(entry) || (entry == null ? void 0 : entry.apicurioArtifactId) || (entry == null ? void 0 : entry.id) || fallback;
  }
  function buildModelIdToVersionIndex(entry) {
    const map = /* @__PURE__ */ new Map();
    ((entry == null ? void 0 : entry.apicurioVersions) || []).forEach((ver, idx) => {
      var _a, _b;
      const id = (((_a = ver == null ? void 0 : ver.data) == null ? void 0 : _a.id) ?? "").toString().trim();
      if (id) map.set(id, idx);
      const seriesId = (((_b = ver == null ? void 0 : ver.data) == null ? void 0 : _b.seriesId) ?? "").toString().trim();
      if (seriesId && !map.has(seriesId)) map.set(seriesId, idx);
    });
    return map;
  }
  function resolveVersionIndexFromCategory(cat, seriesIdLookup) {
    if (!cat || !seriesIdLookup) return null;
    const candidates = /* @__PURE__ */ new Set();
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
  const thumbnailCache = /* @__PURE__ */ new WeakMap();
  function getSeriesThumbnail(entry, versionIdx) {
    var _a;
    if (!((_a = entry == null ? void 0 : entry.apicurioVersions) == null ? void 0 : _a[versionIdx])) return null;
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
    const canvasBg = getCssVarValue("--color-surface-ghost") || tokens.color.surfaceGhost;
    const canvasBorder = getCssVarValue("--color-border-muted") || tokens.color.borderMuted;
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = canvasBorder;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
    const topPad = 8;
    const bottomPad = 8;
    const dotRadius = 4;
    const cats = Array.isArray(payload == null ? void 0 : payload.categories) ? payload.categories : [];
    const catCount = Math.max(cats.length, 1);
    const usableWidth = width - dotRadius * 2;
    const desiredColGap = dotRadius * 3;
    const colGap = catCount > 1 ? Math.min(desiredColGap, usableWidth / (catCount - 1)) : 0;
    const colStart = catCount > 1 ? (width - colGap * (catCount - 1)) / 2 : width / 2;
    cats.forEach((cat, cIdx) => {
      const xCenter = colStart + cIdx * colGap;
      const items = Array.isArray(cat.items) ? cat.items : [];
      const itemCount = Math.max(items.length, 1);
      const availableHeight = height - topPad - bottomPad - dotRadius * 2;
      const gap = itemCount > 1 ? Math.min(dotRadius * 3, availableHeight / (itemCount - 1)) : 0;
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
    var _a;
    clearSeriesNavNotice();
    if (entryIndex < 0 || entryIndex >= models.length) return false;
    const entry = models[entryIndex];
    if (!((_a = entry == null ? void 0 : entry.apicurioVersions) == null ? void 0 : _a.length)) return false;
    const persisted = persistActiveEdits(entryIndex);
    if (!persisted) return false;
    const count = entry.apicurioVersions.length;
    const normalized = (versionIndex % count + count) % count;
    const target2 = entry.apicurioVersions[normalized];
    if (!(target2 == null ? void 0 : target2.data)) return false;
    entry.apicurioActiveVersionIndex = normalized;
    entry.data = target2.data;
    pendingInfoPreview = true;
    selection = null;
    selectionRelations = null;
    syncSelectionClass();
    loadActiveIntoEditor();
    rebuildFromActive();
    return true;
  }
  function stepApicurioVersion(step) {
    var _a;
    if (!step || activeIndex < 0) return false;
    const entry = models[activeIndex];
    if (!((_a = entry == null ? void 0 : entry.apicurioVersions) == null ? void 0 : _a.length)) return false;
    const current = getActiveApicurioVersionIndex(entry);
    if (current === -1) return false;
    return setActiveApicurioVersion(activeIndex, current + step);
  }
  function removeApicurioVersion(entryIndex, versionIndex) {
    clearSeriesNavNotice();
    if (entryIndex < 0 || entryIndex >= models.length) return false;
    const entry = models[entryIndex];
    if (!Array.isArray(entry == null ? void 0 : entry.apicurioVersions) || entry.apicurioVersions.length <= 1) {
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
    const activeEntry = entry.apicurioVersions[entry.apicurioActiveVersionIndex];
    entry.data = (activeEntry == null ? void 0 : activeEntry.data) || entry.data;
    entry.isSeries = entry.apicurioVersions.length > 1;
    setActive(entryIndex);
    return true;
  }
  function renderVersionNavigator(entry) {
    if (!(entry == null ? void 0 : entry.apicurioVersions) || !entry.apicurioVersions.length) return null;
    const minVersions = Math.max(1, features.seriesNavMinVersions || 1);
    if (entry.apicurioVersions.length < minVersions) return null;
    const nav = document.createElement("div");
    nav.className = "version-nav";
    const title = document.createElement("div");
    title.className = "version-nav__title";
    title.textContent = entry.apicurioArtifactName || entry.apicurioArtifactId || getModelId(entry) || "Artifact";
    title.title = "Double-click to rename this series";
    title.setAttribute("role", "button");
    title.tabIndex = 0;
    title.addEventListener("dblclick", () => {
      var _a;
      const target2 = models[activeIndex];
      if (!((_a = target2 == null ? void 0 : target2.apicurioVersions) == null ? void 0 : _a.length)) return;
      const renamed = renameSeries(target2);
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
    status.textContent = `No. in series ${activeVersionLabel} (${activeIdx + 1} of ${entry.apicurioVersions.length})`;
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
      var _a, _b;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "version-nav__thumb";
      if (ver == null ? void 0 : ver.isCategoryView) btn.classList.add("version-nav__thumb--category");
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
      const fullId = (((_a = ver == null ? void 0 : ver.data) == null ? void 0 : _a.id) ?? (ver == null ? void 0 : ver.id) ?? "").toString().trim();
      let labelValue = fullId || ((ver == null ? void 0 : ver.version) ? `v${ver.version}` : `${idx + 1}`);
      let labelTitle = fullId || labelValue;
      if (ver == null ? void 0 : ver.isCategoryView) {
        const catLabel = ((_b = ver.data) == null ? void 0 : _b.title) || ver.categoryViewKey || labelValue || "Category";
        labelValue = catLabel;
        labelTitle = `Category view: ${catLabel}`;
        btn.dataset.computed = "true";
      }
      lblText.textContent = labelValue;
      lbl.title = labelTitle;
      lbl.appendChild(lblText);
      btn.appendChild(lbl);
      registerThumbLabel(lbl, lblText);
      if (entry.apicurioVersions.length > 1 && !(ver == null ? void 0 : ver.isCategoryView)) {
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
      btn.addEventListener(
        "click",
        () => setActiveApicurioVersion(activeIndex, idx)
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
        alert((err == null ? void 0 : err.message) || "Unable to create a new version right now.");
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
  function render() {
    var _a, _b;
    if (!model) return;
    const activeModelEntry = activeIndex >= 0 && models[activeIndex] ? models[activeIndex] : null;
    const prevThumbs = app && app.querySelector ? app.querySelector(".version-nav__thumbs") : null;
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
      var _a2, _b2, _c;
      const meta = document.createElement("div");
      meta.className = "blockscape-model-meta";
      const titleEl = document.createElement("div");
      titleEl.className = "blockscape-model-title";
      titleEl.textContent = model.m.title && model.m.title.trim() || getModelTitle(models[activeIndex]);
      meta.appendChild(titleEl);
      if (((_a2 = models[activeIndex]) == null ? void 0 : _a2.isSeries) || ((_c = (_b2 = models[activeIndex]) == null ? void 0 : _b2.apicurioVersions) == null ? void 0 : _c.length)) {
        ensureSeriesId(models[activeIndex], {
          seriesName: models[activeIndex].title || model.m.title || getModelTitle(models[activeIndex])
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
    const activeVersionEntry = ((_b = (_a = models[activeIndex]) == null ? void 0 : _a.apicurioVersions) == null ? void 0 : _b[activeSeriesIndex]) || null;
    const activeIsCategoryView = activeViewIsCategory = Boolean(
      (activeVersionEntry == null ? void 0 : activeVersionEntry.isCategoryView) || ((activeVersionEntry == null ? void 0 : activeVersionEntry.version) || "").startsWith(
        CATEGORY_VIEW_VERSION_PREFIX
      )
    );
    infoTabButton = null;
    activeInfoTooltipHtml = "";
    const appendTitleLine = (el, text2) => {
      if (!el || !text2) return;
      el.title = el.title ? `${el.title}
${text2}` : text2;
    };
    const tabDefs = [
      { id: "map", label: "Map", panel: mapPanel },
      { id: "abstract", label: "Info", panel: abstractPanel },
      { id: "source", label: "Settings", panel: sourcePanel },
      { id: "apicurio", label: "Apicurio", panel: apicurioPanel }
    ];
    const apicurioInitiallyEnabled = typeof apicurio.isEnabled === "function" ? apicurio.isEnabled() : false;
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
        t.button.addEventListener(
          "mouseenter",
          () => showTabTooltip(t.button, infoTooltipHtml, { offset: 12 })
        );
        t.button.addEventListener("mouseleave", hideTabTooltip);
        t.button.addEventListener(
          "focus",
          () => showTabTooltip(t.button, infoTooltipHtml, { offset: 12 })
        );
        t.button.addEventListener("blur", hideTabTooltip);
      }
    });
    const resolveInitialTabId = (apicurioEnabled2) => {
      const preferred = tabDefs.find((t) => t.id === lastActiveTabId);
      if (preferred && (preferred.id !== "apicurio" || apicurioEnabled2))
        return preferred.id;
      const firstVisible = tabDefs.find(
        (t) => t.id !== "apicurio" || apicurioEnabled2
      );
      return (firstVisible == null ? void 0 : firstVisible.id) || tabDefs[0].id;
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
      const text2 = document.createElement("span");
      text2.className = "blockscape-tab-toggle__label";
      text2.textContent = label;
      row.append(input, text2);
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
      onChange: (checked) => setThemePreference(checked)
    });
    tabActions.appendChild(tabThemeToggleRow);
    settingsUi.tabThemeToggle = tabThemeToggleInput;
    const { row: tabSecondaryToggleRow, input: tabSecondaryToggleInput } = createTabToggle({
      id: "tabToggleSecondaryLinks",
      label: "Show indirect links",
      checked: showSecondaryLinks,
      onChange: (checked) => applySecondaryLinkVisibility(checked)
    });
    tabActions.appendChild(tabSecondaryToggleRow);
    settingsUi.tabSecondaryLinksToggle = tabSecondaryToggleInput;
    const { row: tabCenterToggleRow, input: tabCenterToggleInput } = createTabToggle({
      id: "tabToggleCenterItems",
      label: "Center",
      checked: centerItems,
      onChange: (checked) => applyCenterPreference(checked)
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
      var _a2, _b2;
      const file = (_a2 = settingsFileInput.files) == null ? void 0 : _a2[0];
      if (!file) return;
      try {
        const raw = await file.text();
        const parsed = JSON.parse(raw);
        const snapshot = (parsed == null ? void 0 : parsed.settings) || parsed;
        const result = applyImportedSettings(snapshot || {}, { refreshObsidianLinks: refreshObsidianLinks2 });
        const appliedCount = ((_b2 = result.applied) == null ? void 0 : _b2.length) || 0;
        showNotice(
          appliedCount ? `Loaded ${appliedCount} setting${appliedCount === 1 ? "" : "s"} from ${file.name}.` : `No matching settings found in ${file.name}.`,
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
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        settings: buildSettingsSnapshot(getCurrentSettingsState(), {
          localBackend
        })
      };
      download("settings.json", JSON.stringify(payload, null, 2));
      showNotice("Settings downloaded.", 2e3);
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
    colorPresetHint.textContent = "Shown in tile context menu for quick coloring.";
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
    const createSettingsToggle = ({
      id,
      label,
      hint,
      checked,
      className = "",
      onChange
    }) => {
      const row = document.createElement("label");
      row.className = ["settings-toggle", className].filter(Boolean).join(" ");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = id;
      input.checked = checked;
      const text2 = document.createElement("span");
      text2.className = "settings-toggle__text";
      const labelSpan = document.createElement("span");
      labelSpan.className = "settings-toggle__label";
      labelSpan.textContent = label;
      text2.appendChild(labelSpan);
      if (hint) {
        const hintSpan = document.createElement("span");
        hintSpan.className = "settings-toggle__hint";
        hintSpan.textContent = hint;
        text2.appendChild(hintSpan);
      }
      row.appendChild(input);
      row.appendChild(text2);
      if (typeof onChange === "function") {
        input.addEventListener("change", () => onChange(input.checked));
      }
      return { row, input };
    };
    const refreshObsidianLinks2 = () => {
      app.querySelectorAll(".tile").forEach((tile) => {
        const id = tile.dataset.id;
        const match = findItemAndCategoryById(id);
        if (!(match == null ? void 0 : match.item)) return;
        const itemExternalMeta = resolveExternalMeta(match.item.external);
        const obsidianUrl = getObsidianLink(match.item, {
          externalMeta: itemExternalMeta,
          seriesIdLookup
        });
        applyObsidianLinkToTile(tile, obsidianUrl);
      });
    };
    const { row: secondaryToggleRow, input: secondaryToggleInput } = createSettingsToggle({
      id: "toggleSecondaryLinks",
      label: "Show indirect links",
      checked: showSecondaryLinks,
      className: "map-controls__toggle",
      onChange: (checked) => applySecondaryLinkVisibility(checked)
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
      }
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
      }
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
        refreshObsidianLinks2();
      }
    });
    settingsPanel.appendChild(obsidianToggleRow);
    settingsUi.obsidianToggle = obsidianToggleInput;
    const hasLocalBackend = typeof (localBackend == null ? void 0 : localBackend.isAvailable) === "function" && localBackend.isAvailable() && typeof (localBackend == null ? void 0 : localBackend.getAutoReloadConfig) === "function";
    if (hasLocalBackend) {
      const { enabled: autoEnabled, intervalMs: autoInterval } = localBackend.getAutoReloadConfig();
      let autoReloadSlider = null;
      const { row: autoReloadToggle, input: autoReloadInput } = createSettingsToggle({
        id: "toggleAutoReload",
        label: "Auto-reload local files",
        hint: "Poll the local backend for file changes and refresh matching models.",
        checked: autoEnabled,
        className: "map-controls__toggle",
        onChange: (checked) => {
          localBackend.setAutoReloadEnabled(checked);
          if (autoReloadSlider) autoReloadSlider.disabled = !checked;
        }
      });
      settingsPanel.appendChild(autoReloadToggle);
      settingsUi.autoReloadToggle = autoReloadInput;
      const formatAutoReloadInterval = (ms) => `${(ms / 1e3).toFixed(2)}s`;
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
    obsidianModeHint.textContent = "Use the tile title or id when building Obsidian links.";
    const obsidianModeOptions = document.createElement("div");
    obsidianModeOptions.className = "settings-radio__options";
    const registerObsidianModeOption = (value, text2) => {
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
        refreshObsidianLinks2();
      });
      const textNode = document.createElement("span");
      textNode.textContent = text2;
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
    obsidianVaultHint.textContent = "Optional. Set the vault name to avoid duplicates.";
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
      refreshObsidianLinks2();
    });
    obsidianVaultRow.append(obsidianVaultText, obsidianVaultInput);
    settingsPanel.appendChild(obsidianVaultRow);
    settingsUi.obsidianVaultInput = obsidianVaultInput;
    const obsidianPluginNote = document.createElement("p");
    obsidianPluginNote.className = "settings-note";
    obsidianPluginNote.innerHTML = 'Requires the Obsidian <a href="https://vinzent03.github.io/obsidian-advanced-uri/" target="_blank" rel="noreferrer noopener">Advanced URI</a> plugin for create/open behavior.';
    settingsPanel.appendChild(obsidianPluginNote);
    const formatSeriesNavWait = (value) => `${(value / 1e3).toFixed(1)}s`;
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
    seriesNavWaitHint.textContent = "Time window to double-click into another map version.";
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
      }
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
    dimHint.textContent = "Adjust how much unrelated tiles fade when dimming is on.";
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
    const formatCompactness = (value) => value === 1 ? "Default" : `${Math.round(value * 100)}%`;
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
    compactHint.textContent = "Adjust padding, gap, and logo size for tiles.";
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
      }
    });
    settingsPanel.appendChild(titleWrapRow);
    settingsUi.titleWrapInput = titleWrapInput;
    const formatTitleWidth = (value) => `${Math.round((value - 1) * 100)}% extra`;
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
    const formatTitleZoomPortion = (value) => `${Math.round(value * 100)}% of hover zoom`;
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
    titleZoomHint.textContent = "How much the title scales relative to tile hover zoom.";
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
    const apicurioEnabled = typeof apicurio.isEnabled === "function" ? apicurio.isEnabled() : false;
    const { row: apicurioToggleRow, input: apicurioToggleInput } = createSettingsToggle({
      id: "apicurioFeatureToggle",
      label: "Apicurio",
      hint: "Show the Apicurio registry tab when enabled.",
      checked: apicurioEnabled,
      className: "apicurio-toggle",
      onChange: (checked) => {
        if (typeof apicurio.setEnabled === "function") {
          apicurio.setEnabled(checked);
        }
      }
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
      const categorySeriesVersionIndex = activeIsCategoryView ? resolveVersionIndexFromCategory(cat, seriesIdLookup) : null;
      const head = document.createElement("div");
      head.className = "cat-head";
      head.dataset.cat = cat.id;
      head.tabIndex = 0;
      if (activeIsCategoryView && Number.isInteger(categorySeriesVersionIndex)) {
        head.dataset.seriesVersionIndex = String(categorySeriesVersionIndex);
        head.title = "Open this category's map in the series";
        head.classList.add("cat-head--series-link");
      } else {
        head.title = "Select category";
      }
      head.innerHTML = `<div class="cat-title">${escapeHtml(
        cat.title || cat.id
      )}</div>
                          <div class="muted cat-count">${(cat.items || []).length} items</div>`;
      head.addEventListener("click", () => {
        var _a2;
        const targetSeriesIndex = head.dataset.seriesVersionIndex != null ? parseInt(head.dataset.seriesVersionIndex, 10) : null;
        const activeEntry = models[activeIndex];
        const currentSeriesIndex = activeEntry ? getActiveApicurioVersionIndex(activeEntry) : -1;
        const canNavigateToSeries = activeIsCategoryView && ((_a2 = activeEntry == null ? void 0 : activeEntry.apicurioVersions) == null ? void 0 : _a2.length) > 1 && Number.isInteger(targetSeriesIndex) && targetSeriesIndex !== currentSeriesIndex;
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
      head.addEventListener(
        "focus",
        () => selectCategory(cat.id, { scrollIntoView: false })
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
          seriesIdLookup
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
            const label = targetSeriesIndex === activeSeriesIndex ? "Current map in this series" : `Open version ${targetSeriesIndex + 1} in this series`;
            appendTitleLine(tile, label);
          }
        }
        if (obsidianUrl) {
          tile.dataset.obsidianUrl = obsidianUrl;
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
          img.style.opacity = 1;
          img.src = generateLetterImage(it.name || it.id, it.color);
        }
        const nm = document.createElement("div");
        nm.className = "name";
        nm.textContent = it.name || it.id;
        const idLine = document.createElement("div");
        idLine.className = "tile-id";
        idLine.textContent = it.id || "";
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
        addTile.innerHTML = '<span class="tile-add__icon" aria-hidden="true">+</span><span class="tile-add__label"></span>';
        addTile.hidden = centerItems;
        addTile.tabIndex = centerItems ? -1 : 0;
        addTile.setAttribute("aria-hidden", centerItems ? "true" : "false");
        addTile.addEventListener("click", () => addItemToCategory(cat.id));
        grid.appendChild(addTile);
      }
    });
    if (!activeIsCategoryView) {
      const addCategoryButton = document.createElement("button");
      addCategoryButton.type = "button";
      addCategoryButton.className = "category-add";
      addCategoryButton.innerHTML = '<span class="category-add__icon" aria-hidden="true">+</span><span class="category-add__label">Add category</span><span class="category-add__hint">(Insert)</span>';
      addCategoryButton.addEventListener("click", () => addCategoryAtEnd());
      renderHost.appendChild(addCategoryButton);
    }
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
        var _a;
        if (typeof event.button === "number" && event.button !== 0) return;
        hidePreview();
        const id = t.dataset.id;
        const targetSeriesIndex = t.dataset.seriesVersionIndex != null ? parseInt(t.dataset.seriesVersionIndex, 10) : null;
        const globalIndex = t.dataset.globalIndex != null ? parseInt(t.dataset.globalIndex, 10) : null;
        const targetModelIndex = t.dataset.navTargetIndex != null ? parseInt(t.dataset.navTargetIndex, 10) : null;
        const activeEntry = models[activeIndex];
        const currentSeriesIndex = activeEntry ? getActiveApicurioVersionIndex(activeEntry) : -1;
        const canNavigateToSeries = ((_a = activeEntry == null ? void 0 : activeEntry.apicurioVersions) == null ? void 0 : _a.length) > 1 && Number.isInteger(targetSeriesIndex) && targetSeriesIndex !== currentSeriesIndex;
        const canNavigateToModel = Number.isInteger(targetModelIndex) && targetModelIndex !== activeIndex && targetModelIndex >= 0 && targetModelIndex < models.length;
        const pendingMatch = pendingSeriesNavigation && pendingSeriesNavigation.id === id && pendingSeriesNavigation.targetVersionIndex === targetSeriesIndex;
        const pendingModelMatch = pendingModelNavigation && pendingModelNavigation.id === id && pendingModelNavigation.targetIndex === targetModelIndex;
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
        } else if (Number.isInteger(globalIndex) && globalIndex > 0 && globalIndex % 5 === 0) {
          showNotice(
            "Use arrow keys to move between blocks. Shift arrow to move block."
          );
        }
        console.log("[Blockscape] click", id);
        if (selection === id && !(canNavigateToSeries && pendingMatch) && !(canNavigateToModel && pendingModelMatch)) {
          clearSelection();
          return;
        }
        select(id);
      });
      t.addEventListener("dblclick", (event) => {
        event.preventDefault();
        const id = t.dataset.id;
        const targetIndex = t.dataset.navTargetIndex != null ? parseInt(t.dataset.navTargetIndex, 10) : findModelIndexByIdOrSource(id);
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
        var _a, _b, _c;
        if (!selection && !selectedCategoryId) return;
        if (typeof event.button === "number" && event.button !== 0) return;
        const target2 = event.target;
        const clickedTile = (_a = target2 == null ? void 0 : target2.closest) == null ? void 0 : _a.call(target2, ".tile");
        const clickedCategoryHead = (_b = target2 == null ? void 0 : target2.closest) == null ? void 0 : _b.call(target2, ".cat-head");
        const clickedTileMenu = (_c = target2 == null ? void 0 : target2.closest) == null ? void 0 : _c.call(target2, ".tile-context-menu");
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
  function getSelectionRelations(id, { includeSecondary = showSecondaryLinks } = {}) {
    if (!id || !model) {
      return {
        deps: /* @__PURE__ */ new Set(),
        revs: /* @__PURE__ */ new Set(),
        secondaryDeps: /* @__PURE__ */ new Set(),
        secondaryRevs: /* @__PURE__ */ new Set(),
        edges: []
      };
    }
    const deps = new Set(model.fwd.get(id) || []);
    const revs = new Set(model.rev.get(id) || []);
    const secondaryDeps = /* @__PURE__ */ new Set();
    const secondaryRevs = /* @__PURE__ */ new Set();
    const edges = [];
    const edgeKeys = /* @__PURE__ */ new Set();
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
      const firstLevel = /* @__PURE__ */ new Set([...deps, ...revs]);
      firstLevel.forEach((node) => {
        const nodeDeps = model.fwd.get(node) || /* @__PURE__ */ new Set();
        nodeDeps.forEach((dep) => {
          const isLoopToSelection = dep === id;
          if (!isLoopToSelection) secondaryDeps.add(dep);
          if (!isLoopToSelection) addEdge(node, dep, "dep", 2);
        });
        const nodeDependents = model.rev.get(node) || /* @__PURE__ */ new Set();
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
    var _a, _b, _c;
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
    const externalUrl = (_c = (_b = (_a = index.get(id)) == null ? void 0 : _a.el) == null ? void 0 : _b.dataset) == null ? void 0 : _c.externalUrl;
    if (externalUrl) {
      showNotice("This item has link to", NOTICE_TIMEOUT_MS, externalUrl);
    }
    updateServerUrlFromActive();
  }
  function selectCategory(catId, { scrollIntoView = true, preserveEntryHint = false } = {}) {
    var _a, _b;
    if (!((_a = model == null ? void 0 : model.m) == null ? void 0 : _a.categories) || !catId) return false;
    const categories = model.m.categories || [];
    const target2 = categories.find((cat) => cat.id === catId);
    if (!target2) return false;
    hidePreview();
    clearItemSelection();
    if (!preserveEntryHint) categoryEntryHint = null;
    selectedCategoryId = target2.id;
    syncSelectionClass();
    renderCategorySelection();
    const entry = categoryIndex.get(target2.id);
    if (scrollIntoView && (entry == null ? void 0 : entry.el)) {
      entry.el.scrollIntoView({ behavior: "smooth", block: "center" });
      (_b = entry.headEl) == null ? void 0 : _b.focus({ preventScroll: true });
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
    if (!(hit == null ? void 0 : hit.el)) {
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
    if (selectedMeta == null ? void 0 : selectedMeta.catId) return selectedMeta.catId;
    return null;
  }
  function selectCategoryByStep(step) {
    var _a, _b, _c, _d;
    if (!((_b = (_a = model == null ? void 0 : model.m) == null ? void 0 : _a.categories) == null ? void 0 : _b.length) || !step) return false;
    const categories = model.m.categories;
    const currentCatId = getCurrentCategoryId();
    let currentIndex = categories.findIndex((cat) => cat.id === currentCatId);
    if (currentIndex === -1) {
      const fallback = ((_c = categories.find((cat) => (cat.items || []).length)) == null ? void 0 : _c.id) || ((_d = categories[0]) == null ? void 0 : _d.id);
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
    app.querySelectorAll(".tile").forEach(
      (t) => t.classList.remove(
        "dep",
        "revdep",
        "dep-indirect",
        "revdep-indirect",
        "selected"
      )
    );
  }
  function applyReusedHighlights() {
    if (!(model == null ? void 0 : model.reusedLocal)) return;
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
    relations.edges.forEach((edge) => {
      var _a, _b;
      const fromRect = (_a = index.get(edge.from)) == null ? void 0 : _a.rect;
      const toRect = (_b = index.get(edge.to)) == null ? void 0 : _b.rect;
      if (!fromRect || !toRect) return;
      const a = center(fromRect);
      const b = center(toRect);
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      const c1x = (a.x + b.x) / 2, c1y = a.y;
      const c2x = (a.x + b.x) / 2, c2y = b.y;
      path.setAttribute(
        "d",
        `M ${a.x},${a.y} C ${c1x},${c1y} ${c2x},${c2y} ${b.x},${b.y}`
      );
      path.setAttribute("fill", "none");
      path.setAttribute(
        "stroke",
        edge.type === "dep" ? "var(--blockscape-dep)" : "var(--blockscape-revdep)"
      );
      path.setAttribute("stroke-opacity", edge.depth === 1 ? "0.45" : "0.22");
      path.setAttribute("stroke-width", edge.depth === 1 ? "2" : "1.5");
      if (edge.depth > 1) path.setAttribute("stroke-dasharray", "4 3");
      path.setAttribute("vector-effect", "non-scaling-stroke");
      overlay.appendChild(path);
    });
  }
  function center(r) {
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function escapeHtml(s) {
    return s.replace(
      /[&<>"']/g,
      (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[m]
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
    var _a;
    if (!obsidianLinksEnabled) return "";
    if (!item) return "";
    if ((_a = seriesIdLookup == null ? void 0 : seriesIdLookup.has) == null ? void 0 : _a.call(seriesIdLookup, item.id)) return "";
    const targetText = getObsidianTargetText(item);
    return buildObsidianUrl(targetText);
  }
  function resolveExternalMeta(value) {
    var _a;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return { isExternal: false, url: "" };
      try {
        const url = new URL(trimmed);
        if (!/^https?:/i.test(url.protocol))
          return { isExternal: false, url: "" };
        return { isExternal: true, url: url.toString() };
      } catch (error) {
      }
      if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
        try {
          const base = typeof window !== "undefined" && ((_a = window.location) == null ? void 0 : _a.href) ? window.location.href : void 0;
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
        ({ labelEl, textEl }) => (labelEl == null ? void 0 : labelEl.isConnected) && (textEl == null ? void 0 : textEl.isConnected)
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
    var _a, _b;
    const parts = [
      `<div class="version-nav__tooltip-title">${escapeHtml(titleText)}</div>`
    ];
    const versionLabel = ((versionEntry == null ? void 0 : versionEntry.version) ?? ((_a = versionEntry == null ? void 0 : versionEntry.data) == null ? void 0 : _a.version) ?? "").toString().trim();
    if (versionLabel) {
      parts.push(
        `<div class="version-nav__tooltip-meta">Version ${escapeHtml(
          versionLabel
        )}</div>`
      );
    }
    const abstractHtml = (((_b = versionEntry == null ? void 0 : versionEntry.data) == null ? void 0 : _b.abstract) ?? "").toString().trim();
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
  function showTabTooltip(target2, html, { offset = 8 } = {}) {
    if (!tabTooltip || !target2 || !html) return;
    tabTooltip.innerHTML = html;
    tabTooltip.hidden = false;
    tabTooltip.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      const rect = target2.getBoundingClientRect();
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
      (versionEntry == null ? void 0 : versionEntry.data) || versionEntry,
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
    }, 1e3);
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
        alert((error == null ? void 0 : error.message) || "Unable to create a blank map right now.");
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
        alert((error == null ? void 0 : error.message) || "Unable to create a new version right now.");
      }
    });
  }
  if (shareButton) {
    shareButton.addEventListener("click", async () => {
      var _a;
      if (activeIndex < 0 || !models[activeIndex]) {
        alert("Select or load a model before sharing.");
        return;
      }
      const payload = {
        title: getModelTitle(models[activeIndex], "Shared Model"),
        data: models[activeIndex].data
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
      try {
        window.history.replaceState({}, document.title, fullUrl);
      } catch (err) {
        console.warn("[Blockscape] failed to update URL for share", err);
        window.location.hash = shareUrl.hash;
      }
      let copied = false;
      if ((_a = navigator.clipboard) == null ? void 0 : _a.writeText) {
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
      const text2 = (jsonBox.value || "").trim();
      if (!text2) {
        alert("Load or paste a model before opening the editor.");
        return;
      }
      try {
        JSON.parse(text2);
      } catch (err) {
        alert("Current JSON is invalid. Fix it before opening the editor.");
        return;
      }
      try {
        const payload = {
          ts: Date.now(),
          text: text2,
          source: "viewer"
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    if (isShortcutHelpOpen()) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeShortcutHelp();
      }
      return;
    }
    if (!(newPanel == null ? void 0 : newPanel.hidden) && event.key === "Escape") {
      event.preventDefault();
      closeNewPanel();
      return;
    }
    const isEditingItem = (_a = itemEditor == null ? void 0 : itemEditor.isOpen) == null ? void 0 : _a.call(itemEditor);
    if (isEditingItem) {
      return;
    }
    const isCategoryView = activeViewIsCategory;
    if ((event.ctrlKey || event.metaKey) && event.code === "KeyS") {
      event.preventDefault();
      const active = models[activeIndex];
      const preferSeries = !!(((_b = active == null ? void 0 : active.apicurioVersions) == null ? void 0 : _b.length) > 1);
      downloadCurrentJson("shortcut", preferSeries);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key && event.key.toLowerCase() === "z") {
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
      const removedCategory = selectedCategoryId ? deleteSelectedCategory() : false;
      const removedItem = removedCategory ? true : deleteSelectedItem();
      if (removedCategory || removedItem) {
        event.preventDefault();
      }
    }
    if (event.key === "F2") {
      if (isCategoryView) return;
      if (!shouldHandleGlobalPaste()) return;
      const targetCategoryId = selectedCategoryId && !selection && selectedCategoryId || !selection && ((_f = (_e = (_d = (_c = event.target) == null ? void 0 : _c.closest) == null ? void 0 : _d.call(_c, ".category")) == null ? void 0 : _e.dataset) == null ? void 0 : _f.cat) || null;
      if (targetCategoryId && !selection) {
        const edited = openCategoryEditor(targetCategoryId);
        if (edited) {
          event.preventDefault();
          return;
        }
      }
      const targetId = selection || ((_j = (_i = (_h = (_g = event.target) == null ? void 0 : _g.closest) == null ? void 0 : _h.call(_g, ".tile")) == null ? void 0 : _i.dataset) == null ? void 0 : _j.id);
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
    const sourceCategory = categories.find(
      (cat) => (cat.items || []).some((item) => item.id === itemId)
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
      deps: []
    };
    category.items.push(newItem);
    loadActiveIntoEditor();
    rebuildFromActive();
    hidePreview();
    select(newItem.id);
    const created = index.get(newItem.id);
    if (created == null ? void 0 : created.el) {
      created.el.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center"
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
    if (selectedMeta == null ? void 0 : selectedMeta.catId) {
      category = categories.find((cat) => cat.id === selectedMeta.catId);
    }
    if (!category) {
      category = categories.find(
        (cat) => (cat.items || []).some((item) => item.id === selection)
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
    if (selectedMeta == null ? void 0 : selectedMeta.catId) {
      category = categories.find((cat) => cat.id === selectedMeta.catId);
    }
    if (!category) {
      category = categories.find(
        (cat) => (cat.items || []).some((item) => item.id === selection)
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
        position: currentItemPosition === -1 ? 0 : currentItemPosition
      };
    } else {
      categoryEntryHint = null;
    }
    return selectCategory(targetCat.id, { preserveEntryHint: true });
  }
  function enterSelectedCategoryItems(step) {
    var _a;
    if (!selectedCategoryId || !((_a = model == null ? void 0 : model.m) == null ? void 0 : _a.categories) || !step) return false;
    const categories = model.m.categories || [];
    const targetCat = categories.find((cat) => cat.id === selectedCategoryId);
    if (!targetCat) return false;
    const items = targetCat.items || [];
    if (!items.length) return false;
    let targetIndex = step > 0 ? 0 : Math.max(0, items.length - 1);
    if ((categoryEntryHint == null ? void 0 : categoryEntryHint.catId) === targetCat.id) {
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
    if (selectedMeta == null ? void 0 : selectedMeta.catId) {
      sourceIndex = categories.findIndex(
        (cat) => cat.id === selectedMeta.catId
      );
    }
    if (sourceIndex === -1) {
      sourceIndex = categories.findIndex(
        (cat) => (cat.items || []).some((item) => item.id === selection)
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
    const targetItemId = insertPos < targetCategory.items.length ? targetCategory.items[insertPos].id : null;
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
    const activeModelId = getModelId(activeModel) || (activeModel ? activeModel.id : null);
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
    const activeModelId = getModelId(activeModel) || (activeModel ? activeModel.id : null);
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
    const activeModelId = getModelId(activeModel) || (activeModel ? activeModel.id : null);
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
    if (selectedMeta == null ? void 0 : selectedMeta.catId) {
      category = categories.find((cat) => cat.id === selectedMeta.catId);
    }
    if (!category) {
      category = categories.find(
        (cat) => (cat.items || []).some((item) => item.id === selection)
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
      modelId: getModelId(activeModel) || (activeModel ? activeModel.id : null),
      ts: Date.now()
    };
    const findNextSelection = () => {
      var _a;
      if (category.items.length) {
        const neighborIndex = Math.min(currentIndex, category.items.length - 1);
        return ((_a = category.items[neighborIndex]) == null ? void 0 : _a.id) || null;
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
    var _a, _b;
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
      modelId: getModelId(activeModel) || (activeModel ? activeModel.id : null),
      ts: Date.now()
    };
    selectedCategoryId = null;
    selection = null;
    selectionRelations = null;
    categoryEntryHint = null;
    syncSelectionClass();
    loadActiveIntoEditor();
    rebuildFromActive();
    const nextId = ((_a = categories[currentIndex]) == null ? void 0 : _a.id) || ((_b = categories[currentIndex - 1]) == null ? void 0 : _b.id) || null;
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
  if (copyJsonButton) {
    copyJsonButton.addEventListener("click", async () => {
      const text2 = jsonBox.value || "";
      if (!text2.trim()) {
        alert("JSON editor is empty.");
        return;
      }
      const copied = await writeTextToClipboard(text2);
      if (copied) {
        alert("JSON copied to clipboard.");
      } else {
        window.prompt("Copy this JSON manually:", text2);
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
        const text2 = await readTextFromClipboard();
        if (!text2) {
          alert("Clipboard is empty.");
          return;
        }
        jsonBox.value = text2;
        jsonBox.focus();
      } catch (err) {
        console.warn("[Blockscape] clipboard read failed", err);
        alert(
          "Unable to read from the clipboard. Use Cmd/Ctrl+V inside the editor instead."
        );
      }
    });
  }
  document.getElementById("appendFromBox").onclick = async () => {
    try {
      const autoSave = await isLocalBackendReady();
      const appended = normalizeToModelsFromText(jsonBox.value, "Pasted", {
        promptForSeriesName: !autoSave
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
          versionLabel: appended.length > 1 ? `paste #${idx + 1}` : "paste"
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
          origin: "append"
        });
      }
    } catch (e) {
      console.error("[Blockscape] append error:", e);
      alert("Append error (see console).");
    }
  };
  document.getElementById("replaceActive").onclick = () => {
    var _a;
    if (activeIndex < 0) {
      alert("No active model selected.");
      return;
    }
    try {
      const obj = JSON.parse(jsonBox.value);
      ensureModelMetadata(obj, {
        titleHint: getModelTitle(models[activeIndex]),
        idHint: getModelId(models[activeIndex]) || getModelTitle(models[activeIndex])
      });
      models[activeIndex].data = obj;
      models[activeIndex].title = obj.title || models[activeIndex].title;
      if (models[activeIndex].isSeries || ((_a = models[activeIndex].apicurioVersions) == null ? void 0 : _a.length) > 1) {
        const seriesName = models[activeIndex].title || getModelTitle(models[activeIndex]);
        ensureSeriesId(models[activeIndex], {
          seriesName,
          fallbackTitle: seriesName
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
          seriesTitleOverride: `${baseName} series`
        });
        if (!entries.length) {
          console.warn("[Blockscape] no models in file:", f.name);
          continue;
        }
        entries.forEach((en, i) => {
          var _a;
          const dataTitle = (((_a = en.data) == null ? void 0 : _a.title) ?? "").toString().trim();
          const fallbackTitle = entries.length > 1 ? `${f.name} #${i + 1}` : f.name;
          const fileSeriesName = `${baseName} series`;
          const seriesName = en.isSeries ? fileSeriesName : null;
          let payload = { ...en };
          if (en.isSeries) {
            const seriesTitle = seriesName || dataTitle || en.title || fallbackTitle || "unknown";
            payload.title = seriesTitle;
            const forcedSlug = makeSeriesId(seriesTitle || "unknown");
            applySeriesSlug(payload, forcedSlug);
            ensureSeriesId(payload, {
              seriesName: seriesTitle,
              fallbackTitle: "unknown"
            });
            payload.apicurioArtifactName = payload.apicurioArtifactName || seriesTitle;
          } else {
            payload.title = dataTitle || fallbackTitle;
          }
          const idxResult = addModelEntry(
            {
              ...payload,
              apicurioArtifactName: payload.apicurioArtifactName || seriesName || payload.apicurioArtifactName
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
      e.target.value = "";
    }
  };
  document.addEventListener("paste", handleClipboardPaste);
  async function handleClipboardPaste(event) {
    var _a;
    if (!shouldHandleGlobalPaste()) return;
    const text2 = ((_a = event.clipboardData) == null ? void 0 : _a.getData("text/plain")) || window.clipboardData && window.clipboardData.getData("Text") || "";
    if (!looksLikeModelJson(text2)) return;
    let entries = [];
    try {
      const autoSave = await isLocalBackendReady();
      entries = normalizeToModelsFromText(text2, "Clipboard", {
        promptForSeriesName: !autoSave
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
        versionLabel: entries.length > 1 ? `paste #${idx + 1}` : "paste"
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
        origin: "clipboard"
      });
    }
  }
  async function autoSaveNewLocalFilesForModels(indices, { origin = "clipboard" } = {}) {
    if (!await isLocalBackendReady()) return;
    if (typeof (localBackend == null ? void 0 : localBackend.saveModelByIndex) !== "function") return;
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
      const desired = eligible.length === 1 ? basePath : withNumericSuffix(basePath, i + 1);
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
        statusPrefix: "Auto-saved to"
      });
      if (!(saved == null ? void 0 : saved.ok)) {
        alert(`Local auto-save failed: ${(saved == null ? void 0 : saved.error) || "unknown error"}`);
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
  modelList.addEventListener("click", (e) => {
    const button = e.target.closest("button[data-index]");
    if (!button) return;
    const i = parseInt(button.dataset.index, 10);
    if (!Number.isInteger(i)) return;
    setActive(i);
  });
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
    const target2 = event.target;
    if (searchResults.contains(target2)) return;
    if (searchInput && (target2 === searchInput || searchInput.contains(target2)))
      return;
    searchResults.hidden = true;
  });
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
  async function loadJsonFiles() {
    const jsonFiles = ["comms.bs", "planets.bs", "styleguide.bs", "blockscape-features.bs"];
    const joinPath = (name) => {
      if (!ASSET_BASE) return name;
      return ASSET_BASE.endsWith("/") ? `${ASSET_BASE}${name}` : `${ASSET_BASE}/${name}`;
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
        const text2 = await response.text();
        const baseName = filename.replace(/\.[^.]+$/, "") || "Model";
        const entries = normalizeToModelsFromText(text2, baseName, {
          seriesTitleOverride: `${baseName} series`
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
              apicurioArtifactName: seriesTitle
            };
            const forcedSlug = makeSeriesId(seriesTitle || "unknown");
            applySeriesSlug(payload, forcedSlug);
            ensureSeriesId(payload, {
              seriesName: seriesTitle,
              fallbackTitle: "unknown"
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
    var _a, _b;
    if (!node || !node.nodeValue || !node.nodeValue.includes("http")) return;
    if ((_b = (_a = node.parentNode) == null ? void 0 : _a.closest) == null ? void 0 : _b.call(_a, "a")) {
      return;
    }
    const text2 = node.nodeValue;
    const regex = /(https?:\/\/[^\s<]+)/gi;
    const matches = [];
    let match;
    while ((match = regex.exec(text2)) !== null) {
      matches.push({ url: match[0], index: match.index });
    }
    if (!matches.length) return;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    matches.forEach(({ url, index: index2 }) => {
      if (index2 > cursor) {
        fragment.appendChild(
          document.createTextNode(text2.slice(cursor, index2))
        );
      }
      fragment.appendChild(createAutoLinkAnchor(url));
      cursor = index2 + url.length;
    });
    if (cursor < text2.length) {
      fragment.appendChild(document.createTextNode(text2.slice(cursor)));
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
    anchor.addEventListener(
      "click",
      (event) => handleGistLinkClick(event, url, anchor)
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
      return host === "gist.githubusercontent.com" || host.startsWith("gist.") && host.endsWith("githubusercontent.com");
    } catch {
      return false;
    }
  }
  async function loadFromUrl(url) {
    try {
      console.log("[Blockscape] loading from URL:", url);
      const text2 = await fetchTextWithCacheBypass(url);
      const rawName = url.split("/").pop() || "";
      const baseName = rawName.replace(/\.[^.]+$/, "") || "URL Model";
      let entries;
      try {
        entries = normalizeToModelsFromText(text2, baseName);
      } catch (parseError) {
        throw new Error(`Invalid JSON payload: ${parseError.message}`);
      }
      if (!entries.length) {
        throw new Error("No JSON objects found in response.");
      }
      let firstIndex = null;
      entries.forEach((entry, idx) => {
        var _a;
        const dataTitle = (((_a = entry.data) == null ? void 0 : _a.title) ?? "").toString().trim();
        const fallbackTitle = entries.length > 1 ? `${baseName} #${idx + 1}` : baseName;
        const seriesName = entry.isSeries ? `${baseName} series` : null;
        let payload = { ...entry };
        if (entry.isSeries) {
          const seriesTitle = seriesName || dataTitle || payload.title || fallbackTitle;
          payload = {
            ...entry,
            title: seriesTitle,
            apicurioArtifactName: seriesTitle || entry.apicurioArtifactName
          };
          const forcedSlug = makeSeriesId(seriesTitle || "unknown");
          applySeriesSlug(payload, forcedSlug);
          ensureSeriesId(payload, {
            seriesName: seriesTitle || seriesName || "unknown",
            fallbackTitle: "unknown"
          });
          console.log("[Blockscape] loadFromUrl: series slug applied", {
            seriesSlug: forcedSlug,
            url,
            baseName,
            seriesTitle
          });
        }
        const idxResult = addModelEntry(
          {
            ...payload,
            title: dataTitle || payload.title || fallbackTitle,
            apicurioArtifactName: payload.apicurioArtifactName || seriesName || entry.apicurioArtifactName
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
    if (!hasLocalBackend && features.autoLoadFromDir) {
      await loadJsonFiles();
    }
    const serverPathResult = await consumeServerPathLoad();
    const serverPathIndex = typeof (serverPathResult == null ? void 0 : serverPathResult.modelIndex) === "number" ? serverPathResult.modelIndex : null;
    const loadIndex = await consumeLoadParam();
    const editorResult = consumeEditorPayload();
    const editorIndex = editorResult == null ? void 0 : editorResult.index;
    const shareIndex = consumeShareLink();
    const initialIndex = typeof serverPathIndex === "number" ? serverPathIndex : typeof loadIndex === "number" ? loadIndex : typeof shareIndex === "number" ? shareIndex : typeof editorIndex === "number" ? editorIndex : firstSeedIndex ?? 0;
    setActive(initialIndex);
    if ((serverPathResult == null ? void 0 : serverPathResult.itemId) && typeof serverPathResult.modelIndex === "number" && serverPathResult.modelIndex === initialIndex) {
      requestAnimationFrame(() => {
        var _a;
        if (activeIndex !== serverPathResult.modelIndex) return;
        const tile = (_a = index.get(serverPathResult.itemId)) == null ? void 0 : _a.el;
        if (!tile) return;
        select(serverPathResult.itemId);
        tile.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center"
        });
        tile.focus({ preventScroll: true });
      });
    }
  })();
}
const ensureTrailingSlash = (value) => typeof value === "string" && value.endsWith("/") ? value : `${value || "/"}/`;
function deriveBaseFromLocation() {
  if (typeof window === "undefined" || !window.location) return "/";
  const parts = (window.location.pathname || "/").split("/").filter(Boolean);
  if (!parts.length) return "/";
  if (parts[0].toLowerCase() === "server") return "/";
  return `/${parts[0]}/`;
}
function resolveAppBase(rawBase) {
  return ensureTrailingSlash(deriveBaseFromLocation());
}
const APP_BASE = resolveAppBase();
const DOCS_BASE = `${APP_BASE}documentation/`;
function create_fragment$3(ctx) {
  let div5;
  return {
    c() {
      div5 = element("div");
      div5.innerHTML = `<div id="shortcutHelpBackdrop" class="shortcut-help__backdrop"></div> <div class="shortcut-help__panel" tabindex="-1"><div class="shortcut-help__header"><div class="shortcut-help__title"><h2 id="shortcutHelpTitle">Help</h2></div> <button id="shortcutHelpClose" class="shortcut-help__close" type="button" aria-label="Close keyboard shortcuts">×</button></div> <section class="shortcut-help__section"><ul class="shortcut-help__tips"><li>Play around with the example maps.</li> <li>Open the <a href="${DOCS_BASE}">documentation</a>.</li> <li>Read about <a href="https://www.wardleymaps.com" target="_blank" rel="noreferrer noopener">Wardley Maps</a>.</li> <li>Copy this URL and use &quot;Load URL&quot;: <a href="https://gist.githubusercontent.com/pwright/86dbb074b35d6d17671bf17ecbf1a824/raw/git.bs" target="_blank" rel="noreferrer noopener">https://gist.githubusercontent.com/pwright/86dbb074b35d6d17671bf17ecbf1a824/raw/git.bs</a></li> <li>Edit maps by moving items with Shift + Arrow keys.</li></ul></section> <section class="shortcut-help__section"><h3 class="shortcut-help__section-title">Keyboard shortcuts</h3> <div id="shortcutHelpList" class="shortcut-help__list" aria-live="polite"></div></section></div>`;
      attr(div5, "id", "shortcutHelp");
      attr(div5, "class", "shortcut-help");
      div5.hidden = true;
      attr(div5, "aria-hidden", "true");
      attr(div5, "role", "dialog");
      attr(div5, "aria-modal", "true");
      attr(div5, "aria-labelledby", "shortcutHelpTitle");
    },
    m(target2, anchor) {
      insert(target2, div5, anchor);
    },
    p: noop,
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching) {
        detach(div5);
      }
    }
  };
}
class ShortcutHelp extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, null, create_fragment$3, safe_not_equal, {});
  }
}
const plainPromptTemplate = 'Generate a blockscape [map|series] for the domain of [DOMAIN]\n\n### Requirements\n\n* Output **valid JSON only** with the structure below (no commentary):\n\n  * Model level:\n    * `id`: required string, short/sluggy (lowercase, hyphen/underscore ok)\n    * `title`: required string, human‑friendly model title\n    * `abstract`: optional string (plain text or simple HTML) that explains the landscape\n    * `categories`: array of category objects\n\n  * Each category has:\n    * `id` (short, lowercase, unique)\n    * `title` (human‑friendly)\n    * `items`: array of component objects\n\n      * each item has:\n        * `id` (short, lowercase, unique across all categories)\n        * `name` (human‑friendly)\n        * optional `logo` (e.g., `"logos/[slug].svg"`)\n        * optional `external` (string URL) pointing to external documentation or reference material for that item\n        * optional `color` (hex string) for tile tint\n        * optional `deps`: array of item `id`s this item **depends on** (when present, must reference defined items only)\n* Use **3–6/7 categories** and **2–6/7 items per category**. Prefer clarity over exhaustiveness.\n* Order categories roughly from **abstract to concrete**.\n* Model **visible user value** via **vertical position** (things closer to the user are higher). Ensure `deps` reflect a flow from higher‑value items to their underlying enablers.\n* (Optional) You may imply **horizontal evolution/maturity** via category naming or item grouping, but do not add extra fields for it.\n* Keep all identifiers **ASCII**, hyphen‑separated where needed.\n\n### Domain Guidance\n\nIn **[one paragraph]**, summarize the domain’s user‑visible goals and the key enabling components. Use that understanding to choose categories and dependencies.\n\n### Output\n\nIf the user asks for a \'series\', create an array of json using the following criteria.\n\nReturn **only the JSON** matching this schema:\n\n```\n{\n  "id": "[model-id]",\n  "title": "[Model Title]",\n  "abstract": "[Short description or HTML snippet, optional]",\n  "categories": [\n    {\n      "id": "[category-id]",\n      "title": "[Category Title]",\n      "items": [\n        { "id": "[item-id]", "name": "[Item Name]", "deps": ["[id]"] }\n      ]\n    }\n  ]\n}\n```\n\n### Validation Checklist (the model should self‑check before returning):\n\n* Top-level `id` and `title` are present and non-empty; if `abstract` is provided, it is non-empty.\n* All provided `deps` reference **existing** item IDs.\n* No duplicate `id`s across all items.\n* 3–6/7 categories; each has 2–6/7 items.\n* JSON parses.\n\n---\n\n## One‑shot Example (Machine Learning Model Deployment)\n\n**Prompt to paste**\n\nGenerate a **Blockscape value‑chain JSON** for the domain of **machine learning model deployment**.\n\n### Requirements\n\n* Output **valid JSON only** with this structure (no commentary).\n* Use **3 - 6/7 categories**, **3–6/7 items each**.\n* Order from abstract (user‑facing) to concrete (infrastructure).\n* Vertical axis is **visible user value**; `deps` should point from user‑visible items down to enablers they rely on.\n* Optional `logo` paths may use placeholders like `"logos/[slug].svg"`.\n\n### Domain Guidance\n\nUsers need **reliable predictions** surfaced via **APIs/UI**, backed by **versioned models**, **observability**, and **scalable infra**. Security and governance span across.\n\n### Output (JSON only)\n\n```\n{\n  "categories": [\n    {\n      "id": "experience",\n      "title": "User Experience",\n      "items": [\n        { "id": "prediction-api", "name": "Prediction API", "deps": ["model-serving", "authz"], "external": "https://example.com/api.html"},\n        { "id": "batch-scoring", "name": "Batch Scoring", "deps": ["feature-store", "orchestration"] },\n        { "id": "ui-console", "name": "Ops Console", "deps": ["monitoring", "logging"] }\n      ]\n    },\n    {\n      "id": "models",\n      "title": "Models & Data",\n      "items": [\n        { "id": "model-serving", "name": "Model Serving", "deps": ["container-runtime", "autoscaling"] },\n        { "id": "model-registry", "name": "Model Registry", "deps": ["artifact-store"] },\n        { "id": "feature-store", "name": "Feature Store", "deps": ["data-pipelines"] }\n      ]\n    },\n    {\n      "id": "platform",\n      "title": "Platform Services",\n      "items": [\n        { "id": "monitoring", "name": "Monitoring", "deps": ["metrics-backend"] },\n        { "id": "logging", "name": "Logging", "deps": ["log-backend"] },\n        { "id": "authz", "name": "AuthN/Z", "deps": ["secrets"] },\n        { "id": "orchestration", "name": "Orchestration", "deps": ["container-runtime"] }\n      ]\n    },\n    {\n      "id": "infrastructure",\n      "title": "Infrastructure",\n      "items": [\n        { "id": "autoscaling", "name": "Autoscaling", "deps": ["metrics-backend"] },\n        { "id": "container-runtime", "name": "Container Runtime", "deps": [] },\n        { "id": "artifact-store", "name": "Artifact Store", "deps": [] },\n        { "id": "data-pipelines", "name": "Data Pipelines", "deps": [] },\n        { "id": "metrics-backend", "name": "Metrics Backend", "deps": [] },\n        { "id": "log-backend", "name": "Log Backend", "deps": [] },\n        { "id": "secrets", "name": "Secrets Management", "deps": [] }\n      ]\n    }\n  ]\n}\n```\n\n---\n\n## Tips\n\n* Keep **names** user‑friendly; keep **ids** short and consistent.\n* If an item feels too broad, introduce a new category rather than bloating `deps`.\n* If there\'s a link (external), use the favicon from the website as logo\n* If you’re unsure about `logo`, omit it; you can add paths later.\n\nThe following map shows color conventions:\n\n```\n{\n  "id": "conventions",\n  "title": "Color Conventions",\n  "abstract": "Reference for color conventions.",\n  "categories": [\n    {\n      "id": "color-conventions",\n      "title": "Color conventions",\n      "items": [\n        {\n          "id": "old",\n          "name": "Old",\n          "color": "#000000",\n          "deps": []\n        },\n        {\n          "id": "new",\n          "name": "New",\n          "color": "#FFFFFF",\n          "deps": []\n        },\n        {\n          "id": "important",\n          "name": "Important",\n          "deps": [],\n          "color": "#FF0000"\n        }\n      ]\n    }\n  ]\n}\n```\n';
function create_if_block_1(ctx) {
  let div4;
  let div1;
  let a;
  let t0;
  let t1;
  let div0;
  let t3;
  let div3;
  return {
    c() {
      div4 = element("div");
      div1 = element("div");
      a = element("a");
      t0 = text("Open Blockscape GPT");
      t1 = space();
      div0 = element("div");
      div0.textContent = "Paste the copied prompt into that chat.";
      t3 = space();
      div3 = element("div");
      div3.innerHTML = `<span>Gem is not available yet</span> <div class="new-panel__hint">https://gemini.google.com/gems/create</div>`;
      attr(a, "href", gptLink);
      attr(a, "target", "_blank");
      attr(a, "rel", "noreferrer");
      attr(div0, "class", "new-panel__hint");
      attr(div1, "class", "new-panel__link");
      attr(div3, "class", "new-panel__link new-panel__link--disabled");
      attr(div4, "class", "new-panel__links");
    },
    m(target2, anchor) {
      insert(target2, div4, anchor);
      append(div4, div1);
      append(div1, a);
      append(a, t0);
      append(div1, t1);
      append(div1, div0);
      append(div4, t3);
      append(div4, div3);
    },
    p: noop,
    d(detaching) {
      if (detaching) {
        detach(div4);
      }
    }
  };
}
function create_if_block(ctx) {
  let div1;
  let div0;
  let t1;
  let textarea;
  let mounted;
  let dispose;
  return {
    c() {
      div1 = element("div");
      div0 = element("div");
      div0.textContent = "Generated prompt";
      t1 = space();
      textarea = element("textarea");
      attr(div0, "class", "new-panel__prompt-label");
      attr(textarea, "class", "pf-v5-c-form-control new-panel__textarea");
      attr(textarea, "rows", "4");
      textarea.readOnly = true;
      attr(div1, "class", "new-panel__prompt");
    },
    m(target2, anchor) {
      insert(target2, div1, anchor);
      append(div1, div0);
      append(div1, t1);
      append(div1, textarea);
      set_input_value(
        textarea,
        /*prompt*/
        ctx[4]
      );
      if (!mounted) {
        dispose = listen(
          textarea,
          "input",
          /*textarea_input_handler_1*/
          ctx[12]
        );
        mounted = true;
      }
    },
    p(ctx2, dirty) {
      if (dirty & /*prompt*/
      16) {
        set_input_value(
          textarea,
          /*prompt*/
          ctx2[4]
        );
      }
    },
    d(detaching) {
      if (detaching) {
        detach(div1);
      }
      mounted = false;
      dispose();
    }
  };
}
function create_fragment$2(ctx) {
  let div14;
  let div0;
  let t0;
  let div13;
  let div2;
  let t6;
  let form;
  let div3;
  let label0;
  let t8;
  let p1;
  let t10;
  let textarea;
  let t11;
  let div4;
  let label1;
  let input0;
  let t12;
  let span1;
  let t15;
  let fieldset;
  let legend;
  let t17;
  let p2;
  let t19;
  let label2;
  let input1;
  let t20;
  let div7;
  let t24;
  let label3;
  let input2;
  let t25;
  let div10;
  let t29;
  let div12;
  let button1;
  let t31;
  let button2;
  let t33;
  let div11;
  let t34;
  let t35;
  let t36;
  let binding_group;
  let mounted;
  let dispose;
  let if_block0 = (
    /*target*/
    ctx[2] === "gpt" && create_if_block_1()
  );
  let if_block1 = (
    /*prompt*/
    ctx[4] && /*showPromptPanel*/
    ctx[5] && create_if_block(ctx)
  );
  binding_group = init_binding_group(
    /*$$binding_groups*/
    ctx[10][0]
  );
  return {
    c() {
      div14 = element("div");
      div0 = element("div");
      t0 = space();
      div13 = element("div");
      div2 = element("div");
      div2.innerHTML = `<div class="shortcut-help__title"><h2 id="newPanelTitle">New blockscape</h2> <p class="shortcut-help__subtitle">Describe what you need and we will create a prompt for you.</p></div> <button id="newPanelClose" class="shortcut-help__close" type="button" aria-label="Close new panel">×</button>`;
      t6 = space();
      form = element("form");
      div3 = element("div");
      label0 = element("label");
      label0.textContent = "Domain";
      t8 = space();
      p1 = element("p");
      p1.textContent = "Describe what you want to create a map for.";
      t10 = space();
      textarea = element("textarea");
      t11 = space();
      div4 = element("div");
      label1 = element("label");
      input0 = element("input");
      t12 = space();
      span1 = element("span");
      span1.innerHTML = `Series
            <span class="new-panel__hint">Toggle on to create a series instead of a single map.</span>`;
      t15 = space();
      fieldset = element("fieldset");
      legend = element("legend");
      legend.textContent = "Target";
      t17 = space();
      p2 = element("p");
      p2.textContent = "Choose where you plan to use the prompt.";
      t19 = space();
      label2 = element("label");
      input1 = element("input");
      t20 = space();
      div7 = element("div");
      div7.innerHTML = `<div class="new-panel__option-title">GPT or Gem</div> <div class="new-panel__hint">Copies a simple prompt tailored for GPT or Gem.</div>`;
      t24 = space();
      label3 = element("label");
      input2 = element("input");
      t25 = space();
      div10 = element("div");
      div10.innerHTML = `<div class="new-panel__option-title">Plain LLM</div> <div class="new-panel__hint">Creates a large prompt to generate blockscape from scratch.</div>`;
      t29 = space();
      div12 = element("div");
      button1 = element("button");
      button1.textContent = "Copy prompt";
      t31 = space();
      button2 = element("button");
      button2.textContent = "New blank";
      t33 = space();
      div11 = element("div");
      t34 = text(
        /*status*/
        ctx[3]
      );
      t35 = space();
      if (if_block0) if_block0.c();
      t36 = space();
      if (if_block1) if_block1.c();
      attr(div0, "id", "newPanelBackdrop");
      attr(div0, "class", "shortcut-help__backdrop");
      attr(div2, "class", "shortcut-help__header");
      attr(label0, "for", "newDomain");
      attr(p1, "class", "new-panel__hint");
      attr(textarea, "id", "newDomain");
      attr(textarea, "class", "pf-v5-c-form-control new-panel__textarea");
      attr(textarea, "rows", "4");
      textarea.required = true;
      attr(textarea, "placeholder", "Ex: Companies building open-source geospatial tools");
      attr(div3, "class", "new-panel__field");
      attr(input0, "id", "seriesToggle");
      attr(input0, "type", "checkbox");
      attr(label1, "class", "new-panel__toggle");
      attr(label1, "for", "seriesToggle");
      attr(div4, "class", "new-panel__field");
      attr(p2, "class", "new-panel__hint");
      attr(input1, "type", "radio");
      attr(input1, "name", "target");
      input1.__value = "gpt";
      set_input_value(input1, input1.__value);
      attr(label2, "class", "new-panel__option");
      attr(input2, "type", "radio");
      attr(input2, "name", "target");
      input2.__value = "plain";
      set_input_value(input2, input2.__value);
      attr(label3, "class", "new-panel__option");
      attr(fieldset, "class", "new-panel__field");
      attr(button1, "class", "pf-v5-c-button pf-m-primary");
      attr(button1, "type", "submit");
      attr(button2, "id", "newBlankButton");
      attr(button2, "class", "pf-v5-c-button pf-m-secondary");
      attr(button2, "type", "button");
      attr(button2, "title", "Start from an empty map");
      attr(div11, "class", "new-panel__status");
      attr(div11, "aria-live", "polite");
      attr(div12, "class", "new-panel__actions");
      attr(form, "class", "shortcut-help__list new-panel__form");
      attr(div13, "class", "shortcut-help__panel");
      attr(div13, "tabindex", "-1");
      attr(div14, "id", "newPanel");
      attr(div14, "class", "shortcut-help");
      div14.hidden = true;
      attr(div14, "aria-hidden", "true");
      attr(div14, "role", "dialog");
      attr(div14, "aria-modal", "true");
      attr(div14, "aria-labelledby", "newPanelTitle");
      binding_group.p(input1, input2);
    },
    m(target2, anchor) {
      insert(target2, div14, anchor);
      append(div14, div0);
      append(div14, t0);
      append(div14, div13);
      append(div13, div2);
      append(div13, t6);
      append(div13, form);
      append(form, div3);
      append(div3, label0);
      append(div3, t8);
      append(div3, p1);
      append(div3, t10);
      append(div3, textarea);
      set_input_value(
        textarea,
        /*domain*/
        ctx[0]
      );
      append(form, t11);
      append(form, div4);
      append(div4, label1);
      append(label1, input0);
      input0.checked = /*asSeries*/
      ctx[1];
      append(label1, t12);
      append(label1, span1);
      append(form, t15);
      append(form, fieldset);
      append(fieldset, legend);
      append(fieldset, t17);
      append(fieldset, p2);
      append(fieldset, t19);
      append(fieldset, label2);
      append(label2, input1);
      input1.checked = input1.__value === /*target*/
      ctx[2];
      append(label2, t20);
      append(label2, div7);
      append(fieldset, t24);
      append(fieldset, label3);
      append(label3, input2);
      input2.checked = input2.__value === /*target*/
      ctx[2];
      append(label3, t25);
      append(label3, div10);
      append(form, t29);
      append(form, div12);
      append(div12, button1);
      append(div12, t31);
      append(div12, button2);
      append(div12, t33);
      append(div12, div11);
      append(div11, t34);
      append(form, t35);
      if (if_block0) if_block0.m(form, null);
      append(form, t36);
      if (if_block1) if_block1.m(form, null);
      if (!mounted) {
        dispose = [
          listen(
            textarea,
            "input",
            /*textarea_input_handler*/
            ctx[7]
          ),
          listen(
            input0,
            "change",
            /*input0_change_handler*/
            ctx[8]
          ),
          listen(
            input1,
            "change",
            /*input1_change_handler*/
            ctx[9]
          ),
          listen(
            input2,
            "change",
            /*input2_change_handler*/
            ctx[11]
          ),
          listen(form, "submit", prevent_default(
            /*handleSubmit*/
            ctx[6]
          ))
        ];
        mounted = true;
      }
    },
    p(ctx2, [dirty]) {
      if (dirty & /*domain*/
      1) {
        set_input_value(
          textarea,
          /*domain*/
          ctx2[0]
        );
      }
      if (dirty & /*asSeries*/
      2) {
        input0.checked = /*asSeries*/
        ctx2[1];
      }
      if (dirty & /*target*/
      4) {
        input1.checked = input1.__value === /*target*/
        ctx2[2];
      }
      if (dirty & /*target*/
      4) {
        input2.checked = input2.__value === /*target*/
        ctx2[2];
      }
      if (dirty & /*status*/
      8) set_data(
        t34,
        /*status*/
        ctx2[3]
      );
      if (
        /*target*/
        ctx2[2] === "gpt"
      ) {
        if (if_block0) {
          if_block0.p(ctx2, dirty);
        } else {
          if_block0 = create_if_block_1();
          if_block0.c();
          if_block0.m(form, t36);
        }
      } else if (if_block0) {
        if_block0.d(1);
        if_block0 = null;
      }
      if (
        /*prompt*/
        ctx2[4] && /*showPromptPanel*/
        ctx2[5]
      ) {
        if (if_block1) {
          if_block1.p(ctx2, dirty);
        } else {
          if_block1 = create_if_block(ctx2);
          if_block1.c();
          if_block1.m(form, null);
        }
      } else if (if_block1) {
        if_block1.d(1);
        if_block1 = null;
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching) {
        detach(div14);
      }
      if (if_block0) if_block0.d();
      if (if_block1) if_block1.d();
      binding_group.r();
      mounted = false;
      run_all(dispose);
    }
  };
}
const gptLink = "https://chatgpt.com/g/g-690f6217889c819191786ef16481f534-blockscape";
function instance$2($$self, $$props, $$invalidate) {
  let domain = "";
  let asSeries = false;
  let target2 = "gpt";
  let status = "";
  let prompt = "";
  let showPromptPanel = false;
  const clipboardSupported = () => {
    var _a;
    return typeof navigator !== "undefined" && !!((_a = navigator.clipboard) == null ? void 0 : _a.writeText);
  };
  function buildPlainPrompt(trimmedDomain) {
    const domainText = trimmedDomain || "[DOMAIN]";
    const typeText = asSeries ? "series" : "map";
    const template = plainPromptTemplate.replaceAll("[DOMAIN NAME]", domainText).replaceAll("[DOMAIN]", domainText).replaceAll("[map|series]", typeText);
    const lines = template.split("\n");
    const customLead = `Generate a **blockscape ${typeText}** for the domain of ${domainText}.`;
    const leadIndex = lines.findIndex((line) => line.toLowerCase().includes("generate a **blockscape value") || line.toLowerCase().includes("generate a blockscape [map|series]") || line.toLowerCase().startsWith("generate a blockscape"));
    if (leadIndex >= 0) {
      lines[leadIndex] = customLead;
    } else {
      lines.unshift(customLead);
    }
    const seriesNote = asSeries ? "\n\nUser requested a series (return an array of models)." : "";
    return `${lines.join("\n").trim()}${seriesNote}`;
  }
  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedDomain = domain.trim();
    $$invalidate(3, status = "");
    $$invalidate(5, showPromptPanel = target2 !== "gpt");
    if (!trimmedDomain) {
      $$invalidate(3, status = "Add a domain to generate a prompt.");
      $$invalidate(4, prompt = "");
      return;
    }
    const action = asSeries ? "Create a series" : "Create a map";
    if (target2 === "gpt") {
      $$invalidate(4, prompt = `${action} for ${trimmedDomain}`);
    } else {
      $$invalidate(4, prompt = buildPlainPrompt(trimmedDomain));
      $$invalidate(5, showPromptPanel = true);
    }
    if (!clipboardSupported()) {
      $$invalidate(3, status = "Clipboard access is unavailable. Copy the prompt below.");
      $$invalidate(5, showPromptPanel = true);
      return;
    }
    try {
      await navigator.clipboard.writeText(prompt);
      $$invalidate(3, status = target2 === "gpt" ? "Prompt copied. Open the Blockscape GPT link to paste it." : "Prompt copied to clipboard.");
      if (target2 === "gpt") {
        $$invalidate(5, showPromptPanel = false);
      }
    } catch (err) {
      console.warn("[Blockscape] clipboard write failed", err);
      $$invalidate(3, status = "Copy failed. Use the prompt below.");
      $$invalidate(5, showPromptPanel = true);
    }
  }
  const $$binding_groups = [[]];
  function textarea_input_handler() {
    domain = this.value;
    $$invalidate(0, domain);
  }
  function input0_change_handler() {
    asSeries = this.checked;
    $$invalidate(1, asSeries);
  }
  function input1_change_handler() {
    target2 = this.__value;
    $$invalidate(2, target2);
  }
  function input2_change_handler() {
    target2 = this.__value;
    $$invalidate(2, target2);
  }
  function textarea_input_handler_1() {
    prompt = this.value;
    $$invalidate(4, prompt);
  }
  return [
    domain,
    asSeries,
    target2,
    status,
    prompt,
    showPromptPanel,
    handleSubmit,
    textarea_input_handler,
    input0_change_handler,
    input1_change_handler,
    $$binding_groups,
    input2_change_handler,
    textarea_input_handler_1
  ];
}
class NewPanel extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$2, create_fragment$2, safe_not_equal, {});
  }
}
const { document: document_1 } = globals;
function create_fragment$1(ctx) {
  let link;
  let t0;
  let div25;
  let header;
  let div9;
  let div8;
  let div7;
  let div0;
  let t3;
  let div6;
  let div1;
  let button0;
  let span0;
  let t4_value = (
    /*headerExpanded*/
    ctx[0] ? "Hide tools" : "Show tools"
  );
  let t4;
  let t5;
  let span1;
  let button0_aria_label_value;
  let t7;
  let button1;
  let t9;
  let label0;
  let t12;
  let button2;
  let t14;
  let button3;
  let t16;
  let div5;
  let div3;
  let t20;
  let form;
  let t26;
  let button5;
  let div5_hidden_value;
  let div5_aria_hidden_value;
  let div6_data_expanded_value;
  let t28;
  let a0;
  let header_hidden_value;
  let t29;
  let main;
  let div23;
  let aside;
  let div10;
  let t31;
  let ul;
  let t32;
  let div11;
  let t36;
  let section0;
  let div12;
  let t38;
  let p0;
  let t40;
  let div15;
  let label3;
  let t42;
  let div13;
  let label4;
  let t44;
  let select0;
  let option;
  let t46;
  let select1;
  let t47;
  let div14;
  let t51;
  let div17;
  let aside_hidden_value;
  let t58;
  let div22;
  let t84;
  let footer;
  let div24;
  let footer_hidden_value;
  let t86;
  let html_tag;
  let raw_value = `<script id="seed" type="application/json">${/*seedText*/
  ctx[4]}<\/script>`;
  let t87;
  let svg1;
  let t88;
  let div26;
  let t89;
  let div27;
  let t90;
  let div32;
  let t97;
  let shortcuthelp;
  let t98;
  let newpanel;
  let current;
  let mounted;
  let dispose;
  shortcuthelp = new ShortcutHelp({});
  newpanel = new NewPanel({});
  return {
    c() {
      link = element("link");
      t0 = space();
      div25 = element("div");
      header = element("header");
      div9 = element("div");
      div8 = element("div");
      div7 = element("div");
      div0 = element("div");
      div0.innerHTML = `<h1 class="sr-only">Blockscape</h1> <img class="blockscape-brand__logo" src="logos/blockscape-logo.svg" alt="Blockscape — landscape tile explorer" decoding="async"/>`;
      t3 = space();
      div6 = element("div");
      div1 = element("div");
      button0 = element("button");
      span0 = element("span");
      t4 = text(t4_value);
      t5 = space();
      span1 = element("span");
      span1.textContent = "▾";
      t7 = space();
      button1 = element("button");
      button1.textContent = "New";
      t9 = space();
      label0 = element("label");
      label0.innerHTML = `<span>Open</span> <input id="file" type="file" accept=".bs,.json,.txt" multiple=""/>`;
      t12 = space();
      button2 = element("button");
      button2.textContent = "Share";
      t14 = space();
      button3 = element("button");
      button3.textContent = "Help";
      t16 = space();
      div5 = element("div");
      div3 = element("div");
      div3.innerHTML = `<label class="sr-only" for="search">Search tiles</label> <input id="search" class="pf-v5-c-form-control" type="text" placeholder="Search…"/> <div id="searchResults" class="search-results" role="listbox" aria-label="Search across all models" hidden=""></div>`;
      t20 = space();
      form = element("form");
      form.innerHTML = `<label class="sr-only" for="urlInput">Load JSON from URL</label> <input id="urlInput" name="modelUrl" class="pf-v5-c-form-control is-url" type="url" placeholder="Load JSON from URL…" autocomplete="additional-name"/> <button id="loadUrl" class="pf-v5-c-button pf-m-primary" type="submit">Load URL</button> <div id="urlHint" class="url-hint" aria-live="polite"></div>`;
      t26 = space();
      button5 = element("button");
      button5.textContent = "Edit";
      t28 = space();
      a0 = element("a");
      a0.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg>`;
      t29 = space();
      main = element("main");
      div23 = element("div");
      aside = element("aside");
      div10 = element("div");
      div10.textContent = "Models";
      t31 = space();
      ul = element("ul");
      t32 = space();
      div11 = element("div");
      div11.innerHTML = `<button id="removeModel" class="pf-v5-c-button pf-m-tertiary" type="button" title="Remove selected model">Remove active</button> <button id="clear" class="pf-v5-c-button pf-m-tertiary" type="button">Clear selection</button>`;
      t36 = space();
      section0 = element("section");
      div12 = element("div");
      div12.textContent = "Local files";
      t38 = space();
      p0 = element("p");
      p0.textContent = "Checking for local server…";
      t40 = space();
      div15 = element("div");
      label3 = element("label");
      label3.textContent = "Blockscape files under ~/blockscape";
      t42 = space();
      div13 = element("div");
      label4 = element("label");
      label4.textContent = "Folder";
      t44 = space();
      select0 = element("select");
      option = element("option");
      option.textContent = "All (~/blockscape)";
      t46 = space();
      select1 = element("select");
      t47 = space();
      div14 = element("div");
      div14.innerHTML = `<button id="refreshLocalFiles" class="pf-v5-c-button pf-m-tertiary" type="button">Refresh</button> <button id="loadLocalFile" class="pf-v5-c-button pf-m-secondary" type="button">Load</button>`;
      t51 = space();
      div17 = element("div");
      div17.innerHTML = `<label for="localSavePath">Save active map to ~/blockscape</label> <input id="localSavePath" class="pf-v5-c-form-control" type="text" placeholder="my-map.bs"/> <div class="local-backend__save-actions"><button id="saveLocalFile" class="pf-v5-c-button pf-m-primary" type="button">Save</button> <button id="saveLocalFileAs" class="pf-v5-c-button pf-m-secondary" type="button">Save as</button></div>`;
      t58 = space();
      div22 = element("div");
      div22.innerHTML = `<section class="pf-v5-c-page__main-section blockscape-json-panel" hidden="" aria-label="Model source JSON editor"><p class="blockscape-json-panel__title">Paste / edit JSON for the <b>active</b> model (schema below)</p> <div class="muted">Schema: <code>{ id, title, abstract?, categories:[{id,title,items:[{id,name,deps?:[],logo?,external?:url,color?,...}}], ... }</code><br/>
            You can paste multiple objects separated by <code>---</code> or <code>%%%</code>, or a JSON array of models, to append several models.
            A single object replaces only when you click “Replace active with JSON”. Tip: with no input focused, press
            Cmd/Ctrl+V anywhere on the page to append clipboard JSON instantly.</div> <div class="blockscape-json-controls"><textarea id="jsonBox" class="pf-v5-c-form-control" aria-label="JSON editor for the active model"></textarea> <div class="blockscape-json-actions"><button id="copyJson" class="pf-v5-c-button pf-m-tertiary" type="button" title="Copy the current JSON to your clipboard">Copy</button> <button id="copySeries" class="pf-v5-c-button pf-m-tertiary" type="button" title="Copy every version in this series as an array">Copy series</button> <button id="pasteJson" class="pf-v5-c-button pf-m-tertiary" type="button" title="Paste clipboard JSON to replace the editor contents">Paste</button> <button id="appendFromBox" class="pf-v5-c-button pf-m-primary" type="button">Append model(s)</button> <button id="replaceActive" class="pf-v5-c-button pf-m-secondary" type="button">Replace active with
                JSON</button> <button id="createVersion" class="pf-v5-c-button pf-m-secondary" type="button" title="Create a new version from the current map">New version</button></div></div></section> <section class="pf-v5-c-page__main-section blockscape-main-section"><div id="app" aria-live="polite"></div></section>`;
      t84 = space();
      footer = element("footer");
      div24 = element("div");
      div24.innerHTML = `<a href="https://pwright.github.io/backscape/" target="_blank" rel="noreferrer noopener">Old versions</a>`;
      t86 = space();
      html_tag = new HtmlTag(false);
      t87 = space();
      svg1 = svg_element("svg");
      t88 = space();
      div26 = element("div");
      t89 = space();
      div27 = element("div");
      t90 = space();
      div32 = element("div");
      div32.innerHTML = `<div class="item-preview__header"><span class="item-preview__title">Preview</span> <div class="item-preview__actions" hidden=""></div> <button type="button" class="item-preview__close" aria-label="Close preview">×</button></div> <div class="item-preview__body"><div class="item-preview__status">Right-click a tile to see related notes.</div></div>`;
      t97 = space();
      create_component(shortcuthelp.$$.fragment);
      t98 = space();
      create_component(newpanel.$$.fragment);
      document_1.title = "Blockscape — simple landscape-style tiles";
      attr(link, "rel", "icon");
      attr(link, "type", "image/svg+xml");
      attr(link, "href", "./favicon.svg");
      attr(div0, "class", "blockscape-brand");
      attr(span0, "class", "blockscape-toolbar__toggle-label");
      attr(span1, "class", "blockscape-toolbar__toggle-icon");
      attr(span1, "aria-hidden", "true");
      attr(button0, "class", "pf-v5-c-button pf-m-secondary blockscape-toolbar__toggle");
      attr(button0, "type", "button");
      attr(
        button0,
        "aria-expanded",
        /*headerExpanded*/
        ctx[0]
      );
      attr(button0, "aria-controls", "blockscapeHeaderExtras");
      attr(button0, "aria-label", button0_aria_label_value = /*headerExpanded*/
      ctx[0] ? "Hide tools" : "Show tools");
      attr(button1, "id", "newPanelButton");
      attr(button1, "class", "pf-v5-c-button pf-m-primary");
      attr(button1, "type", "button");
      attr(button1, "title", "Create something new");
      attr(label0, "class", "pf-v5-c-button pf-m-primary blockscape-file");
      attr(button2, "id", "shareModel");
      attr(button2, "class", "pf-v5-c-button pf-m-secondary");
      attr(button2, "type", "button");
      attr(button2, "title", "Copy a shareable URL for this model");
      attr(button3, "id", "helpButton");
      attr(button3, "class", "pf-v5-c-button pf-m-primary");
      attr(button3, "type", "button");
      attr(button3, "title", "Show keyboard shortcuts");
      attr(div1, "class", "blockscape-toolbar__primary");
      attr(div3, "class", "blockscape-search");
      attr(form, "id", "urlForm");
      attr(form, "class", "blockscape-url-form");
      attr(form, "autocomplete", "on");
      form.noValidate = true;
      attr(button5, "id", "openInEditor");
      attr(button5, "class", "pf-v5-c-button pf-m-secondary");
      attr(button5, "type", "button");
      attr(button5, "title", "Open current JSON in the editor");
      attr(div5, "id", "blockscapeHeaderExtras");
      attr(div5, "class", "blockscape-toolbar__extras");
      div5.hidden = div5_hidden_value = !/*headerExpanded*/
      ctx[0];
      attr(div5, "aria-hidden", div5_aria_hidden_value = !/*headerExpanded*/
      ctx[0]);
      attr(div6, "class", "blockscape-toolbar__controls");
      attr(div6, "data-expanded", div6_data_expanded_value = /*headerExpanded*/
      ctx[0] ? "true" : "false");
      attr(a0, "href", "https://github.com/pwright/blockscape");
      attr(a0, "target", "_blank");
      attr(a0, "class", "pf-v5-c-button pf-m-plain blockscape-toolbar__github");
      attr(a0, "title", "View on GitHub");
      attr(a0, "aria-label", "View Blockscape on GitHub");
      attr(div7, "class", "blockscape-toolbar");
      attr(div8, "class", "pf-v5-c-masthead__content");
      attr(div9, "class", "pf-v5-c-masthead pf-m-display-inline blockscape-masthead");
      attr(header, "class", "pf-v5-c-page__header");
      header.hidden = header_hidden_value = !/*showHeader*/
      ctx[3];
      attr(div10, "class", "sidebar-heading");
      attr(ul, "id", "modelList");
      attr(ul, "class", "model-nav-list");
      attr(div11, "class", "model-actions");
      attr(div12, "class", "sidebar-heading");
      attr(p0, "id", "localBackendStatus");
      attr(p0, "class", "local-backend__status muted");
      attr(label3, "class", "sr-only");
      attr(label3, "for", "localFileList");
      attr(label4, "for", "localDirSelect");
      option.__value = "";
      set_input_value(option, option.__value);
      attr(select0, "id", "localDirSelect");
      attr(select0, "class", "pf-v5-c-form-control");
      attr(select0, "aria-label", "Folder filter");
      attr(div13, "class", "local-backend__dir");
      attr(select1, "id", "localFileList");
      attr(select1, "class", "pf-v5-c-form-control");
      attr(select1, "size", "12");
      select1.multiple = true;
      attr(select1, "aria-label", "Blockscape files on local server");
      attr(div14, "class", "local-backend__actions");
      attr(div15, "class", "local-backend__list");
      attr(div17, "class", "local-backend__save");
      attr(section0, "id", "localBackendPanel");
      attr(section0, "class", "local-backend");
      section0.hidden = true;
      attr(aside, "class", "blockscape-sidebar");
      attr(aside, "aria-label", "Models");
      aside.hidden = aside_hidden_value = !/*showSidebar*/
      ctx[2];
      attr(div22, "class", "blockscape-main");
      attr(div23, "class", "blockscape-content");
      attr(main, "class", "pf-v5-c-page__main");
      attr(div24, "class", "blockscape-footer__inner");
      attr(footer, "class", "pf-v5-c-page__footer blockscape-footer");
      footer.hidden = footer_hidden_value = !/*showFooter*/
      ctx[1];
      attr(div25, "class", "pf-v5-c-page");
      html_tag.a = t87;
      attr(svg1, "id", "overlay");
      attr(svg1, "class", "svg-layer");
      attr(div26, "id", "tabTooltip");
      attr(div26, "class", "blockscape-tab-tooltip");
      div26.hidden = true;
      attr(div26, "aria-hidden", "true");
      attr(div27, "id", "tileContextMenu");
      attr(div27, "class", "tile-context-menu");
      div27.hidden = true;
      attr(div27, "aria-hidden", "true");
      attr(div32, "id", "itemPreview");
      attr(div32, "class", "item-preview");
      div32.hidden = true;
      attr(div32, "aria-hidden", "true");
    },
    m(target2, anchor) {
      append(document_1.head, link);
      insert(target2, t0, anchor);
      insert(target2, div25, anchor);
      append(div25, header);
      append(header, div9);
      append(div9, div8);
      append(div8, div7);
      append(div7, div0);
      append(div7, t3);
      append(div7, div6);
      append(div6, div1);
      append(div1, button0);
      append(button0, span0);
      append(span0, t4);
      append(button0, t5);
      append(button0, span1);
      append(div1, t7);
      append(div1, button1);
      append(div1, t9);
      append(div1, label0);
      append(div1, t12);
      append(div1, button2);
      append(div1, t14);
      append(div1, button3);
      append(div6, t16);
      append(div6, div5);
      append(div5, div3);
      append(div5, t20);
      append(div5, form);
      append(div5, t26);
      append(div5, button5);
      append(div7, t28);
      append(div7, a0);
      append(div25, t29);
      append(div25, main);
      append(main, div23);
      append(div23, aside);
      append(aside, div10);
      append(aside, t31);
      append(aside, ul);
      append(aside, t32);
      append(aside, div11);
      append(aside, t36);
      append(aside, section0);
      append(section0, div12);
      append(section0, t38);
      append(section0, p0);
      append(section0, t40);
      append(section0, div15);
      append(div15, label3);
      append(div15, t42);
      append(div15, div13);
      append(div13, label4);
      append(div13, t44);
      append(div13, select0);
      append(select0, option);
      append(div15, t46);
      append(div15, select1);
      append(div15, t47);
      append(div15, div14);
      append(section0, t51);
      append(section0, div17);
      append(div23, t58);
      append(div23, div22);
      append(div25, t84);
      append(div25, footer);
      append(footer, div24);
      insert(target2, t86, anchor);
      html_tag.m(raw_value, target2, anchor);
      insert(target2, t87, anchor);
      insert(target2, svg1, anchor);
      insert(target2, t88, anchor);
      insert(target2, div26, anchor);
      insert(target2, t89, anchor);
      insert(target2, div27, anchor);
      insert(target2, t90, anchor);
      insert(target2, div32, anchor);
      insert(target2, t97, anchor);
      mount_component(shortcuthelp, target2, anchor);
      insert(target2, t98, anchor);
      mount_component(newpanel, target2, anchor);
      current = true;
      if (!mounted) {
        dispose = listen(
          button0,
          "click",
          /*toggleHeaderExpanded*/
          ctx[5]
        );
        mounted = true;
      }
    },
    p(ctx2, [dirty]) {
      if ((!current || dirty & /*headerExpanded*/
      1) && t4_value !== (t4_value = /*headerExpanded*/
      ctx2[0] ? "Hide tools" : "Show tools")) set_data(t4, t4_value);
      if (!current || dirty & /*headerExpanded*/
      1) {
        attr(
          button0,
          "aria-expanded",
          /*headerExpanded*/
          ctx2[0]
        );
      }
      if (!current || dirty & /*headerExpanded*/
      1 && button0_aria_label_value !== (button0_aria_label_value = /*headerExpanded*/
      ctx2[0] ? "Hide tools" : "Show tools")) {
        attr(button0, "aria-label", button0_aria_label_value);
      }
      if (!current || dirty & /*headerExpanded*/
      1 && div5_hidden_value !== (div5_hidden_value = !/*headerExpanded*/
      ctx2[0])) {
        div5.hidden = div5_hidden_value;
      }
      if (!current || dirty & /*headerExpanded*/
      1 && div5_aria_hidden_value !== (div5_aria_hidden_value = !/*headerExpanded*/
      ctx2[0])) {
        attr(div5, "aria-hidden", div5_aria_hidden_value);
      }
      if (!current || dirty & /*headerExpanded*/
      1 && div6_data_expanded_value !== (div6_data_expanded_value = /*headerExpanded*/
      ctx2[0] ? "true" : "false")) {
        attr(div6, "data-expanded", div6_data_expanded_value);
      }
      if (!current || dirty & /*showHeader*/
      8 && header_hidden_value !== (header_hidden_value = !/*showHeader*/
      ctx2[3])) {
        header.hidden = header_hidden_value;
      }
      if (!current || dirty & /*showSidebar*/
      4 && aside_hidden_value !== (aside_hidden_value = !/*showSidebar*/
      ctx2[2])) {
        aside.hidden = aside_hidden_value;
      }
      if (!current || dirty & /*showFooter*/
      2 && footer_hidden_value !== (footer_hidden_value = !/*showFooter*/
      ctx2[1])) {
        footer.hidden = footer_hidden_value;
      }
    },
    i(local) {
      if (current) return;
      transition_in(shortcuthelp.$$.fragment, local);
      transition_in(newpanel.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(shortcuthelp.$$.fragment, local);
      transition_out(newpanel.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      if (detaching) {
        detach(t0);
        detach(div25);
        detach(t86);
        html_tag.d();
        detach(t87);
        detach(svg1);
        detach(t88);
        detach(div26);
        detach(t89);
        detach(div27);
        detach(t90);
        detach(div32);
        detach(t97);
        detach(t98);
      }
      detach(link);
      destroy_component(shortcuthelp, detaching);
      destroy_component(newpanel, detaching);
      mounted = false;
      dispose();
    }
  };
}
function instance$1($$self, $$props, $$invalidate) {
  let showHeader;
  let showSidebar;
  let showFooter;
  let { seed } = $$props;
  let { features = {} } = $$props;
  const defaultSeedText = `
  {
  "id": "blockscape",
  "title": "Blockscape (AI maps)",
  "abstract": "Blockscape (pronounced BYK-shed) visualizes value chains and dependencies using a BS file. Inspired by Wardley maps, these maps emphasizes the topology that makes maps useful.",
  "categories": [
    {
      "id": "communication",
      "title": "Communication",
      "items": [
        {
          "id": "gestalt",
          "name": "Visualise to understand",
          "logo": "./logos/block-mind-blown.gif",
          "deps": []
        },
        {
          "id": "value-chain",
          "name": "Visible value chain (y-axis)",
          "deps": []
        },
        {
          "id": "evolution",
          "name": "Evolution and maturity (x-axis)",
          "deps": []
        },
        {
          "id": "relational-awareness",
          "name": "Relations",
          "logo": "./logos/relations.png",
          "deps": []
        },
        {
          "id": "icons",
          "name": "Icons",
          "deps": []
        }
      ]
    },
    {
      "id": "experience",
      "title": "User Experience",
      "items": [
        {
          "id": "paste-bs-file",
          "name": "Paste (cmd-v)",
          "deps": [
            "bs-format-simple"
          ]
        },
        {
          "id": "load-multidoc-file",
          "name": "Series",
          "deps": [
            "bs-format-simple"
          ]
        },
        {
          "id": "create-gist-multidoc",
          "name": "Gist",
          "deps": [
            "gists",
            "bs-format-simple"
          ]
        },
        {
          "id": "abstract-gist-loading",
          "name": "Links",
          "deps": [
            "gists",
            "bs-format-simple"
          ]
        },
        {
          "id": "model-collection",
          "name": "Portfolio",
          "deps": [
            "apicurio",
            "bs-format-simple"
          ]
        }
      ]
    },
    {
      "id": "authoring-ai",
      "title": "Authoring (LLM)",
      "items": [
        {
          "id": "bs-format-simple",
          "name": "BS Schema",
          "deps": []
        },
        {
          "id": "editor-human-terms",
          "name": "Edit",
          "deps": [
            "bs-format-simple",
            "gestalt"
          ]
        },
        {
          "id": "llm-generate-bs",
          "name": "LLM generates BS",
          "external": "https://github.com/pwright/blockscape/blob/main/map-generation-prompt.md",
          "deps": [
            "bs-format-simple"
          ]
        },
        {
          "id": "llm-consume-bs",
          "name": "LLM consumes BS",
          "deps": [
            "bs-format-simple"
          ]
        },
        {
          "id": "move-items",
          "name": "Move (shift - arrow keys)",
          "logo": "./logos/block-swap.gif",
          "deps": []
        }
      ]
    },
    {
      "id": "platforms",
      "title": "Platforms",
      "items": [
        {
          "id": "gists",
          "name": "Gist",
          "logo": "https://favicon.im/github.com",
          "deps": []
        },
        {
          "id": "apicurio",
          "name": "Apicurio",
          "logo": "https://www.google.com/s2/favicons?domain=apicur.io&sz=96",
          "deps": []
        }
      ]
    }
  ]
}`;
  const seedText = seed ? JSON.stringify(seed, null, 2) : defaultSeedText;
  let headerExpanded = false;
  const toggleHeaderExpanded = () => {
    $$invalidate(0, headerExpanded = !headerExpanded);
    if (!headerExpanded) {
      const searchInput = document.getElementById("search");
      if (searchInput && searchInput.value) {
        searchInput.value = "";
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  };
  onMount(() => {
    initBlockscape(features);
  });
  $$self.$$set = ($$props2) => {
    if ("seed" in $$props2) $$invalidate(6, seed = $$props2.seed);
    if ("features" in $$props2) $$invalidate(7, features = $$props2.features);
  };
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*features*/
    128) {
      $$invalidate(3, showHeader = features.showHeader !== false);
    }
    if ($$self.$$.dirty & /*features*/
    128) {
      $$invalidate(2, showSidebar = features.showSidebar !== false);
    }
    if ($$self.$$.dirty & /*features*/
    128) {
      $$invalidate(1, showFooter = features.showFooter !== false);
    }
  };
  return [
    headerExpanded,
    showFooter,
    showSidebar,
    showHeader,
    seedText,
    toggleHeaderExpanded,
    seed,
    features
  ];
}
class App extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance$1, create_fragment$1, safe_not_equal, { seed: 6, features: 7 });
  }
}
function create_fragment(ctx) {
  let app;
  let current;
  app = new App({
    props: {
      seed: (
        /*seed*/
        ctx[0]
      ),
      features: (
        /*features*/
        ctx[1]
      )
    }
  });
  return {
    c() {
      create_component(app.$$.fragment);
    },
    m(target2, anchor) {
      mount_component(app, target2, anchor);
      current = true;
    },
    p(ctx2, [dirty]) {
      const app_changes = {};
      if (dirty & /*seed*/
      1) app_changes.seed = /*seed*/
      ctx2[0];
      if (dirty & /*features*/
      2) app_changes.features = /*features*/
      ctx2[1];
      app.$set(app_changes);
    },
    i(local) {
      if (current) return;
      transition_in(app.$$.fragment, local);
      current = true;
    },
    o(local) {
      transition_out(app.$$.fragment, local);
      current = false;
    },
    d(detaching) {
      destroy_component(app, detaching);
    }
  };
}
function instance($$self, $$props, $$invalidate) {
  let { seed } = $$props;
  let { features = {} } = $$props;
  $$self.$$set = ($$props2) => {
    if ("seed" in $$props2) $$invalidate(0, seed = $$props2.seed);
    if ("features" in $$props2) $$invalidate(1, features = $$props2.features);
  };
  return [seed, features];
}
class Blockscape extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance, create_fragment, safe_not_equal, { seed: 0, features: 1 });
  }
}
const target = document.getElementById("root");
new Blockscape({
  target
});
