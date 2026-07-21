import { useEffect, useMemo, useState } from 'react';
import { dashboardConfig } from '../config';
import { agents as fixtureAgents, events as fixtureEvents, pipeline as fixturePipeline } from '../data';
import type {
  AgentOperatingState,
  AgentTelemetry,
  CognitiveEvent,
  CognitiveMetric,
  DashboardSnapshot,
  DataFreshness,
  PipelineStageTelemetry,
  Provenance,
} from './contracts';

type GatewayPipelineStage = {
  id: string;
  label?: string;
  health?: PipelineStageTelemetry['health'];
  latencyMs?: number;
  throughputPerMinute?: number | null;
  confidence?: number;
  queueDepth?: number;
  detail?: string;
  provenance?: { source?: string; schemaVersion?: string; simulated?: boolean };
};

type GatewayAgent = {
  id: string;
  name?: string;
  role?: string;
  state?: AgentTelemetry['state'];
  load?: number;
  trust?: number;
  activeTask?: string | null;
  lastHeartbeatAt?: string;
  provenance?: { source?: string; schemaVersion?: string; simulated?: boolean };
};

type GatewaySnapshot = {
  snapshotId: string;
  generatedAt: string;
  freshness?: { state?: DataFreshness; observedAt?: string };
  provenance?: { source?: string; simulated?: boolean };
  metrics?: Record<string, number>;
  pipeline?: GatewayPipelineStage[];
  agents?: GatewayAgent[];
};

type GatewayEvent = Omit<CognitiveEvent, 'provenance'> & {
  sequence?: number;
  provenance?: { source?: string; schemaVersion?: string; simulated?: boolean };
};

const labels: Record<string, string> = {
  cognitiveHealth: 'Cognitive health',
  missionProgress: 'Mission progress',
  systemTrust: 'System trust',
  cognitiveEntropy: 'Cognitive entropy',
  decisionRegret: 'Decision regret',
  learningVelocity: 'Learning velocity',
};

const fallbackMetrics = {
  cognitiveHealth: 87,
  missionProgress: 64,
  systemTrust: 92,
  cognitiveEntropy: 23,
  decisionRegret: 11,
  learningVelocity: 78,
};

function provenance(source: string, observedAt: string, confidence = 1): Provenance {
  return { source, observedAt, schemaVersion: '1.0.0', confidence };
}

function normalizeAgentState(value: string | undefined): AgentOperatingState {
  return value === 'active' || value === 'watching' || value === 'blocked' || value === 'idle' || value === 'offline'
    ? value
    : 'offline';
}

function normalizeMetrics(values: Record<string, number>, observedAt: string, source: string): CognitiveMetric[] {
  return Object.entries(labels).map(([id, label]) => ({
    id,
    label,
    value: Number.isFinite(values[id]) ? values[id] : fallbackMetrics[id as keyof typeof fallbackMetrics],
    unit: '%',
    trend: 0,
    health: 'healthy',
    provenance: provenance(source, observedAt),
  }));
}

function normalizePipeline(stages: GatewayPipelineStage[] | undefined, observedAt: string, source: string): PipelineStageTelemetry[] {
  if (!stages?.length) return [];
  return stages.slice(0, 64).map((stage) => ({
    id: stage.id,
    label: stage.label ?? stage.id.replace(/(^|-)(\w)/g, (_, prefix: string, letter: string) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`),
    health: stage.health ?? 'offline',
    latencyMs: Number.isFinite(stage.latencyMs) ? Math.max(0, stage.latencyMs ?? 0) : 0,
    throughputPerMinute: Number.isFinite(stage.throughputPerMinute) ? Math.max(0, stage.throughputPerMinute ?? 0) : null,
    confidence: Number.isFinite(stage.confidence) ? Math.max(0, Math.min(100, stage.confidence ?? 0)) : 0,
    queueDepth: Number.isFinite(stage.queueDepth) ? Math.max(0, Math.round(stage.queueDepth ?? 0)) : 0,
    detail: stage.detail ?? 'No runtime detail was supplied for this stage.',
    provenance: provenance(stage.provenance?.source ?? source, observedAt, (stage.confidence ?? 0) / 100),
  }));
}

function normalizeAgents(agents: GatewayAgent[] | undefined, observedAt: string, source: string): AgentTelemetry[] {
  if (!agents?.length) return [];
  return agents.slice(0, 256).map((agent) => ({
    id: agent.id,
    name: agent.name ?? agent.id,
    role: agent.role ?? 'Unspecified role',
    state: normalizeAgentState(agent.state),
    load: Number.isFinite(agent.load) ? Math.max(0, Math.min(100, agent.load ?? 0)) : 0,
    trust: Number.isFinite(agent.trust) ? Math.max(0, Math.min(100, agent.trust ?? 0)) : 0,
    activeTask: typeof agent.activeTask === 'string' ? agent.activeTask : null,
    lastHeartbeatAt: agent.lastHeartbeatAt ?? observedAt,
    provenance: provenance(agent.provenance?.source ?? source, agent.lastHeartbeatAt ?? observedAt, (agent.trust ?? 0) / 100),
  }));
}

function normalizeEvent(event: GatewayEvent): CognitiveEvent {
  return {
    id: event.id,
    type: event.type,
    title: event.title,
    detail: event.detail,
    occurredAt: event.occurredAt,
    confidence: event.confidence,
    traceId: event.traceId,
    parentEventId: event.parentEventId,
    provenance: provenance(event.provenance?.source ?? 'observatory-gateway', event.occurredAt, event.confidence / 100),
  };
}

function simulatedSnapshot(tick = 0): DashboardSnapshot {
  const generatedAt = new Date().toISOString();
  const values = Object.fromEntries(Object.entries(fallbackMetrics).map(([key, value], index) => [key, Math.max(0, Math.min(100, value + Math.round(Math.sin((tick + index) / 2) * 2)))]));
  const recentEvents = fixtureEvents.map((event) => ({
    id: event.id,
    type: event.type === 'tool' ? 'execution' : event.type,
    title: event.title,
    detail: event.detail,
    occurredAt: new Date(Date.now() - (59 - event.minute) * 60_000).toISOString(),
    confidence: event.confidence,
    traceId: `capt-${event.id}-7a9`,
    provenance: provenance('simulated-adapter', generatedAt, event.confidence / 100),
  })) satisfies CognitiveEvent[];
  const pipeline = fixturePipeline.map((stage) => ({
    id: stage.id,
    label: stage.label,
    health: stage.health,
    latencyMs: stage.latency,
    throughputPerMinute: stage.throughput,
    confidence: stage.confidence,
    queueDepth: stage.queue,
    detail: stage.detail,
    provenance: provenance('simulated-adapter', generatedAt, stage.confidence / 100),
  })) satisfies PipelineStageTelemetry[];
  const agents = fixtureAgents.map((agent, index) => ({
    id: agent.name.toLowerCase(),
    name: agent.name,
    role: agent.role,
    state: normalizeAgentState(agent.state),
    load: Math.max(0, Math.min(100, agent.load + Math.round(Math.sin((tick + index) / 3) * 2))),
    trust: agent.trust,
    activeTask: agent.state === 'blocked' ? 'Waiting on external dependency' : agent.state === 'watching' ? 'Policy observation' : 'Current mission execution',
    lastHeartbeatAt: generatedAt,
    provenance: provenance('simulated-adapter', generatedAt, agent.trust / 100),
  })) satisfies AgentTelemetry[];

  return {
    snapshotId: `simulated-${tick}`,
    generatedAt,
    freshness: 'live',
    sequence: tick,
    mission: {
      goal: 'Make CAPT cognition observable without turning it into infrastructure noise.',
      phase: 'Phase 2 of 6 · Telemetry contract and interaction model validation',
      progress: values.missionProgress,
      blockers: 1,
      dependenciesWaiting: 2,
    },
    metrics: normalizeMetrics(values, generatedAt, 'simulated-adapter'),
    pipeline,
    agents,
    recentEvents,
  };
}

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${dashboardConfig.apiBaseUrl}${path}`, {
    signal,
    headers: { accept: 'application/json' },
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error(`Telemetry request failed with ${response.status}`);
  return response.json() as Promise<T>;
}

async function gatewaySnapshot(signal?: AbortSignal): Promise<DashboardSnapshot> {
  const [snapshot, page] = await Promise.all([
    fetchJson<GatewaySnapshot>('/v1/snapshot', signal),
    fetchJson<{ events?: GatewayEvent[]; nextSequence?: number }>('/v1/events?limit=100', signal),
  ]);
  const observedAt = snapshot.freshness?.observedAt ?? snapshot.generatedAt;
  const source = snapshot.provenance?.source ?? 'observatory-gateway';
  const metrics = normalizeMetrics(snapshot.metrics ?? fallbackMetrics, observedAt, source);
  return {
    snapshotId: snapshot.snapshotId,
    generatedAt: snapshot.generatedAt,
    freshness: snapshot.freshness?.state ?? 'live',
    sequence: page.nextSequence ?? 0,
    mission: {
      goal: 'Make CAPT cognition observable without turning it into infrastructure noise.',
      phase: 'Runtime adapter validation',
      progress: snapshot.metrics?.missionProgress ?? 0,
      blockers: 0,
      dependenciesWaiting: 0,
    },
    metrics,
    pipeline: normalizePipeline(snapshot.pipeline, observedAt, source),
    agents: normalizeAgents(snapshot.agents, observedAt, source),
    recentEvents: (page.events ?? []).map(normalizeEvent),
  };
}

export interface RuntimeTelemetryState {
  snapshot: DashboardSnapshot;
  freshness: DataFreshness;
  paused: boolean;
  error: string | null;
  adapterName: string;
  pause(): void;
  resume(): void;
  refresh(): Promise<void>;
}

export function useRuntimeTelemetry(): RuntimeTelemetryState {
  const [snapshot, setSnapshot] = useState(() => simulatedSnapshot());
  const [freshness, setFreshness] = useState<DataFreshness>('live');
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adapterName = dashboardConfig.mode === 'simulated' ? 'simulated-adapter' : 'observatory-gateway';

  async function refresh() {
    if (paused) return;
    try {
      const next = dashboardConfig.mode === 'simulated'
        ? simulatedSnapshot(snapshot.sequence + 1)
        : await gatewaySnapshot();
      setSnapshot(next);
      setFreshness(next.freshness);
      setError(null);
    } catch (reason) {
      setFreshness(snapshot.generatedAt ? 'stale' : 'error');
      setError(reason instanceof Error ? reason.message : 'Unknown telemetry error');
    }
  }

  useEffect(() => {
    if (paused) return;
    const controller = new AbortController();
    const update = async () => {
      try {
        const next = dashboardConfig.mode === 'simulated'
          ? simulatedSnapshot(snapshot.sequence + 1)
          : await gatewaySnapshot(controller.signal);
        setSnapshot(next);
        setFreshness(next.freshness);
        setError(null);
      } catch (reason) {
        if (controller.signal.aborted) return;
        setFreshness(snapshot.generatedAt ? 'stale' : 'error');
        setError(reason instanceof Error ? reason.message : 'Unknown telemetry error');
      }
    };
    void update();
    const timer = window.setInterval(() => void update(), dashboardConfig.pollIntervalMs);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [paused]);

  return useMemo(() => ({
    snapshot,
    freshness: paused ? 'stale' : freshness,
    paused,
    error,
    adapterName,
    pause: () => setPaused(true),
    resume: () => setPaused(false),
    refresh,
  }), [adapterName, error, freshness, paused, snapshot]);
}
