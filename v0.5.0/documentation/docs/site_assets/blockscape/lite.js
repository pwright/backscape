(function blockscapeLiteModule(global) {
  "use strict";

  const STYLE_ID = "blockscape-lite-styles";
  let selectionTriggersBound = false;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.blockscape-lite {
  --bsl-bg: #f8fafc;
  --bsl-surface: #ffffff;
  --bsl-surface-strong: #e2e8f0;
  --bsl-text: #0f172a;
  --bsl-muted: #475569;
  --bsl-border: #cbd5e1;
  --bsl-dep: #2563eb;
  --bsl-rev: #dc2626;
  --bsl-link: #64748b;
  --bsl-shadow: 0 18px 35px -24px rgba(15, 23, 42, 0.45);
  --bsl-tile-shadow: 0 10px 25px -18px rgba(15, 23, 42, 0.55);
  position: relative;
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--bsl-border);
  border-radius: 1rem;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.08), transparent 28%),
    linear-gradient(180deg, #ffffff 0%, var(--bsl-bg) 100%);
  color: var(--bsl-text);
  box-shadow: var(--bsl-shadow);
  overflow: auto;
}

.blockscape-lite__header {
  display: grid;
  gap: 0.35rem;
}

.blockscape-lite__header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.blockscape-lite__header-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.blockscape-lite__copy-button {
  border: 1px solid var(--bsl-border);
  background: var(--bsl-surface);
  color: var(--bsl-text);
  border-radius: 999px;
  min-width: 2rem;
  height: 2rem;
  padding: 0 0.8rem;
  font: 600 0.82rem/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  cursor: pointer;
}

.blockscape-lite__copy-button:hover,
.blockscape-lite__copy-button:focus-visible {
  border-color: #94a3b8;
  outline: none;
}

.blockscape-lite__series {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.blockscape-lite__series-status {
  color: var(--bsl-muted);
  font: 600 0.82rem/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.blockscape-lite__series-controls {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.blockscape-lite__series-button {
  border: 1px solid var(--bsl-border);
  background: var(--bsl-surface);
  color: var(--bsl-text);
  border-radius: 999px;
  min-width: 2rem;
  height: 2rem;
  padding: 0 0.75rem;
  font: 600 0.82rem/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  cursor: pointer;
}

.blockscape-lite__series-button[disabled] {
  opacity: 0.45;
  cursor: default;
}

.blockscape-lite__series-button:not([disabled]):hover,
.blockscape-lite__series-button:not([disabled]):focus-visible {
  border-color: #94a3b8;
  outline: none;
}

.blockscape-lite__title {
  margin: 0;
  font: 700 1.15rem/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.blockscape-lite__abstract {
  margin: 0;
  color: var(--bsl-muted);
  font: 400 0.95rem/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.blockscape-lite__grid {
  position: relative;
  display: grid;
  gap: 1rem;
  min-width: fit-content;
}

.blockscape-lite__links {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.blockscape-lite__category {
  position: relative;
  display: grid;
  grid-template-columns: minmax(10rem, 14rem) minmax(max-content, 1fr);
  gap: 0.9rem;
  align-items: start;
}

.blockscape-lite__category-head {
  position: sticky;
  left: 0;
  z-index: 2;
  padding-top: 0.4rem;
  background: linear-gradient(90deg, rgba(248, 250, 252, 0.96), rgba(248, 250, 252, 0.82), transparent);
}

.blockscape-lite__category-title {
  margin: 0;
  font: 700 0.92rem/1.3 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #334155;
}

.blockscape-lite__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
}

.blockscape-lite__tile {
  position: relative;
  display: grid;
  align-content: start;
  gap: 0.18rem;
  width: 7rem;
  min-height: 4.4rem;
  padding: 0.5rem 0.55rem 0.45rem;
  border: 1px solid var(--bsl-border);
  border-radius: 1rem;
  background: var(--tile-bg, var(--bsl-surface));
  color: var(--bsl-text);
  box-shadow: var(--bsl-tile-shadow);
  cursor: pointer;
  transition:
    transform 120ms ease,
    border-color 120ms ease,
    box-shadow 120ms ease,
    opacity 120ms ease,
    background-color 120ms ease;
}

.blockscape-lite__tile-logo {
  position: absolute;
  left: 50%;
  bottom: calc(100% - 1.55rem);
  transform: translate(-50%, 0.25rem) scale(0.96);
  width: 3rem;
  height: 3rem;
  object-fit: contain;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--bsl-border);
  box-shadow: 0 14px 28px -20px rgba(15, 23, 42, 0.6);
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease, transform 120ms ease;
  z-index: 3;
}

.blockscape-lite__tile:hover,
.blockscape-lite__tile:focus-visible {
  transform: translateY(-2px);
  border-color: #94a3b8;
  box-shadow: 0 18px 30px -20px rgba(15, 23, 42, 0.55);
  outline: none;
}

.blockscape-lite__tile:hover .blockscape-lite__tile-logo,
.blockscape-lite__tile:focus-visible .blockscape-lite__tile-logo,
.blockscape-lite__tile:focus-within .blockscape-lite__tile-logo {
  opacity: 1;
  transform: translate(-50%, 0) scale(1);
}

.blockscape-lite__tile.is-selected {
  border-color: var(--bsl-text);
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.15), 0 18px 30px -20px rgba(15, 23, 42, 0.55);
}

.blockscape-lite__tile.is-dep {
  border-color: var(--bsl-dep);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.14), 0 18px 30px -20px rgba(37, 99, 235, 0.38);
}

.blockscape-lite__tile.is-revdep {
  border-color: var(--bsl-rev);
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.14), 0 18px 30px -20px rgba(220, 38, 38, 0.35);
}

.blockscape-lite__tile.is-dimmed {
  opacity: 0.3;
}

.blockscape-lite__tile-top {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 0.35rem;
}

.blockscape-lite__tile-copy {
  flex: 1 1 auto;
  text-align: center;
}

.blockscape-lite__tile-name {
  margin: 0;
  font: 600 0.84rem/1.15 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  text-align: center;
}

.blockscape-lite__tile-id {
  color: var(--bsl-muted);
  font: 500 0.68rem/1.1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  text-align: center;
}

.blockscape-lite__tile-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.45rem;
  height: 1.45rem;
  flex: 0 0 auto;
  border-radius: 999px;
  border: 1px solid var(--bsl-border);
  color: var(--bsl-link);
  background: rgba(255, 255, 255, 0.92);
  text-decoration: none;
  pointer-events: auto;
  font-size: 0.75rem;
}

.blockscape-lite__tile-link:hover,
.blockscape-lite__tile-link:focus-visible {
  color: var(--bsl-text);
  border-color: #94a3b8;
  outline: none;
}

.blockscape-lite__edge {
  fill: none;
  stroke: #cbd5e1;
  stroke-width: 2.25;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.7;
  transition: stroke 120ms ease, opacity 120ms ease, stroke-width 120ms ease;
}

.blockscape-lite__edge.is-dep {
  stroke: var(--bsl-dep);
  opacity: 0.95;
  stroke-width: 2.75;
}

.blockscape-lite__edge.is-revdep {
  stroke: var(--bsl-rev);
  opacity: 0.95;
  stroke-width: 2.75;
}

.blockscape-lite__edge.is-dimmed {
  opacity: 0.1;
}

@media (max-width: 800px) {
  .blockscape-lite__category {
    grid-template-columns: 1fr;
  }

  .blockscape-lite__category-head {
    position: static;
    background: none;
    padding-top: 0;
  }
}
`;
    document.head.appendChild(style);
  }

  function normalizeDeps(item) {
    return Array.isArray(item?.deps)
      ? item.deps.filter((value) => typeof value === "string" && value.trim())
      : [];
  }

  function tintSurface(color) {
    if (typeof color !== "string") return "#ffffff";
    const match = color.trim().match(/^#([0-9a-f]{6})$/i);
    if (!match) return "#ffffff";
    const hex = match[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const mix = (channel) => Math.round(channel * 0.12 + 255 * 0.88);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
  }

  function normalizeModel(model) {
    if (!model || typeof model !== "object") {
      throw new Error("Blockscape Lite expected a map object.");
    }
    const categories = Array.isArray(model.categories) ? model.categories : [];
    const items = [];
    const itemById = new Map();
    const rev = new Map();

    categories.forEach((category, categoryIndex) => {
      const cat = category && typeof category === "object" ? category : {};
      const catItems = Array.isArray(cat.items) ? cat.items : [];
      catItems.forEach((item, itemIndex) => {
        const normalized = {
          ...item,
          id: String(item?.id ?? "").trim(),
          name: String(item?.name ?? item?.id ?? "Untitled").trim(),
          deps: normalizeDeps(item),
          _categoryId: String(cat.id ?? `category-${categoryIndex}`),
          _categoryIndex: categoryIndex,
          _itemIndex: itemIndex,
        };
        if (!normalized.id) return;
        items.push(normalized);
        itemById.set(normalized.id, normalized);
      });
    });

    items.forEach((item) => {
      item.deps = item.deps.filter((depId) => itemById.has(depId));
      item.deps.forEach((depId) => {
        if (!rev.has(depId)) rev.set(depId, new Set());
        rev.get(depId).add(item.id);
      });
    });

    return {
      id: String(model.id ?? "").trim(),
      title: String(model.title ?? model.id ?? "Untitled map").trim(),
      abstract:
        typeof model.abstract === "string" ? model.abstract.trim() : "",
      categories,
      items,
      itemById,
      rev,
    };
  }

  function edgeId(from, to) {
    return `${from}=>${to}`;
  }

  class BlockscapeLite {
    constructor(root, options = {}) {
      this.root = root;
      this.options = options;
      this.model = null;
      this.models = [];
      this.activeModelIndex = 0;
      this.tileById = new Map();
      this.edgeById = new Map();
      this.selectedId = null;
      this.handleResize = this.drawEdges.bind(this);
      injectStyles();
    }

    async mount() {
      const data = await this.resolveData();
      this.models = Array.isArray(data) ? data.filter(Boolean) : [data];
      if (!this.models.length) {
        throw new Error("Blockscape Lite expected at least one map.");
      }
      this.setActiveModel(0);
      global.addEventListener("resize", this.handleResize);
      return this;
    }

    async resolveData() {
      if (this.options.data) return this.options.data;

      const seed =
        this.root.querySelector(".blockscape-seed") ||
        this.root.querySelector('script[type="application/json"]');
      if (seed?.textContent?.trim()) {
        return JSON.parse(seed.textContent);
      }

      const src = this.root.getAttribute("data-src");
      if (src) {
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error(`Unable to load ${src}: ${response.status}`);
        }
        return response.json();
      }

      throw new Error("No inline JSON or data-src found for Blockscape Lite.");
    }

    setActiveModel(index) {
      const nextIndex = Math.max(0, Math.min(index, this.models.length - 1));
      this.activeModelIndex = nextIndex;
      this.model = normalizeModel(this.models[nextIndex]);
      this.selectedId = null;
      this.render();
      this.drawEdges();
    }

    getActiveSourceModel() {
      return this.models[this.activeModelIndex] ?? null;
    }

    getActiveSourceJson() {
      const active = this.getActiveSourceModel();
      if (!active) return "";
      return JSON.stringify(active, null, 2);
    }

    async copyActiveJson() {
      const text = this.getActiveSourceJson();
      if (!text) return;
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          return;
        }
      } catch (error) {
        console.warn("BlockscapeLite clipboard write failed", error);
      }
      window.prompt("Copy JSON:", text);
    }

    render() {
      const { title, abstract, categories } = this.model;
      this.root.innerHTML = "";
      this.root.classList.add("blockscape-lite");

      const header = document.createElement("div");
      header.className = "blockscape-lite__header";
      const headerTop = document.createElement("div");
      headerTop.className = "blockscape-lite__header-top";
      if (this.models.length > 1) {
        const series = document.createElement("div");
        series.className = "blockscape-lite__series";

        const status = document.createElement("div");
        status.className = "blockscape-lite__series-status";
        status.textContent = `Map ${this.activeModelIndex + 1} of ${this.models.length}`;
        series.appendChild(status);

        const controls = document.createElement("div");
        controls.className = "blockscape-lite__series-controls";

        const prev = document.createElement("button");
        prev.type = "button";
        prev.className = "blockscape-lite__series-button";
        prev.textContent = "Previous";
        prev.disabled = this.activeModelIndex === 0;
        prev.addEventListener("click", () => this.setActiveModel(this.activeModelIndex - 1));

        const next = document.createElement("button");
        next.type = "button";
        next.className = "blockscape-lite__series-button";
        next.textContent = "Next";
        next.disabled = this.activeModelIndex >= this.models.length - 1;
        next.addEventListener("click", () => this.setActiveModel(this.activeModelIndex + 1));

        controls.append(prev, next);
        series.appendChild(controls);
        headerTop.appendChild(series);
      }

      const actions = document.createElement("div");
      actions.className = "blockscape-lite__header-actions";
      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.className = "blockscape-lite__copy-button";
      copyButton.textContent = "Copy JSON";
      copyButton.addEventListener("click", () => {
        this.copyActiveJson();
      });
      actions.appendChild(copyButton);
      headerTop.appendChild(actions);
      header.appendChild(headerTop);

      const titleEl = document.createElement("h2");
      titleEl.className = "blockscape-lite__title";
      titleEl.textContent = title;
      header.appendChild(titleEl);
      if (abstract) {
        const abstractEl = document.createElement("p");
        abstractEl.className = "blockscape-lite__abstract";
        abstractEl.innerHTML = abstract;
        header.appendChild(abstractEl);
      }
      this.root.appendChild(header);

      const grid = document.createElement("div");
      grid.className = "blockscape-lite__grid";
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.classList.add("blockscape-lite__links");
      grid.appendChild(svg);
      this.svg = svg;
      this.grid = grid;

      categories.forEach((category, categoryIndex) => {
        const section = document.createElement("section");
        section.className = "blockscape-lite__category";
        section.dataset.categoryId = String(category?.id ?? `category-${categoryIndex}`);

        const head = document.createElement("div");
        head.className = "blockscape-lite__category-head";
        const heading = document.createElement("h3");
        heading.className = "blockscape-lite__category-title";
        heading.textContent = String(
          category?.title ?? category?.id ?? `Category ${categoryIndex + 1}`
        );
        head.appendChild(heading);

        const row = document.createElement("div");
        row.className = "blockscape-lite__row";
        const items = Array.isArray(category?.items) ? category.items : [];

        items.forEach((item) => {
          const id = String(item?.id ?? "").trim();
          if (!id || !this.model.itemById.has(id)) return;
          const normalized = this.model.itemById.get(id);
          const tile = this.renderTile(normalized);
          row.appendChild(tile);
        });

        section.appendChild(head);
        section.appendChild(row);
        grid.appendChild(section);
      });

      this.root.appendChild(grid);
    }

    renderTile(item) {
      const tile = document.createElement("article");
      tile.className = "blockscape-lite__tile";
      tile.dataset.itemId = item.id;
      tile.tabIndex = 0;
      tile.style.setProperty("--tile-bg", tintSurface(item.color));

      if (item.logo) {
        const logo = document.createElement("img");
        logo.className = "blockscape-lite__tile-logo";
        logo.src = item.logo;
        logo.alt = "";
        logo.loading = "lazy";
        logo.decoding = "async";
        logo.addEventListener("error", () => logo.remove());
        tile.appendChild(logo);
      }

      tile.addEventListener("click", (event) => {
        const link = event.target.closest(".blockscape-lite__tile-link");
        if (link) return;
        this.select(item.id);
      });
      tile.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.select(item.id);
        }
      });

      const top = document.createElement("div");
      top.className = "blockscape-lite__tile-top";

      const copy = document.createElement("div");
      copy.className = "blockscape-lite__tile-copy";
      const name = document.createElement("p");
      name.className = "blockscape-lite__tile-name";
      name.textContent = item.name;
      copy.appendChild(name);

      const metaId = document.createElement("div");
      metaId.className = "blockscape-lite__tile-id";
      metaId.textContent = item.id;
      copy.appendChild(metaId);
      top.appendChild(copy);

      if (item.external) {
        const link = document.createElement("a");
        link.className = "blockscape-lite__tile-link";
        link.href = item.external;
        link.target = "_blank";
        link.rel = "noreferrer noopener";
        link.title = `Open ${item.name}`;
        link.setAttribute("aria-label", `Open external link for ${item.name}`);
        link.textContent = "↗";
        top.appendChild(link);
      }

      tile.appendChild(top);

      this.tileById.set(item.id, tile);
      return tile;
    }

    drawEdges() {
      if (!this.grid || !this.svg) return;
      this.svg.innerHTML = "";
      this.edgeById.clear();

      const gridRect = this.grid.getBoundingClientRect();
      this.svg.setAttribute("viewBox", `0 0 ${gridRect.width} ${gridRect.height}`);

      this.model.items.forEach((item) => {
        const fromTile = this.tileById.get(item.id);
        if (!fromTile) return;
        const fromRect = fromTile.getBoundingClientRect();
        const startX = fromRect.left - gridRect.left + fromRect.width / 2;
        const startY = fromRect.top - gridRect.top + fromRect.height / 2;

        item.deps.forEach((depId) => {
          const toTile = this.tileById.get(depId);
          if (!toTile) return;
          const toRect = toTile.getBoundingClientRect();
          const endX = toRect.left - gridRect.left + toRect.width / 2;
          const endY = toRect.top - gridRect.top + toRect.height / 2;
          const curveX = startX + (endX - startX) * 0.5;

          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.classList.add("blockscape-lite__edge");
          path.dataset.from = item.id;
          path.dataset.to = depId;
          path.setAttribute(
            "d",
            `M ${startX} ${startY} C ${curveX} ${startY}, ${curveX} ${endY}, ${endX} ${endY}`
          );
          this.svg.appendChild(path);
          this.edgeById.set(edgeId(item.id, depId), path);
        });
      });

      this.applySelection();
    }

    select(itemId) {
      if (!itemId || !this.model?.itemById?.has(itemId)) return false;
      this.selectedId = this.selectedId === itemId ? null : itemId;
      this.applySelection();
      const tile = this.tileById.get(itemId);
      tile?.focus?.({ preventScroll: false });
      return true;
    }

    applySelection() {
      const selectedId = this.selectedId;
      const deps = new Set();
      const revdeps = new Set();

      if (selectedId && this.model.itemById.has(selectedId)) {
        this.model.itemById.get(selectedId).deps.forEach((depId) => deps.add(depId));
        (this.model.rev.get(selectedId) || new Set()).forEach((revId) => revdeps.add(revId));
      }

      this.tileById.forEach((tile, itemId) => {
        tile.classList.toggle("is-selected", itemId === selectedId);
        tile.classList.toggle("is-dep", deps.has(itemId));
        tile.classList.toggle("is-revdep", revdeps.has(itemId));
        tile.classList.toggle(
          "is-dimmed",
          !!selectedId &&
            itemId !== selectedId &&
            !deps.has(itemId) &&
            !revdeps.has(itemId)
        );
      });

      this.edgeById.forEach((path, key) => {
        const fromId = path.dataset.from;
        const toId = path.dataset.to;
        const isDep = !!selectedId && fromId === selectedId;
        const isRev = !!selectedId && toId === selectedId;
        path.classList.toggle("is-dep", isDep);
        path.classList.toggle("is-revdep", isRev);
        path.classList.toggle("is-dimmed", !!selectedId && !isDep && !isRev);
      });
    }

    destroy() {
      global.removeEventListener("resize", this.handleResize);
      this.tileById.clear();
      this.edgeById.clear();
    }

    static async mountAll(selector = ".blockscape-root") {
      injectStyles();
      const roots = Array.from(document.querySelectorAll(selector));
      const instances = [];
      if (!Array.isArray(BlockscapeLite.instances)) {
        BlockscapeLite.instances = [];
      }
      for (const root of roots) {
        if (root.dataset.blockscapeLiteMounted === "true") continue;
        const instance = new BlockscapeLite(root);
        await instance.mount();
        root.dataset.blockscapeLiteMounted = "true";
        BlockscapeLite.instances.push(instance);
        instances.push(instance);
      }
      BlockscapeLite.bindSelectionTriggers();
      return instances;
    }

    static bindSelectionTriggers() {
      if (selectionTriggersBound) return;
      document.addEventListener("click", (event) => {
        const trigger = event.target.closest("[data-blockscape-select]");
        if (!trigger) return;
        const instances = Array.isArray(BlockscapeLite.instances)
          ? BlockscapeLite.instances.filter((instance) => !!instance?.root?.isConnected)
          : [];
        if (instances.length !== 1) return;
        const targetId = String(trigger.getAttribute("data-blockscape-select") || "").trim();
        if (!targetId) return;
        const handled = instances[0].select(targetId);
        if (handled) {
          event.preventDefault();
        }
      });
      selectionTriggersBound = true;
    }
  }

  BlockscapeLite.instances = [];

  global.BlockscapeLite = BlockscapeLite;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      BlockscapeLite.mountAll().catch((error) => {
        console.error("BlockscapeLite mount failed", error);
      });
    });
  } else {
    BlockscapeLite.mountAll().catch((error) => {
      console.error("BlockscapeLite mount failed", error);
    });
  }
})(window);
