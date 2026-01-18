# Blockscape models


A Model is the json data used to create a map.

## JSON Schema

Blockscape uses a simple JSON schema to define landscape models:

```json
{
  "id": "model-id",
  "title": "Model Title",
  "abstract": "Optional HTML/markdown string shown above the grid",
  "categories": [
    {
      "id": "category-id",
      "title": "Category Title",
      "items": [
        {
          "id": "item-id",
          "name": "Item Name",
          "deps": ["dependency-id-1", "dependency-id-2"],
          "logo": "path/to/logo.svg",
          "external": "https://example.com/docs/component"
        }
      ]
    }
  ]
}
```

### Schema Fields

- **id**: Required. Canonical identifier for the model (lowercase, hyphen/underscore ok)
- **title**: Required. Human-friendly title shown in pickers and share links
- **abstract**: Optional but recommended. Short HTML/textual description rendered ahead of the categories
- **categories**: Array of category objects
  - **id**: Short, unique identifier (lowercase, hyphenated)
  - **title**: Human-friendly category name
  - **items**: Array of component objects
    - **id**: Short, unique identifier across all categories
    - **name**: Human-friendly component name
    - **deps**: Array of item IDs this component depends on
    - **logo**: Optional path to logo image
    - **external**: Optional URL for an external reference (docs, gists, etc.). When present the tile gains a dashed border and a launch icon that opens the link in a new tab.
- **links**: Optional array of additional dependency links

