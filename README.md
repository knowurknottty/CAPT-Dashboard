# CAPT Dashboard

A cognitive observability command center for the CAPT architecture. The dashboard is designed to answer what the system is doing, why it believes its current state, what changed, what is uncertain, and where operator intervention has the highest value.

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

The current telemetry source is intentionally simulated. The UI labels this clearly. Runtime integration should be implemented behind adapters so CAPT event schemas, heartbeat contracts, traces, and authorization policies remain independent from presentation components.

## Development

```bash
npm install
npm run dev
```

Production validation:

```bash
npm run check
npm run build
```

## Integration contract

The next implementation phase should add:

1. A typed snapshot endpoint for current cognitive state.
2. An append-only event stream or bounded polling adapter.
3. Explicit live, delayed, stale, partial, offline, and error states.
4. Provenance fields for every metric and event.
5. Authorization plus preview/confirm/rollback semantics for interventions.
6. Trace correlation across memory, reasoning, planning, tools, reflection, and learning.

Development occurs through pull requests; direct writes to `main` are avoided.
