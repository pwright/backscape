# TOC


```blockscape
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
          "external": "../apicurio/", 
          "deps": []
        }
      ]
    }
  ]
}
```