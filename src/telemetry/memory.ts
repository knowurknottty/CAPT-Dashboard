import { useEffect, useState } from 'react';
import { dashboardConfig } from '../config';

export interface MemoryAggregateRow {
  namespace?: string;
  tag?: string;
  provenance?: string;
  count: number;
  averageConfidence?: number;
  lastUpdatedAt?: string | null;
}

export interface MemoryObservability {
  status: 'available' | 'unavailable' | 'error';
  reason: string | null;
  databasePath: string;
  observedAt: string;
  contentExposed: false;
  aggregates: null | {
    totalMemories: number;
    namespaceCount: number;
    tagCount: number;
    averageConfidence: number;
    oldestCreatedAt: string | null;
    newestUpdatedAt: string | null;
    namespaces: MemoryAggregateRow[];
    tags: MemoryAggregateRow[];
    provenance: MemoryAggregateRow[];
  };
}

const initial: MemoryObservability = {
  status: 'unavailable',
  reason: 'memory observability has not been queried',
  databasePath: '',
  observedAt: new Date(0).toISOString(),
  contentExposed: false,
  aggregates: null,
};

export function useMemoryObservability() {
  const [memory, setMemory] = useState<MemoryObservability>(initial);

  useEffect(() => {
    const controller = new AbortController();
    const update = async () => {
      try {
        const response = await fetch(`${dashboardConfig.apiBaseUrl}/v1/memory`, {
          signal: controller.signal,
          headers: { accept: 'application/json' },
          credentials: 'same-origin',
        });
        if (!response.ok) throw new Error(`Memory observability request failed with ${response.status}`);
        const next = await response.json() as MemoryObservability;
        setMemory({ ...next, contentExposed: false });
      } catch (error) {
        if (controller.signal.aborted) return;
        setMemory({
          ...initial,
          status: 'error',
          reason: error instanceof Error ? error.message : 'unknown memory observability error',
          observedAt: new Date().toISOString(),
        });
      }
    };

    void update();
    const timer = window.setInterval(() => void update(), Math.max(5_000, dashboardConfig.pollIntervalMs));
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);

  return memory;
}
