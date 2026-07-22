FROM node:20-bookworm-slim AS build

WORKDIR /workspace

COPY package*.json ./
COPY documentation/requirements.txt documentation/requirements.txt

RUN apt-get update \
    && apt-get install -y python3 python3-pip python3-venv \
    && python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r documentation/requirements.txt \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/opt/venv/bin:${PATH}"

RUN npm ci

COPY . .

RUN npm run build

FROM node:20-bookworm-slim AS runtime

WORKDIR /usr/src/app

ENV NODE_ENV=production \
    PORT=4173 \
    HOST=0.0.0.0 \
    BLOCKSCAPE_ROOT=/blockscape

COPY --from=build /workspace/docs ./docs
COPY server.js .

EXPOSE 4173

CMD ["node", "server.js"]
