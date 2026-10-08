// @vitest-environment jsdom
/**
 * The editor's boot links that load something first (DawApp): a cloud
 * project, a song once the song library is in, a practice track once it is
 * built. By the time that arrives the student may have moved on: opened
 * another project in the editor (a Library template, File ▸ Open, a
 * kept-work Restore), joined a room, or left the editor. The link is then
 * out of date, and opening it would replace what they moved on to, in a room
 * for everyone in it. So it is dropped without a word, and the address stops
 * offering it, but only while the address is still the one the boot read.
 *
 * DawApp renders with its views and engine hooks stubbed out; the boot runs
 * as in the editor, through the real replaceSession and seeds. Each slow step
 * (the song library, the cloud project, the practice track) is held until
 * the test lets it finish.
 *
 * A link also leaves a room the student left behind: a guest who left the
 * editor without pressing Leave keeps the room's identity, and a plain
 * return to the editor would rejoin the room and pull its project over
 * whatever the link opened.
 *
 * Run: npx vitest run src/daw/__tests__/DawApp.bootLinks.test.tsx
 */
import { act, cleanup, render } from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const slow = vi.hoisted(() => ({
  ensureSongContent: vi.fn<() => Promise<void>>(),
  getProject: vi.fn<(token: string, id: string) => Promise<unknown>>(),
  generatePracticeTrack: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  resolvePracticeTrack: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  loadCloudProjectAudio: vi.fn(() => Promise.resolve()),
}));
const toasts = vi.hoisted(() => ({ error: vi.fn(), notice: vi.fn() }));

vi.mock('@/content/songStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/content/songStore')>()),
  ensureSongContent: slow.ensureSongContent,
}));
vi.mock('@/lib/studio-projects/api', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/studio-projects/api')>();
  return {
    ...actual,
    studioProjectsApi: { ...actual.studioProjectsApi, get: slow.getProject },
  };
});
vi.mock(
  '@/features/practiceTracks/generatePracticeTrack',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('@/features/practiceTracks/generatePracticeTrack')
    >()),
    generatePracticeTrack: slow.generatePracticeTrack,
  }),
);
vi.mock(
  '@/features/practiceTracks/genre/openGenrePracticeTrack',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('@/features/practiceTracks/genre/openGenrePracticeTrack')
    >()),
    resolvePracticeTrack: slow.resolvePracticeTrack,
  }),
);
vi.mock('@/lib/studio-assets/load-audio', () => ({
  loadCloudProjectAudio: slow.loadCloudProjectAudio,
}));
// The boot's refusals resume the session; the test counts them.
vi.mock('@/lib/studio-projects/localSession', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/studio-projects/localSession')>();
  return { ...actual, resumeLocalSession: vi.fn(actual.resumeLocalSession) };
});
// A practice track's groove is a fetched .mid: two hits stand in.
vi.mock('@/daw/midi/loadGrooveEvents', () => ({
  loadGrooveEvents: vi.fn(async () => [
    { note: 36, velocity: 100, startTick: 0, durationTicks: 120, channel: 9 },
    { note: 38, velocity: 100, startTick: 960, durationTicks: 120, channel: 9 },
  ]),
}));
vi.mock('@/util/toast', () => ({
  showError: toasts.error,
  showNotice: toasts.notice,
  showSuccess: vi.fn(),
  showLoading: vi.fn(),
  dismissToast: vi.fn(),
}));

// A signed-in student whose plan opens every lesson.
const auth = vi.hoisted(() => ({
  context: {
    userId: 'u1',
    token: 'tok',
    error: null,
    isAuth0Loading: false,
    isBootstrapLoading: false,
    isAuth0Authenticated: true,
  },
  lessonAccess: () => 'open' as const,
}));
vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => auth.context,
}));
vi.mock('@/contexts/AuthContext/hooks/useAuthToken', () => ({
  useAuthToken: () => 'tok',
}));
vi.mock('@/daw/components/Tutorial/useLessonAccess', () => ({
  useLessonAccess: () => auth.lessonAccess,
}));

// The editor's engine, views and collaboration, stubbed: the boot is the
// subject. Stable references, since the boot effect depends on them.
const editor = vi.hoisted(() => ({
  engine: { isReady: false, initEngine: () => Promise.resolve() },
  collab: {
    joinRoom: () => {},
    joinRoomById: vi.fn(),
    joinRoomAwaitingHost: () => {},
    createAndJoinRoom: () => {},
  },
  nothing: () => null,
  passThrough: ({ children }: { children?: unknown }) => children,
  noop: () => {},
}));
vi.mock('@/daw/audio/AudioEngine', () => ({ audioEngine: {} }));
vi.mock('@/daw/hooks/useAudioEngine', () => ({
  useAudioEngine: () => editor.engine,
  useStartAudioOnGesture: editor.noop,
}));
vi.mock('@/daw/collab/CollabProvider', () => ({
  CollabProvider: editor.passThrough,
  useCollab: () => editor.collab,
}));
vi.mock('@/daw/dev/DevProfiler', () => ({
  DevProfiler: editor.passThrough,
  devMark: editor.noop,
  useDevCommitCount: editor.noop,
}));
vi.mock('@/daw/hooks/useAutosave', () => ({ useAutosave: editor.noop }));
vi.mock('@/daw/hooks/usePrefsSync', () => ({ usePrefsSync: editor.noop }));
vi.mock('@/daw/hooks/useDawBodyTokens', () => ({
  useDawBodyTokens: editor.noop,
}));
vi.mock('@/daw/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: editor.noop,
}));
vi.mock('@/daw/hooks/useAudioChordDetection', () => ({
  useAudioChordDetection: editor.noop,
}));
vi.mock('@/daw/hooks/useGuitarMidiDetection', () => ({
  useGuitarMidiDetection: editor.noop,
}));
vi.mock('@/daw/hooks/useMidiInputRouting', () => ({
  useMidiInputRouting: editor.noop,
}));
vi.mock('@/daw/hooks/useStudioMonitor', () => ({
  useStudioMonitor: editor.noop,
}));
vi.mock('@/daw/hooks/useCollabAudioLoader', () => ({
  useCollabAudioLoader: editor.noop,
}));
vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  usePlaybackEngine: editor.noop,
}));
vi.mock('@/daw/hooks/useTheme', () => ({ useTheme: editor.noop }));
vi.mock('@/daw/hooks/useTransport', () => ({ useTransport: editor.noop }));
vi.mock('@/daw/components/ChannelStrip/ChannelStrip', () => ({
  ChannelStrip: editor.nothing,
}));
vi.mock('@/daw/components/Library/LibraryPanel', () => ({
  LibraryPanel: editor.nothing,
}));
vi.mock('@/daw/components/PianoRoll/PianoRollModal', () => ({
  PianoRollModal: editor.nothing,
}));
vi.mock('@/daw/components/Library/ChordAnalysisPrompt', () => ({
  ChordAnalysisPrompt: editor.nothing,
}));
vi.mock('@/daw/components/LeadSheet/LeadSheetView', () => ({
  LeadSheetView: editor.nothing,
}));
vi.mock('@/daw/components/LeadSheet/SendToSetList', () => ({
  SetListUpdatePrompt: editor.nothing,
}));
vi.mock('@/daw/components/Score/ScoreView', () => ({
  ScoreView: editor.nothing,
}));
vi.mock('@/daw/components/Practice/PracticeTrackView', () => ({
  PracticeTrackView: editor.nothing,
}));
vi.mock('@/daw/components/Studio/StudioView', () => ({
  StudioView: editor.nothing,
}));
vi.mock('@/daw/components/Timeline/TimelineWithHeaders', () => ({
  TimelineWithHeaders: editor.nothing,
}));
vi.mock('@/daw/components/Prism/PrismSuggestionModal', () => ({
  PrismSuggestionModal: editor.nothing,
}));
vi.mock('@/daw/components/Transport/SettingsModal', () => ({
  SettingsModal: editor.nothing,
}));
vi.mock('@/daw/components/Transport/RecordingLimitModal', () => ({
  RecordingLimitModal: editor.nothing,
}));
vi.mock('@/daw/components/Transport/RecordGuard', () => ({
  RecordGuard: editor.nothing,
}));
vi.mock('@/daw/components/Tutorial/TutorialLayer', () => ({
  TutorialLayer: editor.nothing,
}));
vi.mock('@/daw/components/Tutorial/UpgradeLessonDialog', () => ({
  UpgradeLessonDialog: editor.nothing,
}));
vi.mock('@/daw/components/Transport/TransportBar', () => ({
  TransportBar: editor.nothing,
}));
vi.mock('@/daw/collab/ui/UserList', () => ({ UserList: editor.nothing }));
vi.mock('@/daw/collab/ui/ChatPanel', () => ({ ChatPanel: editor.nothing }));

import { SONGS } from '@/content/songStore';
import type { Song, SongMode } from '@/curriculum/types/songLibrary';
import { getDemoProject } from '@/daw/data/demoProjects';
import { getProjectTemplate } from '@/daw/data/projectTemplates';
import {
  forgetLiveSession,
  resetSessionToEmpty,
} from '@/daw/persistence/SessionSerializer';
import { seedTemplate } from '@/daw/session/linkSeeds';
import { useStore } from '@/daw/store';
import { resetUndoHistory } from '@/daw/store/undoMiddleware';
import type { PracticeTrackResult } from '@/features/practiceTracks/generatePracticeTrack';
import { seedStudioFromSong } from '@/features/songs/seedStudioFromSong';
import {
  replaceSession,
  resumeLocalSession,
  writeLocalSession,
} from '@/lib/studio-projects/localSession';
import { DawApp } from '../DawApp';

const s = () => useStore.getState();
const trackNames = () => s().tracks.map((t) => t.name);
const address = () => window.location.pathname + window.location.search;
const POP_TRACKS = getProjectTemplate('project-pop')!.tracks.map((t) => t.name);

const SONG = {
  id: 'boot-song',
  title: 'Boot Song',
  artist: 'Boot Artist',
  key: 'G major',
  keyRoot: 67,
  mode: 'major' as SongMode,
  tempo: 104,
  timeSignature: [4, 4],
  difficulty: 1,
  genreTags: [],
  techniques: [],
  sections: [
    {
      id: 's0',
      label: 'Verse',
      bars: ['G', 'C', 'D', 'G'].map((chordName) => ({
        chords: [{ degree: '1 maj', chordName, beat: 1, duration: 4 }],
      })),
    },
  ],
  audioSources: [],
  artistImageSource: 'none',
} as unknown as Song;

/** A step the test finishes when it chooses. */
function hold<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Let every step under way run to its end. */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/** The editor opens on `query`, as a link brings the student there. */
function boot(query: string) {
  window.history.replaceState({}, '', `/studio/editor${query}`);
  return render(<DawApp />);
}

/** Finish a held step, inside React's act. */
async function finish(step: () => void): Promise<void> {
  await act(async () => {
    step();
    await flush();
  });
}

/** Another project opens in the editor meanwhile: a Library template. */
async function openAnotherProject(): Promise<void> {
  await act(async () => {
    const outcome = await replaceSession(
      'u1',
      () => seedTemplate('project-pop'),
      { reopenable: true },
    );
    expect(outcome.status).toBe('opened');
  });
}

// Built once with the real generator: a link dropped by mistake would open
// it, and a broken one couldn't open at all.
let theoryPractice: PracticeTrackResult;

beforeAll(async () => {
  const real = await vi.importActual<
    typeof import('@/features/practiceTracks/generatePracticeTrack')
  >('@/features/practiceTracks/generatePracticeTrack');
  theoryPractice = await real.generatePracticeTrack('dorian', 2, 'melody', 2);
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  for (const id of Object.keys(SONGS)) delete SONGS[id];
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
  resetUndoHistory();
  toasts.error.mockReset();
  toasts.notice.mockReset();
  vi.mocked(resumeLocalSession).mockClear();
  slow.loadCloudProjectAudio.mockClear();
  editor.collab.joinRoomById.mockClear();
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

describe('a song link', () => {
  it('opens once the song library is in', async () => {
    const library = hold<void>();
    slow.ensureSongContent.mockReturnValue(library.promise);
    boot('?song=boot-song');
    expect(s().projectName).not.toBe('Boot Song');

    SONGS[SONG.id] = SONG;
    await finish(() => library.resolve());

    expect(s().projectName).toBe('Boot Song');
    expect(address()).toBe('/studio/editor');
  });

  it('is dropped when another project opened while the library loaded', async () => {
    const library = hold<void>();
    slow.ensureSongContent.mockReturnValue(library.promise);
    boot('?song=boot-song');
    await openAnotherProject();

    SONGS[SONG.id] = SONG;
    await finish(() => library.resolve());

    expect(trackNames()).toEqual(POP_TRACKS);
    expect(s().projectName).toBe('Untitled Project');
    expect(toasts.error).not.toHaveBeenCalled();
    expect(address()).toBe('/studio/editor');
  });

  it('names no missing song once another project opened meanwhile', async () => {
    const library = hold<void>();
    slow.ensureSongContent.mockReturnValue(library.promise);
    boot('?song=boot-song');
    await openAnotherProject();

    // The library arrives without the song.
    await finish(() => library.resolve());

    expect(toasts.error).not.toHaveBeenCalled();
    expect(trackNames()).toEqual(POP_TRACKS);
  });

  it('is dropped when a room was joined while the library loaded', async () => {
    const library = hold<void>();
    slow.ensureSongContent.mockReturnValue(library.promise);
    boot('?song=boot-song');
    // A guest's Join pulls the room's project in without a load.
    act(() => useStore.setState({ roomId: 'room-1', collabRole: 'editor' }));

    SONGS[SONG.id] = SONG;
    await finish(() => library.resolve());

    expect(s().projectName).not.toBe('Boot Song');
    expect(trackNames()).toEqual([]);
    expect(s().roomId).toBe('room-1');
  });

  it('is dropped when the editor closed while the library loaded, leaving the address alone', async () => {
    const library = hold<void>();
    slow.ensureSongContent.mockReturnValue(library.promise);
    const editorOnScreen = boot('?song=boot-song');
    editorOnScreen.unmount();
    window.history.replaceState({}, '', '/studio');

    SONGS[SONG.id] = SONG;
    await finish(() => library.resolve());

    expect(s().projectName).not.toBe('Boot Song');
    expect(trackNames()).toEqual([]);
    expect(address()).toBe('/studio');
  });

  it('leaves an address that changed while the library loaded', async () => {
    const library = hold<void>();
    slow.ensureSongContent.mockReturnValue(library.promise);
    boot('?song=boot-song');
    window.history.replaceState({}, '', '/studio/editor?project=another');

    SONGS[SONG.id] = SONG;
    await finish(() => library.resolve());

    expect(s().projectName).toBe('Boot Song');
    expect(address()).toBe('/studio/editor?project=another');
  });

  it('on a fresh page, offers back both the autosave and what was added while it loaded', async () => {
    // The last session's only copy is the autosave.
    resetSessionToEmpty();
    s().setProjectName('Yesterday');
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    s().addMidiClip(keys, {
      id: 'clip-1',
      startTick: 0,
      events: [
        {
          note: 60,
          velocity: 90,
          startTick: 0,
          durationTicks: 480,
          channel: 0,
        },
      ],
    });
    expect(writeLocalSession('u1')).toBe(true);
    forgetLiveSession();
    useStore.setState(useStore.getInitialState(), true);

    const library = hold<void>();
    slow.ensureSongContent.mockReturnValue(library.promise);
    boot('?song=boot-song');
    // A track drawn while the song library loads.
    act(() => {
      s().addTrack('midi', 'piano-sampler', 'Doodle');
    });

    SONGS[SONG.id] = SONG;
    await finish(() => library.resolve());

    expect(s().projectName).toBe('Boot Song');
    // Each kept slot has a toast of its own, with its own Restore.
    const kept = (
      toasts.notice.mock.calls as [
        string,
        { description?: string; action?: { label: string } },
      ][]
    ).filter(([title]) => title === 'Your previous work was kept');
    expect(kept.map(([, notice]) => notice.description)).toEqual([
      'Yesterday',
      'Untitled Project',
    ]);
    expect(kept.map(([, notice]) => notice.action?.label)).toEqual([
      'Restore',
      'Restore',
    ]);
  });
});

describe('a cloud project link', () => {
  it('is dropped when another project opened while it downloaded', async () => {
    const download = hold<unknown>();
    slow.getProject.mockReturnValue(download.promise);
    boot('?project=p1');
    await openAnotherProject();

    await finish(() =>
      download.resolve(getDemoProject('demo-sunset-keys')!.bundle),
    );

    expect(trackNames()).toEqual(POP_TRACKS);
    expect(slow.loadCloudProjectAudio).not.toHaveBeenCalled();
    expect(address()).toBe('/studio/editor');
  });

  it('says nothing of a failed download once another project opened', async () => {
    const download = hold<unknown>();
    slow.getProject.mockReturnValue(download.promise);
    boot('?project=p1');
    await openAnotherProject();

    await finish(() => download.reject(new Error('offline')));

    expect(toasts.error).not.toHaveBeenCalled();
    expect(resumeLocalSession).not.toHaveBeenCalled();
    expect(trackNames()).toEqual(POP_TRACKS);
  });
});

describe('a Theory practice link', () => {
  const LINK = '?practiceMode=dorian&practiceRoot=d&practiceLevel=2';

  it('is dropped when another project opened while it was built', async () => {
    const built = hold<unknown>();
    slow.generatePracticeTrack.mockReturnValue(built.promise);
    boot(LINK);
    await openAnotherProject();

    await finish(() => built.resolve(theoryPractice));

    expect(trackNames()).toEqual(POP_TRACKS);
    expect(s().practiceSession).toBeNull();
    expect(s().currentView).toBe('arrange');
  });

  it('says nothing of a failed build once another project opened', async () => {
    const built = hold<unknown>();
    slow.generatePracticeTrack.mockReturnValue(built.promise);
    boot(LINK);
    await openAnotherProject();

    await finish(() => built.reject(new Error('no groove')));

    expect(toasts.error).not.toHaveBeenCalled();
    expect(resumeLocalSession).not.toHaveBeenCalled();
    expect(trackNames()).toEqual(POP_TRACKS);
  });
});

describe('a genre practice link', () => {
  it('names no missing track once another project opened meanwhile', async () => {
    const resolved = hold<unknown>();
    slow.resolvePracticeTrack.mockReturnValue(resolved.promise);
    boot('?practiceGenre=funk&practiceLevel=1&practiceSection=A');
    await openAnotherProject();

    await finish(() => resolved.resolve(null));

    expect(toasts.error).not.toHaveBeenCalled();
    expect(resumeLocalSession).not.toHaveBeenCalled();
    expect(trackNames()).toEqual(POP_TRACKS);
  });
});

describe('a link over a room left behind', () => {
  /** A guest who left the editor without pressing Leave. */
  const leftARoom = () =>
    useStore.setState({ roomId: 'room-1', collabRole: 'editor' });

  it('leaves the room, so a plain return carries on with what the link opened', async () => {
    leftARoom();
    boot('?template=project-pop');
    await finish(() => {});

    expect(trackNames()).toEqual(POP_TRACKS);
    expect(s().roomId).toBeNull();

    cleanup();
    boot('');
    await finish(() => {});

    expect(editor.collab.joinRoomById).not.toHaveBeenCalled();
    expect(trackNames()).toEqual(POP_TRACKS);
  });

  it('offers the room’s project back with a Restore that opens it', async () => {
    leftARoom();
    s().addTrack('midi', 'piano-sampler', 'Room Keys');
    boot('?template=project-pop');
    await finish(() => {});

    const [, notice] = toasts.notice.mock.calls[0] as [
      string,
      { action?: { label: string; onClick: () => void } },
    ];
    expect(notice.action?.label).toBe('Restore');
    act(() => notice.action!.onClick());

    expect(toasts.error).not.toHaveBeenCalled();
    expect(trackNames()).toEqual(['Room Keys']);
  });

  it('leaves it for a song its page opened before the editor', async () => {
    leftARoom();
    // The Song page's Open in Studio replaces the session, then navigates.
    await act(async () => {
      await replaceSession('u1', () => seedStudioFromSong(SONG), {
        reopenable: true,
      });
    });
    boot('?seeded=1');
    await finish(() => {});

    expect(s().projectName).toBe('Boot Song');
    expect(s().roomId).toBeNull();
  });

  it('keeps the room when the link names nothing real', async () => {
    leftARoom();
    boot('?template=no-such-template');
    await finish(() => {});

    expect(toasts.error).toHaveBeenCalled();
    expect(s().roomId).toBe('room-1');
  });
});
