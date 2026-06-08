import { useEffect, useRef } from 'react';
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
import { RecordingLimitModal } from '@/daw/components/Transport/RecordingLimitModal';
import { TransportBar } from '@/daw/components/Transport/TransportBar';
import { useAudioEngine } from '@/daw/hooks/useAudioEngine';
import { useAutosave } from '@/daw/hooks/useAutosave';
import { useKeyboardShortcuts } from '@/daw/hooks/useKeyboardShortcuts';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import {
  clearLocalSession,
  restoreLocalSessionIfPresent,
} from '@/lib/studio-projects/localSession';
import { studioProjectsApi } from '@/lib/studio-projects/api';
import {
  deserializeCloudProject,
  resetSessionToEmpty,
} from '@/daw/persistence/SessionSerializer';
import { loadCloudProjectAudio } from '@/lib/studio-assets/load-audio';
import { importPendingJamSession } from '@/daw/jam-import/importJamSession';
import { StudioRoutes } from '@/constants/routes';
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
  const authToken = useAuthToken();
  useTransport();
  usePlaybackEngine(isReady, authToken);
  useKeyboardShortcuts(authToken);
  useAutosave();
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
    initUndoTracking();
  }, []);

  // Decide what to load when the studio boots. The home page routes here with
  // `?project=<id>` to open a saved project, or `?new=1` to start fresh; absent
  // either, we fall back to crash-recovery restore from localStorage. The store
  // is a module singleton that survives SPA navigation, so an explicit New
  // Project must reset it — a stale project would otherwise bleed through.
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const projectParam = params.get('project');
    const isNew = params.get('new') === '1';
    const isJamImport = params.get('jam') === '1';

    // Strip the boot intent from the URL so a later refresh just restores the
    // (now-current) local session instead of re-running this.
    const clearQuery = () =>
      window.history.replaceState({}, '', StudioRoutes.root.definition);

    if (projectParam) {
      // Opening a cloud project needs a token; wait for it to resolve rather
      // than consuming the boot intent prematurely.
      if (!authToken) return;
      bootedRef.current = true;
      void (async () => {
        try {
          const project = await studioProjectsApi.get(authToken, projectParam);
          deserializeCloudProject(project);
          // Audio buffers download + decode in the background; clips appear in
          // the timeline immediately and become playable as bytes arrive.
          void loadCloudProjectAudio(authToken).catch((err) => {
            console.error('Audio asset load failed', err);
          });
        } catch (err) {
          console.error('Failed to open project from home', err);
          // Fall back to whatever in-progress session exists locally.
          restoreLocalSessionIfPresent();
        } finally {
          clearQuery();
        }
      })();
      return;
    }

    bootedRef.current = true;
    if (isJamImport) {
      // Arrived from a jam room: start a fresh project, then add the recorded
      // jam as one MIDI track per participant.
      clearLocalSession();
      resetSessionToEmpty();
      importPendingJamSession();
      clearQuery();
      return;
    }
    if (isNew) {
      // Drop the local autosave so nothing restores the project we're leaving.
      clearLocalSession();
      resetSessionToEmpty();
      clearQuery();
      return;
    }

    // Default: restore the last in-progress session from localStorage, if any.
    // Cloud remains the source of truth for explicit saves; this is crash
    // recovery.
    restoreLocalSessionIfPresent();
  }, [authToken]);

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
      <RecordingLimitModal />
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
