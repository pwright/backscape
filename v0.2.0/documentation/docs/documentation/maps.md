# Blockscape maps

A map is the visual representation of a model, ie analogous to a paper map of a City. 

```blockscape
{
  "id": "blockscape-map-to-decision",
  "title": "From Seeing to Deciding",
  "abstract": "A map is a shared picture that turns uncertainty into something visible. By showing what people notice, what supports it underneath, and how clear or unclear things are, a map creates common ground. Once everyone sees the same terrain, options can be explored, assumptions challenged, and decisions made with context instead of opinion.",
  "categories": [
    {
      "id": "what-people-see",
      "title": "What People See",
      "items": [
        {
          "id": "rough-ideas",
          "name": "Rough Ideas",
          "deps": [
            "exploring"
          ]
        },
        {
          "id": "familiar-things",
          "name": "Familiar Things",
          "deps": [
            "established-ways"
          ]
        },
        {
          "id": "choice",
          "name": "Choice",
          "deps": [
            "options"
          ]
        }
      ]
    },
    {
      "id": "clarity-and-change",
      "title": "Clarity Over Time",
      "items": [
        {
          "id": "unclear",
          "name": "Unclear",
          "deps": [
            "exploring"
          ]
        },
        {
          "id": "taking-shape",
          "name": "Taking Shape",
          "deps": [
            "sense-making"
          ]
        },
        {
          "id": "clear",
          "name": "Clear",
          "deps": [
            "established-ways"
          ]
        },
        {
          "id": "options",
          "name": "Options",
          "deps": [
            "sense-making"
          ]
        }
      ]
    },
    {
      "id": "support-and-decision",
      "title": "Support & Decision",
      "items": [
        {
          "id": "exploring",
          "name": "Exploring",
          "deps": []
        },
        {
          "id": "sense-making",
          "name": "Making Sense",
          "deps": []
        },
        {
          "id": "established-ways",
          "name": "Established Ways",
          "deps": []
        }
      ]
    }
  ]
}
```
The map only appears when visualized using blockscape.
The maps is created from a model (JSON) using the following rules:

- categories are listed from first to last, meaning a top category provides more visible value than a lower category.
- items are listed from left to right, meaning first (left most) item (component) is more mature than later (right) items.


Why JSON and not mermaid/plantuml/d2 etc?

Because JSON is ubiquitous, easy to generate, easy to understand/modify.

Consider the following history note.

## Ptolemy's maps

[Ptolemy's world map - Wikipedia](https://en.wikipedia.org/wiki/Ptolemy%27s_world_map) was primarily theoretical and presented as a list of coordinates and instructions in his text Geographia (c. 150 CE). There is no evidence that Ptolemy himself drew the maps that accompany his work today. 
Here is a breakdown of why this distinction is important:
Textual Work: Geographia was a treatise on how to collect, organize, and project geographical information using latitude and longitude. Most of the work is composed of extensive lists of place names with their coordinates, effectively a "virtual map".
Missing Originals: No ancient manuscript of Ptolemy's Geographia has survived with original maps drawn during his lifetime.
Later Visual Representations: The visual "Ptolemy maps" we see today are reconstructions created centuries later, primarily starting with Byzantine scribes around the turn of the 13th to 14th century, who followed his meticulous instructions for map construction. These later copies were often drawn by non-specialist scribes and varied in accuracy due to repeated copying. 
Therefore, while Ptolemy provided the blueprint for visual maps, the actual visual artifacts were produced much later based on his written instructions.