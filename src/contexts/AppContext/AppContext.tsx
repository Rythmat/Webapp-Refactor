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
  useEffect(() => {
    void ensureAtlasContent().catch(() => undefined);
    void ensureSongContent().catch(() => undefined);
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
