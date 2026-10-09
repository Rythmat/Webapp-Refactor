// @vitest-environment jsdom
/**
 * The per-intent half of openSession (intents.ts): each prepare changes
 * nothing and claims the draft the session will write to; each apply writes
 * the session in; the extras after ready run only while the session they
 * opened is still the live one. Plus the overlay's labels and the time
 * limits.
 *
 * Run: npx vitest run src/daw/session/__tests__/intents.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { funkL2 } from '@/curriculum/data/activityFlows/funk_v2';
import { getLiveGroove } from '@/curriculum/engine/drumGrooves/registry';
import { loadGrooveEvents } from '@/daw/midi/loadGrooveEvents';
import { buildGenrePracticeTrack } from '@/features/practiceTracks/genre/buildGenrePracticeTrack';
import {
  peekPracticeTrack,
  stashPracticeTrack,
} from '@/features/practiceTracks/genre/openGenrePracticeTrack';
import {
  loadJamSession,
  saveJamSession,
  type JamSession,
} from '@/daw/jam-import/jamSession';
import { resetProjectState } from '@/daw/persistence/projectDocument/initialState';
import { serializeSession } from '@/daw/persistence/SessionSerializer';
import { useStore } from '@/daw/store';
import { DraftStorageError } from '@/lib/studio-projects/drafts/types';
import {
  intentLabel,
  needsToken,
  OpenRefusal,
  PREPARE_TIMEOUT_MS,
  prepareIntent,
  raceSignal,
  sameServerTime,
  waitingLabel,
  withTimeout,
  type PreparedOpen,
  type PrepareContext,
  type UnchangedOpen,
} from '../intents';
import type { OpenIntent } from '../types';
import { installFakeDeps, makeMeta, TEST_USER, type FakeEnv } from './fakes';

vi.mock('@/util/toast', () => ({
  showNotice: vi.fn(() => 1),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

// Passes through; a test can hide the designed Theory groove to reach the
// fetched .mid fallback.
vi.mock('@/curriculum/engine/drumGrooves/registry', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/curriculum/engine/drumGrooves/registry')
    >();
  return { ...actual, getLiveGroove: vi.fn(actual.getLiveGroove) };
});

vi.mock('@/daw/midi/loadGrooveEvents', () => ({
  loadGrooveEvents: vi.fn(async () => [
    { pitch: 36, startTick: 0, durationTicks: 120, velocity: 100 },
  ]),
}));

let env: FakeEnv;

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  localStorage.clear();
  env = installFakeDeps();
});

afterEach(() => {
  env.unregister();
  vi.clearAllMocks();
});

function ctx(
  signal = new AbortController().signal,
  extra: Partial<PrepareContext> = {},
): PrepareContext {
  return {
    deps: env.deps,
    user: TEST_USER,
    signal,
    cold: false,
    liveDraftId: 'live',
    notices: [],
    ...extra,
  };
}

async function prepare(intent: OpenIntent): Promise<PreparedOpen> {
  const result: PreparedOpen | UnchangedOpen = await prepareIntent(
    intent,
    ctx(),
  );
  if ('noop' in result) throw new Error('unexpected noop');
  return result;
}

/** Apply after a reset, as openSession does. */
function apply(prepared: PreparedOpen): void {
  resetProjectState('test');
  prepared.apply({ collab: env.collab, drafts: env.drafts });
}

const ready = (stillCurrent: boolean, draftWritten = true) => ({
  deps: env.deps,
  generation: 1,
  stillCurrent: () => stillCurrent,
  draftWritten,
});

const s = () => useStore.getState();

describe('labels', () => {
  it('names what is opening', () => {
    expect(intentLabel({ kind: 'resume' })).toBe('Opening your last session…');
    expect(intentLabel({ kind: 'project', projectId: 'p' }, 'Song A')).toBe(
      'Opening ‘Song A’…',
    );
    expect(
      intentLabel({
        kind: 'practiceMode',
        mode: 'dorian',
        rootParam: null,
        openTrack: 'melody',
        level: 1,
      }),
    ).toBe('Building your practice track…');
    expect(
      intentLabel({
        kind: 'collab',
        code: 'abcd1234',
        host: false,
        jamImport: false,
        awaitHost: false,
      }),
    ).toBe('Joining session abcd1234…');
    expect(
      intentLabel({
        kind: 'collab',
        code: 'abcd1234',
        host: false,
        jamImport: false,
        awaitHost: true,
      }),
    ).toBe('Waiting for the host to open the session…');
    expect(intentLabel({ kind: 'tutorial', tutorialId: 'x' }, 'Beats')).toBe(
      'Opening lesson ‘Beats’…',
    );
  });

  it('says what an open waits on', () => {
    expect(waitingLabel('owner')).toBe('Signing you in…');
    expect(waitingLabel('token')).toBe('Signing you in…');
    expect(waitingLabel('plan')).toBe('Checking your plan…');
    expect(waitingLabel('save')).toBe('Finishing your save…');
    expect(waitingLabel('take')).toBe('Finishing your recording…');
    expect(waitingLabel(null)).toBeNull();
  });

  it('needs the token only to reach the server or a room', () => {
    expect(needsToken({ kind: 'project', projectId: 'p' })).toBe(true);
    expect(needsToken({ kind: 'rejoin', roomId: 'r', role: 'editor' })).toBe(
      true,
    );
    expect(needsToken({ kind: 'template', templateId: 't' })).toBe(false);
  });
});

describe('time limits', () => {
  it('compares server times as instants', () => {
    expect(
      sameServerTime('2026-10-01T10:00:00Z', '2026-10-01T10:00:00.000Z'),
    ).toBe(true);
    expect(
      sameServerTime(new Date('2026-10-01T10:00:00Z'), '2026-10-01T10:00:00Z'),
    ).toBe(true);
    expect(sameServerTime('2026-10-01T10:00:00Z', '2026-10-01T10:00:01Z')).toBe(
      false,
    );
    expect(sameServerTime(null, null)).toBe(false);
    expect(sameServerTime('garbage', 'garbage')).toBe(false);
  });

  it('aborts with the caller, or times out', async () => {
    const caller = new AbortController();
    const limited = withTimeout(caller.signal, 10_000);
    caller.abort('superseded');
    expect(limited.aborted).toBe(true);
    expect(limited.reason).toBe('superseded');

    vi.useFakeTimers();
    try {
      const never = new Promise<never>(() => {});
      const raced = raceSignal(never, new AbortController().signal, 50);
      const caught = raced.catch((err: unknown) => err);
      await vi.advanceTimersByTimeAsync(60);
      expect((await caught) as DOMException).toMatchObject({
        name: 'TimeoutError',
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('prepare changes nothing; apply writes the session', () => {
  it('claims a new draft for a seed, and only claims', async () => {
    s().addTrack('midi', 'piano-sampler', 'Live');
    const before = JSON.stringify(serializeSession().data);
    const prepared = await prepare({
      kind: 'template',
      templateId: 'project-pop',
    });
    expect(prepared.claim.mode).toBe('new');
    expect(JSON.stringify(serializeSession().data)).toBe(before);
    expect(prepared.baseline).toEqual({
      source: 'template',
      ref: 'project-pop',
      reopenable: true,
    });
    apply(prepared);
    expect(s().tracks.map((t) => t.name)).not.toContain('Live');
    expect(s().tracks.length).toBeGreaterThan(0);
  });

  it('opens a demo in one piece, its drums cut to the loop', async () => {
    const prepared = await prepare({
      kind: 'demo',
      demoId: 'demo-midnight-groove',
    });
    expect(loadGrooveEvents).toHaveBeenCalled();
    expect(s().tracks).toEqual([]);
    apply(prepared);
    expect(s().projectId).toBeNull();
    expect(s().tracks.map((t) => t.name)).toContain('Drums');
  });

  it('refuses a demo that is not there', async () => {
    await expect(
      prepare({ kind: 'demo', demoId: 'nope' }),
    ).rejects.toBeInstanceOf(OpenRefusal);
    expect(env.drafts.claim).not.toHaveBeenCalled();
  });

  it('transposes a song by its link', async () => {
    const plain = await prepare({
      kind: 'song',
      songId: 'africa',
      transpose: 0,
    });
    apply(plain);
    const plainRoot = s().rootNote;
    const up = await prepare({ kind: 'song', songId: 'africa', transpose: 2 });
    apply(up);
    expect(s().rootNote).toBe(((plainRoot ?? 0) + 2) % 12);
    expect(up.baseline).toMatchObject({ source: 'song', ref: 'africa@2' });
  });

  it('refuses a song that is not there', async () => {
    await expect(
      prepare({ kind: 'song', songId: 'no-such-song', transpose: 0 }),
    ).rejects.toMatchObject({
      error: { message: 'That song could not be found.' },
    });
  });

  it('refuses a Theory practice track whose groove is offline, for the panel', async () => {
    // A designed groove needs no fetch; hide it so the .mid fallback is tried.
    vi.mocked(getLiveGroove).mockReturnValueOnce(undefined);
    vi.mocked(loadGrooveEvents).mockRejectedValueOnce(
      new TypeError('Failed to fetch'),
    );
    const refusal = await prepare({
      kind: 'practiceMode',
      mode: 'dorian',
      rootParam: 'd',
      openTrack: 'melody',
      level: 1,
    }).catch((err: unknown) => err);
    expect(refusal).toBeInstanceOf(OpenRefusal);
    expect((refusal as OpenRefusal).error).toMatchObject({
      kind: 'offline',
      surface: 'panel',
      retryable: true,
    });
  });

  it("opens a genre practice track from the lesson's hand-off, taking it once ready", async () => {
    const track = buildGenrePracticeTrack(funkL2, 'A')!;
    stashPracticeTrack({
      genre: funkL2.genre,
      level: funkL2.level,
      section: 'A',
      genreLabel: 'Funk',
      returnTo: '/curriculum/funk/2?section=A',
      track,
    });
    const intent = {
      kind: 'practiceGenre',
      genre: funkL2.genre,
      level: funkL2.level,
      section: 'A',
    } as const;
    const prepared = await prepare(intent);
    // Peeked, not taken: a refused or superseded open leaves it.
    expect(peekPracticeTrack(intent.genre, intent.level, 'A')).not.toBeNull();
    apply(prepared);
    expect(s().currentView).toBe('practice');
    expect(s().practiceSession).toMatchObject({ kind: 'genre' });
    prepared.afterReady(ready(true));
    expect(peekPracticeTrack(intent.genre, intent.level, 'A')).toBeNull();
  });

  it('refuses a genre practice track that is not there', async () => {
    await expect(
      prepare({
        kind: 'practiceGenre',
        genre: 'no-genre',
        level: 1,
        section: 'A',
      }),
    ).rejects.toMatchObject({
      error: { message: 'That practice track could not be found.' },
    });
  });

  it('a host brings the jam in, then joins as owner', async () => {
    const jam: JamSession = {
      version: 1,
      roomId: 'r',
      recordedAt: 1,
      bpm: 90,
      localUserId: 'u',
      participants: [{ userId: 'u', userName: 'U', color: '#ff0000' }],
      notes: [
        {
          userId: 'u',
          color: '#ff0000',
          instrument: 'piano',
          gmProgram: 0,
          midi: 60,
          velocity: 90,
          startMs: 0,
          endMs: 300,
        },
      ],
    };
    saveJamSession(jam);
    const prepared = await prepare({
      kind: 'collab',
      code: 'abcd1234',
      host: true,
      jamImport: true,
      awaitHost: false,
    });
    expect(prepared.collabWait).toBeNull();
    expect(prepared.savedComplete).toBe(false);
    apply(prepared);
    expect(s().bpm).toBe(90);
    expect(env.collab.joinRoom).toHaveBeenCalledWith(
      'abcd1234',
      'owner',
      undefined,
      'studio-abcd1234',
      'abcd1234',
    );
    // The jam stays until the open is ready.
    expect(loadJamSession()).not.toBeNull();
    prepared.afterReady(ready(true));
    expect(loadJamSession()).toBeNull();
  });

  it('a joiner waits for its room, by the id the join uses', async () => {
    const prepared = await prepare({
      kind: 'collab',
      code: 'Room42',
      host: false,
      jamImport: false,
      awaitHost: false,
    });
    expect(prepared.collabWait).toEqual({ roomId: 'room42', awaitHost: false });
    apply(prepared);
    expect(env.collab.joinRoomById).toHaveBeenCalledWith('Room42');
  });
});

describe('extras after ready are guarded by the session', () => {
  it('a jam stays pending when its session was replaced first', async () => {
    saveJamSession({
      version: 1,
      roomId: null,
      recordedAt: 1,
      bpm: 100,
      localUserId: 'u',
      participants: [],
      notes: [
        {
          userId: 'u',
          color: '#fff',
          instrument: 'piano',
          gmProgram: 0,
          midi: 62,
          velocity: 80,
          startMs: 0,
          endMs: 200,
        },
      ],
    });
    const prepared = await prepare({ kind: 'jam' });
    apply(prepared);
    prepared.afterReady(ready(false));
    expect(loadJamSession()).not.toBeNull();
    expect(s().chordAnalysisPromptOpen).toBe(false);
    // The draft couldn't be written: the hand-off is its only copy.
    prepared.afterReady(ready(true, false));
    expect(loadJamSession()).not.toBeNull();
    prepared.afterReady(ready(true));
    expect(loadJamSession()).toBeNull();
  });

  it('a new room asks for the Invite modal only while it is the session', async () => {
    const prepared = await prepare({
      kind: 'collab',
      code: 'new',
      host: false,
      jamImport: false,
      awaitHost: false,
    });
    prepared.afterReady(ready(false));
    expect(s().inviteRequested).toBe(false);
    prepared.afterReady(ready(true));
    expect(s().inviteRequested).toBe(true);
  });
});

describe('drafts', () => {
  it("refuses another user's draft as one that isn't there", async () => {
    env.drafts.put(
      makeMeta({ draftId: 'theirs', userKey: 'someone-else' }),
      JSON.stringify(serializeSession()),
    );
    await expect(
      prepare({ kind: 'draft', draftId: 'theirs' }),
    ).rejects.toMatchObject({
      error: { kind: 'not-found', message: "That draft couldn't be found." },
    });
    expect(env.drafts.released).toEqual(['theirs']);
  });

  it("opens a '~device' draft and moves it to this user", async () => {
    env.drafts.put(
      makeMeta({ draftId: 'found', userKey: '~device' }),
      JSON.stringify(serializeSession()),
    );
    const prepared = await prepare({ kind: 'draft', draftId: 'found' });
    expect(prepared.claimDevice).toBe(true);
    expect(prepared.baseline).toBe('stored');
  });

  it('a resume whose draft the store fails to read: the panel, the pointer kept', async () => {
    env.drafts.put(makeMeta({ draftId: 'd1' }), '{}');
    env.drafts.readError = new DraftStorageError('unavailable', 'stalled');
    await expect(
      prepareIntent({ kind: 'resume' }, ctx()),
    ).rejects.toMatchObject({
      error: { kind: 'storage', surface: 'panel', retryable: true },
    });
    expect(env.drafts.released).toEqual(['d1']);
    expect(env.drafts.claim).toHaveBeenCalledTimes(1);
  });

  it('the second try from the panel opens an empty project and says why', async () => {
    env.drafts.put(makeMeta({ draftId: 'd1' }), '{}');
    env.drafts.readError = new DraftStorageError('unavailable', 'stalled');
    const context = ctx(undefined, { source: 'panel' });
    const result = await prepareIntent({ kind: 'resume' }, context);
    expect('noop' in result).toBe(false);
    expect((result as PreparedOpen).baseline).toMatchObject({
      source: 'empty',
    });
    expect(context.notices).toEqual([{ kind: 'storage-unavailable' }]);
  });

  it('a resume whose draft is unreadable says it was set aside', async () => {
    env.drafts.put(makeMeta({ draftId: 'd1' }), '{}');
    env.drafts.readError = new DraftStorageError('corrupt', 'bad');
    const context = ctx();
    const result = (await prepareIntent(
      { kind: 'resume' },
      context,
    )) as PreparedOpen;
    expect(result.baseline).toMatchObject({ source: 'empty' });
    expect(context.notices).toEqual([{ kind: 'quarantined', count: 1 }]);
  });

  it('a stalled store never holds a prepare past its time limit', async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(env.drafts.prepareUser).mockImplementation(
        () => new Promise(() => {}),
      );
      let lateClaim!: (claim: {
        draftId: string;
        userKey: string;
        mode: 'new';
        lock: null;
      }) => void;
      vi.mocked(env.drafts.claim).mockImplementation(
        () => new Promise((resolve) => (lateClaim = resolve)),
      );
      const context = ctx();
      const pending = prepareIntent({ kind: 'new' }, context);
      const settled = expect(pending).rejects.toMatchObject({
        name: 'TimeoutError',
      });
      await vi.advanceTimersByTimeAsync(PREPARE_TIMEOUT_MS * 2 + 100);
      await settled;
      expect(context.notices).toEqual([{ kind: 'storage-unavailable' }]);
      // A claim that lands after the open gave up is released at once.
      lateClaim({
        draftId: 'late',
        userKey: TEST_USER.userKey,
        mode: 'new',
        lock: null,
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(env.drafts.released).toEqual(['late']);
    } finally {
      vi.useRealTimers();
    }
  });
});
