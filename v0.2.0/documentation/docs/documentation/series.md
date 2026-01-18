# Blockscape series

- **A series is strictly an array of models—nothing more, nothing less.**
- You can use series to represent a map of maps, or as version/time series.
- The **series ID** is a lowercase, hyphenated slug of the series name (spaces/punctuation become `-`). Example: `"My Planets"` → `my-planets`.
- Series metadata stays in memory only (`entry.seriesId`, `apicurioArtifactId`) and is not written into the per-version JSON payloads that get downloaded or pushed.
- Name sources:
  1. Explicit name from context (paste prompt; filename → e.g., `planets.bs` => `planets series`).
  2. Existing series fields: `seriesId`, `apicurioArtifactId`.
  3. Titles: entry `title`, `apicurioArtifactName`, `data.title`.
  4. Fallback: `unknown`.
- We still use the series ID for filenames and Apicurio artifact IDs so a series stays consistent across saves and pushes, but the exported JSON array remains the original models.

A series can track a component over time, or to break down complexity into individual maps.

## Tracking over time

Note that the Digital camera (red) remains a Capture device but it's importance decreases over time as new tech arrives on scene.
Also note that because category names are repeated, there are *italic* maps at end of series that compare those categories over the series.

```blockscape
[
  {
    "id": "photography-1995-2002",
    "title": "Photography Landscape (1995–2002)",
    "abstract": "Early digital photography emerges alongside dominant film workflows. User value is split between instant digital preview and traditional high-quality film output.",
    "categories": [
      {
        "id": "experience",
        "title": "User Experience",
        "items": [
          {
            "id": "photo-capture",
            "name": "Photo Capture",
            "deps": [
              "digital-camera",
              "film-camera"
            ]
          },
          {
            "id": "photo-printing",
            "name": "Photo Printing",
            "deps": [
              "film-processing",
              "inkjet-printers"
            ]
          }
        ]
      },
      {
        "id": "devices",
        "title": "Capture Devices",
        "items": [
          {
            "id": "digital-camera",
            "name": "Digital Camera",
            "color": "#ff0000",
            "deps": [
              "ccd-sensor",
              "flash-storage",
              "onboard-processing"
            ]
          },
          {
            "id": "film-camera",
            "name": "Film Camera",
            "deps": [
              "film-stock"
            ]
          }
        ]
      },
      {
        "id": "processing",
        "title": "Processing & Editing",
        "items": [
          {
            "id": "desktop-editing",
            "name": "Desktop Photo Editing",
            "deps": [
              "pc-software"
            ]
          },
          {
            "id": "film-processing",
            "name": "Film Development Labs",
            "deps": []
          }
        ]
      },
      {
        "id": "infrastructure",
        "title": "Core Infrastructure",
        "items": [
          {
            "id": "ccd-sensor",
            "name": "CCD Sensor",
            "deps": []
          },
          {
            "id": "flash-storage",
            "name": "Flash Storage (CF/SD)",
            "deps": []
          },
          {
            "id": "onboard-processing",
            "name": "Onboard Image Processing",
            "deps": []
          },
          {
            "id": "film-stock",
            "name": "Photographic Film Stock",
            "deps": []
          },
          {
            "id": "pc-software",
            "name": "PC Editing Software",
            "deps": []
          },
          {
            "id": "inkjet-printers",
            "name": "Inkjet Printers",
            "deps": []
          }
        ]
      }
    ]
  },
  {
    "id": "photography-2003-2010",
    "title": "Photography Landscape (2003–2010)",
    "abstract": "Digital photography becomes mainstream, while film and printing persist as secondary but valued workflows. Online sharing begins to emerge.",
    "categories": [
      {
        "id": "experience",
        "title": "User Experience",
        "items": [
          {
            "id": "photo-capture",
            "name": "Photo Capture",
            "deps": [
              "digital-camera",
              "dslr",
              "film-camera"
            ]
          },
          {
            "id": "photo-printing",
            "name": "Photo Printing",
            "deps": [
              "inkjet-printers",
              "film-processing"
            ]
          },
          {
            "id": "online-sharing",
            "name": "Online Photo Sharing",
            "deps": [
              "home-internet",
              "web-platforms"
            ]
          }
        ]
      },
      {
        "id": "devices",
        "title": "Capture Devices",
        "items": [
          {
            "id": "film-camera",
            "name": "Film Camera",
            "deps": [
              "film-stock"
            ]
          },
          {
            "id": "dslr",
            "name": "DSLR Camera",
            "deps": [
              "cmos-sensor",
              "interchangeable-lenses"
            ]
          },
          {
            "id": "digital-camera",
            "name": "Digital Camera",
            "color": "#ff0000",
            "deps": [
              "cmos-sensor",
              "sd-storage",
              "onboard-processing"
            ]
          }
        ]
      },
      {
        "id": "processing",
        "title": "Processing & Editing",
        "items": [
          {
            "id": "consumer-editing",
            "name": "Consumer Photo Editing",
            "deps": [
              "pc-software"
            ]
          },
          {
            "id": "raw-workflows",
            "name": "RAW Workflows",
            "deps": [
              "cmos-sensor"
            ]
          },
          {
            "id": "film-processing",
            "name": "Film Development Labs",
            "deps": []
          }
        ]
      },
      {
        "id": "infrastructure",
        "title": "Core Infrastructure",
        "items": [
          {
            "id": "cmos-sensor",
            "name": "CMOS Sensor",
            "deps": []
          },
          {
            "id": "sd-storage",
            "name": "SD Card Storage",
            "deps": []
          },
          {
            "id": "onboard-processing",
            "name": "Onboard Image Processing",
            "deps": []
          },
          {
            "id": "interchangeable-lenses",
            "name": "Interchangeable Lenses",
            "deps": []
          },
          {
            "id": "pc-software",
            "name": "PC Editing Software",
            "deps": []
          },
          {
            "id": "home-internet",
            "name": "Home Internet Access",
            "deps": []
          },
          {
            "id": "web-platforms",
            "name": "Web Photo Platforms",
            "deps": []
          },
          {
            "id": "film-stock",
            "name": "Photographic Film Stock",
            "deps": []
          },
          {
            "id": "inkjet-printers",
            "name": "Inkjet Printers",
            "deps": []
          }
        ]
      }
    ]
  },
  {
    "id": "photography-2011-2017",
    "title": "Photography Landscape (2011–2017)",
    "abstract": "Smartphones dominate casual photography, while DSLRs and digital cameras persist for enthusiasts and professionals. Cloud and social platforms drive user value.",
    "categories": [
      {
        "id": "experience",
        "title": "User Experience",
        "items": [
          {
            "id": "instant-sharing",
            "name": "Instant Sharing",
            "deps": [
              "mobile-apps",
              "cloud-storage"
            ]
          },
          {
            "id": "pro-capture",
            "name": "Professional Capture",
            "deps": [
              "digital-camera",
              "dslr"
            ]
          },
          {
            "id": "photo-printing",
            "name": "Photo Printing",
            "deps": [
              "inkjet-printers"
            ]
          }
        ]
      },
      {
        "id": "devices",
        "title": "Capture Devices",
        "items": [
          {
            "id": "smartphone-camera",
            "name": "Smartphone Camera",
            "deps": [
              "mobile-sensor",
              "mobile-soc"
            ]
          },
          {
            "id": "digital-camera",
            "name": "Digital Camera",
            "color": "#ff0000",
            "deps": [
              "advanced-cmos",
              "high-speed-storage",
              "onboard-processing"
            ]
          },
          {
            "id": "dslr",
            "name": "DSLR Camera",
            "deps": [
              "advanced-cmos",
              "interchangeable-lenses"
            ]
          }
        ]
      },
      {
        "id": "processing",
        "title": "Processing & Editing",
        "items": [
          {
            "id": "mobile-editing",
            "name": "Mobile Photo Editing",
            "deps": [
              "mobile-apps"
            ]
          },
          {
            "id": "desktop-editing",
            "name": "Desktop Photo Editing",
            "deps": [
              "pc-software"
            ]
          },
          {
            "id": "cloud-backup",
            "name": "Cloud Backup",
            "deps": [
              "cloud-storage"
            ]
          }
        ]
      },
      {
        "id": "infrastructure",
        "title": "Core Infrastructure",
        "items": [
          {
            "id": "advanced-cmos",
            "name": "Advanced CMOS Sensors",
            "deps": []
          },
          {
            "id": "high-speed-storage",
            "name": "High-Speed Flash Storage",
            "deps": []
          },
          {
            "id": "onboard-processing",
            "name": "Onboard Image Processing",
            "deps": []
          },
          {
            "id": "interchangeable-lenses",
            "name": "Interchangeable Lenses",
            "deps": []
          },
          {
            "id": "mobile-sensor",
            "name": "Mobile Image Sensors",
            "deps": []
          },
          {
            "id": "mobile-soc",
            "name": "Mobile SoC",
            "deps": []
          },
          {
            "id": "mobile-apps",
            "name": "Mobile Apps",
            "deps": []
          },
          {
            "id": "cloud-storage",
            "name": "Cloud Storage",
            "deps": []
          },
          {
            "id": "pc-software",
            "name": "PC Editing Software",
            "deps": []
          },
          {
            "id": "inkjet-printers",
            "name": "Inkjet Printers",
            "deps": []
          }
        ]
      }
    ]
  },
  {
    "id": "photography-2018-2025",
    "title": "Photography Landscape (2018–2025)",
    "abstract": "Computational photography and AI dominate consumer value, while digital cameras and DSLRs remain important for high-end, professional, and print-focused workflows.",
    "categories": [
      {
        "id": "experience",
        "title": "User Experience",
        "items": [
          {
            "id": "ai-enhanced-photos",
            "name": "AI-Enhanced Photography",
            "deps": [
              "computational-photography",
              "cloud-ai"
            ]
          },
          {
            "id": "hybrid-photo-video",
            "name": "Hybrid Photo & Video Creation",
            "deps": [
              "digital-camera"
            ]
          },
          {
            "id": "fine-art-printing",
            "name": "Fine Art & Pro Printing",
            "deps": [
              "dslr",
              "inkjet-printers"
            ]
          }
        ]
      },
      {
        "id": "devices",
        "title": "Capture Devices",
        "items": [
          {
            "id": "digital-camera",
            "name": "Digital Camera",
            "color": "#ff0000",
            "deps": [
              "stacked-sensor",
              "high-bandwidth-storage",
              "onboard-processing"
            ]
          },
          {
            "id": "dslr",
            "name": "DSLR Camera",
            "deps": [
              "advanced-cmos",
              "interchangeable-lenses"
            ]
          },
          {
            "id": "multi-camera-smartphone",
            "name": "Multi-Camera Smartphone",
            "deps": [
              "mobile-sensor-array",
              "ai-accelerator"
            ]
          }
        ]
      },
      {
        "id": "processing",
        "title": "Processing & Intelligence",
        "items": [
          {
            "id": "computational-photography",
            "name": "Computational Photography",
            "deps": [
              "ai-accelerator",
              "onboard-processing"
            ]
          },
          {
            "id": "cloud-editing",
            "name": "Cloud-Based Editing",
            "deps": [
              "cloud-ai"
            ]
          },
          {
            "id": "desktop-editing",
            "name": "Desktop Photo Editing",
            "deps": [
              "pc-software"
            ]
          }
        ]
      },
      {
        "id": "infrastructure",
        "title": "Core Infrastructure",
        "items": [
          {
            "id": "stacked-sensor",
            "name": "Stacked Image Sensors",
            "deps": []
          },
          {
            "id": "high-bandwidth-storage",
            "name": "High-Bandwidth Storage",
            "deps": []
          },
          {
            "id": "onboard-processing",
            "name": "Onboard Image Processing",
            "deps": []
          },
          {
            "id": "advanced-cmos",
            "name": "Advanced CMOS Sensors",
            "deps": []
          },
          {
            "id": "interchangeable-lenses",
            "name": "Interchangeable Lenses",
            "deps": []
          },
          {
            "id": "mobile-sensor-array",
            "name": "Mobile Sensor Arrays",
            "deps": []
          },
          {
            "id": "ai-accelerator",
            "name": "AI Accelerators",
            "deps": []
          },
          {
            "id": "cloud-ai",
            "name": "Cloud AI Platforms",
            "deps": []
          },
          {
            "id": "pc-software",
            "name": "PC Editing Software",
            "deps": []
          },
          {
            "id": "inkjet-printers",
            "name": "Inkjet Printers",
            "deps": []
          }
        ]
      }
    ]
  }
]
```