// @vitest-environment jsdom
/**
 * The 'echoSong' intent: a song made in Echo's Make Your Song opens in the
 * Studio on the Create view, from the game's hand-off box (the band the
 * student heard) or, after a refresh, from its link alone. It's the
 * student's own work: a draft to keep, not a source to open again.
 *
 * Run: npx vitest run src/daw/session/__tests__/echoSongIntent.test.ts
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { BAR_TICKS, processTake } from '@/curriculum/engine/echo';
import { pairingsReady } from '@/curriculum/engine/lessonPairings/registry';
import { setBridge } from '@/daw/collab/collabMiddleware';
import {
  INITIAL_CLOUD_SAVE_STATE,
  useCloudSaveStore,
} from '@/daw/commands/cloudSaveStore';
import { forgetLiveSession } from '@/daw/persistence/SessionSerializer';
import { resetProjectState } from '@/daw/persistence/projectDocument/initialState';
import { markDocumentBaseline } from '@/daw/persistence/saveStatusStore';
import { useStore } from '@/daw/store';
import { resetUndoHistory } from '@/daw/store/undoMiddleware';
import {
  echoSongRefFor,
  echoSongUrl,
  openEchoSongInStudio,
  peekEchoSong,
  takeEchoSong,
  type EchoSongRequest,
} from '@/features/practiceTracks/genre/echoSongStudio';
import { intentLabel, prepareIntent, type PreparedOpen } from '../intents';
import { openErrorTitle } from '../openErrors';
import { openSession, resetOpenSessionForTests } from '../openSession';
import { parseBootIntent } from '../parseBootIntent';
import { resetSessionNoticesForTests } from '../sessionNotices';
import { INITIAL_SESSION_STATE, useSessionStore } from '../sessionStore';
import type { OpenIntent } from '../types';
import {
  installFakeDeps,
  setEditorUrl,
  TEST_USER,
  type FakeEnv,
} from './fakes';

vi.mock('@/util/toast', () => ({
  showNotice: vi.fn(() => 1),
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showLoading: vi.fn(),
  dismissToast: vi.fn(),
}));

vi.mock('@/lib/beforeReload', () => ({
  reloadAfterSaving: vi.fn(async () => {}),
  registerBeforeReload: vi.fn(() => () => {}),
}));

const KEY = { tonic: 'D', mode: 'minor' } as const;

const request: EchoSongRequest = {
  level: 2,
  key: KEY,
  chordTake: processTake(
    [
      // 1 min, then 4 min: D F A, then G B♭ D.
      ...[62, 65, 69].map((midi) => ({ midi, onset: 0, duration: 1900 })),
      ...[55, 58, 62].map((midi) => ({
        midi,
        onset: 2 * BAR_TICKS,
        duration: 1900,
      })),
    ],
    { kind: 'chords', key: KEY, level: 2 },
  ),
  melodyTake: processTake(
    [
      { midi: 62, onset: 0, duration: 480 },
      { midi: 65, onset: 960, duration: 480 },
    ],
    { kind: 'melody', key: KEY, level: 2 },
  ),
  band: 'funk-band-1',
  variation: 'l1-pocket',
  bpm: 92,
};
const ref = echoSongRefFor(request);
const intent: OpenIntent = { kind: 'echoSong', song: ref };

let env: FakeEnv;
const s = () => useStore.getState();

beforeAll(() => pairingsReady);
beforeEach(() => {
  resetOpenSessionForTests();
  resetSessionNoticesForTests();
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
  resetUndoHistory();
  markDocumentBaseline();
  setBridge(null);
  useSessionStore.setState({ ...INITIAL_SESSION_STATE });
  useCloudSaveStore.setState({ ...INITIAL_CLOUD_SAVE_STATE });
  localStorage.clear();
  setEditorUrl('');
  env = installFakeDeps();
});
afterEach(() => {
  takeEchoSong(ref);
  env.unregister();
  vi.clearAllMocks();
});

async function prepare(open: OpenIntent): Promise<PreparedOpen> {
  const result = await prepareIntent(open, {
    deps: env.deps,
    user: TEST_USER,
    signal: new AbortController().signal,
    cold: false,
    liveDraftId: 'live',
    notices: [],
  });
  if ('noop' in result) throw new Error('unexpected noop');
  return result;
}

describe('a song from Echo', () => {
  it('is read from its link, and named while it opens', () => {
    const search = echoSongUrl(ref).split('?')[1];
    expect(parseBootIntent(new URLSearchParams(search)).intent).toEqual(intent);
    expect(intentLabel(intent)).toBe('Opening your song…');
    expect(openErrorTitle(intent)).toBe('Couldn’t open your song');
  });

  it('opens the game’s hand-off on the Create view, then takes it from the box', async () => {
    await openEchoSongInStudio(request);
    const handed = peekEchoSong(ref)!;
    const prepared = await prepare(intent);
    // Peeked, not taken: a refused or superseded open leaves it.
    expect(peekEchoSong(ref)).toBe(handed);
    expect(prepared.savedComplete).toBe(false);
    expect(prepared.baseline).toEqual({
      source: 'echoSong',
      ref: 'funk-band-1/l1-pocket',
      reopenable: false,
    });
    expect(s().tracks).toEqual([]);

    resetProjectState('test');
    prepared.apply({ collab: env.collab, drafts: env.drafts });
    expect(s().currentView).toBe('arrange');
    expect(s().practiceSession).toBeNull();
    expect(s().bpm).toBe(92);
    expect(s().rootNote).toBe(2);
    expect(s().mode).toBe('aeolian');
    expect(s().tracks.map((t) => t.name)).toEqual([
      'Melody',
      'Chords',
      ...handed.band.map((p) => p.name),
    ]);
    // The band's drums are the very clip the game handed over.
    const drums = s().tracks.find((t) => t.name === 'Drums')!;
    expect(drums.midiClips[0].events.map((e) => e.startTick)).toEqual(
      handed.band[0].clip.events.map((e) => e.startTick),
    );
    expect(s().chordRegions.map((r) => r.name)).toEqual([
      '1 min',
      '4 min',
      '1 min',
      '4 min',
    ]);

    prepared.afterReady({
      deps: env.deps,
      generation: 1,
      stillCurrent: () => true,
      draftWritten: true,
    });
    expect(peekEchoSong(ref)).toBeNull();
  });

  it('builds the song from the link after a refresh, and strips the link', async () => {
    setEditorUrl(`?${echoSongUrl(ref).split('?')[1]}&utm_source=x`);
    const outcome = await openSession(intent, { source: 'boot' });
    expect(outcome).toMatchObject({ status: 'ready' });
    expect(s().currentView).toBe('arrange');
    expect(
      s()
        .tracks.slice(0, 2)
        .map((t) => t.name),
    ).toEqual(['Melody', 'Chords']);
    expect(s().tracks.some((t) => t.name === 'Drums')).toBe(true);
    expect(s().projectName).toBe('My Echo Song · Funk Band 1');
    const params = new URLSearchParams(window.location.search);
    expect(params.get('echoSong')).toBeNull();
    expect(params.get('echoMelody')).toBeNull();
    expect(params.get('utm_source')).toBe('x');
  });

  it('refuses a link that names no song, changing nothing', async () => {
    await expect(
      prepare({ kind: 'echoSong', song: { ...ref, band: 'no-band' } }),
    ).rejects.toMatchObject({
      error: { message: 'That song could not be found.' },
    });
    await expect(
      prepare({ kind: 'echoSong', song: { ...ref, tonic: 'H' } }),
    ).rejects.toMatchObject({
      error: { message: 'That song could not be found.' },
    });
    expect(s().tracks).toEqual([]);
  });
});
