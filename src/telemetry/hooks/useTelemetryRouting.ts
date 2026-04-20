import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Env } from '@/constants/env';
import { telemetryClient } from '../client';
import { RoutingEvents } from '../types';

export function useTelemetryRouting(): void {
  const location = useLocation();
  const previousPathnameRef = useRef<string | null>(null);
  const lastNavigationTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const routingEnabled = Env.get('VITE_TELEMETRY_ROUTING_ENABLED', { nullable: true });
    if (routingEnabled === 'false') return;

    const now = performance.now();
    const durationMs = previousPathnameRef.current !== null
      ? Math.round(now - lastNavigationTimeRef.current)
      : null;

    telemetryClient.track({
      category: 'routing',
      eventName: RoutingEvents.PAGE_NAVIGATION,
      route: location.pathname,
      durationMs,
      attributesJson: previousPathnameRef.current
        ? { previousRoute: previousPathnameRef.current }
        : null,
    });

    previousPathnameRef.current = location.pathname;
    lastNavigationTimeRef.current = now;
  }, [location.pathname]);
}
