// @vitest-environment jsdom
/**
 * The 'prompt' intent (owner, 2026-10-23): a prompt typed on Home opens the
 * Studio on a song idea built from it — a console band playing a
 * progression the library tags for the prompt's moods and style, in its key
 * and tempo — as a project, not a practice track, with an empty "Your idea"
 * track armed for the student. The idea is theirs to keep: a draft, not a
 * source that opens again.
 *
 * Run: npx vitest run src/daw/session/__tests__/promptSongIntent.test.ts
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
import { showNotice } from '@/util/toast';
import { intentLabel, prepareIntent, type PreparedOpen } from '../intents';
import { openErrorTitle } from '../openErrors';
import { openSession, resetOpenSessionForTests } from '../openSession';
import { BOOT_KEYS, parseBootIntent } from '../parseBootIntent';
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

const TEXT = 'Make a sad lo-fi beat in D Dorian at 80 BPM';
const intent: OpenIntent = { kind: 'prompt', text: TEXT, seed: 7 };

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

const read = (search: string) =>
  parseBootIntent(new URLSearchParams(search)).intent;

describe('the prompt link', () => {
  it('is read from the URL, its seed too, and named while it opens', () => {
    expect(read(`prompt=${encodeURIComponent(TEXT)}&promptSeed=7`)).toEqual(
      intent,
    );
    expect(read('prompt=sad%20lofi')).toEqual({
      kind: 'prompt',
      text: 'sad lofi',
      seed: null,
    });
    expect(read('prompt=x&promptSeed=abc')).toMatchObject({ seed: null });
    expect(read('prompt=x&promptSeed=99999999999')).toMatchObject({
      seed: null,
    });
    // Nothing to read: the session carries on.
    expect(read('prompt=%20%20')).toEqual({ kind: 'resume' });
    // A project named in the link wins; the prompt is stripped with it.
    const both = parseBootIntent(new URLSearchParams('project=p1&prompt=x'));
    expect(both.intent).toEqual({ kind: 'project', projectId: 'p1' });
    expect(both.consumedKeys).toContain('prompt');
    expect(BOOT_KEYS).toEqual(expect.arrayContaining(['prompt', 'promptSeed']));
    expect(intentLabel(intent)).toBe('Building your song idea…');
    expect(openErrorTitle(intent)).toBe('Couldn’t build your song idea');
  });

  it('cuts a long prompt to the length it reads', () => {
    const long = 'funk '.repeat(100);
    const parsed = read(`prompt=${encodeURIComponent(long)}`);
    expect(parsed).toMatchObject({ kind: 'prompt' });
    expect((parsed as { text: string }).text.length).toBeLessThanOrEqual(280);
  });
});

describe('a song idea from a prompt', () => {
  it('builds before the reset, then writes a project with the band and an empty idea track', async () => {
    const prepared = await prepare(intent);
    expect(prepared.savedComplete).toBe(false);
    expect(prepared.baseline).toEqual({
      source: 'prompt',
      ref: 'hip-hop/7',
      reopenable: false,
    });
    // Preparing changes nothing.
    expect(s().tracks).toEqual([]);

    resetProjectState('test');
    prepared.apply({ collab: env.collab, drafts: env.drafts });
    expect(s().projectName).toBe('Melancholic Lo-fi in D Dorian');
    expect(s().bpm).toBe(80);
    expect(s().rootNote).toBe(2);
    expect(s().mode).toBe('dorian');
    expect(s().currentView).toBe('arrange');
    expect(s().practiceSession).toBeNull();
    expect(s().loopEnabled).toBe(true);
    expect(s().chordRegions).toHaveLength(16);

    const names = s().tracks.map((t) => t.name);
    expect(names.at(-1)).toBe('Your idea');
    expect(names.some((n) => /drums/i.test(n))).toBe(true);
    expect(names.some((n) => /bass/i.test(n))).toBe(true);
    expect(names.some((n) => / \(band\)$/.test(n))).toBe(false);
    const idea = s().tracks.at(-1)!;
    expect(idea.midiClips).toEqual([]);
    expect(idea.recordArmed).toBe(true);
    expect(s().selectedTrackId).toBe(idea.id);
    // Every other track plays.
    for (const t of s().tracks.slice(0, -1)) {
      expect(t.midiClips[0]?.events.length, t.name).toBeGreaterThan(0);
      expect(t.recordArmed, t.name).toBe(false);
    }

    prepared.afterReady({
      deps: env.deps,
      generation: 1,
      stillCurrent: () => true,
      draftWritten: true,
    });
    expect(showNotice).toHaveBeenCalledWith(
      'Made a Lo-fi in D Dorian at 80 BPM',
      expect.objectContaining({ description: expect.stringMatching(/^Dm/) }),
    );
  });

  it('loops a 12-bar blues on its twelve bars', async () => {
    const prepared = await prepare({
      kind: 'prompt',
      text: 'a 12-bar blues in A',
      seed: 1,
    });
    resetProjectState('test');
    prepared.apply({ collab: env.collab, drafts: env.drafts });
    expect(s().loopEnd - s().loopStart).toBe(12 * 1920);
    expect(s().projectName).toBe('12-Bar Blues in A');
  });

  it('makes a starting idea of a prompt it reads nothing in, and says so', async () => {
    const prepared = await prepare({ kind: 'prompt', text: 'asdf', seed: 1 });
    resetProjectState('test');
    prepared.apply({ collab: env.collab, drafts: env.drafts });
    expect(s().rootNote).toBe(0);
    expect(s().mode).toBe('ionian');
    prepared.afterReady({
      deps: env.deps,
      generation: 1,
      stillCurrent: () => true,
      draftWritten: true,
    });
    expect(showNotice).toHaveBeenCalledWith(
      'We didn’t catch a style in “asdf”',
      expect.anything(),
    );
  });

  it('opens from its link, and strips the link', async () => {
    setEditorUrl(
      `?prompt=${encodeURIComponent(TEXT)}&promptSeed=7&utm_source=x`,
    );
    const outcome = await openSession(intent, { source: 'boot' });
    expect(outcome).toMatchObject({ status: 'ready' });
    expect(s().projectName).toBe('Melancholic Lo-fi in D Dorian');
    const params = new URLSearchParams(window.location.search);
    expect(params.get('prompt')).toBeNull();
    expect(params.get('promptSeed')).toBeNull();
    expect(params.get('utm_source')).toBe('x');
  });

  it('refuses with a toast when nothing can play it, changing nothing', async () => {
    const build = await import('@/features/promptSong/buildPromptSong');
    const spy = vi.spyOn(build, 'buildPromptSong').mockResolvedValue(null);
    await expect(prepare(intent)).rejects.toMatchObject({
      error: { surface: 'toast' },
    });
    expect(s().tracks).toEqual([]);
    spy.mockRestore();
  });
});
