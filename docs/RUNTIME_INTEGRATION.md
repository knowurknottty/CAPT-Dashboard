# CAPT Dashboard Runtime Integration

## Deployment model

The dashboard is a self-hosted static web application. It should be served by the included hardened Nginx container and placed behind the operator's existing TLS/authentication boundary.

The browser must never receive CAPT infrastructure credentials, NATS credentials, database credentials, model-provider keys, or unrestricted intervention tokens.

## Recommended topology

```text
Operator browser
    |
TLS + identity-aware reverse proxy
    |
CAPT Dashboard container
    |
same-origin /api reverse proxy
    |
CAPT Observatory Gateway
    |-- read-model snapshot endpoint
    |-- bounded event stream
    |-- trace/evidence lookup
    `-- governed intervention coordinator
```

The Observatory Gateway is intentionally not implemented in this repository. It belongs beside the CAPT runtime and should expose a narrow, versioned contract rather than forwarding raw internal buses to the browser.

## Read path

1. Fetch a bounded current snapshot.
2. Subscribe to append-only events using a cursor/sequence number.
3. Reject duplicate events and explicitly detect gaps.
4. Preserve the last known good snapshot during reconnects.
5. Distinguish live, delayed, stale, partial, offline, and error states.
6. Correlate every displayed claim with provenance and a trace identifier.

## Intervention path

Interventions must never be direct browser-to-runtime commands.

Required sequence:

1. Operator requests a preview.
2. Gateway returns expected effects, risks, authorization requirements, expiration, and rollback availability.
3. Operator confirms using a short-lived, action-bound confirmation token.
4. Gateway revalidates current state and authorization.
5. Runtime executes or rejects the action.
6. Gateway emits an immutable audit event and returns its identifier.

Preview responses must not be executable objects. Confirmation tokens must be single-use, target-bound, action-bound, short-lived, and useless outside the gateway.

## Minimum API surface

- `GET /api/v1/snapshot`
- `GET /api/v1/events?after=<sequence>` or same-origin WebSocket/SSE
- `GET /api/v1/traces/<trace-id>`
- `POST /api/v1/interventions/preview`
- `POST /api/v1/interventions/confirm`
- `GET /api/v1/audit/<event-id>`

## Schema rules

- Version every envelope.
- Use monotonic sequence numbers inside each stream partition.
- Include source timestamp and gateway receive timestamp.
- Treat confidence as data with provenance, not decoration.
- Bound event payload size and text length.
- Never ship hidden chain-of-thought; expose concise reasoning summaries, evidence links, decisions, rejected alternatives, and uncertainty.
- Redact secrets and personal data before the browser boundary.

## Failure behavior

- Event gap: mark affected panels partial and request a fresh snapshot.
- Stream interruption: keep last known good data visible and age it into delayed/stale.
- Snapshot failure: show explicit offline/error state; never substitute new simulated data.
- Intervention timeout: show unknown outcome until reconciled against audit events.
- Clock skew: prefer gateway receive time for freshness while retaining source time for evidence.
