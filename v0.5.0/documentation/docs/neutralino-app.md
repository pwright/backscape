# Neutralino App (Blockscape Viewer)

## Running app

Choose the file for your hardware at https://github.com/pwright/blockscape/tree/main/nj/dist/blockscape-nj

You must also download the [resources.neu](https://github.com/pwright/blockscape/raw/refs/heads/main/nj/dist/blockscape-nj/resources.neu) file and place it in same dir as executable. 


## Building app

### Requirements
- Node.js 20
- Neutralino CLI (`neu`) installed
- Build dependencies installed (`npm install`)

### Install Neutralino Binaries
Run this from the repo root:

```sh
cd nj
neu update
```

### Build the Neutralino Assets
From the repo root:

```sh
npm run export:nj
```

This writes the Blockscape bundle to `nj/resources/site_assets/blockscape/`.

### Run the App (Dev)
Use the directory resources directly (fast iteration):

```sh
cd nj
neu run --load-dir-res
```

### Run the App (Packaged)
Use packaged `resources.neu`:

```sh
cd nj
neu build
neu run
```

If you change files under `nj/resources/`, rebuild before running without
`--load-dir-res` so the packaged resources include your updates.
