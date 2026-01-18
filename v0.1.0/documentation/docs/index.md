# Blockscape

This is a blockscape map:

```blockscape
{
  "id": "wardley-minimap",
  "title": "Wardley-Inspired Knowledge Schema",
  "abstract": "A useful Wardley-inspired map for quick conversations is: <br><br>Y-axis = user visibility/value (top = directly user-facing, bottom = back-end/enabling), <br><br>X-axis = evolution/maturity (left = novel/custom, right = commodity/standard). <br><br>This helps teams decide where to build enabling capabilities (bottom-left).",
  "categories": [
    {
      "id": "user-facing",
      "title": "User",
      "items": [
        {
          "id": "idea",
          "name": "Idea",
          "deps": [
            "experiments-learning"
          ]
        },
        {
          "id": "differentiation",
          "name": "Proof of concept",
          "deps": [
            "experiments-learning",
            "custom-build"
          ]
        },
        {
          "id": "productized",
          "name": "Product",
          "deps": [
            "standard-components",
            "managed-service"
          ]
        },
        {
          "id": "service",
          "name": "Service",
          "deps": [
            "productized"
          ]
        }
      ]
    },
    {
      "id": "shared-foundations",
      "title": "Shared Foundations",
      "items": [
        {
          "id": "experiments-learning",
          "name": "Experiments & Learning",
          "deps": []
        },
        {
          "id": "custom-build",
          "name": "Custom Build",
          "deps": []
        },
        {
          "id": "standard-components",
          "name": "Standard Components",
          "deps": []
        }
      ]
    }
  ]
}
```

Clicking around might help. 
If not, try **Next**.
