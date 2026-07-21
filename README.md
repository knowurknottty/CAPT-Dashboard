# CAPT Dashboard

A cognitive observability command center for the CAPT architecture. It is designed to answer what the system is doing, why it believes its current state, what changed, what is uncertain, and where operator intervention has the highest value.

## Hosting model

Yes: this project is self-hosted.

The repository builds to static assets and includes a hardened Nginx container plus Docker Compose deployment. By default Compose binds only to `127.0.0.1:8080`; expose it through your own TLS and identity-aware reverse proxy rather than directly to the public internet.

```bash
docker compose up --build -d
curl http://127.0.0.1:8080/healthz
```

Open `http://127.0.0.1:8080` locally.

The frontend is self-hosted today. The CAPT Observatory Gateway that will supply real telemetry and governed interventions is the next runtime component; current UI telemetry remains explicitly simulated.

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

- Added a reproducible Docker build, health check, hardened Nginx configuration, CSP, immutable asset caching, and read-only Compose deployment.
- Defined preview → confirmation → revalidation → execution → audit semantics for interventions.
- Documented event-gap, reconnect, clock-skew, and unknown-outcome behavior.

See [`docs/RUNTIME_INTEGRATION.md`](docs/RUNTIME_INTEGRATION.md) for the full gateway contract and security boundary.

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

Production validation:

```bash
npm run check
npm run build
```

## Runtime configuration

- `VITE_CAPT_TELEMETRY_MODE`: `simulated`, `polling`, or `stream`
- `VITE_CAPT_API_BASE_URL`: same-origin gateway base, default `/api`
- `VITE_CAPT_STREAM_URL`: optional WebSocket/SSE endpoint
- `VITE_CAPT_POLL_INTERVAL_MS`: bounded polling cadence
- `VITE_CAPT_STALE_AFTER_MS`: last-event age before stale state

Development occurs through pull requests; direct writes to `main` are avoided.
