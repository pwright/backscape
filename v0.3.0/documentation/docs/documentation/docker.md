# Running Blockscape in a Container

The image exposes the static build and the optional local file API. It defaults to storing `.bs` files under `/blockscape` inside the container.

## Pull from Docker Hub

```bash
docker pull docker.io/pwrightrd/blockscape:latest
```

## Run with Docker

```bash
docker run --rm -p 4173:4173 \
  -v "$PWD/blockscape-data:/blockscape" \
  docker.io/pwrightrd/blockscape:latest
```

* App opens at `http://localhost:4173/server`
* `BLOCKSCAPE_ROOT` is set to `/blockscape`; the bind mount keeps your `.bs` files outside the container
* If you hit a permissions error reading `/blockscape` on SELinux, relabel the mount: `-v "$PWD/blockscape-data:/blockscape:z"` (Docker) or `:Z` (Podman)

### Optional overrides

```bash
docker run --rm -p 8080:8080 \
  -e PORT=8080 -e HOST=0.0.0.0 -e BLOCKSCAPE_ROOT=/blockscape \
  -v "$PWD/blockscape-data:/blockscape" \
  docker.io/pwrightrd/blockscape:latest
```

## Run with Podman

```bash
podman run --rm -p 4173:4173 \
  -v "$PWD/blockscape-data:/blockscape:Z" \
  docker.io/pwrightrd/blockscape:latest
```

`:Z` relabels the mount on SELinux so the container can read/write the mapped directory.

## Build locally (optional)

```bash
docker build -t blockscape:local .
docker run --rm -p 4173:4173 \
  -v "$PWD/blockscape-data:/blockscape" \
  blockscape:local
```

The image serves the built assets via `server.js` and listens on all interfaces by default. Mount a host directory at `/blockscape` if you want the file API to persist data across runs.

## Push to Docker Hub

```bash
docker login
docker build -t docker.io/pwrightrd/blockscape:latest .
docker push docker.io/pwrightrd/blockscape:latest
```

If you use Podman, run `podman login docker.io` first (or `docker login` if using Docker CLI), then:

```bash
podman build -t docker.io/pwrightrd/blockscape:latest .
podman push docker.io/pwrightrd/blockscape:latest
```

If you see `requested access to the resource is denied`, make sure:

- You are logged in to Docker Hub as `pwrightrd` (`docker login` or `podman login docker.io -u pwrightrd`).
- The repository `docker.io/pwrightrd/blockscape` exists under your account (create it once in Docker Hub).

You can also tag a versioned release:

```bash
docker tag docker.io/pwrightrd/blockscape:latest docker.io/pwrightrd/blockscape:v1
docker push docker.io/pwrightrd/blockscape:v1
```
