# AGENTS.md

**IMPORTANT**: before you do anything else, run the `/home/linuxbrew/.linuxbrew/bin/beans prime` command and heed its output.


## Overview

Svelte app in `svelte/`, rendered to static site in `docs/`, build will always overwrite `docs/`.

## Commands
- Install: npm install
- Build docs: npm run build
- Run server: npm run server

## Env
- NODE_VERSION=20

## Pitfalls
- Do not delete generated HTML; rebuild instead.
