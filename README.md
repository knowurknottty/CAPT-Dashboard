# CAPT Dashboard

A cognitive observability command center for the CAPT architecture. It is designed to answer what the system is doing, why it believes its current state, what changed, what is uncertain, and where operator intervention has the highest value.

## Hosting model

Yes: this project is self-hosted.

The repository includes a hardened Nginx dashboard container and a private CAPT Observatory Gateway service. Docker Compose binds only the dashboard to `127.0.0.1:8080`; the gateway is reachable only on the internal Compose network. Put your own TLS and identity-aware reverse proxy in front of the dashboard rather than exposing it directly to the public internet.

```bash
docker compose up --build -d
curl http://127.0.0.1:8080/healthz
curl http://127.0.0.1:8080/readyz
curl http://127.0.0.1:8080/api/v1/snapshot
```

Open `http://127.0.0.1:8080` locally.

The gateway currently emits clearly marked simulated fixtures. Real CAPT integration belongs behind the gateway adapters; the browser must never receive raw NATS/Redis credentials, unrestricted command channels, or database access.

## Current vertical slice

- Executive cognitive metrics with simulated live updates
- Cognitive pipeline with stage health, latency, confidence, queues, and drill-down
- Reasoning explorer with competing and rejected hypotheses
- Memory activation field and cluster changes
- Agent ecology with load, trust, and operating state
- Unified replay timeline with filtering and evidence selection
- Provenance and freshness panel
- Safe intervention previews that never execute destructive actions
- Responsive mobile layout and reduced-motion support

## Observatory Gateway

The dependency-light Node 22 gateway provides:

- `GET /healthz` and `GET /readyz`
- `GET /api/v1/snapshot`
- bounded `GET /api/v1/events`
- bounded replay plus heartbeat SSE at `GET /api/v1/events/stream`
- trace evidence at `GET /api/v1/traces/:traceId`
- intervention preview and single-use confirmation endpoints
- bounded, hash-chained audit receipts
- strict request-size, event-count, and preview-expiry limits
- execution disabled by default

The API description is in [`gateway/openapi.yaml`](gateway/openapi.yaml).

## Three-pass refinement

### 1. Architecture truth

- Added a typed `TelemetryAdapter` boundary.
- Defined versioned snapshots, events, provenance, metrics, intervention previews, and audit receipts.
- Kept CAPT credentials, raw buses, and unrestricted command channels outside the browser boundary.

### 2. Operator trust

- Added an explicit freshness model for live, delayed, stale, partial, offline, and error states.
- Preserves last-known-good information during interruption without mislabeling it as live.
- Requires traceable provenance for displayed claims.

### 3. Production boundary

- Added reproducible containers, health checks, hardened Nginx, CSP, immutable asset caching, and read-only Compose deployment.
- Defined preview → confirmation → revalidation → execution → audit semantics for interventions.
- Documented event-gap, reconnect, clock-skew, and unknown-outcome behavior.

See [`docs/RUNTIME_INTEGRATION.md`](docs/RUNTIME_INTEGRATION.md) for the full gateway contract and security boundary.

## Local development

Frontend:

```bash
cp .env.example .env
npm install
npm run dev
```

Gateway:

```bash
npm --prefix gateway test
node gateway/src/server.mjs
```

Production validation:

```bash
npm run check
npm run build
npm --prefix gateway test
docker compose config
docker compose build
```

## Runtime configuration

- `VITE_CAPT_TELEMETRY_MODE`: `simulated`, `polling`, or `stream`
- `VITE_CAPT_API_BASE_URL`: same-origin gateway base, default `/api`
- `VITE_CAPT_STREAM_URL`: optional SSE endpoint
- `VITE_CAPT_POLL_INTERVAL_MS`: bounded polling cadence
- `VITE_CAPT_STALE_AFTER_MS`: last-event age before stale state
- `ALLOW_EXECUTION`: gateway execution switch; defaults to `false`
- `MAX_BODY_BYTES`: maximum request body; defaults to `16384`
- `MAX_EVENT_LIMIT`: maximum event page/replay; defaults to `200`
- `PREVIEW_TTL_MS`: preview confirmation window; defaults to `60000`

Development occurs through pull requests; direct writes to `main` are avoided.
