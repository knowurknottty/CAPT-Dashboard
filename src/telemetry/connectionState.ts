import type { DataFreshness } from './contracts';

export interface ConnectionObservation {
  now: number;
  lastEventAt?: number;
  connected: boolean;
  hasPartialData?: boolean;
  error?: unknown;
}

export interface FreshnessThresholds {
  delayedAfterMs: number;
  staleAfterMs: number;
}

export const defaultFreshnessThresholds: FreshnessThresholds = {
  delayedAfterMs: 5_000,
  staleAfterMs: 15_000,
};

export function deriveFreshness(
  observation: ConnectionObservation,
  thresholds: FreshnessThresholds = defaultFreshnessThresholds,
): DataFreshness {
  if (observation.error) return 'error';
  if (!observation.connected) return observation.hasPartialData ? 'partial' : 'offline';
  if (!observation.lastEventAt) return 'partial';

  const age = Math.max(0, observation.now - observation.lastEventAt);
  if (age >= thresholds.staleAfterMs) return 'stale';
  if (age >= thresholds.delayedAfterMs) return 'delayed';
  return observation.hasPartialData ? 'partial' : 'live';
}

export function freshnessLabel(state: DataFreshness): string {
  switch (state) {
    case 'live': return 'Live';
    case 'delayed': return 'Delayed';
    case 'stale': return 'Stale · last known good';
    case 'partial': return 'Partial data';
    case 'offline': return 'Offline';
    case 'error': return 'Connection error';
  }
}
