// @vitest-environment jsdom
/**
 * The Music Literacy step, as a student meets it: Play, the count-in, the
 * words lighting syllable by syllable, the call, YOUR TURN, the answer on
 * the computer keyboard, the score, Try again and Next, and the minor step's
 * colour. The transport run is faked (literacyRun.ts): the test hands the
 * player each cue itself and says where on the timeline a key lands.
 */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLiveMusicLiteracy } from '@/curriculum/engine/musicLiteracy/registry';
import {
  runCues,
  type RunCue,
  type RunMode,
} from '@/curriculum/engine/musicLiteracy/run';

const input = vi.hoisted(() => ({
  stable: {
    subscribeNoteOn: () => () => {},
    subscribeNoteOff: () => () => {},
    start: async () => {},
    stop: () => {},
  },
}));
vi.mock('@/learn/context/LearnInputContext', () => ({
  LearnInputProvider: ({ children }: { children: ReactNode }) => children,
  useLearnInputStable: () => input.stable,
}));

/** The fake run: the cue handler of the latest start, and the clock's tick. */
const run = vi.hoisted(() => ({
  onCue: null as null | ((cue: unknown) => void),
  starts: 0,
  tick: null as number | null,
}));
vi.mock('@/curriculum/musicLiteracy/literacyRun', () => ({
  literacyClock: {
    soundingTicks: () => run.tick,
    playbackTicks: () => run.tick,
  },
  startLiteracyRun: async ({ onCue }: { onCue: (cue: unknown) => void }) => {
    run.onCue = onCue;
    run.starts += 1;
    return true;
  },
  stopLiteracyRun: () => {},
}));
vi.mock('@/audio/pianoSampler', () => ({
  triggerPianoAttack: async () => {},
  triggerPianoRelease: async () => {},
  releaseAllPianoNotes: async () => {},
  setPianoSamplerVolume: () => {},
}));
const msp = vi.hoisted(() => ({ reportCompletion: vi.fn() }));
vi.mock('@/features/classroom/msp', () => ({
  useMspModuleCompletion: () => msp,
}));

const { MusicLiteracyPlayer } = await import('../MusicLiteracyPlayer');

const lesson = getLiveMusicLiteracy('music-literacy-part-1')!;

const LocationProbe = () => {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{`${pathname}${search}`}</output>;
};

function renderPlayer(
  url = '/curriculum/music-literacy/music-literacy-part-1',
) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <MusicLiteracyPlayer lesson={lesson} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

const hub = () => document.querySelector('[data-literacy-hub]')!;
const title = () => document.querySelector('[data-guitar-title]')?.textContent;
const stepIndex = () => lesson.steps.findIndex((s) => s.title === title());

/** Every cue of the current step's run up to `tick`, not yet handed over. */
let fed = 0;
function feedTo(tick: number, mode: RunMode = 'play') {
  const cues = runCues(lesson, lesson.steps[stepIndex()], mode, {
    metronome: false,
  });
  const due = cues.filter((c) => c.tick <= tick).slice(fed);
  fed += due.length;
  act(() => due.forEach((cue: RunCue) => run.onCue!(cue)));
}

async function press(button: string | RegExp) {
  fed = 0;
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: button }));
  });
}

/** Type `code` landing on `tick`, held for most of a beat. */
function typeAt(code: string, tick: number) {
  run.tick = tick;
  act(() => {
    fireEvent.keyDown(window, { code });
  });
  run.tick = tick + 400;
  act(() => {
    fireEvent.keyUp(window, { code });
  });
}

describe('a Music Literacy step', () => {
  beforeEach(() => {
    localStorage.clear();
    run.onCue = null;
    run.starts = 0;
    run.tick = null;
    msp.reportCompletion.mockClear();
  });
  afterEach(() => cleanup());

  it('runs count-in, words, call, then the student’s turn, and scores the answer', async () => {
    renderPlayer();
    expect(title()).toBe('A note called C');
    expect(hub().getAttribute('data-turn')).toBe('idle');
    expect(hub().textContent).toContain('The call');
    expect(
      document
        .querySelector('[data-literacy-degrees]')
        ?.getAttribute('aria-label'),
    ).toBe('Scale degrees 1 1 1');

    await press('Play');
    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy();

    feedTo(0);
    expect(hub().getAttribute('data-turn')).toBe('countIn');
    expect(hub().textContent).toContain('Ready');

    feedTo(1920);
    expect(hub().getAttribute('data-turn')).toBe('words');
    expect(hub().textContent).toContain('My turn');
    expect(document.querySelector('[data-word-now]')?.textContent).toContain(
      'Hey',
    );
    feedTo(1920 + 1440);
    expect(document.querySelector('[data-word-now]')?.textContent).toContain(
      'gon',
    );

    feedTo(5760 + 500);
    expect(hub().getAttribute('data-turn')).toBe('call');
    expect(document.querySelectorAll('[data-degree-lit]')).toHaveLength(1);

    feedTo(7680);
    expect(hub().getAttribute('data-turn')).toBe('response');
    expect(hub().textContent).toContain('Your turn');

    typeAt('KeyA', 7680);
    typeAt('KeyA', 8160);
    typeAt('KeyA', 8640);
    feedTo(9600);

    expect(screen.getByRole('heading', { name: '100%' })).toBeTruthy();
    expect(screen.getByText('Passed')).toBeTruthy();
    expect(
      JSON.parse(
        localStorage.getItem('music_literacy_progress_music-literacy-part-1')!,
      )['note-called-c'],
    ).toMatchObject({ best: 100, passed: true });
    expect(
      document
        .querySelector('[data-guitar-step-count]')
        ?.getAttribute('aria-label'),
    ).toBe('Step 1 of 7, passed');
  });

  it('scores wrong notes low and still offers Next; Try again runs it again', async () => {
    renderPlayer();
    await press('Play');
    feedTo(7680);
    typeAt('KeyD', 7680);
    typeAt('KeyF', 8160);
    typeAt('KeyG', 8640);
    feedTo(9600);
    expect(screen.getByRole('heading', { name: '0%' })).toBeTruthy();
    expect(screen.getByText('Not yet · 70% passes')).toBeTruthy();

    await press('Try Again');
    expect(run.starts).toBe(2);
    feedTo(7680);
    // Played along with the call: not the answer.
    typeAt('KeyA', 5760);
    feedTo(9600);
    expect(screen.getByRole('heading', { name: '0%' })).toBeTruthy();

    await press(/^Next$/);
    expect(title()).toBe('The root is 1');
    expect(hub().getAttribute('data-turn')).toBe('idle');
  });

  it('shows a minor step in its relative major’s colour', () => {
    renderPlayer();
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    }
    expect(title()).toBe('Flat the 3: Minor');
    expect(
      document.querySelector('[data-literacy-key]')?.textContent,
    ).toContain('C Minor');
    const selected = [
      ...document.querySelectorAll('[data-literacy-circle] path'),
    ].find((path) => path.getAttribute('stroke') === '#fff');
    expect(selected?.getAttribute('fill')).toBe('rgb(157, 127, 206)'); // E♭
    expect(
      document
        .querySelector('[data-literacy-degrees]')
        ?.getAttribute('aria-label'),
    ).toBe('Scale degrees 1 ♭3 1');
  });

  it('tells the classroom when the last step is passed', async () => {
    renderPlayer();
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    }
    expect(title()).toBe('The Minor Triad');
    await press('Play');
    // Two bars of call: the answer starts at 9600.
    feedTo(9600);
    ['KeyA', 'KeyE', 'KeyG', 'KeyE', 'KeyA'].forEach((code, i) =>
      typeAt(code, 9600 + i * 480),
    );
    feedTo(13440);
    expect(screen.getByRole('heading', { name: '100%' })).toBeTruthy();
    expect(msp.reportCompletion).toHaveBeenCalledTimes(1);

    // The last step's Finish goes back to the path the lesson is on.
    await press(/^Finish$/);
    expect(screen.getByTestId('location').textContent).toBe(
      '/learn?tab=StartHere',
    );
  });

  it('opens on the step `?step=` names (Start Here’s Continue)', () => {
    renderPlayer(
      '/curriculum/music-literacy/music-literacy-part-1?step=add-the-3',
    );
    expect(title()).toBe('Add the 3: Major');
    cleanup();
    // A step it doesn't know: step 1.
    renderPlayer('/curriculum/music-literacy/music-literacy-part-1?step=gone');
    expect(title()).toBe('A note called C');
  });

  it('reads a syllable ending in "-" and the next as one word, each lit on its own', async () => {
    renderPlayer();
    expect(
      document
        .querySelector('[data-literacy-words]')
        ?.getAttribute('aria-label'),
    ).toBe("Words: Hey hey hey I'm gon-na play on a note called C");
    const syllable = (i: number) =>
      document.querySelector(`[data-word-index="${i}"]`)!;
    // "gon-" and "na" share a word; "I'm" is a word of its own.
    expect(syllable(4).textContent).toContain('gon-');
    expect(syllable(4).parentElement).toBe(syllable(5).parentElement);
    expect(syllable(4).parentElement?.hasAttribute('data-literacy-word')).toBe(
      true,
    );
    expect(syllable(3).parentElement).not.toBe(syllable(4).parentElement);

    await press('Play');
    feedTo(1920 + 1680);
    const lit = document.querySelectorAll('[data-word-now]');
    expect(lit).toHaveLength(1);
    expect(lit[0].getAttribute('data-word-index')).toBe('5');
  });

  it('lets Listen and Practice run without a score', async () => {
    renderPlayer();
    await press('Listen');
    feedTo(9600, 'listen');
    expect(document.querySelector('[data-guitar-result]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
    await press('Practice');
    feedTo(9600, 'practice');
    expect(document.querySelector('[data-guitar-result]')).toBeNull();
    expect(
      localStorage.getItem('music_literacy_progress_music-literacy-part-1'),
    ).toBeNull();
  });
});
