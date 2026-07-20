export type Health = 'healthy' | 'warning' | 'critical' | 'offline';

export type PipelineStage = {
  id: string;
  label: string;
  health: Health;
  latency: number;
  throughput: number;
  confidence: number;
  queue: number;
  detail: string;
};

export type TimelineEvent = {
  id: string;
  minute: number;
  type: 'reasoning' | 'memory' | 'agent' | 'governance' | 'tool';
  title: string;
  detail: string;
  confidence: number;
};

export const pipeline: PipelineStage[] = [
  { id: 'input', label: 'Input', health: 'healthy', latency: 12, throughput: 148, confidence: 99, queue: 2, detail: 'Multimodal ingress normalized and provenance stamped.' },
  { id: 'attention', label: 'Attention', health: 'warning', latency: 42, throughput: 93, confidence: 76, queue: 18, detail: 'Three competing goals are fragmenting the active context window.' },
  { id: 'recall', label: 'Memory Recall', health: 'healthy', latency: 31, throughput: 71, confidence: 91, queue: 4, detail: 'Episodic and semantic retrieval agree on the current mission state.' },
  { id: 'reasoning', label: 'Reasoning', health: 'healthy', latency: 87, throughput: 29, confidence: 84, queue: 7, detail: 'Primary hypothesis is stable; one contradiction remains unresolved.' },
  { id: 'planning', label: 'Planning', health: 'healthy', latency: 54, throughput: 24, confidence: 88, queue: 3, detail: 'Plan graph has six executable steps and one approval gate.' },
  { id: 'execution', label: 'Execution', health: 'warning', latency: 123, throughput: 18, confidence: 79, queue: 11, detail: 'Two tool calls are waiting on external dependencies.' },
  { id: 'reflection', label: 'Reflection', health: 'healthy', latency: 61, throughput: 14, confidence: 94, queue: 1, detail: 'Post-action analysis reduced projected decision regret.' },
  { id: 'learning', label: 'Learning', health: 'healthy', latency: 73, throughput: 9, confidence: 86, queue: 2, detail: 'Validated procedure promoted into a governed knowledge bubble.' },
];

export const events: TimelineEvent[] = [
  { id: 'e1', minute: 2, type: 'memory', title: 'Memory cluster activated', detail: 'CAPT observability architecture, dashboard specification, and adapter contracts recalled.', confidence: 93 },
  { id: 'e2', minute: 8, type: 'reasoning', title: 'Primary hypothesis promoted', detail: 'The dashboard should expose cognition before infrastructure.', confidence: 88 },
  { id: 'e3', minute: 14, type: 'agent', title: 'Telemetry scout delegated', detail: 'Scout assigned to enumerate available event sources and heartbeat contracts.', confidence: 96 },
  { id: 'e4', minute: 21, type: 'tool', title: 'Repository inspection completed', detail: 'Target repository was empty; greenfield implementation selected.', confidence: 100 },
  { id: 'e5', minute: 29, type: 'governance', title: 'Intervention gate created', detail: 'Destructive controls require preview and explicit confirmation.', confidence: 98 },
  { id: 'e6', minute: 36, type: 'reasoning', title: 'Contradiction detected', detail: 'Sub-second updates conflict with low-bandwidth mobile operation.', confidence: 72 },
  { id: 'e7', minute: 43, type: 'memory', title: 'Procedure consolidated', detail: 'Adaptive update cadence added to the implementation contract.', confidence: 90 },
  { id: 'e8', minute: 52, type: 'agent', title: 'Consensus reached', detail: 'Six active agents agree on the current execution plan.', confidence: 91 },
  { id: 'e9', minute: 59, type: 'tool', title: 'Dashboard snapshot emitted', detail: 'Current cognitive state serialized for replay and comparison.', confidence: 95 },
];

export const hypotheses = [
  { name: 'Cognitive observability must lead', confidence: 88, status: 'primary', evidence: 12, contradictions: 1 },
  { name: 'Infrastructure should remain subordinate', confidence: 81, status: 'supporting', evidence: 9, contradictions: 2 },
  { name: 'A tile-first UI improves scan speed', confidence: 31, status: 'rejected', evidence: 3, contradictions: 8 },
];

export const memoryClusters = [
  { name: 'Dashboard architecture', activation: 92, memories: 148, change: 12 },
  { name: 'CAPT governance', activation: 77, memories: 94, change: 4 },
  { name: 'Agent coordination', activation: 69, memories: 121, change: -3 },
  { name: 'Telemetry contracts', activation: 84, memories: 76, change: 18 },
];

export const agents = [
  { name: 'Architect', role: 'System model', load: 82, trust: 96, state: 'active' },
  { name: 'Scout', role: 'Discovery', load: 61, trust: 88, state: 'active' },
  { name: 'Verifier', role: 'Evidence', load: 73, trust: 94, state: 'active' },
  { name: 'Governor', role: 'Policy', load: 38, trust: 99, state: 'watching' },
  { name: 'Executor', role: 'Actions', load: 91, trust: 86, state: 'blocked' },
  { name: 'Reflector', role: 'Learning', load: 47, trust: 92, state: 'active' },
];
