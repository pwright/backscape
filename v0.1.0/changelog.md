# Changelog

- Added support for loading JSON arrays as a single series entry with version navigation (files, URLs, share payloads, seed, paste). %%% separator deprecated.
- Tiles now link across maps in the same series when an item ID matches another map’s ID; linked titles are styled red for visibility.
- Ctrl/Cmd+S downloads a series as a JSON array (with a `-series` filename suffix) when the active model has multiple versions.
- Series view adds a thumbnail strip for quick navigation alongside the prev/next controls, using lightweight cached sketches of each map.
- When moving between versions in a series, the last selected tab stays active (map/info/source/apicurio) for continuity.
- Version switching now preserves edited JSON in the source pane: if the editor content differs, it is saved back to the current version (and invalid JSON blocks switching).
- Moved the “New version” button into the Source tab alongside the JSON actions.
- Added a “Push series” control in the Apicurio tab to push all versions as a JSON array when a series is active.
