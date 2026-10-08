// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@/daw/store';
import Chroma from '../chroma';

// ── Chroma leaves the Studio's project alone ───────────────────────────────
// The game once lit its notes on the Studio's circle of fifths through the
// DAW store's key. The circle went, but every Start and every Play Again kept
// calling the store's setRootNote(null), which wiped the open project's key,
// key colour and key lock from the arcade, with the editor not even mounted;
// the autosave then wrote the loss into the project. A round's root is the
// game's own (the first note of its sequence), so a whole round, won or lost,
// and leaving the game, even mid-round, must write nothing to the store.

vi.mock('@/components/JamRoom/jamSoundFont', () => ({
  initJamSynth: () => Promise.resolve(),
  jamNoteOn: () => {},
  jamNoteOff: () => {},
  jamProgramChange: () => {},
  getLocalChannel: () => 0,
}));
// Sound is ready from the first render; no soundfont loads here.
vi.mock('../useGameAudio', () => ({ useGameAudio: () => ({ ready: true }) }));
// The header's back button needs a router, and isn't under test.
vi.mock('../ArcadeGameHeader', () => ({ ArcadeGameHeader: () => null }));

/** Every store key any write changed while the game was played. */
let changed: string[] = [];
let unsubscribe = () => {};

const project = () => {
  const s = useStore.getState();
  return {
    rootNote: s.rootNote,
    mode: s.mode,
    rootTrackColor: s.rootTrackColor,
    rootLocked: s.rootLocked,
    tracks: s.tracks,
  };
};

/** Let the sequence play and the feedback pauses run out. */
const settle = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });

const click = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }));

/** Leave the arcade, then let anything the game left running finish. */
const leave = async (unmount: () => void) => {
  unmount();
  await settle();
};

beforeEach(() => {
  vi.useFakeTimers();
  // Root C and one more C: the interval to name is always a unison.
  vi.spyOn(Math, 'random').mockReturnValue(0);

  // A Studio project in G Dorian with its key locked, as the editor left it.
  useStore.setState(useStore.getInitialState(), true);
  const s = useStore.getState();
  s.setMode('dorian');
  s.addTrack('midi', 'piano-sampler', 'Keys');
  s.setRootNote(7);
  s.toggleRootLock();

  changed = [];
  unsubscribe = useStore.subscribe((state, prev) => {
    for (const key of Object.keys(state) as (keyof typeof state)[]) {
      if (state[key] !== prev[key]) changed.push(key);
    }
  });
});

afterEach(() => {
  unsubscribe();
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Chroma', () => {
  it('plays a won round and Play Again without touching the Studio project', async () => {
    const before = project();
    expect(before.rootNote).toBe(7);
    expect(before.rootLocked).toBe(true);
    expect(before.rootTrackColor).not.toBeNull();

    const { unmount } = render(<Chroma />);
    click('Start');
    await settle();
    expect(screen.getByText('Name the interval')).toBeInTheDocument();

    click('Perfect Unison');
    expect(screen.getByText('Crystal attuned!')).toBeInTheDocument();

    click('Play Again');
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();

    await leave(unmount);
    expect(changed).toEqual([]);
    expect(project()).toEqual(before);
  });

  it('plays a lost round and Try Again without touching the Studio project', async () => {
    const before = project();

    const { unmount } = render(<Chroma />);
    click('Start');
    await settle();

    // Easy gives two tries; a wrong answer replays the sequence first.
    click('Major 2nd');
    await settle();
    expect(screen.getByText('Name the interval')).toBeInTheDocument();
    click('Major 2nd');
    await settle();
    expect(screen.getByText('The intervals were:')).toBeInTheDocument();

    click('Try Again');
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();

    await leave(unmount);
    expect(changed).toEqual([]);
    expect(project()).toEqual(before);
  });

  it('can be left mid-round without touching the Studio project', async () => {
    const before = project();

    const { unmount } = render(<Chroma />);
    click('Start');
    expect(screen.getByText('Listen carefully…')).toBeInTheDocument();

    // The back button, while the sequence is still playing.
    await leave(unmount);
    expect(changed).toEqual([]);
    expect(project()).toEqual(before);
  });
});
