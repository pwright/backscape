# Blockscape example

```blockscape
{
  "id": "minimap",
  "title": "Wardley-Inspired Minimal Value-Chain Map",
  "abstract": "Users want to quickly understand a system’s value chain (from user needs down to enabling components) and how maturity/evolution affects decisions. This minimal Wardley-inspired model adds one explicit maturity signal per layer to show how value becomes more standardized and predictable as it moves down the stack.",
  "categories": [
    {
      "id": "outcomes",
      "title": "User Outcomes",
      "items": [
        {
          "id": "situational-awareness",
          "name": "Situational Awareness",
          "deps": ["map-view"]
        },
        {
          "id": "decision-support",
          "name": "Decision Support",
          "deps": ["map-view"]
        },
        {
          "id": "accepted-practice",
          "name": "Accepted Practice",
          "deps": ["decision-support"]
        }
      ]
    },
    {
      "id": "mapping",
      "title": "Mapping Core",
      "items": [
        {
          "id": "map-view",
          "name": "Wardley-Style Map View",
          "deps": ["component-model", "rendering-engine"]
        },
        {
          "id": "component-model",
          "name": "Component & Dependency Model",
          "deps": ["storage"]
        },
        {
          "id": "repeatable-workflow",
          "name": "Repeatable Mapping Workflow",
          "deps": ["component-model"]
        }
      ]
    },
    {
      "id": "platform",
      "title": "Platform Enablers",
      "items": [
        {
          "id": "rendering-engine",
          "name": "Rendering Engine",
          "deps": []
        },
        {
          "id": "storage",
          "name": "Persistence & Sharing",
          "deps": []
        },
        {
          "id": "commodity-infrastructure",
          "name": "Commodity Infrastructure",
          "deps": ["storage", "rendering-engine"]
        }
      ]
    }
  ]
}

```
