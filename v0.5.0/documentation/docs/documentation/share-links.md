# Share Blockscape maps via encoded links

You can bundle a `.bs` file into a shareable URL token and decode it later with two helper scripts in the repo root.


## Quick share

You're looking at a map, you might even have edited it, eg Shift left arrow to move an item left.

Click **Share** in top menu to create, copy, and navigate to a URL that encodes current map.
Bookmark it or send that url to anyone to share.


## Decode a token back to JSON

```sh
python decode-bs-share.py 'PASTE_TOKEN_HERE'
```

The script writes the decoded JSON to stdout so you can save it to a `.bs` file or pipe it into other tools.

## Encode a `.bs` file into a URL

```sh
python encode-bs-share.py path/to/model.bs
```

The script prints a full URL containing a Base64 token. Open it in a browser to load the map without uploading a file. You can also copy just the token if you need to embed it elsewhere.

## Highlight an item when loading from a URL

If you are loading a map with the `?load=` pattern, append `&item=<item-id>` to select and scroll to a specific item after the map loads.

Example:

```text
https://example.com/blockscape/?load=https%3A%2F%2Fexample.com%2Fmaps%2Fdemo.bs&item=foo
```

If the loaded file is a series, append `&map=<map-id>` to reopen a specific map in the series before selecting the item.

Example:

```text
https://example.com/blockscape/?load=https%3A%2F%2Fexample.com%2Fmaps%2Fdemo-series.bs&map=map-3&item=foo
```

## Tips and caveats

- Tokens grow with file size; keep shared models concise when possible.
- Treat tokens as sensitive if the map contains internal details.
- The server build (`npm run server`) can auto-load a tokenized URL when you paste it into the browser.
