
OTHER_REPO_URL := "https://github.com/pwright/bs-mkdocs.git"
OTHER_REPO_REF := "main"
PACKAGE_DIR := "mkdocs_blockscape"
ASSET_DIR := "docs/site_assets/blockscape"
VERSION_FILE := ".blockscape-upstream-version"
BS_MKDOCS_DIR := "bs-mkdocs"
DOCS_DIR := "documentation"


default:
    @just --list


install:
    npm install


dev:
    npm run dev


build-tokens:
    npm run build:tokens


build-site:
    npm run build


build:
    just build-site


build-mkdocs:
    cd {{DOCS_DIR}} && PYTHONPATH=. mkdocs build


build-app:
    npm run build-app


export:
    npm run export


export-nj:
    npm run export:nj


preview:
    npm run preview


serve-site:
    npm run serve


serve-mkdocs:
    cd {{DOCS_DIR}} && PYTHONPATH=. mkdocs serve


server:
    npm run server


cypress-open:
    npm run cypress:open


cypress-run:
    npm run cypress:run


cypress-report:
    npm run cypress:report


check-bs-mkdocs:
    python3 -m py_compile {{BS_MKDOCS_DIR}}/mkdocs_blockscape/extension.py
    node --check {{BS_MKDOCS_DIR}}/site_assets/blockscape/lite.js


build-bs-mkdocs:
    cd {{BS_MKDOCS_DIR}} && mkdocs build


build-quartz-blockscape:
    npm run build:tokens
    cd quartz-blockscape && npm install && npm run build


serve-bs-mkdocs:
    cd {{BS_MKDOCS_DIR}} && mkdocs serve


test: check-bs-mkdocs
    npm run cypress:run


update-bs-mkdocs:
    #!/usr/bin/env bash
    set -euo pipefail

    tmp="$(mktemp -d)"
    trap 'rm -rf "$tmp"' EXIT

    echo "Cloning {{OTHER_REPO_URL}} at {{OTHER_REPO_REF}}..." >&2
    git clone --depth 1 --branch "{{OTHER_REPO_REF}}" "{{OTHER_REPO_URL}}" "$tmp/src"

    src_root="$tmp/src"
    if [ -d "$src_root/bs-mkdocs/mkdocs_blockscape" ]; then
      src_root="$src_root/bs-mkdocs"
    fi

    if [ ! -d "$src_root/mkdocs_blockscape" ]; then
      echo "Expected mkdocs_blockscape under $src_root" >&2
      exit 1
    fi

    if [ ! -f "$src_root/site_assets/blockscape/lite.js" ]; then
      echo "Expected site_assets/blockscape/lite.js under $src_root" >&2
      exit 1
    fi

    echo "Replacing {{PACKAGE_DIR}} and {{ASSET_DIR}}..." >&2
    rm -rf "{{PACKAGE_DIR}}"
    mkdir -p "{{ASSET_DIR}}"
    rsync -a --delete \
      --exclude '.git' \
      "$src_root/mkdocs_blockscape/" \
      "{{PACKAGE_DIR}}/"
    rsync -a \
      "$src_root/site_assets/blockscape/lite.js" \
      "{{ASSET_DIR}}/lite.js"

    echo "{{OTHER_REPO_URL}} {{OTHER_REPO_REF}} $(git -C "$tmp/src" rev-parse HEAD)" > "{{VERSION_FILE}}"

    echo "Done. Review with: git diff -- {{PACKAGE_DIR}} {{ASSET_DIR}} {{VERSION_FILE}}" >&2
