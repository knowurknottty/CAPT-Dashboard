export type DataFreshness = 'live' | 'delayed' | 'stale' | 'partial' | 'offline' | 'error';

export type CognitiveHealth = 'healthy' | 'warning' | 'critical' | 'offline';

export interface Provenance {
  source: string;
  observedAt: string;
  traceId?: string;
  schemaVersion: string;
  confidence: number;
}

export interface CognitiveMetric {
  id: string;
  label: string;
  value: number;
  unit: '%' | 'ms' | 'count' | 'ratio';
  trend?: number;
  health: CognitiveHealth;
  provenance: Provenance;
}

export interface PipelineStageTelemetry {
  id: string;
  label: string;
  health: CognitiveHealth;
  latencyMs: number;
  throughputPerMinute: number | null;
  confidence: number;
  queueDepth: number;
  detail: string;
  provenance: Provenance;
}

export interface CognitiveEvent {
  id: string;
  type: 'memory' | 'reasoning' | 'agent' | 'governance' | 'execution' | 'learning';
  title: string;
  detail: string;
  occurredAt: string;
  confidence: number;
  traceId: string;
  parentEventId?: string;
  provenance: Provenance;
}

export interface DashboardSnapshot {
  snapshotId: string;
  generatedAt: string;
  freshness: DataFreshness;
  sequence: number;
  mission: {
    goal: string;
    phase: string;
    progress: number;
    blockers: number;
    dependenciesWaiting: number;
  };
  metrics: CognitiveMetric[];
  pipeline: PipelineStageTelemetry[];
  recentEvents: CognitiveEvent[];
}

export interface InterventionPreview {
  interventionId: string;
  action: string;
  target: string;
  expectedImpact: string[];
  risks: string[];
  authorizationRequired: string[];
  rollbackAvailable: boolean;
  expiresAt: string;
}

export interface InterventionReceipt {
  interventionId: string;
  accepted: boolean;
  executedAt?: string;
  auditEventId: string;
}

export interface TelemetryAdapter {
  readonly name: string;
  connect(signal?: AbortSignal): Promise<void>;
  disconnect(): Promise<void>;
  getSnapshot(signal?: AbortSignal): Promise<DashboardSnapshot>;
  subscribe(
    onEvent: (event: CognitiveEvent) => void,
    onStateChange: (freshness: DataFreshness) => void,
  ): () => void;
  previewIntervention(action: string, target: string, signal?: AbortSignal): Promise<InterventionPreview>;
  executeIntervention(preview: InterventionPreview, confirmationToken: string, signal?: AbortSignal): Promise<InterventionReceipt>;
}
