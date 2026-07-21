export interface DashboardConfig {
  mode: 'simulated' | 'polling' | 'stream';
  apiBaseUrl: string;
  streamUrl?: string;
  pollIntervalMs: number;
  staleAfterMs: number;
}

function numberFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const modeValue = import.meta.env.VITE_CAPT_TELEMETRY_MODE;
const mode: DashboardConfig['mode'] = modeValue === 'polling' || modeValue === 'stream' ? modeValue : 'simulated';

export const dashboardConfig: DashboardConfig = {
  mode,
  apiBaseUrl: import.meta.env.VITE_CAPT_API_BASE_URL || '/api',
  streamUrl: import.meta.env.VITE_CAPT_STREAM_URL || undefined,
  pollIntervalMs: numberFromEnv(import.meta.env.VITE_CAPT_POLL_INTERVAL_MS, 2_000),
  staleAfterMs: numberFromEnv(import.meta.env.VITE_CAPT_STALE_AFTER_MS, 15_000),
};
