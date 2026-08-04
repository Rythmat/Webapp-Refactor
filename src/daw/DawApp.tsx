import { useEffect, useRef } from 'react';
import { DEV_AUTH_BYPASS } from '@/auth/devBypass';
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
import { TutorialLayer } from '@/daw/components/Tutorial/TutorialLayer';
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
import { useGuitarMidiDetection } from '@/daw/hooks/useGuitarMidiDetection';
import { useMidiInputRouting } from '@/daw/hooks/useMidiInputRouting';
import { useStudioMonitor } from '@/daw/hooks/useStudioMonitor';
import { useCollabAudioLoader } from '@/daw/hooks/useCollabAudioLoader';
import { usePlaybackEngine } from '@/daw/hooks/usePlaybackEngine';
import { useTheme } from '@/daw/hooks/useTheme';
import { useTransport } from '@/daw/hooks/useTransport';
import { useStore } from '@/daw/store';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { initUndoTracking } from '@/daw/store/undoMiddleware';
import { CollabProvider, useCollab } from '@/daw/collab/CollabProvider';
import { UserList } from '@/daw/collab/ui/UserList';
import { ChatPanel } from '@/daw/collab/ui/ChatPanel';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { getDemoProject } from '@/daw/data/demoProjects';
import { getSong } from '@/curriculum/data/songs';
import { seedStudioFromSong } from '@/features/songs/seedStudioFromSong';
import { seedStudioFromPracticeTrack } from '@/features/practiceTracks/seedStudioFromPracticeTrack';
import type { DiatonicMode } from '@/features/practiceTracks/generatePracticeTrack';
import { isDiatonicMode } from '@prism/engine';
import { showSuccess, showError } from '@/util/toast';

function DawAppInner() {
  const { isReady, initEngine } = useAudioEngine();
  const authToken = useAuthToken();
  const { appUser } = useAuthContext();
  const { joinRoom, joinRoomById, joinRoomAwaitingHost, createAndJoinRoom } =
    useCollab();
  useTransport();
  usePlaybackEngine(isReady, authToken);
  useKeyboardShortcuts(authToken);
  useAutosave();
  useMidiInputRouting();
  useStudioMonitor(isReady, authToken);
  useCollabAudioLoader(authToken);
  useAudioChordDetection();
  useGuitarMidiDetection();
  useTheme();
  const currentView = useStore((s) => s.currentView);
  const userListOpen = useStore((s) => s.userListOpen);
  const toggleUserList = useStore((s) => s.toggleUserList);
  const chatPanelOpen = useStore((s) => s.chatPanelOpen);
  const toggleChatPanel = useStore((s) => s.toggleChatPanel);
  const isCollabActive = useStore((s) => s.isCollabActive);
  const connectionStatus = useStore((s) => s.connectionStatus);
  const roomId = useStore((s) => s.roomId);
  const projectName = useStore((s) => s.projectName);

  // Dashboard-initiated collaboration (`?collab=new`): collaborators the user
  // picked on the Studio Dashboard are auto-invited once the freshly-minted room
  // connects, and the Invite modal (owned by CollabToolbar) opens for the code.
  const pendingInviteIdsRef = useRef<string[] | null>(null);
  const invitesSentRef = useRef(false);

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
    // (now-current) local session instead of re-running this. Stays on the
    // editor route (`/studio/editor`) — `/studio` is now the Studio Dashboard.
    const clearQuery = () =>
      window.history.replaceState({}, '', StudioRoutes.editor.definition);

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

    // Studio Dashboard "Project Templates" tile: start a fresh session preloaded
    // with a genre template's tracks/BPM. Leaves projectId null so the first Save
    // mints a brand-new cloud project.
    const templateParam = params.get('template');
    if (templateParam) {
      bootedRef.current = true;
      clearLocalSession();
      resetSessionToEmpty();
      useStore.getState().loadProjectTemplate(templateParam);
      clearQuery();
      return;
    }

    // Studio Dashboard "Demo Projects" tile: open a curated demo as an editable
    // copy — hydrate from the bundled project, then null the projectId + retitle
    // so Save writes a new project and the demo original is never overwritten.
    const demoParam = params.get('demo');
    if (demoParam) {
      bootedRef.current = true;
      clearLocalSession();
      resetSessionToEmpty();
      const demo = getDemoProject(demoParam);
      if (demo) {
        deserializeCloudProject(demo.bundle);
        useStore.getState().setProjectId(null);
        useStore.getState().setProjectName(demo.label);
      } else {
        showError('That demo could not be found.');
      }
      clearQuery();
      return;
    }

    // Handed off from a classroom app-route slide (`studio:song:<id>`) or a Song
    // page: seed the editor with a specific song's chart in a fresh session, no
    // cloud project — the first Save mints a new one.
    const songParam = params.get('song');
    if (songParam) {
      bootedRef.current = true;
      clearLocalSession();
      resetSessionToEmpty();
      const song = getSong(songParam);
      if (song) {
        seedStudioFromSong(song);
      } else {
        showError('That song could not be found.');
      }
      clearQuery();
      return;
    }

    // Graduated from a Theory mode/lesson (Learn > Theory) into a pre-seeded
    // Practice Track: generated chords/bass/beat plus one open track (melody
    // or chords, whichever the student didn't just practice) for them to fill
    // in themselves. `practiceOpen` defaults to `melody` when missing/invalid
    // (e.g. the evergreen sidebar entry, which can't know which section the
    // student most recently finished).
    const practiceModeParam = params.get('practiceMode');
    if (practiceModeParam) {
      bootedRef.current = true;
      clearLocalSession();
      resetSessionToEmpty();
      if (isDiatonicMode(practiceModeParam)) {
        const rootParam = Number(params.get('practiceRoot'));
        const root = Number.isFinite(rootParam)
          ? Math.max(0, Math.min(11, Math.round(rootParam)))
          : 0;
        const openParam = params.get('practiceOpen');
        const openTrack: 'melody' | 'chords' =
          openParam === 'chords' ? 'chords' : 'melody';
        // seedStudioFromPracticeTrack fetches + parses the fixed Drums
        // groove's .mid file, so it's async — await it the same way the
        // `project` branch above awaits its cloud fetch.
        void (async () => {
          try {
            await seedStudioFromPracticeTrack(
              practiceModeParam as DiatonicMode,
              root,
              openTrack,
            );
          } finally {
            clearQuery();
          }
        })();
      } else {
        showError('That practice track mode could not be found.');
        clearQuery();
      }
      return;
    }

    // Handed off from a jam room into a collaborative Studio session. The host
    // arrives with `?jam=1&collab=<code>&host=1` (carries the jam tracks in and
    // creates the room); invited players arrive with `?collab=<code>` and join.
    // The Studio Dashboard "Start a Session" flow arrives with `?collab=new`
    // (optionally `&invite=<id,id>`): mint a fresh room and auto-invite.
    // Connecting to PartyKit needs an auth token, so wait for it like a project.
    const collabCode = params.get('collab');
    if (collabCode) {
      if (!authToken) return;
      bootedRef.current = true;

      if (collabCode === 'new') {
        clearLocalSession();
        resetSessionToEmpty();
        const inviteParam = params.get('invite');
        pendingInviteIdsRef.current = inviteParam
          ? inviteParam
              .split(',')
              .map((s) => decodeURIComponent(s.trim()))
              .filter(Boolean)
          : [];
        createAndJoinRoom();
        // Surface the room code + let the host invite more people (the single
        // Invite modal is owned by CollabToolbar).
        useStore.getState()._setInviteRequested(true);
        clearQuery();
        return;
      }

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
  }, [
    authToken,
    joinRoom,
    joinRoomById,
    joinRoomAwaitingHost,
    createAndJoinRoom,
  ]);

  // Once a dashboard-initiated collab room (`?collab=new`) is connected, send the
  // invites the user queued on the Studio Dashboard. Runs once (invitesSentRef).
  useEffect(() => {
    const ids = pendingInviteIdsRef.current;
    if (!ids || invitesSentRef.current) return;
    if (
      !isCollabActive ||
      connectionStatus !== 'connected' ||
      !roomId ||
      !authToken
    ) {
      return;
    }
    invitesSentRef.current = true;
    pendingInviteIdsRef.current = null;
    if (ids.length === 0) return;
    void (async () => {
      let sent = 0;
      for (const targetUserId of ids) {
        try {
          const res = await fetch(`/api/collab/rooms/${roomId}/invite-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              targetUserId,
              targetUserName: appUser?.nickname ?? 'Someone',
              role: 'editor',
              projectName,
            }),
          });
          if (res.ok) sent += 1;
        } catch {
          // Per-invite failure is non-fatal; the summary toast reflects the count.
        }
      }
      if (sent > 0) {
        showSuccess(`Invited ${sent} collaborator${sent > 1 ? 's' : ''}`);
      }
      if (sent < ids.length) {
        showError(
          `${ids.length - sent} invite${ids.length - sent > 1 ? 's' : ''} could not be sent`,
        );
      }
    })();
  }, [
    isCollabActive,
    connectionStatus,
    roomId,
    authToken,
    appUser,
    projectName,
  ]);

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

  // DEV-only: expose the stores for automated verification (e.g. Playwright).
  // Gated on the bypass flag so it folds out of production builds (see devBypass).
  useEffect(() => {
    if (!DEV_AUTH_BYPASS) return;
    const w = window as unknown as {
      __MA_STORE__?: unknown;
      __MA_SYNTH_STORE__?: unknown;
    };
    w.__MA_STORE__ = useStore;
    w.__MA_SYNTH_STORE__ = useSynthStore;
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
      <TutorialLayer />
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
