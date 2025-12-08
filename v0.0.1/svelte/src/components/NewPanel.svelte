<script>
  import plainPromptTemplate from '../../../map-generation-prompt.md?raw';

  let domain = '';
  let asSeries = false;
  let target = 'gpt';
  let status = '';
  let prompt = '';
  let showPromptPanel = false;

  const gptLink = 'https://chatgpt.com/g/g-690f6217889c819191786ef16481f534-blockscape';
  const clipboardSupported = () => typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText;

  function buildPlainPrompt(trimmedDomain) {
    const domainText = trimmedDomain || '[DOMAIN]';
    const typeText = asSeries ? 'series' : 'map';
    const fallback = `Generate a blockscape ${typeText} for the domain of ${domainText}.`;
    if (!plainPromptTemplate) return fallback;

    const template = plainPromptTemplate
      .replaceAll('[DOMAIN NAME]', domainText)
      .replaceAll('[DOMAIN]', domainText)
      .replaceAll('[map|series]', typeText);
    const lines = template.split('\n');
    const customLead = `Generate a **blockscape ${typeText}** for the domain of ${domainText}.`;
    const leadIndex = lines.findIndex(
      (line) =>
        line.toLowerCase().includes('generate a **blockscape value') ||
        line.toLowerCase().includes('generate a blockscape [map|series]') ||
        line.toLowerCase().startsWith('generate a blockscape')
    );

    if (leadIndex >= 0) {
      lines[leadIndex] = customLead;
    } else {
      lines.unshift(customLead);
    }

    const seriesNote = asSeries ? '\n\nUser requested a series (return an array of models).' : '';
    return `${lines.join('\n').trim()}${seriesNote}`;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedDomain = domain.trim();
    status = '';
    showPromptPanel = target !== 'gpt';

    if (!trimmedDomain) {
      status = 'Add a domain to generate a prompt.';
      prompt = '';
      return;
    }

    const action = asSeries ? 'Create a series' : 'Create a map';
    if (target === 'gpt') {
      prompt = `${action} for ${trimmedDomain}`;
    } else {
      prompt = buildPlainPrompt(trimmedDomain);
      showPromptPanel = true;
    }

    if (!clipboardSupported()) {
      status = 'Clipboard access is unavailable. Copy the prompt below.';
      showPromptPanel = true;
      return;
    }

    try {
      await navigator.clipboard.writeText(prompt);
      status =
        target === 'gpt'
          ? 'Prompt copied. Open the Blockscape GPT link to paste it.'
          : 'Prompt copied to clipboard.';
      if (target === 'gpt') {
        showPromptPanel = false;
      }
    } catch (err) {
      console.warn('[Blockscape] clipboard write failed', err);
      status = 'Copy failed. Use the prompt below.';
      showPromptPanel = true;
    }
  }
</script>

<div
  id="newPanel"
  class="shortcut-help"
  hidden
  aria-hidden="true"
  role="dialog"
  aria-modal="true"
  aria-labelledby="newPanelTitle"
>
  <div id="newPanelBackdrop" class="shortcut-help__backdrop"></div>
  <div class="shortcut-help__panel" tabindex="-1">
    <div class="shortcut-help__header">
      <div class="shortcut-help__title">
        <h2 id="newPanelTitle">New blockscape</h2>
        <p class="shortcut-help__subtitle">Describe what you need and we will create a prompt for you.</p>
      </div>
      <button id="newPanelClose" class="shortcut-help__close" type="button" aria-label="Close new panel">&times;</button>
    </div>
    <form class="shortcut-help__list new-panel__form" on:submit|preventDefault={handleSubmit}>
      <div class="new-panel__field">
        <label for="newDomain">Domain</label>
        <p class="new-panel__hint">Describe what you want to create a map for.</p>
        <textarea
          id="newDomain"
          class="pf-v5-c-form-control new-panel__textarea"
          rows="4"
          bind:value={domain}
          required
          placeholder="Ex: Companies building open-source geospatial tools"
        ></textarea>
      </div>

      <div class="new-panel__field">
        <label class="new-panel__toggle" for="seriesToggle">
          <input id="seriesToggle" type="checkbox" bind:checked={asSeries} />
          <span>
            Series
            <span class="new-panel__hint">Toggle on to create a series instead of a single map.</span>
          </span>
        </label>
      </div>

      <fieldset class="new-panel__field">
        <legend>Target</legend>
        <p class="new-panel__hint">Choose where you plan to use the prompt.</p>
        <label class="new-panel__option">
          <input type="radio" name="target" value="gpt" bind:group={target} />
          <div>
            <div class="new-panel__option-title">GPT or Gem</div>
            <div class="new-panel__hint">Copies a simple prompt tailored for GPT or Gem.</div>
          </div>
        </label>
        <label class="new-panel__option">
          <input type="radio" name="target" value="plain" bind:group={target} />
          <div>
            <div class="new-panel__option-title">Plain LLM</div>
            <div class="new-panel__hint">Creates a large prompt to generate blockscape from scratch.</div>
          </div>
        </label>
      </fieldset>

      <div class="new-panel__actions">
        <button class="pf-v5-c-button pf-m-primary" type="submit">Copy prompt</button>
        <div class="new-panel__status" aria-live="polite">{status}</div>
      </div>

      {#if target === 'gpt'}
        <div class="new-panel__links">
          <div class="new-panel__link">
            <a href={gptLink} target="_blank" rel="noreferrer">Open Blockscape GPT</a>
            <div class="new-panel__hint">Paste the copied prompt into that chat.</div>
          </div>
          <div class="new-panel__link new-panel__link--disabled">
            <span>Gem is not available yet</span>
            <div class="new-panel__hint">https://gemini.google.com/gems/create</div>
          </div>
        </div>
      {/if}

      {#if prompt && showPromptPanel}
        <div class="new-panel__prompt">
          <div class="new-panel__prompt-label">Generated prompt</div>
          <textarea class="pf-v5-c-form-control new-panel__textarea" rows="4" readonly bind:value={prompt}></textarea>
        </div>
      {/if}
    </form>
  </div>
</div>
