import { Env } from '@/constants/env';
import { TelemetryEventPayload } from './types';

const FLUSH_INTERVAL_MS = 10_000;
const MAX_QUEUE_SIZE = 50;

type TelemetryClientConfig = {
  token: string | null;
  appSessionId: string | null;
};

let queue: TelemetryEventPayload[] = [];
let config: TelemetryClientConfig = { token: null, appSessionId: null };
let flushTimer: ReturnType<typeof setInterval> | null = null;

function getBaseUrl(): string {
  return Env.get('VITE_MUSIC_ATLAS_API_URL');
}

function isEnabled(): boolean {
  const value = Env.get('VITE_TELEMETRY_ENABLED', { nullable: true });
  return value !== 'false';
}

function getSamplingRate(): number {
  const value = Env.get('VITE_TELEMETRY_SAMPLING_RATE', { nullable: true });
  if (!value) return 1;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 1;
}

function shouldSample(): boolean {
  const rate = getSamplingRate();
  if (rate >= 1) return true;
  if (rate <= 0) return false;
  return Math.random() < rate;
}

async function flush(): Promise<void> {
  if (queue.length === 0) return;

  const events = [...queue];
  queue = [];

  try {
    const url = `${getBaseUrl()}/api/telemetry/ingest`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }
    if (config.appSessionId) {
      headers['X-App-Session'] = config.appSessionId;
    }

    const body = JSON.stringify({ events });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      keepalive: true,
    });

    if (!response.ok) {
      console.warn('[Telemetry] Flush failed with status', response.status);
    }
  } catch {
    // Telemetry must never break the app
  }
}

function flushWithBeacon(): void {
  if (queue.length === 0) return;

  const events = [...queue];
  queue = [];

  try {
    const url = `${getBaseUrl()}/api/telemetry/ingest`;
    const body = JSON.stringify({ events });

    const blob = new Blob([body], { type: 'application/json' });
    const sent = navigator.sendBeacon(url, blob);

    if (!sent) {
      // Fallback: try fetch with keepalive
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
          ...(config.appSessionId
            ? { 'X-App-Session': config.appSessionId }
            : {}),
        },
        body,
        keepalive: true,
      }).catch(() => {
        // Silent failure
      });
    }
  } catch {
    // Telemetry must never break the app
  }
}

function startFlushTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flush().catch(() => {
      // Silent failure
    });
  }, FLUSH_INTERVAL_MS);
}

function setupLifecycleListeners(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushWithBeacon();
    }
  });

  window.addEventListener('beforeunload', () => {
    flushWithBeacon();
  });
}

function track(event: TelemetryEventPayload): void {
  try {
    if (!isEnabled()) return;
    if (!shouldSample()) return;

    const enrichedEvent: TelemetryEventPayload = {
      ...event,
      timestamp: event.timestamp ?? new Date().toISOString(),
      sessionId: event.sessionId ?? config.appSessionId,
    };

    queue.push(enrichedEvent);

    if (queue.length >= MAX_QUEUE_SIZE) {
      flush().catch(() => {
        // Silent failure
      });
    }
  } catch {
    // Telemetry must never break the app
  }
}

function configure(opts: {
  token: string | null;
  appSessionId: string | null;
}): void {
  config = { ...opts };
  startFlushTimer();
}

// Initialize lifecycle listeners
setupLifecycleListeners();

export const telemetryClient = {
  configure,
  track,
  flush,
  isEnabled,
};
