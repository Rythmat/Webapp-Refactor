import { useQuery } from '@tanstack/react-query';
import SuperJSON from 'superjson';
import { getCurrentAppSessionId } from '@/auth/app-session-store';
import { Env } from '@/constants/env';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';

// ─── Response Types ───────────────────────────────────────────────────────────

export interface TelemetryOverview {
  totalEvents: number;
  apiSuccessRate: number;
  apiFailureRate: number;
  avgApiLatencyMs: number;
  p95ApiLatencyMs: number;
  totalRoutingEvents: number;
  totalAudioEvents: number;
  totalProductEvents: number;
  recentErrorCount: number;
}

export interface ApiTimeBucket {
  bucket: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

export interface SlowestRoute {
  route: string;
  avgLatencyMs: number;
  p95LatencyMs: number;
  count: number;
}

export interface FailingRoute {
  route: string;
  failureCount: number;
  failureRate: number;
  count: number;
}

export interface ApiPerformanceData {
  timeSeries: ApiTimeBucket[];
  slowestRoutes: SlowestRoute[];
  failingRoutes: FailingRoute[];
}

export interface RoutingTimeBucket {
  bucket: string;
  count: number;
}

export interface TopRoute {
  route: string;
  count: number;
}

export interface RoutingAnalyticsData {
  timeSeries: RoutingTimeBucket[];
  topRoutes: TopRoute[];
}

export interface AudioTimeBucket {
  bucket: string;
  inputCount: number;
  triggerCount: number;
  successCount: number;
  failureCount: number;
}

export interface AudioFailureType {
  errorName: string;
  count: number;
}

export interface AudioRecentError {
  timestamp: string;
  eventName: string;
  errorName: string;
  errorMessage: string;
  route: string;
  lessonId: string | null;
  activityId: string | null;
}

export interface AudioAnalyticsData {
  timeSeries: AudioTimeBucket[];
  avgLatencyMs: number;
  failuresByType: AudioFailureType[];
  recentErrors: AudioRecentError[];
}

export interface LearningFunnel {
  lessonStarted: number;
  activityStarted: number;
  activityCompleted: number;
  activityFailed: number;
  lessonCompleted: number;
}

export interface SubscriptionFunnel {
  paywallViewed: number;
  checkoutStarted: number;
  subscriptionActivated: number;
}

export interface PerLessonStat {
  lessonId: string;
  started: number;
  completed: number;
  failureRate: number;
}

export interface ProductFunnelData {
  learningFunnel: LearningFunnel;
  subscriptionFunnel: SubscriptionFunnel;
  perLessonStats: PerLessonStat[];
}

export interface TelemetryError {
  id: string;
  timestamp: string;
  category: string;
  eventName: string;
  route: string | null;
  lessonId: string | null;
  activityId: string | null;
  errorName: string;
  errorMessage: string;
  userId: string | null;
  sessionId: string | null;
  traceId: string | null;
}

export interface TelemetryErrorsData {
  errors: TelemetryError[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function adminPath(path: string) {
  const apiBase = Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true }) ?? '';
  return `${apiBase}/api/admin${path}`;
}

async function fetchWithAuth<T = unknown>(
  url: string,
  token: string,
): Promise<T> {
  const appSessionId = getCurrentAppSessionId();
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(appSessionId ? { 'X-App-Session': appSessionId } : {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed: ${res.status}`,
    );
  }

  const text = await res.text();
  return SuperJSON.parse(text) as T;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      sp.set(key, String(value));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useAdminTelemetryOverview = (params: {
  from?: string;
  to?: string;
}) => {
  const { token } = useAuthContext();

  return useQuery<TelemetryOverview>({
    queryKey: ['admin', 'telemetry', 'overview', params],
    queryFn: () =>
      fetchWithAuth<TelemetryOverview>(
        adminPath(`/telemetry/overview${buildQuery(params)}`),
        token!,
      ),
    enabled: !!token,
  });
};

export const useAdminApiPerformance = (params: {
  from?: string;
  to?: string;
  route?: string;
  method?: string;
  statusClass?: string;
}) => {
  const { token } = useAuthContext();

  return useQuery<ApiPerformanceData>({
    queryKey: ['admin', 'telemetry', 'api-performance', params],
    queryFn: () =>
      fetchWithAuth<ApiPerformanceData>(
        adminPath(`/telemetry/api-performance${buildQuery(params)}`),
        token!,
      ),
    enabled: !!token,
  });
};

export const useAdminRoutingAnalytics = (params: {
  from?: string;
  to?: string;
}) => {
  const { token } = useAuthContext();

  return useQuery<RoutingAnalyticsData>({
    queryKey: ['admin', 'telemetry', 'routing', params],
    queryFn: () =>
      fetchWithAuth<RoutingAnalyticsData>(
        adminPath(`/telemetry/routing${buildQuery(params)}`),
        token!,
      ),
    enabled: !!token,
  });
};

export const useAdminAudioAnalytics = (params: {
  from?: string;
  to?: string;
}) => {
  const { token } = useAuthContext();

  return useQuery<AudioAnalyticsData>({
    queryKey: ['admin', 'telemetry', 'audio', params],
    queryFn: () =>
      fetchWithAuth<AudioAnalyticsData>(
        adminPath(`/telemetry/audio${buildQuery(params)}`),
        token!,
      ),
    enabled: !!token,
  });
};

export const useAdminProductFunnel = (params: {
  from?: string;
  to?: string;
}) => {
  const { token } = useAuthContext();

  return useQuery<ProductFunnelData>({
    queryKey: ['admin', 'telemetry', 'product-funnel', params],
    queryFn: () =>
      fetchWithAuth<ProductFunnelData>(
        adminPath(`/telemetry/product-funnel${buildQuery(params)}`),
        token!,
      ),
    enabled: !!token,
  });
};

export const useAdminTelemetryErrors = (params: {
  from?: string;
  to?: string;
  category?: string;
  limit?: number;
}) => {
  const { token } = useAuthContext();

  return useQuery<TelemetryErrorsData>({
    queryKey: ['admin', 'telemetry', 'errors', params],
    queryFn: () =>
      fetchWithAuth<TelemetryErrorsData>(
        adminPath(`/telemetry/errors${buildQuery(params as Record<string, string | number | undefined>)}`),
        token!,
      ),
    enabled: !!token,
  });
};
