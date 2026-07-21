FROM node:22-alpine

RUN apk add --no-cache sqlite

WORKDIR /app
COPY package.json ./
COPY src ./src

ENV NODE_ENV=production \
    GATEWAY_HOST=0.0.0.0 \
    GATEWAY_PORT=8787 \
    ALLOW_EXECUTION=false \
    CAPT_MEMORY_DB_PATH=/capt-data/memory.db

USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8787/healthz || exit 1

CMD ["node", "src/server.mjs"]
