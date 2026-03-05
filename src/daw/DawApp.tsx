import { useEffect } from 'react';
import './daw.css';
import { ChannelStrip } from '@/daw/components/ChannelStrip/ChannelStrip';
import { LibraryPanel } from '@/daw/components/Library/LibraryPanel';
import { MeshGradientBg } from '@/daw/components/MeshGradientBg';
import { PianoRollModal } from '@/daw/components/PianoRoll/PianoRollModal';
import { PitchEditorModal } from '@/daw/components/PitchEditor/PitchEditorModal';
import { StudioView } from '@/daw/components/Studio/StudioView';
import { TimelineWithHeaders } from '@/daw/components/Timeline/TimelineWithHeaders';
import { SettingsModal } from '@/daw/components/Transport/SettingsModal';
import { TransportBar } from '@/daw/components/Transport/TransportBar';
import { useAudioEngine } from '@/daw/hooks/useAudioEngine';
import {
  useKeyboardShortcuts,
  loadSessionOnStartup,
} from '@/daw/hooks/useKeyboardShortcuts';
import { useMidiInputRouting } from '@/daw/hooks/useMidiInputRouting';
import { usePlaybackEngine } from '@/daw/hooks/usePlaybackEngine';
import { useTheme } from '@/daw/hooks/useTheme';
import { useTransport } from '@/daw/hooks/useTransport';
import { useStore } from '@/daw/store';
import { initUndoTracking } from '@/daw/store/undoMiddleware';

export function DawApp() {
  const { isReady, initEngine } = useAudioEngine();
  useTransport();
  usePlaybackEngine(isReady);
  useKeyboardShortcuts();
  useMidiInputRouting();
  useTheme();
  const currentView = useStore((s) => s.currentView);

  useEffect(() => {
    loadSessionOnStartup();
    initUndoTracking();
  }, []);

  useEffect(() => {
    if (isReady) return;
    const handler = () => {
      initEngine();
    };
    document.addEventListener('click', handler, { once: true });
    document.addEventListener('keydown', handler, { once: true });
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [isReady, initEngine]);

  return (
    <div
      className="daw-root absolute inset-0 flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <MeshGradientBg />
      <TransportBar onInit={initEngine} isReady={isReady} />
      {currentView === 'arrange' ? (
        <>
          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-1 flex-col overflow-hidden">
              <TimelineWithHeaders />
            </div>
            <LibraryPanel />
          </div>
          <ChannelStrip />
          <PianoRollModal />
          <PitchEditorModal />
        </>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <StudioView isReady={isReady} />
          <LibraryPanel />
        </div>
      )}
      <SettingsModal />
    </div>
  );
}
