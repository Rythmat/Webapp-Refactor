// @vitest-environment jsdom
/**
 * A template clicked in the Library panel replaces the project, as the
 * dashboard's template tile does (decision D10): the work it replaces is
 * kept first, with a Restore, and the template opens as a new project (no
 * cloud link, so a Save makes a new cloud project rather than writing over
 * the one it replaced; nothing of the last project's chords, key, markers,
 * metre or marks; not an undo step). It used to pour the template's tracks
 * into the open project as one undo step and keep the rest, cloud link and
 * all, so the next Save overwrote the previous project (insight-03).
 *
 * Never in a shared session, where it would replace the room's project for
 * everyone, nor while a take records into a track it would remove. A room
 * the student hosted and left is no shared session: it closed, and the
 * editor offers no Leave to press.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const toasts = vi.hoisted(() => ({
  error: vi.fn(),
  notice: vi.fn(),
}));

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ token: 'tok', userId: 'u1' }),
}));
// Insight analyses the project; this test is about the Library tab.
vi.mock('../InsightContent', () => ({ InsightContent: () => null }));
vi.mock('@/components/utils/toast', () => ({ showError: toasts.error }));
vi.mock('@/util/toast', () => ({
  showError: toasts.error,
  showNotice: toasts.notice,
}));

import { setBridge } from '@/daw/collab/collabMiddleware';
import type { ZustandYjsBridge } from '@/daw/collab/ZustandYjsBridge';
import { getProjectTemplate } from '@/daw/data/projectTemplates';
import {
  forgetLiveSession,
  resetSessionToEmpty,
} from '@/daw/persistence/SessionSerializer';
import {
  hasWorkToKeep,
  isDocumentDirty,
} from '@/daw/persistence/saveStatusStore';
import { useStore } from '@/daw/store';
import {
  canUndo,
  initUndoTracking,
  resetUndoHistory,
} from '@/daw/store/undoMiddleware';
import { listKeptSessions } from '@/lib/studio-projects/localSession';
import { LibraryPanel } from '../LibraryPanel';

const s = () => useStore.getState();
/** Long enough for undo's debounced auto-capture to have run. */
const settle = () => vi.advanceTimersByTime(1000);

/** A cloud project the student has worked on. */
function workInProgress(): void {
  resetSessionToEmpty();
  useStore.setState({ projectId: 'cloud-42' });
  s().setProjectName('Blue Hour');
  s().setRootNote(2);
  s().setMode('dorian');
  s().setTimeSignature(3, 4);
  s().addMarker(1920, 'Bridge');
  s().insertChordRegion(0, '1 min', 'D min');
  s().setScoreTextMarks([{ id: 'm', measureIdx: 0, kind: 'segno' }]);
  const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
  s().addMidiClip(keys, {
    id: 'clip-1',
    startTick: 0,
    events: [
      { note: 62, velocity: 90, startTick: 0, durationTicks: 480, channel: 0 },
    ],
  });
  settle();
}

/** Open the Library tab and click the Pop template, as the student does. */
async function clickPopTemplate(): Promise<void> {
  render(<LibraryPanel />);
  fireEvent.click(screen.getByText('Library'));
  await act(async () => {
    fireEvent.click(screen.getByText('Pop'));
  });
  settle();
}

beforeAll(() => {
  initUndoTracking();
  // framer-motion measures the panel's animation through it; jsdom has none.
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  toasts.error.mockReset();
  toasts.notice.mockReset();
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
  resetUndoHistory();
});

afterEach(() => {
  cleanup();
  setBridge(null);
  vi.useRealTimers();
});

/** A room joined: the bridge that carries every edit to it. */
function joinRoom(role: 'owner' | 'editor'): void {
  setBridge({
    suppressStoreToYjs: false,
    syncToYjs: vi.fn(),
  } as unknown as ZustandYjsBridge);
  useStore.setState({ roomId: 'room-1', collabRole: role });
}

describe('a Library template click', () => {
  it('opens the template as a new project', async () => {
    workInProgress();
    await clickPopTemplate();

    const pop = getProjectTemplate('project-pop')!;
    expect(s().tracks.map((t) => t.name)).toEqual(
      pop.tracks.map((t) => t.name),
    );
    expect({
      projectId: s().projectId,
      projectName: s().projectName,
      rootNote: s().rootNote,
      mode: s().mode,
      metre: [s().timeSignatureNumerator, s().timeSignatureDenominator],
      markers: s().markers,
      chordRegions: s().chordRegions,
      scoreTextMarks: s().scoreTextMarks,
    }).toEqual({
      projectId: null,
      projectName: 'Untitled Project',
      rootNote: null,
      mode: 'ionian',
      metre: [4, 4],
      markers: [],
      chordRegions: [],
      scoreTextMarks: [],
    });
  });

  it('keeps the work it replaces, with a Restore', async () => {
    workInProgress();
    await clickPopTemplate();

    expect(listKeptSessions('u1').map((k) => k.projectName)).toEqual([
      'Blue Hour',
    ]);
    expect(toasts.notice).toHaveBeenCalledWith(
      'Your previous work was kept',
      expect.objectContaining({
        description: 'Blue Hour',
        action: expect.objectContaining({ label: 'Restore' }),
      }),
    );
  });

  it('is not an undo step, and the template opens untouched', async () => {
    workInProgress();
    await clickPopTemplate();

    expect(canUndo()).toBe(false);
    expect(isDocumentDirty()).toBe(false);
    // The template opens again from the Library, so it is no work to keep.
    expect(hasWorkToKeep()).toBe(false);
  });

  it.each([
    ['in a room the student joined', () => joinRoom('editor')],
    ['in a room the student hosts', () => joinRoom('owner')],
    // A join waiting for its host, the prompt after the host left, or a
    // return to the editor before its boot rejoins: the room's project
    // would come back over the template.
    [
      'while a guest’s room may still take the project back',
      () => useStore.setState({ roomId: 'room-1', collabRole: 'editor' }),
    ],
  ])('is refused %s, changing nothing', async (_, enterRoom) => {
    workInProgress();
    enterRoom();
    await clickPopTemplate();

    expect(toasts.error).toHaveBeenCalledWith(
      'Leave the shared session to open a template.',
    );
    expect(s().projectName).toBe('Blue Hour');
    expect(s().projectId).toBe('cloud-42');
    expect(listKeptSessions('u1')).toEqual([]);
  });

  it('opens once a room the student hosted has closed', async () => {
    workInProgress();
    // Leaving the editor closed the host's room; the identity stays, and
    // nothing rejoins it.
    useStore.setState({ roomId: 'room-1', collabRole: 'owner' });
    await clickPopTemplate();

    expect(toasts.error).not.toHaveBeenCalled();
    expect(s().tracks.map((t) => t.name)).toEqual(
      getProjectTemplate('project-pop')!.tracks.map((t) => t.name),
    );
    expect(listKeptSessions('u1').map((k) => k.projectName)).toEqual([
      'Blue Hour',
    ]);
  });

  it('is refused while a take is recording, changing nothing', async () => {
    workInProgress();
    useStore.setState({ isRecording: true });
    await clickPopTemplate();

    expect(toasts.error).toHaveBeenCalledWith(
      'Stop recording first, then open a template.',
    );
    expect(s().tracks.map((t) => t.name)).toEqual(['Keys']);
  });

  it('changes nothing when the work it replaces cannot be kept', async () => {
    workInProgress();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    await clickPopTemplate();
    vi.restoreAllMocks();

    expect(toasts.error).toHaveBeenCalledWith(
      "Your work couldn't be set aside on this device, so it's still open. Save it, then try again.",
    );
    expect(s().projectName).toBe('Blue Hour');
    expect(s().tracks.map((t) => t.name)).toEqual(['Keys']);
  });
});
