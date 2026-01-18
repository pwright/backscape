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
