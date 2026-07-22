# quartz-blockscape dist quick reference

This directory contains the built Quartz v5 plugin output. It is intended to be shippable when `quartz-blockscape` is extracted to a standalone plugin repository.

## Configure Full Mode

In a Quartz config:

```ts
import { Blockscape } from "quartz-blockscape"

export default {
  plugins: {
    transformers: [
      Blockscape({ defaultRenderer: "full" }),
    ],
  },
}
```

Use `Blockscape()` without options to keep `lite` as the default renderer.

## Per-Embed Full Mode

Inline fenced map:

````markdown
```blockscape full
{
  "id": "example",
  "title": "Example",
  "categories": [
    {
      "id": "platform",
      "title": "Platform",
      "items": [{ "id": "renderer", "name": "Renderer" }]
    }
  ]
}
```
````

Source-backed map:

```html
<div class="blockscape-root" data-src="./maps/example.bs" data-blockscape-renderer="full"></div>
```

## Series Shape

Full mode renders series when the inline JSON or fetched `.bs` file is a non-empty JSON array of Blockscape map objects:

```json
[
  {
    "id": "example-v1",
    "title": "Example v1",
    "categories": [
      {
        "id": "platform",
        "title": "Platform",
        "items": [{ "id": "renderer", "name": "Renderer" }]
      }
    ]
  },
  {
    "id": "example-v2",
    "title": "Example v2",
    "categories": [
      {
        "id": "platform",
        "title": "Platform",
        "items": [{ "id": "renderer", "name": "Renderer" }]
      }
    ]
  }
]
```

Full mode is read-only in Quartz: it hides the top menu, side menu, footer, local backend, file open/save, and editing affordances.
