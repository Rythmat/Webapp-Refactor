// @vitest-environment jsdom
/**
 * Boots that read published content, now that the editor route has no
 * content gate (milestone 1.12a, bundle-load-06): the editor paints at once,
 * and an open that needs the song library or a genre's activity flows waits
 * for them itself, under the Opening overlay. Slow content only delays that
 * open; failed content refuses it with the panel and Retry, changing
 * nothing; an MSP launch that needs no content never waits for it.
 *
 * Run: npx vitest run src/daw/session/__tests__/contentBoots.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { funkL2 } from '@/curriculum/data/activityFlows/funk_v2';
import type { Song } from '@/curriculum/types/songLibrary';
import { setBridge } from '@/daw/collab/collabMiddleware';
import {
  INITIAL_CLOUD_SAVE_STATE,
  useCloudSaveStore,
} from '@/daw/commands/cloudSaveStore';
import {
  forgetLiveSession,
  serializeSession,
} from '@/daw/persistence/SessionSerializer';
import { markDocumentBaseline } from '@/daw/persistence/saveStatusStore';
import { useStore } from '@/daw/store';
import { resetUndoHistory } from '@/daw/store/undoMiddleware';
import { reloadAfterSaving } from '@/lib/beforeReload';
import {
  openSession,
  resetOpenSessionForTests,
  retryByReload,
  retryOpen,
} from '../openSession';
import { resetSessionNoticesForTests } from '../sessionNotices';
import { INITIAL_SESSION_STATE, useSessionStore } from '../sessionStore';
import { installFakeDeps, setEditorUrl, type FakeEnv } from './fakes';

const content = vi.hoisted(() => ({
  songs: null as null | (() => Promise<void>),
  library: new Map<string, unknown>(),
  flows: null as null | ((genre: string, level: number) => Promise<unknown>),
}));

vi.mock('@/content/songStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/content/songStore')>();
  return {
    ...actual,
    ensureSongContent: () => content.songs?.() ?? Promise.resolve(),
    getSong: (id: string) => content.library.get(id),
  };
});

vi.mock('@/curriculum/data/activityFlows', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/curriculum/data/activityFlows')>();
  return {
    ...actual,
    getActivityFlow: (genre: string, level: number) =>
      content.flows ? content.flows(genre, level) : Promise.resolve(null),
  };
});

vi.mock('@/lib/beforeReload', () => ({
  reloadAfterSaving: vi.fn(async () => {}),
  registerBeforeReload: vi.fn(() => () => {}),
}));

vi.mock('@/util/toast', () => ({
  showNotice: vi.fn(() => 1),
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showLoading: vi.fn(),
  dismissToast: vi.fn(),
}));

vi.mock('@/daw/midi/loadGrooveEvents', () => ({
  loadGrooveEvents: vi.fn(async () => [
    { pitch: 36, startTick: 0, durationTicks: 120, velocity: 100 },
  ]),
}));

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** One real chart, so the song applies as it would from the library. */
async function aSong(): Promise<Song> {
  const { BUNDLED_SONGS } = await import('@/curriculum/data/songs/bundled');
  return BUNDLED_SONGS.africa;
}

let env: FakeEnv;
const s = () => useStore.getState();
const liveData = () => JSON.stringify(serializeSession().data);
const phase = () => useSessionStore.getState().phase;

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
  sessionStorage.clear();
  setEditorUrl('');
  content.songs = null;
  content.library.clear();
  content.flows = null;
  env = installFakeDeps();
});

afterEach(() => {
  env.unregister();
  vi.clearAllMocks();
});

/** A live session holding the student's own work. */
async function liveWork(): Promise<void> {
  const opened = await openSession({ kind: 'new' }, { source: 'menu' });
  if (opened.status !== 'ready') throw new Error('no live session');
  s().addTrack('midi', 'piano-sampler', 'Mine');
}

describe('a song link', () => {
  it('waits for a slow song library, busy, then opens the song', async () => {
    const song = await aSong();
    const library = deferred();
    content.songs = () => library.promise;
    setEditorUrl('?song=africa');

    const opening = openSession(
      { kind: 'song', songId: 'africa', transpose: 0 },
      { source: 'boot' },
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(phase()).not.toBe('idle');
    expect(phase()).not.toBe('ready');

    content.library.set('africa', song);
    library.resolve();
    await expect(opening).resolves.toMatchObject({ status: 'ready' });
    expect(s().projectName).toBe(song.title);
    expect(window.location.search).toBe('');
  });

  it('refuses with the panel and Retry when the library failed, changing nothing', async () => {
    await liveWork();
    const before = liveData();
    content.songs = () => Promise.reject(new TypeError('Failed to fetch'));

    const outcome = await openSession(
      { kind: 'song', songId: 'africa', transpose: 0 },
      { source: 'link' },
    );

    expect(outcome).toMatchObject({
      status: 'refused',
      error: {
        message:
          "The song library didn't load. Check your connection, then try again.",
        surface: 'panel',
        retryable: true,
      },
    });
    expect(liveData()).toBe(before);
  });

  it('opens after Retry once the library arrives', async () => {
    const song = await aSong();
    content.songs = () => Promise.reject(new TypeError('Failed to fetch'));
    const refused = await openSession(
      { kind: 'song', songId: 'africa', transpose: 0 },
      { source: 'boot' },
    );
    expect(refused.status).toBe('refused');

    content.songs = () => Promise.resolve();
    content.library.set('africa', song);
    await expect(retryOpen()).resolves.toMatchObject({ status: 'ready' });
    expect(s().projectName).toBe(song.title);
  });

  // In-page Retry can't help a chunk: the browser keeps a failed module
  // failed until the page reloads. Retry saves and reloads onto the link.
  it('whose bundled songs chunk failed: Retry reloads onto the link', async () => {
    content.songs = () =>
      Promise.reject(
        new TypeError(
          'Failed to fetch dynamically imported module: /assets/bundled-x.js',
        ),
      );
    setEditorUrl('?song=africa&transpose=2&msp=tok-1');
    const outcome = await openSession(
      { kind: 'song', songId: 'africa', transpose: 2 },
      { source: 'boot' },
    );
    expect(outcome).toMatchObject({
      status: 'refused',
      error: {
        surface: 'panel',
        reloadToRetry: true,
        retrySearch: '?song=africa&transpose=2&msp=tok-1',
      },
    });
    // The link's keys are gone from the address, as for any refusal.
    expect(window.location.search).toBe('?msp=tok-1');

    if (outcome.status !== 'refused') return;
    await retryByReload(outcome.error);
    expect(window.location.search).toBe('?song=africa&transpose=2&msp=tok-1');
    expect(reloadAfterSaving).toHaveBeenCalledTimes(1);
  });

  it('still opens a song that loaded when the rest of the library failed', async () => {
    const song = await aSong();
    content.songs = () => Promise.reject(new Error('CDN down'));
    content.library.set('africa', song);
    const outcome = await openSession(
      { kind: 'song', songId: 'africa', transpose: 0 },
      { source: 'boot' },
    );
    expect(outcome.status).toBe('ready');
    expect(s().projectName).toBe(song.title);
  });

  it('says a song that is not in a loaded library could not be found', async () => {
    const outcome = await openSession(
      { kind: 'song', songId: 'no-such-song', transpose: 0 },
      { source: 'boot' },
    );
    expect(outcome).toMatchObject({
      status: 'refused',
      error: { message: 'That song could not be found.', surface: 'toast' },
    });
  });
});

describe('a genre practice link (a cold link: nothing handed off)', () => {
  const intent = {
    kind: 'practiceGenre',
    genre: funkL2.genre,
    level: funkL2.level,
    section: 'A',
  } as const;

  it('waits for slow activity flows, busy, then opens the practice track', async () => {
    const flows = deferred<unknown>();
    content.flows = () => flows.promise;

    const opening = openSession(intent, { source: 'boot' });
    await new Promise((r) => setTimeout(r, 20));
    expect(phase()).not.toBe('ready');

    flows.resolve(funkL2);
    await expect(opening).resolves.toMatchObject({ status: 'ready' });
    expect(s().currentView).toBe('practice');
    expect(s().practiceSession).toMatchObject({ kind: 'genre' });
  });

  it('refuses with the panel and Retry when they failed to load, changing nothing', async () => {
    await liveWork();
    const before = liveData();
    content.flows = () => Promise.reject(new TypeError('Failed to fetch'));

    const outcome = await openSession(intent, { source: 'link' });

    expect(outcome).toMatchObject({
      status: 'refused',
      error: { surface: 'panel', retryable: true },
    });
    expect(liveData()).toBe(before);

    content.flows = () => Promise.resolve(funkL2);
    await expect(retryOpen()).resolves.toMatchObject({ status: 'ready' });
    expect(s().currentView).toBe('practice');
  });
});

describe('a practice link whose code chunk failed', () => {
  it('refuses with the panel, and its Retry reloads', async () => {
    content.flows = () =>
      Promise.reject(
        new TypeError('error loading dynamically imported module: funk.js'),
      );
    setEditorUrl('?practiceGenre=funk&practiceLevel=2&practiceSection=A');
    const outcome = await openSession(
      {
        kind: 'practiceGenre',
        genre: funkL2.genre,
        level: funkL2.level,
        section: 'A',
      },
      { source: 'boot' },
    );
    expect(outcome).toMatchObject({
      status: 'refused',
      error: {
        message:
          "That practice track couldn't load. Check your connection, then try again.",
        surface: 'panel',
        reloadToRetry: true,
        retrySearch: '?practiceGenre=funk&practiceLevel=2&practiceSection=A',
      },
    });
  });
});

describe('an MSP launch', () => {
  it('opens its lesson without waiting for the song library, and keeps its keys', async () => {
    // The songs never arrive: nothing in this open may wait for them.
    content.songs = () => new Promise(() => {});
    setEditorUrl(
      '?tutorial=make-first-track&msp=tok-1&interactionId=ix-1&module=studio&activityRef=act-1',
    );

    const outcome = await openSession(
      { kind: 'tutorial', tutorialId: 'make-first-track' },
      { source: 'boot' },
    );

    expect(outcome.status).toBe('ready');
    expect(s().activeTutorialId).toBe('make-first-track');
    const params = new URLSearchParams(window.location.search);
    expect(params.get('tutorial')).toBeNull();
    expect(params.get('msp')).toBe('tok-1');
    expect(params.get('interactionId')).toBe('ix-1');
    expect(params.get('module')).toBe('studio');
    expect(params.get('activityRef')).toBe('act-1');
  });
});
