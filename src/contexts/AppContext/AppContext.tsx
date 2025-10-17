import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthContextProvider } from '../AuthContext';
import { MusicAtlasContextProvider } from '../MusicAtlasContext';
import { GlobalMusicAtlasContext } from '../MusicAtlasContext/MusicAtlasContext';
import { NavigationContextProvider } from '../NavigationContext';
import { PianoProvider } from '../PianoContext';
import { PlaybackProvider } from '../PlaybackContext/PlaybackContext';

export const AppContext = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <NavigationContextProvider>
        <GlobalMusicAtlasContext>
          <AuthContextProvider>
            <MusicAtlasContextProvider>
              <PlaybackProvider>
                <PianoProvider>
                  <SidebarProvider>
                    <TooltipProvider>{children}</TooltipProvider>
                  </SidebarProvider>
                </PianoProvider>
              </PlaybackProvider>
            </MusicAtlasContextProvider>
          </AuthContextProvider>
        </GlobalMusicAtlasContext>
      </NavigationContextProvider>
      <Toaster />
    </>
  );
};
