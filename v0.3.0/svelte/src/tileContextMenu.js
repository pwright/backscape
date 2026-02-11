import { tokens } from "./generated/tokens";
import { openExternalUrl } from "./externalLinks";

export function createTileContextMenu({
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
  colorPresets = [],
} = {}) {
  const menu =
    menuEl ||
    (() => {
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
    if (!tile) return null;
    const id = tile.dataset.id;
    const displayName =
      tile.querySelector(".name")?.textContent || id || "Preview";
    const filename = id ? `${id}.html` : "";
    const filepath = filename ? `items/${filename}` : "";
    return {
      id,
      displayName,
      filename,
      filepath,
      externalUrl: tile.dataset.externalUrl || "",
      obsidianUrl: tile.dataset.obsidianUrl || "",
      anchorX: event?.clientX ?? 0,
      anchorY: event?.clientY ?? 0,
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
        if (!preset?.value) return;
        const label = preset.name || preset.value;
        list.appendChild(
          makeMenuButton(`Set color: ${label}`, () =>
            onChangeColor(meta.id, preset.value)
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
        },
      });
    }
    if (meta.externalUrl) {
      actions.push({
        label: "Open link ↗",
        title: meta.externalUrl,
        onClick: () => openExternalUrl(meta.externalUrl),
      });
    }
    if (meta.obsidianUrl) {
      actions.push({
        label: "Open in Obsidian",
        title: meta.obsidianUrl,
        onClick: () => openExternalUrl(meta.obsidianUrl),
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
      previewBodyEl.innerHTML =
        '<div class="item-preview__status">Preview unavailable for this item.</div>';
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
        const safeName = escapeHtml
          ? escapeHtml(meta.filename)
          : meta.filename;
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
      const safeName = escapeHtml
        ? escapeHtml(meta.displayName)
        : meta.displayName;
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
    const target = event?.target;
    const clickedInsideMenu = menu && !menu.hidden && menu.contains(target);
    const clickedInsidePreview =
      previewEl && !previewEl.hidden && previewEl.contains(target);
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
    },
  };
}
