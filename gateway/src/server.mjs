import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

const HOST = process.env.GATEWAY_HOST ?? '0.0.0.0';
const PORT = Number(process.env.GATEWAY_PORT ?? 8787);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES ?? 16_384);
const MAX_EVENT_LIMIT = Number(process.env.MAX_EVENT_LIMIT ?? 200);
const PREVIEW_TTL_MS = Number(process.env.PREVIEW_TTL_MS ?? 60_000);
const ALLOW_EXECUTION = process.env.ALLOW_EXECUTION === 'true';
const instanceId = randomUUID();
const startedAt = Date.now();

const events = Array.from({ length: 36 }, (_, index) => ({
  id: `evt-${String(index + 1).padStart(4, '0')}`,
  sequence: index + 1,
  occurredAt: new Date(Date.now() - (35 - index) * 15_000).toISOString(),
  type: ['memory', 'reasoning', 'agent', 'governance'][index % 4],
  title: ['Memory cluster activated', 'Hypothesis confidence changed', 'Agent heartbeat', 'Policy evaluation'][index % 4],
  detail: `Bounded simulated observatory event ${index + 1}`,
  confidence: 72 + (index % 23),
  traceId: `capt-trace-${String(index + 1).padStart(4, '0')}`,
  provenance: { source: 'gateway-fixture', simulated: true, schemaVersion: '1.0.0' },
}));

const pipeline = [
  { id: 'input', label: 'Input', health: 'healthy', latencyMs: 12, throughputPerMinute: 148, confidence: 99, queueDepth: 2, detail: 'Multimodal ingress normalized and provenance stamped.' },
  { id: 'attention', label: 'Attention', health: 'warning', latencyMs: 42, throughputPerMinute: 93, confidence: 76, queueDepth: 18, detail: 'Three competing goals are fragmenting the active context window.' },
  { id: 'recall', label: 'Memory Recall', health: 'healthy', latencyMs: 31, throughputPerMinute: 71, confidence: 91, queueDepth: 4, detail: 'Episodic and semantic retrieval agree on the current mission state.' },
  { id: 'reasoning', label: 'Reasoning', health: 'healthy', latencyMs: 87, throughputPerMinute: 29, confidence: 84, queueDepth: 7, detail: 'Primary hypothesis is stable; one contradiction remains unresolved.' },
  { id: 'planning', label: 'Planning', health: 'healthy', latencyMs: 54, throughputPerMinute: 24, confidence: 88, queueDepth: 3, detail: 'Plan graph has six executable steps and one approval gate.' },
  { id: 'execution', label: 'Execution', health: 'warning', latencyMs: 123, throughputPerMinute: 18, confidence: 79, queueDepth: 11, detail: 'Two tool calls are waiting on external dependencies.' },
  { id: 'reflection', label: 'Reflection', health: 'healthy', latencyMs: 61, throughputPerMinute: 14, confidence: 94, queueDepth: 1, detail: 'Post-action analysis reduced projected decision regret.' },
  { id: 'learning', label: 'Learning', health: 'healthy', latencyMs: 73, throughputPerMinute: 9, confidence: 86, queueDepth: 2, detail: 'Validated procedure promoted into a governed knowledge bubble.' },
];

const previews = new Map();
const audit = [];

function json(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...headers,
  });
  res.end(body);
}

function problem(res, status, code, detail) {
  json(res, status, { type: 'about:blank', title: code, status, detail });
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('request body too large'), { status: 413 });
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('invalid JSON'), { status: 400 });
  }
}

function snapshot() {
  const now = new Date().toISOString();
  const source = { source: 'gateway-fixture', simulated: true, schemaVersion: '1.0.0' };
  return {
    schemaVersion: '1.0.0',
    snapshotId: randomUUID(),
    generatedAt: now,
    freshness: { state: 'live', observedAt: now, expectedCadenceMs: 15_000 },
    provenance: { ...source, instanceId },
    metrics: {
      cognitiveHealth: 87,
      missionProgress: 64,
      systemTrust: 92,
      cognitiveEntropy: 23,
      decisionRegret: 11,
      learningVelocity: 78,
    },
    pipeline: pipeline.map((stage) => ({ ...stage, provenance: source })),
  };
}

function stableHash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function cleanupPreviews() {
  const now = Date.now();
  for (const [token, preview] of previews) if (preview.expiresAt <= now) previews.delete(token);
}

function appendAudit(entry) {
  const previousHash = audit.at(-1)?.hash ?? 'GENESIS';
  const record = { id: randomUUID(), recordedAt: new Date().toISOString(), previousHash, ...entry };
  record.hash = stableHash(record);
  audit.push(record);
  if (audit.length > 1_000) audit.shift();
  return record;
}

function route(req, res) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/healthz') return json(res, 200, { status: 'ok', instanceId });
  if (req.method === 'GET' && pathname === '/readyz') return json(res, 200, { status: 'ready', uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000) });
  if (req.method === 'GET' && pathname === '/api/v1/snapshot') return json(res, 200, snapshot());

  if (req.method === 'GET' && pathname === '/api/v1/events') {
    const after = Math.max(0, Number(url.searchParams.get('after') ?? 0));
    const limit = Math.min(MAX_EVENT_LIMIT, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));
    const page = events.filter((event) => event.sequence > after).slice(0, limit);
    return json(res, 200, { events: page, nextSequence: page.at(-1)?.sequence ?? after, truncated: page.length === limit });
  }

  if (req.method === 'GET' && pathname === '/api/v1/events/stream') {
    const after = Math.max(0, Number(url.searchParams.get('after') ?? 0));
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    for (const event of events.filter((item) => item.sequence > after).slice(0, MAX_EVENT_LIMIT)) {
      res.write(`id: ${event.sequence}\nevent: observatory\ndata: ${JSON.stringify(event)}\n\n`);
    }
    const heartbeat = setInterval(() => res.write(`event: heartbeat\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`), 15_000);
    req.on('close', () => clearInterval(heartbeat));
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/api/v1/traces/')) {
    const traceId = decodeURIComponent(pathname.slice('/api/v1/traces/'.length));
    const related = events.filter((event) => event.traceId === traceId);
    if (related.length === 0) return problem(res, 404, 'trace_not_found', 'No bounded trace data exists for that identifier.');
    return json(res, 200, { traceId, spans: related.map((event) => ({ eventId: event.id, occurredAt: event.occurredAt, name: event.title, attributes: event.provenance })) });
  }

  if (req.method === 'GET' && pathname === '/api/v1/audit') {
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 25)));
    return json(res, 200, { records: audit.slice(-limit), chainHead: audit.at(-1)?.hash ?? null });
  }

  if (req.method === 'POST' && pathname === '/api/v1/interventions/preview') {
    return readJson(req).then((body) => {
      if (typeof body.action !== 'string' || body.action.length < 3 || body.action.length > 120) return problem(res, 422, 'invalid_action', 'Action must be a string between 3 and 120 characters.');
      cleanupPreviews();
      const token = randomBytes(32).toString('base64url');
      const expiresAt = Date.now() + PREVIEW_TTL_MS;
      const stateHash = stableHash(snapshot().metrics);
      previews.set(token, { action: body.action, target: body.target ?? null, stateHash, expiresAt });
      appendAudit({ kind: 'intervention_previewed', action: body.action, target: body.target ?? null, stateHash });
      return json(res, 201, {
        previewToken: token,
        expiresAt: new Date(expiresAt).toISOString(),
        action: body.action,
        target: body.target ?? null,
        expectedImpact: 'No runtime effect in fixture mode.',
        risk: 'low',
        requiresConfirmation: true,
        executionEnabled: ALLOW_EXECUTION,
      });
    }).catch((error) => problem(res, error.status ?? 500, 'invalid_request', error.message));
  }

  if (req.method === 'POST' && pathname === '/api/v1/interventions/confirm') {
    return readJson(req).then((body) => {
      cleanupPreviews();
      if (typeof body.previewToken !== 'string') return problem(res, 422, 'missing_preview_token', 'A preview token is required.');
      const match = [...previews.keys()].find((token) => safeEqual(token, body.previewToken));
      if (!match) return problem(res, 409, 'preview_expired_or_invalid', 'Preview token is invalid, expired, or already used.');
      const preview = previews.get(match);
      previews.delete(match);
      const currentStateHash = stableHash(snapshot().metrics);
      if (preview.stateHash !== currentStateHash) return problem(res, 409, 'state_changed', 'Observed state changed after preview; request a new preview.');
      const receipt = appendAudit({ kind: ALLOW_EXECUTION ? 'intervention_executed' : 'intervention_simulated', action: preview.action, target: preview.target, stateHash: currentStateHash });
      return json(res, 200, { status: ALLOW_EXECUTION ? 'executed' : 'simulated', receipt });
    }).catch((error) => problem(res, error.status ?? 500, 'invalid_request', error.message));
  }

  return problem(res, 404, 'not_found', 'No route matches this request.');
}

export function createGatewayServer() {
  return createServer((req, res) => {
    res.setHeader('x-request-id', req.headers['x-request-id'] ?? randomUUID());
    Promise.resolve(route(req, res)).catch((error) => problem(res, 500, 'internal_error', error instanceof Error ? error.message : 'unknown error'));
  });
}

if (process.env.NODE_ENV !== 'test') {
  createGatewayServer().listen(PORT, HOST, () => {
    console.log(JSON.stringify({ level: 'info', message: 'CAPT Observatory Gateway listening', host: HOST, port: PORT, instanceId, executionEnabled: ALLOW_EXECUTION }));
  });
}
