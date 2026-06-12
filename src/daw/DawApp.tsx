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
import { useStudioMonitor } from '@/daw/hooks/useStudioMonitor';
import { useCollabAudioLoader } from '@/daw/hooks/useCollabAudioLoader';
import { usePlaybackEngine } from '@/daw/hooks/usePlaybackEngine';
import { useTheme } from '@/daw/hooks/useTheme';
import { useTransport } from '@/daw/hooks/useTransport';
import { useStore } from '@/daw/store';
import { initUndoTracking } from '@/daw/store/undoMiddleware';
import { CollabProvider, useCollab } from '@/daw/collab/CollabProvider';
import { UserList } from '@/daw/collab/ui/UserList';
import { ChatPanel } from '@/daw/collab/ui/ChatPanel';

function DawAppInner() {
  const { isReady, initEngine } = useAudioEngine();
  const authToken = useAuthToken();
  const { joinRoom, joinRoomById, joinRoomAwaitingHost } = useCollab();
  useTransport();
  usePlaybackEngine(isReady, authToken);
  useKeyboardShortcuts(authToken);
  useAutosave();
  useMidiInputRouting();
  useStudioMonitor(isReady, authToken);
  useCollabAudioLoader(authToken);
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

    // Handed off from a jam room into a collaborative Studio session. The host
    // arrives with `?jam=1&collab=<code>&host=1` (carries the jam tracks in and
    // creates the room); invited players arrive with `?collab=<code>` and join.
    // Connecting to PartyKit needs an auth token, so wait for it like a project.
    const collabCode = params.get('collab');
    if (collabCode) {
      if (!authToken) return;
      bootedRef.current = true;
      const isCollabHost = params.get('host') === '1';
      clearLocalSession();
      resetSessionToEmpty();
      // The host imports the recorded jam, then seeds the shared doc with it on
      // create; joiners receive those tracks via the initial Yjs sync.
      if (isJamImport) importPendingJamSession();
      if (isCollabHost) {
        joinRoom(
          collabCode,
          'owner',
          undefined,
          `studio-${collabCode}`,
          collabCode,
        );
      } else {
        // Joiners may beat the host to PartyKit; retry until the room exists.
        joinRoomAwaitingHost(collabCode);
      }
      clearQuery();
      return;
    }

    // No boot intent in the URL, yet the store still holds a collab room
    // identity: this is an SPA back/forward navigation. Going back unmounted the
    // studio route, which ran teardown() — the socket closed, so peers saw us
    // leave — but the store is a module singleton, so roomId/role survived (a
    // real Leave clears them via _clearCollab; this does not). Reconnect to the
    // same room so peers see us return and we share their live document instead
    // of drifting on a frozen local copy. PartyKit needs the auth token, so wait
    // for it like a project. Hosts are excluded: a host leaving closes the room
    // for everyone, so there is nothing to rejoin.
    const { roomId: activeRoomId, collabRole } = useStore.getState();
    if (activeRoomId && collabRole !== 'owner') {
      if (!authToken) return;
      bootedRef.current = true;
      joinRoomById(activeRoomId, collabRole);
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
  }, [authToken, joinRoom, joinRoomById, joinRoomAwaitingHost]);

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

  // ── Disable trackpad swipe-to-navigate inside the DAW ───────────────────
  // A two-finger horizontal swipe on a Mac trackpad triggers the browser's
  // back/forward history navigation, which was kicking users out of studio
  // (and collab/jam) sessions mid-edit. While the DAW is mounted we set
  // `overscroll-behavior-x: none` on the document root, which suppresses the
  // history-navigation gesture WITHOUT affecting in-component scrolling: a
  // horizontal swipe over the timeline or piano roll still pans that view (the
  // grid scrolls natively, the timeline via its own wheel handler), and a swipe
  // over any other area of the session simply does nothing. The previous value
  // is restored on unmount so the rest of the site keeps native swipe-back.
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overscrollBehaviorX;
    root.style.overscrollBehaviorX = 'none';
    return () => {
      root.style.overscrollBehaviorX = prev;
    };
  }, []);

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
              <TimelineWithHeaders isReady={isReady} />
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
