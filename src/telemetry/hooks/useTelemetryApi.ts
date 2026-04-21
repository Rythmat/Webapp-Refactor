import { telemetryClient } from '../client';
import { ApiEvents } from '../types';

export function trackApiRequest(params: {
  route: string;
  method: string;
  statusCode: number;
  success: boolean;
  durationMs: number;
  errorName?: string;
  errorMessage?: string;
}): void {
  try {
    telemetryClient.track({
      category: 'api',
      eventName: ApiEvents.API_REQUEST,
      route: params.route,
      method: params.method,
      statusCode: params.statusCode,
      success: params.success,
      durationMs: params.durationMs,
      errorName: params.errorName ?? null,
      errorMessage: params.errorMessage ?? null,
    });
  } catch {
    // Silent failure
  }
}
