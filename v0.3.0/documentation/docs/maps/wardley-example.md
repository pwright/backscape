# Wardley example

This is a wardley map, the only difference being that an item can be associated with a development stage, 1=genesis, 2=custom, 3=product, 4=service. See example map at [https://onlinewardleymaps.com/](https://onlinewardleymaps.com/).

```blockscape
{
  "id": "tea-shop",
  "title": "Tea Shop",
  "abstract": "A simple tea shop value chain: the business and public value a cup of tea, which depends on a cup, tea leaves, and hot water. Hot water depends on water and a kettle, and the kettle depends on power. The kettle is a limiting factor for hot water production.",
  "categories": [
    {
      "id": "experience",
      "title": "Experience",
      "items": [
        {
          "id": "cup-of-tea",
          "name": "Cup of Tea",
          "deps": [
            "cup",
            "tea",
            "hot-water"
          ]
        }
      ]
    },
    {
      "id": "inputs",
      "title": "Inputs & Enablers",
      "items": [
        {
          "id": "cup",
          "name": "Cup",
          "deps": [],
          "stage": 2
        },
        {
          "id": "tea",
          "name": "Tea",
          "deps": [],
          "stage": 3
        },
        {
          "id": "hot-water",
          "name": "Hot Water",
          "deps": [
            "water",
            "kettle"
          ],
          "stage": 3
        }
      ]
    },
    {
      "id": "in-house-hardware",
      "title": "In house hardware",
      "items": [
        {
          "id": "kettle",
          "name": "Kettle",
          "deps": [
            "power"
          ],
          "stage": 2
        }
      ]
    },
    {
      "id": "infrastructure-supplied",
      "title": "Infrastructure supplied",
      "items": [
        {
          "id": "water",
          "name": "Water",
          "deps": [],
          "stage": 4
        },
        {
          "id": "power",
          "name": "Power",
          "deps": [],
          "stage": 4
        }
      ]
    }
  ]
}
```
