import { useEffect, useRef } from 'react';
import { getCurrentAppSessionId } from '@/auth/app-session-store';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { telemetryClient } from './client';
import { trackSessionStarted } from './hooks/useTelemetryProduct';
import { useTelemetryRouting } from './hooks/useTelemetryRouting';

export const TelemetryProvider = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuthContext();
  const hasTrackedSession = useRef(false);

  useEffect(() => {
    const appSessionId = getCurrentAppSessionId();
    telemetryClient.configure({ token: token ?? null, appSessionId: appSessionId ?? null });
  }, [token]);

  useEffect(() => {
    if (!hasTrackedSession.current) {
      hasTrackedSession.current = true;
      trackSessionStarted();
    }
  }, []);

  useTelemetryRouting();

  return <>{children}</>;
};
