import { useEffect } from 'react';
import './daw.css';
import { ChannelStrip } from '@/daw/components/ChannelStrip/ChannelStrip';
import { LibraryPanel } from '@/daw/components/Library/LibraryPanel';
import { MeshGradientBg } from '@/daw/components/MeshGradientBg';
import { PianoRollModal } from '@/daw/components/PianoRoll/PianoRollModal';
import { PitchEditorModal } from '@/daw/components/PitchEditor/PitchEditorModal';
import { LeadSheetView } from '@/daw/components/LeadSheet/LeadSheetView';
import { StudioView } from '@/daw/components/Studio/StudioView';
import { TimelineWithHeaders } from '@/daw/components/Timeline/TimelineWithHeaders';
import { PrismSuggestionModal } from '@/daw/components/Prism/PrismSuggestionModal';
import { SettingsModal } from '@/daw/components/Transport/SettingsModal';
import { TransportBar } from '@/daw/components/Transport/TransportBar';
import { useAudioEngine } from '@/daw/hooks/useAudioEngine';
import {
  useKeyboardShortcuts,
  loadSessionOnStartup,
} from '@/daw/hooks/useKeyboardShortcuts';
import { useAudioChordDetection } from '@/daw/hooks/useAudioChordDetection';
import { useMidiInputRouting } from '@/daw/hooks/useMidiInputRouting';
import { usePlaybackEngine } from '@/daw/hooks/usePlaybackEngine';
import { useTheme } from '@/daw/hooks/useTheme';
import { useTransport } from '@/daw/hooks/useTransport';
import { useStore } from '@/daw/store';
import { initUndoTracking } from '@/daw/store/undoMiddleware';
import { CollabProvider } from '@/daw/collab/CollabProvider';
import { UserList } from '@/daw/collab/ui/UserList';
import { ChatPanel } from '@/daw/collab/ui/ChatPanel';

function DawAppInner() {
  const { isReady, initEngine } = useAudioEngine();
  useTransport();
  usePlaybackEngine(isReady);
  useKeyboardShortcuts();
  useMidiInputRouting();
  useAudioChordDetection();
  useTheme();
  const currentView = useStore((s) => s.currentView);
  const userListOpen = useStore((s) => s.userListOpen);
  const toggleUserList = useStore((s) => s.toggleUserList);
  const chatPanelOpen = useStore((s) => s.chatPanelOpen);
  const toggleChatPanel = useStore((s) => s.toggleChatPanel);
  const isCollabActive = useStore((s) => s.isCollabActive);

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
      className="daw-root flex-1 min-h-0 w-full flex flex-col overflow-hidden"
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
            {isCollabActive && (
              <>
                <UserList open={userListOpen} onClose={toggleUserList} />
                <ChatPanel open={chatPanelOpen} onClose={toggleChatPanel} />
              </>
            )}
          </div>
          <ChannelStrip />
          <PianoRollModal />
          <PitchEditorModal />
        </>
      ) : currentView === 'leadsheet' ? (
        <LeadSheetView />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <StudioView isReady={isReady} />
          <LibraryPanel />
          {isCollabActive && (
            <>
              <UserList open={userListOpen} onClose={toggleUserList} />
              <ChatPanel open={chatPanelOpen} onClose={toggleChatPanel} />
            </>
          )}
        </div>
      )}
      <SettingsModal />
      <PrismSuggestionModal />
    </div>
  );
}

export function DawApp() {
  return (
    <CollabProvider>
      <DawAppInner />
    </CollabProvider>
  );
}
