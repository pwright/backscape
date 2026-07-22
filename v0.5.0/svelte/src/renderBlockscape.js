const INSTANCE_KEY = "__blockscapeRenderer";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeMap(map) {
  const categories = asArray(map?.categories).map((category) => ({
    ...category,
    items: asArray(category.items).map((item) => ({
      ...item,
      deps: asArray(item.deps).map(String),
    })),
  }));
  const items = categories.flatMap((category) =>
    category.items.map((item) => ({ ...item, categoryId: category.id }))
  );
  const itemById = new Map(items.map((item) => [String(item.id), item]));
  const revDeps = new Map();

  items.forEach((item) => {
    item.deps.forEach((depId) => {
      if (!revDeps.has(depId)) revDeps.set(depId, new Set());
      revDeps.get(depId).add(String(item.id));
    });
  });

  return { categories, items, itemById, revDeps };
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

function edgeKey(from, to) {
  return `${from}->${to}`;
}

class BlockscapeRenderer {
  constructor(container, map, options = {}) {
    this.container = container;
    this.map = map;
    this.options = options;
    this.model = normalizeMap(map);
    this.tileById = new Map();
    this.edgeById = new Map();
    this.selectedId = null;
    this.resize = () => window.requestAnimationFrame(() => this.drawEdges());
  }

  mount() {
    this.container.innerHTML = "";
    this.container.classList.add("blockscape-rendered");
    this.container.dataset.blockscapeTitle = this.map?.title || "";

    const shell = makeElement("section", "blockscape-view");
    shell.setAttribute("aria-label", this.map?.title || "Blockscape map");

    const header = makeElement("header", "blockscape-view__header");
    header.appendChild(makeElement("h3", "blockscape-view__title", this.map?.title || this.map?.id || "Blockscape"));
    if (this.map?.abstract) {
      header.appendChild(makeElement("p", "blockscape-view__abstract", this.map.abstract));
    }
    shell.appendChild(header);

    this.grid = makeElement("div", "blockscape-view__grid");
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.classList.add("blockscape-view__links");
    this.svg.setAttribute("aria-hidden", "true");
    this.grid.appendChild(this.svg);

    this.model.categories.forEach((category) => {
      const section = makeElement("section", "blockscape-view__category");
      section.dataset.categoryId = category.id;
      const heading = makeElement("h4", "blockscape-view__category-title", category.title || category.id);
      const row = makeElement("div", "blockscape-view__row");
      asArray(category.items).forEach((item) => row.appendChild(this.renderTile(item)));
      section.appendChild(heading);
      section.appendChild(row);
      this.grid.appendChild(section);
    });

    shell.appendChild(this.grid);
    this.container.appendChild(shell);

    window.addEventListener("resize", this.resize);
    this.resize();
    return this;
  }

  renderTile(item) {
    const tile = makeElement("article", "blockscape-view__tile");
    tile.dataset.itemId = item.id;
    tile.tabIndex = 0;

    const name = makeElement("div", "blockscape-view__tile-name", item.name || item.id);
    tile.appendChild(name);

    if (item.id) {
      tile.appendChild(makeElement("div", "blockscape-view__tile-id", item.id));
    }

    if (item.external) {
      const link = makeElement("a", "blockscape-view__tile-link", "Open");
      link.href = item.external;
      link.target = "_blank";
      link.rel = "noreferrer noopener";
      tile.appendChild(link);
    }

    tile.addEventListener("click", (event) => {
      if (event.target.closest("a")) return;
      this.select(item.id);
    });
    tile.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.select(item.id);
      }
    });

    this.tileById.set(String(item.id), tile);
    return tile;
  }

  drawEdges() {
    if (!this.grid || !this.svg) return;
    this.svg.innerHTML = "";
    this.edgeById.clear();

    const gridRect = this.grid.getBoundingClientRect();
    this.svg.setAttribute("viewBox", `0 0 ${gridRect.width} ${gridRect.height}`);

    this.model.items.forEach((item) => {
      const fromTile = this.tileById.get(String(item.id));
      if (!fromTile) return;
      const fromRect = fromTile.getBoundingClientRect();
      const startX = fromRect.left - gridRect.left + fromRect.width / 2;
      const startY = fromRect.top - gridRect.top + fromRect.height / 2;

      item.deps.forEach((depId) => {
        const toTile = this.tileById.get(String(depId));
        if (!toTile) return;
        const toRect = toTile.getBoundingClientRect();
        const endX = toRect.left - gridRect.left + toRect.width / 2;
        const endY = toRect.top - gridRect.top + toRect.height / 2;
        const curveX = startX + (endX - startX) * 0.5;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.classList.add("blockscape-view__edge");
        path.dataset.from = String(item.id);
        path.dataset.to = String(depId);
        path.setAttribute("d", `M ${startX} ${startY} C ${curveX} ${startY}, ${curveX} ${endY}, ${endX} ${endY}`);
        this.svg.appendChild(path);
        this.edgeById.set(edgeKey(item.id, depId), path);
      });
    });

    this.applySelection();
  }

  select(itemId) {
    const normalizedId = String(itemId || "");
    if (!this.model.itemById.has(normalizedId)) return;
    this.selectedId = this.selectedId === normalizedId ? null : normalizedId;
    this.applySelection();
  }

  applySelection() {
    const deps = new Set();
    const revDeps = new Set();

    if (this.selectedId) {
      this.model.itemById.get(this.selectedId)?.deps.forEach((depId) => deps.add(String(depId)));
      this.model.revDeps.get(this.selectedId)?.forEach((revId) => revDeps.add(String(revId)));
    }

    this.tileById.forEach((tile, itemId) => {
      const selected = itemId === this.selectedId;
      const dep = deps.has(itemId);
      const revDep = revDeps.has(itemId);
      tile.classList.toggle("is-selected", selected);
      tile.classList.toggle("is-dep", dep);
      tile.classList.toggle("is-revdep", revDep);
      tile.classList.toggle("is-dimmed", !!this.selectedId && !selected && !dep && !revDep);
    });

    this.edgeById.forEach((path) => {
      const dep = this.selectedId && path.dataset.from === this.selectedId;
      const revDep = this.selectedId && path.dataset.to === this.selectedId;
      path.classList.toggle("is-dep", !!dep);
      path.classList.toggle("is-revdep", !!revDep);
      path.classList.toggle("is-dimmed", !!this.selectedId && !dep && !revDep);
    });
  }

  destroy() {
    window.removeEventListener("resize", this.resize);
    this.container.innerHTML = "";
    this.tileById.clear();
    this.edgeById.clear();
  }
}

export function renderBlockscape(container, map, options = {}) {
  if (!container || typeof container.appendChild !== "function") {
    throw new TypeError("renderBlockscape requires a DOM container");
  }
  if (!map || typeof map !== "object" || Array.isArray(map)) {
    throw new TypeError("renderBlockscape requires a Blockscape map object");
  }

  container[INSTANCE_KEY]?.destroy?.();
  const instance = new BlockscapeRenderer(container, structuredClone(map), options).mount();
  container[INSTANCE_KEY] = instance;
  return instance;
}
