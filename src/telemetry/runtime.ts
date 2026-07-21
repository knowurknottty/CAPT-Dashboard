import { useEffect, useMemo, useState } from 'react';
import { dashboardConfig } from '../config';
import { events as fixtureEvents } from '../data';
import type { CognitiveEvent, CognitiveMetric, DashboardSnapshot, DataFreshness, Provenance } from './contracts';

type GatewaySnapshot = {
  snapshotId: string;
  generatedAt: string;
  freshness?: { state?: DataFreshness; observedAt?: string };
  provenance?: { source?: string; simulated?: boolean };
  metrics?: Record<string, number>;
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
    type: event.type,
    title: event.title,
    detail: event.detail,
    occurredAt: new Date(Date.now() - (59 - event.minute) * 60_000).toISOString(),
    confidence: event.confidence,
    traceId: `capt-${event.id}-7a9`,
    provenance: provenance('simulated-adapter', generatedAt, event.confidence / 100),
  })) satisfies CognitiveEvent[];

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
