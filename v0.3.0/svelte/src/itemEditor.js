import { tokens } from "./generated/tokens";

function assertFn(fn, name) {
  if (typeof fn !== 'function') {
    throw new Error(`[itemEditor] expected ${name} to be a function`);
  }
}

function defaultMakeSlug(base) {
  return (
    (base || 'item')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'item'
  );
}

const STAGE_MIN = 1;
const STAGE_MAX = 4;

function normalizeStageValue(stage) {
  if (stage == null) return null;
  const num = Number(stage);
  if (!Number.isFinite(num)) return null;
  const rounded = Math.round(num);
  if (rounded < STAGE_MIN || rounded > STAGE_MAX) return null;
  return rounded;
}

export function collectAllItemIds(modelData) {
  const ids = new Set();
  (modelData?.categories || []).forEach(cat => (cat.items || []).forEach(it => {
    if (it?.id) ids.add(it.id);
  }));
  return ids;
}

export function normalizeDepsInput(value, { excludeId } = {}) {
  if (!value) return [];
  const parts = value.split(/[\s,]+/).map(v => v.trim()).filter(Boolean);
  const unique = [];
  parts.forEach(dep => {
    if (excludeId && dep === excludeId) return;
    if (!unique.includes(dep)) unique.push(dep);
  });
  return unique;
}

export function updateItemReferences(modelData, oldId, newId) {
  if (!oldId || !newId || oldId === newId) return;
  const categories = modelData?.categories || [];
  categories.forEach(cat => {
    (cat.items || []).forEach(it => {
      if (Array.isArray(it.deps)) {
        it.deps = it.deps.map(dep => dep === oldId ? newId : dep);
      }
    });
  });
}

export function createItemEditor({
  findItemAndCategoryById,
  collectAllItemIds,
  updateItemReferences,
  loadActiveIntoEditor,
  rebuildFromActive,
  select,
  onSelectionRenamed,
  makeSlug = defaultMakeSlug,
  isAutoIdFromNameEnabled = () => true
} = {}) {
  assertFn(findItemAndCategoryById, 'findItemAndCategoryById');
  assertFn(collectAllItemIds, 'collectAllItemIds');
  assertFn(updateItemReferences, 'updateItemReferences');
  assertFn(loadActiveIntoEditor, 'loadActiveIntoEditor');
  assertFn(rebuildFromActive, 'rebuildFromActive');
  assertFn(select, 'select');
  assertFn(makeSlug, 'makeSlug');
  assertFn(isAutoIdFromNameEnabled, 'isAutoIdFromNameEnabled');

  /** @type {{wrapper:HTMLElement|null, fields:any, categoryId?:string, itemId?:string, modelData?:any}} */
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
      state.fields.errorEl.textContent = '';
      return;
    }
    state.fields.errorEl.hidden = false;
    state.fields.errorEl.textContent = message;
  }

  function hide() {
    if (!state.wrapper) return;
    state.wrapper.hidden = true;
    state.wrapper.setAttribute('aria-hidden', 'true');
    setError('');
    state.categoryId = null;
    state.itemId = null;
    state.modelData = null;
    document.body.classList.remove('item-editor-open');
  }

  function show() {
    if (!state.wrapper) return;
    state.wrapper.hidden = false;
    state.wrapper.setAttribute('aria-hidden', 'false');
    document.body.classList.add('item-editor-open');
    requestAnimationFrame(() => {
      state.fields.nameInput?.focus();
      state.fields.nameInput?.select();
    });
  }

  function syncIdFromName({ force } = {}) {
    if (!state.fields?.idInput || !state.fields?.nameInput) return;
    if (!state.autoSyncEnabled || !isAutoIdFromNameEnabled()) return;
    if (!force && state.autoIdManuallyEdited) return;
    const slug = makeSlug(state.fields.nameInput.value || state.itemId || 'item');
    state.fields.idInput.value = slug;
  }

  function applyItemEdits(payload) {
    if (!state.modelData || !state.categoryId || !state.itemId) {
      throw new Error('No item loaded.');
    }
    const categories = state.modelData?.categories || [];
    const category = categories.find(cat => cat.id === state.categoryId);
    if (!category) throw new Error('Category not found.');
    category.items = category.items || [];
    const item = category.items.find(it => it.id === state.itemId);
    if (!item) throw new Error('Item not found.');

    const normalizedId = (payload.id || '').trim();
    if (!normalizedId) throw new Error('ID is required.');
    const allIds = collectAllItemIds(state.modelData);
    if (normalizedId !== item.id && allIds.has(normalizedId)) {
      throw new Error('Another item already uses that ID.');
    }

    item.id = normalizedId;
    const trimmedName = (payload.name || '').trim();
    item.name = trimmedName || item.id;

    const logo = (payload.logo || '').trim();
    if (logo) item.logo = logo; else delete item.logo;

    if (payload.externalFlag && !payload.external) {
      item.external = true;
    } else {
      const external = (payload.external ?? '').toString().trim();
      if (external) item.external = external; else delete item.external;
    }

    const color = (payload.color || '').trim();
    if (color) item.color = color; else delete item.color;

    const stage = normalizeStageValue(payload.stage);
    if (stage != null) item.stage = stage; else delete item.stage;

    item.deps = Array.isArray(payload.deps) ? payload.deps : [];

    if (item.id !== payload.originalId && typeof onSelectionRenamed === 'function') {
      onSelectionRenamed(payload.originalId, item.id);
    }
    updateItemReferences(state.modelData, payload.originalId, item.id);
    loadActiveIntoEditor();
    rebuildFromActive();
    select(item.id);
    return item.id;
  }

  function saveItemEdits() {
    if (!state.fields || !state.fields.idInput) return false;
    const idVal = (state.fields.idInput.value || '').trim();
    const payload = {
      originalId: state.itemId,
      id: idVal,
      name: state.fields.nameInput.value || '',
      logo: state.fields.logoInput.value || '',
      external: state.fields.externalInput.value || '',
      externalFlag: state.fields.externalFlagInput.checked,
      color: state.fields.colorInput.value || '',
      stage: state.fields.stageInput.value,
      deps: normalizeDepsInput(state.fields.depsInput.value, { excludeId: idVal })
    };
    try {
      applyItemEdits(payload);
      hide();
      return true;
    } catch (error) {
      console.warn('[itemEditor] item edit failed', error);
      setError(error?.message || 'Unable to save item.');
      return false;
    }
  }

  function ensureItemEditorModal() {
    if (state.wrapper) return state.wrapper;

    const wrapper = document.createElement('div');
    wrapper.className = 'item-editor-modal';
    wrapper.hidden = true;
    wrapper.setAttribute('role', 'dialog');
    wrapper.setAttribute('aria-modal', 'true');

    const backdrop = document.createElement('div');
    backdrop.className = 'item-editor-modal__backdrop';
    wrapper.appendChild(backdrop);

    const dialog = document.createElement('div');
    dialog.className = 'item-editor';
    wrapper.appendChild(dialog);

    const header = document.createElement('div');
    header.className = 'item-editor__header';
    const title = document.createElement('h2');
    title.className = 'item-editor__title';
    title.textContent = 'Edit item';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'item-editor__close';
    closeBtn.setAttribute('aria-label', 'Close item editor');
    closeBtn.textContent = '×';
    header.appendChild(title);
    header.appendChild(closeBtn);
    dialog.appendChild(header);

    const form = document.createElement('form');
    form.className = 'item-editor__form';
    dialog.appendChild(form);

    const meta = document.createElement('div');
    meta.className = 'item-editor__meta';
    meta.innerHTML = '<div class="item-editor__meta-label">Category</div><div class="item-editor__meta-value"></div>';
    form.appendChild(meta);

    const errorEl = document.createElement('div');
    errorEl.className = 'item-editor__error';
    errorEl.hidden = true;
    form.appendChild(errorEl);

    const makeField = (labelText, inputEl, hintText) => {
      const field = document.createElement('label');
      field.className = 'item-editor__field';
      const label = document.createElement('span');
      label.className = 'item-editor__label';
      label.textContent = labelText;
      field.appendChild(label);
      inputEl.classList.add('item-editor__control');
      field.appendChild(inputEl);
      if (hintText) {
        const hint = document.createElement('div');
        hint.className = 'item-editor__hint';
        hint.textContent = hintText;
        field.appendChild(hint);
      }
      return field;
    };

    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.required = true;
    form.appendChild(makeField('ID', idInput, 'Unique identifier used for dependencies.'));

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    form.appendChild(makeField('Name', nameInput, 'Visible label shown on the tile.'));

    const logoInput = document.createElement('input');
    logoInput.type = 'url';
    logoInput.inputMode = 'url';
    logoInput.placeholder = 'https://…';
    form.appendChild(makeField('Logo URL', logoInput, 'Optional image URL.'));

    const externalInput = document.createElement('input');
    externalInput.type = 'url';
    externalInput.inputMode = 'url';
    externalInput.placeholder = 'https://…';
    form.appendChild(makeField('External link', externalInput, 'Shown with ↗ icon and in preview.'));

    const externalToggle = document.createElement('div');
    externalToggle.className = 'item-editor__checkbox';
    const externalToggleRow = document.createElement('label');
    externalToggleRow.className = 'item-editor__checkbox-row';
    const externalFlagInput = document.createElement('input');
    externalFlagInput.type = 'checkbox';
    const externalFlagLabel = document.createElement('span');
    externalFlagLabel.textContent = 'Mark as external without link';
    const externalFlagHint = document.createElement('div');
    externalFlagHint.className = 'item-editor__hint';
    externalFlagHint.textContent = 'Keeps dashed border even without a URL.';
    externalToggleRow.appendChild(externalFlagInput);
    externalToggleRow.appendChild(externalFlagLabel);
    externalToggle.appendChild(externalToggleRow);
    externalToggle.appendChild(externalFlagHint);
    form.appendChild(externalToggle);

    const colorInput = document.createElement('input');
    colorInput.type = 'text';
    colorInput.placeholder = tokens.color.primary;
    form.appendChild(makeField('Color', colorInput, 'Optional badge color (hex or CSS color).'));

    const stageInput = document.createElement('input');
    stageInput.type = 'number';
    stageInput.min = String(STAGE_MIN);
    stageInput.max = String(STAGE_MAX);
    stageInput.inputMode = 'numeric';
    stageInput.placeholder = `${STAGE_MIN}-${STAGE_MAX}`;
    form.appendChild(makeField('Stage', stageInput, 'Optional 1 (far left) to 4 (far right) when Center view is on.'));

    const depsInput = document.createElement('textarea');
    depsInput.rows = 2;
    depsInput.placeholder = 'Comma or space separated ids';
    form.appendChild(makeField('Dependencies', depsInput, 'Use item IDs, separated by commas or spaces.'));

    const syncToggle = document.createElement('div');
    syncToggle.className = 'item-editor__checkbox';
    const syncRow = document.createElement('label');
    syncRow.className = 'item-editor__checkbox-row';
    const syncCheckbox = document.createElement('input');
    syncCheckbox.type = 'checkbox';
    const syncLabel = document.createElement('span');
    syncLabel.textContent = 'Sync ID while editing name';
    const syncHint = document.createElement('div');
    syncHint.className = 'item-editor__hint';
    syncHint.textContent = 'Turn off to keep typing names without changing the ID.';
    syncRow.appendChild(syncCheckbox);
    syncRow.appendChild(syncLabel);
    syncToggle.appendChild(syncRow);
    syncToggle.appendChild(syncHint);
    form.appendChild(syncToggle);

    const actions = document.createElement('div');
    actions.className = 'item-editor__actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'pf-v5-c-button pf-m-tertiary';
    cancelBtn.textContent = 'Cancel';
    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'pf-v5-c-button pf-m-primary';
    saveBtn.textContent = 'Save';
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
      stageInput,
      depsInput,
      syncCheckbox,
      categoryValue: meta.querySelector('.item-editor__meta-value'),
      errorEl
    };

    cancelBtn.addEventListener('click', hide);
    closeBtn.addEventListener('click', hide);
    backdrop.addEventListener('click', hide);
    idInput.addEventListener('input', () => {
      state.autoIdManuallyEdited = true;
    });
    nameInput.addEventListener('input', syncIdFromName);
      syncCheckbox.addEventListener('change', () => {
        state.autoSyncEnabled = !!syncCheckbox.checked;
        if (state.autoSyncEnabled) {
          state.autoIdManuallyEdited = false;
          syncIdFromName({ force: true });
        }
      });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      saveItemEdits();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !wrapper.hidden) {
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
    state.fields.idInput.value = hit.item.id || '';
    state.fields.nameInput.value = hit.item.name || '';
    state.fields.logoInput.value = hit.item.logo || '';
    state.fields.externalInput.value = typeof hit.item.external === 'string' ? hit.item.external : '';
    state.fields.externalFlagInput.checked = hit.item.external === true;
    state.fields.colorInput.value = hit.item.color || '';
    state.fields.stageInput.value = hit.item.stage ?? '';
    state.fields.depsInput.value = Array.isArray(hit.item.deps) ? hit.item.deps.join(', ') : '';
    state.fields.syncCheckbox.checked = state.autoSyncEnabled;
    state.fields.syncCheckbox.disabled = !autoSyncAllowed;
    if (!state.fields.idInput.value && autoSyncAllowed) {
      syncIdFromName({ force: true });
    }
    setError('');
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
