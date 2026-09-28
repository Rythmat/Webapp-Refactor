import { useEffect } from 'react';
import { AudioEngineProvider } from '@/audio/react/AudioEngineProvider';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ensureAtlasContent } from '@/content/contentStore';
import { ensureSongContent } from '@/content/songStore';
import { TelemetryProvider } from '@/telemetry/TelemetryProvider';
import { AuthContextProvider } from '../AuthContext';
import { MusicAtlasContextProvider } from '../MusicAtlasContext';
import { GlobalMusicAtlasContext } from '../MusicAtlasContext/MusicAtlasContext';
import { NavigationContextProvider } from '../NavigationContext';
import { PianoProvider } from '../PianoContext';
import { PlaybackProvider } from '../PlaybackContext/PlaybackContext';

export const AppContext = ({ children }: { children: React.ReactNode }) => {
  // Warm the published content bundle in the background, so by the time anyone
  // navigates to the globe or search the fetch has already landed and
  // <ContentGate> resolves without ever showing a skeleton. Deliberately not
  // awaited — a slow or failed CDN must not delay app boot, and the gate is
  // what actually guarantees correctness.
  // The globe's own two downloads — its code chunk and its map geometry — do
  // not depend on the content bundle, but used to start only after it (and
  // after the route had mounted), which is why the globe's first frame sat
  // behind five serial round trips. Kicked off here they overlap everything
  // else. All are idempotent and memoised at module scope.
  useEffect(() => {
    void ensureAtlasContent().catch(() => undefined);
    void ensureSongContent().catch(() => undefined);

    const warmGlobe = () => {
      void import('@/components/atlas/data/geoLoader')
        .then((m) => m.prefetchGeoData())
        .catch(() => undefined);
      void import('react-globe.gl').catch(() => undefined);
    };
    // After first paint, so the prefetch competes with nothing the user sees.
    const idle = window.requestIdleCallback?.(warmGlobe, { timeout: 3000 });
    const timer =
      idle === undefined ? window.setTimeout(warmGlobe, 1500) : undefined;
    return () => {
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <NavigationContextProvider>
        <GlobalMusicAtlasContext>
          {/* The engine itself is a module singleton (see AudioEngine.ts), so
              it survives this provider remounting on cross-branch navigation. */}
          <AudioEngineProvider>
            <AuthContextProvider>
              <TelemetryProvider>
                <MusicAtlasContextProvider>
                  <PlaybackProvider>
                    <PianoProvider>
                      <SidebarProvider>
                        <TooltipProvider>{children}</TooltipProvider>
                      </SidebarProvider>
                    </PianoProvider>
                  </PlaybackProvider>
                </MusicAtlasContextProvider>
              </TelemetryProvider>
            </AuthContextProvider>
          </AudioEngineProvider>
        </GlobalMusicAtlasContext>
      </NavigationContextProvider>
      <Toaster />
    </>
  );
};
