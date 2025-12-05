# Using Apicurio as backend

Due to PNA, local only works in Firefox.

## Local server


Backend

```
podman run --replace --name registry   -p 8080:8080   -e QUARKUS_HTTP_CORS=true   -e QUARKUS_HTTP_CORS_ORIGINS="*"  -e APICURIO_SEMVER_BRANCHING_ENABLED=true  -e QUARKUS_HTTP_CORS_ACCESS_CONTROL_ALLOW_METHODS="GET,PUT,POST,DELETE,OPTIONS,HEAD"   -e QUARKUS_HTTP_CORS_ACCESS_CONTROL_ALLOW_HEADERS="accept,authorization,content-type,x-requested-with"   apicurio/apicurio-registry:latest-release
```



UI

```
podman run -it --rm   -p 8081:8080   -e REGISTRY_API_URL=http://localhost:8080/apis/registry/v3   docker.io/apicurio/apicurio-registry-ui:latest-release

```

That config is especially good with:

```
npx http-server . -p 4173
```

## Apicurio Registry: HTTPS Reverse Proxy on Unraid

This README documents the final working setup for running Apicurio Registry behind an HTTPS facade on an Unraid server using Docker Compose. The goal is to provide a secure, self-signed TLS endpoint for remote clients while keeping the Registry itself running internally over HTTP.

---

### Overview

The deployment consists of:

* **Apicurio Registry** — running on an internal bridge network, exposed on port `8080` (HTTP)
* **Apicurio Registry UI** — exposed on port `8081` (HTTP)
* **Nginx HTTPS Proxy** — terminates TLS, forwards requests to the Registry backend, exposed on port `9443` (HTTPS)

Clients call the proxy endpoint, not the Registry directly.

Example client URL:

```
https://<host>.<tailscale-net>.ts.net:9443/apis/registry/v3/system/info
```

---

### Directory Structure

On Unraid, the proxy configuration and certificates are stored under:

```
/mnt/user/appdata/apicurio-nginx/
├── nginx.conf
└── certs/
    ├── fullchain.pem
    └── privkey.pem
```

---

### Self-Signed Certificate Generation

Generate a certificate matching your public hostname:

```
openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout /mnt/user/appdata/apicurio-nginx/certs/privkey.pem \
  -out /mnt/user/appdata/apicurio-nginx/certs/fullchain.pem \
  -days 365 \
  -subj "/CN=<host>.<tailscale-net>.ts.net" \
  -addext "subjectAltName=DNS:<host>.<tailscale-net>.ts.net"
```

Browsers will warn due to self-signing; users must trust or add an exception.

---

### Nginx Configuration

The reverse proxy uses a dedicated `nginx.conf` file:

```
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    access_log  /var/log/nginx/access.log;
    error_log   /var/log/nginx/error.log warn;

    sendfile        on;
    keepalive_timeout  65;

    server {
        listen 443 ssl;
        server_name _;

        ssl_certificate     /certs/fullchain.pem;
        ssl_certificate_key /certs/privkey.pem;

        # CORS support
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET,PUT,POST,DELETE,OPTIONS,HEAD" always;
        add_header Access-Control-Allow-Headers "accept,authorization,content-type,x-requested-with" always;

        if ($request_method = OPTIONS) {
            add_header Access-Control-Max-Age 86400;
            add_header Content-Length 0;
            add_header Content-Type "text/plain; charset=UTF-8";
            return 204;
        }

        location / {
            proxy_pass http://apicurio-registry:8080;
            proxy_set_header Host              $host;
            proxy_set_header X-Real-IP         $remote_addr;
            proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
        }
    }
}
```

---

### Compose Service Definition

The following service is added to the Unraid Docker Compose stack:

```
apicurio-registry-proxy:
  image: nginx:alpine
  container_name: apicurio-registry-proxy
  volumes:
    - /mnt/user/appdata/apicurio-nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - /mnt/user/appdata/apicurio-nginx/certs:/certs:ro
  ports:
    - "9443:443"   # HTTPS entrypoint
  depends_on:
    - apicurio-registry
  networks:
    - apicurio-network
```

Ensure the Registry backend and UI are also attached to `apicurio-network`.

---

### Verification

1. Test TLS from Unraid

```
curl -vk https://127.0.0.1:9443/apis/registry/v3/system/info
```

You should receive JSON.

2. Test Remote Client Access

```
curl -k https://<host>.<tailscale-net>.ts.net:9443/apis/registry/v3/system/info
```

If the certificate is trusted, omit `-k`.

---

.Browser Access

* Browsers must trust the self-signed certificate.
* Once trusted, remote JS clients can successfully call the Registry because the proxy injects valid CORS headers.

---

### Summary

You now have:

* A functioning HTTPS reverse proxy on Unraid
* Working CORS for browser-based clients
* A fully reachable Apicurio Registry endpoint over TLS
* Self-signed certs configured with proper hostname matching

This setup is suitable for LAN, Tailscale, or test deployments where full certificate authority integration isn’t needed.

