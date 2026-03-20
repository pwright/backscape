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


## Tips and caveats

- Tokens grow with file size; keep shared models concise when possible.
- Treat tokens as sensitive if the map contains internal details.
- The server build (`npm run server`) can auto-load a tokenized URL when you paste it into the browser.
