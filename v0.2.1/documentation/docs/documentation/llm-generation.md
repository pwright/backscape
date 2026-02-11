# Generate maps with an LLM

Blockscape ships with a ready-made prompt to help large language models draft map JSON. It lives at the repo root as `map-generation-prompt.md`.

## How to use the prompt

1) Open `map-generation-prompt.md` in your editor.
2) Copy the entire prompt into your LLM (Claude, ChatGPT, etc.) and add a short description of your domain or scenario.
3) Ask the model to return JSON only. The prompt instructs the model to emit a valid Blockscape model or series.
4) Paste the JSON into Blockscape via the **Append model(s)** button or the JSON editor.

## Validate the output

- Run the JSON through the editor’s **Validate** button or `jq` before loading.
- Keep category and item IDs unique; avoid special characters in IDs.
- Trim overly long abstracts or names to keep the map readable.

## Iterate quickly

- Provide the model a small sample of your own data to nudge naming.
- Ask for multiple variants (e.g., “three options with different abstractions”).
- Save good drafts as `.bs` files so you can compare them as a series.
