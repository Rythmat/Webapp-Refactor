import { useEffect, useRef, useState } from 'react';
import { DEV_AUTH_BYPASS } from '@/auth/devBypass';
import './daw.css';
import { ChannelStrip } from '@/daw/components/ChannelStrip/ChannelStrip';
import { LibraryPanel } from '@/daw/components/Library/LibraryPanel';
import { PianoRollModal } from '@/daw/components/PianoRoll/PianoRollModal';
import { ChordAnalysisPrompt } from '@/daw/components/Library/ChordAnalysisPrompt';
import { LeadSheetView } from '@/daw/components/LeadSheet/LeadSheetView';
import { SetListUpdatePrompt } from '@/daw/components/LeadSheet/SendToSetList';
import { ScoreView } from '@/daw/components/Score/ScoreView';
import { PracticeTrackView } from '@/daw/components/Practice/PracticeTrackView';
import { StudioView } from '@/daw/components/Studio/StudioView';
import { TimelineWithHeaders } from '@/daw/components/Timeline/TimelineWithHeaders';
import { PrismSuggestionModal } from '@/daw/components/Prism/PrismSuggestionModal';
import { SettingsModal } from '@/daw/components/Transport/SettingsModal';
import { RecordingLimitModal } from '@/daw/components/Transport/RecordingLimitModal';
import { RecordGuard } from '@/daw/components/Transport/RecordGuard';
import { TutorialLayer } from '@/daw/components/Tutorial/TutorialLayer';
import { getTutorial } from '@/daw/components/Tutorial/tutorials';
import { UpgradeLessonDialog } from '@/daw/components/Tutorial/UpgradeLessonDialog';
import { useLessonAccess } from '@/daw/components/Tutorial/useLessonAccess';
import { TransportBar } from '@/daw/components/Transport/TransportBar';
import {
  useAudioEngine,
  useStartAudioOnGesture,
} from '@/daw/hooks/useAudioEngine';
import { useAutosave } from '@/daw/hooks/useAutosave';
import { useDawBodyTokens } from '@/daw/hooks/useDawBodyTokens';
import { useKeyboardShortcuts } from '@/daw/hooks/useKeyboardShortcuts';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import {
  announceKeptWork,
  announceKeptWorkFromReload,
  bootIntentError,
  readBootIntent,
  replaceSession,
  resumeLocalSession,
  type BootCatalog,
} from '@/lib/studio-projects/localSession';
import { studioProjectsApi } from '@/lib/studio-projects/api';
import { deserializeCloudProject } from '@/daw/persistence/SessionSerializer';
import { loadCloudProjectAudio } from '@/lib/studio-assets/load-audio';
import { importPendingJamSession } from '@/daw/jam-import/importJamSession';
import { loadJamSession } from '@/daw/jam-import/jamSession';
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
import { TooltipGroup } from '@/daw/ui/Tooltip';
import { UserList } from '@/daw/collab/ui/UserList';
import { ChatPanel } from '@/daw/collab/ui/ChatPanel';
import { getDemoProject } from '@/daw/data/demoProjects';
import { applyDemoDrums } from '@/daw/data/applyDemoDrums';
import { withDemoSynthPresets } from '@/daw/data/demoSynthPresets';
import { getProjectTemplate } from '@/daw/data/projectTemplates';
import { deriveChordRegionsFromSession } from '@/daw/store/prismSlice';
import { ensureSongContent } from '@/content/songStore';
import { getSong } from '@/curriculum/data/songs';
import { seedStudioFromSong } from '@/features/songs/seedStudioFromSong';
import { seedStudioFromPracticeTrack } from '@/features/practiceTracks/seedStudioFromPracticeTrack';
import {
  practiceSessionFor,
  resolvePracticeTrack,
} from '@/features/practiceTracks/genre/openGenrePracticeTrack';
import { seedStudioFromGenrePracticeTrack } from '@/features/practiceTracks/genre/seedStudioFromGenrePracticeTrack';
import { urlParamToSemitone } from '@/lib/musicKeyUrl';
import type { PracticeMode } from '@/features/practiceTracks/generatePracticeTrack';
import { isScaleLesson } from '@/lib/learn/scaleLessons';
import { isDiatonicMode } from '@prism/engine';
import { showError } from '@/util/toast';
import { audioEngine } from '@/daw/audio/AudioEngine';
import { DevProfiler, devMark, useDevCommitCount } from '@/daw/dev/DevProfiler';

// Dev-only: when the editor chunk finished evaluating (scripts/studio-perf).
devMark('module');

/** The ids a boot link can name, looked up where they live. */
const BOOT_CATALOG: BootCatalog = {
  hasTemplate: (id) => Boolean(getProjectTemplate(id)),
  hasDemo: (id) => Boolean(getDemoProject(id)),
  hasTutorial: (id) => Boolean(getTutorial(id)),
  isPracticeMode: (mode) => isDiatonicMode(mode) || isScaleLesson(mode),
  hasPendingJam: () => (loadJamSession()?.notes.length ?? 0) > 0,
};

/** Why a link was refused when the work it would replace can't be kept. */
const KEEP_REFUSED =
  "Your current work couldn't be set aside on this device, so it's still open. Save it, then try again.";

function DawAppInner() {
  const { isReady, initEngine } = useAudioEngine();
  const authToken = useAuthToken();
  // Kept work is filed per user, since a school Chromebook is shared, so a
  // boot that may keep work waits until auth knows who that is: the user, or
  // that nobody is signed in. ProtectedPage already waits for the user; this
  // keeps any other mount from filing their work under 'anon'.
  const auth = useAuthContext();
  const userId = auth.userId;
  const ownerKnown =
    userId !== null ||
    auth.error !== null ||
    (!auth.isAuth0Loading &&
      !auth.isBootstrapLoading &&
      !auth.isAuth0Authenticated);
  // A Prism lesson needs Premium (owner decision 8): its link waits until the
  // student's plan is known, then a free student gets the upgrade prompt.
  const lessonAccessFor = useLessonAccess();
  const [upgradeLessonId, setUpgradeLessonId] = useState<string | null>(null);
  const { joinRoom, joinRoomById, joinRoomAwaitingHost, createAndJoinRoom } =
    useCollab();
  useTransport();
  usePlaybackEngine(isReady, authToken);
  useKeyboardShortcuts(authToken);
  // MIDI input before the autosave: React cleans up effects in the order they
  // are declared, so a take kept as the editor closes (useMidiRecording) lands
  // while the autosave still listens, and its unmount flush writes it.
  useMidiInputRouting();
  useAutosave(userId);
  useStudioMonitor(isReady, authToken);
  useCollabAudioLoader(authToken);
  useDevCommitCount('DawAppInner');

  // Dev-only load-timeline marks for scripts/studio-perf.
  useEffect(() => devMark('mounted'), []);
  useEffect(() => {
    if (isReady) devMark('engine-ready');
  }, [isReady]);
  useAudioChordDetection();
  useGuitarMidiDetection();
  useTheme();
  // Portaled dialogs and popovers read the DAW palette from body.daw-active
  // (daw.css) while the editor is mounted. Interim: 2.1 moves the tokens to
  // :root and deletes the hook.
  useDawBodyTokens();
  const currentView = useStore((s) => s.currentView);
  const practiceSession = useStore((s) => s.practiceSession);
  const userListOpen = useStore((s) => s.userListOpen);
  const toggleUserList = useStore((s) => s.toggleUserList);
  const chatPanelOpen = useStore((s) => s.chatPanelOpen);
  const toggleChatPanel = useStore((s) => s.toggleChatPanel);
  const isCollabActive = useStore((s) => s.isCollabActive);

  // One set of undo auto-capture listeners however often the editor mounts;
  // the cleanup releases this mount's claim on them (shell-06).
  useEffect(() => initUndoTracking(), []);

  // Decide what to load when the studio boots. The home page routes here with
  // `?project=<id>` to open a saved project, `?new=1` to start fresh, or one
  // of the links below; absent any, the editor carries on with the session
  // (crash recovery from localStorage on a fresh page). The store is a module
  // singleton that survives SPA navigation, so a link must replace it whole —
  // a stale project would otherwise bleed through.
  //
  // Every link is checked before anything is cleared, and one that names
  // nothing real changes nothing. A valid one opens through replaceSession:
  // the work it replaces is kept first (owner decision 6: keep it, never
  // ask), with a toast to bring it back.
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current || !ownerKnown) return;

    const intent = readBootIntent(window.location.search);

    // Strip the boot intent from the URL so a later refresh just restores the
    // (now-current) local session instead of re-running this. Stays on the
    // editor route (`/studio/editor`) — `/studio` is now the Studio Dashboard.
    const clearQuery = () =>
      window.history.replaceState({}, '', StudioRoutes.editor.definition);

    // A link that can't be opened says why, and the editor carries on as a
    // plain boot would.
    const refuse = (message: string) => {
      showError(message);
      resumeLocalSession();
      clearQuery();
    };

    /**
     * Open what the link names in place of the session (replaceSession). A
     * collab session passes `restorable` false: kept work offers no Restore
     * there, since loading it would overwrite the shared room. True once the
     * new session is open.
     */
    const open = async (
      seed: () => void | Promise<void>,
      {
        reopenable = false,
        restorable = true,
        failure = 'That link could not be opened.',
      } = {},
    ): Promise<boolean> => {
      const result = await replaceSession(userId, seed, { reopenable });
      if (result.status === 'refused') {
        refuse(KEEP_REFUSED);
        return false;
      }
      clearQuery();
      if (result.status === 'failed') {
        console.error(failure, result.error);
        showError(failure);
        return false;
      }
      if (result.kept) announceKeptWork(result.kept, userId, { restorable });
      return true;
    };

    // The caller seeded the store before navigating here — a Song page's "Open
    // in Studio", which carries the reader's transposition and so cannot be
    // re-seeded from an id below. Consume the boot without restoring anything:
    // the default path would put the last autosaved session over the song. (On
    // a fresh page, a stale link, nothing was seeded, and this restores.)
    if (intent.kind === 'seeded') {
      bootedRef.current = true;
      resumeLocalSession();
      clearQuery();
      return;
    }

    const problem = bootIntentError(intent, BOOT_CATALOG);
    if (problem) {
      bootedRef.current = true;
      refuse(problem);
      return;
    }

    if (intent.kind === 'project') {
      // Opening a cloud project needs a token; wait for it to resolve rather
      // than consuming the boot intent prematurely.
      if (!authToken) return;
      bootedRef.current = true;
      void (async () => {
        let project: Awaited<ReturnType<typeof studioProjectsApi.get>>;
        try {
          project = await studioProjectsApi.get(authToken, intent.projectId);
        } catch (err) {
          console.error('Failed to open project from home', err);
          refuse('That project could not be opened.');
          return;
        }
        const opened = await open(() => deserializeCloudProject(project), {
          reopenable: true,
        });
        if (!opened) return;
        useStore.getState().offerChordAnalysis();
        // Audio buffers download + decode in the background; clips appear in
        // the timeline immediately and become playable as bytes arrive.
        void loadCloudProjectAudio(authToken).catch((err) => {
          console.error('Audio asset load failed', err);
        });
      })();
      return;
    }

    // Studio Dashboard "Project Templates" tile: start a fresh session preloaded
    // with a genre template's tracks/BPM. Leaves projectId null so the first Save
    // mints a brand-new cloud project.
    if (intent.kind === 'template') {
      bootedRef.current = true;
      void open(
        () => useStore.getState().loadProjectTemplate(intent.templateId),
        { reopenable: true },
      );
      return;
    }

    // Studio Dashboard "Demo Projects" tile: open a curated demo as an editable
    // copy — hydrate from the bundled project, then null the projectId + retitle
    // so Save writes a new project and the demo original is never overwritten.
    if (intent.kind === 'demo') {
      bootedRef.current = true;
      // bootIntentError has already turned away an id with no demo.
      const demo = getDemoProject(intent.demoId);
      if (!demo) {
        refuse('That demo could not be found.');
        return;
      }
      void (async () => {
        const opened = await open(
          () => {
            deserializeCloudProject(
              withDemoSynthPresets(demo.bundle, demo.synthPresets),
            );
            const store = useStore.getState();
            store.setProjectId(null);
            store.setProjectName(demo.label);
            // Chord regions aren't part of a project bundle, so derive them
            // from the demo's MIDI (as a clip paste does) to give Insight its
            // analysis.
            const { tracks, rootNote, mode, setChordRegions } =
              useStore.getState();
            if (rootNote !== null) {
              setChordRegions(
                deriveChordRegionsFromSession(tracks, rootNote + 48, mode),
                true,
              );
            }
          },
          { reopenable: true },
        );
        // The drums arrive after a fetch and finish the seed themselves.
        if (opened && demo.drumGrooveId) {
          void applyDemoDrums(demo.drumGrooveId, demo.label);
        }
      })();
      return;
    }

    // Studio Dashboard "Production" tab: run a step-by-step lesson in a fresh
    // session, so its first steps (add/select a track) start from a clean slate.
    // The reset ends any lesson already running; this one starts after it.
    //
    // A Premium lesson waits until the student's plan is known (useIsPremium
    // says false for everyone until then, and a premium student must never be
    // turned away), then a free student is turned away here, before anything
    // is cleared: the session carries on as a plain boot would, under the
    // upgrade prompt, and the link is consumed so a refresh doesn't ask again.
    if (intent.kind === 'tutorial') {
      const access = lessonAccessFor(intent.tutorialId);
      if (access === 'wait') return;
      bootedRef.current = true;
      if (access === 'upgrade') {
        setUpgradeLessonId(intent.tutorialId);
        resumeLocalSession();
        clearQuery();
        return;
      }
      void open(() => useStore.getState().startTutorial(intent.tutorialId), {
        reopenable: true,
      });
      return;
    }

    // Handed off from a classroom app-route slide (`studio:song:<id>`) or a Song
    // page: seed the editor with a specific song's chart in a fresh session, no
    // cloud project — the first Save mints a new one. The song library loads
    // at runtime, so look the song up once it has.
    if (intent.kind === 'song') {
      bootedRef.current = true;
      void (async () => {
        try {
          await ensureSongContent();
        } catch (err) {
          console.error('Song library failed to load', err);
        }
        const song = getSong(intent.songId);
        if (!song) {
          refuse('That song could not be found.');
          return;
        }
        await open(() => seedStudioFromSong(song), { reopenable: true });
      })();
      return;
    }

    // Graduated from a genre activity flow's section (Learn > a genre level)
    // into its Practice Track: the section's own groove looped, with the part
    // that section taught left empty for the student to play.
    //
    // The clips normally arrive through the module hand-off box rather than
    // being rebuilt from these parameters — the genre backing engine is not
    // reproducible, so rebuilding would put the student over a different
    // performance from the one they just heard. `resolvePracticeTrack` takes the
    // handed-over track when there is one and rebuilds only for a cold deep link.
    if (intent.kind === 'practiceGenre') {
      bootedRef.current = true;
      void (async () => {
        let resolved: Awaited<ReturnType<typeof resolvePracticeTrack>> = null;
        try {
          resolved = await resolvePracticeTrack(
            intent.genre,
            intent.level,
            intent.section,
          );
        } catch (err) {
          console.error('Practice track failed to build', err);
        }
        if (!resolved) {
          refuse('That practice track could not be found.');
          return;
        }
        const { track, genreLabel, returnTo } = resolved;
        await open(
          () => {
            seedStudioFromGenrePracticeTrack(track, genreLabel);
            const store = useStore.getState();
            store.setPracticeSession(
              practiceSessionFor(track, genreLabel, returnTo),
            );
            store.setCurrentView('practice');
          },
          { reopenable: true },
        );
      })();
      return;
    }

    // Graduated from a Theory mode/lesson (Learn > Theory) into a pre-seeded
    // Practice Track: generated chords/bass/beat plus one open track (melody
    // or chords, whichever the student didn't just practice) for them to fill
    // in themselves.
    if (intent.kind === 'practiceMode') {
      bootedRef.current = true;
      // `practiceRoot` is a letter-based key param (e.g. "d", "dsharp"),
      // written by `keyLabelToUrlParam` — decode it back to a 0-11
      // semitone-from-C the same way `LessonContainer` resolves `key`.
      const root = urlParamToSemitone(intent.rootParam ?? undefined);
      // seedStudioFromPracticeTrack fetches + parses the fixed Drums groove's
      // .mid file, so the seed is async. If it fails, the work it replaced
      // comes back.
      void open(
        async () => {
          await seedStudioFromPracticeTrack(
            intent.mode as PracticeMode,
            root,
            intent.openTrack,
            intent.level,
          );
          // Land on the one-purpose practice screen; the full Studio is
          // one click away and shares the same project.
          const store = useStore.getState();
          store.setPracticeSession({
            kind: 'theory',
            mode: intent.mode,
            rootParam: intent.rootParam ?? 'c',
            level: intent.level,
            openTrack: intent.openTrack,
          });
          // A backing track to play over: loop it from the start.
          store.setLoopEnabled(true);
          store.setCurrentView('practice');
        },
        {
          reopenable: true,
          failure: 'That practice track could not be opened.',
        },
      );
      return;
    }

    // Handed off from a jam room into a collaborative Studio session. The host
    // arrives with `?jam=1&collab=<code>&host=1` (carries the jam tracks in and
    // creates the room); invited players arrive with `?collab=<code>` and join.
    // The Studio Dashboard "Start a Session" flow arrives with `?collab=new`:
    // mint a fresh room and surface its code.
    // Connecting to PartyKit needs an auth token, so wait for it like a project.
    if (intent.kind === 'collab') {
      if (!authToken) return;
      bootedRef.current = true;
      void open(
        () => {
          if (intent.code === 'new') {
            createAndJoinRoom();
            // Surface the room code + let the host invite more people (the
            // single Invite modal is owned by CollabToolbar).
            useStore.getState()._setInviteRequested(true);
            return;
          }
          // The host imports the recorded jam, then seeds the shared doc with
          // it on create; joiners receive those tracks via the initial Yjs
          // sync.
          if (intent.jamImport) importPendingJamSession();
          if (intent.host) {
            joinRoom(
              intent.code,
              'owner',
              undefined,
              `studio-${intent.code}`,
              intent.code,
            );
          } else {
            // Joiners may beat the host to PartyKit; retry until the room
            // exists.
            joinRoomAwaitingHost(intent.code);
          }
        },
        { restorable: false },
      );
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
    // for everyone, so there is nothing to rejoin. (Checked ahead of `?jam=1`
    // and `?new=1`, as it always has been.)
    const { roomId: activeRoomId, collabRole } = useStore.getState();
    if (activeRoomId && collabRole !== 'owner') {
      if (!authToken) return;
      bootedRef.current = true;
      joinRoomById(activeRoomId, collabRole);
      return;
    }

    bootedRef.current = true;
    if (intent.kind === 'jam') {
      // Arrived from a jam room: start a fresh project, then add the recorded
      // jam as one MIDI track per participant. The import consumes the
      // recording, so this session is its only copy: not reopenable.
      void open(() => {
        importPendingJamSession();
        useStore.getState().offerChordAnalysis();
      });
      return;
    }
    if (intent.kind === 'new') {
      void open(() => {}, { reopenable: true });
      return;
    }

    // Default: carry on with the session this page holds — returning to the
    // editor in-app must not put the older autosave over it — or, on a fresh
    // page, restore the last one from localStorage. Cloud remains the source of
    // truth for explicit saves; this is crash recovery. A reload into a blank
    // project (File ▸ New, leaving a shared session) may have kept the work it
    // left: say so now.
    resumeLocalSession();
    announceKeptWorkFromReload(userId);
  }, [
    authToken,
    userId,
    ownerKnown,
    joinRoom,
    joinRoomById,
    joinRoomAwaitingHost,
    createAndJoinRoom,
    lessonAccessFor,
  ]);

  // Start audio on the first click or key press; a start that fails is logged
  // and retried on the next one (engine-hooks-23).
  useStartAudioOnGesture(isReady, initEngine);

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
      __MA_AUDIO_ENGINE__?: unknown;
    };
    w.__MA_STORE__ = useStore;
    w.__MA_SYNTH_STORE__ = useSynthStore;
    w.__MA_AUDIO_ENGINE__ = audioEngine;
  }, []);

  return (
    <div
      className="daw-root flex-1 min-h-0 w-full flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {currentView === 'practice' && practiceSession ? (
        <DevProfiler id="PracticeTrackView">
          <PracticeTrackView
            session={practiceSession}
            isReady={isReady}
            onInit={initEngine}
          />
        </DevProfiler>
      ) : (
        <DevProfiler id="TransportBar">
          <TransportBar onInit={initEngine} isReady={isReady} />
        </DevProfiler>
      )}
      {currentView === 'practice' && practiceSession ? null : currentView ===
          'arrange' || currentView === 'practice' ? (
        <>
          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-1 flex-col overflow-hidden">
              <DevProfiler id="TimelineWithHeaders">
                <TimelineWithHeaders isReady={isReady} />
              </DevProfiler>
            </div>
            <DevProfiler id="LibraryPanel">
              <LibraryPanel />
            </DevProfiler>
            {isCollabActive && (
              <>
                <UserList open={userListOpen} onClose={toggleUserList} />
                <ChatPanel open={chatPanelOpen} onClose={toggleChatPanel} />
              </>
            )}
          </div>
          <DevProfiler id="ChannelStrip">
            <ChannelStrip />
          </DevProfiler>
          <PianoRollModal />
        </>
      ) : currentView === 'leadsheet' ? (
        <DevProfiler id="LeadSheetView">
          <LeadSheetView />
        </DevProfiler>
      ) : currentView === 'score' ? (
        <DevProfiler id="ScoreView">
          <ScoreView />
        </DevProfiler>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <DevProfiler id="StudioView">
            <StudioView isReady={isReady} />
          </DevProfiler>
          <DevProfiler id="LibraryPanel">
            <LibraryPanel />
          </DevProfiler>
          {isCollabActive && (
            <>
              <UserList open={userListOpen} onClose={toggleUserList} />
              <ChatPanel open={chatPanelOpen} onClose={toggleChatPanel} />
            </>
          )}
        </div>
      )}
      <ChordAnalysisPrompt />
      <SetListUpdatePrompt />
      <SettingsModal />
      <PrismSuggestionModal audioReady={isReady} />
      <RecordingLimitModal />
      <RecordGuard />
      <TutorialLayer />
      <UpgradeLessonDialog
        lessonId={upgradeLessonId}
        onClose={() => setUpgradeLessonId(null)}
      />
    </div>
  );
}

export function DawApp() {
  return (
    // One tooltip timing for the whole editor (src/daw/ui's Tooltip).
    <TooltipGroup>
      <CollabProvider>
        <DawAppInner />
      </CollabProvider>
    </TooltipGroup>
  );
}
