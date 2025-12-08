<script>
  import { onMount } from 'svelte';
  import { initBlockscape } from './blockscape';
  import ShortcutHelp from './components/ShortcutHelp.svelte';
  import NewPanel from './components/NewPanel.svelte';

  const seedText = `
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

  let headerExpanded = false;

  const toggleHeaderExpanded = () => {
    headerExpanded = !headerExpanded;
    if (!headerExpanded) {
      const searchInput = document.getElementById('search');
      if (searchInput && searchInput.value) {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  };

  onMount(() => {
    initBlockscape();
  });
</script>

<svelte:head>
  <title>Blockscape — simple landscape-style tiles</title>
  <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
</svelte:head>

<div class="pf-v5-c-page">
  <header class="pf-v5-c-page__header">
    <div class="pf-v5-c-masthead pf-m-display-inline blockscape-masthead">
      <div class="pf-v5-c-masthead__content">
        <div class="blockscape-toolbar">
          <div class="blockscape-brand">
            <h1 class="sr-only">Blockscape</h1>
            <img class="blockscape-brand__logo" src="logos/blockscape-logo.svg"
              alt="Blockscape — landscape tile explorer" decoding="async" />
            <a href="https://github.com/pwright/blockscape" target="_blank"
              class="pf-v5-c-button pf-m-plain" title="View on GitHub" aria-label="View Blockscape on GitHub">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
          <div class="blockscape-toolbar__controls" data-expanded={headerExpanded ? 'true' : 'false'}>
            <div class="blockscape-toolbar__primary">
              <button
                class="pf-v5-c-button pf-m-plain blockscape-toolbar__toggle"
                type="button"
                aria-expanded={headerExpanded}
                aria-controls="blockscapeHeaderExtras"
                on:click={toggleHeaderExpanded}
              >
                <span class="sr-only">Toggle search and edit tools</span>
                <span class="blockscape-toolbar__toggle-icon" aria-hidden="true">▾</span>
              </button>
              <button id="newPanelButton" class="pf-v5-c-button pf-m-primary" type="button" title="Create something new">New</button>
              <form id="urlForm" class="blockscape-url-form" autocomplete="on" novalidate>
                <label class="sr-only" for="urlInput">Load JSON from URL</label>
                <input id="urlInput" name="modelUrl" class="pf-v5-c-form-control is-url" type="url"
                  placeholder="Load JSON from URL…" autocomplete="additional-name" />
                <button id="loadUrl" class="pf-v5-c-button pf-m-primary" type="submit">Load URL</button>
                <div id="urlHint" class="url-hint" aria-live="polite"></div>
              </form>
               
              <label class="pf-v5-c-button pf-m-primary blockscape-file">
                <span>Open</span>
                <input id="file" type="file" accept=".bs,.json,.txt" multiple />
              </label>

              <button id="helpButton" class="pf-v5-c-button pf-m-primary" type="button" title="Show keyboard shortcuts">Help</button>
            </div>

            <div
              id="blockscapeHeaderExtras"
              class="blockscape-toolbar__extras"
              hidden={!headerExpanded}
              aria-hidden={!headerExpanded}
            >
              <div class="blockscape-search">
                <label class="sr-only" for="search">Search tiles</label>
                <input id="search" class="pf-v5-c-form-control" type="text" placeholder="Search…" />
                <div id="searchResults" class="search-results" role="listbox" aria-label="Search across all models" hidden></div>
              </div>
              <button id="openInEditor" class="pf-v5-c-button pf-m-secondary" type="button" title="Open current JSON in the editor">Edit</button>
              <button id="shareModel" class="pf-v5-c-button pf-m-secondary" type="button" title="Copy a shareable URL for this model">Share</button>
            </div>
          </div>
          <div class="blockscape-legend" role="presentation">
            <span class="legend-entry"><span class="legend-dot legend-dot--dep"></span> enables</span>
            <span class="legend-entry"><span class="legend-dot legend-dot--revdep"></span> dependents</span>
            <span class="legend-entry"><span class="legend-dot legend-dot--reused"></span> reused</span>
            <span class="legend-entry"><span class="legend-dot legend-dot--external"></span> external link</span>
          </div>
        </div>
      </div>
    </div>
  </header>

  <main class="pf-v5-c-page__main">
    <div class="blockscape-content">
      <aside class="blockscape-sidebar" aria-label="Models">
        <div class="sidebar-heading">Models</div>
        <ul id="modelList" class="model-nav-list"></ul>
        <div class="model-actions">
          <button id="removeModel" class="pf-v5-c-button pf-m-tertiary" type="button"
            title="Remove selected model">Remove active</button>
          <button id="clear" class="pf-v5-c-button pf-m-tertiary" type="button">Clear selection</button>
        </div>
      </aside>
      <div class="blockscape-main">
        <section class="pf-v5-c-page__main-section blockscape-json-panel" hidden
          aria-label="Model source JSON editor">
          <p class="blockscape-json-panel__title">Paste / edit JSON for the <b>active</b> model (schema below)</p>
          <div class="muted">
            Schema: <code>&#123; id, title, abstract?, categories:[&#123;id,title,items:[&#123;id,name,logo?,external?:url,color?,deps:[]&#125;&#125;], links?:[&#123;from,to&#125;] &#125;</code><br />
            You can paste multiple objects separated by <code>---</code> or <code>%%%</code>, or a JSON array of models, to append several models.
            A single object replaces only when you click “Replace active with JSON”. Tip: with no input focused, press
            Cmd/Ctrl+V anywhere on the page to append clipboard JSON instantly.
          </div>
          <div class="blockscape-json-controls">
            <textarea id="jsonBox" class="pf-v5-c-form-control"
              aria-label="JSON editor for the active model"></textarea>
            <div class="blockscape-json-actions">
              <button id="copyJson" class="pf-v5-c-button pf-m-tertiary" type="button"
                title="Copy the current JSON to your clipboard">Copy</button>
              <button id="copySeries" class="pf-v5-c-button pf-m-tertiary" type="button"
                title="Copy every version in this series as an array">Copy series</button>
              <button id="pasteJson" class="pf-v5-c-button pf-m-tertiary" type="button"
                title="Paste clipboard JSON to replace the editor contents">Paste</button>
              <button id="appendFromBox" class="pf-v5-c-button pf-m-primary" type="button">Append model(s)</button>
              <button id="replaceActive" class="pf-v5-c-button pf-m-secondary" type="button">Replace active with
                JSON</button>
              <button id="createVersion" class="pf-v5-c-button pf-m-secondary" type="button" title="Create a new version from the current map">New version</button>
            </div>
          </div>
        </section>

        <section class="pf-v5-c-page__main-section blockscape-main-section">
          <div id="app" aria-live="polite"></div>
        </section>
      </div>
    </div>
  </main>
  <footer class="pf-v5-c-page__footer blockscape-footer">
    <div class="blockscape-footer__inner">
      <a href="https://pwright.github.io/backscape/" target="_blank" rel="noreferrer noopener">Old versions</a>
    </div>
  </footer>
</div>

{@html `<script id="seed" type="application/json">${seedText}</script>`}

<svg id="overlay" class="svg-layer"></svg>
<div id="tabTooltip" class="blockscape-tab-tooltip" hidden aria-hidden="true"></div>

<div id="itemPreview" class="item-preview" hidden aria-hidden="true">
  <div class="item-preview__header">
    <span class="item-preview__title">Preview</span>
    <div class="item-preview__actions" hidden></div>
    <button type="button" class="item-preview__close" aria-label="Close preview">&times;</button>
  </div>
  <div class="item-preview__body">
    <div class="item-preview__status">Right-click a tile to see related notes.</div>
  </div>
</div>

<ShortcutHelp />
<NewPanel />
