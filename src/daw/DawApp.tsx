import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEV_AUTH_BYPASS } from '@/auth/devBypass';
import { registerBeforeSignOut } from '@/auth/beforeSignOut';
import './daw.css';
import { SetListUpdatePrompt } from '@/daw/components/LeadSheet/SendToSetList';
import { RecordingLimitModal } from '@/daw/components/Transport/RecordingLimitModal';
import { RecordGuard } from '@/daw/components/Transport/RecordGuard';
import { useLessonAccess } from '@/daw/components/Tutorial/useLessonAccess';
import {
  useAudioEngine,
  useStartAudioOnGesture,
} from '@/daw/hooks/useAudioEngine';
import { usePrefsSync } from '@/daw/hooks/usePrefsSync';
import { useGlobalCommands } from '@/daw/commands/globalCommands';
import { useMusicalTyping } from '@/daw/hooks/useMusicalTyping';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { StudioRoutes } from '@/constants/routes';
import { useStudioCurrentProjectNote } from '@/daw/hooks/useStudioCurrentProjectNote';
import { useStore } from '@/daw/store';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { initUndoTracking } from '@/daw/store/undoMiddleware';
import {
  flushHistory,
  historyLabels,
  historyPushCount,
  withoutHistory,
} from '@/daw/store/history';
import { watchNoteIds } from '@/daw/model/noteIds';
import { CollabProvider, useCollab } from '@/daw/collab/CollabProvider';
import { KickedModal } from '@/daw/collab/ui/KickedModal';
import { LeaveSavePrompt } from '@/daw/collab/ui/LeaveSavePrompt';
import { TooltipGroup } from '@/daw/ui/Tooltip';
import { registerSaveAuth } from '@/daw/commands/saveProject';
import { useCloudSaveStore } from '@/daw/commands/cloudSaveStore';
import { getDraftSessionPort } from '@/daw/persistence/drafts/draftSessionPort';
import { installDraftDevHandle } from '@/daw/persistence/drafts/devHandle';
import {
  notifySessionDepsChanged,
  registerSessionDeps,
} from '@/daw/session/sessionDeps';
import { isBusyPhase, useSessionStore } from '@/daw/session/sessionStore';
import { useSessionBoot } from '@/daw/session/useSessionBoot';
import { DawErrorBoundary } from '@/daw/shell/errors/DawErrorBoundary';
import {
  ChordAnalysisPromptHost,
  PrismSuggestionModalHost,
  SettingsModalHost,
  TutorialLayerHost,
} from '@/daw/shell/lazyParts';
import { StudioShell } from '@/daw/shell/StudioShell';
import { OpeningHost } from '@/daw/shell/opening/OpeningHost';
import { CommandPaletteHost } from '@/daw/shell/help/CommandPaletteHost';
import { ExportDialogHost } from '@/daw/shell/export/ExportDialogHost';
import { ShortcutSheetHost } from '@/daw/shell/help/ShortcutSheetHost';
import { ReportProblemHost } from '@/daw/shell/help/ReportProblemHost';
import { ProjectsDialogHost } from '@/daw/shell/projects/ProjectsDialogHost';
import { SaveConflictDialog } from '@/daw/shell/topbar/SaveConflictDialog';
import { DialogHost } from '@/daw/ui/DialogHost';
import { useProjectsDialogStore } from '@/daw/shell/projects/useProjectsDialogStore';
import { clearCloudProjectCache } from '@/daw/shell/projects/cloudProjectList';
import { userKeyOf } from '@/lib/local-store/userScope';
import { audioEngine } from '@/daw/audio/AudioEngine';
import { EngineHost } from '@/daw/engine/EngineHost';
import { getPlayheadTick } from '@/daw/engine/playheadClock';
import { devMark, useDevCommitCount } from '@/daw/dev/DevProfiler';

// Dev-only: when the editor chunk finished evaluating (scripts/studio-perf).
devMark('module');

/** The Opening overlay (OpeningHost), which inert must never reach. */
const OVERLAY_SELECTOR = '[data-testid=opening-overlay]';

/**
 * While the Opening overlay is up, every direct child of .daw-root but the
 * overlay itself is inert: no clicks, no focus, no keys reach the editor
 * underneath (E14). React 18 has no inert prop, so the attribute is set here
 * and on any child mounted meanwhile, and only the ones set here are cleared.
 * The shell (top bar and regions) is one such child. leadsheet-print.css
 * prints only the elements that hold the lead sheet, so the shell's grid
 * around it prints as plain blocks. The Projects dialog and the error panel
 * live outside .daw-root and disable themselves while an open is busy.
 */
function useInertWhileOpening(
  rootRef: React.RefObject<HTMLDivElement>,
  covered: boolean,
): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!covered || !root) return;
    const marked = new Set<Element>();
    const apply = () => {
      for (const child of Array.from(root.children)) {
        if (child.matches(OVERLAY_SELECTOR) || child.hasAttribute('inert')) {
          continue;
        }
        child.setAttribute('inert', '');
        marked.add(child);
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true });
    return () => {
      observer.disconnect();
      for (const child of marked) child.removeAttribute('inert');
    };
  }, [rootRef, covered]);
}

/**
 * Every Save loads upload-pending lazily (it carries the Opus encoder and
 * the assets API, kept out of the editor's entry chunk). Fetch it once the
 * editor is idle, while the connection is still there: a module that
 * failed to load stays failed for the life of the page, so a first Save
 * made offline would otherwise fail again after the connection comes back,
 * its retry included.
 */
function useWarmSavePath(): void {
  useEffect(() => {
    const warm = () => {
      import('@/lib/studio-assets/upload-pending').catch(() => {});
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warm, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(warm, 2000);
    return () => window.clearTimeout(timer);
  }, []);
}

function DawAppInner() {
  const { isReady, initEngine } = useAudioEngine();
  const authToken = useAuthToken();
  // Drafts are filed per user, since a school Chromebook is shared, so an
  // open waits until auth knows who that is: the user, or that nobody is
  // signed in (openSession's 'owner' wait reads it through SessionDeps).
  // A student Auth0 has signed in whose profile hasn't loaded (a failed
  // /auth/me sets auth.error but keeps the session) is not known yet: their
  // work must never be filed under 'anon', where the next signed-out user
  // of the device would see it. The same rule as AuthContext's
  // setLocalStoreUser, which publishes only a user or a confirmed sign-out.
  const auth = useAuthContext();
  const userId = auth.userId;
  const signedOutForSure = !auth.isAuth0Loading && !auth.isAuth0Authenticated;
  const ownerKnown =
    userId !== null ||
    (signedOutForSure && (auth.error !== null || !auth.isBootstrapLoading));
  // A Prism lesson needs Premium (owner decision 8): its link waits until the
  // student's plan is known, then a free student gets the upgrade prompt.
  const lessonAccessFor = useLessonAccess();
  const collab = useCollab();
  const navigate = useNavigate();
  // The audio side (transport, track engines, MIDI input, draft autosave,
  // collab audio, live analysis) lives in EngineHost below, so a play or a
  // track edit doesn't re-render the editor shell (milestone 1.7).
  // The one keyboard listener and the global keys (milestone 1.6), and the
  // computer keyboard as a piano while the student has it on.
  useGlobalCommands();
  useMusicalTyping();
  // The student's own editor settings (metronome, count-in, snap, grid,
  // triplets, chord-ruler note names), kept per user apart from any project.
  // Held off until auth knows who the student is.
  usePrefsSync(userId, ownerKnown);
  useStudioCurrentProjectNote(userId);
  useDevCommitCount('DawAppInner');

  // Dev-only load-timeline marks for scripts/studio-perf.
  useEffect(() => devMark('mounted'), []);
  useEffect(() => {
    if (isReady) devMark('engine-ready');
  }, [isReady]);
  const overlay = useSessionStore((s) => s.overlay);
  const busy = useSessionStore((s) => isBusyPhase(s.phase));

  // One undo history listener however often the editor mounts; the cleanup
  // releases this mount's claim on it (shell-06).
  useEffect(() => initUndoTracking(), []);

  // ── What openSession reaches (SessionDeps, milestone 1.4) ──────────────
  // Registered ONCE per mount, with methods that read refs: openSession
  // takes a new registration for the editor having gone and come back, so
  // re-registering as auth resolves would cancel the boot's own open. A
  // change of user, token or plan is announced instead, so a waiting open
  // looks again.
  const authRef = useRef({ userId, ownerKnown, token: authToken });
  authRef.current = { userId, ownerKnown, token: authToken };
  const lessonAccessRef = useRef(lessonAccessFor);
  lessonAccessRef.current = lessonAccessFor;
  const collabRef = useRef(collab);
  collabRef.current = collab;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    const editorPath = StudioRoutes.editor.definition;
    return registerSessionDeps({
      user: () => {
        const { userId: id, ownerKnown: known } = authRef.current;
        return known ? { userId: id, userKey: userKeyOf(id) } : null;
      },
      token: () => authRef.current.token,
      lessonAccess: (tutorialId) => lessonAccessRef.current(tutorialId),
      collab: {
        leaveRoom: () => collabRef.current.leaveRoom(),
        createAndJoinRoom: () => collabRef.current.createAndJoinRoom(),
        joinRoom: (...args) => collabRef.current.joinRoom(...args),
        joinRoomById: (roomId, role) =>
          collabRef.current.joinRoomById(roomId, role),
        joinRoomAwaitingHost: (roomId, timeoutMs) =>
          collabRef.current.joinRoomAwaitingHost(roomId, timeoutMs),
      },
      drafts: getDraftSessionPort(),
      // Only while the student is still in the editor: an open that ends
      // after they left must not pull them back or rewrite another page.
      navigate: (search, { replace }) => {
        if (window.location.pathname !== editorPath) return;
        navigateRef.current({ pathname: editorPath, search }, { replace });
      },
      openProjectsDialog: (opts) =>
        useProjectsDialogStore.getState().openDialog(opts),
    });
  }, []);

  useEffect(() => {
    notifySessionDepsChanged();
  }, [userId, ownerKnown, authToken, lessonAccessFor]);

  // saveProject (every Save, ⌘S, the chip's Retry, Save & Leave) asks here
  // for the token.
  useEffect(() => registerSaveAuth(() => authRef.current.token), []);

  // The account's project list is per user; it goes at sign-out.
  useEffect(
    () =>
      registerBeforeSignOut(() => {
        clearCloudProjectCache();
      }),
    [],
  );

  // Opens what the URL names (a link, a return to the editor, a cold
  // resume), a tick after the deps above are registered.
  useSessionBoot();

  // The editor under the Opening overlay takes no input (E14).
  const rootRef = useRef<HTMLDivElement>(null);
  useInertWhileOpening(rootRef, overlay !== 'none');

  useWarmSavePath();

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
      __MA_SESSION__?: unknown;
      __MA_CLOUD_SAVE__?: unknown;
      __MA_PLAYHEAD__?: unknown;
      __MA_HISTORY__?: unknown;
    };
    w.__MA_STORE__ = useStore;
    w.__MA_SYNTH_STORE__ = useSynthStore;
    w.__MA_AUDIO_ENGINE__ = audioEngine;
    w.__MA_SESSION__ = useSessionStore;
    w.__MA_CLOUD_SAVE__ = useCloudSaveStore;
    // The live playhead: the store's position moves only on pause, stop and
    // seek since milestone 1.7.
    w.__MA_PLAYHEAD__ = { tick: getPlayheadTick };
    // The undo history: its step labels, oldest first, and a counter of the
    // steps pushed (the perf harness checks one per gesture).
    w.__MA_HISTORY__ = {
      labels: historyLabels,
      pushed: historyPushCount,
      flush: flushHistory,
      // For the harness's own writes (probes), which are no student's edit.
      withoutHistory,
    };
    // window.__MA_DRAFTS__: the draft autosave's status, list, flush.
    return installDraftDevHandle();
  }, []);

  // DEV-only: decision D2's check that every note keeps an id of its own.
  // It warns in the console when a load or a write leaves one without.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    return watchNoteIds(
      (listener) => useStore.subscribe(listener),
      () => useStore.getState().tracks,
    );
  }, []);

  return (
    <div
      ref={rootRef}
      className="daw-root relative flex-1 min-h-0 w-full flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--daw-bg)' }}
      aria-busy={busy ? 'true' : undefined}
    >
      <EngineHost isReady={isReady} authToken={authToken} />
      {/* The top bar, the view, the Inspector and the dock, laid out once
          (milestones 2.4 and 2.5): a view change remounts only the view. */}
      <StudioShell isReady={isReady} onInit={initEngine} />
      <ChordAnalysisPromptHost />
      <SetListUpdatePrompt />
      <SettingsModalHost />
      <PrismSuggestionModalHost audioReady={isReady} />
      <RecordingLimitModal />
      <RecordGuard />
      <TutorialLayerHost />
      {/* Collab's prompts portal to <body>; mounted here, not in the top
          bar, so they show in Practice too. */}
      <LeaveSavePrompt />
      <KickedModal />
      <ProjectsDialogHost />
      <ShortcutSheetHost userId={userId} ownerKnown={ownerKnown} />
      <ReportProblemHost />
      <CommandPaletteHost />
      <ExportDialogHost />
      <SaveConflictDialog />
      {/* confirmDialog() and promptDialog(): the editor's questions, one at a
          time (Delete project, Save a copy, marker and section names). */}
      <DialogHost />
      {/* The Opening overlay, the error panel and the Premium prompt. A
          direct child of .daw-root, left out of the inert toggle above. */}
      <OpeningHost />
    </div>
  );
}

export function DawApp() {
  return (
    // One tooltip timing for the whole editor (src/daw/ui's Tooltip).
    <TooltipGroup>
      <CollabProvider>
        {/* A crash saves the draft and offers Reload editor (1.12a). */}
        <DawErrorBoundary>
          <DawAppInner />
        </DawErrorBoundary>
      </CollabProvider>
    </TooltipGroup>
  );
}
